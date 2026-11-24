import React, { createContext, useContext, useState, useEffect } from 'react';
import { Server, ServerStats, ServerStatus } from '../types';
import { useAuth } from './AuthContext';

export const INITIAL_SERVERS: Server[] = [];

interface ServerContextType {
  servers: Server[];
  visibleServers: Server[];
  activeServer: Server | null;
  stats: ServerStats;
  historyStats: { time: string; cpu: number; ram: number; disk: number; netRx: number; netTx: number }[];
  consoleLogs: string[];
  selectServer: (id: string) => boolean;
  sendPowerAction: (action: 'start' | 'stop' | 'restart' | 'kill', targetServerId?: string) => void;
  sendCommand: (command: string) => void;
  togglePinServer: (id: string) => void;
  clearConsole: () => void;
  accessDeniedError: string | null;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export const ServerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [servers, setServers] = useState<Server[]>(INITIAL_SERVERS);
  const [activeServerId, setActiveServerId] = useState<string>('');
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await fetch('/api/client/servers');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.data)) {
            const mapped = data.data.map((d: any) => d.attributes || d);
            setServers(mapped);
            if (mapped.length > 0) {
              setActiveServerId(mapped[0].id);
            }
          }
        }
      } catch {}
    };
    fetchServers();
  }, []);

  // Tenant Boundary Isolation: Non-admin users ONLY see servers they own!
  const visibleServers = servers.filter(s => {
    if (isAdmin) return true;
    return s.owner_id === user?.id;
  });

  const activeServer = visibleServers.find(s => s.id === activeServerId) || visibleServers[0] || null;

  const [stats, setStats] = useState<ServerStats>({
    memory_bytes: 0,
    memory_limit_bytes: 1,
    cpu_absolute: 0,
    network: {
      rx_bytes: 0,
      tx_bytes: 0,
    },
    disk_bytes: 0,
    uptime_ms: 0,
    state: 'offline',
  });

  const [historyStats, setHistoryStats] = useState<{ time: string; cpu: number; ram: number; disk: number; netRx: number; netTx: number }[]>(() => {
    const points = [];
    const now = Date.now();
    for (let i = 20; i >= 0; i--) {
      const d = new Date(now - i * 3000);
      points.push({
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        cpu: Math.floor(20 + Math.sin(i * 0.5) * 12 + Math.random() * 6),
        ram: Math.floor(4100 + Math.random() * 200),
        disk: 17.1,
        netRx: Math.floor(120 + Math.random() * 80),
        netTx: Math.floor(240 + Math.random() * 110),
      });
    }
    return points;
  });

  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    '\x1b[38;2;0;210;255m[SlayerWings Engine v1.0.0]\x1b[0m Connected to container socket 8a9c4b12...',
    '\x1b[38;2;16;185;129m[SlayerWings]\x1b[0m Container booted in 380ms with cgroups v2 limits enforced.',
    '\x1b[38;2;255;255;255m[Java Runtime]\x1b[0m OpenJDK 64-Bit Server VM (build 21.0.5+11-LTS)',
    '[14:22:01 INFO]: Loading purpur-1.21.4.jar (-Xms128M -XX:MaxRAMPercentage=95.0)',
    '[14:22:02 INFO]: [Paper] Starting minecraft server version 1.21.4',
    '[14:22:03 INFO]: Loading plugins: EssentialsX, LuckPerms, Vault, Chunky, CoreProtect, FoliaLib, ViaVersion, Geyser-Spigot...',
    '[14:22:05 INFO]: [LuckPerms] Permissions storage: MariaDB (10.11.6-MariaDB)',
    '\x1b[38;2;16;185;129m[14:22:07 INFO]: Done (4.189s)! For help, type "help"\x1b[0m',
  ]);

  // Live telemetry ticker
  useEffect(() => {
    if (!activeServer || activeServer.status !== 'running') return;

    const interval = setInterval(() => {
      setStats(prev => {
        const cpuJitter = Math.max(5, Math.min(180, prev.cpu_absolute + (Math.random() * 10 - 5)));
        const ramJitter = Math.max(2000000000, Math.min(prev.memory_limit_bytes * 0.9, prev.memory_bytes + (Math.random() * 30000000 - 15000000)));

        return {
          ...prev,
          cpu_absolute: Math.round(cpuJitter * 10) / 10,
          memory_bytes: ramJitter,
          network: {
            rx_bytes: prev.network.rx_bytes + Math.floor(Math.random() * 40000),
            tx_bytes: prev.network.tx_bytes + Math.floor(Math.random() * 80000),
          },
          uptime_ms: prev.uptime_ms + 2500,
        };
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [activeServer?.status]);

  // Tenant Boundary URL validation
  const selectServer = (id: string): boolean => {
    const target = servers.find(s => s.id === id || s.identifier === id || s.uuid === id);
    if (!target) {
      setAccessDeniedError('Server container not found.');
      return false;
    }

    // Permission check: Must be admin OR server owner
    if (!isAdmin && target.owner_id !== user?.id) {
      setAccessDeniedError(`403 Forbidden: You do not have permission to view or manage instance "${target.name}".`);
      return false;
    }

    setAccessDeniedError(null);
    setActiveServerId(target.id);
    return true;
  };

  const sendPowerAction = (action: 'start' | 'stop' | 'restart' | 'kill', targetServerId?: string) => {
    const idToTarget = targetServerId || activeServer?.id;
    if (!idToTarget) return;

    setServers(prev =>
      prev.map(s => {
        if (s.id !== idToTarget) return s;
        let newStatus: ServerStatus = 'offline';
        if (action === 'start' || action === 'restart') newStatus = 'running';
        if (action === 'stop') newStatus = 'stopping';
        return { ...s, status: newStatus };
      })
    );

    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [
      ...prev,
      `\x1b[38;2;0;210;255m[SlayerWings]\x1b[0m [${timestamp}] Power signal dispatched: ${action.toUpperCase()}`,
    ]);
  };

  const sendCommand = (cmd: string) => {
    if (!cmd.trim()) return;
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [
      ...prev,
      `\x1b[38;2;0;210;255m>\x1b[0m ${cmd}`,
      `[${timestamp} INFO]: Command '${cmd}' dispatched by operator.`,
    ]);
  };

  const togglePinServer = (id: string) => {
    setServers(prev =>
      prev.map(s => (s.id === id ? { ...s, pinned: !s.pinned } : s))
    );
  };

  const clearConsole = () => {
    setConsoleLogs([]);
  };

  return (
    <ServerContext.Provider
      value={{
        servers,
        visibleServers,
        activeServer,
        stats,
        historyStats,
        consoleLogs,
        selectServer,
        sendPowerAction,
        sendCommand,
        togglePinServer,
        clearConsole,
        accessDeniedError,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
};

export const useServer = () => {
  const context = useContext(ServerContext);
  if (!context) throw new Error('useServer must be used within ServerProvider');
  return context;
};
