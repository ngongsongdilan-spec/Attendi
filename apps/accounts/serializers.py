from rest_framework import serializers

from .models import LecturerProfile, StudentProfile, User


class UserPublicSerializer(serializers.ModelSerializer):
    """Minimal public view - never leaks password or sensitive fields."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "status",
            "last_login_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name()


class RegisterSerializer(serializers.Serializer):
    """Admin-only user creation."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value.lower().strip()

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


# ---------------------------------------------------------------------------
# Self-registration
# ---------------------------------------------------------------------------

# Students register with University of Buea emails (@ubuea.cm).
# Lecturers may register with any valid email address.
STUDENT_REGISTRATION_DOMAINS = {"student.ubuea.cm"}


class SelfRegisterSerializer(serializers.Serializer):
    """Public self-registration. Role is chosen explicitly on the form.

    Students register with @student.ubuea.cm email + matricule + level.
    Lecturers register with any valid email + staff_number.
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=100, trim_whitespace=True)
    last_name = serializers.CharField(max_length=100, trim_whitespace=True)
    department = serializers.UUIDField()
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    role = serializers.ChoiceField(choices=[("STUDENT", "Student"), ("LECTURER", "Lecturer")])
    matricule = serializers.CharField(max_length=30, required=False, allow_blank=True)
    staff_number = serializers.CharField(max_length=30, required=False, allow_blank=True)
    level = serializers.CharField(max_length=20, required=False, allow_blank=True)
    personal_email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_personal_email(self, value):
        if not value:
            return None
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this personal email already exists.")
        return value

    def validate_level(self, value):
        value = (value or "").strip()
        if value and value not in {"200", "300", "400", "500"}:
            raise serializers.ValidationError("Level must be one of: L200, L300, L400, L500.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})

        role = attrs.get("role")

        if role == "STUDENT":
            if not attrs.get("matricule", "").strip():
                raise serializers.ValidationError({"matricule": "Matricule number is required for students."})
            personal_email = (attrs.get("personal_email") or "").strip()
            if not personal_email:
                raise serializers.ValidationError({"personal_email": "Personal email is required for students."})
        elif role == "LECTURER":
            if not attrs.get("staff_number", "").strip():
                raise serializers.ValidationError({"staff_number": "Staff number is required for lecturers."})
        return attrs

    def create(self, validated_data):
        from apps.academics.models import Department

        role = validated_data.pop("role")
        matricule = validated_data.pop("matricule", "").strip()
        staff_number = validated_data.pop("staff_number", "").strip()
        level = validated_data.pop("level", "").strip()
        personal_email = validated_data.pop("personal_email", None) or None
        department_id = validated_data.pop("department")
        date_of_birth = validated_data.pop("date_of_birth", None)
        validated_data.pop("password_confirm")

        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            role=role,
            date_of_birth=date_of_birth,
        )

        department = Department.objects.filter(id=department_id).first()

        if role == "STUDENT":
            StudentProfile.objects.create(
                user=user,
                student_number=matricule,
                department=department,
                level=level if level else "200",
                personal_email=personal_email,
            )
        else:
            LecturerProfile.objects.create(
                user=user,
                staff_number=staff_number,
                department=department,
            )
        return user


class MeSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    student_profile = serializers.SerializerMethodField()
    lecturer_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "status",
            "date_of_birth",
            "must_change_password",
            "student_profile",
            "lecturer_profile",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_student_profile(self, obj):
        profile = getattr(obj, "student_profile", None)
        if profile is None:
            return None
        department = profile.department
        return {
            "id": profile.id,
            "student_number": profile.student_number,
            "department_id": profile.department_id,
            "department": {
                "id": department.id,
                "name": department.name,
                "code": department.code,
            } if department else None,
            "level": profile.level,
            "admission_year": profile.admission_year,
            "personal_email": profile.personal_email,
            "profile_image_reference": profile.profile_image_reference,
            "bio": profile.profile_bio,
            "skills": profile.skills,
            "achievements": profile.achievements,
        }

    def get_lecturer_profile(self, obj):
        profile = getattr(obj, "lecturer_profile", None)
        if profile is None:
            return None
        department = profile.department
        return {
            "id": profile.id,
            "staff_number": profile.staff_number,
            "department_id": profile.department_id,
            "department": {
                "id": department.id,
                "name": department.name,
                "code": department.code,
            } if department else None,
            "title": profile.title,
            "bio": profile.bio,
            "profile_image_reference": profile.profile_image_reference,
        }


class ProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100, required=False)
    last_name = serializers.CharField(max_length=100, required=False)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    level = serializers.CharField(max_length=20, required=False)
    bio = serializers.CharField(required=False, allow_blank=True)
    skills = serializers.ListField(child=serializers.CharField(), required=False)
    achievements = serializers.ListField(child=serializers.CharField(), required=False)
    personal_email = serializers.EmailField(required=False, allow_blank=True)
    admission_year = serializers.IntegerField(required=False, min_value=1990, max_value=2100,
                                              allow_null=True)

    def validate_personal_email(self, value):
        if not value:
            return None
        value = value.strip().lower()
        qs = User.objects.filter(email__iexact=value)
        if qs.exists():
            raise serializers.ValidationError("An account with this personal email already exists.")
        return value

    def validate_level(self, value):
        value = (value or "").strip()
        if value and value not in {"200", "300", "400", "500"}:
            raise serializers.ValidationError("Level must be one of: L200, L300, L400, L500.")
        return value

    def update(self, instance, validated_data):
        profile = getattr(instance, "student_profile", None) or getattr(
            instance, "lecturer_profile", None
        )
        profile_fields = {"level", "bio", "skills", "achievements", "personal_email", "admission_year"}
        profile_data = {k: v for k, v in validated_data.items() if k in profile_fields}
        user_fields = {k: v for k, v in validated_data.items() if k not in profile_fields}

        for k, v in user_fields.items():
            setattr(instance, k, v)
        instance.save(update_fields=[*user_fields.keys(), "updated_at"] if user_fields else ["updated_at"])

        if profile and profile_data:
            def model_field(profile, key):
                return "profile_bio" if key == "bio" and hasattr(profile, "profile_bio") else key

            mapped_fields = [model_field(profile, k) for k in profile_data]
            for k, v in profile_data.items():
                setattr(profile, model_field(profile, k), v)
            profile.save(update_fields=[*mapped_fields, "updated_at"])
        return instance


class StudentListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name"]
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name()
