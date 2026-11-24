import React, { useState } from 'react';
import { Archive, Plus, Lock, Unlock, Download, RotateCcw, Trash2, CheckCircle2 } from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';
import { ServerBackup } from '../../types';

export const BackupsTab: React.FC = () => {
  const { activeServer } = useServer();
  const [backups, setBackups] = useState<ServerBackup[]>([
    {
      uuid: 'b1a2-c3d4-e5f6-7890',
      name: 'Pre-1.21.4 Folia Migration Snapshot',
      ignored_files: ['.git', 'logs/*'],
      sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      bytes: 2841590000, // ~2.64 GB
      created_at: '2026-11-20 18:30',
      completed_at: '2026-11-20 18:34',
      is_successful: true,
      is_locked: true,
    },
    {
      uuid: '9870-f6e5-d4c3-b2a1',
      name: 'Nightly Automated World & DB Backup',
      ignored_files: ['cache/*', 'dynmap/*'],
      sha256_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      bytes: 1941200000, // ~1.8 GB
      created_at: '2026-11-23 04:00',
      completed_at: '2026-11-23 04:03',
      is_successful: true,
      is_locked: false,
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [isLockedOnCreate, setIsLockedOnCreate] = useState(false);

  const toggleLock = (uuid: string) => {
    setBackups(prev =>
      prev.map(b => (b.uuid === uuid ? { ...b, is_locked: !b.is_locked } : b))
    );
  };

  const deleteBackup = (uuid: string) => {
    setBackups(prev => prev.filter(b => b.uuid !== uuid));
  };

  const handleCreate = () => {
    if (!backupName.trim()) return;
    const newB: ServerBackup = {
      uuid: crypto.randomUUID(),
      name: backupName.trim(),
      ignored_files: [],
      sha256_hash: 'mockhash' + Date.now(),
      bytes: 1850000000,
      created_at: 'Just now',
      completed_at: 'Just now',
      is_successful: true,
      is_locked: isLockedOnCreate,
    };
    setBackups(prev => [newB, ...prev]);
    setBackupName('');
    setShowCreateModal(false);
  };

  const maxBackups = activeServer?.feature_limits?.backups ?? 5;
  const totalBytes = backups.reduce((acc, b) => acc + b.bytes, 0);
  const totalGb = (totalBytes / 1024 / 1024 / 1024).toFixed(2);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Archive className="w-5 h-5 text-sky-400" /> Container Snapshots & Backups
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Compressed tar.gz container archives stored securely on dedicated S3/Wings backup storage.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          disabled={backups.length >= maxBackups}
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Backup ({backups.length}/{maxBackups})
        </GlassButton>
      </div>

      {/* Quota bar */}
      <GlassCard className="p-4 flex items-center justify-between text-xs">
        <span className="text-slate-300">
          Used Storage: <strong className="text-white font-mono">{totalGb} GB</strong>
        </span>
        <span className="text-slate-400">
          Quota: {backups.length} of {maxBackups} slots filled
        </span>
      </GlassCard>

      <div className="flex flex-col gap-3">
        {backups.map(b => {
          const gbSize = (b.bytes / 1024 / 1024 / 1024).toFixed(2);
          return (
            <GlassCard key={b.uuid} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-400/20">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{b.name}</h3>
                    {b.is_locked && (
                      <span className="p-1 rounded-full bg-amber-500/20 text-amber-300" title="Locked from auto-deletion">
                        <Lock className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {gbSize} GB • Created {b.created_at}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleLock(b.uuid)}
                  title={b.is_locked ? 'Unlock' : 'Lock'}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                >
                  {b.is_locked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4" />}
                </button>

                <GlassButton size="sm" variant="glass" leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
                  Restore
                </GlassButton>

                <button
                  onClick={() => deleteBackup(b.uuid)}
                  disabled={b.is_locked}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <GlassModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Server Backup"
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4 py-2">
          <GlassInput
            label="Backup Name"
            placeholder="e.g. Pre-Update Snapshot"
            value={backupName}
            onChange={e => setBackupName(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isLockedOnCreate}
              onChange={e => setIsLockedOnCreate(e.target.checked)}
              className="rounded border-white/20 bg-slate-900 text-sky-500"
            />
            Lock backup (prevents deletion when limit is reached)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="accent" size="sm" onClick={handleCreate}>
              Start Backup
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
