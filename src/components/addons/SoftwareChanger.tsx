import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Download, CheckCircle2 } from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { apiJson } from '../../lib/api';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';

export const SoftwareChanger: React.FC = () => {
  const { activeServer, refreshServers } = useServers();
  const [versions, setVersions] = useState<string[]>([]);
  const [currentVersion, setCurrentVersion] = useState('');
  const [loading, setLoading] = useState(true);
  const [installingVer, setInstallingVer] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    if (!activeServer) return;
    setLoading(true);
    try {
      const res = await apiJson<{ versions: string[]; current_version: string }>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/addons/software`
      );
      setVersions(Array.isArray(res?.versions) ? res.versions : []);
      setCurrentVersion(res?.current_version || '');
    } catch {
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [activeServer?.uuid]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  if (!activeServer) return null;

  const handleInstall = async (ver: string) => {
    setInstallingVer(ver);
    setMessage(null);
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/addons/software/install`, {
        method: 'POST',
        body: JSON.stringify({ project: 'paper', version: ver }),
      });
      setCurrentVersion(ver);
      await refreshServers();
      setMessage(`Installed PaperMC ${ver} cleanly into this container. Restart server to apply.`);
    } catch (err: any) {
      setMessage(`Install failed: ${err?.message}`);
    } finally {
      setInstallingVer(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">PaperMC Version Switcher</h3>
            <p className="text-xs text-slate-400">
              Active configured build: <strong className="text-white font-mono">{currentVersion || activeServer.egg_name}</strong>
            </p>
          </div>
        </div>
      </GlassCard>

      {message && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300">
          {message}
        </div>
      )}

      <GlassCard className="p-5">
        {loading ? (
          <p className="text-sm text-slate-400">Querying PaperMC v3 release index...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {versions.map(ver => {
              const isCurrent = ver === currentVersion;
              return (
                <div
                  key={ver}
                  className={`p-3 rounded-xl border flex flex-col gap-2.5 ${
                    isCurrent ? 'bg-red-500/15 border-red-500/40' : 'bg-[#111318] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-white">{ver}</span>
                    {isCurrent && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <GlassButton
                    variant={isCurrent ? 'secondary' : 'primary'}
                    size="sm"
                    disabled={installingVer !== null}
                    onClick={() => handleInstall(ver)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    {installingVer === ver ? 'Installing...' : isCurrent ? 'Reinstall' : 'Install'}
                  </GlassButton>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
