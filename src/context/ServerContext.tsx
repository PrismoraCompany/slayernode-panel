import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Server, ServerStats } from '../types';
import { useAuth } from './AuthContext';
import { apiFetch, apiJson } from '../lib/api';

interface HistoryPoint {
  time: string;
  cpu: number;
  ram: number;
  disk: number;
  netRx: number;
  netTx: number;
}

export type WsConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface ServerContextType {
  servers: Server[];
  visibleServers: Server[];
  activeServer: Server | null;
  stats: ServerStats;
  serverStatsMap: Record<string, ServerStats>;
  historyStats: HistoryPoint[];
  consoleLogs: string[];
  wsStatus: WsConnectionStatus;
  selectServer: (id: string) => boolean;
  sendPowerAction: (action: 'start' | 'stop' | 'restart' | 'kill', targetServerId?: string) => Promise<{ ok: boolean; error?: string }>;
  sendCommand: (command: string) => Promise<void>;
  togglePinServer: (id: string) => void;
  clearConsole: () => void;
  refreshServers: () => Promise<Server[]>;
  accessDeniedError: string | null;
  clearAccessDeniedError: () => void;
}

function emptyStatsForServer(srv?: Server | null): ServerStats {
  const memMb = srv?.limits?.memory || 1024;
  return {
    memory_bytes: 0,
    memory_limit_bytes: memMb * 1024 * 1024,
    cpu_absolute: 0,
    network: { rx_bytes: 0, tx_bytes: 0 },
    disk_bytes: 0,
    uptime_ms: 0,
    state: srv?.status || 'offline',
  };
}

function findServerMatch(list: Server[], key: string): Server | null {
  if (!key) return null;
  return (
    list.find(s => String(s.uuid) === String(key)) ||
    list.find(s => String(s.identifier) === String(key)) ||
    list.find(s => String(s.id) === String(key)) ||
    null
  );
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export const ServerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>('');
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);
  const [stats, setStats] = useState<ServerStats>(() => emptyStatsForServer(null));
  const [serverStatsMap, setServerStatsMap] = useState<Record<string, ServerStats>>({});
  const [historyStats, setHistoryStats] = useState<HistoryPoint[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>('disconnected');
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('slayernode_pinned_servers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const wsRef = useRef<WebSocket | null>(null);
  const activeUuidRef = useRef<string>('');

  const fetchServers = useCallback(async (): Promise<Server[]> => {
    if (!isAuthenticated) {
      setServers([]);
      setServerStatsMap({});
      return [];
    }
    try {
      const data = await apiJson<{ data: Server[] }>('/api/client/servers');
      const list = Array.isArray(data?.data) ? data.data : [];
      const merged = list.map(s => ({
        ...s,
        pinned: pinnedIds.includes(String(s.uuid)) || pinnedIds.includes(String(s.id)),
      }));
      setServers(merged);

      // Update per-server live telemetry map strictly keyed by server UUID
      setServerStatsMap(prev => {
        const next: Record<string, ServerStats> = { ...prev };
        for (const srv of merged) {
          if (srv.telemetry) {
            next[srv.uuid] = {
              ...srv.telemetry,
              memory_limit_bytes: srv.telemetry.memory_limit_bytes || (srv.limits?.memory || 1024) * 1024 * 1024,
            };
          } else if (!next[srv.uuid]) {
            next[srv.uuid] = emptyStatsForServer(srv);
          } else {
            next[srv.uuid] = { ...next[srv.uuid], state: srv.status };
          }
        }
        return next;
      });
      return merged;
    } catch {
      return [];
    }
  }, [isAuthenticated, pinnedIds]);

  // Clear state when auth session changes and re-fetch servers for the signed-in user
  useEffect(() => {
    if (!isAuthenticated) {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
      setServers([]);
      setActiveServerId('');
      activeUuidRef.current = '';
      setConsoleLogs([]);
      setHistoryStats([]);
      setStats(emptyStatsForServer(null));
      setServerStatsMap({});
      setWsStatus('disconnected');
      return;
    }

    fetchServers();
    const poll = setInterval(() => {
      fetchServers();
    }, 4000);
    return () => clearInterval(poll);
  }, [isAuthenticated, user?.id, fetchServers]);

  const visibleServers = useMemo(() => servers, [servers]);

  // Strictly resolve activeServer without falling back to visibleServers[0]
  const activeServer = useMemo(() => {
    if (!activeServerId) return null;
    return findServerMatch(visibleServers, activeServerId);
  }, [visibleServers, activeServerId]);

  const selectServer = useCallback((id: string): boolean => {
    setAccessDeniedError(null);
    if (!id) {
      setActiveServerId('');
      activeUuidRef.current = '';
      return true;
    }
    const found = findServerMatch(servers, id);
    if (servers.length > 0 && !found) {
      // Allow deferred resolution right after creation by refreshing list once
      fetchServers().then(updated => {
        const refound = findServerMatch(updated, id);
        if (refound) {
          setActiveServerId(refound.uuid);
        } else {
          setAccessDeniedError(`Access denied or server "${id}" was not found inside your tenant scope.`);
        }
      });
      return false;
    }
    setActiveServerId(found ? found.uuid : id);
    return true;
  }, [servers, fetchServers]);

  // Strict per-server WebSocket & Telemetry lifecycle tied ONLY to activeServer.uuid
  useEffect(() => {
    const targetUuid = activeServer?.uuid || '';
    activeUuidRef.current = targetUuid;

    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    if (!targetUuid || !isAuthenticated) {
      setConsoleLogs([]);
      setHistoryStats([]);
      setStats(emptyStatsForServer(null));
      setWsStatus('disconnected');
      return;
    }

    // Immediately wipe previous server telemetry & console buffer to prevent cross-server bleed
    const initialStats = serverStatsMap[targetUuid] || emptyStatsForServer(activeServer);
    setStats(initialStats);
    setHistoryStats([]);
    setConsoleLogs([]);
    setWsStatus('connecting');

    let cancelled = false;
    let gotWsBacklog = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let statsPollTimer: ReturnType<typeof setInterval> | null = null;

    const recordStatPoint = (incoming: ServerStats) => {
      const memLimit = incoming.memory_limit_bytes || (activeServer?.limits?.memory || 1024) * 1024 * 1024;
      const ramPct = memLimit > 0 ? Math.min(100, Math.round((incoming.memory_bytes / memLimit) * 1000) / 10) : 0;
      const diskLimitBytes = (activeServer?.limits?.disk || 10240) * 1024 * 1024;
      const diskPct = diskLimitBytes > 0 ? Math.min(100, Math.round((incoming.disk_bytes / diskLimitBytes) * 1000) / 10) : 0;
      const nowLabel = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setStats({ ...incoming, memory_limit_bytes: memLimit });
      setServerStatsMap(prev => ({
        ...prev,
        [targetUuid]: { ...incoming, memory_limit_bytes: memLimit },
      }));
      setServers(prev =>
        prev.map(s => (s.uuid === targetUuid && s.status !== incoming.state ? { ...s, status: incoming.state } : s))
      );
      setHistoryStats(prev => [
        ...prev.slice(-29),
        {
          time: nowLabel,
          cpu: Math.round((incoming.cpu_absolute || 0) * 10) / 10,
          ram: ramPct,
          disk: diskPct,
          netRx: Math.round((incoming.network?.rx_bytes || 0) / 1024),
          netTx: Math.round((incoming.network?.tx_bytes || 0) / 1024),
        },
      ]);
    };

    // Load historical log backlog & live resources for THIS server only
    apiJson<{ logs: string[] }>(`/api/client/servers/${encodeURIComponent(targetUuid)}/logs`)
      .then(data => {
        if (!cancelled && !gotWsBacklog && activeUuidRef.current === targetUuid && Array.isArray(data?.logs)) {
          setConsoleLogs(data.logs.map(l => String(l)));
        }
      })
      .catch(() => {});

    apiJson<ServerStats>(`/api/client/servers/${encodeURIComponent(targetUuid)}/resources`)
      .then(data => {
        if (!cancelled && activeUuidRef.current === targetUuid && data) {
          recordStatPoint(data);
        }
      })
      .catch(() => {});

    // Backup HTTP resource polling every 3s for guaranteed chart & metric updates
    statsPollTimer = setInterval(() => {
      if (cancelled || activeUuidRef.current !== targetUuid) return;
      apiJson<ServerStats>(`/api/client/servers/${encodeURIComponent(targetUuid)}/resources`)
        .then(data => {
          if (!cancelled && activeUuidRef.current === targetUuid && data) {
            recordStatPoint(data);
          }
        })
        .catch(() => {});
    }, 3000);

    const openSocket = async () => {
      if (cancelled || activeUuidRef.current !== targetUuid) return;
      try {
        const wsMeta = await apiJson<{ data: { token: string; socket: string } }>(
          `/api/client/servers/${encodeURIComponent(targetUuid)}/websocket`
        );
        if (cancelled || activeUuidRef.current !== targetUuid) return;

        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProto}//${window.location.host}${wsMeta.data.socket}?token=${encodeURIComponent(wsMeta.data.token)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!cancelled && activeUuidRef.current === targetUuid) {
            setWsStatus('connected');
          }
        };

        ws.onmessage = evt => {
          if (cancelled || activeUuidRef.current !== targetUuid) return;
          try {
            const msg = JSON.parse(evt.data);
            // Strict server isolation barrier on client side
            if (msg.server && msg.server !== targetUuid) return;

            if (msg.event === 'console_backlog' && Array.isArray(msg.lines)) {
              if (msg.lines.length > 0) {
                gotWsBacklog = true;
                setConsoleLogs(msg.lines.map((l: any) => String(l)));
              }
            } else if (msg.event === 'console_output' || msg.event === 'console output') {
              gotWsBacklog = true;
              const text = msg.line ?? msg.args?.[0] ?? msg.data ?? '';
              if (text) {
                const lines = String(text).replace(/\n$/, '').split('\n');
                setConsoleLogs(prev => [...prev.slice(-399), ...lines]);
              }
            } else if (msg.event === 'stats' && msg.data) {
              recordStatPoint(msg.data);
            } else if (msg.event === 'status') {
              const newState = msg.args?.[0] || msg.data || 'offline';
              setStats(prev => ({ ...prev, state: newState }));
              setServers(prev => prev.map(s => (s.uuid === targetUuid ? { ...s, status: newState } : s)));
            }
          } catch {}
        };

        ws.onerror = () => {
          if (!cancelled) setWsStatus('disconnected');
        };

        ws.onclose = () => {
          if (!cancelled && activeUuidRef.current === targetUuid) {
            setWsStatus('disconnected');
            reconnectTimer = setTimeout(() => {
              if (!cancelled && activeUuidRef.current === targetUuid) {
                setWsStatus('connecting');
                openSocket();
              }
            }, 3000);
          }
        };
      } catch {
        if (!cancelled) setWsStatus('disconnected');
      }
    };

    openSocket();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (statsPollTimer) clearInterval(statsPollTimer);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
    };
  }, [activeServer?.uuid, isAuthenticated]);

  const sendPowerAction = async (
    action: 'start' | 'stop' | 'restart' | 'kill',
    targetServerId?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const target = targetServerId ? findServerMatch(servers, targetServerId) : activeServer;
    if (!target) return { ok: false, error: 'Target server not found.' };

    const optimisticStatus = action === 'start' || action === 'restart' ? 'starting' : 'stopping';
    setServers(prev => prev.map(s => (s.uuid === target.uuid ? { ...s, status: optimisticStatus } : s)));

    try {
      const res = await apiJson<{ status: Server['status'] }>(`/api/client/servers/${encodeURIComponent(target.uuid)}/power`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      const finalState = res?.status || (action === 'start' || action === 'restart' ? 'running' : 'offline');
      setServers(prev => prev.map(s => (s.uuid === target.uuid ? { ...s, status: finalState } : s)));
      if (activeServer?.uuid === target.uuid) {
        setStats(prev => ({ ...prev, state: finalState }));
      }
      return { ok: true };
    } catch (err: any) {
      await fetchServers();
      return { ok: false, error: err?.message || 'Power action failed.' };
    }
  };

  const sendCommand = async (command: string) => {
    if (!activeServer || !command.trim()) return;
    const clean = command.trim();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ event: 'send command', args: [clean], server: activeServer.uuid })
      );
      return;
    }
    try {
      await apiJson(`/api/client/servers/${encodeURIComponent(activeServer.uuid)}/command`, {
        method: 'POST',
        body: JSON.stringify({ command: clean }),
      });
    } catch (err: any) {
      setConsoleLogs(prev => [...prev, `[Error] Command dispatch failed: ${err?.message}`]);
    }
  };

  const togglePinServer = (id: string) => {
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      localStorage.setItem('slayernode_pinned_servers', JSON.stringify(next));
      return next;
    });
    setServers(prev => prev.map(s => (s.uuid === id || s.id === id ? { ...s, pinned: !s.pinned } : s)));
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
        serverStatsMap,
        historyStats,
        consoleLogs,
        wsStatus,
        selectServer,
        sendPowerAction,
        sendCommand,
        togglePinServer,
        clearConsole,
        refreshServers: fetchServers,
        accessDeniedError,
        clearAccessDeniedError: () => setAccessDeniedError(null),
      }}
    >
      {children}
    </ServerContext.Provider>
  );
};

export const useServers = () => {
  const ctx = useContext(ServerContext);
  if (!ctx) throw new Error('useServers must be used within ServerProvider');
  return ctx;
};

export const useServer = useServers;
