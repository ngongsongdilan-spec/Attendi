import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, User, UserPlus, ArrowLeft, Building, GraduationCap, BookOpen } from 'lucide-react';

const SignUp = ({ onSignUp, onSwitchToLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    department: '',
    level: '',
    matricule: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // ✅ LOAD DEPARTMENTS FROM localStorage
    const loadDepartments = () => {
      // First try to get from localStorage
      let depts = JSON.parse(localStorage.getItem('fet_departments') || '[]');
      
      // If empty, use default departments
      if (depts.length === 0) {
        depts = [
          { id: 1, name: 'Computer Engineering', code: 'CE', coordinator: 'Dr. Alida Vance' },
          { id: 2, name: 'Civil Engineering', code: 'CVE', coordinator: 'Dr. Michael Brown' },
          { id: 3, name: 'Chemical & Petroleum Engineering', code: 'CHE', coordinator: 'Dr. Emily Davis' },
          { id: 4, name: 'Electrical & Electronic Engineering', code: 'EE', coordinator: 'Dr. David Wilson' },
          { id: 5, name: 'Mechanical & Industrial Engineering', code: 'ME', coordinator: 'Dr. Robert Johnson' },
        ];
        // Save to localStorage
        localStorage.setItem('fet_departments', JSON.stringify(depts));
      }
      
      setDepartments(depts);
    };

    loadDepartments();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (!formData.fullName || !formData.email || !formData.password || !formData.department) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    if (formData.role === 'student') {
      if (!formData.matricule) {
        setError('Matricule number is required for students');
        setIsLoading(false);
        return;
      }
      if (!formData.level) {
        setError('Please select your level');
        setIsLoading(false);
        return;
      }
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    const users = JSON.parse(localStorage.getItem('fet_users') || '[]');
    if (users.find(u => u.email.toLowerCase() === formData.email.toLowerCase())) {
      setError('User with this email already exists');
      setIsLoading(false);
      return;
    }

    if (formData.role === 'student') {
      const existingMatricule = users.find(u => u.matricule === formData.matricule.toUpperCase());
      if (existingMatricule) {
        setError(`Matricule ${formData.matricule} is already taken.`);
        setIsLoading(false);
        return;
      }
    }

    const matricule = formData.role === 'student' ? formData.matricule.toUpperCase() : '';
    const selectedDept = departments.find(d => d.name === formData.department);

    const newUser = {
      id: Date.now(),
      fullName: formData.fullName,
      email: formData.email.toLowerCase(),
      password: formData.password,
      role: formData.role,
      department: formData.department,
      level: formData.role === 'student' ? formData.level : '',
      matricule: matricule,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem('fet_users', JSON.stringify(users));

    const coordName = selectedDept?.coordinator || 'Not Assigned';
    setSuccess(`✅ Welcome ${formData.fullName}!`);
    if (formData.role === 'student') {
      setSuccess(prev => prev + `\n📌 Matricule: ${matricule} • Level ${formData.level}`);
    }
    setSuccess(prev => prev + `\n📌 Department: ${formData.department} • Coordinator: ${coordName}`);

    setTimeout(() => { setIsLoading(false); onSignUp(newUser); }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-[#C8C5D0] w-full max-w-md p-8 max-h-[95vh] overflow-y-auto">
        <button onClick={onSwitchToLogin} className="flex items-center gap-2 text-[#47464F] hover:text-[#191C1D] mb-6">
          <ArrowLeft size={18} /> <span className="text-sm">Back to Login</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1E1B4B] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#191C1D]">Create Account</h1>
          <p className="text-[#47464F] mt-1">Join FET Project Management System</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">❌ {error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4 whitespace-pre-line">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-[#191C1D] mb-1">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange}
                placeholder="e.g., John Doe" className="w-full pl-10 pr-4 py-3 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]" required />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-[#191C1D] mb-1">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
              <input type="email" name="email" value={formData.email} onChange={handleChange}
                placeholder="you@fet.edu" className="w-full pl-10 pr-4 py-3 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]" required />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-semibold text-[#191C1D] mb-1">I am a *</label>
            <div className="grid grid-cols-2 gap-3">
              {['student', 'lecturer'].map((role) => (
                <button key={role} type="button" onClick={() => setFormData(prev => ({ ...prev, role }))}
                  className={`px-4 py-3 rounded-xl border-2 capitalize transition-colors ${
                    formData.role === role
                      ? role === 'student' ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]' : 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-[#8B5CF6]'
                      : 'border-[#C8C5D0] hover:border-[#3B82F6] text-[#47464F]'
                  }`}>
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* ✅ Department Selection - NOW WITH DEFAULT OPTIONS */}
          <div>
            <label className="block text-sm font-semibold text-[#191C1D] mb-1">Department *</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
              <select 
                name="department" 
                value={formData.department} 
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-[#191C1D] appearance-none"
                required
              >
                <option value="">-- Select Department --</option>
                {departments.length > 0 ? (
                  departments.map(dept => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name} ({dept.code})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading departments...</option>
                )}
              </select>
            </div>
            {departments.length === 0 && (
              <p className="text-xs text-[#F59E0B] mt-1">⚠️ Loading departments... Please wait.</p>
            )}
          </div>

          {/* STUDENT-ONLY FIELDS */}
          {formData.role === 'student' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-[#191C1D] mb-1">Matricule Number *</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
                  <input
                    type="text"
                    name="matricule"
                    value={formData.matricule}
                    onChange={handleChange}
                    placeholder="e.g., FE24A389"
                    className="w-full pl-10 pr-4 py-3 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D] uppercase"
                    required
                  />
                </div>
                <p className="text-xs text-[#47464F] mt-1">📌 Your unique student identification number</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#191C1D] mb-1">Level *</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
                  <select name="level" value={formData.level} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white text-[#191C1D]" required>
                    <option value="">Select Level</option>
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                    <option value="400">400 Level</option>
                    <option value="500">500 Level</option>
                    <option value="MSc">MSc</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-[#191C1D] mb-1">Password * (min 6)</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
              <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                className="w-full pl-10 pr-12 py-3 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 text-[#47464F]">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-[#191C1D] mb-1">Confirm Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
              <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                className="w-full pl-10 pr-12 py-3 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]" required />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 text-[#47464F]">
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full px-6 py-3 bg-[#1E1B4B] text-white rounded-xl font-semibold hover:bg-[#2A1F6E] transition-colors disabled:opacity-50">
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-[#47464F] mt-6">
          Already have an account? <button onClick={onSwitchToLogin} className="text-[#3B82F6] hover:underline font-medium">Sign in</button>
        </p>
      </div>
    </div>
  );
};

export default SignUp;