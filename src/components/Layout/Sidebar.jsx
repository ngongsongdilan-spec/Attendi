import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  Calendar,
  GraduationCap,
  Menu,
  X
} from 'lucide-react';

const Sidebar = ({ onLogout, userName = 'User', userRole = 'student' }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ===== ROLE-BASED NAVIGATION ITEMS =====
  const getNavItems = () => {
    const commonItems = [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/profile', icon: UserCircle, label: 'Profile' },
    ];

    // Student Items
    const studentItems = [
      { path: '/courses', icon: BookOpen, label: 'Courses' },
      { path: '/attendance', icon: Calendar, label: 'Attendance' },
      { path: '/projects', icon: FolderKanban, label: 'Projects' },
      { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
      { path: '/groups', icon: Users, label: 'Groups' },
      { path: '/assessment', icon: ClipboardCheck, label: 'Assessment' },
      { path: '/contribution', icon: BarChart3, label: 'Contributions' },
      { path: '/announcements', icon: Bell, label: 'Announcements' },
      { path: '/academic', icon: Calendar, label: 'Academic' },
    ];

    // Lecturer Items
    const lecturerItems = [
      { path: '/courses', icon: BookOpen, label: 'My Courses' },
      { path: '/attendance', icon: Calendar, label: 'Attendance' },
      { path: '/projects', icon: FolderKanban, label: 'Projects' },
      { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
      { path: '/groups', icon: Users, label: 'Groups' },
      { path: '/assessment', icon: ClipboardCheck, label: 'Assessment' },
      { path: '/contribution', icon: BarChart3, label: 'Contributions' },
      { path: '/contribution/tracking', icon: Users, label: 'Contribution Tracking' },
      { path: '/announcements', icon: Bell, label: 'Announcements' },
      { path: '/academic', icon: Calendar, label: 'Academic' },
    ];

    // Admin Items
    const adminItems = [
      { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Admin Dashboard' },
      { path: '/admin/users', icon: Users, label: 'User Management' },
      { path: '/courses', icon: BookOpen, label: 'Course Catalogue' },
      { path: '/academic', icon: Calendar, label: 'Academic' },
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

  // ===== MOBILE TOGGLE =====
  const toggleSidebar = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeSidebar = () => {
    setIsMobileOpen(false);
  };

  // ===== SIDEBAR CONTENT =====
  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 md:p-6 border-b border-[#2A1F6E]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2A1F6E] rounded-lg flex items-center justify-center">
            <span className="text-[#8683BA] font-bold text-xl">FET</span>
          </div>
          <div>
            <h1 className="text-lg font-bold">FET</h1>
            <p className="text-xs text-[#8683BA] opacity-80">Management</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-[#2A1F6E]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center font-bold text-white">
            {initials || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-[#8683BA] capitalize">{userRole}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 md:p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={closeSidebar}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-colors text-sm md:text-base ${
                isActive 
                  ? 'bg-[#2A1F6E] text-[#8683BA]' 
                  : 'hover:bg-[#2A1F6E]/50 text-white/70 hover:text-white'
              }`
            }
          >
            <item.icon size={18} className="md:size-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-[#2A1F6E] space-y-1">
        <button className="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 w-full rounded-lg hover:bg-[#2A1F6E]/50 text-white/70 hover:text-white transition-colors text-sm md:text-base">
          <Settings size={18} className="md:size-5" />
          <span className="font-medium">Settings</span>
        </button>
        <button 
          onClick={() => { onLogout(); closeSidebar(); }}
          className="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 w-full rounded-lg hover:bg-[#2A1F6E]/50 text-white/70 hover:text-white transition-colors text-sm md:text-base"
        >
          <LogOut size={18} className="md:size-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#1E1B4B] text-white rounded-lg shadow-lg hover:bg-[#2A1F6E] transition-colors"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar - Desktop always visible, Mobile slides in */}
      <aside className={`
        sidebar w-64 md:w-72 text-white flex flex-col fixed lg:relative z-50
        transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        h-full
      `}>
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;