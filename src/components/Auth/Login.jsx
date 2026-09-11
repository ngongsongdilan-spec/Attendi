import React, { useState } from 'react';
import { mockStudents, mockLecturers, mockAdmin } from '../../data/MockData';

const Login = ({ onLogin, onSwitchToSignUp }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const id = identifier.trim();

    if (!id || !password) {
      setError('Please enter your identifier and password.');
      return;
    }

    // Resolve against mock data
    let foundUser = null;

    const student = mockStudents.find(s =>
      s.matricule.toLowerCase() === id.toLowerCase() || s.email.toLowerCase() === id.toLowerCase()
    );
    if (student) {
      if (password !== student.password) {
        setError('Incorrect password. Please try again.');
        return;
      }
      foundUser = { ...student, role: 'student' };
    }

    const lecturer = mockLecturers.find(l =>
      (l.staffNumber && l.staffNumber.toLowerCase() === id.toLowerCase()) ||
      l.email.toLowerCase() === id.toLowerCase()
    );
    if (lecturer) {
      if (password !== lecturer.password) {
        setError('Incorrect password. Please try again.');
        return;
      }
      foundUser = { ...lecturer, role: 'lecturer' };
    }

    if (!foundUser && (mockAdmin.email.toLowerCase() === id.toLowerCase())) {
      if (password !== mockAdmin.password) {
        setError('Incorrect password. Please try again.');
        return;
      }
      foundUser = { ...mockAdmin, role: 'admin' };
    }

    if (!foundUser) {
      setError('No account found with that identifier. Check with your faculty office or register below.');
      return;
    }

    onLogin(foundUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-[#C8C5D0] w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#1E1B4B] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-3xl">FET</span>
          </div>
          <h1 className="text-2xl font-bold text-[#191C1D]">Welcome Back</h1>
          <p className="text-sm text-[#47464F] mt-1">Academic, Learning & Project Management Platform</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="block text-sm font-semibold text-[#191C1D] mb-1">
              Matricule, Staff Number or Email
            </label>
            <input
              id="identifier"
              type="text"
              placeholder="e.g., FE24A389 or LEC001"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-3 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-[#191C1D] mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D] pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#47464F] hover:text-[#191C1D]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-[#47464F] cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[#C8C5D0] text-[#3B82F6] focus:ring-[#3B82F6]"
              />
              Remember me
            </label>
          </div>

          <button type="submit" className="w-full py-3 bg-[#1E1B4B] text-white rounded-xl font-semibold hover:bg-[#2A1F6E] transition-colors">
            Login
          </button>
        </form>

        <div className="mt-4 p-3 bg-[#EDEEEF] rounded-xl text-xs text-[#47464F] space-y-1">
          <p className="font-semibold text-[#191C1D]">Demo accounts</p>
          <p>🎓 Student — Matricule: <b>FE24A389</b> / Password: <b>student123</b></p>
          <p>👨‍🏫 Lecturer — Staff: <b>LEC001</b> / Password: <b>lecturer123</b></p>
          <p>👑 Admin — Email: <b>admin@fet.local</b> / Password: <b>admin123</b></p>
        </div>

        <p className="text-center mt-4 text-sm text-[#47464F]">
          Don't have an account?{' '}
          <button onClick={onSwitchToSignUp} className="text-[#3B82F6] hover:underline font-medium">Register</button>
        </p>
      </div>
    </div>
  );
};

export default Login;