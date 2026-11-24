import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Persistent state store file
const DB_PATH = path.join(__dirname, 'storage_db.json');

const DEFAULT_DB = {
  theme: null,
  locations: [
    { id: 1, short: 'DE', long: 'Frankfurt, Germany (Equinix FR5)', nodes_count: 1, servers_count: 2 },
    { id: 2, short: 'FI', long: 'Helsinki, Finland (Hetzner FSN1)', nodes_count: 1, servers_count: 1 },
    { id: 3, short: 'IN', long: 'Mumbai, India (CtrlS DC2)', nodes_count: 0, servers_count: 0 },
    { id: 4, short: 'US', long: 'Ashburn, VA (Equinix DC21)', nodes_count: 0, servers_count: 0 },
  ],
  users: [
    {
      id: 1,
      uuid: 'c82736b4-21c8-4720-a6ff-84ad1f21136b',
      username: 'admin',
      email: 'admin@slayernode.xyz',
      name_first: 'System',
      name_last: 'Administrator',
      language: 'en',
      root_admin: true,
      two_factor_enabled: false,
      created_at: '2026-11-01T00:00:00Z',
    },
  ],
  nodes: [],
  allocations: [],
  nests: [
    {
      id: 1,
      uuid: 'nest-minecraft',
      author: 'engine@slayernode.xyz',
      name: 'Minecraft',
      description: 'Minecraft Java Edition & Bedrock server engines.',
      eggs_count: 2,
      servers_count: 2,
      created_at: '2026-11-01',
    },
    {
      id: 2,
      uuid: 'nest-steam',
      author: 'engine@slayernode.xyz',
      name: 'Steam Dedicated Games',
      description: 'Popular games using SteamCMD runtime such as Rust, ARK, CS2, Palworld.',
      eggs_count: 1,
      servers_count: 1,
      created_at: '2026-11-01',
    },
    {
      id: 3,
      uuid: 'nest-bots',
      author: 'engine@slayernode.xyz',
      name: 'Voice & Discord Bots',
      description: 'Node.js, Python, and Go generic application workers.',
      eggs_count: 2,
      servers_count: 0,
      created_at: '2026-11-01',
    },
  ],
  eggs: [
    {
      id: 1,
      uuid: 'egg-purpur-mc',
      nest_id: 1,
      nest_name: 'Minecraft',
      author: 'admin@slayernode.xyz',
      name: 'Purpur / Paper Minecraft',
      description: 'High performance fork with Folia/Aikar flags and JLine ANSI terminal support.',
      docker_images: {
        'Java 21 (Default)': 'ghcr.io/slayernode/yolks:java_21',
        'Java 17 (Legacy)': 'ghcr.io/slayernode/yolks:java_17',
      },
      startup: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}',
      config: {
        files: {
          'server.properties': { parser: 'properties', find: { 'server-ip': '0.0.0.0', 'server-port': '{{server.build.default.port}}' } },
        },
        startup: { done: ')! For help, type ' },
        stop: 'stop',
      },
      variables: [
        { name: 'Server Jar File', description: 'Executable jar', env_variable: 'SERVER_JARFILE', default_value: 'purpur.jar', server_value: 'purpur-1.21.4.jar', is_editable: true, rules: 'required|string' },
        { name: 'Build Number', description: 'Purpur build version', env_variable: 'BUILD_NUMBER', default_value: 'latest', server_value: 'latest', is_editable: true, rules: 'required|string' },
      ],
    },
    {
      id: 2,
      uuid: 'egg-velocity-proxy',
      nest_id: 1,
      nest_name: 'Minecraft',
      author: 'admin@slayernode.xyz',
      name: 'Velocity Proxy',
      description: 'Next-generation Minecraft proxy with high packet throughput and modern DDoS mitigations.',
      docker_images: {
        'Java 21': 'ghcr.io/slayernode/yolks:java_21',
      },
      startup: 'java -Xms512M -Xmx{{SERVER_MEMORY}}M -XX:+UseG1GC -jar {{SERVER_JARFILE}}',
      config: {
        files: {},
        startup: { done: 'Booting Velocity' },
        stop: 'end',
      },
      variables: [
        { name: 'Server Jar File', description: 'Velocity Jar', env_variable: 'SERVER_JARFILE', default_value: 'velocity.jar', server_value: 'velocity.jar', is_editable: true, rules: 'required|string' },
      ],
    },
    {
      id: 3,
      uuid: 'egg-rust-dedicated',
      nest_id: 2,
      nest_name: 'Steam Dedicated Games',
      author: 'admin@slayernode.xyz',
      name: 'Rust Dedicated',
      description: 'Facepunch Rust experimental survival multi-threaded server instance.',
      docker_images: {
        'Rust Yolks': 'ghcr.io/slayernode/games:rust',
      },
      startup: './RustDedicated -batchmode +server.port {{SERVER_PORT}} +server.level "Procedural Map" +server.seed {{MAP_SEED}} +server.worldsize {{WORLD_SIZE}} +server.maxplayers {{MAX_PLAYERS}}',
      config: {
        files: {},
        startup: { done: 'Server startup complete' },
        stop: 'quit',
      },
      variables: [
        { name: 'Map Seed', description: 'Procedural map seed', env_variable: 'MAP_SEED', default_value: '1337', server_value: '1337', is_editable: true, rules: 'numeric' },
        { name: 'World Size', description: 'World map size in meters', env_variable: 'WORLD_SIZE', default_value: '4000', server_value: '4000', is_editable: true, rules: 'numeric' },
        { name: 'Max Players', description: 'Player slots', env_variable: 'MAX_PLAYERS', default_value: '200', server_value: '200', is_editable: true, rules: 'numeric' },
      ],
    },
  ],
  servers: [],
  blueprint_extensions: [
    {
      id: 'slayernode-theme',
      name: 'SlayerNode Liquid Glass Theme',
      version: '1.0.0',
      author: 'SlayerNode (https://slayernode.xyz)',
      description: 'Official production-grade Apple Liquid Glass design framework with 3-color palette and translucent depth.',
      target: 'v1.0.0',
      icon: 'Palette',
      enabled: true,
      installed_at: '2026-11-20',
    },
    {
      id: 'nebula-studio',
      name: 'Nebula Theme & Customization Studio',
      version: '2.4.0',
      author: 'SlayerNode Systems',
      description: 'Full-control real-time visual appearance editor with live split-screen preview, physics sliders, and CSS injection.',
      target: 'v1.0.0',
      icon: 'Sliders',
      enabled: true,
      installed_at: '2026-11-21',
    },
    {
      id: 'player-manager',
      name: 'Live Player Manager & Avatars',
      version: '3.1.0',
      author: 'SlayerNode Addons',
      description: 'Real-time player monitoring, 2D/3D avatars, kick, ban, whitelist, and gamemode controls.',
      target: 'v1.0.0',
      icon: 'UserCheck',
      enabled: true,
      installed_at: '2026-11-22',
    },
    {
      id: 'modpack-installer',
      name: 'Modrinth & CurseForge Auto-Resolver',
      version: '2.0.0',
      author: 'SlayerNode Addons',
      description: 'One-click mod and plugin repository browser with automatic dependency resolution and loader filtering.',
      target: 'v1.0.0',
      icon: 'Package',
      enabled: true,
      installed_at: '2026-11-22',
    },
    {
      id: 'server-splitter',
      name: 'Dynamic Server Resource Splitter',
      version: '1.5.0',
      author: 'SlayerNode Addons',
      description: 'Allows allocating resource limits across multiple child server instances without modifying node quotas.',
      target: 'v1.0.0',
      icon: 'Split',
      enabled: true,
      installed_at: '2026-11-23',
    },
  ],
  subdomains: [],
};

function loadState() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      // Merge with defaults to ensure all models are present
      return {
        ...DEFAULT_DB,
        ...data,
        locations: data.locations || DEFAULT_DB.locations,
        nodes: data.nodes || DEFAULT_DB.nodes,
        allocations: data.allocations || DEFAULT_DB.allocations,
        nests: data.nests || DEFAULT_DB.nests,
        eggs: data.eggs || DEFAULT_DB.eggs,
        blueprint_extensions: data.blueprint_extensions || DEFAULT_DB.blueprint_extensions,
      };
    }
  } catch (e) {
    console.error('Failed reading storage_db.json:', e);
  }
  return DEFAULT_DB;
}

function saveState(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed writing storage_db.json:', e);
  }
}

let db = loadState();

// ==========================================
// Security & Sanitization Middlewares
// ==========================================

const SQLI_PATTERNS = [
  /(\b(union([\s\S]*?)select)\b)/i,
  /(\b(select|insert|update|delete|drop|alter|truncate)([\s\S]*?)from\b)/i,
  /(;|--|\/\*|\*\/|xp_)/i,
  /('[\s]*or[\s]*'1'[\s]*=[\s]*'1')/i,
  /("[\s]*or[\s]*"1"[\s]*=[\s]*"1")/i,
  /(\bexec(\s|\+)+(s|x)p\w+)/i,
];

function sanitizeString(val) {
  if (typeof val !== 'string') return val;
  for (const pattern of SQLI_PATTERNS) {
    if (pattern.test(val)) {
      console.warn(`[Security Guard] Suspicious SQL injection payload blocked: "${val.substring(0, 40)}"`);
      return val.replace(pattern, '[BLOCKED_INJECTION]');
    }
  }
  return val;
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeString(obj[key]);
    } else if (typeof obj[key] === 'object') {
      sanitizeObject(obj[key]);
    }
  }
  return obj;
}

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  next();
});

function getRequestUser(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const key = (db.client_api_keys || []).find(k => k.secret_token === token || k.token === token || k.identifier === token);
    if (key) {
      const user = db.users.find(u => u.id === key.user_id) || db.users[0];
      return user;
    }
    return null;
  }

  const userIdHeader = req.headers['x-user-id'];
  if (userIdHeader) {
    const found = db.users.find(u => String(u.id) === String(userIdHeader));
    if (found) return found;
  }
  return db.users[0]; // Default to admin for dev
}

function verifyServerOwnership(req, res, next) {
  const user = getRequestUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthenticated.' });
  }
  const serverId = req.params.uuid;

  const target = db.servers.find(
    s => s.uuid === serverId || s.identifier === serverId || String(s.id) === String(serverId)
  );

  if (!target) {
    return res.status(404).json({ error: 'Server instance not found' });
  }

  if (!user.root_admin && target.owner_id !== user.id) {
    console.warn(`[Tenant Boundary Breach Attempt] User ID ${user.id} attempted to access server ${serverId}`);
    return res.status(403).json({
      error: '403 Forbidden: You do not have permission to access or manage this server container.',
    });
  }

  req.targetServer = target;
  req.currentUser = user;
  next();
}

function requireRootAdmin(req, res, next) {
  const user = getRequestUser(req);
  if (!user.root_admin) {
    return res.status(403).json({
      error: '403 Forbidden: Administrator privileges required to access this endpoint.',
    });
  }
  req.currentUser = user;
  next();
}

// ==========================================
// 1. Application Nodes & Wings Engine API
// ==========================================

async function probeNode(n) {
  const t0 = Date.now();
  const scheme = n.scheme || 'http';
  const fqdn = n.fqdn || '127.0.0.1';
  const port = n.daemon_listen || 8443;
  const daemonUrl = `${scheme}://${fqdn}:${port}/api/system`;

  try {
    const probeRes = await fetch(daemonUrl, {
      signal: AbortSignal.timeout(1200)
    });
    if (probeRes.ok) {
      const sysInfo = await probeRes.json();
      const pingMs = Math.max(1, Date.now() - t0);
      return {
        ...n,
        is_online: true,
        ping_ms: pingMs,
        daemon_version: sysInfo.version || n.daemon_version || 'v1.0.0-slayerwings',
        docker_active: !!sysInfo.docker_active,
        docker_version: sysInfo.docker_version,
      };
    }
  } catch (err) {}

  return {
    ...n,
    is_online: false,
    ping_ms: null,
  };
}

app.get('/api/application/nodes', async (req, res) => {
  const probed = await Promise.all(db.nodes.map(n => probeNode(n)));
  res.json({
    object: 'list',
    data: probed.map(n => ({
      object: 'node',
      attributes: n,
    })),
  });
});

app.get('/api/application/nodes/:id', async (req, res) => {
  const node = db.nodes.find(n => String(n.id) === String(req.params.id));
  if (!node) return res.status(404).json({ error: 'Node not found' });
  const probed = await probeNode(node);
  res.json({ object: 'node', attributes: probed });
});

app.post('/api/application/nodes', requireRootAdmin, (req, res) => {
  const data = req.body;
  const newNode = {
    id: Date.now(),
    uuid: crypto.randomUUID(),
    name: data.name || 'New Wings Node',
    description: data.description || '',
    location_id: parseInt(data.location_id) || 1,
    location_name: data.location_name || 'Frankfurt, Germany',
    fqdn: data.fqdn || 'node.example.com',
    scheme: data.scheme || 'https',
    behind_proxy: !!data.behind_proxy,
    maintenance_mode: !!data.maintenance_mode,
    allow_auto_allocation: data.allow_auto_allocation !== false,
    memory: parseInt(data.memory) || 32768,
    memory_overallocate: parseInt(data.memory_overallocate) || 0,
    disk: parseInt(data.disk) || 512000,
    disk_overallocate: parseInt(data.disk_overallocate) || 0,
    upload_size: parseInt(data.upload_size) || 500,
    daemon_listen: parseInt(data.daemon_listen) || 8443,
    daemon_sftp: parseInt(data.daemon_sftp) || 2202,
    daemon_base: data.daemon_base || '/var/lib/slayerwings/volumes',
    servers_count: 0,
    allocations_count: 0,
    is_online: true,
    daemon_version: 'v1.0.0-slayerwings',
  };

  db.nodes.push(newNode);
  saveState(db);
  res.status(201).json({ object: 'node', attributes: newNode });
});

app.patch('/api/application/nodes/:id', requireRootAdmin, (req, res) => {
  const idx = db.nodes.findIndex(n => String(n.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Node not found' });

  db.nodes[idx] = {
    ...db.nodes[idx],
    ...req.body,
    id: db.nodes[idx].id, // Protected
    uuid: db.nodes[idx].uuid, // Protected
  };
  saveState(db);
  res.json({ object: 'node', attributes: db.nodes[idx] });
});

app.delete('/api/application/nodes/:id', requireRootAdmin, (req, res) => {
  const node = db.nodes.find(n => String(n.id) === String(req.params.id));
  if (!node) return res.status(404).json({ error: 'Node not found' });

  const activeServers = db.servers.filter(s => String(s.node_id) === String(req.params.id));
  if (activeServers.length > 0) {
    return res.status(400).json({ error: `Cannot delete node: It currently hosts ${activeServers.length} active servers.` });
  }

  db.nodes = db.nodes.filter(n => String(n.id) !== String(req.params.id));
  db.allocations = db.allocations.filter(a => String(a.node_id) !== String(req.params.id));
  saveState(db);
  res.status(204).send();
});

// Node Allocations (IP:Port)
app.get('/api/application/nodes/:id/allocations', (req, res) => {
  const allocations = db.allocations.filter(a => String(a.node_id) === String(req.params.id));
  res.json({
    object: 'list',
    data: allocations.map(a => ({
      object: 'allocation',
      attributes: a,
    })),
  });
});

app.post('/api/application/nodes/:id/allocations', requireRootAdmin, (req, res) => {
  const { ip, ports, alias } = req.body;
  if (!ip || !ports) {
    return res.status(400).json({ error: 'IP address and ports are required.' });
  }

  const portList = [];
  const rawPorts = String(ports).split(',').map(p => p.trim());
  for (const part of rawPorts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        for (let p = start; p <= Math.min(start + 50, end); p++) {
          portList.push(p);
        }
      }
    } else {
      const p = Number(part);
      if (!isNaN(p)) portList.push(p);
    }
  }

  const created = [];
  for (const port of portList) {
    // Avoid exact duplicate on same node
    const exists = db.allocations.some(a => String(a.node_id) === String(req.params.id) && a.ip === ip && a.port === port);
    if (!exists) {
      const newAlloc = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        node_id: parseInt(req.params.id),
        ip,
        port,
        alias: alias || '',
        server_id: null,
        is_default: false,
      };
      db.allocations.push(newAlloc);
      created.push(newAlloc);
    }
  }

  // Update node allocations count
  const node = db.nodes.find(n => String(n.id) === String(req.params.id));
  if (node) {
    node.allocations_count = db.allocations.filter(a => String(a.node_id) === String(req.params.id)).length;
  }

  saveState(db);
  res.status(201).json({ object: 'list', data: created.map(a => ({ object: 'allocation', attributes: a })) });
});

app.delete('/api/application/nodes/:id/allocations/:allocId', requireRootAdmin, (req, res) => {
  const alloc = db.allocations.find(a => String(a.id) === String(req.params.allocId));
  if (!alloc) return res.status(404).json({ error: 'Allocation not found.' });

  if (alloc.server_id) {
    return res.status(400).json({ error: 'Cannot delete an allocation assigned to an active server container.' });
  }

  db.allocations = db.allocations.filter(a => String(a.id) !== String(req.params.allocId));
  const node = db.nodes.find(n => String(n.id) === String(req.params.id));
  if (node) {
    node.allocations_count = db.allocations.filter(a => String(a.node_id) === String(req.params.id)).length;
  }
  saveState(db);
  res.status(204).send();
});

// ==========================================
// 2. Application Users API & Main Admin Protection
// ==========================================

app.get('/api/application/users', requireRootAdmin, (req, res) => {
  res.json({
    object: 'list',
    data: db.users.map(u => ({
      object: 'user',
      attributes: u,
    })),
  });
});

app.post('/api/application/users', requireRootAdmin, (req, res) => {
  const { username, email, name_first, name_last, root_admin, password } = req.body;
  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email are required.' });
  }

  const existing = db.users.find(u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'A user with this username or email already exists.' });
  }

  const newUser = {
    id: Date.now(),
    uuid: crypto.randomUUID(),
    username: username.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    name_first: name_first || 'User',
    name_last: name_last || '',
    language: 'en',
    root_admin: !!root_admin,
    two_factor_enabled: false,
    created_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveState(db);
  res.status(201).json({ object: 'user', attributes: newUser });
});

app.patch('/api/application/users/:id', requireRootAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const idx = db.users.findIndex(u => u.id === userId);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });

  // STRICT SECURITY CHECK: Protect Main Admin Account ID 1
  if (userId === 1) {
    // Cannot remove root_admin status
    if (req.body.root_admin === false) {
      return res.status(403).json({ error: 'Security Violation: Cannot revoke root administrator privileges from the primary admin account.' });
    }
  }

  db.users[idx] = {
    ...db.users[idx],
    ...req.body,
    id: db.users[idx].id, // Protected
    uuid: db.users[idx].uuid, // Protected
    root_admin: userId === 1 ? true : (req.body.root_admin !== undefined ? req.body.root_admin : db.users[idx].root_admin),
  };

  saveState(db);
  res.json({ object: 'user', attributes: db.users[idx] });
});

app.delete('/api/application/users/:id', requireRootAdmin, (req, res) => {
  const userId = parseInt(req.params.id);

  // STRICT SECURITY CHECK: Prevent Deletion of Primary Admin ID 1
  if (userId === 1) {
    return res.status(403).json({
      error: 'Security Violation: The primary system administrator account (ID 1) is permanent and cannot be deleted.',
    });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const userServers = db.servers.filter(s => s.owner_id === userId);
  if (userServers.length > 0) {
    return res.status(400).json({ error: `Cannot delete user: They own ${userServers.length} active server instances.` });
  }

  db.users = db.users.filter(u => u.id !== userId);
  saveState(db);
  res.status(204).send();
});

// ==========================================
// 3. Application Servers API (Create & Host Servers)
// ==========================================

app.get('/api/application/servers', requireRootAdmin, (req, res) => {
  res.json({
    object: 'list',
    data: db.servers.map(s => ({
      object: 'server',
      attributes: s,
    })),
  });
});

app.post('/api/application/servers', requireRootAdmin, (req, res) => {
  const {
    name,
    description,
    owner_id,
    node_id,
    allocation_id,
    egg_id,
    nest_id,
    memory = 2048,
    swap = 512,
    disk = 10240,
    cpu = 100,
    io = 500,
  } = req.body;

  if (!name || !owner_id || !node_id) {
    return res.status(400).json({ error: 'Server name, owner, and node are required.' });
  }

  const node = db.nodes.find(n => String(n.id) === String(node_id));
  if (!node) return res.status(400).json({ error: 'Target node does not exist.' });

  const owner = db.users.find(u => String(u.id) === String(owner_id));
  if (!owner) return res.status(400).json({ error: 'Specified owner does not exist.' });

  // Find or pick allocation
  let alloc = db.allocations.find(a => String(a.id) === String(allocation_id));
  if (!alloc) {
    alloc = db.allocations.find(a => String(a.node_id) === String(node_id) && !a.server_id);
  }
  if (!alloc) {
    // Auto-create an allocation on this node
    alloc = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      node_id: node.id,
      ip: node.fqdn,
      port: 25565 + db.servers.length,
      alias: '',
      server_id: null,
      is_default: true,
    };
    db.allocations.push(alloc);
  }

  const serverId = String(db.servers.length + 1);
  const uuid = crypto.randomUUID();
  const identifier = uuid.slice(0, 8);

  const startOnDeploy = !!req.body.start_on_deploy;

  const newServer = {
    id: serverId,
    uuid,
    identifier,
    name: name.trim(),
    description: description || 'Hosted on SlayerNode Infrastructure',
    owner_id: owner.id,
    owner_username: owner.username,
    node: node.name,
    node_id: node.id,
    status: startOnDeploy ? 'running' : 'offline',
    is_suspended: false,
    is_transferring: false,
    pinned: false,
    limits: {
      memory: parseInt(memory) || 2048,
      swap: parseInt(swap) || 512,
      disk: parseInt(disk) || 10240,
      io: parseInt(io) || 500,
      cpu: parseInt(cpu) || 100,
    },
    allocation: {
      id: alloc.id,
      ip: alloc.ip,
      port: alloc.port,
      alias: alloc.alias || `${identifier}.${node.fqdn}`,
      is_default: true,
    },
    egg_id: egg_id || 1,
    nest_id: nest_id || 1,
    created_at: new Date().toISOString(),
  };

  alloc.server_id = parseInt(serverId);
  db.servers.push(newServer);
  node.servers_count = db.servers.filter(s => s.node_id === node.id).length;

  saveState(db);
  console.log(`[Wings Server Provisioned] Container ${newServer.name} (${newServer.uuid}) created on node ${node.name}`);

  // Forward volume creation and auto-boot to daemon on node host
  try {
    const daemonUrl = `${node.scheme || 'http'}://${node.fqdn || '127.0.0.1'}:${node.daemon_listen || 8443}/api/servers`;
    fetch(daemonUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uuid: newServer.uuid,
        name: newServer.name,
        memory: newServer.limits.memory,
        disk: newServer.limits.disk,
      })
    }).then(async () => {
      if (startOnDeploy) {
        await fetch(`${daemonUrl}/${newServer.uuid}/power`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' })
        }).catch(() => {});
      }
    }).catch(err => {
      console.log(`[Wings Daemon Provision Notice] Daemon sync notification:`, err.message);
    });
  } catch (err) {}

  res.status(201).json({ object: 'server', attributes: newServer });
});

app.delete('/api/application/servers/:id', requireRootAdmin, (req, res) => {
  const server = db.servers.find(s => String(s.id) === String(req.params.id) || s.uuid === req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  // Free allocations
  db.allocations.forEach(a => {
    if (String(a.server_id) === String(server.id)) {
      a.server_id = null;
    }
  });

  db.servers = db.servers.filter(s => s.id !== server.id);
  const node = db.nodes.find(n => n.id === server.node_id) || db.nodes[0];
  if (node) {
    node.servers_count = db.servers.filter(s => s.node_id === node.id).length;
    // Tell daemon to remove container volume and kill process
    try {
      const daemonUrl = `${node.scheme || 'http'}://${node.fqdn || '127.0.0.1'}:${node.daemon_listen || 8443}/api/servers/${server.uuid}`;
      fetch(daemonUrl, { method: 'DELETE' }).catch(() => {});
    } catch {}
  }

  saveState(db);
  res.status(204).send();
});

// ==========================================
// 4. Blueprint Framework & Extensions API
// ==========================================

app.get('/api/blueprint/extensions', (req, res) => {
  res.json({
    success: true,
    framework: 'Blueprint v2.4.0',
    extensions: db.blueprint_extensions,
  });
});

app.post('/api/blueprint/extensions/toggle', requireRootAdmin, (req, res) => {
  const { id, enabled } = req.body;
  const ext = db.blueprint_extensions.find(e => e.id === id);
  if (!ext) return res.status(404).json({ error: 'Blueprint extension not found.' });

  ext.enabled = !!enabled;
  saveState(db);
  res.json({ success: true, extension: ext });
});

app.post('/api/blueprint/upload', requireRootAdmin, (req, res) => {
  const { filename, manifest } = req.body;
  if (!manifest || !manifest.id || !manifest.name) {
    return res.status(400).json({ error: 'Invalid Blueprint extension manifest.' });
  }

  const existingIdx = db.blueprint_extensions.findIndex(e => e.id === manifest.id);
  const newExtension = {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version || '1.0.0',
    author: manifest.author || 'Custom Blueprint Author',
    description: manifest.description || 'Custom Blueprint extension for SlayerNode.',
    target: manifest.target || 'v1.0.0',
    icon: manifest.icon || 'Package',
    enabled: true,
    installed_at: new Date().toISOString().split('T')[0],
  };

  if (existingIdx !== -1) {
    db.blueprint_extensions[existingIdx] = newExtension;
  } else {
    db.blueprint_extensions.push(newExtension);
  }

  saveState(db);
  console.log(`[Blueprint Framework] Extension ${newExtension.name} (${newExtension.id}) installed.`);
  res.status(201).json({ success: true, extension: newExtension });
});

// ==========================================
// 5. SlayerNode Nests & Eggs API
// ==========================================

app.get('/api/application/nests', (req, res) => {
  res.json({
    object: 'list',
    data: db.nests.map(n => ({
      object: 'nest',
      attributes: n,
    })),
  });
});

app.get('/api/application/nests/:id/eggs', (req, res) => {
  const eggs = db.eggs.filter(e => String(e.nest_id) === String(req.params.id));
  res.json({
    object: 'list',
    data: eggs.map(e => ({
      object: 'egg',
      attributes: e,
    })),
  });
});

// ==========================================
// 6. Real Outbound SMTP Testing Engine
// ==========================================

app.post('/api/admin/mail/test', async (req, res) => {
  const {
    host,
    port = 587,
    encryption = 'tls',
    username,
    password,
    from = 'noreply@slayernode.xyz',
    to,
  } = req.body;

  if (!host) {
    return res.status(400).json({ success: false, error: 'SMTP host is required.' });
  }

  const numericPort = parseInt(port, 10);
  const isSecure = encryption === 'ssl' || numericPort === 465;

  const transportConfig = {
    host,
    port: numericPort,
    secure: isSecure,
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 8000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  };

  if (username && password) {
    transportConfig.auth = { user: username, pass: password };
  }

  const startTime = Date.now();

  try {
    const transporter = nodemailer.createTransport(transportConfig);
    console.log(`[SMTP Test] Connecting to ${host}:${numericPort} (secure: ${isSecure})...`);
    await transporter.verify();
    const handshakeTime = Date.now() - startTime;
    console.log(`[SMTP Test] Handshake successful in ${handshakeTime}ms!`);

    let sentInfo = null;
    if (to) {
      console.log(`[SMTP Test] Dispatching test email to ${to}...`);
      sentInfo = await transporter.sendMail({
        from: `"SlayerNode Panel" <${from}>`,
        to,
        subject: 'SlayerNode Panel v1.0.0 — SMTP Connection Verified',
        text: `Your SlayerNode SMTP mail daemon is configured correctly.\nServer: ${host}:${numericPort}\nLatency: ${handshakeTime}ms\nTimestamp: ${new Date().toISOString()}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #090D16; color: #FFFFFF; border: 1px solid rgba(0, 210, 255, 0.3); border-radius: 16px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 16px;">
              <h2 style="color: #00D2FF; margin: 0; font-size: 20px;">SlayerNode Panel v1.0.0</h2>
            </div>
            <h3 style="color: #10B981; margin-top: 0;">SMTP Mail Gateway Successfully Connected</h3>
            <p style="color: #94A3B8; font-size: 14px; line-height: 1.6;">
              This email confirms that the outbound mail transport configuration on your SlayerNode Panel instance is active and authenticated.
            </p>
            <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 16px; font-family: monospace; font-size: 12px; color: #E2E8F0; margin: 20px 0;">
              <div><strong>Host:</strong> ${host}</div>
              <div><strong>Port:</strong> ${numericPort}</div>
              <div><strong>Security:</strong> ${encryption.toUpperCase()}</div>
              <div><strong>Response Latency:</strong> ${handshakeTime}ms</div>
              <div><strong>Delivered At:</strong> ${new Date().toUTCString()}</div>
            </div>
            <p style="color: #64748B; font-size: 11px; margin-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 12px;">
              &copy; 2026 SlayerNode. All rights reserved. <a href="https://slayernode.xyz" style="color: #00D2FF;">https://slayernode.xyz</a>
            </p>
          </div>
        `,
      });
    }

    return res.json({
      success: true,
      message: to
        ? `SMTP verified & test email dispatched successfully to ${to} (${handshakeTime}ms)`
        : `SMTP server reachable and handshake verified (${handshakeTime}ms)`,
      latency_ms: handshakeTime,
      response: sentInfo?.response || '250 2.0.0 OK Handshake Completed',
      message_id: sentInfo?.messageId || null,
    });
  } catch (err) {
    console.error('[SMTP Test Failed]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'SMTP Handshake or Authentication Failed',
      code: err.code || 'ESMTPERROR',
      command: err.command || 'EHLO',
      details: `Failed communicating with ${host}:${numericPort}. Verify firewall rules, port openness, and credentials.`,
    });
  }
});

// ==========================================
// 7. Client Servers & Wings Daemon Signal API
// ==========================================

app.get(['/api/client', '/api/client/servers'], (req, res) => {
  const user = getRequestUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthenticated.' });
  const filtered = user.root_admin
    ? db.servers
    : db.servers.filter(s => s.owner_id === user.id);

  res.json({
    object: 'list',
    data: filtered.map(s => ({
      object: 'server',
      attributes: {
        server_owner: s.owner_id === user.id,
        identifier: s.identifier,
        uuid: s.uuid,
        name: s.name,
        node: s.node,
        status: s.status,
        is_suspended: s.is_suspended,
        limits: s.limits,
        allocation: s.allocation,
      },
    })),
  });
});

// ==========================================
// 8. Client Account & Personal Preferences API
// ==========================================

app.get('/api/client/account', (req, res) => {
  const user = getRequestUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthenticated.' });
  res.json({
    object: 'user',
    attributes: user,
  });
});

app.put('/api/client/account/email', (req, res) => {
  const user = getRequestUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthenticated.' });
  const { email } = req.body;
  if (!email || !email.includes('@') || !email.includes('.')) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  user.email = email.trim().toLowerCase();
  saveState(db);
  res.json({ object: 'user', attributes: user });
});

app.put('/api/client/account/password', (req, res) => {
  const user = getRequestUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthenticated.' });
  const { new_password, new_password_confirmation } = req.body;
  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters in length.' });
  }
  if (new_password_confirmation && new_password !== new_password_confirmation) {
    return res.status(400).json({ error: 'Password confirmation does not match.' });
  }
  saveState(db);
  res.status(204).send();
});

app.get('/api/client/account/api-keys', (req, res) => {
  const user = getRequestUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthenticated.' });
  const keys = (db.client_api_keys || []).filter(k => k.user_id === user.id);
  res.json({
    object: 'list',
    data: keys.map(k => ({
      object: 'api_key',
      attributes: {
        identifier: k.identifier,
        description: k.description,
        allowed_ips: k.allowed_ips || [],
        created_at: k.created_at,
        last_used_at: k.last_used_at || null,
      },
    })),
  });
});

app.post('/api/client/account/api-keys', (req, res) => {
  const user = getRequestUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthenticated.' });
  const rawDesc = String(req.body.description || '').replace(/(UNION|SELECT|--|;|'|"|<|>)/gi, '').trim();
  const description = rawDesc || 'API Key';
  const allowed_ips = req.body.allowed_ips ? (Array.isArray(req.body.allowed_ips) ? req.body.allowed_ips : [req.body.allowed_ips]) : [];

  const identifier = 'ptlc_' + crypto.randomBytes(8).toString('hex');
  const secret_token = 'ptlc_' + crypto.randomBytes(24).toString('hex');

  const newKey = {
    id: Date.now(),
    user_id: user.id,
    identifier,
    secret_token,
    description,
    allowed_ips,
    created_at: new Date().toISOString(),
  };

  db.client_api_keys = db.client_api_keys || [];
  db.client_api_keys.push(newKey);
  saveState(db);

  res.status(201).json({
    object: 'api_key',
    attributes: {
      identifier: newKey.identifier,
      description: newKey.description,
      allowed_ips: newKey.allowed_ips,
      created_at: newKey.created_at,
    },
    meta: {
      secret_token,
    },
  });
});

app.delete('/api/client/account/api-keys/:identifier', (req, res) => {
  const user = getRequestUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthenticated.' });
  const id = req.params.identifier;
  db.client_api_keys = (db.client_api_keys || []).filter(k => k.identifier !== id);
  saveState(db);
  res.status(204).send();
});

app.get('/api/client/account/ssh-keys', (req, res) => {
  const user = getRequestUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthenticated.' });
  const keys = (db.ssh_keys || []).filter(k => k.user_id === user.id);
  res.json({
    object: 'list',
    data: keys.map(k => ({
      object: 'ssh_key',
      attributes: k,
    })),
  });
});

app.post('/api/client/account/ssh-keys', (req, res) => {
  const user = getRequestUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthenticated.' });
  const { name, public_key } = req.body;
  if (!public_key || !public_key.trim().match(/^(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521)\s+[A-Za-z0-9+/=]+/)) {
    return res.status(400).json({ error: 'Invalid SSH key format. Must be a valid public key starting with ssh-rsa, ssh-ed25519, etc.' });
  }

  const cleanKey = public_key.trim();
  const fingerprint = crypto.createHash('sha256').update(cleanKey).digest('base64').replace(/=+$/, '');
  const newSsh = {
    id: Date.now(),
    user_id: user.id,
    name: name?.trim() || 'SSH Key',
    fingerprint,
    public_key: cleanKey,
    created_at: new Date().toISOString(),
  };

  db.ssh_keys = db.ssh_keys || [];
  db.ssh_keys.push(newSsh);
  saveState(db);

  res.status(201).json({
    object: 'ssh_key',
    attributes: newSsh,
  });
});

app.delete('/api/client/account/ssh-keys/:fingerprint', (req, res) => {
  const user = getRequestUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthenticated.' });
  const fp = req.params.fingerprint;
  db.ssh_keys = (db.ssh_keys || []).filter(k => k.fingerprint !== fp);
  saveState(db);
  res.status(204).send();
});

app.get('/api/client/account/activity', (req, res) => {
  const user = getRequestUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthenticated.' });
  res.json({
    object: 'list',
    data: (db.activity_logs || []).map(a => ({
      object: 'activity_log',
      attributes: a,
    })),
  });
});

app.get('/api/client/regions', (req, res) => {
  res.json({
    object: 'list',
    data: (db.locations || []).map(l => ({
      object: 'location',
      attributes: l,
    })),
  });
});

app.get('/api/client/servers/:uuid', verifyServerOwnership, (req, res) => {
  res.json({
    object: 'server',
    attributes: req.targetServer,
  });
});

app.post('/api/client/servers/:uuid/power', verifyServerOwnership, (req, res) => {
  const { signal } = req.body;
  console.log(`[Wings Daemon Power Signal] ${req.targetServer.name} (${req.params.uuid}) -> ${signal}`);
  if (signal === 'start' || signal === 'restart') {
    req.targetServer.status = 'running';
  } else if (signal === 'stop' || signal === 'kill') {
    req.targetServer.status = 'offline';
  }
  saveState(db);

  // Forward signal to node daemon
  try {
    const node = db.nodes.find(n => n.id === req.targetServer.node_id) || db.nodes[0];
    if (node) {
      const daemonPowerUrl = `${node.scheme || 'http'}://${node.fqdn || '127.0.0.1'}:${node.daemon_listen || 8443}/api/servers/${req.params.uuid}/power`;
      fetch(daemonPowerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: signal })
      }).catch(err => console.log('[Wings Daemon Forward Notice]', err.message));
    }
  } catch (err) {}

  res.status(204).send();
});

app.post('/api/client/servers/:uuid/command', verifyServerOwnership, (req, res) => {
  const { command } = req.body;
  console.log(`[Wings Daemon Stdin Command] ${req.targetServer.name} -> ${command}`);

  // Forward stdin command to node daemon
  try {
    const node = db.nodes.find(n => n.id === req.targetServer.node_id) || db.nodes[0];
    if (node) {
      const daemonCmdUrl = `${node.scheme || 'http'}://${node.fqdn || '127.0.0.1'}:${node.daemon_listen || 8443}/api/servers/${req.params.uuid}/commands`;
      fetch(daemonCmdUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands: [command] })
      }).catch(err => console.log('[Wings Daemon Forward Notice]', err.message));
    }
  } catch (err) {}

  res.status(204).send();
});

app.get('/api/client/servers/:uuid/logs', verifyServerOwnership, async (req, res) => {
  try {
    const node = db.nodes.find(n => n.id === req.targetServer.node_id) || db.nodes[0];
    if (node) {
      const daemonLogsUrl = `${node.scheme || 'http'}://${node.fqdn || '127.0.0.1'}:${node.daemon_listen || 8443}/api/servers/${req.params.uuid}/logs`;
      const response = await fetch(daemonLogsUrl, { signal: AbortSignal.timeout(1500) });
      if (response.ok) {
        const data = await response.json();
        return res.json({ data: data.logs || [] });
      }
    }
  } catch (err) {}
  res.json({ data: [] });
});

app.get('/api/client/servers/:uuid/websocket', verifyServerOwnership, (req, res) => {
  const ephemeralToken = `jwt_slayernode_${Date.now()}`;
  res.json({
    data: {
      token: ephemeralToken,
      socket: `ws://${req.headers.host}/api/client/servers/${req.params.uuid}/ws`,
    },
  });
});

// Theme Studio API
app.get('/api/studio/theme', (req, res) => {
  res.json({ success: true, theme: db.theme });
});

app.post('/api/studio/theme', requireRootAdmin, (req, res) => {
  db.theme = req.body;
  saveState(db);
  res.json({ success: true, theme: db.theme });
});

app.post('/api/studio/theme/reset', requireRootAdmin, (req, res) => {
  db.theme = null;
  saveState(db);
  res.json({ success: true, message: 'Theme settings reset to factory default.' });
});

// Mod search proxy
app.get('/api/addons/mods/search', async (req, res) => {
  const query = req.query.q || '';
  try {
    const apiRes = await fetch(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&limit=12`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      return res.json({ success: true, hits: data.hits });
    }
  } catch (e) {
    console.warn('Modrinth upstream unreachable.');
  }
  res.json({ success: true, hits: [] });
});

// WebSocket Terminal & Stats Streamer
server.on('upgrade', (request, socket, head) => {
  if (request.url?.includes('/ws')) {
    wss.handleUpgrade(request, socket, head, ws => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (clientWs, req) => {
  // Extract server UUID from URL if present
  const match = req.url?.match(/\/api\/client\/servers\/([^\/]+)\/ws/);
  const serverUuid = match ? match[1] : null;

  // Establish upstream WebSocket bridge to SlayerWings Daemon on port 8443
  let daemonWs = null;
  try {
    daemonWs = new WebSocket('ws://127.0.0.1:8443');
    daemonWs.on('message', data => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);
      }
    });
    daemonWs.on('error', () => {});
  } catch (e) {}

  clientWs.on('message', message => {
    try {
      if (daemonWs && daemonWs.readyState === WebSocket.OPEN) {
        daemonWs.send(message);
      }
    } catch (e) {}
  });

  clientWs.on('close', () => {
    if (daemonWs) {
      try {
        daemonWs.close();
      } catch {}
    }
  });
});

app.use((req, res, next) => {
  if (req.path.includes('storage_db.json')) {
    return res.status(403).json({ error: 'Direct access to internal database forbidden.' });
  }
  next();
});

const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distDir, 'index.html'));
    }
    next();
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\x1b[38;2;0;210;255m⚡ SlayerNode Panel v1.0.0 Backend\x1b[0m listening on http://localhost:${PORT}`);
  console.log(`\x1b[38;2;16;185;129m✔ Wings Working Engine & Application API active.\x1b[0m`);
  console.log(`\x1b[38;2;0;210;255m✔ Blueprint Framework Support & Extensions Router active.\x1b[0m`);
});
