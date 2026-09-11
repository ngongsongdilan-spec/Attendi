import React, { useState, useMemo } from 'react';
import { Search, UserX, UserCheck, UserPlus, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const AdminUsers = ({ user }) => {
  const { students, lecturers, addStudent, addLecturer, updateStudent, updateLecturer } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    role: 'student',
    fullName: '',
    email: '',
    matricule: '',
    staffNumber: '',
    department: 'Computer Engineering',
    level: '200',
    courses: '',
  });

  const adminUser = {
    id: user?.id || 'admin-1',
    fullName: user?.fullName || 'System Administrator',
    email: 'admin@fet.local',
    role: 'admin',
    active: true,
  };

  // Working source of truth: context arrays (students + lecturers + admin)
  const users = useMemo(() => {
    const studentUsers = students.map(s => ({
      id: s.matricule,
      fullName: s.fullName,
      email: s.email || `${s.matricule.toLowerCase()}@student.fet.edu.cm`,
      role: 'student',
      active: s.active !== false,
      department: s.department,
      level: s.level,
    }));
    const lecturerUsers = lecturers.map(l => ({
      id: l.staffNumber,
      fullName: l.fullName,
      email: l.email || `${l.staffNumber.toLowerCase()}@fet.edu.cm`,
      role: 'lecturer',
      active: l.active !== false,
      department: l.department,
    }));
    return [...studentUsers, ...lecturerUsers, adminUser];
  }, [students, lecturers, adminUser]);

  const showMessage = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleToggleActive = (targetUser) => {
    if (targetUser.role === 'student') {
      const s = students.find(x => x.matricule === targetUser.id);
      updateStudent(targetUser.id, { active: s?.active === false ? true : false });
    } else if (targetUser.role === 'lecturer') {
      const l = lecturers.find(x => x.staffNumber === targetUser.id);
      updateLecturer(targetUser.id, { active: l?.active === false ? true : false });
    } else {
      showMessage('The admin account cannot be deactivated.');
      return;
    }
    showMessage(`User status updated`);
  };

  const handleAddUser = () => {
    if (!newUser.fullName.trim()) {
      alert('Name is required.');
      return;
    }
    if (newUser.role === 'student') {
      addStudent({
        fullName: newUser.fullName.trim(),
        email: newUser.email.trim(),
        matricule: newUser.matricule.trim() || undefined,
        department: newUser.department,
        level: newUser.level,
        enrolledCourses: [],
        active: true,
      });
    } else {
      addLecturer({
        fullName: newUser.fullName.trim(),
        email: newUser.email.trim(),
        staffNumber: newUser.staffNumber.trim() || undefined,
        department: newUser.department,
        title: 'Lecturer',
        courses: newUser.courses.split(',').map(c => c.trim()).filter(Boolean),
        active: true,
      });
    }
    setShowAddModal(false);
    setNewUser({ role: 'student', fullName: '', email: '', matricule: '', staffNumber: '', department: 'Computer Engineering', level: '200', courses: '' });
    showMessage(`User added successfully`);
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
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

  const inputBase = "w-full px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]";
  const labelBase = "block text-sm font-medium text-[#191C1D] mb-1";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#191C1D]">User Management</h2>
          <p className="text-[#47464F]">Manage all users on the platform</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-xl font-medium hover:bg-[#3B82F6]/90 transition-colors"
        >
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
              {filteredUsers.map((targetUser) => (
                <tr key={targetUser.id} className="border-b border-[#C8C5D0] hover:bg-[#EDEEEF] transition-colors">
                  <td className="py-3 px-4 font-medium text-[#191C1D]">{targetUser.fullName}</td>
                  <td className="py-3 px-4 text-[#47464F] text-sm">{targetUser.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleColor(targetUser.role)}`}>
                      {targetUser.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${targetUser.active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {targetUser.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleActive(targetUser)}
                      className={`p-1 rounded ${targetUser.active !== false ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                      title={targetUser.active !== false ? 'Deactivate' : 'Activate'}
                    >
                      {targetUser.active !== false ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#191C1D]">Add New User</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-[#47464F] hover:bg-[#EDEEEF] rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelBase}>Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className={inputBase}
                >
                  <option value="student">Student</option>
                  <option value="lecturer">Lecturer</option>
                </select>
              </div>

              <div>
                <label className={labelBase}>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className={inputBase}
                />
              </div>

              <div>
                <label className={labelBase}>Email</label>
                <input
                  type="email"
                  placeholder="e.g. jane.doe@fet.edu.cm"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className={inputBase}
                />
              </div>

              {newUser.role === 'student' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelBase}>Matricule (optional)</label>
                    <input
                      type="text"
                      placeholder="Auto-generated if blank"
                      value={newUser.matricule}
                      onChange={(e) => setNewUser({ ...newUser, matricule: e.target.value })}
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Level</label>
                    <select
                      value={newUser.level}
                      onChange={(e) => setNewUser({ ...newUser, level: e.target.value })}
                      className={inputBase}
                    >
                      <option value="200">200</option>
                      <option value="300">300</option>
                      <option value="400">400</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className={labelBase}>Staff Number (optional)</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank"
                    value={newUser.staffNumber}
                    onChange={(e) => setNewUser({ ...newUser, staffNumber: e.target.value })}
                    className={inputBase}
                  />
                </div>
              )}

              <div>
                <label className={labelBase}>Department</label>
                <select
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className={inputBase}
                >
                  <option>Computer Engineering</option>
                  <option>Civil Engineering</option>
                  <option>Chemical & Petroleum Engineering</option>
                  <option>Electrical & Electronic Engineering</option>
                  <option>Mechanical & Industrial Engineering</option>
                </select>
              </div>

              {newUser.role === 'lecturer' && (
                <div>
                  <label className={labelBase}>Courses (comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. CEF238, CEF342"
                    value={newUser.courses}
                    onChange={(e) => setNewUser({ ...newUser, courses: e.target.value })}
                    className={inputBase}
                  />
                </div>
              )}

              <button
                onClick={handleAddUser}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1E1B4B] text-white rounded-xl font-semibold hover:bg-[#2A1F6E] transition-colors"
              >
                <UserPlus size={18} /> Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;