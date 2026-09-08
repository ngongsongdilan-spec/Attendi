import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const ProjectForm = ({ project, onClose, onSuccess }) => {
  const { addProject, updateProject } = useAppContext();
  const [formData, setFormData] = useState({
    title: project?.title || '',
    group: project?.group || '',
    supervisor: project?.supervisor || '',
    description: project?.description || '',
    deadline: project?.deadline || '',
    progress: project?.progress || 0,
    status: project?.status || 'Active',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (project) {
      updateProject(project.id, formData);
    } else {
      addProject(formData);
    }
    onSuccess();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#191C1D] mb-1">Project Title</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#191C1D] mb-1">Group</label>
          <input
            type="text"
            name="group"
            value={formData.group}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#191C1D] mb-1">Supervisor</label>
          <input
            type="text"
            name="supervisor"
            value={formData.supervisor}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#191C1D] mb-1">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] resize-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#191C1D] mb-1">Deadline</label>
          <input
            type="date"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#191C1D] mb-1">Progress (%)</label>
          <input
            type="number"
            name="progress"
            value={formData.progress}
            onChange={handleChange}
            min="0"
            max="100"
            className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#191C1D] mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
          >
            <option value="Active">Active</option>
            <option value="On Track">On Track</option>
            <option value="At Risk">At Risk</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>
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
          {project ? 'Update Project' : 'Create Project'}
        </button>
      </div>
    </form>
  );
};

export default ProjectForm;