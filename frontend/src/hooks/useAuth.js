/**
 * useAuth — Authentication state and actions hook.
 *
 * Manages the full auth lifecycle:
 *   1. On mount: calls GET /accounts/me/ to restore an existing session.
 *   2. Provides login, logout, register, updateProfile actions.
 *   3. Email verification gate: register() does NOT log the user in — it parks
 *      the credentials in memory-only pendingVerification state and the app
 *      shows the OTP screen until verifyEmail() succeeds.
 *   4. Exposes user, isAuthenticated, isLoading, pendingVerification, error.

 * @module hooks/useAuth
 */

import { useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/auth';
import { getCsrfTokenFromCookie, normalizeRole } from '../utils/tokenHelpers';

/**
 * @typedef {object} User
 * @property {string} id
 * @property {string} email
 * @property {string} username
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} role - Backend role: STUDENT | LECTURER | ADMINISTRATOR
 * @property {boolean} is_email_verified
 * @property {string|null} faculty
 * @property {string|null} department
 * @property {string} created_at
 */

/**
 * @returns {{
 *   user: User|null,
 *   isAuthenticated: boolean,
 *   isLoading: boolean,
 *   error: string|null,
 *   pendingVerification: {email: string, password: string}|null,
 *   login: (identifier: string, password: string) => Promise<void>,
 *   logout: () => Promise<void>,
 *   register: (data: object) => Promise<void>,
 *   verifyEmail: (code: string) => Promise<void>,
 *   resendVerification: () => Promise<void>,
 *   cancelVerification: () => void,
 *   updateProfile: (data: object) => Promise<void>,
 * }}
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // In-memory only: holds the just-registered credentials across the OTP step.
  // Never written to localStorage/sessionStorage.
  const [pendingVerification, setPendingVerification] = useState(null);

  /** Derive a display-friendly role from the backend role string. */
  const displayRole = user ? normalizeRole(user.role) : null;

  /** User with displayRole attached for component convenience. */
  const userWithRole = user ? { ...user, displayRole } : null;

  /**
   * Attempt to restore the session on mount by fetching the current user.
   */
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        await authApi.getCsrfToken();
        const userData = await authApi.getCurrentUser();
        if (!cancelled) {
          setUser(userData);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  /**
   * Log in with an identifier (email, matricule, or staffid) and password.
   * @param {string} identifier - Email, matricule, or staffid.
   * @param {string} password
   */
  const login = useCallback(async (identifier, password) => {
    setError(null);
    try {
      await authApi.getCsrfToken();
      await authApi.login({ identifier, password });
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  }, []);

  /**
   * Register a new account. Login is blocked until the email is verified
   * (backend enforces ACCOUNT_NOT_VERIFIED), so instead of auto-login we park
   * the credentials in memory and move the app to the OTP screen.
   * @param {object} data - {email, username, first_name, last_name, password}
   */
  const register = useCallback(async (data) => {
    setError(null);
    try {
      await authApi.getCsrfToken();
      await authApi.register(data);
      setPendingVerification({ email: data.email, password: data.password });
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  }, []);

  /**
   * Submit the six-digit code, then complete the original auto-login flow
   * with the in-memory credentials.
   * @param {string} code - Six-digit OTP from the verification email.
   */
  const verifyEmail = useCallback(async (code) => {
    setError(null);
    if (!pendingVerification) {
      throw new Error('No registration in progress. Please sign up again.');
    }
    try {
      await authApi.verifyEmail({ email: pendingVerification.email, code });
      await authApi.login({
        identifier: pendingVerification.email,
        password: pendingVerification.password,
      });
      const userData = await authApi.getCurrentUser();
      setPendingVerification(null);
      setUser(userData);
    } catch (err) {
      setError(err.message || 'Verification failed');
      throw err;
    }
  }, [pendingVerification]);

  /**
   * Ask the backend for a fresh code (generic response regardless of state).
   */
  const resendVerification = useCallback(async () => {
    setError(null);
    if (!pendingVerification) {
      throw new Error('No registration in progress.');
    }
    try {
      await authApi.resendVerification({ email: pendingVerification.email });
    } catch (err) {
      setError(err.message || 'Could not resend the code');
      throw err;
    }
  }, [pendingVerification]);

  /** Abandon the pending registration and return to the login screen. */
  const cancelVerification = useCallback(() => {
    setPendingVerification(null);
    setError(null);
  }, []);

  /**
   * Log out and clear user state.
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Session may already be expired — clear state anyway.
    } finally {
      setUser(null);
      setError(null);
    }
  }, []);

  /**
   * Update the current user's profile.
   * @param {object} data - Partial user fields
   */
  const updateProfile = useCallback(async (data) => {
    setError(null);
    try {
      const updated = await authApi.updateProfile(data);
      setUser(updated);
    } catch (err) {
      setError(err.message || 'Profile update failed');
      throw err;
    }
  }, []);

  return {
    user: userWithRole,
    isAuthenticated: !!user,
    isLoading,
    error,
    pendingVerification,
    login,
    logout,
    register,
    verifyEmail,
    resendVerification,
    cancelVerification,
    updateProfile,
  };
}
