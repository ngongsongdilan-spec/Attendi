"""Read endpoints for the academic module (frontend sync).

The frontend ACADEMIC_ENDPOINTS contract expects
/api/v1/{faculties,departments,courses}/ — these views fulfil it with the
project-standard {success, data, error} envelope.  Reads are open to any
authenticated user; school-year/semester writes are administrator-only.
"""

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.academic_access import is_admin_user

from .models import ClassSession, Course, Department, Faculty, SchoolYear, Semester
from .serializers import (
    ClassSessionSerializer,
    CourseSerializer,
    DepartmentSerializer,
    FacultySerializer,
    SchoolYearSerializer,
    SemesterSerializer,
)


def _success_response(data, http_status=200):
    return Response({"success": True, "data": data}, status=http_status)


def _error_response(code, message, http_status):
    return Response(
        {"success": False, "error": {"code": code, "message": message}},
        status=http_status,
    )


class FacultyListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        faculties = Faculty.objects.all()
        return _success_response(FacultySerializer(faculties, many=True).data)


class DepartmentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        departments = Department.objects.select_related("faculty")
        return _success_response(DepartmentSerializer(departments, many=True).data)


class CourseListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        courses = Course.objects.select_related("department__faculty")
        return _success_response(CourseSerializer(courses, many=True).data)


class ClassSessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = ClassSession.objects.select_related("course", "lecturer")
        return _success_response(ClassSessionSerializer(sessions, many=True).data)


class SchoolYearListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return _success_response(
            SchoolYearSerializer(SchoolYear.objects.all(), many=True).data
        )

    def post(self, request):
        if not is_admin_user(request.user):
            return _error_response(
                "UNAUTHORIZED", "Only administrators manage school years.", 403
            )
        serializer = SchoolYearSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        year = SchoolYear.objects.create(**serializer.validated_data)
        return _success_response(SchoolYearSerializer(year).data, 201)


class SemesterListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        semesters = Semester.objects.select_related("school_year")
        return _success_response(SemesterSerializer(semesters, many=True).data)

    def post(self, request):
        if not is_admin_user(request.user):
            return _error_response(
                "UNAUTHORIZED", "Only administrators manage semesters.", 403
            )
        serializer = SemesterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        semester = Semester.objects.create(**serializer.validated_data)
        return _success_response(SemesterSerializer(semester).data, 201)


class SemesterUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not is_admin_user(request.user):
            return _error_response(
                "UNAUTHORIZED", "Only administrators manage semesters.", 403
            )
        semester = Semester.objects.filter(pk=pk).first()
        if semester is None:
            return _error_response("NOT_FOUND", "Semester not found.", 404)
        serializer = SemesterSerializer(
            semester, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()  # model.save() keeps at most one is_current semester
        return _success_response(SemesterSerializer(semester).data)
