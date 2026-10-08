"""Defense-in-depth response headers for the FET Platform."""


class SecurityHeadersMiddleware:
    """Apply extra hardening headers on every response.

    Complements Django's SecurityMiddleware (HSTS, nosniff, referrer policy).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response.setdefault("X-Frame-Options", "DENY")
        response.setdefault("X-Content-Type-Options", "nosniff")
        response.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.setdefault("X-Permitted-Cross-Domain-Policies", "none")
        response.setdefault(
            "Permissions-Policy",
            "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
        )
        return response