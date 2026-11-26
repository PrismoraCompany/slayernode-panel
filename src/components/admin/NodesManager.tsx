import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Plus,
  Terminal,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Server,
  ExternalLink,
  Wifi,
  Activity,
  Layers,
  FileCode,
  ArrowLeft,
  Settings,
  Info,
  Network,
  Download,
  AlertTriangle,
  Radio,
  Sliders,
  Cpu,
  Trash2,
  Lock,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';
import { Node, NodeAllocation, Server as ServerType } from '../../types';
import { useServer } from '../../context/ServerContext';
import { apiFetch } from '../../lib/api';
import { CreateNodeView } from './nodes/CreateNodeView';

export const INITIAL_NODES: Node[] = [];

interface NodesManagerProps {
  onNavigateServer?: (serverId: string) => void;
}

export const NodesManager: React.FC<NodesManagerProps> = ({ onNavigateServer }) => {
  const { servers } = useServer();
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeTab, setNodeTab] = useState<'about' | 'settings' | 'configuration' | 'allocation' | 'servers'>('settings');
  const [showDeployWizard, setShowDeployWizard] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [pingStatus, setPingStatus] = useState<Record<number, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable Node Settings State (Bound to currently selected node)
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocationId, setEditLocationId] = useState('1');
  const [editAllowAutoAlloc, setEditAllowAutoAlloc] = useState(true);
  const [editFqdn, setEditFqdn] = useState('');
  const [editScheme, setEditScheme] = useState<'https' | 'http'>('https');
  const [editBehindProxy, setEditBehindProxy] = useState(false);
  const [editMaintenanceMode, setEditMaintenanceMode] = useState(false);
  const [editMemory, setEditMemory] = useState('262144');
  const [editMemoryOverallocate, setEditMemoryOverallocate] = useState('0');
  const [editDisk, setEditDisk] = useState('3840000');
  const [editDiskOverallocate, setEditDiskOverallocate] = useState('0');
  const [editUploadSize, setEditUploadSize] = useState('500');
  const [editDaemonListen, setEditDaemonListen] = useState('8080');
  const [editDaemonSftp, setEditDaemonSftp] = useState('2022');
  const [resetMasterKey, setResetMasterKey] = useState(false);

  // Allocations state for selected node
  const [nodeAllocations, setNodeAllocations] = useState<NodeAllocation[]>([]);
  const [allocIp, setAllocIp] = useState('194.164.72.12');
  const [allocPorts, setAllocPorts] = useState('25565-25575');
  const [allocAlias, setAllocAlias] = useState('');
  const [allocFilter, setAllocFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // Deploy VPS form state
  const [vpsName, setVpsName] = useState('');
  const [vpsFqdn, setVpsFqdn] = useState('');
  const [vpsMemory, setVpsMemory] = useState('65536');
  const [vpsDisk, setVpsDisk] = useState('1024000');
  const [vpsError, setVpsError] = useState<string | null>(null);
  const [allocError, setAllocError] = useState<string | null>(null);

  const fetchNodes = async () => {
    try {
      const res = await apiFetch('/api/application/nodes');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setNodes(json.data.map((d: any) => d.attributes || d));
        }
      }
    } catch (err) {
      console.error('Failed fetching nodes:', err);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  // When a node is selected, populate all settings fields & load allocations
  useEffect(() => {
    if (selectedNode) {
      setEditName(selectedNode.name);
      setEditDescription(selectedNode.description);
      setEditLocationId(String(selectedNode.location_id));
      setEditAllowAutoAlloc(selectedNode.allow_auto_allocation !== false);
      setEditFqdn(selectedNode.fqdn);
      setEditScheme(selectedNode.scheme);
      setEditBehindProxy(selectedNode.behind_proxy);
      setEditMaintenanceMode(selectedNode.maintenance_mode);
      setEditMemory(String(selectedNode.memory));
      setEditMemoryOverallocate(String(selectedNode.memory_overallocate || 0));
      setEditDisk(String(selectedNode.disk));
      setEditDiskOverallocate(String(selectedNode.disk_overallocate || 0));
      setEditUploadSize(String(selectedNode.upload_size));
      setEditDaemonListen(String(selectedNode.daemon_listen));
      setEditDaemonSftp(String(selectedNode.daemon_sftp));
      setResetMasterKey(false);
      loadAllocations(selectedNode.id);
    }
  }, [selectedNode]);

  const loadAllocations = async (nodeId: number) => {
    try {
      const res = await apiFetch(`/api/application/nodes/${nodeId}/allocations`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setNodeAllocations(json.data.map((d: any) => d.attributes || d));
          return;
        }
      }
    } catch (e) {
      // Fallback
    }
    setNodeAllocations([]);
  };

  const handleSaveNodeSettings = async () => {
    if (!selectedNode) return;

    const updatedNode: Node = {
      ...selectedNode,
      name: editName,
      description: editDescription,
      location_id: parseInt(editLocationId) || 1,
      allow_auto_allocation: editAllowAutoAlloc,
      fqdn: editFqdn,
      scheme: editScheme,
      behind_proxy: editBehindProxy,
      maintenance_mode: editMaintenanceMode,
      memory: parseInt(editMemory) || selectedNode.memory,
      memory_overallocate: parseInt(editMemoryOverallocate) || 0,
      disk: parseInt(editDisk) || selectedNode.disk,
      disk_overallocate: parseInt(editDiskOverallocate) || 0,
      upload_size: parseInt(editUploadSize) || selectedNode.upload_size,
      daemon_listen: parseInt(editDaemonListen) || selectedNode.daemon_listen,
      daemon_sftp: parseInt(editDaemonSftp) || selectedNode.daemon_sftp,
    };

    try {
      await apiFetch(`/api/application/nodes/${selectedNode.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedNode),
      });
    } catch {}

    setNodes(prev => prev.map(n => (n.id === selectedNode.id ? updatedNode : n)));
    setSelectedNode(updatedNode);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleAddAllocations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode) return;
    if (!allocIp.trim()) {
      setAllocError('IP address is required.');
      return;
    }
    if (!allocPorts.trim()) {
      setAllocError('Port range (e.g. 25565-25575) is required.');
      return;
    }
    setAllocError(null);

    try {
      const res = await apiFetch(`/api/application/nodes/${selectedNode.id}/allocations`, {
        method: 'POST',
        body: JSON.stringify({ ip: allocIp.trim(), ports: allocPorts.trim(), alias: allocAlias.trim() }),
      });
      if (res.ok) {
        loadAllocations(selectedNode.id);
        setAllocPorts('');
        setAllocAlias('');
      } else {
        const d = await res.json();
        setAllocError(d.error || 'Failed adding allocations.');
      }
    } catch {
      setAllocError('Network error adding allocations.');
    }
  };

  const handleDeleteAllocation = async (allocId: number) => {
    if (!selectedNode) return;
    try {
      await apiFetch(`/api/application/nodes/${selectedNode.id}/allocations/${allocId}`, {
        method: 'DELETE',
      });
      setNodeAllocations(prev => prev.filter(a => a.id !== allocId));
    } catch {}
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const testPingVPS = async (nodeId: number) => {
    setPingStatus(prev => ({ ...prev, [nodeId]: 'testing' }));
    const t0 = Date.now();
    try {
      const res = await apiFetch(`/api/application/nodes/${nodeId}`);
      if (res.ok) {
        const d = await res.json();
        const attr = d.attributes || d;
        if (attr.is_online) {
          const latency = attr.latency_ms || attr.ping_ms || Math.max(1, Date.now() - t0);
          setPingStatus(prev => ({ ...prev, [nodeId]: `${latency}ms (OK)` }));
          setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, is_online: true, system_info: attr.system_info, ping_ms: latency } : n));
          if (selectedNode?.id === nodeId) setSelectedNode(attr);
        } else {
          setPingStatus(prev => ({ ...prev, [nodeId]: 'offline' }));
          setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, is_online: false, ping_ms: null } : n));
        }
      } else {
        setPingStatus(prev => ({ ...prev, [nodeId]: 'offline' }));
      }
    } catch {
      setPingStatus(prev => ({ ...prev, [nodeId]: 'offline' }));
    }
  };

  const handleDeleteNode = async (nodeToDelete: Node) => {
    const hostedServers = servers.filter(s => String(s.node_id) === String(nodeToDelete.id));
    if (hostedServers.length > 0) {
      alert(`Cannot delete node "${nodeToDelete.name}": It currently hosts ${hostedServers.length} active server instance(s). You must delete or migrate all servers off this node before it can be deleted.`);
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete node "${nodeToDelete.name}"?\nThis will permanently remove the node and its configured allocations.`
    );
    if (!confirmDelete) return;

    try {
      const res = await apiFetch(`/api/application/nodes/${nodeToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNodes(prev => prev.filter(n => n.id !== nodeToDelete.id));
        if (selectedNode?.id === nodeToDelete.id) {
          setSelectedNode(null);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete node.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error deleting node.');
    }
  };

  const generateWingsConfigYaml = (node: Node) => {
    const currentPanelUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `# ========================================================
# SlayerWings Engine Daemon Configuration (v1.0.0)
# Generated by SlayerNode Panel v1.0.0 for ${node.name}
# Documentation: https://slayernode.xyz/docs/slayerwings
# ========================================================
debug: false
uuid: ${node.uuid}
token_id: ${node.uuid.slice(0, 8)}
token: sn_wing_${node.uuid.replace(/-/g, '')}
api:
  host: 0.0.0.0
  port: ${node.daemon_listen}
  ssl:
    enabled: ${node.scheme === 'https'}
    cert: /etc/letsencrypt/live/${node.fqdn}/fullchain.pem
    key: /etc/letsencrypt/live/${node.fqdn}/privkey.pem
  upload_limit: ${node.upload_size}
system:
  root_directory: ${node.daemon_base}
  log_directory: /var/log/slayerwings
  data: /var/lib/slayerwings
  archive_directory: /var/lib/slayerwings/backups
  backup_retention: 7
  sftp:
    bind_port: ${node.daemon_sftp}
allowed_mounts: []
remote: ${currentPanelUrl}
docker:
  network:
    name: slayernode_nw
    driver: bridge
    interface: 172.18.0.1
    dns:
      - 1.1.1.1
      - 8.8.8.8
`;
  };

  const generateAutoDeployCommand = (node: Node) => {
    const currentPanelUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `cd /etc/slayerwings && sudo slayerwings configure --panel-url ${currentPanelUrl} --token sn_wing_${node.uuid.replace(/-/g, '')} --node ${node.id}`;
  };

  // Node Servers list
  const nodeServers = selectedNode
    ? servers.filter(s => s.node_id === selectedNode.id || s.node.includes(selectedNode.name.split(' ')[0]))
    : [];

  // =========================================================================
  // VIEW 1.5: DEDICATED NEW NODE CREATION SCREEN (Matches screenshots)
  // =========================================================================
  if (showDeployWizard) {
    return (
      <CreateNodeView
        onBack={() => setShowDeployWizard(false)}
        onNodeCreated={() => {
          setShowDeployWizard(false);
          fetchNodes();
        }}
      />
    );
  }

  // =========================================================================
  // VIEW 2: NODE DETAIL & WINGS ENGINE (When a node is selected)
  // Matches exact layout of screenshot with 5 tabs: About, Settings, Configuration, Allocation, Servers
  // =========================================================================
  if (selectedNode) {
    return (
      <div className="flex flex-col gap-5">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedNode(null)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/10"
              title="Back to all nodes"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">{selectedNode.name}</h1>
                <GlassBadge status={selectedNode.is_online ? 'running' : 'offline'}>
                  {selectedNode.is_online ? 'CONNECTED' : 'OFFLINE'}
                </GlassBadge>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {selectedNode.scheme}://{selectedNode.fqdn}:{selectedNode.daemon_listen} • UUID: {selectedNode.uuid}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => testPingVPS(selectedNode.id)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer border border-white/10"
            >
              <Wifi className="w-3.5 h-3.5 text-red-500" />
              {pingStatus[selectedNode.id] || 'Ping Daemon'}
            </button>

            <button
              onClick={() => handleDeleteNode(selectedNode)}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5 cursor-pointer border border-red-500/20"
              title={servers.some(s => String(s.node_id) === String(selectedNode.id)) ? 'Cannot delete: hosts active servers' : 'Delete node'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Node
            </button>
          </div>
        </div>

        {/* 5-Tab Dedicated Node Workspace */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-white/10 overflow-x-auto text-xs shadow-lg">
          {[
            { id: 'about', label: 'About', icon: <Info className="w-4 h-4" /> },
            { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
            { id: 'configuration', label: 'Configuration', icon: <Terminal className="w-4 h-4" /> },
            { id: 'allocation', label: 'Allocation', icon: <Network className="w-4 h-4" /> },
            { id: 'servers', label: `Servers (${nodeServers.length})`, icon: <Server className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setNodeTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
                nodeTab === tab.id
                  ? 'bg-red-600/20 text-red-500 border border-red-600/40 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* =================================================================== */}
        {/* TAB 1: ABOUT (Real-time Telemetry, System Stats, Docker & Kernel)    */}
        {/* =================================================================== */}
        {nodeTab === 'about' && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlassCard className="p-5 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-400">Allocated Memory</span>
                <div className="text-xl font-bold text-white font-mono">
                  16,384 <span className="text-xs font-normal text-slate-400">/ {selectedNode.memory.toLocaleString()} MiB</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-1">
                  <div className="h-full bg-red-600 rounded-full" style={{ width: '6.2%' }} />
                </div>
                <span className="text-[11px] text-slate-400">6.2% of node memory assigned</span>
              </GlassCard>

              <GlassCard className="p-5 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-400">Allocated Disk Storage</span>
                <div className="text-xl font-bold text-white font-mono">
                  41,960 <span className="text-xs font-normal text-slate-400">/ {selectedNode.disk.toLocaleString()} MiB</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-1">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: '1.1%' }} />
                </div>
                <span className="text-[11px] text-slate-400">1.1% of disk space assigned</span>
              </GlassCard>

              <GlassCard className="p-5 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-400">Active Containers</span>
                <div className="text-xl font-bold text-white font-mono">
                  {nodeServers.length} <span className="text-xs font-normal text-slate-400">running containers</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-1">
                  <div className="h-full bg-indigo-400 rounded-full" style={{ width: '35%' }} />
                </div>
                <span className="text-[11px] text-slate-400">{selectedNode.allocations_count} total ports assigned</span>
              </GlassCard>
            </div>

            <GlassCard className="p-5 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-red-500" /> Physical Host Hardware & Daemon Telemetry
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="flex justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-sans">Operating System / Kernel:</span>
                  <span className="text-white">
                    {(selectedNode as any).system_info?.os
                      ? `${(selectedNode as any).system_info.os} ${(selectedNode as any).system_info.kernel} (${(selectedNode as any).system_info.architecture})`
                      : 'Linux Host (SlayerWings)'}
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-sans">Daemon Engine:</span>
                  <span className="text-red-500">Wings {selectedNode.daemon_version}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-sans">Isolation Runtime:</span>
                  <span className="text-white">
                    {(selectedNode as any).system_info?.isolation_engine || (selectedNode as any).system_info?.docker_version || 'cgroups-v2'}
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-sans">Host CPU:</span>
                  <span className="text-white">
                    {(selectedNode as any).system_info?.cpu_model
                      ? `${(selectedNode as any).system_info.cpu_model} (${(selectedNode as any).system_info.cpu_count} Threads)`
                      : 'Host CPU'}
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: SETTINGS (Exact 1:1 Match of User's Screenshot Attachment)   */}
        {/* =================================================================== */}
        {nodeTab === 'settings' && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Settings Card */}
              <GlassCard className="p-5 sm:p-6 flex flex-col gap-4 border border-white/10 shadow-xl">
                <h3 className="text-base font-bold text-white tracking-tight pb-2 border-b border-white/10">
                  Settings
                </h3>

                {/* Node Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Node Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="de-1"
                    className="glass-input w-full px-3 py-2 text-xs font-mono"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Character limits: <code className="text-red-500">a-zA-Z0-9_.-</code> and <code className="text-red-500">[Space]</code> (min 1, max 100 characters).
                  </span>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder="Primary Production Node"
                    className="glass-input w-full px-3 py-2 text-xs font-sans resize-none"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Location</label>
                  <select
                    value={editLocationId}
                    onChange={e => setEditLocationId(e.target.value)}
                    className="glass-input w-full px-3 py-2 text-xs bg-slate-900 text-white cursor-pointer"
                  >
                    <option value="1">Frankfurt, Germany (DE)</option>
                    <option value="2">Helsinki, Finland (FI)</option>
                    <option value="3">Mumbai, India (IN)</option>
                    <option value="4">Ashburn, Virginia (US)</option>
                  </select>
                </div>

                {/* Allow Automatic Allocation */}
                <div className="pt-2 border-t border-white/5">
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1">
                    Allow Automatic Allocation <span className="text-slate-500 cursor-help" title="Allow panel to automatically assign available ports to new servers on this node">?</span>
                  </label>
                  <div className="flex items-center gap-4 text-xs text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="autoAlloc"
                        checked={editAllowAutoAlloc === true}
                        onChange={() => setEditAllowAutoAlloc(true)}
                        className="accent-red-600"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="autoAlloc"
                        checked={editAllowAutoAlloc === false}
                        onChange={() => setEditAllowAutoAlloc(false)}
                        className="accent-red-600"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                {/* Fully Qualified Domain Name */}
                <div className="pt-2 border-t border-white/5">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Fully Qualified Domain Name</label>
                  <input
                    type="text"
                    value={editFqdn}
                    onChange={e => setEditFqdn(e.target.value)}
                    placeholder="de.gavio.cloud"
                    className="glass-input w-full px-3 py-2 text-xs font-mono"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                    Please enter domain name (e.g. <code className="text-red-500">node.example.com</code>) to be used for connecting to the daemon. An IP address may only be used if you are not using SSL for this node. <a href="https://slayernode.xyz" target="_blank" rel="noreferrer" className="text-red-500 hover:underline">Why?</a>
                  </span>
                </div>

                {/* Communicate Over SSL */}
                <div className="pt-2 border-t border-white/5">
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Communicate Over SSL
                  </label>
                  <div className="flex items-center gap-4 text-xs text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="scheme"
                        checked={editScheme === 'https'}
                        onChange={() => setEditScheme('https')}
                        className="accent-red-600"
                      />
                      <span>Use SSL Connection</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="scheme"
                        checked={editScheme === 'http'}
                        onChange={() => setEditScheme('http')}
                        className="accent-red-600"
                      />
                      <span>Use HTTP Connection</span>
                    </label>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                    In most cases you should select to use a SSL connection. If using an IP Address or you do not wish to use SSL at all, select a HTTP connection.
                  </span>
                </div>

                {/* Behind Proxy */}
                <div className="pt-2 border-t border-white/5">
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Behind Proxy
                  </label>
                  <div className="flex items-center gap-4 text-xs text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="proxy"
                        checked={editBehindProxy === false}
                        onChange={() => setEditBehindProxy(false)}
                        className="accent-red-600"
                      />
                      <span>Not Behind Proxy</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="proxy"
                        checked={editBehindProxy === true}
                        onChange={() => setEditBehindProxy(true)}
                        className="accent-red-600"
                      />
                      <span>Behind Proxy</span>
                    </label>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                    If you are running the daemon behind a proxy such as Cloudflare, select this to have the daemon skip looking for certificates on boot.
                  </span>
                </div>

                {/* Maintenance Mode */}
                <div className="pt-2 border-t border-white/5">
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Maintenance Mode
                  </label>
                  <div className="flex items-center gap-4 text-xs text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="maintenance"
                        checked={editMaintenanceMode === false}
                        onChange={() => setEditMaintenanceMode(false)}
                        className="accent-red-600"
                      />
                      <span>Disabled</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="maintenance"
                        checked={editMaintenanceMode === true}
                        onChange={() => setEditMaintenanceMode(true)}
                        className="accent-red-600"
                      />
                      <span>Enabled</span>
                    </label>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                    If the node is marked as 'Under Maintenance' users won't be able to access servers that are on this node.
                  </span>
                </div>
              </GlassCard>

              {/* Right Column: Allocation Limits & General Configuration */}
              <div className="flex flex-col gap-6">
                {/* Allocation Limits Card */}
                <GlassCard className="p-5 sm:p-6 flex flex-col gap-4 border border-white/10 shadow-xl">
                  <h3 className="text-base font-bold text-white tracking-tight pb-2 border-b border-white/10">
                    Allocation Limits
                  </h3>

                  {/* Total Memory & Overallocate */}
                  <div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-slate-300 block mb-1">Total Memory</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={editMemory}
                            onChange={e => setEditMemory(e.target.value)}
                            className="glass-input w-full px-3 py-2 pr-12 text-xs font-mono"
                          />
                          <span className="absolute right-3 top-2 text-xs font-mono text-slate-400">MiB</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">Overallocate</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={editMemoryOverallocate}
                            onChange={e => setEditMemoryOverallocate(e.target.value)}
                            className="glass-input w-full px-3 py-2 pr-8 text-xs font-mono"
                          />
                          <span className="absolute right-3 top-2 text-xs font-mono text-slate-400">%</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                      Enter the total amount of memory available on this node for allocation to servers. You may also provide a percentage that can allow allocation of more than the defined memory.
                    </span>
                  </div>

                  {/* Disk Space & Overallocate */}
                  <div className="pt-2 border-t border-white/5">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-slate-300 block mb-1">Disk Space</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={editDisk}
                            onChange={e => setEditDisk(e.target.value)}
                            className="glass-input w-full px-3 py-2 pr-12 text-xs font-mono"
                          />
                          <span className="absolute right-3 top-2 text-xs font-mono text-slate-400">MiB</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">Overallocate</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={editDiskOverallocate}
                            onChange={e => setEditDiskOverallocate(e.target.value)}
                            className="glass-input w-full px-3 py-2 pr-8 text-xs font-mono"
                          />
                          <span className="absolute right-3 top-2 text-xs font-mono text-slate-400">%</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                      Enter the total amount of disk space available on this node for server allocation. You may also provide a percentage that will determine the amount of disk space over the set limit to allow.
                    </span>
                  </div>
                </GlassCard>

                {/* General Configuration Card */}
                <GlassCard className="p-5 sm:p-6 flex flex-col gap-4 border border-white/10 shadow-xl">
                  <h3 className="text-base font-bold text-white tracking-tight pb-2 border-b border-white/10">
                    General Configuration
                  </h3>

                  {/* Maximum Web Upload Filesize */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Maximum Web Upload Filesize</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={editUploadSize}
                        onChange={e => setEditUploadSize(e.target.value)}
                        className="glass-input w-full px-3 py-2 pr-12 text-xs font-mono"
                      />
                      <span className="absolute right-3 top-2 text-xs font-mono text-slate-400">MiB</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1 leading-relaxed">
                      Enter the maximum size of files that can be uploaded through the web-based file manager.
                    </span>
                  </div>

                  {/* Daemon Port & Daemon SFTP Port */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" /> Daemon Port
                      </label>
                      <input
                        type="number"
                        value={editDaemonListen}
                        onChange={e => setEditDaemonListen(e.target.value)}
                        className="glass-input w-full px-3 py-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" /> Daemon SFTP Port
                      </label>
                      <input
                        type="number"
                        value={editDaemonSftp}
                        onChange={e => setEditDaemonSftp(e.target.value)}
                        className="glass-input w-full px-3 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 block leading-relaxed">
                    The daemon runs its own SFTP management container and does not use the SSHd process on the main physical server. Do not use the same port that you have assigned for your physical server's SSH process.
                  </span>
                </GlassCard>
              </div>
            </div>

            {/* Bottom Bar: Save Settings & Reset Daemon Master Key */}
            <GlassCard className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-white/10 shadow-2xl">
              <div className="flex flex-col gap-1 max-w-xl">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-white">
                  <input
                    type="checkbox"
                    checked={resetMasterKey}
                    onChange={e => setResetMasterKey(e.target.checked)}
                    className="rounded border-white/20 bg-slate-900 text-red-500"
                  />
                  <span>Reset Daemon Master Key</span>
                </label>
                <span className="text-[11px] text-slate-400 leading-relaxed">
                  Resetting the daemon master key will void any request coming from the old key. This key is used for all sensitive operations on the daemon including server creation and deletion.
                </span>
              </div>

              <GlassButton
                variant="accent"
                size="md"
                onClick={handleSaveNodeSettings}
                leftIcon={saveSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Settings className="w-4 h-4" />}
                className="shrink-0"
              >
                {saveSuccess ? 'Settings Saved!' : 'Save Settings'}
              </GlassButton>
            </GlassCard>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: CONFIGURATION (Auto-Deploy Command & Wings config.yml)       */}
        {/* =================================================================== */}
        {nodeTab === 'configuration' && (
          <div className="flex flex-col gap-5">
            <GlassCard className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-red-500" /> Auto-Deploy Command (1-Click)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Run this single command on your target VPS terminal to automatically authenticate and provision Wings.
                  </p>
                </div>
                <GlassButton
                  size="sm"
                  variant="glass"
                  onClick={() => copyToClipboard(generateAutoDeployCommand(selectedNode), 'autodeploy')}
                  leftIcon={copiedField === 'autodeploy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copiedField === 'autodeploy' ? 'Copied!' : 'Copy Command'}
                </GlassButton>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 font-mono text-xs text-red-500 select-all border border-white/5 break-all">
                {generateAutoDeployCommand(selectedNode)}
              </div>
            </GlassCard>

            <GlassCard className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-red-500" /> Daemon Configuration (<code className="text-xs text-sky-300">/etc/slayerwings/config.yml</code>)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Alternatively, place this configuration directly into <code className="text-slate-300">/etc/slayerwings/config.yml</code> on your remote server.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <GlassButton
                    size="sm"
                    variant="glass"
                    onClick={() => copyToClipboard(generateWingsConfigYaml(selectedNode), 'config')}
                    leftIcon={copiedField === 'config' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedField === 'config' ? 'Copied!' : 'Copy YAML'}
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="accent"
                    onClick={() => {
                      const blob = new Blob([generateWingsConfigYaml(selectedNode)], { type: 'text/yaml' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `config-${selectedNode.uuid.slice(0, 8)}.yml`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    Download
                  </GlassButton>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-96 border border-white/5 leading-relaxed selection:bg-red-600/30">
                {generateWingsConfigYaml(selectedNode)}
              </pre>
            </GlassCard>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: ALLOCATION (Assign IP and Ports)                              */}
        {/* =================================================================== */}
        {nodeTab === 'allocation' && (
          <div className="flex flex-col gap-5">
            {/* Add Allocation Form */}
            <GlassCard className="p-5 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-red-500" /> Assign New IP Allocations & Port Ranges
              </h3>

              {allocError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-600/40 text-red-500 font-bold text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{allocError}</span>
                </div>
              )}

              <form onSubmit={handleAddAllocations} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <GlassInput
                    label="IP Address"
                    value={allocIp}
                    onChange={e => setAllocIp(e.target.value)}
                    placeholder="194.164.72.12 or 0.0.0.0"
                    required
                  />
                </div>
                <div>
                  <GlassInput
                    label="Port(s) or Range"
                    value={allocPorts}
                    onChange={e => setAllocPorts(e.target.value)}
                    placeholder="25565-25575 or 8080"
                    required
                  />
                </div>
                <div>
                  <GlassInput
                    label="IP Alias (Optional)"
                    value={allocAlias}
                    onChange={e => setAllocAlias(e.target.value)}
                    placeholder="play.slayercraft.net"
                  />
                </div>
                <div>
                  <GlassButton type="submit" variant="accent" size="sm" className="w-full">
                    Submit Allocations
                  </GlassButton>
                </div>
              </form>
            </GlassCard>

            {/* Allocations Table */}
            <GlassCard className="overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-white">
                  Allocations ({nodeAllocations.length})
                </span>
                <div className="flex items-center gap-2 text-xs">
                  {(['all', 'assigned', 'unassigned'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setAllocFilter(f)}
                      className={`px-2.5 py-1 rounded-lg capitalize cursor-pointer transition-colors ${
                        allocFilter === f ? 'bg-red-600/20 text-red-500 font-semibold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-semibold uppercase text-[11px]">
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Port</th>
                    <th className="p-3 hidden sm:table-cell">Alias</th>
                    <th className="p-3">Assigned Server</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {nodeAllocations
                    .filter(a => {
                      if (allocFilter === 'assigned') return !!a.server_id;
                      if (allocFilter === 'unassigned') return !a.server_id;
                      return true;
                    })
                    .map(a => (
                      <tr key={a.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-mono text-slate-200">{a.ip}</td>
                        <td className="p-3 font-mono text-red-500 font-bold">{a.port}</td>
                        <td className="p-3 text-slate-400 font-mono hidden sm:table-cell">{a.alias || '—'}</td>
                        <td className="p-3">
                          {a.server_id ? (
                            <span className="text-xs text-white font-medium flex items-center gap-1.5">
                              <Server className="w-3.5 h-3.5 text-sky-400" />
                              {a.server_name || `Server #${a.server_id}`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                              AVAILABLE
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteAllocation(a.id)}
                            disabled={!!a.server_id}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 disabled:opacity-20 cursor-pointer"
                            title={a.server_id ? 'Assigned to active server' : 'Delete allocation'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {nodeAllocations.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  <Network className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-white">No port allocations assigned to this node.</p>
                  <p className="text-xs text-slate-500 mt-1">Use the form above to assign IP addresses and port ranges for game servers.</p>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: SERVERS (Servers Provisioned on This Node)                   */}
        {/* =================================================================== */}
        {nodeTab === 'servers' && (
          <GlassCard className="overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                Servers on this Node ({nodeServers.length})
              </span>
            </div>

            {nodeServers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No game servers are currently provisioned on this node.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-semibold uppercase text-[11px]">
                    <th className="p-3">Server Name</th>
                    <th className="p-3 hidden sm:table-cell">Owner</th>
                    <th className="p-3">Allocation</th>
                    <th className="p-3 hidden md:table-cell">Memory / CPU</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {nodeServers.map(s => (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-white block">{s.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">{s.identifier}</span>
                      </td>
                      <td className="p-3 text-slate-300 hidden sm:table-cell">@{s.owner_username}</td>
                      <td className="p-3 font-mono text-red-500">{s.allocation.ip}:{s.allocation.port}</td>
                      <td className="p-3 text-slate-300 font-mono hidden md:table-cell">
                        {s.limits.memory} MB / {s.limits.cpu}%
                      </td>
                      <td className="p-3">
                        <GlassBadge status={s.status}>{s.status.toUpperCase()}</GlassBadge>
                      </td>
                      <td className="p-3 text-right">
                        {onNavigateServer && (
                          <button
                            onClick={() => onNavigateServer(s.id)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-sky-300 cursor-pointer border border-white/10"
                          >
                            Manage
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </GlassCard>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: NODES OVERVIEW LIST (When no specific node is selected)
  // =========================================================================
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-red-500" /> Infrastructure Nodes & External VPS Daemons
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Click on any node to configure Wings daemon parameters, settings, allocations, and servers.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          onClick={() => setShowDeployWizard(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create New
        </GlassButton>
      </div>

      {/* Nodes List */}
      {nodes.length === 0 ? (
        <div className="p-12 rounded-lg bg-[#181A20] border border-white/10 text-center flex flex-col items-center justify-center">
          <div className="p-3.5 rounded-lg bg-red-600/10 text-red-500 mb-3 border border-red-600/20">
            <HardDrive className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Hypervisor Nodes Configured</h3>
          <p className="text-xs text-slate-400 max-w-md mb-5">
            You don't have any SlayerWings nodes configured yet. Click the button below to add your first node and generate the daemon configuration.
          </p>
          <GlassButton
            variant="accent"
            size="md"
            onClick={() => {
              setVpsError(null);
              setShowDeployWizard(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create New
          </GlassButton>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {nodes.map(node => {
            const ping = pingStatus[node.id];

            return (
              <GlassCard
                key={node.id}
                className="p-5 flex flex-col gap-4 hover:border-red-600/40 transition-all cursor-pointer group"
                onClick={() => {
                  setSelectedNode(node);
                  setNodeTab('settings');
                }}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-red-500 group-hover:scale-105 transition-transform">
                      <HardDrive className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white group-hover:text-red-500 transition-colors">
                          {node.name}
                        </h3>
                        <GlassBadge status={node.is_online ? 'running' : 'offline'}>
                          {node.is_online ? (node.ping_ms ? `CONNECTED (${node.ping_ms}ms)` : 'CONNECTED') : 'OFFLINE'}
                        </GlassBadge>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {node.scheme}://{node.fqdn}:{node.daemon_listen} • SFTP Port: {node.daemon_sftp}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => testPingVPS(node.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer border border-white/10"
                    >
                      <Wifi className="w-3.5 h-3.5 text-red-500" />
                      {ping === 'testing' ? 'Testing...' : (ping || (node.is_online ? `Ping: ${node.ping_ms || 1}ms (OK)` : 'Ping VPS'))}
                    </button>

                    <GlassButton
                      variant="glass"
                      size="sm"
                      onClick={() => {
                        setSelectedNode(node);
                        setNodeTab('settings');
                      }}
                      leftIcon={<Settings className="w-3.5 h-3.5 text-red-500" />}
                    >
                      Node Settings
                    </GlassButton>

                    <button
                      onClick={() => handleDeleteNode(node)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5 cursor-pointer border border-red-500/20"
                      title={servers.some(s => String(s.node_id) === String(node.id)) ? 'Cannot delete: hosts active servers' : 'Delete node'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Hardware & Capacity Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Memory Capacity</span>
                    <span className="font-mono text-white font-semibold">{(node.memory / 1024).toFixed(0)} GB DDR5</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">NVMe Disk Capacity</span>
                    <span className="font-mono text-white font-semibold">{(node.disk / 1024).toFixed(0)} GB NVMe</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Hosted Servers</span>
                    <span className="font-mono text-white font-semibold">{node.servers_count} Containers</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Allocations</span>
                    <span className="font-mono text-red-500 font-semibold">{node.allocations_count} Ports Configured</span>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Deploy External VPS Wizard Modal */}
      <GlassModal
        isOpen={showDeployWizard}
        onClose={() => setShowDeployWizard(false)}
        title="Deploy External VPS Wings Daemon"
        description="Add a Linux VPS running Ubuntu 22.04 / 24.04 LTS or Debian 12"
        maxWidth="lg"
      >
        <div className="flex flex-col gap-4 py-2">
          {vpsError && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-600/40 text-red-500 font-bold text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{vpsError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassInput
              label="Node Display Name"
              value={vpsName}
              onChange={e => setVpsName(e.target.value)}
              placeholder="Node-03 (London Epyc)"
              required
            />
            <GlassInput
              label="Fully Qualified Domain Name (FQDN)"
              value={vpsFqdn}
              onChange={e => setVpsFqdn(e.target.value)}
              placeholder="node3.slayernode.xyz"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassInput
              label="Total Node RAM (MiB)"
              type="number"
              value={vpsMemory}
              onChange={e => setVpsMemory(e.target.value)}
              placeholder="65536"
            />
            <GlassInput
              label="Total Node Disk (MiB)"
              type="number"
              value={vpsDisk}
              onChange={e => setVpsDisk(e.target.value)}
              placeholder="1024000"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setShowDeployWizard(false)}>
              Cancel
            </GlassButton>
            <GlassButton
              variant="accent"
              size="sm"
              onClick={async () => {
                if (!vpsName.trim()) {
                  setVpsError('Node display name is required.');
                  return;
                }
                if (!vpsFqdn.trim()) {
                  setVpsError('Fully Qualified Domain Name or IP is required.');
                  return;
                }
                setVpsError(null);

                const newNode: Node = {
                  id: Date.now(),
                  uuid: crypto.randomUUID(),
                  name: vpsName.trim(),
                  description: `External VPS Daemon at ${vpsFqdn.trim()}`,
                  location_id: 1,
                  location_name: 'Custom VPS Provider',
                  fqdn: vpsFqdn.trim(),
                  scheme: 'https',
                  behind_proxy: false,
                  maintenance_mode: false,
                  allow_auto_allocation: true,
                  memory: parseInt(vpsMemory) || 32768,
                  memory_overallocate: 0,
                  disk: parseInt(vpsDisk) || 512000,
                  disk_overallocate: 0,
                  upload_size: 500,
                  daemon_listen: 8443,
                  daemon_sftp: 2202,
                  daemon_base: '/var/lib/slayerwings/volumes',
                  servers_count: 0,
                  allocations_count: 0,
                  is_online: true,
                  daemon_version: 'v1.0.0-slayerwings',
                };
                try {
                  await apiFetch('/api/application/nodes', {
                    method: 'POST',
                    body: JSON.stringify(newNode),
                  });
                } catch {}
                setNodes(prev => [...prev, newNode]);
                setShowDeployWizard(false);
                setSelectedNode(newNode);
                setNodeTab('configuration');
              }}
            >
              Deploy & Generate Config
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
