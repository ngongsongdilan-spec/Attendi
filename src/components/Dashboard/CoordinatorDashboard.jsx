import React, { useState, useEffect } from 'react';
import { Users, FolderKanban, Building, Briefcase } from 'lucide-react';
import StatsCard from './StatsCard';
import ActivityFeed from './ActivityFeed';
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
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-[#1E1B4B] to-[#8B5CF6] rounded-xl md:rounded-2xl p-4 md:p-6 text-white">
        <h2 className="text-xl md:text-2xl font-bold">Welcome, {user?.fullName || 'Coordinator'} 🏛️</h2>
        <p className="text-[#C4C1FB] text-sm">{departmentName} Department</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat, i) => (
          <StatsCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-[#191C1D] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center gap-2 p-3 bg-[#EDEEEF] rounded-xl hover:bg-[#E7E8E9] text-sm">
              <Users size={18} className="text-[#3B82F6]" /> Add Student
            </button>
            <button className="flex items-center gap-2 p-3 bg-[#EDEEEF] rounded-xl hover:bg-[#E7E8E9] text-sm">
              <Briefcase size={18} className="text-[#8B5CF6]" /> Add Lecturer
            </button>
            <button className="flex items-center gap-2 p-3 bg-[#EDEEEF] rounded-xl hover:bg-[#E7E8E9] text-sm">
              <FolderKanban size={18} className="text-[#F59E0B]" /> New Project
            </button>
          </div>
        </div>

        <ActivityFeed />
      </div>
    </div>
  );
};

export default CoordinatorDashboard;