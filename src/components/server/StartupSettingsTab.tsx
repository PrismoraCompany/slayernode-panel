import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, Save, Check, Terminal } from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { useAuth } from '../../context/AuthContext';
import { apiJson } from '../../lib/api';
import { ServerEggVariable } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';

export const StartupSettingsTab: React.FC = () => {
  const { activeServer, refreshServers } = useServers();
  const { isAdmin } = useAuth();

  const [startupCommand, setStartupCommand] = useState('');
  const [dockerImage, setDockerImage] = useState('');
  const [variables, setVariables] = useState<ServerEggVariable[]>([]);
  const [valuesMap, setValuesMap] = useState<Record<string, string>>({});
  const [savingVar, setSavingVar] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStartup = useCallback(async () => {
    if (!activeServer) return;
    try {
      const res = await apiJson<{
        startup_command: string;
        docker_image: string;
        variables: ServerEggVariable[];
      }>(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/startup`);
      setStartupCommand(res?.startup_command || activeServer.startup || '');
      setDockerImage(res?.docker_image || activeServer.docker_image || '');
      const vars = Array.isArray(res?.variables) ? res.variables : [];
      setVariables(vars);
      const map: Record<string, string> = {};
      for (const v of vars) map[v.env_variable] = v.server_value ?? v.default_value ?? '';
      setValuesMap(map);
    } catch {
      setStartupCommand(activeServer.startup || '');
    }
  }, [activeServer?.uuid]);

  useEffect(() => {
    loadStartup();
  }, [loadStartup]);

  if (!activeServer) return null;

  const handleSaveVariable = async (envKey: string) => {
    setSavingVar(envKey);
    setError(null);
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/startup/variable`, {
        method: 'PUT',
        body: JSON.stringify({ key: envKey, value: valuesMap[envKey] ?? '' }),
      });
      await refreshServers();
      setSavedKey(envKey);
      setTimeout(() => setSavedKey(null), 1500);
    } catch (err: any) {
      setError(err?.message || `Failed saving ${envKey}.`);
    } finally {
      setSavingVar(null);
    }
  };

  const handleSaveStartupCmd = async () => {
    setSavingVar('__cmd__');
    setError(null);
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/startup/variable`, {
        method: 'PUT',
        body: JSON.stringify({ startup_command: startupCommand, docker_image: dockerImage }),
      });
      await refreshServers();
      setSavedKey('__cmd__');
      setTimeout(() => setSavedKey(null), 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed saving startup command.');
    } finally {
      setSavingVar(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Startup Invocation &amp; Runtime Image</h3>
            <p className="text-xs text-slate-400">Command template resolved inside isolated container when booted.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-300">Startup Command</label>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
              <textarea
                rows={2}
                readOnly={!isAdmin}
                value={startupCommand}
                onChange={e => setStartupCommand(e.target.value)}
                className="glass-input flex-1 px-3 py-2 font-mono text-xs text-emerald-300 resize-y leading-relaxed"
              />
              {isAdmin && (
                <GlassButton variant="primary" size="sm" onClick={handleSaveStartupCmd} disabled={savingVar === '__cmd__'}>
                  {savedKey === '__cmd__' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4 mr-1" />}
                  {savedKey === '__cmd__' ? 'Saved' : 'Save'}
                </GlassButton>
              )}
            </div>
          </div>

          <GlassInput
            label="Container Image"
            value={dockerImage}
            onChange={e => setDockerImage(e.target.value)}
            readOnly={!isAdmin}
          />
        </div>

        {error && (
          <div className="px-3.5 py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Environment Variables</h3>
            <p className="text-xs text-slate-400">Per-server variables injected cleanly into container boot.</p>
          </div>
        </div>

        {variables.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">No editable egg variables configured for this server type.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {variables.map(v => (
              <div key={v.env_variable} className="p-4 rounded-xl bg-[#111318] border border-white/10 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{v.name}</span>
                  <code className="text-[11px] font-mono text-red-400">{v.env_variable}</code>
                </div>
                {v.description && <p className="text-[11px] text-slate-400">{v.description}</p>}
                <div className="flex items-center gap-2 mt-auto">
                  <input
                    type="text"
                    readOnly={!v.is_editable && !isAdmin}
                    value={valuesMap[v.env_variable] ?? ''}
                    onChange={e => setValuesMap(prev => ({ ...prev, [v.env_variable]: e.target.value }))}
                    className="glass-input flex-1 px-3 py-1.5 font-mono text-xs text-white"
                  />
                  {(v.is_editable || isAdmin) && (
                    <GlassButton
                      variant="secondary"
                      size="sm"
                      disabled={savingVar === v.env_variable}
                      onClick={() => handleSaveVariable(v.env_variable)}
                    >
                      {savedKey === v.env_variable ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : 'Save'}
                    </GlassButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
