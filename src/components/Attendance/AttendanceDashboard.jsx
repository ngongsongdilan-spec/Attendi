import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Calendar, Users, CheckCircle, Clock, AlertCircle, QrCode, Plus, Eye, X, Monitor, Square, Pencil } from 'lucide-react';
import AttendanceSession from './AttendanceSession';
import QRScanner from './QRScanner';
import StationQR from './StationQR';
import AttendanceTable from './AttendanceTable';

const loadCorrections = () => {
  try {
    return JSON.parse(localStorage.getItem('fet_attendance_corrections') || '[]');
  } catch {
    return [];
  }
};

const AttendanceDashboard = ({ user }) => {
  const { 
    attendanceSessions, 
    attendanceRecords, 
    getActiveSession,
    getAttendanceForSession,
    updateAttendanceRecord,
    closeAttendanceSession
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState('current');
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isStation, setIsStation] = useState(false);
  const [showQRDisplay, setShowQRDisplay] = useState(false);
  const [projectorMode, setProjectorMode] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [corrections, setCorrections] = useState(loadCorrections);
  const [correctingRecord, setCorrectingRecord] = useState(null);
  const [correctionStatus, setCorrectionStatus] = useState('Present');
  const [correctionReason, setCorrectionReason] = useState('');

  const userRole = user?.role || 'student';
  const isLecturer = userRole === 'lecturer' || userRole === 'admin';
  
  const activeSession = getActiveSession();
  const isStudentStation = activeSession?.stationStudentIds?.includes(user?.matricule);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isStudentStation && activeSession) {
      setIsStation(true);
    } else {
      setIsStation(false);
    }
  }, [isStudentStation, activeSession]);

  // Get student's attendance history
  const studentRecords = user?.matricule 
    ? attendanceRecords.filter(r => r.studentId === user.matricule)
    : [];

  // Get session records
  const sessionRecords = selectedSession 
    ? getAttendanceForSession(selectedSession.id) 
    : [];

  const getStatusColor = (status) => {
    switch(status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      case 'EXPIRED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecordStatusColor = (status) => {
    switch(status) {
      case 'PRESENT': return 'bg-green-100 text-green-800';
      case 'LATE': return 'bg-yellow-100 text-yellow-800';
      case 'ABSENT': return 'bg-red-100 text-red-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const handleCorrectAttendance = (record) => {
    if (!correctionReason) {
      alert('Please provide a reason for the correction.');
      return;
    }
    const newStatus = correctionStatus.toUpperCase();
    updateAttendanceRecord(record.id, {
      status: newStatus,
      corrected: true,
      previousStatus: record.status,
    });

    const correction = {
      id: Date.now(),
      recordId: record.id,
      studentId: record.studentId,
      courseCode: record.courseCode,
      previousStatus: record.status,
      newStatus: correctionStatus.toUpperCase(),
      reason: correctionReason,
      correctedBy: user?.fullName || 'Lecturer',
      date: new Date().toISOString(),
    };
    const updated = [correction, ...corrections];
    localStorage.setItem('fet_attendance_corrections', JSON.stringify(updated));
    setCorrections(updated);
    setCorrectingRecord(null);
    setCorrectionReason('');
    setCorrectionStatus('Present');
  };

  const handleCloseSession = (session) => {
    if (window.confirm('Close this attendance session?')) {
      closeAttendanceSession(session.id);
      setSelectedSession(null);
      setShowQRDisplay(false);
    }
  };

  const secondsLeft = (ms) => Math.max(0, Math.round((ms - now) / 1000));

  // ===== STUDENT VIEW =====
  if (!isLecturer) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1E1B4B] to-[#2A1F6E] rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-bold">Attendance</h2>
          <p className="text-[#8683BA] mt-1">Mark your attendance</p>
          <p className="text-[#8683BA] text-xs mt-1">📌 Scan QR code displayed by your lecturer</p>
        </div>

        {/* Station QR Display - students who are temporary stations */}
        {isStation && activeSession && (
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-2">
            <p className="text-xs font-semibold text-[#8B5CF6] px-4 pt-3">You are a temporary QR station for this session. You will return to normal attendance after it ends.</p>
            <StationQR session={activeSession} user={user} />
          </div>
        )}

        {/* Active Session Card */}
        {activeSession && (
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#191C1D]">{activeSession.courseCode}</h3>
                <p className="text-[#47464F]">{activeSession.courseName}</p>
                <p className="text-sm text-[#47464F]">Class: {activeSession.className}</p>
                <p className="text-sm text-[#47464F]">Mode: {activeSession.mode === 'STATION_BASED' ? 'Station-Based' : 'Projected QR'}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(activeSession.status)}`}>
                  {activeSession.status}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#47464F]">Token expires in</p>
                <p className="text-2xl font-bold text-[#191C1D]" id="token-countdown">
                  {secondsLeft(activeSession.tokenExpiresAt)}s
                </p>
                <p className="text-xs text-[#47464F] text-right mt-1">manual code: {activeSession.token}</p>
              </div>
            </div>

            {/* Students ONLY scan QR - NEVER generate */}
            {!isStation && (
              <button
                onClick={() => setShowQRScanner(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#3B82F6] text-white rounded-xl font-semibold hover:bg-[#3B82F6]/90 transition-colors"
              >
                <QrCode size={20} />
                Scan QR Code
              </button>
            )}
          </div>
        )}

        {/* No Active Session */}
        {!activeSession && (
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6 text-center">
            <QrCode size={48} className="mx-auto text-[#47464F] opacity-50" />
            <p className="text-[#47464F] mt-2">No active attendance session</p>
            <p className="text-sm text-[#47464F]">Wait for your lecturer to start a session</p>
          </div>
        )}

        {/* Attendance History */}
        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] overflow-hidden">
          <div className="p-6 border-b border-[#C8C5D0]">
            <h3 className="text-lg font-semibold text-[#191C1D]">Attendance History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#EDEEEF] border-b border-[#C8C5D0]">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Course</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Time</th>
                </tr>
              </thead>
              <tbody>
                {studentRecords.map((record) => (
                  <tr key={record.id} className="border-b border-[#C8C5D0] hover:bg-[#EDEEEF]">
                    <td className="py-3 px-4 font-medium text-[#191C1D]">{record.courseCode}</td>
                    <td className="py-3 px-4 text-[#47464F]">{record.date}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRecordStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#47464F]">{record.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {studentRecords.length === 0 && (
            <div className="text-center py-8 text-[#47464F]">No attendance records found</div>
          )}
        </div>

        {/* QR Scanner Modal */}
        {showQRScanner && (
          <QRScanner 
            session={activeSession} 
            user={user} 
            onClose={() => setShowQRScanner(false)}
            onScan={(result) => {
              if (result.success) {
                setShowQRScanner(false);
              }
            }}
          />
        )}
      </div>
    );
  }

  // ===== LECTURER VIEW =====
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1E1B4B] to-[#2A1F6E] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">Attendance Management</h2>
            <p className="text-[#8683BA] mt-1">Manage attendance for your courses</p>
            <p className="text-[#8683BA] text-xs mt-1">📌 Generate QR codes for students to scan</p>
          </div>
          <button
            onClick={() => setShowCreateSession(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
          >
            <Plus size={18} />
            Create Session
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#C8C5D0]">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'current'
              ? 'border-[#3B82F6] text-[#3B82F6]'
              : 'border-transparent text-[#47464F] hover:text-[#191C1D]'
          }`}
        >
          Current Sessions
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'history'
              ? 'border-[#3B82F6] text-[#3B82F6]'
              : 'border-transparent text-[#47464F] hover:text-[#191C1D]'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('corrections')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'corrections'
              ? 'border-[#3B82F6] text-[#3B82F6]'
              : 'border-transparent text-[#47464F] hover:text-[#191C1D]'
          }`}
        >
          Corrections ({corrections.length})
        </button>
      </div>

      {/* Current Sessions */}
      {activeTab === 'current' && (
        <div className="space-y-4">
          {attendanceSessions.filter(s => s.status === 'ACTIVE').map((session) => {
            const records = getAttendanceForSession(session.id);
            const totalStudents = 45; // Mock total
            const present = records.length;
            
            return (
              <div key={session.id} className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#191C1D]">{session.courseCode}</h3>
                    <p className="text-[#47464F]">{session.courseName}</p>
                    <p className="text-sm text-[#47464F]">Class: {session.className}</p>
                    <p className="text-sm text-[#47464F]">Mode: {session.mode === 'STATION_BASED' ? `Station-Based (${session.stationStudentIds?.length || 0} stations)` : 'Projected QR'}</p>
                    <div className="flex gap-4 mt-2">
                      <span className="text-sm text-[#47464F]">Present: <span className="font-bold text-green-600">{present}</span></span>
                      <span className="text-sm text-[#47464F]">Total: <span className="font-bold">{totalStudents}</span></span>
                      <span className="text-sm text-[#47464F]">Percentage: <span className="font-bold">{Math.round((present/totalStudents)*100)}%</span></span>
                    </div>
                    <p className="text-xs text-[#F59E0B] mt-1">⏱ Session expires in {secondsLeft(session.sessionExpiresAt)}s</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedSession(session);
                          setShowQRDisplay(true);
                        }}
                        className="px-3 py-1 bg-[#1E1B4B] text-white rounded-lg text-xs font-medium hover:bg-[#2A1F6E] flex items-center gap-1"
                      >
                        <Monitor size={14} /> Project QR
                      </button>
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="px-3 py-1 bg-[#3B82F6] text-white rounded-lg text-xs font-medium hover:bg-[#3B82F6]/90 flex items-center gap-1"
                      >
                        <QrCode size={14} /> View
                      </button>
                      <button
                        onClick={() => handleCloseSession(session)}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 flex items-center gap-1"
                      >
                        <Square size={14} /> Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {attendanceSessions.filter(s => s.status === 'ACTIVE').length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6 text-center">
              <Calendar size={48} className="mx-auto text-[#47464F] opacity-50" />
              <p className="text-[#47464F] mt-2">No active sessions</p>
              <button
                onClick={() => setShowCreateSession(true)}
                className="mt-2 text-[#3B82F6] hover:underline font-medium"
              >
                Create one now
              </button>
            </div>
          )}

          {/* Expired sessions notice */}
          {attendanceSessions.filter(s => s.status === 'EXPIRED').length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              ⚠️ {attendanceSessions.filter(s => s.status === 'EXPIRED').length} session(s) have expired. Start a new session to continue taking attendance.
            </div>
          )}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#EDEEEF] border-b border-[#C8C5D0]">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Course</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Class</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Present</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceSessions.filter(s => s.status !== 'ACTIVE').map((session) => {
                  const records = getAttendanceForSession(session.id);
                  return (
                    <tr key={session.id} className="border-b border-[#C8C5D0] hover:bg-[#EDEEEF]">
                      <td className="py-3 px-4 font-medium text-[#191C1D]">{session.courseCode}</td>
                      <td className="py-3 px-4 text-[#47464F]">{session.className}</td>
                      <td className="py-3 px-4 text-[#47464F]">{session.createdAt?.split('T')[0]}</td>
                      <td className="py-3 px-4 text-[#47464F]">{records.length}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {attendanceSessions.filter(s => s.status !== 'ACTIVE').length === 0 && (
            <div className="text-center py-8 text-[#47464F]">No past sessions</div>
          )}
        </div>
      )}

      {/* Corrections */}
      {activeTab === 'corrections' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] overflow-hidden">
          <div className="p-6 border-b border-[#C8C5D0]">
            <h3 className="text-lg font-semibold text-[#191C1D]">Attendance Corrections</h3>
            <p className="text-sm text-[#47464F]">Correction history is preserved rather than silently overwritten.</p>
          </div>
          {corrections.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="bg-[#EDEEEF] border-b border-[#C8C5D0]">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Student</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Course</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Previous</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">New</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Reason</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">By</th>
                </tr>
              </thead>
              <tbody>
                {corrections.map(c => (
                  <tr key={c.id} className="border-b border-[#C8C5D0] hover:bg-[#EDEEEF]">
                    <td className="py-3 px-4 font-medium text-[#191C1D]">{c.studentId}</td>
                    <td className="py-3 px-4 text-[#47464F]">{c.courseCode}</td>
                    <td className="py-3 px-4"><span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">{c.previousStatus}</span></td>
                    <td className="py-3 px-4"><span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">{c.newStatus}</span></td>
                    <td className="py-3 px-4 text-[#47464F]">{c.reason}</td>
                    <td className="py-3 px-4 text-[#47464F] text-sm">{c.correctedBy} · {new Date(c.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-[#47464F]">No corrections recorded</div>
          )}
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateSession && (
        <AttendanceSession 
          user={user} 
          onClose={() => setShowCreateSession(false)}
          onCreated={() => setShowCreateSession(false)}
        />
      )}

      {/* QR Display Modal - ONLY FOR LECTURERS */}
      {showQRDisplay && selectedSession && !projectorMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#191C1D]">Attendance QR Code</h3>
              <button 
                onClick={() => {
                  setShowQRDisplay(false);
                  setSelectedSession(null);
                }}
                className="p-1 hover:bg-[#EDEEEF] rounded-lg"
                aria-label="Close"
              >
                <X size={24} className="text-[#47464F]" />
              </button>
            </div>

            <div className="text-center">
              <div className="bg-white border-2 border-[#3B82F6] rounded-xl p-6 inline-block mx-auto">
                <QrCode size={160} className="text-[#1E1B4B]" />
              </div>
              <p className="text-sm text-[#47464F] mt-4 font-mono font-bold">
                {selectedSession.token || 'TOKEN-XXXX'}
              </p>
              <p className="text-xs text-[#47464F] mt-2">
                Students scan this QR to mark attendance
              </p>
              <p className="text-xs text-[#F59E0B] mt-1">
                ⏱ Token expires in: {secondsLeft(selectedSession.tokenExpiresAt)}s
              </p>
              <div className="mt-4 p-3 bg-[#EDEEEF] rounded-xl">
                <p className="text-xs text-[#47464F]">Course: {selectedSession.courseCode}</p>
                <p className="text-xs text-[#47464F]">Class: {selectedSession.className}</p>
                <p className="text-xs text-[#47464F]">Recorded: {getAttendanceForSession(selectedSession.id).length} students</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setProjectorMode(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1E1B4B] text-white rounded-xl font-semibold hover:bg-[#2A1F6E]"
              >
                <Monitor size={18} /> Projector Mode
              </button>
              <button
                onClick={handleCloseSession}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600"
              >
                <Square size={18} /> Close Session
              </button>
            </div>
            <button
              onClick={() => {
                setShowQRDisplay(false);
                setSelectedSession(null);
              }}
              className="mt-3 w-full px-6 py-3 border border-[#C8C5D0] text-[#47464F] rounded-xl font-semibold hover:bg-[#EDEEEF]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Projector / Fullscreen Mode */}
      {projectorMode && selectedSession && (
        <div className="fixed inset-0 bg-[#0a0a1a] z-[100] flex flex-col items-center justify-center p-8">
          <button
            onClick={() => setProjectorMode(false)}
            className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20"
          >
            <X size={18} /> Exit Projector
          </button>
          <div className="flex items-center gap-2 text-white/60 mb-4">
            <Clock size={16} />
            <span>Token expires in: <span className="font-bold">{secondsLeft(selectedSession.tokenExpiresAt)}s</span></span>
            <span className="ml-4">Recorded: <span className="font-bold">{getAttendanceForSession(selectedSession.id).length}</span></span>
          </div>
          <div className="bg-white rounded-3xl p-10 shadow-2xl">
            <QrCode size={420} className="text-[#1E1B4B]" />
          </div>
          <p className="text-white font-mono text-2xl mt-6 font-bold tracking-widest">
            {selectedSession.token || 'TOKEN-XXXX'}
          </p>
          <p className="text-white/60 mt-2">Scan to mark attendance — {selectedSession.courseCode} · {selectedSession.className}</p>
        </div>
      )}

      {/* View Session Modal */}
      {selectedSession && !showQRDisplay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#191C1D]">Session Details</h3>
              <div className="flex items-center gap-2">
                {selectedSession.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleCloseSession(selectedSession)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600"
                  >
                    <Square size={14} /> Close Session
                  </button>
                )}
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="p-1 hover:bg-[#EDEEEF] rounded-lg"
                  aria-label="Close"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><span className="font-semibold">Course:</span> {selectedSession.courseCode} - {selectedSession.courseName}</div>
              <div><span className="font-semibold">Class:</span> {selectedSession.className}</div>
              <div><span className="font-semibold">Mode:</span> {selectedSession.mode}</div>
              <div><span className="font-semibold">Status:</span> {selectedSession.status}</div>
            </div>

            <h4 className="font-semibold text-[#191C1D] mb-2">Attendance Records ({sessionRecords.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#EDEEEF] border-b border-[#C8C5D0]">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[#47464F] uppercase">Student</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[#47464F] uppercase">ID</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[#47464F] uppercase">Status</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[#47464F] uppercase">Time</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[#47464F] uppercase">Correction</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionRecords.length > 0 ? sessionRecords.map((record) => (
                    <tr key={record.id} className="border-b border-[#C8C5D0] hover:bg-[#EDEEEF]">
                      <td className="py-2 px-3 font-medium text-[#191C1D]">{record.studentName || record.studentId}</td>
                      <td className="py-2 px-3 text-[#47464F] text-sm">{record.studentId}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRecordStatusColor(record.status)}`}>
                          {record.status}{record.corrected ? ' (corrected)' : ''}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[#47464F] text-sm">{record.time}</td>
                      <td className="py-2 px-3">
                        {record.status !== 'PRESENT' || record.corrected ? (
                          <button
                            onClick={() => { setCorrectingRecord(record); setCorrectionStatus(record.status === 'PRESENT' ? 'LATE' : 'PRESENT'); }}
                            className="flex items-center gap-1 text-xs text-[#3B82F6] hover:underline"
                          >
                            <Pencil size={14} /> Correct
                          </button>
                        ) : (
                          <button
                            onClick={() => setCorrectingRecord(record)}
                            className="flex items-center gap-1 text-xs text-[#3B82F6] hover:underline"
                          >
                            <Pencil size={14} /> Correct
                          </button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="text-center py-8 text-[#47464F]">No attendance records for this session</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {correctingRecord && (
              <div className="mt-4 p-4 border border-[#C8C5D0] rounded-xl bg-[#F8F9FA]">
                <h5 className="font-semibold text-[#191C1D] mb-2">
                  Correct attendance for {correctingRecord.studentName || correctingRecord.studentId}
                </h5>
                <p className="text-xs text-[#47464F] mb-2">
                  Current status: <span className="font-semibold">{correctingRecord.status}</span> — this correction will be preserved in the audit log.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#47464F] mb-1">New Status</label>
                    <select
                      value={correctionStatus}
                      onChange={(e) => setCorrectionStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-[#C8C5D0] rounded-lg bg-white text-sm"
                    >
                      <option value="Present">Present</option>
                      <option value="Late">Late</option>
                      <option value="Absent">Absent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#47464F] mb-1">Reason *</label>
                    <input
                      type="text"
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      placeholder="e.g., Student provided evidence"
                      className="w-full px-3 py-2 border border-[#C8C5D0] rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleCorrectAttendance(correctingRecord)}
                    disabled={!correctionReason}
                    className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg text-sm font-medium hover:bg-[#3B82F6]/90 disabled:opacity-50"
                  >
                    Save Correction
                  </button>
                  <button
                    onClick={() => { setCorrectingRecord(null); setCorrectionReason(''); }}
                    className="px-4 py-2 border border-[#C8C5D0] rounded-lg text-sm text-[#47464F]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;