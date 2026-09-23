import React, { useState, useEffect, useCallback } from 'react';
import { Save, FileText, Users, Search, CheckCircle, Plus, X, RotateCw } from 'lucide-react';
import { getAssessments, createAssessment, updateAssessment } from '../../api/assessments';
import { getStudents } from '../../api/users';
import { getCourses } from '../../api/academic';

const ACADEMIC_ROLES = ['lecturer', 'admin'];

/**
 * Continuous assessment — BR-130..132.
 *  - Academic view: create/release assessments for students (audited).
 *  - Student view: own released rows only; private notes are stripped
 *    server-side (BR-131).
 */
const ContinuousAssessment = ({ user }) => {
  const isAcademic = ACADEMIC_ROLES.includes(user?.displayRole);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Academic-only state
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    student: '',
    score: '',
    private_notes: '',
    released: false,
    course: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAssessments();
      setRows(data);
    } catch (err) {
      setError(err.message || 'Could not load assessments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Pickers are academic-only; students who hit 403 just never see the form.
  useEffect(() => {
    if (!isAcademic) return;
    let cancelled = false;
    Promise.all([getStudents(), getCourses()])
      .then(([studentRows, courseRows]) => {
        if (!cancelled) {
          setStudents(studentRows);
          setCourses(courseRows);
        }
      })
      .catch(() => { /* pickers degrade gracefully; form stays hidden-safe */ });
    return () => { cancelled = true; };
  }, [isAcademic]);

  const flash = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 4000);
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({ student: '', score: '', private_notes: '', released: false, course: '' });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormData({
      student: row.student,
      score: row.score ?? '',
      private_notes: row.private_notes || '',
      released: row.released,
      course: row.course || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (editing) {
        await updateAssessment(editing.id, {
          score: formData.score === '' ? null : formData.score,
          private_notes: formData.private_notes,
          released: formData.released,
        });
        flash('Assessment updated');
      } else {
        await createAssessment({
          student: formData.student,
          score: formData.score === '' ? null : formData.score,
          private_notes: formData.private_notes,
          released: formData.released,
          course: formData.course || undefined,
        });
        flash(formData.released ? 'Assessment created and released' : 'Assessment saved as draft');
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err.message || 'Could not save assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRelease = async (row) => {
    setError('');
    try {
      await updateAssessment(row.id, { released: !row.released });
      flash(row.released ? 'Assessment unpublished' : 'Assessment released to student');
      await load();
    } catch (err) {
      setError(err.message || 'Could not change release state');
    }
  };

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const studentLabel = (row) =>
    row.student_name || students.find((s) => s.id === row.student)?.username || 'Student';

  const filteredRows = rows.filter((row) =>
    !searchTerm ||
    studentLabel(row).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ===== STUDENT VIEW =====
  if (!isAcademic) {
    return (
      <div className="space-y-6">
        <div className="fet-welcome-banner">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold">Assessment Results</h2>
              <p className="text-[#8683BA] mt-1">View your released continuous assessment results</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-[#8683BA]">Released</p>
              <p className="text-xl font-bold">{rows.length}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-2">
            <span>{error}</span>
            <button onClick={load} className="flex items-center gap-1 font-semibold hover:underline">
              <RotateCw size={14} /> Retry
            </button>
          </div>
        )}

        <div className="fet-card overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-text-secondary">Loading results…</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-text-secondary opacity-50" />
              <p className="text-text-secondary mt-4">No results have been released yet.</p>
              <p className="text-sm text-text-secondary">Your lecturer will publish results here once available.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="fet-table">
                <thead>
                  <tr className="bg-page-bg border-b border-border-default">
                    <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Score</th>
                    <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Released</th>
                    <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border-default hover:bg-page-bg transition-colors">
                      <td className="py-3 px-4 font-bold text-text-primary">{row.score ?? '—'}</td>
                      <td className="py-3 px-4">
                        <span className={row.status === 'official' ? 'fet-badge fet-badge-active' : 'fet-badge fet-badge-pending'}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="fet-badge fet-badge-info">{row.released ? 'Released' : 'Pending'}</span>
                      </td>
                      <td className="py-3 px-4 text-text-secondary text-[13px]">{formatDate(row.updated_at || row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== ACADEMIC VIEW =====
  return (
    <div className="space-y-6">
      <div className="fet-welcome-banner">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Continuous Assessment</h2>
            <p className="text-[#8683BA] mt-1">Create, score, and release student assessments</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-[#8683BA]">Records</p>
            <p className="text-xl font-bold">{rows.length}</p>
          </div>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle size={18} /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-2">
          <span>{error}</span>
          <button onClick={load} className="flex items-center gap-1 font-semibold hover:underline">
            <RotateCw size={14} /> Retry
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={18} />
          <input
            type="text"
            placeholder="Search by student name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 fet-input"
          />
        </div>
        <button onClick={openCreate} className="fet-btn-primary flex items-center gap-2">
          <Plus size={18} /> New Assessment
        </button>
      </div>

      <div className="fet-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="fet-table">
            <thead>
              <tr className="bg-page-bg border-b border-border-default">
                <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Student</th>
                <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Score</th>
                <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Status</th>
                <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Released</th>
                <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Date</th>
                <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-border-default hover:bg-page-bg transition-colors">
                  <td className="py-3 px-4 font-medium text-text-primary">{studentLabel(row)}</td>
                  <td className="py-3 px-4 font-bold text-text-primary">{row.score ?? '—'}</td>
                  <td className="py-3 px-4">
                    <span className={row.status === 'official' ? 'fet-badge fet-badge-active' : 'fet-badge fet-badge-pending'}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={row.released ? 'fet-badge fet-badge-info' : 'fet-badge fet-badge-inactive'}>
                      {row.released ? 'Released' : 'Draft'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-text-secondary text-[13px]">{formatDate(row.updated_at || row.created_at)}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleToggleRelease(row)} className="text-[13px] text-primary hover:underline">
                        {row.released ? 'Unrelease' : 'Release'}
                      </button>
                      <button onClick={() => openEdit(row)} className="text-[13px] text-primary hover:underline">
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="text-center py-8 text-text-secondary">Loading assessments…</div>}
        {!loading && filteredRows.length === 0 && (
          <div className="text-center py-8 text-text-secondary">
            No assessments yet. Create the first one!
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border-default">
              <h3 className="text-[15px] font-bold text-text-primary">
                {editing ? 'Edit Assessment' : 'New Assessment'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-page-bg rounded-lg transition-colors">
                <X size={24} className="text-text-secondary" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {!editing && (
                <div>
                  <label className="fet-label">Student</label>
                  <select
                    value={formData.student}
                    onChange={(e) => setFormData(prev => ({ ...prev, student: e.target.value }))}
                    required
                    className="w-full px-4 py-2 fet-select"
                  >
                    <option value="">Select student…</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {`${s.first_name} ${s.last_name}`.trim() || s.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!editing && (
                <div>
                  <label className="fet-label">Course (optional)</label>
                  <select
                    value={formData.course}
                    onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
                    className="w-full px-4 py-2 fet-select"
                  >
                    <option value="">No specific course</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{`${c.code} — ${c.name}`}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="fet-label">Score (0–100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.score}
                  onChange={(e) => setFormData(prev => ({ ...prev, score: e.target.value }))}
                  className="w-full px-4 py-2 fet-input"
                />
              </div>

              <div>
                <label className="fet-label">Private notes (lecturers only — never shown to students)</label>
                <textarea
                  value={formData.private_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, private_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 fet-input resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={formData.released}
                  onChange={(e) => setFormData(prev => ({ ...prev, released: e.target.checked }))}
                />
                Release to student immediately
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
                <button type="button" onClick={() => setShowForm(false)} className="fet-btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="fet-btn-primary flex items-center gap-2 disabled:opacity-50">
                  <Save size={18} />
                  {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContinuousAssessment;
