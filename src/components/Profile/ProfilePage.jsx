import { useState, useEffect } from 'react';
import { Edit2, Save, X, AlertTriangle, Trash2 } from 'lucide-react';
import { deleteOwnAccount, setFlashMessage } from '../../utils/authStorage';

const ProfilePage = ({ user, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');
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

  useEffect(() => {
    if (!showDeleteConfirm) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowDeleteConfirm(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showDeleteConfirm]);

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
    window.dispatchEvent(new CustomEvent('fet-profile-updated'));
    setTimeout(() => setSuccess(''), 3000);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const userRole = user?.role || 'student';

  const handleDeleteAccount = () => {
    const result = deleteOwnAccount({ user, role: userRole });
    if (!result.success) {
      setDeleteError(result.reason || 'Unable to delete this account.');
      return;
    }
    setFlashMessage('Your account has been deleted from this frontend simulation.');
    setShowDeleteConfirm(false);
    if (onLogout) onLogout();
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-text-primary" style={{ fontSize: '20px' }}>My Profile</h2>
          <p className="text-sm text-text-secondary">Manage your personal information</p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors text-sm ${
            isEditing 
              ? 'fet-btn-danger' 
              : 'fet-btn-primary'
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

      <div className="fet-card overflow-hidden">
        {/* Header with Avatar */}
        <div className="fet-welcome-banner">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary flex items-center justify-center text-xl md:text-2xl font-bold flex-shrink-0">
              {getInitials(formData.fullName || user?.fullName)}
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-lg md:text-xl font-bold">{formData.fullName || user?.fullName}</h3>
              <p className="text-white/80 text-sm capitalize">
                {userRole === 'student' ? '🎓 Student' : 
                 userRole === 'lecturer' ? '👨‍🏫 Lecturer' : 
                 userRole === 'admin' ? '👑 Admin' : 'User'}
              </p>
              {userRole === 'student' && formData.level && (
                <p className="text-white/80 text-xs">Level {formData.level}</p>
              )}
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full mt-1 px-4 py-2 fet-input"
                />
              ) : (
                <p className="mt-1 text-text-primary font-medium">{formData.fullName || '-'}</p>
              )}
            </div>

            {/* Matricule */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {userRole === 'student' ? 'Matricule Number' : 'ID'}
              </label>
              <p className="mt-1 text-text-primary font-medium">
                {userRole === 'student' ? formData.matricule || user?.matricule || '-' : user?.staffNumber || '-'}
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full mt-1 px-4 py-2 fet-input"
                />
              ) : (
                <p className="mt-1 text-text-primary font-medium">{formData.email || '-'}</p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">Department</label>
              {isEditing ? (
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full mt-1 px-4 py-2 fet-input"
                />
              ) : (
                <p className="mt-1 text-text-primary font-medium">{formData.department || '-'}</p>
              )}
            </div>

            {/* Level - Only for Students */}
            {userRole === 'student' && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">Level</label>
                {isEditing ? (
                  <select
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                    className="w-full mt-1 px-4 py-2 fet-select"
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
                  <p className="mt-1 text-text-primary font-medium">Level {formData.level || '-'}</p>
                )}
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">Phone</label>
              {isEditing ? (
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  className="w-full mt-1 px-4 py-2 fet-input"
                />
              ) : (
                <p className="mt-1 text-text-primary font-medium">{formData.phone || 'Not set'}</p>
              )}
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">Address</label>
              {isEditing ? (
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter address"
                  className="w-full mt-1 px-4 py-2 fet-input"
                />
              ) : (
                <p className="mt-1 text-text-primary font-medium">{formData.address || 'Not set'}</p>
              )}
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="mt-6 pt-6 border-t border-border-default flex justify-end">
              <button
                onClick={handleSave}
                className="fet-btn-primary flex items-center gap-2"
              >
                <Save size={18} />
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account Management - students only */}
      {userRole === 'student' && (
        <div className="fet-card overflow-hidden">
          <div className="p-4 md:p-6 border-b border-border-default">
            <h3 className="text-base font-semibold text-text-primary">Account Management</h3>
            <p className="text-sm text-text-secondary mt-0.5">Manage your account data</p>
          </div>
          <div className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-text-primary">Delete My Account</p>
              <p className="text-sm text-text-secondary mt-0.5">
                Permanently remove your account and profile data. You will be signed out immediately.
              </p>
            </div>
            <button
              onClick={() => { setDeleteError(''); setShowDeleteConfirm(true); }}
              className="fet-btn-danger flex items-center gap-2 flex-shrink-0 self-start sm:self-auto"
            >
              <Trash2 size={18} />
              Delete My Account
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            aria-describedby="delete-account-desc"
            className="fet-card fet-modal-panel bg-white rounded-2xl shadow-modal max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-50">
                <AlertTriangle size={20} className="text-danger" />
              </div>
              <div className="min-w-0">
                <h3 id="delete-account-title" className="text-lg font-bold text-text-primary">
                  Delete account permanently?
                </h3>
                <p id="delete-account-desc" className="text-sm text-text-secondary mt-1">
                  This removes your account from this frontend simulation and signs you out. This action cannot be undone.
                </p>
              </div>
            </div>

            {deleteError && (
              <p className="mt-4 text-sm text-danger bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {deleteError}
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="fet-btn-secondary w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="fet-btn-danger w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
