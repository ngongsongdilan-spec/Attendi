import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, CheckCircle, Clock, AlertCircle, X, RotateCw, ListChecks } from 'lucide-react';
import { getProjects, getProject, createTask, updateTaskStatus } from '../../api/projects';

const STATUS_META = {
  todo: { label: 'To Do', badge: 'fet-badge fet-badge-inactive', icon: AlertCircle, next: 'in_progress', nextLabel: 'Start' },
  in_progress: { label: 'In Progress', badge: 'fet-badge fet-badge-pending', icon: Clock, next: 'completed', nextLabel: 'Complete' },
  completed: { label: 'Completed', badge: 'fet-badge fet-badge-active', icon: CheckCircle, next: null, nextLabel: null },
};

/**
 * Project tasks with the one-step status flow (BR-110..113). A project is
 * selected first; only its tasks are shown. Status moves are restricted by
 * the backend to the assignee or creator — UNAUTHORIZED is surfaced as-is.
 */
const TaskList = ({ user }) => {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [bundle, setBundle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: '', assignee: '' });

  const isAcademic = ['lecturer', 'admin'].includes(user?.displayRole);

  // Project picker — visible projects only.
  useEffect(() => {
    let cancelled = false;
    getProjects()
      .then((rows) => {
        if (cancelled) return;
        setProjects(rows);
        if (rows.length > 0) setProjectId((prev) => prev || rows[0].id);
      })
      .catch((err) => !cancelled && setError(err.message || 'Could not load projects'));
    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    if (!projectId) {
      setBundle(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setBundle(await getProject(projectId));
    } catch (err) {
      setError(err.message || 'Could not load tasks');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const tasks = bundle?.tasks || [];
  const members = bundle?.members || [];

  const memberName = (id) =>
    members.find((m) => m.student === id)?.student_name || 'Unassigned';

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || t.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleAdvance = async (task) => {
    const meta = STATUS_META[task.status];
    if (!meta?.next) return;
    setError('');
    setBusyId(task.id);
    try {
      await updateTaskStatus(task.id, meta.next);
      await load();
    } catch (err) {
      setError(err.message || 'Could not update task status');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await createTask(projectId, {
        title: formData.title,
        assignee: formData.assignee || undefined,
      });
      setShowForm(false);
      setFormData({ title: '', assignee: '' });
      await load();
    } catch (err) {
      setFormError(err.message || 'Could not create task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-bold text-text-primary">Tasks</h2>
          <p className="text-text-secondary">Track work across your projects</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="px-4 py-2 fet-select"
            disabled={projects.length === 0}
          >
            {projects.length === 0 && <option value="">No projects</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          {projectId && (
            <button
              onClick={() => { setFormError(''); setShowForm(true); }}
              className="fet-btn-primary flex items-center gap-2"
            >
              <Plus size={18} /> Add Task
            </button>
          )}
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

      {projectId && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={18} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 fet-input"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'todo', 'in_progress', 'completed'].map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  filter === key ? 'bg-primary text-white' : 'bg-page-bg text-text-secondary hover:bg-[#E7E8E9]'
                }`}
              >
                {key === 'all' ? 'All' : STATUS_META[key].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="fet-card p-6 text-center text-text-secondary">Loading tasks…</div>
        ) : !projectId ? (
          <div className="text-center py-12 fet-card">
            <ListChecks size={48} className="mx-auto text-text-secondary opacity-50" />
            <p className="text-text-secondary mt-4">You are not visible on any projects yet.</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 fet-card">
            <ListChecks size={48} className="mx-auto text-text-secondary opacity-50" />
            <p className="text-text-secondary mt-4">No tasks here.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const meta = STATUS_META[task.status] || STATUS_META.todo;
            const StatusIcon = meta.icon;
            const busy = busyId === task.id;
            return (
              <div key={task.id} className="fet-card p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <StatusIcon size={18} className={task.status === 'completed' ? 'text-green-500' : 'text-text-secondary'} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-text-primary truncate">{task.title}</p>
                    <p className="text-xs text-text-secondary">Assigned: {memberName(task.assignee)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={meta.badge}>{meta.label}</span>
                  {meta.next && (
                    <button
                      onClick={() => handleAdvance(task)}
                      disabled={busy}
                      className="fet-btn-secondary text-[13px] px-3 py-1 disabled:opacity-50"
                    >
                      {busy ? '…' : meta.nextLabel}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-border-default">
              <h3 className="text-[15px] font-bold text-text-primary">Add Task</h3>
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
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="w-full px-4 py-2 fet-input"
                />
              </div>
              <div>
                <label className="fet-label">Assignee (optional)</label>
                <select
                  value={formData.assignee}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
                  className="w-full px-4 py-2 fet-select"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.student} value={m.student}>{m.student_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
                <button type="button" onClick={() => setShowForm(false)} className="fet-btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="fet-btn-primary disabled:opacity-50">
                  {submitting ? 'Adding…' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
