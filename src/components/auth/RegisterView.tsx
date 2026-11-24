import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User as UserIcon, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface RegisterViewProps {
  onNavigateLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onNavigateLogin }) => {
  const { register } = useAuth();
  const { previewTheme } = useTheme();

  const [nameFirst, setNameFirst] = useState('');
  const [nameLast, setNameLast] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const res = await register(nameFirst, nameLast, username, email, password);
    setIsLoading(false);
    if (!res.success) {
      setErrorMessage(res.error || 'Registration failed.');
    }
  };

  const bgWallpaper = previewTheme.auth_bg_url || previewTheme.custom_wallpaper_url;

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 text-[#F3F4F6] relative z-10"
      style={{ backgroundColor: previewTheme.bg_canvas || '#111216' }}
    >
      {/* Background Wallpaper Layer */}
      {bgWallpaper && (
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center transition-all duration-300"
          style={{
            backgroundImage: `url(${bgWallpaper})`,
            filter: `blur(${previewTheme.auth_overlay_blur || previewTheme.wallpaper_blur || 0}px)`,
            opacity: Math.max(0.1, (100 - (previewTheme.auth_overlay_darkness || 60)) / 100),
          }}
        />
      )}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg"
      >
        <div className="p-7 sm:p-9 rounded-xl bg-[#181A20] border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onNavigateLogin}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </button>
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-[#21242C] text-slate-300 border border-white/10">
              CREATE ACCOUNT
            </span>
          </div>

          <div className="mb-5">
            <h2 className="text-xl font-black text-white tracking-tight">Create your account</h2>
            <p className="text-xs text-slate-400 mt-1">
              Join {previewTheme.panel_name || 'SlayerNode'} to manage dedicated server instances.
            </p>
          </div>

          {/* Error Message in Bold Red Font */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-500 font-bold text-xs mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">First Name</label>
                <input
                  type="text"
                  required
                  value={nameFirst}
                  onChange={e => setNameFirst(e.target.value)}
                  placeholder="First name"
                  className="w-full px-3 py-2 rounded-lg bg-[#14161B] border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#DC2626] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Last Name</label>
                <input
                  type="text"
                  required
                  value={nameLast}
                  onChange={e => setNameLast(e.target.value)}
                  placeholder="Last name"
                  className="w-full px-3 py-2 rounded-lg bg-[#14161B] border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#DC2626] transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#14161B] border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#DC2626] transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#14161B] border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#DC2626] transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#14161B] border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#DC2626] transition-colors"
                />
              </div>
            </div>

            {/* Square Red Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-md shadow-red-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Creating account...' : 'Create Account'}</span>
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
