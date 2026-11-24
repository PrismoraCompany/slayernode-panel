import React, { useState, useEffect } from 'react';
import { Settings, Save, Box, Terminal, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';

export const StartupSettingsTab: React.FC = () => {
  const { activeServer } = useServer();
  const [startupCmd, setStartupCmd] = useState(activeServer?.startup || '');
  const [dockerImage, setDockerImage] = useState(activeServer?.docker_image || 'ghcr.io/pterodactyl/yolks:java_25');
  const [variables, setVariables] = useState<any[]>(activeServer?.variables || []);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!activeServer) return;
    const srvId = activeServer.uuid || activeServer.id;
    fetch(`/api/client/servers/${srvId}/startup`)
      .then(res => res.json())
      .then(d => {
        if (d?.attributes) {
          if (d.attributes.startup) setStartupCmd(d.attributes.startup);
          if (d.attributes.docker_image) setDockerImage(d.attributes.docker_image);
          if (Array.isArray(d.attributes.variables) && d.attributes.variables.length > 0) {
            setVariables(d.attributes.variables);
          }
        }
      })
      .catch(() => {});
  }, [activeServer?.uuid, activeServer?.id]);

  const handleVariableChange = (env: string, value: string) => {
    setVariables(prev =>
      prev.map(v => (v.env_variable === env ? { ...v, server_value: value } : v))
    );
  };

  const handleSave = async () => {
    if (!activeServer) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const srvId = activeServer.uuid || activeServer.id;
      const res = await fetch(`/api/client/servers/${srvId}/startup`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startup: startupCmd,
          docker_image: dockerImage,
          variables,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update startup configuration.');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating startup parameters.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" /> Startup Parameters & Environment
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure OpenJDK runtime flags, execution commands, and Yolks container image tags.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          onClick={handleSave}
          disabled={saving}
          leftIcon={saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
        >
          {saving ? 'Saving...' : saved ? 'Saved Successfully!' : 'Save Configuration'}
        </GlassButton>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Startup Command & Docker Image */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
            <Terminal className="w-4 h-4" /> Startup Command Template
          </div>
          <p className="text-xs text-slate-400">
            The command executed by SlayerWings daemon inside the server volume. Tokens inside <code>{"{{VARIABLE}}"}</code> are automatically substituted.
          </p>
          <textarea
            value={startupCmd}
            onChange={e => setStartupCmd(e.target.value)}
            rows={3}
            className="glass-input p-3 font-mono text-xs text-slate-200 resize-none selection:bg-sky-500/30"
          />
        </GlassCard>

        <GlassCard className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            <Box className="w-4 h-4" /> Docker Yolks Image (OpenJDK Runtime)
          </div>
          <p className="text-xs text-slate-400">
            The base container image and Java environment pulled by SlayerWings daemon to run this Egg.
          </p>
          <GlassInput
            value={dockerImage}
            onChange={e => setDockerImage(e.target.value)}
            placeholder="ghcr.io/pterodactyl/yolks:java_25"
          />
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
            <span>Popular:</span>
            <button
              type="button"
              onClick={() => setDockerImage('ghcr.io/pterodactyl/yolks:java_25')}
              className="text-sky-400 hover:underline font-semibold"
            >
              Java 25 (Default)
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setDockerImage('ghcr.io/pterodactyl/yolks:java_21')}
              className="text-sky-400 hover:underline"
            >
              Java 21 (LTS)
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setDockerImage('ghcr.io/pterodactyl/yolks:java_17')}
              className="text-sky-400 hover:underline"
            >
              Java 17
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Egg Environment Variables */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">Service Environment Variables</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {variables.map(v => (
            <GlassCard key={v.env_variable} className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">{v.name}</span>
                  <span className="text-[11px] font-mono text-sky-400 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-400/20">
                    {v.env_variable}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">{v.description}</p>
                <GlassInput
                  value={v.server_value}
                  onChange={e => handleVariableChange(v.env_variable, e.target.value)}
                  disabled={!v.is_editable}
                />
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
};
