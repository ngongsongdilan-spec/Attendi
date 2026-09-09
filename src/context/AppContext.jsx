import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  mockSchoolYears, 
  mockSemesters, 
  mockStudents, 
  mockCourses, 
  mockAttendance,
  getCurrentSchoolYear,
  getCurrentSemester,
} from '../data/mockData';

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
  const [schoolYears, setSchoolYears] = useState(() => 
    loadFromStorage('fet_school_years', mockSchoolYears)
  );

  // ===== SEMESTERS =====
  const [semesters, setSemesters] = useState(() => 
    loadFromStorage('fet_semesters', mockSemesters)
  );

  // ===== STUDENTS =====
  const [students, setStudents] = useState(() => 
    loadFromStorage('fet_students', mockStudents)
  );

  // ===== COURSES =====
  const [courses, setCourses] = useState(() => 
    loadFromStorage('fet_courses', mockCourses)
  );

  // ===== ATTENDANCE =====
  const [attendance, setAttendance] = useState(() => 
    loadFromStorage('fet_attendance', mockAttendance)
  );

  // ===== ACTIVITIES =====
  const [activities, setActivities] = useState(() => 
    loadFromStorage('fet_activities', [])
  );

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

  // ===== COURSE HELPERS =====
  const getCoursesForStudent = (matricule) => {
    const student = students.find(s => s.matricule === matricule);
    if (!student) return [];
    return courses.filter(c => 
      student.enrolledCourses.includes(c.id) &&
      c.level === parseInt(student.level) &&
      c.semester === currentSemester?.name &&
      c.schoolYear === currentSchoolYear?.name
    );
  };

  const getCurrentSemesterStats = (studentMatricule) => {
    const student = students.find(s => s.matricule === studentMatricule);
    if (!student) return { attendance: 0, totalClasses: 0, present: 0, absent: 0 };
    
    const studentAttendance = attendance.filter(a => 
      a.studentMatricule === studentMatricule &&
      a.semester === currentSemester?.name &&
      a.schoolYear === currentSchoolYear?.name
    );
    const present = studentAttendance.filter(a => a.status === 'Present').length;
    const total = studentAttendance.length || 1;
    
    return {
      semester: currentSemester,
      schoolYear: currentSchoolYear,
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
    getCoursesForStudent,
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