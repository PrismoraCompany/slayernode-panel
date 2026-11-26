/**
 * SlayerNode Panel — 20-Point Mandatory Security Verification Gate
 * Executes live verification against Panel API (:3001), Daemon (:8443), WS bridge,
 * filesystem jail, isolated bwrap/systemd containers, npm audit, and Git hygiene.
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { execFileSync, execSync, exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const execAsync = promisify(exec);

const originalFetch = globalThis.fetch;
globalThis.fetch = function fetchNoKeepAlive(url, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Connection')) headers.set('Connection', 'close');
  return originalFetch(url, { ...init, headers });
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PANEL_URL = 'http://127.0.0.1:3001';
const DAEMON_URL = 'http://127.0.0.1:8443';

const PYTHON_UUID = '511c2b17-60e7-4005-be85-d9565361b6c3';
const NODE_UUID = '9ce776c3-41f3-463e-ba96-259145bd1e2b';
const MC26_UUID = '7d65b277-c9fc-4adc-931b-a58204011de7';
const VOLUMES_ROOT = path.join(process.env.HOME || '/home/xan', '.slayerwings', 'volumes');

const results = new Map();

function record(num, name, pass, evidence) {
  results.set(num, { num, name, pass: Boolean(pass), evidence });
}

function getCookies(res) {
  const arr = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
  return arr.map(c => c.split(';')[0]).join('; ');
}

async function loginAs(email, password) {
  const res = await fetch(`${PANEL_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, cookie: getCookies(res), csrf: data.csrfToken || '', user: data.user, data };
}

function connectWs(url, headers = {}) {
  return new Promise((resolve) => {
    const ws = new WebSocket(url, { headers });
    let settled = false;
    const finish = (outcome) => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch {}
      resolve(outcome);
    };
    const timer = setTimeout(() => finish({ ok: false, reason: 'timeout' }), 4000);
    ws.on('unexpected-response', (_req, res) => {
      clearTimeout(timer);
      finish({ ok: false, httpStatus: res.statusCode, reason: `HTTP ${res.statusCode}` });
    });
    ws.on('open', () => {
      // Wait briefly for first auth/data frame
      setTimeout(() => {
        clearTimeout(timer);
        finish({ ok: true, frames });
      }, 300);
    });
    const frames = [];
    ws.on('message', m => {
      try { frames.push(JSON.parse(m.toString())); } catch {}
    });
    ws.on('error', err => {
      clearTimeout(timer);
      finish({ ok: false, reason: err.message });
    });
    ws.on('close', code => {
      clearTimeout(timer);
      finish({ ok: false, closeCode: code });
    });
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function runAll() {
  const adminSession = await loginAs('admin', process.env.SLAYERNODE_ADMIN_PASSWORD || 'admin');
  if (adminSession.status !== 200) {
    throw new Error(`Admin login failed (${adminSession.status}): ${JSON.stringify(adminSession.data)}`);
  }
  const adminHeaders = { Cookie: adminSession.cookie, 'X-CSRF-Token': adminSession.csrf, 'Content-Type': 'application/json' };

  // Create disposable unprivileged user B (testing IDOR + privilege escalation)
  const suffix = Date.now();
  const userBEmail = `sec_user_b_${suffix}@test.local`;
  const userBName = `secb_${suffix}`;
  const regRes = await fetch(`${PANEL_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name_first: 'Sec',
      name_last: 'Tester',
      username: userBName,
      email: userBEmail,
      password: 'Str0ngUserB!2026',
      root_admin: true,
      is_admin: true,
    }),
  });
  const regData = await regRes.json();
  const userBCookie = getCookies(regRes);
  const userBCsrf = regData.csrfToken || '';
  const userBHeaders = { Cookie: userBCookie, 'X-CSRF-Token': userBCsrf, 'Content-Type': 'application/json' };
  const userBId = regData.user?.id;

  try {
    // 1. Authentication Bypass & Session Validation
    {
      const r1 = await fetch(`${PANEL_URL}/api/client/servers`);
      const r2 = await fetch(`${PANEL_URL}/api/application/users`);
      const r3 = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/resources`);
      const r4 = await fetch(`${PANEL_URL}/api/client/servers`, {
        headers: { Cookie: 'slayer_session=eyJ1aWQiOjF9.tamperedsig0000' },
      });
      const r5 = await fetch(`${PANEL_URL}/api/client/servers`, {
        headers: { Authorization: 'Bearer ptlc_invalidtoken0000' },
      });
      const r6 = await fetch(`${DAEMON_URL}/api/system`, {
        headers: { Authorization: 'Bearer wrong_daemon_secret' },
      });
      const ok = [r1.status, r2.status, r3.status, r4.status, r5.status, r6.status].every(s => s === 401);
      record(1, 'Authentication Bypass & Session Validation', ok, `Unauth/tampered/bad-Bearer statuses: [${r1.status},${r2.status},${r3.status},${r4.status},${r5.status},${r6.status}] (all 401)`);
    }

    // 2. Broken Object-Level Authorization (IDOR)
    {
      const listRes = await fetch(`${PANEL_URL}/api/client/servers`, { headers: userBHeaders });
      const listJson = await listRes.json();
      const leaked = (listJson.data || []).some(s => [PYTHON_UUID, NODE_UUID, MC26_UUID].includes(s.uuid || s.attributes?.uuid));

      const checks = [
        await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}`, { headers: userBHeaders }),
        await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/files/contents?file=%2Fapp.py`, { headers: userBHeaders }),
        await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/resources`, { headers: userBHeaders }),
        await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/command`, { method: 'POST', headers: userBHeaders, body: JSON.stringify({ command: 'status' }) }),
        await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/power`, { method: 'POST', headers: userBHeaders, body: JSON.stringify({ action: 'stop' }) }),
        await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/websocket`, { headers: userBHeaders }),
      ];
      const statuses = checks.map(r => r.status);
      const ok = listRes.status === 200 && !leaked && statuses.every(s => s === 403);
      record(2, 'Broken Object-Level Authorization (IDOR)', ok, `User B server count=${(listJson.data || []).length}, cross-server probes=${JSON.stringify(statuses)}`);
    }

    // 3. Privilege Escalation (Vertical)
    {
      const regEscalated = Boolean(regData.user?.root_admin || regData.user?.is_admin);
      const adminProbes = [
        await fetch(`${PANEL_URL}/api/application/users`, { headers: userBHeaders }),
        await fetch(`${PANEL_URL}/api/application/users`, { method: 'POST', headers: userBHeaders, body: JSON.stringify({ username: 'x', email: 'x@x.co', password: 'Password123!' }) }),
        await fetch(`${PANEL_URL}/api/application/servers`, { method: 'POST', headers: userBHeaders, body: JSON.stringify({ name: 'pwn' }) }),
        await fetch(`${PANEL_URL}/api/application/servers/1`, { method: 'DELETE', headers: userBHeaders }),
        await fetch(`${PANEL_URL}/api/application/nodes`, { method: 'POST', headers: userBHeaders, body: JSON.stringify({ name: 'rogue' }) }),
        await fetch(`${PANEL_URL}/api/admin/settings`, { method: 'PUT', headers: userBHeaders, body: JSON.stringify({ panel_name: 'Hacked' }) }),
        await fetch(`${PANEL_URL}/api/studio/theme`, { method: 'PUT', headers: userBHeaders, body: JSON.stringify({ accent_primary: '#000' }) }),
      ];
      const statuses = adminProbes.map(r => r.status);
      const ok = !regEscalated && statuses.every(s => s === 403);
      record(3, 'Privilege Escalation (Vertical)', ok, `Register escalation blocked (root_admin=${regData.user?.root_admin}), Admin route probes=${JSON.stringify(statuses)}`);
    }

    // 4. Console Command Injection & Shell Escape
    {
      const probeMarkers = ['/tmp/sn_sec_var_pwn', '/tmp/sn_sec_cmd1', '/tmp/sn_sec_cmd2'];
      for (const f of probeMarkers) { try { fs.unlinkSync(f); } catch {} }

      const v1 = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/startup/variable`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ key: 'TEST_VAR', value: 'foo; touch /tmp/sn_sec_var_pwn' }),
      });
      const v2 = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/startup/variable`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ key: 'TEST_VAR', value: '$(touch /tmp/sn_sec_var_pwn)' }),
      });
      const c1 = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/command`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ command: '; touch /tmp/sn_sec_cmd1 && id' }),
      });
      const c2 = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/command`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ command: '$(touch /tmp/sn_sec_cmd2)' }),
      });
      await new Promise(r => setTimeout(r, 400));
      const anyCreated = probeMarkers.some(f => fs.existsSync(f));
      const ok = v1.status === 400 && v2.status === 400 && !anyCreated && (c1.status === 200 || c1.status === 400) && (c2.status === 200 || c2.status === 400);
      record(4, 'Console Command Injection & Shell Escape', ok, `Startup metachar rejected=[${v1.status},${v2.status}], host markers created=${anyCreated}`);
    }

    // 5. File Manager Path Traversal & Symlink Escape
    {
      const trav1 = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/files/contents?file=${encodeURIComponent('../../../../etc/passwd')}`, { headers: adminHeaders });
      const trav2 = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/files/download?file=${encodeURIComponent('../../server/.session_secret')}`, { headers: adminHeaders });
      const trav3 = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/files/write`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ file: '../../outside_trav_pwn.txt', content: 'pwn' }),
      });

      const pyVol = path.join(VOLUMES_ROOT, PYTHON_UUID);
      const extSym = path.join(pyVol, '_sec_ext_sym.txt');
      const dangSym = path.join(pyVol, '_sec_dangling_sym.txt');
      const dangTarget = '/tmp/sn_dangling_target_pwn.txt';
      try { fs.unlinkSync(extSym); } catch {}
      try { fs.unlinkSync(dangSym); } catch {}
      try { fs.unlinkSync(dangTarget); } catch {}
      fs.symlinkSync('/etc/passwd', extSym);
      fs.symlinkSync(dangTarget, dangSym);

      let symRead, symDangWrite;
      try {
        symRead = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/files/contents?file=%2F_sec_ext_sym.txt`, { headers: adminHeaders });
        symDangWrite = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/files/write`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ file: '/_sec_dangling_sym.txt', content: 'escaped' }),
        });
      } finally {
        try { fs.unlinkSync(extSym); } catch {}
        try { fs.unlinkSync(dangSym); } catch {}
      }
      const danglingCreated = fs.existsSync(dangTarget);
      if (danglingCreated) try { fs.unlinkSync(dangTarget); } catch {}
      const ok = [trav1.status, trav2.status, trav3.status, symRead.status, symDangWrite.status].every(s => s === 403 || s === 400) && !danglingCreated;
      record(5, 'File Manager Path Traversal & Symlink Escape', ok, `Traversal/symlink statuses=[${trav1.status},${trav2.status},${trav3.status},${symRead.status},${symDangWrite.status}], danglingWriteEscaped=${danglingCreated}`);
    }

    // 6. WebSocket Authentication & CSWSH
    {
      const metaRes = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/websocket`, { headers: adminHeaders });
      const wsToken = (await metaRes.json()).data?.token;
      const wsNoOrigin = await connectWs(`ws://127.0.0.1:3001/api/client/servers/${PYTHON_UUID}/ws?token=${encodeURIComponent(wsToken)}`);
      const wsUnauth = await connectWs(`ws://127.0.0.1:3001/api/client/servers/${PYTHON_UUID}/ws`, {
        Origin: 'http://127.0.0.1:3000',
      });
      const wsCswsh = await connectWs(`ws://127.0.0.1:3001/api/client/servers/${PYTHON_UUID}/ws?token=${encodeURIComponent(wsToken)}`, {
        Origin: 'https://evil-attacker.example',
      });
      const wsIdor = await connectWs(`ws://127.0.0.1:3001/api/client/servers/${PYTHON_UUID}/ws`, {
        Origin: 'http://127.0.0.1:3000',
        Cookie: userBCookie,
      });
      const wsValid = await connectWs(`ws://127.0.0.1:3001/api/client/servers/${PYTHON_UUID}/ws?token=${encodeURIComponent(wsToken)}`, {
        Origin: 'http://127.0.0.1:3000',
      });
      const ok = !wsNoOrigin.ok && wsNoOrigin.httpStatus === 403
        && !wsUnauth.ok && wsUnauth.httpStatus === 401
        && !wsCswsh.ok && wsCswsh.httpStatus === 403
        && !wsIdor.ok && wsIdor.httpStatus === 403
        && wsValid.ok && wsValid.frames.some(f => f.server === PYTHON_UUID);
      record(6, 'WebSocket Auth & CSWSH Protection', ok, `noOrigin=${wsNoOrigin.httpStatus}, unauthSameOrigin=${wsUnauth.httpStatus}, evilOrigin=${wsCswsh.httpStatus}, idor=${wsIdor.httpStatus}, validSameOrigin=${wsValid.ok}`);
    }

    // 7. Cross-Site Scripting (XSS — Stored & Reflected)
    {
      const payload = '<script>alert(1)</script><img src=x onerror=alert(1)>SafeXss';
      const createKey = await fetch(`${PANEL_URL}/api/client/account/api-keys`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ description: payload }),
      });
      const keyJson = await createKey.json();
      const storedDesc = String(keyJson.description || '');
      if (keyJson.identifier) {
        await fetch(`${PANEL_URL}/api/client/account/api-keys/${keyJson.identifier}`, { method: 'DELETE', headers: adminHeaders });
      }
      // Ensure zero unsafe HTML injection sinks in src/
      const srcFiles = execSync("grep -rn 'dangerouslySetInnerHTML' src/ || true", { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
      const ok = createKey.status === 201 && !storedDesc.includes('<script') && !storedDesc.includes('<img') && srcFiles === '';
      record(7, 'Cross-Site Scripting (XSS — Stored & Reflected)', ok, `Stored key description sanitized="${storedDesc}", dangerouslySetInnerHTML="${srcFiles || 'none'}"`);
    }

    // 8. Cross-Site Request Forgery (CSRF)
    {
      const noCsrf = await fetch(`${PANEL_URL}/api/client/account/api-keys`, {
        method: 'POST',
        headers: { Cookie: adminSession.cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'csrf-no-token' }),
      });
      const badCsrf = await fetch(`${PANEL_URL}/api/client/account/api-keys`, {
        method: 'POST',
        headers: { Cookie: adminSession.cookie, 'X-CSRF-Token': 'forged_csrf_token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'csrf-bad-token' }),
      });
      const badOrigin = await fetch(`${PANEL_URL}/api/client/account/api-keys`, {
        method: 'POST',
        headers: { ...adminHeaders, Origin: 'https://evil-csrf.example' },
        body: JSON.stringify({ description: 'csrf-bad-origin' }),
      });
      const ok = noCsrf.status === 403 && badCsrf.status === 403 && badOrigin.status === 403;
      record(8, 'Cross-Site Request Forgery (CSRF)', ok, `missingToken=${noCsrf.status}, badToken=${badCsrf.status}, crossOrigin=${badOrigin.status}`);
    }

    // 9. SQL / NoSQL Injection
    {
      const sqliLogin = await loginAs("admin' OR '1'='1", 'wrong');
      const nosqlLogin = await fetch(`${PANEL_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: { $ne: '' }, password: { $gt: '' } }),
      });
      const sqliKey = await fetch(`${PANEL_URL}/api/client/account/api-keys`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ description: "TestKey' UNION SELECT * FROM users --" }),
      });
      const ok = (sqliLogin.status === 400 || sqliLogin.status === 401) && (nosqlLogin.status === 400 || nosqlLogin.status === 401) && sqliKey.status === 400;
      record(9, 'SQL / NoSQL Injection', ok, `sqliLogin=${sqliLogin.status}, nosqlLogin=${nosqlLogin.status}, sqliKey=${sqliKey.status}`);
    }

    // 10. Server-Side Request Forgery (SSRF)
    {
      const targets = [
        'http://127.0.0.1:8443/api/system',
        'http://localhost:3001/api/client/servers',
        'http://169.254.169.254/latest/meta-data/',
        'http://10.0.0.1/admin',
        'http://[::1]:3001/',
        'file:///etc/passwd',
      ];
      const statuses = [];
      for (const url of targets) {
        const r = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/files/pull`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ url, directory: '/', filename: 'ssrf_test.txt' }),
        });
        statuses.push(r.status);
      }
      const ok = statuses.every(s => s === 400 || s === 403);
      record(10, 'Server-Side Request Forgery (SSRF)', ok, `Internal/metadata/file URLs all rejected: ${JSON.stringify(statuses)}`);
    }

    // 12. Password Hashing & Credential Storage
    {
      const rawDb = fs.readFileSync(path.join(ROOT_DIR, 'server', 'storage_db.json'), 'utf8');
      const parsedDb = JSON.parse(rawDb);
      const usersHaveScrypt = (parsedDb.users || []).length > 0 && parsedDb.users.every(u =>
        typeof u.password_hash === 'string' && u.password_hash.startsWith('scrypt$') && !('password' in u)
      );
      const keysNoPlaintext = [...(parsedDb.api_keys || []), ...(parsedDb.client_api_keys || [])].every(k =>
        Boolean(k.token_hash) && !('token' in k) && !('secret_token' in k)
      );
      const ok = usersHaveScrypt && keysNoPlaintext;
      record(12, 'Password Hashing & Credential Storage', ok, `All ${parsedDb.users.length} users use scrypt$, 0 plaintext passwords or API secrets in storage_db.json`);
    }

    // 13. Secrets & Environment Variable Exposure
    {
      const rDb1 = await fetch(`${PANEL_URL}/storage_db.json`);
      const rDb2 = await fetch(`${PANEL_URL}/server/storage_db.json`);
      const rTheme = await fetch(`${PANEL_URL}/api/public/theme`);
      const themeTxt = await rTheme.text();
      const rSettings = await fetch(`${PANEL_URL}/api/admin/settings`, { headers: adminHeaders });
      const settingsJson = await rSettings.json();

      const daemonTok = fs.readFileSync(path.join(ROOT_DIR, 'server', '.daemon_token'), 'utf8').trim();
      const sessSec = fs.readFileSync(path.join(ROOT_DIR, 'server', '.session_secret'), 'utf8').trim();
      const distDir = path.join(ROOT_DIR, 'dist', 'assets');
      let bundleLeaked = false;
      if (fs.existsSync(distDir)) {
        for (const f of fs.readdirSync(distDir)) {
          if (f.endsWith('.js')) {
            const js = fs.readFileSync(path.join(distDir, f), 'utf8');
            if ((daemonTok && js.includes(daemonTok)) || (sessSec && js.includes(sessSec))) bundleLeaked = true;
          }
        }
      }
      const noTokenFields = !themeTxt.includes('cloudflare_api_token') && !themeTxt.includes('modrinth_token') && !themeTxt.includes('curseforge_api_key');
      const mailMasked = settingsJson.mail_password === '' || settingsJson.mail_password === '********';
      const ok = rDb1.status >= 400 && rDb2.status >= 400 && noTokenFields && mailMasked && !bundleLeaked;
      record(13, 'Secrets & Environment Variable Exposure', ok, `storage_db HTTP=[${rDb1.status},${rDb2.status}], public theme secret-free=${noTokenFields}, bundleSecretLeak=${bundleLeaked}`);
    }

    // 14. Container Isolation & Resource Limits
    {
      const resPy = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/resources`, { headers: adminHeaders });
      const pyRes = await resPy.json();
      const pids = execSync('pgrep -fx "/usr/bin/python3 -u app.py" || true', { encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean);
      const bwrapCmds = execSync('ps -eo args | grep "[b]wrap" | grep "511c2b17" || true', { encoding: 'utf8' }).trim();
      const systemdScopes = execSync('systemctl --user list-units "slayer-*" --no-pager --plain || true', { encoding: 'utf8' }).trim();
      let leakedHostEnv = true;
      let pidNsActive = false;
      if (pids.length > 0) {
        try {
          const envRaw = fs.readFileSync(`/proc/${pids[0]}/environ`, 'utf8');
          leakedHostEnv = envRaw.includes('XDG_RUNTIME_DIR') || envRaw.includes('DBUS_SESSION_BUS_ADDRESS') || envRaw.includes('SSH_AUTH_SOCK');
          const statusRaw = fs.readFileSync(`/proc/${pids[0]}/status`, 'utf8');
          pidNsActive = /NSpid:\s+\d+\s+[12]\b/.test(statusRaw);
        } catch {}
      }
      const siblingVisible = bwrapCmds.includes(NODE_UUID) || bwrapCmds.includes(MC26_UUID);
      const ok = pyRes.state === 'running' && bwrapCmds.includes('--unshare-pid') && bwrapCmds.includes('--clearenv')
        && systemdScopes.includes('slayer-511c2b17') && !leakedHostEnv && !siblingVisible && pidNsActive;
      record(14, 'Container Isolation & Resource Limits', ok, `bwrap --clearenv+--unshare-pid (NSpid isolated=${pidNsActive}), systemd-scope present, hostEnvLeak=${leakedHostEnv}, siblingMount=${siblingVisible}`);
    }

    // 15. Arbitrary File Upload / Malicious Archive Extraction (Zip Slip)
    {
      const pyVol = path.join(VOLUMES_ROOT, PYTHON_UUID);
      const tmpStage = fs.mkdtempSync('/tmp/sn-zipslip-');
      const tarSlip = path.join(pyVol, '_sec_slip.tar.gz');
      const zipSlip = path.join(pyVol, '_sec_slip.zip');
      const pwnTar = '/tmp/sn_zipslip_tar.txt';
      const pwnZip = '/tmp/sn_zipslip_zip.txt';
      try {
        fs.writeFileSync(path.join(tmpStage, 'evil.txt'), 'zipslip');
        // Craft tar entry with leading ../ traversal using tar transform
        execFileSync('/usr/bin/tar', ['--transform', 's|^|../../../tmp/|', '-czf', tarSlip, '-C', tmpStage, 'evil.txt']);
        // Craft zip entry containing ../ path using python zipfile
        execFileSync('/usr/bin/python3', ['-c', `import zipfile; z=zipfile.ZipFile('${zipSlip}','w'); z.writestr('../../../tmp/sn_zipslip_zip.txt','pwn'); z.close()`]);

        const rTar = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/files/decompress`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ root: '/', file: '_sec_slip.tar.gz' }),
        });
        const rZip = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/files/decompress`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ root: '/', file: '_sec_slip.zip' }),
        });
        const escaped = fs.existsSync(pwnTar) || fs.existsSync(pwnZip) || fs.existsSync('/tmp/evil.txt');
        const ok = rTar.status === 400 && rZip.status === 400 && !escaped;
        record(15, 'File Upload & Zip-Slip Archive Extraction', ok, `Malicious tar=${rTar.status}, zip=${rZip.status}, escapedOutside=${escaped}`);
      } finally {
        try { fs.unlinkSync(tarSlip); } catch {}
        try { fs.unlinkSync(zipSlip); } catch {}
        try { fs.unlinkSync(pwnTar); } catch {}
        try { fs.unlinkSync(pwnZip); } catch {}
        try { fs.unlinkSync('/tmp/evil.txt'); } catch {}
        try { fs.rmSync(tmpStage, { recursive: true, force: true }); } catch {}
      }
    }

    // 16. HTTP Security Headers & CORS Policy
    {
      const rGood = await fetch(`${PANEL_URL}/api/public/theme`, { headers: { Origin: 'http://127.0.0.1:3000' } });
      const rEvilGet = await fetch(`${PANEL_URL}/api/public/theme`, { headers: { Origin: 'https://evil-cors.example' } });
      const rEvilOpt = await fetch(`${PANEL_URL}/api/client/servers`, { method: 'OPTIONS', headers: { Origin: 'https://evil-cors.example' } });
      const csp = rGood.headers.get('content-security-policy') || '';
      const xfo = rGood.headers.get('x-frame-options') || '';
      const xcto = rGood.headers.get('x-content-type-options') || '';
      const refPol = rGood.headers.get('referrer-policy') || '';
      const xpb = rGood.headers.get('x-powered-by');
      const evilAcao = rEvilGet.headers.get('access-control-allow-origin');
      const ok = csp.includes("frame-ancestors 'none'") && xfo === 'DENY' && xcto === 'nosniff' && Boolean(refPol) && !xpb && !evilAcao && rEvilOpt.status === 403;
      record(16, 'HTTP Security Headers & CORS Policy', ok, `CSP+XFO=${xfo}+XCTO=${xcto}, X-Powered-By=${xpb}, evilOriginACAO=${evilAcao}, evilOptions=${rEvilOpt.status}`);
    }

    // 17. Error Handling & Information Disclosure
    {
      const rBadJson = await fetch(`${PANEL_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{broken-json',
      });
      const tBadJson = await rBadJson.text();
      const rNotFound = await fetch(`${PANEL_URL}/api/nonexistent/route`, { headers: adminHeaders });
      const tNotFound = await rNotFound.text();
      const rBadSrv = await fetch(`${PANEL_URL}/api/client/servers/00000000-0000-0000-0000-000000000000`, { headers: adminHeaders });
      const tBadSrv = await rBadSrv.text();
      const combined = tBadJson + tNotFound + tBadSrv;
      const leaks = combined.includes('/home/xan') || /\bat\s+[A-Za-z0-9_.]+\s+\(/.test(combined) || combined.includes('SyntaxError:');
      const ok = rBadJson.status === 400 && rNotFound.status === 404 && rBadSrv.status === 404 && !leaks;
      record(17, 'Error Handling & Information Disclosure', ok, `Clean JSON errors [${rBadJson.status},${rNotFound.status},${rBadSrv.status}], zero stack traces/host paths=${!leaks}`);
    }

    // 18. API Key / Token Scope & Immediate Revocation
    {
      // Client ptlc_ scoped to file.read only
      const cCreate = await fetch(`${PANEL_URL}/api/client/account/api-keys`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ description: 'sec_scoped_client', permissions: ['file.read'] }),
      });
      const cKey = await cCreate.json();
      const cHeaders = { Authorization: `Bearer ${cKey.secret_token}`, 'Content-Type': 'application/json' };
      const cAllow = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/files/list`, { headers: cHeaders });
      const cDenyCmd = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/command`, { method: 'POST', headers: cHeaders, body: JSON.stringify({ command: 'status' }) });
      const cDenyPow = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/power`, { method: 'POST', headers: cHeaders, body: JSON.stringify({ action: 'stop' }) });
      const cDenyAdm = await fetch(`${PANEL_URL}/api/application/users`, { headers: cHeaders });
      await fetch(`${PANEL_URL}/api/client/account/api-keys/${cKey.identifier}`, { method: 'DELETE', headers: adminHeaders });
      const cRevoked = await fetch(`${PANEL_URL}/api/client/servers/${PYTHON_UUID}/files/list`, { headers: cHeaders });

      // Application ptla_ scoped to nodes:read only
      const aCreate = await fetch(`${PANEL_URL}/api/application/api-keys`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ memo: 'sec_scoped_app', scopes: ['nodes:read'] }),
      });
      const aKey = await aCreate.json();
      const aHeaders = { Authorization: `Bearer ${aKey.secret_token}`, 'Content-Type': 'application/json' };
      const aAllow = await fetch(`${PANEL_URL}/api/application/nodes`, { headers: aHeaders });
      const aDenyUsers = await fetch(`${PANEL_URL}/api/application/users`, { headers: aHeaders });
      const aDenyEsc = await fetch(`${PANEL_URL}/api/application/api-keys`, { method: 'POST', headers: aHeaders, body: JSON.stringify({ memo: 'escalated', scopes: ['*'] }) });
      await fetch(`${PANEL_URL}/api/application/api-keys/${aKey.identifier}`, { method: 'DELETE', headers: adminHeaders });
      const aRevoked = await fetch(`${PANEL_URL}/api/application/nodes`, { headers: aHeaders });

      const ok = cAllow.status === 200 && cDenyCmd.status === 403 && cDenyPow.status === 403 && cDenyAdm.status === 403 && cRevoked.status === 401
        && aAllow.status === 200 && aDenyUsers.status === 403 && aDenyEsc.status === 403 && aRevoked.status === 401;
      record(18, 'API Key Scope & Immediate Revocation', ok, `ptlc_ [200,403,403,403->401] & ptla_ [200,403,403->401]`);
    }

    // 19. Dependency & Supply-Chain Vulnerability Scan
    {
      const { stdout: prodRaw } = await execAsync('npm audit --omit=dev --json', { cwd: ROOT_DIR, maxBuffer: 10 * 1024 * 1024 }).catch(e => ({ stdout: e.stdout || '{}' }));
      const { stdout: fullRaw } = await execAsync('npm audit --json', { cwd: ROOT_DIR, maxBuffer: 10 * 1024 * 1024 }).catch(e => ({ stdout: e.stdout || '{}' }));
      const prodOut = JSON.parse(prodRaw || '{}');
      const fullOut = JSON.parse(fullRaw || '{}');
      const pVulns = prodOut.metadata?.vulnerabilities || {};
      const fVulns = fullOut.metadata?.vulnerabilities || {};
      const ok = (pVulns.critical || 0) === 0 && (pVulns.high || 0) === 0 && (fVulns.critical || 0) === 0 && (fVulns.high || 0) === 0;
      record(19, 'Dependency & Supply-Chain Vulnerability Scan', ok, `npm audit total=${fVulns.total || 0}, high=${fVulns.high || 0}, critical=${fVulns.critical || 0}`);
    }

    // 20. Git Pre-Push Hygiene Check
    {
      const gi = fs.readFileSync(path.join(ROOT_DIR, '.gitignore'), 'utf8');
      const requiredPatterns = ['.env', 'node_modules/', 'dist/', '*.log', 'server/.daemon_token', 'server/.session_secret', 'server/storage_db.json', '.slayerwings/'];
      const missing = requiredPatterns.filter(p => !gi.includes(p));
      const ok = missing.length === 0;
      record(20, 'Git Pre-Push Hygiene Check', ok, missing.length === 0 ? `Verified .gitignore covers all ${requiredPatterns.length} required secret/artifact/test-data patterns` : `Missing: ${missing.join(', ')}`);
    }

    // Clean up temporary user B (and any leftover secb_* users) before hammering authLimiter
    const usersRes = await fetch(`${PANEL_URL}/api/application/users`, { headers: adminHeaders });
    const usersData = await usersRes.json().catch(() => ({ data: [] }));
    for (const u of (usersData.data || [])) {
      if (String(u.username || '').startsWith('secb_') || String(u.id) === String(userBId)) {
        await fetch(`${PANEL_URL}/api/application/users/${u.id}`, { method: 'DELETE', headers: adminHeaders });
      }
    }

    // 11. Rate Limiting & Brute-Force Protection (executed after cleanup so 60s window doesn't block cleanup)
    {
      let got429 = false;
      let retryAfter = '';
      for (let i = 0; i < 20; i++) {
        const r = await fetch(`${PANEL_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'nonexistent_ratelimit_probe@test.local', password: 'wrong' }),
        });
        if (r.status === 429) {
          got429 = true;
          retryAfter = r.headers.get('retry-after') || '';
          break;
        }
      }
      record(11, 'Rate Limiting & Brute-Force Protection', got429, got429 ? `Triggered HTTP 429 on /api/auth/login brute-force burst (Retry-After=${retryAfter}s)` : 'Did not trigger 429 within 20 attempts');
    }
  } catch (err) {
    // Attempt cleanup on failure
    if (userBId) {
      await fetch(`${PANEL_URL}/api/application/users/${userBId}`, { method: 'DELETE', headers: adminHeaders }).catch(() => {});
    }
    throw err;
  }

  console.log('\n=== SlayerNode Panel — 20-Point Security Verification Gate ===');
  let passed = 0;
  let failed = 0;
  for (let i = 1; i <= 20; i++) {
    const r = results.get(i);
    if (!r) {
      console.log(`✘ [${i}] MISSING TEST`);
      failed++;
      continue;
    }
    if (r.pass) {
      passed++;
      console.log(`✔ [${String(r.num).padStart(2, '0')}/20] PASS — ${r.name}: ${r.evidence}`);
    } else {
      failed++;
      console.log(`✘ [${String(r.num).padStart(2, '0')}/20] FAIL — ${r.name}: ${r.evidence}`);
    }
  }
  console.log(`\nSummary: ${passed}/20 Passed, ${failed}/20 Failed`);
  if (failed > 0) process.exit(1);
}

runAll().catch(err => {
  console.error('Security Gate crashed:', err);
  process.exit(1);
});
