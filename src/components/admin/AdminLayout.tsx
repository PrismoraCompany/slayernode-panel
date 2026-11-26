import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  Settings,
  Key,
  ShieldCheck,
  MapPin,
  HardDrive,
  Server,
  Layers,
  Zap,
  Users,
  Palette,
  ArrowLeft,
  Menu,
  X,
  LogOut,
  ExternalLink,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { AnnouncementBanner } from '../layout/AnnouncementBanner';

interface AdminLayoutProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onExitAdmin: () => void;
  children: React.ReactNode;
}

export const ADMIN_NAV_GROUPS = [
  {
    title: 'Administration',
    items: [
      { id: 'admin-dashboard', label: 'Overview', icon: Compass },
      { id: 'admin-settings', label: 'System Settings', icon: Settings },
      { id: 'admin-api', label: 'Application API', icon: Key },
      { id: 'admin-audit', label: 'Activity Logs', icon: ShieldCheck },
    ],
  },
  {
    title: 'Server Infrastructure',
    items: [
      { id: 'admin-nodes', label: 'Nodes & Wings', icon: HardDrive },
      { id: 'admin-locations', label: 'Locations', icon: MapPin },
      { id: 'admin-mounts', label: 'Mounts', icon: Layers },
    ],
  },
  {
    title: 'Management Fleet',
    items: [
      { id: 'admin-servers', label: 'Servers Fleet', icon: Server },
      { id: 'admin-users', label: 'Users & Roles', icon: Users },
      { id: 'admin-nests', label: 'Nests & Eggs', icon: Zap },
    ],
  },
  {
    title: 'Customization Studio',
    items: [
      { id: 'admin-studio', label: 'Appearance & Studio', icon: Palette, highlight: true },
    ],
  },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onTabChange,
  onExitAdmin,
  children,
}) => {
  const { user, logout } = useAuth();
  const { previewTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: string) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  // Find human-readable title for current tab
  let currentTitle = 'Admin Overview';
  for (const group of ADMIN_NAV_GROUPS) {
    const item = group.items.find(i => i.id === currentTab);
    if (item) {
      currentTitle = item.label;
      break;
    }
  }

  return (
    <div
      className="min-h-screen text-[#F3F4F6] flex flex-col md:flex-row relative"
      style={{ backgroundColor: previewTheme.bg_canvas || '#111216' }}
    >
      {/* Background Wallpaper Layer */}
      {previewTheme.custom_wallpaper_url && (
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center transition-all duration-300"
          style={{
            backgroundImage: `url("${previewTheme.custom_wallpaper_url.replace(/"/g, '\\"')}")`,
            filter: `blur(${previewTheme.wallpaper_blur || 0}px)`,
            opacity: (previewTheme.wallpaper_opacity ?? 100) / 100,
          }}
        />
      )}

      {/* ========================================================
          1. MOBILE TOP HEADER
          ======================================================== */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#181A20] border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-[#21242C] text-white hover:bg-[#2A2E38] transition-colors cursor-pointer border border-white/10"
            aria-label="Toggle Admin Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#DC2626]" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2">
            <img
              src={previewTheme.logo_url || '/logo.jpg'}
              alt="Logo"
              className="w-7 h-7 rounded-md object-cover border border-white/10"
            />
            <span className="font-extrabold text-sm tracking-tight text-white">
              {previewTheme.panel_name || 'SlayerNode'} <span className="text-[#DC2626] font-mono text-xs">ADMIN</span>
            </span>
          </div>
        </div>

        <button
          onClick={onExitAdmin}
          className="px-2.5 py-1.5 rounded-lg bg-[#21242C] hover:bg-[#2A2E38] text-[11px] font-bold text-slate-200 border border-white/10 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#DC2626]" /> Client
        </button>
      </div>

      {/* ========================================================
          2. DEDICATED ADMIN SIDEBAR
          ======================================================== */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen z-50 w-64 bg-[#181A20] border-r border-white/10 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto p-3.5">
          {/* Admin Header & Logo */}
          <div className="flex items-center gap-3 p-2 rounded-lg mb-3 border-b border-white/10 pb-3">
            <img
              src={previewTheme.logo_url || '/logo.jpg'}
              alt="SlayerNode Logo"
              className="w-9 h-9 rounded-lg object-cover border border-white/15 shrink-0"
            />
            <div className="truncate">
              <span className="font-black text-sm text-white tracking-wide block truncate">
                {previewTheme.panel_name || 'SlayerNode'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#DC2626] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" />
                Administration Suite
              </span>
            </div>
          </div>

          {/* Prominent Return to Client Area Button */}
          <button
            onClick={onExitAdmin}
            className="w-full flex items-center justify-between p-2 mb-3 rounded-lg bg-[#21242C] hover:bg-[#2A2E38] text-xs font-semibold text-white border border-white/10 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4 text-[#DC2626] group-hover:-translate-x-0.5 transition-transform" />
              <span>Exit to Client Area</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono bg-white/5 px-1.5 py-0.5 rounded">ESC</span>
          </button>

          {/* Grouped Admin Navigation Links */}
          <nav className="flex flex-col gap-2.5">
            {ADMIN_NAV_GROUPS.map(group => (
              <div key={group.title} className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3">
                  {group.title}
                </span>
                <div className="flex flex-col gap-0.5">
                  {group.items.map(item => {
                    const isActive = currentTab === item.id;
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left ${
                          isActive
                            ? 'bg-[#DC2626] text-white shadow-md shadow-red-950/40'
                            : 'text-slate-400 hover:text-white hover:bg-[#21242C]'
                        }`}
                      >
                        <IconComponent
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-white' : item.highlight ? 'text-[#DC2626]' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer: Admin Status & Account */}
        <div className="p-3 border-t border-white/10 bg-[#14161B]">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#181A20] border border-white/10">
            <div
              onClick={() => {
                onExitAdmin();
                onTabChange('account');
              }}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
              title="Open Account Settings"
            >
              <div className="w-8 h-8 rounded-lg bg-[#DC2626]/20 border border-[#DC2626]/30 flex items-center justify-center font-bold text-[#DC2626] text-xs uppercase shrink-0 font-mono">
                {user?.username ? user.username[0] : 'A'}
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate">
                  {user?.username || 'admin'}
                </span>
                <span className="text-[10px] text-red-400 truncate block font-mono font-semibold">
                  ROOT ADMINISTRATOR
                </span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#DC2626] hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================
          3. MAIN ADMIN WORKSPACE
          ======================================================== */}
      <div className="relative z-10 flex-1 min-w-0 flex flex-col">
        {/* Desktop Admin Breadcrumb Header */}
        <header className="hidden md:flex items-center justify-between px-6 py-3.5 bg-[#181A20]/90 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Administration
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-bold text-white">
              {currentTitle}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange('admin-nodes')}
              className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#21242C] hover:bg-[#2A2E38] border border-white/10 text-xs text-slate-300 font-mono transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>SlayerWings Control</span>
            </button>

            <button
              onClick={onExitAdmin}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#21242C] hover:bg-[#2A2E38] text-xs font-bold text-slate-200 border border-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#DC2626]" /> Client Area
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <AnnouncementBanner />
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};
