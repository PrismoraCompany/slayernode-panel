// ==========================================
// SlayerNode Panel v1.0.0 — TypeScript Interfaces
// SlayerWings Daemon Engine + Apple Liquid Glass
// ==========================================

export type ServerStatus = 'running' | 'starting' | 'stopping' | 'offline' | 'installing' | 'restoring';

export interface ServerStats {
  memory_bytes: number;
  memory_limit_bytes: number;
  cpu_absolute: number;
  network: {
    rx_bytes: number;
    tx_bytes: number;
  };
  disk_bytes: number;
  uptime_ms: number;
  state: ServerStatus;
}

export interface Allocation {
  id: number;
  ip: string;
  alias?: string | null;
  port: number;
  notes?: string | null;
  is_default: boolean;
}

export interface ServerLimits {
  memory: number; // in MB (0 for unlimited)
  swap: number;   // in MB
  disk: number;   // in MB
  io: number;     // 500 default
  cpu: number;    // % (100 = 1 thread)
  threads?: string | null;
}

export interface ServerFeatureLimits {
  databases: number;
  allocations: number;
  backups: number;
  splitters?: number;
}

export interface ServerEggVariable {
  name: string;
  description: string;
  env_variable: string;
  default_value: string;
  server_value: string;
  is_editable: boolean;
  rules: string;
}

export interface Server {
  id: string;
  uuid: string;
  identifier: string;
  name: string;
  description?: string;
  owner_id: number;
  owner_username: string;
  node: string;
  node_id: number;
  status: ServerStatus;
  is_suspended: boolean;
  is_transferring: boolean;
  limits: ServerLimits;
  feature_limits: ServerFeatureLimits;
  allocation: Allocation;
  allocations: Allocation[];
  egg_id: number;
  egg_name: string;
  nest_id: number;
  docker_image: string;
  startup: string;
  variables: ServerEggVariable[];
  pinned?: boolean;
  created_at: string;
  updated_at: string;
}

// User Model
export interface User {
  id: number;
  uuid: string;
  username: string;
  email: string;
  name_first: string;
  name_last: string;
  language: string;
  is_admin: boolean;
  two_factor_enabled: boolean;
  avatar_url?: string;
  created_at: string;
}

// File Manager Types
export interface FileObject {
  name: string;
  created: string;
  modified: string;
  mode: string;
  mode_bits: string;
  size: number;
  directory: boolean;
  file: boolean;
  symlink: boolean;
  mime: string;
}

// Database Model
export interface ServerDatabase {
  id: string;
  name: string;
  username: string;
  host: {
    address: string;
    port: number;
  };
  database_host_id: number;
  max_connections: number;
  connections_count?: number;
  created_at: string;
}

// Schedules Model
export interface ScheduleTask {
  id: number;
  sequence_id: number;
  action: 'command' | 'power' | 'backup';
  payload: string;
  time_offset: number;
  continue_on_failure: boolean;
}

export interface Schedule {
  id: number;
  name: string;
  cron: {
    day_of_week: string;
    month: string;
    day_of_month: string;
    hour: string;
    minute: string;
  };
  is_active: boolean;
  is_processing: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  tasks: ScheduleTask[];
}

// Backup Model
export interface ServerBackup {
  uuid: string;
  name: string;
  ignored_files: string[];
  sha256_hash: string | null;
  bytes: number;
  created_at: string;
  completed_at: string | null;
  is_successful: boolean;
  is_locked: boolean;
}

// Subusers
export interface Subuser {
  id: number;
  uuid: string;
  email: string;
  image: string;
  two_factor_enabled: boolean;
  permissions: string[];
  created_at: string;
}

// Nodes, Nests, Eggs, Locations (Admin)
export interface Node {
  id: number;
  uuid: string;
  name: string;
  description: string;
  location_id: number;
  location_name: string;
  fqdn: string;
  scheme: 'https' | 'http';
  behind_proxy: boolean;
  maintenance_mode: boolean;
  memory: number; // MB
  memory_overallocate: number;
  disk: number; // MB
  disk_overallocate: number;
  upload_size: number; // MB
  daemon_listen: number;
  daemon_sftp: number;
  daemon_base: string;
  servers_count: number;
  allocations_count: number;
  is_online: boolean;
  daemon_version: string;
  allow_auto_allocation?: boolean;
}

export interface NodeAllocation {
  id: number;
  node_id: number;
  ip: string;
  port: number;
  alias?: string;
  server_id?: number | null;
  server_name?: string;
  is_default?: boolean;
}

export interface BlueprintExtension {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  target: string;
  icon?: string;
  enabled: boolean;
  installed_at: string;
}

export interface Location {
  id: number;
  short: string;
  long: string;
  nodes_count: number;
  servers_count: number;
}

export interface Nest {
  id: number;
  uuid: string;
  author: string;
  name: string;
  description: string;
  eggs_count: number;
  servers_count: number;
  created_at: string;
}

export interface Egg {
  id: number;
  uuid: string;
  nest_id: number;
  nest_name: string;
  author: string;
  name: string;
  description: string;
  docker_images: Record<string, string>;
  startup: string;
  config: {
    files: Record<string, any>;
    startup: {
      done: string;
      userInteraction?: string[];
    };
    stop: string;
  };
  variables: ServerEggVariable[];
}

// ==========================================
// Built-in Addon Interfaces
// ==========================================

export interface ModItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon_url: string;
  author: string;
  downloads: number;
  follows: number;
  source: 'modrinth' | 'curseforge' | 'spigot' | 'hangar';
  categories: string[];
  loaders: string[];
  game_versions: string[];
  installed?: boolean;
  installed_version?: string;
  latest_version?: string;
}

export interface OnlinePlayer {
  uuid: string;
  name: string;
  ping: number;
  world: string;
  health: number;
  gamemode: 'survival' | 'creative' | 'adventure' | 'spectator';
  is_op: boolean;
  is_whitelisted: boolean;
  ip_address?: string;
  joined_at: string;
}

export interface SoftwareEngine {
  id: string;
  name: string;
  category: 'paper' | 'purpur' | 'fabric' | 'forge' | 'neoforge' | 'folia' | 'velocity' | 'bungeecord' | 'vanilla';
  description: string;
  icon: string;
  recommended_java: number;
  versions: string[];
}

export interface CloudflareSubdomain {
  id: string;
  subdomain: string;
  domain: string;
  full_domain: string;
  target_ip: string;
  target_port: number;
  proxied: boolean;
  status: 'active' | 'pending';
  created_at: string;
}

export interface CrashDiagnostic {
  detected: boolean;
  category: 'OOM' | 'PORT_IN_USE' | 'JAVA_VERSION_MISMATCH' | 'MISSING_DEPENDENCY' | 'EULA_NOT_ACCEPTED' | 'WORLD_CORRUPTION' | 'UNKNOWN';
  title: string;
  severity: 'critical' | 'warning' | 'info';
  snippet: string;
  explanation: string;
  resolution_steps: string[];
  auto_fixable: boolean;
  auto_fix_action?: string;
}

export interface SubServerSplit {
  id: string;
  name: string;
  memory_allocated: number;
  cpu_allocated: number;
  disk_allocated: number;
  port: number;
  status: ServerStatus;
}

// ==========================================
// Nebula-Style Theme Studio Config
// ==========================================

export type NavigationLayoutType = 'floating_top' | 'collapsible_sidebar' | 'dock_bar';
export type ButtonShapeType = 'pill' | 'squircle' | 'rounded';
export type ButtonStyleType = 'liquid_glass' | 'solid_accent' | 'soft_tinted';
export type AuthBackgroundType = 'aurora_mesh' | 'particle_grid' | 'wallpaper' | 'video' | 'image';
export type AuthCardPositionType = 'center' | 'split_left' | 'split_right';

export interface CustomNavLink {
  id: string;
  label: string;
  url: string;
  icon: string;
  external: boolean;
  order: number;
}

export interface AnnouncementBannerConfig {
  enabled: boolean;
  text: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  dismissible: boolean;
  action_label?: string;
  action_url?: string;
}

export interface ThemeStudioSettings {
  id: string;
  preset_name: string;

  // Colors & Glass Physics
  accent_primary: string;
  accent_secondary: string;
  status_online: string;
  status_starting: string;
  status_offline: string;
  bg_canvas: string;
  color_mode: 'dark' | 'light' | 'auto';
  glass_blur_px: number;
  card_opacity_pct: number;
  specular_border_opacity_pct: number;
  corner_roundness_px: number;
  shadow_depth: 'none' | 'subtle' | 'deep' | 'colored_glow';

  // Layout & Navigation
  navigation_layout: NavigationLayoutType;
  sidebar_collapsed_default: boolean;
  server_card_layout: 'grid' | 'list';
  telemetry_detail_level: 'compact' | 'detailed';
  custom_nav_links: CustomNavLink[];

  // Button & Component Styling
  button_shape: ButtonShapeType;
  button_style: ButtonStyleType;
  hover_motion_intensity: 'subtle' | 'normal' | 'energetic';

  // Login & Auth Page Editor
  auth_background_type: AuthBackgroundType;
  auth_bg_url: string;
  auth_overlay_darkness: number;
  auth_overlay_blur: number;
  auth_card_position: AuthCardPositionType;
  auth_heading: string;
  auth_subtitle: string;
  auth_allow_registration: boolean;
  auth_footer_links: { label: string; url: string }[];

  // Branding, Typography & Custom Injection
  panel_name: string;
  logo_url: string;
  custom_wallpaper_url: string;
  wallpaper_blur: number;
  wallpaper_opacity: number;
  favicon_url: string;
  font_family: string;
  announcement_banner: AnnouncementBannerConfig;
  custom_css: string;
  custom_head_scripts: string;

  // Built-in Addons Toggles & API Keys
  addon_mod_installer_enabled: boolean;
  addon_player_manager_enabled: boolean;
  addon_software_changer_enabled: boolean;
  addon_config_editor_enabled: boolean;
  addon_server_splitter_enabled: boolean;
  addon_subdomain_manager_enabled: boolean;
  addon_crash_analyzer_enabled: boolean;

  // Cloud & External APIs
  cloudflare_api_token?: string;
  cloudflare_zone_id?: string;
  curseforge_api_key?: string;
  modrinth_token?: string;

  // Advanced Customization Options
  font_scale?: 'compact' | 'normal' | 'large';
  accent_glow_intensity?: 'none' | 'subtle' | 'vibrant' | 'cyber';
  status_style?: 'badge' | 'dot' | 'glow_pill';
  card_border_style?: 'subtle' | 'crimson_glow' | 'glass_clean' | 'none';
  console_ansi_theme?: 'matrix_green' | 'slayer_crimson' | 'classic_white' | 'cyberpunk_cyan';
  server_card_density?: 'compact' | 'spacious';
}

// User Account Types
export interface ClientApiKey {
  id: number;
  identifier: string;
  description: string;
  allowed_ips: string[];
  created_at: string;
  last_used_at: string | null;
}

export interface SshKey {
  id: number;
  name: string;
  fingerprint: string;
  public_key: string;
  created_at: string;
}

export interface UserActivityLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  description: string;
  ip: string;
  timestamp: string;
}
