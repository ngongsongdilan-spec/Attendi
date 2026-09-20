/**
 * API Client — Axios instance with interceptors for session-based auth.
 *
 * - Attaches CSRF token from cookie on mutating requests.
 * - Unwraps the {success, data, error} envelope returned by Django REST views.
 * - Handles 401 (redirect to login), 403, and 500 responses.
 *
 * @module api/client
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * Read a cookie value by name.
 * @param {string} name
 * @returns {string|null}
 */
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Axios instance pre-configured for the FET backend.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor — attaches CSRF token to mutating requests.
 */
apiClient.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase();
    if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrfToken = getCookie('csrftoken');
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor — unwraps the {success, data, error} envelope and
 * handles common error codes.
 */
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body) {
      if (body.success) {
        return { ...response, data: body.data };
      }
      const err = new Error(body.error?.message || 'Request failed');
      err.code = body.error?.code || 'UNKNOWN';
      err.status = response.status;
      return Promise.reject(err);
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.error?.message || data?.detail || 'An error occurred';

      if (status === 401) {
        window.location.href = '/';
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }

      if (status === 403) {
        return Promise.reject(new Error(message || 'You do not have permission to perform this action.'));
      }

      return Promise.reject(new Error(message));
    }
    return Promise.reject(new Error('Network error. Please check your connection.'));
  }
);

export default apiClient;
