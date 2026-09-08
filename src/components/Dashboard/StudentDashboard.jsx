import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { 
  BookOpen, Clock, CheckCircle, Award, Calendar, 
  Users, TrendingUp, FileText, Bell, ChevronRight,
  GraduationCap, BarChart3, BookMarked
} from 'lucide-react';
import StatsCard from './StatsCard';
import ActivityFeed from './ActivityFeed';

// ✅ These imports now work because they're exported from mockData.js
import { mockTasks, mockAnnouncements, mockProjects, mockGroups } from '../../data/mockData';

const StudentDashboard = ({ user }) => {
  const { 
    activities, 
    currentSemester, 
    currentSchoolYear,
    getCoursesForStudent,
    getCurrentSemesterStats
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
    const courses = getCoursesForStudent(studentMatricule);
    setStudentCourses(courses);
    
    const totalCourses = courses.length;
    const totalCredits = courses.reduce((acc, c) => acc + (c.credits || 3), 0);
    const semStats = getCurrentSemesterStats(studentMatricule);
    
    const studentTasks = mockTasks.filter(t => t.assignedTo === studentMatricule);
    const pendingTasks = studentTasks.filter(t => t.status !== 'Completed').length;
    const completedTasks = studentTasks.filter(t => t.status === 'Completed').length;
    
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

    setRecentAnnouncements(mockAnnouncements.slice(0, 3));

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
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
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
      <div className="bg-gradient-to-r from-[#1E1B4B] to-[#2A1F6E] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Welcome back, {studentName} 😊</h2>
            <p className="text-[#8683BA] mt-1 font-mono">{studentMatricule}</p>
            <p className="text-[#8683BA] text-sm">Level {studentLevel} • {studentDepartment}</p>
            <p className="text-[#8683BA] text-xs mt-1">
              {currentSemester?.name} {currentSchoolYear?.name}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 rounded-xl p-3 text-center min-w-[80px]">
              <p className="text-xs text-[#8683BA]">Attendance</p>
              <p className="text-xl font-bold">{stats.attendance}%</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center min-w-[80px]">
              <p className="text-xs text-[#8683BA]">Credits</p>
              <p className="text-xl font-bold">{stats.totalCredits}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2">
                <BookMarked size={20} className="text-[#3B82F6]" />
                Enrolled Courses ({currentSemester?.name})
              </h3>
              <span className="text-xs text-[#47464F]">Level {studentLevel}</span>
            </div>
            <div className="space-y-3">
              {studentCourses.length > 0 ? (
                studentCourses.map((course, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#EDEEEF] rounded-xl hover:bg-[#E7E8E9]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
                        <BookOpen size={18} className="text-[#3B82F6]" />
                      </div>
                      <div>
                        <p className="font-medium">{course.id}</p>
                        <p className="text-sm text-[#47464F]">{course.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#47464F]">{course.credits} Credits</p>
                      <p className="text-xs text-[#47464F]">{course.lecturer}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <BookOpen size={32} className="mx-auto text-[#47464F] opacity-50" />
                  <p className="text-[#47464F]">No courses enrolled</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2">
              <Clock size={20} className="text-[#F59E0B]" />
              Upcoming Deadlines
            </h3>
            <div className="space-y-3 mt-4">
              {upcomingDeadlines.length > 0 ? (
                upcomingDeadlines.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-[#EDEEEF] rounded-xl">
                    <div>
                      <p className="font-medium">{task.title}</p>
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
                <p className="text-center py-4 text-[#47464F]">🎉 No upcoming deadlines!</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2 mb-4">
              <BarChart3 size={20} className="text-[#3B82F6]" />
              Quick Stats
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between p-2 bg-[#EDEEEF] rounded-lg">
                <span className="text-sm">📚 Courses</span>
                <span className="font-bold">{stats.totalCourses}</span>
              </div>
              <div className="flex justify-between p-2 bg-[#EDEEEF] rounded-lg">
                <span className="text-sm">📁 Projects</span>
                <span className="font-bold">{stats.activeProjects}</span>
              </div>
              <div className="flex justify-between p-2 bg-[#EDEEEF] rounded-lg">
                <span className="text-sm">✅ Completed</span>
                <span className="font-bold">{stats.completedTasks}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Bell size={20} className="text-[#3B82F6]" />
              Announcements
            </h3>
            {recentAnnouncements.map((a) => (
              <div key={a.id} className="p-3 bg-[#EDEEEF] rounded-xl mb-2">
                <p className="font-medium text-sm">{a.title}</p>
                <p className="text-xs text-[#47464F] mt-1">{a.content.substring(0, 50)}...</p>
              </div>
            ))}
          </div>

          <ActivityFeed activities={recentActivities} />
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;