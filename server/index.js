/**
 * SlayerNode Game & Application Control Panel — Express + WebSocket API Server
 * Strict per-server isolation, scrypt authentication, CSRF & CSWSH protection,
 * RBAC enforcement, real SlayerWings daemon bridge, and persisted CRUD stores.
 */

import http from 'http';
import os from 'os';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express from 'express';
import nodemailer from 'nodemailer';
import { WebSocketServer, WebSocket } from 'ws';
import { fileURLToPath } from 'url';

import {
  assertSafeExternalUrl,
  buildOtpAuthUri,
  containsDangerousCss,
  createCsrfToken,
  createRateLimiter,
  createSessionCookieToken,
  createWsToken,
  generateTotpSecret,
  getSharedDaemonToken,
  hashApiToken,
  hashPassword,
  hasSqlInjection,
  isAllowedOrigin,
  parseCookies,
  stripHtmlTags,
  validateSafeMediaUrl,
  verifyCsrfToken,
  verifyPassword,
  verifySessionCookieToken,
  verifyTotpCode,
  verifyWsToken,
} from './lib/security.js';
import {
  daemonRequest,
  getNodeBaseUrl,
  getServerNode,
  probeNodeHealth,
  resolveNodeAuthToken,
} from './lib/daemonBridge.js';
import { createDefaultTheme, loadState, nextId, saveState } from './lib/store.js';
import { executeScheduleTasks, startScheduleLoop } from './lib/scheduler.js';
import { registerAddonRoutes } from './lib/addons.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = parseInt(process.env.PORT || '3001', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

// Ensure shared daemon token exists on startup
getSharedDaemonToken();

// Load persistent store
let db = loadState();
const getDb = () => db;

// Live per-server telemetry cache (strictly keyed by server UUID)
const liveStatsCache = new Map();

// Clean malformed JSON & Express fingerprints
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', false);

// ============================================================================
// HTTP Security Headers & Strict Non-Wildcard CORS
// ============================================================================

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' ws: wss:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'"
  );

  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(req)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  }
  if (req.method === 'OPTIONS') {
    if (origin && !isAllowedOrigin(req)) {
      return res.status(403).json({ error: 'CORS Origin denied' });
    }
    return res.status(204).end();
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// Rate Limiters
// ============================================================================

const authLimiter = createRateLimiter({ windowMs: 60_000, max: 15 });
const accountMutationLimiter = createRateLimiter({ windowMs: 60_000, max: 25 });
const powerLimiter = createRateLimiter({
  windowMs: 10_000,
  max: 20,
  keyFn: req => `${req.user?.id || req.ip}:${req.params?.uuid || 'global'}`,
});
const commandLimiter = createRateLimiter({
  windowMs: 10_000,
  max: 40,
  keyFn: req => `${req.user?.id || req.ip}:${req.params?.uuid || 'global'}`,
});

// ============================================================================
// Activity Recorder & Serialization Helpers
// ============================================================================

function recordActivity(user, serverUuid, action, description, ip = '127.0.0.1') {
  db.activity_logs.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    user_id: user?.id || null,
    username: user?.username || 'system',
    server_uuid: serverUuid || null,
    action,
    description: stripHtmlTags(description).slice(0, 300),
    ip: String(ip || '127.0.0.1').slice(0, 64),
    timestamp: new Date().toISOString(),
  });
  if (db.activity_logs.length > 500) db.activity_logs.length = 500;
  saveState(db);
}

function sanitizeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    uuid: u.uuid,
    username: u.username,
    email: u.email,
    name_first: u.name_first || '',
    name_last: u.name_last || '',
    language: u.language || 'en',
    root_admin: Boolean(u.root_admin),
    is_admin: Boolean(u.root_admin),
    two_factor_enabled: Boolean(u.two_factor_enabled),
    created_at: u.created_at,
  };
}

function sanitizeNodeForAdmin(node) {
  if (!node) return null;
  const loc = db.locations.find(l => String(l.id) === String(node.location_id));
  const nodeAllocCount = db.allocations.filter(a => String(a.node_id) === String(node.id)).length;
  const nodeServerCount = db.servers.filter(s => String(s.node_id) === String(node.id)).length;
  return {
    id: node.id,
    uuid: node.uuid,
    name: node.name,
    description: node.description || '',
    location_id: node.location_id,
    location_name: loc ? `${loc.short} (${loc.long})` : (node.location_name || 'Local'),
    fqdn: node.fqdn,
    scheme: node.scheme || 'http',
    behind_proxy: Boolean(node.behind_proxy),
    maintenance_mode: Boolean(node.maintenance_mode),
    allow_auto_allocation: node.allow_auto_allocation !== false,
    memory: node.memory,
    memory_overallocate: node.memory_overallocate || 0,
    disk: node.disk,
    disk_overallocate: node.disk_overallocate || 0,
    upload_size: node.upload_size || 100,
    daemon_listen: node.daemon_listen || 8443,
    daemon_sftp: node.daemon_sftp || 2202,
    daemon_base: node.daemon_base,
    servers_count: nodeServerCount,
    allocations_count: nodeAllocCount,
    is_online: Boolean(node.is_online),
    daemon_version: node.daemon_version || 'unknown',
    latency_ms: node.latency_ms ?? null,
    system_info: node.system_info || null,
    has_token: Boolean(node.daemon_token || ['127.0.0.1', 'localhost'].includes(String(node.fqdn).toLowerCase())),
  };
}

function buildCanonicalServer(srv) {
  if (!srv) return null;
  const node = getServerNode(db, srv);
  const owner = db.users.find(u => String(u.id) === String(srv.owner_id || srv.user_id));
  const egg = db.eggs.find(e => String(e.id) === String(srv.egg_id));
  const allocs = db.allocations.filter(a => String(a.server_id) === String(srv.id));
  const primaryAlloc =
    allocs.find(a => String(a.id) === String(srv.allocation_id)) ||
    db.allocations.find(a => String(a.id) === String(srv.allocation_id)) ||
    allocs[0] ||
    null;

  return {
    ...srv,
    identifier: srv.identifier || String(srv.uuid).slice(0, 8),
    owner_id: srv.owner_id || srv.user_id,
    egg_name: srv.egg_name || egg?.name || 'Custom',
    node_name: node?.name || 'Local-Node',
    allocation: primaryAlloc
      ? { id: primaryAlloc.id, ip: primaryAlloc.ip, port: primaryAlloc.port, alias: primaryAlloc.alias || null }
      : { id: null, ip: '127.0.0.1', port: 25565, alias: null },
    allocations: allocs.map(a => ({
      id: a.id,
      ip: a.ip,
      port: a.port,
      alias: a.alias || null,
      notes: a.notes || '',
      is_default: primaryAlloc ? String(a.id) === String(primaryAlloc.id) : false,
    })),
    sftp_details: {
      ip: node?.fqdn || '127.0.0.1',
      port: node?.daemon_sftp || 2202,
    },
    telemetry: liveStatsCache.get(srv.uuid) || null,
    relationships: {
      node: node ? { id: node.id, name: node.name, fqdn: node.fqdn, daemon_listen: node.daemon_listen } : null,
      user: owner ? sanitizeUser(owner) : null,
      egg: egg ? { id: egg.id, uuid: egg.uuid, name: egg.name, nest_id: egg.nest_id } : null,
      allocations: allocs,
    },
  };
}

function getClientIp(req) {
  return String(req.socket?.remoteAddress || req.ip || '127.0.0.1');
}

function ipAllowedByKey(clientIp, allowedIps) {
  if (!Array.isArray(allowedIps) || allowedIps.length === 0) return true;
  const cleanClient = clientIp.replace(/^::ffff:/, '');
  return allowedIps.some(ip => {
    const cleanAllowed = String(ip).trim().replace(/^::ffff:/, '');
    return cleanAllowed === '*' || cleanAllowed === cleanClient || (cleanAllowed === '127.0.0.1' && cleanClient === '::1');
  });
}

function setSessionCookie(res, user) {
  const token = createSessionCookieToken(user, 86400);
  const decoded = verifySessionCookieToken(token);
  const csrfToken = createCsrfToken(decoded.sid);
  const flags = [
    `slayer_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=86400',
  ];
  if (IS_PROD) flags.push('Secure');
  res.setHeader('Set-Cookie', flags.join('; '));
  return csrfToken;
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'slayer_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

// ============================================================================
// Authentication, CSRF & Authorization Middleware
// ============================================================================

app.use((req, res, next) => {
  req.user = null;
  req.authType = null;
  req.apiKey = null;
  req.csrfExpected = null;

  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7).trim();
    if (!rawToken) return next();
    const tokenHash = hashApiToken(rawToken);
    const clientIp = getClientIp(req);

    const clientKey = (db.client_api_keys || []).find(
      k => k.token_hash === tokenHash && !k.revoked_at
    );
    if (clientKey && ipAllowedByKey(clientIp, clientKey.allowed_ips)) {
      const user = db.users.find(u => String(u.id) === String(clientKey.user_id));
      if (user) {
        clientKey.last_used_at = new Date().toISOString();
        req.user = user;
        req.authType = 'client_api_key';
        req.apiKey = { ...clientKey, kind: 'client' };
      }
      return next();
    }

    const appKey = (db.api_keys || []).find(
      k => k.token_hash === tokenHash && !k.revoked_at
    );
    if (appKey && ipAllowedByKey(clientIp, appKey.allowed_ips)) {
      const user = db.users.find(u => String(u.id) === String(appKey.user_id));
      if (user) {
        appKey.last_used_at = new Date().toISOString();
        req.user = user;
        req.authType = 'app_api_key';
        req.apiKey = { ...appKey, kind: 'application' };
      }
      return next();
    }
    return next();
  }

  const cookies = parseCookies(req.headers.cookie || '');
  if (cookies.slayer_session) {
    const session = verifySessionCookieToken(cookies.slayer_session);
    if (session) {
      const user = db.users.find(u => String(u.id) === String(session.uid));
      if (user && (user.token_version || 1) === (session.tv || 1)) {
        req.user = user;
        req.authType = 'cookie';
        req.sessionPayload = session;
        req.csrfExpected = createCsrfToken(session.sid);
      }
    }
  }
  next();
});

// Enforce Origin & CSRF on mutating API calls
app.use('/api', (req, res, next) => {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!mutating) return next();

  // If browser sends Origin header, strictly validate it
  if (req.headers.origin && !isAllowedOrigin(req)) {
    return res.status(403).json({
      errors: [{ code: 'ForbiddenOrigin', status: '403', detail: 'Cross-site origin rejected by security policy.' }],
    });
  }

  // API key Bearer requests are immune to browser cookie CSRF
  if (req.authType === 'client_api_key' || req.authType === 'app_api_key') {
    return next();
  }

  // Public auth endpoints rely on credentials + Origin check above
  if (req.path === '/auth/login' || req.path === '/auth/register') {
    return next();
  }

  // Cookie-authenticated state changes MUST present matching X-CSRF-Token
  if (req.authType === 'cookie') {
    const provided = req.headers['x-csrf-token'];
    if (!verifyCsrfToken(provided, req.sessionPayload?.sid)) {
      return res.status(403).json({
        errors: [{ code: 'InvalidCsrfToken', status: '403', detail: 'Missing or invalid CSRF token.' }],
      });
    }
  }
  next();
});

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      errors: [{ code: 'Unauthenticated', status: '401', detail: 'Authentication required.' }],
    });
  }
  next();
}

function requireRootAdmin(requiredScope = null) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        errors: [{ code: 'Unauthenticated', status: '401', detail: 'Authentication required.' }],
      });
    }
    if (!req.user.root_admin) {
      return res.status(403).json({
        errors: [{ code: 'Forbidden', status: '403', detail: 'Administrator privileges required.' }],
      });
    }
    if (req.authType === 'client_api_key') {
      return res.status(403).json({
        errors: [{ code: 'InvalidKeyType', status: '403', detail: 'Client API keys cannot access Application Admin endpoints.' }],
      });
    }
    if (req.authType === 'app_api_key' && requiredScope) {
      const scopes = Array.isArray(req.apiKey?.scopes) ? req.apiKey.scopes : [];
      if (!scopes.includes('*') && !scopes.includes(requiredScope)) {
        return res.status(403).json({
          errors: [{ code: 'InsufficientScope', status: '403', detail: `API key lacks required scope: ${requiredScope}` }],
        });
      }
    }
    next();
  };
}

function findServerStrict(idOrUuid) {
  if (!idOrUuid) return null;
  const key = String(idOrUuid).trim();
  return (
    db.servers.find(s => String(s.uuid) === key) ||
    db.servers.find(s => String(s.identifier) === key) ||
    db.servers.find(s => String(s.id) === key) ||
    null
  );
}

function userCanAccessServer(user, srv, requiredPerm = null) {
  if (!user || !srv) return false;
  if (user.root_admin) return true;
  if (String(srv.owner_id || srv.user_id) === String(user.id)) return true;

  const sub = (db.subusers || []).find(
    su => String(su.server_uuid) === String(srv.uuid) && String(su.user_id) === String(user.id)
  );
  if (!sub) return false;
  if (!requiredPerm) return true;
  const perms = Array.isArray(sub.permissions) ? sub.permissions : [];
  return perms.includes('*') || perms.includes(requiredPerm);
}

function clientKeyHasPerm(apiKey, requiredPerm) {
  if (!requiredPerm) return true;
  const scopes = Array.isArray(apiKey?.permissions) ? apiKey.permissions : ['*'];
  return scopes.includes('*') || scopes.includes(requiredPerm) || scopes.includes(requiredPerm.split('.')[0] + '.*');
}

function verifyServerOwnership(requiredPerm = null) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ errors: [{ code: 'Unauthenticated', status: '401', detail: 'Authentication required.' }] });
    }
    if (req.authType === 'client_api_key' && requiredPerm && !clientKeyHasPerm(req.apiKey, requiredPerm)) {
      return res.status(403).json({
        errors: [{ code: 'InsufficientScope', status: '403', detail: `Client API key lacks permission: ${requiredPerm}` }],
      });
    }
    const srv = findServerStrict(req.params.uuid || req.params.id);
    if (!srv) {
      return res.status(404).json({ errors: [{ code: 'NotFound', status: '404', detail: 'Server not found.' }] });
    }
    if (!userCanAccessServer(req.user, srv, requiredPerm)) {
      return res.status(403).json({
        errors: [{ code: 'Forbidden', status: '403', detail: 'You do not have permission to access this server.' }],
      });
    }
    req.targetServer = srv;
    next();
  };
}

// ============================================================================
// Authentication & Session Endpoints
// ============================================================================

app.post('/api/auth/login', authLimiter, (req, res) => {
  const { email, identifier, password, two_factor_code } = req.body || {};
  const loginKey = String(email || identifier || '').trim().toLowerCase();

  if (!loginKey || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Email/username and password are required.' });
  }
  if (hasSqlInjection(loginKey)) {
    return res.status(400).json({ error: 'Invalid credential format.' });
  }

  const user = db.users.find(
    u => String(u.email).toLowerCase() === loginKey || String(u.username).toLowerCase() === loginKey
  );
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  if (user.two_factor_enabled) {
    if (!two_factor_code) {
      return res.status(200).json({ requires_two_factor: true });
    }
    if (!verifyTotpCode(user.two_factor_secret, two_factor_code)) {
      return res.status(401).json({ error: 'Invalid two-factor authentication code.' });
    }
  }

  const csrfToken = setSessionCookie(res, user);
  recordActivity(user, null, 'auth:login', `Authenticated user ${user.username}`, getClientIp(req));
  return res.json({ user: sanitizeUser(user), csrfToken });
});

app.post('/api/auth/register', authLimiter, (req, res) => {
  if (!db.theme.auth_allow_registration || !db.settings.allow_registration) {
    return res.status(403).json({ error: 'New account registration is disabled by an administrator.' });
  }
  const { username, email, password, name_first = '', name_last = '' } = req.body || {};
  const cleanUser = stripHtmlTags(String(username || '')).trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(cleanUser)) {
    return res.status(400).json({ error: 'Username must be 3-32 alphanumeric characters.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (db.users.some(u => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUser.toLowerCase())) {
    return res.status(409).json({ error: 'Username or email is already registered.' });
  }

  const newUser = {
    id: nextId(db.users),
    uuid: crypto.randomUUID(),
    username: cleanUser,
    email: cleanEmail,
    name_first: stripHtmlTags(name_first).slice(0, 64),
    name_last: stripHtmlTags(name_last).slice(0, 64),
    language: 'en',
    root_admin: false, // Explicitly lock standard registration to non-admin!
    two_factor_enabled: false,
    two_factor_secret: '',
    token_version: 1,
    password_hash: hashPassword(password),
    created_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveState(db);

  const csrfToken = setSessionCookie(res, newUser);
  recordActivity(newUser, null, 'auth:register', `Registered account ${newUser.username}`, getClientIp(req));
  return res.status(201).json({ user: sanitizeUser(newUser), csrfToken });
});

app.post('/api/auth/logout', (req, res) => {
  if (req.user) {
    req.user.token_version = (req.user.token_version || 1) + 1;
    saveState(db);
    recordActivity(req.user, null, 'auth:logout', `Signed out user ${req.user.username}`, getClientIp(req));
  }
  clearSessionCookie(res);
  return res.status(204).end();
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.json({
    user: sanitizeUser(req.user),
    csrfToken: req.csrfExpected || '',
  });
});

// ============================================================================
// Customization Studio & Theme (Public read for styling, Admin write)
// ============================================================================

app.get('/api/studio/theme', (req, res) => {
  // Never expose third-party integration tokens to unauthenticated or non-admin users
  const safeTheme = { ...db.theme };
  if (!req.user?.root_admin) {
    delete safeTheme.cloudflare_api_token;
    delete safeTheme.curseforge_api_key;
    delete safeTheme.modrinth_token;
  }
  return res.json(safeTheme);
});

app.put('/api/studio/theme', requireRootAdmin('settings:write'), (req, res) => {
  const updates = req.body || {};
  for (const urlField of ['custom_wallpaper_url', 'logo_url', 'favicon_url', 'auth_bg_url']) {
    if (updates[urlField] !== undefined && !validateSafeMediaUrl(String(updates[urlField]))) {
      return res.status(400).json({ error: `Invalid or unsafe URL for ${urlField}` });
    }
  }
  if (updates.custom_css !== undefined && containsDangerousCss(String(updates.custom_css))) {
    return res.status(400).json({ error: 'Custom CSS contains forbidden constructs (<script>, expression, @import url)' });
  }
  const safeTextFields = ['panel_name', 'preset_name', 'auth_heading', 'auth_subtitle'];
  for (const tf of safeTextFields) {
    if (typeof updates[tf] === 'string') {
      updates[tf] = stripHtmlTags(updates[tf]).slice(0, 120);
    }
  }
  if (updates.announcement_banner && typeof updates.announcement_banner.text === 'string') {
    updates.announcement_banner = {
      ...updates.announcement_banner,
      text: stripHtmlTags(updates.announcement_banner.text).slice(0, 300),
    };
  }

  db.theme = { ...db.theme, ...updates };
  saveState(db);
  recordActivity(req.user, null, 'studio:theme.update', 'Updated Customization Studio theme configuration', getClientIp(req));
  return res.json(db.theme);
});

app.post('/api/studio/theme/reset', requireRootAdmin('settings:write'), (req, res) => {
  db.theme = createDefaultTheme();
  saveState(db);
  recordActivity(req.user, null, 'studio:theme.reset', 'Reset Customization Studio theme to defaults', getClientIp(req));
  return res.json(db.theme);
});

// ============================================================================
// Blueprint Extension Framework (Admin-Only Write, Authenticated Read)
// ============================================================================

app.get('/api/blueprint/extensions', requireAuth, (req, res) => {
  return res.json({ data: db.blueprint_extensions || [] });
});

app.post('/api/blueprint/extensions/toggle', requireRootAdmin('settings:write'), (req, res) => {
  const { id, enabled } = req.body || {};
  const ext = (db.blueprint_extensions || []).find(e => e.id === id);
  if (!ext) return res.status(404).json({ error: 'Extension not found' });
  ext.enabled = Boolean(enabled);
  saveState(db);
  recordActivity(req.user, null, 'blueprint:toggle', `${ext.enabled ? 'Enabled' : 'Disabled'} extension "${ext.name}"`, getClientIp(req));
  return res.json({ success: true, extension: ext });
});

app.post('/api/blueprint/upload', requireRootAdmin('settings:write'), (req, res) => {
  const src = req.body?.manifest && typeof req.body.manifest === 'object' ? req.body.manifest : (req.body || {});
  const { name, version = '1.0.0', author = 'Community', description = '' } = src;
  const cleanName = stripHtmlTags(String(name || '')).trim();
  if (!cleanName) return res.status(400).json({ error: 'Extension name is required' });
  const ext = {
    id: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + crypto.randomBytes(2).toString('hex'),
    name: cleanName,
    version: stripHtmlTags(version).slice(0, 24),
    author: stripHtmlTags(author).slice(0, 64),
    description: stripHtmlTags(description).slice(0, 240),
    target: 'v1.0.0',
    icon: 'Package',
    enabled: true,
    installed_at: new Date().toISOString().slice(0, 10),
  };
  db.blueprint_extensions.push(ext);
  saveState(db);
  recordActivity(req.user, null, 'blueprint:install', `Installed extension "${cleanName}"`, getClientIp(req));
  return res.status(201).json({ success: true, extension: ext });
});

// ============================================================================
// Client Account, Security (Password & 2FA), API Keys, SSH Keys, Regions
// ============================================================================

app.get('/api/client/account', requireAuth, (req, res) => {
  return res.json(sanitizeUser(req.user));
});

app.put('/api/client/account/email', requireAuth, accountMutationLimiter, (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }
  if (!password || !verifyPassword(password, req.user.password_hash)) {
    return res.status(403).json({ error: 'Current password is incorrect.' });
  }
  if (db.users.some(u => u.id !== req.user.id && u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ error: 'Email already in use.' });
  }
  req.user.email = cleanEmail;
  saveState(db);
  recordActivity(req.user, null, 'account:email.update', `Updated email to ${cleanEmail}`, getClientIp(req));
  return res.json(sanitizeUser(req.user));
});

app.put('/api/client/account/password', requireAuth, accountMutationLimiter, (req, res) => {
  const { current_password, password, password_confirmation } = req.body || {};
  if (!current_password || !verifyPassword(current_password, req.user.password_hash)) {
    return res.status(403).json({ error: 'Current password is incorrect.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }
  if (password_confirmation !== undefined && password !== password_confirmation) {
    return res.status(400).json({ error: 'Password confirmation does not match.' });
  }
  req.user.password_hash = hashPassword(password);
  req.user.token_version = (req.user.token_version || 1) + 1;
  saveState(db);
  const csrfToken = setSessionCookie(res, req.user);
  recordActivity(req.user, null, 'account:password.update', 'Updated account password', getClientIp(req));
  return res.json({ success: true, csrfToken });
});

app.post('/api/client/account/two-factor', requireAuth, accountMutationLimiter, (req, res) => {
  if (req.body?.code) {
    // Enable 2FA when code supplied against pending or existing secret
    const pendingSecret = req.user.pending_two_factor_secret || req.user.two_factor_secret;
    if (!pendingSecret || !verifyTotpCode(pendingSecret, req.body.code)) {
      return res.status(400).json({ error: 'Invalid 6-digit verification code.' });
    }
    req.user.two_factor_secret = pendingSecret;
    delete req.user.pending_two_factor_secret;
    req.user.two_factor_enabled = true;
    saveState(db);
    recordActivity(req.user, null, 'account:2fa.enable', 'Enabled two-factor authentication', getClientIp(req));
    return res.json({ enabled: true });
  }

  const secret = generateTotpSecret();
  req.user.pending_two_factor_secret = secret;
  saveState(db);
  const otpauth = buildOtpAuthUri(req.user.email, db.theme.panel_name || 'SlayerNode', secret);
  return res.json({ secret, otpauth_uri: otpauth, enabled: false });
});

app.delete('/api/client/account/two-factor', requireAuth, accountMutationLimiter, (req, res) => {
  const { password } = req.body || {};
  if (req.user.two_factor_enabled && (!password || !verifyPassword(password, req.user.password_hash))) {
    return res.status(403).json({ error: 'Valid password is required to disable 2FA.' });
  }
  req.user.two_factor_enabled = false;
  req.user.two_factor_secret = '';
  delete req.user.pending_two_factor_secret;
  saveState(db);
  recordActivity(req.user, null, 'account:2fa.disable', 'Disabled two-factor authentication', getClientIp(req));
  return res.json({ enabled: false });
});

app.get('/api/client/account/api-keys', requireAuth, (req, res) => {
  const keys = (db.client_api_keys || [])
    .filter(k => String(k.user_id) === String(req.user.id) && !k.revoked_at)
    .map(k => ({
      identifier: k.identifier,
      description: k.description,
      allowed_ips: k.allowed_ips || [],
      permissions: k.permissions || ['*'],
      last_used_at: k.last_used_at || null,
      created_at: k.created_at,
    }));
  return res.json({ data: keys });
});

app.post('/api/client/account/api-keys', requireAuth, accountMutationLimiter, (req, res) => {
  const { description, allowed_ips = [], permissions = ['*'] } = req.body || {};
  const cleanDesc = stripHtmlTags(String(description || '')).trim();
  if (!cleanDesc) return res.status(400).json({ error: 'API key description is required.' });
  if (hasSqlInjection(cleanDesc)) return res.status(400).json({ error: 'Invalid API key description.' });

  const identifier = crypto.randomBytes(6).toString('hex');
  const rawToken = `ptlc_${crypto.randomBytes(24).toString('hex')}`;
  const cleanIps = Array.isArray(allowed_ips)
    ? allowed_ips.map(i => String(i).trim()).filter(Boolean)
    : String(allowed_ips || '').split(',').map(i => i.trim()).filter(Boolean);

  const keyRecord = {
    identifier,
    user_id: req.user.id,
    description: cleanDesc.slice(0, 100),
    allowed_ips: cleanIps,
    permissions: Array.isArray(permissions) && permissions.length ? permissions : ['*'],
    token_hash: hashApiToken(rawToken),
    last_used_at: null,
    revoked_at: null,
    created_at: new Date().toISOString(),
  };

  db.client_api_keys.push(keyRecord);
  saveState(db);
  recordActivity(req.user, null, 'api-key:create', `Generated client API key "${keyRecord.description}"`, getClientIp(req));

  return res.status(201).json({
    identifier: keyRecord.identifier,
    description: keyRecord.description,
    allowed_ips: keyRecord.allowed_ips,
    permissions: keyRecord.permissions,
    secret_token: rawToken,
    created_at: keyRecord.created_at,
  });
});

app.delete('/api/client/account/api-keys/:identifier', requireAuth, (req, res) => {
  const key = (db.client_api_keys || []).find(
    k => k.identifier === req.params.identifier && String(k.user_id) === String(req.user.id) && !k.revoked_at
  );
  if (!key) return res.status(404).json({ error: 'API key not found.' });
  key.revoked_at = new Date().toISOString();
  saveState(db);
  recordActivity(req.user, null, 'api-key:delete', `Revoked client API key ${key.identifier}`, getClientIp(req));
  return res.status(204).end();
});

app.get('/api/client/account/ssh-keys', requireAuth, (req, res) => {
  const keys = (db.ssh_keys || []).filter(k => String(k.user_id) === String(req.user.id));
  return res.json({ data: keys });
});

app.post('/api/client/account/ssh-keys', requireAuth, accountMutationLimiter, (req, res) => {
  const { name, public_key } = req.body || {};
  const cleanName = stripHtmlTags(String(name || '')).trim();
  const cleanKey = String(public_key || '').trim();
  if (!cleanName || !/^(ssh-(rsa|ed25519|dss)|ecdsa-sha2-nistp\d+)\s+[A-Za-z0-9+/=]+/.test(cleanKey)) {
    return res.status(400).json({ error: 'Valid SSH key name and public key are required.' });
  }
  const keyBodyB64 = cleanKey.split(/\s+/)[1] || '';
  const fingerprint = `SHA256:${crypto.createHash('sha256').update(Buffer.from(keyBodyB64, 'base64')).digest('base64').replace(/=+$/, '')}`;
  const entry = {
    id: nextId(db.ssh_keys),
    user_id: req.user.id,
    name: cleanName.slice(0, 64),
    public_key: cleanKey,
    fingerprint,
    created_at: new Date().toISOString(),
  };
  db.ssh_keys.push(entry);
  saveState(db);
  recordActivity(req.user, null, 'ssh-key:create', `Added SSH key "${entry.name}" (${fingerprint.slice(0, 22)}...)`, getClientIp(req));
  return res.status(201).json(entry);
});

app.delete('/api/client/account/ssh-keys/:fingerprint', requireAuth, (req, res) => {
  const fp = decodeURIComponent(req.params.fingerprint);
  const idx = (db.ssh_keys || []).findIndex(
    k => (k.fingerprint === fp || String(k.id) === fp) && String(k.user_id) === String(req.user.id)
  );
  if (idx === -1) return res.status(404).json({ error: 'SSH key not found.' });
  const [removed] = db.ssh_keys.splice(idx, 1);
  saveState(db);
  recordActivity(req.user, null, 'ssh-key:delete', `Removed SSH key ${removed.fingerprint}`, getClientIp(req));
  return res.status(204).end();
});

app.get('/api/client/account/activity', requireAuth, (req, res) => {
  const logs = (db.activity_logs || []).filter(
    l => req.user.root_admin || String(l.user_id) === String(req.user.id)
  );
  return res.json({ data: logs.slice(0, 100) });
});

app.get('/api/client/regions', requireAuth, async (req, res) => {
  const results = await Promise.all(
    db.nodes.map(async n => {
      const health = await probeNodeHealth(n, 1200);
      n.is_online = health.is_online;
      n.daemon_version = health.daemon_version;
      n.latency_ms = health.latency_ms;
      const loc = db.locations.find(l => String(l.id) === String(n.location_id));
      return {
        id: n.id,
        name: n.name,
        location: loc ? loc.short : 'local',
        fqdn: n.fqdn,
        status: health.is_online ? 'online' : 'offline',
        latency_ms: health.latency_ms,
        daemon_version: health.daemon_version,
      };
    })
  );
  return res.json({ data: results });
});

// ============================================================================
// Client Server Endpoints (Strictly Isolated & Permission-Enforced)
// ============================================================================

app.get('/api/client/servers', requireAuth, async (req, res) => {
  const accessible = db.servers.filter(s => userCanAccessServer(req.user, s));

  // Sync live statuses across active local nodes with a quick stats pull
  const byNode = new Map();
  for (const srv of accessible) {
    const node = getServerNode(db, srv);
    if (!node) continue;
    if (!byNode.has(node.id)) byNode.set(node.id, { node, servers: [] });
    byNode.get(node.id).servers.push(srv);
  }
  await Promise.all(
    Array.from(byNode.values()).map(async ({ node }) => {
      try {
        const listRes = await daemonRequest(node, '/api/servers', { timeoutMs: 1200 });
        for (const item of (listRes.data || [])) {
          const srv = db.servers.find(s => s.uuid === item.uuid);
          const itemState = item.state || item.status || 'offline';
          if (srv) {
            srv.status = itemState === 'running' ? 'running' : itemState;
          }
          const stats = item.telemetry || item.stats;
          if (stats) {
            liveStatsCache.set(item.uuid, { ...stats, updated_at: Date.now() });
          }
        }
      } catch {}
    })
  );

  return res.json({ data: accessible.map(buildCanonicalServer) });
});

app.get('/api/client/servers/:uuid', verifyServerOwnership(), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  if (node) {
    try {
      const statsRes = await daemonRequest(node, `/api/servers/${srv.uuid}/stats`, { timeoutMs: 1200 });
      const stats = statsRes?.data || statsRes;
      if (stats?.state) {
        srv.status = stats.state === 'running' ? 'running' : stats.state;
        liveStatsCache.set(srv.uuid, { ...stats, updated_at: Date.now() });
      }
    } catch {}
  }
  return res.json(buildCanonicalServer(srv));
});

app.get('/api/client/servers/:uuid/resources', verifyServerOwnership(), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  if (!node) return res.status(404).json({ error: 'Assigned node unavailable.' });

  try {
    const raw = await daemonRequest(node, `/api/servers/${srv.uuid}/stats`, { timeoutMs: 1500 });
    const stats = raw?.data || raw;
    srv.status = stats.state === 'running' ? 'running' : (stats.state || 'offline');
    liveStatsCache.set(srv.uuid, { ...stats, updated_at: Date.now() });
    return res.json(stats);
  } catch {
    const cached = liveStatsCache.get(srv.uuid);
    return res.json({
      memory_bytes: cached?.memory_bytes || 0,
      memory_limit_bytes: (srv.limits?.memory || 512) * 1024 * 1024,
      cpu_absolute: cached?.cpu_absolute || 0,
      disk_bytes: cached?.disk_bytes || 0,
      disk_limit_bytes: (srv.limits?.disk || 1024) * 1024 * 1024,
      network: cached?.network || { rx_bytes: 0, tx_bytes: 0 },
      uptime_ms: cached?.uptime_ms || 0,
      state: srv.status || 'offline',
    });
  }
});

app.get('/api/client/servers/:uuid/logs', verifyServerOwnership('control.console'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  if (!node) return res.json({ logs: [] });
  try {
    const data = await daemonRequest(node, `/api/servers/${srv.uuid}/logs`, { timeoutMs: 3000 });
    return res.json({ logs: Array.isArray(data.logs) ? data.logs : [] });
  } catch (err) {
    return res.json({ logs: [`[SlayerPanel] Node ${node.name} unreachable: ${err.message}`] });
  }
});

app.get('/api/client/servers/:uuid/websocket', verifyServerOwnership('control.console'), (req, res) => {
  const srv = req.targetServer;
  const token = createWsToken(req.user, srv.uuid, 180);
  return res.json({
    data: {
      token,
      socket: `/api/client/servers/${srv.uuid}/ws`,
    },
  });
});

app.post('/api/client/servers/:uuid/power', verifyServerOwnership(), powerLimiter, async (req, res) => {
  const srv = req.targetServer;
  const action = String(req.body?.action || '').toLowerCase();
  const permMap = {
    start: 'control.start',
    stop: 'control.stop',
    restart: 'control.restart',
    kill: 'control.stop',
  };
  if (!permMap[action]) {
    return res.status(400).json({ error: 'Invalid power action. Must be start, stop, restart, or kill.' });
  }
  if (!userCanAccessServer(req.user, srv, permMap[action])) {
    return res.status(403).json({ error: `Permission denied for action: ${action}` });
  }
  if (req.authType === 'client_api_key' && !clientKeyHasPerm(req.apiKey, permMap[action])) {
    return res.status(403).json({ error: `Client API key lacks permission: ${permMap[action]}` });
  }
  if (srv.suspended) {
    return res.status(403).json({ error: 'Server is currently suspended.' });
  }

  const node = getServerNode(db, srv);
  if (!node) return res.status(404).json({ error: 'Assigned node unavailable.' });
  const primaryAlloc = db.allocations.find(a => String(a.id) === String(srv.allocation_id));

  try {
    await daemonRequest(node, `/api/servers/${srv.uuid}/power`, {
      method: 'POST',
      timeoutMs: 120_000, // Accommodates initial PaperMC JAR download on start
      body: {
        action,
        egg_name: srv.egg_name,
        port: primaryAlloc?.port || srv.environment?.SERVER_PORT || 25565,
        memory: srv.limits?.memory || 1024,
        swap: srv.limits?.swap || 0,
        disk: srv.limits?.disk || 10240,
        cpu: srv.limits?.cpu || 100,
        dl_path: srv.environment?.DL_PATH || '',
        startup: srv.startup || '',
        environment: srv.environment || {},
      },
    });
    srv.status = action === 'start' || action === 'restart' ? 'running' : 'offline';
    saveState(db);
    recordActivity(req.user, srv.uuid, `server:power.${action}`, `Sent power signal "${action}"`, getClientIp(req));
    return res.json({ success: true, action, status: srv.status });
  } catch (err) {
    return res.status(502).json({ error: `Daemon power action failed: ${err.message}` });
  }
});

app.post('/api/client/servers/:uuid/command', verifyServerOwnership('control.console'), commandLimiter, async (req, res) => {
  const srv = req.targetServer;
  if (srv.suspended) return res.status(403).json({ error: 'Server is suspended.' });

  const command = String(req.body?.command || '').replace(/[\r\n]+/g, ' ').trim();
  if (!command || command.length > 500) {
    return res.status(400).json({ error: 'Command must be between 1 and 500 characters.' });
  }

  const node = getServerNode(db, srv);
  if (!node) return res.status(404).json({ error: 'Assigned node unavailable.' });

  try {
    const result = await daemonRequest(node, `/api/servers/${srv.uuid}/commands`, {
      method: 'POST',
      body: { commands: [command] },
    });
    recordActivity(req.user, srv.uuid, 'server:console.command', `Dispatched console command`, getClientIp(req));
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.message });
  }
});

// ---------------- File Manager Endpoints ----------------

app.get('/api/client/servers/:uuid/files/list', verifyServerOwnership('file.read'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  if (!node) return res.status(404).json({ error: 'Node missing.' });
  const dir = String(req.query.directory || '/');
  try {
    const data = await daemonRequest(node, `/api/servers/${srv.uuid}/files/list?directory=${encodeURIComponent(dir)}`);
    return res.json(data);
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.message });
  }
});

app.get('/api/client/servers/:uuid/files/contents', verifyServerOwnership('file.read'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  if (!node) return res.status(404).json({ error: 'Node missing.' });
  const file = String(req.query.file || '');
  try {
    const upstream = await daemonRequest(node, `/api/servers/${srv.uuid}/files/contents?file=${encodeURIComponent(file)}`, {
      rawResponse: true,
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      let errMsg = upstream.statusText || `HTTP ${upstream.status}`;
      try {
        const parsed = JSON.parse(text);
        errMsg = parsed?.error || parsed?.detail || errMsg;
      } catch {}
      return res.status(upstream.status || 404).json({ error: errMsg });
    }
    return res.json({ content: text });
  } catch (err) {
    return res.status(err.status || 404).json({ error: err.message });
  }
});

app.get('/api/client/servers/:uuid/files/download', verifyServerOwnership('file.read'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  if (!node) return res.status(404).json({ error: 'Node missing.' });
  const file = String(req.query.file || '');
  try {
    const upstream = await daemonRequest(node, `/api/servers/${srv.uuid}/files/download?file=${encodeURIComponent(file)}`, {
      rawResponse: true,
      timeoutMs: 60_000,
    });
    if (!upstream.ok) {
      const msg = await upstream.text().catch(() => upstream.statusText);
      return res.status(upstream.status).json({ error: msg });
    }
    const safeName = path.basename(file).replace(/["\r\n]/g, '_') || 'download';
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    const buf = Buffer.from(await upstream.arrayBuffer());
    return res.send(buf);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

app.post('/api/client/servers/:uuid/files/write', verifyServerOwnership('file.update'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  if (!node) return res.status(404).json({ error: 'Node missing.' });
  const { file, content = '', encoding = 'utf8' } = req.body || {};
  if (!file) return res.status(400).json({ error: 'File path is required.' });
  try {
    const result = await daemonRequest(node, `/api/servers/${srv.uuid}/files/write`, {
      method: 'POST',
      timeoutMs: 60_000,
      body: { file, content, encoding },
    });
    recordActivity(req.user, srv.uuid, 'server:file.write', `Saved file ${file}`, getClientIp(req));
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
});

app.post('/api/client/servers/:uuid/files/create-folder', verifyServerOwnership('file.create'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  if (!node) return res.status(404).json({ error: 'Node missing.' });
  const { root = '/', name } = req.body || {};
  try {
    const result = await daemonRequest(node, `/api/servers/${srv.uuid}/files/create-folder`, {
      method: 'POST',
      body: { root, name },
    });
    recordActivity(req.user, srv.uuid, 'server:file.mkdir', `Created folder ${name} in ${root}`, getClientIp(req));
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
});

app.post('/api/client/servers/:uuid/files/rename', verifyServerOwnership('file.update'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  if (!node) return res.status(404).json({ error: 'Node missing.' });
  try {
    const result = await daemonRequest(node, `/api/servers/${srv.uuid}/files/rename`, {
      method: 'POST',
      body: req.body,
    });
    recordActivity(req.user, srv.uuid, 'server:file.rename', 'Renamed server file/folder', getClientIp(req));
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
});

app.post('/api/client/servers/:uuid/files/delete', verifyServerOwnership('file.delete'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  if (!node) return res.status(404).json({ error: 'Node missing.' });
  const { files = [] } = req.body || {};
  try {
    const result = await daemonRequest(node, `/api/servers/${srv.uuid}/files/delete`, {
      method: 'POST',
      body: { files },
    });
    recordActivity(req.user, srv.uuid, 'server:file.delete', `Deleted ${files.length} file(s)`, getClientIp(req));
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
});

app.post('/api/client/servers/:uuid/files/compress', verifyServerOwnership('file.archive'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  if (!node) return res.status(404).json({ error: 'Node missing.' });
  try {
    const result = await daemonRequest(node, `/api/servers/${srv.uuid}/files/compress`, {
      method: 'POST',
      timeoutMs: 60_000,
      body: req.body,
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
});

app.post('/api/client/servers/:uuid/files/decompress', verifyServerOwnership('file.archive'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  if (!node) return res.status(404).json({ error: 'Node missing.' });
  try {
    const result = await daemonRequest(node, `/api/servers/${srv.uuid}/files/decompress`, {
      method: 'POST',
      timeoutMs: 60_000,
      body: req.body,
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
});

app.post('/api/client/servers/:uuid/files/pull', verifyServerOwnership('file.create'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  if (!node) return res.status(404).json({ error: 'Node missing.' });
  const { url, directory = '/', filename = '' } = req.body || {};
  try {
    const safeUrl = await assertSafeExternalUrl(url);
    const result = await daemonRequest(node, `/api/servers/${srv.uuid}/files/pull`, {
      method: 'POST',
      timeoutMs: 60_000,
      body: { url: safeUrl, directory, filename },
    });
    recordActivity(req.user, srv.uuid, 'server:file.pull', `Pulled external file into ${directory}`, getClientIp(req));
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
});

// ---------------- Per-Server Databases CRUD ----------------

app.get('/api/client/servers/:uuid/databases', verifyServerOwnership('database.read'), (req, res) => {
  const list = (db.databases || []).filter(d => d.server_uuid === req.targetServer.uuid);
  return res.json({ data: list, limit: req.targetServer.feature_limits?.databases ?? 2 });
});

app.post('/api/client/servers/:uuid/databases', verifyServerOwnership('database.create'), (req, res) => {
  const srv = req.targetServer;
  const existing = (db.databases || []).filter(d => d.server_uuid === srv.uuid);
  const limit = srv.feature_limits?.databases ?? 2;
  if (limit > 0 && existing.length >= limit) {
    return res.status(400).json({ error: `Database limit reached (${limit} max).` });
  }
  const cleanName = stripHtmlTags(String(req.body?.database || '')).replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 32);
  if (!cleanName || cleanName.length < 2) {
    return res.status(400).json({ error: 'Database name must be at least 2 alphanumeric/underscore characters.' });
  }
  const dbRecord = {
    id: nextId(db.databases),
    server_uuid: srv.uuid,
    name: `s${srv.id}_${cleanName}`,
    username: `u${srv.id}_${crypto.randomBytes(3).toString('hex')}`,
    password: crypto.randomBytes(16).toString('base64url'),
    host: '127.0.0.1',
    port: 3306,
    remote: String(req.body?.remote || '%').slice(0, 32),
    max_connections: 0,
    created_at: new Date().toISOString(),
  };
  db.databases.push(dbRecord);
  saveState(db);
  recordActivity(req.user, srv.uuid, 'server:database.create', `Provisioned database ${dbRecord.name}`, getClientIp(req));
  return res.status(201).json(dbRecord);
});

app.post('/api/client/servers/:uuid/databases/:dbId/rotate-password', verifyServerOwnership('database.update'), (req, res) => {
  const dbRecord = (db.databases || []).find(
    d => String(d.id) === String(req.params.dbId) && d.server_uuid === req.targetServer.uuid
  );
  if (!dbRecord) return res.status(404).json({ error: 'Database not found.' });
  dbRecord.password = crypto.randomBytes(16).toString('base64url');
  saveState(db);
  recordActivity(req.user, req.targetServer.uuid, 'server:database.rotate', `Rotated password for ${dbRecord.name}`, getClientIp(req));
  return res.json(dbRecord);
});

app.delete('/api/client/servers/:uuid/databases/:dbId', verifyServerOwnership('database.delete'), (req, res) => {
  const idx = (db.databases || []).findIndex(
    d => String(d.id) === String(req.params.dbId) && d.server_uuid === req.targetServer.uuid
  );
  if (idx === -1) return res.status(404).json({ error: 'Database not found.' });
  const [removed] = db.databases.splice(idx, 1);
  saveState(db);
  recordActivity(req.user, req.targetServer.uuid, 'server:database.delete', `Deleted database ${removed.name}`, getClientIp(req));
  return res.status(204).end();
});

// ---------------- Per-Server Schedules CRUD & Real Executor ----------------

app.get('/api/client/servers/:uuid/schedules', verifyServerOwnership('schedule.read'), (req, res) => {
  const list = (db.schedules || []).filter(s => s.server_uuid === req.targetServer.uuid);
  return res.json({ data: list });
});

app.post('/api/client/servers/:uuid/schedules', verifyServerOwnership('schedule.create'), (req, res) => {
  const srv = req.targetServer;
  const {
    name,
    minute = '0',
    hour = '4',
    day_of_month = '*',
    month = '*',
    day_of_week = '*',
    is_active = true,
    tasks = [],
  } = req.body || {};
  const cleanName = stripHtmlTags(String(name || '')).trim();
  if (!cleanName) return res.status(400).json({ error: 'Schedule name is required.' });

  const normalizedTasks = Array.isArray(tasks)
    ? tasks.map((t, idx) => ({
        id: idx + 1,
        sequence_id: idx + 1,
        action: ['command', 'power', 'backup'].includes(t.action) ? t.action : 'command',
        payload: String(t.payload || '').slice(0, 300),
        time_offset: Math.max(0, Math.min(300, Number(t.time_offset) || 0)),
      }))
    : [];

  const schedule = {
    id: nextId(db.schedules),
    server_uuid: srv.uuid,
    name: cleanName.slice(0, 64),
    cron: {
      minute: String(minute || '*'),
      hour: String(hour || '*'),
      day_of_month: String(day_of_month || '*'),
      month: String(month || '*'),
      day_of_week: String(day_of_week || '*'),
    },
    is_active: Boolean(is_active),
    is_processing: false,
    only_when_online: Boolean(req.body?.only_when_online),
    last_run_at: null,
    tasks: normalizedTasks,
    created_at: new Date().toISOString(),
  };
  db.schedules.push(schedule);
  saveState(db);
  recordActivity(req.user, srv.uuid, 'server:schedule.create', `Created schedule "${schedule.name}"`, getClientIp(req));
  return res.status(201).json(schedule);
});

app.put('/api/client/servers/:uuid/schedules/:id', verifyServerOwnership('schedule.update'), (req, res) => {
  const sched = (db.schedules || []).find(
    s => String(s.id) === String(req.params.id) && s.server_uuid === req.targetServer.uuid
  );
  if (!sched) return res.status(404).json({ error: 'Schedule not found.' });
  const { name, minute, hour, day_of_month, month, day_of_week, is_active, tasks } = req.body || {};
  if (name !== undefined) sched.name = stripHtmlTags(String(name)).trim().slice(0, 64);
  if (is_active !== undefined) sched.is_active = Boolean(is_active);
  sched.cron = {
    minute: minute !== undefined ? String(minute) : sched.cron.minute,
    hour: hour !== undefined ? String(hour) : sched.cron.hour,
    day_of_month: day_of_month !== undefined ? String(day_of_month) : sched.cron.day_of_month,
    month: month !== undefined ? String(month) : sched.cron.month,
    day_of_week: day_of_week !== undefined ? String(day_of_week) : sched.cron.day_of_week,
  };
  if (Array.isArray(tasks)) {
    sched.tasks = tasks.map((t, idx) => ({
      id: idx + 1,
      sequence_id: idx + 1,
      action: ['command', 'power', 'backup'].includes(t.action) ? t.action : 'command',
      payload: String(t.payload || '').slice(0, 300),
      time_offset: Math.max(0, Math.min(300, Number(t.time_offset) || 0)),
    }));
  }
  saveState(db);
  return res.json(sched);
});

app.post('/api/client/servers/:uuid/schedules/:id/execute', verifyServerOwnership('schedule.update'), async (req, res) => {
  const sched = (db.schedules || []).find(
    s => String(s.id) === String(req.params.id) && s.server_uuid === req.targetServer.uuid
  );
  if (!sched) return res.status(404).json({ error: 'Schedule not found.' });
  const result = await executeScheduleTasks(db, saveState, sched, recordActivity);
  if (result.error) return res.status(502).json({ error: result.error });
  return res.json({ success: true, executed: result.executed, schedule: sched });
});

app.delete('/api/client/servers/:uuid/schedules/:id', verifyServerOwnership('schedule.delete'), (req, res) => {
  const idx = (db.schedules || []).findIndex(
    s => String(s.id) === String(req.params.id) && s.server_uuid === req.targetServer.uuid
  );
  if (idx === -1) return res.status(404).json({ error: 'Schedule not found.' });
  const [removed] = db.schedules.splice(idx, 1);
  saveState(db);
  recordActivity(req.user, req.targetServer.uuid, 'server:schedule.delete', `Deleted schedule "${removed.name}"`, getClientIp(req));
  return res.status(204).end();
});

// ---------------- Per-Server Subusers & ACL CRUD ----------------

app.get('/api/client/servers/:uuid/users', verifyServerOwnership('user.read'), (req, res) => {
  const subs = (db.subusers || [])
    .filter(su => su.server_uuid === req.targetServer.uuid)
    .map(su => {
      const u = db.users.find(usr => String(usr.id) === String(su.user_id));
      return {
        uuid: su.uuid,
        user_id: su.user_id,
        username: u?.username || 'unknown',
        email: u?.email || '',
        permissions: su.permissions || [],
        created_at: su.created_at,
      };
    });
  return res.json({ data: subs });
});

app.post('/api/client/servers/:uuid/users', verifyServerOwnership('user.create'), (req, res) => {
  const srv = req.targetServer;
  const { email, permissions = [] } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const targetUser = db.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!targetUser) return res.status(404).json({ error: 'No registered user found with that email address.' });
  if (String(targetUser.id) === String(srv.owner_id || srv.user_id)) {
    return res.status(400).json({ error: 'Server owner already has full access.' });
  }
  if ((db.subusers || []).some(su => su.server_uuid === srv.uuid && String(su.user_id) === String(targetUser.id))) {
    return res.status(409).json({ error: 'User is already assigned as a subuser.' });
  }
  const sub = {
    uuid: crypto.randomUUID(),
    server_uuid: srv.uuid,
    user_id: targetUser.id,
    permissions: Array.isArray(permissions) ? permissions.map(String) : [],
    created_at: new Date().toISOString(),
  };
  db.subusers.push(sub);
  saveState(db);
  recordActivity(req.user, srv.uuid, 'server:subuser.create', `Added subuser ${targetUser.email}`, getClientIp(req));
  return res.status(201).json({ ...sub, username: targetUser.username, email: targetUser.email });
});

app.put('/api/client/servers/:uuid/users/:subUuid', verifyServerOwnership('user.update'), (req, res) => {
  const sub = (db.subusers || []).find(
    su => su.uuid === req.params.subUuid && su.server_uuid === req.targetServer.uuid
  );
  if (!sub) return res.status(404).json({ error: 'Subuser not found.' });
  if (Array.isArray(req.body?.permissions)) {
    sub.permissions = req.body.permissions.map(String);
  }
  saveState(db);
  recordActivity(req.user, req.targetServer.uuid, 'server:subuser.update', `Updated permissions for subuser ${sub.uuid}`, getClientIp(req));
  return res.json(sub);
});

app.delete('/api/client/servers/:uuid/users/:subUuid', verifyServerOwnership('user.delete'), (req, res) => {
  const idx = (db.subusers || []).findIndex(
    su => su.uuid === req.params.subUuid && su.server_uuid === req.targetServer.uuid
  );
  if (idx === -1) return res.status(404).json({ error: 'Subuser not found.' });
  db.subusers.splice(idx, 1);
  saveState(db);
  recordActivity(req.user, req.targetServer.uuid, 'server:subuser.delete', `Removed subuser ${req.params.subUuid}`, getClientIp(req));
  return res.status(204).end();
});

// ---------------- Per-Server Real Backups CRUD ----------------

app.get('/api/client/servers/:uuid/backups', verifyServerOwnership('backup.read'), (req, res) => {
  const list = (db.backups || []).filter(b => b.server_uuid === req.targetServer.uuid);
  return res.json({ data: list, limit: req.targetServer.feature_limits?.backups ?? 3 });
});

app.post('/api/client/servers/:uuid/backups', verifyServerOwnership('backup.create'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  if (!node) return res.status(404).json({ error: 'Node missing.' });

  const existing = (db.backups || []).filter(b => b.server_uuid === srv.uuid);
  const limit = srv.feature_limits?.backups ?? 3;
  if (limit > 0 && existing.length >= limit) {
    return res.status(400).json({ error: `Backup limit reached (${limit} max). Delete an older backup first.` });
  }

  const name = stripHtmlTags(String(req.body?.name || `Backup ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`)).trim();
  const isLocked = Boolean(req.body?.is_locked);
  const backupUuid = crypto.randomUUID();

  try {
    const result = await daemonRequest(node, `/api/servers/${srv.uuid}/backups`, {
      method: 'POST',
      timeoutMs: 120_000,
      body: { uuid: backupUuid, name },
    });
    const entry = {
      uuid: result.uuid || backupUuid,
      server_uuid: srv.uuid,
      name,
      ignored_files: String(req.body?.ignored_files || ''),
      sha256_hash: result.sha256_hash || '',
      bytes: result.bytes || 0,
      is_successful: true,
      is_locked: isLocked,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
    db.backups.unshift(entry);
    saveState(db);
    recordActivity(req.user, srv.uuid, 'server:backup.create', `Created backup "${name}" (${entry.bytes} bytes)`, getClientIp(req));
    return res.status(201).json(entry);
  } catch (err) {
    return res.status(502).json({ error: `Backup creation failed: ${err.message}` });
  }
});

app.post('/api/client/servers/:uuid/backups/:backupUuid/restore', verifyServerOwnership('backup.restore'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  const backup = (db.backups || []).find(b => b.uuid === req.params.backupUuid && b.server_uuid === srv.uuid);
  if (!backup) return res.status(404).json({ error: 'Backup not found.' });
  try {
    await daemonRequest(node, `/api/servers/${srv.uuid}/backups/${backup.uuid}/restore`, {
      method: 'POST',
      timeoutMs: 120_000,
      body: { truncate: Boolean(req.body?.truncate) },
    });
    recordActivity(req.user, srv.uuid, 'server:backup.restore', `Restored backup "${backup.name}"`, getClientIp(req));
    return res.json({ success: true });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

app.get('/api/client/servers/:uuid/backups/:backupUuid/download', verifyServerOwnership('backup.download'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  const backup = (db.backups || []).find(b => b.uuid === req.params.backupUuid && b.server_uuid === srv.uuid);
  if (!backup) return res.status(404).json({ error: 'Backup not found.' });
  try {
    const upstream = await daemonRequest(node, `/api/servers/${srv.uuid}/backups/${backup.uuid}/download`, {
      rawResponse: true,
      timeoutMs: 120_000,
    });
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'Download failed' });
    res.setHeader('Content-Disposition', `attachment; filename="backup-${backup.uuid.slice(0, 8)}.tar.gz"`);
    res.setHeader('Content-Type', 'application/gzip');
    const buf = Buffer.from(await upstream.arrayBuffer());
    return res.send(buf);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

app.delete('/api/client/servers/:uuid/backups/:backupUuid', verifyServerOwnership('backup.delete'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  const idx = (db.backups || []).findIndex(b => b.uuid === req.params.backupUuid && b.server_uuid === srv.uuid);
  if (idx === -1) return res.status(404).json({ error: 'Backup not found.' });
  if (db.backups[idx].is_locked) return res.status(400).json({ error: 'Locked backups cannot be deleted.' });

  const [removed] = db.backups.splice(idx, 1);
  if (node) {
    await daemonRequest(node, `/api/servers/${srv.uuid}/backups/${removed.uuid}`, { method: 'DELETE' }).catch(() => {});
  }
  saveState(db);
  recordActivity(req.user, srv.uuid, 'server:backup.delete', `Deleted backup "${removed.name}"`, getClientIp(req));
  return res.status(204).end();
});

// ---------------- Per-Server Network Allocations CRUD ----------------

app.get('/api/client/servers/:uuid/network/allocations', verifyServerOwnership('allocation.read'), (req, res) => {
  const srv = req.targetServer;
  const allocs = db.allocations
    .filter(a => String(a.server_id) === String(srv.id))
    .map(a => ({ ...a, is_default: String(a.id) === String(srv.allocation_id) }));
  return res.json({ data: allocs, limit: srv.feature_limits?.allocations ?? 2 });
});

app.post('/api/client/servers/:uuid/network/allocations', verifyServerOwnership('allocation.create'), (req, res) => {
  const srv = req.targetServer;
  const assigned = db.allocations.filter(a => String(a.server_id) === String(srv.id));
  const limit = srv.feature_limits?.allocations ?? 2;
  if (limit > 0 && assigned.length >= limit) {
    return res.status(400).json({ error: `Allocation limit reached (${limit} max).` });
  }
  const free = db.allocations.find(a => String(a.node_id) === String(srv.node_id) && !a.server_id);
  if (!free) return res.status(400).json({ error: 'No free ports available on this node.' });
  free.server_id = srv.id;
  free.assigned = true;
  saveState(db);
  recordActivity(req.user, srv.uuid, 'server:allocation.create', `Assigned allocation ${free.ip}:${free.port}`, getClientIp(req));
  return res.status(201).json({ ...free, is_default: String(free.id) === String(srv.allocation_id) });
});

app.post('/api/client/servers/:uuid/network/allocations/:allocId', verifyServerOwnership('allocation.update'), (req, res) => {
  const srv = req.targetServer;
  const alloc = db.allocations.find(a => String(a.id) === String(req.params.allocId) && String(a.server_id) === String(srv.id));
  if (!alloc) return res.status(404).json({ error: 'Allocation not found.' });
  if (req.body?.notes !== undefined) alloc.notes = stripHtmlTags(String(req.body.notes)).slice(0, 200);
  saveState(db);
  return res.json({ ...alloc, is_default: String(alloc.id) === String(srv.allocation_id) });
});

app.post('/api/client/servers/:uuid/network/allocations/:allocId/primary', verifyServerOwnership('allocation.update'), (req, res) => {
  const srv = req.targetServer;
  const alloc = db.allocations.find(a => String(a.id) === String(req.params.allocId) && String(a.server_id) === String(srv.id));
  if (!alloc) return res.status(404).json({ error: 'Allocation not found.' });
  srv.allocation_id = alloc.id;
  srv.environment = { ...(srv.environment || {}), SERVER_PORT: String(alloc.port) };
  saveState(db);
  recordActivity(req.user, srv.uuid, 'server:allocation.primary', `Set primary allocation to ${alloc.ip}:${alloc.port}`, getClientIp(req));
  return res.json({ ...alloc, is_default: true });
});

app.delete('/api/client/servers/:uuid/network/allocations/:allocId', verifyServerOwnership('allocation.delete'), (req, res) => {
  const srv = req.targetServer;
  const alloc = db.allocations.find(a => String(a.id) === String(req.params.allocId) && String(a.server_id) === String(srv.id));
  if (!alloc) return res.status(404).json({ error: 'Allocation not found.' });
  if (String(alloc.id) === String(srv.allocation_id)) {
    return res.status(400).json({ error: 'Cannot delete primary allocation.' });
  }
  alloc.server_id = null;
  alloc.assigned = false;
  alloc.notes = '';
  saveState(db);
  recordActivity(req.user, srv.uuid, 'server:allocation.delete', `Released allocation ${alloc.ip}:${alloc.port}`, getClientIp(req));
  return res.status(204).end();
});

// ---------------- Startup, Settings & Server-Scoped Activity ----------------

app.get('/api/client/servers/:uuid/startup', verifyServerOwnership('startup.read'), (req, res) => {
  const srv = req.targetServer;
  const egg = db.eggs.find(e => String(e.id) === String(srv.egg_id));
  const rawVars = srv.variables && srv.variables.length > 0 ? srv.variables : (egg?.variables || []);
  const variables = rawVars.map(v => ({
    ...v,
    server_value: srv.environment?.[v.env_variable] ?? v.server_value ?? v.default_value ?? '',
  }));
  return res.json({
    startup_command: srv.startup || egg?.startup || '',
    docker_image: srv.docker_image || (egg?.docker_images ? egg.docker_images.split('\n')[0] : ''),
    variables,
  });
});

app.put('/api/client/servers/:uuid/startup/variable', verifyServerOwnership('startup.update'), (req, res) => {
  const srv = req.targetServer;
  const { key, value, startup_command, docker_image } = req.body || {};

  // Admin can update full startup command directly; standard owner/subuser edits editable variables only
  if (startup_command !== undefined && req.user.root_admin) {
    srv.startup = String(startup_command).slice(0, 500);
  }
  if (docker_image !== undefined) {
    srv.docker_image = stripHtmlTags(String(docker_image)).slice(0, 180);
  }

  if (key) {
    const cleanKey = String(key).trim();
    if (!/^[A-Z0-9_]{1,40}$/.test(cleanKey)) {
      return res.status(400).json({ error: 'Invalid environment variable identifier.' });
    }
    const cleanVal = String(value ?? '').replace(/[\r\n]/g, '').slice(0, 500);
    // Prevent shell metacharacter injection in startup env variables
    if (/[`$;|&<>]/.test(cleanVal) && !cleanKey.includes('DL_PATH')) {
      return res.status(400).json({ error: 'Disallowed shell characters in variable value.' });
    }
    srv.environment = { ...(srv.environment || {}), [cleanKey]: cleanVal };
    if (Array.isArray(srv.variables)) {
      const varRec = srv.variables.find(v => v.env_variable === cleanKey);
      if (varRec) varRec.server_value = cleanVal;
    }
    recordActivity(req.user, srv.uuid, 'server:startup.update', `Updated variable ${cleanKey}`, getClientIp(req));
  }

  saveState(db);
  return res.json({ success: true, environment: srv.environment, startup_command: srv.startup });
});

app.put('/api/client/servers/:uuid/settings/rename', verifyServerOwnership('settings.rename'), (req, res) => {
  const srv = req.targetServer;
  const { name, description } = req.body || {};
  const cleanName = stripHtmlTags(String(name || '')).trim();
  if (!cleanName || cleanName.length < 2) {
    return res.status(400).json({ error: 'Server name must be at least 2 characters.' });
  }
  srv.name = cleanName.slice(0, 64);
  if (description !== undefined) {
    srv.description = stripHtmlTags(String(description)).slice(0, 240);
  }
  saveState(db);
  recordActivity(req.user, srv.uuid, 'server:settings.rename', `Renamed server to "${srv.name}"`, getClientIp(req));
  return res.json(buildCanonicalServer(srv));
});

app.post('/api/client/servers/:uuid/settings/reinstall', verifyServerOwnership('settings.reinstall'), async (req, res) => {
  const srv = req.targetServer;
  const node = getServerNode(db, srv);
  if (!node) return res.status(404).json({ error: 'Assigned node unavailable.' });
  const primaryAlloc = db.allocations.find(a => String(a.id) === String(srv.allocation_id));
  try {
    await daemonRequest(node, '/api/servers', {
      method: 'POST',
      body: {
        uuid: srv.uuid,
        name: srv.name,
        memory: srv.limits?.memory || 1024,
        swap: srv.limits?.swap || 0,
        disk: srv.limits?.disk || 10240,
        cpu: srv.limits?.cpu || 100,
        port: primaryAlloc?.port || 25565,
        egg_name: srv.egg_name,
        dl_path: srv.environment?.DL_PATH || '',
        startup: srv.startup || '',
        environment: srv.environment || {},
      },
    });
    recordActivity(req.user, srv.uuid, 'server:settings.reinstall', 'Triggered server re-install on daemon', getClientIp(req));
    return res.json({ success: true });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

app.get('/api/client/servers/:uuid/activity', verifyServerOwnership(), (req, res) => {
  const srv = req.targetServer;
  const logs = (db.activity_logs || []).filter(l => l.server_uuid === srv.uuid);
  return res.json({ data: logs.slice(0, 100) });
});

// Register all per-server Addon endpoints
registerAddonRoutes(app, { getDb, saveState, verifyServerOwnership, recordActivity });

// ============================================================================
// Application / Admin Endpoints (Strictly Root Admin Enforced!)
// ============================================================================

app.get('/api/application/overview', requireRootAdmin('settings:read'), (req, res) => {
  const runningCount = db.servers.filter(s => s.status === 'running' || s.status === 'online').length;
  const onlineNodes = db.nodes.filter(n => n.is_online).length;
  const totalMemAllocated = db.servers.reduce((acc, s) => acc + (s.limits?.memory || 0), 0);
  const totalDiskAllocated = db.servers.reduce((acc, s) => acc + (s.limits?.disk || 0), 0);
  return res.json({
    servers_total: db.servers.length,
    servers_running: runningCount,
    users_total: db.users.length,
    nodes_total: db.nodes.length,
    nodes_online: onlineNodes,
    nests_total: db.nests.length,
    eggs_total: db.eggs.length,
    allocations_total: db.allocations.length,
    allocations_used: db.allocations.filter(a => a.server_id).length,
    memory_allocated_mb: totalMemAllocated,
    disk_allocated_mb: totalDiskAllocated,
  });
});

// ---------------- Admin Locations CRUD ----------------

app.get('/api/application/locations', requireRootAdmin('nodes:read'), (req, res) => {
  const enriched = db.locations.map(loc => {
    const locNodes = db.nodes.filter(n => String(n.location_id) === String(loc.id));
    const nodeIds = new Set(locNodes.map(n => String(n.id)));
    const srvCount = db.servers.filter(s => nodeIds.has(String(s.node_id))).length;
    return { ...loc, nodes_count: locNodes.length, servers_count: srvCount };
  });
  return res.json({ data: enriched });
});

app.post('/api/application/locations', requireRootAdmin('nodes:write'), (req, res) => {
  const short = stripHtmlTags(String(req.body?.short || '')).trim().slice(0, 32);
  const long = stripHtmlTags(String(req.body?.long || '')).trim().slice(0, 128);
  if (!short) return res.status(400).json({ error: 'Location short code is required.' });
  const loc = { id: nextId(db.locations), short, long: long || short, created_at: new Date().toISOString() };
  db.locations.push(loc);
  saveState(db);
  recordActivity(req.user, null, 'admin:location.create', `Created location ${short}`, getClientIp(req));
  return res.status(201).json(loc);
});

app.delete('/api/application/locations/:id', requireRootAdmin('nodes:write'), (req, res) => {
  if (db.nodes.some(n => String(n.location_id) === String(req.params.id))) {
    return res.status(400).json({ error: 'Cannot delete a location that still has nodes assigned.' });
  }
  const idx = db.locations.findIndex(l => String(l.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Location not found.' });
  db.locations.splice(idx, 1);
  saveState(db);
  return res.status(204).end();
});

// ---------------- Admin Nodes & Allocations CRUD ----------------

app.get('/api/application/nodes', requireRootAdmin('nodes:read'), async (req, res) => {
  const enriched = await Promise.all(
    db.nodes.map(async n => {
      const health = await probeNodeHealth(n, 1000);
      n.is_online = health.is_online;
      n.daemon_version = health.daemon_version;
      n.latency_ms = health.latency_ms;
      n.system_info = health.system;
      return sanitizeNodeForAdmin(n);
    })
  );
  return res.json({ data: enriched });
});

app.get('/api/application/nodes/:id', requireRootAdmin('nodes:read'), async (req, res) => {
  const node = db.nodes.find(n => String(n.id) === String(req.params.id) || n.uuid === req.params.id);
  if (!node) return res.status(404).json({ error: 'Node not found.' });
  const health = await probeNodeHealth(node, 1500);
  node.is_online = health.is_online;
  node.daemon_version = health.daemon_version;
  node.latency_ms = health.latency_ms;
  node.system_info = health.system;
  return res.json(sanitizeNodeForAdmin(node));
});

app.get('/api/application/nodes/:id/configuration', requireRootAdmin('nodes:write'), (req, res) => {
  const node = db.nodes.find(n => String(n.id) === String(req.params.id) || n.uuid === req.params.id);
  if (!node) return res.status(404).json({ error: 'Node not found.' });
  const token = resolveNodeAuthToken(node);
  return res.json({
    uuid: node.uuid,
    token,
    remote: db.settings.panel_url || 'http://127.0.0.1:3001',
    api: { port: node.daemon_listen || 8443 },
    system: {
      data: node.daemon_base,
      sftp: { bind_port: node.daemon_sftp || 2202 },
    },
  });
});

app.post('/api/application/nodes', requireRootAdmin('nodes:write'), (req, res) => {
  const body = req.body || {};
  const name = stripHtmlTags(String(body.name || '')).trim();
  const fqdn = stripHtmlTags(String(body.fqdn || '')).trim();
  if (!name || !fqdn) return res.status(400).json({ error: 'Node name and FQDN/IP are required.' });
  if (hasSqlInjection(name) || hasSqlInjection(fqdn)) return res.status(400).json({ error: 'Invalid input.' });

  const newNode = {
    id: nextId(db.nodes),
    uuid: crypto.randomUUID(),
    name: name.slice(0, 64),
    description: stripHtmlTags(String(body.description || '')).slice(0, 200),
    location_id: Number(body.location_id) || db.locations[0]?.id || 1,
    fqdn,
    scheme: body.scheme === 'https' ? 'https' : 'http',
    behind_proxy: Boolean(body.behind_proxy),
    maintenance_mode: Boolean(body.maintenance_mode),
    allow_auto_allocation: body.allow_auto_allocation !== false,
    memory: Number(body.memory) || 8192,
    memory_overallocate: Number(body.memory_overallocate) || 0,
    disk: Number(body.disk) || 102400,
    disk_overallocate: Number(body.disk_overallocate) || 0,
    upload_size: Number(body.upload_size) || 100,
    daemon_listen: Number(body.daemon_listen) || 8443,
    daemon_sftp: Number(body.daemon_sftp) || 2202,
    daemon_base: String(body.daemon_base || path.join(os.homedir(), '.slayerwings', 'volumes')),
    daemon_token: body.daemon_token || `sn_wing_${crypto.randomBytes(20).toString('hex')}`,
    is_online: false,
    daemon_version: 'pending',
  };
  db.nodes.push(newNode);
  saveState(db);
  recordActivity(req.user, null, 'admin:node.create', `Created node ${newNode.name} (${newNode.fqdn})`, getClientIp(req));
  return res.status(201).json(sanitizeNodeForAdmin(newNode));
});

app.patch('/api/application/nodes/:id', requireRootAdmin('nodes:write'), (req, res) => {
  const node = db.nodes.find(n => String(n.id) === String(req.params.id));
  if (!node) return res.status(404).json({ error: 'Node not found.' });
  const allowed = ['name', 'description', 'location_id', 'fqdn', 'scheme', 'behind_proxy', 'maintenance_mode', 'allow_auto_allocation', 'memory', 'memory_overallocate', 'disk', 'disk_overallocate', 'upload_size', 'daemon_listen', 'daemon_sftp', 'daemon_base'];
  for (const field of allowed) {
    if (req.body?.[field] !== undefined) {
      node[field] = typeof req.body[field] === 'string' ? stripHtmlTags(req.body[field]) : req.body[field];
    }
  }
  saveState(db);
  recordActivity(req.user, null, 'admin:node.update', `Updated node ${node.name}`, getClientIp(req));
  return res.json(sanitizeNodeForAdmin(node));
});

app.delete('/api/application/nodes/:id', requireRootAdmin('nodes:write'), (req, res) => {
  const idx = db.nodes.findIndex(n => String(n.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Node not found.' });
  if (db.servers.some(s => String(s.node_id) === String(req.params.id))) {
    return res.status(400).json({ error: 'Cannot delete node while servers remain assigned to it.' });
  }
  const [removed] = db.nodes.splice(idx, 1);
  db.allocations = db.allocations.filter(a => String(a.node_id) !== String(removed.id));
  saveState(db);
  recordActivity(req.user, null, 'admin:node.delete', `Deleted node ${removed.name}`, getClientIp(req));
  return res.status(204).end();
});

app.get('/api/application/nodes/:id/allocations', requireRootAdmin('nodes:read'), (req, res) => {
  const allocs = db.allocations.filter(a => String(a.node_id) === String(req.params.id));
  return res.json({ data: allocs });
});

app.post('/api/application/nodes/:id/allocations', requireRootAdmin('nodes:write'), (req, res) => {
  const node = db.nodes.find(n => String(n.id) === String(req.params.id));
  if (!node) return res.status(404).json({ error: 'Node not found.' });
  const ip = stripHtmlTags(String(req.body?.ip || node.fqdn || '127.0.0.1')).trim();
  const alias = stripHtmlTags(String(req.body?.alias || '')).trim();
  const rawPorts = Array.isArray(req.body?.ports)
    ? req.body.ports
    : String(req.body?.ports || req.body?.port || '').split(',').map(s => s.trim()).filter(Boolean);
  const created = [];

  for (const token of rawPorts) {
    const str = String(token).trim();
    if (str.includes('-')) {
      const [start, end] = str.split('-').map(Number);
      if (start > 0 && end >= start && end - start <= 200) {
        for (let p = start; p <= end; p++) {
          if (!db.allocations.some(a => String(a.node_id) === String(node.id) && a.port === p)) {
            const entry = { id: nextId(db.allocations), node_id: node.id, ip, port: p, alias, notes: '', server_id: null, assigned: false };
            db.allocations.push(entry);
            created.push(entry);
          }
        }
      }
    } else {
      const p = parseInt(str, 10);
      if (p >= 1024 && p <= 65535 && !db.allocations.some(a => String(a.node_id) === String(node.id) && a.port === p)) {
        const entry = { id: nextId(db.allocations), node_id: node.id, ip, port: p, alias, notes: '', server_id: null, assigned: false };
        db.allocations.push(entry);
        created.push(entry);
      }
    }
  }
  saveState(db);
  return res.status(201).json({ data: created });
});

app.delete('/api/application/nodes/:id/allocations/:allocId', requireRootAdmin('nodes:write'), (req, res) => {
  const idx = db.allocations.findIndex(a => String(a.id) === String(req.params.allocId) && String(a.node_id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Allocation not found.' });
  if (db.allocations[idx].server_id) return res.status(400).json({ error: 'Cannot delete an allocation currently bound to a server.' });
  db.allocations.splice(idx, 1);
  saveState(db);
  return res.status(204).end();
});

// ---------------- Admin Users CRUD ----------------

app.get('/api/application/users', requireRootAdmin('users:read'), (req, res) => {
  return res.json({ data: db.users.map(sanitizeUser) });
});

app.post('/api/application/users', requireRootAdmin('users:write'), (req, res) => {
  const { username, email, password, name_first = '', name_last = '', root_admin = false } = req.body || {};
  const cleanUser = stripHtmlTags(String(username || '')).trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanUser || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Valid username and email are required.' });
  }
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (db.users.some(u => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUser.toLowerCase())) {
    return res.status(409).json({ error: 'Username or email already exists.' });
  }
  const newUser = {
    id: nextId(db.users),
    uuid: crypto.randomUUID(),
    username: cleanUser,
    email: cleanEmail,
    name_first: stripHtmlTags(name_first).slice(0, 64),
    name_last: stripHtmlTags(name_last).slice(0, 64),
    language: 'en',
    root_admin: Boolean(root_admin),
    two_factor_enabled: false,
    two_factor_secret: '',
    token_version: 1,
    password_hash: hashPassword(String(password)),
    created_at: new Date().toISOString(),
  };
  db.users.push(newUser);
  saveState(db);
  recordActivity(req.user, null, 'admin:user.create', `Created user ${newUser.username} (${newUser.email})`, getClientIp(req));
  return res.status(201).json(sanitizeUser(newUser));
});

app.patch('/api/application/users/:id', requireRootAdmin('users:write'), (req, res) => {
  const user = db.users.find(u => String(u.id) === String(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const { username, email, name_first, name_last, root_admin, password } = req.body || {};
  if (username !== undefined) user.username = stripHtmlTags(String(username)).trim().slice(0, 32);
  if (email !== undefined) user.email = String(email).trim().toLowerCase();
  if (name_first !== undefined) user.name_first = stripHtmlTags(String(name_first)).slice(0, 64);
  if (name_last !== undefined) user.name_last = stripHtmlTags(String(name_last)).slice(0, 64);
  if (root_admin !== undefined) user.root_admin = Boolean(root_admin);
  if (password && String(password).length >= 8) {
    user.password_hash = hashPassword(String(password));
    user.token_version = (user.token_version || 1) + 1;
  }
  saveState(db);
  recordActivity(req.user, null, 'admin:user.update', `Updated user ${user.username}`, getClientIp(req));
  return res.json(sanitizeUser(user));
});

app.delete('/api/application/users/:id', requireRootAdmin('users:write'), (req, res) => {
  if (String(req.params.id) === String(req.user.id)) {
    return res.status(400).json({ error: 'You cannot delete your own active admin account.' });
  }
  if (db.servers.some(s => String(s.owner_id || s.user_id) === String(req.params.id))) {
    return res.status(400).json({ error: 'User still owns active servers; transfer or delete servers first.' });
  }
  const idx = db.users.findIndex(u => String(u.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'User not found.' });
  const [removed] = db.users.splice(idx, 1);
  saveState(db);
  recordActivity(req.user, null, 'admin:user.delete', `Deleted user ${removed.username}`, getClientIp(req));
  return res.status(204).end();
});

// ---------------- Admin Nests & Eggs CRUD ----------------

app.get('/api/application/nests', requireRootAdmin('nests:read'), (req, res) => {
  const enriched = db.nests.map(n => {
    const nestEggs = db.eggs.filter(e => String(e.nest_id) === String(n.id));
    return {
      ...n,
      eggs: nestEggs,
      eggs_count: nestEggs.length,
      servers_count: db.servers.filter(s => String(s.nest_id) === String(n.id)).length,
    };
  });
  return res.json({ data: enriched });
});

app.get('/api/application/nests/:id', requireRootAdmin('nests:read'), (req, res) => {
  const nest = db.nests.find(n => String(n.id) === String(req.params.id));
  if (!nest) return res.status(404).json({ error: 'Nest not found.' });
  const eggs = db.eggs.filter(e => String(e.nest_id) === String(nest.id));
  return res.json({ ...nest, eggs, eggs_count: eggs.length });
});

app.post('/api/application/nests', requireRootAdmin('nests:write'), (req, res) => {
  const name = stripHtmlTags(String(req.body?.name || '')).trim();
  if (!name) return res.status(400).json({ error: 'Nest name is required.' });
  const nest = {
    id: nextId(db.nests),
    uuid: crypto.randomUUID(),
    author: req.user.email,
    name: name.slice(0, 64),
    description: stripHtmlTags(String(req.body?.description || '')).slice(0, 240),
    created_at: new Date().toISOString().slice(0, 10),
  };
  db.nests.push(nest);
  saveState(db);
  return res.status(201).json(nest);
});

app.patch('/api/application/nests/:id', requireRootAdmin('nests:write'), (req, res) => {
  const nest = db.nests.find(n => String(n.id) === String(req.params.id));
  if (!nest) return res.status(404).json({ error: 'Nest not found.' });
  if (req.body?.name) nest.name = stripHtmlTags(String(req.body.name)).slice(0, 64);
  if (req.body?.description !== undefined) nest.description = stripHtmlTags(String(req.body.description)).slice(0, 240);
  saveState(db);
  return res.json(nest);
});

app.delete('/api/application/nests/:id', requireRootAdmin('nests:write'), (req, res) => {
  const idx = db.nests.findIndex(n => String(n.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Nest not found.' });
  if (db.eggs.some(e => String(e.nest_id) === String(req.params.id))) {
    return res.status(400).json({ error: 'Cannot delete a nest while eggs remain inside it.' });
  }
  db.nests.splice(idx, 1);
  saveState(db);
  return res.status(204).end();
});

app.get('/api/application/nests/:id/eggs', requireRootAdmin('nests:read'), (req, res) => {
  const eggs = db.eggs
    .filter(e => String(e.nest_id) === String(req.params.id))
    .map(e => ({
      ...e,
      servers_count: db.servers.filter(s => String(s.egg_id) === String(e.id)).length,
    }));
  return res.json({ data: eggs });
});

app.post('/api/application/nests/:id/eggs', requireRootAdmin('nests:write'), (req, res) => {
  const nest = db.nests.find(n => String(n.id) === String(req.params.id));
  if (!nest) return res.status(404).json({ error: 'Nest not found.' });
  const body = req.body || {};
  const egg = {
    id: nextId(db.eggs),
    uuid: crypto.randomUUID(),
    nest_id: nest.id,
    nest_name: nest.name,
    author: req.user.email,
    name: stripHtmlTags(String(body.name || 'Custom Egg')).slice(0, 64),
    description: stripHtmlTags(String(body.description || '')).slice(0, 240),
    docker_images: String(body.docker_images || 'ghcr.io/pterodactyl/yolks:java_21'),
    startup: String(body.startup || ''),
    force_outgoing_ip: Boolean(body.force_outgoing_ip),
    features: String(body.features || ''),
    config: body.config || { files: '{}', stop: '^C', logs: '{}', startup: '{}' },
    variables: Array.isArray(body.variables) ? body.variables : [],
    created_at: new Date().toISOString().slice(0, 10),
  };
  db.eggs.push(egg);
  saveState(db);
  return res.status(201).json(egg);
});

app.patch('/api/application/nests/:id/eggs/:eggId', requireRootAdmin('nests:write'), (req, res) => {
  const egg = db.eggs.find(e => String(e.id) === String(req.params.eggId) && String(e.nest_id) === String(req.params.id));
  if (!egg) return res.status(404).json({ error: 'Egg not found.' });
  const fields = ['name', 'description', 'docker_images', 'startup', 'force_outgoing_ip', 'features', 'config', 'variables'];
  for (const f of fields) {
    if (req.body?.[f] !== undefined) egg[f] = req.body[f];
  }
  saveState(db);
  return res.json(egg);
});

app.delete('/api/application/nests/:id/eggs/:eggId', requireRootAdmin('nests:write'), (req, res) => {
  const idx = db.eggs.findIndex(e => String(e.id) === String(req.params.eggId) && String(e.nest_id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Egg not found.' });
  db.eggs.splice(idx, 1);
  saveState(db);
  return res.status(204).end();
});

app.post('/api/application/nests/:id/eggs/import', requireRootAdmin('nests:write'), (req, res) => {
  const nest = db.nests.find(n => String(n.id) === String(req.params.id));
  if (!nest) return res.status(404).json({ error: 'Nest not found.' });
  const raw = req.body || {};
  const egg = {
    id: nextId(db.eggs),
    uuid: raw.uuid || crypto.randomUUID(),
    nest_id: nest.id,
    nest_name: nest.name,
    author: stripHtmlTags(String(raw.author || req.user.email)),
    name: stripHtmlTags(String(raw.name || 'Imported Egg')),
    description: stripHtmlTags(String(raw.description || '')),
    docker_images: Array.isArray(raw.docker_images)
      ? raw.docker_images.join('\n')
      : (typeof raw.docker_images === 'object' ? Object.values(raw.docker_images).join('\n') : String(raw.docker_images || '')),
    startup: String(raw.startup || ''),
    force_outgoing_ip: Boolean(raw.force_outgoing_ip),
    features: Array.isArray(raw.features) ? raw.features.join(', ') : String(raw.features || ''),
    config: raw.config || { files: '{}', stop: '^C', logs: '{}', startup: '{}' },
    variables: Array.isArray(raw.variables) ? raw.variables : [],
    created_at: new Date().toISOString().slice(0, 10),
  };
  db.eggs.push(egg);
  saveState(db);
  return res.status(201).json(egg);
});

// ---------------- Admin Mounts CRUD ----------------

app.get('/api/application/mounts', requireRootAdmin('mounts:read'), (req, res) => {
  return res.json({ data: db.mounts || [] });
});

app.post('/api/application/mounts', requireRootAdmin('mounts:write'), (req, res) => {
  const { name, description = '', source, target, read_only = false, user_mountable = false } = req.body || {};
  const cleanName = stripHtmlTags(String(name || '')).trim();
  const cleanSource = String(source || '').trim();
  const cleanTarget = String(target || '').trim();
  if (!cleanName || !cleanSource.startsWith('/') || !cleanTarget.startsWith('/') || cleanSource.includes('..') || cleanTarget.includes('..')) {
    return res.status(400).json({ error: 'Valid mount name, absolute source, and target paths are required.' });
  }
  const mount = {
    id: nextId(db.mounts),
    uuid: crypto.randomUUID(),
    name: cleanName.slice(0, 64),
    description: stripHtmlTags(String(description)).slice(0, 240),
    source: cleanSource,
    target: cleanTarget,
    read_only: Boolean(read_only),
    user_mountable: Boolean(user_mountable),
    created_at: new Date().toISOString(),
  };
  db.mounts.push(mount);
  saveState(db);
  return res.status(201).json(mount);
});

app.delete('/api/application/mounts/:id', requireRootAdmin('mounts:write'), (req, res) => {
  const idx = (db.mounts || []).findIndex(m => String(m.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Mount not found.' });
  db.mounts.splice(idx, 1);
  saveState(db);
  return res.status(204).end();
});

// ---------------- Admin Servers Fleet & Full Provisioning ----------------

app.get('/api/application/servers', requireRootAdmin('servers:read'), async (req, res) => {
  const byNode = new Map();
  for (const srv of db.servers) {
    const node = getServerNode(db, srv);
    if (!node) continue;
    if (!byNode.has(node.id)) byNode.set(node.id, node);
  }
  await Promise.all(
    Array.from(byNode.values()).map(async node => {
      try {
        const listRes = await daemonRequest(node, '/api/servers', { timeoutMs: 1200 });
        for (const item of (listRes.data || [])) {
          const srv = db.servers.find(s => s.uuid === item.uuid);
          if (srv) srv.status = item.state || item.status || 'offline';
        }
      } catch {}
    })
  );
  return res.json({ data: db.servers.map(buildCanonicalServer) });
});

app.get('/api/application/servers/:id', requireRootAdmin('servers:read'), (req, res) => {
  const srv = findServerStrict(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found.' });
  const databases = (db.databases || []).filter(d => d.server_uuid === srv.uuid);
  return res.json({ ...buildCanonicalServer(srv), databases });
});

app.post('/api/application/servers', requireRootAdmin('servers:write'), async (req, res) => {
  const body = req.body || {};
  const name = stripHtmlTags(String(body.name || '')).trim();
  if (!name) return res.status(400).json({ error: 'Server name is required.' });
  if (hasSqlInjection(name)) return res.status(400).json({ error: 'Invalid server name.' });

  const owner = db.users.find(u => String(u.id) === String(body.user_id || body.owner_id || req.user.id));
  if (!owner) return res.status(404).json({ error: 'Selected owner user not found.' });

  const node = db.nodes.find(n => String(n.id) === String(body.node_id)) || db.nodes[0];
  if (!node) return res.status(404).json({ error: 'No target node available.' });

  const egg = db.eggs.find(e => String(e.id) === String(body.egg_id));
  if (!egg) return res.status(404).json({ error: 'Selected software Egg not found.' });

  let alloc = null;
  if (body.allocation_id) {
    alloc = db.allocations.find(a => String(a.id) === String(body.allocation_id) && String(a.node_id) === String(node.id));
    if (!alloc) return res.status(404).json({ error: 'Selected allocation does not exist on target node.' });
    if (alloc.server_id) return res.status(409).json({ error: `Allocation port ${alloc.port} is already assigned to another server.` });
  } else {
    alloc = db.allocations.find(a => String(a.node_id) === String(node.id) && !a.server_id);
    if (!alloc) return res.status(400).json({ error: `No free port allocations remaining on node ${node.name}. Add ports in Node Management.` });
  }

  const limits = {
    memory: Number(body.limits?.memory ?? body.memory ?? 1024),
    swap: Number(body.limits?.swap ?? body.swap ?? 0),
    disk: Number(body.limits?.disk ?? body.disk ?? 10240),
    io: Number(body.limits?.io ?? body.io ?? 500),
    cpu: Number(body.limits?.cpu ?? body.cpu ?? 100),
    oom_disabled: Boolean(body.limits?.oom_disabled ?? false),
  };

  const feature_limits = {
    databases: Number(body.feature_limits?.databases ?? body.database_limit ?? 2),
    allocations: Number(body.feature_limits?.allocations ?? body.allocation_limit ?? 2),
    backups: Number(body.feature_limits?.backups ?? body.backup_limit ?? 3),
  };

  const serverId = nextId(db.servers);
  const uuid = crypto.randomUUID();
  const identifier = uuid.slice(0, 8);

  const envVars = {
    SERVER_PORT: String(alloc.port),
    SERVER_MEMORY: String(limits.memory),
  };
  for (const v of (egg.variables || [])) {
    envVars[v.env_variable] = body.environment?.[v.env_variable] ?? v.server_value ?? v.default_value ?? '';
  }
  if (body.environment && typeof body.environment === 'object') {
    for (const [k, val] of Object.entries(body.environment)) {
      envVars[k] = String(val ?? '');
    }
  }

  const serverVariables = (egg.variables || []).map(v => ({
    ...v,
    server_value: envVars[v.env_variable] ?? v.default_value ?? '',
  }));

  const newServer = {
    id: serverId,
    uuid,
    identifier,
    name: name.slice(0, 64),
    description: stripHtmlTags(String(body.description || '')).slice(0, 240),
    status: 'offline',
    suspended: false,
    user_id: owner.id,
    owner_id: owner.id,
    node_id: node.id,
    allocation_id: alloc.id,
    nest_id: egg.nest_id,
    egg_id: egg.id,
    egg_name: egg.name,
    docker_image: body.docker_image || (egg.docker_images ? egg.docker_images.split('\n')[0] : ''),
    startup: String(body.startup || egg.startup || ''),
    environment: envVars,
    variables: serverVariables,
    limits,
    feature_limits,
    created_at: new Date().toISOString(),
  };

  // Reserve allocation atomically before contacting daemon
  alloc.server_id = serverId;
  alloc.assigned = true;

  try {
    await daemonRequest(node, '/api/servers', {
      method: 'POST',
      timeoutMs: 25_000,
      body: {
        uuid: newServer.uuid,
        name: newServer.name,
        memory: limits.memory,
        swap: limits.swap,
        disk: limits.disk,
        cpu: limits.cpu,
        port: alloc.port,
        egg_name: newServer.egg_name,
        dl_path: envVars.DL_PATH || '',
        startup: newServer.startup,
        environment: envVars,
      },
    });
  } catch (err) {
    // Roll back allocation if provisioning failed on daemon
    alloc.server_id = null;
    alloc.assigned = false;
    return res.status(502).json({ error: `Daemon provisioning failed on ${node.name}: ${err.message}` });
  }

  db.servers.push(newServer);
  saveState(db);
  recordActivity(req.user, newServer.uuid, 'admin:server.create', `Provisioned server "${newServer.name}" (${newServer.identifier}) on port ${alloc.port}`, getClientIp(req));

  const startOnDeploy = Boolean(body.start_on_completion ?? body.start_after_install ?? body.start_on_deploy ?? false);
  if (startOnDeploy) {
    try {
      await daemonRequest(node, `/api/servers/${newServer.uuid}/power`, {
        method: 'POST',
        timeoutMs: 120_000,
        body: {
          action: 'start',
          egg_name: newServer.egg_name,
          port: alloc.port,
          memory: limits.memory,
          swap: limits.swap,
          disk: limits.disk,
          cpu: limits.cpu,
          dl_path: envVars.DL_PATH || '',
          startup: newServer.startup,
          environment: envVars,
        },
      });
      newServer.status = 'running';
      saveState(db);
    } catch (err) {
      // Server was provisioned successfully even if auto-start hit timeout/error
      newServer.status = 'offline';
    }
  }

  return res.status(201).json(buildCanonicalServer(newServer));
});

app.patch('/api/application/servers/:id/details', requireRootAdmin('servers:write'), (req, res) => {
  const srv = findServerStrict(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found.' });
  const { name, description, owner_id, user_id, external_id } = req.body || {};
  if (name) srv.name = stripHtmlTags(String(name)).slice(0, 64);
  if (description !== undefined) srv.description = stripHtmlTags(String(description)).slice(0, 240);
  if (external_id !== undefined) srv.external_id = stripHtmlTags(String(external_id)).slice(0, 64);
  const newOwner = owner_id || user_id;
  if (newOwner && db.users.some(u => String(u.id) === String(newOwner))) {
    srv.owner_id = Number(newOwner);
    srv.user_id = Number(newOwner);
  }
  saveState(db);
  recordActivity(req.user, srv.uuid, 'admin:server.details', `Updated details for "${srv.name}"`, getClientIp(req));
  return res.json(buildCanonicalServer(srv));
});

app.patch('/api/application/servers/:id/build', requireRootAdmin('servers:write'), (req, res) => {
  const srv = findServerStrict(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found.' });
  const b = req.body || {};
  srv.limits = {
    ...srv.limits,
    memory: Number(b.memory ?? srv.limits.memory),
    swap: Number(b.swap ?? srv.limits.swap),
    disk: Number(b.disk ?? srv.limits.disk),
    io: Number(b.io ?? srv.limits.io),
    cpu: Number(b.cpu ?? srv.limits.cpu),
    oom_disabled: b.oom_disabled !== undefined ? Boolean(b.oom_disabled) : srv.limits.oom_disabled,
  };
  srv.feature_limits = {
    ...srv.feature_limits,
    databases: Number(b.database_limit ?? b.feature_limits?.databases ?? srv.feature_limits.databases),
    allocations: Number(b.allocation_limit ?? b.feature_limits?.allocations ?? srv.feature_limits.allocations),
    backups: Number(b.backup_limit ?? b.feature_limits?.backups ?? srv.feature_limits.backups),
  };
  if (b.allocation_id) {
    const newAlloc = db.allocations.find(a => String(a.id) === String(b.allocation_id) && String(a.node_id) === String(srv.node_id));
    if (newAlloc && (!newAlloc.server_id || String(newAlloc.server_id) === String(srv.id))) {
      newAlloc.server_id = srv.id;
      newAlloc.assigned = true;
      srv.allocation_id = newAlloc.id;
      srv.environment.SERVER_PORT = String(newAlloc.port);
    }
  }
  saveState(db);
  recordActivity(req.user, srv.uuid, 'admin:server.build', `Updated build limits for "${srv.name}"`, getClientIp(req));
  return res.json(buildCanonicalServer(srv));
});

app.patch('/api/application/servers/:id/startup', requireRootAdmin('servers:write'), (req, res) => {
  const srv = findServerStrict(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found.' });
  const b = req.body || {};
  if (b.startup !== undefined || b.startup_command !== undefined) {
    srv.startup = String(b.startup ?? b.startup_command).slice(0, 500);
  }
  if (b.egg_id) {
    const egg = db.eggs.find(e => String(e.id) === String(b.egg_id));
    if (egg) {
      srv.egg_id = egg.id;
      srv.egg_name = egg.name;
      srv.nest_id = egg.nest_id;
      if (!b.startup && !b.startup_command) srv.startup = egg.startup;
    }
  }
  if (b.docker_image || b.image) {
    srv.docker_image = stripHtmlTags(String(b.docker_image || b.image));
  }
  if (b.environment && typeof b.environment === 'object') {
    srv.environment = { ...srv.environment, ...b.environment };
    for (const v of (srv.variables || [])) {
      if (b.environment[v.env_variable] !== undefined) {
        v.server_value = String(b.environment[v.env_variable]);
      }
    }
  }
  saveState(db);
  recordActivity(req.user, srv.uuid, 'admin:server.startup', `Updated startup config for "${srv.name}"`, getClientIp(req));
  return res.json(buildCanonicalServer(srv));
});

app.get('/api/application/servers/:id/databases', requireRootAdmin('servers:read'), (req, res) => {
  const srv = findServerStrict(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found.' });
  return res.json({ data: db.databases.filter(d => d.server_uuid === srv.uuid) });
});

app.post('/api/application/servers/:id/databases', requireRootAdmin('servers:write'), (req, res) => {
  const srv = findServerStrict(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found.' });
  const cleanName = stripHtmlTags(String(req.body?.database || 'db')).replace(/[^a-zA-Z0-9_]/g, '_');
  const entry = {
    id: nextId(db.databases),
    server_uuid: srv.uuid,
    name: `s${srv.id}_${cleanName}`,
    username: `u${srv.id}_${crypto.randomBytes(3).toString('hex')}`,
    password: crypto.randomBytes(16).toString('base64url'),
    host: '127.0.0.1',
    port: 3306,
    remote: String(req.body?.remote || '%'),
    created_at: new Date().toISOString(),
  };
  db.databases.push(entry);
  saveState(db);
  return res.status(201).json(entry);
});

app.delete('/api/application/servers/:id/databases/:dbId', requireRootAdmin('servers:write'), (req, res) => {
  const srv = findServerStrict(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found.' });
  const idx = db.databases.findIndex(d => String(d.id) === String(req.params.dbId) && d.server_uuid === srv.uuid);
  if (idx === -1) return res.status(404).json({ error: 'Database not found.' });
  db.databases.splice(idx, 1);
  saveState(db);
  return res.status(204).end();
});

app.post('/api/application/servers/:id/manage/:action', requireRootAdmin('servers:write'), async (req, res) => {
  const srv = findServerStrict(req.params.id);
  if (!srv) return res.status(404).json({ error: 'Server not found.' });
  const action = String(req.params.action).toLowerCase();
  const node = getServerNode(db, srv);

  if (action === 'suspend') {
    srv.suspended = true;
    srv.status = 'offline';
    if (node) {
      await daemonRequest(node, `/api/servers/${srv.uuid}/power`, { method: 'POST', body: { action: 'kill' } }).catch(() => {});
    }
  } else if (action === 'unsuspend') {
    srv.suspended = false;
  } else if (action === 'reinstall') {
    const primaryAlloc = db.allocations.find(a => String(a.id) === String(srv.allocation_id));
    if (node) {
      await daemonRequest(node, '/api/servers', {
        method: 'POST',
        body: {
          uuid: srv.uuid,
          name: srv.name,
          memory: srv.limits?.memory || 1024,
          swap: srv.limits?.swap || 0,
          disk: srv.limits?.disk || 10240,
          cpu: srv.limits?.cpu || 100,
          port: primaryAlloc?.port || 25565,
          egg_name: srv.egg_name,
          dl_path: srv.environment?.DL_PATH || '',
          startup: srv.startup || '',
          environment: srv.environment || {},
        },
      }).catch(() => {});
    }
  } else {
    return res.status(400).json({ error: 'Unknown management action.' });
  }

  saveState(db);
  recordActivity(req.user, srv.uuid, `admin:server.${action}`, `Admin performed "${action}" on ${srv.name}`, getClientIp(req));
  return res.json(buildCanonicalServer(srv));
});

app.delete('/api/application/servers/:id', requireRootAdmin('servers:write'), async (req, res) => {
  const idx = db.servers.findIndex(
    s => String(s.id) === String(req.params.id) || String(s.uuid) === String(req.params.id) || String(s.identifier) === String(req.params.id)
  );
  if (idx === -1) return res.status(404).json({ error: 'Server not found.' });
  const [srv] = db.servers.splice(idx, 1);
  const node = getServerNode(db, srv);
  const force = req.query.force === 'true';

  if (node) {
    try {
      await daemonRequest(node, `/api/servers/${srv.uuid}`, { method: 'DELETE' });
    } catch (err) {
      if (!force) {
        db.servers.splice(idx, 0, srv);
        return res.status(502).json({ error: `Daemon delete failed: ${err.message}. Pass ?force=true to remove anyway.` });
      }
    }
  }

  // Cascade release allocations & per-server child data
  for (const alloc of db.allocations) {
    if (String(alloc.server_id) === String(srv.id)) {
      alloc.server_id = null;
      alloc.assigned = false;
      alloc.notes = '';
    }
  }
  db.databases = db.databases.filter(d => d.server_uuid !== srv.uuid);
  db.schedules = db.schedules.filter(s => s.server_uuid !== srv.uuid);
  db.backups = db.backups.filter(b => b.server_uuid !== srv.uuid);
  db.subusers = db.subusers.filter(su => su.server_uuid !== srv.uuid);
  db.subdomains = db.subdomains.filter(sd => sd.server_uuid !== srv.uuid);
  db.server_splits = db.server_splits.filter(sp => sp.parent_server_uuid !== srv.uuid && sp.child_server_uuid !== srv.uuid);
  liveStatsCache.delete(srv.uuid);

  saveState(db);
  recordActivity(req.user, srv.uuid, 'admin:server.delete', `Deleted server "${srv.name}" (${srv.uuid})`, getClientIp(req));
  return res.status(204).end();
});

// ---------------- Admin Application API Keys CRUD ----------------

app.get('/api/application/api-keys', requireRootAdmin('api-keys:read'), (req, res) => {
  const keys = (db.api_keys || [])
    .filter(k => !k.revoked_at)
    .map(k => ({
      identifier: k.identifier,
      memo: k.memo,
      description: k.memo,
      scopes: k.scopes || ['*'],
      allowed_ips: k.allowed_ips || [],
      last_used_at: k.last_used_at || null,
      created_at: k.created_at,
    }));
  return res.json({ data: keys });
});

app.post('/api/application/api-keys', requireRootAdmin('api-keys:write'), (req, res) => {
  const { memo, description, scopes = ['*'], allowed_ips = [] } = req.body || {};
  const cleanMemo = stripHtmlTags(String(memo || description || '')).trim();
  if (!cleanMemo) return res.status(400).json({ error: 'API key description is required.' });

  const identifier = crypto.randomBytes(6).toString('hex');
  const rawToken = `ptla_${crypto.randomBytes(24).toString('hex')}`;
  const key = {
    identifier,
    user_id: req.user.id,
    memo: cleanMemo.slice(0, 120),
    scopes: Array.isArray(scopes) && scopes.length ? scopes : ['*'],
    allowed_ips: Array.isArray(allowed_ips) ? allowed_ips : [],
    token_hash: hashApiToken(rawToken),
    last_used_at: null,
    revoked_at: null,
    created_at: new Date().toISOString(),
  };
  db.api_keys.push(key);
  saveState(db);
  recordActivity(req.user, null, 'admin:api-key.create', `Created Application API key "${cleanMemo}"`, getClientIp(req));

  return res.status(201).json({
    identifier: key.identifier,
    memo: key.memo,
    description: key.memo,
    scopes: key.scopes,
    allowed_ips: key.allowed_ips,
    secret_token: rawToken,
    secret: rawToken,
    created_at: key.created_at,
  });
});

app.delete('/api/application/api-keys/:identifier', requireRootAdmin('api-keys:write'), (req, res) => {
  const key = (db.api_keys || []).find(k => k.identifier === req.params.identifier && !k.revoked_at);
  if (!key) return res.status(404).json({ error: 'Application API key not found.' });
  key.revoked_at = new Date().toISOString();
  saveState(db);
  recordActivity(req.user, null, 'admin:api-key.delete', `Revoked Application API key ${key.identifier}`, getClientIp(req));
  return res.status(204).end();
});

// ---------------- Admin System Settings & Mail Test ----------------

function getSafeSettings() {
  const copy = { ...db.settings };
  copy.mail_password = copy.mail_password ? '********' : '';
  return copy;
}

app.get(['/api/application/settings', '/api/admin/settings'], requireRootAdmin('settings:read'), (req, res) => {
  return res.json(getSafeSettings());
});

app.put(['/api/application/settings', '/api/admin/settings'], requireRootAdmin('settings:write'), (req, res) => {
  const updates = req.body || {};
  const allowedKeys = [
    'panel_name', 'company_name', 'panel_url', 'require_2fa_admins',
    'allow_registration', 'maintenance_mode', 'telemetry_interval_ms',
    'mail_driver', 'mail_host', 'mail_port', 'mail_encryption',
    'mail_username', 'mail_from_address', 'mail_from_name',
  ];
  for (const k of allowedKeys) {
    if (updates[k] !== undefined) {
      db.settings[k] = typeof updates[k] === 'string' ? stripHtmlTags(updates[k]) : updates[k];
    }
  }
  if (typeof updates.mail_password === 'string' && updates.mail_password !== '' && updates.mail_password !== '********') {
    db.settings.mail_password = updates.mail_password;
  }
  if (updates.allow_registration !== undefined) {
    db.theme.auth_allow_registration = Boolean(updates.allow_registration);
  }
  if (updates.panel_name) {
    db.theme.panel_name = db.settings.panel_name;
  }
  saveState(db);
  recordActivity(req.user, null, 'admin:settings.update', 'Updated global system settings', getClientIp(req));
  return res.json(getSafeSettings());
});

app.post('/api/admin/mail/test', requireRootAdmin('settings:write'), async (req, res) => {
  const recipient = String(req.body?.email || req.user.email).trim();
  const { mail_host, mail_port, mail_encryption, mail_username, mail_password, mail_from_address, mail_from_name } = db.settings;
  if (!mail_host || mail_host === 'smtp.example.com') {
    return res.status(400).json({ error: 'Configure a real SMTP host before sending a test email.' });
  }
  try {
    const transporter = nodemailer.createTransport({
      host: mail_host,
      port: Number(mail_port) || 587,
      secure: mail_encryption === 'ssl' || Number(mail_port) === 465,
      auth: mail_username ? { user: mail_username, pass: mail_password } : undefined,
      connectionTimeout: 5000,
    });
    await transporter.sendMail({
      from: `"${mail_from_name || 'SlayerNode'}" <${mail_from_address || 'noreply@slayernode.xyz'}>`,
      to: recipient,
      subject: 'SlayerNode Panel SMTP Verification',
      text: 'This is a live SMTP configuration test from SlayerNode Panel.',
    });
    return res.json({ success: true, message: `Test email dispatched to ${recipient}` });
  } catch (err) {
    return res.status(502).json({ error: `SMTP delivery failed: ${err.message}` });
  }
});

// ---------------- Admin Audit & Activity Logs ----------------

app.get(['/api/application/activity', '/api/admin/audit'], requireRootAdmin('activity:read'), (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  let logs = db.activity_logs || [];
  if (q && !hasSqlInjection(q)) {
    logs = logs.filter(
      l =>
        String(l.action).toLowerCase().includes(q) ||
        String(l.description).toLowerCase().includes(q) ||
        String(l.username).toLowerCase().includes(q)
    );
  }
  return res.json({ data: logs.slice(0, 200) });
});

// Block direct HTTP access to internal state, secrets, server directory, or dotfiles
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/') && /(?:storage_db\.json|\.daemon_token|\.session_secret|\.env|\/\.git(?:\/|$)|^\/server(?:\/|$))/i.test(req.path)) {
    return res.status(403).json({ errors: [{ code: 'Forbidden', status: '403', detail: 'Access to internal server files is forbidden.' }] });
  }
  next();
});

// Optional static production SPA fallback (only if built dist/ exists, never blocks /api)
const DIST_DIR = path.resolve(__dirname, '../dist');
if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  app.use(express.static(DIST_DIR));
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

// Strict JSON 404 for unknown /api/* routes
app.use('/api', (req, res) => {
  res.status(404).json({ errors: [{ code: 'NotFound', status: '404', detail: 'API endpoint not found.' }] });
});

// Secure Global Error Handler (never leaks stack traces or internal file paths)
app.use((err, req, res, _next) => {
  console.error('[Panel Error]', err?.message || err);
  const status = Number(err?.status) >= 400 && Number(err?.status) < 600 ? Number(err.status) : 500;
  const detail = status === 500 ? 'Internal server error.' : String(err?.message || 'Request failed');
  res.status(status).json({ errors: [{ status: String(status), detail }] });
});

// ============================================================================
// HTTP Server + Authenticated, Origin-Checked, Server-Isolated WebSocket Bridge
// ============================================================================

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  try {
    const reqUrl = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
    const match = reqUrl.pathname.match(/^\/api\/client\/servers\/([^/]+)\/ws\/?$/);
    if (!match) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    // 1. Strict CSWSH Origin Validation
    if (!isAllowedOrigin(request)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    // 2. Authenticate via signed ephemeral ?token=... OR signed HttpOnly slayer_session cookie
    const tokenParam = reqUrl.searchParams.get('token');
    const cookies = parseCookies(request.headers.cookie || '');
    const requestedServerKey = decodeURIComponent(match[1]);
    const srv = findServerStrict(requestedServerKey);

    if (!srv) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    let authedUser = null;
    if (tokenParam) {
      const wsPayload = verifyWsToken(tokenParam);
      if (wsPayload && String(wsPayload.srv) === String(srv.uuid)) {
        const user = db.users.find(u => String(u.id) === String(wsPayload.uid));
        if (user && (user.token_version || 1) === (wsPayload.tv || 1)) {
          authedUser = user;
        }
      }
    } else if (cookies.slayer_session) {
      const session = verifySessionCookieToken(cookies.slayer_session);
      if (session) {
        const user = db.users.find(u => String(u.id) === String(session.uid));
        if (user && (user.token_version || 1) === (session.tv || 1)) {
          authedUser = user;
        }
      }
    }

    if (!authedUser) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    if (!userCanAccessServer(authedUser, srv, 'control.console')) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, clientWs => {
      wss.emit('connection', clientWs, request, { user: authedUser, server: srv });
    });
  } catch {
    socket.destroy();
  }
});

wss.on('connection', (clientWs, _req, context) => {
  const srv = context.server;
  const targetUuid = srv.uuid;
  const node = getServerNode(db, srv);

  if (!node) {
    clientWs.send(JSON.stringify({ event: 'error', server: targetUuid, message: 'Assigned node missing.' }));
    clientWs.close();
    return;
  }

  const wsBase = getNodeBaseUrl(node, { ws: true });
  const daemonWsUrl = `${wsBase}/?server=${encodeURIComponent(targetUuid)}`;
  const daemonToken = resolveNodeAuthToken(node);

  let daemonWs = null;
  let closed = false;

  const connectUpstream = () => {
    if (closed) return;
    daemonWs = new WebSocket(daemonWsUrl, {
      headers: { Authorization: `Bearer ${daemonToken}` },
    });

    daemonWs.on('open', () => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ event: 'auth success', server: targetUuid }));
      }
    });

    daemonWs.on('message', raw => {
      if (clientWs.readyState !== WebSocket.OPEN) return;
      try {
        const msg = JSON.parse(raw.toString());
        // Strict cross-server frame barrier: reject frames belonging to any other UUID
        if (msg.server && msg.server !== targetUuid) return;
        clientWs.send(JSON.stringify({ ...msg, server: targetUuid }));
      } catch {}
    });

    daemonWs.on('error', err => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            event: 'console output',
            server: targetUuid,
            args: [`[SlayerPanel] Node ${node.name} stream issue: ${err.message}`],
          })
        );
      }
    });

    daemonWs.on('close', () => {
      daemonWs = null;
    });
  };

  connectUpstream();

  clientWs.on('message', async raw => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.event === 'send command') {
        const cmd = String(Array.isArray(msg.args) ? msg.args[0] : (msg.command || '')).replace(/[\r\n]+/g, ' ').trim();
        if (!cmd || cmd.length > 500) return;
        if (daemonWs && daemonWs.readyState === WebSocket.OPEN) {
          daemonWs.send(JSON.stringify({ event: 'send command', args: [cmd], server: targetUuid }));
        } else {
          await daemonRequest(node, `/api/servers/${targetUuid}/commands`, {
            method: 'POST',
            body: { commands: [cmd] },
          }).catch(() => {});
        }
      } else if (msg.event === 'set state' && typeof msg.args?.[0] === 'string') {
        const action = msg.args[0].toLowerCase();
        if (['start', 'stop', 'restart', 'kill'].includes(action)) {
          await daemonRequest(node, `/api/servers/${targetUuid}/power`, {
            method: 'POST',
            body: { action },
          }).catch(() => {});
        }
      }
    } catch {}
  });

  clientWs.on('close', () => {
    closed = true;
    try {
      daemonWs?.close();
    } catch {}
  });
});

// Start real cron schedule loop
startScheduleLoop(getDb, saveState, recordActivity);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SlayerPanel API] Listening on http://0.0.0.0:${PORT}`);
});
