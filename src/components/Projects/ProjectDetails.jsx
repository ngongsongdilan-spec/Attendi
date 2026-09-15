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
        <h2 className="text-[22px] font-bold text-text-primary">Project not found</h2>
        <button onClick={() => navigate('/projects')} className="mt-4 text-primary hover:underline">
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate('/projects')}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Back to Projects</span>
      </button>

      <div className="fet-card p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className={`fet-badge mb-2 ${
              project.status === 'Active' || project.status === 'On Track'
                ? 'fet-badge-active'
                : project.status === 'At Risk'
                ? 'fet-badge-danger'
                : 'fet-badge-warning'
            }`}>
              {project.status || 'Active'} • Capstone Project
            </span>
            <h2 className="text-[22px] font-bold text-text-primary">{project.title}</h2>
          </div>
          <div className="text-right">
            <p className="text-[13px] text-text-secondary">Overall Progress</p>
            <p className="text-[22px] font-bold text-text-primary">{project.progress}%</p>
          </div>
        </div>

        <div className="fet-progress-bar mb-6">
          <div 
            className="fet-progress-bar-fill"
            style={{ width: `${project.progress}%` }}
          ></div>
        </div>

        <div className="flex gap-4 border-b border-border-default mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`px-4 py-2 text-[14px] font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab.toLowerCase()
                  ? 'text-primary border-primary'
                  : 'text-text-secondary border-transparent hover:text-text-primary'
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
              <h4 className="font-semibold text-text-primary mb-2">Project Description</h4>
              <p className="text-[13px] text-text-secondary leading-relaxed">{project.description}</p>
            </div>

            <div>
              <h4 className="font-semibold text-text-primary mb-3">Key Objectives</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-page-bg rounded-lg">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Wifi size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">IoT Integration</p>
                    <p className="text-[13px] text-text-secondary">Deploy sensor networks across 5 test zones.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-page-bg rounded-lg">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Droplets size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Water Efficiency</p>
                    <p className="text-[13px] text-text-secondary">Reduce overall water consumption by 30%.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-page-bg rounded-lg text-center">
                <Users size={20} className="mx-auto text-primary mb-2" />
                <p className="text-[13px] text-text-secondary">Groups</p>
                <p className="text-xl font-bold text-text-primary">{projectGroups.length}</p>
              </div>
              <div className="p-4 bg-page-bg rounded-lg text-center">
                <CheckSquare size={20} className="mx-auto text-primary mb-2" />
                <p className="text-[13px] text-text-secondary">Tasks</p>
                <p className="text-xl font-bold text-text-primary">{projectTasks.length}</p>
              </div>
              <div className="p-4 bg-page-bg rounded-lg text-center">
                <Target size={20} className="mx-auto text-primary mb-2" />
                <p className="text-[13px] text-text-secondary">Milestones</p>
                <p className="text-xl font-bold text-text-primary">{projectMilestones.length}</p>
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
                  <div key={task.id} className="flex items-center justify-between p-3 bg-page-bg rounded-lg">
                    <div>
                      <p className="font-medium text-text-primary">{task.title}</p>
                      <p className="text-[13px] text-text-secondary">Due: {task.dueDate}</p>
                    </div>
                    <span className={`fet-badge ${
                      task.status === 'Completed' ? 'fet-badge-completed' :
                      task.status === 'In Progress' ? 'fet-badge-pending' :
                      'fet-badge-inactive'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-text-secondary py-8">No tasks for this project</p>
            )}
          </div>
        )}

        {/* Milestones Tab */}
        {activeTab === 'milestones' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-text-primary">Milestones</h4>
              <button 
                onClick={() => setShowMilestoneForm(true)}
                className="flex items-center gap-1 text-[13px] text-primary hover:underline"
              >
                <Plus size={16} />
                Add Milestone
              </button>
            </div>
            {projectMilestones.length > 0 ? (
              <div className="space-y-3">
                {projectMilestones.map(milestone => (
                  <div key={milestone.id} className="p-4 bg-page-bg rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-text-primary">{milestone.title}</p>
                        <p className="text-[13px] text-text-secondary">Due: {milestone.dueDate}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[13px] font-semibold text-text-primary">{milestone.progress}%</p>
                        </div>
                        <button 
                          onClick={() => {
                            setEditingMilestone(milestone);
                            setShowMilestoneForm(true);
                          }}
                          className="text-[13px] text-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm('Delete this milestone?')) {
                              deleteMilestone(milestone.id);
                            }
                          }}
                          className="text-[13px] text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="fet-progress-bar mt-2" style={{ height: '6px' }}>
                      <div 
                        className="fet-progress-bar-fill"
                        style={{ width: `${milestone.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-text-secondary py-8">No milestones for this project</p>
            )}
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div>
            {projectGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectGroups.map(group => (
                  <div key={group.id} className="p-4 bg-page-bg rounded-lg">
                    <h4 className="font-semibold text-text-primary">{group.name}</h4>
                    <p className="text-[13px] text-text-secondary">Lead: {group.lead}</p>
                    <p className="text-[13px] text-text-secondary">Members: {group.members}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-text-secondary py-8">No groups for this project</p>
            )}
          </div>
        )}
      </div>

      {/* Milestone Form Modal */}
      {showMilestoneForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-border-default">
              <h3 className="text-[15px] font-bold text-text-primary">
                {editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
              </h3>
              <button 
                onClick={() => {
                  setShowMilestoneForm(false);
                  setEditingMilestone(null);
                }} 
                className="p-1 hover:bg-page-bg rounded-lg transition-colors"
              >
                <X size={24} className="text-text-secondary" />
              </button>
            </div>
            <form onSubmit={handleMilestoneSubmit} className="p-6 space-y-4">
              <div>
                <label className="fet-label">Title</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingMilestone?.title || ''}
                  required
                  className="fet-input"
                />
              </div>
              <div>
                <label className="fet-label">Progress (%)</label>
                <input
                  type="number"
                  name="progress"
                  defaultValue={editingMilestone?.progress || 0}
                  min="0"
                  max="100"
                  className="fet-input"
                />
              </div>
              <div>
                <label className="fet-label">Due Date</label>
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={editingMilestone?.dueDate || ''}
                  className="fet-input"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => {
                    setShowMilestoneForm(false);
                    setEditingMilestone(null);
                  }}
                  className="fet-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="fet-btn-primary"
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
