import React from 'react';
import { Search, Bell, ChevronDown, User, School } from 'lucide-react';

const Header = ({ user }) => {
  const name = user?.fullName || 'User';
  const role = user?.role || 'student';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="bg-white border-b border-[#C8C5D0] px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
          <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2 bg-[#F3F4F5] border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]" />
        </div>
        <div className="flex items-center gap-4">
          <button className="relative p-2 rounded-lg hover:bg-[#EDEEEF]"><Bell size={20} className="text-[#47464F]" /><span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span></button>
          <div className="flex items-center gap-3 pl-4 border-l border-[#C8C5D0]">
            <div className="w-9 h-9 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-semibold text-sm">{initials}</div>
            <div className="hidden md:block"><p className="text-sm font-semibold text-[#191C1D]">{name}</p><p className="text-xs text-[#47464F] capitalize">{role}</p></div>
            <ChevronDown size={16} className="text-[#47464F]" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;