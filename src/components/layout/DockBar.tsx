import React from 'react';
import { motion } from 'framer-motion';
import {
  Layers,
  Terminal,
  Shield,
  Palette,
  HardDrive,
  Users,
  Compass,
  LogOut,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface DockBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isAdminView: boolean;
  onToggleAdminView: () => void;
}

export const DockBar: React.FC<DockBarProps> = ({
  currentTab,
  onTabChange,
  isAdminView,
  onToggleAdminView,
}) => {
  const { isAdmin, logout } = useAuth();

  const dockItems = !isAdminView
    ? [
        { id: 'dashboard', label: 'Servers', icon: <Layers className="w-5 h-5" /> },
        { id: 'server-detail', label: 'Console', icon: <Terminal className="w-5 h-5" /> },
      ]
    : [
        { id: 'admin-dashboard', label: 'Fleet', icon: <Compass className="w-5 h-5" /> },
        { id: 'admin-nodes', label: 'Nodes', icon: <HardDrive className="w-5 h-5" /> },
        { id: 'admin-nests', label: 'Eggs', icon: <Zap className="w-5 h-5" /> },
        { id: 'admin-users', label: 'Users', icon: <Users className="w-5 h-5" /> },
        { id: 'admin-studio', label: 'Studio', icon: <Palette className="w-5 h-5" /> },
      ];

  return (
    <div className="fixed bottom-5 inset-x-0 z-50 flex justify-center pointer-events-none">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-panel p-2 px-3 rounded-full flex items-center gap-2 shadow-2xl pointer-events-auto border border-white/20 backdrop-blur-2xl"
      >
        {dockItems.map(item => {
          const isActive = currentTab === item.id;
          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.15, y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onTabChange(item.id)}
              title={item.label}
              className={`p-2.5 rounded-full relative flex items-center justify-center transition-colors cursor-pointer ${
                isActive
                  ? 'bg-sky-500/30 text-white border border-sky-400/40 shadow-lg shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {item.icon}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-sky-400 absolute -bottom-1" />
              )}
            </motion.button>
          );
        })}

        <div className="h-6 w-[1px] bg-white/20 mx-1" />

        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.15, y: -4 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleAdminView}
            title={isAdminView ? 'Switch to Client Area' : 'Switch to Admin Area'}
            className={`p-2.5 rounded-full transition-colors cursor-pointer ${
              isAdminView ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/30' : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Shield className="w-5 h-5" />
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.15, y: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={logout}
          title="Sign Out"
          className="p-2.5 rounded-full text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </div>
  );
};
