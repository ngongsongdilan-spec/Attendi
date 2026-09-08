// ============================================================
// COMPLETE MOCK DATA FOR FET PLATFORM
// ============================================================

// ===== SCHOOL YEARS =====
export const mockSchoolYears = [
  { id: 1, name: '2023/2024', startDate: '2023-09-01', endDate: '2024-06-30', isActive: false },
  { id: 2, name: '2024/2025', startDate: '2024-09-01', endDate: '2025-06-30', isActive: true },
  { id: 3, name: '2025/2026', startDate: '2025-09-01', endDate: '2026-06-30', isActive: false },
];
// ===== ✅ LECTURERS (Add this) =====
export const mockLecturers = [
  {
    id: 1,
    fullName: 'Dr. Alida Vance',
    email: 'alida.vance@fet.edu',
    faculty: 'Engineering',
    department: 'Computer Engineering',
    password: 'lecturer123',
    courses: ['CEF444', 'CEF450', 'CEF462', 'CEF476'],
    phone: '+237 6XX XXX XXX',
    title: 'Senior Lecturer',
  },
  {
    id: 2,
    fullName: 'Dr. Sarah Chen',
    email: 'sarah.chen@fet.edu',
    faculty: 'Engineering',
    department: 'Software Engineering',
    password: 'lecturer123',
    courses: ['SE401', 'SE402', 'SE403', 'SE404'],
    phone: '+237 6XX XXX XXX',
    title: 'Associate Professor',
  },
  {
    id: 3,
    fullName: 'Dr. Robert Johnson',
    email: 'robert.johnson@fet.edu',
    faculty: 'Engineering',
    department: 'Mechanical Engineering',
    password: 'lecturer123',
    courses: ['ME301', 'ME302'],
    phone: '+237 6XX XXX XXX',
    title: 'Senior Lecturer',
  },
];

// ===== SEMESTERS =====
export const mockSemesters = [
  { id: 1, name: 'First Semester', shortName: 'Sem 1', schoolYear: '2024/2025', startDate: '2024-09-01', endDate: '2024-12-20', isActive: true, isCurrent: true },
  { id: 2, name: 'Second Semester', shortName: 'Sem 2', schoolYear: '2024/2025', startDate: '2025-01-10', endDate: '2025-06-30', isActive: false, isCurrent: false },
  { id: 3, name: 'First Semester', shortName: 'Sem 1', schoolYear: '2023/2024', startDate: '2023-09-01', endDate: '2023-12-20', isActive: false, isCurrent: false },
  { id: 4, name: 'Second Semester', shortName: 'Sem 2', schoolYear: '2023/2024', startDate: '2024-01-10', endDate: '2024-06-30', isActive: false, isCurrent: false },
];

// ===== STUDENTS =====
export const mockStudents = [
  {
    id: 1,
    matricule: 'FE24A389',
    fullName: 'Alex Scholar',
    email: 'alex.scholar@fet.edu',
    faculty: 'Engineering',
    department: 'Computer Engineering',
    level: '400',
    admissionYear: '2024/2025',
    currentSemester: 'First Semester',
    password: 'student123',
    enrolledCourses: ['CEF444', 'CEF450', 'CEF462', 'CEF476'],
    phone: '+237 6XX XXX XXX',
    address: 'Buea, Cameroon',
  },
  {
    id: 2,
    matricule: 'FE24B456',
    fullName: 'Emma Watson',
    email: 'emma.watson@fet.edu',
    faculty: 'Engineering',
    department: 'Software Engineering',
    level: '400',
    admissionYear: '2024/2025',
    currentSemester: 'First Semester',
    password: 'student123',
    enrolledCourses: ['SE401', 'SE402', 'SE403', 'SE404'],
    phone: '+237 6XX XXX XXX',
    address: 'Douala, Cameroon',
  },
  {
    id: 3,
    matricule: 'FE23C789',
    fullName: 'James Miller',
    email: 'james.miller@fet.edu',
    faculty: 'Engineering',
    department: 'Mechanical Engineering',
    level: '300',
    admissionYear: '2023/2024',
    currentSemester: 'First Semester',
    password: 'student123',
    enrolledCourses: ['ME301', 'ME302', 'ME303'],
    phone: '+237 6XX XXX XXX',
    address: 'Yaoundé, Cameroon',
  },
];

// ===== COURSES =====
export const mockCourses = [
  // Level 100
  { id: 'CEF101', name: 'Introduction to Engineering', lecturer: 'Dr. Alida Vance', credits: 3, level: 100, semester: 'First Semester', schoolYear: '2024/2025' },
  { id: 'CEF102', name: 'Mathematics I', lecturer: 'Dr. John Doe', credits: 4, level: 100, semester: 'First Semester', schoolYear: '2024/2025' },
  // Level 200
  { id: 'CIV201', name: 'Materials Science & Technology', lecturer: 'Dr. Michael Brown', credits: 3, level: 200, semester: 'First Semester', schoolYear: '2024/2025' },
  { id: 'CIV202', name: 'Fluid Mechanics I', lecturer: 'Dr. Michael Brown', credits: 3, level: 200, semester: 'First Semester', schoolYear: '2024/2025' },
  // Level 300
  { id: 'ME301', name: 'Thermodynamics II', lecturer: 'Dr. Robert Johnson', credits: 3, level: 300, semester: 'First Semester', schoolYear: '2024/2025' },
  { id: 'ME302', name: 'Fluid Mechanics II', lecturer: 'Dr. Robert Johnson', credits: 3, level: 300, semester: 'First Semester', schoolYear: '2024/2025' },
  { id: 'ME303', name: 'Machine Design', lecturer: 'Dr. Robert Johnson', credits: 3, level: 300, semester: 'First Semester', schoolYear: '2024/2025' },
  { id: 'CS301', name: 'Data Structures', lecturer: 'Dr. Alida Vance', credits: 3, level: 300, semester: 'First Semester', schoolYear: '2024/2025' },
  // Level 400
  { id: 'CEF444', name: 'Artificial Intelligence and Machine Learning', lecturer: 'Dr. Alida Vance', credits: 3, level: 400, semester: 'First Semester', schoolYear: '2024/2025' },
  { id: 'CEF450', name: 'Cloud Computing', lecturer: 'Dr. Alida Vance', credits: 3, level: 400, semester: 'First Semester', schoolYear: '2024/2025' },
  { id: 'CEF462', name: 'Digital Image Processing', lecturer: 'Dr. Alida Vance', credits: 3, level: 400, semester: 'First Semester', schoolYear: '2024/2025' },
  { id: 'CEF476', name: 'Software Engineering and Design', lecturer: 'Dr. Alida Vance', credits: 3, level: 400, semester: 'First Semester', schoolYear: '2024/2025' },
  { id: 'SE401', name: 'Advanced Software Engineering', lecturer: 'Dr. Sarah Chen', credits: 3, level: 400, semester: 'First Semester', schoolYear: '2024/2025' },
  { id: 'SE402', name: 'Agile Development', lecturer: 'Dr. Sarah Chen', credits: 3, level: 400, semester: 'First Semester', schoolYear: '2024/2025' },
  { id: 'SE403', name: 'Project Management', lecturer: 'Dr. Sarah Chen', credits: 3, level: 400, semester: 'First Semester', schoolYear: '2024/2025' },
  { id: 'SE404', name: 'Software Testing', lecturer: 'Dr. Sarah Chen', credits: 3, level: 400, semester: 'First Semester', schoolYear: '2024/2025' },
];

// ===== ✅ ANNOUNCEMENTS =====
export const mockAnnouncements = [
  {
    id: 1,
    title: '📢 Project Submission Deadline Extended',
    content: 'The deadline for the Smart Irrigation System project has been extended to December 15th, 2024.',
    date: '2024-10-20',
    author: 'Dr. Sarah Chen',
    type: 'Important',
    target: 'All Students',
  },
  {
    id: 2,
    title: '🎓 Guest Lecture Tomorrow',
    content: 'Prof. Alan Turing will be giving a guest lecture on "AI Ethics" at 10:00 AM in Hall A.',
    date: '2024-10-22',
    author: 'Faculty Office',
    type: 'Event',
    target: 'Computer Engineering',
  },
  {
    id: 3,
    title: '📚 New Course Materials Available',
    content: 'Updated slides for Data Structures (CS301) are now available.',
    date: '2024-10-18',
    author: 'Dr. Alida Vance',
    type: 'Update',
    target: 'CS301',
  },
];

// ===== ✅ PROJECTS =====
export const mockProjects = [
  {
    id: 1,
    title: 'Smart Irrigation System',
    department: 'Software Engineering',
    supervisor: 'Dr. Sarah Chen',
    description: 'IoT-based automated irrigation system',
    status: 'Active',
    progress: 65,
    deadline: '2024-12-15',
    groupId: 1,
  },
  {
    id: 2,
    title: 'AI-Powered Analytics Platform',
    department: 'Computer Engineering',
    supervisor: 'Dr. Alida Vance',
    description: 'Machine learning platform for student analytics',
    status: 'Active',
    progress: 42,
    deadline: '2025-01-30',
    groupId: 2,
  },
];

// ===== ✅ GROUPS =====
export const mockGroups = [
  { id: 1, name: 'Group Alpha', projectId: 1, members: ['FE24A389', 'FE24B456'] },
  { id: 2, name: 'Group Beta', projectId: 2, members: ['FE24A389'] },
];

// ===== ✅ TASKS =====
export const mockTasks = [
  { id: 1, title: 'API Documentation', projectId: 1, assignedTo: 'FE24A389', status: 'In Progress', priority: 'High', dueDate: '2024-10-25' },
  { id: 2, title: 'Frontend Development', projectId: 1, assignedTo: 'FE24B456', status: 'TODO', priority: 'Medium', dueDate: '2024-10-30' },
  { id: 3, title: 'UI Design', projectId: 2, assignedTo: 'FE24A389', status: 'Completed', priority: 'Low', dueDate: '2024-10-18' },
];

// ===== ATTENDANCE =====
export const mockAttendance = [
  { id: 1, studentMatricule: 'FE24A389', courseId: 'CEF444', date: '2024-09-10', status: 'Present', semester: 'First Semester', schoolYear: '2024/2025' },
  { id: 2, studentMatricule: 'FE24A389', courseId: 'CEF444', date: '2024-09-12', status: 'Present', semester: 'First Semester', schoolYear: '2024/2025' },
  { id: 3, studentMatricule: 'FE24B456', courseId: 'SE401', date: '2024-09-10', status: 'Present', semester: 'First Semester', schoolYear: '2024/2025' },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export const getCurrentSchoolYear = () => {
  return mockSchoolYears.find(y => y.isActive === true) || mockSchoolYears[0];
};

export const getCurrentSemester = () => {
  return mockSemesters.find(s => s.isCurrent === true) || mockSemesters[0];
};

export const getCoursesByLevelAndSemester = (level, semester, schoolYear) => {
  return mockCourses.filter(c => 
    c.level === parseInt(level) && 
    c.semester === semester && 
    c.schoolYear === schoolYear
  );
};

export const getEnrolledCourses = (matricule) => {
  const student = mockStudents.find(s => s.matricule === matricule);
  if (!student) return [];
  return mockCourses.filter(c => student.enrolledCourses.includes(c.id));
};

export const getEnrolledCoursesForSemester = (matricule, semester, schoolYear) => {
  const student = mockStudents.find(s => s.matricule === matricule);
  if (!student) return [];
  return mockCourses.filter(c => 
    student.enrolledCourses.includes(c.id) &&
    c.semester === semester &&
    c.schoolYear === schoolYear
  );
};

export const getStudentAttendance = (matricule) => {
  return mockAttendance.filter(a => a.studentMatricule === matricule);
};

export const getStudentAttendancePercentage = (matricule) => {
  const attendance = getStudentAttendance(matricule);
  if (attendance.length === 0) return 0;
  const present = attendance.filter(a => a.status === 'Present').length;
  return Math.round((present / attendance.length) * 100);
};