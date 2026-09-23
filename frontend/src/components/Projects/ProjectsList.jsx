import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, FolderKanban, RotateCw, Archive, ArrowRight } from 'lucide-react';
import { getProjects, createProject, updateProjectStatus } from '../../api/projects';

const ACADEMIC_ROLES = ['lecturer', 'admin'];

const STATUS_BADGE = {
  draft: 'fet-badge fet-badge-pending',
  active: 'fet-badge fet-badge-active',
  completed: 'fet-badge fet-badge-info',
  archived: 'fet-badge fet-badge-inactive',
};

// Forward one-step lifecycle transitions (BR-140..143); archive only from
// completed (BR-160).
const NEXT_ACTION = {
  draft: { label: 'Activate', next: 'active', icon: ArrowRight },
  active: { label: 'Complete', next: 'completed', icon: ArrowRight },
  completed: { label: 'Archive', next: 'archived', icon: Archive },
};

/**
 * Visible projects (own, supervised, or participating) with the one-step
 * lifecycle flow and archive action; creates start as drafts server-side.
 */
const ProjectsList = ({ user }) => {
  const isAcademic = ACADEMIC_ROLES.includes(user?.displayRole);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await getProjects();
      setProjects(rows);
    } catch (err) {
      setError(err.message || 'Could not load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await createProject({ title });
      setShowForm(false);
      setTitle('');
      flash('Project created as draft');
      await load();
    } catch (err) {
      setFormError(err.message || 'Could not create project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransition = async (project, action) => {
    const verb = action.next === 'archived'
      ? 'archive'
      : `${action.label.toLowerCase()} “${project.title}”`;
    if (action.next === 'archived' && !window.confirm(`Archive “${project.title}”? Archived projects are read-only.`)) {
      return;
    }
    setError('');
    setBusyId(project.id);
    try {
      await updateProjectStatus(project.id, action.next);
      flash(`Project ${action.next === 'archived' ? 'archived' : `moved to ${action.next}`}`);
      await load();
    } catch (err) {
      setError(err.message || `Could not ${verb}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-bold text-text-primary">Projects</h2>
          <p className="text-text-secondary">Track project lifecycle from draft to completion</p>
        </div>
        {isAcademic && (
          <button onClick={() => { setFormError(''); setShowForm(true); }} className="fet-btn-primary flex items-center gap-2">
            <Plus size={18} /> New Project
          </button>
        )}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <RotateCw size={16} /> {success}
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

      {loading ? (
        <div className="fet-card p-6 text-center text-text-secondary">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 fet-card">
          <FolderKanban size={48} className="mx-auto text-text-secondary opacity-50" />
          <p className="text-text-secondary mt-4">No projects visible yet.</p>
          {isAcademic && <p className="text-sm text-text-secondary">Create the first project to get started.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const action = NEXT_ACTION[project.status];
            const ActionIcon = action?.icon;
            const busy = busyId === project.id;
            return (
              <div key={project.id} className="fet-card p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FolderKanban size={20} className="text-primary" />
                  </div>
                  <span className={STATUS_BADGE[project.status] || 'fet-badge'}>
                    {project.status}
                  </span>
                </div>
                <h3 className="text-[15px] font-semibold text-text-primary">{project.title}</h3>
                <p className="text-[13px] text-text-secondary mt-1">Owner: {project.owner_name}</p>
                {project.supervisor_name && (
                  <p className="text-[13px] text-text-secondary">Supervisor: {project.supervisor_name}</p>
                )}
                <div className="mt-4 pt-4 border-t border-border-default flex justify-end">
                  {action && (
                    <button
                      onClick={() => handleTransition(project, action)}
                      disabled={busy}
                      className="fet-btn-secondary text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      {ActionIcon && <ActionIcon size={14} />}
                      {busy ? 'Working…' : action.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-border-default">
              <h3 className="text-[15px] font-bold text-text-primary">Create Project</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-page-bg rounded-lg transition-colors">
                <X size={24} className="text-text-secondary" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {formError}
                </div>
              )}
              <div>
                <label className="fet-label">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Smart Irrigation System"
                  required
                  className="w-full px-4 py-2 fet-input"
                />
              </div>
              <p className="text-xs text-text-secondary">
                New projects start as drafts. Activate them when the team is ready.
              </p>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
                <button type="button" onClick={() => setShowForm(false)} className="fet-btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="fet-btn-primary disabled:opacity-50">
                  {submitting ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsList;
