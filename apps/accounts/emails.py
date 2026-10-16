"""Password-reset email composition.

Kept separate from the views so the templates are easy to change without
touching auth logic, and so tests can patch a single function.
"""
from django.conf import settings

from apps.core.emailing import send_email


def send_password_reset_otp_email(user, otp):
    """Email the 6-digit code. Only the raw code is sent; the DB keeps a hash."""
    ttl = settings.PASSWORD_RESET_OTP_TTL_MINUTES
    first_name = user.first_name or "there"
    subject = "Your FET Platform password reset code"
    html = (
        f"<p>Hi {first_name},</p>"
        "<p>We received a request to reset your FET Platform password.</p>"
        f'<p style="font-size:28px;font-weight:700;letter-spacing:8px;">{otp}</p>'
        f"<p>Enter this code in the app to choose a new password. "
        f"It expires in {ttl} minutes.</p>"
        "<p>If you did not request this, you can safely ignore this email — "
        "your password will not change.</p>"
    )
    text = (
        f"Your FET Platform password reset code is {otp}. "
        f"It expires in {ttl} minutes. If you did not request this, ignore this email."
    )
    return send_email(to=user.email, subject=subject, html=html, text=text)


def send_password_changed_email(user):
    first_name = user.first_name or "there"
    subject = "Your FET Platform password was changed"
    html = (
        f"<p>Hi {first_name},</p>"
        "<p>Your FET Platform password was successfully changed.</p>"
        "<p>If this wasn't you, contact support immediately.</p>"
    )
    text = (
        "Your FET Platform password was successfully changed. "
        "If this wasn't you, contact support immediately."
    )
    return send_email(to=user.email, subject=subject, html=html, text=text)
