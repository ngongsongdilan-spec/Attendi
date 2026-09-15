import React, { useState, useMemo } from 'react';
import { Search, UserX, UserCheck, UserPlus, X, Users } from 'lucide-react';
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
    if (!newUser.fullName.trim()) { alert('Name is required.'); return; }
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

  const getRoleBadge = (role) => {
    switch(role) {
      case 'admin': return 'fet-badge fet-badge-danger';
      case 'lecturer': return 'fet-badge fet-badge-info';
      default: return 'fet-badge fet-badge-active';
    }
  };

  const inputBase = "fet-input";
  const labelBase = "fet-label";

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-bold text-text-primary flex items-center gap-2">
            <Users size={20} className="text-primary" strokeWidth={2} />
            User Management
          </h2>
          <p className="text-[13px] text-text-secondary mt-0.5">Manage all users on the platform</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="fet-btn-primary">
          <UserPlus size={16} /> Add User
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-[13px] font-medium">
          {success}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={15} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="fet-input pl-9 text-[13px]"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="fet-select w-auto sm:w-40 text-[13px]"
        >
          <option value="all">All Roles</option>
          <option value="student">Student</option>
          <option value="lecturer">Lecturer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="fet-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="fet-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((targetUser) => (
                <tr key={targetUser.id}>
                  <td className="font-medium">{targetUser.fullName}</td>
                  <td className="text-text-secondary text-[12px]">{targetUser.email}</td>
                  <td>
                    <span className={`${getRoleBadge(targetUser.role)} capitalize`}>
                      {targetUser.role}
                    </span>
                  </td>
                  <td>
                    <span className={`fet-badge ${targetUser.active !== false ? 'fet-badge-active' : 'fet-badge-inactive'}`}>
                      {targetUser.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(targetUser)}
                      className={`p-1.5 rounded-lg transition-colors ${targetUser.active !== false ? 'text-danger hover:bg-red-50' : 'text-success hover:bg-green-50'}`}
                      title={targetUser.active !== false ? 'Deactivate' : 'Activate'}
                    >
                      {targetUser.active !== false ? <UserX size={15} /> : <UserCheck size={15} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-[13px] text-text-secondary">No users found</div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="fet-card bg-white rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border-default">
              <h3 className="text-[16px] font-bold text-text-primary">Add New User</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 text-text-secondary hover:bg-page-bg rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className={labelBase}>Role</label>
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className={inputBase}>
                  <option value="student">Student</option>
                  <option value="lecturer">Lecturer</option>
                </select>
              </div>
              <div>
                <label className={labelBase}>Full Name</label>
                <input type="text" placeholder="e.g. Jane Doe" value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} className={inputBase} />
              </div>
              <div>
                <label className={labelBase}>Email</label>
                <input type="email" placeholder="e.g. jane.doe@fet.edu.cm" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className={inputBase} />
              </div>
              {newUser.role === 'student' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelBase}>Matricule (optional)</label>
                    <input type="text" placeholder="Auto-generated" value={newUser.matricule} onChange={(e) => setNewUser({ ...newUser, matricule: e.target.value })} className={inputBase} />
                  </div>
                  <div>
                    <label className={labelBase}>Level</label>
                    <select value={newUser.level} onChange={(e) => setNewUser({ ...newUser, level: e.target.value })} className={inputBase}>
                      <option value="200">200</option>
                      <option value="300">300</option>
                      <option value="400">400</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className={labelBase}>Staff Number (optional)</label>
                  <input type="text" placeholder="Auto-generated" value={newUser.staffNumber} onChange={(e) => setNewUser({ ...newUser, staffNumber: e.target.value })} className={inputBase} />
                </div>
              )}
              <div>
                <label className={labelBase}>Department</label>
                <select value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} className={inputBase}>
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
                  <input type="text" placeholder="e.g. CEF238, CEF342" value={newUser.courses} onChange={(e) => setNewUser({ ...newUser, courses: e.target.value })} className={inputBase} />
                </div>
              )}
              <button onClick={handleAddUser} className="fet-btn-primary w-full py-3">
                <UserPlus size={16} /> Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
