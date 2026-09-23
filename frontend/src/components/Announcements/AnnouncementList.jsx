import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Bell, Calendar, AlertCircle, RotateCw } from 'lucide-react';
import { getAnnouncements } from '../../api/announcements';
import AnnouncementForm from './AnnouncementForm';

const ACADEMIC_ROLES = ['lecturer', 'admin'];

/**
 * Visible-announcements feed (BR-080..084). The server scopes the list to
 * the authenticated session; only academic users get the create action
 * (BR-083 — the backend re-checks it regardless).
 */
const AnnouncementList = ({ user }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const isAcademic = ACADEMIC_ROLES.includes(user?.displayRole);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await getAnnouncements();
      setAnnouncements(rows);
    } catch (err) {
      setError(err.message || 'Could not load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const badgeClass = (row) => {
    if (row.is_important) return 'fet-badge fet-badge-danger';
    if (row.scope === 'faculty' || row.scope === 'department') return 'fet-badge fet-badge-info';
    return 'fet-badge fet-badge-active';
  };

  const scopeIcon = (row) => {
    if (row.is_important) return <AlertCircle size={16} />;
    if (row.scope === 'faculty' || row.scope === 'department') return <Calendar size={16} />;
    return <Bell size={16} />;
  };

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Announcements</h2>
          <p className="text-text-secondary" style={{ fontSize: '14px' }}>Stay updated with the latest news</p>
        </div>
        {isAcademic && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="fet-btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Post Announcement
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-2">
          <span>{error}</span>
          <button onClick={load} className="flex items-center gap-1 text-red-700 font-semibold hover:underline">
            <RotateCw size={14} /> Retry
          </button>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 fet-card">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-text-secondary mt-4">Loading announcements…</p>
          </div>
        ) : announcements.length > 0 ? (
          announcements.map((announcement) => (
            <div key={announcement.id} className="fet-card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`flex items-center gap-1 ${badgeClass(announcement)}`}>
                      {scopeIcon(announcement)}
                      {announcement.is_important ? 'Important' : announcement.scope_label}
                    </span>
                    <span className="text-xs text-text-secondary">{formatDate(announcement.created_at)}</span>
                    {!announcement.is_published && (
                      <span className="fet-badge fet-badge-pending">Draft</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary" style={{ fontSize: '15px' }}>{announcement.title}</h3>
                  <p className="text-text-secondary mt-2" style={{ fontSize: '14px' }}>{announcement.body}</p>
                </div>
                {isAcademic && (
                  <button
                    onClick={() => { setEditing(announcement); setShowForm(true); }}
                    className="text-[13px] text-primary hover:underline shrink-0 ml-4"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 fet-card">
            <Bell size={48} className="mx-auto text-text-secondary opacity-50" />
            <p className="text-text-secondary mt-4">No announcements yet.</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border-default">
              <h3 className="text-xl font-bold text-text-primary" style={{ fontSize: '18px' }}>
                {editing ? 'Edit Announcement' : 'Post Announcement'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-page-bg rounded-lg transition-colors">
                <X size={24} className="text-text-secondary" />
              </button>
            </div>
            <div className="p-6">
              <AnnouncementForm
                announcement={editing}
                onClose={() => setShowForm(false)}
                onSuccess={() => { setShowForm(false); load(); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementList;
