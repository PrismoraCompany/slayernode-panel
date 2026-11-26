import React, { useState, useEffect, useCallback } from 'react';
import { Package, Search, Download, Check, ExternalLink } from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { apiJson } from '../../lib/api';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';

interface ModrinthHit {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string;
  author: string;
  downloads: number;
  categories?: string[];
  project_type: string;
}

export const ModpackBrowser: React.FC = () => {
  const { activeServer } = useServers();
  const [query, setQuery] = useState('');
  const [projectType, setProjectType] = useState<'plugin' | 'mod'>('plugin');
  const [hits, setHits] = useState<ModrinthHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installedMap, setInstalledMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const searchModrinth = useCallback(async (q = query, type = projectType) => {
    if (!activeServer) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiJson<{ hits: ModrinthHit[] }>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/addons/mods/search?q=${encodeURIComponent(q)}&type=${type}`
      );
      setHits(Array.isArray(res?.hits) ? res.hits : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to query Modrinth catalog.');
      setHits([]);
    } finally {
      setLoading(false);
    }
  }, [activeServer?.uuid, query, projectType]);

  useEffect(() => {
    setInstalledMap({});
    searchModrinth('', projectType);
  }, [activeServer?.uuid, projectType]);

  if (!activeServer) return null;

  const handleInstall = async (item: ModrinthHit) => {
    setInstallingId(item.project_id);
    setError(null);
    try {
      const targetDir = projectType === 'mod' ? '/mods' : '/plugins';
      const res = await apiJson<{ filename: string }>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/addons/mods/install`,
        {
          method: 'POST',
          body: JSON.stringify({ project_id: item.project_id, directory: targetDir }),
        }
      );
      setInstalledMap(prev => ({ ...prev, [item.project_id]: res?.filename || 'Installed' }));
    } catch (err: any) {
      setError(err?.message || `Failed installing ${item.title}.`);
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Live Modrinth Plugins &amp; Mods</h3>
            <p className="text-xs text-slate-400">
              Downloads directly into <code className="text-slate-300">{projectType === 'mod' ? '/mods' : '/plugins'}</code> inside this container.
            </p>
          </div>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            searchModrinth(query, projectType);
          }}
          className="flex items-center gap-2 flex-wrap"
        >
          <select
            value={projectType}
            onChange={e => setProjectType(e.target.value as any)}
            className="glass-input px-3 py-2 text-xs text-white"
          >
            <option value="plugin">Plugins (/plugins)</option>
            <option value="mod">Mods (/mods)</option>
          </select>
          <div className="w-60">
            <GlassInput
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search EssentialsX, LuckPerms, Lithium..."
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <GlassButton type="submit" variant="primary" size="sm" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </GlassButton>
        </form>
      </GlassCard>

      {error && (
        <div className="px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {hits.map(item => (
          <GlassCard key={item.project_id} className="p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              {item.icon_url ? (
                <img src={item.icon_url} alt={item.title} className="w-10 h-10 rounded-xl object-cover bg-slate-900 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                  <a
                    href={`https://modrinth.com/${item.project_type}/${item.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-white shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-400 font-mono">
                  by {item.author} • {item.downloads.toLocaleString()} DLs
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 line-clamp-2 flex-1">{item.description}</p>

            <div className="pt-2 border-t border-white/5 flex justify-end">
              {installedMap[item.project_id] ? (
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {installedMap[item.project_id]}
                </span>
              ) : (
                <GlassButton
                  variant="primary"
                  size="sm"
                  disabled={installingId === item.project_id}
                  onClick={() => handleInstall(item)}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  {installingId === item.project_id ? 'Downloading...' : 'Install'}
                </GlassButton>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
