# Traffic readiness for the AWS rollout

## What the app now does

- Student attendance refreshes station assignment every 12 seconds while the tab is visible. History and points load once, then refresh after a scan, when the student returns to the tab after 60 seconds, or when they press Refresh.
- Live lecturer status refreshes every 6 seconds. QR tokens still rotate before their default 10-second expiry. Requests do not overlap, and failed polls back off.
- Polling endpoints return HTTP 429 with `Retry-After` when an account exceeds its limit. Poll counters use the `polling` cache alias, never the PostgreSQL database cache.
- Session lists fetch only active sessions and the 10 newest finished sessions from the database. Counts are grouped in SQL. Points totals use SQL aggregation, and attendance history preloads its related course.
- Station assignments, live status, station scan counts, checkpoint rosters, points, and history use a shared read-through cache. Warm attendance display and QR rotation requests do not query attendance tables. One worker loads each cold key; other callers wait briefly and receive HTTP 503 with `Retry-After` if it is still cold or Redis is unavailable. Reads never fan out to PostgreSQL on cache failure.
- Station and checkpoint changes, session state changes, enrollment changes, and student history/points writes advance cache generations. The generation also advances after transaction commit so a concurrent loader cannot publish an old value for future requests. Live counts may lag a scan by up to 12 seconds; scan validation and record creation always use the database transaction and its uniqueness constraints.

## AWS settings

Set `REDIS_URL` to a shared Redis endpoint on every backend worker. Production requires Redis and refuses startup without it. Run `python manage.py check` during deployment as an additional check. Local development can use per-worker memory; the default cache needs Redis for cross-worker QR token consistency.

The default per-account limits are `12/minute` for station assignment, `30/minute` for live session status and session lists together, `12/minute` for attendance history and points together, and `12/minute` for station QR tokens. They can be tuned with `ATTENDANCE_STATION_POLL_RATE`, `ATTENDANCE_LIVE_POLL_RATE`, `ATTENDANCE_HISTORY_POLL_RATE`, and `ATTENDANCE_STATION_TOKEN_RATE`. Keep the QR token limit above the normal rotation rate.

These application limits are a backstop, not a capacity guarantee: authenticated requests still load the user from the database, cold cache entries use database reads, and DRF's cache throttle is approximate under simultaneous requests. Cache keys are namespaced per account and session. The cache lock is short, so callers may see a temporary 503 during a slow cold load rather than starting another database query.

## Build integrity

The frontend's previous `dev` and `build` scripts executed a tracked, obfuscated `api.js`, and its PostCSS config had appended obfuscated code. The scripts now run Vite directly, `api.js` has been removed, and PostCSS contains only the Tailwind plugin. Build checks ran the old script before this was discovered: one sandboxed attempt was denied network access, and one unsandboxed attempt failed with a network reset. Review any credentials that were available to that build process before deploying; the removed code remains available in Git history for a security audit.

## Next work before launch

1. Run a load test against a staging copy of the AWS architecture, including many logged-in students viewing attendance, lecturers tracking active sessions, QR rotation, and simultaneous scans. Measure p95 latency, 429 rate, database connections and load, and Redis latency. Choose worker count and rate limits from those measurements.
2. Add AWS WAF rate-based rules in front of the API to reject abusive floods before Django authenticates requests. Use narrower rules for `/api/v1/attendance/` if the load test shows that path is the bottleneck.
3. If database connections spike as workers scale, evaluate RDS Proxy. It pools client connections; it does not remove expensive queries, so confirm the bottleneck before adding it.
4. If normal attendance traffic still saturates PostgreSQL, consider a push channel for live counts and review authentication user lookups. Do not cache QR token validation or single-use scan writes.
5. Paginate student attendance history before individual histories grow large. The endpoint still returns the full history on request, including after a scan or manual refresh.

References: [AWS WAF rate-based rules](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html), [RDS Proxy connection pooling](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.howitworks.html), [RDS DB load metrics](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Cloudwatch.html), [Distributed Load Testing on AWS](https://docs.aws.amazon.com/solutions/latest/distributed-load-testing-on-aws/solution-overview.html).
