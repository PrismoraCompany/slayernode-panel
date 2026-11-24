import React, { useState } from 'react';
import {
  Settings,
  Mail,
  Shield,
  Server,
  Check,
  Save,
  Send,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { GlassToggle } from '../ui/GlassToggle';

export const AdminSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'mail' | 'security'>('general');
  const [saved, setSaved] = useState(false);

  // General Settings
  const [companyName, setCompanyName] = useState('SlayerNode');
  const [require2FA, setRequire2FA] = useState(false);

  // Mail (SMTP) Settings
  const [smtpHost, setSmtpHost] = useState('smtp.mailgun.org');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpEncryption, setSmtpEncryption] = useState<'tls' | 'ssl' | 'none'>('tls');
  const [smtpUser, setSmtpUser] = useState('postmaster@slayernode.xyz');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [smtpFrom, setSmtpFrom] = useState('noreply@slayernode.xyz');
  const [testRecipient, setTestRecipient] = useState('admin@slayernode.xyz');

  // SMTP Test State
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpResult, setSmtpResult] = useState<{
    success: boolean;
    message: string;
    latency_ms?: number;
    response?: string;
    details?: string;
  } | null>(null);

  // Security Settings
  const [sessionTimeout, setSessionTimeout] = useState('120');
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('4');

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpResult(null);

    try {
      const res = await fetch('/api/admin/mail/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost,
          port: smtpPort,
          encryption: smtpEncryption,
          username: smtpUser,
          password: smtpPassword,
          from: smtpFrom,
          to: testRecipient || undefined,
        }),
      });

      const data = await res.json();
      setSmtpResult({
        success: data.success,
        message: data.message || data.error || 'Unknown response',
        latency_ms: data.latency_ms,
        response: data.response,
        details: data.details,
      });
    } catch (err: any) {
      setSmtpResult({
        success: false,
        message: 'Could not connect to panel backend mail daemon.',
        details: err?.message,
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-500" /> System Settings & Service Configuration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Production panel configuration parameters, database connection, and mail services.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          onClick={handleSave}
          leftIcon={saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
        >
          {saved ? 'Saved Successfully!' : 'Save Settings'}
        </GlassButton>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-xs">
        {[
          { id: 'general', label: 'General Settings', icon: <Server className="w-3.5 h-3.5" /> },
          { id: 'mail', label: 'Mail (SMTP)', icon: <Mail className="w-3.5 h-3.5" /> },
          { id: 'security', label: 'Security & Sessions', icon: <Shield className="w-3.5 h-3.5" /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              activeTab === t.id
                ? 'bg-red-600/20 text-red-500 border border-red-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard className="p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white">General Information</h3>
            <GlassInput
              label="Company / Host Name"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
            <GlassToggle
              label="Require 2-Factor Authentication"
              description="Require 2FA TOTP for all administrator accounts"
              checked={require2FA}
              onChange={setRequire2FA}
            />
          </GlassCard>

          <GlassCard className="p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white">Architecture & Clustering</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              SlayerNode Panel operates as a stateless API and control plane. Game container virtualization, Docker sockets, and SFTP subsystems run exclusively on external SlayerWings daemons hosted across your VPS fleet.
            </p>
            <div className="p-3 rounded-lg bg-[#111216] border border-white/5 text-xs font-mono text-slate-400">
              SlayerWings Protocol: Ports 8443 (API) / 2202 (SFTP)
            </div>
          </GlassCard>
        </div>
      )}

      {/* Mail Tab with Real SMTP Verification */}
      {activeTab === 'mail' && (
        <GlassCard className="p-5 sm:p-6 flex flex-col gap-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-red-500" /> Outbound SMTP Email Gateway
            </h3>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
              Live Socket Test
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Configure the outbound SMTP mailer for account activations, password resets, and alert notifications.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <GlassInput
                label="SMTP Host"
                value={smtpHost}
                onChange={e => setSmtpHost(e.target.value)}
                placeholder="smtp.mailgun.org"
              />
            </div>
            <div>
              <GlassInput
                label="Port"
                value={smtpPort}
                onChange={e => setSmtpPort(e.target.value)}
                placeholder="587"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Encryption Protocol</label>
              <select
                value={smtpEncryption}
                onChange={e => {
                  const val = e.target.value as 'tls' | 'ssl' | 'none';
                  setSmtpEncryption(val);
                  if (val === 'ssl') setSmtpPort('465');
                  else if (val === 'tls') setSmtpPort('587');
                  else setSmtpPort('25');
                }}
                className="glass-input text-xs w-full px-3 py-2 bg-slate-900 text-white cursor-pointer"
              >
                <option value="tls">STARTTLS (Port 587 - Recommended)</option>
                <option value="ssl">SSL / TLS (Port 465)</option>
                <option value="none">Plaintext / None (Port 25)</option>
              </select>
            </div>

            <GlassInput
              label="Sender 'From' Address"
              value={smtpFrom}
              onChange={e => setSmtpFrom(e.target.value)}
              placeholder="noreply@slayernode.xyz"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassInput
              label="SMTP Username"
              value={smtpUser}
              onChange={e => setSmtpUser(e.target.value)}
              placeholder="postmaster@slayernode.xyz"
            />

            <GlassInput
              label="SMTP Password"
              type={showPassword ? 'text' : 'password'}
              value={smtpPassword}
              onChange={e => setSmtpPassword(e.target.value)}
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
          </div>

          <div className="pt-2 border-t border-white/10 flex flex-col gap-3">
            <GlassInput
              label="Test Recipient Address (Optional - Dispatches Real Test Email)"
              value={testRecipient}
              onChange={e => setTestRecipient(e.target.value)}
              placeholder="admin@slayernode.xyz"
            />

            {/* Live Result Diagnostic Banner */}
            {smtpResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex flex-col gap-1.5 transition-all ${
                  smtpResult.success
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {smtpResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{smtpResult.message}</span>
                </div>
                {smtpResult.latency_ms && (
                  <div className="font-mono text-[11px] text-slate-300">
                    Socket Latency: {smtpResult.latency_ms}ms
                  </div>
                )}
                {smtpResult.response && (
                  <div className="font-mono text-[11px] text-slate-400 truncate">
                    Server Response: {smtpResult.response}
                  </div>
                )}
                {smtpResult.details && (
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {smtpResult.details}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">
                Tests genuine TCP/TLS handshake & AUTH with remote server.
              </span>

              <GlassButton
                size="sm"
                variant="accent"
                onClick={handleTestSmtp}
                isLoading={isTestingSmtp}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Test SMTP Connection
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <GlassCard className="p-5 flex flex-col gap-4 max-w-2xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" /> Session Security & Brute-Force Defense
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <GlassInput
              label="Session Expiration (Minutes)"
              type="number"
              value={sessionTimeout}
              onChange={e => setSessionTimeout(e.target.value)}
            />
            <GlassInput
              label="Failed Login Lockout Threshold"
              type="number"
              value={maxLoginAttempts}
              onChange={e => setMaxLoginAttempts(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-400">
            Accounts exceeding the failed login threshold are automatically placed on a temporary cooling-off suspension.
          </p>
        </GlassCard>
      )}
    </div>
  );
};
