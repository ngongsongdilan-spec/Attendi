import React, { useState } from 'react';
import { X, Users, QrCode, Search, Check } from 'lucide-react';

const AttendanceSession = ({ user, onClose, onCreated }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    courseCode: '',
    className: '',
    mode: 'STATION_BASED',
    stationStudents: [],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const courses = [
    { code: 'CEF444', name: 'AI and Machine Learning' },
    { code: 'CEF350', name: 'Security and Cryptosystem' },
  ];

  const classes = [
    { id: 'cen400-a', name: 'CEN Level 400 - Group A' },
  ];

  const students = [
    { matricule: 'FE24A389', name: 'Alex Scholar' },
    { matricule: 'FE24B456', name: 'Emma Watson' },
  ];

  const handleSubmit = () => {
    if (!formData.courseCode || !formData.className) {
      setError('Please select a course and class');
      return;
    }

    const sessions = JSON.parse(localStorage.getItem('fet_attendance_sessions') || '[]');
    const newSession = {
      id: `session-${Date.now()}`,
      courseCode: formData.courseCode,
      courseName: courses.find(c => c.code === formData.courseCode)?.name || '',
      className: formData.className,
      mode: formData.mode,
      stationStudentIds: formData.stationStudents.map(s => s.matricule),
      status: 'ACTIVE',
      token: `TOKEN-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      tokenExpiresAt: Date.now() + 10000,
      sessionExpiresAt: Date.now() + 60000,
      createdAt: new Date().toISOString(),
    };
    
    sessions.push(newSession);
    localStorage.setItem('fet_attendance_sessions', JSON.stringify(sessions));
    onCreated();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Create Attendance Session</h3>
          <button onClick={onClose} className="text-2xl hover:bg-[#EDEEEF] rounded-lg px-2">×</button>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm mb-4">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Course *</label>
            <select
              value={formData.courseCode}
              onChange={(e) => setFormData(prev => ({ ...prev, courseCode: e.target.value }))}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#3B82F6]"
            >
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Class *</label>
            <select
              value={formData.className}
              onChange={(e) => setFormData(prev => ({ ...prev, className: e.target.value }))}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#3B82F6]"
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormData(prev => ({ ...prev, mode: 'STATION_BASED' }))}
                className={`p-3 rounded-xl border-2 ${formData.mode === 'STATION_BASED' ? 'border-[#3B82F6] bg-[#3B82F6]/10' : 'border-[#C8C5D0]'}`}
              >
                <Users size={20} className="mx-auto" /> Station
              </button>
              <button
                onClick={() => setFormData(prev => ({ ...prev, mode: 'LECTURER_PROJECTED' }))}
                className={`p-3 rounded-xl border-2 ${formData.mode === 'LECTURER_PROJECTED' ? 'border-[#8B5CF6] bg-[#8B5CF6]/10' : 'border-[#C8C5D0]'}`}
              >
                <QrCode size={20} className="mx-auto" /> Projected
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full px-6 py-3 bg-[#3B82F6] text-white rounded-xl font-semibold hover:bg-[#3B82F6]/90"
          >
            🚀 Launch Attendance
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSession;