import React, { useState, useEffect, useCallback } from 'react';
import { Archive, Plus, Download, RotateCcw, Trash2, Lock } from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { apiFetch, apiJson } from '../../lib/api';
import { ServerBackup } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { GlassModal } from '../ui/GlassModal';

function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const BackupsTab: React.FC = () => {
  const { activeServer } = useServers();
  const [backups, setBackups] = useState<ServerBackup[]>([]);
  const [limit, setLimit] = useState(3);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBackups = useCallback(async () => {
    if (!activeServer) return;
    setLoading(true);
    try {
      const res = await apiJson<{ data: ServerBackup[]; limit: number }>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/backups`
      );
      setBackups(Array.isArray(res?.data) ? res.data : []);
      if (res?.limit !== undefined) setLimit(res.limit);
    } catch {
      setBackups([]);
    } finally {
      setLoading(false);
    }
  }, [activeServer?.uuid]);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  if (!activeServer) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const created = await apiJson<ServerBackup>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/backups`,
        { method: 'POST', body: JSON.stringify({ name: name.trim() || undefined, is_locked: isLocked }) }
      );
      setBackups(prev => [created, ...prev]);
      setShowCreate(false);
      setName('');
      setIsLocked(false);
    } catch (err: any) {
      setError(err?.message || 'Backup creation failed.');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (b: ServerBackup) => {
    try {
      const res = await apiFetch(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/backups/${encodeURIComponent(b.uuid)}/download`
      );
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${b.name.replace(/[^a-z0-9._-]/gi, '_')}.tar.gz`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'Download failed.');
    }
  };

  const handleRestore = async (b: ServerBackup) => {
    if (!window.confirm(`Restore backup "${b.name}" into ${activeServer.name}'s volume?`)) return;
    try {
      await apiJson(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/backups/${encodeURIComponent(b.uuid)}/restore`,
        { method: 'POST' }
      );
      window.alert(`Backup "${b.name}" restored cleanly.`);
    } catch (err: any) {
      setError(err?.message || 'Restore failed.');
    }
  };

  const handleDelete = async (b: ServerBackup) => {
    if (!window.confirm(`Permanently delete backup "${b.name}"?`)) return;
    try {
      await apiFetch(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/backups/${encodeURIComponent(b.uuid)}`,
        { method: 'DELETE' }
      );
      setBackups(prev => prev.filter(x => x.uuid !== b.uuid));
    } catch (err: any) {
      setError(err?.message || 'Delete failed.');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Real Volume Backups</h3>
            <p className="text-xs text-slate-400">
              {backups.length} of {limit} tar.gz snapshots stored on node daemon.
            </p>
          </div>
        </div>
        <GlassButton
          variant="primary"
          size="sm"
          disabled={limit > 0 && backups.length >= limit}
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Create Backup
        </GlassButton>
      </GlassCard>

      {error && (
        <div className="px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
          {error}
        </div>
      )}

      {backups.length === 0 ? (
        <GlassCard className="p-10 text-center text-sm text-slate-400">
          {loading ? 'Loading backups...' : 'No backups created for this server yet.'}
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-3">
          {backups.map(b => (
            <GlassCard key={b.uuid} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white truncate">{b.name}</h4>
                  {b.is_locked && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                  <span>Size: <strong className="text-slate-200">{formatBytes(b.bytes)}</strong></span>
                  {b.sha256_hash && <span>SHA256: {b.sha256_hash.slice(0, 14)}...</span>}
                  <span>Created: {new Date(b.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <GlassButton variant="secondary" size="sm" onClick={() => handleDownload(b)}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </GlassButton>
                <GlassButton variant="secondary" size="sm" onClick={() => handleRestore(b)}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                </GlassButton>
                {!b.is_locked && (
                  <GlassButton variant="danger" size="sm" onClick={() => handleDelete(b)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </GlassButton>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <GlassModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Volume Backup" maxWidth="sm">
        <form onSubmit={handleCreate} className="flex flex-col gap-4 py-2">
          <GlassInput
            label="Backup Label"
            placeholder="Pre-upgrade snapshot"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input type="checkbox" checked={isLocked} onChange={e => setIsLocked(e.target.checked)} className="accent-red-600" />
            <span>Lock backup against accidental deletion</span>
          </label>
          <div className="flex justify-end gap-2">
            <GlassButton type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</GlassButton>
            <GlassButton type="submit" variant="primary" disabled={creating}>
              {creating ? 'Archiving...' : 'Start Backup'}
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
