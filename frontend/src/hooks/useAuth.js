/**
 * useAuth — Authentication state and actions hook.
 *
 * Manages the full auth lifecycle:
 *   1. On mount: calls GET /accounts/me/ to restore an existing session.
 *   2. Provides login, logout, register, updateProfile actions.
 *   3. Exposes user, isAuthenticated, isLoading, error state.
 *
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
 *   login: (email: string, password: string) => Promise<void>,
 *   logout: () => Promise<void>,
 *   register: (data: object) => Promise<void>,
 *   updateProfile: (data: object) => Promise<void>,
 * }}
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
   * Log in with email and password.
   * @param {string} email
   * @param {string} password
   */
  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      await authApi.getCsrfToken();
      await authApi.login({ email, password });
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  }, []);

  /**
   * Register a new account and auto-login.
   * @param {object} data - {email, username, first_name, last_name, password}
   */
  const register = useCallback(async (data) => {
    setError(null);
    try {
      await authApi.getCsrfToken();
      await authApi.register(data);
      await authApi.login({ email: data.email, password: data.password });
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
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
    login,
    logout,
    register,
    updateProfile,
  };
}
