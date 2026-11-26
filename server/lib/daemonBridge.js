/**
 * SlayerNode <-> SlayerWings Daemon HTTP/Telemetry Bridge
 * Strictly routes requests to the target server's assigned node with real Bearer authentication.
 */

import { getSharedDaemonToken } from './security.js';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '0.0.0.0']);
const PLACEHOLDER_TOKENS = new Set(['', 'sn_sandbox_token_secret', 'sn_local_dev_token', undefined, null]);

export function resolveNodeAuthToken(node) {
  if (!node) return getSharedDaemonToken();
  const host = String(node.fqdn || '').toLowerCase();
  if (LOCAL_HOSTS.has(host) && PLACEHOLDER_TOKENS.has(node.daemon_token)) {
    return getSharedDaemonToken();
  }
  return node.daemon_token || getSharedDaemonToken();
}

export function getNodeBaseUrl(node, { ws = false } = {}) {
  if (!node) throw new Error('Node record is missing');
  const rawScheme = String(node.scheme || 'http').toLowerCase();
  const proto = ws ? (rawScheme === 'https' ? 'wss' : 'ws') : (rawScheme === 'https' ? 'https' : 'http');
  const host = node.fqdn || '127.0.0.1';
  const port = node.daemon_listen || 8443;
  return `${proto}://${host}:${port}`;
}

export function getServerNode(db, server) {
  if (!server) return null;
  const node = (db.nodes || []).find(n => String(n.id) === String(server.node_id));
  return node || null;
}

export async function daemonRequest(node, endpoint, { method = 'GET', body, timeoutMs = 15000, rawResponse = false } = {}) {
  const baseUrl = getNodeBaseUrl(node);
  const token = resolveNodeAuthToken(node);
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };
  if (body !== undefined && typeof body !== 'string' && !Buffer.isBuffer(body)) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined
        ? undefined
        : (typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)),
      signal: controller.signal,
    });
    if (rawResponse) {
      return res;
    }
    const text = await res.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }
    if (!res.ok) {
      const errMsg = parsed?.error || parsed?.detail || res.statusText || `HTTP ${res.status}`;
      const err = new Error(errMsg);
      err.status = res.status;
      err.payload = parsed;
      throw err;
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

export async function probeNodeHealth(node, timeoutMs = 1500) {
  const startedAt = Date.now();
  try {
    const sys = await daemonRequest(node, '/api/system', { timeoutMs });
    return {
      is_online: true,
      latency_ms: Date.now() - startedAt,
      daemon_version: sys.version || 'v1.0.0-slayerwings',
      system: sys,
    };
  } catch (err) {
    return {
      is_online: false,
      latency_ms: Date.now() - startedAt,
      daemon_version: node.daemon_version || 'unreachable',
      error: err.message,
      system: null,
    };
  }
}
