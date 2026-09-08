import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, ArrowRight } from 'lucide-react';

const ProjectCard = ({ project }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#C8C5D0] p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-[#191C1D]">{project.title}</h3>
          <div className="flex items-center gap-3 text-sm text-[#47464F] mt-1">
            <span className="flex items-center gap-1">
              <Users size={14} />
              {project.group || 'No group'}
            </span>
            <span>•</span>
            <span>{project.supervisor || 'No supervisor'}</span>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          project.status === 'Active' || project.status === 'On Track'
            ? 'bg-[#3B82F6]/10 text-[#3B82F6]'
            : project.status === 'At Risk'
            ? 'bg-red-100 text-red-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {project.status || 'Active'}
        </span>
      </div>

      <p className="text-sm text-[#47464F] mb-4 line-clamp-2">
        {project.description || 'No description provided'}
      </p>

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-[#47464F] mb-1">
          <span>Overall Progress</span>
          <span className="font-semibold text-[#191C1D]">{project.progress || 0}%</span>
        </div>
        <div className="w-full h-2 bg-[#EDEEEF] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded-full transition-all"
            style={{ width: `${project.progress || 0}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[#47464F]">
          <Calendar size={14} />
          <span>Deadline: {project.deadline || 'Not set'}</span>
        </div>
        <button 
          onClick={() => navigate(`/projects/${project.id}`)}
          className="flex items-center gap-1 text-[#3B82F6] hover:underline text-sm font-medium"
        >
          View Details
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default ProjectCard;