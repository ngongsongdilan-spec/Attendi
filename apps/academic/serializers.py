from rest_framework import serializers

from .models import Course, Department, Faculty


class FacultySerializer(serializers.ModelSerializer):
    class Meta:
        model = Faculty
        fields = ["id", "name"]


class DepartmentSerializer(serializers.ModelSerializer):
    faculty_name = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ["id", "name", "faculty", "faculty_name"]

    def get_faculty_name(self, obj) -> str | None:
        return obj.faculty.name if obj.faculty else None


class CourseSerializer(serializers.ModelSerializer):
    """Course with display names resolved so the catalogue needs one request."""

    department_name = serializers.SerializerMethodField()
    faculty_name = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ["id", "code", "name", "department", "department_name", "faculty_name"]

    def get_department_name(self, obj) -> str | None:
        return obj.department.name if obj.department else None

    def get_faculty_name(self, obj) -> str | None:
        if obj.department and obj.department.faculty:
            return obj.department.faculty.name
        return None
