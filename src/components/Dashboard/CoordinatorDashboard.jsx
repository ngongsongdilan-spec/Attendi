import React, { useState, useEffect } from 'react';
import { Users, FolderKanban, Building, Briefcase, UserPlus, PlusCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatsCard from './StatsCard';
import ActivityFeed from './ActivityFeed';
import { useAppContext } from '../../context/AppContext';

const CoordinatorDashboard = ({ user }) => {
  const navigate = useNavigate();
  const { students, lecturers, projects, tasks } = useAppContext();
  const [stats, setStats] = useState({ students: 0, lecturers: 0, projects: 0, tasks: 0 });
  const [departmentName, setDepartmentName] = useState(user?.department || 'Computer Engineering');

  useEffect(() => {
    const dept = user?.department || 'Computer Engineering';
    setStats({
      students: students.filter(s => s.department === dept).length,
      lecturers: lecturers.filter(l => l.department === dept).length,
      projects: projects.filter(p => p.department === dept).length,
      tasks: tasks.length,
    });
  }, [students, lecturers, projects, tasks, user]);

  const statCards = [
    { icon: Users, label: 'Students', value: stats.students, color: 'secondary' },
    { icon: Briefcase, label: 'Lecturers', value: stats.lecturers, color: 'tertiary' },
    { icon: FolderKanban, label: 'Projects', value: stats.projects, color: 'success' },
    { icon: Building, label: 'Department', value: user?.department || 'CS', color: 'primary' },
  ];

  const quickActions = [
    { label: 'Add Student', icon: UserPlus, color: '#3B82F6', action: () => navigate('/admin/users') },
    { label: 'Add Lecturer', icon: UserPlus, color: '#8B5CF6', action: () => navigate('/admin/users') },
    { label: 'New Project', icon: FolderKanban, color: '#F59E0B', action: () => navigate('/projects') },
    { label: 'Assessment', icon: PlusCircle, color: '#10B981', action: () => navigate('/assessment') },
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
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="flex items-center gap-2 p-3 bg-[#EDEEEF] rounded-xl hover:bg-[#E7E8E9] text-sm transition-colors"
                >
                  <Icon size={18} style={{ color: action.color }} /> {action.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="mt-4 w-full flex items-center justify-center gap-2 p-3 bg-[#1E1B4B] text-white rounded-xl text-sm font-medium hover:bg-[#2A1F6E] transition-colors"
          >
            View All Projects <ArrowRight size={16} />
          </button>
        </div>

        <ActivityFeed />
      </div>
    </div>
  );
};

export default CoordinatorDashboard;