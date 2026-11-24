import React, { useState } from 'react';
import { Settings, Save, Box, Terminal, RefreshCw, Check } from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';

export const StartupSettingsTab: React.FC = () => {
  const { activeServer } = useServer();
  const [startupCmd, setStartupCmd] = useState(activeServer?.startup || '');
  const [dockerImage, setDockerImage] = useState(activeServer?.docker_image || 'ghcr.io/slayernode/yolks:java_21');
  const [variables, setVariables] = useState(activeServer?.variables || []);
  const [saved, setSaved] = useState(false);

  const handleVariableChange = (env: string, value: string) => {
    setVariables(prev =>
      prev.map(v => (v.env_variable === env ? { ...v, server_value: value } : v))
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" /> Startup Parameters & Environment
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure Docker container execution command, runtime environment variables, and Yolks image tags.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          onClick={handleSave}
          leftIcon={saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
        >
          {saved ? 'Saved Successfully!' : 'Save Configuration'}
        </GlassButton>
      </div>

      {/* Startup Command & Docker Image */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
            <Terminal className="w-4 h-4" /> Startup Command Template
          </div>
          <p className="text-xs text-slate-400">
            The command executed by SlayerWings daemon inside the container. Tokens inside <code>{"{{VARIABLE}}"}</code> are automatically substituted.
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
            <Box className="w-4 h-4" /> Docker Yolks Image
          </div>
          <p className="text-xs text-slate-400">
            The base container image pulled by SlayerWings daemon to run this Egg.
          </p>
          <GlassInput
            value={dockerImage}
            onChange={e => setDockerImage(e.target.value)}
            placeholder="ghcr.io/slayernode/yolks:java_21"
          />
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
            <span>Popular:</span>
            <button
              onClick={() => setDockerImage('ghcr.io/slayernode/yolks:java_21')}
              className="text-sky-400 hover:underline"
            >
              Java 21
            </button>
            <span>•</span>
            <button
              onClick={() => setDockerImage('ghcr.io/slayernode/yolks:java_17')}
              className="text-sky-400 hover:underline"
            >
              Java 17
            </button>
            <span>•</span>
            <button
              onClick={() => setDockerImage('ghcr.io/slayernode/yolks:java_8')}
              className="text-sky-400 hover:underline"
            >
              Java 8
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
