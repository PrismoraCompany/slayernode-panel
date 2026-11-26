import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Key,
  Terminal,
  Activity,
  Globe,
  Lock,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  QrCode,
  Laptop,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch, apiJson, setCsrfToken } from '../../lib/api';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { GlassModal } from '../ui/GlassModal';
import { ClientApiKey, SshKey, UserActivityLog } from '../../types';

export const AccountSettingsView: React.FC = () => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'account' | 'api' | 'ssh' | 'activity' | 'regions'>('account');

  // Password update form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Email update form state
  const [emailAddress, setEmailAddress] = useState(user?.email || '');
  const [emailConfirmPassword, setEmailConfirmPassword] = useState('');
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.two_factor_enabled || false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorMsg, setTwoFactorMsg] = useState<string | null>(null);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ClientApiKey[]>([]);
  const [apiDesc, setApiDesc] = useState('');
  const [apiAllowedIps, setApiAllowedIps] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [newSecretModal, setNewSecretModal] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);

  // SSH Keys state
  const [sshKeys, setSshKeys] = useState<SshKey[]>([]);
  const [sshName, setSshName] = useState('');
  const [sshPublicKey, setSshPublicKey] = useState('');
  const [sshError, setSshError] = useState<string | null>(null);
  const [sshLoading, setSshLoading] = useState(false);

  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Node Regions state
  const [regions, setRegions] = useState<any[]>([]);

  // Fetch account data on mount
  useEffect(() => {
    fetchAccountDetails();
    fetchApiKeys();
    fetchSshKeys();
    fetchActivityLogs();
    fetchNodeRegions();
  }, []);

  const fetchAccountDetails = async () => {
    try {
      const d = await apiJson<any>('/api/client/account');
      const attrs = d?.attributes || d;
      if (attrs) {
        setEmailAddress(attrs.email || '');
        setTwoFactorEnabled(Boolean(attrs.two_factor_enabled));
      }
    } catch {}
  };

  const fetchApiKeys = async () => {
    try {
      const d = await apiJson<{ data: any[] }>('/api/client/account/api-keys');
      if (Array.isArray(d?.data)) {
        setApiKeys(d.data.map((x: any) => x.attributes || x));
      }
    } catch {}
  };

  const fetchSshKeys = async () => {
    try {
      const d = await apiJson<{ data: any[] }>('/api/client/account/ssh-keys');
      if (Array.isArray(d?.data)) {
        setSshKeys(d.data.map((x: any) => x.attributes || x));
      }
    } catch {}
  };

  const fetchActivityLogs = async () => {
    setLogsLoading(true);
    try {
      const d = await apiJson<{ data: any[] }>('/api/client/account/activity');
      if (Array.isArray(d?.data)) {
        setActivityLogs(d.data.map((x: any) => x.attributes || x));
      }
    } catch {}
    finally {
      setLogsLoading(false);
    }
  };

  const fetchNodeRegions = async () => {
    try {
      const d = await apiJson<{ data: any[] }>('/api/client/regions');
      if (Array.isArray(d?.data)) {
        setRegions(d.data);
      }
    } catch {}
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!newPassword || newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters in length.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const data = await apiJson<any>('/api/client/account/password', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });
      if (data?.csrfToken) setCsrfToken(data.csrfToken);
      setPasswordMsg({ type: 'success', text: 'Password successfully updated.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchActivityLogs();
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err?.message || 'Failed to update password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle Email Update
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg(null);

    if (!emailAddress || !emailAddress.includes('@')) {
      setEmailMsg({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setEmailLoading(true);
    try {
      await apiJson('/api/client/account/email', {
        method: 'PUT',
        body: JSON.stringify({ email: emailAddress, password: emailConfirmPassword }),
      });
      setEmailMsg({ type: 'success', text: 'Email address updated successfully.' });
      setEmailConfirmPassword('');
      fetchActivityLogs();
    } catch (err: any) {
      setEmailMsg({ type: 'error', text: err?.message || 'Failed to update email.' });
    } finally {
      setEmailLoading(false);
    }
  };

  // Begin 2FA Setup or Disable 2FA
  const handleBegin2FASetup = async () => {
    setTwoFactorMsg(null);
    setTwoFactorCode('');
    try {
      const data = await apiJson<{ secret: string }>('/api/client/account/two-factor', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setTwoFactorSecret(data.secret || '');
      setShowTwoFactorModal(true);
    } catch (err: any) {
      setTwoFactorMsg(err?.message || 'Unable to generate 2FA secret.');
    }
  };

  const handleToggle2FA = async () => {
    setTwoFactorMsg(null);
    try {
      if (twoFactorEnabled) {
        const pw = window.prompt('Enter your current password to disable 2FA:') || '';
        if (!pw) return;
        const data = await apiJson<{ enabled: boolean }>('/api/client/account/two-factor', {
          method: 'DELETE',
          body: JSON.stringify({ password: pw }),
        });
        setTwoFactorEnabled(Boolean(data.enabled));
      } else {
        const data = await apiJson<{ enabled: boolean }>('/api/client/account/two-factor', {
          method: 'POST',
          body: JSON.stringify({ code: twoFactorCode }),
        });
        setTwoFactorEnabled(Boolean(data.enabled));
        setShowTwoFactorModal(false);
      }
      fetchActivityLogs();
    } catch (err: any) {
      setTwoFactorMsg(err?.message || 'Verification failed.');
    }
  };

  // Handle Create Client API Key
  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!apiDesc.trim()) {
      setApiError('A description is required for this API credential.');
      return;
    }

    setApiLoading(true);
    try {
      const data = await apiJson<any>('/api/client/account/api-keys', {
        method: 'POST',
        body: JSON.stringify({ description: apiDesc.trim(), allowed_ips: apiAllowedIps }),
      });
      const created = data.attributes || data;
      setApiKeys(prev => [created, ...prev]);
      setNewSecretModal(data.secret_token || data.meta?.secret_token || '');
      setApiDesc('');
      setApiAllowedIps('');
      fetchActivityLogs();
    } catch (err: any) {
      setApiError(err?.message || 'Failed to create API key.');
    } finally {
      setApiLoading(false);
    }
  };

  // Handle Revoke API Key
  const handleRevokeApiKey = async (identifier: string) => {
    try {
      await apiFetch(`/api/client/account/api-keys/${encodeURIComponent(identifier)}`, { method: 'DELETE' });
      setApiKeys(prev => prev.filter(k => k.identifier !== identifier));
      fetchActivityLogs();
    } catch {}
  };

  // Handle Add SSH Key
  const handleAddSshKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSshError(null);

    if (!sshName.trim()) {
      setSshError('SSH key name is required.');
      return;
    }
    if (!sshPublicKey.trim()) {
      setSshError('Public SSH key is required.');
      return;
    }

    setSshLoading(true);
    try {
      const data = await apiJson<any>('/api/client/account/ssh-keys', {
        method: 'POST',
        body: JSON.stringify({ name: sshName.trim(), public_key: sshPublicKey.trim() }),
      });
      const created = data.attributes || data;
      setSshKeys(prev => [created, ...prev]);
      setSshName('');
      setSshPublicKey('');
      fetchActivityLogs();
    } catch (err: any) {
      setSshError(err?.message || 'Failed to add SSH key.');
    } finally {
      setSshLoading(false);
    }
  };

  // Handle Delete SSH Key
  const handleDeleteSshKey = async (fingerprint: string) => {
    try {
      await apiFetch(`/api/client/account/ssh-keys/${encodeURIComponent(fingerprint)}`, { method: 'DELETE' });
      setSshKeys(prev => prev.filter(k => k.fingerprint !== fingerprint));
      fetchActivityLogs();
    } catch {}
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* ========================================================
          1. TOP SUBTABS BAR (Matches Screenshots Exactly)
          ======================================================== */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#181A20] border border-white/10 overflow-x-auto">
        {[
          { id: 'account', label: 'Account', icon: User },
          { id: 'api', label: 'API Credentials', icon: Key },
          { id: 'ssh', label: 'SSH Keys', icon: Terminal },
          { id: 'activity', label: 'Activity', icon: Activity },
          { id: 'regions', label: 'Node Regions', icon: Globe },
        ].map(tab => {
          const isActive = activeSubTab === tab.id;
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#DC2626] text-white shadow-md shadow-red-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-[#21242C]'
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================
          2. TAB: ACCOUNT (Password, Email, 2FA Cards)
          ======================================================== */}
      {activeSubTab === 'account' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start"
        >
          {/* Card 1: Update Password */}
          <GlassCard className="p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#DC2626]" /> Update Password
            </h3>

            {passwordMsg && (
              <div
                className={`p-3 rounded-lg text-xs font-bold ${
                  passwordMsg.type === 'error'
                    ? 'bg-red-950/40 border border-red-500/40 text-red-500'
                    : 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-400'
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    className="glass-input w-full px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  className="glass-input w-full px-3 py-2 text-xs text-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Your new password should be at least 8 characters in length and unique to this website.
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="glass-input w-full px-3 py-2 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="mt-2 w-full py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-md shadow-red-950/40 cursor-pointer disabled:opacity-50"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </GlassCard>

          {/* Card 2: Update Email Address */}
          <GlassCard className="p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#DC2626]" /> Update Email Address
            </h3>

            {emailMsg && (
              <div
                className={`p-3 rounded-lg text-xs font-bold ${
                  emailMsg.type === 'error'
                    ? 'bg-red-950/40 border border-red-500/40 text-red-500'
                    : 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-400'
                }`}
              >
                {emailMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdateEmail} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={e => setEmailAddress(e.target.value)}
                  required
                  className="glass-input w-full px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={emailConfirmPassword}
                  onChange={e => setEmailConfirmPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="glass-input w-full px-3 py-2 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={emailLoading}
                className="mt-2 w-full py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-md shadow-red-950/40 cursor-pointer disabled:opacity-50"
              >
                {emailLoading ? 'Saving...' : 'Update Email'}
              </button>
            </form>
          </GlassCard>

          {/* Card 3: Two-Step Verification */}
          <GlassCard className="p-6 flex flex-col justify-between min-h-[300px]">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#DC2626]" /> Two-Step Verification
                </h3>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    twoFactorEnabled
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-white/10'
                  }`}
                >
                  {twoFactorEnabled ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {twoFactorEnabled
                  ? 'Two-step verification is currently enabled on your account. You will be prompted for a 6-digit TOTP code upon every login.'
                  : 'You do not currently have two-step verification enabled on your account. Click the button below to begin configuring it.'}
              </p>
            </div>

            <button
              onClick={() => {
                if (twoFactorEnabled) {
                  handleToggle2FA();
                } else {
                  handleBegin2FASetup();
                }
              }}
              className={`mt-4 w-full py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                twoFactorEnabled
                  ? 'bg-[#21242C] hover:bg-red-500/20 text-red-400 border border-white/10 hover:border-red-500/30'
                  : 'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-md shadow-red-950/40'
              }`}
            >
              {twoFactorEnabled ? 'Disable Two-Step' : 'Enable Two-Step'}
            </button>
          </GlassCard>
        </motion.div>
      )}

      {/* ========================================================
          3. TAB: API CREDENTIALS (Matches Screenshot 3)
          ======================================================== */}
      {activeSubTab === 'api' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Left Column: Create API Key (5 cols) */}
          <GlassCard className="lg:col-span-5 p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-[#DC2626]" /> Create API Key
            </h3>

            {apiError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-500 font-bold text-xs">
                {apiError}
              </div>
            )}

            <form onSubmit={handleCreateApiKey} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={apiDesc}
                  onChange={e => setApiDesc(e.target.value)}
                  placeholder="A description of this API key."
                  required
                  className="glass-input w-full px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Allowed IPs
                </label>
                <textarea
                  rows={4}
                  value={apiAllowedIps}
                  onChange={e => setApiAllowedIps(e.target.value)}
                  placeholder="Leave blank to allow any IP address to use this API key, otherwise provide each IP address on a new line."
                  className="glass-input w-full p-3 font-mono text-xs text-slate-200 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={apiLoading}
                className="mt-2 w-full py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-md shadow-red-950/40 cursor-pointer disabled:opacity-50"
              >
                {apiLoading ? 'Generating...' : 'CREATE'}
              </button>
            </form>
          </GlassCard>

          {/* Right Column: API Keys List (7 cols) */}
          <GlassCard className="lg:col-span-7 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">API Keys</h3>
              <span className="text-xs text-slate-400 font-mono">({apiKeys.length} active)</span>
            </div>

            {apiKeys.length === 0 ? (
              <div className="p-10 rounded-lg bg-[#14161B] border border-white/5 text-center flex flex-col items-center justify-center">
                <p className="text-xs text-slate-400 font-medium">No API keys exist for this account.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {apiKeys.map(k => (
                  <div
                    key={k.identifier}
                    className="p-4 rounded-xl bg-[#14161B] border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{k.description}</span>
                        <code className="text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                          {k.identifier}
                        </code>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                        <span>Created: {new Date(k.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>IPs: {k.allowed_ips?.length ? k.allowed_ips.join(', ') : 'Any IP'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeApiKey(k.identifier)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Revoke API Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}

      {/* ========================================================
          4. TAB: SSH KEYS (Matches Screenshot 2)
          ======================================================== */}
      {activeSubTab === 'ssh' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Left Column: Add SSH Key (5 cols) */}
          <GlassCard className="lg:col-span-5 p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#DC2626]" /> Add SSH Key
            </h3>

            {sshError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-500 font-bold text-xs">
                {sshError}
              </div>
            )}

            <form onSubmit={handleAddSshKey} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  SSH Key Name
                </label>
                <input
                  type="text"
                  value={sshName}
                  onChange={e => setSshName(e.target.value)}
                  placeholder="e.g. Workstation MacBook"
                  required
                  className="glass-input w-full px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Public Key
                </label>
                <textarea
                  rows={5}
                  value={sshPublicKey}
                  onChange={e => setSshPublicKey(e.target.value)}
                  placeholder="ssh-rsa AAAAB3NzaC1yc2E... or ssh-ed25519 AAAAC3NzaC1lZDI1NTE5..."
                  required
                  className="glass-input w-full p-3 font-mono text-xs text-slate-200 resize-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Enter your public SSH key.
                </span>
              </div>

              <button
                type="submit"
                disabled={sshLoading}
                className="mt-2 w-full py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-md shadow-red-950/40 cursor-pointer disabled:opacity-50"
              >
                {sshLoading ? 'Saving...' : 'SAVE'}
              </button>
            </form>
          </GlassCard>

          {/* Right Column: SSH Keys List (7 cols) */}
          <GlassCard className="lg:col-span-7 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">SSH Keys</h3>
              <span className="text-xs text-slate-400 font-mono">({sshKeys.length} registered)</span>
            </div>

            {sshKeys.length === 0 ? (
              <div className="p-10 rounded-lg bg-[#14161B] border border-white/5 text-center flex flex-col items-center justify-center">
                <p className="text-xs text-slate-400 font-medium">No SSH Keys exist for this account.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sshKeys.map(k => (
                  <div
                    key={k.fingerprint}
                    className="p-4 rounded-xl bg-[#14161B] border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Laptop className="w-4 h-4 text-[#DC2626] shrink-0" />
                        <span className="text-xs font-bold text-white truncate">{k.name}</span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 truncate">
                        <span>Fingerprint: </span>
                        <code className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                          {k.fingerprint}
                        </code>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Added: {new Date(k.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteSshKey(k.fingerprint)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete SSH Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}

      {/* ========================================================
          5. TAB: ACTIVITY (Matches Screenshot 1)
          ======================================================== */}
      {activeSubTab === 'activity' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          <GlassCard className="p-4 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#DC2626]" /> Security Activity Log
              </h3>
              <button
                onClick={fetchActivityLogs}
                className="p-1.5 rounded-lg bg-[#21242C] text-slate-300 hover:text-white transition-colors"
                title="Refresh Activity"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {activityLogs.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 font-medium">
                No recent activity records found.
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-white/5">
                {activityLogs.map(log => (
                  <div
                    key={log.id}
                    className="py-3.5 flex items-center justify-between gap-4 transition-colors hover:bg-white/[0.02] px-2 rounded-lg"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#21242C] border border-white/10 flex items-center justify-center font-bold text-[#DC2626] text-xs shrink-0">
                        {log.username ? log.username[0].toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate font-mono">
                            {log.username} — <span className="text-red-400">{log.action}</span>
                          </span>
                        </div>
                        <span className="text-xs text-slate-300 block truncate mt-0.5">
                          {log.description}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span>{log.ip}</span>
                          <span>•</span>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-white/5 text-[11px] text-slate-500 font-mono">
              Showing 1 to {activityLogs.length} of {activityLogs.length} results.
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ========================================================
          6. TAB: NODE REGIONS
          ======================================================== */}
      {activeSubTab === 'regions' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          <GlassCard className="p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#DC2626]" /> Datacenter Node Regions
            </h3>
            <p className="text-xs text-slate-400">
              Active physical server points-of-presence powering SlayerWings container deployments.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {regions.length === 0 ? (
                <div className="col-span-full p-8 text-center text-xs text-slate-400">
                  No public regions configured. Contact system administrator.
                </div>
              ) : (
                regions.map(r => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl bg-[#14161B] border border-white/10 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{r.name}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          r.status === 'online'
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                        }`}
                      >
                        {String(r.status || 'unknown').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-white/5">
                      <span>Code: <strong className="text-slate-200">{r.short || r.location || 'local'}</strong></span>
                      <span className={r.status === 'online' ? 'text-emerald-400' : 'text-rose-400'}>
                        {r.ping_ms ?? r.latency_ms ?? 0}ms ping
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ========================================================
          MODAL: NEW API KEY TOKEN DISPLAY
          ======================================================== */}
      <GlassModal
        isOpen={!!newSecretModal}
        onClose={() => setNewSecretModal(null)}
        title="API Key Generated"
        description="Your token is shown below. You will not be able to view this secret token again, so make sure to copy and save it securely."
        maxWidth="md"
      >
        <div className="flex flex-col gap-4 py-2">
          <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Do not share this key with anyone. It provides programmatic access to your account.</span>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-black/60 border border-white/10">
            <code className="text-xs font-mono text-emerald-400 break-all select-all flex-1">
              {newSecretModal}
            </code>
            <button
              onClick={() => newSecretModal && copyToClipboard(newSecretModal)}
              className="p-2 rounded-lg bg-[#21242C] hover:bg-[#2A2E38] text-white shrink-0 cursor-pointer"
              title="Copy to Clipboard"
            >
              {copiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setNewSecretModal(null)}
              className="px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold cursor-pointer"
            >
              I have saved my token
            </button>
          </div>
        </div>
      </GlassModal>

      {/* ========================================================
          MODAL: TWO-FACTOR TOTP SETUP
          ======================================================== */}
      <GlassModal
        isOpen={showTwoFactorModal}
        onClose={() => setShowTwoFactorModal(false)}
        title="Configure Two-Step Verification"
        description="Scan the setup code below using your authenticator app (Google Authenticator, Authy, 1Password) and verify the 6-digit token."
        maxWidth="md"
      >
        <div className="flex flex-col items-center gap-4 py-3 text-center">
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <QrCode className="w-32 h-32 text-black" />
          </div>

          <div className="w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Manual Setup Secret Key
            </span>
            <code className="px-3 py-1.5 rounded-lg bg-[#14161B] border border-white/10 text-xs font-mono text-red-400 block select-all">
              {twoFactorSecret}
            </code>
          </div>

          <div className="w-full">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              6-Digit Authenticator Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={twoFactorCode}
              onChange={e => setTwoFactorCode(e.target.value)}
              placeholder="000000"
              className="glass-input w-36 text-center text-lg font-mono tracking-widest text-white mx-auto block py-2"
            />
          </div>

          {twoFactorMsg && (
            <div className="w-full p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {twoFactorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 w-full pt-2">
            <button
              onClick={() => setShowTwoFactorModal(false)}
              className="px-4 py-2 rounded-lg bg-[#21242C] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleToggle2FA}
              className="px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold cursor-pointer shadow-md"
            >
              Verify & Activate
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
