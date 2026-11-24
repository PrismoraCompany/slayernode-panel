import React, { useState } from 'react';
import { Split, Plus, Trash2, Cpu, Activity, HardDrive, Check, AlertCircle } from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { GlassBadge } from '../ui/GlassBadge';
import { SubServerSplit } from '../../types';

export const ServerSplitter: React.FC = () => {
  const { activeServer } = useServer();

  const totalRam = activeServer?.limits.memory || 8192;
  const totalCpu = activeServer?.limits.cpu || 400;
  const totalDisk = activeServer?.limits.disk || 40960;

  const [splits, setSplits] = useState<SubServerSplit[]>([
    { id: '1', name: 'Sub-Server #1 (Survival)', memory_allocated: 4096, cpu_allocated: 200, disk_allocated: 20480, port: 25565, status: 'running' },
    { id: '2', name: 'Sub-Server #2 (Minigames / Lobby)', memory_allocated: 2048, cpu_allocated: 100, disk_allocated: 10240, port: 25566, status: 'running' },
  ]);

  const [newSubName, setNewSubName] = useState('');
  const [newSubRam, setNewSubRam] = useState(1024);
  const [newSubCpu, setNewSubCpu] = useState(50);
  const [newSubDisk, setNewSubDisk] = useState(5120);

  const usedRam = splits.reduce((acc, s) => acc + s.memory_allocated, 0);
  const usedCpu = splits.reduce((acc, s) => acc + s.cpu_allocated, 0);
  const usedDisk = splits.reduce((acc, s) => acc + s.disk_allocated, 0);

  const remainingRam = totalRam - usedRam;
  const remainingCpu = totalCpu - usedCpu;
  const remainingDisk = totalDisk - usedDisk;

  const handleCreateSplit = () => {
    if (!newSubName.trim()) return;
    if (newSubRam > remainingRam || newSubCpu > remainingCpu || newSubDisk > remainingDisk) return;

    const newSplit: SubServerSplit = {
      id: String(Date.now()),
      name: newSubName.trim(),
      memory_allocated: newSubRam,
      cpu_allocated: newSubCpu,
      disk_allocated: newSubDisk,
      port: 25565 + splits.length + 1,
      status: 'offline',
    };

    setSplits(prev => [...prev, newSplit]);
    setNewSubName('');
    setNewSubRam(Math.min(1024, remainingRam - newSubRam));
  };

  const handleDeleteSplit = (id: string) => {
    setSplits(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Split className="w-5 h-5 text-sky-400" /> Server Resource Splitter
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Partition your server's master hardware allocation into isolated sub-containers without paying for separate plans.
        </p>
      </div>

      {/* Resource Allocation Overview Bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Memory */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" /> RAM Allocated
            </span>
            <span className="font-bold text-white tabular-metrics">
              {usedRam} MB / {totalRam} MB
            </span>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div
              style={{ width: `${Math.min(100, (usedRam / totalRam) * 100)}%` }}
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-2 font-mono">
            {remainingRam} MB remaining free
          </span>
        </GlassCard>

        {/* CPU */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-sky-400" /> CPU Allocated
            </span>
            <span className="font-bold text-white tabular-metrics">
              {usedCpu}% / {totalCpu}%
            </span>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div
              style={{ width: `${Math.min(100, (usedCpu / totalCpu) * 100)}%` }}
              className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full"
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-2 font-mono">
            {remainingCpu}% remaining free
          </span>
        </GlassCard>

        {/* Disk */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-amber-400" /> Disk Allocated
            </span>
            <span className="font-bold text-white tabular-metrics">
              {(usedDisk / 1024).toFixed(1)} GB / {(totalDisk / 1024).toFixed(1)} GB
            </span>
          </div>
          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div
              style={{ width: `${Math.min(100, (usedDisk / totalDisk) * 100)}%` }}
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-2 font-mono">
            {(remainingDisk / 1024).toFixed(1)} GB remaining free
          </span>
        </GlassCard>
      </div>

      {/* Active Sub-Servers */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-white">Active Partitioned Instances ({splits.length})</h3>
        {splits.map(split => (
          <GlassCard key={split.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-400/20">
                <Split className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{split.name}</h4>
                  <GlassBadge status={split.status}>{split.status.toUpperCase()}</GlassBadge>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-0.5">
                  <span>Port {split.port}</span>
                  <span>•</span>
                  <span>{split.memory_allocated} MB RAM</span>
                  <span>•</span>
                  <span>{split.cpu_allocated}% CPU</span>
                  <span>•</span>
                  <span>{(split.disk_allocated / 1024).toFixed(1)} GB Disk</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <GlassButton size="sm" variant="glass">
                Manage Container
              </GlassButton>
              <button
                onClick={() => handleDeleteSplit(split.id)}
                className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Partition Creator Box */}
      {remainingRam > 512 && (
        <GlassCard className="p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4" /> Split New Sub-Server
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <GlassInput
              label="Instance Label"
              placeholder="e.g. Bedwars-01"
              value={newSubName}
              onChange={e => setNewSubName(e.target.value)}
            />

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                RAM: {newSubRam} MB
              </label>
              <input
                type="range"
                min={512}
                max={remainingRam}
                step={256}
                value={newSubRam}
                onChange={e => setNewSubRam(parseInt(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                CPU: {newSubCpu}%
              </label>
              <input
                type="range"
                min={25}
                max={remainingCpu}
                step={25}
                value={newSubCpu}
                onChange={e => setNewSubCpu(parseInt(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            <div className="flex items-end">
              <GlassButton
                variant="accent"
                className="w-full"
                onClick={handleCreateSplit}
                disabled={!newSubName.trim()}
              >
                Deploy Partition
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
