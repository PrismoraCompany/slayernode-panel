import React, { useState, useEffect } from 'react';
import {
  Zap,
  Plus,
  Download,
  Upload,
  ArrowLeft,
  Trash2,
  Save,
  Check,
  AlertTriangle,
  Info,
  RefreshCw,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassInput } from '../ui/GlassInput';
import { GlassModal } from '../ui/GlassModal';
import { apiFetch } from '../../lib/api';

export const NestsEggsManager: React.FC = () => {
  // Navigation: 'nests-list' | 'nest-detail' | 'egg-detail'
  const [viewMode, setViewMode] = useState<'nests-list' | 'nest-detail' | 'egg-detail'>('nests-list');

  const [nests, setNests] = useState<any[]>([]);
  const [selectedNest, setSelectedNest] = useState<any>(null);
  const [selectedEgg, setSelectedEgg] = useState<any>(null);
  const [isNewEgg, setIsNewEgg] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreateNestModal, setShowCreateNestModal] = useState(false);
  const [showImportEggModal, setShowImportEggModal] = useState(false);
  const [newNestName, setNewNestName] = useState('');
  const [newNestDesc, setNewNestDesc] = useState('');
  const [importJsonText, setImportJsonText] = useState('');
  const [importNestId, setImportNestId] = useState('1');
  const [importFileName, setImportFileName] = useState('');
  const [parsedEggPreview, setParsedEggPreview] = useState<any>(null);

  // Nest Edit Form
  const [nestName, setNestName] = useState('');
  const [nestDesc, setNestDesc] = useState('');

  // Egg Form State
  const [eggNestId, setEggNestId] = useState('1');
  const [eggName, setEggName] = useState('');
  const [eggDesc, setEggDesc] = useState('');
  const [eggDockerImages, setEggDockerImages] = useState('');
  const [eggStartup, setEggStartup] = useState('');
  const [eggForceOutgoingIp, setEggForceOutgoingIp] = useState(false);
  const [eggFeatures, setEggFeatures] = useState('');
  const [eggConfigFiles, setEggConfigFiles] = useState('{}');
  const [eggStopCmd, setEggStopCmd] = useState('stop');
  const [eggLogConfig, setEggLogConfig] = useState('{}');
  const [eggStartConfig, setEggStartConfig] = useState('{}');

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const fetchNests = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/application/nests');
      if (res.ok) {
        const d = await res.json();
        setNests((d.data || []).map((x: any) => x.attributes || x));
      }
    } catch {
      setError('Failed loading nests from server.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNestDetails = async (nestId: number | string) => {
    try {
      const res = await apiFetch(`/api/application/nests/${nestId}`);
      if (res.ok) {
        const d = await res.json();
        const n = d.attributes || d;
        setSelectedNest(n);
        setNestName(n.name || '');
        setNestDesc(n.description || '');
      }
    } catch {}
  };

  useEffect(() => {
    fetchNests();
  }, []);

  // Open Nest Detail View
  const handleOpenNest = (nest: any) => {
    fetchNestDetails(nest.id);
    setSelectedNest(nest);
    setNestName(nest.name);
    setNestDesc(nest.description || '');
    setViewMode('nest-detail');
  };

  // Open Egg Configuration View
  const handleOpenEgg = (egg: any) => {
    setSelectedEgg(egg);
    setIsNewEgg(false);
    setEggNestId(String(egg.nest_id || selectedNest?.id || '1'));
    setEggName(egg.name || '');
    setEggDesc(egg.description || '');
    setEggDockerImages(typeof egg.docker_images === 'string' ? egg.docker_images : JSON.stringify(egg.docker_images || {}, null, 2));
    setEggStartup(egg.startup || '');
    setEggForceOutgoingIp(!!egg.force_outgoing_ip);
    setEggFeatures(egg.features || '');
    setEggConfigFiles(typeof egg.config?.files === 'string' ? egg.config.files : JSON.stringify(egg.config?.files || {}, null, 2));
    setEggStopCmd(egg.config?.stop || 'stop');
    setEggLogConfig(typeof egg.config?.logs === 'string' ? egg.config.logs : JSON.stringify(egg.config?.logs || {}, null, 2));
    setEggStartConfig(typeof egg.config?.startup === 'string' ? egg.config.startup : JSON.stringify(egg.config?.startup || {}, null, 2));
    setViewMode('egg-detail');
  };

  // Open New Egg View
  const handleCreateNewEgg = () => {
    setSelectedEgg(null);
    setIsNewEgg(true);
    setEggNestId(String(selectedNest?.id || '1'));
    setEggName('');
    setEggDesc('');
    setEggDockerImages('ghcr.io/slayernode/yolks:java_21\nghcr.io/slayernode/yolks:java_17');
    setEggStartup('java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui');
    setEggForceOutgoingIp(false);
    setEggFeatures('eula, java_version');
    setEggConfigFiles('{\n  "server.properties": {\n    "server-port": "{{SERVER_PORT}}"\n  }\n}');
    setEggStopCmd('stop');
    setEggLogConfig('{}');
    setEggStartConfig('{}');
    setViewMode('egg-detail');
  };

  // Save Nest Name & Description
  const handleSaveNest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNest) return;
    try {
      const res = await apiFetch(`/api/application/nests/${selectedNest.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: nestName.trim(), description: nestDesc.trim() }),
      });
      if (res.ok) {
        showNotification('Nest properties saved successfully.');
        fetchNests();
        fetchNestDetails(selectedNest.id);
      }
    } catch {}
  };

  // Delete Nest
  const handleDeleteNest = async () => {
    if (!selectedNest) return;
    if (!confirm(`Are you sure you want to delete nest "${selectedNest.name}" and all its eggs?`)) return;
    try {
      const res = await apiFetch(`/api/application/nests/${selectedNest.id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('Nest deleted.');
        setViewMode('nests-list');
        fetchNests();
      }
    } catch {}
  };

  // Save or Create Egg
  const handleSaveEgg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eggName.trim()) return;

    const payload = {
      name: eggName.trim(),
      description: eggDesc.trim(),
      docker_images: eggDockerImages.trim(),
      startup: eggStartup.trim(),
      force_outgoing_ip: eggForceOutgoingIp,
      features: eggFeatures.trim(),
      config_files: eggConfigFiles,
      stop_cmd: eggStopCmd.trim(),
      log_config: eggLogConfig,
      start_config: eggStartConfig,
    };

    try {
      if (isNewEgg) {
        const res = await apiFetch(`/api/application/nests/${eggNestId}/eggs`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showNotification('New Egg successfully created.');
          fetchNestDetails(eggNestId);
          setViewMode('nest-detail');
        }
      } else {
        const res = await apiFetch(`/api/application/nests/${eggNestId}/eggs/${selectedEgg.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showNotification('Egg configuration updated.');
          fetchNestDetails(eggNestId);
          setViewMode('nest-detail');
        }
      }
    } catch {
      setError('Error saving Egg configuration.');
    }
  };

  // Export Egg JSON
  const handleExportEgg = (egg: any) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(egg, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `egg-${egg.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Create Nest
  const handleCreateNestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNestName.trim()) return;
    try {
      const res = await apiFetch('/api/application/nests', {
        method: 'POST',
        body: JSON.stringify({ name: newNestName.trim(), description: newNestDesc.trim() }),
      });
      if (res.ok) {
        setShowCreateNestModal(false);
        setNewNestName('');
        setNewNestDesc('');
        showNotification('Nest created successfully.');
        fetchNests();
      }
    } catch {}
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Notifications */}
      {notice && (
        <div className="p-3.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded bg-red-950/60 border border-red-600/40 text-red-500 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* VIEW 1: CONFIGURED NESTS LIST */}
      {viewMode === 'nests-list' && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Zap className="w-5 h-5 text-red-500" /> Nests & Engines Management
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                All server categories and game eggs currently available on this system.
              </p>
            </div>

            <div className="text-[11px] font-mono text-slate-400 bg-black/40 px-3 py-1.5 rounded border border-white/10">
              Admin &gt; <span className="text-white font-semibold">Nests</span>
            </div>
          </div>

          {/* Top Warning Banner matching screenshot */}
          <div className="p-4 rounded bg-red-950/60 border border-red-600/50 text-red-300 text-xs leading-relaxed">
            Eggs define service runtime parameters, environment flags, and container build images. Modifying default configurations incorrectly may affect server startup. Ensure custom commands and parameters are tested before applying to production servers.
          </div>

          {/* Configured Nests Card */}
          <GlassCard className="overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Configured Nests</h3>
              <div className="flex items-center gap-2">
                <GlassButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowImportEggModal(true)}
                  leftIcon={<Upload className="w-4 h-4 text-emerald-400" />}
                >
                  Import Egg
                </GlassButton>
                <GlassButton
                  variant="accent"
                  size="sm"
                  onClick={() => setShowCreateNestModal(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Create New
                </GlassButton>
              </div>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 w-16">ID</th>
                  <th className="p-3.5 w-44">Name</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5 w-20 text-center">Eggs</th>
                  <th className="p-3.5 w-20 text-center">Servers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {nests.map(n => (
                  <tr key={n.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3.5 font-mono text-slate-400">{n.id}</td>
                    <td className="p-3.5">
                      <button
                        onClick={() => handleOpenNest(n)}
                        className="font-bold text-white hover:text-red-400 text-left cursor-pointer transition-colors"
                      >
                        {n.name}
                      </button>
                    </td>
                    <td className="p-3.5 text-slate-400 line-clamp-2">{n.description}</td>
                    <td className="p-3.5 font-mono text-center text-slate-300">{n.eggs_count || 0}</td>
                    <td className="p-3.5 font-mono text-center text-slate-300">{n.servers_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </>
      )}

      {/* VIEW 2: NEST DETAIL VIEW */}
      {viewMode === 'nest-detail' && selectedNest && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('nests-list')}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Zap className="w-5 h-5 text-red-500" /> {selectedNest.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{selectedNest.description}</p>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 bg-black/40 px-3 py-1.5 rounded border border-white/10">
              Admin &gt; <button onClick={() => setViewMode('nests-list')} className="hover:text-white underline cursor-pointer">Nests</button> &gt;{' '}
              <span className="text-white font-semibold">{selectedNest.name}</span>
            </div>
          </div>

          {/* Top 2 Cards matching screenshot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Card: Name & Description */}
            <GlassCard className="p-5 flex flex-col justify-between">
              <form onSubmit={handleSaveNest} className="flex flex-col gap-3 text-xs">
                <GlassInput
                  label="Name (required)"
                  value={nestName}
                  onChange={e => setNestName(e.target.value)}
                  required
                />

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                  <textarea
                    value={nestDesc}
                    onChange={e => setNestDesc(e.target.value)}
                    rows={3}
                    className="glass-input w-full px-3 py-2 bg-[#121318] text-white rounded"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleDeleteNest}
                    className="p-2 rounded bg-red-950/40 text-red-400 hover:text-red-300 border border-red-800/40 cursor-pointer"
                    title="Delete Nest"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <GlassButton variant="accent" size="sm" type="submit" leftIcon={<Save className="w-4 h-4" />}>
                    Save
                  </GlassButton>
                </div>
              </form>
            </GlassCard>

            {/* Right Card: Nest ID, Author, UUID */}
            <GlassCard className="p-5 flex flex-col gap-3.5 text-xs">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1 uppercase tracking-wider text-[11px]">Nest ID</label>
                <input
                  type="text"
                  readOnly
                  value={selectedNest.id}
                  className="glass-input w-full px-3 py-2 bg-black/40 text-slate-300 font-mono rounded"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1 uppercase tracking-wider text-[11px]">Author</label>
                <input
                  type="text"
                  readOnly
                  value={selectedNest.author || 'admin@slayernode.xyz'}
                  className="glass-input w-full px-3 py-2 bg-black/40 text-slate-300 font-mono rounded"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1 uppercase tracking-wider text-[11px]">UUID</label>
                <input
                  type="text"
                  readOnly
                  value={selectedNest.uuid}
                  className="glass-input w-full px-3 py-2 bg-black/40 text-red-400 font-mono rounded"
                />
              </div>
            </GlassCard>
          </div>

          {/* Bottom Card: Nest Eggs Table */}
          <GlassCard className="overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Nest Eggs</h3>
              <GlassButton
                variant="accent"
                size="sm"
                onClick={handleCreateNewEgg}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                New Egg
              </GlassButton>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-slate-400 uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 w-16">ID</th>
                  <th className="p-3.5 w-48">Name</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5 w-24 text-center">Servers</th>
                  <th className="p-3.5 w-16 text-right">Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(selectedNest.eggs || []).map((egg: any) => (
                  <tr key={egg.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3.5 font-mono text-slate-400">{egg.id}</td>
                    <td className="p-3.5">
                      <button
                        onClick={() => handleOpenEgg(egg)}
                        className="font-bold text-white hover:text-red-400 text-left cursor-pointer transition-colors"
                      >
                        {egg.name}
                      </button>
                    </td>
                    <td className="p-3.5 text-slate-400 line-clamp-2">{egg.description}</td>
                    <td className="p-3.5 font-mono text-center text-slate-300">{egg.servers_count || 0}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleExportEgg(egg)}
                        className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                        title="Export Egg JSON"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {(!selectedNest.eggs || selectedNest.eggs.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No eggs registered in this nest category yet. Click "New Egg" to configure one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </GlassCard>
        </>
      )}

      {/* VIEW 3: EGG CONFIGURATION / NEW EGG VIEW */}
      {viewMode === 'egg-detail' && (
        <form onSubmit={handleSaveEgg} className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('nest-detail')}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Zap className="w-5 h-5 text-red-500" /> {isNewEgg ? 'New Egg' : `Egg: ${selectedEgg?.name}`}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isNewEgg ? 'Create a new Egg to assign to servers.' : 'Modify service container configuration.'}
                </p>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 bg-black/40 px-3 py-1.5 rounded border border-white/10">
              Admin &gt; <button type="button" onClick={() => setViewMode('nests-list')} className="hover:text-white underline cursor-pointer">Nests</button> &gt;{' '}
              <button type="button" onClick={() => setViewMode('nest-detail')} className="hover:text-white underline cursor-pointer">{selectedNest?.name}</button> &gt;{' '}
              <span className="text-white font-semibold">{isNewEgg ? 'New Egg' : selectedEgg?.name}</span>
            </div>
          </div>

          {/* Section 1: Configuration matching screenshot */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 mb-4">
              Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Associated Nest</label>
                  <select
                    value={eggNestId}
                    onChange={e => setEggNestId(e.target.value)}
                    className="glass-input w-full px-3 py-2 bg-[#121318] text-white rounded cursor-pointer"
                  >
                    {nests.map(n => (
                      <option key={n.id} value={String(n.id)}>
                        {n.name} &lt;{n.author || 'admin@slayernode.xyz'}&gt;
                      </option>
                    ))}
                  </select>
                </div>

                <GlassInput
                  label="Name (required)"
                  value={eggName}
                  onChange={e => setEggName(e.target.value)}
                  placeholder="e.g. Paper"
                  required
                />

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                  <textarea
                    value={eggDesc}
                    onChange={e => setEggDesc(e.target.value)}
                    rows={4}
                    className="glass-input w-full px-3 py-2 bg-[#121318] text-white rounded"
                    placeholder="A descriptive summary of this egg."
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={eggForceOutgoingIp}
                      onChange={e => setEggForceOutgoingIp(e.target.checked)}
                      className="rounded text-red-500"
                    />
                    <span className="font-semibold">Force Outgoing IP</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Forces all outgoing traffic to be NATed to the server allocation IP.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Docker Images</label>
                  <textarea
                    value={eggDockerImages}
                    onChange={e => setEggDockerImages(e.target.value)}
                    rows={3}
                    className="glass-input w-full px-3 py-2 bg-[#121318] text-white font-mono rounded"
                    placeholder="ghcr.io/slayernode/yolks:java_21"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">Enter one container image per line.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Startup Command</label>
                  <textarea
                    value={eggStartup}
                    onChange={e => setEggStartup(e.target.value)}
                    rows={3}
                    className="glass-input w-full px-3 py-2 bg-[#121318] text-white font-mono rounded"
                    placeholder="java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} nogui"
                  />
                </div>

                <GlassInput
                  label="Features"
                  value={eggFeatures}
                  onChange={e => setEggFeatures(e.target.value)}
                  placeholder="e.g. eula, java_version"
                />
              </div>
            </div>
          </GlassCard>

          {/* Section 2: Process Management matching screenshot */}
          <GlassCard className="p-5">
            <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3 mb-4">
              Process Management
            </h3>

            {/* Orange warning alert box */}
            <div className="p-3 mb-4 rounded bg-amber-950/50 border border-amber-600/40 text-amber-300 text-xs">
              All fields are required unless you select a separate option from the 'Copy Settings From' dropdown, in which case fields may be left blank to use the values from that option.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Copy Settings From</label>
                  <select
                    className="glass-input w-full px-3 py-2 bg-[#121318] text-white rounded cursor-pointer"
                  >
                    <option value="">None</option>
                    {(selectedNest?.eggs || []).map((e: any) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                <GlassInput
                  label="Stop Command"
                  value={eggStopCmd}
                  onChange={e => setEggStopCmd(e.target.value)}
                  description="Command sent to gracefully stop the process (e.g. stop or ^C)."
                  placeholder="stop"
                />

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Log Configuration</label>
                  <textarea
                    value={eggLogConfig}
                    onChange={e => setEggLogConfig(e.target.value)}
                    rows={3}
                    className="glass-input w-full px-3 py-2 bg-[#121318] text-white font-mono rounded"
                    placeholder="{}"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">JSON representation of log location.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Configuration Files</label>
                  <textarea
                    value={eggConfigFiles}
                    onChange={e => setEggConfigFiles(e.target.value)}
                    rows={4}
                    className="glass-input w-full px-3 py-2 bg-[#121318] text-white font-mono rounded"
                    placeholder='{"server.properties": {"server-port": "{{SERVER_PORT}}"}}'
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">JSON representation of configuration file replacements.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Start Configuration</label>
                  <textarea
                    value={eggStartConfig}
                    onChange={e => setEggStartConfig(e.target.value)}
                    rows={3}
                    className="glass-input w-full px-3 py-2 bg-[#121318] text-white font-mono rounded"
                    placeholder="{}"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">JSON completion regex values.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-5 border-t border-white/10 mt-5">
              <GlassButton variant="accent" size="sm" type="submit" leftIcon={<Save className="w-4 h-4" />}>
                {isNewEgg ? 'Create Egg' : 'Save Egg'}
              </GlassButton>
            </div>
          </GlassCard>
        </form>
      )}

      {/* CREATE NEST MODAL */}
      <GlassModal
        isOpen={showCreateNestModal}
        onClose={() => setShowCreateNestModal(false)}
        title="Create New Nest Category"
        description="A Nest acts as a category grouping multiple related eggs."
      >
        <form onSubmit={handleCreateNestSubmit} className="flex flex-col gap-4 py-2 text-xs">
          <GlassInput
            label="Nest Name"
            value={newNestName}
            onChange={e => setNewNestName(e.target.value)}
            placeholder="e.g. Minecraft"
            required
          />
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
            <textarea
              value={newNestDesc}
              onChange={e => setNewNestDesc(e.target.value)}
              rows={3}
              className="glass-input w-full px-3 py-2 bg-[#121318] text-white rounded"
              placeholder="A brief category description"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <GlassButton variant="secondary" size="sm" type="button" onClick={() => setShowCreateNestModal(false)}>
              Cancel
            </GlassButton>
            <GlassButton variant="accent" size="sm" type="submit">
              Create Nest
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* IMPORT EGG MODAL */}
      <GlassModal
        isOpen={showImportEggModal}
        onClose={() => {
          setShowImportEggModal(false);
          setImportJsonText('');
          setImportFileName('');
          setParsedEggPreview(null);
        }}
        title="Import Custom Game Egg"
        description="Upload a Pterodactyl-standard egg JSON file or paste the raw configuration."
      >
        <div className="flex flex-col gap-4 py-2 text-xs">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Target Nest Category</label>
            <select
              value={importNestId}
              onChange={e => setImportNestId(e.target.value)}
              className="w-full px-3 py-2 bg-[#121318] border border-white/10 rounded text-white text-xs focus:outline-none focus:border-red-500"
            >
              {nests.map(n => (
                <option key={n.id} value={n.id} className="bg-slate-900 text-white">
                  {n.name} (ID: {n.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Upload Egg File (.json)</label>
            <div className="border border-dashed border-white/20 rounded-lg p-4 bg-black/20 text-center hover:border-red-500/60 transition-colors">
              <input
                type="file"
                accept=".json,application/json"
                id="egg-file-input"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImportFileName(file.name);
                  const reader = new FileReader();
                  reader.onload = evt => {
                    const content = String(evt.target?.result || '');
                    setImportJsonText(content);
                    try {
                      const parsed = JSON.parse(content);
                      setParsedEggPreview({
                        name: parsed.name || file.name.replace('.json', ''),
                        author: parsed.author || 'Custom Author',
                        description: parsed.description || 'No description provided.',
                      });
                    } catch {
                      setParsedEggPreview(null);
                    }
                  };
                  reader.readAsText(file);
                }}
              />
              <label
                htmlFor="egg-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <Upload className="w-6 h-6 text-emerald-400" />
                <span className="font-semibold text-white">
                  {importFileName ? importFileName : 'Click to browse or drop an Egg JSON file'}
                </span>
                <span className="text-[11px] text-slate-400">Standard Pterodactyl v1 / v2 JSON format supported</span>
              </label>
            </div>
          </div>

          {parsedEggPreview && (
            <div className="p-3 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
              <div className="font-bold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Detected Egg: {parsedEggPreview.name}
              </div>
              <div className="text-[11px] text-slate-300 mt-1">Author: {parsedEggPreview.author}</div>
              <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{parsedEggPreview.description}</div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Raw JSON Data (Optional / Manual)</label>
            <textarea
              value={importJsonText}
              onChange={e => {
                setImportJsonText(e.target.value);
                try {
                  const parsed = JSON.parse(e.target.value);
                  setParsedEggPreview({
                    name: parsed.name || 'Custom Egg',
                    author: parsed.author || 'Custom',
                    description: parsed.description || '',
                  });
                } catch {
                  setParsedEggPreview(null);
                }
              }}
              rows={5}
              className="glass-input w-full px-3 py-2 bg-[#121318] text-white font-mono text-[11px] rounded"
              placeholder='{"name": "Custom Paper", ...}'
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowImportEggModal(false);
                setImportJsonText('');
                setImportFileName('');
                setParsedEggPreview(null);
              }}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="accent"
              size="sm"
              disabled={!importJsonText.trim()}
              onClick={async () => {
                try {
                  const targetNest = importNestId || selectedNest?.id || nests[0]?.id || 1;
                  const res = await apiFetch(`/api/application/nests/${targetNest}/eggs/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: importJsonText,
                  });

                  if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to import Egg.');
                  }

                  setShowImportEggModal(false);
                  setImportJsonText('');
                  setImportFileName('');
                  setParsedEggPreview(null);
                  showNotification('Egg imported successfully!');
                  fetchNests();
                  if (selectedNest) {
                    fetchNestDetails(selectedNest.id);
                  }
                } catch (err: any) {
                  setError(err.message || 'Invalid Egg JSON format.');
                }
              }}
            >
              Import Egg
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
