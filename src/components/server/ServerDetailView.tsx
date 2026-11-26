import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal,
  FolderOpen,
  Database,
  Clock,
  Users,
  Archive,
  Network,
  Cpu,
  Settings,
  Activity,
  ChevronLeft,
  Power,
  RotateCw,
  Square,
  Package,
  RefreshCw,
  Wrench,
  Split,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { useServers } from '../../context/ServerContext';
import { useTheme } from '../../context/ThemeContext';
import { ConsoleTerminal } from './ConsoleTerminal';
import { FileManager } from './FileManager';
import { DatabasesTab } from './DatabasesTab';
import { SchedulesTab } from './SchedulesTab';
import { UsersTab } from './UsersTab';
import { BackupsTab } from './BackupsTab';
import { NetworkTab } from './NetworkTab';
import { StartupSettingsTab } from './StartupSettingsTab';
import { ServerSettingsTab } from './ServerSettingsTab';
import { ServerActivityTab } from './ServerActivityTab';
import { ModpackBrowser } from '../addons/ModpackBrowser';
import { PlayerManager } from '../addons/PlayerManager';
import { SoftwareChanger } from '../addons/SoftwareChanger';
import { VisualConfigEditor } from '../addons/VisualConfigEditor';
import { ServerSplitter } from '../addons/ServerSplitter';
import { SubdomainManager } from '../addons/SubdomainManager';
import { CrashAnalyzer } from '../addons/CrashAnalyzer';
import { GlassBadge } from '../ui/GlassBadge';
import { GlassButton } from '../ui/GlassButton';

interface ServerDetailViewProps {
  initialSubTab?: string;
  onSubTabChange?: (tab: string) => void;
  onBackToDashboard: () => void;
}

export const ServerDetailView: React.FC<ServerDetailViewProps> = ({
  initialSubTab = 'console',
  onSubTabChange,
  onBackToDashboard,
}) => {
  const { activeServer, sendPowerAction, wsStatus } = useServers();
  const { previewTheme } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<string>(initialSubTab || 'console');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleSelectTab = (tabId: string) => {
    setActiveSubTab(tabId);
    onSubTabChange?.(tabId);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (!activeServer) {
    return (
      <div className="max-w-3xl mx-auto mt-16 p-8 rounded-2xl bg-[#14161B]/95 backdrop-blur-xl border border-white/15 text-center flex flex-col items-center gap-4 shadow-2xl">
        <p className="text-slate-300 text-sm">Select a server from your fleet to manage its console, files, and settings.</p>
        <GlassButton variant="primary" onClick={onBackToDashboard}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Server Fleet
        </GlassButton>
      </div>
    );
  }

  const coreTabs = [
    { id: 'console', label: 'Console', icon: Terminal },
    { id: 'files', label: 'Files', icon: FolderOpen },
    { id: 'databases', label: 'Databases', icon: Database },
    { id: 'schedules', label: 'Schedules', icon: Clock },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'backups', label: 'Backups', icon: Archive },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'startup', label: 'Startup', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  const addonTabs = [
    ...(previewTheme.addon_player_manager_enabled ? [{ id: 'players', label: 'Players', icon: Users }] : []),
    ...(previewTheme.addon_mod_installer_enabled ? [{ id: 'mods', label: 'Mods & Plugins', icon: Package }] : []),
    ...(previewTheme.addon_software_changer_enabled ? [{ id: 'software', label: 'Software', icon: RefreshCw }] : []),
    ...(previewTheme.addon_config_editor_enabled ? [{ id: 'config', label: 'Config Editor', icon: Wrench }] : []),
    ...(previewTheme.addon_server_splitter_enabled ? [{ id: 'split', label: 'Splitter', icon: Split }] : []),
    ...(previewTheme.addon_subdomain_manager_enabled ? [{ id: 'subdomains', label: 'Subdomains', icon: Globe }] : []),
    ...(previewTheme.addon_crash_analyzer_enabled ? [{ id: 'crash', label: 'Crash Analyzer', icon: AlertTriangle }] : []),
  ];

  const isOnline = activeServer.status === 'running';
  const isTransitioning = activeServer.status === 'starting' || activeServer.status === 'stopping';

  return (
    <div className="relative z-20 flex flex-col gap-5 pb-12">
      {/* High-Contrast Glassmorphic Server Header & Sub-Navigation Bar (Always Visible Over Wallpaper) */}
      <div className="rounded-2xl bg-[#13151B]/95 backdrop-blur-xl border border-white/15 shadow-[0_14px_40px_rgba(0,0,0,0.7)] px-4 py-3 flex flex-col gap-2.5">
        {/* Top Row: Server Title & Power Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBackToDashboard}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white transition-all border border-white/15 cursor-pointer shrink-0"
              title="Back to Fleet"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                  {activeServer.name}
                </h1>
                <GlassBadge status={activeServer.status} />
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                    wsStatus === 'connected'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : wsStatus === 'connecting'
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                      : 'bg-white/10 border-white/15 text-slate-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      wsStatus === 'connected'
                        ? 'bg-emerald-400 animate-pulse'
                        : wsStatus === 'connecting'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-slate-400'
                    }`}
                  />
                  {wsStatus === 'connected' ? 'WS Connected' : wsStatus === 'connecting' ? 'WS Connecting' : 'WS Offline'}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-300 flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-slate-400">{activeServer.identifier}</span>
                <span>•</span>
                <span>{activeServer.allocation.ip}:{activeServer.allocation.port}</span>
                <span>•</span>
                <span className="text-red-300">{activeServer.egg_name}</span>
              </p>
            </div>
          </div>

          {/* Power Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <GlassButton
              variant="primary"
              size="sm"
              disabled={isOnline || isTransitioning}
              onClick={() => sendPowerAction('start', activeServer.uuid)}
            >
              <Power className="w-3.5 h-3.5 mr-1.5" /> Start
            </GlassButton>
            <GlassButton
              variant="secondary"
              size="sm"
              disabled={!isOnline || isTransitioning}
              onClick={() => sendPowerAction('restart', activeServer.uuid)}
            >
              <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Restart
            </GlassButton>
            <GlassButton
              variant="danger"
              size="sm"
              disabled={activeServer.status === 'offline'}
              onClick={() => sendPowerAction('stop', activeServer.uuid)}
            >
              <Square className="w-3.5 h-3.5 mr-1.5" /> Stop
            </GlassButton>
          </div>
        </div>

        {/* Horizontal Sub-Navigation Tabs Bar (All 10 Core Tabs Visible Without Overflow Clipping) */}
        <nav
          aria-label="Server Navigation"
          className="flex flex-col gap-1.5 pt-2 border-t border-white/10"
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            {coreTabs.map(tab => {
              const Icon = tab.icon;
              const isSelected = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-tab={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#DC2626] to-[#991B1B] text-white border-red-400/40 shadow-lg shadow-red-600/25'
                      : 'bg-[#1C1F27]/90 text-slate-200 hover:text-white hover:bg-white/15 border-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {addonTabs.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5">
              {addonTabs.map(tab => {
                const Icon = tab.icon;
                const isSelected = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-tab={tab.id}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#DC2626] to-[#991B1B] text-white border-red-400/40 shadow-md'
                        : 'bg-[#181B22]/85 text-slate-300 hover:text-white hover:bg-white/15 border-white/10'
                    }`}
                  >
                    <Icon className="w-3 h-3 text-red-400" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>
      </div>

      {/* Sub-view Workspace Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeServer.uuid}-${activeSubTab}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
        >
          {activeSubTab === 'console' && <ConsoleTerminal />}
          {activeSubTab === 'files' && <FileManager />}
          {activeSubTab === 'databases' && <DatabasesTab />}
          {activeSubTab === 'schedules' && <SchedulesTab />}
          {activeSubTab === 'users' && <UsersTab />}
          {activeSubTab === 'backups' && <BackupsTab />}
          {activeSubTab === 'network' && <NetworkTab />}
          {activeSubTab === 'startup' && <StartupSettingsTab />}
          {activeSubTab === 'settings' && <ServerSettingsTab />}
          {activeSubTab === 'activity' && <ServerActivityTab />}
          {activeSubTab === 'mods' && <ModpackBrowser />}
          {activeSubTab === 'players' && <PlayerManager />}
          {activeSubTab === 'software' && <SoftwareChanger />}
          {activeSubTab === 'config' && <VisualConfigEditor />}
          {activeSubTab === 'split' && <ServerSplitter />}
          {activeSubTab === 'subdomains' && <SubdomainManager />}
          {activeSubTab === 'crash' && <CrashAnalyzer />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
