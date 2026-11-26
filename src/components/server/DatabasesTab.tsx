import React, { useState, useEffect, useCallback } from 'react';
import { Database, Plus, Trash2, Copy, Check, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { apiFetch, apiJson } from '../../lib/api';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';

interface PersistedDb {
  id: number;
  name: string;
  username: string;
  password: string;
  host: string;
  port: number;
  remote: string;
  created_at: string;
}

export const DatabasesTab: React.FC = () => {
  const { activeServer } = useServers();
  const [databases, setDatabases] = useState<PersistedDb[]>([]);
  const [limit, setLimit] = useState(2);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [dbName, setDbName] = useState('');
  const [remoteHost, setRemoteHost] = useState('%');
  const [error, setError] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadDatabases = useCallback(async () => {
    if (!activeServer) return;
    setLoading(true);
    try {
      const res = await apiJson<{ data: PersistedDb[]; limit: number }>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/databases`
      );
      setDatabases(Array.isArray(res?.data) ? res.data : []);
      if (res?.limit !== undefined) setLimit(res.limit);
    } catch {
      setDatabases([]);
    } finally {
      setLoading(false);
    }
  }, [activeServer?.uuid]);

  useEffect(() => {
    loadDatabases();
  }, [loadDatabases]);

  if (!activeServer) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const created = await apiJson<PersistedDb>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/databases`,
        { method: 'POST', body: JSON.stringify({ database: dbName.trim(), remote: remoteHost.trim() || '%' }) }
      );
      setDatabases(prev => [...prev, created]);
      setShowCreate(false);
      setDbName('');
    } catch (err: any) {
      setError(err?.message || 'Failed creating database.');
    }
  };

  const handleRotatePassword = async (id: number) => {
    try {
      const updated = await apiJson<PersistedDb>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/databases/${id}/rotate-password`,
        { method: 'POST' }
      );
      setDatabases(prev => prev.map(d => (d.id === id ? updated : d)));
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this database and revoke its credentials?')) return;
    try {
      await apiFetch(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/databases/${id}`, {
        method: 'DELETE',
      });
      setDatabases(prev => prev.filter(d => d.id !== id));
    } catch {}
  };

  const copyText = (key: string, val: string) => {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Server Databases</h3>
            <p className="text-xs text-slate-400">
              Using <span className="text-white font-semibold">{databases.length}</span> of {limit} allocated databases.
            </p>
          </div>
        </div>

        <GlassButton
          variant="primary"
          size="sm"
          disabled={limit > 0 && databases.length >= limit}
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4 mr-1.5" /> New Database
        </GlassButton>
      </GlassCard>

      {databases.length === 0 ? (
        <GlassCard className="p-10 text-center text-sm text-slate-400">
          {loading ? 'Loading databases...' : 'No databases provisioned for this server yet.'}
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {databases.map(db => (
            <GlassCard key={db.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-white font-mono">{db.name}</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    {db.host}:{db.port} (Allowed: {db.remote})
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRotatePassword(db.id)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                    title="Rotate Password"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(db.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                    title="Delete Database"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#111318] border border-white/5">
                  <span className="text-slate-400">Username: <strong className="text-slate-200">{db.username}</strong></span>
                  <button
                    type="button"
                    onClick={() => copyText(`u-${db.id}`, db.username)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    {copiedId === `u-${db.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#111318] border border-white/5">
                  <span className="text-slate-400 truncate pr-2">
                    Password:{' '}
                    <strong className="text-slate-200">
                      {visiblePasswords[db.id] ? db.password : '••••••••••••••••'}
                    </strong>
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setVisiblePasswords(p => ({ ...p, [db.id]: !p[db.id] }))}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      {visiblePasswords[db.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(`p-${db.id}`, db.password)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                    >
                      {copiedId === `p-${db.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <GlassModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Server Database" maxWidth="sm">
        <form onSubmit={handleCreate} className="flex flex-col gap-4 py-2">
          <GlassInput
            label="Database Name"
            placeholder="e.g. luckperms"
            value={dbName}
            onChange={e => setDbName(e.target.value)}
            required
          />
          <GlassInput
            label="Connections From (Host Mask)"
            placeholder="%"
            value={remoteHost}
            onChange={e => setRemoteHost(e.target.value)}
          />
          {error && <div className="text-xs text-rose-400">{error}</div>}
          <div className="flex justify-end gap-2">
            <GlassButton type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</GlassButton>
            <GlassButton type="submit" variant="primary">Create Database</GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
