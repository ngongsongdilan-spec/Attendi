/**
 * VerifyEmail — six-digit OTP screen shown between registration and login.
 *
 * Login is blocked until the address is verified (product decision), so this
 * screen replaces the old register → auto-login handoff. Credentials are held
 * in memory by useAuth's pendingVerification state only — never persisted.
 *
 * @module components/Auth/VerifyEmail
 */

import React, { useState, useEffect } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';

const RESEND_COOLDOWN_SECONDS = 30;

const VerifyEmail = ({ email, onVerify, onResend, onCancel }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  // Client-side resend cooldown. The backend throttle (3/min) is the real
  // enforcement; this only keeps the button honest.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    setIsLoading(true);
    try {
      await onVerify(trimmed);
      // On success useAuth clears pendingVerification and App re-renders the
      // dashboard — nothing else to do here.
    } catch (err) {
      setError(err.message || 'Verification failed. Request a new code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setError('');
    setNotice('');
    setIsResending(true);
    try {
      await onResend();
      setNotice('If that address is awaiting verification, a new code has been sent.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err.message || 'Could not resend the code. Try again shortly.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-[#C8C5D0] w-full max-w-md p-8">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-[#47464F] hover:text-[#191C1D] mb-6"
        >
          <ArrowLeft size={18} /> <span className="text-sm">Back to Login</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1E1B4B] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#191C1D]">Verify Your Email</h1>
          <p className="text-[#47464F] mt-1 text-sm">
            We sent a 6-digit code to
            <span className="block font-semibold text-[#191C1D] break-all">{email}</span>
          </p>
          <p className="text-[#47464F] mt-2 text-xs">
            The code expires in 10 minutes. Check your spam folder if you don&apos;t see it.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}
        {notice && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4">
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#3B82F6] text-center text-2xl tracking-[0.5em]"
            aria-label="6-digit verification code"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#1E1B4B] text-white rounded-xl font-semibold hover:bg-[#2A1F6E] disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            className="text-[#3B82F6] hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {isResending
              ? 'Sending...'
              : cooldown > 0
                ? `Resend code in ${cooldown}s`
                : 'Resend code'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
