"""Transactional message delivery.

No email provider is wired up yet, so messages are written to the server log
instead of being sent. The password-reset OTP therefore shows up in the backend
logs (Vercel -> fet-api -> Logs, or the local console) until a provider is
added. ``send_email`` keeps the same signature so callers do not change.
"""
import logging

logger = logging.getLogger(__name__)


def send_email(*, to, subject, html, text=None):
    """Log the message instead of sending it. Returns True (best-effort)."""
    logger.warning(
        "OUTBOUND EMAIL (not sent - no provider configured)\nTo: %s\nSubject: %s\n%s",
        to,
        subject,
        text or html,
    )
    return True
