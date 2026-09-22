"""Custom authentication backend for flexible login.

Allows users to authenticate with any of:
  - email address
  - matricule number
  - staffid number

Django's ``auth.authenticate()`` passes the credential as ``username``.
This backend resolves that single value against all three identifiers.
"""

from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

from .models import User


class FlexibleLoginBackend(ModelBackend):
    """Authenticate by email, matricule, or staffid."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None

        identifier = username.strip()
        if not identifier:
            return None

        try:
            user = User.objects.get(
                Q(email__iexact=identifier)
                | Q(matricule__iexact=identifier)
                | Q(staffid__iexact=identifier)
            )
        except User.DoesNotExist:
            # Run the default password hasher to mitigate timing attacks.
            User().set_password(password)
            return None
        except User.MultipleObjectsReturned:
            # Should never happen with unique constraints, but be safe.
            user = User.objects.filter(
                Q(email__iexact=identifier)
                | Q(matricule__iexact=identifier)
                | Q(staffid__iexact=identifier)
            ).first()

        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None
