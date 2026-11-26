import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Server as ServerIcon,
  Star,
  Cpu,
  HardDrive,
  MemoryStick,
  Power,
  RotateCw,
  Square,
  Globe,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassBadge } from '../ui/GlassBadge';
import { GlassInput } from '../ui/GlassInput';
import { GlassButton } from '../ui/GlassButton';
import { SegmentedControl } from '../ui/SegmentedControl';

interface ServerDashboardProps {
  onSelectServerDetail: (serverId: string) => void;
  onNavigateAdminServer?: () => void;
}

export const ServerDashboard: React.FC<ServerDashboardProps> = ({
  onSelectServerDetail,
  onNavigateAdminServer,
}) => {
  const {
    visibleServers,
    serverStatsMap,
    selectServer,
    togglePinServer,
    sendPowerAction,
  } = useServers();
  const { isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'running' | 'offline' | 'pinned'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'memory'>('name');

  const filteredServers = useMemo(() => {
    let list = [...visibleServers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.identifier.toLowerCase().includes(q) ||
          s.egg_name.toLowerCase().includes(q) ||
          String(s.allocation?.port || '').includes(q)
      );
    }

    if (filterMode === 'running') {
      list = list.filter(s => s.status === 'running' || s.status === 'starting');
    } else if (filterMode === 'offline') {
      list = list.filter(s => s.status === 'offline');
    } else if (filterMode === 'pinned') {
      list = list.filter(s => s.pinned);
    }

    list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      if (sortBy === 'memory') return b.limits.memory - a.limits.memory;
      return 0;
    });

    return list;
  }, [visibleServers, searchQuery, filterMode, sortBy]);

  const handleOpenServer = (serverUuid: string) => {
    selectServer(serverUuid);
    onSelectServerDetail(serverUuid);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
              <ServerIcon className="w-6 h-6" />
            </span>
            <span>Game &amp; Application Servers</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Isolated per-container instances managed across SlayerWings nodes.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="glass-card px-4 py-2 flex items-center gap-3">
            <div className="text-xs text-slate-400">Online</div>
            <div className="text-sm font-bold text-emerald-400 tabular-metrics">
              {visibleServers.filter(s => s.status === 'running').length} / {visibleServers.length}
            </div>
          </div>

          {isAdmin && onNavigateAdminServer && (
            <GlassButton variant="primary" size="md" onClick={onNavigateAdminServer}>
              <Plus className="w-4 h-4 mr-1.5" /> Deploy Instance
            </GlassButton>
          )}
        </div>
      </div>

      {/* Filter & Sort Bar */}
      <GlassCard className="p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="flex-1 max-w-md">
            <GlassInput
              placeholder="Search server name, UUID, port..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <SegmentedControl
            value={filterMode}
            onChange={v => setFilterMode(v as any)}
            layoutId="dashboard-filter"
            options={[
              { label: 'All', value: 'all', badge: visibleServers.length },
              { label: 'Running', value: 'running', badge: visibleServers.filter(s => s.status === 'running').length },
              { label: 'Offline', value: 'offline', badge: visibleServers.filter(s => s.status === 'offline').length },
              { label: 'Pinned', value: 'pinned' },
            ]}
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Sort:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-slate-900/80 border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-red-500/40"
          >
            <option value="name">Name (A-Z)</option>
            <option value="status">Status</option>
            <option value="memory">Allocated RAM</option>
          </select>
        </div>
      </GlassCard>

      {/* Server Grid */}
      {filteredServers.length === 0 ? (
        <GlassCard className="p-12 text-center flex flex-col items-center gap-3">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
            <ServerIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white">No servers found</h3>
          <p className="text-sm text-slate-400 max-w-md">
            {searchQuery
              ? `No instances match "${searchQuery}".`
              : 'Deploy your first Minecraft, Node.js, or Python container via Admin Panel -> Servers Fleet.'}
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredServers.map(server => {
            const isOnline = server.status === 'running';
            const telemetry = serverStatsMap[server.uuid] || server.telemetry;
            const memLimitMb = server.limits?.memory || 1024;
            const ramUsedMb = telemetry ? Math.round((telemetry.memory_bytes || 0) / (1024 * 1024)) : 0;
            const ramPct = isOnline && memLimitMb > 0 ? Math.min(100, Math.round((ramUsedMb / memLimitMb) * 100)) : 0;
            const cpuPct = isOnline ? Math.min(100, Math.round(telemetry?.cpu_absolute || 0)) : 0;
            const diskUsedMb = telemetry ? Math.round((telemetry.disk_bytes || 0) / (1024 * 1024)) : 0;
            const diskLimitMb = server.limits?.disk || 10240;
            const diskPct = diskLimitMb > 0 ? Math.min(100, Math.round((diskUsedMb / diskLimitMb) * 100)) : 0;

            return (
              <motion.div
                key={server.uuid}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.16 }}
              >
                <GlassCard hoverable className="p-5 flex flex-col gap-4 h-full">
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleOpenServer(server.uuid)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white truncate hover:text-red-400 transition-colors">
                          {server.name}
                        </h3>
                        <GlassBadge status={server.status} />
                      </div>
                      <p className="text-xs text-slate-400 font-mono truncate mt-0.5 flex items-center gap-1.5">
                        <span>{server.identifier}</span>
                        <span>•</span>
                        <span className="truncate">{server.egg_name}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        togglePinServer(server.uuid);
                      }}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        server.pinned
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                          : 'text-slate-500 hover:text-slate-300 border-white/5 hover:border-white/15'
                      }`}
                      title={server.pinned ? 'Unpin' : 'Pin to top'}
                    >
                      <Star className={`w-3.5 h-3.5 ${server.pinned ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Endpoint & Node */}
                  <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-950/60 border border-white/5 text-slate-300 font-mono">
                    <span className="flex items-center gap-1.5 truncate">
                      <Globe className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      {server.allocation.ip}:{server.allocation.port}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {server.node_name || server.node || 'Local-Node-01'}
                    </span>
                  </div>

                  {/* Live Per-Server Telemetry Bars */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-red-400" /> CPU</span>
                        <span className="text-white font-semibold tabular-metrics">{cpuPct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${cpuPct}%` }} />
                      </div>
                      <div className="text-[10px] text-slate-500">Max {server.limits.cpu}%</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1"><MemoryStick className="w-3 h-3 text-emerald-400" /> RAM</span>
                        <span className="text-white font-semibold tabular-metrics">{ramPct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${ramPct}%` }} />
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{ramUsedMb}/{memLimitMb} MB</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1"><HardDrive className="w-3 h-3 text-amber-400" /> Disk</span>
                        <span className="text-white font-semibold tabular-metrics">{diskPct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${diskPct}%` }} />
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{diskUsedMb} MB</div>
                    </div>
                  </div>

                  {/* Quick Actions Footer */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 mt-auto">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isOnline}
                        onClick={() => sendPowerAction('start', server.uuid)}
                        className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 text-emerald-400 border border-emerald-500/20 transition-colors cursor-pointer"
                        title="Start"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={!isOnline}
                        onClick={() => sendPowerAction('restart', server.uuid)}
                        className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-40 text-amber-400 border border-amber-500/20 transition-colors cursor-pointer"
                        title="Restart"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={server.status === 'offline'}
                        onClick={() => sendPowerAction('stop', server.uuid)}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-40 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                        title="Stop"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <GlassButton
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenServer(server.uuid)}
                    >
                      <span>Manage</span>
                      <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                    </GlassButton>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
