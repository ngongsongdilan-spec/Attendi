"""Announcement views with scope-based visibility (FR-061, FR-063)."""
from django.db import models as db_models
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.services import audit
from apps.core.permissions import ADMIN_ROLES

from .models import Announcement, AnnouncementRead
from .serializers import AnnouncementReadSerializer, AnnouncementSerializer

STAFF_ROLES = {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN", "LECTURER"}


def scope_filter_for(user):
    """Restrict announcements to the ones actually addressed to this person."""
    if user.role in {"SYSTEM_ADMIN", "FACULTY_ADMIN"}:
        return db_models.Q()

    if user.role == "DEPARTMENT_ADMIN":
        profile = getattr(user, "student_profile", None) or getattr(user, "lecturer_profile", None)
        if profile and profile.department:
            return (
                db_models.Q(faculty_id=profile.department.faculty_id)
                | db_models.Q(department_id=profile.department_id)
            )
        return db_models.Q(pk__in=[])

    if user.role == "LECTURER":
        from apps.academics.models import CourseOffering

        # A lecturer's audience is the courses they actually teach, whether that
        # comes from a class definition or from being the assigned lecturer.
        teaching = set(user.class_definitions.values_list("course_offering_id", flat=True))
        teaching |= set(
            CourseOffering.objects.filter(lecturer_id=user.id).values_list("id", flat=True)
        )
        q = db_models.Q(
            scope_type=Announcement.ScopeType.COURSE, course_offering_id__in=teaching
        )
        lp = getattr(user, "lecturer_profile", None)
        if lp is not None and getattr(lp, "department_id", None):
            q |= (
                db_models.Q(scope_type=Announcement.ScopeType.FACULTY, faculty_id=lp.department.faculty_id)
                | db_models.Q(scope_type=Announcement.ScopeType.DEPARTMENT, department_id=lp.department_id)
            )
        return q

    if user.role == "STUDENT":
        enrolled = user.enrollments.filter(status="ACTIVE").values_list("course_offering_id", flat=True)
        profile = getattr(user, "student_profile", None)
        q = db_models.Q(
            scope_type=Announcement.ScopeType.COURSE, course_offering_id__in=enrolled
        )
        if profile and profile.department:
            q |= (
                db_models.Q(scope_type=Announcement.ScopeType.DEPARTMENT, department_id=profile.department_id)
                | db_models.Q(scope_type=Announcement.ScopeType.FACULTY, faculty_id=profile.department.faculty_id)
            )
        return q

    return db_models.Q(pk__in=[])


def visible_announcements(user, include_unpublished=False):
    qs = Announcement.objects.select_related(
        "created_by", "faculty", "department", "course_offering"
    ).prefetch_related("reads")

    if not include_unpublished:
        now = timezone.now()
        qs = qs.filter(status=Announcement.Status.PUBLISHED)
        # A future publish date means it is queued, not live yet.
        qs = qs.filter(
            db_models.Q(published_at__isnull=True) | db_models.Q(published_at__lte=now)
        )
        qs = qs.filter(db_models.Q(expires_at__isnull=True) | db_models.Q(expires_at__gt=now))

    return qs.filter(scope_filter_for(user))


def can_manage(user, announcement):
    return announcement.created_by_id == user.id or user.role in ADMIN_ROLES


class AnnouncementListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        include_drafts = request.query_params.get("include_drafts") == "1" and (
            request.user.role in STAFF_ROLES
        )
        qs = visible_announcements(request.user, include_unpublished=include_drafts)

        course_offering_id = request.query_params.get("course_offering_id")
        if course_offering_id:
            qs = qs.filter(
                scope_type=Announcement.ScopeType.COURSE, course_offering_id=course_offering_id
            )
        scope_type = request.query_params.get("scope_type")
        if scope_type:
            qs = qs.filter(scope_type=scope_type.upper())

        return Response(
            AnnouncementSerializer(qs, many=True, context={"request": request}).data
        )

    def post(self, request):
        from apps.academics.models import CourseOffering

        if request.user.role not in STAFF_ROLES:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only staff can post announcements."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data.copy()
        data.pop("is_pinned", None)  # never set on create, only via the pin endpoint
        # created_by is read-only on the serializer; it is passed to save() below.

        scope_type = request.data.get("scope_type")
        offering_id = request.data.get("course_offering")
        if scope_type == Announcement.ScopeType.COURSE and offering_id:
            offering = CourseOffering.objects.filter(id=offering_id).first()
            if offering is None:
                return Response(
                    {"success": False, "error": {"code": "NOT_FOUND", "message": "Course offering not found."}},
                    status=status.HTTP_404_NOT_FOUND,
                )
            # BR-083: course announcements belong to the assigned lecturer.
            if request.user.role not in ADMIN_ROLES and offering.lecturer_id != request.user.id:
                return Response(
                    {"success": False, "error": {
                        "code": "FORBIDDEN",
                        "message": "You can only post course announcements for courses you teach.",
                    }},
                    status=status.HTTP_403_FORBIDDEN,
                )

        s = AnnouncementSerializer(data=data, context={"request": request})
        s.is_valid(raise_exception=True)
        announcement = s.save(
            created_by=request.user,
            published_at=request.data.get("published_at") or timezone.now(),
        )
        audit(user=request.user, action="ANNOUNCEMENT_CREATED",
              resource_type="Announcement", resource_id=announcement.id, request=request)
        return Response(
            AnnouncementSerializer(announcement, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AnnouncementDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, request, announcement_id):
        announcement = get_object_or_404(Announcement, id=announcement_id)
        # Visibility is decided by scope, not merely by being signed in.
        if not visible_announcements(request.user, include_unpublished=True).filter(
            id=announcement.id
        ).exists():
            return None, Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "This announcement is not addressed to you."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        return announcement, None

    def get(self, request, announcement_id):
        announcement, denied = self._get(request, announcement_id)
        if denied is not None:
            return denied
        return Response(
            AnnouncementSerializer(announcement, context={"request": request}).data
        )

    def patch(self, request, announcement_id):
        announcement, denied = self._get(request, announcement_id)
        if denied is not None:
            return denied
        if not can_manage(request.user, announcement):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the author or an admin can edit this announcement."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        data = request.data.copy()
        data.pop("is_pinned", None)  # pinning goes through its own endpoint

        s = AnnouncementSerializer(announcement, data=data, partial=True, context={"request": request})
        s.is_valid(raise_exception=True)
        announcement = s.save()
        return Response(
            AnnouncementSerializer(announcement, context={"request": request}).data
        )

    def delete(self, request, announcement_id):
        announcement, denied = self._get(request, announcement_id)
        if denied is not None:
            return denied
        if not can_manage(request.user, announcement):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the author or an admin can remove this announcement."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        announcement.status = Announcement.Status.ARCHIVED
        announcement.is_pinned = False
        announcement.save(update_fields=["status", "is_pinned", "updated_at"])
        audit(user=request.user, action="ANNOUNCEMENT_ARCHIVED",
              resource_type="Announcement", resource_id=announcement.id, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AnnouncementPinView(APIView):
    """POST /api/v1/announcements/{id}/pin/  { "pinned": true|false }

    Only one announcement may be pinned per audience at a time, so pinning a
    second one unpins the first rather than stacking heroes.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, announcement_id):
        announcement = get_object_or_404(Announcement, id=announcement_id)
        if not can_manage(request.user, announcement):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the author or an admin can pin this announcement."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        pinned = bool(request.data.get("pinned", True))

        if pinned:
            Announcement.objects.filter(
                scope_type=announcement.scope_type,
                faculty_id=announcement.faculty_id,
                department_id=announcement.department_id,
                course_offering_id=announcement.course_offering_id,
                is_pinned=True,
            ).exclude(id=announcement.id).update(is_pinned=False)

        announcement.is_pinned = pinned
        announcement.save(update_fields=["is_pinned", "updated_at"])
        audit(user=request.user, action="ANNOUNCEMENT_PINNED" if pinned else "ANNOUNCEMENT_UNPINNED",
              resource_type="Announcement", resource_id=announcement.id, request=request)
        return Response(
            AnnouncementSerializer(announcement, context={"request": request}).data
        )


class AnnouncementReadView(APIView):
    """POST /api/v1/announcements/{id}/read/

    Marks the caller as having read the announcement. Idempotent, and it only
    works for somebody who is actually in the audience.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, announcement_id):
        announcement = get_object_or_404(Announcement, id=announcement_id)
        if not visible_announcements(request.user, include_unpublished=False).filter(
            id=announcement.id
        ).exists():
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "This announcement is not addressed to you."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.user.role == "STUDENT":
            AnnouncementRead.objects.get_or_create(
                announcement=announcement, user=request.user
            )
        return Response(
            AnnouncementSerializer(announcement, context={"request": request}).data
        )


class AnnouncementReadersView(APIView):
    """GET /api/v1/announcements/{id}/readers/  ?unread=1

    Who has and has not read it. Staff and the author only, because this is a
    participation record for named individuals.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, announcement_id):
        announcement = get_object_or_404(Announcement, id=announcement_id)
        if not can_manage(request.user, announcement):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only the author or an admin can see who read this."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        read_ids = set(announcement.reads.values_list("user_id", flat=True))
        readers = announcement.reads.select_related("user").all()[:100]
        recipients = [
            u for u in announcement.audience_queryset() if u.id not in read_ids
        ]

        return Response({
            "announcement": str(announcement.id),
            "read_count": len(read_ids),
            "recipient_count": len(read_ids) + len(recipients),
            "readers": AnnouncementReadSerializer(readers, many=True).data,
            "unread": [
                {
                    "id": str(u.id),
                    "full_name": u.get_full_name(),
                    "student_number": (
                        u.student_profile.student_number
                        if hasattr(u, "student_profile") and u.student_profile else ""
                    ),
                }
                for u in recipients[:100]
            ],
        })


class MyAnnouncementReadStateView(APIView):
    """GET /api/v1/announcements/read-state/

    Which of the announcements the caller can see they have not opened yet,
    so the UI can show an unread count without downloading everything.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        unread = 0
        for announcement in visible_announcements(request.user):
            if not announcement.reads.filter(user=request.user).exists():
                unread += 1
        return Response({"unread": unread})
