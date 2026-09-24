/**
 * AttendanceTable — records table with an audited correction flow.
 *
 * Accepts records from either the live session detail ({corrections[]}) or
 * the records endpoint ({corrected, correction_count}).  When `canCorrect`
 * is set, each row can append a correction with a mandatory reason; the
 * backend never overwrites the original record, only appends (BR-042).
 *
 * @module components/Attendance/AttendanceTable
 */

import React, { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { submitCorrection } from '../../api/attendance';

const AttendanceTable = ({ records, empty = 'No attendance records.', canCorrect, onCorrected }) => {
  const [correctingId, setCorrectingId] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!records || records.length === 0) {
    return <p className="py-6 text-center text-sm text-[#47464F]">{empty}</p>;
  }

  const handleStart = (recordId) => {
    setCorrectingId(recordId);
    setReason('');
    setError('');
  };

  const handleCancel = () => {
    setCorrectingId(null);
    setReason('');
    setError('');
  };

  const handleSubmit = async (recordId) => {
    if (!reason.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await submitCorrection(recordId, reason.trim());
      setCorrectingId(null);
      setReason('');
      onCorrected && onCorrected();
    } catch (err) {
      setError(err.message || 'Could not save the correction.');
    } finally {
      setBusy(false);
    }
  };

  const correctionMeta = (record) => {
    if (record.corrections && record.corrections.length > 0) {
      return { corrected: true, count: record.corrections.length };
    }
    return { corrected: Boolean(record.corrected), count: record.correction_count || 0 };
  };

  return (
    <div className="overflow-x-auto">
      <table className="fet-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Course</th>
            <th>Time</th>
            <th>Status</th>
            <th>Corrections</th>
            {canCorrect && <th />}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const meta = correctionMeta(record);
            return (
              <React.Fragment key={record.id}>
                <tr>
                  <td className="font-medium">{record.student_name}</td>
                  <td className="text-sm">
                    {record.course_code || record.course_name || '—'}
                  </td>
                  <td className="text-sm">
                    {new Date(record.recorded_at).toLocaleString()}
                  </td>
                  <td>
                    <span className={`fet-badge ${record.status === 'PRESENT' ? 'fet-badge-present' : 'fet-badge-inactive'}`}>
                      {record.status || 'PRESENT'}
                    </span>
                  </td>
                  <td className="text-sm">
                    {meta.corrected ? (
                      <span className="inline-flex items-center gap-1 font-medium text-[#B45309]">
                        <Pencil size={13} /> {meta.count}
                      </span>
                    ) : (
                      <span className="text-[#B0AFAF]">—</span>
                    )}
                  </td>
                  {canCorrect && (
                    <td className="text-right">
                      {correctingId === record.id ? (
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="inline-flex items-center gap-1 text-sm text-[#47464F] hover:text-[#E53935]"
                        >
                          <X size={14} /> Cancel
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStart(record.id)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-[#3F35B5] hover:underline"
                        >
                          <Pencil size={13} /> Correct
                        </button>
                      )}
                    </td>
                  )}
                </tr>
                {correctingId === record.id && (
                  <tr>
                    <td colSpan={canCorrect ? 6 : 5} className="bg-[#FBFBFF]">
                      <div className="flex flex-col gap-2 py-1 sm:flex-row sm:items-start">
                        <textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Reason for the correction (required — recorded for the audit trail)"
                          rows={2}
                          className="fet-input flex-1"
                        />
                        <button
                          type="button"
                          disabled={busy || !reason.trim()}
                          onClick={() => handleSubmit(record.id)}
                          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#0F0B3D] px-3 py-2 text-sm font-medium text-white hover:bg-[#3F35B5] disabled:opacity-50"
                        >
                          <Check size={14} /> {busy ? 'Saving…' : 'Save correction'}
                        </button>
                      </div>
                      {error && <p className="pt-1 text-sm text-[#E53935]">{error}</p>}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceTable;