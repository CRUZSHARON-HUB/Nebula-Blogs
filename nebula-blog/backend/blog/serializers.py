import re

from django.contrib.auth.password_validation import validate_password
from django.db.models import Count, Sum
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Category, Comment, Post, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "headline",
            "bio",
            "avatar_color",
            "avatar_url",
            "date_joined",
        ]
        read_only_fields = ["id", "username", "date_joined"]


class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "headline", "avatar_color", "avatar_url"]


class CategorySerializer(serializers.ModelSerializer):
    post_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "accent", "post_count"]


class TagListField(serializers.Field):
    """Store tags as a comma separated string, expose them as a list."""

    def to_representation(self, value):
        return [tag.strip() for tag in (value or "").split(",") if tag.strip()]

    def to_internal_value(self, data):
        if isinstance(data, str):
            items = [data]
        elif isinstance(data, (list, tuple)):
            items = data
        else:
            raise serializers.ValidationError("Tags must be a list of strings.")
        cleaned = []
        for item in items:
            for piece in str(item).split(","):
                piece = re.sub(r"[^a-zA-Z0-9\- ]", "", piece).strip().lower()
                if piece and piece not in cleaned:
                    cleaned.append(piece)
        return ",".join(cleaned[:6])


class PostListSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    tags = TagListField(read_only=True)
    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.BooleanField(read_only=True)
    is_owner = serializers.SerializerMethodField()
    reading_time = serializers.IntegerField(read_only=True)

    class Meta:
        model = Post
        fields = [
            "id",
            "title",
            "slug",
            "excerpt",
            "author",
            "category",
            "tags",
            "cover_url",
            "theme",
            "status",
            "views",
            "reading_time",
            "likes_count",
            "comments_count",
            "is_liked",
            "is_owner",
            "publishedAt",
            "createdAt",
        ]

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return bool(
            request
            and request.user.is_authenticated
            and (obj.author_id == request.user.id or request.user.is_staff)
        )


class PostDetailSerializer(PostListSerializer):
    class Meta(PostListSerializer.Meta):
        fields = PostListSerializer.Meta.fields + ["content", "updatedAt"]


class PostWriteSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        source="category",
        queryset=Category.objects.all(),
        allow_null=True,
        required=False,
        write_only=True,
    )
    tags = TagListField(required=False)

    class Meta:
        model = Post
        fields = [
            "title",
            "excerpt",
            "content",
            "category_id",
            "tags",
            "cover_url",
            "theme",
            "status",
        ]

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 4:
            raise serializers.ValidationError("Give your story a title of at least 4 characters.")
        return value

    def validate_content(self, value):
        if len(value.strip()) < 20:
            raise serializers.ValidationError("Write at least 20 characters of content.")
        return value

    def validate_tags(self, value):
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        status_value = attrs.get("status", getattr(self.instance, "status", None))
        content = attrs.get("content", getattr(self.instance, "content", ""))
        if status_value == "published" and not (content or "").strip():
            raise serializers.ValidationError("Published posts need content.")
        return attrs


class CommentSerializer(serializers.ModelSerializer):
    author = UserMiniSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "post", "author", "parent", "body", "createdAt", "replies", "is_owner"]
        read_only_fields = ["post", "author", "createdAt", "replies", "is_owner"]

    def get_replies(self, obj):
        replies = getattr(obj, "replies_cache", None)
        if replies is None:
            replies = obj.replies.select_related("author").order_by("createdAt")
        return CommentSerializer(replies, many=True, context=self.context).data

    def get_is_owner(self, obj):
        request = self.context.get("request")
        if not (request and request.user.is_authenticated):
            return False
        return obj.author_id == request.user.id or request.user.is_staff


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "email", "password", "headline"]
        extra_kwargs = {
            "email": {"required": False, "allow_blank": True},
            "headline": {"required": False},
        }

    def validate_username(self, value):
        value = value.strip()
        if not re.fullmatch(r"[a-zA-Z0-9_]{3,20}", value):
            raise serializers.ValidationError(
                "Usernames are 3-20 characters: letters, numbers and underscores."
            )
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("That username is already taken.")
        return value

    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with that email already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        colors = ["#7c5cff", "#22d3ee", "#f472b6", "#34d399", "#fbbf24", "#fb7185"]
        user = User(
            **validated_data,
            avatar_color=colors[User.objects.count() % len(colors)],
        )
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        identifier = attrs.get("username", "")
        if "@" in identifier:
            user = User.objects.filter(email__iexact=identifier).first()
            if user:
                attrs["username"] = user.username
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


def build_auth_payload(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    }


class ProfileSerializer(serializers.ModelSerializer):
    stats = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "headline", "bio", "avatar_color", "avatar_url", "date_joined", "stats"]

    def get_stats(self, obj):
        posts = obj.posts
        published = posts.filter(status="published").count()
        likes = Post.objects.filter(author=obj, status="published").aggregate(
            total=Count("likes")
        )["total"] or 0
        comments = Comment.objects.filter(post__author=obj).count()
        return {
            "posts": published,
            "drafts": posts.exclude(status="published").count(),
            "likes": likes,
            "comments": comments,
            "views": posts.aggregate(total=Sum("views"))["total"] or 0,
        }


class GlobalStatsSerializer(serializers.Serializer):
    posts = serializers.IntegerField()
    authors = serializers.IntegerField()
    comments = serializers.IntegerField()
    likes = serializers.IntegerField()
    categories = serializers.IntegerField()
