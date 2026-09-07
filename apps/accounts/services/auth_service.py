"""Server-side account and role business rules.

This module intentionally accepts plain values and Django-like model classes.
It does not read frontend role claims and it does not construct HTTP responses.

Business rules enforced here:
- BR-001: active academic identities have at most one active account.
- BR-002: registrations default to STUDENT; role changes require an authorized
  administrator and are audited.
- BR-003: permissions derive from the server-side stored role only.
- BR-170: account operations reject missing referenced identities.
- BR-210: role changes are recorded as significant security actions.
"""

from __future__ import annotations

from typing import Any, Optional, Protocol

from core.academic_access import (
    ADMIN_ROLES,
    ROLE_STUDENT,
    normalize_role,
)
from core.audit import write_audit_entry
from core.common import ConfigurationError


DEFAULT_ROLE = ROLE_STUDENT.upper()
ADMINISTRATOR_ROLES = frozenset(role.upper() for role in ADMIN_ROLES)


class AuthError(ValueError):
    """Base domain error raised by account workflows."""


class AccountAlreadyExistsError(AuthError):
    """Raised when an active account already exists for an identity."""


class IdentityNotFoundError(AuthError):
    """Raised when the referenced academic identity cannot be found."""


class UnauthorizedRoleChangeError(AuthError):
    """Raised when a non-administrator attempts to change a role."""


class SelfRoleAssignmentError(AuthError):
    """Raised when a user attempts to assign their own role."""


class InvalidRoleError(AuthError):
    """Raised when a role is missing or not supported by the account model."""


class AccountModelLike(Protocol):
    """Minimal shape expected from an account model."""

    id: Any
    identity_id: Any
    role: Any
    is_active: Any

    def save(self) -> Any:
        ...


def _exists(model: Optional[type[Any]], **filters: Any) -> bool:
    if model is None:
        return False
    manager = getattr(model, "objects", None)
    if manager is None or not hasattr(manager, "filter"):
        return False
    queryset = manager.filter(**filters)
    if hasattr(queryset, "exists"):
        return bool(queryset.exists())
    return bool(queryset)


def _is_active(account: Any) -> bool:
    value = getattr(account, "is_active", None)
    if value is not None:
        return bool(value)
    return str(getattr(account, "status", "")).lower() in {
        "active",
        "enabled",
    }


def _identity_exists(identity_id: Any, IdentityModel: Optional[type[Any]]) -> None:
    # BR-170: account creation must not point at a nonexistent identity.
    if identity_id is None:
        raise IdentityNotFoundError("Academic identity is required")
    if IdentityModel is not None and not _exists(IdentityModel, id=identity_id):
        raise IdentityNotFoundError(f"Academic identity {identity_id} does not exist")


def register_account(
    identity_id: Any,
    *,
    AccountModel: type[AccountModelLike],
    IdentityModel: Optional[type[Any]] = None,
) -> AccountModelLike:
    """Create one active account using the server-controlled STUDENT role."""
    # BR-001, BR-170: reject duplicate active accounts and invalid identities.
    if AccountModel is None:
        raise ConfigurationError("AccountModel is required")
    _identity_exists(identity_id, IdentityModel)

    manager = getattr(AccountModel, "objects", None)
    if manager is None or not hasattr(manager, "filter"):
        raise ConfigurationError("AccountModel.objects.filter is required")
    existing = manager.filter(identity_id=identity_id)
    records = list(existing)
    if any(_is_active(record) for record in records):
        raise AccountAlreadyExistsError(
            f"An active account already exists for identity {identity_id}"
        )

    account = AccountModel()
    account.identity_id = identity_id
    # BR-002, BR-003: registration ignores any client-supplied role and stores
    # the server default; permissions later come from this stored value.
    account.role = DEFAULT_ROLE
    if hasattr(account, "is_active"):
        account.is_active = True
    account.save()
    return account


def change_user_role(
    account: AccountModelLike,
    new_role: str,
    *,
    actor: Any,
    allowed_roles: Optional[set[str]] = None,
) -> AccountModelLike:
    """Change an account role only when an administrator explicitly does so."""
    # BR-002: role changes require an authorized administrator and cannot be
    # self-assigned by the affected user.
    if account is None or actor is None:
        raise UnauthorizedRoleChangeError("Account and administrator are required")
    if getattr(account, "id", None) == getattr(actor, "id", None):
        raise SelfRoleAssignmentError("Users cannot assign themselves a role")
    if normalize_role(getattr(actor, "role", None)) not in ADMIN_ROLES:
        raise UnauthorizedRoleChangeError("Only an administrator may change roles")

    normalized_role = str(new_role).strip().upper() if new_role is not None else ""
    if not normalized_role:
        raise InvalidRoleError("A role is required")
    if allowed_roles is not None and normalized_role not in {
        str(role).upper() for role in allowed_roles
    }:
        raise InvalidRoleError(f"Unsupported role: {new_role}")

    old_role = getattr(account, "role", None)
    account.role = normalized_role
    account.save()

    # BR-210: role changes are significant security actions and must be audited.
    write_audit_entry(
        action="role_changed",
        resource_type="account",
        resource_id=account.id,
        actor_id=actor.id,
        old_value=old_role,
        new_value=normalized_role,
    )
    return account


def get_server_role(account: AccountModelLike) -> str:
    """Return the stored role used as the sole permission source."""
    # BR-003: never derive permissions from frontend-provided claims.
    if account is None or getattr(account, "role", None) is None:
        raise InvalidRoleError("Account has no server-side role")
    return str(account.role).upper()
