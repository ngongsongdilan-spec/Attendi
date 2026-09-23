/**
 * Academic API — read endpoints for faculties, departments, and courses.
 *
 * @module api/academic
 */

import apiClient from './client';
import { ACADEMIC_ENDPOINTS } from './endpoints';

/** @returns {Promise<Array<{id: string, name: string}>>} */
export async function getFaculties() {
  const response = await apiClient.get(ACADEMIC_ENDPOINTS.FACULTIES);
  return response.data;
}

/** @returns {Promise<Array<{id: string, name: string, faculty: string|null, faculty_name: string|null}>>} */
export async function getDepartments() {
  const response = await apiClient.get(ACADEMIC_ENDPOINTS.DEPARTMENTS);
  return response.data;
}

/**
 * Courses arrive with department_name/faculty_name resolved server-side.
 * @returns {Promise<Array<{id: string, code: string, name: string, department: string|null, department_name: string|null, faculty_name: string|null}>>}
 */
export async function getCourses() {
  const response = await apiClient.get(ACADEMIC_ENDPOINTS.COURSES);
  return response.data;
}
