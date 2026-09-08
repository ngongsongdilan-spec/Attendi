import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  ClipboardCheck, 
  BarChart3, 
  Bell, 
  Settings, 
  LogOut, 
  CheckSquare,
  UserCircle,
  BookOpen,
  Shield,
  Calendar,
  FileText,
  GraduationCap,
  Building,
  Activity
} from 'lucide-react';

const Sidebar = ({ onLogout, userName = 'User', userRole = 'student' }) => {
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Navigation items based on role
  const getNavItems = () => {
    // Common items for all roles
    const commonItems = [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/profile', icon: UserCircle, label: 'Profile' },
      { path: '/academic', icon: Calendar, label: 'Academic Calendar' },
    ];

    // Student items
    const studentItems = [
      { path: '/courses', icon: BookOpen, label: 'Courses' },
      { path: '/attendance', icon: Calendar, label: 'Attendance' },
      { path: '/projects', icon: FolderKanban, label: 'Projects' },
      { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
      { path: '/groups', icon: Users, label: 'Groups' },
      { path: '/assessment', icon: ClipboardCheck, label: 'Assessment' },
      { path: '/contribution', icon: BarChart3, label: 'Contributions' },
      { path: '/announcements', icon: Bell, label: 'Announcements' },
    ];

    // Lecturer items
    const lecturerItems = [
      { path: '/courses', icon: BookOpen, label: 'My Courses' },
      { path: '/attendance', icon: Calendar, label: 'Attendance' },
      { path: '/projects', icon: FolderKanban, label: 'Projects' },
      { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
      { path: '/groups', icon: Users, label: 'Groups' },
      { path: '/assessment', icon: ClipboardCheck, label: 'Assessment' },
      { path: '/contribution', icon: BarChart3, label: 'Contributions' },
      { path: '/announcements', icon: Bell, label: 'Announcements' },
      { path: '/materials', icon: FileText, label: 'Materials' },
    ];

    // Admin items
    const adminItems = [
      { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Admin Dashboard' },
      { path: '/admin/users', icon: Users, label: 'User Management' },
      { path: '/admin/roles', icon: Shield, label: 'Role Management' },
      { path: '/admin/faculties', icon: Building, label: 'Faculties' },
      { path: '/admin/departments', icon: Building, label: 'Departments' },
      { path: '/admin/courses', icon: BookOpen, label: 'Course Catalogue' },
      { path: '/admin/course-offerings', icon: GraduationCap, label: 'Course Offerings' },
      { path: '/admin/classes', icon: Calendar, label: 'Classes' },
      { path: '/admin/enrolments', icon: Users, label: 'Enrolments' },
      { path: '/admin/projects', icon: FolderKanban, label: 'Projects' },
      { path: '/admin/attendance', icon: Calendar, label: 'Attendance' },
      { path: '/admin/audit', icon: Activity, label: 'Audit Log' },
      { path: '/admin/settings', icon: Settings, label: 'Settings' },
    ];

    if (userRole === 'admin') {
      return [...commonItems, ...adminItems];
    } else if (userRole === 'lecturer') {
      return [...commonItems, ...lecturerItems];
    } else {
      return [...commonItems, ...studentItems];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-[#1E1B4B] text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#2A1F6E]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2A1F6E] rounded-lg flex items-center justify-center">
            <span className="text-[#8683BA] font-bold text-xl">FET</span>
          </div>
          <div>
            <h1 className="text-lg font-bold">FET</h1>
            <p className="text-xs text-[#8683BA] opacity-80">Management System</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-[#2A1F6E]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center font-bold text-white">
            {initials || 'U'}
          </div>
          <div>
            <p className="text-sm font-medium text-white truncate max-w-[140px]">{userName}</p>
            <p className="text-xs text-[#8683BA] capitalize">{userRole}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-[#2A1F6E] text-[#8683BA]' 
                  : 'hover:bg-[#2A1F6E]/50 text-white/70 hover:text-white'
              }`
            }
          >
            <item.icon size={20} />
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-[#2A1F6E]">
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-[#2A1F6E]/50 text-white/70 hover:text-white transition-colors">
          <Settings size={20} />
          <span className="text-sm font-medium">Settings</span>
        </button>
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-[#2A1F6E]/50 text-white/70 hover:text-white transition-colors"
        >
          <LogOut size={20} />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;