import React, { useState } from 'react';
import { RefreshCw, Check, Download, ShieldCheck, Zap, FileText, Cpu, Layers, Rocket, HardDrive } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassBadge } from '../ui/GlassBadge';

interface SoftwareOption {
  id: string;
  name: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
  recommended_java: number;
  versions: string[];
}

const SOFTWARE_LIST: SoftwareOption[] = [
  {
    id: 'purpur',
    name: 'Purpur',
    description: 'Drop-in replacement for Paper with unprecedented customization, gameplay tweaks, and Folia/Aikar performance flags.',
    badge: 'OPTIMIZED',
    icon: <Zap className="w-5 h-5 text-[#00D2FF]" />,
    recommended_java: 21,
    versions: ['1.21.4 (Latest)', '1.21.1', '1.20.4', '1.19.4'],
  },
  {
    id: 'paper',
    name: 'Paper',
    description: 'High-performance Minecraft server software aiming to fix mechanics exploits and improve tick-loop latency.',
    badge: 'STABLE',
    icon: <FileText className="w-5 h-5 text-slate-300" />,
    recommended_java: 21,
    versions: ['1.21.4 (Latest)', '1.21.1', '1.20.4', '1.19.4'],
  },
  {
    id: 'folia',
    name: 'Folia',
    category: 'folia',
    description: 'Multi-threaded regional tick server fork of Paper for large-scale 100+ concurrent player survival SMP realms.',
    badge: 'MULTI-THREADED',
    icon: <Cpu className="w-5 h-5 text-emerald-400" />,
    recommended_java: 21,
    versions: ['1.21.4 (Latest)', '1.21.1'],
  },
  {
    id: 'fabric',
    name: 'Fabric Loader',
    description: 'Lightweight, modular modding toolchain for Minecraft with Lithium, Sodium, and modern optimization mods.',
    badge: 'MODDED',
    icon: <Layers className="w-5 h-5 text-sky-400" />,
    recommended_java: 21,
    versions: ['0.16.9 (1.21.4)', '0.16.5 (1.21.1)', '0.15.11 (1.20.4)'],
  },
  {
    id: 'forge',
    name: 'NeoForge / Forge',
    description: 'The standard modded platform supporting complex technology, magic, and technical curseforge modpacks.',
    badge: 'MODPACKS',
    icon: <HardDrive className="w-5 h-5 text-amber-400" />,
    recommended_java: 21,
    versions: ['21.4.19 (1.21.4)', '21.1.65 (1.21.1)', '20.4.80 (1.20.4)'],
  },
  {
    id: 'velocity',
    name: 'Velocity Proxy',
    description: 'Next-generation modern Minecraft proxy server designed for packet filtering and multi-server networks.',
    badge: 'GATEWAY',
    icon: <Rocket className="w-5 h-5 text-cyan-400" />,
    recommended_java: 21,
    versions: ['3.4.0 (Latest)', '3.3.0'],
  },
];

export const SoftwareChanger: React.FC = () => {
  const [currentSoftware, setCurrentSoftware] = useState<string>('purpur');
  const [selectedVersion, setSelectedVersion] = useState<Record<string, string>>({
    purpur: '1.21.4 (Latest)',
    paper: '1.21.4 (Latest)',
    folia: '1.21.4 (Latest)',
    fabric: '0.16.9 (1.21.4)',
    forge: '21.4.19 (1.21.4)',
    velocity: '3.4.0 (Latest)',
  });
  const [isChanging, setIsChanging] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleSwitchSoftware = (software: SoftwareOption) => {
    setIsChanging(software.id);
    setSuccessNotice(null);

    setTimeout(() => {
      setCurrentSoftware(software.id);
      setIsChanging(null);
      setSuccessNotice(`Switched to ${software.name} ${selectedVersion[software.id]}. Container jar updated.`);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-[#00D2FF]" /> Server Software Engine Changer
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Switch game server engines instantly. The system downloads verified jars, sets runtime flags, and updates startup parameters.
        </p>
      </div>

      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SOFTWARE_LIST.map(software => {
          const isCurrent = currentSoftware === software.id;
          const isBusy = isChanging === software.id;

          return (
            <GlassCard key={software.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
                      {software.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{software.name}</h3>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-white/10 text-slate-300 border border-white/10">
                          {software.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">Requires Java {software.recommended_java}+</p>
                    </div>
                  </div>

                  {isCurrent && (
                    <GlassBadge status="running">ACTIVE</GlassBadge>
                  )}
                </div>

                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  {software.description}
                </p>

                {/* Version Selector */}
                <div className="mb-4">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Select Build Target:
                  </label>
                  <select
                    value={selectedVersion[software.id] || software.versions[0]}
                    onChange={e =>
                      setSelectedVersion({ ...selectedVersion, [software.id]: e.target.value })
                    }
                    className="glass-input text-xs w-full px-3 py-2 bg-[#090D16] text-slate-200 cursor-pointer"
                  >
                    {software.versions.map(ver => (
                      <option key={ver} value={ver}>
                        {ver}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10">
                {isCurrent ? (
                  <div className="text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5 py-2">
                    <Check className="w-4 h-4" /> Active Engine
                  </div>
                ) : (
                  <GlassButton
                    variant="glass"
                    className="w-full text-xs font-semibold"
                    isLoading={isBusy}
                    onClick={() => handleSwitchSoftware(software)}
                    leftIcon={<Download className="w-3.5 h-3.5 text-[#00D2FF]" />}
                  >
                    Install &amp; Switch
                  </GlassButton>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};
