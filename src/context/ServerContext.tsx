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
  refreshServers: () => Promise<void>;
  accessDeniedError: string | null;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export const ServerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [servers, setServers] = useState<Server[]>(INITIAL_SERVERS);
  const [activeServerId, setActiveServerId] = useState<string>('');
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);

  const fetchServers = async () => {
    try {
      const res = await fetch('/api/client/servers');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data)) {
          const mapped = data.data.map((d: any) => d.attributes || d);
          setServers(mapped);
          if (mapped.length > 0) {
            setActiveServerId(prev => (prev && mapped.some((m: any) => m.id === prev || m.uuid === prev) ? prev : (mapped[0].id || mapped[0].uuid)));
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchServers();
  }, []);

  // Tenant Boundary Isolation: Non-admin users ONLY see servers they own!
  const visibleServers = servers.filter(s => {
    if (isAdmin) return true;
    return s.owner_id === user?.id;
  });

  const activeServer = visibleServers.find(s =>
    (activeServerId && (s.uuid === activeServerId || String(s.id) === String(activeServerId) || s.identifier === activeServerId))
  ) || visibleServers[0] || null;

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

  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const wsRef = React.useRef<WebSocket | null>(null);

  // Connect to real Wings Daemon WebSocket on port 8443 or panel websocket bridge
  useEffect(() => {
    if (!activeServer) return;

    // Immediately flush previous logs on server switch
    setConsoleLogs([]);

    let isSubscribed = true;
    let reconnectTimeout: any = null;
    let socket: WebSocket | null = null;

    // 1. Fetch persistent log buffer from daemon
    fetch(`/api/client/servers/${activeServer.uuid || activeServer.id}/logs`)
      .then(res => res.json())
      .then(data => {
        if (!isSubscribed) return;
        if (data && Array.isArray(data.data) && data.data.length > 0) {
          const lines = data.data.map((l: string) => (typeof l === 'string' && l.endsWith('\n') ? l.slice(0, -1) : String(l)));
          setConsoleLogs(lines);
        } else {
          setConsoleLogs([]);
        }
      })
      .catch(() => {});

    // 2. Establish live WebSocket connection with auto-reconnect
    const connectWs = () => {
      if (!isSubscribed) return;

      const isSecure = window.location.protocol === 'https:';
      const wsProto = isSecure ? 'wss:' : 'ws:';
      const host = window.location.hostname || 'localhost';

      let wsUrl: string;
      if (window.location.port === '3000' || window.location.port === '3001') {
        wsUrl = `${wsProto}//${host}:8443`;
      } else {
        const portPart = window.location.port ? `:${window.location.port}` : '';
        wsUrl = `${wsProto}//${host}${portPart}/api/client/servers/${activeServer.uuid || activeServer.id}/ws`;
      }

      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          console.log('[SlayerWings] Live telemetry and stdin bridge connected');
          socket?.send(JSON.stringify({
            event: 'auth',
            args: [`jwt_slayernode_${Date.now()}`],
            server: activeServer.uuid || activeServer.id,
          }));
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'console_output') {
              const target = msg.server;
              const matches = !target || target === 'all' ||
                target === activeServer.uuid ||
                target === activeServer.id ||
                (activeServer.uuid && target.startsWith(activeServer.uuid.slice(0, 8))) ||
                (activeServer.identifier && target.startsWith(activeServer.identifier));

              if (matches) {
                const line = msg.line || msg.data || msg.args?.[0] || '';
                const cleanStr = typeof line === 'string' ? line : String(line);
                const splitLines = cleanStr.split(/\r?\n/).filter(Boolean);
                if (splitLines.length > 0) {
                  setConsoleLogs(prev => [...prev.slice(-300 + splitLines.length), ...splitLines]);
                }
              }
            } else if (msg.event === 'stats' && msg.data) {
              setStats(prev => ({
                ...prev,
                cpu_absolute: msg.data.cpu_absolute ?? prev.cpu_absolute,
                memory_bytes: msg.data.memory_bytes ?? prev.memory_bytes,
                memory_limit_bytes: msg.data.memory_limit_bytes ?? prev.memory_limit_bytes,
                network: msg.data.network ?? prev.network,
                state: msg.data.state || (activeServer.status as any),
              }));

              const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              setHistoryStats(prev => [
                ...prev.slice(-20),
                {
                  time: timeStr,
                  cpu: msg.data.cpu_absolute || 0,
                  ram: Math.round((msg.data.memory_bytes || 0) / 1024 / 1024),
                  disk: 17.1,
                  netRx: Math.round(((msg.data.network?.rx_bytes || 0) % 1000000) / 1024),
                  netTx: Math.round(((msg.data.network?.tx_bytes || 0) % 1000000) / 1024),
                }
              ]);
            }
          } catch {}
        };

        socket.onclose = () => {
          if (isSubscribed) {
            reconnectTimeout = setTimeout(connectWs, 1500);
          }
        };

        socket.onerror = () => {
          try { socket?.close(); } catch {}
        };
      } catch (err) {
        if (isSubscribed) {
          reconnectTimeout = setTimeout(connectWs, 2000);
        }
      }
    };

    connectWs();

    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        try { socket.close(); } catch {}
      }
      wsRef.current = null;
    };
  }, [activeServer?.uuid, activeServer?.id]);

  // Tenant Boundary URL validation
  const selectServer = (id: string): boolean => {
    const target = servers.find(s => String(s.id) === String(id) || s.identifier === id || s.uuid === id);
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
    setActiveServerId(target.uuid || target.id);
    return true;
  };

  const sendPowerAction = (action: 'start' | 'stop' | 'restart' | 'kill', targetServerId?: string) => {
    const target = servers.find(s => s.id === targetServerId || s.uuid === targetServerId) || activeServer;
    if (!target) return;

    setServers(prev =>
      prev.map(s => {
        if (s.id !== target.id && s.uuid !== target.uuid) return s;
        let newStatus: ServerStatus = 'offline';
        if (action === 'start' || action === 'restart') newStatus = 'running';
        if (action === 'stop') newStatus = 'stopping';
        return { ...s, status: newStatus };
      })
    );

    // Call REST endpoint
    fetch(`/api/client/servers/${target.uuid || target.id}/power`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signal: action }),
    }).catch(() => {});

    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [
      ...prev,
      `\x1b[38;2;0;210;255m[SlayerWings]\x1b[0m [${timestamp}] Power signal dispatched: ${action.toUpperCase()}`,
    ]);
  };

  const sendCommand = (cmd: string) => {
    if (!cmd.trim() || !activeServer) return;

    // Echo operator command in console immediately (0ms user feedback)
    setConsoleLogs(prev => [
      ...prev,
      `> ${cmd}`,
    ]);

    // Send via live WebSocket to daemon process stdin
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: 'send command',
        args: [cmd],
        command: cmd,
        server: activeServer.uuid || activeServer.id,
      }));
    } else {
      // Send via REST endpoint as fallback only when WebSocket is disconnected
      fetch(`/api/client/servers/${activeServer.uuid || activeServer.id}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      }).catch(() => {});
    }
  };

  const togglePinServer = (id: string) => {
    setServers(prev =>
      prev.map(s => (s.id === id || s.uuid === id ? { ...s, pinned: !s.pinned } : s))
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
        refreshServers: fetchServers,
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
