from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.models import AuditLog
from apps.core.permissions import IsAdmin


class SupportMessagesView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        qs = AuditLog.objects.filter(action="SUPPORT_CONTACT").select_related("actor").order_by("-created_at")[:200]
        data = []
        for log in qs:
            meta = log.metadata or {}
            data.append(
                {
                    "id": str(log.id),
                    "created_at": log.created_at,
                    "actor_email": log.actor.email if log.actor else None,
                    "actor_name": log.actor.get_full_name() if log.actor else None,
                    "subject": meta.get("subject"),
                    "message": meta.get("message"),
                    "ip_address": log.ip_address,
                }
            )
        return Response(data, status=status.HTTP_200_OK)
