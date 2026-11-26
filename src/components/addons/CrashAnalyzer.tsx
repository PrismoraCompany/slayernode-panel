import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { apiJson } from '../../lib/api';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';

interface CrashReportResponse {
  issues: { severity: string; title: string; detail: string; remediation: string }[];
  crash_reports: { name: string }[];
  error_excerpt: string[];
  lines_scanned: number;
}

export const CrashAnalyzer: React.FC = () => {
  const { activeServer } = useServers();
  const [report, setReport] = useState<CrashReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const runScan = useCallback(async () => {
    if (!activeServer) return;
    setLoading(true);
    try {
      const res = await apiJson<CrashReportResponse>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/addons/crash-analyzer`
      );
      setReport(res);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [activeServer?.uuid]);

  useEffect(() => {
    runScan();
  }, [runScan]);

  if (!activeServer) return null;

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Live Crash &amp; Exception Analyzer</h3>
            <p className="text-xs text-slate-400">
              Scans container `logs/latest.log`, `/crash-reports`, and active stdout ({report?.lines_scanned || 0} lines inspected).
            </p>
          </div>
        </div>
        <GlassButton variant="secondary" size="sm" onClick={runScan} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Re-scan Logs
        </GlassButton>
      </GlassCard>

      {report && report.issues.length === 0 ? (
        <GlassCard className="p-6 flex items-center gap-3 border-emerald-500/30">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-white">No Critical Crash Signatures Detected</h4>
            <p className="text-xs text-slate-400">All inspected logs look clean for this container.</p>
          </div>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-3">
          {(report?.issues || []).map((issue, idx) => (
            <GlassCard key={idx} className="p-5 border-rose-500/30 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase">
                  {issue.severity}
                </span>
                <h4 className="text-sm font-bold text-white">{issue.title}</h4>
              </div>
              <p className="text-xs text-slate-300">{issue.detail}</p>
              <p className="text-xs text-emerald-300 font-mono">Fix: {issue.remediation}</p>
            </GlassCard>
          ))}
        </div>
      )}

      {report && report.error_excerpt.length > 0 && (
        <GlassCard className="p-5 flex flex-col gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Warnings / Errors in Logs</h4>
          <div className="bg-[#0B0D12] p-3 rounded-xl font-mono text-[11px] text-rose-300 max-h-64 overflow-y-auto whitespace-pre-wrap">
            {report.error_excerpt.join('\n')}
          </div>
        </GlassCard>
      )}
    </div>
  );
};
