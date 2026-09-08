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
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
          <h2 className="text-2xl font-bold text-[#191C1D]">Tasks</h2>
          <p className="text-[#47464F]">Manage your project tasks</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-lg font-medium hover:bg-[#3B82F6]/90 transition-colors"
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
        >
          <option value="all">All Tasks</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-[#C8C5D0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#EDEEEF] border-b border-[#C8C5D0]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Task</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Project</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Priority</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Due Date</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} className="border-b border-[#C8C5D0] hover:bg-[#EDEEEF] transition-colors">
                  <td className="py-3 px-4 font-medium text-[#191C1D]">{task.title}</td>
                  <td className="py-3 px-4 text-[#47464F] text-sm">{task.project}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      task.priority === 'High' ? 'bg-red-100 text-red-800' :
                      task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#47464F] text-sm">{task.dueDate}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)} flex items-center gap-1 w-fit`}>
                      {getStatusIcon(task.status)}
                      {task.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleStatus(task)}
                        className="text-xs text-[#3B82F6] hover:underline"
                      >
                        {task.status === 'Completed' ? 'Reopen' : 'Complete'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingTask(task);
                          setShowForm(true);
                        }}
                        className="text-xs text-[#8B5CF6] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this task?')) {
                            deleteTask(task.id);
                          }
                        }}
                        className="text-xs text-red-500 hover:underline"
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
          <div className="text-center py-8 text-[#47464F]">
            No tasks found. Create your first task!
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-[#C8C5D0]">
              <h3 className="text-xl font-bold text-[#191C1D]">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h3>
              <button 
                onClick={() => {
                  setShowForm(false);
                  setEditingTask(null);
                }} 
                className="p-1 hover:bg-[#EDEEEF] rounded-lg transition-colors"
              >
                <X size={24} className="text-[#47464F]" />
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