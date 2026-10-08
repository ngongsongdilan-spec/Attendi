"""Consistent API response envelope per API Specification (doc 07, §10-11).

Success:  {"success": true, "data": ..., "pagination": {...}?}
Error:    {"success": false, "error": {"code": "...", "message": "...", "details": {...}}}
"""
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.pagination import PageNumberPagination
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response


class SuccessRenderer(JSONRenderer):
    """Wraps every successful DRF response in the standard envelope."""

    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get("response") if renderer_context else None
        if response is not None and 200 <= response.status_code < 300:
            pagination = getattr(response, "fet_pagination", None)
            payload = {"success": True, "data": data}
            if pagination:
                payload["pagination"] = pagination
            return super().render(payload, accepted_media_type, renderer_context)
        return super().render(data, accepted_media_type, renderer_context)


class EnvelopedPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        response = Response(data)
        response.fet_pagination = {
            "page": self.page.number,
            "page_size": self.get_page_size(self.request),
            "total": self.page.paginator.count,
            "total_pages": self.page.paginator.num_pages,
        }
        return response


ERROR_CODES = {
    400: "VALIDATION_ERROR",
    401: "UNAUTHENTICATED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    410: "GONE",
    429: "RATE_LIMITED",
    500: "INTERNAL_ERROR",
}


def enveloped_exception_handler(exc, context):
    from rest_framework.views import exception_handler

    if isinstance(exc, Http404):
        exc = APIException("The requested resource could not be found.")
        exc.status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(exc, DjangoPermissionDenied):
        exc = APIException("You do not have permission to perform this action.")
        exc.status_code = status.HTTP_403_FORBIDDEN

    response = exception_handler(exc, context)
    if response is None:
        return None

    code = ERROR_CODES.get(response.status_code, "ERROR")
    if isinstance(response.data, dict) and "detail" in response.data and len(response.data) == 1:
        message = str(response.data["detail"])
        details = None
    elif isinstance(response.data, dict):
        message = "The request could not be completed."
        details = response.data
    else:
        message = str(response.data)
        details = None

    error = {"code": code, "message": message}
    if details:
        error["details"] = details
    response.data = {"success": False, "error": error}
    return response
