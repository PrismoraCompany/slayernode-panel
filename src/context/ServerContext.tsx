import React, { createContext, useContext, useState, useEffect } from 'react';
import { Server, ServerStats, ServerStatus } from '../types';
import { useAuth } from './AuthContext';

export const INITIAL_SERVERS: Server[] = [
  {
    id: '1',
    uuid: '8a9c4b12-9844-42f0-9b45-ec7db715e45a',
    identifier: '8a9c4b12',
    name: 'SlayerCraft Network — Survival SMP',
    description: 'High-performance Purpur 1.21.4 with Folia optimizations & anti-cheat',
    owner_id: 1,
    owner_username: 'admin',
    node: 'Node-01 (Frankfurt Epyc 9654)',
    node_id: 1,
    status: 'running',
    is_suspended: false,
    is_transferring: false,
    pinned: true,
    limits: {
      memory: 8192,
      swap: 2048,
      disk: 40960,
      io: 500,
      cpu: 400,
    },
    feature_limits: {
      databases: 3,
      allocations: 4,
      backups: 5,
      splitters: 2,
    },
    allocation: {
      id: 101,
      ip: '194.164.72.12',
      port: 25565,
      alias: 'play.slayercraft.net',
      is_default: true,
    },
    allocations: [
      { id: 101, ip: '194.164.72.12', port: 25565, alias: 'play.slayercraft.net', is_default: true },
      { id: 102, ip: '194.164.72.12', port: 8100, notes: 'BlueMap 3D Web Render', is_default: false },
      { id: 103, ip: '194.164.72.12', port: 24454, notes: 'Voice Chat UDP', is_default: false },
    ],
    egg_id: 1,
    egg_name: 'Purpur / Paper Minecraft',
    nest_id: 1,
    docker_image: 'ghcr.io/slayernode/yolks:java_21',
    startup: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}',
    variables: [
      { name: 'Server Jar File', description: 'The executable jar', env_variable: 'SERVER_JARFILE', default_value: 'server.jar', server_value: 'purpur-1.21.4.jar', is_editable: true, rules: 'required|string' },
      { name: 'Build Number', description: 'Purpur build version', env_variable: 'BUILD_NUMBER', default_value: 'latest', server_value: 'latest', is_editable: true, rules: 'required|string' },
    ],
    created_at: '2026-11-10T12:00:00Z',
    updated_at: '2026-11-23T14:00:00Z',
  },
  {
    id: '2',
    uuid: '3f7a82c9-6a31-41db-9011-85b1a03977dc',
    identifier: '3f7a82c9',
    name: 'Velocity Proxy — Core Gateway',
    description: 'BungeeCord / Velocity modern multi-threaded proxy gateway',
    owner_id: 1,
    owner_username: 'admin',
    node: 'Node-01 (Frankfurt Epyc 9654)',
    node_id: 1,
    status: 'running',
    is_suspended: false,
    is_transferring: false,
    pinned: true,
    limits: {
      memory: 2048,
      swap: 512,
      disk: 10240,
      io: 500,
      cpu: 150,
    },
    feature_limits: {
      databases: 1,
      allocations: 2,
      backups: 2,
    },
    allocation: {
      id: 104,
      ip: '194.164.72.12',
      port: 25577,
      alias: 'proxy.slayercraft.net',
      is_default: true,
    },
    allocations: [
      { id: 104, ip: '194.164.72.12', port: 25577, alias: 'proxy.slayercraft.net', is_default: true },
    ],
    egg_id: 2,
    egg_name: 'Velocity Proxy',
    nest_id: 1,
    docker_image: 'ghcr.io/slayernode/yolks:java_21',
    startup: 'java -Xms512M -Xmx{{SERVER_MEMORY}}M -XX:+UseG1GC -jar {{SERVER_JARFILE}}',
    variables: [
      { name: 'Server Jar File', description: 'Velocity Jar', env_variable: 'SERVER_JARFILE', default_value: 'velocity.jar', server_value: 'velocity.jar', is_editable: true, rules: 'required|string' },
    ],
    created_at: '2026-11-12T10:00:00Z',
    updated_at: '2026-11-23T14:00:00Z',
  },
  {
    id: '3',
    uuid: '992a71d8-4f81-494b-a9a3-5e87a2027b14',
    identifier: '992a71d8',
    name: 'Rust Experimental — 2x Vanilla',
    description: 'Wipe cycle: Bi-weekly on Thursdays, max 200 players',
    owner_id: 2, // Owned by user ID 2 (Alex Mercer)
    owner_username: 'alexm',
    node: 'Node-02 (Helsinki Ryzen 9)',
    node_id: 2,
    status: 'offline',
    is_suspended: false,
    is_transferring: false,
    pinned: false,
    limits: {
      memory: 16384,
      swap: 4096,
      disk: 61440,
      io: 500,
      cpu: 600,
    },
    feature_limits: {
      databases: 2,
      allocations: 3,
      backups: 3,
    },
    allocation: {
      id: 105,
      ip: '65.109.112.45',
      port: 28015,
      alias: 'rust.slayercraft.net',
      is_default: true,
    },
    allocations: [
      { id: 105, ip: '65.109.112.45', port: 28015, alias: 'rust.slayercraft.net', is_default: true },
    ],
    egg_id: 5,
    egg_name: 'Rust Dedicated',
    nest_id: 2,
    docker_image: 'ghcr.io/slayernode/games:rust',
    startup: './RustDedicated -batchmode +server.port {{SERVER_PORT}}',
    variables: [],
    created_at: '2026-11-15T08:00:00Z',
    updated_at: '2026-11-23T14:00:00Z',
  },
];

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
  const [activeServerId, setActiveServerId] = useState<string>('1');
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);

  // Tenant Boundary Isolation: Non-admin users ONLY see servers they own!
  const visibleServers = servers.filter(s => {
    if (isAdmin) return true;
    return s.owner_id === user?.id;
  });

  const activeServer = visibleServers.find(s => s.id === activeServerId) || visibleServers[0] || null;

  const [stats, setStats] = useState<ServerStats>({
    memory_bytes: 4428400000,
    memory_limit_bytes: 8589934592,
    cpu_absolute: 28.4,
    network: {
      rx_bytes: 148920000,
      tx_bytes: 289410000,
    },
    disk_bytes: 18450000000,
    uptime_ms: 382410000,
    state: 'running',
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
