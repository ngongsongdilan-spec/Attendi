/**
 * AttendanceSession — start-an-attendance-session modal.
 *
 * The lecturer picks one of their classes and an optional window duration
 * (10-600s; the server defaults to the configured 60s).  Creates a live
 * session whose checkpoints drive the rotating QR projector.
 *
 * @module components/Attendance/AttendanceSession
 */

import React, { useEffect, useState } from 'react';
import { X, PlayCircle, Loader2 } from 'lucide-react';
import { getClasses } from '../../api/academic';
import { startSession } from '../../api/attendance';

const DEFAULT_DURATION = 60;

const AttendanceSession = ({ user, onClose, onCreated }) => {
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classSessionId, setClassSessionId] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(DEFAULT_DURATION);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getClasses()
      .then(setClasses)
      .catch((err) => setError(err.message || 'Could not load your classes.'))
      .finally(() => setLoadingClasses(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!classSessionId || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const session = await startSession(classSessionId, durationSeconds);
      const chosen = classes.find((c) => c.id === classSessionId);
      onCreated({ ...session, course_name: chosen?.course_code || '' });
    } catch (err) {
      setError(err.message || 'Could not start the attendance session.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0F0B3D]">Start attendance session</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#47464F] hover:text-[#0F0B3D]"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="fet-label" htmlFor="attendance-class">
              Class / course
            </label>
            {loadingClasses ? (
              <p className="flex items-center gap-2 text-sm text-[#47464F]">
                <Loader2 size={14} className="animate-spin" /> Loading your classes…
              </p>
            ) : classes.length === 0 ? (
              <p className="text-sm text-[#47464F]">
                You have no class sessions assigned yet. Ask an administrator to set one up.
              </p>
            ) : (
              <select
                id="attendance-class"
                value={classSessionId}
                onChange={(e) => setClassSessionId(e.target.value)}
                required
                className="fet-select"
              >
                <option value="">Select a class to open attendance for…</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.course_code} ({cls.id.slice(0, 8)})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="fet-label" htmlFor="attendance-duration">
              How long students can check in (seconds)
            </label>
            <input
              id="attendance-duration"
              type="number"
              min={10}
              max={600}
              step={10}
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value))}
              className="fet-input"
            />
            <p className="mt-1 text-xs text-[#47464F]">
              Default 60s. QR tokens inside the session rotate every 10 seconds regardless.
            </p>
          </div>

          {error && <p className="text-sm text-[#E53935]">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !classSessionId}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F0B3D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3F35B5] disabled:opacity-50 transition-colors"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
            Open session
          </button>
        </form>
      </div>
    </div>
  );
};

export default AttendanceSession;