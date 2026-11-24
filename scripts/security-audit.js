/**
 * SlayerNode Security & Penetration Audit Suite
 * Tests tenant isolation, path traversal, injection sanitization,
 * credential validation, and API authentication boundaries.
 */

import http from 'http';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runSecurityAudit() {
  console.log('\x1b[36m====================================================\x1b[0m');
  console.log('\x1b[1;31m🛡️ SlayerNode Automated Security & Penetration Suite\x1b[0m');
  console.log('\x1b[36m====================================================\x1b[0m\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Direct Internal Database File Access Protection
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/storage_db.json',
      method: 'GET',
    });
    if (res.status === 403) {
      console.log('\x1b[32m✔ [PASS]\x1b[0m Test 1: Direct storage_db.json access forbidden (HTTP 403)');
      passed++;
    } else {
      console.log('\x1b[31m✘ [FAIL]\x1b[0m Test 1: Expected 403, got', res.status);
      failed++;
    }
  } catch (e) {
    console.log('\x1b[31m✘ [FAIL]\x1b[0m Test 1 exception:', e.message);
    failed++;
  }

  // Test 2: SQL / Command Injection Payload Sanitization
  try {
    const res = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/client/account/api-keys',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        description: "TestKey' UNION SELECT * FROM users --",
        allowed_ips: '127.0.0.1',
      }
    );
    if (res.status === 201 && !res.body?.attributes?.description?.includes('UNION SELECT')) {
      console.log('\x1b[32m✔ [PASS]\x1b[0m Test 2: SQL injection payload blocked & sanitized safely');
      passed++;
      // Clean up key
      if (res.body?.attributes?.identifier) {
        await makeRequest({
          hostname: 'localhost',
          port: 3001,
          path: `/api/client/account/api-keys/${res.body.attributes.identifier}`,
          method: 'DELETE',
        });
      }
    } else {
      console.log('\x1b[31m✘ [FAIL]\x1b[0m Test 2 failed:', res.status, res.body);
      failed++;
    }
  } catch (e) {
    console.log('\x1b[31m✘ [FAIL]\x1b[0m Test 2 exception:', e.message);
    failed++;
  }

  // Test 3: SSH Key Format Validation (Prevents Malformed / Host-Injection Keys)
  try {
    const res = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/client/account/ssh-keys',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'Malicious Key',
        public_key: 'malicious_non_ssh_payload_string',
      }
    );
    if (res.status === 400 && res.body?.error?.includes('Invalid SSH key format')) {
      console.log('\x1b[32m✔ [PASS]\x1b[0m Test 3: Malformed SSH key rejected (HTTP 400)');
      passed++;
    } else {
      console.log('\x1b[31m✘ [FAIL]\x1b[0m Test 3: Expected 400, got', res.status, res.body);
      failed++;
    }
  } catch (e) {
    console.log('\x1b[31m✘ [FAIL]\x1b[0m Test 3 exception:', e.message);
    failed++;
  }

  // Test 4: Weak Password Protection (Must be >= 8 characters)
  try {
    const res = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/client/account/password',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        current_password: 'admin',
        new_password: '123',
        new_password_confirmation: '123',
      }
    );
    if (res.status === 400 && res.body?.error?.includes('8 characters')) {
      console.log('\x1b[32m✔ [PASS]\x1b[0m Test 4: Weak password (< 8 chars) rejected (HTTP 400)');
      passed++;
    } else {
      console.log('\x1b[31m✘ [FAIL]\x1b[0m Test 4: Expected 400, got', res.status, res.body);
      failed++;
    }
  } catch (e) {
    console.log('\x1b[31m✘ [FAIL]\x1b[0m Test 4 exception:', e.message);
    failed++;
  }

  // Test 5: Tenant Isolation Boundary Check
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/client/servers/non-existent-uuid-or-unauthorized',
      method: 'GET',
    });
    if (res.status === 404 || res.status === 403) {
      console.log('\x1b[32m✔ [PASS]\x1b[0m Test 5: Unauthorized server access prevented (HTTP ' + res.status + ')');
      passed++;
    } else {
      console.log('\x1b[31m✘ [FAIL]\x1b[0m Test 5: Expected 404/403, got', res.status);
      failed++;
    }
  } catch (e) {
    console.log('\x1b[31m✘ [FAIL]\x1b[0m Test 5 exception:', e.message);
    failed++;
  }

  // Test 6: Client API Key Bearer Authentication & Scope
  try {
    // Generate valid client API key
    const createRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/client/account/api-keys',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { description: 'Automated Security Token', allowed_ips: '127.0.0.1' }
    );

    const token = createRes.body?.meta?.secret_token;
    const identifier = createRes.body?.attributes?.identifier;

    // Use token
    const authRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/client/servers',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    // Revoke token
    await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/api/client/account/api-keys/${identifier}`,
      method: 'DELETE',
    });

    if (authRes.status === 200 && Array.isArray(authRes.body?.data)) {
      console.log('\x1b[32m✔ [PASS]\x1b[0m Test 6: Bearer token authentication verified & securely revoked');
      passed++;
    } else {
      console.log('\x1b[31m✘ [FAIL]\x1b[0m Test 6 failed:', authRes.status);
      failed++;
    }
  } catch (e) {
    console.log('\x1b[31m✘ [FAIL]\x1b[0m Test 6 exception:', e.message);
    failed++;
  }

  console.log('\n\x1b[36m----------------------------------------------------\x1b[0m');
  console.log(`\x1b[1mAudit Results: \x1b[32m${passed} Passed\x1b[0m, \x1b[${failed > 0 ? '31' : '32'}m${failed} Failed\x1b[0m`);
  console.log('\x1b[36m----------------------------------------------------\x1b[0m\n');
}

runSecurityAudit();
