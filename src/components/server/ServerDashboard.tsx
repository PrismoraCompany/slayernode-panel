import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ShieldCheck,
  Zap,
  Globe,
  Radio,
} from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { useTheme } from '../../context/ThemeContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassInput } from '../ui/GlassInput';
import { GlassBadge } from '../ui/GlassBadge';
import { GlassButton } from '../ui/GlassButton';

interface ServerDashboardProps {
  onSelectServerDetail: (serverId: string) => void;
}

export const ServerDashboard: React.FC<ServerDashboardProps> = ({ onSelectServerDetail }) => {
  const { servers, selectServer, togglePinServer, sendPowerAction } = useServer();
  const { previewTheme } = useTheme();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'running' | 'offline' | 'pinned'>('all');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

  // Aggregated fleet metrics
  const totalCores = servers.reduce((acc, s) => acc + (s.limits.cpu / 100), 0);
  const totalRamMb = servers.reduce((acc, s) => acc + s.limits.memory, 0);
  const usedRamMb = servers.reduce((acc, s) => acc + (s.status === 'running' ? Math.round(s.limits.memory * 0.52) : 0), 0);
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

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Fleet Command Header & Global Metrics Strip */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00D2FF]/10 text-[#00D2FF] text-[11px] font-semibold tracking-wide border border-[#00D2FF]/20">
                <Radio className="w-3 h-3 animate-pulse" /> SlayerWings Engine v1.0.0
              </span>
              <span className="text-xs text-slate-400 font-mono">Cluster Active</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Game Server Fleet</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white font-mono font-medium border border-white/15">
                {servers.length}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              High-throughput container virtualization powered by external SlayerWings daemons.
            </p>
          </div>

          {/* Quick cluster health pill */}
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-[#00D2FF] animate-pulse" />
                <span className="font-semibold text-white">{runningCount}</span> Online
              </div>
              <span className="text-white/20">|</span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-600" />
                <span>{offlineCount}</span> Offline
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Glass Telemetry Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#090D16]/70 border border-white/10 backdrop-blur-xl relative overflow-hidden flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/20">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Allocated CPU Pool</span>
                <span className="text-lg font-black text-white font-mono tabular-nums">{totalCores.toFixed(1)} vCPU Cores</span>
              </div>
            </div>
            <span className="text-[11px] text-[#00D2FF] font-mono font-semibold bg-[#00D2FF]/10 px-2 py-0.5 rounded-lg border border-[#00D2FF]/20">
              Optimal
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#090D16]/70 border border-white/10 backdrop-blur-xl relative overflow-hidden flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 text-white border border-white/15">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Memory Commitment</span>
                <span className="text-lg font-black text-white font-mono tabular-nums">
                  {(usedRamMb / 1024).toFixed(1)} / {(totalRamMb / 1024).toFixed(1)} GB
                </span>
              </div>
            </div>
            <span className="text-[11px] text-white/80 font-mono font-semibold bg-white/10 px-2 py-0.5 rounded-lg border border-white/15">
              {Math.round((usedRamMb / totalRamMb) * 100)}% Used
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#090D16]/70 border border-white/10 backdrop-blur-xl relative overflow-hidden flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/20">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">SlayerWings Nodes</span>
                <span className="text-lg font-black text-white font-mono tabular-nums">2 / 2 Synchronized</span>
              </div>
            </div>
            <span className="text-[11px] text-[#00D2FF] font-mono font-semibold bg-[#00D2FF]/10 px-2 py-0.5 rounded-lg border border-[#00D2FF]/20">
              Port 8443
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filter Bar, Search & Layout Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-2xl bg-[#090D16]/60 border border-white/10 backdrop-blur-2xl">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Servers', count: servers.length },
            { id: 'running', label: 'Running', count: runningCount },
            { id: 'offline', label: 'Offline', count: offlineCount },
            { id: 'pinned', label: 'Pinned', count: pinnedCount },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                filterStatus === tab.id
                  ? 'bg-[#00D2FF] text-[#090D16] font-bold shadow-[0_0_16px_rgba(0,210,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  filterStatus === tab.id ? 'bg-[#090D16]/20 text-[#090D16]' : 'bg-white/10 text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input & Layout Controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by name, IP, node..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D2FF]/60 transition-colors font-sans"
            />
          </div>

          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-xl border border-white/10">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutMode === 'grid' ? 'bg-[#00D2FF]/20 text-[#00D2FF]' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutMode === 'list' ? 'bg-[#00D2FF]/20 text-[#00D2FF]' : 'text-slate-400 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Server Cards Grid / List View */}
      {filteredServers.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#090D16]/50 border border-white/10 backdrop-blur-2xl text-center flex flex-col items-center justify-center">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400 mb-3">
            <ServerIcon className="w-8 h-8 text-[#00D2FF]" />
          </div>
          <h3 className="text-base font-bold text-white">No instances match your filter</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Try adjusting your search terms or status filter to locate running instances.
          </p>
          <button
            onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
            className="mt-4 px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                  selectServer(server.id);
                  onSelectServerDetail(server.id);
                }}
                className="group relative p-5 rounded-3xl bg-[#090D16]/75 hover:bg-[#090D16]/90 border border-white/10 hover:border-[#00D2FF]/40 backdrop-blur-2xl transition-all duration-300 shadow-xl cursor-pointer flex flex-col justify-between overflow-hidden"
              >
                {/* Top specular reflection strip */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                <div>
                  {/* Card Header: Icon, Name, Address, Pin & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center text-[#00D2FF] shrink-0 group-hover:scale-105 group-hover:border-[#00D2FF]/40 transition-all duration-300 shadow-inner">
                        <ServerIcon className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <h3 className="text-sm font-bold text-white truncate group-hover:text-[#00D2FF] transition-colors">
                          {server.name}
                        </h3>
                        {/* Copyable address pill */}
                        <button
                          onClick={e => copyToClipboard(addressString, server.id, e)}
                          title="Click to copy address"
                          className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 font-mono border border-white/10 transition-colors cursor-pointer"
                        >
                          <span>{addressString}</span>
                          {copiedIp === server.id ? (
                            <Check className="w-3 h-3 text-[#00D2FF]" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500 hover:text-white" />
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
                        className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                          server.pinned
                            ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5 fill-current" />
                      </button>

                      {/* Status indicator pill */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider font-mono uppercase border ${
                          isOnline
                            ? 'bg-[#00D2FF]/10 text-[#00D2FF] border-[#00D2FF]/30 shadow-[0_0_12px_rgba(0,210,255,0.2)]'
                            : 'bg-slate-800 text-slate-400 border-white/10'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#00D2FF] animate-pulse' : 'bg-slate-500'}`} />
                        {server.status}
                      </span>
                    </div>
                  </div>

                  {/* Egg details & Node info */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-4 pb-3 border-b border-white/10">
                    <span className="font-semibold text-slate-300">{server.egg_name}</span>
                    <span className="font-mono text-slate-500 truncate max-w-[150px]">{server.node}</span>
                  </div>

                  {/* Telemetry Mini Progress Bars */}
                  <div className="flex flex-col gap-2.5 mb-4">
                    {/* CPU Usage */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1 font-mono">
                        <span className="text-slate-400 flex items-center gap-1 font-sans">
                          <Cpu className="w-3 h-3 text-[#00D2FF]" /> CPU
                        </span>
                        <span className="font-semibold text-slate-200 tabular-nums">
                          {isOnline ? `${cpuPct}%` : '0%'} / {server.limits.cpu}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-900/90 overflow-hidden border border-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (cpuPct / server.limits.cpu) * 100)}%` }}
                          className="h-full rounded-full bg-[#00D2FF]"
                        />
                      </div>
                    </div>

                    {/* Memory Usage */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1 font-mono">
                        <span className="text-slate-400 flex items-center gap-1 font-sans">
                          <Activity className="w-3 h-3 text-white" /> Memory
                        </span>
                        <span className="font-semibold text-slate-200 tabular-nums">
                          {isOnline ? `${Math.round((server.limits.memory * ramPct) / 100)} MB` : '0 MB'} / {server.limits.memory} MB
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-900/90 overflow-hidden border border-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${ramPct}%` }}
                          className="h-full rounded-full bg-white"
                        />
                      </div>
                    </div>

                    {/* Storage Usage */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1 font-mono">
                        <span className="text-slate-400 flex items-center gap-1 font-sans">
                          <HardDrive className="w-3 h-3 text-slate-400" /> Storage
                        </span>
                        <span className="font-semibold text-slate-200 tabular-nums">
                          {Math.round((server.limits.disk * diskPct) / 100)} MB / {server.limits.disk} MB
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-900/90 overflow-hidden border border-white/5">
                        <div style={{ width: `${diskPct}%` }} className="h-full rounded-full bg-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Actions: Quick Power Triggers & Deep Link */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-auto">
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {!isOnline ? (
                      <button
                        onClick={() => sendPowerAction('start', server.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#00D2FF] hover:bg-[#00D2FF]/90 text-[#090D16] text-xs font-bold transition-all shadow-[0_0_12px_rgba(0,210,255,0.3)] cursor-pointer flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" /> Start
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => sendPowerAction('restart', server.id)}
                          title="Restart Container"
                          className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition-colors border border-white/10 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => sendPowerAction('stop', server.id)}
                          title="Stop Container"
                          className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs transition-colors border border-rose-500/30 cursor-pointer"
                        >
                          <Square className="w-3 h-3 fill-current" />
                        </button>
                      </>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00D2FF] group-hover:translate-x-1 transition-transform">
                    Terminal Console <ArrowUpRight className="w-3.5 h-3.5" />
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
                className="group p-3.5 rounded-2xl bg-[#090D16]/75 hover:bg-[#090D16]/90 border border-white/10 hover:border-[#00D2FF]/40 backdrop-blur-2xl transition-all duration-200 cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center text-[#00D2FF] shrink-0">
                    <ServerIcon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white group-hover:text-[#00D2FF] transition-colors truncate">
                        {server.name}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 font-mono">
                        {server.egg_name}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{addressString}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase border ${
                      isOnline
                        ? 'bg-[#00D2FF]/10 text-[#00D2FF] border-[#00D2FF]/30'
                        : 'bg-slate-800 text-slate-400 border-white/10'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#00D2FF]' : 'bg-slate-500'}`} />
                    {server.status}
                  </span>

                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {!isOnline ? (
                      <button
                        onClick={() => sendPowerAction('start', server.id)}
                        className="p-1.5 rounded-lg bg-[#00D2FF] text-[#090D16] hover:bg-[#00D2FF]/90 cursor-pointer"
                        title="Start"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => sendPowerAction('restart', server.id)}
                          className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/10 cursor-pointer"
                          title="Restart"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => sendPowerAction('stop', server.id)}
                          className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 cursor-pointer"
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
