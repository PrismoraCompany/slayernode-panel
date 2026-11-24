import React, { useState } from 'react';
import { Menu, X, Shield, Layers, LogOut, ExternalLink, ChevronRight, Server } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { AnnouncementBanner } from './AnnouncementBanner';

interface LayoutWrapperProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isAdminView: boolean;
  onToggleAdminView: () => void;
  children: React.ReactNode;
}

export const LayoutWrapper: React.FC<LayoutWrapperProps> = ({
  currentTab,
  onTabChange,
  isAdminView,
  onToggleAdminView,
  children,
}) => {
  const { user, logout, isAdmin } = useAuth();
  const { previewTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: string) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#111216] text-[#F3F4F6] flex flex-col md:flex-row relative">
      {/* ========================================================
          1. MOBILE TOP HEADER (With 3-Lines Hamburger in Top-Left)
          ======================================================== */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#181A20] border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {/* 3-Lines Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-[#21242C] text-white hover:bg-[#2A2E38] transition-colors cursor-pointer border border-white/10"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#DC2626]" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <img
              src={previewTheme.logo_url || '/logo.jpg'}
              alt="Logo"
              className="w-7 h-7 rounded-md object-cover border border-white/10"
            />
            <span className="font-extrabold text-sm tracking-tight text-white">
              {previewTheme.panel_name || 'SlayerNode'}
            </span>
          </div>
        </div>

        {/* User initials badge */}
        <div className="w-7 h-7 rounded-md bg-[#21242C] border border-white/10 flex items-center justify-center text-xs font-bold text-white uppercase font-mono">
          {user?.username ? user.username[0] : 'A'}
        </div>
      </div>

      {/* ========================================================
          2. DESKTOP LEFT SIDEBAR & MOBILE SLIDE-OUT DRAWER
          ======================================================== */}
      {/* Mobile Backdrop Overlay */}
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
        <div className="flex flex-col flex-1 overflow-y-auto p-4">
          {/* Brand Header */}
          <div
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer select-none mb-6 border-b border-white/10 pb-4"
          >
            <img
              src={previewTheme.logo_url || '/logo.jpg'}
              alt="SlayerNode Logo"
              className="w-9 h-9 rounded-lg object-cover border border-white/15 shrink-0"
            />
            <div className="truncate">
              <span className="font-black text-sm text-white tracking-wide block truncate">
                {previewTheme.panel_name || 'SlayerNode'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Control Panel</span>
            </div>
          </div>

          {/* Navigation Links (NO external Console button!) */}
          <nav className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1">
              Navigation
            </span>

            <button
              onClick={() => {
                if (isAdminView) onToggleAdminView();
                handleNavClick('dashboard');
              }}
              className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                !isAdminView && currentTab === 'dashboard'
                  ? 'bg-[#DC2626] text-white shadow-md shadow-red-950/40'
                  : 'text-slate-300 hover:text-white hover:bg-[#21242C]'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Servers</span>
            </button>

            {/* Admin Switcher Tile */}
            {isAdmin && (
              <button
                onClick={() => {
                  onToggleAdminView();
                  setMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all cursor-pointer mt-1 ${
                  isAdminView
                    ? 'bg-[#DC2626] text-white shadow-md'
                    : 'bg-[#21242C] text-slate-200 hover:bg-[#2A2E38] border border-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-white" />
                  <span>{isAdminView ? 'Client Area' : 'Admin Area'}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            )}

            {/* External Custom Nav Links */}
            <div className="pt-4 mt-2 border-t border-white/10 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1">
                Resources
              </span>
              {(previewTheme.custom_nav_links || []).map(link => (
                <a
                  key={link.id}
                  href={link.url}
                  target={link.external ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between"
                >
                  <span>{link.label}</span>
                  {link.external && <ExternalLink className="w-3 h-3 opacity-60" />}
                </a>
              ))}
            </div>
          </nav>
        </div>

        {/* Footer: User Profile & Logout */}
        <div className="p-3 border-t border-white/10 bg-[#14161B]">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#181A20] border border-white/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#21242C] border border-white/10 flex items-center justify-center font-bold text-white text-xs uppercase shrink-0 font-mono">
                {user?.username ? user.username[0] : 'A'}
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate">
                  {user?.username || 'admin'}
                </span>
                <span className="text-[10px] text-slate-400 truncate block font-mono">
                  {user?.email || 'admin@slayernode.xyz'}
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
          3. MAIN CONTENT WORKSPACE (Right Side on Desktop)
          ======================================================== */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <AnnouncementBanner />
        {children}
      </main>
    </div>
  );
};
