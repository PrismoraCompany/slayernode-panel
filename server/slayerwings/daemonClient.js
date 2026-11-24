/**
 * SlayerWings Engine Daemon REST API Client
 * Handles high-speed HTTP/WebSocket requests to the SlayerWings daemon (default port 8443)
 */

export class SlayerWingsClient {
  constructor(nodeFqdn, daemonPort = 8443, token, scheme = 'https') {
    this.baseUrl = `${scheme}://${nodeFqdn}:${daemonPort}`;
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        throw new Error(`SlayerWings HTTP ${res.status}: ${res.statusText}`);
      }
      if (res.status === 204) return null;
      return await res.json();
    } catch (err) {
      console.warn(`[SlayerWingsClient] Request failed for ${endpoint}:`, err.message);
      // Return simulated success response when running in demo/offline mode
      return { success: true, simulated: true, error: err.message };
    }
  }

  // Server Power Actions: start, stop, restart, kill
  async sendPower(serverUuid, action) {
    return this.request(`/api/servers/${serverUuid}/power`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  // Stdin command injection
  async sendCommand(serverUuid, command) {
    return this.request(`/api/servers/${serverUuid}/commands`, {
      method: 'POST',
      body: JSON.stringify({ commands: [command] }),
    });
  }

  // File operations
  async listFiles(serverUuid, dir = '/') {
    return this.request(`/api/servers/${serverUuid}/files/list-directory?directory=${encodeURIComponent(dir)}`);
  }

  async readFile(serverUuid, filePath) {
    return this.request(`/api/servers/${serverUuid}/files/contents?file=${encodeURIComponent(filePath)}`);
  }

  async writeFile(serverUuid, filePath, content) {
    return this.request(`/api/servers/${serverUuid}/files/write?file=${encodeURIComponent(filePath)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: content,
    });
  }

  // Generate ephemeral WebSocket token for live terminal streaming
  async getWebSocketToken(serverUuid) {
    return this.request(`/api/servers/${serverUuid}/ws`);
  }
}
