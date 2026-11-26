import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthAuditLog } from '../types';
import { apiFetch, apiJson, setCsrfToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoadingAuth: boolean;
  csrfToken: string;
  failedAttempts: number;
  lockoutRemaining: number;
  auditLogs: AuthAuditLog[];
  login: (email: string, password: string, totp?: string) => Promise<{ success: boolean; requires2FA?: boolean; error?: string }>;
  register: (nameFirst: string, nameLast: string, username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
  refreshCsrf: () => Promise<void>;
  refreshAuditLogs: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [csrfTokenState, setCsrfTokenState] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [auditLogs, setAuditLogs] = useState<AuthAuditLog[]>([]);

  const applyCsrf = useCallback((token: string) => {
    setCsrfToken(token);
    setCsrfTokenState(token);
  }, []);

  const refreshAuditLogs = useCallback(async (adminFlag?: boolean) => {
    const useAdmin = adminFlag ?? Boolean(user?.is_admin);
    try {
      const endpoint = useAdmin ? '/api/application/activity' : '/api/client/account/activity';
      const data = await apiJson<{ data: AuthAuditLog[] }>(endpoint);
      if (Array.isArray(data?.data)) {
        setAuditLogs(data.data);
      }
    } catch {
      // Ignore if unauthenticated or denied
    }
  }, [user?.is_admin]);

  const refreshCsrf = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          setUser(data.user);
          applyCsrf(data.csrfToken || '');
          refreshAuditLogs(Boolean(data.user.is_admin));
        }
      } else {
        setUser(null);
        applyCsrf('');
      }
    } catch {
      setUser(null);
      applyCsrf('');
    } finally {
      setIsLoadingAuth(false);
    }
  }, [applyCsrf, refreshAuditLogs]);

  useEffect(() => {
    refreshCsrf();
  }, [refreshCsrf]);

  useEffect(() => {
    if (lockoutUntil <= Date.now()) {
      setLockoutRemaining(0);
      return;
    }
    const timer = setInterval(() => {
      const rem = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(rem);
      if (rem === 0) setLockoutUntil(0);
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutUntil]);

  const login = async (
    email: string,
    password: string,
    totp?: string
  ): Promise<{ success: boolean; requires2FA?: boolean; error?: string }> => {
    if (lockoutUntil > Date.now()) {
      return { success: false, error: `Rate limited. Try again in ${Math.ceil((lockoutUntil - Date.now()) / 1000)}s.` };
    }

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
          two_factor_code: totp || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        const retrySec = parseInt(res.headers.get('Retry-After') || '30', 10);
        setLockoutUntil(Date.now() + retrySec * 1000);
        setLockoutRemaining(retrySec);
        return { success: false, error: data?.errors?.[0]?.detail || 'Too many login attempts.' };
      }

      if (data?.requires_two_factor) {
        return { success: false, requires2FA: true };
      }

      if (!res.ok || !data?.user) {
        setFailedAttempts(prev => prev + 1);
        return { success: false, error: data?.error || 'Invalid credentials.' };
      }

      setFailedAttempts(0);
      setLockoutUntil(0);
      setUser(data.user);
      applyCsrf(data.csrfToken || '');
      refreshAuditLogs(Boolean(data.user.is_admin));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Unable to reach authentication server.' };
    }
  };

  const register = async (
    nameFirst: string,
    nameLast: string,
    username: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await apiJson<{ user: User; csrfToken: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name_first: nameFirst,
          name_last: nameLast,
          username,
          email,
          password,
        }),
      });
      setUser(data.user);
      applyCsrf(data.csrfToken || '');
      refreshAuditLogs(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Registration failed.' };
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST', keepalive: true });
    } catch {}
    setUser(null);
    applyCsrf('');
    setAuditLogs([]);
    window.location.hash = '';
  };

  const updateUser = (partial: Partial<User>) => {
    setUser(prev => (prev ? { ...prev, ...partial } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAdmin: Boolean(user?.is_admin),
        isLoadingAuth,
        csrfToken: csrfTokenState,
        failedAttempts,
        lockoutRemaining,
        auditLogs,
        login,
        register,
        logout,
        updateUser,
        refreshCsrf,
        refreshAuditLogs: () => refreshAuditLogs(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
