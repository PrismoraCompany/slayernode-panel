import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Layout,
  Sliders,
  Type,
  Key,
  Save,
  RotateCcw,
  Download,
  Upload,
  Eye,
  Check,
  Sparkles,
  Smartphone,
  Monitor,
  Code,
  ExternalLink,
  Plus,
  Trash2,
  Image as ImageIcon,
  Boxes,
  Package,
  ArrowLeft,
  X,
} from 'lucide-react';
import { useTheme, PRESET_THEMES } from '../../../context/ThemeContext';
import { useServers } from '../../../context/ServerContext';
import { BlueprintExtension } from '../../../types';
import { GlassCard } from '../../ui/GlassCard';
import { GlassButton } from '../../ui/GlassButton';
import { GlassInput } from '../../ui/GlassInput';
import { GlassToggle } from '../../ui/GlassToggle';
import { GlassModal } from '../../ui/GlassModal';
import { ServerDashboard } from '../../server/ServerDashboard';
import { LoginView } from '../../auth/LoginView';
import { ConsoleTerminal } from '../../server/ConsoleTerminal';
import { apiFetch } from '../../../lib/api';

interface AppearanceStudioProps {
  onExit?: () => void;
}

export const AppearanceStudio: React.FC<AppearanceStudioProps> = ({ onExit }) => {
  const {
    theme,
    previewTheme,
    isDirty,
    updatePreview,
    saveTheme,
    resetDefaults,
    applyPreset,
    exportThemeJson,
    importThemeJson,
  } = useTheme();

  const [activeSection, setActiveSection] = useState<
    'colors' | 'canvas' | 'geometry' | 'auth' | 'branding' | 'blueprint' | 'addons' | 'nav'
  >('canvas');

  const [blueprintExtensions, setBlueprintExtensions] = useState<BlueprintExtension[]>([
    {
      id: 'slayernode-theme',
      name: 'SlayerNode Liquid Theme Engine',
      version: '1.0.0',
      author: 'SlayerNode',
      description: 'Official Blackish-Gray & Crimson Red customization engine.',
      target: 'v1.0.0',
      icon: 'Palette',
      enabled: true,
      installed_at: '2026-11-20',
    },
    {
      id: 'player-manager',
      name: 'Player Manager Addon',
      version: '1.0.0',
      author: 'SlayerNode',
      description: 'Live player controls, avatars, and gamemode switches.',
      target: 'v1.0.0',
      icon: 'Users',
      enabled: true,
      installed_at: '2026-11-20',
    },
  ]);
  const [uploadingBlueprint, setUploadingBlueprint] = useState(false);
  const [blueprintNotice, setBlueprintNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadBlueprint = async () => {
      try {
        const res = await apiFetch('/api/blueprint/extensions');
        if (res.ok) {
          const d = await res.json();
          const list = d?.data || d?.extensions;
          if (isMounted && Array.isArray(list)) {
            setBlueprintExtensions(list);
          }
        }
      } catch {}
    };
    loadBlueprint();
    return () => { isMounted = false; };
  }, []);

  const toggleBlueprintExtension = async (id: string, current: boolean) => {
    try {
      await apiFetch('/api/blueprint/extensions/toggle', {
        method: 'POST',
        body: JSON.stringify({ id, enabled: !current }),
      });
      setBlueprintExtensions(prev => prev.map(e => (e.id === id ? { ...e, enabled: !current } : e)));
      setBlueprintNotice(`Extension ${id} status updated.`);
      setTimeout(() => setBlueprintNotice(null), 2500);
    } catch {}
  };

  const handleBlueprintUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBlueprint(true);
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        let manifest = {
          id: file.name.replace(/\.(blueprint|zip|json)$/i, '').toLowerCase(),
          name: file.name.replace(/\.(blueprint|zip|json)$/i, ''),
          version: '1.0.0',
          author: 'Custom Blueprint Author',
          description: `Imported Blueprint package archive (${file.name})`,
          target: 'v1.0.0',
          icon: 'Boxes',
        };

        if (typeof event.target?.result === 'string') {
          try {
            const parsed = JSON.parse(event.target.result);
            if (parsed.id && parsed.name) manifest = { ...manifest, ...parsed };
          } catch {}
        }

        const res = await apiFetch('/api/blueprint/upload', {
          method: 'POST',
          body: JSON.stringify({ filename: file.name, manifest }),
        });
        if (res.ok) {
          const d = await res.json();
          setBlueprintExtensions(prev => [...prev.filter(x => x.id !== d.extension.id), d.extension]);
          setBlueprintNotice(`Blueprint package "${file.name}" installed and verified!`);
          setTimeout(() => setBlueprintNotice(null), 3000);
        }
      } finally {
        setUploadingBlueprint(false);
      }
    };
    reader.readAsText(file);
  };

  const { servers, activeServer, selectServer } = useServers();
  const [previewMode, setPreviewMode] = useState<'dashboard' | 'login' | 'console'>('dashboard');

  useEffect(() => {
    if (previewMode === 'console' && !activeServer && servers.length > 0) {
      selectServer(servers[0].uuid);
    }
  }, [previewMode, activeServer, servers, selectServer]);
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'mobile'>('desktop');
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [previewBoxWidth, setPreviewBoxWidth] = useState(740);

  useEffect(() => {
    const el = previewBoxRef.current;
    if (!el) return;
    const updateWidth = () => {
      const w = el.clientWidth;
      if (w > 0) setPreviewBoxWidth(w);
    };
    updateWidth();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateWidth);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const desktopZoom =
    devicePreview === 'desktop' && previewBoxWidth > 120 && previewBoxWidth < 1180
      ? Math.max(0.28, Number(((previewBoxWidth - 4) / 1180).toFixed(3)))
      : 1;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        if (typeof event.target?.result === 'string') {
          callback(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    saveTheme();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleExport = () => {
    const jsonStr = exportThemeJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slayernode-theme-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (importThemeJson(jsonText)) {
      setShowJsonModal(false);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } else {
      alert('Invalid Theme JSON structure.');
    }
  };

  const navMenuItems = [
    { id: 'canvas', label: 'Canvas & Wallpaper', icon: ImageIcon, desc: 'Solid background & custom wallpaper' },
    { id: 'colors', label: 'Brand & Status Colors', icon: Palette, desc: 'Primary Red & Status accents' },
    { id: 'geometry', label: 'Geometry & Buttons', icon: Sliders, desc: 'Square buttons, border radius & glass' },
    { id: 'auth', label: 'Login Portal Gateway', icon: Eye, desc: 'Login wallpaper, blur & brand text' },
    { id: 'branding', label: 'Branding & Fonts', icon: Type, desc: 'Logo, panel name & typography' },
    { id: 'addons', label: 'Built-in Addon Modules', icon: Key, desc: 'Installer, Player Manager & Splitter' },
    { id: 'blueprint', label: 'Blueprint Framework', icon: Boxes, desc: 'Extension packages & themes' },
    { id: 'nav', label: 'Custom Navigation', icon: ExternalLink, desc: 'Discord, Store & external links' },
  ];

  const solidColorSwatches = [
    { label: 'Slayer Charcoal', hex: '#111216' },
    { label: 'Void Black', hex: '#0A0B0E' },
    { label: 'Obsidian Gray', hex: '#181A20' },
    { label: 'Bloodline Tint', hex: '#180C0E' },
    { label: 'Pure Pitch Black', hex: '#000000' },
  ];

  return (
    <div
      className="min-h-screen text-[#F3F4F6] flex flex-col relative"
      style={{ backgroundColor: previewTheme.bg_canvas || '#111216' }}
    >
      {/* Background Wallpaper Layer */}
      {previewTheme.custom_wallpaper_url && (
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center transition-all duration-300"
          style={{
            backgroundImage: `url(${previewTheme.custom_wallpaper_url})`,
            filter: `blur(${previewTheme.wallpaper_blur || 0}px)`,
            opacity: (previewTheme.wallpaper_opacity ?? 100) / 100,
          }}
        />
      )}

      {/* ========================================================
          1. TOP APP BAR (Dedicated Full-Screen Toolbar)
          ======================================================== */}
      <header className="px-4 sm:px-6 py-3 bg-[#181A20]/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {onExit && (
            <button
              onClick={onExit}
              className="p-2 rounded-lg bg-[#21242C] hover:bg-[#2A2E38] text-white border border-white/10 transition-colors cursor-pointer flex items-center gap-2 text-xs font-bold whitespace-nowrap shrink-0"
              title="Exit to Admin Area"
            >
              <ArrowLeft className="w-4 h-4 text-[#DC2626]" />
              <span className="hidden sm:inline">Exit to Admin</span>
            </button>
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-[#DC2626]/20 border border-[#DC2626]/30 text-[#DC2626] shrink-0">
              <Palette className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-white tracking-wide whitespace-nowrap">
                  Appearance & Theme Studio
                </h1>
                {isDirty && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                    UNSAVED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden 2xl:block truncate">
                Real-time visual editor. Change colors, solid canvas, wallpapers & UI layout.
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Preset Fast Selector */}
          <div className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-lg bg-[#21242C] border border-white/10 text-xs whitespace-nowrap">
            <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#DC2626]" /> Preset:
            </span>
            {Object.keys(PRESET_THEMES).map(presetName => (
              <button
                key={presetName}
                onClick={() => applyPreset(presetName)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  previewTheme.preset_name === presetName
                    ? 'bg-[#DC2626] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {presetName}
              </button>
            ))}
          </div>

          <GlassButton
            size="sm"
            variant="glass"
            onClick={() => {
              setJsonText(exportThemeJson());
              setShowJsonModal(true);
            }}
            leftIcon={<Code className="w-3.5 h-3.5 text-slate-400" />}
          >
            <span className="hidden sm:inline">JSON</span>
          </GlassButton>

          <GlassButton
            size="sm"
            variant="glass"
            onClick={resetDefaults}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            <span className="hidden sm:inline">Reset</span>
          </GlassButton>

          <GlassButton
            size="sm"
            variant="accent"
            onClick={handleSave}
            leftIcon={savedNotice ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          >
            {savedNotice ? 'Saved!' : 'Save & Publish'}
          </GlassButton>
        </div>
      </header>

      {/* ========================================================
          2. WORKSPACE: LEFT MENU + CONTROLS + LIVE PREVIEW
          ======================================================== */}
      <div className="flex-1 flex flex-col md:flex-row relative z-10 overflow-hidden">
        {/* Left Sidebar Menu (Category Selector) */}
        <aside className="w-full md:w-52 bg-[#181A20] border-r border-white/10 shrink-0 p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto">
          <span className="hidden md:block text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2">
            Studio Sections
          </span>

          {navMenuItems.map(item => {
            const isActive = activeSection === item.id;
            const IconComp = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as any)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-left shrink-0 md:shrink md:w-full ${
                  isActive
                    ? 'bg-[#DC2626] text-white shadow-md shadow-red-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-[#21242C]'
                }`}
              >
                <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <div className="truncate hidden md:block">
                  <div className="leading-tight">{item.label}</div>
                  <div className="text-[10px] font-normal opacity-75 truncate">{item.desc}</div>
                </div>
                <span className="md:hidden">{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Center Panel: Controls for Active Section */}
        <div className="w-full md:w-[330px] lg:w-[350px] xl:w-[365px] shrink-0 p-3 sm:p-4 overflow-y-auto border-r border-white/10 bg-[#14161B]/90">
          {/* SECTION: Canvas & Wallpaper */}
          {activeSection === 'canvas' && (
            <GlassCard className="p-5 flex flex-col gap-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#DC2626]" /> Canvas Background & Wallpaper
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Configure solid canvas color or upload custom high-resolution wallpapers. Changes reflect immediately.
                </p>
              </div>

              {/* Solid Background Color & Quick Swatches */}
              <div className="p-4 rounded-xl bg-[#181A20] border border-white/10 flex flex-col gap-3">
                <label className="text-xs font-bold text-white block">Solid Canvas Background</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={previewTheme.bg_canvas || '#111216'}
                    onChange={e => updatePreview({ bg_canvas: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={previewTheme.bg_canvas || '#111216'}
                    onChange={e => updatePreview({ bg_canvas: e.target.value })}
                    className="glass-input px-3 py-2 text-xs font-mono w-32 text-center text-white uppercase"
                  />
                  <span className="text-[11px] text-slate-400">Current Hex</span>
                </div>

                {/* Preset Swatches */}
                <div className="pt-2 border-t border-white/5">
                  <span className="text-[11px] text-slate-400 font-medium block mb-2">Preset Solid Swatches:</span>
                  <div className="flex flex-wrap gap-2">
                    {solidColorSwatches.map(swatch => (
                      <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => updatePreview({ bg_canvas: swatch.hex })}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                          previewTheme.bg_canvas === swatch.hex
                            ? 'border-[#DC2626] bg-[#DC2626]/20 text-white font-bold'
                            : 'border-white/10 bg-[#21242C] text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded border border-white/20 shrink-0" style={{ backgroundColor: swatch.hex }} />
                        <span className="text-[11px]">{swatch.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Custom Wallpaper Configuration */}
              <div className="p-4 rounded-xl bg-[#181A20] border border-white/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#DC2626]" /> Custom Wallpaper Image
                  </label>
                  <label className="px-2.5 py-1 rounded bg-[#21242C] hover:bg-[#2A2E38] text-[11px] font-bold text-slate-200 border border-white/10 cursor-pointer flex items-center gap-1.5 transition-colors">
                    <Upload className="w-3 h-3 text-[#DC2626]" /> Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleFileUpload(e, url => updatePreview({ custom_wallpaper_url: url }))}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="w-16 h-12 rounded-lg bg-cover bg-center border border-white/15 shrink-0 bg-slate-900"
                    style={{
                      backgroundImage: previewTheme.custom_wallpaper_url ? `url(${previewTheme.custom_wallpaper_url})` : 'none',
                    }}
                  />
                  <div className="flex-1">
                    <GlassInput
                      label="Wallpaper URL (or upload above)"
                      value={previewTheme.custom_wallpaper_url || ''}
                      onChange={e => updatePreview({ custom_wallpaper_url: e.target.value })}
                      placeholder="https://example.com/wallpaper.jpg"
                    />
                  </div>
                </div>

                {previewTheme.custom_wallpaper_url && (
                  <button
                    onClick={() => updatePreview({ custom_wallpaper_url: '' })}
                    className="self-start text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    <Trash2 className="w-3 h-3" /> Remove Wallpaper (Use Solid Color)
                  </button>
                )}

                {/* Wallpaper Blur & Opacity Sliders */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300 font-semibold">Wallpaper Blur</span>
                      <span className="font-mono text-[#DC2626] font-bold">{previewTheme.wallpaper_blur ?? 0}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={32}
                      value={previewTheme.wallpaper_blur ?? 0}
                      onChange={e => updatePreview({ wallpaper_blur: parseInt(e.target.value) })}
                      className="w-full accent-[#DC2626] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300 font-semibold">Wallpaper Opacity</span>
                      <span className="font-mono text-[#DC2626] font-bold">{previewTheme.wallpaper_opacity ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={previewTheme.wallpaper_opacity ?? 100}
                      onChange={e => updatePreview({ wallpaper_opacity: parseInt(e.target.value) })}
                      className="w-full accent-[#DC2626] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* SECTION: Brand & Status Colors */}
          {activeSection === 'colors' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#DC2626]" /> Brand & Status Colors
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Primary Crimson Red and cluster telemetry status indicator colors.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#181A20] border border-white/10">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Primary Red Accent</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={previewTheme.accent_primary}
                      onChange={e => updatePreview({ accent_primary: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input
                      type="text"
                      value={previewTheme.accent_primary}
                      onChange={e => updatePreview({ accent_primary: e.target.value })}
                      className="glass-input px-2 py-1 text-xs font-mono w-24 text-center text-white"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#181A20] border border-white/10">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Secondary Crimson</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={previewTheme.accent_secondary}
                      onChange={e => updatePreview({ accent_secondary: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input
                      type="text"
                      value={previewTheme.accent_secondary}
                      onChange={e => updatePreview({ accent_secondary: e.target.value })}
                      className="glass-input px-2 py-1 text-xs font-mono w-24 text-center text-white"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#181A20] border border-white/10">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Status: Online</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={previewTheme.status_online}
                      onChange={e => updatePreview({ status_online: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input
                      type="text"
                      value={previewTheme.status_online}
                      onChange={e => updatePreview({ status_online: e.target.value })}
                      className="glass-input px-2 py-1 text-xs font-mono w-24 text-center text-white"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#181A20] border border-white/10">
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">Status: Offline</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={previewTheme.status_offline}
                      onChange={e => updatePreview({ status_offline: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input
                      type="text"
                      value={previewTheme.status_offline}
                      onChange={e => updatePreview({ status_offline: e.target.value })}
                      className="glass-input px-2 py-1 text-xs font-mono w-24 text-center text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Accent Glow Customization */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                <label className="text-xs font-bold text-slate-300">Crimson Ambient Glow Intensity</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'subtle', label: 'Subtle' },
                    { id: 'vibrant', label: 'Vibrant' },
                    { id: 'cyber', label: 'Cyber' },
                  ].map(glow => (
                    <button
                      key={glow.id}
                      onClick={() => updatePreview({ accent_glow_intensity: glow.id as any })}
                      className={`p-2 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                        (previewTheme.accent_glow_intensity || 'subtle') === glow.id
                          ? 'bg-[#DC2626] text-white shadow-md'
                          : 'bg-[#21242C] text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      {glow.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Indicator Style */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                <label className="text-xs font-bold text-slate-300">Telemetry Status Indicator Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'badge', label: 'Solid Badge' },
                    { id: 'dot', label: 'Pulsing Dot' },
                    { id: 'glow_pill', label: 'Glow Pill' },
                  ].map(st => (
                    <button
                      key={st.id}
                      onClick={() => updatePreview({ status_style: st.id as any })}
                      className={`p-2 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                        (previewTheme.status_style || 'badge') === st.id
                          ? 'bg-[#DC2626] text-white shadow-md'
                          : 'bg-[#21242C] text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          {/* SECTION: Geometry & Buttons */}
          {activeSection === 'geometry' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#DC2626]" /> Geometry, Buttons & Glass Physics
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Button shapes, corner radii, and obsidian card surface translucency.
                </p>
              </div>

              {/* Button Shape */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-300">Button Shape</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'square', label: 'Square (Standard)' },
                    { id: 'squircle', label: 'Squircle Bevel' },
                    { id: 'pill', label: 'Pill Shape' },
                  ].map(shape => (
                    <button
                      key={shape.id}
                      onClick={() => updatePreview({ button_shape: shape.id as any })}
                      className={`p-2.5 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                        previewTheme.button_shape === shape.id
                          ? 'bg-[#DC2626] text-white shadow-md'
                          : 'bg-[#21242C] text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Corner Roundness */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-semibold">Corner Roundness (Border Radius)</span>
                  <span className="font-mono text-[#DC2626] font-bold">{previewTheme.corner_roundness_px}px</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={24}
                  value={previewTheme.corner_roundness_px}
                  onChange={e => updatePreview({ corner_roundness_px: parseInt(e.target.value) })}
                  className="w-full accent-[#DC2626] cursor-pointer"
                />
              </div>

              {/* Card Opacity */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-semibold">Card Surface Opacity</span>
                  <span className="font-mono text-[#DC2626] font-bold">{previewTheme.card_opacity_pct}%</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={100}
                  value={previewTheme.card_opacity_pct}
                  onChange={e => updatePreview({ card_opacity_pct: parseInt(e.target.value) })}
                  className="w-full accent-[#DC2626] cursor-pointer"
                />
              </div>

              {/* Glass Blur */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-semibold">Glass Backdrop Blur</span>
                  <span className="font-mono text-[#DC2626] font-bold">{previewTheme.glass_blur_px}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={32}
                  value={previewTheme.glass_blur_px}
                  onChange={e => updatePreview({ glass_blur_px: parseInt(e.target.value) })}
                  className="w-full accent-[#DC2626] cursor-pointer"
                />
              </div>

              {/* Font Scale Customization */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                <label className="text-xs font-bold text-slate-300">Interface Typography Scaling</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'compact', label: 'Compact (90%)' },
                    { id: 'normal', label: 'Standard (100%)' },
                    { id: 'large', label: 'Enlarged (110%)' },
                  ].map(scale => (
                    <button
                      key={scale.id}
                      onClick={() => updatePreview({ font_scale: scale.id as any })}
                      className={`p-2 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                        (previewTheme.font_scale || 'normal') === scale.id
                          ? 'bg-[#DC2626] text-white shadow-md'
                          : 'bg-[#21242C] text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      {scale.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Border Style */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                <label className="text-xs font-bold text-slate-300">Card Frame & Border Accent</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'subtle', label: 'Subtle Line' },
                    { id: 'crimson_glow', label: 'Crimson Neon Glow' },
                    { id: 'glass_clean', label: 'Glass Clean' },
                    { id: 'none', label: 'Borderless Flat' },
                  ].map(border => (
                    <button
                      key={border.id}
                      onClick={() => updatePreview({ card_border_style: border.id as any })}
                      className={`p-2 rounded-lg text-xs font-semibold text-center transition-all cursor-pointer ${
                        (previewTheme.card_border_style || 'subtle') === border.id
                          ? 'bg-[#DC2626] text-white shadow-md'
                          : 'bg-[#21242C] text-slate-300 hover:text-white border border-white/10'
                      }`}
                    >
                      {border.label}
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          {/* SECTION: Login Portal Gateway */}
          {activeSection === 'auth' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#DC2626]" /> Authentication Gateway Portal
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Custom wallpaper, overlay blur, and typography for public login page.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">Login Wallpaper</label>
                <label className="px-2.5 py-1 rounded bg-[#21242C] hover:bg-[#2A2E38] text-[11px] font-bold text-slate-200 border border-white/10 cursor-pointer flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3 h-3 text-[#DC2626]" /> Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleFileUpload(e, url => updatePreview({ auth_bg_url: url }))}
                  />
                </label>
              </div>

              <GlassInput
                label="Login Background Image URL"
                value={previewTheme.auth_bg_url || ''}
                onChange={e => updatePreview({ auth_bg_url: e.target.value })}
                placeholder="Leave empty to use solid canvas color"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300 font-semibold">Overlay Darkness</span>
                    <span className="font-mono text-[#DC2626]">{previewTheme.auth_overlay_darkness}%</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={95}
                    value={previewTheme.auth_overlay_darkness}
                    onChange={e => updatePreview({ auth_overlay_darkness: parseInt(e.target.value) })}
                    className="w-full accent-[#DC2626] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-300 font-semibold">Overlay Blur</span>
                    <span className="font-mono text-[#DC2626]">{previewTheme.auth_overlay_blur}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={previewTheme.auth_overlay_blur}
                    onChange={e => updatePreview({ auth_overlay_blur: parseInt(e.target.value) })}
                    className="w-full accent-[#DC2626] cursor-pointer"
                  />
                </div>
              </div>

              <GlassToggle
                label="Public Registration"
                description="Allow new users to self-register accounts"
                checked={previewTheme.auth_allow_registration}
                onChange={v => updatePreview({ auth_allow_registration: v })}
              />
            </GlassCard>
          )}

          {/* SECTION: Branding & Media */}
          {activeSection === 'branding' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Type className="w-4 h-4 text-[#DC2626]" /> Branding, Logo & Typography
                </h3>
              </div>

              <GlassInput
                label="Control Panel Name"
                value={previewTheme.panel_name}
                onChange={e => updatePreview({ panel_name: e.target.value })}
              />

              <div className="flex items-center gap-3">
                <img
                  src={previewTheme.logo_url || '/logo.jpg'}
                  alt="Logo preview"
                  className="w-12 h-12 rounded-lg object-cover border border-white/20 shrink-0"
                />
                <div className="flex-1">
                  <GlassInput
                    label="Logo URL"
                    value={previewTheme.logo_url}
                    onChange={e => updatePreview({ logo_url: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Primary Font Family</label>
                <select
                  value={previewTheme.font_family}
                  onChange={e => updatePreview({ font_family: e.target.value })}
                  className="glass-input text-xs w-full px-3 py-2 bg-[#181A20] text-white cursor-pointer"
                >
                  <option value="Inter">Inter (Apple Clean)</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern)</option>
                  <option value="JetBrains Mono">JetBrains Mono (Developer)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Custom CSS (Injected Live)
                </label>
                <textarea
                  rows={4}
                  value={previewTheme.custom_css || ''}
                  onChange={e => updatePreview({ custom_css: e.target.value })}
                  placeholder="/* Custom CSS overrides */"
                  className="glass-input w-full p-3 font-mono text-xs text-red-200 resize-none"
                />
              </div>
            </GlassCard>
          )}

          {/* SECTION: Built-in Addon Modules */}
          {activeSection === 'addons' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#DC2626]" /> Built-In Addon Modules
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Toggle native integrated server modules without installing third-party plugins.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <GlassToggle
                  label="1. Plugin & Modpack Installer"
                  description="Modrinth, CurseForge, SpigotMC"
                  checked={previewTheme.addon_mod_installer_enabled}
                  onChange={v => updatePreview({ addon_mod_installer_enabled: v })}
                />

                <GlassToggle
                  label="2. Player Manager"
                  description="Online players, avatars, kick/ban, gamemode"
                  checked={previewTheme.addon_player_manager_enabled}
                  onChange={v => updatePreview({ addon_player_manager_enabled: v })}
                />

                <GlassToggle
                  label="3. 1-Click Server Software Changer"
                  description="Purpur, Paper, Fabric, Forge, Velocity"
                  checked={previewTheme.addon_software_changer_enabled}
                  onChange={v => updatePreview({ addon_software_changer_enabled: v })}
                />

                <GlassToggle
                  label="4. Visual Config Editor"
                  description="GUI sliders & live MOTD preview"
                  checked={previewTheme.addon_config_editor_enabled}
                  onChange={v => updatePreview({ addon_config_editor_enabled: v })}
                />

                <GlassToggle
                  label="5. Dynamic Server Splitter"
                  description="Distribute resources across instances"
                  checked={previewTheme.addon_server_splitter_enabled}
                  onChange={v => updatePreview({ addon_server_splitter_enabled: v })}
                />
              </div>
            </GlassCard>
          )}

          {/* SECTION: Blueprint Framework */}
          {activeSection === 'blueprint' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-[#DC2626]" />
                  <h3 className="text-sm font-bold text-white">Blueprint Framework Engine</h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                  v2.4.0 ACTIVE
                </span>
              </div>

              {blueprintNotice && (
                <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-red-400" />
                  <span>{blueprintNotice}</span>
                </div>
              )}

              {/* Upload Dropzone */}
              <div className="p-4 rounded-xl border border-dashed border-white/20 bg-[#181A20] text-center flex flex-col items-center justify-center gap-2">
                <Boxes className="w-8 h-8 text-[#DC2626] opacity-80" />
                <div>
                  <span className="text-xs font-bold text-white block">Install Blueprint Extension</span>
                  <span className="text-[11px] text-slate-400">Select a <code className="text-[#DC2626]">.blueprint</code> or <code className="text-[#DC2626]">.zip</code> package archive</span>
                </div>
                <label className="mt-1 px-3 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold cursor-pointer transition-colors">
                  {uploadingBlueprint ? 'Verifying Package...' : 'Select Extension File'}
                  <input
                    type="file"
                    accept=".blueprint,.zip,.json"
                    className="hidden"
                    onChange={handleBlueprintUpload}
                  />
                </label>
              </div>

              {/* Installed Extensions List */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-300">
                  Installed Extensions ({(blueprintExtensions || []).length})
                </span>

                {(blueprintExtensions || []).map(ext => (
                  <div
                    key={ext.id}
                    className="p-3 rounded-lg bg-[#181A20] border border-white/10 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#DC2626]" />
                        <span className="text-xs font-bold text-white">{ext.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                          v{ext.version}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        ext.enabled ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-slate-800 text-slate-400 border-white/10'
                      }`}>
                        {ext.enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {ext.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-400">
                      <span>Author: {ext.author}</span>
                      <button
                        onClick={() => toggleBlueprintExtension(ext.id, ext.enabled)}
                        className={`font-semibold cursor-pointer transition-colors ${
                          ext.enabled ? 'text-slate-400 hover:text-white' : 'text-red-400 hover:text-red-300'
                        }`}
                      >
                        {ext.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* SECTION: Custom Navigation Links */}
          {activeSection === 'nav' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-[#DC2626]" /> Custom Navigation Links
                </h3>
              </div>

              <div className="flex flex-col gap-2">
                {(previewTheme.custom_nav_links || []).map(link => (
                  <div key={link.id} className="p-3 rounded-lg bg-[#181A20] border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">{link.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{link.url}</span>
                    </div>
                    <button
                      onClick={() =>
                        updatePreview({
                          custom_nav_links: previewTheme.custom_nav_links.filter(x => x.id !== link.id),
                        })
                      }
                      className="p-1 rounded text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right Panel: Live Interactive Preview Sandbox */}
        <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col gap-3 overflow-y-auto">
          {/* Sandbox Top Controller Toolbar */}
          <div className="flex items-center justify-between bg-[#181A20] p-2.5 rounded-lg border border-white/10">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPreviewMode('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  previewMode === 'dashboard' ? 'bg-[#DC2626] text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setPreviewMode('console')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  previewMode === 'console' ? 'bg-[#DC2626] text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Console
              </button>
              <button
                onClick={() => setPreviewMode('login')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  previewMode === 'login' ? 'bg-[#DC2626] text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Login View
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setDevicePreview('desktop')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  devicePreview === 'desktop' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Desktop View"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDevicePreview('mobile')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  devicePreview === 'mobile' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Mobile View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Screen Sandbox Container */}
          <div
            ref={previewBoxRef}
            className={`transition-all duration-300 mx-auto w-full rounded-xl overflow-hidden border border-white/20 shadow-2xl relative min-h-[640px] max-h-[840px] overflow-y-auto overflow-x-hidden ${
              devicePreview === 'mobile' ? 'max-w-sm' : 'max-w-full'
            }`}
            style={{ backgroundColor: previewTheme.bg_canvas || '#111216' }}
          >
            {/* Live Wallpaper in Preview Sandbox */}
            {previewTheme.custom_wallpaper_url && (
              <div
                className="absolute inset-0 pointer-events-none z-0 bg-cover bg-center transition-all duration-300"
                style={{
                  backgroundImage: `url(${previewTheme.custom_wallpaper_url})`,
                  filter: `blur(${previewTheme.wallpaper_blur || 0}px)`,
                  opacity: (previewTheme.wallpaper_opacity ?? 100) / 100,
                }}
              />
            )}

            {/* Live Interactive Component */}
            <div
              className="p-5 relative z-10"
              style={
                devicePreview === 'desktop' && desktopZoom < 1
                  ? ({ zoom: desktopZoom, width: '1180px' } as React.CSSProperties)
                  : undefined
              }
            >
              {previewMode === 'dashboard' && (
                <ServerDashboard onSelectServerDetail={() => setPreviewMode('console')} />
              )}
              {previewMode === 'console' && (
                activeServer ? (
                  <ConsoleTerminal />
                ) : (
                  <GlassCard className="p-8 text-center text-xs text-slate-400">
                    Deploy at least one server instance to preview the live Console Terminal here.
                  </GlassCard>
                )
              )}
              {previewMode === 'login' && (
                <div className="relative min-h-[580px] flex items-center justify-center">
                  <LoginView />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* JSON Import/Export Modal */}
      <GlassModal
        isOpen={showJsonModal}
        onClose={() => setShowJsonModal(false)}
        title="Theme Studio JSON Configuration"
        description="Export or import full theme physics, color schemas, layout flags, and component presets."
        maxWidth="2xl"
      >
        <div className="flex flex-col gap-3 py-2">
          <textarea
            rows={14}
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            className="w-full p-4 rounded-xl bg-[#14161B] font-mono text-xs text-red-200 border border-white/10 resize-none"
          />
          <div className="flex items-center justify-between pt-2">
            <GlassButton size="sm" variant="glass" onClick={handleExport} leftIcon={<Download className="w-3.5 h-3.5" />}>
              Download JSON File
            </GlassButton>
            <div className="flex items-center gap-2">
              <GlassButton size="sm" variant="ghost" onClick={() => setShowJsonModal(false)}>
                Cancel
              </GlassButton>
              <GlassButton size="sm" variant="accent" onClick={handleImport} leftIcon={<Upload className="w-3.5 h-3.5" />}>
                Apply JSON
              </GlassButton>
            </div>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};
