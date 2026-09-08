import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const GroupForm = ({ group, onClose, onSuccess }) => {
  const { addGroup, updateGroup, projects } = useAppContext();
  const [formData, setFormData] = useState({
    name: group?.name || '',
    project: group?.project || projects[0]?.title || '',
    lead: group?.lead || '',
    members: group?.members || 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (group) {
      updateGroup(group.id, formData);
    } else {
      addGroup(formData);
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#191C1D] mb-1">Group Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#191C1D] mb-1">Project</label>
        <select
          value={formData.project}
          onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
          className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
        >
          {projects.map(p => (
            <option key={p.id} value={p.title}>{p.title}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#191C1D] mb-1">Group Lead</label>
        <input
          type="text"
          value={formData.lead}
          onChange={(e) => setFormData(prev => ({ ...prev, lead: e.target.value }))}
          className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#191C1D] mb-1">Number of Members</label>
        <input
          type="number"
          value={formData.members}
          onChange={(e) => setFormData(prev => ({ ...prev, members: parseInt(e.target.value) || 0 }))}
          min="0"
          className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[#C8C5D0]">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-[#C8C5D0] rounded-lg text-[#47464F] hover:bg-[#EDEEEF] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg font-medium hover:bg-[#3B82F6]/90 transition-colors"
        >
          {group ? 'Update Group' : 'Create Group'}
        </button>
      </div>
    </form>
  );
};

export default GroupForm;