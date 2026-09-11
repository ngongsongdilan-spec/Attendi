import React, { useState } from 'react';
import { Search, CheckCircle, Plus } from 'lucide-react';
import { mockCourses } from '../../data/MockData';

const departmentByPrefix = {
  CEF: 'Computer Engineering',
  CS: 'Computer Engineering',
  SE: 'Software Engineering',
  EEF: 'Electrical & Electronic Engineering',
  MEF: 'Mechanical & Industrial Engineering',
  ME: 'Mechanical & Industrial Engineering',
  CIV: 'Civil Engineering',
  CPE: 'Chemical & Petroleum Engineering',
};

const baseCourseList = [
  // Computer Engineering
  { code: 'CEF238', title: 'C/C++ Programming', department: 'Computer Engineering', level: 200 },
  { code: 'CEF250', title: 'Computer Architecture', department: 'Computer Engineering', level: 200 },
  { code: 'CEF342', title: 'Database and Design', department: 'Computer Engineering', level: 300 },
  { code: 'CEF350', title: 'Operating Systems', department: 'Computer Engineering', level: 300 },
  { code: 'CEF364', title: 'Data Structures and Algorithms', department: 'Computer Engineering', level: 300 },
  { code: 'CEF444', title: 'Artificial Intelligence and Machine Learning', department: 'Computer Engineering', level: 400 },
  { code: 'CEF476', title: 'Computer Networks', department: 'Computer Engineering', level: 400 },
  // Civil Engineering
  { code: 'CIV202', title: 'Materials Science & Technology', department: 'Civil Engineering', level: 200 },
  { code: 'CIV210', title: 'Fluid Mechanics', department: 'Civil Engineering', level: 200 },
  { code: 'CIV334', title: 'Strength of Materials', department: 'Civil Engineering', level: 300 },
  { code: 'CIV402', title: 'Reinforced Concrete I', department: 'Civil Engineering', level: 400 },
  // Electrical & Electronic Engineering
  { code: 'EEF260', title: 'Analog Electronics I', department: 'Electrical & Electronic Engineering', level: 200 },
  { code: 'EEF360', title: 'Systems Simulation and PCB Design', department: 'Electrical & Electronic Engineering', level: 300 },
  { code: 'EEF368', title: 'Microprocessors and Microcontrollers', department: 'Electrical & Electronic Engineering', level: 300 },
  { code: 'EEF462', title: 'Digital Signal Processing', department: 'Electrical & Electronic Engineering', level: 400 },
  // Mechanical & Industrial Engineering
  { code: 'MEF202', title: 'Materials Science and Technology', department: 'Mechanical & Industrial Engineering', level: 200 },
  { code: 'MEF302', title: 'Machine Element Design', department: 'Mechanical & Industrial Engineering', level: 300 },
  { code: 'MEF410', title: 'Metrology and Quality Control', department: 'Mechanical & Industrial Engineering', level: 400 },
  { code: 'MEF420', title: 'Production Planning and Control', department: 'Mechanical & Industrial Engineering', level: 400 },
  // Chemical & Petroleum Engineering
  { code: 'CPE201', title: 'Chemical Process Principles', department: 'Chemical & Petroleum Engineering', level: 200 },
  { code: 'CPE310', title: 'Thermodynamics', department: 'Chemical & Petroleum Engineering', level: 300 },
  { code: 'CPE415', title: 'Petroleum Production Engineering', department: 'Chemical & Petroleum Engineering', level: 400 },
];

// Merge in any course that exists in the system but not in the base catalogue
// (e.g. courses students are already enrolled in) so nothing goes missing.
const fullCourseList = (() => {
  const merged = [...baseCourseList];
  mockCourses.forEach(c => {
    if (merged.some(m => m.code === c.id)) return;
    const prefix = c.id.replace(/[0-9].*$/, '');
    merged.push({
      code: c.id,
      title: c.name,
      department: departmentByPrefix[prefix] || 'Other',
      level: c.level,
    });
  });
  return merged;
})();

const departments = [...new Set(fullCourseList.map(c => c.department))];
const levels = [...new Set(fullCourseList.map(c => c.level))].sort((a, b) => a - b);

const loadEnrollments = () => {
  try {
    return JSON.parse(localStorage.getItem('fet_enrollments') || '{}');
  } catch {
    return {};
  }
};

const CourseCatalogue = ({ user }) => {
  const isStudent = user?.role === 'student' && !!user?.matricule;
  const studentLevel = user?.level != null ? String(user.level) : '';

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState(() => {
    if (!isStudent || !user?.department) return 'all';
    const exact = departments.find(d => d.toLowerCase() === user.department.toLowerCase());
    if (exact) return exact;
    const firstWord = user.department.split(' ')[0].toLowerCase();
    return departments.find(d => d.toLowerCase().startsWith(firstWord)) || 'all';
  });
  const [filterLevel, setFilterLevel] = useState('all');
  const [enrolledCodes, setEnrolledCodes] = useState(() => {
    if (!isStudent) return [];
    const all = loadEnrollments();
    if (Array.isArray(all[user.matricule])) return all[user.matricule];
    const seeded = Array.isArray(user.enrolledCourses) ? user.enrolledCourses : [];
    if (seeded.length > 0) {
      all[user.matricule] = seeded;
      localStorage.setItem('fet_enrollments', JSON.stringify(all));
    }
    return seeded;
  });

  const toggleEnroll = (code) => {
    if (!isStudent) return;
    setEnrolledCodes(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code];
      const all = loadEnrollments();
      all[user.matricule] = next;
      localStorage.setItem('fet_enrollments', JSON.stringify(all));
      return next;
    });
  };

  const studentLevelCourses = fullCourseList.filter(c => String(c.level) === studentLevel);

  const filteredCourses = fullCourseList.filter(c => {
    const matchSearch = c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = filterDepartment === 'all' || c.department === filterDepartment;
    const matchLevel = isStudent
      ? String(c.level) === studentLevel
      : filterLevel === 'all' || String(c.level) === filterLevel;
    return matchSearch && matchDept && matchLevel;
  });

  const myCourses = enrolledCodes
    .map(code => fullCourseList.find(c => c.code === code))
    .filter(Boolean)
    .filter(c => c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 c.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const displayedCourses = isStudent && activeTab === 'mine' ? myCourses : filteredCourses;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#191C1D]">Course Catalogue</h2>
        <p className="text-[#47464F]">
          {isStudent
            ? `Level ${studentLevel || '—'} courses${user.department ? ` • ${user.department}` : ''}`
            : 'Browse all FET courses'}
        </p>
      </div>

      {isStudent && (
        <div className="flex gap-2 border-b border-[#C8C5D0]">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === 'all'
                ? 'border-[#3B82F6] text-[#3B82F6]'
                : 'border-transparent text-[#47464F] hover:text-[#191C1D]'
            }`}
          >
            All Courses ({studentLevelCourses.length})
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === 'mine'
                ? 'border-[#3B82F6] text-[#3B82F6]'
                : 'border-transparent text-[#47464F] hover:text-[#191C1D]'
            }`}
          >
            My Courses ({enrolledCodes.length})
          </button>
        </div>
      )}

      {isStudent && enrolledCodes.length > 0 && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          You are enrolled in {enrolledCodes.length} course{enrolledCodes.length > 1 ? 's' : ''}. Switch to the <b>My Courses</b> tab to see them.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
          />
        </div>

        {!(isStudent && activeTab === 'mine') && (
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-[#191C1D]"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        )}

        {!isStudent && (
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-[#191C1D]"
          >
            <option value="all">All Levels</option>
            {levels.map(level => (
              <option key={level} value={level}>Level {level}</option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#EDEEEF] border-b border-[#C8C5D0]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Code</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Title</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Department</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Level</th>
                {isStudent && (
                  <th className="text-right py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Enrollment</th>
                )}
              </tr>
            </thead>
            <tbody>
              {displayedCourses.map((course) => {
                const isEnrolled = enrolledCodes.includes(course.code);
                return (
                  <tr
                    key={course.code}
                    className={`border-b border-[#C8C5D0] transition-colors ${
                      isEnrolled ? 'bg-green-50/60 hover:bg-green-50' : 'hover:bg-[#EDEEEF]'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-[#3B82F6] text-sm">{course.code}</td>
                    <td className="py-3 px-4 text-[#191C1D]">{course.title}</td>
                    <td className="py-3 px-4 text-[#47464F] text-sm">{course.department}</td>
                    <td className="py-3 px-4 text-[#47464F] text-sm">Level {course.level}</td>
                    {isStudent && (
                      <td className="py-3 px-4 text-right">
                        {isEnrolled ? (
                          <div className="flex items-center justify-end gap-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                              <CheckCircle size={12} /> Enrolled
                            </span>
                            <button
                              onClick={() => toggleEnroll(course.code)}
                              className="text-xs text-red-500 hover:underline font-medium"
                            >
                              Drop
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleEnroll(course.code)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#3B82F6] text-white text-xs font-semibold hover:bg-[#2563EB] transition-colors"
                          >
                            <Plus size={12} /> Enroll
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {displayedCourses.length === 0 && (
          <div className="text-center py-8 text-[#47464F]">
            {isStudent && activeTab === 'mine'
              ? 'You have not enrolled in any course yet. Go to All Courses to enroll.'
              : 'No courses found'}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseCatalogue;
