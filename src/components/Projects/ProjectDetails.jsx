import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { ArrowLeft, Wifi, Droplets, Users, Calendar, CheckSquare, Target, Plus, X } from 'lucide-react';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects, tasks, milestones, groups, updateProject, addMilestone, updateMilestone, deleteMilestone } = useAppContext();
  const [activeTab, setActiveTab] = useState('overview');
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);

  const project = projects.find(p => p.id === parseInt(id));
  const projectTasks = tasks.filter(t => t.project === project?.title);
  const projectMilestones = milestones.filter(m => m.project === project?.title);
  const projectGroups = groups.filter(g => g.project === project?.title);

  const tabs = ['Overview', 'Tasks', 'Milestones', 'Groups'];

  const handleMilestoneSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const milestoneData = {
      title: formData.get('title'),
      project: project.title,
      progress: parseInt(formData.get('progress')) || 0,
      dueDate: formData.get('dueDate'),
    };
    
    if (editingMilestone) {
      updateMilestone(editingMilestone.id, milestoneData);
    } else {
      addMilestone(milestoneData);
    }
    setShowMilestoneForm(false);
    setEditingMilestone(null);
  };

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-[#191C1D]">Project not found</h2>
        <button onClick={() => navigate('/projects')} className="mt-4 text-[#3B82F6] hover:underline">
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate('/projects')}
        className="flex items-center gap-2 text-[#47464F] hover:text-[#191C1D] transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Back to Projects</span>
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-[#C8C5D0] p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${
              project.status === 'Active' || project.status === 'On Track'
                ? 'bg-green-100 text-green-800' 
                : project.status === 'At Risk'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {project.status || 'Active'} • Capstone Project
            </span>
            <h2 className="text-2xl font-bold text-[#191C1D]">{project.title}</h2>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#47464F]">Overall Progress</p>
            <p className="text-2xl font-bold text-[#191C1D]">{project.progress}%</p>
          </div>
        </div>

        <div className="w-full h-2 bg-[#EDEEEF] rounded-full mb-6">
          <div 
            className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded-full transition-all"
            style={{ width: `${project.progress}%` }}
          ></div>
        </div>

        <div className="flex gap-4 border-b border-[#C8C5D0] mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.toLowerCase()
                  ? 'text-[#3B82F6] border-[#3B82F6]'
                  : 'text-[#47464F] border-transparent hover:text-[#191C1D]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-[#191C1D] mb-2">Project Description</h4>
              <p className="text-sm text-[#47464F] leading-relaxed">{project.description}</p>
            </div>

            <div>
              <h4 className="font-semibold text-[#191C1D] mb-3">Key Objectives</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-[#EDEEEF] rounded-lg">
                  <div className="p-2 bg-[#3B82F6]/10 rounded-lg">
                    <Wifi size={18} className="text-[#3B82F6]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#191C1D]">IoT Integration</p>
                    <p className="text-sm text-[#47464F]">Deploy sensor networks across 5 test zones.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[#EDEEEF] rounded-lg">
                  <div className="p-2 bg-[#3B82F6]/10 rounded-lg">
                    <Droplets size={18} className="text-[#3B82F6]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#191C1D]">Water Efficiency</p>
                    <p className="text-sm text-[#47464F]">Reduce overall water consumption by 30%.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#EDEEEF] rounded-lg text-center">
                <Users size={20} className="mx-auto text-[#3B82F6] mb-2" />
                <p className="text-sm text-[#47464F]">Groups</p>
                <p className="text-xl font-bold text-[#191C1D]">{projectGroups.length}</p>
              </div>
              <div className="p-4 bg-[#EDEEEF] rounded-lg text-center">
                <CheckSquare size={20} className="mx-auto text-[#3B82F6] mb-2" />
                <p className="text-sm text-[#47464F]">Tasks</p>
                <p className="text-xl font-bold text-[#191C1D]">{projectTasks.length}</p>
              </div>
              <div className="p-4 bg-[#EDEEEF] rounded-lg text-center">
                <Target size={20} className="mx-auto text-[#3B82F6] mb-2" />
                <p className="text-sm text-[#47464F]">Milestones</p>
                <p className="text-xl font-bold text-[#191C1D]">{projectMilestones.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div>
            {projectTasks.length > 0 ? (
              <div className="space-y-2">
                {projectTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-[#EDEEEF] rounded-lg">
                    <div>
                      <p className="font-medium text-[#191C1D]">{task.title}</p>
                      <p className="text-xs text-[#47464F]">Due: {task.dueDate}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[#47464F] py-8">No tasks for this project</p>
            )}
          </div>
        )}

        {/* Milestones Tab */}
        {activeTab === 'milestones' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-[#191C1D]">Milestones</h4>
              <button 
                onClick={() => setShowMilestoneForm(true)}
                className="flex items-center gap-1 text-sm text-[#3B82F6] hover:underline"
              >
                <Plus size={16} />
                Add Milestone
              </button>
            </div>
            {projectMilestones.length > 0 ? (
              <div className="space-y-3">
                {projectMilestones.map(milestone => (
                  <div key={milestone.id} className="p-4 bg-[#EDEEEF] rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-[#191C1D]">{milestone.title}</p>
                        <p className="text-xs text-[#47464F]">Due: {milestone.dueDate}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#191C1D]">{milestone.progress}%</p>
                        </div>
                        <button 
                          onClick={() => {
                            setEditingMilestone(milestone);
                            setShowMilestoneForm(true);
                          }}
                          className="text-xs text-[#3B82F6] hover:underline"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm('Delete this milestone?')) {
                              deleteMilestone(milestone.id);
                            }
                          }}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[#D9DADB] rounded-full mt-2">
                      <div 
                        className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded-full"
                        style={{ width: `${milestone.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[#47464F] py-8">No milestones for this project</p>
            )}
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div>
            {projectGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectGroups.map(group => (
                  <div key={group.id} className="p-4 bg-[#EDEEEF] rounded-lg">
                    <h4 className="font-semibold text-[#191C1D]">{group.name}</h4>
                    <p className="text-sm text-[#47464F]">Lead: {group.lead}</p>
                    <p className="text-sm text-[#47464F]">Members: {group.members}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[#47464F] py-8">No groups for this project</p>
            )}
          </div>
        )}
      </div>

      {/* Milestone Form Modal */}
      {showMilestoneForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-[#C8C5D0]">
              <h3 className="text-xl font-bold text-[#191C1D]">
                {editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
              </h3>
              <button 
                onClick={() => {
                  setShowMilestoneForm(false);
                  setEditingMilestone(null);
                }} 
                className="p-1 hover:bg-[#EDEEEF] rounded-lg transition-colors"
              >
                <X size={24} className="text-[#47464F]" />
              </button>
            </div>
            <form onSubmit={handleMilestoneSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#191C1D] mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingMilestone?.title || ''}
                  required
                  className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#191C1D] mb-1">Progress (%)</label>
                <input
                  type="number"
                  name="progress"
                  defaultValue={editingMilestone?.progress || 0}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#191C1D] mb-1">Due Date</label>
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={editingMilestone?.dueDate || ''}
                  className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#C8C5D0]">
                <button
                  type="button"
                  onClick={() => {
                    setShowMilestoneForm(false);
                    setEditingMilestone(null);
                  }}
                  className="px-4 py-2 border border-[#C8C5D0] rounded-lg text-[#47464F] hover:bg-[#EDEEEF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg font-medium hover:bg-[#3B82F6]/90 transition-colors"
                >
                  {editingMilestone ? 'Update' : 'Add'} Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;