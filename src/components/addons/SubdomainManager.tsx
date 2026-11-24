import React, { useState } from 'react';
import { Globe, Plus, Trash2, CheckCircle2, Shield, Copy, Check, ExternalLink } from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { GlassBadge } from '../ui/GlassBadge';
import { CloudflareSubdomain } from '../../types';

export const SubdomainManager: React.FC = () => {
  const { activeServer } = useServer();

  const [subdomains, setSubdomains] = useState<CloudflareSubdomain[]>([
    {
      id: 'sub_1',
      subdomain: 'play',
      domain: 'slayercraft.net',
      full_domain: 'play.slayercraft.net',
      target_ip: activeServer?.allocation.ip || '194.164.72.12',
      target_port: activeServer?.allocation.port || 25565,
      proxied: false,
      status: 'active',
      created_at: '2026-11-10',
    },
    {
      id: 'sub_2',
      subdomain: 'smp',
      domain: 'slayernode.xyz',
      full_domain: 'smp.slayernode.xyz',
      target_ip: activeServer?.allocation.ip || '194.164.72.12',
      target_port: activeServer?.allocation.port || 25565,
      proxied: false,
      status: 'active',
      created_at: '2026-11-15',
    },
  ]);

  const [prefix, setPrefix] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('slayercraft.net');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const availableDomains = ['slayercraft.net', 'slayernode.xyz', 'playmc.gg'];

  const handleCreateSubdomain = () => {
    if (!prefix.trim()) return;
    setIsCreating(true);

    setTimeout(() => {
      const full = `${prefix.trim().toLowerCase()}.${selectedDomain}`;
      const newSub: CloudflareSubdomain = {
        id: `sub_${Date.now()}`,
        subdomain: prefix.trim().toLowerCase(),
        domain: selectedDomain,
        full_domain: full,
        target_ip: activeServer?.allocation.ip || '194.164.72.12',
        target_port: activeServer?.allocation.port || 25565,
        proxied: false,
        status: 'active',
        created_at: 'Just now',
      };
      setSubdomains(prev => [...prev, newSub]);
      setPrefix('');
      setIsCreating(false);
    }, 1200);
  };

  const handleDelete = (id: string) => {
    setSubdomains(prev => prev.filter(s => s.id !== id));
  };

  const copyDomain = (domain: string, id: string) => {
    navigator.clipboard.writeText(domain);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Globe className="w-5 h-5 text-sky-400" /> Cloudflare Automated Subdomain Manager
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          1-click custom server addresses. Automatically creates Cloudflare <strong>A</strong> and <strong>SRV</strong> DNS records so players join without typing raw ports.
        </p>
      </div>

      {/* Cloudflare Badge */}
      <GlassCard className="p-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300">
            Cloudflare DNS API Gateway is connected with automatic SSL edge security & DDoS mitigation.
          </span>
        </div>
        <span className="text-emerald-400 font-mono font-semibold text-[11px] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Synced
        </span>
      </GlassCard>

      {/* Creator Form */}
      <GlassCard className="p-5 flex flex-col gap-4">
        <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
          Create New Custom Hostname
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full flex items-center gap-2">
            <GlassInput
              placeholder="e.g. survival or play"
              value={prefix}
              onChange={e => setPrefix(e.target.value)}
            />
            <span className="text-slate-400 font-bold">.</span>
            <select
              value={selectedDomain}
              onChange={e => setSelectedDomain(e.target.value)}
              className="glass-input text-xs px-3 py-2.5 bg-slate-900 text-slate-100 cursor-pointer"
            >
              {availableDomains.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <GlassButton
            variant="accent"
            size="md"
            isLoading={isCreating}
            onClick={handleCreateSubdomain}
            disabled={!prefix.trim()}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Provision Records
          </GlassButton>
        </div>
      </GlassCard>

      {/* Active Subdomains */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-white">Active Subdomains ({subdomains.length})</h3>

        {subdomains.map(sub => (
          <GlassCard key={sub.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-400/20">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white font-mono">{sub.full_domain}</h4>
                  <GlassBadge status="running">ACTIVE</GlassBadge>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                  <span>Points to {sub.target_ip}:{sub.target_port}</span>
                  <span>•</span>
                  <span>SRV &amp; A records provisioned</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => copyDomain(sub.full_domain, sub.id)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              >
                {copiedId === sub.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy Host
              </button>

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
    </div>
  );
};
