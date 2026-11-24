import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Server as ServerIcon,
  Search,
  Pin,
  Play,
  RotateCcw,
  Square,
  Cpu,
  HardDrive,
  Activity,
  ArrowUpRight,
  Copy,
  Check,
  Grid,
  List,
  Plus,
} from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';

interface ServerDashboardProps {
  onSelectServerDetail: (serverId: string) => void;
  onNavigateAdminServer?: () => void;
}

export const ServerDashboard: React.FC<ServerDashboardProps> = ({
  onSelectServerDetail,
  onNavigateAdminServer,
}) => {
  const { servers, selectServer, togglePinServer, sendPowerAction } = useServer();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'running' | 'offline' | 'pinned'>('all');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  const runningCount = servers.filter(s => s.status === 'running').length;
  const offlineCount = servers.filter(s => s.status === 'offline').length;
  const pinnedCount = servers.filter(s => s.pinned).length;

  const copyToClipboard = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedIp(id);
    setTimeout(() => setCopiedIp(null), 1800);
  };

  // Filter & sort
  const filteredServers = servers
    .filter(s => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.node.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.allocation.ip.includes(searchTerm) ||
        String(s.allocation.port).includes(searchTerm) ||
        s.egg_name.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;
      if (filterStatus === 'running') return s.status === 'running';
      if (filterStatus === 'offline') return s.status === 'offline';
      if (filterStatus === 'pinned') return s.pinned;
      return true;
    })
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  // ========================================================
  // FRESH INSTALL / ZERO-SERVER EMPTY STATE
  // ========================================================
  if (servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] p-6 text-center">
        <div className="p-5 rounded-xl bg-[#181A20] border border-white/10 text-slate-400 mb-4 shadow-xl">
          <ServerIcon className="w-10 h-10 text-[#DC2626]" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          There are no servers linked to your account.
        </h2>
        <p className="text-xs text-slate-400 mt-1.5 max-w-md leading-relaxed">
          {isAdmin
            ? 'Your panel is freshly installed. As an administrator, you can configure your first node hypervisor and provision game server instances.'
            : 'No game server containers are currently assigned to your account. Contact an administrator to allocate a server.'}
        </p>

        {isAdmin && onNavigateAdminServer && (
          <button
            onClick={onNavigateAdminServer}
            className="mt-6 px-4 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-md shadow-red-950/40 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Provision First Server
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>Servers</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#21242C] text-slate-300 font-mono font-medium border border-white/10">
              {servers.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a server to access live console, file manager, and configuration.
          </p>
        </div>

        {/* Quick status counter */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-lg bg-[#181A20] border border-white/10 text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <strong className="text-white">{runningCount}</strong> Online
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-[#181A20] border border-white/10 text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-600" />
            <span>{offlineCount}</span> Offline
          </span>
        </div>
      </div>

      {/* 2. Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-xl bg-[#181A20] border border-white/10">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All', count: servers.length },
            { id: 'running', label: 'Running', count: runningCount },
            { id: 'offline', label: 'Offline', count: offlineCount },
            { id: 'pinned', label: 'Pinned', count: pinnedCount },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterStatus === tab.id
                  ? 'bg-[#DC2626] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#21242C]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                filterStatus === tab.id ? 'bg-black/20 text-white' : 'bg-white/10 text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search servers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#14161B] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#DC2626] transition-colors"
            />
          </div>

          <div className="flex items-center bg-[#14161B] p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                layoutMode === 'grid' ? 'bg-[#DC2626] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutMode('list')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                layoutMode === 'list' ? 'bg-[#DC2626] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Server Grid / List */}
      {servers.length === 0 ? (
        <div className="p-12 rounded-xl bg-[#181A20] border border-white/10 text-center flex flex-col items-center justify-center">
          <div className="p-4 rounded-xl bg-[#21242C] text-slate-400 mb-3 border border-white/10">
            <Server className="w-8 h-8 text-[#DC2626]" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Servers Linked</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            There are no servers linked to your account.
          </p>
          {isAdmin && onNavigateAdminServer && (
            <button
              onClick={onNavigateAdminServer}
              className="px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-md shadow-red-950/40 cursor-pointer"
            >
              Deploy First Server
            </button>
          )}
        </div>
      ) : filteredServers.length === 0 ? (
        <div className="p-8 rounded-xl bg-[#181A20] border border-white/10 text-center flex flex-col items-center justify-center">
          <p className="text-xs text-slate-400">No servers match your current filter.</p>
          <button
            onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
            className="mt-3 px-3 py-1 rounded-lg bg-[#21242C] text-slate-200 text-xs font-semibold hover:bg-[#2A2E38] transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : layoutMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServers.map(server => {
            const isOnline = server.status === 'running';
            const ramPct = isOnline ? 52 : 0;
            const cpuPct = isOnline ? 34 : 0;
            const diskPct = 42;
            const addressString = server.allocation.alias || `${server.allocation.ip}:${server.allocation.port}`;

            return (
              <motion.div
                key={server.id}
                layout
                onClick={() => {
                  selectServer(server.id);
                  onSelectServerDetail(server.id);
                }}
                className="group relative p-5 rounded-xl bg-[#181A20] hover:bg-[#1E2028] border border-white/10 hover:border-[#DC2626]/50 transition-all duration-200 shadow-lg cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg bg-[#21242C] border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:border-[#DC2626]/50 transition-colors">
                        <ServerIcon className="w-5 h-5 text-[#DC2626]" />
                      </div>
                      <div className="truncate">
                        <h3 className="text-sm font-bold text-white truncate group-hover:text-[#DC2626] transition-colors">
                          {server.name}
                        </h3>
                        <button
                          onClick={e => copyToClipboard(addressString, server.id, e)}
                          title="Copy Address"
                          className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#14161B] hover:bg-[#21242C] text-[11px] text-slate-300 font-mono border border-white/10 transition-colors cursor-pointer"
                        >
                          <span>{addressString}</span>
                          {copiedIp === server.id ? (
                            <Check className="w-3 h-3 text-[#DC2626]" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          togglePinServer(server.id);
                        }}
                        title={server.pinned ? 'Unpin Server' : 'Pin Server'}
                        className={`p-1.5 rounded transition-colors cursor-pointer ${
                          server.pinned ? 'text-amber-400 bg-amber-400/10' : 'text-slate-500 hover:text-white'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase border ${
                          isOnline
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-white/10'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        {server.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-4 pb-2.5 border-b border-white/10 font-mono">
                    <span className="text-slate-300 font-sans">{server.egg_name}</span>
                    <span className="text-slate-500 truncate max-w-[140px]">{server.node}</span>
                  </div>

                  {/* Telemetry Progress Bars */}
                  <div className="flex flex-col gap-2 mb-4 font-mono text-[11px]">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-400 flex items-center gap-1 font-sans">
                          <Cpu className="w-3 h-3 text-[#DC2626]" /> CPU
                        </span>
                        <span className="text-slate-200">
                          {isOnline ? `${cpuPct}%` : '0%'} / {server.limits.cpu}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded bg-[#14161B] overflow-hidden border border-white/5">
                        <div
                          style={{ width: `${Math.min(100, (cpuPct / server.limits.cpu) * 100)}%` }}
                          className="h-full bg-[#DC2626]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-400 flex items-center gap-1 font-sans">
                          <Activity className="w-3 h-3 text-white" /> Memory
                        </span>
                        <span className="text-slate-200">
                          {isOnline ? `${Math.round((server.limits.memory * ramPct) / 100)} MB` : '0 MB'} / {server.limits.memory} MB
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded bg-[#14161B] overflow-hidden border border-white/5">
                        <div style={{ width: `${ramPct}%` }} className="h-full bg-white" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-400 flex items-center gap-1 font-sans">
                          <HardDrive className="w-3 h-3 text-slate-400" /> Disk
                        </span>
                        <span className="text-slate-200">
                          {Math.round((server.limits.disk * diskPct) / 100)} MB / {server.limits.disk} MB
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded bg-[#14161B] overflow-hidden border border-white/5">
                        <div style={{ width: `${diskPct}%` }} className="h-full bg-slate-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-auto">
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {!isOnline ? (
                      <button
                        onClick={() => sendPowerAction('start', server.id)}
                        className="px-3 py-1 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" /> Start
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => sendPowerAction('restart', server.id)}
                          title="Restart"
                          className="p-1.5 rounded bg-[#21242C] hover:bg-[#2A2E38] text-white text-xs border border-white/10 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => sendPowerAction('stop', server.id)}
                          title="Stop"
                          className="p-1.5 rounded bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs cursor-pointer"
                        >
                          <Square className="w-3 h-3 fill-current" />
                        </button>
                      </>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#DC2626] group-hover:translate-x-1 transition-transform">
                    Manage <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="flex flex-col gap-2">
          {filteredServers.map(server => {
            const isOnline = server.status === 'running';
            const addressString = server.allocation.alias || `${server.allocation.ip}:${server.allocation.port}`;

            return (
              <div
                key={server.id}
                onClick={() => {
                  selectServer(server.id);
                  onSelectServerDetail(server.id);
                }}
                className="group p-3.5 rounded-xl bg-[#181A20] hover:bg-[#1E2028] border border-white/10 hover:border-[#DC2626]/50 transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#21242C] border border-white/10 flex items-center justify-center text-white shrink-0">
                    <ServerIcon className="w-4 h-4 text-[#DC2626]" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white group-hover:text-[#DC2626] transition-colors truncate">
                        {server.name}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#21242C] text-slate-300 font-mono">
                        {server.egg_name}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{addressString}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold font-mono uppercase border ${
                      isOnline
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-white/10'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    {server.status}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {!isOnline ? (
                      <button
                        onClick={() => sendPowerAction('start', server.id)}
                        className="p-1.5 rounded bg-[#DC2626] text-white hover:bg-[#B91C1C] cursor-pointer"
                        title="Start"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => sendPowerAction('restart', server.id)}
                          className="p-1.5 rounded bg-[#21242C] text-white hover:bg-[#2A2E38] border border-white/10 cursor-pointer"
                          title="Restart"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => sendPowerAction('stop', server.id)}
                          className="p-1.5 rounded bg-[#991B1B] text-white hover:bg-[#7F1D1D] cursor-pointer"
                          title="Stop"
                        >
                          <Square className="w-3 h-3 fill-current" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
