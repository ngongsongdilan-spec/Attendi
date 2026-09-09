import React, { useState } from 'react';
import { Edit2, Save, X, User, Mail, Building, GraduationCap, Phone, MapPin } from 'lucide-react';

const ProfilePage = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    department: user?.department || '',
    level: user?.level || '',
    matricule: user?.matricule || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    const updatedUser = { ...user, ...formData };
    localStorage.setItem('fet_user', JSON.stringify(updatedUser));
    localStorage.setItem('fet_user_name', formData.fullName);
    if (formData.level) {
      localStorage.setItem('fet_user_level', formData.level);
    }
    setSuccess('✅ Profile updated successfully!');
    setIsEditing(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const userRole = user?.role || 'student';

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

      <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] overflow-hidden">
        {/* Header with Avatar */}
        <div className="bg-gradient-to-r from-[#1E1B4B] to-[#2A1F6E] p-4 md:p-6 text-white">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#3B82F6] flex items-center justify-center text-xl md:text-2xl font-bold flex-shrink-0">
              {getInitials(formData.fullName || user?.fullName)}
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-lg md:text-xl font-bold">{formData.fullName || user?.fullName}</h3>
              <p className="text-[#8683BA] text-sm capitalize">
                {userRole === 'student' ? '🎓 Student' : 
                 userRole === 'lecturer' ? '👨‍🏫 Lecturer' : 
                 userRole === 'admin' ? '👑 Admin' : 'User'}
              </p>
              {userRole === 'student' && formData.level && (
                <p className="text-[#8683BA] text-xs">Level {formData.level}</p>
              )}
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase tracking-wider">Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full mt-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
                />
              ) : (
                <p className="mt-1 text-[#191C1D] font-medium">{formData.fullName || '-'}</p>
              )}
            </div>

            {/* Matricule */}
            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase tracking-wider">
                {userRole === 'student' ? 'Matricule Number' : 'ID'}
              </label>
              <p className="mt-1 text-[#191C1D] font-medium">
                {userRole === 'student' ? formData.matricule || user?.matricule || '-' : user?.staffNumber || '-'}
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase tracking-wider">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full mt-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
                />
              ) : (
                <p className="mt-1 text-[#191C1D] font-medium">{formData.email || '-'}</p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase tracking-wider">Department</label>
              {isEditing ? (
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full mt-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
                />
              ) : (
                <p className="mt-1 text-[#191C1D] font-medium">{formData.department || '-'}</p>
              )}
            </div>

            {/* Level - Only for Students */}
            {userRole === 'student' && (
              <div>
                <label className="block text-xs font-semibold text-[#47464F] uppercase tracking-wider">Level</label>
                {isEditing ? (
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    className="w-full mt-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-[#191C1D]"
                  >
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                    <option value="400">400 Level</option>
                    <option value="500">500 Level</option>
                    <option value="MSc">MSc</option>
                    <option value="PhD">PhD</option>
                  </select>
                ) : (
                  <p className="mt-1 text-[#191C1D] font-medium">Level {formData.level || '-'}</p>
                )}
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase tracking-wider">Phone</label>
              {isEditing ? (
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className="w-full mt-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
                />
              ) : (
                <p className="mt-1 text-[#191C1D] font-medium">{formData.phone || 'Not set'}</p>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#47464F] uppercase tracking-wider">Address</label>
              {isEditing ? (
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter address"
                  className="w-full mt-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
                />
              ) : (
                <p className="mt-1 text-[#191C1D] font-medium">{formData.address || 'Not set'}</p>
              )}
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="mt-6 pt-6 border-t border-[#C8C5D0] flex justify-end">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-[#3B82F6] text-white rounded-xl font-semibold hover:bg-[#3B82F6]/90 transition-colors"
              >
                <Save size={18} />
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;