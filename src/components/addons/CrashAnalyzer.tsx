import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Wrench,
  Search,
  Sparkles,
  FileText,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { CrashDiagnostic } from '../../types';

const SAMPLE_CRASH_SCENARIOS: Record<string, CrashDiagnostic> = {
  healthy: {
    detected: false,
    category: 'UNKNOWN',
    title: 'No Active Server Crashes or Memory Errors Detected',
    severity: 'info',
    snippet: '[14:22:07 INFO]: Done (4.189s)! For help, type "help"',
    explanation: 'Your server process is executing normally with stable heap memory allocation and clean thread heartbeats.',
    resolution_steps: ['No action required. Telemetry metrics are within optimal parameters.'],
    auto_fixable: false,
  },
  oom: {
    detected: true,
    category: 'OOM',
    title: 'Critical Out of Memory (OOM) Heap Exhaustion',
    severity: 'critical',
    snippet: 'java.lang.OutOfMemoryError: Java heap space\n\tat net.minecraft.world.level.chunk.LevelChunk.getBlockState(LevelChunk.java:182)\n\tat net.minecraft.server.MinecraftServer.tickChildren(MinecraftServer.java:891)',
    explanation: 'The JVM heap ran out of allocated memory while processing entities and loading high chunk volume.',
    resolution_steps: [
      'Increase server memory limits in panel allocation settings (recommended: at least 6144 MB).',
      'Install "Chunky" to pre-generate worlds instead of generating chunks live during player flight.',
      'Check spark flamegraph profiler for memory leaks in third-party plugins.',
    ],
    auto_fixable: true,
    auto_fix_action: 'Allocate +2048MB RAM & Add Aikar G1GC Flags',
  },
  port_in_use: {
    detected: true,
    category: 'PORT_IN_USE',
    title: 'Port Binding Conflict (Address already in use)',
    severity: 'critical',
    snippet: 'java.net.BindException: Address already in use: bind\n\tat java.base/sun.nio.ch.Net.bind0(Native Method)\n\tat io.netty.channel.epoll.EpollServerSocketChannel.doBind(EpollServerSocketChannel.java:82)',
    explanation: 'Another container or background zombie process is currently bound to port 25565.',
    resolution_steps: [
      'Dispatch a SIGKILL signal from the Console power toolbar to terminate ghost threads.',
      'Change the default allocation port in the Network tab to an unassigned port.',
    ],
    auto_fixable: true,
    auto_fix_action: 'Force-Kill Ghost PID & Release Socket',
  },
  java_mismatch: {
    detected: true,
    category: 'JAVA_VERSION_MISMATCH',
    title: 'Java Runtime Architecture Incompatibility',
    severity: 'warning',
    snippet: 'java.lang.UnsupportedClassVersionError: net/minecraft/bundler/Main has been compiled by a more recent version of the Java Runtime (class file version 65.0), this version only recognizes up to 61.0',
    explanation: 'Minecraft 1.21.4 requires Java 21 LTS runtime (class file 65.0), but your Docker container Yolks image is set to Java 17.',
    resolution_steps: [
      'Switch your Egg Docker Image to "ghcr.io/slayernode/yolks:java_21".',
      'Restart the server container to pull the modern LTS runtime.',
    ],
    auto_fixable: true,
    auto_fix_action: 'Upgrade Docker Image to Java 21 Yolks',
  },
  eula: {
    detected: true,
    category: 'EULA_NOT_ACCEPTED',
    title: 'Minecraft EULA Agreement Not Accepted',
    severity: 'warning',
    snippet: '[14:10:02 INFO]: You need to agree to the EULA in order to run the server. Go to eula.txt for more info.',
    explanation: 'The server cannot complete boot until eula.txt contains "eula=true".',
    resolution_steps: [
      'Open eula.txt in the File Manager and change eula=false to eula=true.',
    ],
    auto_fixable: true,
    auto_fix_action: 'Accept Mojang EULA Automatically',
  },
};

export const CrashAnalyzer: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('healthy');
  const [isFixing, setIsFixing] = useState(false);
  const [fixedNotice, setFixedNotice] = useState<string | null>(null);

  const currentDiag = SAMPLE_CRASH_SCENARIOS[selectedScenario] || SAMPLE_CRASH_SCENARIOS.healthy;

  const handleApplyFix = () => {
    setIsFixing(true);
    setFixedNotice(null);
    setTimeout(() => {
      setIsFixing(false);
      setSelectedScenario('healthy');
      setFixedNotice('Automated fix applied successfully! Server container configuration updated.');
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-sky-400" /> Smart Crash & Log Stack-Trace Analyzer
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Heuristic machine-diagnostic engine that scans crash reports and console stack traces to pinpoint errors and provide 1-click automatic remedies.
        </p>
      </div>

      {/* Simulator Test Selector Bar (lets user test various real-world crash logs!) */}
      <GlassCard className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400 font-semibold">
          <Search className="w-4 h-4 text-sky-400" /> Simulate Crash Log Heuristics:
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'healthy', label: 'Healthy (Clean)' },
            { id: 'oom', label: 'Out of Memory (OOM)' },
            { id: 'java_mismatch', label: 'Java 17/21 Mismatch' },
            { id: 'port_in_use', label: 'Port Conflict' },
            { id: 'eula', label: 'EULA Unaccepted' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                setSelectedScenario(item.id);
                setFixedNotice(null);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedScenario === item.id
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </GlassCard>

      {fixedNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-lg">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{fixedNotice}</span>
        </div>
      )}

      {/* Diagnostic Card */}
      <GlassCard className={`p-6 shadow-2xl transition-all ${
        currentDiag.detected
          ? currentDiag.severity === 'critical'
            ? 'border-rose-500/40 bg-rose-950/20'
            : 'border-amber-500/40 bg-amber-950/20'
          : 'border-emerald-500/30 bg-emerald-950/15'
      }`}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border ${
              currentDiag.detected
                ? currentDiag.severity === 'critical'
                  ? 'bg-rose-500/20 border-rose-400/30 text-rose-400'
                  : 'bg-amber-500/20 border-amber-400/30 text-amber-400'
                : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-400'
            }`}>
              {currentDiag.detected ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">{currentDiag.title}</h3>
                <GlassBadge status={currentDiag.detected ? (currentDiag.severity === 'critical' ? 'offline' : 'starting') : 'running'}>
                  {currentDiag.detected ? currentDiag.category : 'STABLE'}
                </GlassBadge>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">{currentDiag.explanation}</p>
            </div>
          </div>

          {currentDiag.auto_fixable && (
            <GlassButton
              variant="accent"
              isLoading={isFixing}
              onClick={handleApplyFix}
              leftIcon={<Wrench className="w-4 h-4" />}
            >
              1-Click Auto Fix
            </GlassButton>
          )}
        </div>

        {/* Stack Trace Snippet */}
        <div className="my-4">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-sky-400" /> Detected Stack Trace / Log Excerpt:
          </div>
          <pre className="p-4 rounded-xl bg-slate-950/90 border border-white/10 font-mono text-xs text-rose-300 whitespace-pre-wrap overflow-x-auto shadow-inner">
            {currentDiag.snippet}
          </pre>
        </div>

        {/* Action Steps */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-xs font-bold text-white mb-2">Recommended Resolution Steps:</h4>
          <ul className="flex flex-col gap-2">
            {currentDiag.resolution_steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </GlassCard>
    </div>
  );
};
