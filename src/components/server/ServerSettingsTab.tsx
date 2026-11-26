import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, Copy, Check, HardDrive, Server as ServerIcon, AlertTriangle } from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { useAuth } from '../../context/AuthContext';
import { apiJson } from '../../lib/api';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';

export const ServerSettingsTab: React.FC = () => {
  const { activeServer, refreshServers } = useServers();
  const { user } = useAuth();

  const [name, setName] = useState(activeServer?.name || '');
  const [description, setDescription] = useState(activeServer?.description || '');
  const [saving, setSaving] = useState(false);
  const [reinstalling, setReinstalling] = useState(false);
  const [confirmReinstall, setConfirmReinstall] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setName(activeServer?.name || '');
    setDescription(activeServer?.description || '');
    setFeedback(null);
    setConfirmReinstall(false);
  }, [activeServer?.uuid]);

  if (!activeServer) return null;

  const sftpHost = activeServer.sftp_details?.ip || activeServer.allocation?.ip || '127.0.0.1';
  const sftpPort = activeServer.sftp_details?.port || 2202;
  const sftpUser = `${user?.username || 'user'}.${activeServer.identifier}`;

  const copyValue = (key: string, val: string) => {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setFeedback(null);
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/settings/rename`, {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      await refreshServers();
      setFeedback({ type: 'ok', text: 'Server details updated and persisted.' });
    } catch (err: any) {
      setFeedback({ type: 'err', text: err?.message || 'Failed updating server settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReinstall = async () => {
    setReinstalling(true);
    setFeedback(null);
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/settings/reinstall`, {
        method: 'POST',
      });
      setConfirmReinstall(false);
      setFeedback({ type: 'ok', text: 'Server re-initialization dispatched cleanly to SlayerWings.' });
    } catch (err: any) {
      setFeedback({ type: 'err', text: err?.message || 'Reinstall request failed.' });
    } finally {
      setReinstalling(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard className="p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Server Identity & Metadata</h3>
            <p className="text-xs text-slate-400">Update display name and description stored for this instance.</p>
          </div>
        </div>

        <form onSubmit={handleRename} className="flex flex-col gap-4">
          <GlassInput
            label="Server Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My Production Server"
            required
          />
          <GlassInput
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Optional description shown on dashboard"
          />

          {feedback && (
            <div
              className={`px-3.5 py-2.5 rounded-xl text-xs font-medium border ${
                feedback.type === 'ok'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div className="flex justify-end">
            <GlassButton type="submit" variant="primary" disabled={saving}>
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? 'Saving...' : 'Save Server Details'}
            </GlassButton>
          </div>
        </form>
      </GlassCard>

      <div className="flex flex-col gap-6">
        <GlassCard className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">SFTP & Debug Details</h3>
              <p className="text-xs text-slate-400">Use these isolated credentials with FileZilla, WinSCP, or support.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-xs font-mono">
            {[
              { key: 'sftp', label: 'SFTP Address', value: `sftp://${sftpHost}:${sftpPort}` },
              { key: 'user', label: 'SFTP Username', value: sftpUser },
              { key: 'uuid', label: 'Server UUID', value: activeServer.uuid },
              { key: 'node', label: 'Assigned Node', value: activeServer.node_name || `Node #${activeServer.node_id}` },
            ].map(row => (
              <div key={row.key} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111318] border border-white/10">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">{row.label}</div>
                  <div className="text-slate-200 truncate">{row.value}</div>
                </div>
                <button
                  type="button"
                  onClick={() => copyValue(row.key, row.value)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer shrink-0"
                  title={`Copy ${row.label}`}
                >
                  {copiedField === row.key ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6 flex flex-col gap-4 border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <ServerIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Reinstall Server Files</h3>
              <p className="text-xs text-slate-400">Re-sync configuration files (`server.properties`, `eula.txt`, etc.) on the node daemon.</p>
            </div>
          </div>

          {confirmReinstall ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Confirm re-initializing this container&apos;s base environment?</span>
              </div>
              <div className="flex items-center gap-2">
                <GlassButton variant="danger" size="sm" onClick={handleReinstall} disabled={reinstalling}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  {reinstalling ? 'Reinstalling...' : 'Confirm Reinstall'}
                </GlassButton>
                <GlassButton variant="secondary" size="sm" onClick={() => setConfirmReinstall(false)}>
                  Cancel
                </GlassButton>
              </div>
            </div>
          ) : (
            <div>
              <GlassButton variant="secondary" onClick={() => setConfirmReinstall(true)}>
                <RotateCcw className="w-4 h-4 mr-1.5" /> Reinstall Server
              </GlassButton>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
