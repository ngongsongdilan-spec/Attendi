/**
 * AdminUser — User management table connected to the real backend.
 *
 * Fetches users from GET /accounts/ and changes roles via POST /accounts/change-role/.
 *
 * @module Pages/Admin/AdminUser
 */

import React, { useState, useEffect } from 'react';
import { Search, UserX, UserCheck, UserPlus } from 'lucide-react';
import { listUsers, changeRole } from '../../api/auth';
import { normalizeRole } from '../../utils/tokenHelpers';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await listUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      setError('');
      const backendRole = newRole.toUpperCase();
      await changeRole({ user_id: userId, new_role: backendRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: backendRole } : u));
      setSuccess(`User role updated to ${normalizeRole(backendRole)}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to change role');
      setTimeout(() => setError(''), 3000);
    }
  };

  const filteredUsers = users.filter(u => {
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    const matchSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const displayRole = normalizeRole(u.role);
    const matchRole = filterRole === 'all' || displayRole === filterRole;
    return matchSearch && matchRole;
  });

  const getRoleColor = (role) => {
    const displayRole = normalizeRole(role);
    switch (displayRole) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'lecturer': return 'bg-purple-100 text-purple-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#191C1D]">User Management</h2>
          <p className="text-[#47464F]">Manage all users on the platform</p>
        </div>
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

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-[#191C1D]"
        >
          <option value="all">All Roles</option>
          <option value="student">Student</option>
          <option value="lecturer">Lecturer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#EDEEEF] border-b border-[#C8C5D0]">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">User</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Role</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
                  return (
                    <tr key={u.id} className="border-b border-[#C8C5D0] hover:bg-[#EDEEEF] transition-colors">
                      <td className="py-3 px-4 font-medium text-[#191C1D]">{fullName}</td>
                      <td className="py-3 px-4 text-[#47464F] text-sm">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleColor(u.role)}`}>
                          {normalizeRole(u.role)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <select
                            value={normalizeRole(u.role)}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="text-xs border border-[#C8C5D0] rounded px-2 py-1 bg-white"
                          >
                            <option value="student">Student</option>
                            <option value="lecturer">Lecturer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-[#47464F]">No users found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
