import React from 'react';
import {
  Compass,
  HardDrive,
  Server as ServerIcon,
  Users,
  Activity,
  ArrowUpRight,
  CheckCircle,
  TrendingUp,
  Clock,
  ShieldCheck,
  Zap,
  Network,
  Radio,
  FileCode,
  Terminal,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassBadge } from '../ui/GlassBadge';
import { GlassButton } from '../ui/GlassButton';

interface AdminDashboardProps {
  onNavigateTab: (tabId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Quick Jump Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00D2FF]/10 text-[#00D2FF] text-[11px] font-semibold tracking-wide border border-[#00D2FF]/20">
              <Radio className="w-3 h-3 animate-pulse" /> Cluster Operations Center
            </span>
            <span className="text-xs text-slate-400 font-mono">SlayerWings v1.0.0</span>
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
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-[#00D2FF]" /> Appearance Studio
          </button>
          <button
            onClick={() => onNavigateTab('admin-nodes')}
            className="px-3.5 py-1.5 rounded-xl bg-[#00D2FF] hover:bg-[#00D2FF]/90 text-[#090D16] text-xs font-bold transition-all shadow-[0_0_16px_rgba(0,210,255,0.3)] flex items-center gap-1.5 cursor-pointer"
          >
            <HardDrive className="w-3.5 h-3.5" /> Manage Nodes
          </button>
        </div>
      </div>

      {/* 2. Core Engine Status Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#090D16]/80 border border-white/10 backdrop-blur-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/20 shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">SlayerNode Core Engine v1.0.0</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/30">
                PRODUCTION READY
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Host: Linux 6.12 • SlayerWings Daemon v1.0.0 • MariaDB 10.11 • Redis 7.2 • Ports: 8443 / 2202
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
          <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            <Clock className="w-3.5 h-3.5 text-[#00D2FF]" /> Uptime: 14d 08h 22m
          </span>
          <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Root Protection Active
          </span>
        </div>
      </div>

      {/* 3. Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#090D16]/70 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-slate-300">
              <HardDrive className="w-4 h-4 text-[#00D2FF]" /> Active Nodes
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/20 font-bold">
              2/2 ONLINE
            </span>
          </div>
          <span className="text-2xl font-black text-white font-mono tabular-nums my-2">2 Nodes</span>
          <span className="text-[11px] text-[#00D2FF] flex items-center gap-1 font-mono">
            <TrendingUp className="w-3 h-3" /> SlayerWings Daemons Synced
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#090D16]/70 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-slate-300">
              <ServerIcon className="w-4 h-4 text-white" /> Total Servers
            </span>
            <span className="text-slate-300 font-bold font-mono text-[11px]">22 Provisioned</span>
          </div>
          <span className="text-2xl font-black text-white font-mono tabular-nums my-2">22 Instances</span>
          <span className="text-[11px] text-slate-400 font-mono">across 2 physical datacenters</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#090D16]/70 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-slate-300">
              <Activity className="w-4 h-4 text-[#00D2FF]" /> RAM Commitment
            </span>
            <span className="text-slate-300 font-bold font-mono text-[11px]">393 GB Pool</span>
          </div>
          <span className="text-2xl font-black text-white font-mono tabular-nums my-2">184 GB Used</span>
          <span className="text-[11px] text-slate-400 font-mono">46.8% global commitment</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#090D16]/70 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1.5 text-slate-300">
              <Users className="w-4 h-4 text-white" /> User Accounts
            </span>
            <span className="text-slate-300 font-bold font-mono text-[11px]">3 Users</span>
          </div>
          <span className="text-2xl font-black text-white font-mono tabular-nums my-2">3 Accounts</span>
          <span className="text-[11px] text-slate-400 font-mono">1 Protected Root Admin</span>
        </div>
      </div>

      {/* 4. Quick Administrative Action Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateTab('admin-servers')}
          className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left flex items-center justify-between group cursor-pointer"
        >
          <div>
            <span className="text-xs font-bold text-white block group-hover:text-[#00D2FF] transition-colors">
              Provision Server
            </span>
            <span className="text-[11px] text-slate-400">Deploy with Egg wizard</span>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-[#00D2FF] group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={() => onNavigateTab('admin-nodes')}
          className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left flex items-center justify-between group cursor-pointer"
        >
          <div>
            <span className="text-xs font-bold text-white block group-hover:text-[#00D2FF] transition-colors">
              Deploy Node
            </span>
            <span className="text-[11px] text-slate-400">Generate wings YAML</span>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-[#00D2FF] group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={() => onNavigateTab('admin-users')}
          className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left flex items-center justify-between group cursor-pointer"
        >
          <div>
            <span className="text-xs font-bold text-white block group-hover:text-[#00D2FF] transition-colors">
              User Accounts
            </span>
            <span className="text-[11px] text-slate-400">Create & manage RBAC</span>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-[#00D2FF] group-hover:translate-x-0.5 transition-transform" />
        </button>

        <button
          onClick={() => onNavigateTab('admin-activity')}
          className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left flex items-center justify-between group cursor-pointer"
        >
          <div>
            <span className="text-xs font-bold text-white block group-hover:text-[#00D2FF] transition-colors">
              Security Audit
            </span>
            <span className="text-[11px] text-slate-400">Review system events</span>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-[#00D2FF] group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 5. Hypervisor Bare-Metal Node Telemetry */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Network className="w-4 h-4 text-[#00D2FF]" /> Bare-Metal Node Hypervisor Status
          </h3>
          <span className="text-xs text-slate-400 font-mono">Ports: 8443 (API) • 2202 (SFTP)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Node 1 */}
          <div className="p-5 rounded-3xl bg-[#090D16]/80 border border-white/10 backdrop-blur-2xl flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00D2FF] animate-pulse" />
                  <h4 className="text-sm font-bold text-white">Node-01 (Frankfurt Epyc 9654)</h4>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/20">
                  SLAYERWINGS ONLINE
                </span>
              </div>

              <div className="flex flex-col gap-3 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="font-sans">Memory Pool: 98,304 MB / 262,144 MB</span>
                    <span className="font-bold text-white">37.5%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-[#00D2FF] rounded-full" style={{ width: '37.5%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="font-sans">NVMe Volume: 1,420 GB / 3,840 GB</span>
                    <span className="font-bold text-white">36.9%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: '36.9%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-4 text-xs">
              <span className="text-slate-400 font-mono">14 Containers • 64 Allocations</span>
              <button
                onClick={() => onNavigateTab('admin-nodes')}
                className="text-[#00D2FF] hover:text-[#00D2FF]/80 font-bold flex items-center gap-1 cursor-pointer"
              >
                Inspect Hypervisor <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Node 2 */}
          <div className="p-5 rounded-3xl bg-[#090D16]/80 border border-white/10 backdrop-blur-2xl flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00D2FF] animate-pulse" />
                  <h4 className="text-sm font-bold text-white">Node-02 (Helsinki Ryzen 9 7950X3D)</h4>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/20">
                  SLAYERWINGS ONLINE
                </span>
              </div>

              <div className="flex flex-col gap-3 text-xs font-mono">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="font-sans">Memory Pool: 72,192 MB / 131,072 MB</span>
                    <span className="font-bold text-white">55.0%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-[#00D2FF] rounded-full" style={{ width: '55%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span className="font-sans">NVMe Volume: 890 GB / 2,048 GB</span>
                    <span className="font-bold text-white">43.4%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full" style={{ width: '43.4%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-4 text-xs">
              <span className="text-slate-400 font-mono">8 Containers • 40 Allocations</span>
              <button
                onClick={() => onNavigateTab('admin-nodes')}
                className="text-[#00D2FF] hover:text-[#00D2FF]/80 font-bold flex items-center gap-1 cursor-pointer"
              >
                Inspect Hypervisor <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
