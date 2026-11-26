import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, Search } from 'lucide-react';
import { apiJson } from '../../lib/api';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';

interface AuditRow {
  id: number;
  user_id: number | null;
  username: string;
  server_uuid?: string | null;
  action: string;
  description: string;
  ip: string;
  timestamp: string;
}

export const ActivityLogsManager: React.FC = () => {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async (q = search) => {
    setLoading(true);
    try {
      const url = q.trim()
        ? `/api/application/activity?q=${encodeURIComponent(q.trim())}`
        : '/api/application/activity';
      const res = await apiJson<{ data: AuditRow[] }>(url);
      setLogs(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadLogs('');
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" /> Administrative Security Audit Trail
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Live persisted event log capturing authentication, admin CRUD, file edits, and power operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-60">
            <GlassInput
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadLogs(search)}
              placeholder="Search actor or event..."
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <GlassButton variant="secondary" size="sm" onClick={() => loadLogs(search)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </GlassButton>
        </div>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">IP Address</th>
                <th className="p-3.5">Event</th>
                <th className="p-3.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-sans">
                    {loading ? 'Loading audit trail...' : 'No audit records matching filter.'}
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3.5 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-bold text-slate-200 whitespace-nowrap">{log.username}</td>
                    <td className="p-3.5 text-slate-400 whitespace-nowrap">{log.ip}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-red-500/15 border border-red-500/25 text-red-300 whitespace-nowrap inline-block">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300 font-sans max-w-md truncate" title={log.description}>{log.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
