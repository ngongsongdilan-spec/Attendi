import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Calendar, Plus, Edit2, Trash2, Check, X, Save, ChevronDown } from 'lucide-react';

const SemesterSelector = () => {
  const { semesters, schoolYears, addSemester, updateSemester, deleteSemester, switchSemester } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: 'First Semester',
    shortName: 'Sem 1',
    schoolYear: schoolYears.find(y => y.isActive)?.name || '2024/2025',
    startDate: '',
    endDate: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.schoolYear || !formData.startDate || !formData.endDate) {
      alert('Please fill in all fields');
      return;
    }

    if (editingId) {
      updateSemester(editingId, formData);
      setEditingId(null);
    } else {
      addSemester({ ...formData, isActive: true, isCurrent: false });
    }
    setFormData({ name: 'First Semester', shortName: 'Sem 1', schoolYear: schoolYears.find(y => y.isActive)?.name || '2024/2025', startDate: '', endDate: '' });
    setShowForm(false);
  };

  const handleEdit = (semester) => {
    setEditingId(semester.id);
    setFormData({ 
      name: semester.name, 
      shortName: semester.shortName,
      schoolYear: semester.schoolYear,
      startDate: semester.startDate, 
      endDate: semester.endDate 
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this semester?')) {
      deleteSemester(id);
    }
  };

  const handleCancel = () => {
    setFormData({ name: 'First Semester', shortName: 'Sem 1', schoolYear: schoolYears.find(y => y.isActive)?.name || '2024/2025', startDate: '', endDate: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const getSemesterStatus = (semester) => {
    if (semester.isCurrent) return 'Current';
    if (semester.isActive) return 'Active';
    return 'Inactive';
  };

  const getStatusColor = (semester) => {
    if (semester.isCurrent) return 'fet-badge fet-badge-active';
    if (semester.isActive) return 'fet-badge fet-badge-info';
    return 'fet-badge fet-badge-inactive';
  };

  return (
    <div className="fet-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2" style={{ fontSize: '15px' }}>
          <Calendar size={20} className="text-primary" />
          Semesters
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <Plus size={16} />
          Add Semester
        </button>
      </div>

      <div className="space-y-2">
        {semesters.map(semester => (
          <div
            key={semester.id}
            className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
              semester.isCurrent 
                ? 'bg-primary/10 border-2 border-primary' 
                : semester.isActive
                ? 'bg-page-bg border border-border-default'
                : 'bg-[#F8F9FA] border border-border-default opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-text-primary">{semester.name}</p>
                <span className={`${getStatusColor(semester)}`}>
                  {getSemesterStatus(semester)}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                {semester.schoolYear} • {semester.startDate} - {semester.endDate}
              </p>
              <p className="text-xs text-text-secondary">{semester.shortName}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEdit(semester)}
                className="p-1 text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(semester.id)}
                className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => switchSemester(semester.id)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  semester.isCurrent 
                    ? 'fet-btn-success cursor-default'
                    : 'fet-btn-primary'
                }`}
                disabled={semester.isCurrent}
              >
                {semester.isCurrent ? 'Current' : 'Switch'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 p-4 border border-border-default rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-text-primary">
              {editingId ? 'Edit Semester' : 'Add Semester'}
            </h4>
            <button type="button" onClick={handleCancel} className="text-text-secondary hover:text-text-primary">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="fet-label">Semester Name</label>
              <select
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value, shortName: e.target.value === 'First Semester' ? 'Sem 1' : 'Sem 2' })}
                className="w-full px-3 py-2 fet-select"
                required
              >
                <option value="First Semester">First Semester</option>
                <option value="Second Semester">Second Semester</option>
              </select>
            </div>
            <div>
              <label className="fet-label">Short Name</label>
              <input
                type="text"
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                className="w-full px-3 py-2 fet-input"
                placeholder="e.g., Sem 1"
                required
              />
            </div>
            <div>
              <label className="fet-label">School Year</label>
              <select
                value={formData.schoolYear}
                onChange={(e) => setFormData({ ...formData, schoolYear: e.target.value })}
                className="w-full px-3 py-2 fet-select"
                required
              >
                {schoolYears.map(year => (
                  <option key={year.id} value={year.name}>{year.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="fet-label">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 fet-input"
                required
              />
            </div>
            <div>
              <label className="fet-label">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 fet-input"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" className="fet-btn-primary flex items-center gap-1">
              <Save size={16} />
              {editingId ? 'Update' : 'Add'} Semester
            </button>
            <button type="button" onClick={handleCancel} className="fet-btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SemesterSelector;
