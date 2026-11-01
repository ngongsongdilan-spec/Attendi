// the blue print - read all  the text file before - starting any changes 
FET Attendance Platform — Shared Device Detection & Attendance Verification Feature
1. The main objective
We want to introduce a feature into the existing FET Attendance Platform that detects when one device ID is used to sign in to multiple student accounts during the same attendance session.

The objective is not to prevent students from using another person's device. Instead, we want to detect, record, group and display such activities in a way that allows the lecturer to easily identify and verify the students involved.

The system should handle all the technical operations in the backend while providing a simple, understandable and user-friendly interface for lecturers who do not necessarily understand the technical details.
2. Device ID identification and tracking
- Every browser/device installation should have a persistent device ID.
- When a student logs into an account and takes attendance, the system records the device ID associated with that attendance submission.
- When that student logs out and another student logs into their account using the same browser/device, the system should retain and identify the same device ID.
- The new attendance submission should therefore be associated with the existing device ID.
- This allows the backend to identify when multiple student accounts have used the same device ID, regardless of the accounts used or the number of times someone logs out and logs in.
The lecturer does not need to know the technical name or identity of the device. The device ID is primarily for backend identification, grouping and record management.
3. Attendance records and interface structure
On the lecturer's attendance records interface, we want to introduce a table with the following columns:
ID	Name	Matricule	Status
001	Student A	FE21A001	Present
002	Student B	FE21A002	Verify these 2 accounts
003	Student C	FE21A003	Present

The ID column represents the device ID associated with the attendance submission.

The main idea is that when one device ID is associated with multiple student accounts, those accounts should be grouped together in the same record rather than displayed as unrelated individual records.

For example:
Device ID	Student names	Matricules	Status
DEV-100	Student A, Student B	FE21A001, FE21A002	Verify these 2 accounts
DEV-101	Student C	FE21A003	Present
DEV-102	Student D, Student E, Student F	FE21A004, FE21A005, FE21A006	Verify these 3 accounts

The grouping should be dynamic and adaptive:
- If one device ID is associated with one student account, it appears as a normal attendance record.
- If one device ID is associated with two accounts, the two students are grouped into one record, displaying Verify these 2 accounts.
- If one device ID is associated with three accounts, they are grouped into one record, displaying Verify these 3 accounts.
- If more accounts are associated with the same device ID, the number in the verification status should automatically increase.
The table should update dynamically as new attendance submissions are received.
4. Dynamic verification and status management
When multiple student accounts are identified under one device ID, the system should automatically assign a yellow status indicating that the lecturer needs to verify the students' physical presence.

The lecturer should be able to interact with the grouped record and verify the students individually.

The verification process should support the following outcomes:
Initial state — Shared device detected
Student A + Student B
Verify these 2 accounts


After lecturer verification
Student A
Present

Student B
Absent

Each student's status is updated independently.

The lecturer should have the ability to:
- Mark a student as present if their physical presence is confirmed.
- Mark a student as absent if their physical presence is not confirmed.
- Update the attendance record after verification.
- Verify two or more students individually, even when they are grouped under the same device ID.
The lecturer should not be forced to mark every student in a shared-device group with the same status.
5. Colour-based status identification
We want a simple colour system that allows lecturers to understand attendance records immediately without having to interpret technical information.
Colour	Status	Meaning
Green	Present	Attendance confirmed or normal attendance record
Yellow	Verification required	Multiple accounts detected under one device ID
Red	Absent	Student has been marked absent after verification

The yellow status should be adaptive:
- Verify these 2 accounts.
- Verify these 3 accounts.
- Verify these 4 accounts.
- Verify these N accounts.
Once verification is completed, the individual student records should reflect their respective final statuses.
6. Dynamic and editable lecturer interface
The interface should not be a static table.

It should be a dynamic attendance management interface that:
- Receives new attendance submissions.
- Checks the device ID associated with each submission.
- Identifies whether the device ID already exists in the current attendance session.
- Groups accounts that share the same device ID.
- Updates the existing grouped record instead of creating unrelated records.
- Dynamically updates the number of accounts requiring verification.
- Allows the lecturer to open a grouped record and inspect the students involved.
- Allows individual student attendance statuses to be updated.
- Reflects the lecturer's verification decisions immediately.
This should work even when the attendance session has a large number of students.

For example, if 180 students take attendance and 20 students participate in shared-device submissions, the system should automatically identify and group the affected accounts without requiring the lecturer to manually compare all 180 records.
7. Backend responsibility versus lecturer experience
The lecturer should not have to understand:
- Device ID generation.
- Device identification.
- Browser identification.
- Account switching.
- Database queries.
- Device correlation.
- Attendance grouping algorithms.
- Real-time synchronisation.
These operations should happen in the backend.

The lecturer should only see:
1. Student identification (name and matricule).
2. The device ID grouping where applicable.
3. A clear attendance status.
4. An indication when multiple accounts require verification.
5. The ability to mark each student present or absent.
The backend should manage the technical complexity, while the interface presents the results in a simple and understandable manner.
8. The overall expected behaviour
1. Student logs into the platform
   
   The device ID is identified.
2. Student takes attendance
   
   The attendance submission is associated with the device ID.
3. Another account logs in using the same device
   
   The same device ID is identified again.
4. Backend detects multiple accounts
   
   The accounts are grouped under the same device ID.
5. Lecturer's attendance table updates
   
   The status changes to Verify these N accounts.
6. Lecturer verifies the students
   
   Each student can independently be marked present or absent.
7. Final attendance records are updated
   
   The system retains the final attendance status and verification history.


Central idea to preserve:

The feature is designed around a dynamic, device-based attendance grouping and verification mechanism. Whenever multiple student accounts submit attendance using the same device ID, the system groups their names and matricules under one device record and presents an adaptive verification status to the lecturer. The lecturer can then verify each student individually and update their attendance status to present or absent.

The goal is to make a technically complex detection process appear simple, intuitive, editable and manageable from the lecturer's interface.

This is the consolidated version of your brainstorming, preserving the functionality and interface behaviour you described. It is not yet the final technical specification.

\\build around this  engineering and failure analysis
Princewill, now we're moving from feature brainstorming into system design, security engineering and failure analysis.

I want us to examine this critically because the feature sounds simple on the interface:

- Detect a device ID.
- Group student accounts using that device.
- Display a yellow verification status.
- Allow the lecturer to mark students present or absent.

But the engineering underneath is more complicated, especially when 180 students are submitting attendance, multiple accounts share devices, the network is unstable, and lecturers are making changes simultaneously.

My biggest concern is not whether we can build this feature. We can.

My concern is whether we can build it so that one technical failure cannot corrupt attendance records, expose student information, or prevent lecturers from completing their work.

Let's approach it using the three security objectives you mentioned: Availability, Confidentiality and Integrity (the CIA triad).

# 1. Worst-case scenarios: What can go wrong?

First, let's identify the failure points.

## A. Frontend challenges

1\. Incorrect device grouping

High impact

Suppose 180 students submit attendance. The frontend receives records and groups them by device ID.

Possible problems:

- The same student appears twice.
- A group contains outdated information.
- Two accounts using the same device are displayed separately.
- Two different devices are accidentally displayed as one group.
- A group doesn't update when another student submits attendance.

Solution: Never make the frontend the authority for grouping. The backend should return the already-correlated groups, and the frontend should render them.

2\. Real-time synchronisation failures

High impact

Imagine the lecturer is monitoring attendance while students are submitting records.

The lecturer's internet disconnects for 20 seconds.

During that time:

- Five students submit attendance.
- Two shared-device flags are created.
- The lecturer's interface does not receive the updates.

When the connection returns, the frontend might display outdated information.

Solution: Use WebSockets for updates, but use the database-backed API to recover the authoritative state after reconnection.

3\. Race conditions

High impact

Two students submit attendance using the same device almost simultaneously.

Both requests reach the backend before either request finishes processing.

The frontend could receive:

- One update saying one account used the device.
- Another update saying two accounts used it.

If updates arrive out of order, the lecturer might temporarily see an incorrect group.

Solution: Use database transactions, consistent event ordering, version numbers and idempotent submissions.

4\. Large and dynamic tables

Medium impact

A lecturer might have 180, 300 or more attendance records.

Rendering every record and continuously re-rendering the entire table could make the interface slow.

Solution:

- Pagination or virtual scrolling.
- Update only affected rows.
- Server-side sorting and filtering.
- Search by name or matricule.
- Separate normal records from records requiring verification.

  5\. Accidental lecturer actions

  High impact

  A lecturer might accidentally mark a student absent when the student was actually present.

Solution:

- Confirmation before consequential changes.
- Clear present/absent actions.
- Undo or correction workflow.
- Record who made the change and when.

There is one particularly important frontend principle:

The interface must never assume that an action succeeded simply because a lecturer clicked a button.

For example, when a lecturer marks Student B absent:

1. The frontend sends the request.
2. The backend checks permission and record state.
3. The backend commits the change.
4. The backend returns the updated record.
5. The frontend updates its display.

If the request fails, the frontend must retain the previous confirmed state and explain that the update wasn't saved.

# 2. Backend challenges and how we should engineer around them

The backend is where we should enforce the actual rules.

I recommend keeping this as a modular monolithic architecture, rather than introducing multiple microservices.

You already have a Django-based backend and PostgreSQL/Redis architecture in your FET project. This feature does not justify introducing another independent service.

I would organise the backend into these logical modules:

Django REST API

Authentication, permissions and request validation

Attendance Module

Attendance validation and records

Device Module

Device registration and identity

Correlation Module

Group shared-device submissions

Verification Module

Lecturer decisions and corrections

PostgreSQL

Authoritative attendance, device relationships and audit records

Event Delivery Layer

Transactional outbox + Redis / Django Channels

## A. Database consistency

This is probably the most important backend challenge.

Imagine the following:

- Student A submits attendance using DEV-100.
- Student B submits attendance using DEV-100.
- Student C submits attendance using DEV-100.
- Student D submits attendance using DEV-100.

Your system should eventually have one device group associated with four individual attendance records.

But consider a dangerous implementation:

You save Student A's attendance, then save Student B's attendance, and then separately create a shared-device flag.

What happens if the server crashes between saving Student B's attendance and creating the flag?

You now have two attendance records but no indication that the device was shared.

That is an integrity failure.

### My solution: Database transactions

The related operations should be handled in one database transaction.

```
from django.db import transaction@transaction.atomicdef register_attendance(student, session, device, checkpoint):    record = create_attendance_record(        student=student,        session=session,        device=device,        checkpoint=checkpoint    )    group = get_or_create_session_device_group(        session=session,        device=device    )    attach_record_to_group(group, record)    update_group_verification_status(group)    create_integrity_audit_event(        group=group,        record=record    )    return record
```

This is conceptual code. The production implementation must handle simultaneous group creation, unique constraints, duplicate requests and transaction retries.

If an operation fails before the transaction commits, the database rolls back the entire operation.

This is what we want.

## B. Avoiding race conditions

Let's consider the worst case.

Thirty students are submitting attendance at approximately the same time.

Two accounts using the same device submit within milliseconds of each other.

Without proper concurrency control, the system could:

- Create duplicate device groups.
- Create duplicate attendance records.
- Miss a shared-device relationship.
- Overwrite an updated group status.

I recommend three protections.

1\. Database constraints

Enforce:

```
UNIQUE(session_id, student_id)
UNIQUE(session_id, device_id) on device groups
```

This ensures that a student cannot have duplicate attendance records for the same session and that a device has only one group per session.

2\. Row-level locking

Use Django's `select_for_update()` when updating an existing device group.

This prevents two concurrent transactions from modifying the same group without coordination.

For the initial creation of a group, use the unique database constraint as the final protection against simultaneous creation.

3\. Idempotency keys

Every attendance submission should have a unique request identifier.

If a student submits attendance and the network fails before receiving the response, the browser may retry.

Without idempotency, the backend might process the same request twice.

With idempotency, the server recognises the repeated request and returns the original result.

This is particularly important in Cameroon, where mobile internet connectivity can be inconsistent.

## C. One very important database design decision

I want to challenge one aspect of the proposed interface.

You want multiple students using one device ID to appear inside one table record.

That is a good presentation decision.

But do not merge their actual attendance records into one database record.

These are two different things.

Database representation

One device group, three individual attendance records

Device group: DEV-100

Session: CEF405

Student A

Present

Student B

Absent

Student C

Present

Lecturer's table representation

DEV-100

Review group

Student A, Student B, Student C

3 accounts • Expand to manage individually

Explore expanded table design

Why?

Because the students have separate identities, matricules, attendance statuses and academic records.

If you combine their names and matricules into one text field, you will make it difficult to:

- Mark one student absent without affecting another.
- Generate individual attendance reports.
- Export student attendance histories.
- Track lecturer decisions.
- Correct mistakes.
- Maintain database relationships.

The database should maintain individual records.

The frontend should group them visually.

That is the correct separation of concerns.

## D. Separate two different types of status

Another important design decision.

Don't use one status field for everything.

You actually have two different concepts:

| Status type       | Possible values                         |
| ----------------- | --------------------------------------- |
| Attendance status | Present, Absent, Pending                |
| Integrity status  | Normal, Verification required, Reviewed |

For example:

Student A and Student B may share one device.

The device group has:

`Integrity status = Verification required`

But the two students can independently have:

- Student A: Present.
- Student B: Absent.

After the lecturer verifies both, the group can become reviewed.

This separation will prevent confusing logic and make your frontend easier to maintain.

# 3. The CIA triad: How we protect the system

Now let's apply the three security objectives to your actual feature.

## A. Availability — The system must remain usable

Availability means the attendance platform should continue functioning when something goes wrong.

Primary objective

Worst-case scenario:

The lecturer starts attendance for 180 students.

Fifty students submit attendance.

The lecturer's internet connection drops.

Students continue submitting attendance, but the lecturer cannot see updates.

Then Redis becomes temporarily unavailable.

What should happen?

The system must not lose attendance records simply because the real-time update service is unavailable.

### Engineering solutions

| Risk                   | Engineering solution                            |
| ---------------------- | ----------------------------------------------- |
| Internet disconnection | Automatic reconnection and state recovery       |
| WebSocket failure      | API polling fallback                            |
| Redis failure          | PostgreSQL remains authoritative                |
| Duplicate submissions  | Idempotency keys                                |
| Database failure       | Backups and recovery procedures                 |
| High request volume    | Indexed queries and connection management       |
| Frontend crash         | Reload and retrieve authoritative session state |

### My recommended synchronization strategy

Use three layers:

1. PostgreSQL: Permanent attendance records and integrity information.
2. Redis: Temporary caching, Channels messaging and fast coordination.
3. WebSockets: Live delivery of updates to lecturers.

I would also introduce a transactional outbox.

This is important.

Instead of saving an attendance record and hoping that a separate event publication succeeds, save the attendance change and an event entry in the same PostgreSQL transaction.

A background worker then publishes the event to Redis/Channels.

If Redis goes down temporarily, the event remains in the database and can be delivered later.

Reliable event delivery

Attendance + Outbox Event

PostgreSQL Transaction Commit

Background Event Publisher

Redis / WebSocket

Lecturer's Interface

The event publisher should retry failed deliveries and mark events as published. Consumers should handle duplicate events safely.

This gives you much stronger availability than relying on a direct WebSocket message immediately after saving attendance.

## B. Confidentiality — Protect student information

Confidentiality means only authorised people should access the information they are permitted to see.

Worst-case scenario:

A student discovers the API endpoint used to retrieve attendance records.

They modify a session ID in the request and retrieve the attendance information of another class.

Or they attempt to call the endpoint used by lecturers to mark students absent.

These are real security risks.

### Engineering solutions

1\. Role-based access control

Define permissions for:

- Students.
- Lecturers.
- Course administrators.
- System administrators.

A student should not be able to access lecturer verification operations.

A lecturer should only manage attendance sessions and records they are authorised to manage.

2\. Object-level permission checks

Never trust the frontend to decide which session a lecturer can access.

For every request, Django should verify that the authenticated lecturer has permission to access the specific attendance session.

3\. Secure device credentials

Device identity should not be treated as a password or authentication credential.

Use an opaque device identifier and, preferably, a cryptographic credential to prove continuity of the registered browser installation.

Protect authentication tokens and credentials appropriately.

For browser sessions:

- HTTPS everywhere.
- Secure and HttpOnly cookies where appropriate.
- SameSite cookie protection.
- CSRF protection.
- Proper session expiration and revocation.

4\. Protect student data

- Encrypt network communication using TLS.
- Restrict database access.
- Protect backups.
- Avoid exposing unnecessary device information in API responses.
- Never put authentication tokens, private keys or passwords in logs.
- Apply retention policies to device identifiers and audit information.

An important distinction: lecturers may need to see grouped student identities, but they do not need access to raw device credentials or cryptographic keys.

## C. Integrity — Attendance records must remain trustworthy

Critical objective

Integrity is particularly important because the lecturer can change a student's attendance status.

Worst-case scenario:

A student submits attendance successfully.

The lecturer accidentally marks them absent.

Another lecturer or administrator modifies the same record.

Or someone manipulates the frontend request to mark themselves present.

How do we protect against these situations?

### Engineering solutions

| Risk                        | Protection                                   |
| --------------------------- | -------------------------------------------- |
| Duplicate attendance        | Database uniqueness constraints              |
| Forged attendance requests  | Server-side authentication and QR validation |
| Unauthorised status changes | Role and object-level permissions            |
| Accidental lecturer changes | Confirmation and correction workflow         |
| Concurrent modifications    | Transactions and optimistic locking          |
| Untraceable changes         | Immutable audit history                      |
| Tampered client data        | Server-side validation                       |

### Audit logging is non-negotiable

Every important lecturer decision should generate an audit event.

For example:

Attendance audit history

1. 09:02:13 — Attendance submitted

   Student B submitted attendance using DEV-100.
2. 09:02:14 — Shared device detected

   Two student accounts associated with DEV-100.
3. 09:15:30 — Lecturer verification

   Lecturer marked Student A present.
4. 09:16:05 — Attendance updated

   Lecturer marked Student B absent.

   Status changed

Illustrative audit history. Actual timestamps and actors must be generated and recorded by the backend.

Do not simply overwrite the previous attendance status and lose the history.

Store:

- Previous status.
- New status.
- Student affected.
- Lecturer responsible.
- Timestamp.
- Reason or explanation.
- Related attendance session.

This is important if a student later disputes an attendance decision.

# 4. Frontend system design: How should we actually code it?

Let's move from security principles to implementation.

Assuming your lecturer interface is built with React/Next.js, I would organise the frontend around independent components rather than building one enormous attendance page.

## A. Suggested component architecture

AttendanceSessionPage

AttendanceSessionHeader

Course, lecturer, session state and attendance progress

AttendanceSummary

Total present, absent, pending and flagged groups

AttendanceRecordsTable

NormalAttendanceRow

Individual student record

SharedDeviceGroupRow

Grouped accounts and expandable student records

StudentVerificationActions

Mark present / absent

IntegritySummaryPanel

Shared-device cases and unresolved verifications

AuditHistoryPanel

Lecturer decisions and historical changes

Each component should have a clear responsibility.

For example, `SharedDeviceGroupRow` shouldn't independently decide whether two accounts share a device. It should receive that information from the backend.

This keeps the frontend presentation-focused.

## B. Frontend state management

You need to distinguish three types of state.

| State            | Example                                     | Where it belongs  |
| ---------------- | ------------------------------------------- | ----------------- |
| Server state     | Attendance records, device groups           | API/query cache   |
| UI state         | Expanded rows, selected filters, open modal | React state       |
| Connection state | Connected, reconnecting, offline            | WebSocket manager |

For server state, TanStack Query (React Query) would be a good option.

For real-time communication, use a WebSocket connection.

The workflow should be:

1. Fetch initial attendance data from Django.
2. Establish the WebSocket connection.
3. Receive new attendance events.
4. Update the relevant cached record or invalidate the affected query.
5. Refetch the authoritative state after reconnecting.

For 180 students, you don't need to reload the entire page every time a record changes.

You can update only the affected group.

## C. Event structure

The backend should send structured events.

For example:

```
{
  "event": "device_group.updated",
  "session_id": "CEF405-001",
  "group_id": "GRP-100",
  "version": 4,
  "student_count": 3,
  "integrity_status": "REVIEW_REQUIRED",
  "affected_student_ids": [
    "STU-001",
    "STU-002",
    "STU-003"
  ]
}
```

The frontend receives this event and knows which group needs updating.

Notice that we send identifiers and state changes rather than unnecessary student information.

The frontend can retrieve the group's authorised details from the API.

Also, events should carry a monotonically increasing version for each group. If version 4 arrives after version 5, the frontend should not overwrite the newer state with stale information.

## D. Suggested API endpoints

I would introduce endpoints along these lines:

| Endpoint                                                  | Responsibility                                |
| --------------------------------------------------------- | --------------------------------------------- |
| `POST /api/devices/register/`                             | Register browser device identity              |
| `POST /api/attendance/submit/`                            | Submit attendance                             |
| `GET /api/sessions/{id}/records/`                         | Retrieve attendance records and grouped views |
| `GET /api/sessions/{id}/integrity/`                       | Retrieve shared-device groups                 |
| `PATCH /api/integrity/groups/{id}/students/{student_id}/` | Update an individual verification decision    |
| `GET /api/sessions/{id}/audit/`                           | Retrieve audit history                        |

The endpoints are illustrative; they should fit into your existing API structure.

One important thing: don't allow a client to submit an arbitrary device ID and have the backend blindly trust it.

The backend must resolve the registered device credential and associate it with the submission.

# 5. The most dangerous failure scenarios

Let's pressure-test the entire system.

| Worst-case situation                      | Expected system behaviour                                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Device ID is cleared from browser storage | New identity may be issued; system recognises identity continuity is no longer guaranteed             |
| Student uses incognito mode               | Treat as a potentially new browser identity                                                           |
| Thirty students share one device          | One group, thirty individual attendance records                                                       |
| Lecturer disconnects                      | Attendance continues; updates are recovered after reconnection                                        |
| Redis crashes                             | PostgreSQL retains records; event delivery retries                                                    |
| Student submits twice                     | Idempotency prevents duplicate attendance                                                             |
| Two students submit simultaneously        | Transactions and database constraints preserve consistency                                            |
| Lecturer accidentally marks absent        | Authorised correction with audit history                                                              |
| Student manipulates an API request        | Backend permission and validation checks reject it                                                    |
| WebSocket sends duplicate events          | Event IDs and versions prevent duplicate or stale UI updates                                          |
| Browser crashes                           | Lecturer reloads and retrieves the latest server state                                                |
| Device identity is spoofed                | Additional credential verification and integrity controls; no claim of absolute device identification |

One particularly serious issue deserves emphasis.

A persistent browser device ID is not proof of a physical device.

If a student clears browser data, changes browsers or deliberately manipulates their environment, the identity can change.

Likewise, a shared browser profile can be used by different people.

So your feature should be described as shared browser/device identity detection, not guaranteed physical-phone detection.

This limitation is important for the lecturer's decision-making.

# 6. Testing: How do we know the feature is reliable?

I wouldn't consider this feature complete just because it works with two students on our development machines.

We need to test it against realistic conditions.

I recommend four categories of testing.

| Test category       | What we test                                         |
| ------------------- | ---------------------------------------------------- |
| Unit testing        | Device grouping, status calculation, permissions     |
| Integration testing | Django, PostgreSQL, Redis and WebSocket interactions |
| Concurrency testing | Many simultaneous attendance submissions             |
| End-to-end testing  | Lecturer and student workflows                       |

### Specific test cases

These are the tests I would require before deployment.

Engineering test checklist

0/12 tested

One device submits attendance for two accounts.

One device submits attendance for thirty different accounts.

Thirty different devices submit attendance simultaneously.

Two accounts submit attendance simultaneously using one device.

Student logs out and another account logs in using the same browser.

Lecturer marks one student absent while another student in the group remains present.

Lecturer loses internet during attendance.

Redis becomes unavailable during attendance.

WebSocket delivers duplicate or out-of-order events.

Unauthorised student attempts to change attendance status.

Lecturer refreshes the page after several attendance updates.

Two lecturers attempt to modify the same attendance record.

Reset checklist

For performance testing, I would simulate 180 students, then increase to 300–500 concurrent submissions to identify bottlenecks.

Tools worth considering:

- Locust — load and concurrency testing.
- Pytest — backend tests.
- Playwright — lecturer interface and student workflows.
- k6 — API performance testing.

# 7. My recommended system design decisions

If we were to start implementing this feature tomorrow, this is the architecture I would approve.

| Layer              | Recommended approach                                 |
| ------------------ | ---------------------------------------------------- |
| Frontend           | React / Next.js                                      |
| UI architecture    | Component-based                                      |
| Server state       | TanStack Query                                       |
| Live communication | WebSockets                                           |
| Backend            | Django REST Framework                                |
| Database           | PostgreSQL                                           |
| Device identity    | Persistent browser credential                        |
| Correlation        | Django service layer                                 |
| Concurrency        | Transactions, constraints, row locking               |
| Temporary state    | Redis                                                |
| Event reliability  | Transactional outbox                                 |
| Audit history      | PostgreSQL audit records                             |
| Security           | RBAC, object-level permissions, TLS, CSRF protection |
| Testing            | Pytest, Playwright, Locust                           |

## 8. What I would actually build first

There is a danger of overengineering this feature.

You don't need advanced machine learning, multiple microservices, complicated device fingerprinting or a sophisticated fraud detection platform to solve the initial problem.

I would implement it in this order:

Priority 1

Core device correlation

- Persistent device identity.
- Associate device identity with attendance submissions.
- Detect multiple accounts per device per session.
- Group affected accounts.
- Keep individual attendance records.

Priority 2

Lecturer interface

- Dynamic attendance table.
- Shared-device grouping.
- Adaptive verification labels.
- Expandable student records.
- Individual present/absent actions.

Priority 3

Security and reliability

- Database transactions.
- Permissions and access control.
- Idempotency.
- Audit logging.
- Real-time event synchronisation.
- Reconnection and recovery.

Priority 4

Advanced improvements

- Historical device-sharing patterns.
- Assisted attendance authorisation.
- More advanced device assurance.
- Performance optimisation based on actual measurements.

# 9. Three principles I want your development team to remember

1\. The backend owns the truth; the frontend owns the experience.

The frontend should never determine whether attendance is valid, whether a student is absent, or whether two accounts share a device. It presents the backend's verified state.

2\. Availability must not depend on real-time communication.

WebSockets are for displaying updates, not for guaranteeing that attendance is saved. PostgreSQL is the source of truth.

3\. Every important change must be traceable.

When a lecturer changes a student's status, the system should know who changed it, when it happened, what changed and why.

## 10. One final architectural question

There is one decision I would like us to settle before we move into actual implementation.

When the lecturer sees a shared-device group, should the interface present it as one expandable row or should it display the individual students as separate rows with a shared verification indicator?

Option A — One expandable group

[开源多维表格SmartTable v1.1版本更新啦 - 技术栈](https://images.openai.com/static-rsc-4/V7X4x2zTT5Wx9YpUTPkr61w5lBIletbXkLA4cVpFpru57FpfFfLYD0dPOWZjPSfsXpLPw7VLydDe5SZbHxJw0yGEgslvvnJ4W4Na7dvYlCoNLTfiDgfXFgdNDub9ARzu_PETW9YD2bcon2JWFZGwOG_eoMIzacodtiLcT0EdMrA?purpose=inline)

[jishuzhan.net](https://jishuzhan.net/article/2046154722852274178?utm_source=chatgpt.com)

One row for DEV-100, showing all associated students when expanded. Cleaner when there are many shared-device cases.

Option B — Individual student rows

[QR Code Student Attendance System with Real-Time Tracking - Payhip](https://images.openai.com/static-rsc-4/Yxn9nMHm7gc8RLYk4wI5EphkB7v7_p7NL_YDqbziVr80FgGr9Z7HXYpiCHqzXZer1UsL0xREeTRas9Mn6yrz0kyMDa0pPPIWeHCH38KSCXGkNb21CvR9z3ND21CmNRQVVRg1rV1tg_tZCpJ8F-I1JH1MMaRtTHHQziUo_XZBNAw?purpose=inline)

[payhip.com](https://payhip.com/b/p8GaU?utm_source=chatgpt.com)

Each student retains a separate row, but students sharing a device receive a common group indicator. Easier for individual attendance management.

Option C — Hybrid

Normal students appear individually. Shared-device students are grouped into expandable rows, with individual student statuses inside the group.

Option A

Option B

Option C — Hybrid

Confirm interface direction

My recommendation is Option C — Hybrid.

It preserves individual student accountability while making shared-device incidents immediately visible.

Ultimately, the feature should be simple enough for a lecturer to operate without understanding device identities, database relationships or concurrency, but engineered well enough that those technical details never compromise the attendance records.

That's the standard I would aim for in the FET platform.
