import React, { useEffect, useState, useCallback } from 'react';
import { Activity, RefreshCw, Search, Shield, Clock } from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { apiJson } from '../../lib/api';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';

interface ServerAuditEvent {
  id: number;
  user_id: number | null;
  username: string;
  server_uuid: string;
  action: string;
  description: string;
  ip: string;
  timestamp: string;
}

export const ServerActivityTab: React.FC = () => {
  const { activeServer } = useServers();
  const [events, setEvents] = useState<ServerAuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const loadActivity = useCallback(async () => {
    if (!activeServer) return;
    setLoading(true);
    try {
      const res = await apiJson<{ data: ServerAuditEvent[] }>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/activity`
      );
      setEvents(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [activeServer?.uuid]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  if (!activeServer) return null;

  const filtered = events.filter(ev => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      ev.action.toLowerCase().includes(q) ||
      ev.description.toLowerCase().includes(q) ||
      ev.username.toLowerCase().includes(q)
    );
  });

  return (
    <GlassCard className="p-6 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Server Activity Log</h3>
            <p className="text-xs text-slate-400">
              Scoped audit events for <span className="font-mono text-slate-300">{activeServer.identifier}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-56">
            <GlassInput
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter event or actor..."
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <GlassButton variant="secondary" size="sm" onClick={loadActivity} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </GlassButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          {loading ? 'Loading activity trail...' : 'No activity recorded for this server yet.'}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-white/5">
          {filtered.map(ev => (
            <div key={ev.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-red-500/15 border border-red-500/25 text-red-300 text-[11px] font-mono">
                      {ev.action}
                    </span>
                    <span className="text-sm font-medium text-white">{ev.description}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 font-mono">
                    <span>Actor: {ev.username}</span>
                    <span>IP: {ev.ip}</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(ev.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};
