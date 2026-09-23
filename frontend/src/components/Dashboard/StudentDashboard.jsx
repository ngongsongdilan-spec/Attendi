import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { mockGroups, mockProjects } from '../../data/MockData';
import { 
  BookOpen, Clock, CheckCircle, Calendar, 
  Users, FileText, Bell, 
  FolderKanban,
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
    { icon: BookOpen, label: 'Enrolled Courses', value: stats.totalCourses, color: 'info' },
  ];

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const getTaskStatusBadge = (status) => {
    switch(status) {
      case 'Completed': return 'fet-badge fet-badge-completed';
      case 'In Progress': return 'fet-badge fet-badge-warning';
      default: return 'fet-badge fet-badge-inactive';
    }
  };

  const getTaskStatusIcon = (status) => {
    switch(status) {
      case 'Completed': return <CheckCircle size={14} className="text-success" />;
      case 'In Progress': return <Clock size={14} className="text-warning" />;
      default: return <AlertCircle size={14} className="text-text-secondary" />;
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
        <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="fet-welcome-banner">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-[20px] md:text-[22px] font-bold">Welcome back, {studentName}</h2>
            <p className="text-white/50 text-[13px] mt-1">Here's what's happening with your projects today.</p>
            <p className="text-white/35 text-[12px] mt-0.5">
              {currentSemester?.name} {currentSchoolYear?.name}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-center min-w-[100px] border border-white/10">
            <p className="text-[11px] text-white/50 font-medium uppercase tracking-wider">Attendance</p>
            <p className="text-[26px] font-bold text-white leading-tight">{stats.attendance}%</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        {/* Left Column - Projects & Tasks */}
        <div className="lg:col-span-2 space-y-4 md:space-y-5">
          {/* My Projects */}
          <div className="fet-card p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] md:text-[15px] font-semibold text-text-primary flex items-center gap-2">
                <FolderKanban size={16} className="text-primary" strokeWidth={2} />
                My Projects
              </h3>
            </div>
            <div className="space-y-3">
              {studentProjects.length > 0 ? (
                studentProjects.slice(0, 3).map((project) => {
                  const group = mockGroups.find(g => g.projectId === project.id);
                  return (
                    <div key={project.id} className="p-3.5 rounded-xl border border-border-default hover:shadow-card transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-text-primary text-[13.5px]">{project.title}</h4>
                          <p className="text-[12px] text-text-secondary mt-0.5">{project.department} · {group?.name || 'No Group'}</p>
                        </div>
                        <span className={`fet-badge ${project.status === 'Active' ? 'fet-badge-active' : 'fet-badge-pending'} self-start`}>
                          {project.status}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[12px] text-text-secondary mb-1.5">
                          <span>Progress</span>
                          <span className="font-semibold text-text-primary">{project.progress}%</span>
                        </div>
                        <div className="fet-progress-bar">
                          <div className="fet-progress-bar-fill" style={{ width: `${project.progress}%` }}></div>
                        </div>
                        <p className="text-[11px] text-text-secondary mt-1.5">Deadline: {project.deadline}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <FolderKanban size={32} className="mx-auto text-text-secondary/30" />
                  <p className="text-[13px] text-text-secondary mt-2">No projects assigned</p>
                </div>
              )}
            </div>
          </div>

          {/* My Tasks */}
          <div className="fet-card p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] md:text-[15px] font-semibold text-text-primary flex items-center gap-2">
                <ListTodo size={16} className="text-primary" strokeWidth={2} />
                My Tasks
              </h3>
            </div>
            <div className="space-y-2">
              {studentTasks.length > 0 ? (
                studentTasks.slice(0, 4).map((task) => {
                  const project = mockProjects.find(p => p.id === task.projectId);
                  return (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-page-bg gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(63,53,181,0.08)' }}>
                          {getTaskStatusIcon(task.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text-primary text-[13px] truncate">{task.title}</p>
                          <p className="text-[11px] text-text-secondary truncate">{project?.title || 'No Project'}</p>
                        </div>
                      </div>
                      <span className={getTaskStatusBadge(task.status)}>
                        {task.status}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <ListTodo size={32} className="mx-auto text-text-secondary/30" />
                  <p className="text-[13px] text-text-secondary mt-2">No tasks assigned</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4 md:space-y-5">
          {/* Upcoming Deadlines */}
          <div className="fet-card p-4 md:p-5">
            <h3 className="text-[14px] md:text-[15px] font-semibold text-text-primary flex items-center gap-2 mb-4">
              <Clock size={16} className="text-warning" strokeWidth={2} />
              Upcoming Deadlines
            </h3>
            <div className="space-y-2">
              {upcomingDeadlines.length > 0 ? (
                upcomingDeadlines.slice(0, 4).map((task) => {
                  const project = mockProjects.find(p => p.id === task.projectId);
                  return (
                    <div key={task.id} className="p-3 rounded-xl bg-page-bg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary text-[13px] truncate">{task.title}</p>
                          <p className="text-[11px] text-text-secondary mt-0.5">{project?.title || 'Project'} · Due {formatDate(task.dueDate)}</p>
                        </div>
                        <span className={`fet-badge ${
                          task.priority === 'High' ? 'fet-badge-danger' :
                          task.priority === 'Medium' ? 'fet-badge-warning' :
                          'fet-badge-info'
                        } self-start flex-shrink-0`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-text-secondary py-4 text-[13px]">No upcoming deadlines!</p>
              )}
            </div>
          </div>

          {/* Announcements */}
          <div className="fet-card p-4 md:p-5">
            <h3 className="text-[14px] md:text-[15px] font-semibold text-text-primary flex items-center gap-2 mb-4">
              <Bell size={16} className="text-primary" strokeWidth={2} />
              Announcements
            </h3>
            <div className="space-y-2">
              {recentAnnouncements.map((a) => (
                <div key={a.id} className="p-3 rounded-xl bg-page-bg">
                  <p className="font-medium text-text-primary text-[13px]">{a.title}</p>
                  <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">{a.content}</p>
                  <p className="text-[10px] text-text-secondary mt-1 font-medium">{formatDate(a.date)} · {a.author}</p>
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
