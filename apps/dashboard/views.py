"""Aggregated dashboard endpoint (API Spec doc 07 46).

Returns role-specific data in a single call to avoid N+1 API waterfall.
The SuccessRenderer wraps the payload in the standard envelope.
"""
from django.db import models as db_models
from django.db.models import Q
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.academics.models import Semester, ClassDefinition, ClassSession, CourseOffering, Enrollment
from apps.announcements.models import Announcement
from apps.attendance.models import AttendanceRecord, AttendanceSession
from apps.accounts.models import User
from apps.projects.models import Project, ProjectTask


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == "STUDENT":
            return Response(self._student_dashboard(user))
        elif user.role == "LECTURER":
            return Response(self._lecturer_dashboard(user))
        return Response(self._admin_dashboard(user))

    def _active_period(self):
        now = timezone.now().date()
        return Semester.objects.filter(start_date__lte=now, end_date__gte=now).first()

    def _student_dashboard(self, user):
        now = timezone.now()
        enrolled_offering_ids = list(
            Enrollment.objects.filter(student=user, status="ACTIVE").values_list("course_offering_id", flat=True)
        )
        today_sessions = ClassSession.objects.filter(
            class_definition__course_offering_id__in=enrolled_offering_ids,
            starts_at__date=now.date(),
            starts_at__gte=now,
        ).select_related("class_definition", "class_definition__course_offering__course")

        offerings = CourseOffering.objects.select_related("course", "department").filter(id__in=enrolled_offering_ids)
        courses = [
            {
                "offering_id": str(off.id),
                "code": off.course.code,
                "title": off.course.title,
                "department": off.department.name if off.department else "",
            }
            for off in offerings
        ]

        announcements_qs = (
            Announcement.objects.filter(status="PUBLISHED")
            .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now))
            .order_by("-created_at")[:5]
        )

        active_projects = (
            Project.objects.filter(members__student=user, status="ACTIVE")
            .select_related("course_offering__course", "group")
            .annotate(
                task_count_total=db_models.Count("tasks", distinct=True),
                completed_task_count_total=db_models.Count(
                    "tasks", filter=db_models.Q(tasks__status="COMPLETED"), distinct=True
                ),
            )
            # A student in two groups of the same project would otherwise come
            # back twice.
            .distinct()[:5]
        )

        pending_tasks = ProjectTask.objects.filter(
            assigned_student=user, status__in=["TODO", "IN_PROGRESS"]
        ).select_related("project").order_by("due_at")[:10]

        # Attendance rate over the sessions this student was actually marked
        # for. Counting every AttendanceRecord (which includes absences) and
        # dividing by the semester's total sessions could exceed 100% and
        # penalised students who enrolled late. EXCUSED is excluded from the
        # denominator, matching apps/accounts/views_profile.py.
        marked = AttendanceRecord.objects.filter(
            student=user, status__in=["PRESENT", "LATE", "ABSENT"]
        )
        present = marked.filter(status__in=["PRESENT", "LATE"]).count()
        absent = marked.filter(status="ABSENT").count()
        total_sessions = present + absent
        attendance_rate = round(present / total_sessions * 100) if total_sessions > 0 else 0

        today_classes = [
            {
                "session_id": str(s.id),
                "class_name": s.class_definition.name,
                "course_code": s.class_definition.course_offering.course.code,
                "starts_at": s.starts_at.isoformat(),
                "location": s.class_definition.location,
            }
            for s in today_sessions
        ]

        return {
            "role": "STUDENT",
            "greeting": f"Good day, {user.first_name}",
            "stats": {
                "enrolled_courses": len(courses),
                "attendance_rate": f"{attendance_rate}%",
                "active_projects": len(active_projects),
                "pending_tasks": len(pending_tasks),
            },
            "courses": courses,
            "today_classes": today_classes,
            "announcements": [
                {"id": str(a.id), "title": a.title, "scope": a.scope_type, "created_at": a.created_at.isoformat()}
                for a in announcements_qs
            ],
            "active_projects": [
                {
                    "id": str(p.id),
                    "title": p.title,
                    "course_code": p.course_offering.course.code,
                    "status": p.status,
                    "deadline": p.deadline.isoformat() if p.deadline else None,
                    "task_count": p.task_count_total,
                    "completed_task_count": p.completed_task_count_total,
                    "group_name": p.group.name if p.group_id else "",
                }
                for p in active_projects
            ],
            "pending_tasks": [
                {
                    "id": str(t.id),
                    "title": t.title,
                    "project": t.project.title,
                    # The student needs to see what state each task is actually
                    # in, not just that it is outstanding.
                    "status": t.status,
                    "priority": t.priority,
                    "due_at": t.due_at.isoformat() if t.due_at else None,
                }
                for t in pending_tasks
            ],
            "attendance": {
                "total_sessions": total_sessions,
                "present": present,
                "absent": absent,
                "rate": attendance_rate,
            },
        }

    def _attendance_for(self, student_ids):
        """Attendance split, EXCUSED excluded so the denominator is fair.

        Returns rate 0 when nothing has been marked rather than dividing by
        zero, so the UI never has to guard against a null or NaN percentage.
        """
        marked = AttendanceRecord.objects.filter(
            student_id__in=student_ids, status__in=["PRESENT", "LATE", "ABSENT"]
        )
        present = marked.filter(status__in=["PRESENT", "LATE"]).count()
        absent = marked.filter(status="ABSENT").count()
        total = present + absent
        return {
            "total_sessions": total,
            "present": present,
            "absent": absent,
            "rate": round(present / total * 100) if total > 0 else 0,
        }

    def _lecturer_dashboard(self, user):
        now = timezone.now()
        my_classes = ClassDefinition.objects.filter(lecturer=user, status="ACTIVE").select_related("course_offering__course")
        today_sessions = ClassSession.objects.filter(
            class_definition__lecturer=user,
            starts_at__date=now.date(),
        ).select_related("class_definition__course_offering__course")
        my_projects = Project.objects.filter(
            db_models.Q(supervisor=user) | db_models.Q(created_by=user),
            status="ACTIVE",
        ).select_related("course_offering__course").distinct()

        my_offering_ids = list(my_classes.values_list("course_offering_id", flat=True))
        my_student_ids = list(
            Enrollment.objects.filter(
                course_offering_id__in=my_offering_ids, status="ACTIVE"
            ).values_list("student_id", flat=True)
        )

        return {
            "role": "LECTURER",
            "greeting": f"Good day, {user.first_name}",
            # The three dashboards share one shape, so the same widgets can be
            # reused regardless of role.
            "stats": {
                "my_classes": my_classes.count(),
                "active_projects": my_projects.count(),
                "today_classes": len(today_sessions),
                "my_students": len(set(my_student_ids)),
            },
            "attendance": self._attendance_for(my_student_ids),
            "today_classes": [
                {
                    "session_id": str(s.id),
                    "class_name": s.class_definition.name,
                    "course_code": s.class_definition.course_offering.course.code,
                    "starts_at": s.starts_at.isoformat(),
                }
                for s in today_sessions
            ],
            "my_courses": [
                {"code": cd.course_offering.course.code, "title": cd.course_offering.course.title, "name": cd.name}
                for cd in my_classes[:10]
            ],
            "active_projects": [
                {"id": str(p.id), "title": p.title, "status": p.status, "course_code": p.course_offering.course.code}
                for p in my_projects[:10]
            ],
        }

    def _admin_dashboard(self, user):
        active_projects = Project.objects.filter(status="ACTIVE")
        return {
            "role": user.role,
            "greeting": f"Good day, {user.first_name}",
            "stats": {
                "total_users": User.objects.count(),
                "total_students": User.objects.filter(role="STUDENT").count(),
                "total_lecturers": User.objects.filter(role="LECTURER").count(),
                "active_projects": active_projects.count(),
                "pending_tasks": ProjectTask.objects.filter(status__in=["TODO", "IN_PROGRESS"]).count(),
            },
            "attendance": self._attendance_for(
                User.objects.filter(role="STUDENT").values_list("id", flat=True)
            ),
            # Kept flat as well because the admin dashboard predates `stats`.
            "total_users": User.objects.count(),
            "total_students": User.objects.filter(role="STUDENT").count(),
            "total_lecturers": User.objects.filter(role="LECTURER").count(),
            "active_projects": [
                {"id": str(p.id), "title": p.title, "status": p.status}
                for p in active_projects.select_related("course_offering__course")[:10]
            ],
            "pending_tasks": [
                {
                    "id": str(t.id),
                    "title": t.title,
                    "project": t.project.title,
                    "status": t.status,
                    "priority": t.priority,
                    "due_at": t.due_at.isoformat() if t.due_at else None,
                }
                for t in ProjectTask.objects.filter(status__in=["TODO", "IN_PROGRESS"])
                .select_related("project")
                .order_by("due_at")[:10]
            ],
        }
