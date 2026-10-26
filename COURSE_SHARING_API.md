# Sharing an offering across departments

`CourseOffering.departments` is the list of additional participating departments. The offering's primary `department` always participates. The `GET /api/v1/course-offerings/` response includes both fields and `department_names`; `?department_id=` matches either primary or shared departments.

Faculty Administrators assigned to the primary course faculty, and System Administrators, may set `departments` when creating or patching an offering. Every shared department must belong to the primary department's faculty. Department Administrators and lecturers cannot change sharing. Sharing reuses the same course, offering, lecturer, and attendance sessions.

Adding a department to an offering with an assigned lecturer enrolls its eligible cohort without duplicating existing enrollments. Removing a department marks its current active enrollments `DROPPED`; their enrollment rows and historical attendance remain. Students can register only while their department participates and the existing semester, level, and registration rules permit it.
