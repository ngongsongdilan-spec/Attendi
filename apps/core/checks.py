"""Production fail-fast checks.

Run automatically by ``manage.py check`` (and at server startup). These catch
the configuration mistakes that silently break an attendance deployment —
especially the shared cache that guarantees single-use QR tokens under load.
"""
from django.conf import settings
from django.core.checks import Error, register


@register()
def secure_secret_key_check(app_configs, **kwargs):
    if settings.DEBUG:
        return []
    errors = []
    if settings.SECRET_KEY.startswith("dev-only-"):
        errors.append(
            Error(
                "DJANGO_SECRET_KEY is still the insecure development default.",
                hint="Set a long random DJANGO_SECRET_KEY in the environment (e.g. `openssl rand -base64 48`).",
                id="fet.W001",
            )
        )
    return errors


@register()
def redis_cache_required_in_production(app_configs, **kwargs):
    """Without a shared (Redis) cache, single-use QR tokens and rate limits
    are per-process. Multi-worker production silently breaks attendance."""
    if settings.DEBUG:
        return []
    errors = []
    if not settings.REDIS_URL:
        errors.append(
            Error(
                "REDIS_URL is not configured.",
                hint="Production requires REDIS_URL (e.g. redis://redis:6379/0). LocMemCache is per-process and "
                     "cannot guarantee single-use QR tokens across workers.",
                id="fet.E002",
            )
        )
    else:
        try:
            from django.core.cache import cache

            cache.ping() if hasattr(cache, "ping") else cache.delete("fet:check")
        except Exception as exc:  # noqa: BLE001 - surface any connection failure
            errors.append(
                Error(
                    f"Redis cache is unreachable: {exc}",
                    hint="Check that the Redis server is running and REDIS_URL is correct.",
                    id="fet.E003",
                )
            )
    return errors


@register()
def postgres_required_in_production(app_configs, **kwargs):
    if settings.DEBUG:
        return []
    if settings.DATABASES["default"]["ENGINE"] != "django.db.backends.postgresql":
        return [
            Error(
                "SQLite is not supported in production.",
                hint="Set DATABASE_URL to a PostgreSQL connection string.",
                id="fet.E004",
            )
        ]
    return []