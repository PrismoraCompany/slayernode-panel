import React, { useState } from 'react';
import {
  Users,
  Shield,
  Ban,
  UserX,
  Star,
  Compass,
  Heart,
  Wifi,
  Sparkles,
  CheckCircle2,
  ListFilter,
  Search,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { GlassInput } from '../ui/GlassInput';
import { GlassModal } from '../ui/GlassModal';
import { OnlinePlayer } from '../../types';

const SAMPLE_PLAYERS: OnlinePlayer[] = [
  {
    uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5',
    name: 'Notch',
    ping: 18,
    world: 'minecraft:overworld',
    health: 20,
    gamemode: 'creative',
    is_op: true,
    is_whitelisted: true,
    ip_address: '198.51.100.4',
    joined_at: '2 hours ago',
  },
  {
    uuid: '853c80ef-3c37-49fd-aa49-938b674acde6',
    name: 'jeb_',
    ping: 32,
    world: 'minecraft:overworld',
    health: 18,
    gamemode: 'survival',
    is_op: true,
    is_whitelisted: true,
    ip_address: '198.51.100.12',
    joined_at: '45 mins ago',
  },
  {
    uuid: '616ab5b0-d1c9-4a6f-a6b6-35c3fa9426f4',
    name: 'Dinnerbone',
    ping: 65,
    world: 'minecraft:the_nether',
    health: 14,
    gamemode: 'survival',
    is_op: false,
    is_whitelisted: true,
    ip_address: '203.0.113.88',
    joined_at: '10 mins ago',
  },
  {
    uuid: '4566e69f-c907-48ee-8d71-d7ba5aa00d20',
    name: 'Grian',
    ping: 42,
    world: 'minecraft:the_end',
    health: 20,
    gamemode: 'survival',
    is_op: false,
    is_whitelisted: true,
    ip_address: '198.51.100.99',
    joined_at: '1 hour ago',
  },
];

export const PlayerManager: React.FC = () => {
  const [players, setPlayers] = useState<OnlinePlayer[]>(SAMPLE_PLAYERS);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'online' | 'whitelist' | 'bans' | 'ops'>('online');

  // Action Modals
  const [actionTarget, setActionTarget] = useState<OnlinePlayer | null>(null);
  const [actionType, setActionType] = useState<'kick' | 'ban' | null>(null);
  const [actionReason, setActionReason] = useState('');

  const toggleOp = (uuid: string) => {
    setPlayers(prev =>
      prev.map(p => (p.uuid === uuid ? { ...p, is_op: !p.is_op } : p))
    );
  };

  const changeGamemode = (uuid: string, gm: OnlinePlayer['gamemode']) => {
    setPlayers(prev =>
      prev.map(p => (p.uuid === uuid ? { ...p, gamemode: gm } : p))
    );
  };

  const executeAction = () => {
    if (!actionTarget) return;
    if (actionType === 'kick' || actionType === 'ban') {
      setPlayers(prev => prev.filter(p => p.uuid !== actionTarget.uuid));
    }
    setActionTarget(null);
    setActionType(null);
    setActionReason('');
  };

  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.uuid.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" /> Live Player Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time player monitoring with 3D/2D avatars, health, gamemode switching, and moderation actions.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-900/80 border border-white/10 text-xs">
          <button
            onClick={() => setActiveTab('online')}
            className={`px-3 py-1.5 rounded-full font-semibold cursor-pointer ${
              activeTab === 'online' ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Online ({players.length})
          </button>
          <button
            onClick={() => setActiveTab('whitelist')}
            className={`px-3 py-1.5 rounded-full font-semibold cursor-pointer ${
              activeTab === 'whitelist' ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Whitelist
          </button>
          <button
            onClick={() => setActiveTab('ops')}
            className={`px-3 py-1.5 rounded-full font-semibold cursor-pointer ${
              activeTab === 'ops' ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Operators
          </button>
          <button
            onClick={() => setActiveTab('bans')}
            className={`px-3 py-1.5 rounded-full font-semibold cursor-pointer ${
              activeTab === 'bans' ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Banlist
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="w-full sm:w-72">
        <GlassInput
          placeholder="Search by player name or UUID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Players Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPlayers.map(p => (
          <GlassCard key={p.uuid} className="p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  {/* Minecraft Avatar Head */}
                  <img
                    src={`https://mc-heads.net/avatar/${p.name}/64`}
                    alt={p.name}
                    className="w-12 h-12 rounded-xl object-cover border border-white/20 bg-slate-900 shadow-md shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${p.name}`;
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{p.name}</h3>
                      {p.is_op && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-current" /> OP
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {p.world.replace('minecraft:', '')} • {p.ping}ms ping
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-rose-400 text-xs font-bold font-mono">
                  <Heart className="w-3.5 h-3.5 fill-current" /> {p.health}/20
                </div>
              </div>

              {/* Gamemode Switcher */}
              <div className="flex items-center gap-2 my-3 p-2 rounded-xl bg-slate-950/40 border border-white/5 text-xs">
                <span className="text-slate-400 font-semibold text-[11px]">Gamemode:</span>
                {(['survival', 'creative', 'adventure', 'spectator'] as const).map(gm => (
                  <button
                    key={gm}
                    onClick={() => changeGamemode(p.uuid, gm)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                      p.gamemode === gm
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {gm}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
              <button
                onClick={() => toggleOp(p.uuid)}
                className={`font-semibold transition-colors flex items-center gap-1 ${
                  p.is_op ? 'text-amber-400 hover:text-amber-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                {p.is_op ? 'De-op' : 'Make Operator'}
              </button>

              <div className="flex items-center gap-1.5">
                <GlassButton
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setActionTarget(p);
                    setActionType('kick');
                  }}
                  className="text-amber-400 hover:bg-amber-500/10"
                >
                  Kick
                </GlassButton>
                <GlassButton
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setActionTarget(p);
                    setActionType('ban');
                  }}
                >
                  Ban
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Moderation Confirmation Modal */}
      <GlassModal
        isOpen={!!actionTarget}
        onClose={() => setActionTarget(null)}
        title={`${actionType === 'ban' ? 'Ban Player' : 'Kick Player'}: ${actionTarget?.name}`}
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4 py-2">
          <p className="text-xs text-slate-300">
            Are you sure you want to {actionType} <strong>{actionTarget?.name}</strong> from the server?
          </p>
          <GlassInput
            label="Reason for Action"
            placeholder="e.g. Griefing, unfair advantage, or toxic behavior"
            value={actionReason}
            onChange={e => setActionReason(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setActionTarget(null)}>
              Cancel
            </GlassButton>
            <GlassButton variant="danger" size="sm" onClick={executeAction}>
              Confirm {actionType?.toUpperCase()}
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
