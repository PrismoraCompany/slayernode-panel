import React, { useState } from 'react';
import { Users, Plus, Shield, Trash2, Key, Check } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';
import { Subuser } from '../../types';

const PERMISSION_GROUPS = [
  {
    title: 'Control',
    permissions: [
      { key: 'control.console', label: 'Send Console Commands' },
      { key: 'control.start', label: 'Start Server' },
      { key: 'control.stop', label: 'Stop Server' },
      { key: 'control.restart', label: 'Restart Server' },
    ],
  },
  {
    title: 'File Management',
    permissions: [
      { key: 'file.create', label: 'Create Files & Folders' },
      { key: 'file.read', label: 'View & Read Files' },
      { key: 'file.update', label: 'Edit & Save Files' },
      { key: 'file.delete', label: 'Delete Files' },
      { key: 'file.archive', label: 'Compress & Extract' },
      { key: 'file.sftp', label: 'Connect via SFTP' },
    ],
  },
  {
    title: 'Administration & Addons',
    permissions: [
      { key: 'addon.plugins', label: 'Install Plugins & Mods' },
      { key: 'addon.players', label: 'Kick & Ban Players' },
      { key: 'database.create', label: 'Create Databases' },
      { key: 'backup.create', label: 'Create Backups' },
    ],
  },
];

export const UsersTab: React.FC = () => {
  const [subusers, setSubusers] = useState<Subuser[]>([
    {
      id: 2,
      uuid: 'sub-9871-3321',
      email: 'dev@slayercraft.net',
      image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=128&q=80',
      two_factor_enabled: true,
      permissions: ['control.console', 'control.start', 'control.restart', 'file.read', 'file.update', 'addon.plugins'],
      created_at: '2026-11-15',
    },
    {
      id: 3,
      uuid: 'sub-4412-8874',
      email: 'moderator@slayercraft.net',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=128&q=80',
      two_factor_enabled: false,
      permissions: ['control.start', 'control.restart', 'addon.players'],
      created_at: '2026-11-18',
    },
  ]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['control.console', 'control.start']);

  const togglePermission = (key: string) => {
    setSelectedPermissions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const applyPreset = (preset: 'admin' | 'mod' | 'dev') => {
    if (preset === 'admin') {
      setSelectedPermissions(PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key)));
    } else if (preset === 'mod') {
      setSelectedPermissions(['control.start', 'control.restart', 'addon.players']);
    } else if (preset === 'dev') {
      setSelectedPermissions(['control.console', 'control.start', 'control.restart', 'file.read', 'file.update', 'addon.plugins']);
    }
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    const newSub: Subuser = {
      id: Date.now(),
      uuid: crypto.randomUUID(),
      email: inviteEmail.trim(),
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80',
      two_factor_enabled: false,
      permissions: selectedPermissions,
      created_at: 'Just now',
    };
    setSubusers(prev => [...prev, newSub]);
    setInviteEmail('');
    setShowInviteModal(false);
  };

  const handleDelete = (id: number) => {
    setSubusers(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" /> Subuser Permissions & Access
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Grant granular server access to teammates, developers, and moderators with custom ACLs.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          onClick={() => setShowInviteModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Subuser
        </GlassButton>
      </div>

      <div className="flex flex-col gap-3">
        {subusers.map(sub => (
          <GlassCard key={sub.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={sub.image}
                alt={sub.email}
                className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-sm"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{sub.email}</h3>
                  {sub.two_factor_enabled && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-400/20 font-semibold">
                      2FA Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {sub.permissions.length} granular permissions granted • Added {sub.created_at}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <GlassButton size="sm" variant="glass">
                Edit Permissions
              </GlassButton>
              <button
                onClick={() => handleDelete(sub.id)}
                className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Invite Modal */}
      <GlassModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Subuser"
        description="Configure permissions for the invited collaborator"
        maxWidth="2xl"
      >
        <div className="flex flex-col gap-4 py-2">
          <GlassInput
            label="User Email Address"
            type="email"
            placeholder="colleague@example.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
          />

          {/* Quick presets */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 font-semibold">Role Presets:</span>
            <button
              onClick={() => applyPreset('admin')}
              className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-medium"
            >
              Full Admin
            </button>
            <button
              onClick={() => applyPreset('dev')}
              className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-medium"
            >
              Developer
            </button>
            <button
              onClick={() => applyPreset('mod')}
              className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-medium"
            >
              Moderator
            </button>
          </div>

          {/* Granular Permission Checkboxes */}
          <div className="flex flex-col gap-4 mt-2 max-h-72 overflow-y-auto p-1">
            {PERMISSION_GROUPS.map(group => (
              <div key={group.title} className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-2">
                  {group.title}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.permissions.map(p => {
                    const checked = selectedPermissions.includes(p.key);
                    return (
                      <label
                        key={p.key}
                        onClick={() => togglePermission(p.key)}
                        className={`flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                          checked ? 'bg-sky-500/15 text-white border border-sky-400/30' : 'text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            checked ? 'bg-sky-500 border-sky-400 text-white' : 'border-white/20 bg-slate-900'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" />}
                        </div>
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <GlassButton variant="ghost" size="sm" onClick={() => setShowInviteModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="accent" size="sm" onClick={handleInvite}>
              Send Invitation
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
