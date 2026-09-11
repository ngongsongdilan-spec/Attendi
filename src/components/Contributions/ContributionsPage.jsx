import React, { useState, useEffect } from 'react';
import { Plus, Send, CheckCircle, XCircle, MessageSquare, FileText, Upload } from 'lucide-react';
import ContributionForm from './ContributionForm';
import { useAppContext } from '../../context/AppContext';

const loadContributions = () => {
  try {
    return JSON.parse(localStorage.getItem('fet_contributions') || '[]');
  } catch {
    return [];
  }
};

const saveContributions = (list) => {
  localStorage.setItem('fet_contributions', JSON.stringify(list));
};

const ContributionsPage = ({ user }) => {
  const { projects } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [contributions, setContributions] = useState([]);
  const [filter, setFilter] = useState('all');

  const isLecturer = user?.role === 'lecturer' || user?.role === 'admin';

  useEffect(() => {
    setContributions(loadContributions());
  }, []);

  const myContributions = contributions.filter(c => c.studentMatricule === user?.matricule);
  const lecturerContributions = contributions;

  const handleNewContribution = (data) => {
    const contribution = {
      ...data,
      studentMatricule: user?.matricule,
      studentName: user?.fullName,
      course: user?.matricule ? 'Project Related' : 'Unknown',
    };
    const updated = [contribution, ...contributions];
    saveContributions(updated);
    setContributions(updated);
    setShowForm(false);
  };

  const handleStatusChange = (id, status) => {
    const updated = contributions.map(c =>
      c.id === id ? { ...c, status: status === 'Request Clarification' ? 'Clarification Requested' : status } : c
    );
    saveContributions(updated);
    setContributions(updated);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
      case 'Accepted': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Clarification Requested': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const displayed = isLecturer
    ? lecturerContributions.filter(c => filter === 'all' || c.status === filter)
    : myContributions;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#191C1D]">Contributions</h2>
          <p className="text-[#47464F] text-sm">
            {isLecturer ? 'Review student contributions for your projects' : 'Track and submit your contributions'}
          </p>
        </div>
        {!isLecturer && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-lg font-medium hover:bg-[#3B82F6]/90 transition-colors"
          >
            <Plus size={18} />
            Submit Contribution
          </button>
        )}
      </div>

      {isLecturer && (
        <div className="flex gap-2">
          {['all', 'Pending Review', 'Accepted', 'Rejected', 'Clarification Requested'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === s ? 'bg-[#3B82F6] text-white' : 'bg-white border border-[#C8C5D0] text-[#47464F]'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      )}

      {displayed.length > 0 ? (
        <div className="space-y-4">
          {displayed.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-[#191C1D]">{c.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  {c.studentName && (
                    <p className="text-sm text-[#47464F] mt-1">Submitted by {c.studentName} ({c.studentMatricule})</p>
                  )}
                  <p className="text-sm text-[#47464F] mt-1">Type: {c.type}</p>
                  <p className="text-sm text-[#191C1D] mt-2">{c.description}</p>
                  <p className="text-xs text-[#47464F] mt-2">
                    {new Date(c.date).toLocaleString()} • Evidence: {c.evidenceFile || 'None attached'}
                  </p>
                </div>
              </div>

              {isLecturer && c.status === 'Pending Review' && (
                <div className="mt-4 pt-4 border-t border-[#C8C5D0] flex gap-3">
                  <button
                    onClick={() => handleStatusChange(c.id, 'Accepted')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600"
                  >
                    <CheckCircle size={14} /> Accept
                  </button>
                  <button
                    onClick={() => handleStatusChange(c.id, 'Rejected')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    onClick={() => handleStatusChange(c.id, 'Request Clarification')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-medium hover:bg-yellow-600"
                  >
                    <MessageSquare size={14} /> Request Clarification
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-[#C8C5D0]">
          <FileText size={48} className="mx-auto text-[#47464F] opacity-50" />
          <p className="text-[#47464F] mt-4">
            {isLecturer ? 'No contributions to review yet.' : 'No contributions yet. Submit your first contribution!'}
          </p>
          {!isLecturer && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-lg font-medium."
            >
              <Upload size={16} /> Submit Contribution
            </button>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <ContributionForm
            projectId={projects[0]?.id}
            onSubmit={handleNewContribution}
            onClose={() => setShowForm(false)}
          />
        </div>
      )}
    </div>
  );
};

export default ContributionsPage;