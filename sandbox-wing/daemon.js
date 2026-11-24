/**
 * SlayerWings Standalone Sandbox Daemon Engine (v1.0.0)
 * External VPS Daemon running on custom ports:
 *  - REST & WebSocket API: 8443
 *  - SFTP Container Server: 2202
 *
 * Fully compatible with SlayerNode Panel v1.0.0
 * Location: /etc/slayerwings/config.yml & /var/lib/slayerwings/volumes
 */

import http from 'http';
import net from 'net';
import { WebSocketServer, WebSocket } from 'ws';

const DAEMON_PORT = parseInt(process.env.SLAYERWINGS_PORT || '8443', 10);
const SFTP_PORT = parseInt(process.env.SLAYERWINGS_SFTP_PORT || '2202', 10);
const DAEMON_TOKEN = process.env.SLAYERWINGS_TOKEN || 'sn_sandbox_token_secret';

// State of virtual containers running on this sandbox wing
const serversState = {
  '8a9c4b12-9214-4112-aa11-881234567890': {
    name: 'SlayerCraft Survival',
    state: 'running',
    cpu: 18.4,
    memory: 2450, // MB
    disk: 14200, // MB
    uptime: 3600,
  },
  '9b124c33-1102-4981-bc22-998877665544': {
    name: 'SlayerProxy Velocity',
    state: 'running',
    cpu: 4.2,
    memory: 512,
    disk: 1024,
    uptime: 7200,
  },
};

// 1. HTTP REST Server on 8443
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://localhost:${DAEMON_PORT}`);
  const pathname = parsedUrl.pathname;

  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });

  req.on('end', () => {
    const jsonBody = body ? (() => { try { return JSON.parse(body); } catch { return {}; } })() : {};

    // 1. Health Probe / System Info
    if (pathname === '/api/system' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        object: 'system_information',
        version: 'v1.0.0-slayerwings',
        architecture: 'x86_64',
        os: 'linux',
        kernel: '6.12.1-slayerwings-rt',
        cpu_count: 32,
        total_memory: 262144, // 256 GB
        total_disk: 3840000, // 3.84 TB
        docker_version: '27.4.0',
        docker_network: 'slayernode_nw',
        data_directory: '/var/lib/slayerwings/volumes',
        sftp_port: SFTP_PORT,
      }));
      return;
    }

    // 2. List Servers on this Node
    if (pathname === '/api/servers' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        object: 'list',
        data: Object.entries(serversState).map(([uuid, s]) => ({
          uuid,
          name: s.name,
          state: s.state,
          telemetry: {
            cpu_percent: s.cpu,
            memory_bytes: s.memory * 1024 * 1024,
            disk_bytes: s.disk * 1024 * 1024,
            uptime_seconds: s.uptime,
          },
        })),
      }));
      return;
    }

    // 3. Server Power Actions
    const powerMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/power$/);
    if (powerMatch && req.method === 'POST') {
      const serverUuid = powerMatch[1];
      const action = jsonBody.action;

      if (!serversState[serverUuid]) {
        serversState[serverUuid] = { name: 'Virtual Instance', state: 'offline', cpu: 0, memory: 0, disk: 1024, uptime: 0 };
      }

      if (action === 'start') {
        serversState[serverUuid].state = 'running';
        serversState[serverUuid].cpu = Math.floor(Math.random() * 30) + 10;
        serversState[serverUuid].memory = 2048;
      } else if (action === 'stop' || action === 'kill') {
        serversState[serverUuid].state = 'offline';
        serversState[serverUuid].cpu = 0;
        serversState[serverUuid].memory = 0;
      } else if (action === 'restart') {
        serversState[serverUuid].state = 'running';
      }

      console.log(`[SlayerWings Sandbox] Server ${serverUuid} power state transitioned to: ${serversState[serverUuid].state} (Action: ${action})`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        server: serverUuid,
        action,
        current_state: serversState[serverUuid].state,
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    // 4. Stdin Commands
    const cmdMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/commands$/);
    if (cmdMatch && req.method === 'POST') {
      const serverUuid = cmdMatch[1];
      const commands = jsonBody.commands || [];
      console.log(`[SlayerWings Sandbox] Executing commands on ${serverUuid}:`, commands);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        executed: commands.length,
      }));
      return;
    }

    // 404 for unknown endpoints
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found on SlayerWings Daemon' }));
  });
});

// 2. WebSocket Telemetry & Console Bridge on port 8443
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log('[SlayerWings Sandbox] New WebSocket client connected to daemon telemetry bridge');

  ws.send(JSON.stringify({
    event: 'auth_success',
    daemon: 'SlayerWings Engine v1.0.0',
    protocol: 1,
  }));

  // Send periodic simulated telemetry stats
  const statsInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        event: 'stats',
        data: {
          memory_bytes: Math.floor(2048 * 1024 * 1024 + Math.random() * 50 * 1024 * 1024),
          memory_limit_bytes: 4096 * 1024 * 1024,
          cpu_absolute: Math.floor(15 + Math.random() * 20),
          network: {
            rx_bytes: 1420950 + Math.floor(Math.random() * 10000),
            tx_bytes: 894020 + Math.floor(Math.random() * 10000),
          },
          state: 'running',
        },
      }));
    }
  }, 2000);

  ws.on('message', msg => {
    try {
      const payload = JSON.parse(msg.toString());
      if (payload.event === 'send_command') {
        ws.send(JSON.stringify({
          event: 'console_output',
          line: `[SlayerWings Container] Executed: ${payload.args[0]}`,
        }));
      }
    } catch {}
  });

  ws.on('close', () => {
    clearInterval(statsInterval);
  });
});

// 3. Standalone SFTP Handshake Socket Server on Port 2202
const sftpServer = net.createServer(socket => {
  console.log('[SlayerWings Sandbox] SFTP probe client connected on port', SFTP_PORT);
  // Send SSH-2.0 banner compliant with SlayerWings SFTP
  socket.write('SSH-2.0-SlayerWings_SFTP_1.0.0\r\n');
  socket.on('data', data => {
    socket.end();
  });
});

server.listen(DAEMON_PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`SlayerWings Sandbox Daemon Engine v1.0.0 ACTIVE`);
  console.log(`REST & WebSocket API listening on: http://0.0.0.0:${DAEMON_PORT}`);
  console.log(`Volumes root directory: /var/lib/slayerwings/volumes`);
  console.log(`Config path: /etc/slayerwings/config.yml`);
  console.log(`====================================================`);
});

sftpServer.listen(SFTP_PORT, '0.0.0.0', () => {
  console.log(`SlayerWings SFTP Subsystem active on: 0.0.0.0:${SFTP_PORT}`);
});
