import React from 'react';

const RubricItem = ({ label, weight, maxMarks, score, icon: Icon }) => {
  const percentage = maxMarks > 0 ? ((score / maxMarks) * 100).toFixed(0) : 0;

  return (
    <div className="flex items-center justify-between p-4 bg-[#EDEEEF] rounded-lg hover:bg-[#E7E8E9] transition-colors">
      <div className="flex items-center gap-3 flex-1">
        {Icon && (
          <div className="p-2 bg-[#3B82F6]/10 rounded-lg">
            <Icon size={18} className="text-[#3B82F6]" />
          </div>
        )}
        <div>
          <p className="font-medium text-[#191C1D]">{label}</p>
          <p className="text-xs text-[#47464F]">
            Weight: {weight}% | Max Marks: {maxMarks}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-lg font-bold text-[#191C1D]">{score}</p>
          <p className="text-xs text-[#47464F]">/ {maxMarks}</p>
        </div>
        <div className="w-12 h-12 relative">
          <svg className="w-12 h-12 transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="#e5e7eb"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="#3b82f6"
              strokeWidth="4"
              fill="none"
              strokeDasharray={2 * Math.PI * 20}
              strokeDashoffset={2 * Math.PI * 20 * (1 - Math.min(percentage / 100, 1))}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#191C1D]">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default RubricItem;