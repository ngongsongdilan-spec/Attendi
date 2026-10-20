"""Errors shared by traffic protection paths."""

from rest_framework.exceptions import APIException


class TrafficCacheUnavailable(APIException):
    status_code = 503
    default_detail = "Live attendance is temporarily unavailable. Retry shortly."
    default_code = "TRAFFIC_CACHE_UNAVAILABLE"
    wait = 2
