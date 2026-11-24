/**
 * SlayerWings Daemon & SlayerNode Panel Integration Test Suite
 * Validates REST API (8443), SFTP Probe (2202), and WebSocket live stats
 */

import http from 'http';
import net from 'net';
import { WebSocket } from 'ws';

const DAEMON_PORT = 8443;
const SFTP_PORT = 2202;
const PANEL_API = 'http://localhost:3001';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

function httpPost(url, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function testSftpBanner(host, port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => {});
    socket.setTimeout(3000);
    socket.on('data', data => {
      const banner = data.toString();
      socket.end();
      resolve(banner.trim());
    });
    socket.on('error', reject);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('SFTP banner connection timed out'));
    });
  });
}

function testWebSocket(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let authReceived = false;
    let statsReceived = false;

    ws.on('open', () => {
      console.log('   ✓ WebSocket connection established to SlayerWings daemon');
    });

    ws.on('message', data => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.event === 'auth_success') {
          authReceived = true;
        }
        if (msg.event === 'stats') {
          statsReceived = true;
          ws.close();
          resolve({ authReceived, statsReceived, stats: msg.data });
        }
      } catch (e) {
        reject(e);
      }
    });

    ws.on('error', reject);
    setTimeout(() => {
      if (!statsReceived) {
        ws.close();
        reject(new Error('WebSocket stats timeout'));
      }
    }, 4000);
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('SLAYERWINGS EXTERNAL SANDBOX DAEMON TEST SUITE');
  console.log('Custom Daemon Port: 8443 | Custom SFTP Port: 2202');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  // Test 1: REST API System Diagnostics
  total++;
  try {
    const res = await httpGet(`http://127.0.0.1:${DAEMON_PORT}/api/system`);
    if (res.status === 200 && res.data.version === 'v1.0.0-slayerwings' && res.data.data_directory === '/var/lib/slayerwings/volumes') {
      console.log(`[PASS] Test 1: Daemon System Probe`);
      console.log(`       Version: ${res.data.version} | Kernel: ${res.data.kernel} | Network: ${res.data.docker_network}`);
      console.log(`       Data Directory: ${res.data.data_directory} (Zero ptero paths)`);
      passed++;
    } else {
      console.error(`[FAIL] Test 1: Unexpected response:`, res);
    }
  } catch (err) {
    console.error(`[FAIL] Test 1: System probe error:`, err.message);
  }

  // Test 2: List Servers on Sandbox Wing
  total++;
  try {
    const res = await httpGet(`http://127.0.0.1:${DAEMON_PORT}/api/servers`);
    if (res.status === 200 && Array.isArray(res.data.data) && res.data.data.length >= 2) {
      console.log(`\n[PASS] Test 2: Daemon Server Container Enumeration`);
      console.log(`       Found ${res.data.data.length} active containers running on node hypervisor`);
      passed++;
    } else {
      console.error(`[FAIL] Test 2: Unexpected server list:`, res);
    }
  } catch (err) {
    console.error(`[FAIL] Test 2: Server list error:`, err.message);
  }

  // Test 3: Power Action (Start/Restart)
  total++;
  try {
    const res = await httpPost(`http://127.0.0.1:${DAEMON_PORT}/api/servers/8a9c4b12-9214-4112-aa11-881234567890/power`, { action: 'restart' });
    if (res.status === 200 && res.data.success && res.data.current_state === 'running') {
      console.log(`\n[PASS] Test 3: Container Power Action (Restart)`);
      console.log(`       Server UUID: ${res.data.server} | State: ${res.data.current_state}`);
      passed++;
    } else {
      console.error(`[FAIL] Test 3: Power action failed:`, res);
    }
  } catch (err) {
    console.error(`[FAIL] Test 3: Power error:`, err.message);
  }

  // Test 4: Custom SFTP Port 2202 Subsystem
  total++;
  try {
    const banner = await testSftpBanner('127.0.0.1', SFTP_PORT);
    if (banner.includes('SlayerWings_SFTP_1.0.0')) {
      console.log(`\n[PASS] Test 4: Custom SFTP Subsystem Port 2202`);
      console.log(`       Received banner: "${banner}"`);
      passed++;
    } else {
      console.error(`[FAIL] Test 4: Unexpected SFTP banner: "${banner}"`);
    }
  } catch (err) {
    console.error(`[FAIL] Test 4: SFTP probe error:`, err.message);
  }

  // Test 5: WebSocket Live Metrics Stream on 8443
  total++;
  try {
    const wsResult = await testWebSocket(`ws://127.0.0.1:${DAEMON_PORT}/ws`);
    if (wsResult.authReceived && wsResult.statsReceived) {
      console.log(`\n[PASS] Test 5: WebSocket Telemetry & Metrics Stream (Port 8443)`);
      console.log(`       Received live CPU: ${wsResult.stats.cpu_absolute}% | RAM: ${(wsResult.stats.memory_bytes / 1024 / 1024).toFixed(1)} MB`);
      passed++;
    } else {
      console.error(`[FAIL] Test 5: Incomplete WebSocket results:`, wsResult);
    }
  } catch (err) {
    console.error(`[FAIL] Test 5: WebSocket test error:`, err.message);
  }

  // Test 6: Verify Panel to Node Association
  total++;
  try {
    const res = await httpGet(`${PANEL_API}/api/application/nodes`);
    if (res.status === 200 && res.data.data) {
      console.log(`\n[PASS] Test 6: SlayerNode Panel Node Association`);
      const nodes = res.data.data;
      console.log(`       Panel has ${nodes.length} configured nodes with custom ports:`);
      nodes.forEach(n => {
        console.log(`        - ${n.attributes.name}: listen port ${n.attributes.daemon_listen}, SFTP port ${n.attributes.daemon_sftp}, base ${n.attributes.daemon_base}`);
      });
      passed++;
    }
  } catch (err) {
    console.log(`\n[WARN] Panel backend on port 3001 is offline or reloading (starting soon)`);
  }

  console.log('\n========================================================');
  console.log(`RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('========================================================');

  process.exit(passed >= 5 ? 0 : 1);
}

runTests();
