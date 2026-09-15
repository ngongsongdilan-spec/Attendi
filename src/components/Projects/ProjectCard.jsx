import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, ArrowRight } from 'lucide-react';

const ProjectCard = ({ project }) => {
  const navigate = useNavigate();

  return (
    <div className="fet-card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[15px] font-semibold text-text-primary">{project.title}</h3>
          <div className="flex items-center gap-3 text-[13px] text-text-secondary mt-1">
            <span className="flex items-center gap-1">
              <Users size={14} />
              {project.group || 'No group'}
            </span>
            <span>•</span>
            <span>{project.supervisor || 'No supervisor'}</span>
          </div>
        </div>
        <span className={`fet-badge ${
          project.status === 'Active' || project.status === 'On Track'
            ? 'fet-badge-active'
            : project.status === 'At Risk'
            ? 'fet-badge-danger'
            : 'fet-badge-warning'
        }`}>
          {project.status || 'Active'}
        </span>
      </div>

      <p className="text-[13px] text-text-secondary mb-4 line-clamp-2">
        {project.description || 'No description provided'}
      </p>

      <div className="mb-4">
        <div className="flex items-center justify-between text-[13px] text-text-secondary mb-1">
          <span>Overall Progress</span>
          <span className="font-semibold text-text-primary">{project.progress || 0}%</span>
        </div>
        <div className="fet-progress-bar">
          <div 
            className="fet-progress-bar-fill"
            style={{ width: `${project.progress || 0}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] text-text-secondary">
          <Calendar size={14} />
          <span>Deadline: {project.deadline || 'Not set'}</span>
        </div>
        <button 
          onClick={() => navigate(`/projects/${project.id}`)}
          className="flex items-center gap-1 text-primary hover:underline text-[13px] font-medium"
        >
          View Details
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default ProjectCard;
