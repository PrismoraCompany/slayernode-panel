import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Server as ServerIcon,
  Users,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Network,
  Radio,
  Plus,
  Cpu,
} from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { Node, User } from '../../types';

interface AdminDashboardProps {
  onNavigateTab: (tabId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  const { servers } = useServer();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nodesRes, usersRes] = await Promise.all([
          fetch('/api/application/nodes'),
          fetch('/api/application/users'),
        ]);

        if (nodesRes.ok) {
          const d = await nodesRes.json();
          if (Array.isArray(d.data)) {
            setNodes(d.data.map((x: any) => x.attributes || x));
          }
        }
        if (usersRes.ok) {
          const u = await usersRes.json();
          if (Array.isArray(u.data)) {
            setUsers(u.data.map((x: any) => x.attributes || x));
          }
        }
      } catch (e) {
        console.error('Error fetching admin telemetry:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalAllocatedRamMb = servers.reduce((acc, s) => acc + (s.limits?.memory || 0), 0);
  const totalAllocatedRamGb = (totalAllocatedRamMb / 1024).toFixed(1);
  const onlineNodes = nodes.filter(n => n.is_online !== false);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Quick Jump Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/10 text-red-500 text-[11px] font-bold tracking-wide border border-red-600/20">
              <Radio className="w-3 h-3 animate-pulse text-red-500" /> Cluster Operations Center
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            Administrative Control Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Global hypervisor node telemetry, distributed container quotas, and security boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('admin-studio')}
            className="px-4 py-2 rounded-lg bg-[#181A20] hover:bg-[#22252D] text-white text-xs font-semibold border border-white/10 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-red-500" /> Appearance Studio
          </button>
          <button
            onClick={() => onNavigateTab('admin-nodes')}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-[0_0_16px_rgba(220,38,38,0.3)] flex items-center gap-2 cursor-pointer"
          >
            <HardDrive className="w-4 h-4" /> Manage Nodes
          </button>
        </div>
      </div>

      {/* 2. Core Engine Status Banner */}
      <div className="p-4 sm:p-5 rounded-lg bg-[#181A20] border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-red-600/10 text-red-500 border border-red-600/20 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">SlayerNode Engine Active</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-red-600/10 text-red-400 border border-red-600/30">
                SECURE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Hypervisor Cluster Isolation • SlayerWings Ports: 8443 / 2202 (SFTP)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
          <span className="flex items-center gap-1.5 bg-[#111216] px-3 py-1.5 rounded-lg border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-red-500" /> Root Protection Enforced
          </span>
        </div>
      </div>

      {/* 3. Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Nodes Card */}
        <div className="p-4 rounded-lg bg-[#181A20] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-slate-300">
              <HardDrive className="w-4 h-4 text-red-500" /> Active Nodes
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-red-600/10 text-red-400 border border-red-600/20 font-bold">
              {onlineNodes.length}/{nodes.length} ONLINE
            </span>
          </div>
          <span className="text-2xl font-black text-white font-mono tabular-nums my-2">
            {nodes.length} {nodes.length === 1 ? 'Node' : 'Nodes'}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {nodes.length === 0 ? 'No daemons connected' : `${onlineNodes.length} SlayerWings synced`}
          </span>
        </div>

        {/* Servers Card */}
        <div className="p-4 rounded-lg bg-[#181A20] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-slate-300">
              <ServerIcon className="w-4 h-4 text-red-500" /> Total Servers
            </span>
            <span className="text-slate-300 font-bold font-mono text-[11px]">
              {servers.length} Active
            </span>
          </div>
          <span className="text-2xl font-black text-white font-mono tabular-nums my-2">
            {servers.length} {servers.length === 1 ? 'Instance' : 'Instances'}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            across {nodes.length} {nodes.length === 1 ? 'datacenter' : 'datacenters'}
          </span>
        </div>

        {/* RAM Card */}
        <div className="p-4 rounded-lg bg-[#181A20] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-slate-300">
              <Activity className="w-4 h-4 text-red-500" /> Memory Allocated
            </span>
            <span className="text-slate-300 font-bold font-mono text-[11px]">
              {totalAllocatedRamGb} GB Total
            </span>
          </div>
          <span className="text-2xl font-black text-white font-mono tabular-nums my-2">
            {totalAllocatedRamMb} MB
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            committed to game containers
          </span>
        </div>

        {/* Users Card */}
        <div className="p-4 rounded-lg bg-[#181A20] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-slate-300">
              <Users className="w-4 h-4 text-red-500" /> User Accounts
            </span>
            <span className="text-slate-300 font-bold font-mono text-[11px]">
              {users.length} {users.length === 1 ? 'Account' : 'Accounts'}
            </span>
          </div>
          <span className="text-2xl font-black text-white font-mono tabular-nums my-2">
            {users.length} {users.length === 1 ? 'User' : 'Users'}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            1 Protected Root Admin
          </span>
        </div>
      </div>

      {/* 4. Quick Administrative Action Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateTab('admin-servers')}
          className="p-3.5 rounded-lg bg-[#181A20] hover:bg-[#22252D] border border-white/10 transition-colors text-left flex items-center justify-between group cursor-pointer"
        >
          <div>
            <span className="text-xs font-bold text-white block group-hover:text-red-500 transition-colors">
              Provision Server
            </span>
            <span className="text-[11px] text-slate-400">Deploy with Egg wizard</span>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-red-500 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={() => onNavigateTab('admin-nodes')}
          className="p-3.5 rounded-lg bg-[#181A20] hover:bg-[#22252D] border border-white/10 transition-colors text-left flex items-center justify-between group cursor-pointer"
        >
          <div>
            <span className="text-xs font-bold text-white block group-hover:text-red-500 transition-colors">
              Deploy Node
            </span>
            <span className="text-[11px] text-slate-400">Generate wings YAML</span>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-red-500 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={() => onNavigateTab('admin-users')}
          className="p-3.5 rounded-lg bg-[#181A20] hover:bg-[#22252D] border border-white/10 transition-colors text-left flex items-center justify-between group cursor-pointer"
        >
          <div>
            <span className="text-xs font-bold text-white block group-hover:text-red-500 transition-colors">
              User Accounts
            </span>
            <span className="text-[11px] text-slate-400">Create & manage RBAC</span>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-red-500 group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={() => onNavigateTab('admin-activity')}
          className="p-3.5 rounded-lg bg-[#181A20] hover:bg-[#22252D] border border-white/10 transition-colors text-left flex items-center justify-between group cursor-pointer"
        >
          <div>
            <span className="text-xs font-bold text-white block group-hover:text-red-500 transition-colors">
              Security Audit
            </span>
            <span className="text-[11px] text-slate-400">Review system events</span>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-red-500 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 5. Hypervisor Bare-Metal Node Telemetry */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Network className="w-4 h-4 text-red-500" /> Bare-Metal Node Hypervisor Status
          </h3>
          <span className="text-xs text-slate-400 font-mono">Ports: 8443 (API) • 2202 (SFTP)</span>
        </div>

        {nodes.length === 0 ? (
          <div className="p-8 rounded-lg bg-[#181A20] border border-white/10 text-center flex flex-col items-center justify-center">
            <div className="p-3 rounded-lg bg-red-600/10 text-red-500 mb-3 border border-red-600/20">
              <HardDrive className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">No Hypervisor Nodes Connected</h4>
            <p className="text-xs text-slate-400 max-w-md mb-4">
              Deploy your first node with the SlayerWings engine on any Linux VPS or server to begin provisioning game servers.
            </p>
            <button
              onClick={() => onNavigateTab('admin-nodes')}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_16px_rgba(220,38,38,0.3)]"
            >
              <Plus className="w-4 h-4" /> Deploy First Node
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nodes.map(node => (
              <div
                key={node.id}
                className="p-5 rounded-lg bg-[#181A20] border border-white/10 flex flex-col justify-between shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${node.is_online !== false ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <h4 className="text-sm font-bold text-white">{node.name}</h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-red-600/10 text-red-400 border border-red-600/20">
                      {node.is_online !== false ? 'SLAYERWINGS ONLINE' : 'OFFLINE'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 text-xs font-mono">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span className="font-sans">Memory Limit: {node.memory.toLocaleString()} MB</span>
                        <span className="font-bold text-white">{node.memory_overallocate}% Overalloc</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#111216] rounded-lg overflow-hidden">
                        <div className="h-full bg-red-600 rounded-lg" style={{ width: '10%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span className="font-sans">Disk Capacity: {node.disk.toLocaleString()} MB</span>
                        <span className="font-bold text-white">{node.disk_overallocate}% Overalloc</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#111216] rounded-lg overflow-hidden">
                        <div className="h-full bg-white/40 rounded-lg" style={{ width: '10%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-4 text-xs">
                  <span className="text-slate-400 font-mono">{node.fqdn}:{node.daemon_listen}</span>
                  <button
                    onClick={() => onNavigateTab('admin-nodes')}
                    className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    Inspect Hypervisor <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
