import { useNavigate } from 'react-router-dom';
import { Users, Calendar, ArrowRight } from 'lucide-react';

const ProjectCard = ({ project }) => {
  const navigate = useNavigate();

  return (
    <div className="fet-card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-text-primary truncate">{project.title}</h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-text-secondary mt-1">
            <span className="flex items-center gap-1 truncate">
              <Users size={14} />
              {project.group || 'No group'}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="truncate">{project.supervisor || 'No supervisor'}</span>
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

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] text-text-secondary min-w-0">
          <Calendar size={14} className="flex-shrink-0" />
          <span className="truncate">Deadline: {project.deadline || 'Not set'}</span>
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
