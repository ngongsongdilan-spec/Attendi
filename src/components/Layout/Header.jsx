import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, User, School, Menu, LogOut, Settings, CheckCheck } from 'lucide-react';

const loadNotifications = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('fet_notifications') || '[]');
    if (stored.length > 0) return stored;
  } catch (e) { /* ignore */ }
  const initial = [
    { id: 1, title: 'New announcement posted', time: '2 min ago', read: false, category: 'Announcement' },
    { id: 2, title: 'Task assigned to you', time: '1 hour ago', read: false, category: 'Task' },
    { id: 3, title: 'Assessment results released', time: '3 hours ago', read: true, category: 'Assessment' },
  ];
  localStorage.setItem('fet_notifications', JSON.stringify(initial));
  return initial;
};

const Header = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState(loadNotifications);

  useEffect(() => {
    localStorage.setItem('fet_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const name = user?.fullName || 'User';
  const role = user?.role || 'student';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleLogout = () => {
    localStorage.removeItem('fet_auth');
    localStorage.removeItem('fet_user');
    localStorage.removeItem('fet_user_role');
    localStorage.removeItem('fet_user_name');
    if (onLogout) onLogout();
    else window.location.reload();
  };

  return (
    <header className="bg-white border-b border-[#C8C5D0] px-3 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between">
        {/* Left - Search (hidden on mobile) */}
        <div className="hidden md:flex relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 bg-[#F3F4F5] border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
          />
        </div>

        {/* Mobile Title */}
        <div className="md:hidden flex items-center gap-2">
          <span className="text-lg font-bold text-[#1E1B4B]">FET</span>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Search icon on mobile */}
          <button className="md:hidden p-2 rounded-lg hover:bg-[#EDEEEF] transition-colors" aria-label="Search">
            <Search size={20} className="text-[#47464F]" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-[#EDEEEF] transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-[#47464F]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-72 md:w-80 bg-white rounded-xl shadow-lg border border-[#C8C5D0] z-50">
                <div className="p-3 border-b border-[#C8C5D0] flex items-center justify-between">
                  <p className="font-semibold text-[#191C1D]">Notifications</p>
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-[#3B82F6] hover:underline"
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {notifications.length === 0 && (
                    <p className="text-center text-[#47464F] py-4 text-sm">No notifications</p>
                  )}
                  {notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`w-full text-left p-3 border-b border-[#C8C5D0] last:border-0 hover:bg-[#EDEEEF] transition-colors ${!n.read ? 'bg-[#EFF6FF]' : ''}`}
                    >
                      <span className="text-[10px] uppercase tracking-wider text-[#3B82F6] font-semibold">{n.category}</span>
                      <p className="text-sm text-[#191C1D]">{n.title}</p>
                      <p className="text-xs text-[#47464F]">{n.time}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-[#C8C5D0]"
              aria-label="Profile menu"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-semibold text-xs md:text-sm">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-[#191C1D] truncate max-w-[100px]">{name}</p>
                <p className="text-xs text-[#47464F] capitalize">{role}</p>
              </div>
              <ChevronDown size={16} className="text-[#47464F] hidden sm:block" />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#C8C5D0] z-50">
                <div className="p-3 border-b border-[#C8C5D0]">
                  <p className="font-semibold text-[#191C1D]">{name}</p>
                  <p className="text-xs text-[#47464F] capitalize">{role}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setShowProfile(false); navigate('/profile'); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#EDEEEF] transition-colors text-[#191C1D]"
                  >
                    <User size={16} /> Profile
                  </button>
                  <button
                    onClick={() => { setShowProfile(false); navigate('/academic'); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#EDEEEF] transition-colors text-[#191C1D]"
                  >
                    <School size={16} /> Academic
                  </button>
                  <button
                    onClick={() => { setShowProfile(false); navigate('/profile'); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[#EDEEEF] transition-colors text-[#191C1D]"
                  >
                    <Settings size={16} /> Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-[#EDEEEF] transition-colors"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;