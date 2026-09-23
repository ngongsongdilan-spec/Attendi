from rest_framework import serializers

from .models import User


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(username=normalized).exists():
            raise serializers.ValidationError("This username is already taken.")
        return normalized


class LoginSerializer(serializers.Serializer):
    """Accept login via email, matricule, or staffid (at least one required).

    The ``identifier`` field is the flexible login credential.  The frontend
    sends whichever the user typed into the login field.  The view resolves it
    to the matching User account.
    """
    identifier = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Email, matricule, or staffid.",
    )
    email = serializers.EmailField(required=False, allow_blank=True)
    matricule = serializers.CharField(required=False, allow_blank=True)
    staffid = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        # Normalise: accept any of the three identifiers or a bare "identifier".
        value = (
            attrs.get("identifier", "").strip()
            or attrs.get("email", "").strip()
            or attrs.get("matricule", "").strip()
            or attrs.get("staffid", "").strip()
        )
        if not value:
            raise serializers.ValidationError(
                "Provide an email, matricule, or staffid to log in."
            )
        attrs["login_identifier"] = value
        return attrs


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "matricule",
            "staffid",
            "role",
            "faculty",
            "department",
            "created_at",
            "is_email_verified",
        ]
        read_only_fields = ["id", "email", "role", "is_email_verified", "created_at"]


class ChangeRoleSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    new_role = serializers.ChoiceField(choices=User.Role.choices)
