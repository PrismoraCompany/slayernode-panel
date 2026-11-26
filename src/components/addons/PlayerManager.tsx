import React, { useState, useEffect, useCallback } from 'react';
import { Users, Shield, Ban, UserX, RefreshCw, Plus } from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { apiJson } from '../../lib/api';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';

interface PlayerStateResponse {
  online: { name: string; is_op: boolean; is_whitelisted: boolean }[];
  ops: { uuid?: string; name: string; level?: number }[];
  whitelist: { uuid?: string; name: string }[];
  banned: { uuid?: string; name: string; reason?: string }[];
}

export const PlayerManager: React.FC = () => {
  const { activeServer } = useServers();
  const [data, setData] = useState<PlayerStateResponse>({ online: [], ops: [], whitelist: [], banned: [] });
  const [targetName, setTargetName] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadPlayers = useCallback(async () => {
    if (!activeServer) return;
    setLoading(true);
    try {
      const res = await apiJson<PlayerStateResponse>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/addons/players`
      );
      setData({
        online: res?.online || [],
        ops: res?.ops || [],
        whitelist: res?.whitelist || [],
        banned: res?.banned || [],
      });
    } catch {
      setData({ online: [], ops: [], whitelist: [], banned: [] });
    } finally {
      setLoading(false);
    }
  }, [activeServer?.uuid]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  if (!activeServer) return null;

  const runAction = async (action: string, player: string) => {
    if (!player.trim()) return;
    setFeedback(null);
    try {
      const res = await apiJson<{ command: string }>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/addons/players/action`,
        { method: 'POST', body: JSON.stringify({ action, player: player.trim() }) }
      );
      setFeedback(`Dispatched console command: ${res?.command}`);
      setTimeout(() => loadPlayers(), 800);
    } catch (err: any) {
      setFeedback(`Error: ${err?.message || 'Action failed'}`);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Live Player Manager</h3>
            <p className="text-xs text-slate-400">Reads live logs, ops.json, whitelist.json, and banned-players.json directly from this container.</p>
          </div>
        </div>
        <GlassButton variant="secondary" size="sm" onClick={loadPlayers} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </GlassButton>
      </GlassCard>

      <GlassCard className="p-5 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <div className="flex-1">
          <GlassInput
            label="Target Player Username"
            placeholder="Steve"
            value={targetName}
            onChange={e => setTargetName(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <GlassButton variant="primary" size="sm" onClick={() => runAction('op', targetName)}>OP</GlassButton>
          <GlassButton variant="secondary" size="sm" onClick={() => runAction('whitelist-add', targetName)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Whitelist
          </GlassButton>
          <GlassButton variant="secondary" size="sm" onClick={() => runAction('kick', targetName)}>Kick</GlassButton>
          <GlassButton variant="danger" size="sm" onClick={() => runAction('ban', targetName)}>Ban</GlassButton>
        </div>
      </GlassCard>

      {feedback && (
        <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-emerald-300">
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-5 flex flex-col gap-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <Users className="w-4 h-4" /> Online Players ({data.online.length})
          </h4>
          {data.online.length === 0 ? (
            <p className="text-xs text-slate-500">No active player sessions detected in recent log output.</p>
          ) : (
            data.online.map(p => (
              <div key={p.name} className="flex items-center justify-between p-2.5 rounded-lg bg-[#111318] border border-white/5 text-xs">
                <span className="font-mono text-white">{p.name}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => runAction('kick', p.name)} className="p-1 text-amber-400 hover:bg-white/10 rounded cursor-pointer" title="Kick">
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => runAction('ban', p.name)} className="p-1 text-rose-400 hover:bg-white/10 rounded cursor-pointer" title="Ban">
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </GlassCard>

        <GlassCard className="p-5 flex flex-col gap-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Operators ({data.ops.length})
          </h4>
          {data.ops.length === 0 ? (
            <p className="text-xs text-slate-500">ops.json has no entries.</p>
          ) : (
            data.ops.map(op => (
              <div key={op.name} className="flex items-center justify-between p-2.5 rounded-lg bg-[#111318] border border-white/5 text-xs">
                <span className="font-mono text-white">{op.name}</span>
                <button type="button" onClick={() => runAction('deop', op.name)} className="text-[11px] text-rose-400 hover:underline cursor-pointer">
                  De-OP
                </button>
              </div>
            ))
          )}
        </GlassCard>

        <GlassCard className="p-5 flex flex-col gap-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <Ban className="w-4 h-4" /> Banned Players ({data.banned.length})
          </h4>
          {data.banned.length === 0 ? (
            <p className="text-xs text-slate-500">banned-players.json is empty.</p>
          ) : (
            data.banned.map(b => (
              <div key={b.name} className="flex items-center justify-between p-2.5 rounded-lg bg-[#111318] border border-white/5 text-xs">
                <span className="font-mono text-white">{b.name}</span>
                <button type="button" onClick={() => runAction('pardon', b.name)} className="text-[11px] text-emerald-400 hover:underline cursor-pointer">
                  Pardon
                </button>
              </div>
            ))
          )}
        </GlassCard>
      </div>
    </div>
  );
};
