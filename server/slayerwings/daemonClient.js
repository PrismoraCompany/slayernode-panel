/**
 * SlayerWings Engine Daemon REST API Client
 * Handles authenticated HTTP requests to the SlayerWings daemon (default port 8443)
 */

export class SlayerWingsClient {
  constructor(nodeFqdn, daemonPort = 8443, token, scheme = 'http') {
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

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`SlayerWings HTTP ${res.status}: ${text}`);
    }
    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return await res.json();
    }
    return await res.text();
  }

  async sendPower(serverUuid, action, extraPayload = {}) {
    return this.request(`/api/servers/${encodeURIComponent(serverUuid)}/power`, {
      method: 'POST',
      body: JSON.stringify({ action, ...extraPayload }),
    });
  }

  async sendCommand(serverUuid, command) {
    return this.request(`/api/servers/${encodeURIComponent(serverUuid)}/commands`, {
      method: 'POST',
      body: JSON.stringify({ commands: [command] }),
    });
  }

  async listFiles(serverUuid, dir = '/') {
    return this.request(`/api/servers/${encodeURIComponent(serverUuid)}/files/list?directory=${encodeURIComponent(dir)}`);
  }

  async readFile(serverUuid, filePath) {
    return this.request(`/api/servers/${encodeURIComponent(serverUuid)}/files/contents?file=${encodeURIComponent(filePath)}`);
  }

  async writeFile(serverUuid, filePath, content, encoding = 'utf8') {
    return this.request(`/api/servers/${encodeURIComponent(serverUuid)}/files/write`, {
      method: 'POST',
      body: JSON.stringify({ file: filePath, content, encoding }),
    });
  }

  async pullFile(serverUuid, url, directory = '/', filename = '') {
    return this.request(`/api/servers/${encodeURIComponent(serverUuid)}/files/pull`, {
      method: 'POST',
      body: JSON.stringify({ url, directory, filename }),
    });
  }

  async deleteFiles(serverUuid, files) {
    return this.request(`/api/servers/${encodeURIComponent(serverUuid)}/files/delete`, {
      method: 'POST',
      body: JSON.stringify({ files }),
    });
  }

  async createFolder(serverUuid, root, name) {
    return this.request(`/api/servers/${encodeURIComponent(serverUuid)}/files/create-folder`, {
      method: 'POST',
      body: JSON.stringify({ root, name }),
    });
  }

  async renameFiles(serverUuid, root, files) {
    return this.request(`/api/servers/${encodeURIComponent(serverUuid)}/files/rename`, {
      method: 'POST',
      body: JSON.stringify({ root, files }),
    });
  }

  async compressFiles(serverUuid, root, files, name) {
    return this.request(`/api/servers/${encodeURIComponent(serverUuid)}/files/compress`, {
      method: 'POST',
      body: JSON.stringify({ root, files, name }),
    });
  }

  async decompressFile(serverUuid, root, file) {
    return this.request(`/api/servers/${encodeURIComponent(serverUuid)}/files/decompress`, {
      method: 'POST',
      body: JSON.stringify({ root, file }),
    });
  }
}
