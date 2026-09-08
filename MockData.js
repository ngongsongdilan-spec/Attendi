// ============================================================
// MOCK DATA WITH SEMESTERS & SCHOOL YEAR
// ============================================================

export const mockSchoolYears = [
  { id: 1, name: '2023/2024', startDate: '2023-09-01', endDate: '2024-06-30', isActive: false },
  { id: 2, name: '2024/2025', startDate: '2024-09-01', endDate: '2025-06-30', isActive: true },
  { id: 3, name: '2025/2026', startDate: '2025-09-01', endDate: '2026-06-30', isActive: false },
];

export const mockSemesters = [
  { 
    id: 1, 
    name: 'First Semester', 
    shortName: 'Sem 1',
    schoolYear: '2024/2025',
    startDate: '2024-09-01', 
    endDate: '2024-12-20',
    isActive: true,
    isCurrent: true,
  },
  { 
    id: 2, 
    name: 'Second Semester', 
    shortName: 'Sem 2',
    schoolYear: '2024/2025',
    startDate: '2025-01-10', 
    endDate: '2025-06-30',
    isActive: false,
    isCurrent: false,
  },
  { 
    id: 3, 
    name: 'First Semester', 
    shortName: 'Sem 1',
    schoolYear: '2023/2024',
    startDate: '2023-09-01', 
    endDate: '2023-12-20',
    isActive: false,
    isCurrent: false,
  },
  { 
    id: 4, 
    name: 'Second Semester', 
    shortName: 'Sem 2',
    schoolYear: '2023/2024',
    startDate: '2024-01-10', 
    endDate: '2024-06-30',
    isActive: false,
    isCurrent: false,
  },
];

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
    courses: ['CS301', 'CS302', 'CS303'],
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
    courses: ['SE401', 'SE402', 'SE403'],
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
    courses: ['ME301', 'ME302'],
    phone: '+237 6XX XXX XXX',
    address: 'Yaoundé, Cameroon',
  },
];

export const mockCourses = [
  // First Semester Courses
  { id: 'CS301', name: 'Data Structures', lecturer: 'Dr. Alida Vance', credits: 3, semester: 'First Semester', schoolYear: '2024/2025', level: 400 },
  { id: 'CS303', name: 'Database Systems', lecturer: 'Dr. Alida Vance', credits: 3, semester: 'First Semester', schoolYear: '2024/2025', level: 400 },
  { id: 'SE401', name: 'Software Engineering', lecturer: 'Dr. Sarah Chen', credits: 4, semester: 'First Semester', schoolYear: '2024/2025', level: 400 },
  { id: 'ME301', name: 'Thermodynamics', lecturer: 'Dr. Robert Johnson', credits: 3, semester: 'First Semester', schoolYear: '2024/2025', level: 300 },
  
  // Second Semester Courses
  { id: 'CS302', name: 'Algorithms', lecturer: 'Dr. Alida Vance', credits: 3, semester: 'Second Semester', schoolYear: '2024/2025', level: 400 },
  { id: 'SE402', name: 'Agile Development', lecturer: 'Dr. Sarah Chen', credits: 3, semester: 'Second Semester', schoolYear: '2024/2025', level: 400 },
  { id: 'SE403', name: 'Project Management', lecturer: 'Dr. Sarah Chen', credits: 3, semester: 'Second Semester', schoolYear: '2024/2025', level: 400 },
  { id: 'ME302', name: 'Fluid Mechanics', lecturer: 'Dr. Robert Johnson', credits: 3, semester: 'Second Semester', schoolYear: '2024/2025', level: 300 },
];

export const mockAttendance = [
  { id: 1, studentMatricule: 'FE24A389', courseId: 'CS301', date: '2024-09-10', status: 'Present', semester: 'First Semester', schoolYear: '2024/2025' },
  { id: 2, studentMatricule: 'FE24A389', courseId: 'CS301', date: '2024-09-12', status: 'Present', semester: 'First Semester', schoolYear: '2024/2025' },
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

export const getSemesterCourses = (semester, schoolYear) => {
  return mockCourses.filter(c => 
    c.semester === semester && c.schoolYear === schoolYear
  );
};

export const getStudentSemesterAttendance = (matricule, semester, schoolYear) => {
  return mockAttendance.filter(a => 
    a.studentMatricule === matricule &&
    a.semester === semester &&
    a.schoolYear === schoolYear
  );
};