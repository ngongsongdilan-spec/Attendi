from rest_framework import serializers

from .models import Announcement, AnnouncementRead


class AnnouncementReadSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    student_number = serializers.SerializerMethodField()

    class Meta:
        model = AnnouncementRead
        fields = ["id", "user", "user_name", "student_number", "read_at"]

    def get_user_name(self, obj):
        return obj.user.get_full_name()

    def get_student_number(self, obj):
        profile = getattr(obj.user, "student_profile", None)
        return profile.student_number if profile else ""


class AnnouncementSerializer(serializers.ModelSerializer):
    creator_name = serializers.SerializerMethodField()
    read_count = serializers.SerializerMethodField()
    recipient_count = serializers.SerializerMethodField()
    is_read = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()
    audience_label = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            "id", "created_by", "creator_name", "scope_type", "audience_label",
            "faculty", "department", "course_offering",
            "title", "content", "status", "is_pinned", "can_manage",
            "published_at", "expires_at", "is_expired", "created_at",
            "read_count", "recipient_count", "is_read",
        ]
        # Pinned and scheduling are server decisions, never client input.
        read_only_fields = ["created_by", "published_at", "is_pinned"]

    def _user(self):
        request = self.context.get("request")
        return getattr(request, "user", None)

    def get_creator_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by_id else ""

    def get_audience_label(self, obj):
        if obj.scope_type == Announcement.ScopeType.COURSE and obj.course_offering_id:
            course = obj.course_offering.course
            return f"{course.code} {course.title}"
        if obj.scope_type == Announcement.ScopeType.DEPARTMENT and obj.department_id:
            return obj.department.name
        if obj.scope_type == Announcement.ScopeType.FACULTY:
            return obj.faculty.name if obj.faculty_id else "Whole faculty"
        return "Whole faculty"

    def get_recipient_count(self, obj):
        if not hasattr(obj, "_recipient_total"):
            obj._recipient_total = obj.audience_queryset().count()
        return obj._recipient_total

    def get_read_count(self, obj):
        if not hasattr(obj, "_read_total"):
            obj._read_total = obj.reads.count()
        return obj._read_total

    def get_is_read(self, obj):
        user = self._user()
        if not user or not user.is_authenticated:
            return False
        if not hasattr(obj, "_read_user_ids"):
            obj._read_user_ids = set(obj.reads.values_list("user_id", flat=True))
        return user.id in obj._read_user_ids

    def get_is_expired(self, obj):
        from django.utils import timezone

        return bool(obj.expires_at and obj.expires_at <= timezone.now())

    def get_can_manage(self, obj):
        user = self._user()
        if not user or not user.is_authenticated:
            return False
        return obj.created_by_id == user.id or user.role in {
            "SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN"
        }
