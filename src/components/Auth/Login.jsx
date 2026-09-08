import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, Briefcase, GraduationCap, ArrowRight } from 'lucide-react';
// ✅ IMPORT FROM YOUR ACTUAL FILE NAME - CHANGE THIS!
// If your file is mockData.js:
import { mockStudents, mockLecturers } from '../../data/mockData';
// If your file is mckdata.js, change to:
// import { mockStudents, mockLecturers } from '../../data/mckdata';

const Login = ({ onLogin, onSwitchToSignUp }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!identifier || !password) {
      setError('Please enter your credentials');
      setIsLoading(false);
      return;
    }

    const trimmed = identifier.trim();

    if (selectedRole === 'student') {
      const student = mockStudents.find(s => 
        s.matricule.toUpperCase() === trimmed.toUpperCase() && 
        s.password === password
      );
      if (student) {
        const user = { ...student, role: 'student' };
        localStorage.setItem('fet_user', JSON.stringify(user));
        localStorage.setItem('fet_user_role', 'student');
        setTimeout(() => { setIsLoading(false); onLogin(user); }, 500);
        return;
      }
    } else {
      const lecturer = mockLecturers.find(l => 
        l.email.toLowerCase() === trimmed.toLowerCase() && 
        l.password === password
      );
      if (lecturer) {
        const user = { ...lecturer, role: 'lecturer' };
        localStorage.setItem('fet_user', JSON.stringify(user));
        localStorage.setItem('fet_user_role', 'lecturer');
        setTimeout(() => { setIsLoading(false); onLogin(user); }, 500);
        return;
      }
    }

    setError('Invalid credentials. Please try again.');
    setIsLoading(false);
  };

  const fillDemo = (type) => {
    if (type === 'student') {
      setIdentifier('FE24A389');
      setPassword('student123');
      setSelectedRole('student');
    } else {
      setIdentifier('alida.vance@fet.edu');
      setPassword('lecturer123');
      setSelectedRole('lecturer');
    }
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-[#C8C5D0] w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#1E1B4B] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-3xl">FET</span>
          </div>
          <h1 className="text-2xl font-bold text-[#191C1D]">WELCOME BACK</h1>
          <p className="text-[#47464F] mt-1">Sign in to your account</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button onClick={() => setSelectedRole('student')}
            className={`py-3 rounded-xl border-2 transition-all ${
              selectedRole === 'student' 
                ? 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]' 
                : 'border-[#C8C5D0] text-[#47464F]'
            }`}>
            <GraduationCap className="mx-auto mb-1" size={24} />
            <span className="text-sm font-medium">Student</span>
          </button>
          <button onClick={() => setSelectedRole('lecturer')}
            className={`py-3 rounded-xl border-2 transition-all ${
              selectedRole === 'lecturer' 
                ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-[#8B5CF6]' 
                : 'border-[#C8C5D0] text-[#47464F]'
            }`}>
            <Briefcase className="mx-auto mb-1" size={24} />
            <span className="text-sm font-medium">Lecturer</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">❌ {error}</div>}

          <div>
            <label className="block text-sm font-semibold text-[#191C1D] mb-2">
              {selectedRole === 'student' ? 'MATRICULE NUMBER' : 'EMAIL ADDRESS'}
            </label>
            <div className="relative">
              {selectedRole === 'student' ? (
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={20} />
              ) : (
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={20} />
              )}
              <input
                type={selectedRole === 'student' ? 'text' : 'email'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={selectedRole === 'student' ? 'e.g., FE24A389' : 'e.g., alida.vance@fet.edu'}
                className="w-full pl-12 pr-4 py-3 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D] text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#191C1D] mb-2">PASSWORD</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-12 pr-12 py-3 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D] text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 text-[#47464F]"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 bg-[#1E1B4B] text-white rounded-xl font-semibold hover:bg-[#2A1F6E] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? 'Signing in...' : <>Sign In <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#C8C5D0]">
          <p className="text-sm font-semibold text-[#47464F] mb-3 text-center">QUICK DEMO:</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => fillDemo('student')} className="p-3 bg-[#EDEEEF] rounded-xl hover:bg-[#E7E8E9] text-center">
              <GraduationCap size={18} className="mx-auto text-[#3B82F6] mb-1" />
              <p className="text-xs font-semibold">Student</p>
              <p className="text-xs text-[#47464F]">FE24A389</p>
            </button>
            <button onClick={() => fillDemo('lecturer')} className="p-3 bg-[#EDEEEF] rounded-xl hover:bg-[#E7E8E9] text-center">
              <Briefcase size={18} className="mx-auto text-[#8B5CF6] mb-1" />
              <p className="text-xs font-semibold">Lecturer</p>
              <p className="text-xs text-[#47464F]">alida.vance@fet.edu</p>
            </button>
          </div>
          <p className="text-xs text-[#47464F] text-center mt-3">
            Password: <span className="font-mono bg-[#EDEEEF] px-2 py-0.5 rounded">student123</span> / <span className="font-mono bg-[#EDEEEF] px-2 py-0.5 rounded">lecturer123</span>
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-[#47464F]">Don't have an account? <button onClick={onSwitchToSignUp} className="text-[#3B82F6] hover:underline font-medium">Register here</button></p>
        </div>
      </div>
    </div>
  );
};

export default Login;