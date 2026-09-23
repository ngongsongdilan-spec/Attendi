"""Read endpoints for the academic module (frontend sync).

The frontend ACADEMIC_ENDPOINTS contract expects
/api/v1/{faculties,departments,courses}/ — these views fulfil it with the
project-standard {success, data, error} envelope.  Read-only for now:
writes go through the domain services, which enforce eligibility rules.
"""

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Course, Department, Faculty
from .serializers import CourseSerializer, DepartmentSerializer, FacultySerializer


def _success_response(data, http_status=200):
    return Response({"success": True, "data": data}, status=http_status)


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
