/**
 * Login — Authentication form connected to the real backend.
 *
 * Calls POST /accounts/login/ via the useAuth hook.
 * Accepts email, matricule, or staffid as the login identifier.
 * On success, the parent App component switches to the dashboard.
 *
 * @module components/Auth/Login
 */

import React, { useState } from 'react';

const Login = ({ onLogin, onSwitchToSignUp }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!identifier || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      await onLogin(identifier, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-[#C8C5D0] w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#1E1B4B] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-3xl">FET</span>
          </div>
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-sm text-[#47464F] mt-1">
            Sign in with your email, matricule, or staff ID
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Email, Matricule or Staff ID"
            value={identifier}
            onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#3B82F6]"
            autoComplete="username"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#3B82F6]"
            autoComplete="current-password"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#1E1B4B] text-white rounded-xl font-semibold hover:bg-[#2A1F6E] disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p className="text-center mt-4 text-sm">
          Don&apos;t have an account?{' '}
          <button onClick={onSwitchToSignUp} className="text-[#3B82F6] hover:underline">
            Register
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
