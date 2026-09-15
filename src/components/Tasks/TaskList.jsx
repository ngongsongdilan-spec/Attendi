import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, Search, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
import TaskForm from './TaskForm';

const TaskList = () => {
  const { tasks, updateTask, deleteTask } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || t.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Completed': return <CheckCircle size={16} className="text-green-500" />;
      case 'In Progress': return <Clock size={16} className="text-yellow-500" />;
      default: return <AlertCircle size={16} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return 'fet-badge fet-badge-completed';
      case 'In Progress': return 'fet-badge fet-badge-pending';
      case 'Pending': return 'fet-badge fet-badge-inactive';
      default: return 'fet-badge fet-badge-inactive';
    }
  };

  const handleToggleStatus = (task) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    updateTask(task.id, { status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-bold text-text-primary">Tasks</h2>
          <p className="text-text-secondary">Manage your project tasks</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="fet-btn-primary"
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={18} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="fet-input pl-10"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="fet-select"
        >
          <option value="all">All Tasks</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      <div className="fet-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="fet-table">
            <thead>
              <tr className="bg-page-bg border-b border-border-default">
                <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Task</th>
                <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Project</th>
                <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Priority</th>
                <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Due Date</th>
                <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Status</th>
                <th className="text-left py-3 px-4 text-[13px] font-semibold text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} className="border-b border-border-default hover:bg-page-bg transition-colors">
                  <td className="py-3 px-4 font-medium text-text-primary">{task.title}</td>
                  <td className="py-3 px-4 text-text-secondary text-[13px]">{task.project}</td>
                  <td className="py-3 px-4">
                    <span className={`fet-badge ${
                      task.priority === 'High' ? 'fet-badge-danger' :
                      task.priority === 'Medium' ? 'fet-badge-warning' :
                      'fet-badge-info'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-text-secondary text-[13px]">{task.dueDate}</td>
                  <td className="py-3 px-4">
                    <span className={`${getStatusColor(task.status)} flex items-center gap-1 w-fit`}>
                      {getStatusIcon(task.status)}
                      {task.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleStatus(task)}
                        className="text-[13px] text-primary hover:underline"
                      >
                        {task.status === 'Completed' ? 'Reopen' : 'Complete'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingTask(task);
                          setShowForm(true);
                        }}
                        className="text-[13px] text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this task?')) {
                            deleteTask(task.id);
                          }
                        }}
                        className="text-[13px] text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTasks.length === 0 && (
          <div className="text-center py-8 text-text-secondary">
            No tasks found. Create your first task!
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-border-default">
              <h3 className="text-[15px] font-bold text-text-primary">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h3>
              <button 
                onClick={() => {
                  setShowForm(false);
                  setEditingTask(null);
                }} 
                className="p-1 hover:bg-page-bg rounded-lg transition-colors"
              >
                <X size={24} className="text-text-secondary" />
              </button>
            </div>
            <div className="p-6">
              <TaskForm 
                task={editingTask}
                onClose={() => {
                  setShowForm(false);
                  setEditingTask(null);
                }}
                onSuccess={() => {
                  setShowForm(false);
                  setEditingTask(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
