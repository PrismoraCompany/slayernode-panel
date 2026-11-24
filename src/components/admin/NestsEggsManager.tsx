import React, { useState } from 'react';
import { Zap, Plus, Download, Upload, Box, Code, Check, Edit2 } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';
import { Nest, Egg } from '../../types';

export const INITIAL_NESTS: Nest[] = [
  {
    id: 1,
    uuid: 'nest-minecraft',
    author: 'engine@slayernode.xyz',
    name: 'Minecraft',
    description: 'Minecraft - the sandbox building and exploration block game developed by Mojang Studios.',
    eggs_count: 8,
    servers_count: 22,
    created_at: '2026-11-10',
  },
  {
    id: 2,
    uuid: 'nest-steam',
    author: 'engine@slayernode.xyz',
    name: 'Steam Dedicated Games',
    description: 'Popular games using SteamCMD runtime such as Rust, ARK, CS2, Palworld, and Team Fortress.',
    eggs_count: 14,
    servers_count: 9,
    created_at: '2026-11-12',
  },
  {
    id: 3,
    uuid: 'nest-bots',
    author: 'engine@slayernode.xyz',
    name: 'Voice & Discord Bots',
    description: 'Node.js, Python, and Go generic application workers.',
    eggs_count: 2,
    servers_count: 0,
    created_at: '2026-11-15',
  },
];

export const INITIAL_EGGS: Egg[] = [
  {
    id: 1,
    uuid: 'egg-purpur-mc',
    nest_id: 1,
    nest_name: 'Minecraft',
    author: 'admin@slayernode.xyz',
    name: 'Purpur / Paper Minecraft',
    description: 'High performance fork with Folia/Aikar flags and JLine ANSI terminal support.',
    docker_images: {
      'Java 21 (Default)': 'ghcr.io/slayernode/yolks:java_21',
      'Java 17 (Legacy)': 'ghcr.io/slayernode/yolks:java_17',
    },
    startup: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}',
    config: {
      files: {
        'server.properties': { parser: 'properties', find: { 'server-ip': '0.0.0.0', 'server-port': '{{server.build.default.port}}' } },
      },
      startup: { done: ')! For help, type ' },
      stop: 'stop',
    },
    variables: [
      { name: 'Server Jar File', description: 'Executable jar', env_variable: 'SERVER_JARFILE', default_value: 'purpur.jar', server_value: 'purpur-1.21.4.jar', is_editable: true, rules: 'required|string' },
      { name: 'Build Number', description: 'Purpur build version', env_variable: 'BUILD_NUMBER', default_value: 'latest', server_value: 'latest', is_editable: true, rules: 'required|string' },
    ],
  },
  {
    id: 2,
    uuid: 'egg-velocity-proxy',
    nest_id: 1,
    nest_name: 'Minecraft',
    author: 'admin@slayernode.xyz',
    name: 'Velocity Proxy',
    description: 'Next-generation Minecraft proxy with high packet throughput and modern DDoS mitigations.',
    docker_images: {
      'Java 21': 'ghcr.io/slayernode/yolks:java_21',
    },
    startup: 'java -Xms512M -Xmx{{SERVER_MEMORY}}M -XX:+UseG1GC -jar {{SERVER_JARFILE}}',
    config: {
      files: {},
      startup: { done: 'Booting Velocity' },
      stop: 'end',
    },
    variables: [
      { name: 'Server Jar File', description: 'Velocity Jar', env_variable: 'SERVER_JARFILE', default_value: 'velocity.jar', server_value: 'velocity.jar', is_editable: true, rules: 'required|string' },
    ],
  },
  {
    id: 3,
    uuid: 'egg-rust-dedicated',
    nest_id: 2,
    nest_name: 'Steam Dedicated Games',
    author: 'admin@slayernode.xyz',
    name: 'Rust Dedicated',
    description: 'Facepunch Rust experimental survival multi-threaded server instance.',
    docker_images: {
      'Rust Yolks': 'ghcr.io/slayernode/games:rust',
    },
    startup: './RustDedicated -batchmode +server.port {{SERVER_PORT}} +server.level "Procedural Map" +server.seed {{MAP_SEED}} +server.worldsize {{WORLD_SIZE}} +server.maxplayers {{MAX_PLAYERS}}',
    config: {
      files: {},
      startup: { done: 'Server startup complete' },
      stop: 'quit',
    },
    variables: [
      { name: 'Map Seed', description: 'Procedural map seed', env_variable: 'MAP_SEED', default_value: '1337', server_value: '1337', is_editable: true, rules: 'numeric' },
      { name: 'World Size', description: 'World map size in meters', env_variable: 'WORLD_SIZE', default_value: '4000', server_value: '4000', is_editable: true, rules: 'numeric' },
      { name: 'Max Players', description: 'Player slots', env_variable: 'MAX_PLAYERS', default_value: '200', server_value: '200', is_editable: true, rules: 'numeric' },
    ],
  },
];

export const NestsEggsManager: React.FC = () => {
  const [nests, setNests] = useState<Nest[]>(INITIAL_NESTS);
  const [eggs, setEggs] = useState<Egg[]>(INITIAL_EGGS);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNewEggModal, setShowNewEggModal] = useState(false);
  const [importedJsonText, setImportedJsonText] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  // New Egg State
  const [newEggName, setNewEggName] = useState('');
  const [newEggDesc, setNewEggDesc] = useState('');
  const [newEggNestId, setNewEggNestId] = useState('1');
  const [newEggStartup, setNewEggStartup] = useState('java -jar server.jar');
  const [newEggDocker, setNewEggDocker] = useState('ghcr.io/slayernode/yolks:java_21');

  const exportEggJson = (egg: Egg) => {
    const slayerEgg = {
      _comment: 'DO NOT EDIT THIS FILE. IT IS MEANT TO BE IMPORTED THROUGH THE SLAYERNODE PANEL.',
      meta: { version: 'SLAYER_EGG_v1', update_url: null },
      exported_at: new Date().toISOString(),
      name: egg.name,
      author: egg.author,
      description: egg.description,
      features: null,
      docker_images: egg.docker_images,
      file_denylist: [],
      startup: egg.startup,
      config: egg.config,
      scripts: {
        installation: {
          script: '#!/bin/bash\n# Egg installer\ncurl -o {{SERVER_JARFILE}} ...',
          container: 'ghcr.io/slayernode/installers:debian',
          entrypoint: 'bash',
        },
      },
      variables: egg.variables,
    };

    const blob = new Blob([JSON.stringify(slayerEgg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `egg-${egg.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a);
  };

  const handleImportEgg = () => {
    try {
      const parsed = JSON.parse(importedJsonText);
      const newEgg: Egg = {
        id: Date.now(),
        uuid: crypto.randomUUID(),
        nest_id: 1,
        nest_name: 'Minecraft',
        author: parsed.author || 'Imported User',
        name: parsed.name || 'Imported Egg',
        description: parsed.description || '',
        docker_images: parsed.docker_images || { 'Default': 'ghcr.io/slayernode/yolks:java_21' },
        startup: parsed.startup || 'java -jar server.jar',
        config: parsed.config || { files: {}, startup: { done: 'Done' }, stop: 'stop' },
        variables: parsed.variables || [],
      };
      setEggs(prev => [...prev, newEgg]);
      setImportSuccess(true);
      setTimeout(() => {
        setImportSuccess(false);
        setShowImportModal(false);
        setImportedJsonText('');
      }, 1200);
    } catch {
      alert('Invalid SlayerEgg / Game Egg JSON format.');
    }
  };

  const handleCreateEgg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEggName.trim()) return;

    const nest = nests.find(n => String(n.id) === String(newEggNestId)) || nests[0];
    const newEgg: Egg = {
      id: Date.now(),
      uuid: crypto.randomUUID(),
      nest_id: nest.id,
      nest_name: nest.name,
      author: 'admin@slayernode.xyz',
      name: newEggName.trim(),
      description: newEggDesc.trim() || 'Custom game runtime configuration.',
      docker_images: { 'Default Tag': newEggDocker.trim() },
      startup: newEggStartup.trim(),
      config: { files: {}, startup: { done: 'Startup completed' }, stop: 'stop' },
      variables: [],
    };

    setEggs(prev => [...prev, newEgg]);
    setShowNewEggModal(false);
    setNewEggName('');
    setNewEggDesc('');
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" /> Nests & Eggs Catalog
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Game definitions, Docker Yolks runtime templates, and environment startup variables with full JSON import/export parity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <GlassButton
            variant="glass"
            size="sm"
            onClick={() => setShowImportModal(true)}
            leftIcon={<Upload className="w-4 h-4 text-[#00D2FF]" />}
          >
            Import Egg JSON
          </GlassButton>

          <GlassButton
            variant="accent"
            size="sm"
            onClick={() => setShowNewEggModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Egg
          </GlassButton>
        </div>
      </div>

      {/* Eggs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {eggs.map(egg => (
          <GlassCard key={egg.id} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-400/20">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{egg.name}</h3>
                    <p className="text-xs text-slate-400">Nest: {egg.nest_name} • by {egg.author}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 my-2">{egg.description}</p>

              <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5 text-xs font-mono text-slate-300 my-2">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Startup Command:</div>
                <div className="truncate text-[#00D2FF]">{egg.startup}</div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1 font-semibold text-white">
                  <Box className="w-3.5 h-3.5 text-indigo-400" />
                  {Object.keys(egg.docker_images).length} Docker Yolks Tag(s)
                </span>
                <span>•</span>
                <span>{egg.variables.length} Startup Variables</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4 text-xs">
              <button
                onClick={() => exportEggJson(egg)}
                className="text-[#00D2FF] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export Egg JSON
              </button>

              <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                UUID: {egg.uuid.slice(0, 8)}
              </span>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* NEW EGG MODAL */}
      <GlassModal
        isOpen={showNewEggModal}
        onClose={() => setShowNewEggModal(false)}
        title="Create New Game Egg"
        description="Define a new Docker container startup script and Yolks image template"
        maxWidth="md"
      >
        <form onSubmit={handleCreateEgg} className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassInput
              label="Egg Name"
              value={newEggName}
              onChange={e => setNewEggName(e.target.value)}
              placeholder="e.g. Paper 1.21"
              required
            />
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Parent Nest</label>
              <select
                value={newEggNestId}
                onChange={e => setNewEggNestId(e.target.value)}
                className="glass-input w-full px-3 py-2 text-xs bg-slate-900 text-white cursor-pointer"
              >
                {nests.map(n => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>
          </div>

          <GlassInput
            label="Egg Description"
            value={newEggDesc}
            onChange={e => setNewEggDesc(e.target.value)}
            placeholder="Next-gen game container definition"
          />

          <GlassInput
            label="Default Docker Yolks Image"
            value={newEggDocker}
            onChange={e => setNewEggDocker(e.target.value)}
            placeholder="ghcr.io/slayernode/yolks:java_21"
            required
          />

          <GlassInput
            label="Default Startup Script"
            value={newEggStartup}
            onChange={e => setNewEggStartup(e.target.value)}
            placeholder="java -jar {{SERVER_JARFILE}}"
            required
          />

          <div className="pt-2 flex justify-end gap-2">
            <GlassButton variant="ghost" size="sm" type="button" onClick={() => setShowNewEggModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="accent" size="sm" type="submit">
              Save Egg Definition
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* IMPORT MODAL */}
      <GlassModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import SlayerEgg / Game Egg JSON"
        description="Paste standard Egg JSON definition exported from any community egg repository."
        maxWidth="2xl"
      >
        <div className="flex flex-col gap-4 py-2">
          {importSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4" /> Egg imported successfully into Minecraft nest!
            </div>
          ) : (
            <>
              <textarea
                value={importedJsonText}
                onChange={e => setImportedJsonText(e.target.value)}
                placeholder='{ "_comment": "DO NOT EDIT...", "name": "Purpur", ... }'
                rows={12}
                className="w-full p-4 rounded-xl bg-slate-950 border border-white/10 font-mono text-xs text-slate-200 resize-none selection:bg-sky-500/30"
              />
              <div className="flex justify-end gap-2">
                <GlassButton variant="ghost" size="sm" onClick={() => setShowImportModal(false)}>
                  Cancel
                </GlassButton>
                <GlassButton variant="accent" size="sm" onClick={handleImportEgg}>
                  Parse &amp; Import
                </GlassButton>
              </div>
            </>
          )}
        </div>
      </GlassModal>
    </div>
  );
};
