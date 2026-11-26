import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Trash2, Folder, Check } from 'lucide-react';
import { apiFetch, apiJson } from '../../lib/api';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';
import { GlassToggle } from '../ui/GlassToggle';

interface MountItem {
  id: number;
  uuid: string;
  name: string;
  description: string;
  source: string;
  target: string;
  read_only: boolean;
  user_mountable: boolean;
}

export const MountsManager: React.FC = () => {
  const [mounts, setMounts] = useState<MountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [readOnly, setReadOnly] = useState(true);
  const [userMountable, setUserMountable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiJson<{ data: MountItem[] }>('/api/application/mounts');
      setMounts(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setMounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMounts();
  }, [loadMounts]);

  const handleCreate = async () => {
    setError(null);
    if (!name.trim() || !source.trim() || !target.trim()) {
      setError('Mount name, host source path, and container target path are required.');
      return;
    }
    try {
      const created = await apiJson<MountItem>('/api/application/mounts', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || 'Shared host mount',
          source: source.trim(),
          target: target.trim(),
          read_only: readOnly,
          user_mountable: userMountable,
        }),
      });
      setMounts(prev => [...prev, created]);
      setName('');
      setDescription('');
      setSource('');
      setTarget('');
      setShowModal(false);
    } catch (err: any) {
      setError(err?.message || 'Failed creating mount.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/application/mounts/${id}`, { method: 'DELETE' });
      setMounts(prev => prev.filter(m => m.id !== id));
    } catch {}
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-red-400" /> Host Directory Mounts
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure host directories exposed selectively into isolated server containers.
          </p>
        </div>

        <GlassButton
          variant="primary"
          size="sm"
          onClick={() => setShowModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Mount
        </GlassButton>
      </div>

      {mounts.length === 0 ? (
        <GlassCard className="p-10 text-center text-sm text-slate-400">
          {loading ? 'Loading configured mounts...' : 'No shared directory mounts configured yet.'}
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mounts.map(m => (
            <GlassCard key={m.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-400" />
                    {m.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{m.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-xs font-mono bg-[#111318] border border-white/10 rounded-xl p-3 flex flex-col gap-1">
                <div><span className="text-slate-500">Host Source:</span> <span className="text-slate-200">{m.source}</span></div>
                <div><span className="text-slate-500">Container Target:</span> <span className="text-emerald-300">{m.target}</span></div>
                <div className="flex items-center gap-3 pt-1 text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> {m.read_only ? 'Read-Only' : 'Read/Write'}</span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <GlassModal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Host Mount" maxWidth="md">
        <div className="flex flex-col gap-4 py-2">
          <GlassInput label="Mount Name" placeholder="Shared Worlds" value={name} onChange={e => setName(e.target.value)} />
          <GlassInput label="Description" placeholder="Optional description" value={description} onChange={e => setDescription(e.target.value)} />
          <GlassInput label="Host Source Path" placeholder="/var/lib/slayerwings/mounts/shared" value={source} onChange={e => setSource(e.target.value)} />
          <GlassInput label="Container Target Path" placeholder="/home/container/shared" value={target} onChange={e => setTarget(e.target.value)} />
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Read-Only Mount</span>
            <GlassToggle checked={readOnly} onChange={setReadOnly} />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>User Mountable</span>
            <GlassToggle checked={userMountable} onChange={setUserMountable} />
          </div>
          {error && <div className="text-xs text-rose-400">{error}</div>}
          <div className="flex justify-end gap-2">
            <GlassButton variant="secondary" onClick={() => setShowModal(false)}>Cancel</GlassButton>
            <GlassButton variant="primary" onClick={handleCreate}>Save Mount</GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
