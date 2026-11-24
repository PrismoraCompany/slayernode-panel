import React, { useState } from 'react';
import { Database, Plus, Key, Trash2, Copy, Check, ExternalLink } from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { GlassModal } from '../ui/GlassModal';
import { ServerDatabase } from '../../types';

export const DatabasesTab: React.FC = () => {
  const { activeServer } = useServer();
  const [databases, setDatabases] = useState<ServerDatabase[]>([
    {
      id: 'db_1',
      name: 's1_luckperms',
      username: 'u1_r3a8z9',
      host: { address: '127.0.0.1', port: 3306 },
      database_host_id: 1,
      max_connections: 50,
      connections_count: 8,
      created_at: '2026-11-10 14:00',
    },
    {
      id: 'db_2',
      name: 's1_coreprotect',
      username: 'u1_c8d7k2',
      host: { address: '127.0.0.1', port: 3306 },
      database_host_id: 1,
      max_connections: 50,
      connections_count: 14,
      created_at: '2026-11-12 11:20',
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDbName, setNewDbName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newDbName.trim()) return;
    const db: ServerDatabase = {
      id: `db_${Date.now()}`,
      name: `s1_${newDbName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
      username: `u1_${Math.random().toString(36).substring(2, 8)}`,
      host: { address: '127.0.0.1', port: 3306 },
      database_host_id: 1,
      max_connections: 50,
      created_at: 'Just now',
    };
    setDatabases(prev => [...prev, db]);
    setNewDbName('');
    setShowCreateModal(false);
  };

  const handleDelete = (id: string) => {
    setDatabases(prev => prev.filter(d => d.id !== id));
  };

  const copyCreds = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const maxAllowed = activeServer?.feature_limits.databases || 3;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-400" /> Managed Databases
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dedicated MariaDB/MySQL instances provisioned for plugins and cluster state.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          disabled={databases.length >= maxAllowed}
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Database ({databases.length}/{maxAllowed})
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {databases.map(db => (
          <GlassCard key={db.id} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-400/20">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">{db.name}</h3>
                    <p className="text-[11px] text-slate-400">Created {db.created_at}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(db.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 text-xs font-mono p-3 rounded-xl bg-slate-950/50 border border-white/5 my-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Host:</span>
                  <span className="text-slate-200">{db.host.address}:{db.host.port}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">User:</span>
                  <span className="text-slate-200">{db.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Connections:</span>
                  <span className="text-emerald-400">{db.connections_count || 0} / {db.max_connections} active</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <button
                onClick={() => copyCreds(`jdbc:mysql://${db.host.address}:${db.host.port}/${db.name}`, db.id)}
                className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiedId === db.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy JDBC String
              </button>
              <GlassButton size="sm" variant="ghost" leftIcon={<Key className="w-3 h-3 text-amber-400" />}>
                Rotate Password
              </GlassButton>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Server Database"
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4 py-2">
          <GlassInput
            label="Database Name Suffix"
            placeholder="e.g. discordsrv"
            value={newDbName}
            onChange={e => setNewDbName(e.target.value)}
            helperText="The name will automatically be prefixed with your server identifier."
          />
          <div className="flex justify-end gap-2 pt-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="accent" size="sm" onClick={handleCreate}>
              Provision Database
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
