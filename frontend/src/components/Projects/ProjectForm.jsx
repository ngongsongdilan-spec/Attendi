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
        <label className="fet-label">Project Title</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="fet-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="fet-label">Group</label>
          <input
            type="text"
            name="group"
            value={formData.group}
            onChange={handleChange}
            className="fet-input"
          />
        </div>
        <div>
          <label className="fet-label">Supervisor</label>
          <input
            type="text"
            name="supervisor"
            value={formData.supervisor}
            onChange={handleChange}
            className="fet-input"
          />
        </div>
      </div>

      <div>
        <label className="fet-label">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="fet-input resize-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="fet-label">Deadline</label>
          <input
            type="date"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            className="fet-input"
          />
        </div>
        <div>
          <label className="fet-label">Progress (%)</label>
          <input
            type="number"
            name="progress"
            value={formData.progress}
            onChange={handleChange}
            min="0"
            max="100"
            className="fet-input"
          />
        </div>
        <div>
          <label className="fet-label">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="fet-select"
          >
            <option value="Active">Active</option>
            <option value="On Track">On Track</option>
            <option value="At Risk">At Risk</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
        <button
          type="button"
          onClick={onClose}
          className="fet-btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="fet-btn-primary"
        >
          {project ? 'Update Project' : 'Create Project'}
        </button>
      </div>
    </form>
  );
};

export default ProjectForm;
