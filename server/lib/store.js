/**
 * SlayerNode Persistent JSON Store with Atomic Writes & Schema Normalization
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { hashPassword } from './security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_DIR = path.resolve(__dirname, '..');
export const DB_FILE = path.join(SERVER_DIR, 'storage_db.json');

export function createDefaultTheme() {
  return {
    id: 'default',
    preset_name: 'SlayerNode Dark Charcoal & Red',
    accent_primary: '#DC2626',
    accent_secondary: '#991B1B',
    status_online: '#10B981',
    status_starting: '#F59E0B',
    status_offline: '#DC2626',
    bg_canvas: '#111216',
    color_mode: 'dark',
    glass_blur_px: 16,
    card_opacity_pct: 90,
    specular_border_opacity_pct: 10,
    corner_roundness_px: 10,
    shadow_depth: 'deep',
    navigation_layout: 'collapsible_sidebar',
    sidebar_collapsed_default: false,
    server_card_layout: 'grid',
    telemetry_detail_level: 'detailed',
    custom_nav_links: [
      { id: '1', label: 'Discord', url: 'https://discord.gg/slayernode', icon: 'MessageSquare', external: true, order: 1 },
      { id: '2', label: 'Store', url: 'https://slayernode.xyz', icon: 'ShoppingBag', external: true, order: 2 },
      { id: '3', label: 'Status', url: 'https://status.slayernode.xyz', icon: 'Activity', external: true, order: 3 },
    ],
    button_shape: 'square',
    button_style: 'solid_accent',
    hover_motion_intensity: 'normal',
    auth_background_type: 'solid',
    auth_bg_url: '',
    auth_overlay_darkness: 60,
    auth_overlay_blur: 0,
    auth_card_position: 'center',
    auth_heading: 'SlayerNode',
    auth_subtitle: 'Game Server Control Panel',
    auth_allow_registration: true,
    auth_footer_links: [
      { label: 'Website', url: 'https://slayernode.xyz' },
      { label: 'Terms', url: 'https://slayernode.xyz/terms' },
      { label: 'Privacy', url: 'https://slayernode.xyz/privacy' },
    ],
    panel_name: 'SlayerNode',
    logo_url: '/logo.jpg',
    custom_wallpaper_url: '',
    wallpaper_blur: 8,
    wallpaper_opacity: 26,
    favicon_url: '/favicon.svg',
    font_family: 'Inter',
    announcement_banner: { enabled: false, text: '', type: 'info', dismissible: true },
    custom_css: '',
    custom_head_scripts: '',
    addon_mod_installer_enabled: true,
    addon_player_manager_enabled: true,
    addon_software_changer_enabled: true,
    addon_config_editor_enabled: true,
    addon_server_splitter_enabled: true,
    addon_subdomain_manager_enabled: true,
    addon_crash_analyzer_enabled: true,
    cloudflare_api_token: '',
    cloudflare_zone_id: '',
    curseforge_api_key: '',
    modrinth_token: '',
  };
}

export function createDefaultSettings() {
  return {
    panel_name: 'SlayerNode',
    company_name: 'SlayerNode Hosting',
    panel_url: 'http://localhost:3000',
    require_2fa_admins: false,
    allow_registration: true,
    maintenance_mode: false,
    telemetry_interval_ms: 3000,
    mail_driver: 'smtp',
    mail_host: 'smtp.example.com',
    mail_port: 587,
    mail_encryption: 'tls',
    mail_username: '',
    mail_password: '',
    mail_from_address: 'noreply@slayernode.xyz',
    mail_from_name: 'SlayerNode Panel',
  };
}

export function createDefaultEggs() {
  return [
    {
      id: 1,
      uuid: 'egg-paper-mc',
      nest_id: 1,
      nest_name: 'Minecraft',
      author: 'admin@slayernode.xyz',
      name: 'Paper (PaperMC)',
      description: 'High performance Spigot-compatible Minecraft server with optimal tick efficiency and PaperMC API.',
      docker_images: 'ghcr.io/pterodactyl/yolks:java_25\nghcr.io/pterodactyl/yolks:java_21\nghcr.io/pterodactyl/yolks:java_17',
      startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}} --nogui',
      force_outgoing_ip: false,
      features: 'eula, java_version',
      config: {
        files: '{"server.properties":{"server-port":"{{SERVER_PORT}}","server-ip":"0.0.0.0"}}',
        stop: 'stop',
        logs: '{"custom":false,"location":"logs/latest.log"}',
        startup: '{"done":")! For help, type "}',
      },
      variables: [
        { name: 'Server Jar File', env_variable: 'SERVER_JARFILE', default_value: 'server.jar', server_value: 'server.jar', is_editable: true, rules: 'required|string' },
        { name: 'Minecraft Version', env_variable: 'MINECRAFT_VERSION', default_value: '26.2', server_value: '26.2', is_editable: true, rules: 'required|string' },
        { name: 'Build Number', env_variable: 'BUILD_NUMBER', default_value: 'latest', server_value: 'latest', is_editable: true, rules: 'required|string' },
        { name: 'Download Path', env_variable: 'DL_PATH', default_value: '', server_value: '', is_editable: true, rules: 'nullable|string' },
      ],
      created_at: '2026-11-24',
    },
    {
      id: 2,
      uuid: 'egg-purpur-mc',
      nest_id: 1,
      nest_name: 'Minecraft',
      author: 'admin@slayernode.xyz',
      name: 'Purpur',
      description: 'Drop-in replacement for Paper designed for high configurability and performance optimizations.',
      docker_images: 'ghcr.io/pterodactyl/yolks:java_25\nghcr.io/pterodactyl/yolks:java_21',
      startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}} --nogui',
      force_outgoing_ip: false,
      features: 'eula, java_version',
      config: {
        files: '{"server.properties":{"server-port":"{{SERVER_PORT}}","server-ip":"0.0.0.0"}}',
        stop: 'stop',
        logs: '{"custom":false,"location":"logs/latest.log"}',
        startup: '{"done":")! For help, type "}',
      },
      variables: [
        { name: 'Server Jar File', env_variable: 'SERVER_JARFILE', default_value: 'server.jar', server_value: 'server.jar', is_editable: true, rules: 'required|string' },
        { name: 'Minecraft Version', env_variable: 'MINECRAFT_VERSION', default_value: '1.21.11', server_value: '1.21.11', is_editable: true, rules: 'required|string' },
        { name: 'Build Number', env_variable: 'BUILD_NUMBER', default_value: 'latest', server_value: 'latest', is_editable: true, rules: 'required|string' },
      ],
      created_at: '2026-11-24',
    },
    {
      id: 3,
      uuid: 'egg-vanilla-mc',
      nest_id: 1,
      nest_name: 'Minecraft',
      author: 'admin@slayernode.xyz',
      name: 'Vanilla Minecraft',
      description: 'Official Mojang Vanilla server software without third-party patches.',
      docker_images: 'ghcr.io/pterodactyl/yolks:java_25\nghcr.io/pterodactyl/yolks:java_21',
      startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} --nogui',
      force_outgoing_ip: false,
      features: 'eula',
      config: {
        files: '{"server.properties":{"server-port":"{{SERVER_PORT}}","server-ip":"0.0.0.0"}}',
        stop: 'stop',
        logs: '{"custom":false,"location":"logs/latest.log"}',
        startup: '{"done":")! For help, type "}',
      },
      variables: [
        { name: 'Server Jar File', env_variable: 'SERVER_JARFILE', default_value: 'server.jar', server_value: 'server.jar', is_editable: true, rules: 'required|string' },
        { name: 'Vanilla Version', env_variable: 'VANILLA_VERSION', default_value: '1.21.11', server_value: '1.21.11', is_editable: true, rules: 'required|string' },
      ],
      created_at: '2026-11-24',
    },
    {
      id: 4,
      uuid: 'egg-forge-mc',
      nest_id: 1,
      nest_name: 'Minecraft',
      author: 'admin@slayernode.xyz',
      name: 'Forge Minecraft',
      description: 'Minecraft Forge mod loader enabling custom modpacks and mods.',
      docker_images: 'ghcr.io/pterodactyl/yolks:java_21\nghcr.io/pterodactyl/yolks:java_17',
      startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} --nogui',
      force_outgoing_ip: false,
      features: 'eula, java_version',
      config: {
        files: '{"server.properties":{"server-port":"{{SERVER_PORT}}","server-ip":"0.0.0.0"}}',
        stop: 'stop',
        logs: '{}',
        startup: '{"done":")! For help, type "}',
      },
      variables: [
        { name: 'Server Jar File', env_variable: 'SERVER_JARFILE', default_value: 'forge-run.jar', server_value: 'forge-run.jar', is_editable: true, rules: 'required|string' },
        { name: 'MC Version', env_variable: 'MC_VERSION', default_value: '1.21.4', server_value: '1.21.4', is_editable: true, rules: 'required|string' },
        { name: 'Forge Version', env_variable: 'FORGE_VERSION', default_value: 'latest', server_value: 'latest', is_editable: true, rules: 'required|string' },
      ],
      created_at: '2026-11-24',
    },
    {
      id: 5,
      uuid: 'egg-fabric-mc',
      nest_id: 1,
      nest_name: 'Minecraft',
      author: 'admin@slayernode.xyz',
      name: 'Fabric Minecraft',
      description: 'Lightweight modular Fabric modding toolchain for Minecraft.',
      docker_images: 'ghcr.io/pterodactyl/yolks:java_21',
      startup: 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}} --nogui',
      force_outgoing_ip: false,
      features: 'eula, java_version',
      config: {
        files: '{"server.properties":{"server-port":"{{SERVER_PORT}}","server-ip":"0.0.0.0"}}',
        stop: 'stop',
        logs: '{}',
        startup: '{"done":")! For help, type "}',
      },
      variables: [
        { name: 'Server Jar File', env_variable: 'SERVER_JARFILE', default_value: 'fabric-server-launch.jar', server_value: 'fabric-server-launch.jar', is_editable: true, rules: 'required|string' },
        { name: 'Minecraft Version', env_variable: 'MINECRAFT_VERSION', default_value: '1.21.11', server_value: '1.21.11', is_editable: true, rules: 'required|string' },
        { name: 'Loader Version', env_variable: 'LOADER_VERSION', default_value: 'latest', server_value: 'latest', is_editable: true, rules: 'required|string' },
      ],
      created_at: '2026-11-24',
    },
    {
      id: 6,
      uuid: 'egg-velocity-mc',
      nest_id: 1,
      nest_name: 'Minecraft',
      author: 'admin@slayernode.xyz',
      name: 'Velocity Proxy',
      description: 'High performance Minecraft proxy network server.',
      docker_images: 'ghcr.io/pterodactyl/yolks:java_21',
      startup: 'java -Xms256M -Xmx{{SERVER_MEMORY}}M -XX:+UseG1GC -jar {{SERVER_JARFILE}}',
      force_outgoing_ip: false,
      features: '',
      config: { files: '{"velocity.toml":{"bind":"0.0.0.0:{{SERVER_PORT}}"}}', stop: 'end', logs: '{}', startup: '{"done":"Listening on"}' },
      variables: [
        { name: 'Server Jar File', env_variable: 'SERVER_JARFILE', default_value: 'velocity.jar', server_value: 'velocity.jar', is_editable: true, rules: 'required|string' },
        { name: 'Velocity Version', env_variable: 'VELOCITY_VERSION', default_value: 'latest', server_value: 'latest', is_editable: true, rules: 'required|string' },
      ],
      created_at: '2026-11-24',
    },
    {
      id: 7,
      uuid: 'egg-bungeecord-mc',
      nest_id: 1,
      nest_name: 'Minecraft',
      author: 'admin@slayernode.xyz',
      name: 'BungeeCord',
      description: 'Classic multi-server proxy network engine.',
      docker_images: 'ghcr.io/pterodactyl/yolks:java_21',
      startup: 'java -Xms256M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
      force_outgoing_ip: false,
      features: '',
      config: { files: '{"config.yml":{"host":"0.0.0.0:{{SERVER_PORT}}"}}', stop: 'end', logs: '{}', startup: '{"done":"Listening on"}' },
      variables: [
        { name: 'Server Jar File', env_variable: 'SERVER_JARFILE', default_value: 'bungeecord.jar', server_value: 'bungeecord.jar', is_editable: true, rules: 'required|string' },
      ],
      created_at: '2026-11-24',
    },
    {
      id: 8,
      uuid: 'egg-rust-server',
      nest_id: 4,
      nest_name: 'Rust',
      author: 'admin@slayernode.xyz',
      name: 'Rust Dedicated',
      description: 'Rust dedicated multiplayer survival server.',
      docker_images: 'ghcr.io/slayernode/games:rust',
      startup: './RustDedicated -batchmode +server.port {{SERVER_PORT}}',
      force_outgoing_ip: false,
      features: '',
      config: { files: '{}', stop: 'quit', logs: '{}', startup: '{}' },
      variables: [],
      created_at: '2026-11-01',
    },
    {
      id: 9,
      uuid: 'egg-bot-node',
      nest_id: 5,
      nest_name: 'Bot / Applications',
      author: 'admin@slayernode.xyz',
      name: 'Node.js Generic',
      description: 'Run web apps, APIs, HTTP servers, or Discord bots using Node.js.',
      docker_images: 'ghcr.io/pterodactyl/yolks:nodejs_22',
      startup: 'node {{MAIN_FILE}}',
      force_outgoing_ip: false,
      features: '',
      config: { files: '{}', stop: '^C', logs: '{}', startup: '{}' },
      variables: [
        { name: 'Main JS File', env_variable: 'MAIN_FILE', default_value: 'index.js', server_value: 'index.js', is_editable: true, rules: 'required|string' },
      ],
      created_at: '2026-11-24',
    },
    {
      id: 10,
      uuid: 'egg-bot-python',
      nest_id: 5,
      nest_name: 'Bot / Applications',
      author: 'admin@slayernode.xyz',
      name: 'Python Generic',
      description: 'Run Python scripts, bots, workers, and HTTP services.',
      docker_images: 'ghcr.io/pterodactyl/yolks:python_3.12',
      startup: 'python3 -u {{APP_FILE}}',
      force_outgoing_ip: false,
      features: '',
      config: { files: '{}', stop: '^C', logs: '{}', startup: '{}' },
      variables: [
        { name: 'Main Python File', env_variable: 'APP_FILE', default_value: 'app.py', server_value: 'app.py', is_editable: true, rules: 'required|string' },
      ],
      created_at: '2026-11-24',
    },
  ];
}

export function createDefaultDb() {
  const defaultVolumesDir = path.join(os.homedir(), '.slayerwings', 'volumes');
  return {
    theme: createDefaultTheme(),
    settings: createDefaultSettings(),
    locations: [
      { id: 1, short: 'local-dc', long: 'Local Development Datacenter', created_at: '2026-11-24T05:00:00Z' },
    ],
    users: [
      {
        id: 1,
        uuid: 'c82736b4-21c8-4720-a6ff-84ad1f21136b',
        username: 'admin',
        email: 'admin@slayernode.xyz',
        name_first: 'System',
        name_last: 'Administrator',
        language: 'en',
        root_admin: true,
        two_factor_enabled: false,
        two_factor_secret: '',
        token_version: 1,
        password_hash: hashPassword(process.env.SLAYERNODE_ADMIN_PASSWORD || 'admin'),
        created_at: '2026-11-01T00:00:00Z',
      },
    ],
    nodes: [
      {
        id: 1,
        uuid: 'bb78c330-32de-423b-9f6a-af51120b676a',
        name: 'Local-Node-01',
        description: 'Local SlayerWings Container Node',
        location_id: 1,
        fqdn: '127.0.0.1',
        scheme: 'http',
        behind_proxy: false,
        maintenance_mode: false,
        allow_auto_allocation: true,
        memory: 8192,
        memory_overallocate: 0,
        disk: 512000,
        disk_overallocate: 0,
        upload_size: 100,
        daemon_listen: 8443,
        daemon_sftp: 2202,
        daemon_base: defaultVolumesDir,
        daemon_token: '',
        is_online: true,
        daemon_version: 'v1.0.0-slayerwings',
      },
    ],
    allocations: Array.from({ length: 16 }, (_, idx) => ({
      id: 1001 + idx,
      node_id: 1,
      ip: '127.0.0.1',
      port: 25565 + idx,
      alias: 'localhost',
      notes: '',
      server_id: null,
      assigned: false,
    })),
    nests: [
      { id: 1, uuid: '21b0cb13-d7c0-4903-a0ef-aed1d5c7e3c6', author: 'admin@slayernode.xyz', name: 'Minecraft', description: 'Minecraft server runtime with support for Paper, Purpur, Vanilla, Forge, Fabric, and proxies.', created_at: '2026-11-01' },
      { id: 2, uuid: 'nest-source-engine', author: 'admin@slayernode.xyz', name: 'Source Engine', description: 'Source Dedicated Server games.', created_at: '2026-11-01' },
      { id: 3, uuid: 'nest-voice-servers', author: 'admin@slayernode.xyz', name: 'Voice Servers', description: 'Voice communication servers.', created_at: '2026-11-01' },
      { id: 4, uuid: 'nest-rust', author: 'admin@slayernode.xyz', name: 'Rust', description: 'Rust dedicated survival multiplayer server.', created_at: '2026-11-01' },
      { id: 5, uuid: 'nest-bot', author: 'admin@slayernode.xyz', name: 'Bot / Applications', description: 'Node.js, Python, and generic application runtimes.', created_at: '2026-11-01' },
    ],
    eggs: createDefaultEggs(),
    servers: [],
    databases: [],
    schedules: [],
    backups: [],
    subusers: [],
    mounts: [],
    subdomains: [],
    server_splits: [],
    blueprint_extensions: [
      { id: 'slayernode-theme', name: 'SlayerNode Liquid Glass Theme', version: '1.0.0', author: 'SlayerNode', description: 'Translucent Apple Liquid Glass design framework.', target: 'v1.0.0', icon: 'Palette', enabled: true, installed_at: '2026-11-20' },
      { id: 'nebula-studio', name: 'Nebula Theme & Customization Studio', version: '2.4.0', author: 'SlayerNode Systems', description: 'Real-time visual appearance editor and theme preset manager.', target: 'v1.0.0', icon: 'Sliders', enabled: true, installed_at: '2026-11-21' },
      { id: 'player-manager', name: 'Live Player Manager', version: '3.1.0', author: 'SlayerNode Addons', description: 'Real-time player monitoring, kick, ban, op, and whitelist controls.', target: 'v1.0.0', icon: 'UserCheck', enabled: true, installed_at: '2026-11-22' },
      { id: 'modpack-installer', name: 'Modrinth Auto-Resolver', version: '2.0.0', author: 'SlayerNode Addons', description: 'One-click mod and plugin search & installation via Modrinth.', target: 'v1.0.0', icon: 'Package', enabled: true, installed_at: '2026-11-22' },
      { id: 'server-splitter', name: 'Dynamic Server Resource Splitter', version: '1.5.0', author: 'SlayerNode Addons', description: 'Allocate node resources across sub-server instances.', target: 'v1.0.0', icon: 'Split', enabled: true, installed_at: '2026-11-23' },
    ],
    api_keys: [],
    client_api_keys: [],
    ssh_keys: [],
    activity_logs: [
      {
        id: 1,
        user_id: 1,
        username: 'admin',
        server_uuid: null,
        action: 'system:boot',
        description: 'Initialized SlayerNode control panel',
        ip: '127.0.0.1',
        timestamp: '2026-11-24T05:00:00.000Z',
      },
    ],
  };
}

export function nextId(items) {
  if (!Array.isArray(items) || items.length === 0) return 1;
  let maxId = 0;
  for (const item of items) {
    const num = Number(item?.id);
    if (Number.isFinite(num) && num > maxId) maxId = num;
  }
  return maxId + 1;
}

function normalizeDb(parsed) {
  const defaults = createDefaultDb();
  const db = { ...defaults, ...parsed };

  db.theme = { ...defaults.theme, ...(parsed.theme || {}) };
  // Repair earlier sanitization corruption on valid JPEG base64 wallpaper if present
  if (typeof db.theme.custom_wallpaper_url === 'string' && db.theme.custom_wallpaper_url.includes('[BLOCKED_INJECTION]base64')) {
    db.theme.custom_wallpaper_url = db.theme.custom_wallpaper_url.replace('[BLOCKED_INJECTION]base64', ';base64');
  }
  if (!db.theme.favicon_url || db.theme.favicon_url === '/favicon.jpg') {
    db.theme.favicon_url = '/favicon.svg';
  }

  db.settings = { ...defaults.settings, ...(parsed.settings || {}) };

  const arrayKeys = [
    'locations', 'users', 'nodes', 'allocations', 'nests', 'eggs', 'servers',
    'databases', 'schedules', 'backups', 'subusers', 'mounts', 'subdomains',
    'server_splits', 'blueprint_extensions', 'api_keys', 'client_api_keys',
    'ssh_keys', 'activity_logs',
  ];
  for (const k of arrayKeys) {
    if (!Array.isArray(db[k])) db[k] = defaults[k];
  }

  // Ensure users have scrypt hashes and token_version, without keeping plaintext passwords
  const defaultAdminPw = process.env.SLAYERNODE_ADMIN_PASSWORD || 'admin';
  db.users = db.users.map(u => {
    const cleanUser = { ...u };
    if (!cleanUser.uuid) cleanUser.uuid = crypto.randomUUID();
    if (!cleanUser.token_version) cleanUser.token_version = 1;
    if (!cleanUser.password_hash) {
      const initialPw = cleanUser.password || defaultAdminPw;
      cleanUser.password_hash = hashPassword(initialPw);
    }
    delete cleanUser.password;
    return cleanUser;
  });

  // Ensure every default nest is present
  for (const defNest of defaults.nests) {
    if (!db.nests.some(n => String(n.uuid) === String(defNest.uuid) || String(n.id) === String(defNest.id))) {
      db.nests.push(defNest);
    }
  }

  // Deduplicate & normalize eggs by UUID and enforce unique numeric IDs
  const seenUuids = new Set();
  const usedIds = new Set();
  const cleanEggs = [];
  for (const existingEgg of db.eggs) {
    if (!existingEgg?.uuid || seenUuids.has(existingEgg.uuid)) continue;
    seenUuids.add(existingEgg.uuid);
    let eid = Number(existingEgg.id);
    if (!Number.isFinite(eid) || eid <= 0 || usedIds.has(eid)) {
      eid = nextId(cleanEggs);
    }
    usedIds.add(eid);
    cleanEggs.push({ ...existingEgg, id: eid });
  }
  for (const defEgg of defaults.eggs) {
    if (!seenUuids.has(defEgg.uuid)) {
      seenUuids.add(defEgg.uuid);
      let eid = defEgg.id;
      while (usedIds.has(eid)) eid++;
      usedIds.add(eid);
      cleanEggs.push({ ...defEgg, id: eid });
    }
  }
  db.eggs = cleanEggs.sort((a, b) => a.id - b.id).map(egg => {
    if (egg.uuid === 'egg-bot-python') {
      return {
        ...egg,
        name: 'Python Generic',
        startup: 'python3 -u {{APP_FILE}}',
        variables: egg.variables?.length
          ? egg.variables
          : [{ name: 'Main Python File', env_variable: 'APP_FILE', default_value: 'app.py', server_value: 'app.py', is_editable: true, rules: 'required|string' }],
      };
    }
    return egg;
  });

  // Ensure first location exists and fix stale node location_id references
  if (db.locations.length === 0) db.locations = defaults.locations;
  const validLocIds = new Set(db.locations.map(l => String(l.id)));
  db.nodes = db.nodes.map(n => {
    const node = { ...n };
    if (!validLocIds.has(String(node.location_id))) {
      node.location_id = db.locations[0].id;
    }
    if (!node.daemon_base || node.daemon_base === '/var/lib/slayerwings/volumes') {
      if (['127.0.0.1', 'localhost', '::1'].includes(String(node.fqdn).toLowerCase())) {
        node.daemon_base = path.join(os.homedir(), '.slayerwings', 'volumes');
      }
    }
    return node;
  });

  // Ensure allocation server_id consistency
  const activeServerIds = new Set(db.servers.map(s => String(s.id)));
  db.allocations = db.allocations.map(a => {
    const assigned = a.server_id !== null && a.server_id !== undefined && activeServerIds.has(String(a.server_id));
    return {
      ...a,
      server_id: assigned ? a.server_id : null,
      assigned,
    };
  });

  // Sync dynamic counts
  for (const srv of db.servers) {
    if (srv.allocation_id) {
      const alloc = db.allocations.find(a => String(a.id) === String(srv.allocation_id));
      if (alloc && !alloc.server_id) {
        alloc.server_id = srv.id;
        alloc.assigned = true;
      }
    }
  }

  return db;
}

export function loadState() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      return normalizeDb(JSON.parse(raw));
    }
  } catch (e) {
    console.warn('[Store] Failed reading storage_db.json, initializing clean defaults:', e.message);
  }
  const clean = normalizeDb(createDefaultDb());
  saveState(clean);
  return clean;
}

export function saveState(db) {
  const tmpPath = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), { mode: 0o600 });
  fs.renameSync(tmpPath, DB_FILE);
}
