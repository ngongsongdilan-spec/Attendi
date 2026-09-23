/**
 * Attendance API — endpoints for the attendance module.
 *
 * @module api/attendance
 */

import apiClient from './client';
import { ATTENDANCE_ENDPOINTS } from './endpoints';

/**
 * Submit a QR token to record attendance for the logged-in student.
 * Identity is never sent — the backend derives it from the session only.
 *
 * Rejects with an Error carrying `.code` (e.g. TOKEN_EXPIRED,
 * ALREADY_MARKED, RATE_LIMITED) from the standard error envelope.
 *
 * @param {string} token - Raw QR content from the lecturer's checkpoint.
 * @returns {Promise<{attendance_record_id: string, attendance_session_id: string, recorded_at: string}>}
 */
export async function scanAttendance(token) {
  const response = await apiClient.post(ATTENDANCE_ENDPOINTS.SCAN, { token });
  return response.data;
}
