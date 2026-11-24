import React from 'react';
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
} from 'lucide-react';

interface AdminSidebarNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onExitAdmin: () => void;
}

export const ADMIN_NAV_GROUPS = [
  {
    title: 'Administration',
    items: [
      { id: 'admin-dashboard', label: 'Overview', icon: <Compass className="w-4 h-4" /> },
      { id: 'admin-settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
      { id: 'admin-api', label: 'Application API', icon: <Key className="w-4 h-4" /> },
      { id: 'admin-audit', label: 'Activity Logs', icon: <ShieldCheck className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Server Infrastructure',
    items: [
      { id: 'admin-locations', label: 'Locations', icon: <MapPin className="w-4 h-4" /> },
      { id: 'admin-nodes', label: 'Nodes & Wings', icon: <HardDrive className="w-4 h-4" /> },
      { id: 'admin-servers', label: 'Servers Fleet', icon: <Server className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Service Management',
    items: [
      { id: 'admin-mounts', label: 'Mounts', icon: <Layers className="w-4 h-4" /> },
      { id: 'admin-nests', label: 'Nests & Eggs', icon: <Zap className="w-4 h-4" /> },
    ],
  },
  {
    title: 'User Management',
    items: [
      { id: 'admin-users', label: 'Users & Roles', icon: <Users className="w-4 h-4" /> },
    ],
  },
  {
    title: 'Customization Studio',
    items: [
      { id: 'admin-studio', label: 'Appearance & Studio', icon: <Palette className="w-4 h-4 text-[#DC2626]" /> },
    ],
  },
];

export const AdminSidebarNav: React.FC<AdminSidebarNavProps> = ({
  currentTab,
  onTabChange,
  onExitAdmin,
}) => {
  return (
    <div className="w-full lg:w-60 shrink-0 flex flex-col gap-4">
      <button
        onClick={onExitAdmin}
        className="flex items-center gap-2 p-2.5 rounded-lg bg-[#181A20] hover:bg-[#21242C] text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/10"
      >
        <ArrowLeft className="w-4 h-4 text-[#DC2626]" /> Exit to Client Area
      </button>

      <div className="flex flex-col gap-4">
        {ADMIN_NAV_GROUPS.map(group => (
          <div key={group.title} className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3">
              {group.title}
            </span>
            <div className="flex flex-col gap-0.5">
              {group.items.map(item => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#DC2626] text-white shadow-md shadow-red-950/40'
                        : 'text-slate-400 hover:text-white hover:bg-[#181A20]'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
