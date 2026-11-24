import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassInput } from '../ui/GlassInput';
import { GlassButton } from '../ui/GlassButton';
import { AuroraShader } from './AuroraShader';
import { TwoFactorModal } from './TwoFactorModal';

interface LoginViewProps {
  onNavigateRegister?: () => void;
  onNavigateForgot?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onNavigateRegister,
  onNavigateForgot,
}) => {
  const { login, csrfToken, lockoutRemaining } = useAuth();
  const { previewTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await login(email, password);
      if (res.requires2FA) {
        setShowTwoFactor(true);
      } else if (!res.success) {
        setErrorMessage(res.error || 'Invalid username or password.');
      }
    } catch {
      setErrorMessage('Network error: Unable to contact authentication daemon.');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FAVerify = async (code: string) => {
    const res = await login(email, password, code);
    return res.success;
  };

  const isLockedOut = lockoutRemaining > 0;

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between p-4 z-10 overflow-hidden">
      <AuroraShader />

      <div className="flex-1 flex items-center justify-center w-full my-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            x: errorMessage ? [0, -8, 8, -6, 6, -3, 3, 0] : 0,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="w-full max-w-md z-10"
        >
          <GlassCard
            className={`p-7 sm:p-9 shadow-2xl transition-all duration-300 border border-white/15 ${
              errorMessage ? 'border-rose-500/50 bg-rose-950/20' : ''
            }`}
          >
            {/* Top Brand: Uploaded SlayerNode SN Logo */}
            <div className="flex flex-col items-center text-center mb-6">
              <img
                src={previewTheme.logo_url || '/logo.jpg'}
                alt="SlayerNode"
                className="w-16 h-16 rounded-2xl object-cover border border-white/25 shadow-xl mb-3.5"
              />

              <h1 className="text-xl font-bold tracking-tight text-white">
                {previewTheme.auth_heading || 'SlayerNode'}
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-xs leading-relaxed">
                {previewTheme.auth_subtitle || 'Game Server Management Portal'}
              </p>

              {/* Security indicators */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10 text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                  <ShieldCheck className="w-3 h-3" /> TLS 1.3 / AES-256
                </span>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-[10px] text-slate-400">
                  CSRF Protected
                </span>
              </div>
            </div>

            {/* Brute-force lockout alert */}
            {isLockedOut && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-5 flex items-center gap-2.5 animate-pulse">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Security lockout active. Retry in <strong>{lockoutRemaining}s</strong>.</span>
              </div>
            )}

            {/* Validation Error Message */}
            {errorMessage && !isLockedOut && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium mb-5 text-center"
              >
                {errorMessage}
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input type="hidden" name="_csrf" value={csrfToken} />

              <GlassInput
                label="Email Address or Username"
                type="text"
                required
                disabled={isLockedOut}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@slayernode.xyz or username"
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
              />

              <GlassInput
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLockedOut}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <div className="flex items-center justify-between text-xs mt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded border-white/20 bg-slate-900 text-[#00D2FF] focus:ring-0"
                  />
                  Remember session
                </label>

                {onNavigateForgot && (
                  <button
                    type="button"
                    onClick={onNavigateForgot}
                    className="text-[#00D2FF] hover:underline transition-colors cursor-pointer font-medium"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <GlassButton
                type="submit"
                variant="accent"
                size="lg"
                isLoading={isLoading}
                disabled={isLockedOut}
                className="mt-2 w-full text-sm font-bold bg-[#00D2FF] text-[#090D16] hover:bg-[#26dcff]"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {isLockedOut ? `Locked (${lockoutRemaining}s)` : 'Sign In'}
              </GlassButton>
            </form>

            {/* Self Registration link if enabled */}
            {previewTheme.auth_allow_registration && onNavigateRegister && (
              <div className="mt-5 pt-4 border-t border-white/10 text-center text-xs text-slate-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={onNavigateRegister}
                  className="text-[#00D2FF] hover:underline font-semibold cursor-pointer ml-1"
                >
                  Create Account
                </button>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* Irremovable SlayerNode Copyright Footer */}
      <footer className="w-full text-center py-3 text-xs text-slate-400 select-none z-10">
        <span>© 2026 SlayerNode. All rights reserved. Version 1.0.0 — </span>
        <a
          href="https://slayernode.xyz"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00D2FF] hover:underline font-semibold"
        >
          https://slayernode.xyz
        </a>
      </footer>

      {/* 2FA Segmented TOTP Modal */}
      <TwoFactorModal
        isOpen={showTwoFactor}
        onClose={() => setShowTwoFactor(false)}
        onVerify={handle2FAVerify}
      />
    </div>
  );
};
