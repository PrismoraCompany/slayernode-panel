import React, { useState, useEffect } from 'react';
import {
  Server,
  Plus,
  Play,
  RotateCcw,
  Square,
  Search,
  Filter,
  Check,
  AlertTriangle,
  HardDrive,
  Cpu,
  Layers,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';
import { GlassBadge } from '../ui/GlassBadge';
import { GlassToggle } from '../ui/GlassToggle';
import { Server as ServerType, Node, User, Nest, Egg } from '../../types';
import { useServer } from '../../context/ServerContext';
import { AdminServerDetailView } from './server-edit/AdminServerDetailView';
import { CreateServerView } from './CreateServerView';

interface AdminServersManagerProps {
  onSelectServerDetail: (serverId: string) => void;
}

export const AdminServersManager: React.FC<AdminServersManagerProps> = ({ onSelectServerDetail }) => {
  const { servers, sendPowerAction, refreshServers } = useServer();
  const [serverList, setServerList] = useState<ServerType[]>(servers);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [editingServerId, setEditingServerId] = useState<string | null>(null);

  // External data for wizard
  const [nodes, setNodes] = useState<Node[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [nests, setNests] = useState<Nest[]>([]);
  const [eggs, setEggs] = useState<Egg[]>([]);

  // Wizard Form State
  const [serverName, setServerName] = useState('');
  const [serverDesc, setServerDesc] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState('1');
  const [selectedNodeId, setSelectedNodeId] = useState('1');
  const [selectedNestId, setSelectedNestId] = useState('1');
  const [selectedEggId, setSelectedEggId] = useState('1');
  const [memoryMb, setMemoryMb] = useState('4096');
  const [diskMb, setDiskMb] = useState('20480');
  const [cpuPct, setCpuPct] = useState('200');
  const [swapMb, setSwapMb] = useState('512');
  const [customPort, setCustomPort] = useState('25565');
  const [startOnDeploy, setStartOnDeploy] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  useEffect(() => {
    setServerList(servers);
  }, [servers]);

  useEffect(() => {
    // Load metadata for wizard
    const loadWizardData = async () => {
      try {
        const [nodesRes, usersRes, nestsRes] = await Promise.all([
          fetch('/api/application/nodes'),
          fetch('/api/application/users'),
          fetch('/api/application/nests'),
        ]);

        if (nodesRes.ok) {
          const d = await nodesRes.json();
          const loadedNodes = d.data.map((x: any) => x.attributes);
          setNodes(loadedNodes);
          if (loadedNodes.length > 0) {
            setSelectedNodeId(String(loadedNodes[0].id));
          }
        }
        if (usersRes.ok) {
          const d = await usersRes.json();
          const loadedUsers = d.data.map((x: any) => x.attributes);
          setUsers(loadedUsers);
          if (loadedUsers.length > 0) {
            setSelectedOwnerId(String(loadedUsers[0].id));
          }
        }
        if (nestsRes.ok) {
          const d = await nestsRes.json();
          const loadedNests = d.data.map((x: any) => x.attributes);
          setNests(loadedNests);
          if (loadedNests.length > 0) {
            setSelectedNestId(String(loadedNests[0].id));
          }
        }
      } catch {}
    };

    loadWizardData();
  }, []);

  useEffect(() => {
    if (!selectedNestId) return;
    fetch(`/api/application/nests/${selectedNestId}/eggs`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.data)) {
          const loadedEggs = data.data.map((x: any) => x.attributes || x);
          setEggs(loadedEggs);
          if (loadedEggs.length > 0) {
            setSelectedEggId(String(loadedEggs[0].id));
          }
        }
      })
      .catch(() => {});
  }, [selectedNestId]);

  useEffect(() => {
    if (nodes.length > 0 && !nodes.some(n => String(n.id) === String(selectedNodeId))) {
      setSelectedNodeId(String(nodes[0].id));
    }
  }, [nodes, showCreateModal]);

  useEffect(() => {
    if (users.length > 0 && !users.some(u => String(u.id) === String(selectedOwnerId))) {
      setSelectedOwnerId(String(users[0].id));
    }
  }, [users, showCreateModal]);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim()) {
      setDeployError('Server name is required.');
      return;
    }

    setIsDeploying(true);
    setDeployError(null);

    const targetNode = nodes.find(n => String(n.id) === String(selectedNodeId)) || nodes[0];
    const targetNodeId = targetNode ? targetNode.id : selectedNodeId;

    const targetUser = users.find(u => String(u.id) === String(selectedOwnerId)) || users[0];
    const targetUserId = targetUser ? targetUser.id : selectedOwnerId;

    try {
      const res = await fetch('/api/application/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: serverName.trim(),
          description: serverDesc.trim(),
          owner_id: targetUserId,
          node_id: targetNodeId,
          egg_id: parseInt(selectedEggId) || 1,
          nest_id: parseInt(selectedNestId) || 1,
          memory: parseInt(memoryMb) || 2048,
          disk: parseInt(diskMb) || 10240,
          cpu: parseInt(cpuPct) || 100,
          swap: parseInt(swapMb) || 512,
          start_on_deploy: startOnDeploy,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDeployError(data.error || 'Failed provisioning server container.');
        setIsDeploying(false);
        return;
      }

      if (data?.attributes) {
        setServerList(prev => [data.attributes, ...prev.filter(s => s.uuid !== data.attributes.uuid)]);
        if (refreshServers) {
          refreshServers();
        }
      }

      setShowCreateModal(false);
      setServerName('');
      setServerDesc('');
      setActionNotice(`Server "${data.attributes.name}" provisioned successfully on ${data.attributes.node}!`);
      setTimeout(() => setActionNotice(null), 4000);

      // Auto start if selected
      if (startOnDeploy && data.attributes?.uuid) {
        setTimeout(() => {
          sendPowerAction('start', data.attributes.uuid);
        }, 500);
      }
    } catch (err: any) {
      setDeployError(err?.message || 'Network error.');
    } finally {
      setIsDeploying(false);
    }
  };

  const filtered = serverList.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.owner_username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.node.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showCreateModal) {
    return (
      <CreateServerView
        onBack={() => setShowCreateModal(false)}
        onServerCreated={(newServer) => {
          setShowCreateModal(false);
          if (refreshServers) refreshServers();
          setActionNotice(`Server "${newServer.name}" provisioned successfully on ${newServer.node}!`);
          setTimeout(() => setActionNotice(null), 4000);
        }}
      />
    );
  }

  if (editingServerId) {
    return (
      <AdminServerDetailView
        serverId={editingServerId}
        onBack={() => setEditingServerId(null)}
        onOpenConsole={onSelectServerDetail}
        onServerDeleted={() => {
          setEditingServerId(null);
          if (refreshServers) refreshServers();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Server className="w-5 h-5 text-red-500" /> Infrastructure Servers & Provisioning
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Global view of all Docker game containers hosted across your entire Wings node fleet.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create New Server
        </GlassButton>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-md">
          <GlassInput
            placeholder="Search servers by name, uuid, node, or owner..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Global Servers Table */}
      <GlassCard className="overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="p-3.5">Server Container</th>
              <th className="p-3.5 hidden sm:table-cell">Owner</th>
              <th className="p-3.5 hidden md:table-cell">Node Host</th>
              <th className="p-3.5">Allocation</th>
              <th className="p-3.5 hidden lg:table-cell">Limits (RAM / CPU)</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-white/5 transition-colors">
                <td className="p-3.5">
                  <button
                    onClick={() => setEditingServerId(s.id)}
                    className="font-bold text-white hover:text-red-400 block text-left cursor-pointer transition-colors"
                  >
                    {s.name}
                  </button>
                  <span className="font-mono text-slate-400 text-[11px]">{s.identifier}</span>
                </td>

                <td className="p-3.5 text-slate-300 hidden sm:table-cell">
                  <span className="font-mono text-xs">@{s.owner_username}</span>
                </td>

                <td className="p-3.5 text-slate-300 hidden md:table-cell font-mono">
                  {s.node.split(' ')[0]}
                </td>

                <td className="p-3.5 font-mono text-red-400 font-medium">
                  {s.allocation.ip}:{s.allocation.port}
                </td>

                <td className="p-3.5 font-mono text-slate-300 hidden lg:table-cell">
                  {(s.limits.memory / 1024).toFixed(1)} GB / {s.limits.cpu}%
                </td>

                <td className="p-3.5">
                  <GlassBadge status={s.status}>{s.status.toUpperCase()}</GlassBadge>
                </td>

                <td className="p-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setEditingServerId(s.id)}
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer border border-white/10"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => onSelectServerDetail(s.id)}
                      className="px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/40 text-xs font-semibold text-red-400 hover:text-red-300 cursor-pointer border border-red-800/40"
                    >
                      Console
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            <Server className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-white">There are no servers provisioned yet.</p>
            <p className="text-xs text-slate-500 mt-1">Deploy a node and click "Create New Server" to provision your first container.</p>
          </div>
        )}
      </GlassCard>

      {/* CREATE SERVER PROVISIONING WIZARD MODAL */}
      <GlassModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Provision New Game Server Instance"
        description="Configure Docker container limits, node host, allocation, and game egg"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateServer} className="flex flex-col gap-4 py-2">
          {deployError && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-600/40 text-red-500 font-bold text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{deployError}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassInput
              label="Server Display Name"
              value={serverName}
              onChange={e => setServerName(e.target.value)}
              placeholder="e.g. SlayerCraft Survival SMP"
              required
            />

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Server Owner</label>
              <select
                value={String(selectedOwnerId)}
                onChange={e => setSelectedOwnerId(e.target.value)}
                className="glass-input w-full px-3 py-2 text-xs bg-slate-900 text-white cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={String(u.id)}>
                    {u.name_first} {u.name_last} (@{u.username})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <GlassInput
            label="Server Description (Optional)"
            value={serverDesc}
            onChange={e => setServerDesc(e.target.value)}
            placeholder="High-performance game instance running on SlayerNode"
          />

          {/* Section 2: Node & Host Infrastructure */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Target Infrastructure Node</label>
              <select
                value={String(selectedNodeId)}
                onChange={e => setSelectedNodeId(e.target.value)}
                className="glass-input w-full px-3 py-2 text-xs bg-slate-900 text-white cursor-pointer"
              >
                {nodes.length === 0 ? (
                  <option value="">No nodes registered</option>
                ) : (
                  nodes.map(n => (
                    <option key={n.id} value={String(n.id)}>
                      {n.name} ({n.fqdn})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Nest Category</label>
              <select
                value={String(selectedNestId)}
                onChange={e => setSelectedNestId(e.target.value)}
                className="glass-input w-full px-3 py-2 text-xs bg-slate-900 text-white cursor-pointer"
              >
                {nests.map(n => (
                  <option key={n.id} value={String(n.id)}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Game Engine / Egg</label>
              <select
                value={String(selectedEggId)}
                onChange={e => setSelectedEggId(e.target.value)}
                className="glass-input w-full px-3 py-2 text-xs bg-slate-900 text-white cursor-pointer"
              >
                {eggs.length === 0 ? (
                  <option value="1">Minecraft: Paper / Purpur</option>
                ) : (
                  eggs.map(e => (
                    <option key={e.id} value={String(e.id)}>
                      {e.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Section 3: Hardware & Container Limits */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">RAM Limit (MiB)</label>
              <input
                type="number"
                value={memoryMb}
                onChange={e => setMemoryMb(e.target.value)}
                className="glass-input w-full px-3 py-2 text-xs font-mono"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Disk Limit (MiB)</label>
              <input
                type="number"
                value={diskMb}
                onChange={e => setDiskMb(e.target.value)}
                className="glass-input w-full px-3 py-2 text-xs font-mono"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">CPU Cores (%)</label>
              <input
                type="number"
                value={cpuPct}
                onChange={e => setCpuPct(e.target.value)}
                className="glass-input w-full px-3 py-2 text-xs font-mono"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Swap Space (MiB)</label>
              <input
                type="number"
                value={swapMb}
                onChange={e => setSwapMb(e.target.value)}
                className="glass-input w-full px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <GlassToggle
              label="Boot Container on Deploy"
              description="Immediately start the server container upon creation"
              checked={startOnDeploy}
              onChange={setStartOnDeploy}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" type="button" onClick={() => setShowCreateModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="accent" size="sm" type="submit" isLoading={isDeploying}>
              Deploy Server Instance
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
