import React, { useState, useEffect } from 'react';
import {
  Server as ServerIcon,
  HardDrive,
  Cpu,
  Layers,
  Database,
  Terminal,
  Trash2,
  ExternalLink,
  Save,
  AlertTriangle,
  Check,
  ArrowLeft,
  RefreshCw,
  Power,
  ShieldAlert,
  Info,
  Radio,
  User,
} from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { GlassButton } from '../../ui/GlassButton';
import { GlassInput } from '../../ui/GlassInput';
import { GlassBadge } from '../../ui/GlassBadge';
import { Server as ServerType } from '../../../types';

interface AdminServerDetailViewProps {
  serverId: string;
  onBack: () => void;
  onOpenConsole: (serverId: string) => void;
  onServerDeleted?: () => void;
}

export const AdminServerDetailView: React.FC<AdminServerDetailViewProps> = ({
  serverId,
  onBack,
  onOpenConsole,
  onServerDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<
    'about' | 'details' | 'build' | 'startup' | 'database' | 'mounts' | 'manage' | 'delete'
  >('about');

  const [server, setServer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states for Details
  const [name, setName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [ownerId, setOwnerId] = useState('1');
  const [description, setDescription] = useState('');

  // Form states for Build Configuration
  const [cpuLimit, setCpuLimit] = useState('200');
  const [cpuPinning, setCpuPinning] = useState('');
  const [memoryMb, setMemoryMb] = useState('4096');
  const [swapMb, setSwapMb] = useState('512');
  const [diskMb, setDiskMb] = useState('20480');
  const [ioWeight, setIoWeight] = useState('500');
  const [oomKiller, setOomKiller] = useState(false);
  const [databaseLimit, setDatabaseLimit] = useState('0');
  const [allocationLimit, setAllocationLimit] = useState('1');
  const [backupLimit, setBackupLimit] = useState('999');

  // Form states for Startup
  const [startupCmd, setStartupCmd] = useState('');
  const [defaultStartupCmd, setDefaultStartupCmd] = useState('');
  const [selectedNestId, setSelectedNestId] = useState('1');
  const [selectedEggId, setSelectedEggId] = useState('1');
  const [gitAddress, setGitAddress] = useState('');

  // Database form state
  const [newDbName, setNewDbName] = useState('');
  const [newDbConnections, setNewDbConnections] = useState('%');
  const [newDbMaxConnections, setNewDbMaxConnections] = useState('0');

  // Metadata
  const [users, setUsers] = useState<any[]>([]);
  const [nests, setNests] = useState<any[]>([]);
  const [eggs, setEggs] = useState<any[]>([]);

  const fetchServerDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/application/servers/${serverId}`);
      if (res.ok) {
        const data = await res.json();
        const s = data.attributes || data;
        setServer(s);

        setName(s.name || '');
        setExternalId(s.external_id || '');
        setOwnerId(String(s.owner_id || '1'));
        setDescription(s.description || '');

        setCpuLimit(String(s.limits?.cpu || '100'));
        setCpuPinning(s.cpu_pinning || '');
        setMemoryMb(String(s.limits?.memory || '2048'));
        setSwapMb(String(s.limits?.swap || '512'));
        setDiskMb(String(s.limits?.disk || '10240'));
        setIoWeight(String(s.limits?.io || '500'));
        setOomKiller(!!s.oom_killer);

        setDatabaseLimit(String(s.feature_limits?.databases ?? '0'));
        setAllocationLimit(String(s.feature_limits?.allocations ?? '1'));
        setBackupLimit(String(s.feature_limits?.backups ?? '999'));

        setStartupCmd(s.startup_command || 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar --nogui');
        setDefaultStartupCmd('java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar --nogui');
        setSelectedNestId(String(s.nest_id || '1'));
        setSelectedEggId(String(s.egg_id || '1'));
        setGitAddress(s.git_address || '');
      }
    } catch (e: any) {
      setError('Failed loading server configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServerDetails();

    Promise.all([
      fetch('/api/application/users'),
      fetch('/api/application/nests'),
    ])
      .then(async ([uRes, nRes]) => {
        if (uRes.ok) {
          const ud = await uRes.json();
          setUsers((ud.data || []).map((x: any) => x.attributes || x));
        }
        if (nRes.ok) {
          const nd = await nRes.json();
          setNests((nd.data || []).map((x: any) => x.attributes || x));
        }
      })
      .catch(() => {});
  }, [serverId]);

  useEffect(() => {
    if (selectedNestId) {
      fetch(`/api/application/nests/${selectedNestId}/eggs`)
        .then(res => res.json())
        .then(d => {
          setEggs((d.data || []).map((x: any) => x.attributes || x));
        })
        .catch(() => {});
    }
  }, [selectedNestId]);

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/application/servers/${serverId}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          external_id: externalId.trim(),
          owner_id: parseInt(ownerId, 10),
          description: description.trim(),
        }),
      });
      if (res.ok) {
        showNotification('Server base information successfully saved.');
        fetchServerDetails();
      } else {
        const d = await res.json();
        setError(d.error || 'Failed saving server details.');
      }
    } catch {
      setError('Network error saving details.');
    }
  };

  const handleSaveBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/application/servers/${serverId}/build`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpu: parseInt(cpuLimit, 10),
          cpu_pinning: cpuPinning.trim() || null,
          memory: parseInt(memoryMb, 10),
          swap: parseInt(swapMb, 10),
          disk: parseInt(diskMb, 10),
          io: parseInt(ioWeight, 10),
          oom_killer: oomKiller,
          database_limit: parseInt(databaseLimit, 10),
          allocation_limit: parseInt(allocationLimit, 10),
          backup_limit: parseInt(backupLimit, 10),
        }),
      });
      if (res.ok) {
        showNotification('Build configuration limits updated.');
        fetchServerDetails();
      } else {
        const d = await res.json();
        setError(d.error || 'Failed updating build configuration.');
      }
    } catch {
      setError('Network error updating build configuration.');
    }
  };

  const handleSaveStartup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/application/servers/${serverId}/startup`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startup_command: startupCmd.trim(),
          egg_id: parseInt(selectedEggId, 10),
          nest_id: parseInt(selectedNestId, 10),
          git_address: gitAddress.trim(),
        }),
      });
      if (res.ok) {
        showNotification('Startup command and egg parameters modified.');
        fetchServerDetails();
      } else {
        const d = await res.json();
        setError(d.error || 'Failed modifying startup command.');
      }
    } catch {
      setError('Network error modifying startup command.');
    }
  };

  const handleCreateDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDbName.trim()) return;
    try {
      const res = await fetch(`/api/application/servers/${serverId}/databases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: newDbName.trim(),
          connections: newDbConnections.trim() || '%',
          max_connections: parseInt(newDbMaxConnections, 10) || 0,
        }),
      });
      if (res.ok) {
        setNewDbName('');
        showNotification('New database attached to server.');
        fetchServerDetails();
      }
    } catch {}
  };

  const handleDeleteDatabase = async (dbId: number) => {
    try {
      await fetch(`/api/application/servers/${serverId}/databases/${dbId}`, { method: 'DELETE' });
      showNotification('Database detached.');
      fetchServerDetails();
    } catch {}
  };

  const handleServerAction = async (action: string) => {
    try {
      const res = await fetch(`/api/application/servers/${serverId}/manage/${action}`, {
        method: 'POST',
      });
      if (res.ok) {
        showNotification(`Action "${action}" completed.`);
        fetchServerDetails();
      }
    } catch {}
  };

  const handleDeleteServer = async (force: boolean = false) => {
    if (!confirm(`Are you sure you want to permanently delete "${server?.name}"? All files and allocations will be deleted.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/application/servers/${serverId}?force=${force}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (onServerDeleted) onServerDeleted();
        onBack();
      }
    } catch {}
  };

  if (isLoading || !server) {
    return (
      <div className="p-8 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-500" />
        <p className="font-semibold text-white">Loading Server Management View...</p>
      </div>
    );
  }

  const subtabs = [
    { id: 'about', label: 'About' },
    { id: 'details', label: 'Details' },
    { id: 'build', label: 'Build Configuration' },
    { id: 'startup', label: 'Startup' },
    { id: 'database', label: 'Database' },
    { id: 'mounts', label: 'Mounts' },
    { id: 'manage', label: 'Manage' },
    { id: 'delete', label: 'Delete', danger: true },
  ];

  if (isLoading || !server) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
        <p className="text-sm font-medium">Loading server configuration...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-red-500 font-mono">[{server.name}]</span> Management Suite
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 ml-6">
            Configure container virtualization limits, startup flags, and allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] font-mono text-slate-400 bg-black/40 px-3 py-1.5 rounded border border-white/10">
            Admin &gt; Servers &gt; <span className="text-red-400 font-semibold">{server.name}</span> &gt;{' '}
            <span className="capitalize text-white">{activeTab}</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notice && (
        <div className="p-3.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded bg-red-950/60 border border-red-600/40 text-red-500 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Subtabs Bar matching screenshots */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#16171d] rounded-t overflow-x-auto">
        <div className="flex items-center">
          {subtabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? tab.danger
                    ? 'border-red-600 text-red-500 bg-red-950/30'
                    : 'border-red-500 text-white bg-white/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => onOpenConsole(server.id)}
          title="Open Client Console"
          className="p-2.5 mr-2 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: ABOUT */}
      {activeTab === 'about' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-red-500" /> Instance Virtualization Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Internal Identifier</span>
                  <span className="font-mono font-bold text-white mt-0.5 block">{server.id}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">External Identifier</span>
                  <span className="font-mono text-slate-300 mt-0.5 block">{server.external_id || 'Not Set'}</span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">UUID / Container ID</span>
                  <span className="font-mono text-red-400 mt-0.5 block break-all">{server.uuid}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Current Egg</span>
                  <span className="font-semibold text-white mt-0.5 block">
                    {server.nest_name} :: {server.egg_name}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Server Name</span>
                  <span className="font-semibold text-white mt-0.5 block">{server.name}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">CPU Limit</span>
                  <span className="font-mono text-white mt-0.5 block">
                    {server.limits?.cpu ? `${server.limits.cpu}%` : 'Unlimited'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">CPU Pinning</span>
                  <span className="font-mono text-slate-300 mt-0.5 block">{server.cpu_pinning || 'Not Set'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Memory Allocation</span>
                  <span className="font-mono text-white mt-0.5 block">{server.limits?.memory || 2048} MiB</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Disk Space Limit</span>
                  <span className="font-mono text-white mt-0.5 block">{server.limits?.disk || 10240} MiB</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Block IO Weight</span>
                  <span className="font-mono text-white mt-0.5 block">{server.limits?.io || 500}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Default Connection</span>
                  <span className="font-mono text-red-400 mt-0.5 block">
                    {server.allocation?.ip}:{server.allocation?.port}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Connection Alias</span>
                  <span className="font-mono text-slate-300 mt-0.5 block">
                    {server.allocation?.alias || `${server.identifier}.${server.allocation?.ip}`}
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="flex flex-col gap-4">
            {/* Server Owner Card */}
            <GlassCard className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{server.owner?.username || server.owner_username}</h4>
                <p className="text-xs text-slate-400 truncate">{server.owner?.email || 'Registered Tenant'}</p>
              </div>
            </GlassCard>

            {/* Server Node Card */}
            <GlassCard className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <HardDrive className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{server.node}</h4>
                <p className="text-xs text-slate-400 font-mono truncate">{server.allocation?.ip}:8443</p>
              </div>
            </GlassCard>

            {/* Quick Actions */}
            <GlassCard className="p-4">
              <h4 className="text-xs font-bold text-white mb-3">Quick Navigation</h4>
              <GlassButton
                variant="accent"
                size="sm"
                className="w-full"
                onClick={() => onOpenConsole(server.id)}
                leftIcon={<Terminal className="w-4 h-4" />}
              >
                Access Terminal Console
              </GlassButton>
            </GlassCard>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILS */}
      {activeTab === 'details' && (
        <GlassCard className="p-5 max-w-3xl">
          <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 mb-4">
            Base Information
          </h3>

          <form onSubmit={handleSaveDetails} className="flex flex-col gap-4 text-xs">
            <GlassInput
              label="Server Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />

            <GlassInput
              label="External Identifier"
              value={externalId}
              onChange={e => setExternalId(e.target.value)}
              placeholder="Leave empty or specify unique external ID"
            />

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Server Owner</label>
              <select
                value={ownerId}
                onChange={e => setOwnerId(e.target.value)}
                className="glass-input w-full px-3 py-2 bg-[#121318] text-white rounded cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={String(u.id)}>
                    {u.name_first} {u.name_last} (@{u.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Server Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="glass-input w-full px-3 py-2 bg-[#121318] text-white rounded"
                placeholder="A brief description of this server."
              />
            </div>

            <div className="pt-2">
              <GlassButton variant="accent" size="sm" type="submit" leftIcon={<Save className="w-4 h-4" />}>
                Save Changes
              </GlassButton>
            </div>
          </form>
        </GlassCard>
      )}

      {/* TAB 3: BUILD CONFIGURATION */}
      {activeTab === 'build' && (
        <form onSubmit={handleSaveBuild} className="flex flex-col gap-5 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Resource Management Card */}
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 mb-4">
                Resource Management
              </h3>

              <div className="flex flex-col gap-3 text-xs">
                <GlassInput
                  label="CPU Limit (%)"
                  value={cpuLimit}
                  onChange={e => setCpuLimit(e.target.value)}
                  description="0 for unlimited CPU allocation."
                  required
                />

                <GlassInput
                  label="CPU Pinning"
                  value={cpuPinning}
                  onChange={e => setCpuPinning(e.target.value)}
                  placeholder="e.g. 0, 0-1,3"
                />

                <GlassInput
                  label="Allocated Memory (MiB)"
                  value={memoryMb}
                  onChange={e => setMemoryMb(e.target.value)}
                  required
                />

                <GlassInput
                  label="Allocated Swap (MiB)"
                  value={swapMb}
                  onChange={e => setSwapMb(e.target.value)}
                  description="0 disables swap; -1 for unlimited."
                  required
                />

                <GlassInput
                  label="Disk Space Limit (MiB)"
                  value={diskMb}
                  onChange={e => setDiskMb(e.target.value)}
                  required
                />

                <GlassInput
                  label="Block IO Proportion"
                  value={ioWeight}
                  onChange={e => setIoWeight(e.target.value)}
                  description="Value between 10 and 1000 (standard: 500)."
                  required
                />

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">OOM Killer</label>
                  <div className="flex items-center gap-4 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        checked={oomKiller}
                        onChange={() => setOomKiller(true)}
                        className="text-red-500"
                      />
                      <span>Enabled</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        checked={!oomKiller}
                        onChange={() => setOomKiller(false)}
                        className="text-red-500"
                      />
                      <span>Disabled</span>
                    </label>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Feature Limits & Allocations */}
            <div className="flex flex-col gap-5">
              <GlassCard className="p-5">
                <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 mb-4">
                  Application Feature Limits
                </h3>

                <div className="flex flex-col gap-3 text-xs">
                  <GlassInput
                    label="Database Limit"
                    value={databaseLimit}
                    onChange={e => setDatabaseLimit(e.target.value)}
                    required
                  />

                  <GlassInput
                    label="Allocation Limit"
                    value={allocationLimit}
                    onChange={e => setAllocationLimit(e.target.value)}
                    required
                  />

                  <GlassInput
                    label="Backup Limit"
                    value={backupLimit}
                    onChange={e => setBackupLimit(e.target.value)}
                    required
                  />
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 mb-4">
                  Allocation Management
                </h3>

                <div className="flex flex-col gap-3 text-xs">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Primary Game Port</label>
                    <input
                      type="text"
                      disabled
                      value={`${server.allocation?.ip}:${server.allocation?.port}`}
                      className="glass-input w-full px-3 py-2 bg-black/40 text-red-400 font-mono rounded"
                    />
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>

          <div className="flex justify-start">
            <GlassButton variant="accent" size="sm" type="submit" leftIcon={<Save className="w-4 h-4" />}>
              Update Build Configuration
            </GlassButton>
          </div>
        </form>
      )}

      {/* TAB 4: STARTUP */}
      {activeTab === 'startup' && (
        <form onSubmit={handleSaveStartup} className="flex flex-col gap-5 max-w-4xl">
          <GlassCard className="p-5">
            <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 mb-4">
              Startup Command Modification
            </h3>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Startup Command</label>
                <textarea
                  value={startupCmd}
                  onChange={e => setStartupCmd(e.target.value)}
                  rows={3}
                  className="glass-input w-full px-3 py-2 bg-[#121318] text-white font-mono rounded"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Default Service Start Command</label>
                <textarea
                  value={defaultStartupCmd}
                  readOnly
                  rows={2}
                  className="glass-input w-full px-3 py-2 bg-black/40 text-slate-400 font-mono rounded"
                />
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 mb-4">
                Service Configuration
              </h3>

              <div className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nest Category</label>
                  <select
                    value={selectedNestId}
                    onChange={e => setSelectedNestId(e.target.value)}
                    className="glass-input w-full px-3 py-2 bg-[#121318] text-white rounded cursor-pointer"
                  >
                    {nests.map(n => (
                      <option key={n.id} value={String(n.id)}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Engine Egg</label>
                  <select
                    value={selectedEggId}
                    onChange={e => setSelectedEggId(e.target.value)}
                    className="glass-input w-full px-3 py-2 bg-[#121318] text-white rounded cursor-pointer"
                  >
                    {eggs.map(e => (
                      <option key={e.id} value={String(e.id)}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 mb-4">
                Git Repo Address (Optional)
              </h3>

              <div className="flex flex-col gap-3 text-xs">
                <GlassInput
                  label="Git Repository to Clone"
                  value={gitAddress}
                  onChange={e => setGitAddress(e.target.value)}
                  placeholder="https://github.com/user/repo"
                />
                <span className="text-[11px] text-slate-400 font-mono">Variable: GIT_ADDRESS</span>
              </div>
            </GlassCard>
          </div>

          <div className="flex justify-start">
            <GlassButton variant="accent" size="sm" type="submit" leftIcon={<Save className="w-4 h-4" />}>
              Save Modifications
            </GlassButton>
          </div>
        </form>
      )}

      {/* TAB 5: DATABASE */}
      {activeTab === 'database' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <GlassCard className="p-5">
              <div className="p-3 mb-4 rounded bg-blue-950/40 border border-blue-500/30 text-blue-300 text-xs">
                Database connection credentials can be viewed when managing this instance in the client area.
              </div>

              <h3 className="text-sm font-bold text-white mb-3">Active Attached Databases</h3>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[11px]">
                    <th className="py-2">Database</th>
                    <th className="py-2">Username</th>
                    <th className="py-2">Connections From</th>
                    <th className="py-2">Host</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(server.databases || []).map((db: any) => (
                    <tr key={db.id}>
                      <td className="py-2.5 font-mono text-white font-semibold">{db.database}</td>
                      <td className="py-2.5 font-mono text-slate-300">{db.username}</td>
                      <td className="py-2.5 font-mono text-slate-300">{db.connections_from}</td>
                      <td className="py-2.5 font-mono text-slate-300">{db.host}</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => handleDeleteDatabase(db.id)}
                          className="px-2 py-1 bg-red-950/40 text-red-400 hover:text-red-300 rounded border border-red-800/40 cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!server.databases || server.databases.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No external databases linked to this container.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </GlassCard>
          </div>

          <GlassCard className="p-5">
            <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 mb-4">
              Create New Database
            </h3>

            <form onSubmit={handleCreateDatabase} className="flex flex-col gap-3 text-xs">
              <GlassInput
                label="Database Name"
                value={newDbName}
                onChange={e => setNewDbName(e.target.value)}
                placeholder="e.g. survival_db"
                required
              />

              <GlassInput
                label="Connections From"
                value={newDbConnections}
                onChange={e => setNewDbConnections(e.target.value)}
                placeholder="%"
              />

              <GlassInput
                label="Concurrent Connections"
                value={newDbMaxConnections}
                onChange={e => setNewDbMaxConnections(e.target.value)}
                placeholder="0 for unlimited"
              />

              <GlassButton variant="accent" size="sm" type="submit" className="mt-2">
                Create Database
              </GlassButton>
            </form>
          </GlassCard>
        </div>
      )}

      {/* TAB 6: MOUNTS */}
      {activeTab === 'mounts' && (
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 mb-4">
            Available Filesystem Mounts
          </h3>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-2">ID</th>
                <th className="py-2">Name</th>
                <th className="py-2">Source Path</th>
                <th className="py-2">Target Path</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-3 font-mono text-slate-400">1</td>
                <td className="py-3 font-semibold text-white">Default Volume Root</td>
                <td className="py-3 font-mono text-slate-300">/home/xan/.slayerwings/volumes/{server.uuid}</td>
                <td className="py-3 font-mono text-slate-300">/data</td>
                <td className="py-3">
                  <GlassBadge status="running">MOUNTED</GlassBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </GlassCard>
      )}

      {/* TAB 7: MANAGE */}
      {activeTab === 'manage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <GlassCard className="p-5">
            <h3 className="text-sm font-bold text-white mb-1">Reinstall Server</h3>
            <p className="text-xs text-slate-400 mb-4">
              This will re-run the service installation scripts and refresh game engine jar files.
            </p>
            <GlassButton
              variant="danger"
              size="sm"
              onClick={() => handleServerAction('reinstall')}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Reinstall Server
            </GlassButton>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="text-sm font-bold text-white mb-1">Install Status</h3>
            <p className="text-xs text-slate-400 mb-4">
              Toggle the current installation status between completed and pending.
            </p>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => handleServerAction('toggle-install')}
            >
              Toggle Install Status
            </GlassButton>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="text-sm font-bold text-white mb-1">Suspend Server</h3>
            <p className="text-xs text-slate-400 mb-4">
              Suspending immediately kills the active container and blocks all client actions.
            </p>
            <GlassButton
              variant={server.is_suspended ? 'accent' : 'danger'}
              size="sm"
              onClick={() => handleServerAction(server.is_suspended ? 'unsuspend' : 'suspend')}
            >
              {server.is_suspended ? 'Unsuspend Server' : 'Suspend Server'}
            </GlassButton>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="text-sm font-bold text-white mb-1">Transfer Server</h3>
            <p className="text-xs text-slate-400 mb-4">
              Migrate this server instance to another Wings host node.
            </p>
            <GlassButton variant="secondary" size="sm" disabled>
              Transfer Server (Requires 2+ Nodes)
            </GlassButton>
          </GlassCard>
        </div>
      )}

      {/* TAB 8: DELETE */}
      {activeTab === 'delete' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <GlassCard className="p-5 border-red-800/40">
            <h3 className="text-sm font-bold text-red-500 mb-1">Safely Delete Server</h3>
            <p className="text-xs text-slate-400 mb-3">
              This action will attempt to delete the server from both the panel database and the node daemon.
            </p>
            <p className="text-xs text-red-400 font-semibold mb-4">
              Warning: Deleting a server is irreversible. All world files and data will be removed.
            </p>
            <GlassButton
              variant="danger"
              size="sm"
              onClick={() => handleDeleteServer(false)}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Safely Delete This Server
            </GlassButton>
          </GlassCard>

          <GlassCard className="p-5 border-red-900/60 bg-red-950/20">
            <h3 className="text-sm font-bold text-red-400 mb-1">Force Delete Server</h3>
            <p className="text-xs text-slate-400 mb-3">
              Deletes the server from the panel even if the remote Wings node is unresponsive.
            </p>
            <p className="text-xs text-red-400 font-semibold mb-4">
              Warning: This method will remove all database records immediately.
            </p>
            <GlassButton
              variant="danger"
              size="sm"
              onClick={() => handleDeleteServer(true)}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Forcibly Delete This Server
            </GlassButton>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
