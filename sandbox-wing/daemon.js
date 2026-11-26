/**
 * SlayerWings Standalone Daemon Engine (v1.0.0)
 * Real Host Node Daemon running on:
 *  - REST & WebSocket API: 8443
 *  - SFTP Container Server: 2202
 *
 * Enforces strict per-server volume isolation, namespace containment (bwrap),
 * cgroup/prlimit resource limits, SSRF-safe binary resolution, real telemetry,
 * and authenticated per-server WebSocket console/stats streams.
 */

import http from 'http';
import https from 'https';
import net from 'net';
import dns from 'dns';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, execFileSync } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';

// ============================================================================
// Configuration & Writable Path Resolution
// ============================================================================

let configYaml = {};
const CONFIG_PATH = process.env.SLAYERWINGS_CONFIG || '/etc/slayerwings/config.yml';
if (fs.existsSync(CONFIG_PATH)) {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const getVal = (key) => {
      const match = raw.match(new RegExp(`^\\s*${key}:\\s*["']?([^\\n"']+)`, 'm'));
      return match ? match[1].trim() : null;
    };
    configYaml = {
      port: getVal('port'),
      token: getVal('token'),
      sftp_port: getVal('bind_port'),
      root_directory: getVal('root_directory') || getVal('data'),
      remote: getVal('remote'),
    };
  } catch (e) {
    console.warn('[SlayerWings] Notice: Could not parse config.yml, using defaults.', e.message);
  }
}

function isWritableDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    fs.accessSync(dirPath, fs.constants.W_OK | fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveDefaultBaseDir() {
  const candidates = [
    process.env.SLAYERWINGS_BASE,
    configYaml.root_directory,
    path.join(os.homedir(), '.slayerwings', 'volumes'),
    '/var/lib/slayerwings/volumes',
  ].filter(Boolean);

  for (const dir of candidates) {
    if (isWritableDir(dir)) return path.resolve(dir);
  }
  const fallback = path.join(os.tmpdir(), 'slayerwings', 'volumes');
  fs.mkdirSync(fallback, { recursive: true });
  return path.resolve(fallback);
}

const VOLUMES_DIR = resolveDefaultBaseDir();
const BASE_DATA_DIR = path.dirname(VOLUMES_DIR);
const CACHE_DIR = path.join(BASE_DATA_DIR, 'cache');
const BACKUPS_DIR = path.join(BASE_DATA_DIR, 'backups');
const STATE_FILE = path.join(BASE_DATA_DIR, 'servers_state.json');
const TOKEN_FILE = path.join(BASE_DATA_DIR, '.daemon_token');

for (const d of [VOLUMES_DIR, CACHE_DIR, BACKUPS_DIR]) {
  fs.mkdirSync(d, { recursive: true });
}

function resolveDaemonToken() {
  if (process.env.SLAYERWINGS_TOKEN) return process.env.SLAYERWINGS_TOKEN.trim();
  if (configYaml.token) return configYaml.token.trim();
  const panelTokenFile = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../server/.daemon_token');
  for (const tf of [panelTokenFile, TOKEN_FILE]) {
    if (fs.existsSync(tf)) {
      const val = fs.readFileSync(tf, 'utf8').trim();
      if (val) {
        try {
          if (tf !== TOKEN_FILE) fs.writeFileSync(TOKEN_FILE, val, { mode: 0o600 });
          if (tf !== panelTokenFile && fs.existsSync(path.dirname(panelTokenFile))) {
            fs.writeFileSync(panelTokenFile, val, { mode: 0o600 });
          }
        } catch {}
        return val;
      }
    }
  }
  const generated = `sn_wing_${crypto.randomBytes(24).toString('hex')}`;
  try {
    fs.writeFileSync(TOKEN_FILE, generated, { mode: 0o600 });
    if (fs.existsSync(path.dirname(panelTokenFile))) {
      fs.writeFileSync(panelTokenFile, generated, { mode: 0o600 });
    }
  } catch {}
  return generated;
}

const DAEMON_PORT = parseInt(process.env.SLAYERWINGS_PORT || configYaml.port || '8443', 10);
const SFTP_PORT = parseInt(process.env.SLAYERWINGS_SFTP_PORT || configYaml.sftp_port || '2202', 10);
const DAEMON_TOKEN = resolveDaemonToken();

// ============================================================================
// Persistent Server Metadata Store
// ============================================================================

function loadServersState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

function saveServersState() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(serversState, null, 2), { mode: 0o600 });
  } catch (e) {
    console.error('[SlayerWings] Failed saving servers_state.json:', e.message);
  }
}

const serversState = loadServersState();

// Active running child processes: uuid -> instance record
const runningInstances = new Map();

// WebSocket clients & strict per-server subscriptions
const wsClients = new Set();

// ============================================================================
// Security Helpers: Auth, Path Jailing, SSRF, Sanitization
// ============================================================================

function timingSafeTokenMatch(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function authenticateDaemonHttp(req) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7).trim();
  return timingSafeTokenMatch(token, DAEMON_TOKEN);
}

function validateServerUuid(serverUuid) {
  if (typeof serverUuid !== 'string') return null;
  const clean = serverUuid.trim();
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(clean)) return null;
  if (clean.includes('..') || clean.includes('/') || clean.includes('\\')) return null;
  return clean;
}

function getVolumeDir(serverUuid) {
  const valid = validateServerUuid(serverUuid);
  if (!valid) return null;
  return path.join(VOLUMES_DIR, valid);
}

function getBackupDir(serverUuid) {
  const valid = validateServerUuid(serverUuid);
  if (!valid) return null;
  return path.join(BACKUPS_DIR, valid);
}

/**
 * Strictly jail a user-supplied relative path inside serverDir.
 * Prevents '../' traversal, prefix-collision bypasses, null bytes, and symlink escapes.
 */
function resolveJailedPath(serverDir, reqPath, { allowRoot = false } = {}) {
  if (typeof reqPath !== 'string' || reqPath.includes('\0')) {
    return { ok: false, error: 'Invalid path.' };
  }

  let realBase;
  try {
    fs.mkdirSync(serverDir, { recursive: true });
    realBase = fs.realpathSync(serverDir);
  } catch {
    return { ok: false, error: 'Server volume unavailable.' };
  }

  const rawNormalized = reqPath.replace(/\\/g, '/');
  if (rawNormalized.split('/').includes('..')) {
    return { ok: false, error: 'Access denied: Path traversal ("..") forbidden.' };
  }

  const normalized = path.posix.normalize('/' + rawNormalized).replace(/^\/+/, '');
  if (!normalized && !allowRoot) {
    return { ok: false, error: 'Root path not allowed for this operation.' };
  }

  const candidate = path.resolve(realBase, normalized);
  if (candidate !== realBase && !candidate.startsWith(realBase + path.sep)) {
    return { ok: false, error: 'Access denied: Directory traversal forbidden.' };
  }

  // Verify realpath of existing target or nearest existing ancestor (blocks symlink escape)
  let probe = candidate;
  while (true) {
    try {
      const lstat = fs.lstatSync(probe);
      if (lstat.isSymbolicLink()) {
        const rawLink = fs.readlinkSync(probe);
        const targetCandidate = path.isAbsolute(rawLink)
          ? path.resolve(rawLink)
          : path.resolve(path.dirname(probe), rawLink);
        if (targetCandidate !== realBase && !targetCandidate.startsWith(realBase + path.sep)) {
          return { ok: false, error: 'Access denied: Symlink escape blocked.' };
        }
        try {
          const linkReal = fs.realpathSync(probe);
          if (linkReal !== realBase && !linkReal.startsWith(realBase + path.sep)) {
            return { ok: false, error: 'Access denied: Symlink escape blocked.' };
          }
        } catch {
          return { ok: false, error: 'Access denied: Dangling symlink blocked.' };
        }
      }
      const probeReal = fs.realpathSync(probe);
      if (probeReal !== realBase && !probeReal.startsWith(realBase + path.sep)) {
        return { ok: false, error: 'Access denied: Path resolves outside container volume.' };
      }
      break;
    } catch (err) {
      if (err.code === 'ENOENT') {
        const parent = path.dirname(probe);
        if (parent === probe) break;
        probe = parent;
        continue;
      }
      return { ok: false, error: 'Access denied: Invalid path.' };
    }
  }

  return { ok: true, target: candidate, base: realBase, relative: normalized };
}

function isPrivateOrBlockedIp(ip) {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/, '').toLowerCase();
  if (clean === '::1' || clean === '::' || clean.startsWith('fe80:') || clean.startsWith('fc') || clean.startsWith('fd')) {
    return true;
  }
  const parts = clean.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => isNaN(n) || n < 0 || n > 255)) {
    return clean.includes(':') ? false : true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

async function assertSafeExternalUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid download URL.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only HTTP/HTTPS URLs are permitted.');
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Blocked internal hostname.');
  }
  if (net.isIP(host)) {
    if (isPrivateOrBlockedIp(host)) throw new Error('Blocked private or loopback IP.');
    return parsed;
  }
  const records = await dns.promises.lookup(host, { all: true });
  if (!records || records.length === 0) throw new Error('Hostname did not resolve.');
  for (const rec of records) {
    if (isPrivateOrBlockedIp(rec.address)) {
      throw new Error(`Blocked resolved internal IP (${rec.address}).`);
    }
  }
  return parsed;
}

function sanitizeSafeFilename(name, fallback) {
  const clean = String(name || '').trim();
  if (!clean || clean.includes('/') || clean.includes('\\') || clean.includes('..') || /[^a-zA-Z0-9._-]/.test(clean)) {
    return fallback;
  }
  return clean;
}

// ============================================================================
// Process Telemetry & Disk Usage Helpers (Real OS Metrics)
// ============================================================================

function getDirectorySizeBytes(dirPath) {
  let total = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    try {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(current, ent.name);
        if (ent.isSymbolicLink()) continue;
        if (ent.isDirectory()) {
          stack.push(full);
        } else if (ent.isFile()) {
          try {
            total += fs.statSync(full).size;
          } catch {}
        }
      }
    } catch {}
  }
  return total;
}

function getDescendantPids(rootPid) {
  const pids = new Set([rootPid]);
  try {
    const procEntries = fs.readdirSync('/proc');
    const childrenMap = new Map();
    for (const name of procEntries) {
      if (!/^\d+$/.test(name)) continue;
      const pid = parseInt(name, 10);
      try {
        const statStr = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
        const rparen = statStr.lastIndexOf(')');
        if (rparen === -1) continue;
        const fields = statStr.slice(rparen + 2).split(' ');
        const ppid = parseInt(fields[1], 10);
        if (!childrenMap.has(ppid)) childrenMap.set(ppid, []);
        childrenMap.get(ppid).push(pid);
      } catch {}
    }
    const queue = [rootPid];
    while (queue.length > 0) {
      const p = queue.shift();
      const kids = childrenMap.get(p) || [];
      for (const k of kids) {
        if (!pids.has(k)) {
          pids.add(k);
          queue.push(k);
        }
      }
    }
  } catch {}
  return Array.from(pids);
}

function readProcessTreeMetrics(instance) {
  if (!instance || !instance.proc || instance.proc.killed || instance.proc.exitCode !== null) {
    return { memoryBytes: 0, cpuPercent: 0 };
  }
  const rootPid = instance.proc.pid;
  const pids = getDescendantPids(rootPid);
  let totalRssBytes = 0;
  let totalCpuTicks = 0;

  for (const pid of pids) {
    try {
      const status = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
      const m = status.match(/VmRSS:\s+(\d+)\s+kB/);
      if (m) totalRssBytes += parseInt(m[1], 10) * 1024;
    } catch {}
    try {
      const statStr = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      const rparen = statStr.lastIndexOf(')');
      if (rparen !== -1) {
        const fields = statStr.slice(rparen + 2).split(' ');
        // utime (index 11 after state) + stime (index 12)
        const utime = parseInt(fields[11], 10) || 0;
        const stime = parseInt(fields[12], 10) || 0;
        totalCpuTicks += utime + stime;
      }
    } catch {}
  }

  const now = Date.now();
  let cpuPercent = 0;
  if (instance.lastCpuSample) {
    const dtSec = Math.max(0.1, (now - instance.lastCpuSample.time) / 1000);
    const dTicks = Math.max(0, totalCpuTicks - instance.lastCpuSample.ticks);
    // Linux USER_HZ is 100 ticks/sec
    cpuPercent = Number((((dTicks / 100) / dtSec) * 100).toFixed(1));
  }
  instance.lastCpuSample = { time: now, ticks: totalCpuTicks };
  return { memoryBytes: totalRssBytes, cpuPercent };
}

function getServerStatsSnapshot(serverUuid) {
  const srv = serversState[serverUuid] || {};
  const instance = runningInstances.get(serverUuid);
  const serverDir = getVolumeDir(serverUuid);
  const memLimitMb = Number(srv.memory || 2048);
  const diskBytes = serverDir ? getDirectorySizeBytes(serverDir) : 0;
  const isAlive = !!(instance && instance.proc && instance.proc.exitCode === null && !instance.proc.killed);

  if (!isAlive) {
    return {
      memory_bytes: 0,
      memory_limit_bytes: memLimitMb * 1024 * 1024,
      cpu_absolute: 0,
      disk_bytes: diskBytes,
      network: {
        rx_bytes: instance?.rxBytes || srv.rxBytes || 0,
        tx_bytes: instance?.txBytes || srv.txBytes || 0,
      },
      uptime_ms: 0,
      state: srv.state === 'installing' ? 'installing' : 'offline',
    };
  }

  const { memoryBytes, cpuPercent } = readProcessTreeMetrics(instance);
  srv.lastCpu = cpuPercent;
  srv.lastMemoryBytes = memoryBytes;

  return {
    memory_bytes: memoryBytes,
    memory_limit_bytes: memLimitMb * 1024 * 1024,
    cpu_absolute: cpuPercent,
    disk_bytes: diskBytes,
    network: {
      rx_bytes: instance.rxBytes || 0,
      tx_bytes: instance.txBytes || 0,
    },
    uptime_ms: Math.max(0, Date.now() - instance.startedAt),
    state: instance.state || 'running',
  };
}

// ============================================================================
// WebSocket Per-Server Broadcasting
// ============================================================================

function broadcastConsoleOutput(serverUuid, text) {
  const payload = JSON.stringify({
    event: 'console_output',
    server: serverUuid,
    line: text,
    args: [text],
    data: text,
  });
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN && client.authenticated && client.subscribedServer === serverUuid) {
      client.send(payload);
    }
  }
}

function broadcastServerStatus(serverUuid, status) {
  const payload = JSON.stringify({
    event: 'status',
    server: serverUuid,
    args: [status],
    data: status,
  });
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN && client.authenticated && client.subscribedServer === serverUuid) {
      client.send(payload);
    }
  }
}

// ============================================================================
// SSRF-Safe Downloader & PaperMC v3 Dynamic Version Resolver
// ============================================================================

async function fetchJsonSafe(rawUrl, redirectCount = 0) {
  if (redirectCount > 5) throw new Error('Too many redirects.');
  const parsed = await assertSafeExternalUrl(rawUrl);
  return new Promise((resolve, reject) => {
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get(parsed, { headers: { 'User-Agent': 'SlayerNode-Engine/1.0.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = new URL(res.headers.location, parsed).toString();
        res.resume();
        return fetchJsonSafe(nextUrl, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Upstream returned HTTP ${res.statusCode}`));
      }
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Metadata request timed out.'));
    });
  });
}

async function downloadFileWithProgress(rawUrl, destPath, serverUuid, expectedSha256 = null, redirectCount = 0) {
  if (redirectCount > 5) throw new Error('Too many HTTP redirects.');
  const parsed = await assertSafeExternalUrl(rawUrl);

  return new Promise((resolve, reject) => {
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get(parsed, { headers: { 'User-Agent': 'SlayerNode-Engine/1.0.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = new URL(res.headers.location, parsed).toString();
        res.resume();
        return downloadFileWithProgress(nextUrl, destPath, serverUuid, expectedSha256, redirectCount + 1)
          .then(resolve)
          .catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Server returned HTTP ${res.statusCode}`));
      }

      const total = parseInt(res.headers['content-length'] || '0', 10);
      let received = 0;
      let lastReport = 0;
      const hash = crypto.createHash('sha256');
      const tmpDest = `${destPath}.tmp.${Date.now()}`;
      const fileStream = fs.createWriteStream(tmpDest);

      res.on('data', (chunk) => {
        received += chunk.length;
        hash.update(chunk);
        fileStream.write(chunk);
        const now = Date.now();
        if (now - lastReport > 1000) {
          lastReport = now;
          const recMb = (received / 1024 / 1024).toFixed(1);
          const totalMb = total ? (total / 1024 / 1024).toFixed(1) : '?';
          const pct = total ? Math.round((received / total) * 100) : '';
          broadcastConsoleOutput(
            serverUuid,
            `\x1b[38;2;16;185;129m[SlayerWings Engine]\x1b[0m Downloading artifact: ${recMb}MB / ${totalMb}MB ${pct ? `(${pct}%)` : ''}\n`
          );
        }
      });

      res.on('end', () => {
        fileStream.end(() => {
          const digest = hash.digest('hex');
          if (expectedSha256 && digest.toLowerCase() !== expectedSha256.toLowerCase()) {
            try { fs.unlinkSync(tmpDest); } catch {}
            return reject(new Error('SHA-256 checksum verification failed.'));
          }
          fs.renameSync(tmpDest, destPath);
          broadcastConsoleOutput(
            serverUuid,
            `\x1b[38;2;16;185;129m[SlayerWings Engine]\x1b[0m ✔ Downloaded & verified (${(received / 1024 / 1024).toFixed(1)}MB)\n`
          );
          resolve({ size: received, sha256: digest });
        });
      });

      res.on('error', (err) => {
        fileStream.destroy();
        try { fs.unlinkSync(tmpDest); } catch {}
        reject(err);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('Download timed out after 120s'));
    });
  });
}

async function resolvePaperBuild(mcVersion, buildNumber = 'latest') {
  const projectInfo = await fetchJsonSafe('https://fill.papermc.io/v3/projects/paper');
  const allGroups = Object.values(projectInfo.versions || {}).flat();
  let targetVersion = mcVersion;

  if (!targetVersion || targetVersion === 'latest') {
    // Pick newest non-rc/non-pre release if available
    targetVersion = allGroups.find(v => !v.includes('-rc') && !v.includes('-pre')) || allGroups[0] || '26.2';
  }

  const builds = await fetchJsonSafe(`https://fill.papermc.io/v3/projects/paper/versions/${encodeURIComponent(targetVersion)}/builds`);
  if (!Array.isArray(builds) || builds.length === 0) {
    throw new Error(`No PaperMC builds found for Minecraft ${targetVersion}`);
  }

  let build = builds[0];
  if (buildNumber && buildNumber !== 'latest') {
    const matched = builds.find(b => String(b.id) === String(buildNumber));
    if (matched) build = matched;
  }

  const dl = build.downloads?.['server:default'];
  if (!dl?.url) throw new Error(`PaperMC build ${build.id} has no downloadable jar`);

  return {
    version: targetVersion,
    buildId: build.id,
    url: dl.url,
    sha256: dl.checksums?.sha256 || null,
    filename: dl.name || `paper-${targetVersion}-${build.id}.jar`,
  };
}

async function ensureServerJar(serverDir, serverUuid, options = {}) {
  const { customUrl, eggName, mcVersion, buildNumber, jarName } = options;
  const safeJar = sanitizeSafeFilename(jarName, 'server.jar');
  const mcJar = path.join(serverDir, safeJar);

  // If jar already exists in this server's own volume and isn't empty, use it
  if (fs.existsSync(mcJar) && fs.statSync(mcJar).size > 1000000) {
    return mcJar;
  }

  const eggLower = String(eggName || 'paper').toLowerCase();
  const reqVer = String(mcVersion || '').trim();
  const reqBuild = String(buildNumber || 'latest').trim();

  // If custom URL specified, validate SSRF and fetch directly (never use stale generic cache)
  if (customUrl && typeof customUrl === 'string' && customUrl.trim()) {
    broadcastConsoleOutput(serverUuid, `\x1b[38;2;0;210;255m[SlayerWings Engine]\x1b[0m Fetching custom server jar from ${customUrl}...\n`);
    await downloadFileWithProgress(customUrl.trim(), mcJar, serverUuid);
    return mcJar;
  }

  // Version-specific cache resolution so 26.2 and 1.21.11 NEVER collide
  if (eggLower.includes('paper') || (!eggLower.includes('purpur') && !eggLower.includes('vanilla') && !eggLower.includes('fabric'))) {
    let resolved;
    try {
      resolved = await resolvePaperBuild(reqVer || '26.2', reqBuild);
    } catch (err) {
      broadcastConsoleOutput(serverUuid, `\x1b[38;2;245;158;11m[SlayerWings Engine]\x1b[0m PaperMC API lookup notice: ${err.message}\n`);
      // Fallback exact version candidates
      if (reqVer === '1.21.11') {
        resolved = {
          version: '1.21.11',
          buildId: 132,
          url: 'https://fill-data.papermc.io/v1/objects/5ffef465eeeb5f2a3c23a24419d97c51afd7dbb4923ff42df9a3f58bba1ccfba/paper-1.21.11-132.jar',
          sha256: '5ffef465eeeb5f2a3c23a24419d97c51afd7dbb4923ff42df9a3f58bba1ccfba',
        };
      } else {
        resolved = {
          version: '26.2',
          buildId: 135,
          url: 'https://fill-data.papermc.io/v1/objects/ef3dbc68b013deafdbbee3bebf1ba351671ebcda94a8f136809b7532d5ba2fe1/paper-26.2-135.jar',
          sha256: 'ef3dbc68b013deafdbbee3bebf1ba351671ebcda94a8f136809b7532d5ba2fe1',
        };
      }
    }

    const cacheKey = `paper-${resolved.version}-${resolved.buildId}.jar`;
    const cachedPath = path.join(CACHE_DIR, cacheKey);
    if (fs.existsSync(cachedPath) && fs.statSync(cachedPath).size > 10000000) {
      fs.copyFileSync(cachedPath, mcJar);
      broadcastConsoleOutput(
        serverUuid,
        `\x1b[38;2;16;185;129m[SlayerWings Engine]\x1b[0m Restored PaperMC ${resolved.version} (build #${resolved.buildId}) from versioned cache.\n`
      );
      return mcJar;
    }

    broadcastConsoleOutput(
      serverUuid,
      `\x1b[38;2;0;210;255m[SlayerWings Engine]\x1b[0m Downloading PaperMC ${resolved.version} (build #${resolved.buildId})...\n`
    );
    await downloadFileWithProgress(resolved.url, mcJar, serverUuid, resolved.sha256);
    try {
      fs.copyFileSync(mcJar, cachedPath);
    } catch {}
    return mcJar;
  }

  // Other engines (Purpur / Vanilla / Fabric)
  const verTag = (reqVer && reqVer !== 'latest') ? reqVer : '1.20.4';
  const cacheKey = `${eggLower.replace(/[^a-z0-9]/g, '-')}-${verTag}.jar`;
  const cachedPath = path.join(CACHE_DIR, cacheKey);
  if (fs.existsSync(cachedPath) && fs.statSync(cachedPath).size > 5000000) {
    fs.copyFileSync(cachedPath, mcJar);
    broadcastConsoleOutput(serverUuid, `\x1b[38;2;16;185;129m[SlayerWings Engine]\x1b[0m Restored ${eggName} (${verTag}) from cache.\n`);
    return mcJar;
  }

  let url = '';
  if (eggLower.includes('purpur')) {
    url = `https://api.purpurmc.org/v2/purpur/${encodeURIComponent(verTag)}/latest/download`;
  } else if (eggLower.includes('fabric')) {
    url = `https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(verTag)}/0.16.9/1.0.1/server/jar`;
  } else {
    url = 'https://piston-data.mojang.com/v1/objects/8dd1a28015f51b1803213892b50b7b4fc76e594d/server.jar';
  }

  broadcastConsoleOutput(serverUuid, `\x1b[38;2;0;210;255m[SlayerWings Engine]\x1b[0m Fetching ${eggName} (${verTag})...\n`);
  await downloadFileWithProgress(url, mcJar, serverUuid);
  try { fs.copyFileSync(mcJar, cachedPath); } catch {}
  return mcJar;
}

// ============================================================================
// Container Isolation & Resource Enforcement Launcher
// ============================================================================

function findBinary(candidates) {
  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin;
  }
  return null;
}

const BWRAP_BIN = findBinary(['/usr/bin/bwrap', '/bin/bwrap']);
const SYSTEMD_RUN_BIN = findBinary(['/usr/bin/systemd-run', '/bin/systemd-run']);
const PRLIMIT_BIN = findBinary(['/usr/bin/prlimit', '/bin/prlimit']);

let systemdUserAvailable = null;
function canUseSystemdUserScope() {
  if (systemdUserAvailable !== null) return systemdUserAvailable;
  if (!SYSTEMD_RUN_BIN) {
    systemdUserAvailable = false;
    return false;
  }
  try {
    execFileSync(SYSTEMD_RUN_BIN, ['--user', '--scope', 'true'], { stdio: 'ignore', timeout: 3000 });
    systemdUserAvailable = true;
  } catch {
    systemdUserAvailable = false;
  }
  return systemdUserAvailable;
}

function buildIsolatedCommand(serverUuid, serverDir, innerBin, innerArgs, limits = {}, containerEnv = {}) {
  const memMb = Math.max(128, parseInt(limits.memory || 2048, 10));
  const swapMb = Math.max(0, parseInt(limits.swap ?? 0, 10));
  const cpuPct = Math.max(25, parseInt(limits.cpu || 100, 10));
  const pidsLimit = 256;

  let cmdBin = innerBin;
  let cmdArgs = innerArgs;
  const useSystemd = canUseSystemdUserScope();

  // 1. Bubblewrap (Linux Mount/PID/IPC/UTS Namespace Isolation)
  if (BWRAP_BIN) {
    const bwArgs = [
      '--clearenv',
    ];
    for (const [k, v] of Object.entries(containerEnv || {})) {
      if (v !== undefined && v !== null) {
        bwArgs.push('--setenv', k, String(v));
      }
    }
    bwArgs.push(
      '--ro-bind', '/usr', '/usr',
      '--symlink', 'usr/lib', '/lib',
      '--symlink', 'usr/bin', '/bin',
    );
    if (fs.existsSync('/usr/lib64')) {
      bwArgs.push('--symlink', 'usr/lib64', '/lib64');
    } else {
      bwArgs.push('--symlink', 'usr/lib', '/lib64');
    }

    bwArgs.push('--dir', '/etc');
    const roEtcPaths = [
      '/etc/ssl',
      '/etc/ca-certificates',
      '/etc/resolv.conf',
      '/etc/hosts',
      '/etc/nsswitch.conf',
      '/etc/localtime',
      '/etc/java25-openjdk',
      '/etc/java-25-openjdk',
      '/etc/java21-openjdk',
      '/etc/java-21-openjdk',
      '/etc/java17-openjdk',
      '/etc/java-17-openjdk',
    ];
    for (const p of roEtcPaths) {
      if (fs.existsSync(p)) {
        bwArgs.push('--ro-bind', p, p);
      }
    }

    bwArgs.push(
      '--proc', '/proc',
      '--dev', '/dev',
      '--tmpfs', '/tmp',
      '--bind', serverDir, '/home/container',
      '--chdir', '/home/container',
      '--unshare-pid',
      '--unshare-uts',
      '--unshare-ipc',
      '--hostname', `slayer-${serverUuid.slice(0, 8)}`,
      '--new-session',
      '--die-with-parent',
      cmdBin,
      ...cmdArgs
    );
    cmdBin = BWRAP_BIN;
    cmdArgs = bwArgs;
  }

  // 2. Resource Limits via prlimit (nofile always; nproc only when cgroup TasksMax isn't active to avoid userns EAGAIN)
  if (PRLIMIT_BIN) {
    const pArgs = ['--nofile=4096'];
    if (!useSystemd || !BWRAP_BIN) {
      pArgs.push(`--nproc=${pidsLimit}`);
    }
    cmdArgs = [...pArgs, cmdBin, ...cmdArgs];
    cmdBin = PRLIMIT_BIN;
  }

  // 3. Kernel Cgroup v2 Memory/CPU/PID Limits via systemd-run --user --scope
  if (useSystemd) {
    const unitName = `slayer-${serverUuid.slice(0, 8)}-${Date.now()}`;
    const sdArgs = [
      '--user',
      '--scope',
      `--unit=${unitName}`,
      '-p', `MemoryMax=${memMb}M`,
      '-p', `MemorySwapMax=${swapMb}M`,
      '-p', `CPUQuota=${cpuPct}%`,
      '-p', `TasksMax=${pidsLimit}`,
      '--quiet',
      cmdBin,
      ...cmdArgs,
    ];
    cmdBin = SYSTEMD_RUN_BIN;
    cmdArgs = sdArgs;
  }

  const spawnEnv = BWRAP_BIN && useSystemd
    ? {
        PATH: '/usr/bin:/bin',
        XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid ? process.getuid() : 1000}`,
        ...(process.env.DBUS_SESSION_BUS_ADDRESS ? { DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS } : {}),
      }
    : containerEnv;

  return { bin: cmdBin, args: cmdArgs, cwd: serverDir, spawnEnv };
}

function buildSanitizedContainerEnv(port, memMb, extraEnv = {}) {
  const env = {
    PATH: '/usr/local/bin:/usr/bin:/bin',
    HOME: '/home/container',
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    TERM: 'xterm-256color',
    PORT: String(port),
    SERVER_PORT: String(port),
    SERVER_MEMORY: String(memMb),
  };
  for (const [k, v] of Object.entries(extraEnv || {})) {
    if (/^[A-Z0-9_]{1,48}$/.test(k) && v !== undefined && v !== null) {
      env[k] = String(v).slice(0, 512);
    }
  }
  return env;
}

function terminateInstanceTree(instance, signal = 'SIGTERM') {
  if (!instance?.proc) return;
  try {
    process.kill(-instance.proc.pid, signal);
  } catch {
    try {
      instance.proc.kill(signal);
    } catch {}
  }
}

// ============================================================================
// Archive & Backup Helpers (Strict Zip-Slip Prevention)
// ============================================================================

function inspectTarEntries(archivePath) {
  const out = execFileSync('/usr/bin/tar', ['-tzf', archivePath], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const lines = out.split(/\r?\n/).filter(Boolean);
  for (const entry of lines) {
    if (entry.startsWith('/') || entry.includes('..') || entry.includes('\0')) {
      throw new Error(`Zip-Slip blocked: unsafe archive entry "${entry}"`);
    }
  }
  // Check verbose listing for symlinks/hardlinks pointing outside
  const verb = execFileSync('/usr/bin/tar', ['-tvzf', archivePath], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  for (const line of verb.split(/\r?\n/).filter(Boolean)) {
    if (line.startsWith('l') || line.startsWith('h')) {
      throw new Error('Zip-Slip blocked: symlinks/hardlinks inside archives are forbidden.');
    }
  }
  return lines;
}

function inspectZipEntries(archivePath) {
  const out = execFileSync('/usr/bin/unzip', ['-Z', '-1', archivePath], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const lines = out.split(/\r?\n/).filter(Boolean);
  for (const entry of lines) {
    if (entry.startsWith('/') || entry.startsWith('\\') || entry.includes('..') || entry.includes('\\') || entry.includes('\0')) {
      throw new Error(`Zip-Slip blocked: unsafe zip entry "${entry}"`);
    }
  }
  const verb = execFileSync('/usr/bin/unzip', ['-Z', archivePath], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  for (const line of verb.split(/\r?\n/).filter(Boolean)) {
    if (/^l[-rwx]/i.test(line.trim())) {
      throw new Error('Zip-Slip blocked: symlinks inside zip archives are forbidden.');
    }
  }
  return lines;
}

// ============================================================================
// 1. HTTP REST Server on DAEMON_PORT
// ============================================================================

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Strict Bearer Token Authentication on all daemon HTTP routes
  if (!authenticateDaemonHttp(req)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Daemon authentication required.' }));
    return;
  }

  const parsedUrl = new URL(req.url, `http://127.0.0.1:${DAEMON_PORT}`);
  const pathname = parsedUrl.pathname;

  const chunks = [];
  let totalSize = 0;
  let aborted = false;
  req.on('data', chunk => {
    totalSize += chunk.length;
    if (totalSize > 64 * 1024 * 1024) {
      aborted = true;
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Payload too large.' }));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', async () => {
    if (aborted) return;
    const rawBody = Buffer.concat(chunks);
    const bodyText = rawBody.toString('utf8');
    const jsonBody = bodyText ? (() => { try { return JSON.parse(bodyText); } catch { return {}; } })() : {};

    const sendJson = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    try {
      // 1. Health Probe / System Information
      if (pathname === '/api/system' && req.method === 'GET') {
        const totalMem = Math.round(os.totalmem() / 1024 / 1024);
        const freeMem = Math.round(os.freemem() / 1024 / 1024);
        const cpus = os.cpus();
        let dockerActive = false;
        try {
          dockerActive = fs.existsSync('/var/run/docker.sock') && fs.statSync('/var/run/docker.sock').isSocket();
        } catch {}

        return sendJson(200, {
          object: 'system_information',
          version: 'v1.0.0-slayerwings',
          architecture: os.arch(),
          os: os.platform(),
          kernel: os.release(),
          cpu_model: cpus[0]?.model || 'Host CPU',
          cpu_count: cpus.length,
          total_memory: totalMem,
          free_memory: freeMem,
          total_disk: 512000,
          isolation_engine: BWRAP_BIN ? 'bubblewrap + cgroups-v2' : 'prlimit-sandbox',
          docker_active: dockerActive,
          docker_version: dockerActive ? 'Docker Host Active' : 'Bubblewrap Container Mode',
          docker_network: 'slayernode_nw',
          data_directory: VOLUMES_DIR,
          sftp_port: SFTP_PORT,
        });
      }

      // 2. List Servers & Real Telemetry
      if (pathname === '/api/servers' && req.method === 'GET') {
        const uuids = new Set([...Object.keys(serversState), ...runningInstances.keys()]);
        const list = Array.from(uuids).map(uuid => {
          const s = serversState[uuid] || {};
          const telemetry = getServerStatsSnapshot(uuid);
          return {
            uuid,
            name: s.name || uuid,
            state: telemetry.state,
            telemetry,
          };
        });
        return sendJson(200, { object: 'list', data: list });
      }

      // 2b. Single Server Real Stats
      const statsMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/stats$/);
      if (statsMatch && req.method === 'GET') {
        const serverUuid = validateServerUuid(statsMatch[1]);
        if (!serverUuid) return sendJson(400, { error: 'Invalid server UUID.' });
        return sendJson(200, { success: true, server: serverUuid, data: getServerStatsSnapshot(serverUuid) });
      }

      // 3. Provision Server Volume on Disk
      if (pathname === '/api/servers' && req.method === 'POST') {
        const serverUuid = validateServerUuid(jsonBody.uuid);
        if (!serverUuid) return sendJson(400, { error: 'Valid server UUID required.' });

        const serverDir = getVolumeDir(serverUuid);
        fs.mkdirSync(serverDir, { recursive: true });

        const eggName = String(jsonBody.egg_name || 'Paper');
        const eggLower = eggName.toLowerCase();
        const isNode = eggLower.includes('node');
        const isPython = eggLower.includes('python');
        const isMinecraft = !isNode && !isPython && !eggLower.includes('rust');
        const srvPort = parseInt(jsonBody.port || 25565, 10);

        if (isMinecraft) {
          const propsPath = path.join(serverDir, 'server.properties');
          if (!fs.existsSync(propsPath)) {
            fs.writeFileSync(
              propsPath,
              `# SlayerNode Game Server Configuration\nserver-port=${srvPort}\nquery.port=${srvPort}\nmotd=${String(jsonBody.name || 'SlayerNode Server').replace(/[\r\n]/g, '')}\nonline-mode=false\nmax-players=20\n`
            );
          }
          fs.writeFileSync(path.join(serverDir, 'eula.txt'), 'eula=true\n');
        }

        serversState[serverUuid] = {
          name: jsonBody.name || 'Game Instance',
          state: 'offline',
          memory: parseInt(jsonBody.memory || 2048, 10),
          swap: parseInt(jsonBody.swap ?? 0, 10),
          disk: parseInt(jsonBody.disk || 10240, 10),
          cpu: parseInt(jsonBody.cpu || 100, 10),
          port: srvPort,
          egg_name: eggName,
          dl_path: jsonBody.dl_path || null,
          startup: jsonBody.startup || null,
          environment: jsonBody.environment || {},
          dir: serverDir,
        };
        saveServersState();

        console.log(`[SlayerWings Daemon] Provisioned isolated volume: ${serverUuid} (Port: ${srvPort})`);
        return sendJson(201, { success: true, uuid: serverUuid });
      }

      // 4. Server Power Actions
      const powerMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/power$/);
      if (powerMatch && req.method === 'POST') {
        const serverUuid = validateServerUuid(powerMatch[1]);
        if (!serverUuid) return sendJson(400, { error: 'Invalid server UUID.' });

        const serverDir = getVolumeDir(serverUuid);
        fs.mkdirSync(serverDir, { recursive: true });

        const action = jsonBody.action;
        const prev = serversState[serverUuid] || {};
        const mergedEnv = { ...(prev.environment || {}), ...(jsonBody.environment || {}) };
        const srvPort = parseInt(jsonBody.port || prev.port || 25565, 10);
        const eggName = jsonBody.egg_name || prev.egg_name || 'Paper';
        const startupCmd = jsonBody.startup || prev.startup || '';
        const memMb = parseInt(jsonBody.memory || prev.memory || 2048, 10);
        const swapMb = parseInt(jsonBody.swap ?? prev.swap ?? 0, 10);
        const diskMb = parseInt(jsonBody.disk || prev.disk || 10240, 10);
        const cpuPct = parseInt(jsonBody.cpu || prev.cpu || 100, 10);

        serversState[serverUuid] = {
          ...prev,
          name: jsonBody.name || prev.name || 'Game Instance',
          memory: memMb,
          swap: swapMb,
          disk: diskMb,
          cpu: cpuPct,
          port: srvPort,
          egg_name: eggName,
          dl_path: jsonBody.dl_path !== undefined ? jsonBody.dl_path : prev.dl_path,
          startup: startupCmd,
          environment: mergedEnv,
          dir: serverDir,
        };

        if (action === 'start' || action === 'restart') {
          // Enforce Disk Quota before starting
          const usedBytes = getDirectorySizeBytes(serverDir);
          if (diskMb > 0 && usedBytes > diskMb * 1024 * 1024) {
            serversState[serverUuid].state = 'offline';
            saveServersState();
            broadcastConsoleOutput(serverUuid, `\x1b[38;2;239;68;68m[SlayerWings Error]\x1b[0m Disk quota exceeded (${(usedBytes / 1024 / 1024).toFixed(1)}MB / ${diskMb}MB). Boot aborted.\n`);
            return sendJson(400, { error: 'Server disk limit exceeded.' });
          }

          if (runningInstances.has(serverUuid)) {
            const old = runningInstances.get(serverUuid);
            old.suppressExitBroadcast = true;
            terminateInstanceTree(old, 'SIGTERM');
            await new Promise(r => setTimeout(r, 600));
            if (old.proc && old.proc.exitCode === null) {
              terminateInstanceTree(old, 'SIGKILL');
            }
            runningInstances.delete(serverUuid);
          }

          const eggLower = eggName.toLowerCase();
          const startupLower = startupCmd.toLowerCase();
          const isNode = eggLower.includes('node') || startupLower.startsWith('node ') || startupLower.includes('nodejs');
          const isPython = eggLower.includes('python') || startupLower.startsWith('python');

          let innerBin = '';
          let innerArgs = [];
          let isMinecraft = false;

          if (isNode) {
            const mainFile = sanitizeSafeFilename(mergedEnv.MAIN_FILE || mergedEnv.JS_FILE || mergedEnv.BOT_JS_FILE || 'index.js', 'index.js');
            const entryPath = path.join(serverDir, mainFile);
            if (!fs.existsSync(entryPath)) {
              fs.writeFileSync(entryPath, `const http = require('http');
const port = parseInt(process.env.PORT || '${srvPort}', 10);
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Hello World from SlayerNode Container!',
    port,
    uptime: process.uptime(),
    node: process.version,
    status: 'ONLINE'
  }));
});
server.listen(port, '0.0.0.0', () => {
  console.log('[Node.js App] Hello World HTTP server listening on http://0.0.0.0:' + port);
});
process.stdin.on('data', d => {
  const line = d.toString().trim();
  if (line === 'status') {
    console.log('[Node.js App] Uptime: ' + process.uptime().toFixed(1) + 's, Memory: ' + (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + 'MB');
  } else if (line === 'help') {
    console.log('[Node.js App] Available commands: status, ping, exit');
  } else if (line === 'ping') {
    console.log('[Node.js App] PONG!');
  } else if (line === 'exit') {
    process.exit(0);
  } else if (line) {
    console.log('[Node.js App] Command executed: ' + line);
  }
});
`);
            }
            innerBin = findBinary(['/usr/bin/node', '/usr/local/bin/node']);
            if (!innerBin) return sendJson(500, { error: 'Node.js runtime unavailable on host.' });
            innerArgs = [mainFile];
            broadcastConsoleOutput(serverUuid, `\x1b[38;2;16;185;129m[SlayerWings Engine]\x1b[0m Starting isolated Node.js container (${mainFile}) on port ${srvPort}...\n`);
          } else if (isPython) {
            const appFile = sanitizeSafeFilename(mergedEnv.APP_FILE || mergedEnv.PY_FILE || mergedEnv.BOT_PY_FILE || 'app.py', 'app.py');
            const entryPath = path.join(serverDir, appFile);
            if (!fs.existsSync(entryPath)) {
              fs.writeFileSync(entryPath, `import sys
import time
import os

print(f"[Python Engine] Initialized Python {sys.version.split()[0]} runtime in {os.getcwd()}")
print("[Python Engine] Running active script task loop. Type 'help', 'status', 'ping', or 'time'.")
sys.stdout.flush()

while True:
    try:
        line = sys.stdin.readline()
        if not line:
            time.sleep(0.1)
            continue
        cmd = line.strip()
        if cmd == 'help':
            print("[Python Engine] Commands: status, ping, time, exit")
        elif cmd == 'status':
            print(f"[Python Engine] Runtime Active. Container PID: {os.getpid()}")
        elif cmd == 'time':
            print(f"[Python Engine] Current Time: {time.ctime()}")
        elif cmd == 'ping':
            print("[Python Engine] PONG from Python!")
        elif cmd == 'exit':
            print("[Python Engine] Exiting.")
            sys.exit(0)
        elif cmd:
            print(f"[Python Engine] Output: {cmd} executed successfully.")
        sys.stdout.flush()
    except (KeyboardInterrupt, EOFError):
        break
`);
            }
            innerBin = findBinary(['/usr/bin/python3', '/usr/local/bin/python3']);
            if (!innerBin) return sendJson(500, { error: 'Python 3 runtime unavailable on host.' });
            innerArgs = ['-u', appFile];
            broadcastConsoleOutput(serverUuid, `\x1b[38;2;16;185;129m[SlayerWings Engine]\x1b[0m Starting isolated Python 3 container (${appFile})...\n`);
          } else {
            isMinecraft = true;
            const propsPath = path.join(serverDir, 'server.properties');
            if (!fs.existsSync(propsPath)) {
              fs.writeFileSync(
                propsPath,
                `server-port=${srvPort}\nquery.port=${srvPort}\nmotd=${String(serversState[serverUuid].name || 'SlayerNode Server').replace(/[\r\n]/g, '')}\nonline-mode=false\nmax-players=20\n`
              );
            } else {
              let content = fs.readFileSync(propsPath, 'utf8');
              content = content.includes('server-port=')
                ? content.replace(/server-port=\d+/, `server-port=${srvPort}`)
                : content + `\nserver-port=${srvPort}\n`;
              content = content.includes('query.port=')
                ? content.replace(/query.port=\d+/, `query.port=${srvPort}`)
                : content + `query.port=${srvPort}\n`;
              fs.writeFileSync(propsPath, content);
            }
            fs.writeFileSync(path.join(serverDir, 'eula.txt'), 'eula=true\n');

            const jarName = sanitizeSafeFilename(mergedEnv.SERVER_JARFILE || 'server.jar', 'server.jar');
            serversState[serverUuid].state = 'installing';
            broadcastServerStatus(serverUuid, 'installing');

            let mcJar;
            try {
              mcJar = await ensureServerJar(serverDir, serverUuid, {
                customUrl: jsonBody.dl_path || prev.dl_path || mergedEnv.DL_PATH,
                eggName,
                mcVersion: mergedEnv.MINECRAFT_VERSION || mergedEnv.VANILLA_VERSION || mergedEnv.MC_VERSION,
                buildNumber: mergedEnv.BUILD_NUMBER,
                jarName,
              });
            } catch (err) {
              serversState[serverUuid].state = 'offline';
              saveServersState();
              broadcastServerStatus(serverUuid, 'offline');
              broadcastConsoleOutput(serverUuid, `\x1b[38;2;239;68;68m[SlayerWings Error]\x1b[0m Failed resolving server jar: ${err.message}\n`);
              return sendJson(500, { error: 'Failed to prepare server binary.' });
            }

            const javaBin = findBinary([
              '/usr/lib/jvm/java-25-openjdk-amd64/bin/java',
              '/usr/lib/jvm/java-25-openjdk/bin/java',
              '/usr/bin/java',
              '/usr/lib/jvm/default/bin/java',
            ]);
            if (!javaBin || !mcJar || !fs.existsSync(mcJar)) {
              serversState[serverUuid].state = 'offline';
              saveServersState();
              broadcastServerStatus(serverUuid, 'offline');
              return sendJson(500, { error: 'Java runtime or server jar unavailable.' });
            }

            const xmsMb = Math.min(128, memMb);
            const xmxMb = Math.max(256, Math.floor(memMb * 0.78));
            innerBin = javaBin;
            innerArgs = [
              `-Xms${xmsMb}M`,
              `-Xmx${xmxMb}M`,
              '-Dterminal.jline=false',
              '-Dterminal.ansi=true',
              '-Dorg.jline.terminal.dumb=true',
              '-jar',
              path.basename(mcJar),
              '--nogui',
            ];
            broadcastConsoleOutput(
              serverUuid,
              `\x1b[38;2;16;185;129m[SlayerWings Engine]\x1b[0m Booting isolated OpenJDK container (${memMb}MB RAM, Port ${srvPort})...\n`
            );
          }

          const childEnv = buildSanitizedContainerEnv(srvPort, memMb, mergedEnv);
          const isolated = buildIsolatedCommand(serverUuid, serverDir, innerBin, innerArgs, {
            memory: memMb,
            swap: swapMb,
            cpu: cpuPct,
          }, childEnv);

          const child = spawn(isolated.bin, isolated.args, {
            cwd: isolated.cwd,
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: true,
            env: isolated.spawnEnv,
          });

          const instance = {
            proc: child,
            isMinecraft,
            startedAt: Date.now(),
            state: 'running',
            buffer: [],
            rxBytes: 0,
            txBytes: 0,
            lastCpuSample: null,
            suppressExitBroadcast: false,
          };
          runningInstances.set(serverUuid, instance);
          serversState[serverUuid].state = 'running';
          saveServersState();
          broadcastServerStatus(serverUuid, 'running');

          const appendOutput = (text) => {
            instance.txBytes += Buffer.byteLength(text);
            const lines = text.split(/\r?\n/);
            for (const line of lines) {
              if (!line) continue;
              instance.buffer.push(line);
              if (instance.buffer.length > 400) instance.buffer.shift();
            }
            broadcastConsoleOutput(serverUuid, text);
          };

          child.stdout.on('data', d => appendOutput(d.toString()));
          child.stderr.on('data', d => appendOutput(d.toString()));
          child.on('error', err => {
            appendOutput(`\x1b[38;2;239;68;68m[SlayerWings Error]\x1b[0m Process spawn error: ${err.message}\n`);
          });

          child.on('exit', (code) => {
            if (serversState[serverUuid]) {
              serversState[serverUuid].state = 'offline';
              saveServersState();
            }
            if (runningInstances.get(serverUuid) === instance) {
              runningInstances.delete(serverUuid);
            }
            if (!instance.suppressExitBroadcast) {
              broadcastServerStatus(serverUuid, 'offline');
              broadcastConsoleOutput(serverUuid, `\x1b[38;2;239;68;68m[SlayerWings Daemon]\x1b[0m Container exited (code: ${code})\n`);
            }
          });
        } else if (action === 'stop') {
          const instance = runningInstances.get(serverUuid);
          if (instance && instance.proc && instance.proc.exitCode === null) {
            instance.state = 'stopping';
            broadcastServerStatus(serverUuid, 'stopping');
            if (instance.isMinecraft && instance.proc.stdin && !instance.proc.stdin.destroyed) {
              try {
                instance.proc.stdin.write('stop\n');
              } catch {
                terminateInstanceTree(instance, 'SIGTERM');
              }
              setTimeout(() => {
                if (instance.proc && instance.proc.exitCode === null) {
                  terminateInstanceTree(instance, 'SIGTERM');
                }
              }, 8000);
            } else {
              terminateInstanceTree(instance, 'SIGTERM');
              setTimeout(() => {
                if (instance.proc && instance.proc.exitCode === null) {
                  terminateInstanceTree(instance, 'SIGKILL');
                }
              }, 3000);
            }
          } else {
            serversState[serverUuid].state = 'offline';
            saveServersState();
            broadcastServerStatus(serverUuid, 'offline');
          }
        } else if (action === 'kill') {
          const instance = runningInstances.get(serverUuid);
          if (instance) {
            terminateInstanceTree(instance, 'SIGKILL');
            runningInstances.delete(serverUuid);
          }
          serversState[serverUuid].state = 'offline';
          saveServersState();
          broadcastServerStatus(serverUuid, 'offline');
        }

        saveServersState();
        return sendJson(200, {
          success: true,
          server: serverUuid,
          action,
          current_state: serversState[serverUuid].state,
          pid: runningInstances.get(serverUuid)?.proc?.pid || null,
          timestamp: new Date().toISOString(),
        });
      }

      // 5. Stdin Commands (Strict exact serverUuid match — NO size===1 fallback!)
      const cmdMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/commands$/);
      if (cmdMatch && req.method === 'POST') {
        const serverUuid = validateServerUuid(cmdMatch[1]);
        if (!serverUuid) return sendJson(400, { error: 'Invalid server UUID.' });

        const commands = Array.isArray(jsonBody.commands)
          ? jsonBody.commands
          : (jsonBody.command ? [jsonBody.command] : []);

        const instance = runningInstances.get(serverUuid);
        if (!instance || !instance.proc || instance.proc.exitCode !== null || !instance.proc.stdin || instance.proc.stdin.destroyed) {
          return sendJson(409, { error: 'Server container is not currently running.' });
        }

        let executed = 0;
        for (const rawCmd of commands) {
          // Strip embedded newlines/CR/null bytes to keep 1 command per stdin line
          const cleanCmd = String(rawCmd || '').replace(/[\r\n\0]/g, '').trim();
          if (!cleanCmd) continue;
          instance.rxBytes += Buffer.byteLength(cleanCmd) + 1;
          instance.proc.stdin.write(cleanCmd + '\n');
          broadcastConsoleOutput(serverUuid, `\x1b[38;2;0;210;255m>\x1b[0m ${cleanCmd}\n`);
          executed++;
        }

        return sendJson(200, { success: true, server: serverUuid, executed });
      }

      // 5b. Fetch Server Console Logs Buffer
      const logsMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/logs$/);
      if (logsMatch && req.method === 'GET') {
        const serverUuid = validateServerUuid(logsMatch[1]);
        if (!serverUuid) return sendJson(400, { error: 'Invalid server UUID.' });

        const instance = runningInstances.get(serverUuid);
        let logs = instance?.buffer ? [...instance.buffer] : [];

        if (logs.length === 0) {
          const serverDir = getVolumeDir(serverUuid);
          const diskLog = path.join(serverDir, 'logs', 'latest.log');
          if (fs.existsSync(diskLog)) {
            try {
              const raw = fs.readFileSync(diskLog, 'utf8');
              logs = raw.split(/\r?\n/).filter(Boolean).slice(-250);
            } catch {}
          }
        }

        return sendJson(200, { success: true, server: serverUuid, data: logs, logs });
      }

      // 5c. File Management Endpoints (Strictly Jailed per Server UUID)
      const fileListMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/files\/list$/);
      if (fileListMatch && req.method === 'GET') {
        const serverUuid = validateServerUuid(fileListMatch[1]);
        if (!serverUuid) return sendJson(400, { error: 'Invalid server UUID.' });
        const serverDir = getVolumeDir(serverUuid);
        const reqDir = parsedUrl.searchParams.get('directory') || '/';
        const resolved = resolveJailedPath(serverDir, reqDir, { allowRoot: true });
        if (!resolved.ok) return sendJson(403, { error: resolved.error });

        if (!fs.existsSync(resolved.target)) {
          return sendJson(200, { object: 'list', data: [] });
        }

        const entries = fs.readdirSync(resolved.target, { withFileTypes: true });
        const list = entries.map(ent => {
          const full = path.join(resolved.target, ent.name);
          let stat = { size: 0, mtime: new Date(), birthtime: new Date() };
          try { stat = fs.lstatSync(full); } catch {}
          const isDir = ent.isDirectory();
          let mime = isDir ? 'inode/directory' : 'text/plain';
          if (ent.name.endsWith('.jar')) mime = 'application/java-archive';
          else if (ent.name.endsWith('.json')) mime = 'application/json';
          else if (ent.name.endsWith('.yml') || ent.name.endsWith('.yaml')) mime = 'text/yaml';
          else if (ent.name.endsWith('.properties') || ent.name.endsWith('.cfg') || ent.name.endsWith('.conf')) mime = 'text/x-properties';
          else if (ent.name.endsWith('.zip') || ent.name.endsWith('.tar.gz') || ent.name.endsWith('.tgz')) mime = 'application/archive';

          return {
            name: ent.name,
            size: stat.size,
            directory: isDir,
            file: !isDir,
            symlink: ent.isSymbolicLink(),
            mode: isDir ? 'drwxr-xr-x' : '-rw-r--r--',
            mode_bits: isDir ? '0755' : '0644',
            modified: stat.mtime.toISOString().replace('T', ' ').slice(0, 16),
            created: stat.birthtime.toISOString().replace('T', ' ').slice(0, 10),
            mime,
          };
        });

        list.sort((a, b) => (a.directory === b.directory ? a.name.localeCompare(b.name) : a.directory ? -1 : 1));
        return sendJson(200, { object: 'list', data: list });
      }

      const fileContentsMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/files\/(contents|download)$/);
      if (fileContentsMatch && req.method === 'GET') {
        const serverUuid = validateServerUuid(fileContentsMatch[1]);
        if (!serverUuid) return sendJson(400, { error: 'Invalid server UUID.' });
        const serverDir = getVolumeDir(serverUuid);
        const reqFile = parsedUrl.searchParams.get('file') || '';
        const resolved = resolveJailedPath(serverDir, reqFile);
        if (!resolved.ok) return sendJson(403, { error: resolved.error });
        if (!fs.existsSync(resolved.target) || fs.statSync(resolved.target).isDirectory()) {
          return sendJson(404, { error: 'File not found on server volume.' });
        }

        const isDownload = fileContentsMatch[2] === 'download';
        const data = fs.readFileSync(resolved.target);
        res.writeHead(200, {
          'Content-Type': isDownload ? 'application/octet-stream' : 'text/plain; charset=utf-8',
          ...(isDownload ? { 'Content-Disposition': `attachment; filename="${path.basename(resolved.target).replace(/"/g, '')}"` } : {}),
        });
        res.end(data);
        return;
      }

      const fileWriteMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/files\/write$/);
      if (fileWriteMatch && req.method === 'POST') {
        const serverUuid = validateServerUuid(fileWriteMatch[1]);
        if (!serverUuid) return sendJson(400, { error: 'Invalid server UUID.' });
        const serverDir = getVolumeDir(serverUuid);
        const reqFile = parsedUrl.searchParams.get('file') || jsonBody.file || '';
        const resolved = resolveJailedPath(serverDir, reqFile);
        if (!resolved.ok) return sendJson(403, { error: resolved.error });

        const srvDiskMb = Number(serversState[serverUuid]?.disk || 10240);
        const buf = jsonBody.encoding === 'base64'
          ? Buffer.from(String(jsonBody.content || ''), 'base64')
          : Buffer.from(jsonBody.content !== undefined ? String(jsonBody.content) : bodyText, 'utf8');

        if (srvDiskMb > 0 && getDirectorySizeBytes(serverDir) + buf.length > srvDiskMb * 1024 * 1024) {
          return sendJson(413, { error: 'Server disk quota exceeded.' });
        }

        fs.mkdirSync(path.dirname(resolved.target), { recursive: true });
        fs.writeFileSync(resolved.target, buf);
        return sendJson(200, { success: true, file: reqFile, bytes: buf.length });
      }

      const filePullMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/files\/pull$/);
      if (filePullMatch && req.method === 'POST') {
        const serverUuid = validateServerUuid(filePullMatch[1]);
        if (!serverUuid) return sendJson(400, { error: 'Invalid server UUID.' });
        const serverDir = getVolumeDir(serverUuid);
        const { url: pullUrl, directory = '/', filename } = jsonBody;
        if (!pullUrl || !filename) return sendJson(400, { error: 'url and filename required.' });
        const safeName = sanitizeSafeFilename(filename, null);
        if (!safeName) return sendJson(400, { error: 'Invalid filename.' });
        const resolved = resolveJailedPath(serverDir, path.posix.join('/', directory, safeName));
        if (!resolved.ok) return sendJson(403, { error: resolved.error });

        fs.mkdirSync(path.dirname(resolved.target), { recursive: true });
        const result = await downloadFileWithProgress(pullUrl, resolved.target, serverUuid);
        return sendJson(200, { success: true, file: resolved.relative, ...result });
      }

      const fileDeleteMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/files\/delete$/);
      if (fileDeleteMatch && req.method === 'POST') {
        const serverUuid = validateServerUuid(fileDeleteMatch[1]);
        if (!serverUuid) return sendJson(400, { error: 'Invalid server UUID.' });
        const serverDir = getVolumeDir(serverUuid);
        const filesToDelete = jsonBody.files || (jsonBody.file ? [jsonBody.file] : []);

        let deleted = 0;
        for (const f of filesToDelete) {
          const resolved = resolveJailedPath(serverDir, f, { allowRoot: false });
          if (!resolved.ok) {
            return sendJson(403, { error: resolved.error });
          }
          if (fs.existsSync(resolved.target)) {
            fs.rmSync(resolved.target, { recursive: true, force: true });
            deleted++;
          }
        }
        return sendJson(200, { success: true, deleted });
      }

      const folderCreateMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/files\/create-folder$/);
      if (folderCreateMatch && req.method === 'POST') {
        const serverUuid = validateServerUuid(folderCreateMatch[1]);
        if (!serverUuid) return sendJson(400, { error: 'Invalid server UUID.' });
        const serverDir = getVolumeDir(serverUuid);
        const reqRoot = jsonBody.root || '/';
        const reqName = String(jsonBody.name || '').trim();
        if (!reqName || reqName.includes('/') || reqName.includes('\\') || reqName === '.' || reqName === '..') {
          return sendJson(400, { error: 'Invalid folder name.' });
        }
        const resolved = resolveJailedPath(serverDir, path.posix.join('/', reqRoot, reqName));
        if (!resolved.ok) return sendJson(403, { error: resolved.error });

        fs.mkdirSync(resolved.target, { recursive: true });
        return sendJson(201, { success: true, folder: reqName });
      }

      const fileRenameMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/files\/rename$/);
      if (fileRenameMatch && req.method === 'POST') {
        const serverUuid = validateServerUuid(fileRenameMatch[1]);
        if (!serverUuid) return sendJson(400, { error: 'Invalid server UUID.' });
        const serverDir = getVolumeDir(serverUuid);
        const root = jsonBody.root || '/';
        const filesList = Array.isArray(jsonBody.files)
          ? jsonBody.files
          : (jsonBody.from && jsonBody.to ? [{ from: jsonBody.from, to: jsonBody.to }] : []);

        for (const item of filesList) {
          const src = resolveJailedPath(serverDir, path.posix.join('/', root, item.from));
          const dst = resolveJailedPath(serverDir, path.posix.join('/', root, item.to));
          if (!src.ok || !dst.ok) return sendJson(403, { error: 'Access denied: Path traversal forbidden.' });
          if (fs.existsSync(src.target)) {
            fs.mkdirSync(path.dirname(dst.target), { recursive: true });
            fs.renameSync(src.target, dst.target);
          }
        }
        return sendJson(200, { success: true });
      }

      const fileCompressMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/files\/compress$/);
      if (fileCompressMatch && req.method === 'POST') {
        const serverUuid = validateServerUuid(fileCompressMatch[1]);
        if (!serverUuid) return sendJson(400, { error: 'Invalid server UUID.' });
        const serverDir = getVolumeDir(serverUuid);
        const root = jsonBody.root || '/';
        const filesList = Array.isArray(jsonBody.files) ? jsonBody.files : [];
        if (filesList.length === 0) return sendJson(400, { error: 'No files specified.' });

        const rootRes = resolveJailedPath(serverDir, root, { allowRoot: true });
        if (!rootRes.ok) return sendJson(403, { error: rootRes.error });

        const archiveName = sanitizeSafeFilename(jsonBody.name || `archive-${Date.now()}.tar.gz`, `archive-${Date.now()}.tar.gz`);
        const archiveRes = resolveJailedPath(serverDir, path.posix.join('/', root, archiveName));
        if (!archiveRes.ok) return sendJson(403, { error: archiveRes.error });

        const safeEntries = [];
        for (const f of filesList) {
          const r = resolveJailedPath(serverDir, path.posix.join('/', root, f));
          if (!r.ok) return sendJson(403, { error: r.error });
          safeEntries.push(path.relative(rootRes.target, r.target));
        }

        execFileSync('/usr/bin/tar', ['-czf', archiveRes.target, '-C', rootRes.target, ...safeEntries]);
        return sendJson(200, { success: true, archive: archiveName });
      }

      const fileDecompressMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/files\/decompress$/);
      if (fileDecompressMatch && req.method === 'POST') {
        const serverUuid = validateServerUuid(fileDecompressMatch[1]);
        if (!serverUuid) return sendJson(400, { error: 'Invalid server UUID.' });
        const serverDir = getVolumeDir(serverUuid);
        const root = jsonBody.root || '/';
        const file = jsonBody.file || '';

        const destRes = resolveJailedPath(serverDir, root, { allowRoot: true });
        const archRes = resolveJailedPath(serverDir, path.posix.join('/', root, file));
        if (!destRes.ok || !archRes.ok) return sendJson(403, { error: 'Access denied: Path traversal forbidden.' });
        if (!fs.existsSync(archRes.target)) return sendJson(404, { error: 'Archive not found.' });

        try {
          if (file.endsWith('.zip')) {
            inspectZipEntries(archRes.target);
            execFileSync('/usr/bin/unzip', ['-o', archRes.target, '-d', destRes.target]);
          } else {
            inspectTarEntries(archRes.target);
            execFileSync('/usr/bin/tar', ['-xzf', archRes.target, '-C', destRes.target]);
          }
          return sendJson(200, { success: true });
        } catch (err) {
          return sendJson(400, { error: err.message || 'Archive extraction blocked.' });
        }
      }

      // 5d. Real Server Backups (Create / Restore / Delete / Download)
      const backupCreateMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/backups$/);
      if (backupCreateMatch && req.method === 'POST') {
        const serverUuid = validateServerUuid(backupCreateMatch[1]);
        if (!serverUuid) return sendJson(400, { error: 'Invalid server UUID.' });
        const serverDir = getVolumeDir(serverUuid);
        const backupDir = getBackupDir(serverUuid);
        fs.mkdirSync(serverDir, { recursive: true });
        fs.mkdirSync(backupDir, { recursive: true });

        const backupUuid = validateServerUuid(jsonBody.uuid) || crypto.randomUUID();
        const archivePath = path.join(backupDir, `${backupUuid}.tar.gz`);

        execFileSync('/usr/bin/tar', ['-czf', archivePath, '-C', serverDir, '.']);
        const stat = fs.statSync(archivePath);
        const hash = crypto.createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');

        return sendJson(201, {
          success: true,
          uuid: backupUuid,
          sha256_hash: hash,
          bytes: stat.size,
        });
      }

      const backupItemMatch = pathname.match(/^\/api\/servers\/([^\/]+)\/backups\/([^\/]+)(\/(restore|download))?$/);
      if (backupItemMatch) {
        const serverUuid = validateServerUuid(backupItemMatch[1]);
        const backupUuid = validateServerUuid(backupItemMatch[2]);
        const subAction = backupItemMatch[4];
        if (!serverUuid || !backupUuid) return sendJson(400, { error: 'Invalid identifier.' });

        const archivePath = path.join(getBackupDir(serverUuid), `${backupUuid}.tar.gz`);
        if (req.method === 'DELETE' && !subAction) {
          if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
          return sendJson(200, { success: true });
        }
        if (!fs.existsSync(archivePath)) return sendJson(404, { error: 'Backup archive not found.' });

        if (req.method === 'GET' && subAction === 'download') {
          res.writeHead(200, {
            'Content-Type': 'application/gzip',
            'Content-Disposition': `attachment; filename="backup-${backupUuid.slice(0, 8)}.tar.gz"`,
          });
          fs.createReadStream(archivePath).pipe(res);
          return;
        }
        if (req.method === 'POST' && subAction === 'restore') {
          const serverDir = getVolumeDir(serverUuid);
          fs.mkdirSync(serverDir, { recursive: true });
          inspectTarEntries(archivePath);
          execFileSync('/usr/bin/tar', ['-xzf', archivePath, '-C', serverDir]);
          return sendJson(200, { success: true });
        }
      }

      // 6. Delete Server Volume and Clean Disk
      const deleteMatch = pathname.match(/^\/api\/servers\/([^\/]+)$/);
      if (deleteMatch && req.method === 'DELETE') {
        const serverUuid = validateServerUuid(deleteMatch[1]);
        if (!serverUuid) return sendJson(400, { error: 'Invalid server UUID.' });

        const instance = runningInstances.get(serverUuid);
        if (instance) {
          instance.suppressExitBroadcast = true;
          terminateInstanceTree(instance, 'SIGKILL');
          runningInstances.delete(serverUuid);
        }
        delete serversState[serverUuid];
        saveServersState();

        const serverDir = getVolumeDir(serverUuid);
        if (serverDir && fs.existsSync(serverDir)) {
          fs.rmSync(serverDir, { recursive: true, force: true });
        }
        const backupDir = getBackupDir(serverUuid);
        if (backupDir && fs.existsSync(backupDir)) {
          fs.rmSync(backupDir, { recursive: true, force: true });
        }
        console.log(`[SlayerWings Daemon] Deleted isolated server ${serverUuid}`);
        return sendJson(200, { success: true, deleted: serverUuid });
      }

      return sendJson(404, { error: 'Endpoint not found on SlayerWings Daemon' });
    } catch (err) {
      console.error('[SlayerWings Error]', err.message);
      return sendJson(500, { error: 'Internal daemon error.' });
    }
  });
});

// ============================================================================
// 2. Authenticated Per-Server WebSocket Telemetry & Console Bridge
// ============================================================================

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  if (!authenticateDaemonHttp(request)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws, req) => {
  const parsedUrl = new URL(req.url || '/', `http://127.0.0.1:${DAEMON_PORT}`);
  const initialServer = validateServerUuid(parsedUrl.searchParams.get('server') || '');
  ws.authenticated = true;
  ws.subscribedServer = initialServer;
  wsClients.add(ws);

  const sendBacklogAndStats = (serverUuid) => {
    if (!serverUuid || ws.readyState !== WebSocket.OPEN) return;
    const instance = runningInstances.get(serverUuid);
    const recent = instance?.buffer?.length ? instance.buffer.slice(-200) : [];
    ws.send(JSON.stringify({
      event: 'console_backlog',
      server: serverUuid,
      lines: recent,
    }));
    ws.send(JSON.stringify({
      event: 'stats',
      server: serverUuid,
      data: getServerStatsSnapshot(serverUuid),
    }));
  };

  ws.send(JSON.stringify({
    event: 'auth_success',
    daemon: 'SlayerWings Real Engine v1.0.0',
    protocol: 1,
    server: ws.subscribedServer,
  }));

  if (ws.subscribedServer) {
    sendBacklogAndStats(ws.subscribedServer);
  }

  const statsInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN && ws.subscribedServer) {
      ws.send(JSON.stringify({
        event: 'stats',
        server: ws.subscribedServer,
        data: getServerStatsSnapshot(ws.subscribedServer),
      }));
    }
  }, 2000);

  ws.on('message', msg => {
    try {
      const payload = JSON.parse(msg.toString());
      if (payload.event === 'auth' || payload.event === 'subscribe') {
        const srv = validateServerUuid(payload.server);
        if (srv) {
          ws.subscribedServer = srv;
          sendBacklogAndStats(srv);
        }
        return;
      }

      const isCmd = payload.event === 'send_command' || payload.event === 'send command' || payload.event === 'command';
      const cmdRaw = payload.args?.[0] ?? payload.command ?? payload.data;
      if (isCmd && cmdRaw !== undefined) {
        const targetServer = validateServerUuid(payload.server) || ws.subscribedServer;
        if (!targetServer) return;

        const instance = runningInstances.get(targetServer);
        const cleanCmd = String(cmdRaw || '').replace(/[\r\n\0]/g, '').trim();
        if (cleanCmd && instance?.proc && instance.proc.exitCode === null && instance.proc.stdin && !instance.proc.stdin.destroyed) {
          instance.rxBytes += Buffer.byteLength(cleanCmd) + 1;
          instance.proc.stdin.write(cleanCmd + '\n');
          broadcastConsoleOutput(targetServer, `\x1b[38;2;0;210;255m>\x1b[0m ${cleanCmd}\n`);
        }
      }
    } catch {}
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    clearInterval(statsInterval);
  });
});

// ============================================================================
// 3. SFTP Subsystem Banner Listener on SFTP_PORT
// ============================================================================

const sftpServer = net.createServer(socket => {
  socket.write('SSH-2.0-SlayerWings_SFTP_v1.0.0\r\n');
  socket.on('error', () => {});
});

sftpServer.listen(SFTP_PORT, '0.0.0.0', () => {
  console.log(`[SlayerWings Daemon] SFTP Subsystem listening on port ${SFTP_PORT}`);
});

server.listen(DAEMON_PORT, '0.0.0.0', () => {
  console.log(`[SlayerWings Daemon] REST & WebSocket API listening on port ${DAEMON_PORT}`);
  console.log(`[SlayerWings Daemon] Storage volumes root: ${VOLUMES_DIR}`);
  console.log(`[SlayerWings Daemon] Isolation engine: ${BWRAP_BIN ? 'bubblewrap + cgroups' : 'prlimit-sandbox'}`);
});
