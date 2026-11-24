import React from 'react';
import { ShieldCheck, Clock, Terminal, Key, Server, User as UserIcon } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassBadge } from '../ui/GlassBadge';
import { useAuth } from '../../context/AuthContext';

export const ActivityLogsManager: React.FC = () => {
  const { auditLogs } = useAuth();

  const mockFleetLogs = [
    { timestamp: '14:22:15', actor: 'admin@slayernode.xyz', ip: '194.164.72.12', action: 'server:power.start', target: '8a9c4b12 (SlayerCraft)' },
    { timestamp: '14:20:01', actor: 'admin@slayernode.xyz', ip: '194.164.72.12', action: 'file:write', target: 'server.properties' },
    { timestamp: '14:15:30', actor: 'admin@slayernode.xyz', ip: '194.164.72.12', action: 'addon:mod.install', target: 'Lithium v0.25.3' },
    { timestamp: '14:02:11', actor: 'admin@slayernode.xyz', ip: '194.164.72.12', action: 'admin:node.config_view', target: 'Node-01 (Frankfurt)' },
    { timestamp: '13:50:00', actor: 'admin@slayernode.xyz', ip: '194.164.72.12', action: 'auth:login.success', target: 'Session Authorized via 2FA' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" /> Administrative Security Audit Trail
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Immutable event stream capturing all administrative actions, power commands, file modifications, and authentication attempts.
        </p>
      </div>

      <GlassCard className="overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="p-3.5">Timestamp</th>
              <th className="p-3.5">Actor</th>
              <th className="p-3.5">IP Address</th>
              <th className="p-3.5">Action Event</th>
              <th className="p-3.5">Target / Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-xs">
            {mockFleetLogs.map((log, idx) => (
              <tr key={idx} className="hover:bg-white/5 transition-colors">
                <td className="p-3.5 text-slate-400">{log.timestamp}</td>
                <td className="p-3.5 font-bold text-slate-200">{log.actor}</td>
                <td className="p-3.5 text-slate-400">{log.ip}</td>
                <td className="p-3.5 text-sky-400">
                  <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-400/20">
                    {log.action}
                  </span>
                </td>
                <td className="p-3.5 text-slate-300">{log.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
};
