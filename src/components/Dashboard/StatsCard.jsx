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
    <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colors[color] || colors.secondary}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-2xl font-bold text-[#191C1D]">{value}</p>
          <p className="text-sm text-[#47464F]">{label}</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;