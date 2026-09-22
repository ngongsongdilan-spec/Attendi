"""Run all 8 numbered security-audit checks and report PASS/FAIL per check.

Usage:
    python scripts/security_audit_checks.py

Behavioural checks 1, 2, 5, 6 run through the Django test runner first:
    python manage.py test apps.accounts.tests_security --settings=config.settings_dev

This script covers:
  Check 3  DEBUG defaults to False (only True when explicitly set)
  Check 4  SESSION/CSRF cookies secure when DEBUG is False
  Check 7  frontend/.env.example matches .env
  Check 8  cacheCsrfToken removed from utils/tokenHelpers.js
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT / "frontend"
TOKEN_HELPERS = FRONTEND_DIR / "src" / "utils" / "tokenHelpers.js"

# Subprocess that imports settings with a chosen DEBUG value.
# CWD is a temp dir so the project's .env cannot feed DEBUG in; the project
# root is added to sys.path explicitly so `import config` resolves to the
# project's config/ package rather than a third-party pydantic `config` module.
SETTINGS_PROBE = """
import os, sys
ROOT = %r
sys.path.insert(0, ROOT)
os.environ["SECRET_KEY"] = "selftest-secret-key"
if "SKIP_DEBUG" in os.environ:
    os.environ.pop("DEBUG", None)
else:
    os.environ["DEBUG"] = os.environ["PROBE_DEBUG"]
import config.settings as s
print(s.DEBUG, s.SESSION_COOKIE_SECURE, s.CSRF_COOKIE_SECURE)
""" % str(ROOT)


def probe_settings(debug_value=None, *, skip=False) -> tuple[bool, bool, bool]:
    env = dict(os.environ)
    env.pop("DEBUG", None)
    if skip:
        env["SKIP_DEBUG"] = "1"
    else:
        env["PROBE_DEBUG"] = debug_value
    with tempfile.TemporaryDirectory() as tmp:
        proc = subprocess.run(
            [sys.executable, "-c", SETTINGS_PROBE],
            cwd=tmp,
            env=env,
            capture_output=True,
            text=True,
        )
    if proc.returncode != 0:
        raise RuntimeError(f"settings probe failed: {proc.stderr}")
    debug_str, sess_secure, csrf_secure = proc.stdout.strip().split()
    return (
        debug_str == "True",
        sess_secure == "True",
        csrf_secure == "True",
    )


def check_3_debug_default() -> bool:
    try:
        debug_unset, _, _ = probe_settings(skip=True)
        debug_true, _, _ = probe_settings("True")
        debug_one, _, _ = probe_settings("1")
        debug_false, _, _ = probe_settings("False")
    except Exception as exc:  # pragma: no cover
        print(f"  error: {exc}")
        return False

    ok = not debug_unset and debug_true and debug_one and not debug_false
    print(
        "  DEBUG unset -> %s | DEBUG=True -> %s | DEBUG=1 -> %s | DEBUG=False -> %s"
        % (debug_unset, debug_true, debug_one, debug_false)
    )
    return ok


def check_4_secure_cookies_when_production() -> bool:
    try:
        _, sess_secure_prod, csrf_secure_prod = probe_settings(skip=True)
        _, sess_secure_dev, csrf_secure_dev = probe_settings("True")
    except Exception as exc:  # pragma: no cover
        print(f"  error: {exc}")
        return False

    ok = sess_secure_prod and csrf_secure_prod and not sess_secure_dev and not csrf_secure_dev
    print(
        "  DEBUG=False -> SESSION_SECURE=%s CSRF_SECURE=%s | DEBUG=True -> SESSION_SECURE=%s CSRF_SECURE=%s"
        % (sess_secure_prod, csrf_secure_prod, sess_secure_dev, csrf_secure_dev)
    )
    return ok


def check_7_env_example_matches_env() -> bool:
    env_file = FRONTEND_DIR / ".env"
    example_file = FRONTEND_DIR / ".env.example"
    if not env_file.exists() or not example_file.exists():
        print("  missing .env or .env.example")
        return False

    def values(path: Path) -> dict[str, str]:
        result = {}
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            result[key.strip()] = value.strip()
        return result

    env_vals = values(env_file)
    example_vals = values(example_file)
    mismatches = {
        k: (env_vals.get(k), example_vals.get(k))
        for k in env_vals
        if example_vals.get(k) != env_vals[k]
    }
    if mismatches:
        print(f"  mismatched keys: {mismatches}")
        return False
    print(f"  .env keys: {sorted(env_vals)} all match .env.example -> PASS")
    return True


def check_8_cache_csrf_token_removed() -> bool:
    if not TOKEN_HELPERS.exists():
        print("  tokenHelpers.js missing")
        return False
    text = TOKEN_HELPERS.read_text(encoding="utf-8")
    absent = "cacheCsrfToken" not in text and "getCachedCsrfToken" not in text
    print(f"  'cacheCsrfToken' present: {not absent}")
    return absent


def main() -> int:
    results = {
        3: check_3_debug_default,
        4: check_4_secure_cookies_when_production,
        7: check_7_env_example_matches_env,
        8: check_8_cache_csrf_token_removed,
    }
    failed = []
    print("Static security-audit checks (3, 4, 7, 8)")
    for number, fn in sorted(results.items()):
        try:
            passed = fn()
        except Exception:
            print(f"Check {number}: EXCEPTION")
            traceback.print_exc()
            passed = False
        print(f"Check {number}: {'PASS' if passed else 'FAIL'}")
        if not passed:
            failed.append(number)
    print("\n---")
    print(
        "Run behavioural checks 1, 2, 5, 6 with:\n"
        "  python manage.py test apps.accounts.tests_security --settings=config.settings_dev"
    )
    if failed:
        print(f"FAILED checks: {failed}")
        return 1
    print("All static checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())