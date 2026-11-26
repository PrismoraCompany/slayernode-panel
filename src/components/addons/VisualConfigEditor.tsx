import React, { useState, useEffect, useCallback } from 'react';
import { Wrench, Save, RefreshCw, Check } from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { apiJson } from '../../lib/api';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';

export const VisualConfigEditor: React.FC = () => {
  const { activeServer } = useServers();
  const [entries, setEntries] = useState<{ key: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    if (!activeServer) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiJson<{ content?: string; raw?: string }>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/files/contents?file=%2Fserver.properties`
      );
      const rawText = res?.content ?? res?.raw ?? '';
      const parsed: { key: string; value: string }[] = [];
      for (const line of String(rawText).split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
          parsed.push({ key: trimmed.slice(0, eq).trim(), value: trimmed.slice(eq + 1).trim() });
        }
      }
      setEntries(parsed);
    } catch (err: any) {
      setError('server.properties not found yet in this server volume. Boot the server once or create one in File Manager.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [activeServer?.uuid]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  if (!activeServer) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const content =
        '# SlayerNode Visual Config Editor\n' +
        entries.map(e => `${e.key}=${e.value}`).join('\n') +
        '\n';
      await apiJson(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/files/write`, {
        method: 'POST',
        body: JSON.stringify({ file: '/server.properties', content, encoding: 'utf8' }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err: any) {
      setError(err?.message || 'Failed saving server.properties.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard className="p-6 flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Visual `server.properties` Editor</h3>
            <p className="text-xs text-slate-400">Reads and saves live properties directly inside {activeServer.name}&apos;s volume.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GlassButton variant="secondary" size="sm" onClick={loadConfig} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </GlassButton>
          <GlassButton variant="primary" size="sm" onClick={handleSave} disabled={saving || entries.length === 0}>
            {saved ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Properties'}
          </GlassButton>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          {error}
        </div>
      )}

      {entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {entries.map((item, idx) => (
            <div key={item.key} className="p-3 rounded-xl bg-[#111318] border border-white/10 flex flex-col gap-1.5">
              <label className="text-[11px] font-mono text-slate-400">{item.key}</label>
              <input
                type="text"
                value={item.value}
                onChange={e =>
                  setEntries(prev => prev.map((entry, i) => (i === idx ? { ...entry, value: e.target.value } : entry)))
                }
                className="glass-input px-2.5 py-1.5 font-mono text-xs text-white"
              />
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
};
