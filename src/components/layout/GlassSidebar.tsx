import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Server,
  Terminal,
  Shield,
  Palette,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Layers,
  Settings,
  HardDrive,
  Users,
  Compass,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { GlassButton } from '../ui/GlassButton';

interface GlassSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isAdminView: boolean;
  onToggleAdminView: () => void;
}

export const GlassSidebar: React.FC<GlassSidebarProps> = ({
  currentTab,
  onTabChange,
  isAdminView,
  onToggleAdminView,
}) => {
  const { user, logout, isAdmin } = useAuth();
  const { previewTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(previewTheme.sidebar_collapsed_default);

  const clientNav = [
    { id: 'dashboard', label: 'All Servers', icon: <Layers className="w-4 h-4" /> },
    { id: 'server-detail', label: 'Console & Telemetry', icon: <Terminal className="w-4 h-4" /> },
  ];

  const adminNav = [
    { id: 'admin-dashboard', label: 'Overview', icon: <Compass className="w-4 h-4" /> },
    { id: 'admin-nodes', label: 'Nodes & Wings', icon: <HardDrive className="w-4 h-4" /> },
    { id: 'admin-nests', label: 'Nests & Eggs', icon: <Zap className="w-4 h-4" /> },
    { id: 'admin-servers', label: 'Servers Fleet', icon: <Server className="w-4 h-4" /> },
    { id: 'admin-users', label: 'Users & Roles', icon: <Users className="w-4 h-4" /> },
    { id: 'admin-studio', label: 'Appearance & Studio', icon: <Palette className="w-4 h-4" /> },
  ];

  const currentNav = isAdminView ? adminNav : clientNav;

  return (
    <aside
      className={`relative z-40 h-[calc(100vh-2rem)] sticky top-4 my-4 ml-4 transition-all duration-300 flex flex-col justify-between glass-panel p-3 shadow-2xl ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand & Collapse Toggle */}
      <div>
        <div className="flex items-center justify-between gap-2 p-2 mb-4 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3 overflow-hidden select-none cursor-pointer" onClick={() => onTabChange('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 border border-white/30 shrink-0">
              <Server className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <h2 className="text-sm font-extrabold text-white tracking-tight truncate">
                  {previewTheme.panel_name}
                </h2>
                <p className="text-[10px] text-emerald-400 font-mono">● Wings 1.11.3</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* View Switcher Pill */}
        {isAdmin && !collapsed && (
          <div className="mb-4">
            <button
              onClick={onToggleAdminView}
              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isAdminView
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isAdminView ? 'Admin Mode (Active)' : 'Switch to Admin Area'}</span>
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {currentNav.map(item => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500/25 to-indigo-500/25 text-white border border-white/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <span className={isActive ? 'text-sky-400' : 'text-slate-400'}>{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Card & Logout */}
      <div className="border-t border-white/10 pt-3">
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-white/5 ${collapsed ? 'justify-center p-1.5' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.name_first?.[0] || 'A'}
          </div>
          {!collapsed && (
            <div className="truncate flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.username}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
