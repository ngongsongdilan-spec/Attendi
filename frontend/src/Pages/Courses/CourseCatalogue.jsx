/**
 * CourseCatalogue — live course list from GET /academic/courses/.
 *
 * Department and faculty names are resolved server-side, so this is one
 * request with client-side search filtering.
 *
 * @module Pages/Courses/CourseCatalogue
 */

import React, { useEffect, useState, useCallback } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { getCourses } from '../../api/academic';

const CourseCatalogue = () => {
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setCourses(await getCourses());
    } catch (err) {
      setError(err.message || 'Could not load courses.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = courses.filter((course) => {
    const haystack = `${course.code} ${course.name} ${course.department_name || ''} ${course.faculty_name || ''}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#191C1D]">Course Catalogue</h2>
          <p className="text-[#47464F]">Browse all available courses</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#47464F]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code, course, department..."
            className="pl-9 pr-4 py-2 border border-[#C8C5D0] rounded-xl text-sm focus:ring-2 focus:ring-[#3B82F6] w-full sm:w-72"
            aria-label="Search courses"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[#47464F]">Loading courses...</div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={load}
              className="mt-4 px-4 py-2 bg-[#1E1B4B] text-white rounded-xl text-sm font-semibold hover:bg-[#2A1F6E]"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen size={48} className="mx-auto text-[#47464F] opacity-50" />
            <p className="text-[#47464F] mt-4">
              {courses.length === 0 ? 'No courses yet.' : 'No courses match your search.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#C8C5D0] text-left text-[#47464F]">
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Course</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Faculty</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((course) => (
                <tr key={course.id} className="border-b border-[#F0F0F2] last:border-0 hover:bg-[#F8F9FA]">
                  <td className="px-4 py-3 font-mono font-semibold text-[#191C1D]">{course.code}</td>
                  <td className="px-4 py-3 text-[#191C1D]">{course.name}</td>
                  <td className="px-4 py-3 text-[#47464F]">{course.department_name || '—'}</td>
                  <td className="px-4 py-3 text-[#47464F]">{course.faculty_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CourseCatalogue;
