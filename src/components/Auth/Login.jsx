// src/components/Auth/Login.jsx
import React, { useState } from 'react';

const Login = ({ onLogin, onSwitchToSignUp }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mock login
    const user = {
      fullName: 'Alex Scholar',
      matricule: 'FE24A389',
      role: 'student',
    };
    onLogin(user);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-[#C8C5D0] w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#1E1B4B] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-3xl">FET</span>
          </div>
          <h1 className="text-2xl font-bold">Welcome Back</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Matricule or Email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#3B82F6]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#3B82F6]"
            required
          />
          <button type="submit" className="w-full py-3 bg-[#1E1B4B] text-white rounded-xl font-semibold hover:bg-[#2A1F6E]">
            Login
          </button>
        </form>
        <p className="text-center mt-4 text-sm">
          Don't have an account?{' '}
          <button onClick={onSwitchToSignUp} className="text-[#3B82F6] hover:underline">Register</button>
        </p>
      </div>
    </div>
  );
};

export default Login;