import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Plus, Trash2 } from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { apiFetch, apiJson } from '../../lib/api';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';

interface SubdomainRecord {
  id: number;
  fqdn: string;
  target_ip: string;
  target_port: number;
  record_type: string;
}

export const SubdomainManager: React.FC = () => {
  const { activeServer } = useServers();
  const [subdomains, setSubdomains] = useState<SubdomainRecord[]>([]);
  const [domains, setDomains] = useState<string[]>(['play.slayernode.xyz']);
  const [label, setLabel] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('play.slayernode.xyz');
  const [error, setError] = useState<string | null>(null);

  const loadSubdomains = useCallback(async () => {
    if (!activeServer) return;
    try {
      const res = await apiJson<{ subdomains: SubdomainRecord[]; base_domains: string[] }>(
        `/api/client/servers/${encodeURIComponent(activeServer.uuid)}/addons/subdomains`
      );
      setSubdomains(res?.subdomains || []);
      if (Array.isArray(res?.base_domains) && res.base_domains.length > 0) {
        setDomains(res.base_domains);
        setSelectedDomain(res.base_domains[0]);
      }
    } catch {}
  }, [activeServer?.uuid]);

  useEffect(() => {
    loadSubdomains();
  }, [loadSubdomains]);

  if (!activeServer) return null;

  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/addons/subdomains`, {
        method: 'POST',
        body: JSON.stringify({ subdomain: label.trim().toLowerCase(), domain: selectedDomain }),
      });
      setLabel('');
      await loadSubdomains();
    } catch (err: any) {
      setError(err?.message || 'Unable to bind subdomain.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/addons/subdomains/${id}`, {
        method: 'DELETE',
      });
      await loadSubdomains();
    } catch {}
  };

  return (
    <div className="flex flex-col gap-5">
      <GlassCard className="p-5 flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">SRV Subdomain Manager</h3>
          <p className="text-xs text-slate-400">
            Map custom hostnames directly to {activeServer.allocation.ip}:{activeServer.allocation.port}.
          </p>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <form onSubmit={handleBind} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <GlassInput label="Subdomain Prefix" placeholder="survival" value={label} onChange={e => setLabel(e.target.value)} required />
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Domain</label>
            <select value={selectedDomain} onChange={e => setSelectedDomain(e.target.value)} className="glass-input w-full px-3 py-2 text-xs text-white">
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <GlassButton type="submit" variant="primary">
            <Plus className="w-4 h-4 mr-1.5" /> Bind Subdomain
          </GlassButton>
        </form>
        {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
      </GlassCard>

      <div className="flex flex-col gap-3">
        {subdomains.map(sd => (
          <GlassCard key={sd.id} className="p-4 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold font-mono text-white">{sd.fqdn}</h4>
              <p className="text-xs font-mono text-slate-400">
                SRV -&gt; {sd.target_ip}:{sd.target_port}
              </p>
            </div>
            <GlassButton variant="danger" size="sm" onClick={() => handleDelete(sd.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </GlassButton>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
