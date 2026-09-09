import React from 'react';
import { Clock } from 'lucide-react';

const ActivityFeed = ({ activities }) => {
  const defaultActivities = [
    { user: 'System', action: 'Welcome to FET Platform', time: 'Just now' },
    { user: 'Dr. Vance', action: 'posted new announcement', time: '1 hour ago' },
  ];

  const items = activities && activities.length > 0 ? activities : defaultActivities;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-4 md:p-6">
      <h3 className="text-base md:text-lg font-semibold text-[#191C1D] flex items-center gap-2 mb-4">
        <Clock size={18} className="md:size-5 text-[#3B82F6]" />
        Recent Activity
      </h3>
      <div className="space-y-3">
        {items.slice(0, 4).map((activity, i) => (
          <div key={i} className="flex gap-3 p-2 hover:bg-[#EDEEEF] rounded-lg transition-colors">
            <div className="w-8 h-8 rounded-full bg-[#3B82F6]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[#3B82F6] text-sm">👤</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#191C1D]">
                <span className="font-semibold">{activity.user}</span> {activity.action}
              </p>
              <p className="text-xs text-[#47464F] mt-0.5">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;