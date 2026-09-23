/**
 * AttendanceDashboard — student QR scanning, wired to POST /attendance/scan/.
 *
 * Identity is never transmitted: the backend marks attendance for
 * session-derived request.user only.  Every failure mode from the API's
 * error envelope gets a human hint; unmapped codes fall back to the
 * server's message.
 *
 * @module components/Attendance/AttendanceDashboard
 */

import React, { useState } from 'react';
import { QrCode, CheckCircle2 } from 'lucide-react';
import { scanAttendance } from '../../api/attendance';

const ERROR_HINTS = {
  TOKEN_EXPIRED: 'This QR code has expired. Ask your lecturer for a fresh one.',
  TOKEN_ALREADY_USED: 'This code has already been used.',
  INVALID_TOKEN: 'That is not a valid attendance code.',
  TOKEN_STUDENT_MISMATCH: 'This QR code was issued to a different student.',
  NOT_ELIGIBLE: 'You are not eligible for this class.',
  SESSION_EXPIRED: 'This attendance session has ended.',
  ALREADY_MARKED: 'You are already marked for this session.',
  RATE_LIMITED: 'Too many attempts — wait a minute and try again.',
  UNAUTHENTICATED: 'Session expired. Please log in again.',
};

const AttendanceDashboard = ({ user }) => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const role = user?.role || 'STUDENT';
  const isStudent = role === 'STUDENT';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed || isLoading) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await scanAttendance(trimmed);
      setResult(data);
      setToken('');
    } catch (err) {
      setError({
        code: err.code || 'UNKNOWN',
        message: ERROR_HINTS[err.code] || err.message || 'Scan failed. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-[#191C1D]">Attendance</h2>
        <p className="text-[#47464F]">Scan your lecturer's checkpoint QR to record attendance</p>
      </div>

      {!isStudent ? (
        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-8 text-center">
          <QrCode size={48} className="mx-auto text-[#47464F] opacity-50" />
          <p className="text-[#47464F] mt-4">
            Scanning is available to student accounts only. Lecturers issue checkpoint
            QR codes from the session controls.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
          {result ? (
            <div className="text-center py-4">
              <CheckCircle2 size={56} className="mx-auto text-green-600" />
              <h3 className="text-xl font-semibold text-[#191C1D] mt-4">Attendance recorded</h3>
              <p className="text-[#47464F] mt-1 text-sm">
                {new Date(result.recorded_at).toLocaleString()}
              </p>
              <p className="text-[#47464F] mt-1 text-xs font-mono break-all">
                {result.attendance_record_id}
              </p>
              <button
                onClick={() => setResult(null)}
                className="mt-6 px-6 py-2 bg-[#1E1B4B] text-white rounded-xl text-sm font-semibold hover:bg-[#2A1F6E]"
              >
                Scan another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label htmlFor="attendance-token" className="block text-sm font-medium text-[#191C1D]">
                QR code content
              </label>
              <input
                id="attendance-token"
                type="text"
                value={token}
                onChange={(e) => { setToken(e.target.value); setError(null); }}
                placeholder="Paste or scan the checkpoint code"
                className="w-full px-4 py-3 border border-[#C8C5D0] rounded-xl focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
                autoComplete="off"
                required
              />
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  <p>{error.message}</p>
                  {error.code && error.code !== 'UNKNOWN' && (
                    <p className="text-xs mt-1 font-mono opacity-70">{error.code}</p>
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={isLoading || !token.trim()}
                className="w-full py-3 bg-[#1E1B4B] text-white rounded-xl font-semibold hover:bg-[#2A1F6E] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <QrCode size={18} />
                {isLoading ? 'Scanning...' : 'Scan'}
              </button>
              <p className="text-xs text-[#47464F] text-center">
                Codes expire after 10 seconds and can only be used once.
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;
