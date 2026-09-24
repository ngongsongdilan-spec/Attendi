/**
 * AttendanceDashboard — role-aware attendance hub.
 *
 * Students: scan a short-lived checkpoint QR (camera or manual code) and
 * review their own attendance history.
 *
 * Lecturers/admins: start sessions for their classes, confirm checkpoint
 * students, project the auto-rotating per-student QR (10s TTL, BR-035/061),
 * watch live marking progress, correct records (audited, BR-042), close
 * sessions, and review BR-064 'Attending Requiring Review' flags.
 *
 * @module components/Attendance/AttendanceDashboard
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  QrCode,
  PlayCircle,
  Square,
  Users,
  Flag,
  RefreshCw,
  ChevronDown,
  ClipboardList,
  ShieldAlert,
} from 'lucide-react';
import {
  closeSession,
  getSessionDetail,
  listRecords,
  listReviewFlags,
  listSessions,
} from '../../api/attendance';
import AttendanceSession from './AttendanceSession';
import AttendanceTable from './AttendanceTable';
import QRScanner from './QRScanner';
import StationQR from './StationQR';

const STATUS_BADGE = {
  ACTIVE: 'fet-badge-present',
  EXPIRED: 'fet-badge-warning',
  CLOSED: 'fet-badge-inactive',
};

const isLoadingState = () => ({
  loading: false,
  error: null,
});

const AttendanceDashboard = ({ user }) => {
  const role = user?.role || 'STUDENT';
  const isStudent = role === 'STUDENT';

  const [sessions, setSessions] = useState([]);
  const [sessionsState, setSessionsState] = useState(isLoadingState());
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [records, setRecords] = useState([]);
  const [flags, setFlags] = useState([]);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadSessions = useCallback(async () => {
    setSessionsState({ loading: true, error: null });
    try {
      const data = await listSessions();
      setSessions(data);
      setSessionsState({ loading: false, error: null });
      return data;
    } catch (err) {
      setSessionsState({ loading: false, error: err.message });
      return [];
    }
  }, []);

  const refreshDetail = useCallback(async () => {
    if (!selectedSessionId) return;
    try {
      const data = await getSessionDetail(selectedSessionId);
      setDetail(data);
    } catch {
      // Session may have expired/closed underneath us; the list reload
      // will pick that up on the next poll.
    }
  }, [selectedSessionId]);

  const refreshRecords = useCallback(
    async (sessionId) => {
      try {
        const data = isStudent
          ? await listRecords()
          : await listRecords(sessionId || selectedSessionId || undefined);
        setRecords(data);
      } catch {
        // Non-fatal; the table keeps the last known rows.
      }
    },
    [isStudent, selectedSessionId]
  );

  useEffect(() => {
    if (isStudent) {
      refreshRecords();
    } else {
      loadSessions().then((data) => {
        const live = data.find((s) => s.status === 'ACTIVE');
        setSelectedSessionId((prev) => prev || live?.id || data[0]?.id || null);
      });
      listReviewFlags()
        .then(setFlags)
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live polling while an active session is selected.
  useEffect(() => {
    if (isStudent || !selectedSessionId) return undefined;
    refreshDetail();
    refreshRecords();
    const timer = setInterval(() => {
      refreshDetail();
      refreshRecords();
    }, 3000);
    return () => clearInterval(timer);
  }, [isStudent, selectedSessionId, refreshDetail, refreshRecords]);

  // Students poll their own history periodically in case a scan landed.
  useEffect(() => {
    if (!isStudent) return undefined;
    const timer = setInterval(refreshRecords, 5000);
    return () => clearInterval(timer);
  }, [isStudent, refreshRecords]);

  const handleCreated = async (session) => {
    setShowStartModal(false);
    setSelectedSessionId(session.id);
    await loadSessions();
    setNotice(`Attendance session opened for ${session.course_name || 'the class'}.`);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleClose = async (sessionId) => {
    if (!window.confirm('Close this attendance session? Students will no longer be able to scan.')) {
      return;
    }
    try {
      await closeSession(sessionId);
      setSelectedSessionId(null);
      setDetail(null);
      await loadSessions();
      setNotice('Attendance session closed.');
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      setNotice(err.message);
      setTimeout(() => setNotice(null), 5000);
    }
  };

  const handleSessionSelect = (id) => {
    setSelectedSessionId(id);
    setDetail(null);
    refreshRecords(id);
  };

  const selectedSession = selectedSessionId
    ? sessions.find((s) => s.id === selectedSessionId) || null
    : null;

  return (
    <div className="space-y-6">
      {notice && (
        <div className="rounded-lg bg-[#E8F5E9] text-[#1B5E20] px-4 py-3 text-sm font-medium">
          {notice}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F0B3D]">Attendance</h1>
          <p className="text-sm text-[#47464F]">
            {isStudent
              ? 'Scan the QR code your lecturer projects to check in.'
              : 'Run live attendance sessions and issue rotating QR codes.'}
          </p>
        </div>

        {isStudent ? (
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F0B3D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3F35B5] transition-colors"
          >
            <QrCode size={18} /> Scan QR to check in
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowStartModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F0B3D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3F35B5] transition-colors"
          >
            <PlayCircle size={18} /> Start attendance session
          </button>
        )}
      </div>

      {!isStudent && selectedSession && selectedSession.status === 'ACTIVE' && (
        <div className="rounded-xl border border-[#E5E5F0] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8E7F5] text-[#3F35B5]">
                <Users size={20} />
              </span>
              <div>
                <p className="font-semibold text-[#0F0B3D]">
                  {selectedSession.course_code} — {selectedSession.course_name}
                </p>
                <p className="text-xs text-[#47464F]">
                  Live session · {detail ? `${detail.marked_count} marked · ${detail.total_checkpoints} checkpoints` : 'loading…'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleClose(selectedSession.id)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E53935] px-3 py-2 text-sm font-medium text-[#E53935] hover:bg-[#FDECEA] transition-colors"
              >
                <Square size={16} /> Close session
              </button>
            </div>
          </div>

          {detail ? (
            detail.status === 'ACTIVE' ? (
              <>
                <StationQR session={detail} onRefresh={refreshDetail} />

                <div className="mt-5">
                  <h2 className="mb-2 text-sm font-semibold text-[#0F0B3D] flex items-center gap-2">
                    <ClipboardList size={16} /> Live marks ({detail.record_count})
                  </h2>
                  <AttendanceTable
                    records={detail.records}
                    empty="No one has checked in yet — the QR is waiting."
                    canCorrect
                    onCorrected={refreshDetail}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-[#B45309]">
                This session has ended (no longer accepting scans).
              </p>
            )
          ) : (
            <p className="text-sm text-[#47464F]">Loading live session…</p>
          )}
        </div>
      )}

      {!isStudent && flags.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <ShieldAlert size={16} /> Attendance requiring review ({flags.length})
          </h2>
          <ul className="space-y-1">
            {flags.map((flag) => (
              <li key={flag.id} className="text-xs text-amber-800">
                {flag.student_name} · {flag.reason || flag.failure_code || 'flagged'} ·{' '}
                {new Date(flag.timestamp).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-[#E5E5F0] bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#0F0B3D]">
            {isStudent ? 'My attendance history' : 'Session history'}
          </h2>
        </div>

        {isStudent ? (
          <AttendanceTable records={records} empty="No attendance yet. Scan a QR when your lecturer opens a session." />
        ) : sessionsState.loading ? (
          <p className="flex items-center gap-2 text-sm text-[#47464F]">
            <RefreshCw size={14} className="animate-spin" /> Loading…
          </p>
        ) : sessionsState.error ? (
          <p className="text-sm text-[#E53935]">{sessionsState.error}</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-[#47464F]">
            No sessions yet. Start one to project check-in QR codes for your class.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="fet-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Started</th>
                  <th>Status</th>
                  <th>Marks</th>
                  <th>Checkpoints</th>
                  {!isStudent && <th />}
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr
                    key={session.id}
                    className={selectedSessionId === session.id ? 'bg-[#F6F5FF]' : ''}
                  >
                    <td className="font-medium">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-left hover:text-[#3F35B5]"
                        onClick={() => !isStudent && handleSessionSelect(session.id)}
                      >
                        {session.course_code} — {session.course_name}
                        {!isStudent && <ChevronDown size={14} className="opacity-50" />}
                      </button>
                    </td>
                    <td className="text-sm">{new Date(session.started_at).toLocaleString()}</td>
                    <td>
                      <span className={`fet-badge ${STATUS_BADGE[session.status] || 'fet-badge-inactive'}`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="text-sm">{session.records}</td>
                    <td className="text-sm">{session.checkpoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isStudent && (
        <div className="rounded-xl border border-[#E5E5F0] bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-[#0F0B3D]">
            Records{selectedSession ? ` — ${selectedSession.course_code}` : ''}
          </h2>
          <AttendanceTable
            records={records}
            empty="Choose a session above to see its records, or start one to begin."
            canCorrect
            onCorrected={refreshRecords}
          />
        </div>
      )}

      {showStartModal && (
        <AttendanceSession user={user} onClose={() => setShowStartModal(false)} onCreated={handleCreated} />
      )}
      {showScanner && (
        <QRScanner user={user} onClose={() => setShowScanner(false)} onScanned={() => refreshRecords()} />
      )}
    </div>
  );
};

export default AttendanceDashboard;