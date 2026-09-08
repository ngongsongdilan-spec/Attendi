import React, { useState, useEffect } from 'react';
import { Users, FolderKanban, Building, Briefcase, UserPlus, FileText } from 'lucide-react';
import StatsCard from './StatsCard';
import ActivityFeed from './ActivityFeed';

// ✅ CORRECT IMPORTS
import { mockStudents, mockLecturers, mockProjects, mockTasks } from '../../data/mockData';

const CoordinatorDashboard = ({ user }) => {
  const [stats, setStats] = useState({ students: 0, lecturers: 0, projects: 0, tasks: 0 });
  const [departmentName, setDepartmentName] = useState(user?.department || 'Computer Engineering');

  useEffect(() => {
    const dept = user?.department || 'Computer Engineering';
    setStats({
      students: mockStudents.filter(s => s.department === dept).length,
      lecturers: mockLecturers.filter(l => l.department === dept).length,
      projects: mockProjects.filter(p => p.department === dept).length,
      tasks: mockTasks.length,
    });
  }, [user]);

  const statCards = [
    { icon: Users, label: 'Students', value: stats.students, color: 'secondary' },
    { icon: Briefcase, label: 'Lecturers', value: stats.lecturers, color: 'tertiary' },
    { icon: FolderKanban, label: 'Projects', value: stats.projects, color: 'success' },
    { icon: Building, label: 'Department', value: user?.department || 'CS', color: 'primary' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#1E1B4B] to-[#8B5CF6] rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">Welcome, {user?.fullName || 'Coordinator'} 🏛️</h2>
        <p className="text-[#C4C1FB]">{departmentName} Department</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            <h3 className="text-lg font-semibold text-[#191C1D] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center gap-2 p-3 bg-[#EDEEEF] rounded-xl hover:bg-[#E7E8E9]">
                <UserPlus size={18} className="text-[#3B82F6]" /> Add Student
              </button>
              <button className="flex items-center gap-2 p-3 bg-[#EDEEEF] rounded-xl hover:bg-[#E7E8E9]">
                <Briefcase size={18} className="text-[#8B5CF6]" /> Add Lecturer
              </button>
              <button className="flex items-center gap-2 p-3 bg-[#EDEEEF] rounded-xl hover:bg-[#E7E8E9]">
                <FolderKanban size={18} className="text-[#F59E0B]" /> New Project
              </button>
              <button className="flex items-center gap-2 p-3 bg-[#EDEEEF] rounded-xl hover:bg-[#E7E8E9]">
                <FileText size={18} className="text-[#10B981]" /> Report
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6 mt-6">
            <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2 mb-4">
              <FolderKanban size={20} className="text-[#3B82F6]" />
              Department Projects
            </h3>
            {mockProjects.filter(p => p.department === departmentName).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-[#EDEEEF] rounded-xl mb-2">
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-[#47464F]">Progress: {p.progress}%</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  {p.status}
                </span>
              </div>
            ))}
            {mockProjects.filter(p => p.department === departmentName).length === 0 && (
              <p className="text-center text-[#47464F] py-4">No projects in this department</p>
            )}
          </div>
        </div>

        <div>
          <ActivityFeed activities={[]} />
        </div>
      </div>
    </div>
  );
};

export default CoordinatorDashboard;