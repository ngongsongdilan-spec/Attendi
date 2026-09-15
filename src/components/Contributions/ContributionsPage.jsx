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
      case 'Accepted': return 'fet-badge fet-badge-active';
      case 'Rejected': return 'fet-badge fet-badge-danger';
      case 'Clarification Requested': return 'fet-badge fet-badge-pending';
      default: return 'fet-badge fet-badge-inactive';
    }
  };

  const displayed = isLecturer
    ? lecturerContributions.filter(c => filter === 'all' || c.status === filter)
    : myContributions;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Contributions</h2>
          <p className="text-text-secondary" style={{ fontSize: '13px' }}>
            {isLecturer ? 'Review student contributions for your projects' : 'Track and submit your contributions'}
          </p>
        </div>
        {!isLecturer && (
          <button
            onClick={() => setShowForm(true)}
            className="fet-btn-primary flex items-center gap-2"
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
                filter === s ? 'fet-btn-primary' : 'fet-btn-secondary'
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
            <div key={c.id} className="fet-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-text-primary">{c.title}</h3>
                    <span className={`${getStatusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  {c.studentName && (
                    <p className="text-sm text-text-secondary mt-1">Submitted by {c.studentName} ({c.studentMatricule})</p>
                  )}
                  <p className="text-sm text-text-secondary mt-1">Type: {c.type}</p>
                  <p className="text-sm text-text-primary mt-2">{c.description}</p>
                  <p className="text-xs text-text-secondary mt-2">
                    {new Date(c.date).toLocaleString()} • Evidence: {c.evidenceFile || 'None attached'}
                  </p>
                </div>
              </div>

              {isLecturer && c.status === 'Pending Review' && (
                <div className="mt-4 pt-4 border-t border-border-default flex gap-3">
                  <button
                    onClick={() => handleStatusChange(c.id, 'Accepted')}
                    className="fet-btn-success flex items-center gap-1 text-xs"
                  >
                    <CheckCircle size={14} /> Accept
                  </button>
                  <button
                    onClick={() => handleStatusChange(c.id, 'Rejected')}
                    className="fet-btn-danger flex items-center gap-1 text-xs"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    onClick={() => handleStatusChange(c.id, 'Request Clarification')}
                    className="fet-btn-secondary flex items-center gap-1 text-xs"
                  >
                    <MessageSquare size={14} /> Request Clarification
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 fet-card">
          <FileText size={48} className="mx-auto text-text-secondary opacity-50" />
          <p className="text-text-secondary mt-4">
            {isLecturer ? 'No contributions to review yet.' : 'No contributions yet. Submit your first contribution!'}
          </p>
          {!isLecturer && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 fet-btn-primary inline-flex items-center gap-2"
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
