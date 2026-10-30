from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class User(AbstractUser):
    headline = models.CharField(max_length=120, blank=True, default="")
    bio = models.TextField(blank=True, default="")
    avatar_color = models.CharField(max_length=7, default="#7c5cff")
    avatar_url = models.URLField(blank=True, default="")

    @property
    def avatar_url_or_empty(self):
        return self.avatar_url or ""

    def __str__(self):
        return self.username


class Category(models.Model):
    name = models.CharField(max_length=60, unique=True)
    slug = models.SlugField(max_length=70, unique=True)
    description = models.CharField(max_length=200, blank=True, default="")
    accent = models.CharField(max_length=7, default="#7c5cff")

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Post(models.Model):
    THEMES = [
        ("aurora", "Aurora"),
        ("ember", "Ember"),
        ("ocean", "Ocean"),
        ("lime", "Lime"),
        ("candy", "Candy"),
        ("mono", "Mono"),
    ]
    STATUS_CHOICES = [("draft", "Draft"), ("published", "Published")]

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")
    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    excerpt = models.CharField(max_length=260, blank=True, default="")
    content = models.TextField()
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="posts"
    )
    tags = models.CharField(max_length=200, blank=True, default="")
    cover_url = models.URLField(blank=True, default="")
    theme = models.CharField(max_length=20, choices=THEMES, default="aurora")
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="published")
    views = models.PositiveIntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    updatedAt = models.DateTimeField(auto_now=True)
    publishedAt = models.DateTimeField(null=True, blank=True)
    liked_by = models.ManyToManyField(User, through="Like", related_name="liked_posts")

    class Meta:
        ordering = ["-publishedAt", "-createdAt"]
        indexes = [models.Index(fields=["status", "-publishedAt"])]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:180] or "post"
            slug = base
            counter = 2
            while Post.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        if self.status == "published" and self.publishedAt is None:
            self.publishedAt = timezone.now()
        if not self.excerpt and self.content:
            plain = " ".join(
                line.strip("#> -")
                for line in self.content.splitlines()
                if line.strip() and not line.strip().startswith("```")
            )
            self.excerpt = (plain[:237] + "...") if len(plain) > 240 else plain
        super().save(*args, **kwargs)

    @property
    def reading_time(self):
        words = len(self.content.split())
        return max(1, round(words / 220))

    def __str__(self):
        return self.title


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="comments")
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="replies"
    )
    body = models.TextField(max_length=2000)
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["createdAt"]

    def __str__(self):
        return f"{self.author} on {self.post}"


class Like(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="likes")
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["post", "user"], name="unique_like_per_user")
        ]

    def __str__(self):
        return f"{self.user} likes {self.post}"
