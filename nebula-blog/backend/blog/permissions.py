from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAuthorOrReadOnly(BasePermission):
    """Only the author (or staff) may modify an object."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        owner = getattr(obj, "author", None)
        return bool(
            request.user
            and request.user.is_authenticated
            and (owner == request.user or request.user.is_staff)
        )
