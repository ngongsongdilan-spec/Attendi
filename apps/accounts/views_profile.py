"""Student activity/profile hub endpoint.

GET /api/v1/students/me/activity/ and
GET /api/v1/students/{student_id}/activity/

Self-service view (any staff member may read any student). Returns a
student-centric digest used by the frontend profile page: identity,
aggregate stats, per-course attendance summary, recent attendance
history, points, projects/tasks and released assessments.
"""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User
from .serializers import MeSerializer

STAFF_ROLES = {"LECTURER", "DEPARTMENT_ADMIN", "FACULTY_ADMIN", "SYSTEM_ADMIN"}


def _attendance_summary(student):
    from apps.attendance.models import AttendanceRecord, PointsLedger

    records = list(
        AttendanceRecord.objects.filter(student=student)
        .select_related(
            "attendance_session__class_session__class_definition__course_offering__course"
        )
        .order_by("-attendance_session__started_at")
    )
    counted = [r for r in records if r.status in {"PRESENT", "ABSENT", "LATE"}]
    present = sum(1 for r in counted if r.status == "PRESENT")
    late = sum(1 for r in counted if r.status == "LATE")
    absent = sum(1 for r in counted if r.status == "ABSENT")
    total = len(counted)

    by_course = {}
    for r in counted:
        course = r.attendance_session.class_session.class_definition.course_offering.course
        key = course.code
        row = by_course.setdefault(
            key,
            {
                "course_code": course.code,
                "course_title": course.title,
                "present": 0,
                "late": 0,
                "absent": 0,
                "total": 0,
                "rate": 0,
            },
        )
        row[r.status.lower()] += 1
        row["total"] += 1
    for row in by_course.values():
        row["rate"] = round(row["present"] / row["total"] * 100) if row["total"] else 0

    points_entries = list(
        PointsLedger.objects.filter(student=student)
        .select_related("attendance_session")
        .order_by("-attendance_session__started_at")
    )
    points_total = sum(e.points for e in points_entries)
    points_by_category = {}
    for e in points_entries:
        points_by_category[e.category] = points_by_category.get(e.category, 0) + e.points

    recent = [
        {
            "recorded_at": r.recorded_at,
            "status": r.status,
            "class_name": r.attendance_session.class_session.class_definition.name,
            "course_code": r.attendance_session.class_session.class_definition.course_offering.course.code,
            "session_date": r.attendance_session.started_at.date().isoformat(),
        }
        for r in records[:20]
    ]

    return {
        "present": present,
        "late": late,
        "absent": absent,
        "total": total,
        "rate": round(present / total * 100) if total else 0,
        "by_course": sorted(by_course.values(), key=lambda x: x["course_code"]),
        "recent": recent,
        "points_total": points_total,
        "points_by_category": points_by_category,
    }


def _projects_summary(student):
    from apps.projects.models import Project, ProjectMember, ProjectTask

    memberships = list(
        ProjectMember.objects.filter(student=student)
        .select_related("project", "group", "project__course_offering__course")
    )
    projects = []
    for m in memberships:
        p = m.project
        assigned = ProjectTask.objects.filter(project=p, assigned_student=student)
        completed = assigned.filter(status=ProjectTask.Status.COMPLETED).count()
        projects.append(
            {
                "id": str(p.id),
                "title": p.title,
                "course_code": p.course_offering.course.code,
                "status": p.status,
                "deadline": p.deadline,
                "role": m.role,
                "group": m.group.name if m.group else "",
                "supervisor_name": p.supervisor.get_full_name() if p.supervisor_id else "",
                "tasks_assigned": assigned.count(),
                "tasks_completed": completed,
            }
        )
    projects.sort(key=lambda x: (x["status"] == "ACTIVE") is False)
    return projects


def _assessments_summary(student):
    from apps.projects.models import AssessmentComponent, AssessmentRecord

    records = list(
        AssessmentRecord.objects.filter(student=student, status="FINALIZED")
        .select_related("assessment_component", "assessment_component__project")
    )
    return [
        {
            "project_id": str(r.assessment_component.project_id),
            "project_title": r.assessment_component.project.title,
            "component_name": r.assessment_component.name,
            "maximum_score": str(r.assessment_component.maximum_score),
            "weight": str(r.assessment_component.weight),
            "score": str(r.score),
            "status": r.status,
            "assessed_at": r.assessed_at,
        }
        for r in records
    ]


class StudentActivityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id=None):
        target = request.user if student_id is None else get_object_or_404(User, id=student_id)
        if target is None or target.role not in {"STUDENT"}:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Student not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        if request.user.id != target.id and request.user.role not in STAFF_ROLES:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You cannot view this student's activity."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        attendance = _attendance_summary(target)
        projects = _projects_summary(target)
        assessments = _assessments_summary(target)

        from apps.projects.models import ProjectContribution

        contributions_count = ProjectContribution.objects.filter(student=target).count()

        return Response(
            {
                "student": MeSerializer(target).data,
                "stats": {
                    "points_total": attendance["points_total"],
                    "projects_total": len(projects),
                    "projects_active": sum(1 for p in projects if p["status"] == "ACTIVE"),
                    "projects_completed": sum(1 for p in projects if p["status"] == "COMPLETED"),
                    "tasks_assigned": sum(p["tasks_assigned"] for p in projects),
                    "tasks_completed": sum(p["tasks_completed"] for p in projects),
                    "contributions_count": contributions_count,
                    "attendance_rate": attendance["rate"],
                    "attendance_present": attendance["present"],
                    "attendance_absent": attendance["absent"],
                    "attendance_late": attendance["late"],
                    "attendance_total": attendance["total"],
                    "points_by_category": attendance["points_by_category"],
                },
                "attendance_by_course": attendance["by_course"],
                "recent_attendance": attendance["recent"],
                "projects": projects,
                "assessments": assessments,
            }
        )