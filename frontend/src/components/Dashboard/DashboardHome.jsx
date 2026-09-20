/**
 * DashboardHome — Routes to the correct dashboard based on user role.
 *
 * Reads the current user from the backend session (via App → useAuth).
 * Falls back to localStorage role for backward compatibility.
 *
 * @module components/Dashboard/DashboardHome
 */

import React from 'react';
import { normalizeRole } from '../../utils/tokenHelpers';
import StudentDashboard from './StudentDashboard';
import LecturerDashboard from './LecturerDashboard';
import CoordinatorDashboard from './CoordinatorDashboard';

/**
 * DashboardHome — Routes to the correct dashboard based on user role.
 *
 * Uses the role from the authenticated user object (via App → useAuth).
 * Falls back to 'student' if no role is available.
 */
const DashboardHome = ({ user }) => {
  const displayRole = normalizeRole(user?.role);

  if (displayRole === 'coordinator') {
    return <CoordinatorDashboard user={user} />;
  } else if (displayRole === 'lecturer') {
    return <LecturerDashboard user={user} />;
  } else {
    return <StudentDashboard user={user} />;
  }
};

export default DashboardHome;
