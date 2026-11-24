import React, { useState } from 'react';
import { MapPin, Plus, Trash2, HardDrive, Server, AlertTriangle } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';
import { Location } from '../../types';

export const LocationsManager: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [shortCode, setShortCode] = useState('');
  const [longDesc, setLongDesc] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/application/locations')
      .then(res => res.json())
      .then(d => {
        if (d && Array.isArray(d.data)) {
          setLocations(d.data.map((x: any) => x.attributes || x));
        }
      })
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!shortCode.trim()) {
      setError('Short identifier (e.g. us-east-1 or de-fra) is required.');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/application/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ short: shortCode.trim(), long: longDesc.trim() || shortCode.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        const created = d.attributes || d;
        setLocations(prev => [...prev, created]);
        setShortCode('');
        setLongDesc('');
        setShowModal(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to create location.');
      }
    } catch {
      setError('Network error while creating location.');
    }
  };

  const handleDelete = async (id: number | string) => {
    try {
      await fetch(`/api/application/locations/${id}`, { method: 'DELETE' });
      setLocations(prev => prev.filter(l => String(l.id) !== String(id)));
    } catch {
      setLocations(prev => prev.filter(l => String(l.id) !== String(id)));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" /> Datacenter Geographical Locations
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Group physical server nodes into geographic datacenters and network availability zones.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Location
        </GlassButton>
      </div>

      {locations.length === 0 ? (
        <div className="p-10 rounded-lg bg-[#181A20] border border-white/10 text-center flex flex-col items-center justify-center">
          <div className="p-3 rounded-lg bg-red-600/10 text-red-500 mb-3 border border-red-600/20">
            <MapPin className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Locations Configured</h3>
          <p className="text-xs text-slate-400 max-w-md mb-4">
            Group your nodes by physical datacenter or geographical region (e.g. Frankfurt, New York, Mumbai).
          </p>
          <GlassButton
            variant="accent"
            size="sm"
            onClick={() => {
              setError(null);
              setShowModal(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create First Location
          </GlassButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(loc => (
            <GlassCard key={loc.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-lg bg-red-600/10 text-red-500 border border-red-600/20">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-mono uppercase">{loc.short}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{loc.long}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(loc.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-300 mt-4 p-3 rounded-lg bg-[#111216] border border-white/5">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-red-400" />
                    <strong>{loc.nodes_count}</strong> Nodes
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-slate-300" />
                    <strong>{loc.servers_count}</strong> Servers
                  </span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      <GlassModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Geographic Location"
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4 py-2">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-600/40 text-red-500 font-bold text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <GlassInput
            label="Short Identifier"
            placeholder="e.g. us-west-1 or de-fra"
            value={shortCode}
            onChange={e => setShortCode(e.target.value)}
            required
          />
          <GlassInput
            label="Long Description / Datacenter Name"
            placeholder="e.g. Equinix Frankfurt FR5"
            value={longDesc}
            onChange={e => setLongDesc(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <GlassButton variant="ghost" size="sm" onClick={() => setShowModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="accent" size="sm" onClick={handleCreate}>
              Save Location
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
