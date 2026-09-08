import React, { useState } from 'react';

const ProfilePage = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    department: user?.department || '',
    level: user?.level || '',
    matricule: user?.matricule || '',
    phone: user?.phone || '',
  });

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
    alert('✅ Profile updated successfully!');
    setIsEditing(false);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const userRole = user?.role || 'student';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#191C1D]">My Profile</h2>
          <p className="text-[#47464F]">Manage your personal information</p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            isEditing 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90'
          }`}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#C8C5D0] overflow-hidden">
        <div className="bg-gradient-to-r from-[#1E1B4B] to-[#2A1F6E] p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[#3B82F6] flex items-center justify-center text-2xl font-bold">
              {getInitials(formData.fullName || user?.fullName)}
            </div>
            <div>
              <h3 className="text-xl font-bold">{formData.fullName || user?.fullName}</h3>
              <p className="text-[#8683BA] capitalize">
                {userRole === 'student' ? '🎓 Student' : 
                 userRole === 'lecturer' ? '👨‍🏫 Lecturer' : 
                 userRole === 'admin' ? '👑 Admin' : 'User'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase">Full Name</label>
              {isEditing ? (
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange}
                  className="w-full mt-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6]" />
              ) : (
                <p className="mt-1 text-[#191C1D] font-medium">{formData.fullName || '-'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase">Matricule</label>
              <p className="mt-1 text-[#191C1D] font-medium">{formData.matricule || user?.matricule || '-'}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase">Email</label>
              {isEditing ? (
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  className="w-full mt-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6]" />
              ) : (
                <p className="mt-1 text-[#191C1D] font-medium">{formData.email || '-'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase">Department</label>
              {isEditing ? (
                <input type="text" name="department" value={formData.department} onChange={handleChange}
                  className="w-full mt-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6]" />
              ) : (
                <p className="mt-1 text-[#191C1D] font-medium">{formData.department || '-'}</p>
              )}
            </div>
            {userRole === 'student' && (
              <div>
                <label className="block text-xs font-semibold text-[#47464F] uppercase">Level</label>
                {isEditing ? (
                  <select name="level" value={formData.level} onChange={handleChange}
                    className="w-full mt-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white">
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
            <div>
              <label className="block text-xs font-semibold text-[#47464F] uppercase">Phone</label>
              {isEditing ? (
                <input type="text" name="phone" value={formData.phone} onChange={handleChange}
                  className="w-full mt-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6]" />
              ) : (
                <p className="mt-1 text-[#191C1D] font-medium">{formData.phone || 'Not set'}</p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="mt-6 pt-6 border-t border-[#C8C5D0] flex justify-end">
              <button onClick={handleSave}
                className="px-6 py-3 bg-[#3B82F6] text-white rounded-xl font-semibold hover:bg-[#3B82F6]/90">
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