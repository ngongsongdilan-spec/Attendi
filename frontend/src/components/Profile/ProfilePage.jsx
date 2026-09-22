/**
 * ProfilePage — View/edit user profile connected to the real backend.
 *
 * Uses the useAuth hook to read and update profile data.
 *
 * @module components/Profile/ProfilePage
 */

import React, { useState } from 'react';
import { Edit2, Save, X, User, Mail, Building, GraduationCap } from 'lucide-react';

const ProfilePage = ({ user, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || '',
    matricule: user?.matricule || '',
    staffid: user?.staffid || '',
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      if (onUpdateProfile) {
        await onUpdateProfile(formData);
      }
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    const f = firstName?.[0] || '';
    const l = lastName?.[0] || '';
    return (f + l).toUpperCase() || 'U';
  };

  const userRole = user?.role || 'STUDENT';
  const displayRole = userRole === 'ADMINISTRATOR' ? 'admin' : userRole.toLowerCase();
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'User';

  return (
    <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#191C1D]">My Profile</h2>
          <p className="text-sm text-[#47464F]">Manage your personal information</p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors text-sm ${
            isEditing
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90'
          }`}
        >
          {isEditing ? <X size={18} /> : <Edit2 size={18} />}
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] overflow-hidden">
        <div className="bg-gradient-to-r from-[#1E1B4B] to-[#2A1F6E] p-4 md:p-6 text-white">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#3B82F6] flex items-center justify-center text-xl md:text-2xl font-bold flex-shrink-0">
              {getInitials(user?.first_name, user?.last_name)}
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-lg md:text-xl font-bold">{fullName}</h3>
              <p className="text-[#8683BA] text-sm capitalize">
                {displayRole === 'student' ? 'Student' :
                 displayRole === 'lecturer' ? 'Lecturer' :
                 displayRole === 'admin' ? 'Administrator' : 'User'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase tracking-wider">First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full mt-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
                />
              ) : (
                <p className="mt-1 text-[#191C1D] font-medium">{user?.first_name || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase tracking-wider">Last Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full mt-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
                />
              ) : (
                <p className="mt-1 text-[#191C1D] font-medium">{user?.last_name || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase tracking-wider">Email</label>
              <p className="mt-1 text-[#191C1D] font-medium">{user?.email || '-'}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase tracking-wider">Matricule</label>
              {isEditing ? (
                <input
                  type="text"
                  name="matricule"
                  value={formData.matricule}
                  onChange={handleChange}
                  placeholder="Student matricule number"
                  className="w-full mt-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
                />
              ) : (
                <p className="mt-1 text-[#191C1D] font-medium">{user?.matricule || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase tracking-wider">Staff ID</label>
              {isEditing ? (
                <input
                  type="text"
                  name="staffid"
                  value={formData.staffid}
                  onChange={handleChange}
                  placeholder="Staff / employee number"
                  className="w-full mt-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
                />
              ) : (
                <p className="mt-1 text-[#191C1D] font-medium">{user?.staffid || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase tracking-wider">Username</label>
              <p className="mt-1 text-[#191C1D] font-medium">{user?.username || '-'}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase tracking-wider">Role</label>
              <p className="mt-1 text-[#191C1D] font-medium capitalize">{displayRole}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase tracking-wider">Member Since</label>
              <p className="mt-1 text-[#191C1D] font-medium">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
              </p>
            </div>
          </div>

          {isEditing && (
            <div className="mt-6 pt-6 border-t border-[#C8C5D0] flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-[#3B82F6] text-white rounded-xl font-semibold hover:bg-[#3B82F6]/90 transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
