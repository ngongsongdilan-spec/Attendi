from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"success": True, "data": {"status": "ok"}}, status=status.HTTP_200_OK)


class VersionView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from django.conf import settings
        return Response({"success": True, "data": {"version": getattr(settings, "APP_VERSION", "dev")}}, status=status.HTTP_200_OK)


class PingView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"success": True, "data": {"pong": True}}, status=status.HTTP_200_OK)
