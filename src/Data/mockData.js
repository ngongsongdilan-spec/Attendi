// ============================================================
// COMPLETE MOCK DATA FOR FET PLATFORM
// ============================================================

export const mockStudents = [
  {
    id: 1,
    matricule: 'FE24A389',
    fullName: 'Alex Scholar',
    email: 'alex.scholar@fet.edu',
    faculty: 'Engineering',
    department: 'Computer Engineering',
    level: '300',
    admissionYear: '2024',
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
    admissionYear: '2024',
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
    admissionYear: '2023',
    password: 'student123',
    courses: ['ME301', 'ME302'],
    phone: '+237 6XX XXX XXX',
    address: 'Yaoundé, Cameroon',
  },
  {
    id: 4,
    matricule: 'FE25D012',
    fullName: 'Sarah Connor',
    email: 'sarah.connor@fet.edu',
    faculty: 'Engineering',
    department: 'Civil Engineering',
    level: '200',
    admissionYear: '2025',
    password: 'student123',
    courses: ['CVE201', 'CVE202'],
    phone: '+237 6XX XXX XXX',
    address: 'Bamenda, Cameroon',
  },
  {
    id: 5,
    matricule: 'FE24E345',
    fullName: 'Michael Chang',
    email: 'michael.chang@fet.edu',
    faculty: 'Engineering',
    department: 'Electrical Engineering',
    level: '400',
    admissionYear: '2024',
    password: 'student123',
    courses: ['EE401', 'EE402'],
    phone: '+237 6XX XXX XXX',
    address: 'Kumba, Cameroon',
  },
  {
    id: 6,
    matricule: 'FE23F678',
    fullName: 'Olivia Davis',
    email: 'olivia.davis@fet.edu',
    faculty: 'Engineering',
    department: 'Chemical Engineering',
    level: '300',
    admissionYear: '2023',
    password: 'student123',
    courses: ['CHE301', 'CHE302'],
    phone: '+237 6XX XXX XXX',
    address: 'Limbe, Cameroon',
  },
];

export const mockLecturers = [
  {
    id: 1,
    staffNumber: 'LEC1001',
    fullName: 'Dr. Alida Vance',
    email: 'alida.vance@fet.edu',
    faculty: 'Engineering',
    department: 'Computer Engineering',
    password: 'lecturer123',
    courses: ['CS301', 'CS302'],
    phone: '+237 6XX XXX XXX',
  },
  {
    id: 2,
    staffNumber: 'LEC1002',
    fullName: 'Dr. Sarah Chen',
    email: 'sarah.chen@fet.edu',
    faculty: 'Engineering',
    department: 'Software Engineering',
    password: 'lecturer123',
    courses: ['SE401', 'SE402'],
    phone: '+237 6XX XXX XXX',
  },
  {
    id: 3,
    staffNumber: 'LEC1003',
    fullName: 'Dr. Robert Johnson',
    email: 'robert.johnson@fet.edu',
    faculty: 'Engineering',
    department: 'Mechanical Engineering',
    password: 'lecturer123',
    courses: ['ME301', 'ME302'],
    phone: '+237 6XX XXX XXX',
  },
  {
    id: 4,
    staffNumber: 'LEC1004',
    fullName: 'Dr. David Wilson',
    email: 'david.wilson@fet.edu',
    faculty: 'Engineering',
    department: 'Electrical Engineering',
    password: 'lecturer123',
    courses: ['EE401', 'EE402'],
    phone: '+237 6XX XXX XXX',
  },
  {
    id: 5,
    staffNumber: 'LEC1005',
    fullName: 'Dr. Michael Brown',
    email: 'michael.brown@fet.edu',
    faculty: 'Engineering',
    department: 'Civil Engineering',
    password: 'lecturer123',
    courses: ['CVE201', 'CVE202'],
    phone: '+237 6XX XXX XXX',
  },
];

export const mockCourses = [
  { id: 'CS301', name: 'Data Structures', lecturer: 'Dr. Alida Vance', credits: 3, semester: 'Fall 2024' },
  { id: 'CS302', name: 'Algorithms', lecturer: 'Dr. Alida Vance', credits: 3, semester: 'Fall 2024' },
  { id: 'CS303', name: 'Database Systems', lecturer: 'Dr. Alida Vance', credits: 3, semester: 'Fall 2024' },
  { id: 'SE401', name: 'Software Engineering', lecturer: 'Dr. Sarah Chen', credits: 4, semester: 'Fall 2024' },
  { id: 'SE402', name: 'Agile Development', lecturer: 'Dr. Sarah Chen', credits: 3, semester: 'Fall 2024' },
  { id: 'SE403', name: 'Project Management', lecturer: 'Dr. Sarah Chen', credits: 3, semester: 'Fall 2024' },
  { id: 'ME301', name: 'Thermodynamics', lecturer: 'Dr. Robert Johnson', credits: 3, semester: 'Fall 2024' },
  { id: 'ME302', name: 'Fluid Mechanics', lecturer: 'Dr. Robert Johnson', credits: 3, semester: 'Fall 2024' },
  { id: 'CVE201', name: 'Structural Analysis', lecturer: 'Dr. Michael Brown', credits: 3, semester: 'Fall 2024' },
  { id: 'CVE202', name: 'Construction Materials', lecturer: 'Dr. Michael Brown', credits: 3, semester: 'Fall 2024' },
  { id: 'EE401', name: 'Power Systems', lecturer: 'Dr. David Wilson', credits: 3, semester: 'Fall 2024' },
  { id: 'EE402', name: 'Control Systems', lecturer: 'Dr. David Wilson', credits: 3, semester: 'Fall 2024' },
  { id: 'CHE301', name: 'Process Engineering', lecturer: 'Dr. Emily Davis', credits: 3, semester: 'Fall 2024' },
  { id: 'CHE302', name: 'Reaction Engineering', lecturer: 'Dr. Emily Davis', credits: 3, semester: 'Fall 2024' },
];

export const mockAttendance = [
  { id: 1, studentMatricule: 'FE24A389', courseId: 'CS301', date: '2024-09-10', status: 'Present' },
  { id: 2, studentMatricule: 'FE24A389', courseId: 'CS301', date: '2024-09-12', status: 'Present' },
  { id: 3, studentMatricule: 'FE24A389', courseId: 'CS301', date: '2024-09-15', status: 'Late' },
  { id: 4, studentMatricule: 'FE24A389', courseId: 'CS302', date: '2024-09-11', status: 'Present' },
  { id: 5, studentMatricule: 'FE24A389', courseId: 'CS302', date: '2024-09-13', status: 'Absent' },
  { id: 6, studentMatricule: 'FE24A389', courseId: 'CS303', date: '2024-09-14', status: 'Present' },
  { id: 7, studentMatricule: 'FE24B456', courseId: 'SE401', date: '2024-09-10', status: 'Present' },
  { id: 8, studentMatricule: 'FE24B456', courseId: 'SE401', date: '2024-09-12', status: 'Present' },
  { id: 9, studentMatricule: 'FE24B456', courseId: 'SE401', date: '2024-09-15', status: 'Present' },
  { id: 10, studentMatricule: 'FE24B456', courseId: 'SE402', date: '2024-09-11', status: 'Absent' },
  { id: 11, studentMatricule: 'FE23C789', courseId: 'ME301', date: '2024-09-10', status: 'Absent' },
  { id: 12, studentMatricule: 'FE23C789', courseId: 'ME301', date: '2024-09-12', status: 'Present' },
  { id: 13, studentMatricule: 'FE25D012', courseId: 'CVE201', date: '2024-09-10', status: 'Present' },
  { id: 14, studentMatricule: 'FE25D012', courseId: 'CVE201', date: '2024-09-12', status: 'Present' },
  { id: 15, studentMatricule: 'FE24E345', courseId: 'EE401', date: '2024-09-10', status: 'Late' },
  { id: 16, studentMatricule: 'FE24E345', courseId: 'EE401', date: '2024-09-12', status: 'Present' },
  { id: 17, studentMatricule: 'FE23F678', courseId: 'CHE301', date: '2024-09-10', status: 'Present' },
  { id: 18, studentMatricule: 'FE23F678', courseId: 'CHE301', date: '2024-09-12', status: 'Absent' },
];

export const mockProjects = [
  {
    id: 1,
    title: 'Smart Irrigation System',
    department: 'Software Engineering',
    supervisor: 'Dr. Sarah Chen',
    description: 'IoT-based automated irrigation system using soil moisture sensors',
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
    description: 'Machine learning platform for student performance analytics',
    status: 'Active',
    progress: 42,
    deadline: '2025-01-30',
    groupId: 2,
  },
  {
    id: 3,
    title: 'Renewable Energy System',
    department: 'Electrical Engineering',
    supervisor: 'Dr. David Wilson',
    description: 'Solar panel optimization with battery storage system',
    status: 'Active',
    progress: 78,
    deadline: '2024-11-20',
    groupId: 3,
  },
  {
    id: 4,
    title: 'Sustainable Water Management',
    department: 'Civil Engineering',
    supervisor: 'Dr. Michael Brown',
    description: 'Water conservation and management system for urban areas',
    status: 'Active',
    progress: 55,
    deadline: '2025-02-15',
    groupId: 4,
  },
];

export const mockGroups = [
  { id: 1, name: 'Group Alpha', projectId: 1, members: ['FE24A389', 'FE24B456', 'FE23C789'] },
  { id: 2, name: 'Group Beta', projectId: 2, members: ['FE25D012', 'FE24E345'] },
  { id: 3, name: 'Group Gamma', projectId: 3, members: ['FE23F678', 'FE24A389'] },
  { id: 4, name: 'Group Delta', projectId: 4, members: ['FE24B456', 'FE25D012'] },
];

export const mockTasks = [
  { id: 1, title: 'API Documentation', projectId: 1, assignedTo: 'FE24A389', status: 'In Progress', priority: 'High', dueDate: '2024-10-25' },
  { id: 2, title: 'Frontend Development', projectId: 1, assignedTo: 'FE24B456', status: 'TODO', priority: 'Medium', dueDate: '2024-10-30' },
  { id: 3, title: 'UI Design', projectId: 2, assignedTo: 'FE25D012', status: 'Completed', priority: 'Low', dueDate: '2024-10-18' },
  { id: 4, title: 'Testing', projectId: 2, assignedTo: 'FE24E345', status: 'In Progress', priority: 'High', dueDate: '2024-11-05' },
  { id: 5, title: 'Documentation', projectId: 3, assignedTo: 'FE23F678', status: 'TODO', priority: 'Medium', dueDate: '2024-11-10' },
  { id: 6, title: 'Deployment', projectId: 3, assignedTo: 'FE24A389', status: 'TODO', priority: 'High', dueDate: '2024-11-15' },
  { id: 7, title: 'Research Paper', projectId: 4, assignedTo: 'FE24B456', status: 'In Progress', priority: 'High', dueDate: '2024-12-01' },
  { id: 8, title: 'Data Collection', projectId: 4, assignedTo: 'FE25D012', status: 'TODO', priority: 'Medium', dueDate: '2024-11-20' },
];

export const mockMilestones = [
  { id: 1, title: 'Research Complete', projectId: 1, progress: 100, dueDate: '2024-10-01' },
  { id: 2, title: 'Prototype Development', projectId: 1, progress: 60, dueDate: '2024-10-20' },
  { id: 3, title: 'Testing Phase', projectId: 2, progress: 30, dueDate: '2024-11-01' },
  { id: 4, title: 'Design Complete', projectId: 3, progress: 80, dueDate: '2024-10-15' },
  { id: 5, title: 'Implementation Phase', projectId: 4, progress: 50, dueDate: '2024-12-01' },
];

export const mockAnnouncements = [
  {
    id: 1,
    title: '📢 Project Submission Deadline Extended',
    content: 'The deadline for the Smart Irrigation System project has been extended to December 15th, 2024. All groups must submit their final reports by this date.',
    date: '2024-10-20',
    author: 'Dr. Sarah Chen',
    type: 'Important',
    target: 'All Students',
  },
  {
    id: 2,
    title: '🎓 Guest Lecture Tomorrow',
    content: 'Prof. Alan Turing will be giving a guest lecture on "AI Ethics and Future Technologies" at 10:00 AM in Hall A. All students are encouraged to attend.',
    date: '2024-10-22',
    author: 'Faculty Office',
    type: 'Event',
    target: 'Computer Engineering',
  },
  {
    id: 3,
    title: '📚 New Course Materials Available',
    content: 'Updated lecture slides and practice problems for Data Structures (CS301) are now available on the portal. Please download them before the next class.',
    date: '2024-10-18',
    author: 'Dr. Alida Vance',
    type: 'Update',
    target: 'CS301',
  },
  {
    id: 4,
    title: '⚠️ Mid-Semester Exams Schedule',
    content: 'Mid-semester exams will run from November 1st to November 10th. Please check the exam schedule on the portal and prepare accordingly.',
    date: '2024-10-15',
    author: 'Academic Office',
    type: 'Important',
    target: 'All Students',
  },
  {
    id: 5,
    title: '🏆 Hackathon Registration Open',
    content: 'The annual FET Hackathon is now open for registration. Teams of 3-5 students can register before October 30th.',
    date: '2024-10-12',
    author: 'Student Affairs',
    type: 'Event',
    target: 'All Students',
  },
];

export const mockNotifications = [
  { id: 1, userId: 'FE24A389', title: 'Task Assigned', message: 'You have been assigned "API Documentation" task for Smart Irrigation System', read: false, date: '2024-10-24T10:00:00' },
  { id: 2, userId: 'FE24A389', title: 'Attendance Session', message: 'Attendance session starting for Data Structures (CS301) at 10:00 AM', read: false, date: '2024-10-24T09:00:00' },
  { id: 3, userId: 'FE24A389', title: 'Assessment Published', message: 'Your assessment results for Algorithms (CS302) are now available', read: true, date: '2024-10-23T14:00:00' },
  { id: 4, userId: 'FE24A389', title: 'New Material Uploaded', message: 'Dr. Alida Vance uploaded new lecture notes for Data Structures', read: false, date: '2024-10-22T16:30:00' },
  { id: 5, userId: 'FE24B456', title: 'Project Update', message: 'Your project "Smart Irrigation System" has been updated', read: false, date: '2024-10-21T11:00:00' },
];

export const mockMaterials = [
  { id: 1, title: 'Data Structures - Lecture 1', courseId: 'CS301', fileType: 'PDF', uploadedBy: 'Dr. Alida Vance', date: '2024-09-01' },
  { id: 2, title: 'Data Structures - Lecture 2', courseId: 'CS301', fileType: 'PDF', uploadedBy: 'Dr. Alida Vance', date: '2024-09-05' },
  { id: 3, title: 'Algorithms - Lecture 1', courseId: 'CS302', fileType: 'PPT', uploadedBy: 'Dr. Alida Vance', date: '2024-09-05' },
  { id: 4, title: 'Software Engineering Notes', courseId: 'SE401', fileType: 'DOCX', uploadedBy: 'Dr. Sarah Chen', date: '2024-09-10' },
  { id: 5, title: 'Agile Development - Guide', courseId: 'SE402', fileType: 'PDF', uploadedBy: 'Dr. Sarah Chen', date: '2024-09-12' },
  { id: 6, title: 'Thermodynamics - Chapter 1', courseId: 'ME301', fileType: 'PDF', uploadedBy: 'Dr. Robert Johnson', date: '2024-09-08' },
  { id: 7, title: 'Power Systems - Introduction', courseId: 'EE401', fileType: 'PDF', uploadedBy: 'Dr. David Wilson', date: '2024-09-10' },
];

export const mockAssessments = [
  {
    id: 1,
    studentMatricule: 'FE24A389',
    courseId: 'CS301',
    scores: { proposal: 15, research: 18, implementation: 25, contribution: 14, presentation: 18 },
    feedback: 'Excellent work on the implementation phase. Your code quality is outstanding.',
    total: 90,
    status: 'Published',
  },
  {
    id: 2,
    studentMatricule: 'FE24B456',
    courseId: 'SE401',
    scores: { proposal: 12, research: 16, implementation: 20, contribution: 12, presentation: 15 },
    feedback: 'Good work, but needs improvement in research methodology.',
    total: 75,
    status: 'Published',
  },
  {
    id: 3,
    studentMatricule: 'FE24A389',
    courseId: 'CS302',
    scores: { proposal: 14, research: 20, implementation: 28, contribution: 16, presentation: 19 },
    feedback: 'Excellent overall performance. Great research and implementation.',
    total: 97,
    status: 'Published',
  },
  {
    id: 4,
    studentMatricule: 'FE23C789',
    courseId: 'ME301',
    scores: { proposal: 10, research: 14, implementation: 18, contribution: 10, presentation: 12 },
    feedback: 'Needs improvement in all areas. Please review the course materials.',
    total: 64,
    status: 'Published',
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export const findStudent = (matricule) => {
  return mockStudents.find(s => s.matricule.toUpperCase() === matricule.toUpperCase());
};

export const findLecturer = (staffNumber) => {
  return mockLecturers.find(l => l.staffNumber.toUpperCase() === staffNumber.toUpperCase());
};

export const getStudentCourses = (matricule) => {
  const student = findStudent(matricule);
  if (!student) return [];
  return mockCourses.filter(c => student.courses.includes(c.id));
};

export const getStudentAttendance = (matricule) => {
  return mockAttendance.filter(a => a.studentMatricule === matricule);
};

export const getStudentAttendancePercentage = (matricule) => {
  const attendance = getStudentAttendance(matricule);
  if (attendance.length === 0) return 0;
  const present = attendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  return Math.round((present / attendance.length) * 100);
};

export const getStudentProjects = (matricule) => {
  return mockProjects.filter(p => {
    const group = mockGroups.find(g => g.projectId === p.id);
    return group?.members.includes(matricule);
  });
};

export const getStudentTasks = (matricule) => {
  return mockTasks.filter(t => t.assignedTo === matricule);
};

export const getStudentMilestones = (matricule) => {
  const studentProjects = getStudentProjects(matricule);
  const projectIds = studentProjects.map(p => p.id);
  return mockMilestones.filter(m => projectIds.includes(m.projectId));
};

export const getStudentAssessments = (matricule) => {
  return mockAssessments.filter(a => a.studentMatricule === matricule);
};

export const getProjectTasks = (projectId) => {
  return mockTasks.filter(t => t.projectId === projectId);
};

export const getProjectMilestones = (projectId) => {
  return mockMilestones.filter(m => m.projectId === projectId);
};

export const getGroupMembers = (groupId) => {
  const group = mockGroups.find(g => g.id === groupId);
  if (!group) return [];
  return group.members.map(m => findStudent(m)).filter(Boolean);
};

export const getLecturerCourses = (staffNumber) => {
  const lecturer = findLecturer(staffNumber);
  if (!lecturer) return [];
  return mockCourses.filter(c => lecturer.courses.includes(c.id));
};