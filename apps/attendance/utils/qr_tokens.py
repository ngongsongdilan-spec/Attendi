"""QR token utilities for ephemeral attendance sessions.

This module is intentionally mechanics-only: it handles token generation,
validation, rotation, and cache-backed TTL behavior without making academic
permission or attendance business decisions.

Business rules enforced via the token mechanics:
- BR-033: QR attendance requires a valid temporary token.
- BR-034: QR tokens are never permanent identifiers.
- BR-035: QR token lifetime is configurable and short-lived.
- BR-036: Attendance session TTL is kept short-lived.
- BR-037: Tokens must match the active attendance session.
- BR-038: Expired QR tokens cannot be reused.
- BR-041: Session expiry blocks new attendance submissions.
- BR-060: Students must not keep permanent QR identities.
- BR-061: QR tokens rotate regularly during the active attendance window.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from core.common import utc_now

_DEFAULT_QR_TOKEN_TTL_SECONDS = 10
_DEFAULT_ATTENDANCE_SESSION_TTL_SECONDS = 60
_MEMORY_TOKENS: Dict[str, Dict[str, Any]] = {}


class QRTokenError(ValueError):
    """Base error for QR token validation failures."""


class InvalidTokenError(QRTokenError):
    """Raised when a QR token is malformed or unsigned incorrectly."""


class TokenExpiredError(QRTokenError):
    """Raised when a QR token has expired and cannot be used anymore."""


class TokenSessionMismatchError(QRTokenError):
    """Raised when a token belongs to a different attendance session."""


class TokenStudentMismatchError(QRTokenError):
    """Raised when a token is valid but intended for a different student."""


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _canonical_json(value: Dict[str, Any]) -> bytes:
    return json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")


def _get_secret_key(secret_key: Optional[str] = None) -> bytes:
    key = secret_key or os.getenv("QR_TOKEN_SECRET_KEY")
    if not key:
        raise InvalidTokenError("QR token secret key is not configured")
    return key.encode("utf-8")


def _get_cache_backend() -> Any:
    try:
        from django.core.cache import cache

        return cache
    except Exception:  # pragma: no cover - Django is optional in stripped-down tests
        return _MEMORY_TOKENS


def get_qr_token_ttl_seconds() -> int:
    """Return the configured QR token TTL in seconds.

    The exact TTL is runtime-configurable and defaults to 10 seconds per the
    business rule set.
    """
    # BR-035: Token lifetime must be configurable and short-lived.
    return _env_int("QR_TOKEN_TTL_SECONDS", _DEFAULT_QR_TOKEN_TTL_SECONDS)


def get_attendance_session_ttl_seconds() -> int:
    """Return the configured attendance session TTL in seconds."""
    # BR-036: Attendance sessions must be short-lived and configurable.
    return _env_int(
        "ATTENDANCE_SESSION_TTL_SECONDS",
        _DEFAULT_ATTENDANCE_SESSION_TTL_SECONDS,
    )


def _serialize_payload(payload: Dict[str, Any]) -> str:
    body = base64.urlsafe_b64encode(_canonical_json(payload)).decode("ascii")
    return body.rstrip("=")


def _deserialize_payload(
    token: str,
    *,
    secret_key: Optional[str] = None,
) -> Dict[str, Any]:
    try:
        token_part, signature = token.split(".", 1)
    except ValueError as exc:
        raise InvalidTokenError("Token format is invalid") from exc

    pad = "=" * ((4 - len(token_part) % 4) % 4)
    try:
        payload_bytes = base64.urlsafe_b64decode((token_part + pad).encode("ascii"))
    except Exception as exc:  # pragma: no cover - invalid base64 is rejected
        raise InvalidTokenError("Token payload is not valid base64") from exc

    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
    except (TypeError, ValueError) as exc:
        raise InvalidTokenError("Token payload is not valid JSON") from exc

    if not isinstance(payload, dict):
        raise InvalidTokenError("Token payload must be an object")

    expected_signature = hmac.new(
        _get_secret_key(secret_key),
        token_part.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        raise InvalidTokenError("Token signature is invalid")

    return payload


def _token_store_key(token: str) -> str:
    return f"qr_token:{token}"


def store_qr_token(
    token: str,
    *,
    session_id: Any,
    student_id: Any,
    ttl_seconds: Optional[int] = None,
) -> str:
    """Persist a token in the cache store with a strict TTL.

    The persistence layer is intentionally backend-agnostic; Django cache is used
    when available, otherwise an in-memory store is used for tests.
    """
    # BR-033, BR-034, BR-035, BR-038: token records are temporary, not permanent,
    # and expire automatically after a short TTL.
    cache = _get_cache_backend()
    timeout = ttl_seconds if ttl_seconds is not None else get_qr_token_ttl_seconds()
    value = {
        "session_id": session_id,
        "student_id": student_id,
        "expires_at": (utc_now() + timedelta(seconds=timeout)).isoformat(),
        "issued_at": utc_now().isoformat(),
    }

    if hasattr(cache, "set"):
        cache.set(_token_store_key(token), value, timeout=timeout)
        return token

    _MEMORY_TOKENS[_token_store_key(token)] = value
    return token


def generate_qr_token(
    *,
    session_id: Any,
    student_id: Any,
    ttl_seconds: Optional[int] = None,
    secret_key: Optional[str] = None,
) -> str:
    """Generate a signed, time-bound attendance QR token."""
    # BR-033, BR-034, BR-060, BR-061: the token is ephemeral, signed, and rotates
    # with a fresh nonce to avoid permanent QR identity reuse.
    issued_at = utc_now()
    effective_ttl = ttl_seconds if ttl_seconds is not None else get_qr_token_ttl_seconds()
    expires_at = issued_at + timedelta(seconds=effective_ttl)
    payload = {
        "session_id": str(session_id),
        "student_id": str(student_id),
        "issued_at": issued_at.isoformat(),
        "expires_at": expires_at.isoformat(),
        "nonce": hashlib.sha256(f"{time.time_ns()}:{session_id}:{student_id}".encode()).hexdigest(),
    }
    token_body = _serialize_payload(payload)
    signature = hmac.new(_get_secret_key(secret_key), token_body.encode("ascii"), hashlib.sha256).hexdigest()
    token = f"{token_body}.{signature}"
    store_qr_token(token, session_id=session_id, student_id=student_id, ttl_seconds=effective_ttl)
    return token


def validate_qr_token(
    token: str,
    *,
    expected_session_id: Optional[Any] = None,
    expected_student_id: Optional[Any] = None,
    now: Optional[datetime] = None,
    secret_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Validate a QR token, including TTL and session/student matching.

    This helper is intentionally narrow: it enforces token integrity and expiry,
    while view/service code decides whether the token is allowed for a given
    student and attendance session.
    """
    # BR-033, BR-037, BR-038, BR-041: active session validation and expiry are
    # enforced by token mechanics before any attendance submission is considered.
    if not token or not isinstance(token, str):
        raise InvalidTokenError("Token is required")

    payload = _deserialize_payload(token, secret_key=secret_key)
    expires_at_raw = payload.get("expires_at")
    if not expires_at_raw:
        raise InvalidTokenError("Token has no expiration timestamp")

    now_value = now or utc_now()
    expires_at = datetime.fromisoformat(expires_at_raw)
    if now_value >= expires_at:
        raise TokenExpiredError("QR token has expired")

    cache = _get_cache_backend()
    if hasattr(cache, "get"):
        cached = cache.get(_token_store_key(token))
        if cached is None:
            raise InvalidTokenError("Token is unknown or was already invalidated")
        cached_expires = cached.get("expires_at")
        if cached_expires is not None:
            cached_dt = datetime.fromisoformat(cached_expires)
            if now_value >= cached_dt:
                raise TokenExpiredError("QR token has expired")

    if expected_session_id is not None and str(payload.get("session_id")) != str(expected_session_id):
        raise TokenSessionMismatchError("QR token does not belong to the expected attendance session")

    if expected_student_id is not None and str(payload.get("student_id")) != str(expected_student_id):
        raise TokenStudentMismatchError("QR token belongs to a different student")

    return payload


def rotate_qr_token(
    token: str,
    *,
    secret_key: Optional[str] = None,
    ttl_seconds: Optional[int] = None,
) -> str:
    """Create a fresh token from an existing valid token.

    Rotation keeps tokens ephemeral while preserving the same session and
    student identity for the active attendance window.
    """
    # BR-061: QR tokens should rotate regularly during the attendance window.
    payload = validate_qr_token(token, secret_key=secret_key)
    new_token = generate_qr_token(
        session_id=payload["session_id"],
        student_id=payload["student_id"],
        ttl_seconds=ttl_seconds if ttl_seconds is not None else get_qr_token_ttl_seconds(),
        secret_key=secret_key,
    )
    return new_token


def is_qr_token_active(token: str, *, now: Optional[datetime] = None) -> bool:
    """Return whether a token is still valid for attendance scanning."""
    try:
        validate_qr_token(token, now=now)
        return True
    except QRTokenError:
        return False
