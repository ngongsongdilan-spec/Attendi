/**
 * SignUp — Registration form connected to the real backend.
 *
 * Calls POST /accounts/register/ via the useAuth hook.
 * On success, auto-logs in and navigates to the dashboard.
 *
 * @module components/Auth/SignUp
 */

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, UserPlus, ArrowLeft } from 'lucide-react';

const SignUp = ({ onSignUp, onSwitchToLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (!formData.fullName || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    const nameParts = formData.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || firstName;
    const username = formData.email.split('@')[0];

    try {
      await onSignUp({
        email: formData.email.toLowerCase(),
        username,
        first_name: firstName,
        last_name: lastName,
        password: formData.password,
      });
      setSuccess('Account created successfully! Redirecting...');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#191C1D] mb-1">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange}
                placeholder="e.g., John Doe" className="w-full pl-10 pr-4 py-3 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#191C1D] mb-1">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
              <input type="email" name="email" value={formData.email} onChange={handleChange}
                placeholder="you@fet.edu" className="w-full pl-10 pr-4 py-3 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#191C1D] mb-1">Password * (min 8)</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
              <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                className="w-full pl-10 pr-12 py-3 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 text-[#47464F]">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

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
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="text-[#3B82F6] hover:underline font-medium">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
