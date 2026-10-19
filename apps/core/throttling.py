"""Traffic controls for polling endpoints.

DRF's default throttle cache is the application's shared cache. On older
deployments that may be PostgreSQL, which defeats the purpose of limiting
read traffic. Keep poll counters in Redis, or in per-worker memory until a
shared Redis service is configured.
"""

from django.core.cache import caches
from rest_framework.throttling import ScopedRateThrottle

from .errors import TrafficCacheUnavailable


class PollingRateThrottle(ScopedRateThrottle):
    cache = caches["polling"]

    def allow_request(self, request, view):
        try:
            return super().allow_request(request, view)
        except Exception as exc:
            # A dead Redis must not turn a polling flood into database reads.
            raise TrafficCacheUnavailable() from exc
