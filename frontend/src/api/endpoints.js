/**
 * API Endpoint constants — never hardcode URLs in components.
 *
 * @module api/endpoints
 */

export const AUTH_ENDPOINTS = {
  CSRF: '/accounts/csrf/',
  REGISTER: '/accounts/register/',
  LOGIN: '/accounts/login/',
  LOGOUT: '/accounts/logout/',
  ME: '/accounts/me/',
  CHANGE_ROLE: '/accounts/change-role/',
  USERS: '/accounts/',
  VERIFY_EMAIL: '/accounts/verify-email/',
  RESEND_VERIFICATION: '/accounts/resend-verification/',
};

export const ATTENDANCE_ENDPOINTS = {
  SCAN: '/attendance/scan/',
};

export const ACADEMIC_ENDPOINTS = {
  FACULTIES: '/academic/faculties/',
  DEPARTMENTS: '/academic/departments/',
  COURSES: '/academic/courses/',
  CLASSES: '/academic/classes/',
  SCHOOL_YEARS: '/academic/school-years/',
  SEMESTERS: '/academic/semesters/',
};

export const ANNOUNCEMENT_ENDPOINTS = {
  LIST: '/announcements/',
  DETAIL: (id) => `/announcements/${id}/`,
};

export const ASSESSMENT_ENDPOINTS = {
  LIST: '/assessments/',
  DETAIL: (id) => `/assessments/${id}/`,
};

export const PROJECT_ENDPOINTS = {
  LIST: '/projects/',
  DETAIL: (id) => `/projects/${id}/`,
  GROUPS: (id) => `/projects/${id}/groups/`,
  MEMBERS: (id) => `/projects/${id}/members/`,
  TASKS: (id) => `/projects/${id}/tasks/`,
  CONTRIBUTIONS: (id) => `/projects/${id}/contributions/`,
  TASK_STATUS: (id) => `/projects/tasks/${id}/`,
  CONTRIBUTION_LIST: '/projects/contributions/',
  CONTRIBUTION_REVIEW: (id) => `/projects/contributions/${id}/`,
};
