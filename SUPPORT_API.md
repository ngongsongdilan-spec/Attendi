# Customer care API

All endpoints require authentication. Responses use the existing `{success, data}` envelope.

- `POST /api/v1/support/contact/` accepts `subject` (1–200 characters) and `message` (10–10000 characters). It creates an `OPEN` ticket and returns the ticket.
- `GET /api/v1/support/contact/` lists the caller's latest 200 tickets and replies. `GET /api/v1/support/tickets/{id}/` returns one owned ticket; other users receive 404.
- `GET /api/v1/admin/support/` lists the latest 200 tickets within the administrator's existing user scope. `GET /api/v1/admin/support/{id}/` reads one scoped ticket.
- `PATCH /api/v1/admin/support/{id}/` accepts `status` (`OPEN`, `IN_PROGRESS`, or `RESOLVED`), `message` (a reply), or both. Out-of-scope tickets return 404.

The former contact and admin list paths remain available. Legacy audit-log messages are imported into tickets by migration; audit metadata is cleared of their subject and message. Tickets without a surviving owner are preserved but excluded from user and scoped admin lists. New audit entries contain ticket IDs and status only.

After a successful online scan in Student Stations mode, `POST /api/v1/attendance/scan/` also returns `station_qr` with `attendance_session_id`, `checkpoint_id`, `selection_method`, `token`, and `expires_in_seconds`. It is omitted for Projected QR scans, offline sync, or a closed session. Clients rotate the QR through `GET /api/v1/attendance/{session_id}/my-station-token/`.
