import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  RotateCcw,
  Square,
  Skull,
  Download,
  Trash2,
  Send,
  Cpu,
  Activity,
  HardDrive,
  Wifi,
  Terminal as TerminalIcon,
  Filter,
  CheckCircle,
  Copy,
} from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { StatGraph } from '../ui/StatGraph';

export const ConsoleTerminal: React.FC = () => {
  const {
    activeServer,
    stats,
    historyStats,
    consoleLogs,
    sendPowerAction,
    sendCommand,
    clearConsole,
  } = useServer();

  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [logFilter, setLogFilter] = useState<'ALL' | 'ERROR' | 'WARN' | 'INFO'>('ALL');
  const [copiedHost, setCopiedHost] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll terminal on new log lines immediately (auto without lag)
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [consoleLogs]);

  // Handle command submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCommand.trim()) return;

    sendCommand(inputCommand);
    setHistory(prev => [inputCommand, ...prev]);
    setHistoryIndex(-1);
    setInputCommand('');
  };

  // Keyboard navigation for command history (Up/Down arrow)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInputCommand(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputCommand(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCommand('');
      }
    }
  };

  // 1-Click Log Export
  const handleExportLogs = () => {
    const rawText = consoleLogs
      .map(line => line.replace(/\x1b\[[0-9;]*m/g, ''))
      .join('\n');
    const blob = new Blob([rawText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeServer?.identifier || 'server'}-console-${new Date().toISOString().slice(0, 19)}.log`;
    a.click();
    URL.revokeObjectURL(a);
  };

  // Copy connection address
  const copyAddress = () => {
    if (!activeServer) return;
    const addr = activeServer?.allocation?.alias || (activeServer?.allocation ? `${activeServer.allocation.ip}:${activeServer.allocation.port}` : '127.0.0.1:25565');
    navigator.clipboard.writeText(addr);
    setCopiedHost(true);
    setTimeout(() => setCopiedHost(false), 2000);
  };

  // Filter logs
  const filteredLogs = consoleLogs.filter(line => {
    if (logFilter === 'ALL') return true;
    return line.toUpperCase().includes(logFilter);
  });

  // Calculate live formatted stats
  const cpuVal = stats.cpu_absolute;
  const ramMb = Math.round(stats.memory_bytes / 1024 / 1024);
  const ramLimitMb = Math.round(stats.memory_limit_bytes / 1024 / 1024);
  const diskGb = (stats.disk_bytes / 1024 / 1024 / 1024).toFixed(1);
  const diskLimitGb = (activeServer?.limits?.disk || 40960) / 1024;
  const netRxMb = (stats.network.rx_bytes / 1024 / 1024).toFixed(1);
  const netTxMb = (stats.network.tx_bytes / 1024 / 1024).toFixed(1);

  const cpuData = historyStats.map(h => h.cpu);
  const ramData = historyStats.map(h => h.ram);

  return (
    <div className="flex flex-col gap-5">
      {/* Top Server Header Bar */}
      <GlassCard className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400/20 to-indigo-500/20 border border-white/15 flex items-center justify-center text-sky-400">
            <TerminalIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-tight">
                {activeServer?.name}
              </h2>
              <GlassBadge status={activeServer?.status}>
                {activeServer?.status?.toUpperCase() || 'OFFLINE'}
              </GlassBadge>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
              <span
                onClick={copyAddress}
                className="cursor-pointer hover:text-sky-300 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/5 transition-colors"
              >
                {activeServer?.allocation?.alias || (activeServer?.allocation ? `${activeServer.allocation.ip}:${activeServer.allocation.port}` : '127.0.0.1:25565')}
                {copiedHost ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </span>
              <span>•</span>
              <span className="text-slate-400">{activeServer?.node}</span>
              <span>•</span>
              <span className="text-slate-400">{activeServer?.egg_name}</span>
            </div>
          </div>
        </div>

        {/* Power Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {activeServer?.status === 'offline' ? (
            <GlassButton
              variant="success"
              onClick={() => sendPowerAction('start')}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
            >
              Start Server
            </GlassButton>
          ) : (
            <>
              <GlassButton
                variant="glass"
                onClick={() => sendPowerAction('restart')}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Restart
              </GlassButton>
              <GlassButton
                variant="danger"
                onClick={() => sendPowerAction('stop')}
                leftIcon={<Square className="w-3.5 h-3.5 fill-current" />}
              >
                Stop
              </GlassButton>
              <GlassButton
                variant="ghost"
                onClick={() => sendPowerAction('kill')}
                title="Kill (SIGKILL)"
                className="text-rose-400 hover:bg-rose-500/20 p-2.5"
              >
                <Skull className="w-4 h-4" />
              </GlassButton>
            </>
          )}
        </div>
      </GlassCard>

      {/* Real-time Telemetry Area Graphs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* CPU Chart */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Cpu className="w-4 h-4 text-sky-400" /> CPU Load
            </span>
            <span className="text-slate-200 font-bold tabular-metrics">{cpuVal}%</span>
          </div>
          <StatGraph data={cpuData} color="#38bdf8" height={60} limit={activeServer?.limits?.cpu || 400} />
          <span className="text-[10px] text-slate-500 mt-2">Allocated limit: {activeServer?.limits?.cpu || 100}%</span>
        </GlassCard>

        {/* RAM Chart */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="w-4 h-4 text-emerald-400" /> RAM Memory
            </span>
            <span className="text-slate-200 font-bold tabular-metrics">{ramMb} MB</span>
          </div>
          <StatGraph data={ramData} color="#10b981" height={60} limit={ramLimitMb} />
          <span className="text-[10px] text-slate-500 mt-2">Capacity: {ramLimitMb} MB</span>
        </GlassCard>

        {/* Disk Card */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <HardDrive className="w-4 h-4 text-amber-400" /> Disk Usage
            </span>
            <span className="text-slate-200 font-bold tabular-metrics">{diskGb} GB</span>
          </div>
          <div className="my-auto py-2">
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
              <div
                style={{ width: `${Math.min(100, (parseFloat(diskGb) / diskLimitGb) * 100)}%` }}
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
              <span>{Math.round((parseFloat(diskGb) / diskLimitGb) * 100)}% used</span>
              <span>{diskLimitGb} GB Cap</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-500">Fast NVMe I/O Capped (500)</span>
        </GlassCard>

        {/* Network I/O */}
        <GlassCard className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Wifi className="w-4 h-4 text-indigo-400" /> Network I/O
            </span>
            <span className="text-slate-200 font-bold tabular-metrics">1 Gbps</span>
          </div>
          <div className="my-auto py-1 flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-sky-300">▲ Inbound (Rx):</span>
              <span className="font-semibold text-white">{netRxMb} MB</span>
            </div>
            <div className="flex justify-between font-mono text-[11px]">
              <span className="text-indigo-300">▼ Outbound (Tx):</span>
              <span className="font-semibold text-white">{netTxMb} MB</span>
            </div>
          </div>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> WebSocket Connected
          </span>
        </GlassCard>
      </div>

      {/* Terminal Console Box */}
      <GlassCard className="p-4 sm:p-5 flex flex-col shadow-2xl">
        {/* Terminal Header Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-400/50" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-400/50" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400/50" />
            </div>
            <span className="text-xs font-mono font-bold text-slate-300">
              wings@{activeServer?.identifier}:~#
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Pill */}
            <div className="flex items-center bg-slate-900/60 rounded-lg p-0.5 border border-white/10 text-xs">
              {(['ALL', 'ERROR', 'WARN', 'INFO'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    logFilter === f
                      ? 'bg-white/15 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Export Log */}
            <button
              onClick={handleExportLogs}
              title="Download console logs"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/5"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Clear Terminal */}
            <button
              onClick={clearConsole}
              title="Clear terminal buffer"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/5"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ANSI Terminal Screen */}
        <div className="h-96 w-full overflow-y-auto bg-slate-950/80 rounded-xl p-4 font-mono text-xs border border-white/5 shadow-inner">
          {filteredLogs.map((log, idx) => (
            <div key={idx} className="terminal-line py-0.5 hover:bg-white/5 transition-colors">
              {log}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Command Input Bar with Auto-complete / History */}
        <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400 font-mono text-sm font-bold">
              &gt;
            </span>
            <input
              type="text"
              value={inputCommand}
              onChange={e => setInputCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a server command (e.g. 'help', 'tps', 'op user', 'whitelist add')... ↑/↓ for history"
              className="glass-input w-full pl-8 pr-4 py-2.5 text-xs font-mono text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <GlassButton type="submit" variant="accent" size="sm" rightIcon={<Send className="w-3.5 h-3.5" />}>
            Execute
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  );
};
