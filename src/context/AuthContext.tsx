import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthAuditLog {
  timestamp: string;
  action: string;
  ip: string;
  status: 'success' | 'failed' | 'warning';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  csrfToken: string;
  failedAttempts: number;
  lockoutRemaining: number;
  auditLogs: AuthAuditLog[];
  login: (email: string, password: string, totp?: string) => Promise<{ success: boolean; requires2FA?: boolean; error?: string }>;
  register: (nameFirst: string, nameLast: string, username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
  refreshCsrf: () => void;
}

export const DEMO_ADMIN_USER: User = {
  id: 1,
  uuid: 'c82736b4-21c8-4720-a6ff-84ad1f21136b',
  username: 'admin',
  email: 'admin@slayernode.xyz',
  name_first: 'System',
  name_last: 'Administrator',
  language: 'en',
  is_admin: true,
  two_factor_enabled: true,
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  created_at: '2026-11-10T12:00:00Z',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start unauthenticated so user explicitly experiences the login security flow
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('slayernode_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // CSRF token generation
  const [csrfToken, setCsrfToken] = useState<string>(() => {
    return 'csrf_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  });

  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [auditLogs, setAuditLogs] = useState<AuthAuditLog[]>([
    { timestamp: new Date(Date.now() - 3600000).toLocaleTimeString(), action: 'session:initialized', ip: '194.164.72.12', status: 'success' },
  ]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const refreshCsrf = () => {
    setCsrfToken('csrf_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  };

  const login = async (email: string, password: string, totp?: string) => {
    const timestamp = new Date().toLocaleTimeString();

    // Check if currently locked out
    if (lockoutRemaining > 0) {
      return {
        success: false,
        error: `Security Lockout Active: Too many failed login attempts. Retry in ${lockoutRemaining} seconds.`,
      };
    }

    // Require credentials
    if (!email || !password) {
      return { success: false, error: 'Email/Username and Password are required.' };
    }

    // Explicit test fail condition
    if (password === 'fail' || password === 'wrong') {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);

      setAuditLogs(prev => [
        { timestamp, action: `auth:login.failed for ${email}`, ip: '127.0.0.1', status: 'failed' },
        ...prev,
      ]);

      if (nextFailures >= 4) {
        setLockoutRemaining(45); // 45 seconds brute-force lockout
        return {
          success: false,
          error: 'Brute-force security lock triggered. Terminal access suspended for 45s.',
        };
      }

      return {
        success: false,
        error: `Invalid credentials. (${4 - nextFailures} attempts remaining before lockout).`,
      };
    }

    // 2FA TOTP verification trigger
    if ((email.includes('admin') || email.includes('2fa')) && !totp) {
      return { success: false, requires2FA: true };
    }

    if (totp && totp !== '123456' && totp.length !== 6) {
      return { success: false, requires2FA: true, error: 'Invalid 6-digit TOTP code. Try 123456 for demo.' };
    }

    // Successful authentication
    const authedUser: User = {
      ...DEMO_ADMIN_USER,
      email: email.includes('@') ? email : `${email}@slayernode.xyz`,
      username: email.split('@')[0],
      is_admin: email.includes('admin'),
    };

    setUser(authedUser);
    setFailedAttempts(0);
    localStorage.setItem('slayernode_auth_user', JSON.stringify(authedUser));

    setAuditLogs(prev => [
      { timestamp, action: `auth:login.success [${authedUser.username}]`, ip: '127.0.0.1', status: 'success' },
      ...prev,
    ]);

    return { success: true };
  };

  const register = async (nameFirst: string, nameLast: string, username: string, email: string, password: string) => {
    if (!email || !password || !username) {
      return { success: false, error: 'All fields are required.' };
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    const newUser: User = {
      id: Date.now(),
      uuid: crypto.randomUUID(),
      username,
      email,
      name_first: nameFirst,
      name_last: nameLast,
      language: 'en',
      is_admin: false,
      two_factor_enabled: false,
      created_at: new Date().toISOString(),
    };

    setUser(newUser);
    localStorage.setItem('slayernode_auth_user', JSON.stringify(newUser));

    setAuditLogs(prev => [
      { timestamp: new Date().toLocaleTimeString(), action: `auth:register.success [${username}]`, ip: '127.0.0.1', status: 'success' },
      ...prev,
    ]);

    return { success: true };
  };

  const logout = () => {
    const timestamp = new Date().toLocaleTimeString();
    if (user) {
      setAuditLogs(prev => [
        { timestamp, action: `auth:logout [${user.username}]`, ip: '127.0.0.1', status: 'warning' },
        ...prev,
      ]);
    }
    setUser(null);
    localStorage.removeItem('slayernode_auth_user');
    refreshCsrf();
  };

  const updateUser = (partial: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...partial };
    setUser(updated);
    localStorage.setItem('slayernode_auth_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: !!user?.is_admin,
        csrfToken,
        failedAttempts,
        lockoutRemaining,
        auditLogs,
        login,
        register,
        logout,
        updateUser,
        refreshCsrf,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
