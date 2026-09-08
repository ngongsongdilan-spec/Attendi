import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, X, Trash2, Bell, Calendar, AlertCircle } from 'lucide-react';
import AnnouncementForm from './AnnouncementForm';

const AnnouncementList = () => {
  const { announcements, deleteAnnouncement } = useAppContext();
  const [showForm, setShowForm] = useState(false);

  const getTypeColor = (type) => {
    switch(type) {
      case 'Important': return 'bg-red-100 text-red-800';
      case 'Event': return 'bg-blue-100 text-blue-800';
      case 'Update': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'Important': return <AlertCircle size={16} />;
      case 'Event': return <Calendar size={16} />;
      default: return <Bell size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#191C1D]">Announcements</h2>
          <p className="text-[#47464F]">Stay updated with the latest news</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-lg font-medium hover:bg-[#3B82F6]/90 transition-colors"
        >
          <Plus size={18} />
          Post Announcement
        </button>
      </div>

      <div className="space-y-4">
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <div key={announcement.id} className="bg-white rounded-lg shadow-sm border border-[#C8C5D0] p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getTypeColor(announcement.type)}`}>
                      {getTypeIcon(announcement.type)}
                      {announcement.type}
                    </span>
                    <span className="text-xs text-[#47464F]">{announcement.date}</span>
                    <span className="text-xs text-[#47464F]">• By {announcement.author}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-[#191C1D]">{announcement.title}</h3>
                  <p className="text-[#47464F] mt-2">{announcement.content}</p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this announcement?')) {
                      deleteAnnouncement(announcement.id);
                    }
                  }}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} className="text-red-500" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-[#C8C5D0]">
            <Bell size={48} className="mx-auto text-[#47464F] opacity-50" />
            <p className="text-[#47464F] mt-4">No announcements yet. Post your first announcement!</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#C8C5D0]">
              <h3 className="text-xl font-bold text-[#191C1D]">Post Announcement</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-[#EDEEEF] rounded-lg transition-colors">
                <X size={24} className="text-[#47464F]" />
              </button>
            </div>
            <div className="p-6">
              <AnnouncementForm 
                onClose={() => setShowForm(false)}
                onSuccess={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementList;