import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import DashboardHome from './components/Dashboard/DashboardHome';
import StudentDashboard from './components/Dashboard/StudentDashboard';
import LecturerDashboard from './components/Dashboard/LecturerDashboard';
import CoordinatorDashboard from './components/Dashboard/CoordinatorDashboard';
import Login from './components/Auth/Login';
import SignUp from './components/Auth/SignUp';
import ProfilePage from './components/Profile/ProfilePage';
import CourseCatalogue from './Pages/Courses/CourseCatalogue';
import AttendanceDashboard from './components/Attendance/AttendanceDashboard';
import ProjectsList from './components/Projects/ProjectsList';
import ProjectDetails from './components/Projects/ProjectDetails';
import TaskList from './components/Tasks/TaskList';
import GroupList from './components/Groups/GroupList';
import ContinuousAssessment from './components/Assessment/ContinuousAssessment';
import ContributionTracking from './components/Assessment/ContributionTracking';
import ContributionsPage from './components/Contributions/ContributionsPage';
import AnnouncementList from './components/Announcements/AnnouncementList';
import AcademicCalendar from './components/Academic/AcademicCalender';
import AdminDashboard from './Pages/Admin/AdminDashboard';
import AdminUsers from './Pages/Admin/AdminUser';

const RequireRole = ({ role, children }) => {
  const stored = localStorage.getItem('fet_user');
  let userRole = 'student';
  try {
    const user = stored ? JSON.parse(stored) : null;
    userRole = user?.role || localStorage.getItem('fet_user_role') || 'student';
  } catch {
    userRole = localStorage.getItem('fet_user_role') || 'student';
  }

  if (userRole !== role) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem('fet_auth');
    const storedUser = localStorage.getItem('fet_user');
    
    if (auth === 'true' && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('fet_auth');
        localStorage.removeItem('fet_user');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const onProfileUpdate = () => {
      try {
        const u = JSON.parse(localStorage.getItem('fet_user') || '{}');
        if (u && u.fullName) setUser(u);
      } catch { /* ignore */ }
    };
    window.addEventListener('fet-profile-updated', onProfileUpdate);
    return () => window.removeEventListener('fet-profile-updated', onProfileUpdate);
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('fet_auth', 'true');
    localStorage.setItem('fet_user', JSON.stringify(userData));
    localStorage.setItem('fet_user_role', userData.role || 'student');
    localStorage.setItem('fet_user_name', userData.fullName || userData.email?.split('@')[0] || 'User');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('fet_auth');
    localStorage.removeItem('fet_user');
    localStorage.removeItem('fet_user_role');
    localStorage.removeItem('fet_user_name');
  };

  const handleSwitchToSignUp = () => setShowSignUp(true);
  const handleSwitchToLogin = () => setShowSignUp(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-[#47464F]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showSignUp) {
      return <SignUp onSignUp={handleLogin} onSwitchToLogin={handleSwitchToLogin} />;
    }
    return <Login onLogin={handleLogin} onSwitchToSignUp={handleSwitchToSignUp} />;
  }

  const userName = user?.fullName || user?.email?.split('@')[0] || 'User';
  const userRole = user?.role || 'student';

  return (
    <AppProvider>
      <Router>
        <div className="app-container flex h-screen bg-transparent">
          <Sidebar onLogout={handleLogout} userName={userName} userRole={userRole} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header user={user} onLogout={handleLogout} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              <Routes>
                <Route path="/" element={<DashboardHome />} />
                <Route path="/dashboard" element={<DashboardHome />} />
                <Route path="/student-dashboard" element={<StudentDashboard user={user} />} />
                <Route path="/lecturer-dashboard" element={<LecturerDashboard user={user} />} />
                <Route path="/coordinator-dashboard" element={<CoordinatorDashboard user={user} />} />
                <Route path="/profile" element={<ProfilePage user={user} />} />
                <Route path="/courses" element={<CourseCatalogue user={user} />} />
                <Route path="/attendance" element={<AttendanceDashboard user={user} />} />
                <Route path="/projects" element={<ProjectsList />} />
                <Route path="/projects/:id" element={<ProjectDetails />} />
                <Route path="/tasks" element={<TaskList />} />
                <Route path="/groups" element={<GroupList />} />
                <Route path="/assessment" element={<ContinuousAssessment user={user} />} />
                <Route path="/contribution" element={<ContributionsPage user={user} />} />
                <Route
                  path="/contribution/tracking"
                  element={<RequireRole role="lecturer"><ContributionTracking user={user} /></RequireRole>}
                />
                <Route path="/announcements" element={<AnnouncementList user={user} />} />
                <Route path="/academic" element={<AcademicCalendar />} />
                <Route
                  path="/admin/dashboard"
                  element={<RequireRole role="admin"><AdminDashboard user={user} /></RequireRole>}
                />
                <Route
                  path="/admin/users"
                  element={<RequireRole role="admin"><AdminUsers user={user} /></RequireRole>}
                />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;