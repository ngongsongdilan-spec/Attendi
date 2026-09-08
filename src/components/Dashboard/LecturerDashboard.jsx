import React, { useState, useEffect } from 'react';
import { Users, FolderKanban, CheckCircle, Clock, Award, BarChart3, FileText, AlertCircle, UserPlus } from 'lucide-react';
import StatsCard from './StatsCard';
import ActivityFeed from './ActivityFeed';
import { mockStudents, mockProjects, mockTasks, mockAttendance } from '../../Data/mockData';

const LecturerDashboard = ({ user }) => {
  const [stats, setStats] = useState({ students: 0, projects: 0, tasks: 0, assessments: 0, pending: 0 });
  const [atRisk, setAtRisk] = useState([]);

  useEffect(() => {
    const totalStudents = mockStudents.length;
    const totalProjects = mockProjects.length;
    const totalTasks = mockTasks.length;
    const pending = mockTasks.filter(t => t.status !== 'Completed').length;

    setStats({ students: totalStudents, projects: totalProjects, tasks: totalTasks, assessments: 3, pending });

    setAtRisk([
      { name: 'James Miller', course: 'ME301', issue: 'Low Attendance', score: '45%' },
      { name: 'Sarah Connor', course: 'CVE201', issue: 'Missing Tasks', score: '30%' },
    ]);
  }, []);

  const statCards = [
    { icon: Users, label: 'Students', value: stats.students, color: 'secondary' },
    { icon: FolderKanban, label: 'Projects', value: stats.projects, color: 'tertiary' },
    { icon: CheckCircle, label: 'Tasks', value: stats.tasks, color: 'success' },
    { icon: Clock, label: 'Pending Reviews', value: stats.pending, color: 'warning' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#1E1B4B] to-[#2A1F6E] rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">Welcome back, {user?.fullName || 'Lecturer'} 👋</h2>
        <p className="text-[#8683BA]">{user?.department || 'Engineering'} Department</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => <StatsCard key={i} {...stat} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2 mb-4">
              <BarChart3 size={20} className="text-[#3B82F6]" />
              Course Overview
            </h3>
            {[
              { course: 'Data Structures (CS301)', progress: 78, students: 32 },
              { course: 'Algorithms (CS302)', progress: 65, students: 28 },
              { course: 'Software Engineering (SE401)', progress: 82, students: 30 },
            ].map((c, i) => (
              <div key={i} className="p-3 bg-[#EDEEEF] rounded-xl mb-3">
                <div className="flex justify-between"><span className="font-medium">{c.course}</span><span>{c.progress}%</span></div>
                <div className="w-full h-2 bg-[#D9DADB] rounded-full"><div className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded-full" style={{ width: `${c.progress}%` }}></div></div>
                <p className="text-xs text-[#47464F] mt-1">{c.students} students</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6 mt-6">
            <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2 mb-4">
              <Clock size={20} className="text-[#3B82F6]" />
              Pending Reviews
            </h3>
            {[
              { student: 'Emma Watson', assignment: 'Assignment 3', course: 'Data Structures', submitted: '2 hours ago' },
              { student: 'James Miller', assignment: 'Project Proposal', course: 'Software Engineering', submitted: '4 hours ago' },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 border-b border-[#C8C5D0] last:border-0">
                <div><p className="font-medium">{r.student}</p><p className="text-sm text-[#47464F]">{r.assignment} • {r.course}</p></div>
                <div className="flex items-center gap-3"><span className="text-xs text-[#47464F]">{r.submitted}</span><button className="px-3 py-1 bg-[#3B82F6] text-white rounded-lg text-xs font-medium hover:bg-[#3B82F6]/90">Review</button></div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2 mb-4">
              <AlertCircle size={20} className="text-red-500" />
              Students at Risk
            </h3>
            {atRisk.map((s, i) => (
              <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-lg mb-2">
                <p className="font-medium text-[#191C1D]">{s.name}</p>
                <p className="text-xs text-[#47464F]">{s.course} • {s.issue}</p>
                <p className="text-sm font-bold text-red-600">{s.score}</p>
              </div>
            ))}
          </div>

          <ActivityFeed activities={[{ user: 'System', action: 'New student enrolled', time: '1 hour ago' }]} />
        </div>
      </div>
    </div>
  );
};

export default LecturerDashboard;