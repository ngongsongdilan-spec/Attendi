import React, { useState } from 'react';
import { Calendar, Plus, X, Save } from 'lucide-react';
import { createSchoolYear } from '../../api/calendar';

/** School-year list; creation is administrator-only (backend enforced). */
const SchoolYearManager = ({ schoolYears, isAdmin, onChanged }) => {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', start_date: '', end_date: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await createSchoolYear(formData);
      setFormData({ name: '', start_date: '', end_date: '' });
      setShowForm(false);
      onChanged();
    } catch (err) {
      setError(err.message || 'Could not create school year');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fet-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2" style={{ fontSize: '15px' }}>
          <Calendar size={20} className="text-primary" />
          School Years
        </h3>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Plus size={16} />
            Add Year
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-3">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {schoolYears.length === 0 && (
          <p className="text-sm text-text-secondary">No school years defined yet.</p>
        )}
        {schoolYears.map((year) => (
          <div
            key={year.id}
            className="flex items-center justify-between p-3 rounded-xl bg-page-bg hover:bg-[#E7E8E9] transition-colors"
          >
            <div>
              <p className="font-medium text-text-primary">{year.name}</p>
              <p className="text-xs text-text-secondary">{year.start_date} - {year.end_date}</p>
            </div>
          </div>
        ))}
      </div>

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="mt-4 p-4 border border-border-default rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-text-primary">Add School Year</h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-text-secondary hover:text-text-primary">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="e.g., 2025/2026"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="px-3 py-2 fet-input"
              required
            />
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              className="px-3 py-2 fet-input"
              required
            />
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              className="px-3 py-2 fet-input"
              required
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" disabled={submitting} className="fet-btn-primary flex items-center gap-1 disabled:opacity-50">
              <Save size={16} />
              {submitting ? 'Adding…' : 'Add Year'}
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

export default SchoolYearManager;
