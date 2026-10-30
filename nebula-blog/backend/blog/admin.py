from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Category, Comment, Like, Post, User


@admin.register(User)
class NebulaUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Profile", {"fields": ("headline", "bio", "avatar_color", "avatar_url")}),
    )
    list_display = ["username", "email", "headline", "is_staff"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "accent"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "category", "status", "views", "publishedAt"]
    list_filter = ["status", "theme", "category"]
    search_fields = ["title", "excerpt", "content", "author__username"]
    prepopulated_fields = {"slug": ("title",)}
    raw_id_fields = ["author"]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["author", "post", "createdAt"]
    search_fields = ["body", "author__username", "post__title"]


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ["user", "post", "createdAt"]
