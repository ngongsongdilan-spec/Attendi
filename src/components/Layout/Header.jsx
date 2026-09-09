import React, { useState } from 'react';
import { Search, Bell, ChevronDown, User, School, Menu } from 'lucide-react';

const Header = ({ user }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const name = user?.fullName || 'User';
  const role = user?.role || 'student';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const notifications = [
    { id: 1, title: 'New announcement posted', time: '2 min ago', read: false },
    { id: 2, title: 'Task assigned to you', time: '1 hour ago', read: false },
    { id: 3, title: 'Assessment results released', time: '3 hours ago', read: true },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

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
          <button className="md:hidden p-2 rounded-lg hover:bg-[#EDEEEF] transition-colors">
            <Search size={20} className="text-[#47464F]" />
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-[#EDEEEF] transition-colors"
            >
              <Bell size={20} className="text-[#47464F]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-72 md:w-80 bg-white rounded-xl shadow-lg border border-[#C8C5D0] z-50">
                <div className="p-3 border-b border-[#C8C5D0]">
                  <p className="font-semibold text-[#191C1D]">Notifications</p>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className={`p-3 border-b border-[#C8C5D0] last:border-0 ${!n.read ? 'bg-[#EFF6FF]' : ''}`}>
                      <p className="text-sm text-[#191C1D]">{n.title}</p>
                      <p className="text-xs text-[#47464F]">{n.time}</p>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-[#C8C5D0]">
                  <button className="w-full text-center text-sm text-[#3B82F6] hover:underline">View all</button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-[#C8C5D0]"
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

            {/* Profile Dropdown */}
            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#C8C5D0] z-50">
                <div className="p-3 border-b border-[#C8C5D0]">
                  <p className="font-semibold text-[#191C1D]">{name}</p>
                  <p className="text-xs text-[#47464F] capitalize">{role}</p>
                </div>
                <div className="py-1">
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-[#EDEEEF] transition-colors">👤 Profile</button>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-[#EDEEEF] transition-colors">⚙️ Settings</button>
                  <button className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[#EDEEEF] transition-colors">🚪 Logout</button>
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