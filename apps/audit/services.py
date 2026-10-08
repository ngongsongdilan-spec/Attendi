"""Audit service - records important system actions (Security doc 08 §24).

Never logs passwords, tokens or sensitive personal data.
"""
from .models import AuditLog


def get_client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def audit(user=None, action="", resource_type="", resource_id=None, request=None, metadata=None):
    kwargs = {
        "actor": user,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "metadata": metadata or {},
    }
    if request is not None:
        kwargs["ip_address"] = get_client_ip(request)
        kwargs["user_agent"] = request.META.get("HTTP_USER_AGENT", "")[:500]
    return AuditLog.objects.create(**kwargs)
