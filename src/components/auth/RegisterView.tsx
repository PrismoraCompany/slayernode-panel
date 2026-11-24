import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User as UserIcon, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassInput } from '../ui/GlassInput';
import { GlassButton } from '../ui/GlassButton';
import { AuroraShader } from './AuroraShader';

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

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 z-10 overflow-hidden">
      <AuroraShader />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg z-10"
      >
        <GlassCard className="p-8 sm:p-9 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onNavigateLogin}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </button>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-400/20">
              New Account
            </span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-black text-white tracking-tight">Create your account</h2>
            <p className="text-xs text-slate-400 mt-1">
              Join {previewTheme.panel_name} to launch and control dedicated game clusters.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium mb-4">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <GlassInput
                label="First Name"
                value={nameFirst}
                onChange={e => setNameFirst(e.target.value)}
                placeholder="Alex"
                required
              />
              <GlassInput
                label="Last Name"
                value={nameLast}
                onChange={e => setNameLast(e.target.value)}
                placeholder="Mercer"
                required
              />
            </div>

            <GlassInput
              label="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="alexm"
              leftIcon={<UserIcon className="w-4 h-4" />}
              required
            />

            <GlassInput
              label="Email Address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="alex@slayernode.xyz"
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <GlassInput
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <div className="flex items-center gap-2 text-xs text-slate-400 my-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Passwords are hashed with bcrypt (cost factor 12).</span>
            </div>

            <GlassButton
              type="submit"
              variant="accent"
              size="lg"
              isLoading={isLoading}
              className="mt-2 w-full text-base font-semibold"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Complete Registration
            </GlassButton>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
};
