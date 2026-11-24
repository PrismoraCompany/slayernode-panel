import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { TopNavbar } from './TopNavbar';
import { GlassSidebar } from './GlassSidebar';
import { DockBar } from './DockBar';
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
  const { previewTheme } = useTheme();
  const layout = previewTheme.navigation_layout || 'floating_top';

  return (
    <div className="min-h-screen flex flex-col relative text-slate-100 selection:bg-[#00D2FF]/20 selection:text-[#00D2FF]">
      {/* 1. Global Wallpaper Layer — Translucent Glass Lets This Shine Through! */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700"
        style={{
          backgroundImage: `url(${previewTheme.custom_wallpaper_url || '/wallpapers/slayernode-liquid-mesh.png'})`,
          filter: `blur(${previewTheme.wallpaper_blur ?? 0}px)`,
          opacity: (previewTheme.wallpaper_opacity ?? 85) / 100,
        }}
      />
      {/* Subtle darkening tint */}
      <div className="fixed inset-0 z-0 bg-[#090D16]/45 pointer-events-none" />

      {/* 2. Navigation & Main Area */}
      <div className="relative z-10 flex-1 flex flex-col">
        {layout === 'collapsible_sidebar' ? (
          <div className="flex-1 flex w-full">
            <GlassSidebar
              currentTab={currentTab}
              onTabChange={onTabChange}
              isAdminView={isAdminView}
              onToggleAdminView={onToggleAdminView}
            />
            <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
              <AnnouncementBanner />
              {children}
            </main>
          </div>
        ) : layout === 'dock_bar' ? (
          <div className="flex-1 flex flex-col w-full pb-24">
            <TopNavbar
              currentTab={currentTab}
              onTabChange={onTabChange}
              isAdminView={isAdminView}
              onToggleAdminView={onToggleAdminView}
            />
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6">
              <AnnouncementBanner />
              {children}
            </main>
            <DockBar
              currentTab={currentTab}
              onTabChange={onTabChange}
              isAdminView={isAdminView}
              onToggleAdminView={onToggleAdminView}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col w-full">
            <TopNavbar
              currentTab={currentTab}
              onTabChange={onTabChange}
              isAdminView={isAdminView}
              onToggleAdminView={onToggleAdminView}
            />
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-12">
              <AnnouncementBanner />
              {children}
            </main>
          </div>
        )}
      </div>

      {/* 3. Irremovable SlayerNode Copyright Footer */}
      <footer className="relative z-20 w-full py-5 border-t border-white/10 text-xs text-slate-400 select-none bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <img
              src={previewTheme.logo_url || '/logo.jpg'}
              alt="SlayerNode"
              className="w-4 h-4 rounded-sm object-cover"
            />
            <span className="font-semibold text-slate-300">SlayerNode Panel</span>
            <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.2 rounded border border-white/5">
              v1.0.0
            </span>
          </div>
          <div>
            <span>© 2026 SlayerNode. All rights reserved. — </span>
            <a
              href="https://slayernode.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00D2FF] hover:underline font-semibold"
            >
              https://slayernode.xyz
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
