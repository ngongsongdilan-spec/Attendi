import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  mockSchoolYears, 
  mockSemesters, 
  mockStudents, 
  mockLecturers,
  mockCourses, 
  mockAttendance,
  mockAnnouncements,
  mockProjects,
  mockGroups,
  mockTasks,
  mockMilestones,
  mockAttendanceSessions,
  mockAttendanceRecords,
  getCurrentSchoolYear,
  getCurrentSemester,
} from '../data/MockData';

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

  // ===== LECTURERS =====
  const [lecturers, setLecturers] = useState(() => 
    loadFromStorage('fet_lecturers', mockLecturers)
  );

  // ===== STUDENT/STAFF MANAGEMENT =====
  const addStudent = (studentData) => {
    const newStudent = {
      ...studentData,
      matricule: studentData.matricule || `FE26-${Math.floor(100 + Math.random() * 900)}`,
      enrolledCourses: studentData.enrolledCourses || [],
    };
    setStudents(prev => [...prev, newStudent]);
    addActivity('System', `added student ${newStudent.fullName}`);
    return newStudent;
  };

  const updateStudent = (matricule, updates) => {
    setStudents(prev => prev.map(s => s.matricule === matricule ? { ...s, ...updates } : s));
    addActivity('System', `updated student record ${matricule}`);
  };

  const addLecturer = (lecturerData) => {
    const newLecturer = {
      ...lecturerData,
      staffNumber: lecturerData.staffNumber || `LEC-${Math.floor(1000 + Math.random() * 9000)}`,
      courses: lecturerData.courses || [],
    };
    setLecturers(prev => [...prev, newLecturer]);
    addActivity('System', `added lecturer ${newLecturer.fullName}`);
    return newLecturer;
  };

  const updateLecturer = (staffNumber, updates) => {
    setLecturers(prev => prev.map(l => l.staffNumber === staffNumber ? { ...l, ...updates } : l));
    addActivity('System', `updated lecturer record ${staffNumber}`);
  };

  // ===== COURSES =====
  const [courses, setCourses] = useState(() => 
    loadFromStorage('fet_courses', mockCourses)
  );

  // ===== ATTENDANCE =====
  const [attendance, setAttendance] = useState(() => 
    loadFromStorage('fet_attendance', mockAttendance)
  );

  // ===== ANNOUNCEMENTS =====
  const [announcements, setAnnouncements] = useState(() => 
    loadFromStorage('fet_announcements', mockAnnouncements)
  );

  // ===== PROJECTS =====
  const [projects, setProjects] = useState(() => 
    loadFromStorage('fet_projects', mockProjects)
  );

  // ===== GROUPS =====
  const [groups, setGroups] = useState(() => 
    loadFromStorage('fet_groups', mockGroups)
  );

  // ===== TASKS =====
  const [tasks, setTasks] = useState(() => 
    loadFromStorage('fet_tasks', mockTasks)
  );

  // ===== MILESTONES =====
  const [milestones, setMilestones] = useState(() => 
    loadFromStorage('fet_milestones', mockMilestones)
  );

  // ===== ATTENDANCE SESSIONS =====
  const [attendanceSessions, setAttendanceSessions] = useState(() => 
    loadFromStorage('fet_attendance_sessions', mockAttendanceSessions)
  );

  // ===== ATTENDANCE RECORDS =====
  const [attendanceRecords, setAttendanceRecords] = useState(() => 
    loadFromStorage('fet_attendance_records', mockAttendanceRecords)
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
  useEffect(() => { saveToStorage('fet_lecturers', lecturers); }, [lecturers]);
  useEffect(() => { saveToStorage('fet_courses', courses); }, [courses]);
  useEffect(() => { saveToStorage('fet_attendance', attendance); }, [attendance]);
  useEffect(() => { saveToStorage('fet_announcements', announcements); }, [announcements]);
  useEffect(() => { saveToStorage('fet_projects', projects); }, [projects]);
  useEffect(() => { saveToStorage('fet_groups', groups); }, [groups]);
  useEffect(() => { saveToStorage('fet_tasks', tasks); }, [tasks]);
  useEffect(() => { saveToStorage('fet_milestones', milestones); }, [milestones]);
  useEffect(() => { saveToStorage('fet_attendance_sessions', attendanceSessions); }, [attendanceSessions]);
  useEffect(() => { saveToStorage('fet_attendance_records', attendanceRecords); }, [attendanceRecords]);
  useEffect(() => { saveToStorage('fet_activities', activities); }, [activities]);

  // ===== ACTIVITY =====
  const addActivity = (user, action) => {
    setActivities(prev => [{ id: Date.now(), user, action, time: new Date().toISOString() }, ...prev].slice(0, 50));
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
    addActivity('System', 'updated school year');
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
    addActivity('System', 'updated semester');
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

  // ===== PROJECT CRUD =====
  const addProject = (projectData) => {
    const newProject = { ...projectData, id: Date.now(), progress: projectData.progress || 0 };
    setProjects(prev => [...prev, newProject]);
    addActivity('System', `created project "${newProject.title}"`);
    return newProject;
  };

  const updateProject = (id, updates) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    addActivity('System', `updated project "${updates.title || ''}"`);
  };

  const deleteProject = (id) => {
    const project = projects.find(p => p.id === id);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (project) addActivity('System', `deleted project "${project.title}"`);
  };

  // ===== TASK CRUD =====
  const addTask = (taskData) => {
    const newTask = { ...taskData, id: Date.now(), assignedTo: taskData.assignedTo || '' };
    setTasks(prev => [...prev, newTask]);
    addActivity('System', `created task "${newTask.title}"`);
    return newTask;
  };

  const updateTask = (id, updates) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    addActivity('System', `updated task "${updates.title || ''}"`);
  };

  const deleteTask = (id) => {
    const task = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    if (task) addActivity('System', `deleted task "${task.title}"`);
  };

  // ===== GROUP CRUD =====
  const addGroup = (groupData) => {
    const newGroup = { ...groupData, id: Date.now() };
    setGroups(prev => [...prev, newGroup]);
    addActivity('System', `created group "${newGroup.name}"`);
    return newGroup;
  };

  const updateGroup = (id, updates) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    addActivity('System', `updated group "${updates.name || ''}"`);
  };

  const deleteGroup = (id) => {
    const group = groups.find(g => g.id === id);
    setGroups(prev => prev.filter(g => g.id !== id));
    if (group) addActivity('System', `deleted group "${group.name}"`);
  };

  // ===== MILESTONE CRUD =====
  const addMilestone = (milestoneData) => {
    const newMilestone = { ...milestoneData, id: Date.now() };
    setMilestones(prev => [...prev, newMilestone]);
    addActivity('System', `created milestone "${newMilestone.title}"`);
    return newMilestone;
  };

  const updateMilestone = (id, updates) => {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    addActivity('System', `updated milestone "${updates.title || ''}"`);
  };

  const deleteMilestone = (id) => {
    const milestone = milestones.find(m => m.id === id);
    setMilestones(prev => prev.filter(m => m.id !== id));
    if (milestone) addActivity('System', `deleted milestone "${milestone.title}"`);
  };

  // ===== ANNOUNCEMENT CRUD =====
  const addAnnouncement = (announcementData) => {
    const newAnnouncement = {
      ...announcementData,
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
    };
    setAnnouncements(prev => [newAnnouncement, ...prev]);
    addActivity('System', `posted announcement "${newAnnouncement.title}"`);
    return newAnnouncement;
  };

  const updateAnnouncement = (id, updates) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    addActivity('System', `updated announcement "${updates.title || ''}"`);
  };

  const deleteAnnouncement = (id) => {
    const announcement = announcements.find(a => a.id === id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    if (announcement) addActivity('System', `deleted announcement "${announcement.title}"`);
  };

  // ===== ATTENDANCE SESSION =====
  const addAttendanceSession = (sessionData) => {
    const newSession = {
      ...sessionData,
      id: `session-${Date.now()}`,
      token: `TOKEN-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      tokenExpiresAt: Date.now() + (sessionData.tokenDuration || 10) * 1000,
      sessionExpiresAt: Date.now() + (sessionData.sessionDuration || 60) * 1000,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    setAttendanceSessions(prev => [...prev, newSession]);
    addActivity('System', `launched attendance session for ${newSession.courseCode}`);
    return newSession;
  };

  const updateSessionToken = (sessionId) => {
    setAttendanceSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        token: `TOKEN-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        tokenExpiresAt: Date.now() + 10000,
      };
    }));
  };

  const closeAttendanceSession = (sessionId) => {
    setAttendanceSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      return s.status === 'CLOSED' ? s : { ...s, status: 'CLOSED' };
    }));
    addActivity('System', 'closed attendance session');
  };

  const expireAttendanceSession = (sessionId) => {
    setAttendanceSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      if (s.status === 'ACTIVE' && Date.now() > s.sessionExpiresAt) {
        return { ...s, status: 'EXPIRED' };
      }
      return s;
    }));
  };

  const getActiveSession = () => {
    const active = attendanceSessions.find(s => s.status === 'ACTIVE');
    if (!active) return null;
    if (Date.now() > active.sessionExpiresAt) {
      return null;
    }
    return active;
  };

  const getAttendanceForSession = (sessionId) => {
    return attendanceRecords.filter(r => r.sessionId === sessionId);
  };

  const updateAttendanceRecord = (recordId, updates) => {
    setAttendanceRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...updates } : r));
    addActivity('System', 'corrected an attendance record');
  };

  const recordAttendance = (sessionId, studentMatricule, method = 'QR Scan') => {
    const session = attendanceSessions.find(s => s.id === sessionId);
    if (!session) {
      return { success: false, error: 'No active attendance session.' };
    }
    if (session.status !== 'ACTIVE') {
      return { success: false, error: 'Attendance session is not active.' };
    }
    if (Date.now() > session.tokenExpiresAt) {
      return { success: false, error: '⚠️ QR code expired. Please scan the current QR code.' };
    }
    if (Date.now() > session.sessionExpiresAt) {
      setAttendanceSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'EXPIRED' } : s));
      return { success: false, error: '⚠️ Session has expired. Attendance submission rejected.' };
    }

    const alreadyRecorded = attendanceRecords.find(r => r.sessionId === sessionId && r.studentId === studentMatricule);
    if (alreadyRecorded) {
      return { success: false, error: 'Attendance already recorded for this session.' };
    }

    const eligible = !session.eligibleStudentIds || session.eligibleStudentIds.length === 0 || session.eligibleStudentIds.includes(studentMatricule);
    if (!eligible) {
      return { success: false, error: 'Student is not eligible for this class.' };
    }

    const newRecord = {
      id: `record-${Date.now()}-${studentMatricule}`,
      sessionId: session.id,
      studentId: studentMatricule,
      studentName: session.stationStudentNames?.[studentMatricule] || studentMatricule,
      courseCode: session.courseCode,
      courseName: session.courseName,
      className: session.className,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      status: 'PRESENT',
      method: method,
    };
    setAttendanceRecords(prev => [...prev, newRecord]);
    setAttendance(prev => [...prev, {
      id: Date.now(),
      studentMatricule,
      courseId: session.courseCode,
      date: newRecord.date,
      status: 'Present',
      semester: currentSemester?.name,
      schoolYear: currentSchoolYear?.name,
    }]);
    addActivity('System', `attendance recorded for ${studentMatricule} in ${session.courseCode}`);
    return { success: true, record: newRecord };
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
    const absent = studentAttendance.filter(a => a.status === 'Absent').length;
    
    return {
      semester: currentSemester,
      schoolYear: currentSchoolYear,
      attendance: Math.round((present / total) * 100),
      totalClasses: total,
      present: present,
      absent: absent,
    };
  };

  const value = {
    schoolYears,
    semesters,
    students,
    lecturers,
    courses,
    attendance,
    announcements,
    projects,
    groups,
    tasks,
    milestones,
    attendanceSessions,
    attendanceRecords,
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
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    addGroup,
    updateGroup,
    deleteGroup,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    addAttendanceSession,
    updateSessionToken,
    closeAttendanceSession,
    getActiveSession,
    getAttendanceForSession,
    updateAttendanceRecord,
    recordAttendance,
    addStudent,
    updateStudent,
    addLecturer,
    updateLecturer,
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