from rest_framework import serializers


class AttendanceScanSerializer(serializers.Serializer):
    # Deliberately no student_id field: identity is request.user only (BR-039/063).
    token = serializers.CharField(trim_whitespace=True, max_length=512)

    def validate(self, attrs):
        unexpected = set(self.initial_data) - {"token"}
        if unexpected:
            raise serializers.ValidationError(
                {field: "This field is not permitted." for field in unexpected}
            )
        return attrs
