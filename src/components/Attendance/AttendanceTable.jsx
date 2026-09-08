import React from 'react';

const AttendanceTable = ({ records }) => {
  if (!records || records.length === 0) {
    return (
      <div className="text-center py-8 text-[#47464F]">
        No attendance records for this session
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-[#EDEEEF] border-b border-[#C8C5D0]">
            <th className="text-left py-2 px-3 text-xs font-semibold text-[#47464F] uppercase">Student</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-[#47464F] uppercase">ID</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-[#47464F] uppercase">Status</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-[#47464F] uppercase">Time</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-[#47464F] uppercase">Method</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b border-[#C8C5D0] hover:bg-[#EDEEEF] transition-colors">
              <td className="py-2 px-3 font-medium text-[#191C1D]">{record.studentName || record.studentId}</td>
              <td className="py-2 px-3 text-[#47464F] text-sm">{record.studentId}</td>
              <td className="py-2 px-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  record.status === 'PRESENT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {record.status}
                </span>
              </td>
              <td className="py-2 px-3 text-[#47464F] text-sm">{record.time}</td>
              <td className="py-2 px-3 text-[#47464F] text-sm">{record.method}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceTable;