import React, { useState, useEffect, useCallback } from 'react';
import { Split, Plus, Trash2 } from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { apiFetch, apiJson } from '../../lib/api';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';

interface SplitChild {
  id: number;
  child_server_uuid: string;
  name: string;
  memory: number;
  disk: number;
  cpu: number;
  port: number;
}

export const ServerSplitter: React.FC = () => {
  const { activeServer, refreshServers } = useServers();
  const [splits, setSplits] = useState<SplitChild[]>([]);
  const [available, setAvailable] = useState({ memory: 0, disk: 0, cpu: 0 });
  const [name, setName] = useState('');
  const [memory, setMemory] = useState(512);
  const [disk, setDisk] = useState(2048);
  const [error, setError] = useState<string | null>(null);

  const loadSplits = useCallback(async () => {
    if (!activeServer) return;
    try {
      const res = await apiJson<{ splits: SplitChild[]; available: { memory: number; disk: number; cpu: number } }>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/addons/splits`
      );
      setSplits(res?.splits || []);
      if (res?.available) setAvailable(res.available);
    } catch {}
  }, [activeServer?.uuid]);

  useEffect(() => {
    loadSplits();
  }, [loadSplits]);

  if (!activeServer) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/addons/splits`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), memory, disk, cpu: 100 }),
      });
      setName('');
      await loadSplits();
      await refreshServers();
    } catch (err: any) {
      setError(err?.message || 'Failed creating split instance.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this split child server cleanly?')) return;
    try {
      await apiFetch(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/addons/splits/${id}`, {
        method: 'DELETE',
      });
      await loadSplits();
      await refreshServers();
    } catch {}
  };

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
            <Split className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Dynamic Resource Splitter</h3>
            <p className="text-xs text-slate-400">
              Remaining parent quota: <strong className="text-white">{available.memory} MB RAM</strong> •{' '}
              <strong className="text-white">{available.disk} MB Disk</strong>
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <GlassInput label="Child Instance Name" value={name} onChange={e => setName(e.target.value)} placeholder="Lobby Subserver" required />
          <GlassInput label="RAM (MB)" type="number" min={256} value={memory} onChange={e => setMemory(Number(e.target.value))} />
          <GlassInput label="Disk (MB)" type="number" min={512} value={disk} onChange={e => setDisk(Number(e.target.value))} />
          <GlassButton type="submit" variant="primary">
            <Plus className="w-4 h-4 mr-1.5" /> Split Server
          </GlassButton>
        </form>
        {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
      </GlassCard>

      {splits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {splits.map(sp => (
            <GlassCard key={sp.id} className="p-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">{sp.name}</h4>
                <p className="text-xs font-mono text-slate-400">
                  Port {sp.port} • {sp.memory} MB RAM • {sp.disk} MB Disk
                </p>
              </div>
              <GlassButton variant="danger" size="sm" onClick={() => handleDelete(sp.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </GlassButton>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
