import React, { useState, useEffect, useCallback } from 'react';
import { Network, Plus, Star, Trash2, Check, Save } from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { apiFetch, apiJson } from '../../lib/api';
import { Allocation } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';

export const NetworkTab: React.FC = () => {
  const { activeServer, refreshServers } = useServers();
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [limit, setLimit] = useState(2);
  const [loading, setLoading] = useState(true);
  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});
  const [savedId, setSavedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAllocations = useCallback(async () => {
    if (!activeServer) return;
    setLoading(true);
    try {
      const res = await apiJson<{ data: Allocation[]; limit: number }>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/network/allocations`
      );
      const list = Array.isArray(res?.data) ? res.data : [];
      setAllocations(list);
      const notes: Record<number, string> = {};
      for (const a of list) notes[a.id] = a.notes || '';
      setNotesDraft(notes);
      if (res?.limit !== undefined) setLimit(res.limit);
    } catch {
      setAllocations([]);
    } finally {
      setLoading(false);
    }
  }, [activeServer?.uuid]);

  useEffect(() => {
    loadAllocations();
  }, [loadAllocations]);

  if (!activeServer) return null;

  const handleAssignNew = async () => {
    setError(null);
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/network/allocations`, {
        method: 'POST',
      });
      await loadAllocations();
      await refreshServers();
    } catch (err: any) {
      setError(err?.message || 'Unable to assign new port allocation.');
    }
  };

  const handleMakePrimary = async (id: number) => {
    setError(null);
    try {
      await apiJson(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/network/allocations/${id}/primary`,
        { method: 'POST' }
      );
      await loadAllocations();
      await refreshServers();
    } catch (err: any) {
      setError(err?.message || 'Failed updating primary allocation.');
    }
  };

  const handleSaveNotes = async (id: number) => {
    try {
      await apiJson(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/network/allocations/${id}`,
        { method: 'POST', body: JSON.stringify({ notes: notesDraft[id] || '' }) }
      );
      setSavedId(id);
      setTimeout(() => setSavedId(null), 1500);
    } catch {}
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Release this extra port allocation back to the node pool?')) return;
    setError(null);
    try {
      await apiFetch(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/network/allocations/${id}`,
        { method: 'DELETE' }
      );
      await loadAllocations();
      await refreshServers();
    } catch (err: any) {
      setError(err?.message || 'Cannot release allocation.');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Network Allocations</h3>
            <p className="text-xs text-slate-400">
              Using {allocations.length} of {limit} allocated IP:Port bindings.
            </p>
          </div>
        </div>
        <GlassButton
          variant="primary"
          size="sm"
          disabled={limit > 0 && allocations.length >= limit}
          onClick={handleAssignNew}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Assign Allocation
        </GlassButton>
      </GlassCard>

      {error && (
        <div className="px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
          {error}
        </div>
      )}

      {allocations.length === 0 ? (
        <GlassCard className="p-10 text-center text-sm text-slate-400">
          {loading ? 'Loading network allocations...' : 'No allocations bound to this server.'}
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-3">
          {allocations.map(alloc => (
            <GlassCard key={alloc.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border ${
                    alloc.is_default
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-slate-200'
                  }`}
                >
                  {alloc.ip}:{alloc.port}
                </div>
                {alloc.is_default && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-bold uppercase tracking-wider">
                    Primary
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Optional port note (e.g. Voice Chat, Query)..."
                  value={notesDraft[alloc.id] ?? ''}
                  onChange={e => setNotesDraft(prev => ({ ...prev, [alloc.id]: e.target.value }))}
                  className="glass-input flex-1 px-3 py-1.5 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => handleSaveNotes(alloc.id)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                  title="Save Note"
                >
                  {savedId === alloc.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!alloc.is_default && (
                  <>
                    <GlassButton variant="secondary" size="sm" onClick={() => handleMakePrimary(alloc.id)}>
                      <Star className="w-3.5 h-3.5 mr-1 text-amber-400" /> Make Primary
                    </GlassButton>
                    <GlassButton variant="danger" size="sm" onClick={() => handleDelete(alloc.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </GlassButton>
                  </>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
