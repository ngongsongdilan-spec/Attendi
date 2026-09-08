import React, { useState, useEffect } from 'react';
import { Users, BookOpen, FolderKanban, Building, UserPlus, AlertCircle } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalLecturers: 0,
    totalAdmins: 0,
    totalCourses: 0,
    totalDepartments: 0,
    activeProjects: 0,
    pendingIssues: 0,
  });

  useEffect(() => {
    const users = JSON.parse(localStorage.getItem('fet_users') || '[]');
    const departments = JSON.parse(localStorage.getItem('fet_departments') || '[]');
    const projects = JSON.parse(localStorage.getItem('fet_projects') || '[]');
    
    setStats({
      totalStudents: users.filter(u => u.role === 'student').length,
      totalLecturers: users.filter(u => u.role === 'lecturer').length,
      totalAdmins: users.filter(u => u.role === 'admin').length,
      totalCourses: 30,
      totalDepartments: departments.length || 5,
      activeProjects: projects.filter(p => p.status === 'Active').length || 3,
      pendingIssues: 2,
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#1E1B4B] to-[#2A1F6E] rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">Admin Dashboard 👑</h2>
        <p className="text-[#8683BA] mt-1">Faculty of Engineering and Technology</p>
        <p className="text-[#8683BA] text-sm">Manage users, courses, and system settings</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#3B82F6]/10 rounded-xl text-[#3B82F6]">
              <Users size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#191C1D]">{stats.totalStudents}</p>
              <p className="text-sm text-[#47464F]">Students</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#8B5CF6]/10 rounded-xl text-[#8B5CF6]">
              <UserPlus size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#191C1D]">{stats.totalLecturers}</p>
              <p className="text-sm text-[#47464F]">Lecturers</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1E1B4B]/10 rounded-xl text-[#1E1B4B]">
              <Building size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#191C1D]">{stats.totalDepartments}</p>
              <p className="text-sm text-[#47464F]">Departments</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl text-green-700">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#191C1D]">{stats.totalCourses}</p>
              <p className="text-sm text-[#47464F]">Courses</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-xl text-yellow-700">
              <FolderKanban size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#191C1D]">{stats.activeProjects}</p>
              <p className="text-sm text-[#47464F]">Active Projects</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl text-red-700">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#191C1D]">{stats.pendingIssues}</p>
              <p className="text-sm text-[#47464F]">Pending Issues</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
          <h3 className="text-lg font-semibold text-[#191C1D] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-3 bg-[#EDEEEF] rounded-xl hover:bg-[#E7E8E9] text-left">
              <Users size={18} className="text-[#3B82F6]" />
              <p className="text-sm font-medium mt-1">Manage Users</p>
            </button>
            <button className="p-3 bg-[#EDEEEF] rounded-xl hover:bg-[#E7E8E9] text-left">
              <BookOpen size={18} className="text-[#8B5CF6]" />
              <p className="text-sm font-medium mt-1">Course Catalogue</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
          <h3 className="text-lg font-semibold text-[#191C1D] mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 bg-[#EDEEEF] rounded-lg">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm">✓</div>
              <div><p className="text-sm font-medium">New student enrolled</p><p className="text-xs text-[#47464F]">2 mins ago</p></div>
            </div>
            <div className="flex items-center gap-3 p-2 bg-[#EDEEEF] rounded-lg">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">📋</div>
              <div><p className="text-sm font-medium">Course added: CEF444</p><p className="text-xs text-[#47464F]">1 hour ago</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;