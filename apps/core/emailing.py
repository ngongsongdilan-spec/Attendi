"""Transactional message delivery.

If an SMTP server is configured (``EMAIL_HOST``), messages are sent through
Django's email backend. Otherwise they are written to the server log, so the
password-reset OTP is still visible while no provider is set up (which is also
what local development uses).
"""
import logging

from django.conf import settings
from django.core.mail import send_mail as django_send_mail

logger = logging.getLogger(__name__)


def send_email(*, to, subject, html, text=None):
    """Send one message, or log it when no SMTP host is configured.

    Never raises: a delivery failure must not turn a successful password-reset
    request into an HTTP 500 (which would leak that the account exists).
    """
    if not getattr(settings, "EMAIL_HOST", ""):
        logger.warning(
            "OUTBOUND EMAIL (not sent - no SMTP configured)\nTo: %s\nSubject: %s\n%s",
            to,
            subject,
            text or html,
        )
        return True

    try:
        django_send_mail(
            subject,
            text or html,
            settings.DEFAULT_FROM_EMAIL,
            [to],
            html_message=html,
            fail_silently=False,
        )
        return True
    except Exception:  # noqa: BLE001 - delivery must never break the request
        logger.exception("Failed to send email to %s", to)
        return False
