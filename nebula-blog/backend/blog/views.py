from django.db.models import BooleanField, Count, Exists, F, OuterRef, Prefetch, Q, Value
from django.shortcuts import get_object_or_404
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import RetrieveAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import Category, Comment, Like, Post, User
from .pagination import DefaultPagination
from .permissions import IsAuthorOrReadOnly
from .serializers import (
    CategorySerializer,
    CommentSerializer,
    LoginSerializer,
    PostDetailSerializer,
    PostListSerializer,
    PostWriteSerializer,
    ProfileSerializer,
    RegisterSerializer,
    UserSerializer,
    build_auth_payload,
)


class PostViewSet(viewsets.ModelViewSet):
    lookup_field = "slug"
    lookup_value_regex = r"[-\w]+"
    permission_classes = [IsAuthorOrReadOnly]
    pagination_class = DefaultPagination

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return PostWriteSerializer
        if self.action == "retrieve":
            return PostDetailSerializer
        return PostListSerializer

    def _base_queryset(self):
        qs = (
            Post.objects.select_related("author", "category")
            .annotate(
                likes_count=Count("likes", distinct=True),
                comments_count=Count("comments", distinct=True),
            )
        )
        user = self.request.user
        if user.is_authenticated:
            qs = qs.annotate(
                is_liked=Exists(Like.objects.filter(post=OuterRef("pk"), user=user))
            )
        else:
            qs = qs.annotate(is_liked=Value(False, output_field=BooleanField()))
        return qs

    def _visible(self, qs):
        user = self.request.user
        if user.is_authenticated:
            return qs.filter(Q(status="published") | Q(author=user))
        return qs.filter(status="published")

    def get_queryset(self):
        qs = self._base_queryset()
        if self.action == "list":
            return self._filter_list(qs)
        if self.action in ("retrieve", "related", "like", "comments"):
            return self._visible(qs)
        return qs

    def _filter_list(self, qs):
        params = self.request.query_params
        user = self.request.user
        query = params.get("q", "").strip()
        category = params.get("category", "").strip()
        tag = params.get("tag", "").strip()
        author = params.get("author", "").strip()
        requested_status = params.get("status", "").strip()
        sort = params.get("sort", "newest")

        viewing_self = bool(
            author and user.is_authenticated and author.lower() == user.username.lower()
        )
        if not viewing_self:
            qs = qs.filter(status="published")
        elif requested_status in ("draft", "published"):
            qs = qs.filter(status=requested_status)
        elif requested_status != "all":
            qs = qs.filter(status="published")

        if query:
            qs = qs.filter(
                Q(title__icontains=query)
                | Q(excerpt__icontains=query)
                | Q(content__icontains=query)
                | Q(tags__icontains=query)
                | Q(author__username__icontains=query)
            )
        if category:
            qs = qs.filter(category__slug=category)
        if tag:
            qs = qs.filter(tags__icontains=tag)
        if author:
            qs = qs.filter(author__username__iexact=author)

        orderings = {
            "newest": ["-publishedAt", "-createdAt"],
            "oldest": ["publishedAt", "createdAt"],
            "popular": ["-views", "-likes_count"],
            "discussed": ["-comments_count", "-publishedAt"],
        }
        return qs.order_by(*orderings.get(sort, orderings["newest"]))

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_authenticated and instance.author_id == request.user.id:
            pass
        else:
            Post.objects.filter(pk=instance.pk).update(views=F("views") + 1)
            instance.views += 1
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        post = serializer.save(author=request.user)
        fresh = self._base_queryset().get(pk=post.pk)
        return Response(
            PostDetailSerializer(fresh, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        self.check_object_permissions(request, instance)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        post = serializer.save()
        fresh = self._base_queryset().get(pk=post.pk)
        return Response(PostDetailSerializer(fresh, context=self.get_serializer_context()).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.check_object_permissions(request, instance)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, slug=None):
        post = self.get_object()
        like, created = Like.objects.get_or_create(post=post, user=request.user)
        if not created:
            like.delete()
        return Response(
            {"liked": created, "likes_count": post.likes.count()}, status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["get", "post"])
    def comments(self, request, slug=None):
        post = self.get_object()
        if request.method == "GET":
            roots = (
                Comment.objects.filter(post=post, parent__isnull=True)
                .select_related("author")
                .prefetch_related(
                    Prefetch(
                        "replies",
                        queryset=Comment.objects.select_related("author").order_by("createdAt"),
                        to_attr="prefetched_replies",
                    )
                )
            )
            for root in roots:
                root.replies_cache = root.prefetched_replies
            data = CommentSerializer(roots, many=True, context={"request": request}).data
            return Response(data)

        if not request.user.is_authenticated:
            raise PermissionDenied("Sign in to join the conversation.")
        body = str(request.data.get("body", "")).strip()
        if not body:
            return Response({"body": ["Write something first."]}, status=400)

        parent = None
        parent_id = request.data.get("parent")
        if parent_id:
            parent = get_object_or_404(Comment, pk=parent_id, post=post)
            if parent.parent_id:
                parent = parent.parent

        comment = Comment.objects.create(
            post=post, author=request.user, body=body[:2000], parent=parent
        )
        return Response(
            CommentSerializer(comment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def related(self, request, slug=None):
        post = self.get_object()
        qs = self._visible(self._base_queryset()).exclude(pk=post.pk)
        if post.category_id:
            qs = qs.filter(category_id=post.category_id)
        else:
            qs = qs.filter(author_id=post.author_id)
        return Response(PostListSerializer(qs[:3], many=True, context={"request": request}).data)


class CommentViewSet(mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = Comment.objects.select_related("author", "post")
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        is_moderator = request.user.is_staff or comment.post.author_id == request.user.id
        if comment.author_id != request.user.id and not is_moderator:
            raise PermissionDenied("You can only delete your own comments.")
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorySerializer
    pagination_class = None
    lookup_field = "slug"

    def get_queryset(self):
        return Category.objects.annotate(
            post_count=Count("posts", filter=Q(posts__status="published"))
        )


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(build_auth_payload(user), status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer


class RefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]


class MeView(RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ProfileView(RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ProfileSerializer
    queryset = User.objects.all()
    lookup_field = "username"


class StatsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "posts": Post.objects.filter(status="published").count(),
                "authors": User.objects.filter(posts__status="published").distinct().count(),
                "comments": Comment.objects.count(),
                "likes": Like.objects.count(),
                "categories": Category.objects.count(),
            }
        )
