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
};

export const ATTENDANCE_ENDPOINTS = {
  SCAN: '/attendance/scan/',
};

export const ACADEMIC_ENDPOINTS = {
  FACULTIES: '/academic/faculties/',
  DEPARTMENTS: '/academic/departments/',
  COURSES: '/academic/courses/',
};
