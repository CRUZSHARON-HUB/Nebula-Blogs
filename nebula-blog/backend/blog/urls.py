from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    CommentViewSet,
    LoginView,
    MeView,
    PostViewSet,
    ProfileView,
    RefreshView,
    RegisterView,
    StatsView,
)

router = DefaultRouter()
router.register("posts", PostViewSet, basename="post")
router.register("categories", CategoryViewSet, basename="category")
router.register("comments", CommentViewSet, basename="comment")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", RefreshView.as_view(), name="token-refresh"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("profiles/<str:username>/", ProfileView.as_view(), name="profile"),
    path("stats/", StatsView.as_view(), name="stats"),
    path("", include(router.urls)),
]
