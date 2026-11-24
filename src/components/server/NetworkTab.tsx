import React, { useState } from 'react';
import { Network, Plus, Check, Star, Trash2 } from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';
import { Allocation } from '../../types';

export const NetworkTab: React.FC = () => {
  const { activeServer } = useServer();
  const [allocations, setAllocations] = useState<Allocation[]>(() => 
    activeServer?.allocations || (activeServer?.allocation ? [activeServer.allocation] : [])
  );

  React.useEffect(() => {
    if (activeServer) {
      setAllocations(activeServer.allocations || (activeServer.allocation ? [activeServer.allocation] : []));
    }
  }, [activeServer]);

  const setPrimary = (port: number) => {
    setAllocations(prev =>
      prev.map(a => ({
        ...a,
        is_default: a.port === port,
      }))
    );
  };

  const maxAllocations = activeServer?.feature_limits?.allocations ?? 4;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-sky-400" /> Network Allocations
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Assigned IP addresses and port bindings for game traffic, query, and web extensions.
          </p>
        </div>

        <GlassButton
          variant="accent"
          size="sm"
          disabled={allocations.length >= maxAllocations}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Assign Allocation ({allocations.length}/{maxAllocations})
        </GlassButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allocations.map(alloc => (
          <GlassCard key={alloc.port} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-400/20">
                    <Network className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white font-mono">
                      {alloc.port}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">{alloc.ip}</p>
                  </div>
                </div>

                {alloc.is_default && (
                  <GlassBadge status="info">PRIMARY</GlassBadge>
                )}
              </div>

              {alloc.alias && (
                <div className="mt-2 text-xs font-mono text-sky-300 bg-sky-500/10 p-2 rounded-lg border border-sky-400/20">
                  {alloc.alias}
                </div>
              )}

              {alloc.notes && (
                <p className="text-xs text-slate-400 mt-2 italic">Note: {alloc.notes}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4 text-xs">
              {!alloc.is_default ? (
                <button
                  onClick={() => setPrimary(alloc.port)}
                  className="text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  <Star className="w-3.5 h-3.5" /> Make Primary
                </button>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                  <Check className="w-3.5 h-3.5" /> Default Binding
                </span>
              )}

              {!alloc.is_default && (
                <button
                  onClick={() => setAllocations(prev => prev.filter(a => a.port !== alloc.port))}
                  className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};
