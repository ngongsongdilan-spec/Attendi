# Offline attendance backend contract

The existing QR endpoints continue to return cache-backed v1 tokens by default.
Clients can request a server-generated v2 token with `?token_version=2`, or avoid
token polling by obtaining a device credential once per session:

- `GET /api/v1/attendance/{session_id}/station-credential/` — assigned station owner.
- `GET /api/v1/attendance/{session_id}/projector-credential/` — session lecturer.

Both responses use the normal API `data` envelope and `Cache-Control: private,
no-store`. The credential includes a base64url `hmac_key` for that session and
station only; the deployment master key stays on the server. Keep the credential
out of logs and shared storage. The `checkpoint_id` is null for the projector.

## Generate a v2 QR token on the device

Decode `hmac_key` as base64url. Convert UUIDs to their 16-byte binary values,
using 16 zero bytes for a null `checkpoint_id`. Use a device clock synchronized
to UTC. Do not display a token until `slot_origin_ts`. For each slot:

```text
slot_index = floor((unix_time_seconds - slot_origin_ts) / slot_duration_seconds)
expiry_ts = slot_origin_ts + (slot_index + 1) * slot_duration_seconds
header = pack_big_endian(">B16s16sII", 2, session_uuid, checkpoint_uuid,
                         slot_index, expiry_ts)
token = base64url_no_padding(header || HMAC_SHA256(hmac_key, header))
```

Only issue indexes from `0` through `max_slots - 1`. The backend accepts full
10-second slots within the session window. The start is rounded up to a whole
UTC second, so a token may not be valid during the first fraction of a second
after session start. The last partial slot is intentionally excluded.

## Sync captured QR tokens

An authenticated student sends a bounded batch to
`POST /api/v1/attendance/offline-sync/`:

```json
{
  "session_id": "session-uuid",
  "captures": [
    {"token": "v2-token", "checkpoint_id": "station-uuid",
     "captured_at_client": "2026-10-20T10:15:23Z", "verification_method": "QR_SCAN"}
  ]
}
```

`checkpoint_id` and `captured_at_client` are optional. The timestamp is
advisory; only the signed slot determines the recorded time. The response has
`batch_id` and an ordered `results` array. Each result contains `index` and
`status` (`ACCEPTED`, `DUPLICATE`, or `REJECTED`). Accepted and duplicate
results include `record_id`; rejected results include `code` and `message`.
Successful retries return `DUPLICATE` without awarding points again.

The server checks active enrollment, the signed session and station, the
session's effective end, and the 24-hour sync grace period. A manual or
headcount close can invalidate the last QR slot. The same QR may be submitted
by different enrolled students, but each student gets at most one attendance
record per session.

## Deployment and trust boundary

Set one random 32-byte `ATTENDANCE_TOKEN_HMAC_KEY` on every backend instance.
The production system check rejects a missing or short key. Keep it stable
across deployments and at least through the offline sync grace period;
rotation without an overlap mechanism invalidates pending captures. Redis is
still required in traffic mode for shared throttles and the transitional v1
flow. No frontend behavior changes until clients implement this contract.

A signed token establishes the QR slot it represents. It does **not** prove
when a student saw or saved that QR. A credential holder can generate tokens
for its own station's slots, and any student who obtains a token can submit it
during the grace period. The backend therefore treats client timestamps as
untrusted and rejects slots outside the persisted session window, but offline
attendance cannot provide physical-presence proof by itself.
