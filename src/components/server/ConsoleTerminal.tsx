import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Send,
  Trash2,
  Download,
  Lock,
  Unlock,
  Search,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Clock,
} from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { StatGraph } from '../ui/StatGraph';

function formatBytesDisplay(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function formatUptime(ms: number): string {
  if (!ms || ms <= 0) return 'Offline';
  const secs = Math.floor(ms / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
}

function renderSafeAnsiLine(raw: string): React.ReactNode {
  const sanitized = String(raw || '')
    .replace(/\r/g, '')
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-9;?>=< ]*[A-LN-Za-ln-z~]/g, '')
    .replace(/\x1b\([A-Za-z0-9]/g, '')
    .replace(/\x1b[=>]/g, '');

  const stripCtl = (text: string) => text.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');

  const parts: React.ReactNode[] = [];
  const regex = /\x1b\[([0-9;]*)m/g;
  let lastIndex = 0;
  let currentStyle: React.CSSProperties = {};
  let match: RegExpExecArray | null;
  let segmentIdx = 0;
  let matchedAnsi = false;

  while ((match = regex.exec(sanitized)) !== null) {
    matchedAnsi = true;
    if (match.index > lastIndex) {
      const cleanChunk = stripCtl(sanitized.slice(lastIndex, match.index));
      if (cleanChunk) {
        parts.push(
          <span key={segmentIdx++} style={currentStyle}>
            {cleanChunk}
          </span>
        );
      }
    }
    const codes = match[1].split(';').map(Number);
    if (codes[0] === 0 || match[1] === '') {
      currentStyle = {};
    } else if (codes[0] === 38 && codes[1] === 2 && codes.length >= 5) {
      currentStyle = { ...currentStyle, color: `rgb(${codes[2]}, ${codes[3]}, ${codes[4]})` };
    } else if (codes[0] === 38 && codes[1] === 5 && codes.length >= 3) {
      const map256: Record<number, string> = { 9: '#f87171', 10: '#34d399', 11: '#fbbf24', 12: '#60a5fa', 13: '#c084fc', 14: '#22d3ee' };
      if (map256[codes[2]]) currentStyle = { ...currentStyle, color: map256[codes[2]] };
    } else {
      const code = codes[0];
      const map: Record<number, string> = {
        31: '#f87171',
        32: '#34d399',
        33: '#fbbf24',
        34: '#60a5fa',
        35: '#c084fc',
        36: '#22d3ee',
        37: '#e2e8f0',
        90: '#94a3b8',
      };
      if (map[code]) currentStyle = { ...currentStyle, color: map[code] };
      if (code === 1) currentStyle = { ...currentStyle, fontWeight: 700 };
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < sanitized.length) {
    const cleanTail = stripCtl(sanitized.slice(lastIndex));
    if (cleanTail) {
      parts.push(
        <span key={segmentIdx++} style={currentStyle}>
          {cleanTail}
        </span>
      );
    }
  }
  if (parts.length > 0) return parts;
  return matchedAnsi ? '' : stripCtl(sanitized);
}

export const ConsoleTerminal: React.FC = () => {
  const {
    activeServer,
    stats,
    historyStats,
    consoleLogs,
    wsStatus,
    sendCommand,
    clearConsole,
  } = useServers();

  const [cmdInput, setCmdInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [consoleLogs, autoScroll]);

  if (!activeServer) return null;

  const isRunning = activeServer.status === 'running' || stats.state === 'running';
  const cpuPct = Math.round((stats.cpu_absolute || 0) * 10) / 10;
  const memMb = Math.round((stats.memory_bytes || 0) / (1024 * 1024));
  const memLimitMb = activeServer.limits?.memory || 1024;
  const diskStr = formatBytesDisplay(stats.disk_bytes || 0);
  const diskLimitGb = ((activeServer.limits?.disk || 10240) / 1024).toFixed(1);

  const visibleLogs = consoleLogs
    .filter(l => !/^\s*(?:\x1b\[[0-9;]*m)+\s*$/.test(l))
    .filter(l => !searchFilter.trim() || l.toLowerCase().includes(searchFilter.toLowerCase()));

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = cmdInput.trim();
    if (!trimmed) return;
    sendCommand(trimmed);
    setCmdHistory(prev => [trimmed, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);
    setCmdInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = Math.min(cmdHistory.length - 1, historyIndex + 1);
      if (cmdHistory[nextIdx] !== undefined) {
        setHistoryIndex(nextIdx);
        setCmdInput(cmdHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setCmdInput('');
      } else {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCmdInput(cmdHistory[nextIdx] || '');
      }
    }
  };

  const handleExportLogs = () => {
    const clean = consoleLogs.map(l => l.replace(/\x1b\[[0-9;]*m/g, '')).join('\n');
    const blob = new Blob([clean], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeServer.identifier}-console.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Live Resource Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 whitespace-nowrap">
              <Cpu className="w-3.5 h-3.5 text-red-400 shrink-0" /> CPU Usage
            </div>
            <div className="text-xl font-bold text-white tabular-metrics mt-1 whitespace-nowrap">
              {isRunning ? `${cpuPct}%` : '0%'}
            </div>
            <div className="text-[11px] text-slate-500 whitespace-nowrap">Limit {activeServer.limits.cpu}%</div>
          </div>
          <div className="w-20 shrink-0">
            <StatGraph
              data={historyStats.length ? historyStats.map(h => h.cpu) : [0]}
              color="#DC2626"
              height={42}
              limit={activeServer.limits.cpu || 100}
            />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 whitespace-nowrap">
              <MemoryStick className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Memory Usage
            </div>
            <div className="text-xl font-bold text-white tabular-metrics mt-1 whitespace-nowrap">
              {isRunning ? `${memMb} MB` : '0 MB'}
            </div>
            <div className="text-[11px] text-slate-500 whitespace-nowrap">of {memLimitMb} MB</div>
          </div>
          <div className="w-20 shrink-0">
            <StatGraph
              data={historyStats.length ? historyStats.map(h => h.ram) : [0]}
              color="#10B981"
              height={42}
              limit={100}
            />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 whitespace-nowrap">
              <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Disk Space
            </div>
            <div className="text-xl font-bold text-white tabular-metrics mt-1 whitespace-nowrap">{diskStr}</div>
            <div className="text-[11px] text-slate-500 whitespace-nowrap">of {diskLimitGb} GB</div>
          </div>
          <div className="w-20 shrink-0">
            <StatGraph
              data={historyStats.length ? historyStats.map(h => h.disk) : [0]}
              color="#F59E0B"
              height={42}
              limit={100}
            />
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Network className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> Network I/O
            </span>
            <span className="font-mono text-slate-300 whitespace-nowrap">
              {formatBytesDisplay(stats.network?.rx_bytes || 0)} / {formatBytesDisplay(stats.network?.tx_bytes || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Uptime
            </span>
            <span className="font-mono text-white font-semibold">
              {isRunning ? formatUptime(stats.uptime_ms || 0) : 'Offline'}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Console Window */}
      <GlassCard className="p-0 overflow-hidden flex flex-col">
        {/* Console Toolbar */}
        <div className="px-4 py-3 bg-[#151821] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <TerminalIcon className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Live Container Terminal
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                wsStatus === 'connected'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : wsStatus === 'connecting'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
            >
              {wsStatus === 'connected'
                ? 'Stream: Active'
                : wsStatus === 'connecting'
                ? 'Stream: Connecting'
                : 'Stream: Disconnected'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Filter output..."
                className="pl-8 pr-3 py-1.5 rounded-lg bg-[#0E1015] border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-red-500/40 w-44"
              />
            </div>

            <button
              type="button"
              onClick={() => setAutoScroll(v => !v)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                autoScroll
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
              title="Toggle Auto-Scroll"
            >
              {autoScroll ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleExportLogs}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
              title="Download Console Log"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={clearConsole}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 text-slate-300 hover:text-rose-300 cursor-pointer"
              title="Clear Buffer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Log Output Buffer */}
        <div
          ref={logContainerRef}
          className="bg-[#0B0D12] p-4 h-[420px] overflow-y-auto font-mono text-xs leading-relaxed text-slate-200 select-text"
        >
          {visibleLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              {isRunning
                ? 'Connected to container stdout/stderr. Waiting for log lines...'
                : 'Server is offline. Click Start above to boot this container.'}
            </div>
          ) : (
            visibleLogs.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-words py-0.5 hover:bg-white/[0.03] px-1 rounded">
                {renderSafeAnsiLine(line)}
              </div>
            ))
          )}
        </div>

        {/* Command Input Prompt */}
        <form
          onSubmit={handleSend}
          className="px-4 py-3 bg-[#151821] border-t border-white/10 flex items-center gap-3"
        >
          <span className="font-mono text-sm font-bold text-red-400 select-none">&gt;_</span>
          <input
            type="text"
            value={cmdInput}
            onChange={e => setCmdInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRunning
                ? 'Type a console command (e.g. help, version, list, status)...'
                : 'Container offline — commands require an active process'
            }
            className="flex-1 bg-transparent text-sm font-mono text-white placeholder:text-slate-500 focus:outline-none"
          />
          <GlassButton type="submit" variant="primary" size="sm" disabled={!cmdInput.trim()}>
            <Send className="w-3.5 h-3.5 mr-1.5" /> Send
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  );
};
