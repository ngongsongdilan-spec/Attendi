from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "user", "type", "title", "message", "reference_type", "reference_id", "read_at", "created_at"]
        read_only_fields = ["created_at"]
