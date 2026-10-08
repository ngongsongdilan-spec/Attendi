from rest_framework import serializers

from .models import AttendanceCheckpoint, AttendanceRecord, AttendanceSession


class AttendanceSessionSerializer(serializers.ModelSerializer):
    total_present = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    course_code = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = [
            "id", "class_session", "lecturer", "started_at", "expires_at",
            "status", "mode", "total_present", "class_name", "course_code",
            "expected_headcount", "headcount_reached_at",
        ]

    def get_total_present(self, obj):
        return obj.records.count()

    def get_class_name(self, obj):
        return obj.class_session.class_definition.name

    def get_course_code(self, obj):
        return obj.class_session.class_definition.course_offering.course.code


class AttendanceCheckpointSerializer(serializers.ModelSerializer):
    student_email = serializers.CharField(source="student.email", read_only=True)
    student_name = serializers.SerializerMethodField()
    selection_method = serializers.CharField(read_only=True)
    scans_at_station = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceCheckpoint
        fields = ["id", "student", "student_email", "student_name", "checkpoint_number", "selection_method", "scans_at_station"]

    def get_student_name(self, obj):
        return obj.student.get_full_name()

    def get_scans_at_station(self, obj):
        return obj.records.filter(verification_method="QR_SCAN").count()


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_email = serializers.CharField(source="student.email", read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = ["id", "attendance_session", "student", "student_email", "student_name", "recorded_at", "verification_method", "status"]

    def get_student_name(self, obj):
        return obj.student.get_full_name()


class ScanRequestSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=100)
