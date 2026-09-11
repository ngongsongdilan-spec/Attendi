import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { 
  BookOpen, Clock, CheckCircle, Award, Calendar, 
  Users, TrendingUp, FileText, Bell, ChevronRight,
  GraduationCap, BarChart3, BookMarked, FolderKanban,
  ListTodo, AlertCircle
} from 'lucide-react';
import StatsCard from './StatsCard';
import ActivityFeed from './ActivityFeed';

const StudentDashboard = ({ user }) => {
  const { 
    activities, 
    currentSemester, 
    currentSchoolYear,
    tasks: allTasks,
    announcements: allAnnouncements,
    projects: allProjects,
    groups: allGroups,
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
  const [studentTasks, setStudentTasks] = useState([]);
  const [studentProjects, setStudentProjects] = useState([]);

  const studentName = user?.fullName || 'Alex Scholar';
  const studentMatricule = user?.matricule || 'FE24A389';
  const studentLevel = user?.level || '400';
  const studentDepartment = user?.department || 'Computer Engineering';
  const studentEmail = user?.email || 'No Email';
  const studentAdmissionYear = user?.admissionYear || 'Not Set';

  useEffect(() => {
    const courses = getCoursesForStudent(studentMatricule);
    setStudentCourses(courses);
    
    const totalCourses = courses.length;
    const totalCredits = courses.reduce((acc, c) => acc + (c.credits || 3), 0);
    const semStats = getCurrentSemesterStats(studentMatricule);
    
    const tasks = allTasks.filter(t => t.assignedTo === studentMatricule);
    const pendingTasks = tasks.filter(t => t.status !== 'Completed').length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    setStudentTasks(tasks);
    
    const projects = allProjects.filter(p => {
      const group = allGroups.find(g => g.projectId === p.id);
      return group && group.memberMatricules.includes(studentMatricule);
    });
    setStudentProjects(projects);
    
    setStats({
      totalCourses,
      attendance: semStats?.attendance || 0,
      pendingTasks,
      completedTasks,
      activeProjects: projects.length,
      totalCredits,
    });

    setRecentAnnouncements(allAnnouncements.slice(0, 3));

    const deadlines = allTasks
      .filter(t => t.assignedTo === studentMatricule && t.status !== 'Completed')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
    setUpcomingDeadlines(deadlines);

  }, [studentMatricule, currentSemester, currentSchoolYear, user, allTasks, allAnnouncements, allProjects, allGroups]);

  const statCards = [
    { icon: FolderKanban, label: 'Active Projects', value: stats.activeProjects, color: 'secondary' },
    { icon: ListTodo, label: 'Pending Tasks', value: stats.pendingTasks, color: 'warning' },
    { icon: CheckCircle, label: 'Completed Tasks', value: stats.completedTasks, color: 'success' },
    { icon: BookOpen, label: 'Courses', value: stats.totalCourses, color: 'primary' },
  ];

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'TODO': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Completed': return <CheckCircle size={14} className="text-green-600" />;
      case 'In Progress': return <Clock size={14} className="text-yellow-600" />;
      default: return <AlertCircle size={14} className="text-gray-400" />;
    }
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
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#1E1B4B] to-[#2A1F6E] rounded-xl md:rounded-2xl p-4 md:p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Welcome back, {studentName} 🎉</h2>
            <p className="text-[#8683BA] text-sm mt-1">Here is what's happening with your projects today.</p>
            <p className="text-[#8683BA] text-xs mt-1">
              {currentSemester?.name} {currentSchoolYear?.name}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center min-w-[80px]">
            <p className="text-xs text-[#8683BA]">Attendance</p>
            <p className="text-lg font-bold">{stats.attendance}%</p>
          </div>
        </div>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Left Column - My Projects */}
        <div className="space-y-4 md:space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-[#191C1D] flex items-center gap-2">
                <FolderKanban size={18} className="md:size-5 text-[#3B82F6]" />
                My Projects
              </h3>
              <button className="text-[#3B82F6] text-sm font-medium hover:underline">View All</button>
            </div>
            <div className="space-y-3 md:space-y-4">
              {studentProjects.length > 0 ? (
                studentProjects.slice(0, 2).map((project) => {
                  const group = mockGroups.find(g => g.projectId === project.id);
                  return (
                    <div key={project.id} className="border border-[#C8C5D0] rounded-xl p-3 md:p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-[#191C1D] text-sm md:text-base">{project.title}</h4>
                          <p className="text-xs md:text-sm text-[#47464F]">{project.department} · {group?.name || 'No Group'}</p>
                          <p className="text-xs text-[#47464F]">{project.supervisor}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium self-start ${
                          project.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm text-[#47464F] mb-1">
                          <span>Progress</span>
                          <span className="font-semibold text-[#191C1D]">{project.progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#EDEEEF] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded-full"
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-[#47464F] mt-1">Deadline: {project.deadline}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <FolderKanban size={32} className="mx-auto text-[#47464F] opacity-50" />
                  <p className="text-[#47464F] mt-2">No projects assigned</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - My Tasks & Deadlines */}
        <div className="space-y-4 md:space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-[#191C1D] flex items-center gap-2">
                <ListTodo size={18} className="md:size-5 text-[#3B82F6]" />
                My Tasks
              </h3>
              <button className="text-[#3B82F6] text-sm font-medium hover:underline">View All</button>
            </div>
            <div className="space-y-3">
              {studentTasks.length > 0 ? (
                studentTasks.slice(0, 3).map((task) => {
                  const project = mockProjects.find(p => p.id === task.projectId);
                  return (
                    <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#EDEEEF] rounded-xl gap-2">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center flex-shrink-0">
                          {getStatusIcon(task.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#191C1D] text-sm truncate">{task.title}</p>
                          <p className="text-xs text-[#47464F] truncate">{project?.title || 'No Project'}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium self-start sm:self-center ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <ListTodo size={32} className="mx-auto text-[#47464F] opacity-50" />
                  <p className="text-[#47464F] mt-2">No tasks assigned</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-[#191C1D] flex items-center gap-2 mb-4">
              <Clock size={18} className="md:size-5 text-[#F59E0B]" />
              Upcoming Deadlines
            </h3>
            <div className="space-y-3">
              {upcomingDeadlines.length > 0 ? (
                upcomingDeadlines.slice(0, 3).map((task) => {
                  const project = mockProjects.find(p => p.id === task.projectId);
                  return (
                    <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#EDEEEF] rounded-xl gap-2">
                      <div>
                        <p className="font-medium text-[#191C1D] text-sm">{task.title}</p>
                        <p className="text-xs text-[#47464F]">{project?.title || 'No Project'} • Due: {formatDate(task.dueDate)}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium self-start sm:self-center ${
                        task.priority === 'High' ? 'bg-red-100 text-red-800' :
                        task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-[#47464F] py-4">🎉 No upcoming deadlines!</p>
              )}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-[#191C1D] flex items-center gap-2 mb-4">
              <Bell size={18} className="md:size-5 text-[#3B82F6]" />
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

          <ActivityFeed activities={recentActivities} />
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;