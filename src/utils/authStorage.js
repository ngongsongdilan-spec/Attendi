// Frontend-only helpers that wrap the existing localStorage keys used by the
// auth flow (fet_users) plus a deleted-account list. No backend calls yet, but
// the functions are shaped so they can later be swapped for real API endpoints.

const USERS_KEY = 'fet_users';
const DELETED_KEY = 'fet_deleted_accounts';
const FLASH_KEY = 'fet_flash_message';

const SESSION_KEYS = ['fet_auth', 'fet_user', 'fet_user_role', 'fet_user_name', 'fet_user_level'];

const normalize = (value) => String(value || '').trim().toLowerCase();

export const getRegisteredUsers = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveRegisteredUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getDeletedAccounts = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(DELETED_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const accountIdentifiers = (user) =>
  [user?.email, user?.matricule, user?.staffNumber]
    .map(normalize)
    .filter(Boolean);

export const isAccountDeleted = (identifiers = []) => {
  const deleted = getDeletedAccounts();
  return identifiers.map(normalize).filter(Boolean).some((id) => deleted.includes(id));
};

const markAccountDeleted = (identifiers = []) => {
  const set = new Set(getDeletedAccounts());
  identifiers.map(normalize).filter(Boolean).forEach((id) => set.add(id));
  localStorage.setItem(DELETED_KEY, JSON.stringify([...set]));
};

export const clearSession = () => {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const setFlashMessage = (message) => {
  localStorage.setItem(FLASH_KEY, message);
};

export const consumeFlashMessage = () => {
  const message = localStorage.getItem(FLASH_KEY);
  if (message) localStorage.removeItem(FLASH_KEY);
  return message || '';
};

/**
 * Delete the authenticated student's own account from this frontend simulation.
 * Only students can delete their own account. Returns { success, reason }.
 * Structured so a real `DELETE /api/account` call can replace the body later.
 */
export const deleteOwnAccount = ({ user, role }) => {
  if (!user) {
    return { success: false, reason: 'No authenticated user found.' };
  }
  if ((role || user.role || 'student') !== 'student') {
    return { success: false, reason: 'Only student accounts can be deleted from this screen.' };
  }

  const identifiers = accountIdentifiers(user);

  // Remove the account from locally-registered accounts (created via Sign Up).
  const users = getRegisteredUsers();
  const remaining = users.filter((candidate) => {
    const candidateIds = accountIdentifiers(candidate);
    return !candidateIds.some((id) => identifiers.includes(id));
  });
  if (remaining.length !== users.length) {
    saveRegisteredUsers(remaining);
  }

  // Block the identifiers from being used to sign in again.
  markAccountDeleted(identifiers);

  // Clear the active session.
  clearSession();

  return { success: true, identifiers };
};
