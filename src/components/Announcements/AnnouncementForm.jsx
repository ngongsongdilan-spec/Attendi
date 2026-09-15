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
        <label className="fet-label">Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
          className="w-full px-4 py-2 fet-input"
        />
      </div>

      <div>
        <label className="fet-label">Content</label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
          rows={4}
          required
          className="w-full px-4 py-2 fet-input resize-none"
        />
      </div>

      <div>
        <label className="fet-label">Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
          className="w-full px-4 py-2 fet-select"
        >
          <option value="Update">Update</option>
          <option value="Important">Important</option>
          <option value="Event">Event</option>
        </select>
      </div>

      <div>
        <label className="fet-label">Author</label>
        <input
          type="text"
          value={formData.author}
          onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
          className="w-full px-4 py-2 fet-input"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border-default">
        <button
          type="button"
          onClick={onClose}
          className="fet-btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="fet-btn-primary"
        >
          Post Announcement
        </button>
      </div>
    </form>
  );
};

export default AnnouncementForm;
