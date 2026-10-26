from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.services import audit


class SupportContactView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        subject = (request.data.get("subject") or "general").strip()
        message = (request.data.get("message") or "").strip()
        if len(message) < 10:
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Message must be at least 10 characters."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        audit(
            user=request.user,
            action="SUPPORT_CONTACT",
            resource_type="SupportTicket",
            request=request,
            metadata={"subject": subject, "message": message[:2000]},
        )
        return Response({"message": "Support request received."}, status=status.HTTP_201_CREATED)
