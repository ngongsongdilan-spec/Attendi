/**
 * StationQR — the lecturer's live check-in screen.
 *
 * Confirms which eligible students become checkpoints (BR-050/051) and then
 * projects one checkpoint's QR at a time.  The QR encodes a fresh token the
 * server issues just-in-time; it expires after the TTL (~10s, BR-035) and is
 * consumed on first scan, so a screenshot of an old code is useless
 * (BR-061/062).  Only the named checkpoint student can redeem their own code
 * (BR-039) — the strict binding that defeats proxy attendance.
 *
 * @module components/Attendance/StationQR
 */

import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Clock, QrCode, Save, Users } from 'lucide-react';
import { issueCheckpointToken, selectCheckpoints } from '../../api/attendance';

const StationQR = ({ session, onRefresh }) => {
  const checkpoints = session.checkpoints || [];
  const eligible = session.eligible_students || [];
  const isActive = session.status === 'ACTIVE';

  const [selectedIds, setSelectedIds] = useState(() =>
    (session.checkpoints || []).map((c) => c.student)
  );
  const [saving, setSaving] = useState(false);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState(null);
  const [token, setToken] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [qrUrl, setQrUrl] = useState(null);
  const [tokenError, setTokenError] = useState('');

  // Keep the selection in sync when the session (or its checkpoints) change.
  useEffect(() => {
    setSelectedIds((session.checkpoints || []).map((c) => c.student));
  }, [session.id, session.checkpoints]);

  useEffect(() => {
    const first = (session.checkpoints || [])[0];
    setSelectedCheckpointId((prev) =>
      prev && (session.checkpoints || []).some((c) => c.id === prev) ? prev : first?.id || null
    );
  }, [session.id, session.checkpoints]);

  const currentCheckpoint = useMemo(
    () => checkpoints.find((c) => c.id === selectedCheckpointId) || null,
    [checkpoints, selectedCheckpointId]
  );

  // Auto-rotating token: issue just-in-time, tick a countdown, re-issue when
  // it hits zero so a fresh code is always live when the old one dies.
  // Depends on the stable checkpoint *id* — the parent polls and rebuilds the
  // checkpoints array, so depending on the object would re-issue every poll.
  useEffect(() => {
    if (!currentCheckpoint || !isActive) {
      setQrUrl(null);
      setToken(null);
      setTokenError('');
      return undefined;
    }
    let stopped = false;
    let issuing = false;
    let remaining = 0;

    const issue = async () => {
      try {
        const data = await issueCheckpointToken(currentCheckpoint.id);
        if (stopped) return;
        const ttl = data.ttl_seconds || 10;
        remaining = ttl;
        setToken(data.token);
        setCountdown(ttl);
        const url = await QRCode.toDataURL(data.token, { width: 320, margin: 1 });
        if (!stopped) setQrUrl(url);
        setTokenError('');
      } catch (err) {
        if (!stopped) {
          setTokenError(err.message || 'Could not generate a QR code.');
          setQrUrl(null);
        }
      }
    };

    issuing = true;
    issue().finally(() => {
      issuing = false;
    });
    const tick = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0 && !issuing) {
        issuing = true;
        issue().finally(() => {
          issuing = false;
        });
      } else {
        setCountdown(Math.max(0, remaining));
      }
    }, 1000);

    return () => {
      stopped = true;
      clearInterval(tick);
    };
  }, [currentCheckpoint?.id, isActive]);

  const toggleStudent = (studentId) => {
    setSelectedIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSaveCheckpoints = async () => {
    if (selectedIds.length === 0 || saving) return;
    setSaving(true);
    try {
      await selectCheckpoints(session.id, selectedIds);
      await onRefresh();
    } catch (err) {
      setTokenError(err.message || 'Could not save checkpoints.');
    } finally {
      setSaving(false);
    }
  };

  const markedStudents = new Set(checkpoints.filter((c) => c.marked).map((c) => c.student));

  return (
    <div className="space-y-5">
      {/* Checkpoint confirmation (BR-050/051/053) */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0F0B3D]">
          <Users size={16} /> Confirm checkpoint students
        </h3>
        <p className="mb-3 text-xs text-[#47464F]">
          Select 5–10 physically-present students from different parts of the room. Each becomes a
          temporary checkpoint for this session only. Only enrolled students appear here.
        </p>
        {eligible.length === 0 ? (
          <p className="text-xs text-[#47464F]">
            No enrolled students found for this class yet.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {eligible.map((student) => {
                const checked = selectedIds.includes(student.id);
                return (
                  <label
                    key={student.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      checked
                        ? 'border-[#3F35B5] bg-[#F6F5FF] text-[#0F0B3D]'
                        : 'border-[#E5E5F0] bg-white text-[#47464F] hover:border-[#B9B5E8]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStudent(student.id)}
                      className="accent-[#3F35B5]"
                    />
                    <span className="font-medium">
                      {student.first_name} {student.last_name}
                    </span>
                    <span className="ml-auto text-xs opacity-60">#{student.username.slice(-4)}</span>
                  </label>
                );
              })}
            </div>
            <button
              type="button"
              disabled={saving || selectedIds.length === 0}
              onClick={handleSaveCheckpoints}
              className="inline-flex items-center gap-2 rounded-lg border border-[#3F35B5] px-3 py-2 text-sm font-medium text-[#3F35B5] hover:bg-[#F6F5FF] disabled:opacity-50 transition-colors"
            >
              <Save size={15} /> {saving ? 'Saving…' : `Save ${selectedIds.length} checkpoints`}
            </button>
          </div>
        )}
      </div>

      {/* QR projector */}
      {checkpoints.length > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-[#0F0B3D] to-[#3F35B5] p-5 text-white">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <QrCode size={18} />
              <span className="font-semibold">CHECK-IN QR STATION</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {isActive ? (
                <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1">
                  <Clock size={13} /> Rotates every {countdown}s
                </span>
              ) : (
                <span className="rounded-full bg-white/15 px-3 py-1">Session not active</span>
              )}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <select
              value={selectedCheckpointId || ''}
              onChange={(e) => setSelectedCheckpointId(e.target.value)}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none [&>option]:text-[#0F0B3D]"
              disabled={!isActive}
            >
              {checkpoints.map((checkpoint) => (
                <option key={checkpoint.id} value={checkpoint.id}>
                  {checkpoint.student_name}
                  {checkpoint.marked ? ' ✓ marked' : ''}
                </option>
              ))}
            </select>
            {selectedIds.length > 0 && (
              <span className="rounded-full bg-white/15 px-3 py-2 text-xs">
                {checkpoints.filter((c) => c.marked).length}/{checkpoints.length} marked
              </span>
            )}
          </div>

          {currentCheckpoint ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm">
                <span className="font-bold">{currentCheckpoint.student_name}</span> — scan with the
                student&apos;s own device
              </p>
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt={`QR code for ${currentCheckpoint.student_name}`}
                  className="rounded-xl bg-white p-2"
                  width={220}
                  height={220}
                />
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center rounded-xl bg-white/10 text-center text-xs">
                  {isActive
                    ? tokenError || 'Generating QR…'
                    : 'Session inactive — open a new one to project codes.'}
                </div>
              )}
              <div className="text-center text-xs opacity-80">
                {currentCheckpoint.marked ? (
                  <span className="flex items-center gap-1 font-semibold">
                    <Check size={14} /> Marked present
                  </span>
                ) : isActive ? (
                  'This code expires within seconds and works once.'
                ) : (
                  'Code is paused.'
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-sm opacity-80">Select a checkpoint to project its QR.</p>
          )}
        </div>
      )}

      {tokenError && checkpoints.length === 0 && (
        <p className="text-sm text-[#E53935]">{tokenError}</p>
      )}
    </div>
  );
};

export default StationQR;