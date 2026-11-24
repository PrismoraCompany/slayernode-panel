import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeStudioSettings } from '../types';

export const DEFAULT_THEME: ThemeStudioSettings = {
  id: 'default',
  preset_name: 'SlayerNode Dark Charcoal & Red',

  // 2 Primary Brand Colors: Blackish-Gray & Red
  accent_primary: '#DC2626',  // Slayer Crimson Red
  accent_secondary: '#991B1B',
  status_online: '#10B981',   // Emerald
  status_starting: '#F59E0B', // Amber
  status_offline: '#DC2626',  // Red
  bg_canvas: '#111216',       // Solid Blackish-Gray
  color_mode: 'dark',
  glass_blur_px: 16,
  card_opacity_pct: 90,
  specular_border_opacity_pct: 10,
  corner_roundness_px: 10,
  shadow_depth: 'deep',

  // Layout & Navigation
  navigation_layout: 'collapsible_sidebar',
  sidebar_collapsed_default: false,
  server_card_layout: 'grid',
  telemetry_detail_level: 'detailed',
  custom_nav_links: [
    { id: '1', label: 'Discord', url: 'https://discord.gg/slayernode', icon: 'MessageSquare', external: true, order: 1 },
    { id: '2', label: 'Store', url: 'https://slayernode.xyz', icon: 'ShoppingBag', external: true, order: 2 },
    { id: '3', label: 'Status', url: 'https://status.slayernode.xyz', icon: 'Activity', external: true, order: 3 },
  ],

  // Button & Component Styling - Square, No Pills
  button_shape: 'square',
  button_style: 'solid_accent',
  hover_motion_intensity: 'normal',

  // Login & Auth - Solid, Minimal, Zero Stack/Version Info
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

  // Branding & Background - Solid Dark Charcoal, No Blue Mesh
  panel_name: 'SlayerNode',
  logo_url: '/logo.jpg',
  custom_wallpaper_url: '',
  wallpaper_blur: 0,
  wallpaper_opacity: 100,
  favicon_url: '/favicon.jpg',
  font_family: 'Inter',
  announcement_banner: {
    enabled: false,
    text: '',
    type: 'info',
    dismissible: true,
  },
  custom_css: '',
  custom_head_scripts: '',

  // Built-in Addons
  addon_mod_installer_enabled: true,
  addon_player_manager_enabled: true,
  addon_software_changer_enabled: true,
  addon_config_editor_enabled: true,
  addon_server_splitter_enabled: true,
  addon_subdomain_manager_enabled: true,
  addon_crash_analyzer_enabled: true,

  // APIs
  cloudflare_api_token: '',
  cloudflare_zone_id: '',
  curseforge_api_key: '',
  modrinth_token: '',
};

export const PRESET_THEMES: Record<string, Partial<ThemeStudioSettings>> = {
  'SlayerNode Official': {
    preset_name: 'SlayerNode Official',
    accent_primary: '#00D2FF',
    accent_secondary: '#0084FF',
    bg_canvas: '#090D16',
    custom_wallpaper_url: '/wallpapers/slayernode-liquid-mesh.png',
    wallpaper_blur: 0,
    wallpaper_opacity: 85,
    glass_blur_px: 24,
    card_opacity_pct: 50,
    specular_border_opacity_pct: 14,
    corner_roundness_px: 16,
    button_shape: 'pill',
    button_style: 'liquid_glass',
    navigation_layout: 'floating_top',
    auth_background_type: 'wallpaper',
  },
  'Ultra Frost Clear Glass': {
    preset_name: 'Ultra Frost Clear Glass',
    accent_primary: '#00D2FF',
    accent_secondary: '#38bdf8',
    bg_canvas: '#06080F',
    custom_wallpaper_url: '/wallpapers/slayernode-liquid-mesh.png',
    wallpaper_blur: 4,
    wallpaper_opacity: 90,
    glass_blur_px: 28,
    card_opacity_pct: 40,
    specular_border_opacity_pct: 22,
    corner_roundness_px: 18,
    button_shape: 'pill',
    button_style: 'liquid_glass',
    navigation_layout: 'floating_top',
    auth_background_type: 'wallpaper',
  },
  'Midnight Obsidian Glass': {
    preset_name: 'Midnight Obsidian Glass',
    accent_primary: '#00D2FF',
    accent_secondary: '#60a5fa',
    bg_canvas: '#04060A',
    custom_wallpaper_url: '/wallpapers/slayernode-liquid-mesh.png',
    wallpaper_blur: 8,
    wallpaper_opacity: 70,
    glass_blur_px: 20,
    card_opacity_pct: 60,
    specular_border_opacity_pct: 12,
    corner_roundness_px: 16,
    button_shape: 'squircle',
    button_style: 'liquid_glass',
    navigation_layout: 'collapsible_sidebar',
    auth_background_type: 'wallpaper',
  },
};

interface ThemeContextType {
  theme: ThemeStudioSettings;
  previewTheme: ThemeStudioSettings;
  isDirty: boolean;
  updatePreview: (partial: Partial<ThemeStudioSettings>) => void;
  saveTheme: () => void;
  resetDefaults: () => void;
  applyPreset: (presetName: string) => void;
  exportThemeJson: () => string;
  importThemeJson: (jsonString: string) => boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeStudioSettings>(() => {
    try {
      const saved = localStorage.getItem('slayernode_theme_settings');
      return saved ? { ...DEFAULT_THEME, ...JSON.parse(saved) } : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  const [previewTheme, setPreviewTheme] = useState<ThemeStudioSettings>(theme);
  const [isDirty, setIsDirty] = useState(false);

  // Apply CSS Variables to Document Root dynamically
  useEffect(() => {
    const active = previewTheme;
    const root = document.documentElement;

    root.style.setProperty('--color-primary', active.accent_primary);
    root.style.setProperty('--color-dark', active.bg_canvas);
    root.style.setProperty('--status-online', active.status_online);
    root.style.setProperty('--status-starting', active.status_starting);
    root.style.setProperty('--status-offline', active.status_offline);
    root.style.setProperty('--glass-blur', `${active.glass_blur_px}px`);
    root.style.setProperty('--card-opacity', `${active.card_opacity_pct / 100}`);
    root.style.setProperty('--color-surface', `rgba(13, 19, 34, ${active.card_opacity_pct / 100})`);
    root.style.setProperty('--color-border', `rgba(255, 255, 255, ${active.specular_border_opacity_pct / 100})`);
    root.style.setProperty('--radius-corner', `${active.corner_roundness_px}px`);

    const buttonRadius = active.button_shape === 'pill' ? '9999px' : active.button_shape === 'squircle' ? '14px' : '8px';
    root.style.setProperty('--button-radius', buttonRadius);

    if (active.font_family) {
      root.style.setProperty('--font-family', `'${active.font_family}', -apple-system, sans-serif`);
    }

    // Custom CSS Element injection
    let customStyleTag = document.getElementById('slayernode-custom-css');
    if (!customStyleTag) {
      customStyleTag = document.createElement('style');
      customStyleTag.id = 'slayernode-custom-css';
      document.head.appendChild(customStyleTag);
    }
    customStyleTag.innerHTML = active.custom_css || '';
  }, [previewTheme]);

  const updatePreview = (partial: Partial<ThemeStudioSettings>) => {
    setPreviewTheme(prev => ({ ...prev, ...partial }));
    setIsDirty(true);
  };

  const saveTheme = () => {
    setTheme(previewTheme);
    localStorage.setItem('slayernode_theme_settings', JSON.stringify(previewTheme));
    setIsDirty(false);
  };

  const resetDefaults = () => {
    setPreviewTheme(DEFAULT_THEME);
    setTheme(DEFAULT_THEME);
    localStorage.removeItem('slayernode_theme_settings');
    setIsDirty(false);
  };

  const applyPreset = (presetName: string) => {
    if (PRESET_THEMES[presetName]) {
      setPreviewTheme(prev => ({ ...prev, ...PRESET_THEMES[presetName] }));
      setIsDirty(true);
    }
  };

  const exportThemeJson = () => {
    return JSON.stringify(previewTheme, null, 2);
  };

  const importThemeJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      setPreviewTheme(prev => ({ ...prev, ...parsed }));
      setIsDirty(true);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        previewTheme,
        isDirty,
        updatePreview,
        saveTheme,
        resetDefaults,
        applyPreset,
        exportThemeJson,
        importThemeJson,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
