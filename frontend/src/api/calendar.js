/**
 * Academic calendar API — school years and semesters.
 *
 * Reads are open to authenticated users; writes return 403 UNAUTHORIZED
 * unless the session belongs to an administrator.
 *
 * @module api/calendar
 */

import apiClient from './client';
import { ACADEMIC_ENDPOINTS } from './endpoints';

/** @returns {Promise<Array<{id: string, name: string, start_date: string, end_date: string}>>} */
export async function getSchoolYears() {
  const response = await apiClient.get(ACADEMIC_ENDPOINTS.SCHOOL_YEARS);
  return response.data;
}

/** Admin-only. @param {object} payload - {name, start_date, end_date} */
export async function createSchoolYear(payload) {
  const response = await apiClient.post(ACADEMIC_ENDPOINTS.SCHOOL_YEARS, payload);
  return response.data;
}

/**
 * @returns {Promise<Array<{id: string, school_year: string, school_year_name: string, name: string, start_date: string, end_date: string, is_current: boolean}>>}
 */
export async function getSemesters() {
  const response = await apiClient.get(ACADEMIC_ENDPOINTS.SEMESTERS);
  return response.data;
}

/** Admin-only. @param {object} payload - {school_year, name, start_date, end_date, is_current?} */
export async function createSemester(payload) {
  const response = await apiClient.post(ACADEMIC_ENDPOINTS.SEMESTERS, payload);
  return response.data;
}

/**
 * Admin-only partial edit. Setting is_current true demotes the previous
 * current semester server-side (at most one current semester).
 * @param {string} id
 * @param {object} payload - {is_current?: boolean, ...}
 */
export async function updateSemester(id, payload) {
  const response = await apiClient.patch(`${ACADEMIC_ENDPOINTS.SEMESTERS}${id}/`, payload);
  return response.data;
}
