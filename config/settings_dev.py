"""Local development settings with simulated infrastructure.

This module intentionally keeps the production PostgreSQL and Redis settings
untouched.  It is for running the account API locally when those services are
not configured on the developer machine.
"""

from .settings import *  # noqa: F403


DEBUG = True
ALLOWED_HOSTS = ["127.0.0.1", "localhost", "testserver"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "dev.sqlite3",  # noqa: F405
    }
}

# The local-memory cache simulates Redis only for single-process development.
# It must not be used for shared, multi-worker, or production deployments.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "fetplatform-development",
    }
}
