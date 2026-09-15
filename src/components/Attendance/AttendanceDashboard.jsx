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

  const studentRecords = user?.matricule 
    ? attendanceRecords.filter(r => r.studentId === user.matricule)
    : [];

  const sessionRecords = selectedSession 
    ? getAttendanceForSession(selectedSession.id) 
    : [];

  const getStatusColor = (status) => {
    switch(status) {
      case 'ACTIVE': return 'fet-badge fet-badge-active';
      case 'CLOSED': return 'fet-badge fet-badge-inactive';
      case 'EXPIRED': return 'fet-badge fet-badge-danger';
      default: return 'fet-badge fet-badge-inactive';
    }
  };

  const getRecordStatusColor = (status) => {
    switch(status) {
      case 'PRESENT': return 'fet-badge fet-badge-present';
      case 'LATE': return 'fet-badge fet-badge-late';
      case 'ABSENT': return 'fet-badge fet-badge-absent';
      default: return 'fet-badge fet-badge-absent';
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
        <div className="fet-welcome-banner">
          <h2 className="text-2xl font-bold">Attendance</h2>
          <p className="text-[#8683BA] mt-1">Mark your attendance</p>
          <p className="text-[#8683BA] text-xs mt-1">Scan QR code displayed by your lecturer</p>
        </div>

        {/* Station QR Display - students who are temporary stations */}
        {isStation && activeSession && (
          <div className="fet-card p-2">
            <p className="text-xs font-semibold text-primary px-4 pt-3">You are a temporary QR station for this session. You will return to normal attendance after it ends.</p>
            <StationQR session={activeSession} user={user} />
          </div>
        )}

        {/* Active Session Card */}
        {activeSession && (
          <div className="fet-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-text-primary">{activeSession.courseCode}</h3>
                <p className="text-text-secondary">{activeSession.courseName}</p>
                <p className="text-sm text-text-secondary">Class: {activeSession.className}</p>
                <p className="text-sm text-text-secondary">Mode: {activeSession.mode === 'STATION_BASED' ? 'Station-Based' : 'Projected QR'}</p>
                <span className={`${getStatusColor(activeSession.status)}`}>
                  {activeSession.status}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-secondary">Token expires in</p>
                <p className="text-2xl font-bold text-text-primary" id="token-countdown">
                  {secondsLeft(activeSession.tokenExpiresAt)}s
                </p>
                <p className="text-xs text-text-secondary text-right mt-1">manual code: {activeSession.token}</p>
              </div>
            </div>

            {/* Students ONLY scan QR - NEVER generate */}
            {!isStation && (
              <button
                onClick={() => setShowQRScanner(true)}
                className="mt-4 w-full fet-btn-primary"
              >
                <QrCode size={20} />
                Scan QR Code
              </button>
            )}
          </div>
        )}

        {/* No Active Session */}
        {!activeSession && (
          <div className="fet-card p-6 text-center">
            <QrCode size={48} className="mx-auto text-text-secondary opacity-50" />
            <p className="text-text-secondary mt-2">No active attendance session</p>
            <p className="text-sm text-text-secondary">Wait for your lecturer to start a session</p>
          </div>
        )}

        {/* Attendance History */}
        <div className="fet-card overflow-hidden">
          <div className="p-6 border-b border-border-default">
            <h3 className="text-lg font-semibold text-text-primary">Attendance History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="fet-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {studentRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="font-medium">{record.courseCode}</td>
                    <td>{record.date}</td>
                    <td>
                      <span className={getRecordStatusColor(record.status)}>
                        {record.status}
                      </span>
                    </td>
                    <td>{record.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {studentRecords.length === 0 && (
            <div className="text-center py-8 text-text-secondary">No attendance records found</div>
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
      <div className="fet-welcome-banner">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">Attendance Management</h2>
            <p className="text-[#8683BA] mt-1">Manage attendance for your courses</p>
            <p className="text-[#8683BA] text-xs mt-1">Generate QR codes for students to scan</p>
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
      <div className="flex gap-2 border-b border-border-default">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'current'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Current Sessions
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('corrections')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'corrections'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
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
            const totalStudents = 45;
            const present = records.length;
            
            return (
              <div key={session.id} className="fet-card p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">{session.courseCode}</h3>
                    <p className="text-text-secondary">{session.courseName}</p>
                    <p className="text-sm text-text-secondary">Class: {session.className}</p>
                    <p className="text-sm text-text-secondary">Mode: {session.mode === 'STATION_BASED' ? `Station-Based (${session.stationStudentIds?.length || 0} stations)` : 'Projected QR'}</p>
                    <div className="flex gap-4 mt-2">
                      <span className="text-sm text-text-secondary">Present: <span className="font-bold text-success">{present}</span></span>
                      <span className="text-sm text-text-secondary">Total: <span className="font-bold">{totalStudents}</span></span>
                      <span className="text-sm text-text-secondary">Percentage: <span className="font-bold">{Math.round((present/totalStudents)*100)}%</span></span>
                    </div>
                    <p className="text-xs text-warning mt-1">Session expires in {secondsLeft(session.sessionExpiresAt)}s</p>
                  </div>
                  <div className="text-right">
                    <span className={getStatusColor(session.status)}>
                      {session.status}
                    </span>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedSession(session);
                          setShowQRDisplay(true);
                        }}
                        className="px-3 py-1 bg-[#0F0B3D] text-white rounded-lg text-xs font-medium hover:bg-[#3F35B5] flex items-center gap-1"
                      >
                        <Monitor size={14} /> Project QR
                      </button>
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-dark flex items-center gap-1"
                      >
                        <QrCode size={14} /> View
                      </button>
                      <button
                        onClick={() => handleCloseSession(session)}
                        className="px-3 py-1 bg-danger text-white rounded-lg text-xs font-medium hover:bg-red-700 flex items-center gap-1"
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
            <div className="fet-card p-6 text-center">
              <Calendar size={48} className="mx-auto text-text-secondary opacity-50" />
              <p className="text-text-secondary mt-2">No active sessions</p>
              <button
                onClick={() => setShowCreateSession(true)}
                className="mt-2 text-primary hover:underline font-medium"
              >
                Create one now
              </button>
            </div>
          )}

          {/* Expired sessions notice */}
          {attendanceSessions.filter(s => s.status === 'EXPIRED').length > 0 && (
            <div className="bg-red-50 border border-red-200 text-danger px-4 py-3 rounded-xl text-sm">
              {attendanceSessions.filter(s => s.status === 'EXPIRED').length} session(s) have expired. Start a new session to continue taking attendance.
            </div>
          )}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="fet-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="fet-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Class</th>
                  <th>Date</th>
                  <th>Present</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceSessions.filter(s => s.status !== 'ACTIVE').map((session) => {
                  const records = getAttendanceForSession(session.id);
                  return (
                    <tr key={session.id}>
                      <td className="font-medium">{session.courseCode}</td>
                      <td>{session.className}</td>
                      <td>{session.createdAt?.split('T')[0]}</td>
                      <td>{records.length}</td>
                      <td>
                        <span className={getStatusColor(session.status)}>
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
            <div className="text-center py-8 text-text-secondary">No past sessions</div>
          )}
        </div>
      )}

      {/* Corrections */}
      {activeTab === 'corrections' && (
        <div className="fet-card overflow-hidden">
          <div className="p-6 border-b border-border-default">
            <h3 className="text-lg font-semibold text-text-primary">Attendance Corrections</h3>
            <p className="text-sm text-text-secondary">Correction history is preserved rather than silently overwritten.</p>
          </div>
          {corrections.length > 0 ? (
            <table className="fet-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Previous</th>
                  <th>New</th>
                  <th>Reason</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {corrections.map(c => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.studentId}</td>
                    <td>{c.courseCode}</td>
                    <td><span className="fet-badge fet-badge-absent">{c.previousStatus}</span></td>
                    <td><span className="fet-badge fet-badge-present">{c.newStatus}</span></td>
                    <td>{c.reason}</td>
                    <td className="text-sm">{c.correctedBy} · {new Date(c.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-text-secondary">No corrections recorded</div>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="fet-card bg-white rounded-2xl shadow-modal max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-text-primary">Attendance QR Code</h3>
              <button 
                onClick={() => {
                  setShowQRDisplay(false);
                  setSelectedSession(null);
                }}
                className="p-1 hover:bg-page-bg rounded-lg"
                aria-label="Close"
              >
                <X size={24} className="text-text-secondary" />
              </button>
            </div>

            <div className="text-center">
              <div className="bg-white border-2 border-primary rounded-xl p-6 inline-block mx-auto">
                <QrCode size={160} className="text-[#0F0B3D]" />
              </div>
              <p className="text-sm text-text-secondary mt-4 font-mono font-bold">
                {selectedSession.token || 'TOKEN-XXXX'}
              </p>
              <p className="text-xs text-text-secondary mt-2">
                Students scan this QR to mark attendance
              </p>
              <p className="text-xs text-warning mt-1">
                Token expires in: {secondsLeft(selectedSession.tokenExpiresAt)}s
              </p>
              <div className="mt-4 p-3 bg-page-bg rounded-xl">
                <p className="text-xs text-text-secondary">Course: {selectedSession.courseCode}</p>
                <p className="text-xs text-text-secondary">Class: {selectedSession.className}</p>
                <p className="text-xs text-text-secondary">Recorded: {getAttendanceForSession(selectedSession.id).length} students</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setProjectorMode(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0F0B3D] text-white rounded-xl font-semibold hover:bg-[#3F35B5]"
              >
                <Monitor size={18} /> Projector Mode
              </button>
              <button
                onClick={handleCloseSession}
                className="flex items-center justify-center gap-2 px-4 py-3 fet-btn-danger"
              >
                <Square size={18} /> Close Session
              </button>
            </div>
            <button
              onClick={() => {
                setShowQRDisplay(false);
                setSelectedSession(null);
              }}
              className="mt-3 w-full fet-btn-secondary"
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
            <QrCode size={420} className="text-[#0F0B3D]" />
          </div>
          <p className="text-white font-mono text-2xl mt-6 font-bold tracking-widest">
            {selectedSession.token || 'TOKEN-XXXX'}
          </p>
          <p className="text-white/60 mt-2">Scan to mark attendance — {selectedSession.courseCode} · {selectedSession.className}</p>
        </div>
      )}

      {/* View Session Modal */}
      {selectedSession && !showQRDisplay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="fet-card bg-white rounded-2xl shadow-modal max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-text-primary">Session Details</h3>
              <div className="flex items-center gap-2">
                {selectedSession.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleCloseSession(selectedSession)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-danger text-white rounded-lg text-xs font-medium hover:bg-red-700"
                  >
                    <Square size={14} /> Close Session
                  </button>
                )}
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="p-1 hover:bg-page-bg rounded-lg"
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

            <h4 className="font-semibold text-text-primary mb-2">Attendance Records ({sessionRecords.length})</h4>
            <div className="overflow-x-auto">
              <table className="fet-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th>Correction</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionRecords.length > 0 ? sessionRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="font-medium">{record.studentName || record.studentId}</td>
                      <td className="text-sm">{record.studentId}</td>
                      <td>
                        <span className={getRecordStatusColor(record.status)}>
                          {record.status}{record.corrected ? ' (corrected)' : ''}
                        </span>
                      </td>
                      <td className="text-sm">{record.time}</td>
                      <td>
                        {record.status !== 'PRESENT' || record.corrected ? (
                          <button
                            onClick={() => { setCorrectingRecord(record); setCorrectionStatus(record.status === 'PRESENT' ? 'LATE' : 'PRESENT'); }}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Pencil size={14} /> Correct
                          </button>
                        ) : (
                          <button
                            onClick={() => setCorrectingRecord(record)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Pencil size={14} /> Correct
                          </button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="text-center py-8 text-text-secondary">No attendance records for this session</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {correctingRecord && (
              <div className="mt-4 p-4 border border-border-default rounded-xl bg-page-bg">
                <h5 className="font-semibold text-text-primary mb-2">
                  Correct attendance for {correctingRecord.studentName || correctingRecord.studentId}
                </h5>
                <p className="text-xs text-text-secondary mb-2">
                  Current status: <span className="font-semibold">{correctingRecord.status}</span> — this correction will be preserved in the audit log.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="fet-label">New Status</label>
                    <select
                      value={correctionStatus}
                      onChange={(e) => setCorrectionStatus(e.target.value)}
                      className="fet-select"
                    >
                      <option value="Present">Present</option>
                      <option value="Late">Late</option>
                      <option value="Absent">Absent</option>
                    </select>
                  </div>
                  <div>
                    <label className="fet-label">Reason *</label>
                    <input
                      type="text"
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      placeholder="e.g., Student provided evidence"
                      className="fet-input"
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleCorrectAttendance(correctingRecord)}
                    disabled={!correctionReason}
                    className="fet-btn-primary disabled:opacity-50"
                  >
                    Save Correction
                  </button>
                  <button
                    onClick={() => { setCorrectingRecord(null); setCorrectionReason(''); }}
                    className="fet-btn-secondary"
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
