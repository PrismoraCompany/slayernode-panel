import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Server,
  Layers,
  Cpu,
  HardDrive,
  Database,
  Radio,
  Check,
  AlertTriangle,
  Loader2,
  Box,
  Terminal,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { GlassBadge } from '../ui/GlassBadge';
import { Node, User, Nest, Egg } from '../../types';

interface CreateServerViewProps {
  onBack: () => void;
  onServerCreated: (server: any) => void;
}

export const CreateServerView: React.FC<CreateServerViewProps> = ({ onBack, onServerCreated }) => {
  // Data sources
  const [nodes, setNodes] = useState<Node[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [nests, setNests] = useState<Nest[]>([]);
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);

  // Core Details
  const [serverName, setServerName] = useState('');
  const [serverDesc, setServerDesc] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [startOnDeploy, setStartOnDeploy] = useState(true);

  // Allocation Management
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedAllocId, setSelectedAllocId] = useState('');
  const [additionalAllocs, setAdditionalAllocs] = useState('');

  // Feature Limits
  const [databaseLimit, setDatabaseLimit] = useState('0');
  const [allocationLimit, setAllocationLimit] = useState('0');
  const [backupLimit, setBackupLimit] = useState('0');

  // Resource Management
  const [cpuLimit, setCpuLimit] = useState('0');
  const [cpuPinning, setCpuPinning] = useState('');
  const [memoryLimit, setMemoryLimit] = useState('2048');
  const [swapLimit, setSwapLimit] = useState('0');
  const [diskLimit, setDiskLimit] = useState('10240');
  const [blockIoWeight, setBlockIoWeight] = useState('500');
  const [enableOomKiller, setEnableOomKiller] = useState(false);

  // Nest & Egg Configuration
  const [selectedNestId, setSelectedNestId] = useState('');
  const [selectedEggId, setSelectedEggId] = useState('');
  const [skipEggScript, setSkipEggScript] = useState(false);

  // Docker Configuration
  const [dockerImage, setDockerImage] = useState('ghcr.io/pterodactyl/yolks:java_25');
  const [customDockerImage, setCustomDockerImage] = useState('');

  // Startup Configuration
  const [startupCommand, setStartupCommand] = useState(
    'java -Xms128M -XX:MaxRAMPercentage=95.0 -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}'
  );

  // Service Variables
  const [minecraftVersion, setMinecraftVersion] = useState('latest');
  const [serverJarFile, setServerJarFile] = useState('server.jar');
  const [downloadPath, setDownloadPath] = useState('');
  const [buildNumber, setBuildNumber] = useState('latest');

  // Creation Status & Progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationStep, setCreationStep] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Initial Metadata
  useEffect(() => {
    const fetchData = async () => {
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
      } catch (err) {
        console.error('Failed loading server creation options:', err);
      }
    };
    fetchData();
  }, []);

  // Fetch eggs when nest changes
  useEffect(() => {
    if (!selectedNestId) return;
    const fetchEggs = async () => {
      try {
        const res = await fetch(`/api/application/nests/${selectedNestId}/eggs`);
        if (res.ok) {
          const d = await res.json();
          const loadedEggs = d.data.map((x: any) => x.attributes);
          setEggs(loadedEggs);
          if (loadedEggs.length > 0) {
            setSelectedEggId(String(loadedEggs[0].id));
            if (loadedEggs[0].startup) {
              setStartupCommand(loadedEggs[0].startup);
            }
          }
        }
      } catch {}
    };
    fetchEggs();
  }, [selectedNestId]);

  // Fetch allocations when node changes
  useEffect(() => {
    if (!selectedNodeId) return;
    const fetchAllocations = async () => {
      try {
        const res = await fetch(`/api/application/nodes/${selectedNodeId}/allocations`);
        if (res.ok) {
          const d = await res.json();
          const loadedAllocs = d.data.map((x: any) => x.attributes);
          setAllocations(loadedAllocs);
          const unassigned = loadedAllocs.filter((a: any) => !a.server_id);
          if (unassigned.length > 0) {
            setSelectedAllocId(String(unassigned[0].id));
          } else if (loadedAllocs.length > 0) {
            setSelectedAllocId(String(loadedAllocs[0].id));
          }
        }
      } catch {}
    };
    fetchAllocations();
  }, [selectedNodeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!serverName.trim()) {
      setErrorMsg('Server Name is required.');
      return;
    }
    if (!selectedNodeId) {
      setErrorMsg('A valid infrastructure node must be selected.');
      return;
    }
    if (!selectedOwnerId) {
      setErrorMsg('A server owner must be selected.');
      return;
    }

    setIsSubmitting(true);
    setCreationStep('Allocating server volume and configuring container daemon...');

    try {
      const payload = {
        name: serverName.trim(),
        description: serverDesc.trim(),
        owner_id: parseInt(selectedOwnerId) || selectedOwnerId,
        node_id: parseInt(selectedNodeId) || selectedNodeId,
        allocation_id: parseInt(selectedAllocId) || selectedAllocId,
        nest_id: parseInt(selectedNestId) || 1,
        egg_id: parseInt(selectedEggId) || 1,
        memory: parseInt(memoryLimit) || 2048,
        swap: parseInt(swapLimit) || 0,
        disk: parseInt(diskLimit) || 10240,
        cpu: parseInt(cpuLimit) || 100,
        io: parseInt(blockIoWeight) || 500,
        start_on_deploy: startOnDeploy,
        docker_image: customDockerImage.trim() || dockerImage,
        startup: startupCommand,
        environment: {
          MINECRAFT_VERSION: minecraftVersion,
          SERVER_JARFILE: serverJarFile,
          DL_PATH: downloadPath,
          BUILD_NUMBER: buildNumber,
        },
      };

      const res = await fetch('/api/application/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to provision server on node.');
      }

      setCreationStep('Container instance registered. Initializing daemon filesystem...');
      const created = await res.json();

      setTimeout(() => {
        setIsSubmitting(false);
        onServerCreated(created.attributes || created);
      }, 700);
    } catch (err: any) {
      setIsSubmitting(false);
      setCreationStep(null);
      setErrorMsg(err.message || 'Error occurred while creating server.');
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-white/50 mb-1">
            <span>Admin</span>
            <span>&gt;</span>
            <button onClick={onBack} className="hover:text-cyan-400 transition-colors">
              Servers
            </button>
            <span>&gt;</span>
            <span className="text-cyan-400 font-semibold">Create Server</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/10"
              title="Return to Servers List"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Create Server
            </h1>
          </div>
          <p className="text-sm text-white/60 ml-9">Add a new server to the panel.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Core Details */}
        <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02]">
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              Core Details
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Server Name
              </label>
              <input
                type="text"
                value={serverName}
                onChange={e => setServerName(e.target.value)}
                placeholder="My Minecraft World"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/80 transition-colors text-sm"
              />
              <p className="mt-1 text-[11px] text-white/40">
                Character limits: <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">a-z A-Z 0-9 _ - .</code> and <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">[Space]</code>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Server Description
              </label>
              <textarea
                value={serverDesc}
                onChange={e => setServerDesc(e.target.value)}
                rows={2}
                placeholder="A brief description of this server."
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/80 transition-colors text-sm resize-none"
              />
              <p className="mt-1 text-[11px] text-white/40">A brief description of this server.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Server Owner
              </label>
              <select
                value={selectedOwnerId}
                onChange={e => setSelectedOwnerId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400/80 transition-colors text-sm"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                    {u.email} ({u.username})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-white/40">Email address of the Server Owner.</p>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <label className="relative flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={startOnDeploy}
                  onChange={e => setStartOnDeploy(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 rounded-md border border-white/20 peer-checked:bg-cyan-500 peer-checked:border-cyan-400 flex items-center justify-center transition-all bg-black/40">
                  {startOnDeploy && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                </div>
                <span className="text-sm font-medium text-white/90">
                  Start Server when Installed
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 2: Allocation Management */}
        <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02]">
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              Allocation Management
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Node
              </label>
              <select
                value={selectedNodeId}
                onChange={e => setSelectedNodeId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400/80 transition-colors text-sm"
              >
                {nodes.map(n => (
                  <option key={n.id} value={n.id} className="bg-slate-900 text-white">
                    {n.name} ({n.fqdn})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-white/40">The node which this server will be deployed to.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Default Allocation
              </label>
              <select
                value={selectedAllocId}
                onChange={e => setSelectedAllocId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400/80 transition-colors text-sm"
              >
                {allocations.length === 0 ? (
                  <option value="" className="bg-slate-900 text-white">
                    Auto-assign (25565+)
                  </option>
                ) : (
                  allocations.map(a => (
                    <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                      {a.ip}:{a.port} {a.alias ? `(${a.alias})` : ''} {a.server_id ? '[Assigned]' : '[Available]'}
                    </option>
                  ))
                )}
              </select>
              <p className="mt-1 text-[11px] text-white/40">The main allocation that will be assigned to this server.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Additional Allocation(s)
              </label>
              <input
                type="text"
                value={additionalAllocs}
                onChange={e => setAdditionalAllocs(e.target.value)}
                placeholder="Select Additional Allocations"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/80 transition-colors text-sm"
              />
              <p className="mt-1 text-[11px] text-white/40">Additional allocations to assign to this server on creation.</p>
            </div>
          </div>
        </div>

        {/* SECTION 3: Application Feature Limits */}
        <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02]">
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              Application Feature Limits
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Database Limit
              </label>
              <input
                type="number"
                min="0"
                value={databaseLimit}
                onChange={e => setDatabaseLimit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400/80 transition-colors text-sm font-mono"
              />
              <p className="mt-1 text-[11px] text-white/40">The total number of databases a user is allowed to create for this server.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Allocation Limit
              </label>
              <input
                type="number"
                min="0"
                value={allocationLimit}
                onChange={e => setAllocationLimit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400/80 transition-colors text-sm font-mono"
              />
              <p className="mt-1 text-[11px] text-white/40">The total number of allocations a user is allowed to create for this server.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Backup Limit
              </label>
              <input
                type="number"
                min="0"
                value={backupLimit}
                onChange={e => setBackupLimit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400/80 transition-colors text-sm font-mono"
              />
              <p className="mt-1 text-[11px] text-white/40">The total number of backups that can be created for this server.</p>
            </div>
          </div>
        </div>

        {/* SECTION 4: Resource Management */}
        <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02]">
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Resource Management
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                CPU Limit
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={cpuLimit}
                  onChange={e => setCpuLimit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white pr-10 focus:outline-none focus:border-cyan-400/80 transition-colors text-sm font-mono"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-white/40 font-mono">%</span>
              </div>
              <p className="mt-1 text-[11px] text-white/40 leading-relaxed">
                If you do not want to limit CPU usage, set the value to <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">0</code>. To determine a value, take the number of threads and multiply it by 100. For example, on a quad core system without hyperthreading (<code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">4 * 100 = 400</code>) there is <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">400%</code> available.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                CPU Pinning
              </label>
              <input
                type="text"
                value={cpuPinning}
                onChange={e => setCpuPinning(e.target.value)}
                placeholder="e.g. 0, 1-3"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/80 transition-colors text-sm font-mono"
              />
              <p className="mt-1 text-[11px] text-white/40 leading-relaxed">
                <span className="text-white/60 font-semibold">Advanced:</span> Enter the specific CPU threads that this process can run on, or leave blank to allow all threads. Example: <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">0</code>, <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">0-1, 3</code>, or <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">0, 1, 3, 4</code>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Memory
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={memoryLimit}
                  onChange={e => setMemoryLimit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white pr-12 focus:outline-none focus:border-cyan-400/80 transition-colors text-sm font-mono"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-white/40 font-mono">MiB</span>
              </div>
              <p className="mt-1 text-[11px] text-white/40">
                The maximum amount of memory allowed for this container. Setting this to <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">0</code> will allow unlimited memory in a container.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Swap
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="-1"
                  value={swapLimit}
                  onChange={e => setSwapLimit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white pr-12 focus:outline-none focus:border-cyan-400/80 transition-colors text-sm font-mono"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-white/40 font-mono">MiB</span>
              </div>
              <p className="mt-1 text-[11px] text-white/40">
                Setting this to <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">0</code> will disable swap space on this server. Setting to <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">-1</code> will allow unlimited swap.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Disk Space
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={diskLimit}
                  onChange={e => setDiskLimit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white pr-12 focus:outline-none focus:border-cyan-400/80 transition-colors text-sm font-mono"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-white/40 font-mono">MiB</span>
              </div>
              <p className="mt-1 text-[11px] text-white/40">
                This server will not be allowed to boot if it is using more than this amount of space. If a server goes over this limit while running it will be safely stopped. Set to <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">0</code> to allow unlimited disk usage.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Block IO Weight
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                value={blockIoWeight}
                onChange={e => setBlockIoWeight(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400/80 transition-colors text-sm font-mono"
              />
              <p className="mt-1 text-[11px] text-white/40">
                <span className="text-white/60 font-semibold">Advanced:</span> The IO performance of this server relative to other running containers on the system. Value should be between <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">10</code> and <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">1000</code>.
              </p>
            </div>

            <div className="md:col-span-2 pt-2">
              <label className="relative flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enableOomKiller}
                  onChange={e => setEnableOomKiller(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-5 h-5 rounded-md border border-white/20 peer-checked:bg-red-500 peer-checked:border-red-400 flex items-center justify-center transition-all bg-black/40">
                  {enableOomKiller && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </div>
                <div>
                  <span className="text-sm font-medium text-white/90">
                    Enable OOM Killer
                  </span>
                  <p className="text-[11px] text-white/40">
                    Terminates the server if it breaches the memory limits. Enabling OOM killer may cause server processes to exit unexpectedly.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 5: Nest Configuration & Docker Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nest Configuration Card */}
          <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02]">
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Nest Configuration
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                  Nest
                </label>
                <select
                  value={selectedNestId}
                  onChange={e => setSelectedNestId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400/80 transition-colors text-sm"
                >
                  {nests.map(n => (
                    <option key={n.id} value={n.id} className="bg-slate-900 text-white">
                      {n.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-white/40">Select the Nest that this server will be grouped under.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                  Egg
                </label>
                <select
                  value={selectedEggId}
                  onChange={e => setSelectedEggId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400/80 transition-colors text-sm"
                >
                  {eggs.map(eg => (
                    <option key={eg.id} value={eg.id} className="bg-slate-900 text-white">
                      {eg.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-white/40">Select the Egg that will define how this server should operate.</p>
              </div>

              <div className="pt-2">
                <label className="relative flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipEggScript}
                    onChange={e => setSkipEggScript(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-md border border-white/20 peer-checked:bg-cyan-500 peer-checked:border-cyan-400 flex items-center justify-center transition-all bg-black/40">
                    {skipEggScript && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white/90">
                      Skip Egg Install Script
                    </span>
                    <p className="text-[11px] text-white/40">
                      If the selected Egg has an install script attached to it, the script will run during the install. If you would like to skip this step, check this box.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Docker Configuration Card */}
          <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02]">
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2">
                <Box className="w-4 h-4 text-cyan-400" />
                Docker Configuration
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                  Docker Image
                </label>
                <select
                  value={dockerImage}
                  onChange={e => setDockerImage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400/80 transition-colors text-sm font-mono"
                >
                  <option value="ghcr.io/pterodactyl/yolks:java_25" className="bg-slate-900 text-white">
                    Java 25 (ghcr.io/pterodactyl/yolks:java_25)
                  </option>
                  <option value="ghcr.io/pterodactyl/yolks:java_21" className="bg-slate-900 text-white">
                    Java 21 (ghcr.io/pterodactyl/yolks:java_21)
                  </option>
                  <option value="ghcr.io/pterodactyl/yolks:java_17" className="bg-slate-900 text-white">
                    Java 17 (ghcr.io/pterodactyl/yolks:java_17)
                  </option>
                  <option value="ghcr.io/pterodactyl/yolks:java_8" className="bg-slate-900 text-white">
                    Java 8 (ghcr.io/pterodactyl/yolks:java_8)
                  </option>
                  <option value="ghcr.io/pterodactyl/yolks:nodejs_20" className="bg-slate-900 text-white">
                    Node.js 20 (ghcr.io/pterodactyl/yolks:nodejs_20)
                  </option>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  value={customDockerImage}
                  onChange={e => setCustomDockerImage(e.target.value)}
                  placeholder="Or enter a custom image..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/80 transition-colors text-sm font-mono"
                />
                <p className="mt-1 text-[11px] text-white/40 leading-relaxed">
                  This is the default Docker image that will be used to run this server. Select an image from the dropdown above, or enter a custom image in the text field above.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 6: Startup Configuration */}
        <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02]">
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Startup Configuration
            </h2>
          </div>
          <div className="p-6 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Startup Command
              </label>
              <input
                type="text"
                value={startupCommand}
                onChange={e => setStartupCommand(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-cyan-300 font-mono text-sm focus:outline-none focus:border-cyan-400/80 transition-colors"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/50">
                <span>The following data substitutes are available for the startup command:</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[11px] text-cyan-300">{`{{SERVER_MEMORY}}`}</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[11px] text-cyan-300">{`{{SERVER_IP}}`}</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[11px] text-cyan-300">{`{{SERVER_PORT}}`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 7: Service Variables */}
        <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02]">
            <h2 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              Service Variables
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Minecraft Version
              </label>
              <input
                type="text"
                value={minecraftVersion}
                onChange={e => setMinecraftVersion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-cyan-400/80 transition-colors"
              />
              <p className="mt-1 text-[11px] text-white/40">The version of minecraft to download. Leave at latest to always get the latest version.</p>
              <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="px-1.5 py-0.5 rounded bg-black/30 text-white/50 border border-white/5">
                  Access In Startup: <span className="text-cyan-300">{`{{MINECRAFT_VERSION}}`}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/30 text-white/50 border border-white/5">
                  Validation Rules: <span className="text-yellow-300">nullable|string|max:20</span>
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Server Jar File
              </label>
              <input
                type="text"
                value={serverJarFile}
                onChange={e => setServerJarFile(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-cyan-400/80 transition-colors"
              />
              <p className="mt-1 text-[11px] text-white/40">The name of the server jarfile to run the server with.</p>
              <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="px-1.5 py-0.5 rounded bg-black/30 text-white/50 border border-white/5">
                  Access In Startup: <span className="text-cyan-300">{`{{SERVER_JARFILE}}`}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/30 text-white/50 border border-white/5">
                  Validation Rules: <span className="text-yellow-300">required|regex:/^([\w\d._-]+)(\.jar)$/</span>
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Download Path
              </label>
              <input
                type="text"
                value={downloadPath}
                onChange={e => setDownloadPath(e.target.value)}
                placeholder="https://example.com/build.jar"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-cyan-400/80 transition-colors"
              />
              <p className="mt-1 text-[11px] text-white/40">A URL to use to download a server jar rather than the ones in the install script.</p>
              <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="px-1.5 py-0.5 rounded bg-black/30 text-white/50 border border-white/5">
                  Access In Startup: <span className="text-cyan-300">{`{{DL_PATH}}`}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/30 text-white/50 border border-white/5">
                  Validation Rules: <span className="text-yellow-300">nullable|string</span>
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                Build Number
              </label>
              <input
                type="text"
                value={buildNumber}
                onChange={e => setBuildNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-cyan-400/80 transition-colors"
              />
              <p className="mt-1 text-[11px] text-white/40">The build number for the paper release. Leave at latest to always get the latest version.</p>
              <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="px-1.5 py-0.5 rounded bg-black/30 text-white/50 border border-white/5">
                  Access In Startup: <span className="text-cyan-300">{`{{BUILD_NUMBER}}`}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/30 text-white/50 border border-white/5">
                  Validation Rules: <span className="text-yellow-300">required|string|max:20</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors text-sm font-medium border border-white/10"
          >
            Cancel
          </button>

          <div className="flex items-center gap-4">
            {creationStep && (
              <span className="text-xs text-cyan-300 flex items-center gap-2 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {creationStep}
              </span>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deploying Server...
                </>
              ) : (
                'Create Server'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
