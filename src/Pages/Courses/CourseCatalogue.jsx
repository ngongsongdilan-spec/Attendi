import React, { useState } from 'react';
import { Search } from 'lucide-react';

const CourseCatalogue = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');

  const fullCourseList = [
    // Computer Engineering
    { code: 'CEF238', title: 'C/C++ Programming', department: 'Computer Engineering', level: 200 },
    { code: 'CEF250', title: 'Computer Architecture', department: 'Computer Engineering', level: 200 },
    { code: 'CEF342', title: 'Database and Design', department: 'Computer Engineering', level: 300 },
    { code: 'CEF444', title: 'Artificial Intelligence and Machine Learning', department: 'Computer Engineering', level: 400 },
    // Civil Engineering
    { code: 'CIV202', title: 'Materials Science & Technology', department: 'Civil Engineering', level: 200 },
    { code: 'CIV210', title: 'Fluid Mechanics', department: 'Civil Engineering', level: 200 },
    { code: 'CIV334', title: 'Strength of Materials', department: 'Civil Engineering', level: 300 },
    { code: 'CIV402', title: 'Reinforced Concrete I', department: 'Civil Engineering', level: 400 },
    // Electrical Engineering
    { code: 'EEF260', title: 'Analog Electronics I', department: 'Electrical Engineering', level: 200 },
    { code: 'EEF360', title: 'Systems Simulation and PCB Design', department: 'Electrical Engineering', level: 300 },
    { code: 'EEF462', title: 'Digital Signal Processing', department: 'Electrical Engineering', level: 400 },
    // Mechanical Engineering
    { code: 'MEF202', title: 'Materials Science and Technology', department: 'Mechanical Engineering', level: 200 },
    { code: 'MEF302', title: 'Machine Element Design', department: 'Mechanical Engineering', level: 300 },
    { code: 'MEF410', title: 'Metrology and Quality Control', department: 'Mechanical Engineering', level: 400 },
  ];

  const departments = ['All Departments', ...new Set(fullCourseList.map(c => c.department))];

  const filteredCourses = fullCourseList.filter(c => {
    const matchSearch = c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = filterDepartment === 'all' || c.department === filterDepartment;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#191C1D]">Course Catalogue</h2>
        <p className="text-[#47464F]">Browse all FET courses</p>
      </div>

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
        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-[#191C1D]"
        >
          <option value="all">All Departments</option>
          {departments.slice(1).map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
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
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((course, index) => (
                <tr key={index} className="border-b border-[#C8C5D0] hover:bg-[#EDEEEF] transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-[#3B82F6] text-sm">{course.code}</td>
                  <td className="py-3 px-4 text-[#191C1D]">{course.title}</td>
                  <td className="py-3 px-4 text-[#47464F] text-sm">{course.department}</td>
                  <td className="py-3 px-4 text-[#47464F] text-sm">Level {course.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredCourses.length === 0 && (
          <div className="text-center py-8 text-[#47464F]">No courses found</div>
        )}
      </div>
    </div>
  );
};

export default CourseCatalogue;