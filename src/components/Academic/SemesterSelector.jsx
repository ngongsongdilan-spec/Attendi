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
    if (semester.isCurrent) return 'bg-green-100 text-green-800';
    if (semester.isActive) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2">
          <Calendar size={20} className="text-[#3B82F6]" />
          Semesters
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-sm text-[#3B82F6] hover:underline"
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
                ? 'bg-[#3B82F6]/10 border-2 border-[#3B82F6]' 
                : semester.isActive
                ? 'bg-[#EDEEEF] border border-[#C8C5D0]'
                : 'bg-[#F8F9FA] border border-[#C8C5D0] opacity-60'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-[#191C1D]">{semester.name}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(semester)}`}>
                  {getSemesterStatus(semester)}
                </span>
              </div>
              <p className="text-xs text-[#47464F]">
                {semester.schoolYear} • {semester.startDate} - {semester.endDate}
              </p>
              <p className="text-xs text-[#47464F]">{semester.shortName}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEdit(semester)}
                className="p-1 text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition-colors"
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
                    ? 'bg-green-100 text-green-800 cursor-default'
                    : 'bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90'
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
        <form onSubmit={handleSubmit} className="mt-4 p-4 border border-[#C8C5D0] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-[#191C1D]">
              {editingId ? 'Edit Semester' : 'Add Semester'}
            </h4>
            <button type="button" onClick={handleCancel} className="text-[#47464F] hover:text-[#191C1D]">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#47464F] mb-1">Semester Name</label>
              <select
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value, shortName: e.target.value === 'First Semester' ? 'Sem 1' : 'Sem 2' })}
                className="w-full px-3 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                required
              >
                <option value="First Semester">First Semester</option>
                <option value="Second Semester">Second Semester</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#47464F] mb-1">Short Name</label>
              <input
                type="text"
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                className="w-full px-3 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                placeholder="e.g., Sem 1"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#47464F] mb-1">School Year</label>
              <select
                value={formData.schoolYear}
                onChange={(e) => setFormData({ ...formData, schoolYear: e.target.value })}
                className="w-full px-3 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                required
              >
                {schoolYears.map(year => (
                  <option key={year.id} value={year.name}>{year.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#47464F] mb-1">Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#47464F] mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg text-sm font-medium hover:bg-[#3B82F6]/90 transition-colors flex items-center gap-1">
              <Save size={16} />
              {editingId ? 'Update' : 'Add'} Semester
            </button>
            <button type="button" onClick={handleCancel} className="px-4 py-2 border border-[#C8C5D0] rounded-lg text-sm hover:bg-[#EDEEEF] transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SemesterSelector;