import React, { useState } from 'react';
import { Layers, Plus, Trash2, Folder, Check } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';
import { GlassToggle } from '../ui/GlassToggle';

interface MountItem {
  id: number;
  name: string;
  description: string;
  source: string;
  target: string;
  read_only: boolean;
  user_mountable: boolean;
}

export const MountsManager: React.FC = () => {
  const [mounts, setMounts] = useState<MountItem[]>([
    {
      id: 1,
      name: 'Shared Fast Maps NVMe Storage',
      description: 'Pre-rendered high-res world maps shared across SMP survival and lobby instances',
      source: '/mnt/fast-storage/minecraft/shared-maps',
      target: '/home/container/shared_maps',
      read_only: true,
      user_mountable: false,
    },
    {
      id: 2,
      name: 'Global BungeeCord Assets & Geyser Translation',
      description: 'Shared Bedrock language and protocol translation tables',
      source: '/var/lib/slayerwings/mounts/geyser-packs',
      target: '/home/container/packs',
      read_only: true,
      user_mountable: true,
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [readOnly, setReadOnly] = useState(true);

  const handleCreate = () => {
    if (!name.trim() || !source.trim() || !target.trim()) return;
    const newM: MountItem = {
      id: Date.now(),
      name: name.trim(),
      description: 'Custom host volume mount',
      source: source.trim(),
      target: target.trim(),
      read_only: readOnly,
      user_mountable: false,
    };
    setMounts(prev => [...prev, newM]);
    setName('');
    setSource('');
    setTarget('');
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    setMounts(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-400" /> Host Directory Mounts
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mount physical host directories into Docker containers across multiple servers and Eggs.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          onClick={() => setShowModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Mount
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mounts.map(mount => (
          <GlassCard key={mount.id} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-400/20">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{mount.name}</h3>
                    <p className="text-xs text-slate-400">{mount.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(mount.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 font-mono text-xs p-3 rounded-xl bg-slate-950/40 border border-white/5 my-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Host Source:</span>
                  <span className="text-sky-300 truncate max-w-[200px]">{mount.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Container Target:</span>
                  <span className="text-emerald-300 truncate max-w-[200px]">{mount.target}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Access Mode:</span>
                  <span className={mount.read_only ? 'text-amber-400' : 'text-emerald-400'}>
                    {mount.read_only ? 'Read-Only (Protected)' : 'Read-Write'}
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Container Mount"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4 py-2">
          <GlassInput
            label="Mount Name"
            placeholder="e.g. Shared Asset Cache"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <GlassInput
            label="Host Source Path"
            placeholder="/var/lib/slayerwings/mounts/shared"
            value={source}
            onChange={e => setSource(e.target.value)}
          />
          <GlassInput
            label="Container Target Path"
            placeholder="/home/container/shared"
            value={target}
            onChange={e => setTarget(e.target.value)}
          />
          <GlassToggle
            label="Read-Only Mount"
            description="Prevent containers from modifying host files"
            checked={readOnly}
            onChange={setReadOnly}
          />
          <div className="flex justify-end gap-2 pt-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setShowModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="accent" size="sm" onClick={handleCreate}>
              Create Mount
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
