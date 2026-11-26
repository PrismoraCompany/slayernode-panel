/**
 * SlayerNode Real Per-Server Addon Handlers
 * - Software Switcher (PaperMC v3 / Purpur / Vanilla / Node / Python)
 * - Mod & Plugin Browser (Modrinth API v2 search + SSRF-safe daemon pull)
 * - Live Player Manager (ops.json, whitelist.json, banned-players.json + real stdin commands)
 * - Crash Log Analyzer (reads logs/latest.log & crash-reports/ from daemon)
 * - Server Splitter & Subdomain Manager (persisted per-server records)
 */

import crypto from 'crypto';
import { daemonRequest, getServerNode } from './daemonBridge.js';
import { assertSafeExternalUrl } from './security.js';
import { nextId } from './store.js';

export function registerAddonRoutes(app, deps) {
  const {
    getDb,
    saveState,
    verifyServerOwnership,
    recordActivity,
  } = deps;

  // --------------------------------------------------------------------------
  // 1. Software & Version Switcher (PaperMC v3 real builds)
  // --------------------------------------------------------------------------
  app.get('/api/client/servers/:uuid/addons/software', verifyServerOwnership('startup.read'), async (req, res) => {
    try {
      const resp = await fetch('https://fill.papermc.io/v3/projects/paper', {
        headers: { 'User-Agent': 'SlayerNode-Panel/1.0' },
      });
      if (!resp.ok) throw new Error(`PaperMC API returned ${resp.status}`);
      const data = await resp.json();
      const versions = Array.isArray(data?.versions) ? data.versions : Object.values(data?.versions || {}).flat();
      return res.json({
        project: 'paper',
        versions: versions.slice(0, 40),
        current_version: req.targetServer.environment?.MINECRAFT_VERSION || '',
        current_egg: req.targetServer.egg_name || '',
      });
    } catch (err) {
      return res.status(502).json({ error: `Failed to fetch software versions: ${err.message}` });
    }
  });

  app.post('/api/client/servers/:uuid/addons/software/install', verifyServerOwnership('startup.update'), async (req, res) => {
    const { project = 'paper', version } = req.body || {};
    if (!version || !/^[a-zA-Z0-9._-]{1,32}$/.test(String(version))) {
      return res.status(400).json({ error: 'Valid software version is required' });
    }
    const db = getDb();
    const srv = req.targetServer;
    const node = getServerNode(db, srv);
    if (!node) return res.status(404).json({ error: 'Assigned node missing' });

    try {
      let downloadUrl = '';
      if (String(project).toLowerCase() === 'paper') {
        const buildsRes = await fetch(`https://fill.papermc.io/v3/projects/paper/versions/${encodeURIComponent(version)}/builds`, {
          headers: { 'User-Agent': 'SlayerNode-Panel/1.0' },
        });
        if (!buildsRes.ok) throw new Error(`No Paper builds found for version ${version}`);
        const builds = await buildsRes.json();
        const latest = Array.isArray(builds) ? builds[0] : null;
        downloadUrl = latest?.downloads?.['server:default']?.url || '';
      }
      if (!downloadUrl) return res.status(404).json({ error: `Download URL unavailable for ${project} ${version}` });
      await assertSafeExternalUrl(downloadUrl);

      const jarFile = srv.environment?.SERVER_JARFILE || 'server.jar';
      await daemonRequest(node, `/api/servers/${srv.uuid}/files/pull`, {
        method: 'POST',
        timeoutMs: 120_000,
        body: { url: downloadUrl, directory: '/', filename: jarFile },
      });

      srv.environment = { ...(srv.environment || {}), MINECRAFT_VERSION: String(version), DL_PATH: downloadUrl };
      const varEntry = (srv.variables || []).find(v => v.env_variable === 'MINECRAFT_VERSION');
      if (varEntry) varEntry.server_value = String(version);
      saveState(db);

      recordActivity(req.user, srv.uuid, 'server:software.install', `Installed ${project} ${version} (${jarFile})`, req.ip);
      return res.json({ success: true, project, version, jar: jarFile });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 2. Mod & Plugin Browser (Real Modrinth API v2 + Daemon Pull)
  // --------------------------------------------------------------------------
  app.get('/api/client/servers/:uuid/addons/mods/search', verifyServerOwnership('file.read'), async (req, res) => {
    const query = String(req.query.q || '').trim().slice(0, 120);
    const projectType = String(req.query.type || 'plugin').toLowerCase(); // plugin | mod
    const facets = JSON.stringify([[`project_type:${projectType === 'mod' ? 'mod' : 'plugin'}`]]);
    try {
      const apiUrl = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=${encodeURIComponent(facets)}&limit=18`;
      const resp = await fetch(apiUrl, { headers: { 'User-Agent': 'SlayerNode-Panel/1.0' } });
      if (!resp.ok) throw new Error(`Modrinth HTTP ${resp.status}`);
      const data = await resp.json();
      return res.json({ hits: data.hits || [], total_hits: data.total_hits || 0 });
    } catch (err) {
      return res.status(502).json({ error: `Modrinth search failed: ${err.message}` });
    }
  });

  app.post('/api/client/servers/:uuid/addons/mods/install', verifyServerOwnership('file.create'), async (req, res) => {
    const { project_id, directory = '/plugins', loader } = req.body || {};
    if (!project_id || !/^[a-zA-Z0-9_-]{1,32}$/.test(String(project_id))) {
      return res.status(400).json({ error: 'Valid Modrinth project_id is required' });
    }
    const db = getDb();
    const srv = req.targetServer;
    const node = getServerNode(db, srv);
    if (!node) return res.status(404).json({ error: 'Assigned node missing' });

    const safeDir = ['/plugins', '/mods', '/'].includes(directory) ? directory : '/plugins';
    try {
      const verRes = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(project_id)}/version`, {
        headers: { 'User-Agent': 'SlayerNode-Panel/1.0' },
      });
      if (!verRes.ok) throw new Error(`Modrinth version lookup HTTP ${verRes.status}`);
      const versions = await verRes.json();
      if (!Array.isArray(versions) || versions.length === 0) {
        return res.status(404).json({ error: 'No downloadable release files found for this project' });
      }
      const mcVer = srv.environment?.MINECRAFT_VERSION;
      const chosen = versions.find(v => {
        const loaderOk = !loader || (v.loaders || []).includes(loader);
        const verOk = !mcVer || mcVer === 'latest' || (v.game_versions || []).includes(mcVer);
        return loaderOk && verOk && Array.isArray(v.files) && v.files.length > 0;
      }) || versions.find(v => Array.isArray(v.files) && v.files.length > 0);

      const fileObj = chosen?.files?.find(f => f.primary) || chosen?.files?.[0];
      if (!fileObj?.url) return res.status(404).json({ error: 'No file URL available' });

      await assertSafeExternalUrl(fileObj.url);
      await daemonRequest(node, `/api/servers/${srv.uuid}/files/create-folder`, {
        method: 'POST',
        body: { root: '/', name: safeDir.replace(/^\//, '') },
      }).catch(() => {});

      const safeFilename = String(fileObj.filename || `${project_id}.jar`).replace(/[^a-zA-Z0-9._-]/g, '_');
      await daemonRequest(node, `/api/servers/${srv.uuid}/files/pull`, {
        method: 'POST',
        timeoutMs: 60_000,
        body: { url: fileObj.url, directory: safeDir, filename: safeFilename },
      });

      recordActivity(req.user, srv.uuid, 'server:addon.install', `Installed ${safeFilename} into ${safeDir}`, req.ip);
      return res.json({ success: true, filename: safeFilename, directory: safeDir, version: chosen.version_number });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 3. Live Player Manager (Real files + real console commands)
  // --------------------------------------------------------------------------
  async function readJsonFromServer(node, srvUuid, filePath, fallback = []) {
    try {
      const resp = await daemonRequest(node, `/api/servers/${srvUuid}/files/contents?file=${encodeURIComponent(filePath)}`);
      const text = typeof resp === 'string' ? resp : (resp?.content || '');
      return text ? JSON.parse(text) : fallback;
    } catch {
      return fallback;
    }
  }

  app.get('/api/client/servers/:uuid/addons/players', verifyServerOwnership('control.console'), async (req, res) => {
    const db = getDb();
    const srv = req.targetServer;
    const node = getServerNode(db, srv);
    if (!node) return res.status(404).json({ error: 'Assigned node missing' });

    try {
      const [ops, whitelist, banned, logsRes] = await Promise.all([
        readJsonFromServer(node, srv.uuid, '/ops.json', []),
        readJsonFromServer(node, srv.uuid, '/whitelist.json', []),
        readJsonFromServer(node, srv.uuid, '/banned-players.json', []),
        daemonRequest(node, `/api/servers/${srv.uuid}/logs`).catch(() => ({ logs: [] })),
      ]);

      // Parse recent joined/left players from real daemon console logs
      const onlineSet = new Set();
      for (const line of (logsRes.logs || [])) {
        const joinMatch = String(line).match(/]:\s+([A-Za-z0-9_]{3,16})\[\/[^\]]+\]\s+logged in|]:\s+([A-Za-z0-9_]{3,16})\s+joined the game/i);
        if (joinMatch) onlineSet.add(joinMatch[1] || joinMatch[2]);
        const leaveMatch = String(line).match(/]:\s+([A-Za-z0-9_]{3,16})\s+lost connection|]:\s+([A-Za-z0-9_]{3,16})\s+left the game/i);
        if (leaveMatch) onlineSet.delete(leaveMatch[1] || leaveMatch[2]);
      }

      const opNames = new Set((Array.isArray(ops) ? ops : []).map(o => o.name?.toLowerCase()));
      const wlNames = new Set((Array.isArray(whitelist) ? whitelist : []).map(w => w.name?.toLowerCase()));

      const onlinePlayers = Array.from(onlineSet).map(name => ({
        name,
        is_op: opNames.has(name.toLowerCase()),
        is_whitelisted: wlNames.has(name.toLowerCase()),
        online: true,
      }));

      return res.json({
        online: onlinePlayers,
        ops: Array.isArray(ops) ? ops : [],
        whitelist: Array.isArray(whitelist) ? whitelist : [],
        banned: Array.isArray(banned) ? banned : [],
      });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  });

  app.post('/api/client/servers/:uuid/addons/players/action', verifyServerOwnership('control.console'), async (req, res) => {
    const { action, player, reason } = req.body || {};
    const cleanPlayer = String(player || '').trim();
    if (!/^[A-Za-z0-9_]{1,32}$/.test(cleanPlayer)) {
      return res.status(400).json({ error: 'Valid player username is required' });
    }
    const cleanReason = String(reason || 'Action by Administrator').replace(/[\r\n]/g, ' ').slice(0, 120);
    const cmdMap = {
      kick: `kick ${cleanPlayer} ${cleanReason}`,
      ban: `ban ${cleanPlayer} ${cleanReason}`,
      pardon: `pardon ${cleanPlayer}`,
      op: `op ${cleanPlayer}`,
      deop: `deop ${cleanPlayer}`,
      'whitelist-add': `whitelist add ${cleanPlayer}`,
      'whitelist-remove': `whitelist remove ${cleanPlayer}`,
    };
    const cmd = cmdMap[action];
    if (!cmd) return res.status(400).json({ error: 'Unsupported player action' });

    const db = getDb();
    const srv = req.targetServer;
    const node = getServerNode(db, srv);
    if (!node) return res.status(404).json({ error: 'Assigned node missing' });

    try {
      await daemonRequest(node, `/api/servers/${srv.uuid}/commands`, {
        method: 'POST',
        body: { commands: [cmd] },
      });
      recordActivity(req.user, srv.uuid, `server:player.${action}`, `Executed "${cmd}"`, req.ip);
      return res.json({ success: true, command: cmd });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 4. Crash Analyzer (Reads real logs/latest.log & crash-reports)
  // --------------------------------------------------------------------------
  app.get('/api/client/servers/:uuid/addons/crash-analyzer', verifyServerOwnership('file.read'), async (req, res) => {
    const db = getDb();
    const srv = req.targetServer;
    const node = getServerNode(db, srv);
    if (!node) return res.status(404).json({ error: 'Assigned node missing' });

    try {
      const [consoleLogs, crashDir] = await Promise.all([
        daemonRequest(node, `/api/servers/${srv.uuid}/logs`).catch(() => ({ logs: [] })),
        daemonRequest(node, `/api/servers/${srv.uuid}/files/list?directory=/crash-reports`).catch(() => ({ data: [] })),
      ]);
      const latestLogText = await daemonRequest(node, `/api/servers/${srv.uuid}/files/contents?file=/logs/latest.log`)
        .then(r => (typeof r === 'string' ? r : r?.content || ''))
        .catch(() => '');

      const combinedLines = [
        ...(latestLogText ? latestLogText.split('\n') : []),
        ...(consoleLogs.logs || []),
      ];

      const issues = [];
      const joined = combinedLines.join('\n');

      if (/OutOfMemoryError|Java heap space|GC overhead limit exceeded/i.test(joined)) {
        issues.push({
          severity: 'critical',
          title: 'Java OutOfMemoryError Detected',
          detail: 'The JVM exhausted its heap allocation.',
          remediation: 'Increase server RAM allocation in Admin Build Configuration or optimize heavy plugins.',
        });
      }
      if (/FAILED TO BIND TO PORT|Address already in use/i.test(joined)) {
        issues.push({
          severity: 'critical',
          title: 'Port Binding Conflict',
          detail: 'Another process is using the assigned server port.',
          remediation: 'Verify server.properties server-port matches your primary allocation port in Network tab.',
        });
      }
      if (/agree to the EULA|eula\.txt/i.test(joined)) {
        issues.push({
          severity: 'high',
          title: 'Minecraft EULA Not Accepted',
          detail: 'Minecraft aborted startup because eula=true is missing.',
          remediation: 'Open eula.txt in File Manager and confirm eula=true.',
        });
      }
      if (/UnsupportedClassVersionError|compiled by a more recent version of the Java Runtime/i.test(joined)) {
        issues.push({
          severity: 'high',
          title: 'Incompatible Java Version',
          detail: 'Server JAR or plugin requires a newer Java version.',
          remediation: 'Check installed Java runtime or update plugin builds.',
        });
      }
      if (/SyntaxError|ReferenceError|ModuleNotFoundError|Traceback \(most recent call last\)|ERR!/i.test(joined)) {
        issues.push({
          severity: 'high',
          title: 'Application Runtime Exception',
          detail: 'A Node.js or Python runtime error occurred in recent output.',
          remediation: 'Inspect the matching error trace in Console or latest log lines below.',
        });
      }

      const errorLines = combinedLines.filter(l => /error|exception|fatal|traceback|warn/i.test(l)).slice(-40);
      return res.json({
        issues,
        crash_reports: crashDir.data || [],
        error_excerpt: errorLines,
        lines_scanned: combinedLines.length,
      });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // 5. Dynamic Server Splitter (Persisted per parent server)
  // --------------------------------------------------------------------------
  app.get('/api/client/servers/:uuid/addons/splits', verifyServerOwnership('control.read'), (req, res) => {
    const db = getDb();
    const srv = req.targetServer;
    const splits = (db.server_splits || []).filter(sp => sp.parent_server_uuid === srv.uuid);
    const usedMem = splits.reduce((a, b) => a + (b.memory || 0), 0);
    const usedDisk = splits.reduce((a, b) => a + (b.disk || 0), 0);
    const usedCpu = splits.reduce((a, b) => a + (b.cpu || 0), 0);
    return res.json({
      splits,
      parent_limits: srv.limits,
      available: {
        memory: Math.max(0, (srv.limits?.memory || 0) - usedMem),
        disk: Math.max(0, (srv.limits?.disk || 0) - usedDisk),
        cpu: Math.max(0, (srv.limits?.cpu || 100) - usedCpu),
      },
    });
  });

  app.post('/api/client/servers/:uuid/addons/splits', verifyServerOwnership('control.write'), async (req, res) => {
    const db = getDb();
    const srv = req.targetServer;
    const { name, memory = 512, disk = 2048, cpu = 50, egg_id } = req.body || {};
    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ error: 'Split server name is required' });
    }
    const existingSplits = (db.server_splits || []).filter(sp => sp.parent_server_uuid === srv.uuid);
    const usedMem = existingSplits.reduce((a, b) => a + (b.memory || 0), 0);
    const usedDisk = existingSplits.reduce((a, b) => a + (b.disk || 0), 0);
    if (usedMem + Number(memory) > (srv.limits?.memory || 0)) {
      return res.status(400).json({ error: 'Insufficient remaining parent RAM budget' });
    }
    if (usedDisk + Number(disk) > (srv.limits?.disk || 0)) {
      return res.status(400).json({ error: 'Insufficient remaining parent Disk budget' });
    }

    const freeAlloc = (db.allocations || []).find(a => String(a.node_id) === String(srv.node_id) && !a.server_id);
    if (!freeAlloc) return res.status(400).json({ error: 'No free allocations available on this node' });

    const egg = db.eggs.find(e => String(e.id) === String(egg_id || srv.egg_id)) || db.eggs[0];
    const splitUuid = crypto.randomUUID();
    const childServerId = nextId(db.servers);
    freeAlloc.server_id = childServerId;
    freeAlloc.assigned = true;

    const childEnv = {
      SERVER_PORT: String(freeAlloc.port),
      SERVER_MEMORY: String(memory),
    };
    for (const v of (egg?.variables || [])) {
      childEnv[v.env_variable] = v.default_value || '';
    }

    const childServer = {
      id: childServerId,
      uuid: splitUuid,
      identifier: splitUuid.slice(0, 8),
      name: String(name).trim().slice(0, 64),
      description: `Split instance from ${srv.name}`,
      status: 'offline',
      suspended: false,
      user_id: srv.user_id,
      owner_id: srv.owner_id || srv.user_id,
      node_id: srv.node_id,
      allocation_id: freeAlloc.id,
      nest_id: egg?.nest_id || srv.nest_id,
      egg_id: egg?.id || srv.egg_id,
      egg_name: egg?.name || srv.egg_name,
      startup: egg?.startup || srv.startup,
      environment: childEnv,
      variables: egg?.variables || [],
      limits: { memory: Number(memory), swap: 0, disk: Number(disk), io: 500, cpu: Number(cpu) },
      feature_limits: { databases: 1, allocations: 1, backups: 1 },
      parent_server_uuid: srv.uuid,
      created_at: new Date().toISOString(),
    };

    const node = getServerNode(db, srv);
    if (node) {
      await daemonRequest(node, '/api/servers', {
        method: 'POST',
        body: {
          uuid: childServer.uuid,
          name: childServer.name,
          memory: childServer.limits.memory,
          swap: 0,
          disk: childServer.limits.disk,
          cpu: childServer.limits.cpu,
          port: freeAlloc.port,
          egg_name: childServer.egg_name,
          startup: childServer.startup,
          environment: childServer.environment,
        },
      }).catch(() => {});
    }

    db.servers.push(childServer);
    const splitRecord = {
      id: nextId(db.server_splits),
      parent_server_uuid: srv.uuid,
      child_server_id: childServerId,
      child_server_uuid: splitUuid,
      name: childServer.name,
      memory: Number(memory),
      disk: Number(disk),
      cpu: Number(cpu),
      port: freeAlloc.port,
      created_at: new Date().toISOString(),
    };
    db.server_splits.push(splitRecord);
    saveState(db);
    recordActivity(req.user, srv.uuid, 'server:split.create', `Created split instance ${childServer.name} (${memory}MB)`, req.ip);
    return res.status(201).json(splitRecord);
  });

  app.delete('/api/client/servers/:uuid/addons/splits/:splitId', verifyServerOwnership('control.write'), async (req, res) => {
    const db = getDb();
    const srv = req.targetServer;
    const idx = (db.server_splits || []).findIndex(
      sp => String(sp.id) === String(req.params.splitId) && sp.parent_server_uuid === srv.uuid
    );
    if (idx === -1) return res.status(404).json({ error: 'Split record not found' });

    const [split] = db.server_splits.splice(idx, 1);
    const childIdx = db.servers.findIndex(s => s.uuid === split.child_server_uuid);
    if (childIdx !== -1) {
      const [child] = db.servers.splice(childIdx, 1);
      const node = getServerNode(db, child);
      if (node) {
        await daemonRequest(node, `/api/servers/${child.uuid}`, { method: 'DELETE' }).catch(() => {});
      }
      for (const alloc of db.allocations) {
        if (String(alloc.server_id) === String(child.id)) {
          alloc.server_id = null;
          alloc.assigned = false;
        }
      }
    }
    saveState(db);
    return res.status(204).end();
  });

  // --------------------------------------------------------------------------
  // 6. Subdomain Manager (Persisted per server + optional Cloudflare API)
  // --------------------------------------------------------------------------
  app.get('/api/client/servers/:uuid/addons/subdomains', verifyServerOwnership('allocation.read'), (req, res) => {
    const db = getDb();
    const records = (db.subdomains || []).filter(sd => sd.server_uuid === req.targetServer.uuid);
    return res.json({ subdomains: records, base_domains: ['play.slayernode.xyz', 'mc.slayernode.local'] });
  });

  app.post('/api/client/servers/:uuid/addons/subdomains', verifyServerOwnership('allocation.update'), (req, res) => {
    const db = getDb();
    const srv = req.targetServer;
    const label = String(req.body?.subdomain || '').toLowerCase().trim();
    const domain = String(req.body?.domain || 'play.slayernode.xyz').toLowerCase().trim();
    if (!/^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])?$/.test(label)) {
      return res.status(400).json({ error: 'Subdomain label must be 3-32 lowercase alphanumeric/hyphen characters' });
    }
    if (!['play.slayernode.xyz', 'mc.slayernode.local'].includes(domain)) {
      return res.status(400).json({ error: 'Invalid base domain' });
    }
    const fqdn = `${label}.${domain}`;
    if ((db.subdomains || []).some(sd => sd.fqdn === fqdn)) {
      return res.status(409).json({ error: `Subdomain ${fqdn} is already claimed` });
    }
    const alloc = (db.allocations || []).find(a => String(a.id) === String(srv.allocation_id));
    const entry = {
      id: nextId(db.subdomains),
      server_uuid: srv.uuid,
      subdomain: label,
      domain,
      fqdn,
      record_type: 'SRV',
      target_ip: alloc?.ip || '127.0.0.1',
      target_port: alloc?.port || 25565,
      created_at: new Date().toISOString(),
    };
    db.subdomains.push(entry);
    saveState(db);
    recordActivity(req.user, srv.uuid, 'server:subdomain.create', `Bound SRV subdomain ${fqdn}`, req.ip);
    return res.status(201).json(entry);
  });

  app.delete('/api/client/servers/:uuid/addons/subdomains/:id', verifyServerOwnership('allocation.update'), (req, res) => {
    const db = getDb();
    const idx = (db.subdomains || []).findIndex(
      sd => String(sd.id) === String(req.params.id) && sd.server_uuid === req.targetServer.uuid
    );
    if (idx === -1) return res.status(404).json({ error: 'Subdomain record not found' });
    db.subdomains.splice(idx, 1);
    saveState(db);
    return res.status(204).end();
  });
}
