import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { 
  BookOpen, Clock, CheckCircle, Award, Calendar, 
  Users, TrendingUp, FileText, Bell, ChevronRight,
  GraduationCap, BarChart3, Activity, AlertCircle,
  BookMarked, Target, FolderKanban
} from 'lucide-react';
import StatsCard from './StatsCard';
import ActivityFeed from './ActivityFeed';
import { 
  mockTasks, mockAnnouncements, mockProjects, mockGroups,
  getStudentAttendancePercentage, getStudentCourses, getStudentAttendance
} from '../../data/mockData';

const StudentDashboard = ({ user }) => {
  const { 
    activities, 
    currentSemester, 
    currentSchoolYear,
    getCurrentSemesterStats,
    getSemesterCourses,
    getStudentSemesterAttendance
  } = useAppContext();
  
  const [stats, setStats] = useState({
    totalCourses: 0,
    attendance: 0,
    pendingTasks: 0,
    completedTasks: 0,
    activeProjects: 0,
    totalCredits: 0,
  });
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [studentCourses, setStudentCourses] = useState([]);

  const studentName = user?.fullName || 'Alex Scholar';
  const studentMatricule = user?.matricule || 'FE24A389';
  const studentLevel = user?.level || '400';
  const studentDepartment = user?.department || 'Computer Engineering';
  const studentAdmissionYear = user?.admissionYear || '2024/2025';

  useEffect(() => {
    // Get student courses for current semester
    const courses = getSemesterCourses(currentSemester?.name, currentSchoolYear?.name);
    const studentEnrolledCourses = courses.filter(c => 
      user?.courses?.includes(c.id) || Math.random() > 0.3
    );
    setStudentCourses(studentEnrolledCourses);
    
    // Calculate stats
    const totalCourses = studentEnrolledCourses.length;
    const totalCredits = studentEnrolledCourses.reduce((acc, c) => acc + (c.credits || 3), 0);
    
    // Get semester attendance
    const semStats = getCurrentSemesterStats(studentMatricule);
    
    // Get tasks for student
    const studentTasks = mockTasks.filter(t => t.assignedTo === studentMatricule);
    const pendingTasks = studentTasks.filter(t => t.status !== 'Completed').length;
    const completedTasks = studentTasks.filter(t => t.status === 'Completed').length;
    
    // Get projects
    const studentProjects = mockProjects.filter(p => {
      const group = mockGroups.find(g => g.projectId === p.id);
      return group?.members.includes(studentMatricule);
    });
    
    setStats({
      totalCourses,
      attendance: semStats?.attendance || 0,
      pendingTasks,
      completedTasks,
      activeProjects: studentProjects.length,
      totalCredits,
    });

    // Get recent announcements
    setRecentAnnouncements(mockAnnouncements.slice(0, 3));

    // Get deadlines
    const deadlines = mockTasks
      .filter(t => t.assignedTo === studentMatricule && t.status !== 'Completed')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
    setUpcomingDeadlines(deadlines);

  }, [studentMatricule, currentSemester, currentSchoolYear, user]);

  const statCards = [
    { icon: BookOpen, label: 'Courses', value: stats.totalCourses, color: 'secondary' },
    { icon: Award, label: 'Attendance', value: `${stats.attendance}%`, color: 'success' },
    { icon: Clock, label: 'Pending Tasks', value: stats.pendingTasks, color: 'warning' },
    { icon: CheckCircle, label: 'Completed', value: stats.completedTasks, color: 'primary' },
  ];

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const recentActivities = activities?.slice(0, 5).map(a => ({
    user: a.user,
    action: a.action,
    time: new Date(a.time).toLocaleDateString() + ' ' + 
          new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })) || [];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#1E1B4B] to-[#2A1F6E] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">Welcome back, {studentName} 😊</h2>
              <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">
                {currentSemester?.name || 'First Semester'}
              </span>
            </div>
            <p className="text-[#8683BA] mt-1">
              <span className="font-mono">{studentMatricule}</span>
            </p>
            <p className="text-[#8683BA] text-sm">
              Level {studentLevel} • {studentDepartment}
            </p>
            <p className="text-[#8683BA] text-xs mt-1 flex items-center gap-2">
              <span className="bg-white/20 px-2 py-0.5 rounded-full">
                {currentSemester?.name || 'First Semester'}
              </span>
              <span>{currentSchoolYear?.name || '2024/2025'}</span>
            </p>
            <p className="text-[#8683BA] text-xs">🎓 Admitted: {studentAdmissionYear}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 rounded-xl p-3 text-center min-w-[100px]">
              <p className="text-xs text-[#8683BA]">Attendance</p>
              <p className="text-2xl font-bold">{stats.attendance}%</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center min-w-[100px]">
              <p className="text-xs text-[#8683BA]">Credits</p>
              <p className="text-2xl font-bold">{stats.totalCredits}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Current Courses */}
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2">
                <BookMarked size={20} className="text-[#3B82F6]" />
                Current Courses
              </h3>
              <button className="text-[#3B82F6] text-sm font-medium hover:underline">View All</button>
            </div>
            <div className="space-y-3">
              {studentCourses.length > 0 ? (
                studentCourses.map((course, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#EDEEEF] rounded-xl hover:bg-[#E7E8E9] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
                        <BookOpen size={18} className="text-[#3B82F6]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#191C1D]">{course.id}</p>
                        <p className="text-sm text-[#47464F]">{course.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#47464F]">{course.credits || 3} Credits</p>
                      <p className="text-xs text-[#47464F]">{course.lecturer}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#47464F] py-4">No courses enrolled for this semester</p>
              )}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2">
                <Clock size={20} className="text-[#F59E0B]" />
                Upcoming Deadlines
              </h3>
              <button className="text-[#3B82F6] text-sm font-medium hover:underline">View All</button>
            </div>
            <div className="space-y-3">
              {upcomingDeadlines.length > 0 ? (
                upcomingDeadlines.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-[#EDEEEF] rounded-xl hover:bg-[#E7E8E9] transition-colors">
                    <div>
                      <p className="font-medium text-[#191C1D]">{task.title}</p>
                      <p className="text-xs text-[#47464F]">Due: {formatDate(task.dueDate)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      task.priority === 'High' ? 'bg-red-100 text-red-800' :
                      task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#47464F] py-4">🎉 No upcoming deadlines!</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Quick Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2 mb-4">
              <BarChart3 size={20} className="text-[#3B82F6]" />
              Quick Stats
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-[#EDEEEF] rounded-lg">
                <span className="text-sm text-[#47464F]">📚 Total Courses</span>
                <span className="font-bold text-[#191C1D]">{stats.totalCourses}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#EDEEEF] rounded-lg">
                <span className="text-sm text-[#47464F]">📁 Projects</span>
                <span className="font-bold text-[#191C1D]">{stats.activeProjects}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#EDEEEF] rounded-lg">
                <span className="text-sm text-[#47464F]">✅ Completed Tasks</span>
                <span className="font-bold text-[#191C1D]">{stats.completedTasks}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#EDEEEF] rounded-lg">
                <span className="text-sm text-[#47464F]">📅 Current Semester</span>
                <span className="font-bold text-[#191C1D] text-xs">{currentSemester?.shortName || 'Sem 1'}</span>
              </div>
            </div>
          </div>

          {/* Recent Announcements */}
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2 mb-4">
              <Bell size={20} className="text-[#3B82F6]" />
              Announcements
            </h3>
            <div className="space-y-3">
              {recentAnnouncements.map((a) => (
                <div key={a.id} className="p-3 bg-[#EDEEEF] rounded-xl">
                  <p className="font-medium text-[#191C1D] text-sm">{a.title}</p>
                  <p className="text-xs text-[#47464F] mt-1">{a.content.substring(0, 60)}...</p>
                  <p className="text-xs text-[#47464F] mt-1">{formatDate(a.date)} • {a.author}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <ActivityFeed activities={recentActivities} />
        </div>
      </div>
    </div>
  );
};

// ✅ THIS IS THE CRITICAL LINE - MUST BE HERE!
export default StudentDashboard;