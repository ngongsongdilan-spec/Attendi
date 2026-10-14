"""Production fail-fast checks.

Run automatically by ``manage.py check`` (and at server startup). These catch
the configuration mistakes that silently break an attendance deployment —
especially the shared cache that guarantees single-use QR tokens under load.
"""
from django.conf import settings
from django.core.checks import Error, Warning, register


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
def shared_cache_required_in_production(app_configs, **kwargs):
    """Without a *shared* cache, single-use QR tokens and rate limits are
    per-process. Multi-worker/serverless production silently breaks attendance.

    A Redis cache (REDIS_URL) or the PostgreSQL database cache both qualify;
    the database cache keeps serverless deployments working without a separate
    Redis service.
    """
    if settings.DEBUG:
        return []
    errors = []
    backend = settings.CACHES["default"]["BACKEND"]

    if settings.REDIS_URL:
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
    elif backend == "django.core.cache.backends.db.DatabaseCache":
        return errors
    else:
        errors.append(
            Error(
                "No shared cache is configured in production.",
                hint="Set REDIS_URL (e.g. redis://redis:6379/0) or configure the PostgreSQL database cache. "
                     "LocMemCache is per-process and cannot guarantee single-use QR tokens across workers.",
                id="fet.E002",
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


@register()
def cookie_auth_must_be_same_site(app_configs, **kwargs):
    """`SameSite=None` is the setting that silently breaks sign-in on iOS.

    iOS Safari (ITP) discards third-party cookies outright, regardless of the
    SameSite attribute, so a cross-site `None` cookie makes login return 200 and
    then bounce the user back to the login page on their iPhone only.

    The supported layout is the SPA and API behind ONE origin (the frontend
    vercel.json rewrites /api/* to this backend), which keeps the JWT cookies
    first-party.

    Reported as a Warning, not an Error: this project's deploy runs
    `manage.py createcachetable` as its build command, and an Error would fail
    the Vercel build outright. A Warning still prints on every check/deploy
    without blocking anyone who deliberately runs the cross-site layout with
    COOKIE_PARTITIONED=True (CHIPS).
    """
    if settings.DEBUG:
        return []
    warnings = []
    if str(settings.COOKIE_SAMESITE).lower() == "none":
        if not settings.COOKIE_PARTITIONED:
            warnings.append(
                Warning(
                    "COOKIE_SAMESITE is 'None' and COOKIE_PARTITIONED is off. The JWT "
                    "cookies will be third-party cookies that iOS Safari (ITP) "
                    "discards, so sign-in appears to succeed and then redirects back "
                    "to the login page on iPhone.",
                    hint="Preferred: serve the API under the same origin as the SPA "
                         "(rewrite /api/* in the frontend's vercel.json) and use "
                         "'Lax'. Otherwise set COOKIE_PARTITIONED=True (CHIPS) and "
                         "accept that iOS < 17 will still be blocked.",
                    id="fet.W005",
                )
            )
        else:
            warnings.append(
                Warning(
                    "COOKIE_SAMESITE is 'None': auth cookies are third-party. CHIPS is "
                    "enabled, but iOS Safari < 17 ignores Partitioned and will still "
                    "bounce users back to the login page.",
                    hint="Move the API behind the SPA origin and use 'Lax' to support "
                         "every iOS version.",
                    id="fet.W006",
                )
            )
    return warnings