import React, { useState } from 'react';
import { X, Users, QrCode, ChevronRight, Search, Check } from 'lucide-react';

const AttendanceSession = ({ user, onClose, onCreated }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    courseCode: '',
    courseName: '',
    className: '',
    mode: 'LECTURER_PROJECTED',
    stationStudents: [],
    tokenDuration: 10,
    sessionDuration: 60,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  // Mock courses
  const courses = [
    { code: 'CEF444', name: 'Artificial Intelligence and Machine Learning' },
    { code: 'CEF350', name: 'Security and Cryptosystem' },
    { code: 'CEF342', name: 'Database and Design' },
    { code: 'SE401', name: 'Advanced Software Engineering' },
    { code: 'SE402', name: 'Agile Development' },
  ];

  // Mock classes
  const classes = [
    { id: 'cen400-a', name: 'CEN Level 400 - Group A' },
    { id: 'cen400-b', name: 'CEN Level 400 - Group B' },
    { id: 'se400-a', name: 'SE Level 400 - Group A' },
  ];

  // Mock students
  const eligibleStudents = [
    { matricule: 'FE24A389', name: 'Alex Scholar', level: '400' },
    { matricule: 'FE24B456', name: 'Emma Watson', level: '400' },
    { matricule: 'FE23C789', name: 'James Miller', level: '400' },
    { matricule: 'FE25D012', name: 'Sarah Connor', level: '400' },
  ];

  const filteredStudents = eligibleStudents.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.matricule.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectStudent = (student) => {
    if (formData.stationStudents.find(s => s.matricule === student.matricule)) {
      setFormData(prev => ({
        ...prev,
        stationStudents: prev.stationStudents.filter(s => s.matricule !== student.matricule)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        stationStudents: [...prev.stationStudents, student]
      }));
    }
  };

  const handleSubmit = () => {
    if (!formData.courseCode || !formData.className) {
      setError('Please select a course and class');
      return;
    }

    if (formData.mode === 'STATION_BASED' && formData.stationStudents.length === 0) {
      setError('Please select at least one station student');
      return;
    }

    // Get existing sessions
    const existingSessions = JSON.parse(localStorage.getItem('fet_attendance_sessions') || '[]');
    
    // Create new session
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
      lecturerId: user?.staffNumber || 'LEC001',
    };
    
    // Save to localStorage
    existingSessions.push(newSession);
    localStorage.setItem('fet_attendance_sessions', JSON.stringify(existingSessions));
    
    if (onCreated) onCreated();
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#C8C5D0]">
          <h3 className="text-xl font-bold text-[#191C1D]">Create Attendance Session</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#EDEEEF] rounded-lg">
            <X size={24} className="text-[#47464F]" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-4 p-4 bg-[#F8F9FA] border-b border-[#C8C5D0]">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= s ? 'bg-[#3B82F6] text-white' : 'bg-[#EDEEEF] text-[#47464F]'
              }`}>
                {s}
              </div>
              {s < 3 && <ChevronRight size={16} className="text-[#47464F]" />}
            </div>
          ))}
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
              ❌ {error}
            </div>
          )}

          {/* Step 1: Select Course & Class */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#191C1D] mb-1">Course *</label>
                <select
                  value={formData.courseCode}
                  onChange={(e) => {
                    const course = courses.find(c => c.code === e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      courseCode: e.target.value,
                      courseName: course?.name || ''
                    }));
                  }}
                  className="w-full px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                >
                  <option value="">Select Course</option>
                  {courses.map(c => (
                    <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#191C1D] mb-1">Class *</label>
                <select
                  value={formData.className}
                  onChange={(e) => setFormData(prev => ({ ...prev, className: e.target.value }))}
                  className="w-full px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                >
                  <option value="">Select Class</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#191C1D] mb-1">Attendance Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, mode: 'STATION_BASED' }))}
                    className={`p-4 rounded-xl border-2 transition-colors text-center ${
                      formData.mode === 'STATION_BASED'
                        ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]'
                        : 'border-[#C8C5D0] hover:border-[#3B82F6]'
                    }`}
                  >
                    <Users size={24} className="mx-auto mb-1" />
                    <p className="text-sm font-medium">Station-Based</p>
                    <p className="text-xs text-[#47464F]">Students as QR stations</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, mode: 'LECTURER_PROJECTED' }))}
                    className={`p-4 rounded-xl border-2 transition-colors text-center ${
                      formData.mode === 'LECTURER_PROJECTED'
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-[#8B5CF6]'
                        : 'border-[#C8C5D0] hover:border-[#8B5CF6]'
                    }`}
                  >
                    <QrCode size={24} className="mx-auto mb-1" />
                    <p className="text-sm font-medium">Projected QR</p>
                    <p className="text-xs text-[#47464F]">Lecturer displays QR</p>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full px-6 py-3 bg-[#3B82F6] text-white rounded-xl font-semibold hover:bg-[#3B82F6]/90 transition-colors"
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 2: Select Stations (only for STATION_BASED) */}
          {step === 2 && formData.mode === 'STATION_BASED' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#191C1D] mb-1">Select QR Stations</label>
                <p className="text-sm text-[#47464F] mb-3">Select students who will display QR codes</p>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                  />
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredStudents.map(student => (
                    <div
                      key={student.matricule}
                      onClick={() => handleSelectStudent(student)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                        formData.stationStudents.find(s => s.matricule === student.matricule)
                          ? 'bg-[#3B82F6]/10 border-2 border-[#3B82F6]'
                          : 'bg-[#EDEEEF] hover:bg-[#E7E8E9]'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-[#191C1D]">{student.name}</p>
                        <p className="text-sm text-[#47464F]">{student.matricule}</p>
                      </div>
                      {formData.stationStudents.find(s => s.matricule === student.matricule) && (
                        <Check size={18} className="text-[#3B82F6]" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-[#EDEEEF] rounded-xl">
                  <p className="text-sm text-[#47464F]">
                    Selected: <span className="font-bold text-[#191C1D]">{formData.stationStudents.length}</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 border border-[#C8C5D0] text-[#47464F] rounded-xl font-medium hover:bg-[#EDEEEF] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
                >
                  🚀 Launch Attendance
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Projected QR Mode */}
          {step === 2 && formData.mode === 'LECTURER_PROJECTED' && (
            <div className="space-y-4">
              <div className="p-6 bg-[#EDEEEF] rounded-xl text-center">
                <QrCode size={48} className="mx-auto text-[#8B5CF6] mb-2" />
                <h4 className="text-lg font-semibold text-[#191C1D]">Projected QR Mode</h4>
                <p className="text-sm text-[#47464F]">QR code will be displayed on your device</p>
                <p className="text-sm text-[#47464F]">Students will scan from their phones</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 border border-[#C8C5D0] text-[#47464F] rounded-xl font-medium hover:bg-[#EDEEEF] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
                >
                  🚀 Launch Attendance
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceSession;