import React, { useState } from 'react';
import { createAnnouncement, updateAnnouncement } from '../../api/announcements';
import { getFaculties, getDepartments, getCourses, getClasses } from '../../api/academic';

/**
 * Create/edit a scoped announcement (academic users only — BR-083).
 * The scope target list is loaded from the academic API; scope facts are
 * derived server-side from the session, never sent from here.
 */
const AnnouncementForm = ({ announcement, onClose, onSuccess }) => {
  const isEdit = !!announcement;
  const [formData, setFormData] = useState({
    title: announcement?.title || '',
    body: announcement?.body || '',
    scope: announcement?.scope || 'faculty',
    scope_id: announcement ? (announcement.faculty || announcement.department || announcement.course || announcement.class_session || '') : '',
    is_important: announcement?.is_important || false,
    published: announcement?.is_published || true,
  });
  const [targets, setTargets] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load the target list whenever the scope changes (create mode only —
  // edits never change scope server-side).
  React.useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    setLoadingTargets(true);
    setError('');
    setFormData(prev => ({ ...prev, scope_id: '' }));
    const loaders = {
      faculty: getFaculties,
      department: getDepartments,
      course: getCourses,
      class: getClasses,
    };
    const loader = loaders[formData.scope];
    if (!loader) {
      setTargets([]);
      setLoadingTargets(false);
      return;
    }
    loader()
      .then((rows) => {
        if (!cancelled) setTargets(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load targets');
      })
      .finally(() => {
        if (!cancelled) setLoadingTargets(false);
      });
    return () => { cancelled = true; };
  }, [formData.scope, isEdit]);

  const labelFor = (row) => {
    if (formData.scope === 'course') return `${row.code} — ${row.name}`;
    if (formData.scope === 'class') return `${row.course_code} class`;
    return row.name;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateAnnouncement(announcement.id, {
          title: formData.title,
          body: formData.body,
          is_important: formData.is_important,
          published: formData.published,
        });
      } else {
        await createAnnouncement({
          title: formData.title,
          body: formData.body,
          scope: formData.scope,
          scope_id: formData.scope_id,
          is_important: formData.is_important,
          published: formData.published,
        });
      }
      onSuccess();
    } catch (err) {
      setError(err.message || 'Could not save announcement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {error}
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
        <label className="fet-label">Body</label>
        <textarea
          value={formData.body}
          onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
          rows={4}
          required
          className="w-full px-4 py-2 fet-input resize-none"
        />
      </div>

      {!isEdit && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="fet-label">Audience</label>
            <select
              value={formData.scope}
              onChange={(e) => setFormData(prev => ({ ...prev, scope: e.target.value }))}
              className="w-full px-4 py-2 fet-select"
            >
              <option value="faculty">Entire faculty</option>
              <option value="department">Department</option>
              <option value="course">Course</option>
              <option value="class">Class session</option>
            </select>
          </div>
          <div>
            <label className="fet-label">Target</label>
            <select
              value={formData.scope_id}
              onChange={(e) => setFormData(prev => ({ ...prev, scope_id: e.target.value }))}
              required
              disabled={loadingTargets}
              className="w-full px-4 py-2 fet-select"
            >
              <option value="">
                {loadingTargets ? 'Loading…' : 'Select target…'}
              </option>
              {targets.map((row) => (
                <option key={row.id} value={row.id}>{labelFor(row)}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={formData.is_important}
          onChange={(e) => setFormData(prev => ({ ...prev, is_important: e.target.checked }))}
        />
        Mark as important
      </label>

      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={formData.published}
          onChange={(e) => setFormData(prev => ({ ...prev, published: e.target.checked }))}
        />
        Publish immediately
      </label>

      <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
        <button type="button" onClick={onClose} className="fet-btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="fet-btn-primary disabled:opacity-50">
          {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Post Announcement'}
        </button>
      </div>
    </form>
  );
};

export default AnnouncementForm;
