import React, { useState, useEffect, useCallback } from 'react';
import { Upload, X, FileText, Check, AlertCircle, RotateCw, Send } from 'lucide-react';
import {
  getContributions,
  getProjects,
  getProject,
  submitContribution,
  reviewContribution,
} from '../../api/projects';

const STATUS_BADGE = {
  pending_review: 'fet-badge fet-badge-pending',
  approved: 'fet-badge fet-badge-active',
  rejected: 'fet-badge fet-badge-danger',
};

/**
 * Contribution tracking page (BR-120..122, BR-161):
 *  - participants submit task evidence (evidence_ref must be a task from the
 *    same project — INVALID_EVIDENCE otherwise);
 *  - project academics review entries (approve/reject, audited server-side).
 */
const ContributionForm = ({ user }) => {
  const isAcademic = ['lecturer', 'admin'].includes(user?.displayRole);

  const [contributions, setContributions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ project: '', evidence_ref: '' });
  const [projectTasks, setProjectTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await getContributions();
      setContributions(rows);
    } catch (err) {
      setError(err.message || 'Could not load contributions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch((err) => setError(err.message || 'Could not load projects'));
  }, []);

  // Load the chosen project's tasks so evidence can only reference them.
  useEffect(() => {
    if (!formData.project) {
      setProjectTasks([]);
      return;
    }
    let cancelled = false;
    setTasksLoading(true);
    setFormData((prev) => ({ ...prev, evidence_ref: '' }));
    getProject(formData.project)
      .then((bundle) => !cancelled && setProjectTasks(bundle.tasks || []))
      .catch((err) => !cancelled && setFormError(err.message || 'Could not load tasks'))
      .finally(() => !cancelled && setTasksLoading(false));
    return () => { cancelled = true; };
  }, [formData.project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await submitContribution(formData.project, {
        evidence_type: 'task',
        evidence_ref: formData.evidence_ref,
      });
      setShowForm(false);
      setFormData({ project: '', evidence_ref: '' });
      await load();
    } catch (err) {
      setFormError(err.message || 'Could not submit contribution');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (row, approved) => {
    let notes = '';
    if (!approved) {
      notes = window.prompt('Reviewer notes (optional):', '') ?? '';
    }
    setError('');
    setBusyId(row.id);
    try {
      await reviewContribution(row.id, { approved, notes });
      await load();
    } catch (err) {
      setError(err.message || 'Could not review contribution');
    } finally {
      setBusyId(null);
    }
  };

  const projectName = (id) => projects.find((p) => p.id === id)?.title || 'Project';

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-bold text-text-primary">Contributions</h2>
          <p className="text-text-secondary">Submit task evidence and track reviews</p>
        </div>
        {projects.length > 0 && (
          <button
            onClick={() => { setFormError(''); setShowForm(true); }}
            className="fet-btn-primary flex items-center gap-2"
          >
            <Upload size={18} /> Submit Contribution
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-2">
          <span>{error}</span>
          <button onClick={load} className="flex items-center gap-1 font-semibold hover:underline">
            <RotateCw size={14} /> Retry
          </button>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="fet-card p-6 text-center text-text-secondary">Loading contributions…</div>
        ) : contributions.length === 0 ? (
          <div className="text-center py-12 fet-card">
            <FileText size={48} className="mx-auto text-text-secondary opacity-50" />
            <p className="text-text-secondary mt-4">No contributions yet.</p>
            <p className="text-sm text-text-secondary">
              Submit evidence from completed project tasks to have it reviewed.
            </p>
          </div>
        ) : (
          contributions.map((row) => (
            <div key={row.id} className="fet-card p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={STATUS_BADGE[row.status] || 'fet-badge'}>
                      {row.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-text-secondary">{projectName(row.project)}</span>
                    <span className="text-xs text-text-secondary">{formatDate(row.created_at)}</span>
                  </div>
                  <p className="text-[14px] font-medium text-text-primary">
                    {row.evidence_type === 'task' ? 'Task evidence' : row.evidence_type}
                    <span className="text-text-secondary font-normal"> — {row.student_name}</span>
                  </p>
                  <p className="text-[13px] text-text-secondary mt-1 break-all">
                    Ref: {row.evidence_ref}
                  </p>
                  {row.notes && (
                    <p className="text-[13px] text-text-secondary mt-1 italic">“{row.notes}”</p>
                  )}
                </div>
                {row.status === 'pending_review' && isAcademic && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleReview(row, true)}
                      disabled={busyId === row.id}
                      className="fet-btn-primary text-[13px] px-3 py-1 flex items-center gap-1 disabled:opacity-50"
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleReview(row, false)}
                      disabled={busyId === row.id}
                      className="fet-btn-secondary text-[13px] px-3 py-1 flex items-center gap-1 disabled:opacity-50"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-border-default">
              <h3 className="text-[15px] font-bold text-text-primary">Submit Contribution</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-page-bg rounded-lg transition-colors">
                <X size={24} className="text-text-secondary" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle size={16} /> {formError}
                </div>
              )}
              <div>
                <label className="fet-label">Project</label>
                <select
                  value={formData.project}
                  onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
                  required
                  className="w-full px-4 py-2 fet-select"
                >
                  <option value="">Select project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="fet-label">Evidence — completed task in this project</label>
                <select
                  value={formData.evidence_ref}
                  onChange={(e) => setFormData(prev => ({ ...prev, evidence_ref: e.target.value }))}
                  required
                  disabled={!formData.project || tasksLoading}
                  className="w-full px-4 py-2 fet-select"
                >
                  <option value="">
                    {tasksLoading ? 'Loading tasks…' : 'Select task…'}
                  </option>
                  {projectTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status})
                    </option>
                  ))}
                </select>
                {formData.project && !tasksLoading && projectTasks.length === 0 && (
                  <p className="text-xs text-text-secondary mt-1">
                    This project has no tasks yet — add one first.
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
                <button type="button" onClick={() => setShowForm(false)} className="fet-btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="fet-btn-primary flex items-center gap-2 disabled:opacity-50">
                  <Send size={16} />
                  {submitting ? 'Submitting…' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContributionForm;
