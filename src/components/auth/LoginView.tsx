import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
        setErrorMessage(res.error || 'Invalid email or password.');
      }
    } catch {
      setErrorMessage('Network error: Unable to contact authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FAVerify = async (code: string) => {
    const res = await login(email, password, code);
    return res.success;
  };

  const isLockedOut = lockoutRemaining > 0;

  const bgWallpaper = previewTheme.auth_bg_url || previewTheme.custom_wallpaper_url;

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-between p-4 text-[#F3F4F6] relative z-10"
      style={{ backgroundColor: previewTheme.bg_canvas || '#111216' }}
    >
      {/* Background Wallpaper Layer */}
      {bgWallpaper && (
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center transition-all duration-300"
          style={{
            backgroundImage: `url("${bgWallpaper.replace(/"/g, '\\"')}")`,
            filter: `blur(${previewTheme.auth_overlay_blur || previewTheme.wallpaper_blur || 0}px)`,
            opacity: Math.max(0.1, (100 - (previewTheme.auth_overlay_darkness || 60)) / 100),
          }}
        />
      )}
      <div className="relative z-10 flex-1 flex items-center justify-center w-full my-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: 1,
            y: 0,
            x: errorMessage ? [0, -6, 6, -4, 4, 0] : 0,
          }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="p-7 sm:p-9 rounded-xl bg-[#181A20] border border-white/10 shadow-2xl">
            {/* Brand Logo & Heading (Zero Stack/Version Info!) */}
            <div className="flex flex-col items-center text-center mb-6">
              <img
                src={previewTheme.logo_url || '/logo.jpg'}
                alt="SlayerNode"
                className="w-16 h-16 rounded-xl object-cover border border-white/10 shadow-lg mb-3"
              />

              <h1 className="text-xl font-black tracking-tight text-white">
                {previewTheme.auth_heading || 'SlayerNode'}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {previewTheme.auth_subtitle || 'Game Server Management Portal'}
              </p>
            </div>

            {/* Lockout Warning in Bold Red */}
            {isLockedOut && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-500 font-bold text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Security lockout active. Retry in {lockoutRemaining} seconds.</span>
              </div>
            )}

            {/* Form Error in BOLD RED FONT */}
            {errorMessage && !isLockedOut && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-500 font-bold text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input type="hidden" name="_csrf" value={csrfToken} />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Email Address or Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    disabled={isLockedOut}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="user@slayernode.xyz"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#14161B] border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#DC2626] transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isLockedOut}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 rounded-lg bg-[#14161B] border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#DC2626] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs mt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded border-white/20 bg-[#14161B] text-[#DC2626] focus:ring-0 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                {onNavigateForgot && (
                  <button
                    type="button"
                    onClick={onNavigateForgot}
                    className="text-xs text-slate-400 hover:text-[#DC2626] transition-colors cursor-pointer font-medium"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              {/* Square Solid Red Submit Button */}
              <button
                type="submit"
                disabled={isLoading || isLockedOut}
                className="w-full mt-2 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-md shadow-red-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {previewTheme.auth_allow_registration && onNavigateRegister && (
              <div className="mt-5 pt-4 border-t border-white/10 text-center text-xs text-slate-400">
                <span>Don't have an account? </span>
                <button
                  type="button"
                  onClick={onNavigateRegister}
                  className="font-bold text-[#DC2626] hover:underline cursor-pointer"
                >
                  Create one
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Minimal Footer */}
      <footer className="w-full max-w-md flex items-center justify-center gap-4 text-[11px] text-slate-500 py-3">
        {(previewTheme.auth_footer_links || []).map((link, idx) => (
          <React.Fragment key={idx}>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors"
            >
              {link.label}
            </a>
            {idx < (previewTheme.auth_footer_links || []).length - 1 && (
              <span>•</span>
            )}
          </React.Fragment>
        ))}
      </footer>

      {/* 2FA Modal */}
      <TwoFactorModal
        isOpen={showTwoFactor}
        onClose={() => setShowTwoFactor(false)}
        onVerify={handle2FAVerify}
      />
    </div>
  );
};
