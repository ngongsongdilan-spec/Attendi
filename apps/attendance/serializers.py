from django.conf import settings
from rest_framework import serializers

from .models import AttendanceCheckpoint, AttendanceDeviceGroup, AttendanceRecord, AttendanceSession


class AttendanceSessionSerializer(serializers.ModelSerializer):
    total_present = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    course_code = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = [
            "id", "class_session", "lecturer", "started_at", "expires_at", "effective_end_at",
            "status", "mode", "total_present", "class_name", "course_code",
            "expected_headcount", "headcount_reached_at",
        ]

    def get_total_present(self, obj):
        counts = self.context.get("present_by_session")
        if counts is not None:
            return counts.get(obj.id, 0)
        return obj.records.filter(status__in=["PRESENT", "LATE"]).count()

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
    student_number = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()
    device_id = serializers.SerializerMethodField()
    device_group_id = serializers.SerializerMethodField()
    integrity_status = serializers.SerializerMethodField()
    verification_required = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = [
            "id", "attendance_session", "student", "student_email", "student_name",
            "student_number", "department", "level",
            "recorded_at", "verification_method", "status",
            "device_id", "device_group_id", "integrity_status", "verification_required",
            "integrity_verified_at", "integrity_verified_by",
        ]

    def get_student_name(self, obj):
        return obj.student.get_full_name()

    def get_device_id(self, obj):
        return str(obj.device_id) if obj.device_id else None

    def get_device_group_id(self, obj):
        return str(obj.device_group_id) if obj.device_group_id else None

    def get_integrity_status(self, obj):
        group = obj.device_group
        return group.integrity_status if group is not None else AttendanceDeviceGroup.IntegrityStatus.NORMAL

    def get_verification_required(self, obj):
        group = obj.device_group
        return bool(
            group is not None
            and group.integrity_status == AttendanceDeviceGroup.IntegrityStatus.REVIEW_REQUIRED
        )

    def _profile(self, obj):
        # A student may not have a profile yet (roster import race, admin-only
        # accounts). Reading through the reverse OneToOne can raise, so guard it.
        return getattr(obj.student, "student_profile", None)

    def get_student_number(self, obj):
        profile = self._profile(obj)
        return getattr(profile, "student_number", None) or ""

    def get_department(self, obj):
        profile = self._profile(obj)
        department = getattr(profile, "department", None) if profile else None
        if not department:
            return ""
        return department.name or department.code or ""

    def get_level(self, obj):
        profile = self._profile(obj)
        return getattr(profile, "level", "") or ""


class ScanRequestSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=256)
    device_id = serializers.UUIDField(required=False, allow_null=True)
    device_credential = serializers.CharField(
        max_length=256, required=False, allow_blank=True, allow_null=True,
    )

    def validate(self, attrs):
        if bool(attrs.get("device_id")) != bool(attrs.get("device_credential")):
            raise serializers.ValidationError(
                "device_id and device_credential must be supplied together."
            )
        return attrs


class OfflineCaptureSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=256)
    captured_at_client = serializers.DateTimeField(required=False)
    checkpoint_id = serializers.UUIDField(required=False, allow_null=True)
    verification_method = serializers.ChoiceField(choices=["QR_SCAN"], default="QR_SCAN")


class OfflineSyncSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    captures = OfflineCaptureSerializer(
        many=True, allow_empty=False,
        max_length=settings.ATTENDANCE_OFFLINE_SYNC_MAX_CAPTURES,
    )
    device_id = serializers.UUIDField(required=False, allow_null=True)
    device_credential = serializers.CharField(
        max_length=256, required=False, allow_blank=True, allow_null=True,
    )

    def validate_captures(self, captures):
        if len(captures) > settings.ATTENDANCE_OFFLINE_SYNC_MAX_CAPTURES:
            raise serializers.ValidationError("Too many captures in one batch.")
        return captures

    def validate(self, attrs):
        if bool(attrs.get("device_id")) != bool(attrs.get("device_credential")):
            raise serializers.ValidationError(
                "device_id and device_credential must be supplied together."
            )
        return attrs


class CredentialBundleSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    checkpoint_id = serializers.UUIDField(allow_null=True)
    hmac_key_id = serializers.CharField()
    hmac_key = serializers.CharField()
    session_started_at = serializers.DateTimeField()
    session_expires_at = serializers.DateTimeField()
    slot_origin_ts = serializers.IntegerField()
    slot_duration_seconds = serializers.IntegerField()
    max_slots = serializers.IntegerField()


class DeviceRegisterSerializer(serializers.Serializer):
    device_id = serializers.UUIDField(required=False, allow_null=True)
    device_credential = serializers.CharField(
        max_length=256, required=False, allow_blank=True, allow_null=True,
    )


class AttendanceDeviceGroupSerializer(serializers.ModelSerializer):
    device_id = serializers.UUIDField(read_only=True)
    verified_count = serializers.SerializerMethodField()
    verification_required_count = serializers.SerializerMethodField()
    students = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceDeviceGroup
        fields = [
            "id", "attendance_session", "device_id", "integrity_status",
            "student_count", "verified_count", "verification_required_count",
            "version", "reviewed_at", "created_at", "students",
        ]

    def _records(self, obj):
        records = getattr(obj, "display_records", None)
        if records is None:
            records = list(obj.records.all())
        return records

    def get_verified_count(self, obj):
        return sum(1 for record in self._records(obj) if record.integrity_verified_at is not None)

    def get_verification_required_count(self, obj):
        if obj.integrity_status != AttendanceDeviceGroup.IntegrityStatus.REVIEW_REQUIRED:
            return 0
        return max(0, obj.student_count - self.get_verified_count(obj))

    def get_students(self, obj):
        return AttendanceRecordSerializer(
            self._records(obj), many=True, context=self.context,
        ).data
