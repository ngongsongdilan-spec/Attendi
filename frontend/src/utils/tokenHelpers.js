/**
 * CSRF token and cookie helpers.
 *
 * The CSRF cookie is set by Django on the GET /auth/csrf/ endpoint.
 * This module provides utilities to read and cache it.
 *
 * @module utils/tokenHelpers
 */

const CSRF_COOKIE_NAME = 'csrftoken';

/**
 * Read the CSRF token from the document cookie.
 * @returns {string|null}
 */
export function getCsrfTokenFromCookie() {
  const match = document.cookie.match(new RegExp('(^| )' + CSRF_COOKIE_NAME + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Cache the CSRF token in sessionStorage for quick access.
 * Only stores the token if it is not already present.
 * @param {string} token
 */
export function cacheCsrfToken(token) {
  if (token) {
    sessionStorage.setItem('fet_csrf_token', token);
  }
}

/**
 * Retrieve the cached CSRF token.
 * @returns {string|null}
 */
export function getCachedCsrfToken() {
  return sessionStorage.getItem('fet_csrf_token');
}

/**
 * Validate that a string looks like a valid email address.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Map backend role names to the frontend display format.
 * @param {string} role - Backend role (STUDENT, LECTURER, ADMINISTRATOR)
 * @returns {string} Lowercase display role
 */
export function normalizeRole(role) {
  const map = {
    STUDENT: 'student',
    LECTURER: 'lecturer',
    ADMINISTRATOR: 'admin',
  };
  return map[role] || 'student';
}
