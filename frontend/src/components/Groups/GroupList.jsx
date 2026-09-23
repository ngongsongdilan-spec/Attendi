import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Users, RotateCw, UserPlus } from 'lucide-react';
import { getProjects, getProject, createGroup, addMember } from '../../api/projects';
import { getStudents } from '../../api/users';

/**
 * Groups and membership for a selected project (BR-100..102, BR-120).
 * Group/member writes are owner/supervisor/admin actions — the backend
 * answers UNAUTHORIZED / DUPLICATE_MEMBER, surfaced verbatim here.
 */
const GroupList = ({ user }) => {
  const isAcademic = ['lecturer', 'admin'].includes(user?.displayRole);

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [students, setStudents] = useState([]);

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState({ student: '', group: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  // Student picker for member adds (academic-only endpoint).
  useEffect(() => {
    if (!isAcademic) return;
    let cancelled = false;
    getStudents()
      .then((rows) => !cancelled && setStudents(rows))
      .catch(() => { /* picker stays empty on 403 — form shows the error */ });
    return () => { cancelled = true; };
  }, [isAcademic]);

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
      setError(err.message || 'Could not load groups');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const groups = bundle?.groups || [];
  const members = bundle?.members || [];

  const membersOf = (groupId) => members.filter((m) => m.group === groupId);
  const ungrouped = members.filter((m) => !m.group);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await createGroup(projectId, { name: groupName });
      setGroupName('');
      setShowGroupForm(false);
      await load();
    } catch (err) {
      setFormError(err.message || 'Could not create group');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await addMember(projectId, {
        student: memberForm.student,
        group: memberForm.group || undefined,
      });
      setMemberForm({ student: '', group: '' });
      setShowMemberForm(false);
      await load();
    } catch (err) {
      setFormError(err.message || 'Could not add member');
    } finally {
      setSubmitting(false);
    }
  };

  const memberOptions = students.filter(
    (s) => !members.some((m) => m.student === s.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-bold text-text-primary">Groups</h2>
          <p className="text-text-secondary">Manage project groups and members</p>
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
          {isAcademic && projectId && (
            <>
              <button
                onClick={() => { setFormError(''); setShowMemberForm((v) => !v); }}
                className="fet-btn-secondary flex items-center gap-1"
              >
                <UserPlus size={16} /> Add Member
              </button>
              <button
                onClick={() => { setFormError(''); setShowGroupForm((v) => !v); }}
                className="fet-btn-primary flex items-center gap-1"
              >
                <Plus size={18} /> Create Group
              </button>
            </>
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
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {formError}
        </div>
      )}

      {showGroupForm && (
        <form onSubmit={handleCreateGroup} className="fet-card p-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="fet-label">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              className="w-full px-4 py-2 fet-input"
              placeholder="e.g., Team Alpha"
            />
          </div>
          <button type="submit" disabled={submitting} className="fet-btn-primary disabled:opacity-50">
            {submitting ? 'Creating…' : 'Create'}
          </button>
          <button type="button" onClick={() => setShowGroupForm(false)} className="fet-btn-secondary">
            Cancel
          </button>
        </form>
      )}

      {showMemberForm && (
        <form onSubmit={handleAddMember} className="fet-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="fet-label">Student</label>
            <select
              value={memberForm.student}
              onChange={(e) => setMemberForm(prev => ({ ...prev, student: e.target.value }))}
              required
              className="w-full px-4 py-2 fet-select"
            >
              <option value="">Select student…</option>
              {memberOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {`${s.first_name} ${s.last_name}`.trim() || s.username}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="fet-label">Group (optional)</label>
            <select
              value={memberForm.group}
              onChange={(e) => setMemberForm(prev => ({ ...prev, group: e.target.value }))}
              className="w-full px-4 py-2 fet-select"
            >
              <option value="">Project-level member</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="fet-btn-primary disabled:opacity-50">
              {submitting ? 'Adding…' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowMemberForm(false)} className="fet-btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="fet-card p-6 text-center text-text-secondary">Loading groups…</div>
      ) : !projectId ? (
        <div className="text-center py-12 fet-card">
          <Users size={48} className="mx-auto text-text-secondary opacity-50" />
          <p className="text-text-secondary mt-4">You are not visible on any projects yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const groupMembers = membersOf(group.id);
            return (
              <div key={group.id} className="fet-card p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users size={20} className="text-primary" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-text-primary">{group.name}</h3>
                </div>
                <p className="text-[13px] text-text-secondary">
                  Lead: {group.leader_name || 'Not set'}
                </p>
                <p className="text-[13px] text-text-secondary mb-3">
                  {groupMembers.length} member{groupMembers.length === 1 ? '' : 's'}
                </p>
                <div className="space-y-1">
                  {groupMembers.map((m) => (
                    <p key={m.id} className="text-[13px] text-text-primary bg-page-bg rounded-lg px-3 py-1">
                      {m.student_name}
                    </p>
                  ))}
                  {groupMembers.length === 0 && (
                    <p className="text-xs text-text-secondary italic">No members yet</p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Ungrouped members always shown so nobody silently disappears */}
          <div className="fet-card p-6 border-dashed">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-page-bg rounded-lg">
                <Users size={20} className="text-text-secondary" />
              </div>
              <h3 className="text-[15px] font-semibold text-text-primary">Project members</h3>
            </div>
            <p className="text-[13px] text-text-secondary mb-3">{ungrouped.length} ungrouped</p>
            <div className="space-y-1">
              {ungrouped.map((m) => (
                <p key={m.id} className="text-[13px] text-text-primary bg-page-bg rounded-lg px-3 py-1">
                  {m.student_name}
                </p>
              ))}
              {ungrouped.length === 0 && (
                <p className="text-xs text-text-secondary italic">Everyone is in a group</p>
              )}
            </div>
          </div>

          {groups.length === 0 && ungrouped.length === 0 && (
            <div className="text-center py-12 fet-card col-span-full">
              <Users size={48} className="mx-auto text-text-secondary opacity-50" />
              <p className="text-text-secondary mt-4">No groups or members yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupList;
