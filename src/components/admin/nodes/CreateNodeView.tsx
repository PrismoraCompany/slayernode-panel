import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  HardDrive,
  Cpu,
  Layers,
  Network,
  Check,
  AlertTriangle,
  Loader2,
  Shield,
  Radio,
} from 'lucide-react';
import { Location } from '../../../types';
import { apiFetch } from '../../../lib/api';

interface CreateNodeViewProps {
  onBack: () => void;
  onNodeCreated: (node: any) => void;
}

export const CreateNodeView: React.FC<CreateNodeViewProps> = ({ onBack, onNodeCreated }) => {
  const [locations, setLocations] = useState<Location[]>([]);

  // Basic Details State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('1');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [fqdn, setFqdn] = useState('127.0.0.1');
  const [scheme, setScheme] = useState<'https' | 'http'>('http');
  const [behindProxy, setBehindProxy] = useState(false);

  // Configuration State
  const [daemonBase, setDaemonBase] = useState('/var/lib/slayerwings/volumes');
  const [memory, setMemory] = useState('32768');
  const [memoryOverallocate, setMemoryOverallocate] = useState('0');
  const [disk, setDisk] = useState('512000');
  const [diskOverallocate, setDiskOverallocate] = useState('0');
  const [daemonPort, setDaemonPort] = useState('8443');
  const [daemonSftp, setDaemonSftp] = useState('2202');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/application/locations')
      .then(res => res.json())
      .then(d => {
        if (d && Array.isArray(d.data)) {
          const locs = d.data.map((x: any) => x.attributes || x);
          setLocations(locs);
          if (locs.length > 0) {
            setSelectedLocationId(String(locs[0].id));
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Node name is required.');
      return;
    }
    if (!fqdn.trim()) {
      setErrorMsg('FQDN or valid IP address is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedLoc = locations.find(l => String(l.id) === String(selectedLocationId)) as any;
      const payload = {
        name: name.trim(),
        description: description.trim(),
        location_id: parseInt(selectedLocationId) || 1,
        location_name: selectedLoc?.short || selectedLoc?.short_code || selectedLoc?.long || 'Local Datacenter',
        public: visibility === 'public',
        fqdn: fqdn.trim(),
        scheme,
        behind_proxy: behindProxy,
        maintenance_mode: false,
        memory: parseInt(memory) || 32768,
        memory_overallocate: parseInt(memoryOverallocate) || 0,
        disk: parseInt(disk) || 512000,
        disk_overallocate: parseInt(diskOverallocate) || 0,
        daemon_listen: parseInt(daemonPort) || 8443,
        daemon_sftp: parseInt(daemonSftp) || 2202,
        daemon_base: daemonBase.trim(),
      };

      const res = await apiFetch('/api/application/nodes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create node.');
      }

      const created = await res.json();
      setIsSubmitting(false);
      onNodeCreated(created.attributes || created);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Error occurred while creating node.');
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* Breadcrumb Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-white/50 mb-1">
          <span>Admin</span>
          <span>&gt;</span>
          <button onClick={onBack} className="hover:text-cyan-400 transition-colors">
            Nodes
          </button>
          <span>&gt;</span>
          <span className="text-cyan-400 font-semibold">New</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/10"
            title="Return to Nodes List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold text-white tracking-tight">New Node</h1>
        </div>
        <p className="text-sm text-white/60 ml-9">
          Create a new local or remote node for servers to be installed to.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* COLUMN 1: Basic Details */}
          <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02]">
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" />
                Basic Details
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Local-Node-01"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/80 transition-colors text-sm"
                />
                <p className="mt-1 text-[11px] text-white/40">
                  Character limits: <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">a-zA-Z0-9_.-</code> and <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">[Space]</code> (min 1, max 100 characters).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="High-performance bare-metal or cloud node..."
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/80 transition-colors text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                  Location
                </label>
                <select
                  value={selectedLocationId}
                  onChange={e => setSelectedLocationId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400/80 transition-colors text-sm"
                >
                  {locations.length === 0 ? (
                    <option value="1" className="bg-slate-900 text-white">
                      Local Datacenter (Default)
                    </option>
                  ) : (
                    locations.map(loc => (
                      <option key={loc.id} value={loc.id} className="bg-slate-900 text-white">
                        {loc.short_code} ({loc.description})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider">
                  Node Visibility
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white/90">
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === 'public'}
                      onChange={() => setVisibility('public')}
                      className="accent-cyan-400 w-4 h-4"
                    />
                    <span>Public</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white/90">
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === 'private'}
                      onChange={() => setVisibility('private')}
                      className="accent-cyan-400 w-4 h-4"
                    />
                    <span>Private</span>
                  </label>
                </div>
                <p className="mt-1.5 text-[11px] text-white/40">
                  By setting a node to <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">private</code> you will be denying the ability to auto-deploy to this node.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                  FQDN
                </label>
                <input
                  type="text"
                  value={fqdn}
                  onChange={e => setFqdn(e.target.value)}
                  placeholder="127.0.0.1 or node.example.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono placeholder-white/30 focus:outline-none focus:border-cyan-400/80 transition-colors text-sm"
                />
                <p className="mt-1 text-[11px] text-white/40">
                  Please enter domain name (e.g. <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">node.example.com</code>) to be used for connecting to the daemon. An IP address may be used <em>only</em> if you are not using SSL for this node.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider">
                  Communicate Over SSL
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white/90">
                    <input
                      type="radio"
                      name="scheme"
                      checked={scheme === 'https'}
                      onChange={() => setScheme('https')}
                      className="accent-cyan-400 w-4 h-4"
                    />
                    <span>Use SSL Connection</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white/90">
                    <input
                      type="radio"
                      name="scheme"
                      checked={scheme === 'http'}
                      onChange={() => setScheme('http')}
                      className="accent-cyan-400 w-4 h-4"
                    />
                    <span>Use HTTP Connection</span>
                  </label>
                </div>
                {scheme === 'http' && (
                  <p className="mt-1.5 text-[11px] text-amber-400/90">
                    HTTP mode is recommended for local development (127.0.0.1). For production internet domains, SSL (https) is required.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-2 uppercase tracking-wider">
                  Behind Proxy
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white/90">
                    <input
                      type="radio"
                      name="proxy"
                      checked={!behindProxy}
                      onChange={() => setBehindProxy(false)}
                      className="accent-cyan-400 w-4 h-4"
                    />
                    <span>Not Behind Proxy</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white/90">
                    <input
                      type="radio"
                      name="proxy"
                      checked={behindProxy}
                      onChange={() => setBehindProxy(true)}
                      className="accent-cyan-400 w-4 h-4"
                    />
                    <span>Behind Proxy</span>
                  </label>
                </div>
                <p className="mt-1.5 text-[11px] text-white/40">
                  If you are running the daemon behind a proxy such as Cloudflare, select this to have the daemon skip looking for certificates on boot.
                </p>
              </div>
            </div>
          </div>

          {/* COLUMN 2: Configuration */}
          <div className="rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-md overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02]">
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                Configuration
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                  Daemon Server File Directory
                </label>
                <input
                  type="text"
                  value={daemonBase}
                  onChange={e => setDaemonBase(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-cyan-400/80 transition-colors"
                />
                <p className="mt-1 text-[11px] text-white/40 leading-relaxed">
                  Enter the directory where server files should be stored. Default: <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">/var/lib/slayerwings/volumes</code>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                    Total Memory
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1024"
                      value={memory}
                      onChange={e => setMemory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white pr-12 font-mono text-sm focus:outline-none focus:border-cyan-400/80 transition-colors"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-white/40 font-mono">MiB</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                    Memory Over-Allocation
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="-1"
                      value={memoryOverallocate}
                      onChange={e => setMemoryOverallocate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white pr-8 font-mono text-sm focus:outline-none focus:border-cyan-400/80 transition-colors"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-white/40 font-mono">%</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    Enter the total amount of memory available for new servers. If you would like to allow overallocation of memory enter the percentage that you want to allow. To disable checking for overallocation enter <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">-1</code> into the field. Entering <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">0</code> will prevent creating new servers if it would put the node over the limit.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                    Total Disk Space
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1024"
                      value={disk}
                      onChange={e => setDisk(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white pr-12 font-mono text-sm focus:outline-none focus:border-cyan-400/80 transition-colors"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-white/40 font-mono">MiB</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                    Disk Over-Allocation
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="-1"
                      value={diskOverallocate}
                      onChange={e => setDiskOverallocate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white pr-8 font-mono text-sm focus:outline-none focus:border-cyan-400/80 transition-colors"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-white/40 font-mono">%</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    Enter the total amount of disk space available for new servers. If you would like to allow overallocation of disk space enter the percentage that you want to allow. To disable checking for overallocation enter <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">-1</code> into the field. Entering <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">0</code> will prevent creating new servers if it would put the node over the limit.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                    Daemon Port
                  </label>
                  <input
                    type="number"
                    value={daemonPort}
                    onChange={e => setDaemonPort(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-cyan-400/80 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                    Daemon SFTP Port
                  </label>
                  <input
                    type="number"
                    value={daemonSftp}
                    onChange={e => setDaemonSftp(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-cyan-400/80 transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    The daemon runs its own SFTP management subsystem and does not use the SSHd process on the main physical server. <span className="text-white/60 font-semibold">Do not use the same port that you have assigned for your physical server's SSH process.</span> If you will be running the daemon behind Cloudflare you should set the daemon port to <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">8443</code> to allow websocket proxying over SSL.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-4 rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors text-sm font-medium border border-white/10"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting & Registering Node...
              </>
            ) : (
              'Create Node'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
