from rest_framework import serializers

from .models import (
    AssessmentComponent,
    AssessmentRecord,
    ClassDelegate,
    Project,
    ProjectContribution,
    ProjectDocument,
    ProjectGroup,
    ProjectMember,
    ProjectMilestone,
    ProjectTask,
)


class ProjectSerializer(serializers.ModelSerializer):
    course_code = serializers.SerializerMethodField()
    course_title = serializers.SerializerMethodField()
    supervisor_name = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    completed_task_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    group_count = serializers.SerializerMethodField()
    unassigned_count = serializers.SerializerMethodField()
    group_name = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "course_offering", "course_code", "course_title", "created_by", "supervisor",
            "supervisor_name", "title", "description", "objectives", "deadline",
            "status", "scope", "group", "group_name",
            "created_at", "task_count", "completed_task_count", "member_count",
            "group_count", "unassigned_count",
        ]
        # Set by the view from the authenticated user; a client must never be
        # able to claim authorship or hand supervision to somebody else.
        read_only_fields = ["created_by", "supervisor", "created_at"]

    def get_course_code(self, obj):
        return obj.course_offering.course.code

    def get_course_title(self, obj):
        return obj.course_offering.course.title

    def get_supervisor_name(self, obj):
        return obj.supervisor.get_full_name() if obj.supervisor else ""

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_completed_task_count(self, obj):
        return obj.tasks.filter(status="COMPLETED").count()

    def get_member_count(self, obj):
        return obj.members.count()

    def get_group_count(self, obj):
        return obj.groups.count()

    def get_group_name(self, obj):
        return obj.group.name if obj.group_id else ""

    def get_unassigned_count(self, obj):
        # Only meaningful for the grouped scope. Counted against the class
        # roster, not the membership table, so a student who enrolled after the
        # project was created still shows up as needing a group.
        if obj.scope != Project.Scope.CLASS_WIDE:
            return 0
        from .services import unassigned_students

        return len(unassigned_students(obj))

    def validate(self, attrs):
        scope = attrs.get("scope", getattr(self.instance, "scope", Project.Scope.INDIVIDUAL))
        group = attrs.get("group", getattr(self.instance, "group", None))
        if scope == Project.Scope.GROUP_SPECIFIC and group is None:
            raise serializers.ValidationError({"group": "Choose the group this project is for."})
        if scope != Project.Scope.GROUP_SPECIFIC and group is not None:
            raise serializers.ValidationError(
                {"group": "Only a group-assigned project can name a group."}
            )
        offering = attrs.get("course_offering") or getattr(self.instance, "course_offering", None)
        if group is not None and offering is not None:
            if group.project.course_offering_id != offering.id:
                raise serializers.ValidationError(
                    {"group": "That group belongs to a different course."}
                )
        project_id = getattr(self.instance, "id", None)
        if group is not None and project_id and group.project_id == project_id:
            raise serializers.ValidationError(
                {"group": "A project cannot be assigned to its own group."}
            )
        return attrs


class ClassDelegateSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_number = serializers.SerializerMethodField()
    appointed_by_name = serializers.SerializerMethodField()

    class Meta:
        from apps.accounts.models import User

        model = ClassDelegate
        fields = ["id", "course_offering", "student", "student_name", "student_number",
                  "appointed_by", "appointed_by_name", "appointed_at"]
        read_only_fields = ["appointed_at"]

    def get_student_name(self, obj):
        return obj.student.get_full_name() if obj.student else ""

    def get_student_number(self, obj):
        profile = getattr(obj.student, "student_profile", None) if obj.student else None
        return profile.student_number if profile else ""

    def get_appointed_by_name(self, obj):
        return obj.appointed_by.get_full_name() if obj.appointed_by else ""


class ProjectGroupSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    completed_task_count = serializers.SerializerMethodField()
    leader_name = serializers.SerializerMethodField()
    assigned_projects = serializers.SerializerMethodField()

    class Meta:
        model = ProjectGroup
        fields = ["id", "project", "name", "description", "leader", "leader_name",
                  "member_count", "members", "task_count", "completed_task_count",
                  "assigned_projects"]

    def get_member_count(self, obj):
        return obj.members.count()

    def get_members(self, obj):
        return ProjectMemberSerializer(
            obj.members.select_related("student"), many=True
        ).data

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_completed_task_count(self, obj):
        return obj.tasks.filter(status="COMPLETED").count()

    def get_leader_name(self, obj):
        return obj.leader.get_full_name() if obj.leader_id else ""

    def get_assigned_projects(self, obj):
        """GROUP_SPECIFIC projects pointed at this group."""
        return [
            {"id": str(p.id), "title": p.title, "status": p.status, "deadline": p.deadline}
            for p in obj.assigned_projects.all()
        ]


class StudentOptionSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    student_number = serializers.SerializerMethodField()

    class Meta:
        from apps.accounts.models import User

        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name", "student_number"]

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_student_number(self, obj):
        profile = getattr(obj, "student_profile", None)
        return profile.student_number if profile else ""


class ProjectMemberSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectMember
        fields = ["id", "project", "student", "student_name", "group", "role", "joined_at"]
        read_only_fields = ["joined_at"]

    def get_student_name(self, obj):
        return obj.student.get_full_name()


class ProjectTaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.SerializerMethodField()
    completed_at = serializers.SerializerMethodField()

    class Meta:
        model = ProjectTask
        fields = [
            "id", "project", "group", "assigned_student", "assignee_name", "created_by",
            "title", "description", "priority", "status", "due_at", "created_at", "updated_at", "completed_at",
        ]

    def get_assignee_name(self, obj):
        return obj.assigned_student.get_full_name() if obj.assigned_student else ""

    def get_completed_at(self, obj):
        return obj.updated_at if obj.status == "COMPLETED" else None

    def validate(self, attrs):
        """An assignee has to be somebody the group actually contains.

        Without this the assignable names and the group membership are two
        unrelated lists, so a task can end up assigned to a student who is in a
        different group -- or in none. That is invisible on the task itself and
        only shows up later as a student who cannot complete their own work.
        """
        group = attrs.get("group", getattr(self.instance, "group", None))
        assignee = attrs.get("assigned_student", getattr(self.instance, "assigned_student", None))
        if group and assignee:
            if not ProjectMember.objects.filter(group=group, student=assignee).exists():
                raise serializers.ValidationError(
                    {"assigned_student": f"{assignee.get_full_name()} is not a member of {group.name}."}
                )
        return attrs


class ProjectContributionSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = ProjectContribution
        fields = ["id", "project", "student", "student_name", "task", "description", "contribution_type", "created_at"]

    def get_student_name(self, obj):
        return obj.student.get_full_name()


class AssessmentComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentComponent
        fields = ["id", "project", "name", "description", "maximum_score", "weight"]


class AssessmentRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    component_name = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentRecord
        fields = ["id", "assessment_component", "student", "student_name", "assessor", "score", "feedback", "status", "assessed_at", "component_name"]

    def get_student_name(self, obj):
        return obj.student.get_full_name()

    def get_component_name(self, obj):
        return obj.assessment_component.name


class ProjectDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectDocument
        fields = ["id", "project", "uploaded_by", "file", "document_type", "created_at"]


class ProjectMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMilestone
        fields = ["id", "project", "title", "description", "due_at", "status"]
