import React, { useState } from 'react';
import { Key, Plus, Trash2, Copy, Check, ShieldCheck } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';

interface ApiKeyItem {
  identifier: string;
  description: string;
  allowed_ips: string[];
  created_at: string;
  last_used_at: string | null;
}

export const AdminApiKeys: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyItem[]>([
    {
      identifier: 'ptdl_app_8a9c4b12',
      description: 'WHMCS Billing Automation & Auto-Provisioning Bot',
      allowed_ips: ['194.164.72.10', '194.164.72.11'],
      created_at: '2026-11-10',
      last_used_at: '10 mins ago',
    },
    {
      identifier: 'ptdl_app_3f7a82c9',
      description: 'Discord Bot Server Status & Player Sync Integration',
      allowed_ips: [],
      created_at: '2026-11-15',
      last_used_at: 'Just now',
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [description, setDescription] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const handleCreateKey = () => {
    if (!description.trim()) return;
    const keyId = 'ptdl_app_' + Math.random().toString(36).substring(2, 10);
    const secret = 'ptla_' + Array.from({ length: 48 }, () => Math.random().toString(36)[2] || 'a').join('');

    const newKey: ApiKeyItem = {
      identifier: keyId,
      description: description.trim(),
      allowed_ips: [],
      created_at: 'Just now',
      last_used_at: null,
    };

    setKeys(prev => [newKey, ...prev]);
    setNewlyCreatedKey(secret);
    setDescription('');
  };

  const handleRevoke = (identifier: string) => {
    setKeys(prev => prev.filter(k => k.identifier !== identifier));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" /> Application API Credentials
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Generate service tokens for automated billing systems (WHMCS, Blesta), Discord bots, and CI/CD pipelines.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create API Key
        </GlassButton>
      </div>

      <div className="flex flex-col gap-3">
        {keys.map(key => (
          <GlassCard key={key.identifier} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-400/20">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{key.description}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  ID: <span className="text-sky-300">{key.identifier}</span> • Created {key.created_at} • Last used: {key.last_used_at || 'Never'}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleRevoke(key.identifier)}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Revoke Token"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </GlassCard>
        ))}
      </div>

      {/* Creation Modal */}
      <GlassModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewlyCreatedKey(null);
        }}
        title={newlyCreatedKey ? 'API Key Generated' : 'Create Application API Key'}
        maxWidth="md"
      >
        {newlyCreatedKey ? (
          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Copy your API secret key now. It will not be shown again!</span>
            </div>
            <pre className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-sky-300 select-all border border-white/10 break-all">
              {newlyCreatedKey}
            </pre>
            <div className="flex justify-end pt-2">
              <GlassButton variant="accent" size="sm" onClick={() => { setShowCreateModal(false); setNewlyCreatedKey(null); }}>
                Done
              </GlassButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <GlassInput
              label="Description"
              placeholder="e.g. WHMCS Provisioning Key"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <GlassButton variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                Cancel
              </GlassButton>
              <GlassButton variant="accent" size="sm" onClick={handleCreateKey}>
                Generate Token
              </GlassButton>
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
};
