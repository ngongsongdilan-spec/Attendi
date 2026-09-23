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

/**
 * Class sessions (course occurrence + lecturer) — feeds announcement scope
 * pickers and class listings.
 * @returns {Promise<Array<{id: string, course: string, course_code: string, lecturer: string, lecturer_name: string, starts_at: string|null}>>}
 */
export async function getClasses() {
  const response = await apiClient.get(ACADEMIC_ENDPOINTS.CLASSES);
  return response.data;
}
