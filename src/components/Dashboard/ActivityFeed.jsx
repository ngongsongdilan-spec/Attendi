import React from 'react';
import { Users, Clock } from 'lucide-react';

const ActivityFeed = ({ activities }) => {
  const defaultActivities = [
    { user: 'System', action: 'Welcome to FET Portal', time: 'Just now' },
    { user: 'Dr. Vance', action: 'posted new material', time: '2 hours ago' },
  ];

  const items = activities && activities.length > 0 ? activities : defaultActivities;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
      <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2 mb-4">
        <Clock size={20} className="text-[#3B82F6]" />
        Recent Activity
      </h3>
      <div className="space-y-4">
        {items.map((activity, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#3B82F6]/10 flex items-center justify-center">
              <Users size={16} className="text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-sm text-[#191C1D]"><span className="font-semibold">{activity.user}</span> {activity.action}</p>
              <p className="text-xs text-[#47464F] mt-1 flex items-center gap-1"><Clock size={12} /> {activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;