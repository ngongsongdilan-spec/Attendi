import React, { useState, useEffect, useCallback } from 'react';
import { getSchoolYears, getSemesters } from '../../api/calendar';
import SemesterSelector from './SemesterSelector';
import SchoolYearManager from './SchoolYearManager';

/**
 * Academic calendar page — server-backed school years and semesters.
 * At most one semester is current (enforced in the model); writes are
 * administrator-only (403 UNAUTHORIZED otherwise).
 */
const AcademicCalendar = ({ user }) => {
  const [schoolYears, setSchoolYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.displayRole === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [years, sems] = await Promise.all([getSchoolYears(), getSemesters()]);
      setSchoolYears(years);
      setSemesters(sems);
    } catch (err) {
      setError(err.message || 'Could not load the academic calendar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentSemester = semesters.find((s) => s.is_current) || null;
  const currentYear = currentSemester
    ? schoolYears.find((y) => y.id === currentSemester.school_year) || null
    : null;

  return (
    <div className="space-y-6">
      <div className="fet-welcome-banner">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Academic Calendar</h2>
            <p className="text-[#8683BA] mt-1">
              {currentSemester ? `${currentSemester.name} • ${currentSemester.school_year_name}` : 'No current semester set'}
            </p>
            {currentSemester && (
              <p className="text-[#8683BA] text-sm mt-1">
                {currentSemester.start_date} - {currentSemester.end_date}
              </p>
            )}
          </div>
          {currentSemester && (
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-[#8683BA]">Status</p>
              <p className="text-sm font-bold">1 current semester</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="fet-card p-6 text-center text-text-secondary">Loading calendar…</div>
      ) : (
        <>
          <SemesterSelector
            semesters={semesters}
            schoolYears={schoolYears}
            isAdmin={isAdmin}
            onChanged={load}
          />
          <SchoolYearManager
            schoolYears={schoolYears}
            isAdmin={isAdmin}
            onChanged={load}
          />

          {/* Current Semester Information */}
          <div className="fet-card p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4" style={{ fontSize: '15px' }}>
              Current Semester Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-page-bg rounded-xl text-center">
                <p className="text-xs text-text-secondary">Semester</p>
                <p className="font-semibold text-text-primary">{currentSemester?.name || '—'}</p>
              </div>
              <div className="p-3 bg-page-bg rounded-xl text-center">
                <p className="text-xs text-text-secondary">School Year</p>
                <p className="font-semibold text-text-primary">{currentYear?.name || currentSemester?.school_year_name || '—'}</p>
              </div>
              <div className="p-3 bg-page-bg rounded-xl text-center">
                <p className="text-xs text-text-secondary">Start Date</p>
                <p className="font-semibold text-text-primary">{currentSemester?.start_date || '—'}</p>
              </div>
              <div className="p-3 bg-page-bg rounded-xl text-center">
                <p className="text-xs text-text-secondary">End Date</p>
                <p className="font-semibold text-text-primary">{currentSemester?.end_date || '—'}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AcademicCalendar;
