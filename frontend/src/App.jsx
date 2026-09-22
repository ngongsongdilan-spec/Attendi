/**
 * App — Root component with auth guard and API-backed session.
 *
 * Auth flow:
 *   1. useAuth calls GET /accounts/me/ on mount to restore session.
 *   2. If authenticated → render dashboard with AppProvider + Router.
 *   3. If not → render Login or SignUp.
 *
 * @module App
 */

import React, { useState } from 'react';
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
import AdminDashboard from './Pages/Admin/AdminDashboard';
import AdminUsers from './Pages/Admin/AdminUser';
import CourseCatalogue from './Pages/Courses/CourseCatalogue';
import AcademicCalender from './components/Academic/AcademicCalender';
import AnnouncementList from './components/Announcements/AnnouncementList';
import ContinuousAssessment from './components/Assessment/ContinuousAssessment';
import AttendanceDashboard from './components/Attendance/AttendanceDashboard';
import ContributionForm from './components/Contributions/ContributionForm';
import GroupList from './components/Groups/GroupList';
import ProjectsList from './components/Projects/ProjectsList';
import TaskList from './components/Tasks/TaskList';
import useAuth from './hooks/useAuth';

function App() {
  const { user, isAuthenticated, isLoading, login, logout, register, updateProfile } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);

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
      return <SignUp onSignUp={register} onSwitchToLogin={() => setShowSignUp(false)} />;
    }
    return <Login onLogin={login} onSwitchToSignUp={() => setShowSignUp(true)} />;
  }

  const userName = user
    ? `${user.first_name} ${user.last_name}`
    : 'User';
  const userRole = user?.displayRole || 'student';

  return (
    <AppProvider>
      <Router>
        <div className="app-container flex h-screen bg-transparent">
          <Sidebar onLogout={logout} userName={userName} userRole={userRole} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header user={{ ...user, fullName: userName, role: userRole }} onLogout={logout} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              <Routes>
                <Route path="/" element={<DashboardHome user={{ ...user, fullName: userName }} />} />
                <Route path="/dashboard" element={<DashboardHome user={{ ...user, fullName: userName }} />} />
                <Route path="/student-dashboard" element={<StudentDashboard user={{ ...user, fullName: userName }} />} />
                <Route path="/lecturer-dashboard" element={<LecturerDashboard user={{ ...user, fullName: userName }} />} />
                <Route path="/coordinator-dashboard" element={<CoordinatorDashboard user={{ ...user, fullName: userName }} />} />
                <Route path="/profile" element={<ProfilePage user={{ ...user, fullName: userName }} onUpdateProfile={updateProfile} />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/courses" element={<CourseCatalogue />} />
                <Route path="/academic" element={<AcademicCalender />} />
                <Route path="/announcements" element={<AnnouncementList />} />
                <Route path="/assessment" element={<ContinuousAssessment />} />
                <Route path="/attendance" element={<AttendanceDashboard />} />
                <Route path="/contribution" element={<ContributionForm />} />
                <Route path="/groups" element={<GroupList />} />
                <Route path="/projects" element={<ProjectsList />} />
                <Route path="/tasks" element={<TaskList />} />
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
