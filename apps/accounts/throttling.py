"""Auth-specific DRF throttles."""
from rest_framework.throttling import AnonRateThrottle


class PasswordResetThrottle(AnonRateThrottle):
    """Rate limit forgot/reset-password by client IP.

    DRF's built-in rate parser only understands single-letter periods
    (s/m/h/d), so "3/15min" would raise. We extend it to accept an explicit
    "<n>min" window, keeping the spec's "3 requests per 15 minutes".
    """

    scope = "password_reset"

    def parse_rate(self, rate):
        if rate is None:
            return (None, None)
        num, _, period = rate.partition("/")
        if period.endswith("min") and period[:-3].isdigit():
            return (int(num), int(period[:-3]) * 60)
        return super().parse_rate(rate)
