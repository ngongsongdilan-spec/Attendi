import React from 'react';
import { useAppContext } from '../../context/AppContext';
import SemesterSelector from './SemesterSelector';
import SchoolYearManager from './SchoolYearManager';

const AcademicCalendar = () => {
  const { currentSemester, currentSchoolYear } = useAppContext();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#1E1B4B] to-[#2A1F6E] rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">Academic Calendar</h2>
        <p className="text-[#8683BA] mt-1">
          {currentSemester?.name} • {currentSchoolYear?.name}
        </p>
        <p className="text-[#8683BA] text-sm mt-1">
          {currentSemester?.startDate} - {currentSemester?.endDate}
        </p>
      </div>

      <SemesterSelector />
      <SchoolYearManager />

      {/* Semester Info */}
      <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
        <h3 className="text-lg font-semibold text-[#191C1D] mb-4">Current Semester Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-[#EDEEEF] rounded-xl text-center">
            <p className="text-xs text-[#47464F]">Semester</p>
            <p className="font-semibold text-[#191C1D]">{currentSemester?.name}</p>
          </div>
          <div className="p-3 bg-[#EDEEEF] rounded-xl text-center">
            <p className="text-xs text-[#47464F]">School Year</p>
            <p className="font-semibold text-[#191C1D]">{currentSchoolYear?.name}</p>
          </div>
          <div className="p-3 bg-[#EDEEEF] rounded-xl text-center">
            <p className="text-xs text-[#47464F]">Start Date</p>
            <p className="font-semibold text-[#191C1D]">{currentSemester?.startDate}</p>
          </div>
          <div className="p-3 bg-[#EDEEEF] rounded-xl text-center">
            <p className="text-xs text-[#47464F]">End Date</p>
            <p className="font-semibold text-[#191C1D]">{currentSemester?.endDate}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicCalendar;