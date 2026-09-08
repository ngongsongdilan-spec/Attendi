import React, { useState, useEffect } from 'react';
import { Search, UserX, UserCheck, UserPlus } from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('fet_users') || '[]');
    setUsers(stored);
  }, []);

  const handleRoleChange = (userId, newRole) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        return { ...u, role: newRole };
      }
      return u;
    });
    setUsers(updated);
    localStorage.setItem('fet_users', JSON.stringify(updated));
    setSuccess(`✅ User role updated to ${newRole}`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleToggleActive = (userId) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        return { ...u, active: u.active === false ? true : false };
      }
      return u;
    });
    setUsers(updated);
    localStorage.setItem('fet_users', JSON.stringify(updated));
    setSuccess(`✅ User status updated`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const getRoleColor = (role) => {
    switch(role) {
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
        <button className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-xl font-medium hover:bg-[#3B82F6]/90">
          <UserPlus size={18} /> Add User
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          {success}
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

      <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#EDEEEF] border-b border-[#C8C5D0]">
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">User</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Email</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Role</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[#47464F] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-[#C8C5D0] hover:bg-[#EDEEEF] transition-colors">
                  <td className="py-3 px-4 font-medium text-[#191C1D]">{user.fullName}</td>
                  <td className="py-3 px-4 text-[#47464F] text-sm">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleColor(user.role)}`}>
                      {user.role || 'student'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="text-xs border border-[#C8C5D0] rounded px-2 py-1 bg-white"
                      >
                        <option value="student">Student</option>
                        <option value="lecturer">Lecturer</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        className={`p-1 rounded ${user.active !== false ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                      >
                        {user.active !== false ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-[#47464F]">No users found</div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;