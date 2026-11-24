import React, { useState } from 'react';
import {
  Terminal,
  Folder,
  Database,
  Calendar,
  Network,
  Archive,
  Users,
  Settings,
  Package,
  UserCheck,
  RefreshCw,
  Sliders,
  Split,
  Globe,
  Sparkles,
  ArrowLeft,
  Server as ServerIcon,
} from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { useTheme } from '../../context/ThemeContext';
import { GlassCard } from '../ui/GlassCard';
import { GlassBadge } from '../ui/GlassBadge';
import { ConsoleTerminal } from './ConsoleTerminal';
import { FileManager } from './FileManager';
import { DatabasesTab } from './DatabasesTab';
import { SchedulesTab } from './SchedulesTab';
import { NetworkTab } from './NetworkTab';
import { BackupsTab } from './BackupsTab';
import { UsersTab } from './UsersTab';
import { StartupSettingsTab } from './StartupSettingsTab';
import { ModpackBrowser } from '../addons/ModpackBrowser';
import { PlayerManager } from '../addons/PlayerManager';
import { SoftwareChanger } from '../addons/SoftwareChanger';
import { VisualConfigEditor } from '../addons/VisualConfigEditor';
import { ServerSplitter } from '../addons/ServerSplitter';
import { SubdomainManager } from '../addons/SubdomainManager';
import { CrashAnalyzer } from '../addons/CrashAnalyzer';

interface ServerDetailViewProps {
  onBackToDashboard: () => void;
}

export const ServerDetailView: React.FC<ServerDetailViewProps> = ({ onBackToDashboard }) => {
  const { activeServer } = useServer();
  const { previewTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<string>('console');

  // Server Workspace Navigation Tabs
  const coreTabs = [
    { id: 'console', label: 'Console', icon: <Terminal className="w-4 h-4" /> },
    { id: 'files', label: 'Files', icon: <Folder className="w-4 h-4" /> },
    { id: 'databases', label: 'Databases', icon: <Database className="w-4 h-4" /> },
    { id: 'schedules', label: 'Schedules', icon: <Calendar className="w-4 h-4" /> },
    { id: 'network', label: 'Network', icon: <Network className="w-4 h-4" /> },
    { id: 'backups', label: 'Backups', icon: <Archive className="w-4 h-4" /> },
    { id: 'users', label: 'Subusers', icon: <Users className="w-4 h-4" /> },
    { id: 'startup', label: 'Startup', icon: <Settings className="w-4 h-4" /> },
  ];

  // Built-in Addons Tabs (governed by ThemeStudio toggles)
  const addonTabs = [
    previewTheme.addon_mod_installer_enabled && { id: 'plugins', label: 'Plugins & Mods', icon: <Package className="w-4 h-4 text-sky-400" /> },
    previewTheme.addon_player_manager_enabled && { id: 'players', label: 'Players', icon: <UserCheck className="w-4 h-4 text-emerald-400" /> },
    previewTheme.addon_software_changer_enabled && { id: 'software', label: 'Software Changer', icon: <RefreshCw className="w-4 h-4 text-indigo-400" /> },
    previewTheme.addon_config_editor_enabled && { id: 'config', label: 'Visual Config', icon: <Sliders className="w-4 h-4 text-amber-400" /> },
    previewTheme.addon_server_splitter_enabled && { id: 'splitter', label: 'Server Splitter', icon: <Split className="w-4 h-4 text-purple-400" /> },
    previewTheme.addon_subdomain_manager_enabled && { id: 'subdomains', label: 'Subdomains', icon: <Globe className="w-4 h-4 text-teal-400" /> },
    previewTheme.addon_crash_analyzer_enabled && { id: 'analyzer', label: 'Crash Analyzer', icon: <Sparkles className="w-4 h-4 text-rose-400" /> },
  ].filter(Boolean) as { id: string; label: string; icon: React.ReactNode }[];

  return (
    <div className="flex flex-col gap-5">
      {/* Back button & Server Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to All Servers</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            UUID: {activeServer?.identifier}
          </span>
          <GlassBadge status={activeServer?.status}>
            {activeServer?.status.toUpperCase()}
          </GlassBadge>
        </div>
      </div>

      {/* Tabs Navbar */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/80 border border-white/10 overflow-x-auto text-xs shadow-lg">
        {coreTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-sky-500/20 text-white border border-sky-400/30 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}

        {addonTabs.length > 0 && <div className="h-5 w-[1px] bg-white/10 mx-1 shrink-0" />}

        {addonTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-sky-500/20 text-white border border-sky-400/30 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content Display */}
      <div>
        {activeTab === 'console' && <ConsoleTerminal />}
        {activeTab === 'files' && <FileManager />}
        {activeTab === 'databases' && <DatabasesTab />}
        {activeTab === 'schedules' && <SchedulesTab />}
        {activeTab === 'network' && <NetworkTab />}
        {activeTab === 'backups' && <BackupsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'startup' && <StartupSettingsTab />}

        {/* Addon Views */}
        {activeTab === 'plugins' && <ModpackBrowser />}
        {activeTab === 'players' && <PlayerManager />}
        {activeTab === 'software' && <SoftwareChanger />}
        {activeTab === 'config' && <VisualConfigEditor />}
        {activeTab === 'splitter' && <ServerSplitter />}
        {activeTab === 'subdomains' && <SubdomainManager />}
        {activeTab === 'analyzer' && <CrashAnalyzer />}
      </div>
    </div>
  );
};
