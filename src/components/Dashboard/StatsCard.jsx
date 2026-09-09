import React from 'react';

const StatsCard = ({ icon: Icon, label, value, color = 'secondary' }) => {
  const colors = {
    secondary: 'bg-[#3B82F6]/10 text-[#3B82F6]',
    tertiary: 'bg-[#8B5CF6]/10 text-[#8B5CF6]',
    success: 'bg-green-100 text-green-700',
    primary: 'bg-[#1E1B4B]/10 text-[#1E1B4B]',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-3 md:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 md:gap-4">
        <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${colors[color] || colors.secondary}`}>
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg md:text-2xl font-bold text-[#191C1D]">{value}</p>
          <p className="text-xs md:text-sm text-[#47464F] truncate">{label}</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;