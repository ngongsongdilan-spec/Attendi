/**
 * DashboardHome — Routes to the correct dashboard based on user role.
 *
 * Reads the current user from the backend session (via App → useAuth).
 * Falls back to localStorage role for backward compatibility.
 *
 * @module components/Dashboard/DashboardHome
 */

import React from 'react';
import StudentDashboard from './StudentDashboard';
import LecturerDashboard from './LecturerDashboard';
import CoordinatorDashboard from './CoordinatorDashboard';

const DashboardHome = () => {
  const storedUser = JSON.parse(localStorage.getItem('fet_user') || '{}');
  const role = storedUser?.role || 'student';

  if (role === 'coordinator') {
    return <CoordinatorDashboard user={storedUser} />;
  } else if (role === 'lecturer') {
    return <LecturerDashboard user={storedUser} />;
  } else {
    return <StudentDashboard user={storedUser} />;
  }
};

export default DashboardHome;
