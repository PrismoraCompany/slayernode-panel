import React, { useState } from 'react';
import { Key, Plus, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';
import { apiFetch } from '../../lib/api';

interface ApiKeyItem {
  identifier: string;
  description: string;
  allowed_ips: string[];
  created_at: string;
  last_used_at: string | null;
}

export const AdminApiKeys: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [description, setDescription] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    apiFetch('/api/application/api-keys')
      .then(res => res.json())
      .then(d => {
        if (d && Array.isArray(d.data)) {
          setKeys(d.data.map((x: any) => ({ ...x, description: x.description || x.memo || '' })));
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateKey = async () => {
    if (!description.trim()) {
      setError('Description is required for tracking API key usage.');
      return;
    }
    setError(null);
    try {
      const res = await apiFetch('/api/application/api-keys', {
        method: 'POST',
        body: JSON.stringify({ memo: description.trim(), description: description.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        const created = d.attributes || d;
        setKeys(prev => [{ ...created, description: created.description || created.memo || description.trim() }, ...prev]);
        setNewlyCreatedKey(d.secret_token || d.secret || '');
        setDescription('');
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to generate API credentials.');
      }
    } catch {
      setError('Network error while creating API key.');
    }
  };

  const handleRevoke = async (identifier: string) => {
    try {
      const res = await apiFetch(`/api/application/api-keys/${encodeURIComponent(identifier)}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys(prev => prev.filter(k => k.identifier !== identifier));
      }
    } catch {}
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Key className="w-5 h-5 text-red-500" /> Application API Credentials
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Generate service tokens for automated billing systems (WHMCS, Blesta), Discord bots, and CI/CD pipelines.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          onClick={() => {
            setError(null);
            setShowCreateModal(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create API Key
        </GlassButton>
      </div>

      {keys.length === 0 ? (
        <div className="p-10 rounded-lg bg-[#181A20] border border-white/10 text-center flex flex-col items-center justify-center">
          <div className="p-3 rounded-lg bg-red-600/10 text-red-500 mb-3 border border-red-600/20">
            <Key className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No API Keys Generated</h3>
          <p className="text-xs text-slate-400 max-w-md mb-4">
            You haven't generated any application API tokens yet. Create keys to programmatically manage servers and users.
          </p>
          <GlassButton
            variant="accent"
            size="sm"
            onClick={() => {
              setError(null);
              setShowCreateModal(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Generate First API Key
          </GlassButton>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {keys.map(key => (
            <GlassCard key={key.identifier} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-red-600/10 text-red-500 border border-red-600/20">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{key.description}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    ID: <span className="text-red-400">{key.identifier}</span> • Created {key.created_at} • Last used: {key.last_used_at || 'Never'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleRevoke(key.identifier)}
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                title="Revoke Token"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </GlassCard>
          ))}
        </div>
      )}

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
            <div className="p-3.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Copy your API secret key now. It will not be shown again!</span>
            </div>
            <pre className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-red-400 select-all border border-white/10 break-all">
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
            {error && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-600/40 text-red-500 font-bold text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <GlassInput
              label="Description / Purpose"
              placeholder="e.g. WHMCS Provisioning Service"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
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
