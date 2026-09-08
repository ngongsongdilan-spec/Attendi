import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Calendar, Users, CheckCircle, Clock, AlertCircle, QrCode, Plus, Eye, X } from 'lucide-react';
import AttendanceSession from './AttendanceSession';
import QRScanner from './QRScanner';
import StationQR from './StationQR';
import AttendanceTable from './AttendanceTable';

const AttendanceDashboard = ({ user }) => {
  const { 
    attendanceSessions, 
    attendanceRecords, 
    getActiveSession,
    getAttendanceForSession 
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState('current');
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isStation, setIsStation] = useState(false);
  const [showQRDisplay, setShowQRDisplay] = useState(false);

  const userRole = user?.role || 'student';
  const isLecturer = userRole === 'lecturer' || userRole === 'admin';
  
  const activeSession = getActiveSession();
  const isStudentStation = activeSession?.stationStudentIds?.includes(user?.matricule);

  useEffect(() => {
    if (isStudentStation) {
      setIsStation(true);
    }
  }, [isStudentStation]);

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

        {/* Active Session Card */}
        {activeSession && (
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#191C1D]">{activeSession.courseCode}</h3>
                <p className="text-[#47464F]">{activeSession.courseName}</p>
                <p className="text-sm text-[#47464F]">Class: {activeSession.className}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(activeSession.status)}`}>
                  {activeSession.status}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#47464F]">Token expires in</p>
                <p className="text-2xl font-bold text-[#191C1D]" id="token-countdown">
                  {Math.max(0, Math.round((activeSession.tokenExpiresAt - Date.now()) / 1000))}s
                </p>
              </div>
            </div>

            {/* ✅ Students ONLY scan QR - NEVER generate */}
            <button
              onClick={() => setShowQRScanner(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#3B82F6] text-white rounded-xl font-semibold hover:bg-[#3B82F6]/90 transition-colors"
            >
              <QrCode size={20} />
              Scan QR Code
            </button>
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
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
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
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#191C1D]">{session.courseCode}</h3>
                    <p className="text-[#47464F]">{session.courseName}</p>
                    <p className="text-sm text-[#47464F]">Class: {session.className}</p>
                    <div className="flex gap-4 mt-2">
                      <span className="text-sm text-[#47464F]">Present: <span className="font-bold text-green-600">{present}</span></span>
                      <span className="text-sm text-[#47464F]">Total: <span className="font-bold">{totalStudents}</span></span>
                      <span className="text-sm text-[#47464F]">Percentage: <span className="font-bold">{Math.round((present/totalStudents)*100)}%</span></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                    <div className="mt-2 flex gap-2">
                      {/* ✅ Lecturers can view QR */}
                      <button
                        onClick={() => {
                          setSelectedSession(session);
                          setShowQRDisplay(true);
                        }}
                        className="px-3 py-1 bg-[#3B82F6] text-white rounded-lg text-xs font-medium hover:bg-[#3B82F6]/90 flex items-center gap-1"
                      >
                        <QrCode size={14} /> Show QR
                      </button>
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300 flex items-center gap-1"
                      >
                        <Eye size={14} /> View
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
                {attendanceSessions.filter(s => s.status === 'CLOSED').map((session) => {
                  const records = getAttendanceForSession(session.id);
                  return (
                    <tr key={session.id} className="border-b border-[#C8C5D0] hover:bg-[#EDEEEF]">
                      <td className="py-3 px-4 font-medium text-[#191C1D]">{session.courseCode}</td>
                      <td className="py-3 px-4 text-[#47464F]">{session.className}</td>
                      <td className="py-3 px-4 text-[#47464F]">{session.createdAt?.split('T')[0]}</td>
                      <td className="py-3 px-4 text-[#47464F]">{records.length}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">CLOSED</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {attendanceSessions.filter(s => s.status === 'CLOSED').length === 0 && (
            <div className="text-center py-8 text-[#47464F]">No past sessions</div>
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
      {showQRDisplay && selectedSession && (
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
              >
                <X size={24} className="text-[#47464F]" />
              </button>
            </div>

            <div className="text-center">
              <div className="bg-white border-2 border-[#3B82F6] rounded-xl p-6 inline-block mx-auto">
                <QrCode size={160} className="text-[#1E1B4B]" />
              </div>
              <p className="text-sm text-[#47464F] mt-4 font-mono">
                {selectedSession.token || 'TOKEN-XXXX'}
              </p>
              <p className="text-xs text-[#47464F] mt-2">
                Students scan this QR to mark attendance
              </p>
              <p className="text-xs text-[#F59E0B] mt-1">
                ⏱ Token expires in: {Math.max(0, Math.round((selectedSession.tokenExpiresAt - Date.now()) / 1000))}s
              </p>
              <div className="mt-4 p-3 bg-[#EDEEEF] rounded-xl">
                <p className="text-xs text-[#47464F]">Course: {selectedSession.courseCode}</p>
                <p className="text-xs text-[#47464F]">Class: {selectedSession.className}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowQRDisplay(false);
                setSelectedSession(null);
              }}
              className="mt-4 w-full px-6 py-3 bg-[#3B82F6] text-white rounded-xl font-semibold hover:bg-[#3B82F6]/90"
            >
              Close QR
            </button>
          </div>
        </div>
      )}

      {/* View Session Modal */}
      {selectedSession && !showQRDisplay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#191C1D]">Session Details</h3>
              <button 
                onClick={() => setSelectedSession(null)}
                className="p-1 hover:bg-[#EDEEEF] rounded-lg"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><span className="font-semibold">Course:</span> {selectedSession.courseCode} - {selectedSession.courseName}</div>
              <div><span className="font-semibold">Class:</span> {selectedSession.className}</div>
              <div><span className="font-semibold">Mode:</span> {selectedSession.mode}</div>
              <div><span className="font-semibold">Status:</span> {selectedSession.status}</div>
            </div>

            <h4 className="font-semibold text-[#191C1D] mb-2">Attendance Records ({sessionRecords.length})</h4>
            <AttendanceTable records={sessionRecords} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;