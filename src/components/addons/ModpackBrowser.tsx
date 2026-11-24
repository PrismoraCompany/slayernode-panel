import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Search,
  Download,
  Check,
  RefreshCw,
  ExternalLink,
  Trash2,
  Filter,
  Sparkles,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { GlassBadge } from '../ui/GlassBadge';
import { ModItem } from '../../types';

const SAMPLE_MODS: ModItem[] = [
  {
    id: 'lithium',
    slug: 'lithium',
    title: 'Lithium',
    description: 'General-purpose optimization mod for Fabric/NeoForge that improves tick rates and chunk physics.',
    icon_url: 'https://cdn.modrinth.com/data/gvQqBUqZ/icon.png',
    author: 'CaffeineMC',
    downloads: 14200000,
    follows: 45000,
    source: 'modrinth',
    categories: ['optimization', 'performance'],
    loaders: ['fabric', 'neoforge', 'purpur'],
    game_versions: ['1.21.4', '1.21.1', '1.20.4'],
    installed: true,
    installed_version: '0.25.3',
    latest_version: '0.25.3',
  },
  {
    id: 'viaversion',
    slug: 'viaversion',
    title: 'ViaVersion',
    description: 'Allows newer Minecraft client versions to connect to an older server version seamlessly.',
    icon_url: 'https://cdn.modrinth.com/data/P1OZGk5p/icon.png',
    author: 'ViaVersion Team',
    downloads: 21500000,
    follows: 62000,
    source: 'hangar',
    categories: ['utility', 'protocol'],
    loaders: ['paper', 'purpur', 'velocity', 'fabric'],
    game_versions: ['1.21.4', '1.21.1', '1.20.x'],
    installed: true,
    installed_version: '5.2.0',
    latest_version: '5.2.1', // update available!
  },
  {
    id: 'essentialsx',
    slug: 'essentialsx',
    title: 'EssentialsX',
    description: 'The essential plugin suite for Bukkit/Spigot/Paper servers, providing teleports, economy, and kits.',
    icon_url: 'https://cdn.modrinth.com/data/507DE70U/icon.png',
    author: 'EssentialsX Team',
    downloads: 38000000,
    follows: 98000,
    source: 'spigot',
    categories: ['economy', 'admin', 'management'],
    loaders: ['paper', 'purpur', 'spigot'],
    game_versions: ['1.21.4', '1.21.1'],
    installed: false,
    latest_version: '2.20.1',
  },
  {
    id: 'spark',
    slug: 'spark',
    title: 'spark',
    description: 'Performance profiler for Minecraft clients, servers, and proxies with CPU and memory flame graphs.',
    icon_url: 'https://cdn.modrinth.com/data/l6YH9Als/icon.png',
    author: 'lucko',
    downloads: 18900000,
    follows: 51000,
    source: 'modrinth',
    categories: ['optimization', 'profiling'],
    loaders: ['paper', 'purpur', 'fabric', 'forge', 'velocity'],
    game_versions: ['1.21.4', '1.21.x'],
    installed: true,
    installed_version: '1.10.53',
    latest_version: '1.10.53',
  },
  {
    id: 'chunky',
    slug: 'chunky',
    title: 'Chunky',
    description: 'Pre-generates chunks rapidly to eliminate exploration lag and stutter on multi-user servers.',
    icon_url: 'https://cdn.modrinth.com/data/fALzjamp/icon.png',
    author: 'pop4959',
    downloads: 9400000,
    follows: 29000,
    source: 'curseforge',
    categories: ['world-generation', 'performance'],
    loaders: ['paper', 'purpur', 'fabric', 'forge'],
    game_versions: ['1.21.4', '1.21.1'],
    installed: false,
    latest_version: '1.4.16',
  },
  {
    id: 'simple-voice-chat',
    slug: 'simple-voice-chat',
    title: 'Simple Voice Chat',
    description: 'Proximity voice chat in Minecraft with opus audio codec, 3D positional audio, and group channels.',
    icon_url: 'https://cdn.modrinth.com/data/9eGKb6K1/icon.png',
    author: 'henkelmax',
    downloads: 24000000,
    follows: 88000,
    source: 'modrinth',
    categories: ['voice', 'chat', 'social'],
    loaders: ['paper', 'purpur', 'fabric', 'forge', 'velocity'],
    game_versions: ['1.21.4', '1.21.1'],
    installed: false,
    latest_version: '2.5.25',
  },
];

export const ModpackBrowser: React.FC = () => {
  const [mods, setMods] = useState<ModItem[]>(SAMPLE_MODS);
  const [activeTab, setActiveTab] = useState<'browse' | 'installed'>('browse');
  const [search, setSearch] = useState('');
  const [selectedLoader, setSelectedLoader] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [installingId, setInstallingId] = useState<string | null>(null);

  const handleInstall = (modId: string) => {
    setInstallingId(modId);
    setTimeout(() => {
      setMods(prev =>
        prev.map(m =>
          m.id === modId
            ? { ...m, installed: true, installed_version: m.latest_version }
            : m
        )
      );
      setInstallingId(null);
    }, 1200);
  };

  const handleUninstall = (modId: string) => {
    setMods(prev =>
      prev.map(m => (m.id === modId ? { ...m, installed: false } : m))
    );
  };

  const filteredMods = mods.filter(m => {
    if (activeTab === 'installed' && !m.installed) return false;
    const matchSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase());
    const matchLoader = selectedLoader === 'all' || m.loaders.includes(selectedLoader);
    const matchSource = selectedSource === 'all' || m.source === selectedSource;
    return matchSearch && matchLoader && matchSource;
  });

  const installedCount = mods.filter(m => m.installed).length;
  const updatesCount = mods.filter(m => m.installed && m.installed_version !== m.latest_version).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-sky-400" /> Unified Plugin & Modpack Installer
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse and 1-click install from Modrinth, CurseForge, Hangar, and SpigotMC with dependency auto-resolve.
          </p>
        </div>

        {/* View Switcher Pill */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-900/80 border border-white/10">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'browse' ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Explore Catalog
          </button>
          <button
            onClick={() => setActiveTab('installed')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'installed' ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Installed ({installedCount})</span>
            {updatesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Updates Available" />
            )}
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <GlassInput
            placeholder="Search plugins and mods..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <select
          value={selectedLoader}
          onChange={e => setSelectedLoader(e.target.value)}
          className="glass-input text-xs px-3 py-2.5 bg-slate-900/90 text-slate-200 cursor-pointer"
        >
          <option value="all">All Loaders</option>
          <option value="paper">Paper / Purpur</option>
          <option value="fabric">Fabric</option>
          <option value="forge">Forge</option>
          <option value="neoforge">NeoForge</option>
          <option value="velocity">Velocity</option>
        </select>

        <select
          value={selectedSource}
          onChange={e => setSelectedSource(e.target.value)}
          className="glass-input text-xs px-3 py-2.5 bg-slate-900/90 text-slate-200 cursor-pointer"
        >
          <option value="all">All Sources</option>
          <option value="modrinth">Modrinth</option>
          <option value="curseforge">CurseForge</option>
          <option value="hangar">Hangar</option>
          <option value="spigot">SpigotMC</option>
        </select>
      </div>

      {/* Mod Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMods.map(mod => {
          const hasUpdate = mod.installed && mod.installed_version !== mod.latest_version;
          const isBusy = installingId === mod.id;

          return (
            <GlassCard key={mod.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-3.5 mb-3">
                  <img
                    src={mod.icon_url}
                    alt={mod.title}
                    className="w-12 h-12 rounded-xl object-cover bg-slate-800 border border-white/10 shrink-0"
                  />
                  <div className="truncate flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-white truncate">{mod.title}</h3>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                        {mod.source}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">by {mod.author}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 mb-3">
                  {mod.description}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  {mod.loaders.map(loader => (
                    <span
                      key={loader}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-slate-400 font-mono"
                    >
                      {loader}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer: Install / Update / Remove */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-auto">
                <span className="text-[11px] text-slate-400 font-mono">
                  {mod.installed ? `v${mod.installed_version}` : `v${mod.latest_version}`}
                </span>

                {mod.installed ? (
                  <div className="flex items-center gap-2">
                    {hasUpdate ? (
                      <GlassButton
                        size="sm"
                        variant="accent"
                        isLoading={isBusy}
                        onClick={() => handleInstall(mod.id)}
                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                      >
                        Update to {mod.latest_version}
                      </GlassButton>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Installed
                      </span>
                    )}

                    <button
                      onClick={() => handleUninstall(mod.id)}
                      title="Uninstall plugin jar"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <GlassButton
                    size="sm"
                    variant="glass"
                    isLoading={isBusy}
                    onClick={() => handleInstall(mod.id)}
                    leftIcon={<Download className="w-3.5 h-3.5 text-sky-400" />}
                  >
                    1-Click Install
                  </GlassButton>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};
