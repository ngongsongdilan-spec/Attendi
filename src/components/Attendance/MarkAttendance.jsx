import React, { useState } from 'react';

const MarkAttendance = ({ students, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    studentId: '',
    course: 'Data Structures 101',
    status: 'Present',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const student = students.find(s => s.id === formData.studentId);
    if (student) {
      onSubmit({
        ...formData,
        studentName: student.name,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#191C1D] mb-1">Student</label>
        <select
          value={formData.studentId}
          onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
          required
          className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
        >
          <option value="">Select Student</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#191C1D] mb-1">Course</label>
        <input
          type="text"
          value={formData.course}
          onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
          className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#191C1D] mb-1">Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
          className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
        >
          <option value="Present">Present</option>
          <option value="Late">Late</option>
          <option value="Absent">Absent</option>
          <option value="Review">Review</option>
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[#C8C5D0]">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-[#C8C5D0] rounded-lg text-[#47464F] hover:bg-[#EDEEEF] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg font-medium hover:bg-[#3B82F6]/90 transition-colors"
        >
          Mark Attendance
        </button>
      </div>
    </form>
  );
};

export default MarkAttendance;