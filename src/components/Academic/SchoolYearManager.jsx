import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Calendar, Plus, Edit2, Trash2, Check, X, Save } from 'lucide-react';

const SchoolYearManager = () => {
  const { schoolYears, addSchoolYear, updateSchoolYear, deleteSchoolYear, switchSchoolYear } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate || !formData.endDate) {
      alert('Please fill in all fields');
      return;
    }

    if (editingId) {
      updateSchoolYear(editingId, formData);
      setEditingId(null);
    } else {
      addSchoolYear(formData);
    }
    setFormData({ name: '', startDate: '', endDate: '' });
    setShowForm(false);
  };

  const handleEdit = (year) => {
    setEditingId(year.id);
    setFormData({ name: year.name, startDate: year.startDate, endDate: year.endDate });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this school year?')) {
      deleteSchoolYear(id);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', startDate: '', endDate: '' });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2">
          <Calendar size={20} className="text-[#3B82F6]" />
          School Years
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-sm text-[#3B82F6] hover:underline"
        >
          <Plus size={16} />
          Add Year
        </button>
      </div>

      <div className="space-y-2">
        {schoolYears.map(year => (
          <div
            key={year.id}
            className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
              year.isActive 
                ? 'bg-[#3B82F6]/10 border-2 border-[#3B82F6]' 
                : 'bg-[#EDEEEF] hover:bg-[#E7E8E9]'
            }`}
          >
            <div>
              <p className="font-medium text-[#191C1D]">{year.name}</p>
              <p className="text-xs text-[#47464F]">
                {year.startDate} - {year.endDate}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {year.isActive && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                  <Check size={12} /> Active
                </span>
              )}
              <button
                onClick={() => handleEdit(year)}
                className="p-1 text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(year.id)}
                className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => switchSchoolYear(year.id)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  year.isActive 
                    ? 'bg-green-100 text-green-800 cursor-default'
                    : 'bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90'
                }`}
                disabled={year.isActive}
              >
                {year.isActive ? 'Current' : 'Switch'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 p-4 border border-[#C8C5D0] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-[#191C1D]">
              {editingId ? 'Edit School Year' : 'Add School Year'}
            </h4>
            <button type="button" onClick={handleCancel} className="text-[#47464F] hover:text-[#191C1D]">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="e.g., 2025/2026"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              required
            />
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="px-3 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              required
            />
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="px-3 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              required
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg text-sm font-medium hover:bg-[#3B82F6]/90 transition-colors flex items-center gap-1">
              <Save size={16} />
              {editingId ? 'Update' : 'Add'} Year
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

export default SchoolYearManager;