import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server,
  Terminal,
  Shield,
  Palette,
  LogOut,
  ExternalLink,
  ChevronDown,
  Layers,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { GlassButton } from '../ui/GlassButton';

interface TopNavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isAdminView: boolean;
  onToggleAdminView: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentTab,
  onTabChange,
  isAdminView,
  onToggleAdminView,
}) => {
  const { user, logout, isAdmin } = useAuth();
  const { previewTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-4 z-40 w-full max-w-7xl mx-auto px-4 sm:px-6 mb-6">
      <div className="glass-panel px-4 py-2.5 flex items-center justify-between gap-4 shadow-xl">
        {/* Brand: Uploaded SlayerNode SN Logo & Minimal Name */}
        <div
          onClick={() => {
            if (isAdminView) onToggleAdminView();
            onTabChange('dashboard');
          }}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <img
            src={previewTheme.logo_url || '/logo.jpg'}
            alt="SlayerNode Logo"
            className="w-9 h-9 rounded-xl object-cover border border-white/20 shadow-md group-hover:scale-105 transition-transform"
          />
          <div>
            <span className="text-base font-extrabold tracking-tight text-white">
              {previewTheme.panel_name || 'SlayerNode'}
            </span>
          </div>
        </div>

        {/* Minimal Navigation Center Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          {!isAdminView ? (
            <>
              <button
                onClick={() => onTabChange('dashboard')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'dashboard'
                    ? 'text-white bg-white/15 border border-white/20 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-red-500" />
                Servers
              </button>

              <button
                onClick={() => onTabChange('server-detail')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'server-detail'
                    ? 'text-white bg-white/15 border border-white/20 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-red-500" />
                Console
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/15">
              <Shield className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                Admin Area
              </span>
            </div>
          )}

          {/* Custom Nav Links (e.g. Discord, Store, Status) */}
          {previewTheme.custom_nav_links?.map(link => (
            <a
              key={link.id}
              href={link.url}
              target={link.external ? '_blank' : '_self'}
              rel="noreferrer"
              className="px-3 py-1.5 rounded-full text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors flex items-center gap-1"
            >
              <span>{link.label}</span>
              {link.external && <ExternalLink className="w-3 h-3 opacity-60" />}
            </a>
          ))}
        </nav>

        {/* Right Section: Admin Mode Toggle & User Menu */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <GlassButton
              variant={isAdminView ? 'accent' : 'glass'}
              size="sm"
              onClick={onToggleAdminView}
              leftIcon={isAdminView ? <Layers className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5 text-red-500" />}
            >
              {isAdminView ? 'Client Area' : 'Admin Panel'}
            </GlassButton>
          )}

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer select-none"
            >
              <img
                src={previewTheme.logo_url || '/logo.jpg'}
                alt="Avatar"
                className="w-6 h-6 rounded-full object-cover border border-white/20"
              />
              <span className="hidden sm:inline text-xs font-medium text-slate-200">
                {user?.username || 'admin'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 mt-2 w-52 p-2 rounded-2xl glass-panel shadow-2xl z-50 flex flex-col gap-1 border border-white/15"
                >
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-xs font-bold text-white">{user?.name_first} {user?.name_last}</p>
                    <p className="text-[11px] text-slate-400 truncate font-mono">{user?.email}</p>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        if (!isAdminView) onToggleAdminView();
                        onTabChange('admin-studio');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Palette className="w-3.5 h-3.5 text-red-500" />
                      Theme & Wallpaper
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors flex items-center gap-2 cursor-pointer mt-1 border-t border-white/5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
