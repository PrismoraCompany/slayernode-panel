import React, { useState } from 'react';
import { MapPin, Plus, Trash2, HardDrive, Server } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassModal } from '../ui/GlassModal';
import { GlassInput } from '../ui/GlassInput';
import { Location } from '../../types';

export const LocationsManager: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([
    {
      id: 1,
      short: 'eu-central-1',
      long: 'Frankfurt Datacenter, Germany (Equinix FR5)',
      nodes_count: 1,
      servers_count: 14,
    },
    {
      id: 2,
      short: 'eu-north-1',
      long: 'Helsinki Datacenter, Finland (Hetzner FSN1)',
      nodes_count: 1,
      servers_count: 8,
    },
    {
      id: 3,
      short: 'us-east-1',
      long: 'Ashburn, Virginia, United States',
      nodes_count: 0,
      servers_count: 0,
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [shortCode, setShortCode] = useState('');
  const [longDesc, setLongDesc] = useState('');

  const handleCreate = () => {
    if (!shortCode.trim()) return;
    const newLoc: Location = {
      id: Date.now(),
      short: shortCode.trim().toLowerCase(),
      long: longDesc.trim() || shortCode.trim(),
      nodes_count: 0,
      servers_count: 0,
    };
    setLocations(prev => [...prev, newLoc]);
    setShortCode('');
    setLongDesc('');
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    setLocations(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-400" /> Datacenter Geographical Locations
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Group physical server nodes into geographic datacenters and network availability zones.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          onClick={() => setShowModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Location
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map(loc => (
          <GlassCard key={loc.id} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-400/20">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-mono uppercase">{loc.short}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{loc.long}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(loc.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-300 mt-4 p-3 rounded-xl bg-slate-950/40 border border-white/5">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                  <strong>{loc.nodes_count}</strong> Nodes
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-sky-400" />
                  <strong>{loc.servers_count}</strong> Servers
                </span>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Creation Modal */}
      <GlassModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Geographic Location"
        maxWidth="sm"
      >
        <div className="flex flex-col gap-4 py-2">
          <GlassInput
            label="Short Identifier"
            placeholder="e.g. us-west-1"
            value={shortCode}
            onChange={e => setShortCode(e.target.value)}
          />
          <GlassInput
            label="Description / Region"
            placeholder="e.g. Hillsboro, Oregon, United States"
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
