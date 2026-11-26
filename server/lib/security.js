/**
 * SlayerNode Security & Cryptography Helpers
 * Built exclusively on Node.js native crypto & dns modules (zero weak hashes or mock auth).
 */

import crypto from 'crypto';
import fs from 'fs';
import net from 'net';
import dns from 'dns';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_DIR = path.resolve(__dirname, '..');
const SESSION_SECRET_FILE = path.join(SERVER_DIR, '.session_secret');
const PANEL_DAEMON_TOKEN_FILE = path.join(SERVER_DIR, '.daemon_token');
const WING_DAEMON_TOKEN_FILE = path.join(os.homedir(), '.slayerwings', '.daemon_token');

// ============================================================================
// Secret Management (.session_secret & shared .daemon_token)
// ============================================================================

export function getSessionSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    return process.env.SESSION_SECRET;
  }
  try {
    if (fs.existsSync(SESSION_SECRET_FILE)) {
      const existing = fs.readFileSync(SESSION_SECRET_FILE, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
    const generated = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(SESSION_SECRET_FILE, generated, { mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(48).toString('hex');
  }
}

export function getSharedDaemonToken() {
  if (process.env.SLAYERWINGS_TOKEN) return process.env.SLAYERWINGS_TOKEN.trim();
  for (const tf of [PANEL_DAEMON_TOKEN_FILE, WING_DAEMON_TOKEN_FILE]) {
    try {
      if (fs.existsSync(tf)) {
        const val = fs.readFileSync(tf, 'utf8').trim();
        if (val) {
          syncDaemonTokenFiles(val);
          return val;
        }
      }
    } catch {}
  }
  const generated = `sn_wing_${crypto.randomBytes(24).toString('hex')}`;
  syncDaemonTokenFiles(generated);
  return generated;
}

function syncDaemonTokenFiles(token) {
  for (const tf of [PANEL_DAEMON_TOKEN_FILE, WING_DAEMON_TOKEN_FILE]) {
    try {
      fs.mkdirSync(path.dirname(tf), { recursive: true });
      fs.writeFileSync(tf, token, { mode: 0o600 });
    } catch {}
  }
}

const SESSION_SECRET = getSessionSecret();

// ============================================================================
// Password Hashing (scrypt + per-user random salt + timingSafeEqual)
// ============================================================================

export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 1) {
    throw new Error('Password cannot be empty');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hashHex] = parts;
  try {
    const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    const expected = Buffer.from(hashHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function hashApiToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

export function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ============================================================================
// Signed Session Cookies, CSRF Tokens & Ephemeral WebSocket Tokens
// ============================================================================

function base64UrlEncode(input) {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signHmac(payloadStr) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('base64url');
}

export function createSessionCookieToken(user, ttlSeconds = 86400) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sid: crypto.randomBytes(16).toString('hex'),
    uid: user.id,
    uuid: user.uuid,
    tv: user.token_version || 1,
    iat: now,
    exp: now + ttlSeconds,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sig = signHmac(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifySessionCookieToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, providedSig] = parts;
  const expectedSig = signHmac(payloadB64);
  if (!timingSafeEqualStr(providedSig, expectedSig)) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64));
    if (!payload || !payload.uid || !payload.exp) return null;
    if (Math.floor(Date.now() / 1000) >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createCsrfToken(sessionId) {
  if (!sessionId) return '';
  const msg = `csrf:${sessionId}`;
  const sig = signHmac(msg);
  return `${sessionId.slice(0, 12)}.${sig}`;
}

export function verifyCsrfToken(provided, sessionId) {
  if (!provided || !sessionId) return false;
  const expected = createCsrfToken(sessionId);
  return timingSafeEqualStr(String(provided), expected);
}

export function createWsToken(user, serverUuid, ttlSeconds = 120) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    t: 'ws',
    uid: user.id,
    tv: user.token_version || 1,
    srv: String(serverUuid),
    exp: now + ttlSeconds,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  return `${payloadB64}.${signHmac(payloadB64)}`;
}

export function verifyWsToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadB64, providedSig] = token.split('.');
  if (!payloadB64 || !providedSig) return null;
  if (!timingSafeEqualStr(providedSig, signHmac(payloadB64))) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64));
    if (payload.t !== 'ws' || !payload.uid || !payload.srv) return null;
    if (Math.floor(Date.now() / 1000) >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader) {
  const result = {};
  if (typeof cookieHeader !== 'string') return result;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(val);
      } catch {
        result[key] = val;
      }
    }
  }
  return result;
}

// ============================================================================
// RFC 6238 TOTP Two-Factor Authentication (No external libs required)
// ============================================================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret(bytes = 20) {
  const buf = crypto.randomBytes(bytes);
  let bits = '';
  for (const byte of buf) {
    bits += byte.toString(2).padStart(8, '0');
  }
  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    out += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return out;
}

function decodeBase32(secret) {
  const clean = String(secret).toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secret, stepOffset = 0) {
  const key = decodeBase32(secret);
  const counter = Math.floor(Date.now() / 1000 / 30) + stepOffset;
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

export function verifyTotpCode(secret, code) {
  const cleanCode = String(code || '').trim();
  if (!/^\d{6}$/.test(cleanCode)) return false;
  for (const offset of [-1, 0, 1]) {
    if (timingSafeEqualStr(cleanCode, generateTotpCode(secret, offset))) {
      return true;
    }
  }
  return false;
}

export function buildOtpAuthUri(email, issuer, secret) {
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// ============================================================================
// Origin, CORS, SSRF & Targeted Input Validation
// ============================================================================

export function getAllowedOrigins() {
  const origins = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ]);
  if (process.env.PANEL_URL) {
    try {
      origins.add(new URL(process.env.PANEL_URL).origin);
    } catch {}
  }
  if (process.env.CORS_ORIGINS) {
    for (const o of process.env.CORS_ORIGINS.split(',')) {
      const trimmed = o.trim();
      if (trimmed) origins.add(trimmed);
    }
  }
  return origins;
}

export function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  const allowed = getAllowedOrigins();
  if (allowed.has(origin)) return true;

  // Allow dynamic same-host matching if accessed via LAN IP / Codespaces proxy matching Host header
  const hostHeader = req.headers.host;
  if (hostHeader) {
    try {
      const parsed = new URL(origin);
      if (parsed.host === hostHeader && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
        return true;
      }
      // Also allow Vite dev server on :3000 reaching backend on same hostname:3001
      const reqHostName = hostHeader.split(':')[0];
      if (parsed.hostname === reqHostName && ['3000', '3001', '80', '443', ''].includes(parsed.port)) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

export function isPrivateOrReservedIp(ip) {
  if (!ip) return true;
  let clean = ip.trim().toLowerCase();
  if (clean.startsWith('::ffff:')) clean = clean.slice(7);

  if (net.isIPv4(clean)) {
    const n = ipv4ToInt(clean);
    const ranges = [
      [0x00000000, 0x00ffffff], // 0.0.0.0/8
      [0x0a000000, 0x0affffff], // 10.0.0.0/8
      [0x64400000, 0x647fffff], // 100.64.0.0/10
      [0x7f000000, 0x7fffffff], // 127.0.0.0/8
      [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16 (AWS/GCP/Azure metadata!)
      [0xac100000, 0xac1fffff], // 172.16.0.0/12
      [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
      [0xe0000000, 0xffffffff], // multicast/reserved
    ];
    return ranges.some(([start, end]) => n >= start && n <= end);
  }

  if (net.isIPv6(clean)) {
    if (
      clean === '::1' ||
      clean === '::' ||
      clean.startsWith('fc') ||
      clean.startsWith('fd') ||
      clean.startsWith('fe8') ||
      clean.startsWith('fe9') ||
      clean.startsWith('fea') ||
      clean.startsWith('feb')
    ) {
      return true;
    }
    return false;
  }

  return true;
}

export async function assertSafeExternalUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new Error('URL is required');
  }
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('Malformed URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http/https URLs are permitted');
  }
  if (parsed.username || parsed.password) {
    throw new Error('URLs with embedded credentials are not permitted');
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === 'metadata.google.internal'
  ) {
    throw new Error('SSRF Blocked: Internal/local hostname rejected');
  }
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error('SSRF Blocked: Private/loopback/metadata IP rejected');
    }
    return parsed.toString();
  }
  const resolved = await dns.promises.lookup(hostname, { all: true });
  if (!resolved || resolved.length === 0) {
    throw new Error('DNS resolution failed for external URL');
  }
  for (const entry of resolved) {
    if (isPrivateOrReservedIp(entry.address)) {
      throw new Error('SSRF Blocked: Resolved to internal/private/metadata IP');
    }
  }
  return parsed.toString();
}

export function validateSafeMediaUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return true; // empty clears field
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true; // local path like /logo.jpg
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) return true;
  try {
    const u = new URL(trimmed);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function stripHtmlTags(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
}

export function containsDangerousCss(css) {
  if (typeof css !== 'string') return false;
  return /<\/style|<script|javascript:|expression\s*\(|@import\s+url\s*\(/i.test(css);
}

// Targeted SQL injection pattern detector for search/identifier filters without corrupting valid payloads
const SQLI_REGEX = /(\bunion\s+(all\s+)?select\b|\bselect\b[\s\S]*\bfrom\b|\bdrop\s+table\b|\binsert\s+into\b|\bdelete\s+from\b|'\s*or\s+['"]?\d+['"]?\s*=\s*['"]?\d+|--\s|;\s*(drop|delete|insert|update|select))/i;

export function hasSqlInjection(value) {
  if (typeof value !== 'string') return false;
  return SQLI_REGEX.test(value);
}

// ============================================================================
// Sliding-Window Rate Limiter
// ============================================================================

export function createRateLimiter({ windowMs = 60_000, max = 30, keyFn } = {}) {
  const hits = new Map();
  // Periodic prune to avoid unbounded memory growth
  const pruneTimer = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, timestamps] of hits.entries()) {
      const valid = timestamps.filter(ts => ts > cutoff);
      if (valid.length === 0) hits.delete(key);
      else hits.set(key, valid);
    }
  }, Math.max(windowMs, 30_000));
  if (pruneTimer.unref) pruneTimer.unref();

  return function rateLimitMiddleware(req, res, next) {
    const key = keyFn ? keyFn(req) : (req.ip || req.socket?.remoteAddress || 'unknown');
    const now = Date.now();
    const cutoff = now - windowMs;
    const recent = (hits.get(key) || []).filter(ts => ts > cutoff);
    if (recent.length >= max) {
      const retryAfter = Math.ceil((recent[0] + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfter)));
      return res.status(429).json({
        errors: [{ code: 'TooManyRequests', status: '429', detail: 'Rate limit exceeded. Please retry later.' }],
      });
    }
    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
