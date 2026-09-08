import React, { useState, useEffect } from 'react';
import { QrCode, Calendar, Users, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react';
import AttendanceSession from './AttendanceSession';

const AttendanceDashboard = ({ user }) => {
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [sessions, setSessions] = useState([]);

  const isLecturer = user?.role === 'lecturer' || user?.role === 'admin';

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('fet_attendance_sessions') || '[]');
    setSessions(stored);
  }, []);

  // Get active session
  const activeSession = sessions.find(s => s.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#1E1B4B] to-[#2A1F6E] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">Attendance</h2>
            <p className="text-[#8683BA] mt-1">Track and manage attendance</p>
          </div>
          {isLecturer && (
            <button
              onClick={() => setShowCreateSession(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
            >
              <Plus size={18} />
              Create Session
            </button>
          )}
        </div>
      </div>

      {/* Student View */}
      {!isLecturer && (
        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
          {activeSession ? (
            <div>
              <h3 className="text-lg font-bold text-[#191C1D]">{activeSession.courseCode}</h3>
              <p className="text-[#47464F]">{activeSession.courseName}</p>
              <p className="text-sm text-[#47464F]">Class: {activeSession.className}</p>
              <div className="mt-4 p-4 bg-[#EDEEEF] rounded-xl text-center">
                <QrCode size={48} className="mx-auto text-[#3B82F6] mb-2" />
                <p className="text-sm text-[#47464F]">Scan QR code to mark attendance</p>
                <button className="mt-2 px-6 py-2 bg-[#3B82F6] text-white rounded-xl font-medium hover:bg-[#3B82F6]/90">
                  📸 Scan QR
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <QrCode size={48} className="mx-auto text-[#47464F] opacity-50" />
              <p className="text-[#47464F] mt-2">No active attendance session</p>
            </div>
          )}
        </div>
      )}

      {/* Lecturer View */}
      {isLecturer && (
        <div className="space-y-4">
          {sessions.filter(s => s.status === 'ACTIVE').map(session => (
            <div key={session.id} className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#191C1D]">{session.courseCode}</h3>
                  <p className="text-[#47464F]">{session.courseName}</p>
                  <p className="text-sm text-[#47464F]">Class: {session.className}</p>
                  <div className="flex gap-4 mt-2">
                    <span className="text-sm text-[#47464F]">Mode: <span className="font-medium">{session.mode}</span></span>
                    <span className="text-sm text-[#47464F]">Status: <span className="font-medium text-green-600">ACTIVE</span></span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="p-3 bg-[#EDEEEF] rounded-xl">
                    <QrCode size={24} className="mx-auto text-[#3B82F6]" />
                    <p className="text-xs text-[#47464F] mt-1">{session.token}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {sessions.filter(s => s.status === 'ACTIVE').length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6 text-center">
              <Calendar size={48} className="mx-auto text-[#47464F] opacity-50" />
              <p className="text-[#47464F] mt-2">No active sessions</p>
            </div>
          )}
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateSession && (
        <AttendanceSession 
          user={user} 
          onClose={() => setShowCreateSession(false)}
          onCreated={() => {
            setShowCreateSession(false);
            // Refresh sessions
            const stored = JSON.parse(localStorage.getItem('fet_attendance_sessions') || '[]');
            setSessions(stored);
          }}
        />
      )}
    </div>
  );
};

export default AttendanceDashboard;