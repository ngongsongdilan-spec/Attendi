import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, Filter, Search, X, Edit2, Trash2, FolderKanban } from 'lucide-react';
import ProjectCard from './ProjectCard';
import ProjectForm from './ProjectForm';

const ProjectsList = () => {
  const { projects, deleteProject } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [filter, setFilter] = useState('all');

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.supervisor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteProject(id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProject(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#191C1D]">My Projects</h2>
          <p className="text-[#47464F] text-xs">Manage and track your project progress</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-lg font-semibold text-xs hover:bg-[#3B82F6]/90 transition-colors shadow"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={16} />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D] placeholder:text-[#47464F]"
          />
        </div>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 text-xs border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D] bg-white font-medium"
        >
          <option value="all">All Projects</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="On Hold">On Hold</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProjects.map((project) => (
          <div key={project.id} className="relative group">
            <ProjectCard project={project} />
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleEdit(project)}
                className="p-1.5 bg-white rounded-lg shadow-md hover:bg-[#EDEEEF] transition-colors"
                title="Edit Project"
              >
                <Edit2 size={15} className="text-[#3B82F6]" />
              </button>
              <button
                onClick={() => handleDelete(project.id)}
                className="p-1.5 bg-white rounded-lg shadow-md hover:bg-red-50 transition-colors"
                title="Delete Project"
              >
                <Trash2 size={15} className="text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-[#C8C5D0]">
          <FolderKanban size={48} className="mx-auto text-[#47464F] opacity-50" />
          <p className="text-[#47464F] mt-4 text-xs">No projects found. Create your first project!</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#C8C5D0]">
              <h3 className="text-lg font-bold text-[#191C1D]">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h3>
              <button onClick={handleCloseForm} className="p-1 hover:bg-[#EDEEEF] rounded-lg transition-colors">
                <X size={20} className="text-[#47464F]" />
              </button>
            </div>
            <div className="p-6">
              <ProjectForm 
                project={editingProject} 
                onClose={handleCloseForm}
                onSuccess={() => {
                  handleCloseForm();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsList;
