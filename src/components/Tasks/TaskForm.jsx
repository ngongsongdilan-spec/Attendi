import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const TaskForm = ({ task, onClose, onSuccess }) => {
  const { addTask, updateTask, projects } = useAppContext();
  const [formData, setFormData] = useState({
    title: task?.title || '',
    project: task?.project || projects[0]?.title || '',
    priority: task?.priority || 'Medium',
    status: task?.status || 'Pending',
    dueDate: task?.dueDate || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (task) {
      updateTask(task.id, formData);
    } else {
      addTask(formData);
    }
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#191C1D] mb-1">Task Title</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#191C1D] mb-1">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
            className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#191C1D] mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#191C1D] mb-1">Due Date</label>
        <input
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
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
          {task ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
};

export default TaskForm;