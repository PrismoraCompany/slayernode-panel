import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Trash2, Shield } from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { apiFetch, apiJson } from '../../lib/api';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { GlassModal } from '../ui/GlassModal';

interface SubuserItem {
  uuid: string;
  user_id: number;
  username: string;
  email: string;
  permissions: string[];
  created_at: string;
}

const AVAILABLE_PERMS = [
  { id: 'control.console', label: 'Console' },
  { id: 'control.start', label: 'Start' },
  { id: 'control.restart', label: 'Restart' },
  { id: 'control.stop', label: 'Stop' },
  { id: 'file.read', label: 'Read Files' },
  { id: 'file.update', label: 'Edit Files' },
  { id: 'file.create', label: 'Upload/Create' },
  { id: 'file.delete', label: 'Delete Files' },
  { id: 'backup.read', label: 'View Backups' },
  { id: 'backup.create', label: 'Create Backups' },
  { id: 'database.read', label: 'View Databases' },
  { id: 'schedule.read', label: 'View Schedules' },
  { id: 'allocation.read', label: 'View Network' },
  { id: 'startup.read', label: 'View Startup' },
];

export const UsersTab: React.FC = () => {
  const { activeServer } = useServers();
  const [subusers, setSubusers] = useState<SubuserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [perms, setPerms] = useState<string[]>(['control.console', 'file.read']);
  const [error, setError] = useState<string | null>(null);

  const loadSubusers = useCallback(async () => {
    if (!activeServer) return;
    setLoading(true);
    try {
      const res = await apiJson<{ data: SubuserItem[] }>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/users`
      );
      setSubusers(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setSubusers([]);
    } finally {
      setLoading(false);
    }
  }, [activeServer?.uuid]);

  useEffect(() => {
    loadSubusers();
  }, [loadSubusers]);

  if (!activeServer) return null;

  const togglePerm = (id: string) => {
    setPerms(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]));
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const created = await apiJson<SubuserItem>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/users`,
        {
          method: 'POST',
          body: JSON.stringify({ email: email.trim(), permissions: perms }),
        }
      );
      setSubusers(prev => [...prev, created]);
      setShowInvite(false);
      setEmail('');
    } catch (err: any) {
      setError(err?.message || 'Failed adding subuser.');
    }
  };

  const handleRemove = async (subUuid: string) => {
    if (!window.confirm('Revoke all server access for this subuser?')) return;
    try {
      await apiFetch(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/users/${subUuid}`, {
        method: 'DELETE',
      });
      setSubusers(prev => prev.filter(su => su.uuid !== subUuid));
    } catch {}
  };

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Subusers &amp; Access Permissions</h3>
            <p className="text-xs text-slate-400">Grant scoped access on this server to other registered panel accounts.</p>
          </div>
        </div>
        <GlassButton variant="primary" size="sm" onClick={() => setShowInvite(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Subuser
        </GlassButton>
      </GlassCard>

      {subusers.length === 0 ? (
        <GlassCard className="p-10 text-center text-sm text-slate-400">
          {loading ? 'Loading subusers...' : 'No subusers assigned to this server.'}
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subusers.map(su => (
            <GlassCard key={su.uuid} className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-200">
                    <Shield className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{su.username}</h4>
                    <p className="text-xs text-slate-400 font-mono">{su.email}</p>
                  </div>
                </div>
                <GlassButton variant="danger" size="sm" onClick={() => handleRemove(su.uuid)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </GlassButton>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                {(su.permissions || []).map(p => (
                  <span key={p} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                    {p}
                  </span>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <GlassModal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Assign Server Subuser" maxWidth="md">
        <form onSubmit={handleInvite} className="flex flex-col gap-4 py-2">
          <GlassInput
            label="User Email Address"
            type="email"
            placeholder="operator@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Granular Permissions</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_PERMS.map(p => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 text-xs text-slate-300 p-2 rounded-lg bg-[#111318] border border-white/10 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={perms.includes(p.id)}
                    onChange={() => togglePerm(p.id)}
                    className="accent-red-600"
                  />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          </div>
          {error && <div className="text-xs text-rose-400">{error}</div>}
          <div className="flex justify-end gap-2">
            <GlassButton type="button" variant="secondary" onClick={() => setShowInvite(false)}>Cancel</GlassButton>
            <GlassButton type="submit" variant="primary">Grant Access</GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
