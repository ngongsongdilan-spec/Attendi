from rest_framework import serializers

from .models import (
    Assessment,
    AssessmentGroup,
    AssessmentMark,
    Assignment,
    AssignmentSubmission,
    LearningMaterial,
    UploadedFile,
)
from .scales import group_grade, is_converted, marking_scale, to_reported


class UploadedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = ["id", "uploaded_by", "original_name", "mime_type", "size_bytes", "created_at"]


class LearningMaterialSerializer(serializers.ModelSerializer):
    file_info = UploadedFileSerializer(source="file", read_only=True)
    uploader_name = serializers.SerializerMethodField()

    class Meta:
        model = LearningMaterial
        fields = ["id", "course_offering", "uploaded_by", "uploader_name", "title", "description", "file", "file_info", "visibility", "created_at"]

    def get_uploader_name(self, obj):
        return obj.uploaded_by.get_full_name()


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    file_info = UploadedFileSerializer(source="file", read_only=True)
    submitted_at = serializers.SerializerMethodField()
    graded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AssignmentSubmission
        fields = [
            "id", "assignment", "student", "student_name", "file", "file_info", "note",
            "status", "is_late", "grade", "feedback", "graded_by", "graded_by_name",
            "graded_at", "submitted_at",
        ]

    def get_student_name(self, obj):
        return obj.student.get_full_name()

    def get_submitted_at(self, obj):
        return obj.created_at

    def get_graded_by_name(self, obj):
        return obj.graded_by.get_full_name() if obj.graded_by else ""


class AssignmentSerializer(serializers.ModelSerializer):
    creator_name = serializers.SerializerMethodField()
    attachment_info = UploadedFileSerializer(source="attachment", read_only=True)
    submissions_count = serializers.SerializerMethodField()
    graded_count = serializers.SerializerMethodField()
    attempts_used = serializers.SerializerMethodField()
    my_submission = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            "id", "course_offering", "course_code", "created_by", "creator_name", "title",
            "description", "points_possible", "due_at", "allow_late", "max_submissions",
            "attachment", "attachment_info", "status", "created_at",
            "submissions_count", "graded_count", "attempts_used", "my_submission",
        ]

    course_code = serializers.CharField(source="course_offering.course.code", read_only=True)

    def get_creator_name(self, obj):
        return obj.created_by.get_full_name()

    def get_submissions_count(self, obj):
        return obj.submissions.count()

    def get_graded_count(self, obj):
        return obj.submissions.filter(status=AssignmentSubmission.Status.GRADED).count()

    def get_attempts_used(self, obj):
        request = self.context.get("request")
        if not request or request.user.role != "STUDENT":
            return 0
        # Returned submissions are freed, so they do not consume an attempt.
        return obj.submissions.filter(student=request.user).exclude(status=AssignmentSubmission.Status.RETURNED).count()

    def get_my_submission(self, obj):
        request = self.context.get("request")
        if not request or request.user.role != "STUDENT":
            return None
        submission = obj.submissions.filter(student=request.user).first()
        return AssignmentSubmissionSerializer(submission).data if submission else None


class AssessmentMarkSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_number = serializers.SerializerMethodField()
    reported_score = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentMark
        fields = [
            "id", "assessment", "student", "student_name", "student_number",
            "score", "reported_score", "comment", "dispute_status", "dispute_reason",
            "dispute_response", "disputed_at", "resolved_at", "updated_at",
        ]
        read_only_fields = ["dispute_status", "dispute_reason", "dispute_response", "disputed_at", "resolved_at"]

    def get_student_name(self, obj):
        return obj.student.get_full_name()

    def get_student_number(self, obj):
        profile = getattr(obj.student, "student_profile", None)
        return profile.student_number if profile else ""

    def get_reported_score(self, obj):
        return to_reported(obj.score, obj.assessment)


class AssessmentSerializer(serializers.ModelSerializer):
    attachment_info = UploadedFileSerializer(source="attachment", read_only=True)
    creator_name = serializers.SerializerMethodField()
    course_code = serializers.SerializerMethodField()
    marks_count = serializers.SerializerMethodField()
    graded_count = serializers.SerializerMethodField()
    open_disputes = serializers.SerializerMethodField()
    average_score = serializers.SerializerMethodField()
    average_reported = serializers.SerializerMethodField()
    my_mark = serializers.SerializerMethodField()
    marking_scale_value = serializers.SerializerMethodField()
    is_converted = serializers.SerializerMethodField()
    group_title = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            "id", "course_offering", "course_code", "created_by", "creator_name",
            "title", "description", "category", "maximum_score", "raw_maximum",
            "marking_scale_value", "is_converted", "weight",
            "group", "group_weight", "group_title",
            "status", "published_at", "attachment", "attachment_info",
            "marks_count", "graded_count", "open_disputes", "average_score",
            "average_reported", "my_mark", "created_at",
        ]
        read_only_fields = ["created_by", "status", "published_at"]

    def get_group_title(self, obj):
        group = getattr(obj, "group", None)
        return group.title if group else ""

    def get_marking_scale_value(self, obj):
        return marking_scale(obj)

    def get_is_converted(self, obj):
        return is_converted(obj)

    def get_average_reported(self, obj):
        values = [to_reported(m.score, obj) for m in obj.marks.all() if m.score is not None]
        if not values:
            return None
        return round(sum(values) / len(values), 2)

    def get_creator_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else ""

    def get_course_code(self, obj):
        return obj.course_offering.course.code

    def get_marks_count(self, obj):
        return obj.marks.count()

    def get_graded_count(self, obj):
        return obj.marks.exclude(score=None).count()

    def get_open_disputes(self, obj):
        return obj.marks.filter(dispute_status=AssessmentMark.DisputeStatus.OPEN).count()

    def get_average_score(self, obj):
        scored = [m.score for m in obj.marks.all() if m.score is not None]
        if not scored:
            return None
        return round(sum(scored) / len(scored), 2)

    def get_my_mark(self, obj):
        request = self.context.get("request")
        if not request or request.user.role != "STUDENT":
            return None
        mark = obj.marks.filter(student=request.user).first()
        return AssessmentMarkSerializer(mark).data if mark else None


class AssessmentMarkInputSerializer(serializers.Serializer):
    """Bulk mark entry payload: [{student, score, comment}, ...]."""

    student = serializers.UUIDField()
    score = serializers.DecimalField(max_digits=7, decimal_places=2, required=False, allow_null=True)
    comment = serializers.CharField(required=False, allow_blank=True, default="")


def _student_rows(group, request, include_breakdown):
    """Per-student combined grade for a group, newest mark per assessment."""
    members = list(group.assessments.all())
    marks = AssessmentMark.objects.filter(
        assessment__in=members,
        **({"student": request.user} if request and request.user.role == "STUDENT" else {}),
    ).select_related("student")
    by_student = {}
    for m in marks:
        by_student.setdefault(m.student, {})[m.assessment_id] = m

    rows = []
    for student, marks_for_student in by_student.items():
        raw = {aid: m.score for aid, m in marks_for_student.items()}
        total, breakdown = group_grade(raw, group)
        row = {
            "student": student.id,
            "student_name": student.get_full_name(),
            "student_number": getattr(getattr(student, "student_profile", None), "student_number", ""),
            "total": total,
            "out_of": group.maximum_score,
            "graded_members": sum(1 for b in breakdown if b["points"] is not None),
            "member_count": len(members),
        }
        if include_breakdown:
            row["breakdown"] = breakdown
        rows.append(row)
    rows.sort(key=lambda r: (r["student_name"] or "").lower())
    return rows


class AssessmentGroupSerializer(serializers.ModelSerializer):
    course_code = serializers.SerializerMethodField()
    creator_name = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    average = serializers.SerializerMethodField()
    published_members = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentGroup
        fields = [
            "id", "course_offering", "course_code", "created_by", "creator_name",
            "title", "description", "maximum_score", "status", "published_at",
            "member_count", "published_members", "members", "average", "created_at",
        ]
        read_only_fields = ["created_by", "status", "published_at"]

    def get_course_code(self, obj):
        return obj.course_offering.course.code

    def get_creator_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else ""

    def get_member_count(self, obj):
        return obj.assessments.count()

    def get_published_members(self, obj):
        return obj.assessments.filter(status=Assessment.Status.PUBLISHED).count()

    def get_members(self, obj):
        out = []
        for a in obj.assessments.all():
            out.append({
                "id": a.id,
                "title": a.title,
                "category": a.category,
                "status": a.status,
                "maximum_score": a.maximum_score,
                "raw_maximum": a.raw_maximum,
                "marking_scale_value": marking_scale(a),
                "group_weight": a.group_weight,
                "is_converted": is_converted(a),
            })
        return out

    def get_average(self, obj):
        totals = [r["total"] for r in _student_rows(obj, None, False) if r["total"] is not None]
        if not totals:
            return None
        return round(sum(totals) / len(totals), 2)


class AssessmentGroupDetailSerializer(AssessmentGroupSerializer):
    students = serializers.SerializerMethodField()

    class Meta(AssessmentGroupSerializer.Meta):
        fields = AssessmentGroupSerializer.Meta.fields + ["students"]

    def get_students(self, obj):
        return _student_rows(obj, self.context.get("request"), True)