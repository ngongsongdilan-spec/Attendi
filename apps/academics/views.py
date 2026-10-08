"""Academics views (API Spec doc 07 §§16-23).

Faculty, Department, Course, Offering, Enrollment, ClassDefinition, ClassSession.
"""
from django.db import models as db_models
from django.shortcuts import get_object_or_404
from django.utils import timezone as tz
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.core.permissions import IsAdmin, IsLecturerOrAdmin
from apps.audit.services import audit
from apps.learning.models import Assessment, AssessmentMark, AssignmentSubmission

from .models import (
    Semester,
    CarryOverApplication,
    ClassDefinition,
    ClassSchedule,
    ClassSession,
    Course,
    CourseOffering,
    Department,
    Enrollment,
    Faculty,
)
from .serializers import (
    SemesterSerializer,
    ClassDefinitionSerializer,
    ClassScheduleSerializer,
    ClassSessionSerializer,
    CourseOfferingSerializer,
    CourseSerializer,
    DepartmentSerializer,
    EnrollmentSerializer,
    FacultySerializer,
    StudentBriefSerializer,
)


class FacultyListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(FacultySerializer(Faculty.objects.all(), many=True).data)


class FacultyCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        s = FacultySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        faculty = s.save()
        audit(user=request.user, action="FACULTY_CREATED", resource_type="Faculty", resource_id=faculty.id, request=request)
        return Response(FacultySerializer(faculty).data, status=status.HTTP_201_CREATED)


class FacultyDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, faculty_id):
        faculty = get_object_or_404(Faculty, id=faculty_id)
        return Response(FacultySerializer(faculty).data)


class DepartmentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Department.objects.select_related("faculty").all()
        faculty_id = request.query_params.get("faculty_id")
        if faculty_id:
            qs = qs.filter(faculty_id=faculty_id)
        return Response(DepartmentSerializer(qs, many=True).data)


class PublicDepartmentListView(APIView):
    """GET /api/v1/departments/public/ - used by the self-registration form."""

    permission_classes = [AllowAny]

    def get(self, request):
        from rest_framework.permissions import AllowAny as _AllowAny
        qs = Department.objects.select_related("faculty").filter(status="ACTIVE")
        return Response(DepartmentSerializer(qs, many=True).data)


class DepartmentCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        s = DepartmentSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        dept = s.save()
        audit(user=request.user, action="DEPARTMENT_CREATED", resource_type="Department", resource_id=dept.id, request=request)
        return Response(DepartmentSerializer(dept).data, status=status.HTTP_201_CREATED)


class DepartmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, department_id):
        dept = get_object_or_404(Department, id=department_id)
        return Response(DepartmentSerializer(dept).data)


class SemesterListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(SemesterSerializer(Semester.objects.all(), many=True).data)


class SemesterActivateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, semester_id):
        if request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN"}:
            return Response({"error": "Forbidden"}, status=403)
        semester = get_object_or_404(Semester, id=semester_id)
        semester.is_active = True
        semester.save()
        # Returned bare: SuccessRenderer already wraps it as {success, data}.
        return Response(SemesterSerializer(semester).data)


class AdminStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN"}:
            return Response({"error": "Forbidden"}, status=403)

        from apps.accounts.models import User, StudentProfile, LecturerProfile

        active_semester = Semester.objects.filter(is_active=True).first()
        stats = {
            "total_students": User.objects.filter(role="STUDENT").count(),
            "total_lecturers": User.objects.filter(role="LECTURER").count(),
            "total_departments": 0,
            "total_courses": 0,
            "total_offerings": 0,
            "total_enrollments": 0,
            "active_semester": None,
        }

        if active_semester:
            stats["active_semester"] = {
                "id": str(active_semester.id),
                "name": active_semester.name,
                "academic_year": active_semester.academic_year,
                "number": active_semester.number,
            }
            stats["total_offerings"] = CourseOffering.objects.filter(semester=active_semester).count()
            stats["total_enrollments"] = Enrollment.objects.filter(
                course_offering__semester=active_semester,
                status=Enrollment.Status.ACTIVE,
            ).count()

        stats["total_courses"] = Course.objects.count()
        stats["total_departments"] = Department.objects.count()

        # Returned bare: SuccessRenderer already wraps it as {success, data}.
        return Response(stats)


class CourseListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Course.objects.select_related("department").all()
        department_id = request.query_params.get("department_id")
        level = request.query_params.get("level")
        search = request.query_params.get("search")
        if department_id:
            qs = qs.filter(department_id=department_id)
        if level:
            qs = qs.filter(level=level)
        if search:
            qs = qs.filter(db_models.Q(title__icontains=search) | db_models.Q(code__icontains=search))
        return Response(CourseSerializer(qs, many=True).data)

    def post(self, request):
        from django.db import models as db_models
        s = CourseSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        course = s.save()
        audit(user=request.user, action="COURSE_CREATED", resource_type="Course", resource_id=course.id, request=request)
        return Response(CourseSerializer(course).data, status=status.HTTP_201_CREATED)


class CourseDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        return Response(CourseSerializer(course).data)


class CourseOfferingListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = CourseOffering.objects.select_related("course", "semester", "department").all()
        for param in ("course_id", "semester_id", "department_id"):
            val = request.query_params.get(param)
            if val:
                qs = qs.filter(**{param: val})
        return Response(CourseOfferingSerializer(qs, many=True).data)


class CourseOfferingCreateView(APIView):
    permission_classes = [IsAuthenticated, IsLecturerOrAdmin]

    def post(self, request):
        s = CourseOfferingSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        offering = s.save()
        return Response(CourseOfferingSerializer(offering).data, status=status.HTTP_201_CREATED)


class CourseOfferingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, offering_id):
        offering = get_object_or_404(CourseOffering, id=offering_id)
        return Response(CourseOfferingSerializer(offering).data)

    def patch(self, request, offering_id):
        if not IsAdmin().has_permission(request, self):
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only administrators can assign course lecturers."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        if "lecturer" not in request.data:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "lecturer is required; use null to unassign."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        offering = get_object_or_404(CourseOffering, id=offering_id)
        lecturer_id = request.data.get("lecturer")
        lecturer = None
        if lecturer_id:
            lecturer = get_object_or_404(
                User, id=lecturer_id, role="LECTURER", is_active=True, status=User.Status.ACTIVE
            )

        previous_lecturer_id = offering.lecturer_id
        offering.lecturer = lecturer
        offering.save(update_fields=["lecturer", "updated_at"])
        audit(
            user=request.user,
            action="COURSE_LECTURER_ASSIGNED",
            resource_type="CourseOffering",
            resource_id=offering.id,
            request=request,
            metadata={"previous_lecturer_id": str(previous_lecturer_id or ""), "lecturer_id": str(lecturer.id if lecturer else "")},
        )
        return Response(CourseOfferingSerializer(offering).data)


# ---------------------------------------------------------------------------
# Enrollment (API Spec doc 07 §20)
# ---------------------------------------------------------------------------

class EnrollmentListView(APIView):
    """GET enrolled students for a course offering."""

    permission_classes = [IsAuthenticated]

    def get(self, request, offering_id):
        offering = get_object_or_404(CourseOffering, id=offering_id)
        if request.user.role == "STUDENT":
            if not Enrollment.objects.filter(student=request.user, course_offering=offering, status=Enrollment.Status.ACTIVE).exists():
                return Response(
                    {"success": False, "error": {"code": "FORBIDDEN", "message": "You are not enrolled in this course."}},
                    status=status.HTTP_403_FORBIDDEN,
                )
        enrollments = Enrollment.objects.filter(course_offering=offering).select_related("student")
        return Response(EnrollmentSerializer(enrollments, many=True).data)

    def post(self, request, offering_id):
        offering = get_object_or_404(CourseOffering, id=offering_id)
        if not offering.semester.is_active:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Enrollment is only open for the active semester."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN", "LECTURER"}:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only authorized staff can enroll students."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        student_id = request.data.get("student_id")
        student = get_object_or_404(User, id=student_id, role="STUDENT")
        if Enrollment.objects.filter(student=student, course_offering=offering, status=Enrollment.Status.ACTIVE).exists():
            return Response(
                {"success": False, "error": {"code": "CONFLICT", "message": "Student is already enrolled in this offering."}},
                status=status.HTTP_409_CONFLICT,
            )
        enrollment = Enrollment.objects.create(student=student, course_offering=offering)
        audit(user=request.user, action="STUDENT_ENROLLED", resource_type="Enrollment", resource_id=enrollment.id, request=request,
              metadata={"student_id": str(student.id), "offering_id": str(offering.id)})
        return Response(EnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)

    def delete(self, request, offering_id, student_id):
        offering = get_object_or_404(CourseOffering, id=offering_id)
        enrollment = get_object_or_404(Enrollment, student_id=student_id, course_offering=offering, status=Enrollment.Status.ACTIVE)
        enrollment.status = Enrollment.Status.DROPPED
        from django.utils import timezone
        enrollment.dropped_at = timezone.now()
        enrollment.save(update_fields=["status", "dropped_at", "updated_at"])
        audit(user=request.user, action="STUDENT_DROPPED", resource_type="Enrollment", resource_id=enrollment.id, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyCoursesView(APIView):
    """GET /api/v1/students/me/courses - student's enrolled courses for current period."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        active_semester = Semester.objects.filter(is_active=True).first()
        if active_semester is None:
            return Response([])
        enrollments = Enrollment.objects.filter(
            student=request.user,
            course_offering__semester=active_semester,
            status=Enrollment.Status.ACTIVE,
        ).select_related("course_offering", "course_offering__course", "course_offering__department")
        result = []
        for e in enrollments:
            off = e.course_offering
            result.append({
                "enrollment_id": e.id,
                "offering_id": off.id,
                "course_code": off.course.code,
                "course_title": off.course.title,
                "department": off.department.name if off.department else "",
                "semester": off.semester.name,
                "lecturer_name": off.lecturer.get_full_name() if off.lecturer else "TBA",
                "materials_count": off.materials.count(),
                "announcements_count": off.announcements.count(),
                "assignments_count": off.assignments.count(),
            })
        return Response(result)


class StudentRegistrationView(APIView):
    """GET /api/v1/students/me/available-courses - courses available for registration.
    POST /api/v1/students/me/register/ - register for selected courses."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "STUDENT":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only students can access this endpoint."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = getattr(request.user, "student_profile", None)
        profile = getattr(request.user, "student_profile", None)
        if not profile or not profile.department or not profile.level:
            return Response(
                {"success": False, "error": {"code": "INCOMPLETE_PROFILE", "message": "Your profile is missing department or level information."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        active_semester = Semester.objects.filter(is_active=True).first()
        if not active_semester:
            return Response(
                {"success": False, "error": {"code": "NO_ACTIVE_SEMESTER", "message": "No active semester found."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        available = CourseOffering.objects.filter(
            department=profile.department,
            semester=active_semester,
            status="ACTIVE",
            course__level=profile.level,
        ).select_related("course", "department", "semester", "lecturer")

        already_enrolled = set(
            Enrollment.objects.filter(
                student=request.user,
                course_offering__semester=active_semester,
                status=Enrollment.Status.ACTIVE,
            ).values_list("course_offering_id", flat=True)
        )
        result = []
        for off in available:
            result.append({
                "offering_id": str(off.id),
                "course_code": off.course.code,
                "course_title": off.course.title,
                "credit_units": off.course.credit_units,
                "lecturer_name": off.lecturer.get_full_name() if off.lecturer else "TBA",
                "is_enrolled": off.id in already_enrolled,
            })
        return Response({
            "semester": active_semester.name,
            "registration_deadline": active_semester.registration_deadline,
            "level": profile.level,
            "department": profile.department.name,
            "courses": result,
        })

    def post(self, request):
        if request.user.role != "STUDENT":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only students can access this endpoint."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = getattr(request.user, "student_profile", None)
        if not profile or not profile.department or not profile.level:
            return Response(
                {"success": False, "error": {"code": "INCOMPLETE_PROFILE", "message": "Your profile is missing department or level information."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        active_semester = Semester.objects.filter(is_active=True).first()
        if not active_semester:
            return Response(
                {"success": False, "error": {"code": "NO_ACTIVE_SEMESTER", "message": "No active semester found."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        offering_ids = request.data.get("offering_ids", [])
        if not isinstance(offering_ids, list):
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "offering_ids must be a list."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not offering_ids:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "No courses selected."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        available = set(
            CourseOffering.objects.filter(
                department=profile.department,
                semester=active_semester,
                status="ACTIVE",
                course__level=profile.level,
            ).values_list("id", flat=True)
        )
        created = []
        errors = []
        for oid in offering_ids:
            try:
                import uuid
                off_id = uuid.UUID(str(oid))
            except ValueError:
                errors.append({"offering_id": str(oid), "error": "Invalid ID format"})
                continue
            if off_id not in available:
                errors.append({"offering_id": str(oid), "error": "Course not available for your department/level"})
                continue
            enrollment, was_created = Enrollment.objects.get_or_create(
                student=request.user,
                course_offering_id=off_id,
                defaults={"status": Enrollment.Status.ACTIVE},
            )
            activated = was_created
            if not was_created and enrollment.status == Enrollment.Status.DROPPED:
                enrollment.status = Enrollment.Status.ACTIVE
                enrollment.dropped_at = None
                enrollment.save(update_fields=["status", "dropped_at", "updated_at"])
                activated = True
            if activated:
                created.append(str(off_id))
                from apps.projects.services import sync_student_memberships_for_offering

                sync_student_memberships_for_offering(request.user, CourseOffering.objects.get(id=off_id))
        return Response({
            "success": True,
            "registered_count": len(created),
            "registered": created,
            "errors": errors if errors else None,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Class Definitions (API Spec doc 07 §22)
# ---------------------------------------------------------------------------

class ClassDefinitionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, offering_id):
        offering = get_object_or_404(CourseOffering, id=offering_id)
        return Response(ClassDefinitionSerializer(offering.class_definitions.all(), many=True).data)

    def post(self, request, offering_id):
        offering = get_object_or_404(CourseOffering, id=offering_id)
        if request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN", "LECTURER"}:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Not authorized."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        data = request.data.copy()
        data["course_offering"] = offering.id
        s = ClassDefinitionSerializer(data=data)
        s.is_valid(raise_exception=True)
        cd = s.save()
        return Response(ClassDefinitionSerializer(cd).data, status=status.HTTP_201_CREATED)


class ClassDefinitionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, class_id):
        cd = get_object_or_404(ClassDefinition, id=class_id)
        return Response(ClassDefinitionSerializer(cd).data)


# ---------------------------------------------------------------------------
# Class Sessions (API Spec doc 07 §23)
# ---------------------------------------------------------------------------

class ClassSessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, class_id):
        cd = get_object_or_404(ClassDefinition, id=class_id)
        return Response(ClassSessionSerializer(cd.sessions.all(), many=True).data)

    def post(self, request, class_id):
        cd = get_object_or_404(ClassDefinition, id=class_id)
        if request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN", "LECTURER"}:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Not authorized."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        data = request.data.copy()
        data["class_definition"] = cd.id
        s = ClassSessionSerializer(data=data)
        s.is_valid(raise_exception=True)
        cs = s.save()
        return Response(ClassSessionSerializer(cs).data, status=status.HTTP_201_CREATED)


class ClassSessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        cs = get_object_or_404(ClassSession, id=session_id)
        return Response(ClassSessionSerializer(cs).data)


class EligibleStudentsView(APIView):
    """GET eligible students for a class session (API Spec doc 07 §21).
    Determines eligibility from course enrollment (FR-002, BR-011)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        from apps.attendance.models import AttendanceSession

        cs = get_object_or_404(ClassSession, id=session_id)
        owner = cs.class_definition.lecturer_id
        offering_lecturer = cs.class_definition.course_offering.lecturer_id
        # Whoever is actually running attendance for this class needs the roster,
        # even if they are not the class owner (e.g. a delegated lecturer).
        running = set(
            AttendanceSession.objects.filter(
                class_session=cs, lecturer=request.user
            ).values_list("lecturer_id", flat=True)
        )
        allowed = request.user.role in {
            "SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN",
        } or request.user.id in {owner, offering_lecturer} or request.user.id in running
        if not allowed:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "You can only view the roster of classes you teach."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        students = cs.eligible_students
        return Response(StudentBriefSerializer(students, many=True).data)


# ---------------------------------------------------------------------------
# Lecturer teaching courses & weekly timetable (ClassSchedule)
# ---------------------------------------------------------------------------

class LecturerMyCoursesView(APIView):
    """GET /api/v1/lecturers/me/courses - offerings the lecturer teaches,
    with enrollment counts, class definitions and weekly timetable slots."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        active_semester = Semester.objects.filter(is_active=True).first()
        qs = CourseOffering.objects.select_related("course", "department", "semester")
        qs = qs.filter(lecturer=request.user)
        if active_semester:
            qs = qs.filter(semester=active_semester)
        result = []
        for off in qs:
            schedules = off.schedules.filter(is_active=True)
            # Work waiting on the lecturer, aggregated for the dashboard.
            ungraded = AssignmentSubmission.objects.filter(
                assignment__course_offering=off,
                status=AssignmentSubmission.Status.SUBMITTED,
            ).count()
            open_disputes = AssessmentMark.objects.filter(
                assessment__course_offering=off,
                dispute_status=AssessmentMark.DisputeStatus.OPEN,
            ).count()
            result.append({
                "offering_id": off.id,
                "course_code": off.course.code,
                "course_title": off.course.title,
                "department": off.department.name if off.department else "",
                "semester": off.semester.name,
                "lecturer_name": off.lecturer.get_full_name() if off.lecturer else "",
                "materials_count": off.materials.count(),
                "announcements_count": off.announcements.count(),
                "assignments_count": off.assignments.count(),
                "assessments_count": off.assessments.count(),
                "published_assessments_count": off.assessments.filter(status=Assessment.Status.PUBLISHED).count(),
                "ungraded_submissions": ungraded,
                "open_disputes": open_disputes,
                "enrolled_students": off.enrollments.filter(status=Enrollment.Status.ACTIVE).count(),
                "class_definitions": [
                    {"id": cd.id, "name": cd.name, "class_type": cd.class_type, "location": cd.location}
                    for cd in off.class_definitions.all()
                ],
                "schedules": ClassScheduleSerializer(schedules, many=True).data,
            })
        return Response(result)


class ScheduleListView(APIView):
    """GET/POST /api/v1/course-offerings/{offering_id}/schedules - weekly timetable slots."""

    permission_classes = [IsAuthenticated]

    def get(self, request, offering_id):
        offering = get_object_or_404(CourseOffering, id=offering_id)
        return Response(ClassScheduleSerializer(offering.schedules.filter(is_active=True), many=True).data)

    def post(self, request, offering_id):
        offering = get_object_or_404(CourseOffering, id=offering_id)
        if request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN", "LECTURER"}:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Not authorized."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        data = request.data.copy()
        data["course_offering"] = str(offering.id)
        s = ClassScheduleSerializer(data=data)
        s.is_valid(raise_exception=True)
        # `lecturer` is read-only on the serializer, so putting it in `data`
        # would be dropped and the insert would fail on a NOT NULL column.
        schedule = s.save(lecturer_id=offering.lecturer_id or request.user.id)
        audit(user=request.user, action="SCHEDULE_CREATED", resource_type="ClassSchedule", resource_id=schedule.id, request=request)
        return Response(ClassScheduleSerializer(schedule).data, status=status.HTTP_201_CREATED)


class ScheduleDetailView(APIView):
    """DELETE /api/v1/schedules/{schedule_id} - remove a timetable slot."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, schedule_id):
        schedule = get_object_or_404(ClassSchedule, id=schedule_id)
        if schedule.lecturer_id != request.user.id and request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN"}:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Not authorized."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        schedule.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Carry-over applications (BR-004)
# ---------------------------------------------------------------------------

class CarryOverApplyView(APIView):
    """POST /api/v1/carry-over/apply/ - student requests to register for a
    course they were not enrolled in (e.g. repeating a failed course)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != "STUDENT":
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only students can apply for carry-over registration."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        offering_id = request.data.get("course_offering_id")
        offering = get_object_or_404(CourseOffering, id=offering_id)
        reason = (request.data.get("reason") or "").strip()

        if Enrollment.objects.filter(student=request.user, course_offering=offering, status=Enrollment.Status.ACTIVE).exists():
            return Response(
                {"success": False, "error": {"code": "CONFLICT", "message": "You are already registered for this course."}},
                status=status.HTTP_409_CONFLICT,
            )
        app, created = CarryOverApplication.objects.get_or_create(
            student=request.user, course_offering=offering,
            defaults={"reason": reason, "status": CarryOverApplication.Status.PENDING},
        )
        if not created and app.status == CarryOverApplication.Status.APPROVED:
            return Response(
                {"success": False, "error": {"code": "CONFLICT", "message": "Your carry-over application was already approved."}},
                status=status.HTTP_409_CONFLICT,
            )
        return Response({
            "id": app.id,
            "course_offering_id": str(offering.id),
            "course_code": offering.course.code,
            "course_title": offering.course.title,
            "status": app.status,
            "reason": app.reason,
            "created_at": app.created_at,
        }, status=status.HTTP_201_CREATED)


class CarryOverListView(APIView):
    """GET /api/v1/carry-over/ - staff see all applications, students see their own."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = CarryOverApplication.objects.select_related("student", "course_offering", "course_offering__course")
        if request.user.role == "STUDENT":
            qs = qs.filter(student=request.user)
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter.upper())
        result = [
            {
                "id": a.id,
                "student_id": str(a.student_id),
                "student_name": a.student.get_full_name(),
                "student_email": a.student.email,
                "matricule": getattr(getattr(a.student, "student_profile", None), "student_number", ""),
                "course_offering_id": str(a.course_offering_id),
                "course_code": a.course_offering.course.code,
                "course_title": a.course_offering.course.title,
                "reason": a.reason,
                "status": a.status,
                "review_note": a.review_note,
                "created_at": a.created_at,
            }
            for a in qs
        ]
        return Response(result)


class CarryOverReviewView(APIView):
    """POST /api/v1/carry-over/{id}/review/ {decision: APPROVED|REJECTED, note?}

    Approval creates the Enrollment - only then can attendance be
    confirmed for this student in this course (BR-031).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, application_id):
        if request.user.role not in {"SYSTEM_ADMIN", "FACULTY_ADMIN", "DEPARTMENT_ADMIN", "LECTURER"}:
            return Response(
                {"success": False, "error": {"code": "FORBIDDEN", "message": "Only staff can review applications."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        app = get_object_or_404(CarryOverApplication, id=application_id)
        decision = (request.data.get("decision") or "").upper()
        if decision not in {CarryOverApplication.Status.APPROVED, CarryOverApplication.Status.REJECTED}:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "decision must be APPROVED or REJECTED."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        app.status = decision
        app.review_note = (request.data.get("note") or "").strip()
        app.reviewed_by = request.user
        app.reviewed_at = tz.now()
        app.save(update_fields=["status", "review_note", "reviewed_by", "reviewed_at", "updated_at"])

        enrollment = None
        if decision == CarryOverApplication.Status.APPROVED:
            enrollment, _ = Enrollment.objects.get_or_create(
                student=app.student, course_offering=app.course_offering,
                defaults={"status": Enrollment.Status.ACTIVE},
            )
            if enrollment.status != Enrollment.Status.ACTIVE:
                enrollment.status = Enrollment.Status.ACTIVE
                enrollment.save(update_fields=["status", "updated_at"])

        audit(user=request.user, action=f"CARRY_OVER_{decision}", resource_type="CarryOverApplication",
              resource_id=app.id, request=request, metadata={"student_id": str(app.student_id)})

        return Response({
            "id": app.id,
            "status": app.status,
            "review_note": app.review_note,
            "enrolled": enrollment is not None,
        })
