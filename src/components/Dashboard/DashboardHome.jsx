import React from 'react';
import StudentDashboard from './StudentDashboard';
import LecturerDashboard from './LecturerDashboard';
import CoordinatorDashboard from './CoordinatorDashboard';

const DashboardHome = () => {
  const user = JSON.parse(localStorage.getItem('fet_user') || '{}');
  const role = user?.role || localStorage.getItem('fet_user_role') || 'student';

  if (role === 'coordinator') {
    return <CoordinatorDashboard user={user} />;
  } else if (role === 'lecturer') {
    return <LecturerDashboard user={user} />;
  } else {
    return <StudentDashboard user={user} />;
  }
};

export default DashboardHome;