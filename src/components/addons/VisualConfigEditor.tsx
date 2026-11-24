import React, { useState } from 'react';
import { Sliders, Save, Code, Check, Eye } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { GlassToggle } from '../ui/GlassToggle';

interface ServerPropertyConfig {
  motd: string;
  server_port: number;
  max_players: number;
  difficulty: string;
  gamemode: string;
  pvp: boolean;
  spawn_monsters: boolean;
  spawn_animals: boolean;
  allow_nether: boolean;
  allow_flight: boolean;
  enable_command_block: boolean;
  view_distance: number;
  simulation_distance: number;
  white_list: boolean;
  online_mode: boolean;
}

export const VisualConfigEditor: React.FC = () => {
  const [config, setConfig] = useState<ServerPropertyConfig>({
    motd: '§b§lSlayerCraft §8§l| §fNext-Gen Survival §7[1.21.4]',
    server_port: 25565,
    max_players: 100,
    difficulty: 'hard',
    gamemode: 'survival',
    pvp: true,
    spawn_monsters: true,
    spawn_animals: true,
    allow_nether: true,
    allow_flight: false,
    enable_command_block: true,
    view_distance: 10,
    simulation_distance: 10,
    white_list: false,
    online_mode: true,
  });

  const [activeFile, setActiveFile] = useState<'server.properties' | 'bukkit.yml' | 'spigot.yml' | 'paper-global.yml'>('server.properties');
  const [rawMode, setRawMode] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Convert Minecraft Color Codes (§0-f, §l, §n, etc.) to Styled HTML
  const renderMotdPreview = (text: string) => {
    const colorMap: Record<string, string> = {
      '0': '#000000',
      '1': '#0000AA',
      '2': '#00AA00',
      '3': '#00AAAA',
      '4': '#AA0000',
      '5': '#AA00AA',
      '6': '#FFAA00',
      '7': '#AAAAAA',
      '8': '#555555',
      '9': '#5555FF',
      'a': '#55FF55',
      'b': '#55FFFF',
      'c': '#FF5555',
      'd': '#FF55FF',
      'e': '#FFFF55',
      'f': '#FFFFFF',
    };

    const parts = text.split(/(§[0-9a-fk-or])/gi);
    let currentColor = '#FFFFFF';
    let isBold = false;

    return (
      <span className="font-mono text-sm">
        {parts.map((part, idx) => {
          if (part.startsWith('§')) {
            const code = part.slice(1).toLowerCase();
            if (colorMap[code]) {
              currentColor = colorMap[code];
              isBold = false;
            } else if (code === 'l') {
              isBold = true;
            } else if (code === 'r') {
              currentColor = '#FFFFFF';
              isBold = false;
            }
            return null;
          }
          return (
            <span
              key={idx}
              style={{ color: currentColor, fontWeight: isBold ? 'bold' : 'normal' }}
            >
              {part}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-400" /> Visual Config & server.properties Editor
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Intuitive GUI toggles, sliders, and live MOTD preview for server configuration files.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <GlassButton
            size="sm"
            variant="glass"
            onClick={() => setRawMode(!rawMode)}
            leftIcon={<Code className="w-4 h-4" />}
          >
            {rawMode ? 'Switch to Visual GUI' : 'Raw File Editor'}
          </GlassButton>

          <GlassButton
            size="sm"
            variant="accent"
            onClick={handleSave}
            leftIcon={saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          >
            {saved ? 'Saved!' : 'Save Properties'}
          </GlassButton>
        </div>
      </div>

      {/* File Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-xs">
        {(['server.properties', 'bukkit.yml', 'spigot.yml', 'paper-global.yml'] as const).map(file => (
          <button
            key={file}
            onClick={() => setActiveFile(file)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              activeFile === file
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {file}
          </button>
        ))}
      </div>

      {/* MOTD Preview Card */}
      <GlassCard className="p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-sky-400" /> Live In-Game Multiplayer Server List MOTD Preview
          </span>
          <span className="text-[11px] text-slate-400 font-mono">20/100 Players</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-white/10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center border border-white/15">
            <Sliders className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1 truncate">
            <div className="text-xs font-bold text-white mb-0.5">SlayerCraft Network</div>
            <div>{renderMotdPreview(config.motd)}</div>
          </div>
        </div>

        <GlassInput
          label="Server MOTD (Supports § color formatting codes)"
          value={config.motd}
          onChange={e => setConfig({ ...config, motd: e.target.value })}
        />
      </GlassCard>

      {/* Visual Settings Grid */}
      {!rawMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <GlassCard className="p-4 flex flex-col gap-3">
            <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">Gameplay Settings</h4>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Game Difficulty</label>
                <select
                  value={config.difficulty}
                  onChange={e => setConfig({ ...config, difficulty: e.target.value })}
                  className="glass-input w-full px-3 py-2 text-xs bg-slate-900 text-white"
                >
                  <option value="peaceful">Peaceful</option>
                  <option value="easy">Easy</option>
                  <option value="normal">Normal</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Default Gamemode</label>
                <select
                  value={config.gamemode}
                  onChange={e => setConfig({ ...config, gamemode: e.target.value })}
                  className="glass-input w-full px-3 py-2 text-xs bg-slate-900 text-white"
                >
                  <option value="survival">Survival</option>
                  <option value="creative">Creative</option>
                  <option value="adventure">Adventure</option>
                </select>
              </div>

              <GlassToggle
                label="PvP (Player vs Player)"
                description="Allow players to damage each other"
                checked={config.pvp}
                onChange={v => setConfig({ ...config, pvp: v })}
              />

              <GlassToggle
                label="Allow Nether"
                description="Enable Nether dimension portals"
                checked={config.allow_nether}
                onChange={v => setConfig({ ...config, allow_nether: v })}
              />
            </div>
          </GlassCard>

          <GlassCard className="p-4 flex flex-col gap-3">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">World & Spawning</h4>
            <div className="flex flex-col gap-3">
              <GlassToggle
                label="Spawn Monsters"
                description="Spawn hostile mobs like zombies and creepers"
                checked={config.spawn_monsters}
                onChange={v => setConfig({ ...config, spawn_monsters: v })}
              />

              <GlassToggle
                label="Spawn Animals"
                description="Spawn passive livestock animals"
                checked={config.spawn_animals}
                onChange={v => setConfig({ ...config, spawn_animals: v })}
              />

              <GlassToggle
                label="Command Blocks"
                description="Enable command block redstone logic"
                checked={config.enable_command_block}
                onChange={v => setConfig({ ...config, enable_command_block: v })}
              />

              <GlassToggle
                label="Allow Flight"
                description="Prevent kick on survival flying"
                checked={config.allow_flight}
                onChange={v => setConfig({ ...config, allow_flight: v })}
              />
            </div>
          </GlassCard>

          <GlassCard className="p-4 flex flex-col gap-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Network & Security</h4>
            <div className="flex flex-col gap-3">
              <GlassInput
                label="Max Player Slots"
                type="number"
                value={config.max_players}
                onChange={e => setConfig({ ...config, max_players: parseInt(e.target.value) || 0 })}
              />

              <GlassInput
                label="View Distance (Chunks)"
                type="number"
                value={config.view_distance}
                onChange={e => setConfig({ ...config, view_distance: parseInt(e.target.value) || 10 })}
              />

              <GlassToggle
                label="Online Mode (Mojang Auth)"
                description="Require authentic paid Minecraft accounts"
                checked={config.online_mode}
                onChange={v => setConfig({ ...config, online_mode: v })}
              />

              <GlassToggle
                label="Enforce Whitelist"
                description="Only allowed players can join"
                checked={config.white_list}
                onChange={v => setConfig({ ...config, white_list: v })}
              />
            </div>
          </GlassCard>
        </div>
      ) : (
        <GlassCard className="p-4">
          <textarea
            rows={16}
            value={Object.entries(config)
              .map(([k, v]) => `${k.replace(/_/g, '-')}=${v}`)
              .join('\n')}
            onChange={() => {}}
            className="w-full bg-slate-950/80 p-4 font-mono text-xs text-slate-100 rounded-xl border border-white/10 resize-none selection:bg-sky-500/30"
          />
        </GlassCard>
      )}
    </div>
  );
};
