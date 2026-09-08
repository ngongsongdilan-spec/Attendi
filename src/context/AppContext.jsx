import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

const loadFromStorage = (key, defaultVal) => {
  const stored = localStorage.getItem(key);
  if (stored) {
    try { return JSON.parse(stored); } catch { return defaultVal; }
  }
  return defaultVal;
};

const saveToStorage = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const AppProvider = ({ children }) => {
  // ===== SCHOOL YEARS =====
  const [schoolYears, setSchoolYears] = useState(() => {
    const defaultYears = [
      { id: 1, name: '2023/2024', startDate: '2023-09-01', endDate: '2024-06-30', isActive: false },
      { id: 2, name: '2024/2025', startDate: '2024-09-01', endDate: '2025-06-30', isActive: true },
      { id: 3, name: '2025/2026', startDate: '2025-09-01', endDate: '2026-06-30', isActive: false },
    ];
    return loadFromStorage('fet_school_years', defaultYears);
  });

  // ===== SEMESTERS =====
  const [semesters, setSemesters] = useState(() => {
    const defaultSemesters = [
      { id: 1, name: 'First Semester', shortName: 'Sem 1', schoolYear: '2024/2025', startDate: '2024-09-01', endDate: '2024-12-20', isActive: true, isCurrent: true },
      { id: 2, name: 'Second Semester', shortName: 'Sem 2', schoolYear: '2024/2025', startDate: '2025-01-10', endDate: '2025-06-30', isActive: false, isCurrent: false },
      { id: 3, name: 'First Semester', shortName: 'Sem 1', schoolYear: '2023/2024', startDate: '2023-09-01', endDate: '2023-12-20', isActive: false, isCurrent: false },
      { id: 4, name: 'Second Semester', shortName: 'Sem 2', schoolYear: '2023/2024', startDate: '2024-01-10', endDate: '2024-06-30', isActive: false, isCurrent: false },
    ];
    return loadFromStorage('fet_semesters', defaultSemesters);
  });

  // ===== OTHER DATA =====
  const [students, setStudents] = useState(() => loadFromStorage('fet_students', []));
  const [courses, setCourses] = useState(() => loadFromStorage('fet_courses', []));
  const [attendance, setAttendance] = useState(() => loadFromStorage('fet_attendance', []));
  const [activities, setActivities] = useState(() => loadFromStorage('fet_activities', []));

  // ===== GET CURRENT =====
  const currentSchoolYear = schoolYears.find(y => y.isActive === true) || schoolYears[0];
  const currentSemester = semesters.find(s => s.isCurrent === true) || semesters[0];

  // ===== SAVE TO STORAGE =====
  useEffect(() => { saveToStorage('fet_school_years', schoolYears); }, [schoolYears]);
  useEffect(() => { saveToStorage('fet_semesters', semesters); }, [semesters]);
  useEffect(() => { saveToStorage('fet_students', students); }, [students]);
  useEffect(() => { saveToStorage('fet_courses', courses); }, [courses]);
  useEffect(() => { saveToStorage('fet_attendance', attendance); }, [attendance]);
  useEffect(() => { saveToStorage('fet_activities', activities); }, [activities]);

  // ===== ACTIVITY =====
  const addActivity = (user, action) => {
    setActivities(prev => [{ id: Date.now(), user, action, time: new Date().toISOString() }, ...prev]);
  };

  // ===== SCHOOL YEAR CRUD =====
  const addSchoolYear = (yearData) => {
    const newYear = { ...yearData, id: Date.now() };
    setSchoolYears(prev => [...prev, newYear]);
    addActivity('System', `added school year ${newYear.name}`);
    return newYear;
  };

  const updateSchoolYear = (id, updates) => {
    setSchoolYears(prev => prev.map(y => y.id === id ? { ...y, ...updates } : y));
    addActivity('System', `updated school year`);
  };

  const deleteSchoolYear = (id) => {
    const year = schoolYears.find(y => y.id === id);
    setSchoolYears(prev => prev.filter(y => y.id !== id));
    if (year) addActivity('System', `deleted school year ${year.name}`);
  };

  const switchSchoolYear = (id) => {
    setSchoolYears(prev => prev.map(y => ({
      ...y,
      isActive: y.id === id
    })));
    const year = schoolYears.find(y => y.id === id);
    if (year) addActivity('System', `switched to ${year.name}`);
  };

  // ===== SEMESTER CRUD =====
  const addSemester = (semesterData) => {
    const newSemester = { ...semesterData, id: Date.now() };
    setSemesters(prev => [...prev, newSemester]);
    addActivity('System', `added ${newSemester.name} ${newSemester.schoolYear}`);
    return newSemester;
  };

  const updateSemester = (id, updates) => {
    setSemesters(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    addActivity('System', `updated semester`);
  };

  const deleteSemester = (id) => {
    const semester = semesters.find(s => s.id === id);
    setSemesters(prev => prev.filter(s => s.id !== id));
    if (semester) addActivity('System', `deleted ${semester.name} ${semester.schoolYear}`);
  };

  const switchSemester = (id) => {
    setSemesters(prev => prev.map(s => ({
      ...s,
      isCurrent: s.id === id,
      isActive: s.id === id ? true : s.isActive
    })));
    const semester = semesters.find(s => s.id === id);
    if (semester) addActivity('System', `switched to ${semester.name} ${semester.schoolYear}`);
  };

  // ===== HELPER FUNCTIONS =====
  const getSemesterCourses = (semesterName, schoolYearName) => {
    return courses.filter(c => 
      c.semester === semesterName && 
      c.schoolYear === schoolYearName
    );
  };

  const getStudentSemesterAttendance = (matricule, semesterName, schoolYearName) => {
    return attendance.filter(a => 
      a.studentMatricule === matricule &&
      a.semester === semesterName &&
      a.schoolYear === schoolYearName
    );
  };

  const getCurrentSemesterStats = (studentMatricule) => {
    const sem = currentSemester;
    const year = currentSchoolYear;
    const studentAttendance = getStudentSemesterAttendance(studentMatricule, sem?.name, year?.name);
    const present = studentAttendance.filter(a => a.status === 'Present').length;
    const total = studentAttendance.length || 1;
    
    return {
      semester: sem,
      schoolYear: year,
      attendance: Math.round((present / total) * 100),
      totalClasses: total,
      present: present,
      absent: total - present,
    };
  };

  const value = {
    schoolYears,
    semesters,
    students,
    courses,
    attendance,
    currentSchoolYear,
    currentSemester,
    activities,
    addSchoolYear,
    updateSchoolYear,
    deleteSchoolYear,
    switchSchoolYear,
    addSemester,
    updateSemester,
    deleteSemester,
    switchSemester,
    getSemesterCourses,
    getStudentSemesterAttendance,
    getCurrentSemesterStats,
    addActivity,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};