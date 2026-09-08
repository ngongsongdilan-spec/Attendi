import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const AnnouncementForm = ({ onClose, onSuccess }) => {
  const { addAnnouncement } = useAppContext();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'Update',
    author: 'Dr. Sarah Chen',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    addAnnouncement(formData);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#191C1D] mb-1">Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
          className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#191C1D] mb-1">Content</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
          rows={4}
          required
          className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#191C1D] mb-1">Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
          className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
        >
          <option value="Update">Update</option>
          <option value="Important">Important</option>
          <option value="Event">Event</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#191C1D] mb-1">Author</label>
        <input
          type="text"
          value={formData.author}
          onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
          className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[#C8C5D0]">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-[#C8C5D0] rounded-lg text-[#47464F] hover:bg-[#EDEEEF] transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg font-medium hover:bg-[#3B82F6]/90 transition-colors"
        >
          Post Announcement
        </button>
      </div>
    </form>
  );
};

export default AnnouncementForm;