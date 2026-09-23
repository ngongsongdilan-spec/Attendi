import React, { useState } from 'react';
import { Calendar, Plus, X, Save } from 'lucide-react';
import { createSemester, updateSemester } from '../../api/calendar';

/**
 * Semester list with the single "current" badge. Admins can add semesters
 * and switch the current one — the backend demotes the previous current
 * semester so there is never more than one.
 */
const SemesterSelector = ({ semesters, schoolYears, isAdmin, onChanged }) => {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    school_year: '',
    name: 'First Semester',
    start_date: '',
    end_date: '',
  });

  const handleError = (err, fallback) => setError(err.message || fallback);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await createSemester(formData);
      setFormData({ school_year: '', name: 'First Semester', start_date: '', end_date: '' });
      setShowForm(false);
      onChanged();
    } catch (err) {
      handleError(err, 'Could not create semester');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMakeCurrent = async (id) => {
    setError('');
    try {
      await updateSemester(id, { is_current: true });
      onChanged();
    } catch (err) {
      handleError(err, 'Could not switch semester');
    }
  };

  return (
    <div className="fet-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2" style={{ fontSize: '15px' }}>
          <Calendar size={20} className="text-primary" />
          Semesters
        </h3>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus size={16} />
            Add Semester
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-3">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {semesters.length === 0 && (
          <p className="text-sm text-text-secondary">No semesters defined yet.</p>
        )}
        {semesters.map((semester) => (
          <div
            key={semester.id}
            className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
              semester.is_current
                ? 'bg-primary/10 border-2 border-primary'
                : 'bg-page-bg border border-border-default'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-text-primary">{semester.name}</p>
                <span className={semester.is_current ? 'fet-badge fet-badge-active' : 'fet-badge fet-badge-inactive'}>
                  {semester.is_current ? 'Current' : 'Upcoming'}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                {semester.school_year_name} • {semester.start_date} - {semester.end_date}
              </p>
            </div>
            {isAdmin && !semester.is_current && (
              <button
                onClick={() => handleMakeCurrent(semester.id)}
                className="fet-btn-primary text-xs px-3 py-1"
              >
                Make current
              </button>
            )}
          </div>
        ))}
      </div>

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="mt-4 p-4 border border-border-default rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-text-primary">Add Semester</h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-text-secondary hover:text-text-primary">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="fet-label">Semester Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 fet-input"
                required
              />
            </div>
            <div>
              <label className="fet-label">School Year</label>
              <select
                value={formData.school_year}
                onChange={(e) => setFormData(prev => ({ ...prev, school_year: e.target.value }))}
                className="w-full px-3 py-2 fet-select"
                required
              >
                <option value="">Select year…</option>
                {schoolYears.map((year) => (
                  <option key={year.id} value={year.id}>{year.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="fet-label">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-3 py-2 fet-input"
                required
              />
            </div>
            <div>
              <label className="fet-label">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-3 py-2 fet-input"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" disabled={submitting} className="fet-btn-primary flex items-center gap-1 disabled:opacity-50">
              <Save size={16} />
              {submitting ? 'Adding…' : 'Add Semester'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="fet-btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SemesterSelector;
