from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.attendance.services.attendance_service import (
    AlreadyMarkedError,
    AttendanceError,
    NotEligibleError,
    SessionExpiredError,
    TokenStudentMismatchError,
    evaluate_repeated_failure,
    scan_attendance,
)
from apps.attendance.utils.qr_tokens import (
    InvalidTokenError,
    TokenAlreadyUsedError,
    TokenExpiredError,
)

from .serializers import AttendanceScanSerializer


def _error(message, code, http_status):
    return Response({"success": False, "error": {"code": code, "message": message}}, status=http_status)


class AttendanceScanView(APIView):
    permission_classes = [IsAuthenticated]
    # Open security item (BR-203): middleware/API gateway must configure a
    # dedicated rate limit for POST /api/v1/attendance/scan/ before production.

    def post(self, request):
        serializer = AttendanceScanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            record = scan_attendance(authenticated_student=request.user, token=serializer.validated_data["token"])
        except TokenExpiredError as exc:
            evaluate_repeated_failure(
                cache_backend=cache, actor_id=request.user.id, failure_code="TOKEN_EXPIRED",
                request_ip=request.META.get("REMOTE_ADDR"),
            )
            return _error(str(exc), "TOKEN_EXPIRED", status.HTTP_404_NOT_FOUND)
        except TokenAlreadyUsedError as exc:
            evaluate_repeated_failure(
                cache_backend=cache, actor_id=request.user.id, failure_code="TOKEN_ALREADY_USED",
                request_ip=request.META.get("REMOTE_ADDR"),
            )
            return _error(str(exc), "TOKEN_ALREADY_USED", status.HTTP_409_CONFLICT)
        except InvalidTokenError as exc:
            evaluate_repeated_failure(
                cache_backend=cache, actor_id=request.user.id, failure_code="INVALID_TOKEN",
                request_ip=request.META.get("REMOTE_ADDR"),
            )
            return _error(str(exc), "INVALID_TOKEN", status.HTTP_404_NOT_FOUND)
        except TokenStudentMismatchError as exc:
            evaluate_repeated_failure(
                cache_backend=cache, actor_id=request.user.id, failure_code="TOKEN_STUDENT_MISMATCH",
                request_ip=request.META.get("REMOTE_ADDR"),
            )
            return _error(str(exc), "TOKEN_STUDENT_MISMATCH", status.HTTP_403_FORBIDDEN)
        except NotEligibleError as exc:
            return _error(str(exc), "NOT_ELIGIBLE", status.HTTP_403_FORBIDDEN)
        except SessionExpiredError as exc:
            return _error(str(exc), "SESSION_EXPIRED", status.HTTP_409_CONFLICT)
        except AlreadyMarkedError as exc:
            return _error(str(exc), "ALREADY_MARKED", status.HTTP_409_CONFLICT)
        except AttendanceError as exc:
            return _error(str(exc), "ATTENDANCE_REJECTED", status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "success": True,
                "data": {
                    "attendance_record_id": str(record.id),
                    "attendance_session_id": str(record.attendance_session_id),
                    "recorded_at": record.recorded_at,
                },
            },
            status=status.HTTP_201_CREATED,
        )
