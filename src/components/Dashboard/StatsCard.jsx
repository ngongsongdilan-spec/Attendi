const StatsCard = ({ icon: Icon, label, value, color = 'secondary' }) => {
  const colorMap = {
    secondary: { bg: 'rgba(63,53,181,0.08)', icon: '#3F35B5' },
    primary: { bg: 'rgba(63,53,181,0.08)', icon: '#3F35B5' },
    tertiary: { bg: 'rgba(124,58,237,0.08)', icon: '#7C3AED' },
    success: { bg: 'rgba(21,128,61,0.08)', icon: '#15803D' },
    warning: { bg: 'rgba(180,83,9,0.08)', icon: '#B45309' },
    error: { bg: 'rgba(185,28,28,0.08)', icon: '#B91C1C' },
    info: { bg: 'rgba(29,78,216,0.08)', icon: '#1D4ED8' },
  };

  const colors = colorMap[color] || colorMap.secondary;

  return (
    <div className="fet-card p-4 md:p-5 hover:shadow-card-hover transition-shadow">
      <div className="flex items-center gap-3 md:gap-4">
        <div className="p-2.5 md:p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: colors.bg }}>
          <Icon className="w-5 h-5 md:w-[22px] md:h-[22px]" style={{ color: colors.icon }} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[20px] md:text-[24px] font-bold text-text-primary leading-tight">{value}</p>
          <p className="text-[12px] text-text-secondary font-medium leading-snug mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
