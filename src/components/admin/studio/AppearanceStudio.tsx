import React, { useState } from 'react';
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
  Layers,
  Smartphone,
  Monitor,
  Code,
  Shield,
  ExternalLink,
  Plus,
  Trash2,
  Image as ImageIcon,
  Boxes,
  Package,
} from 'lucide-react';
import { useTheme, PRESET_THEMES } from '../../../context/ThemeContext';
import { BlueprintExtension } from '../../../types';
import { GlassCard } from '../../ui/GlassCard';
import { GlassButton } from '../../ui/GlassButton';
import { GlassInput } from '../../ui/GlassInput';
import { GlassToggle } from '../../ui/GlassToggle';
import { GlassModal } from '../../ui/GlassModal';
import { ServerDashboard } from '../../server/ServerDashboard';
import { LoginView } from '../../auth/LoginView';
import { ConsoleTerminal } from '../../server/ConsoleTerminal';

export const AppearanceStudio: React.FC = () => {
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

  const [activeSection, setActiveSection] = useState<'colors' | 'layout' | 'buttons' | 'auth' | 'branding' | 'blueprint' | 'addons'>('colors');
  const [blueprintExtensions, setBlueprintExtensions] = useState<BlueprintExtension[]>([]);
  const [uploadingBlueprint, setUploadingBlueprint] = useState(false);
  const [blueprintNotice, setBlueprintNotice] = useState<string | null>(null);

  React.useEffect(() => {
    const loadBlueprint = async () => {
      try {
        const res = await fetch('/api/blueprint/extensions');
        if (res.ok) {
          const d = await res.json();
          setBlueprintExtensions(d.extensions);
        }
      } catch {}
    };
    loadBlueprint();
  }, []);

  const toggleBlueprintExtension = async (id: string, current: boolean) => {
    try {
      await fetch('/api/blueprint/extensions/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !current }),
      });
      setBlueprintExtensions(prev => prev.map(e => e.id === id ? { ...e, enabled: !current } : e));
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

        const res = await fetch('/api/blueprint/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
  const [previewMode, setPreviewMode] = useState<'dashboard' | 'login' | 'console'>('dashboard');
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'mobile'>('desktop');
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = event => {
        if (event.target?.result) {
          callback(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    saveTheme();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleExport = () => {
    const data = exportThemeJson();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slayernode-theme-${previewTheme.preset_name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a);
  };

  const handleImport = () => {
    const ok = importThemeJson(jsonText);
    if (ok) {
      setShowJsonModal(false);
      setJsonText('');
    } else {
      alert('Invalid Theme JSON.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Studio Header Toolbar */}
      <GlassCard className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-600 text-white shadow-lg shadow-sky-500/25 border border-white/20">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-tight">
                Nebula-Style Theme & Appearance Studio
              </h1>
              {isDirty && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  UNSAVED CHANGES
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live split-screen customization editor. Every visual element, layout, physics slider, and addon is editable without touching code.
            </p>
          </div>
        </div>

        {/* Global Studio Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <GlassButton
            size="sm"
            variant="glass"
            onClick={() => {
              setJsonText(exportThemeJson());
              setShowJsonModal(true);
            }}
            leftIcon={<Code className="w-3.5 h-3.5 text-sky-400" />}
          >
            JSON Config
          </GlassButton>

          <GlassButton
            size="sm"
            variant="glass"
            onClick={resetDefaults}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset
          </GlassButton>

          <GlassButton
            size="sm"
            variant="accent"
            onClick={handleSave}
            leftIcon={savedNotice ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          >
            {savedNotice ? 'Published to DB!' : 'Publish Theme'}
          </GlassButton>
        </div>
      </GlassCard>

      {/* Preset Fast Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-semibold shrink-0 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Designer Presets:
        </span>
        {Object.keys(PRESET_THEMES).map(presetName => (
          <button
            key={presetName}
            onClick={() => applyPreset(presetName)}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer ${
              previewTheme.preset_name === presetName
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/25 border border-white/20'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            {presetName}
          </button>
        ))}
      </div>

      {/* Split-Screen Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Editor Controls (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-white/10 overflow-x-auto text-xs">
            {[
              { id: 'colors', label: 'Colors & Glass', icon: <Palette className="w-3.5 h-3.5" /> },
              { id: 'layout', label: 'Layout & Nav', icon: <Layout className="w-3.5 h-3.5" /> },
              { id: 'buttons', label: 'Buttons & UI', icon: <Sliders className="w-3.5 h-3.5" /> },
              { id: 'auth', label: 'Auth Screen', icon: <Eye className="w-3.5 h-3.5" /> },
              { id: 'branding', label: 'Branding & Media', icon: <Type className="w-3.5 h-3.5" /> },
              { id: 'blueprint', label: 'Blueprint Addons', icon: <Boxes className="w-3.5 h-3.5" /> },
              { id: 'addons', label: 'Addon Toggles', icon: <Key className="w-3.5 h-3.5" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all shrink-0 cursor-pointer ${
                  activeSection === tab.id
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Section 1: Colors & Glass Physics */}
          {activeSection === 'colors' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-sky-400" /> Color Palette & Glass Physics
              </h3>

              {/* Sliders for Blur, Opacity, Specular, Roundness */}
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-semibold">Glass Backdrop Blur</span>
                    <span className="font-mono text-sky-400">{previewTheme.glass_blur_px}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={previewTheme.glass_blur_px}
                    onChange={e => updatePreview({ glass_blur_px: parseInt(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-semibold">Card Translucency Opacity</span>
                    <span className="font-mono text-sky-400">{previewTheme.card_opacity_pct}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={95}
                    value={previewTheme.card_opacity_pct}
                    onChange={e => updatePreview({ card_opacity_pct: parseInt(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-semibold">Specular Border Opacity</span>
                    <span className="font-mono text-sky-400">{previewTheme.specular_border_opacity_pct}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={previewTheme.specular_border_opacity_pct}
                    onChange={e => updatePreview({ specular_border_opacity_pct: parseInt(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-semibold">Corner Roundness (Border Radius)</span>
                    <span className="font-mono text-sky-400">{previewTheme.corner_roundness_px}px</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={36}
                    value={previewTheme.corner_roundness_px}
                    onChange={e => updatePreview({ corner_roundness_px: parseInt(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Color Hex Pickers */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Primary Accent</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={previewTheme.accent_primary}
                      onChange={e => updatePreview({ accent_primary: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={previewTheme.accent_primary}
                      onChange={e => updatePreview({ accent_primary: e.target.value })}
                      className="glass-input px-2 py-1 text-xs font-mono w-24 text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Secondary Accent</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={previewTheme.accent_secondary}
                      onChange={e => updatePreview({ accent_secondary: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={previewTheme.accent_secondary}
                      onChange={e => updatePreview({ accent_secondary: e.target.value })}
                      className="glass-input px-2 py-1 text-xs font-mono w-24 text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Canvas Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={previewTheme.bg_canvas}
                      onChange={e => updatePreview({ bg_canvas: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={previewTheme.bg_canvas}
                      onChange={e => updatePreview({ bg_canvas: e.target.value })}
                      className="glass-input px-2 py-1 text-xs font-mono w-24 text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Shadow Depth</label>
                  <select
                    value={previewTheme.shadow_depth}
                    onChange={e => updatePreview({ shadow_depth: e.target.value as any })}
                    className="glass-input text-xs px-2.5 py-1.5 w-full bg-slate-900 text-slate-200"
                  >
                    <option value="none">None</option>
                    <option value="subtle">Subtle</option>
                    <option value="deep">Deep Obsidian</option>
                    <option value="colored_glow">Colored Glow</option>
                  </select>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Section 2: Layout & Navigation */}
          {activeSection === 'layout' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layout className="w-4 h-4 text-indigo-400" /> Layout & Navigation Architecture
              </h3>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-slate-300">Navigation Bar Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'floating_top', label: 'Floating Top Pill' },
                    { id: 'collapsible_sidebar', label: 'Glass Sidebar' },
                    { id: 'dock_bar', label: 'macOS Glass Dock' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => updatePreview({ navigation_layout: item.id as any })}
                      className={`p-3 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                        previewTheme.navigation_layout === item.id
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm'
                          : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Server Fleet Card Layout
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updatePreview({ server_card_layout: 'grid' })}
                      className={`p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        previewTheme.server_card_layout === 'grid'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      3-Column Grid Cards
                    </button>
                    <button
                      onClick={() => updatePreview({ server_card_layout: 'list' })}
                      className={`p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        previewTheme.server_card_layout === 'list'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      Compact Row List
                    </button>
                  </div>
                </div>

                {/* Custom Nav Links */}
                <div className="pt-3 border-t border-white/10">
                  <span className="text-xs font-semibold text-slate-300 block mb-2">
                    Custom External Links ({previewTheme.custom_nav_links?.length || 0})
                  </span>
                  <div className="flex flex-col gap-2">
                    {previewTheme.custom_nav_links?.map((link, idx) => (
                      <div key={link.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
                        <span className="font-bold text-white">{link.label}</span>
                        <span className="font-mono text-slate-400 truncate max-w-[150px]">{link.url}</span>
                        <button
                          onClick={() => {
                            const filtered = previewTheme.custom_nav_links.filter(l => l.id !== link.id);
                            updatePreview({ custom_nav_links: filtered });
                          }}
                          className="text-rose-400 p-1 hover:bg-rose-500/10 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Section 3: Button & UI Components */}
          {activeSection === 'buttons' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" /> Buttons & UI Primitives
              </h3>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Global Button Shape</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'pill', label: 'Apple Pill (Full)' },
                      { id: 'squircle', label: 'Squircle (16px)' },
                      { id: 'rounded', label: 'Subtle (8px)' },
                    ].map(shape => (
                      <button
                        key={shape.id}
                        onClick={() => updatePreview({ button_shape: shape.id as any })}
                        className={`p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          previewTheme.button_shape === shape.id
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {shape.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Hover Motion Physics</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'subtle', label: 'Subtle' },
                      { id: 'normal', label: 'Tactile (1.02)' },
                      { id: 'energetic', label: 'Spring (1.04)' },
                    ].map(motion => (
                      <button
                        key={motion.id}
                        onClick={() => updatePreview({ hover_motion_intensity: motion.id as any })}
                        className={`p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          previewTheme.hover_motion_intensity === motion.id
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {motion.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview sample buttons */}
                <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 flex flex-col gap-2">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Interactive Preview:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <GlassButton size="sm" variant="glass">Glass Button</GlassButton>
                    <GlassButton size="sm" variant="accent">Accent Glow</GlassButton>
                    <GlassButton size="sm" variant="danger">Danger</GlassButton>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Section 4: Login & Auth Page Editor */}
          {activeSection === 'auth' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-400" /> Authentication Surface Architecture
              </h3>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Background Shader Engine</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'wallpaper', label: 'Transparent Wallpaper' },
                      { id: 'aurora_mesh', label: 'Dynamic Aurora Mesh' },
                      { id: 'particle_grid', label: 'Cyber Particle Grid' },
                      { id: 'video', label: 'Looping Video URL' },
                    ].map(bg => (
                      <button
                        key={bg.id}
                        onClick={() => updatePreview({ auth_background_type: bg.id as any })}
                        className={`p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          previewTheme.auth_background_type === bg.id
                            ? 'bg-[#00D2FF]/20 text-[#00D2FF] border border-[#00D2FF]/40'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Login Wallpaper Customization */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#00D2FF]" /> Login Background Wallpaper
                    </label>
                    <label className="text-[11px] font-semibold text-[#00D2FF] hover:underline cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Upload File
                      <input
                        type="file"
                        accept="image/*,video/mp4"
                        className="hidden"
                        onChange={e => handleFileUpload(e, url => updatePreview({ auth_bg_url: url }))}
                      />
                    </label>
                  </div>

                  <GlassInput
                    label="Background Image / Video URL"
                    value={previewTheme.auth_bg_url || ''}
                    onChange={e => updatePreview({ auth_bg_url: e.target.value })}
                    placeholder="/wallpapers/slayernode-liquid-mesh.png"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updatePreview({ auth_bg_url: '/wallpapers/slayernode-liquid-mesh.png' })}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 cursor-pointer"
                    >
                      Use SlayerNode Mesh Wallpaper
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300 font-semibold">Overlay Darkness</span>
                        <span className="font-mono text-[#00D2FF]">{previewTheme.auth_overlay_darkness}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        value={previewTheme.auth_overlay_darkness}
                        onChange={e => updatePreview({ auth_overlay_darkness: parseInt(e.target.value) })}
                        className="w-full accent-[#00D2FF] cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300 font-semibold">Wallpaper Blur</span>
                        <span className="font-mono text-[#00D2FF]">{previewTheme.auth_overlay_blur}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={24}
                        value={previewTheme.auth_overlay_blur}
                        onChange={e => updatePreview({ auth_overlay_blur: parseInt(e.target.value) })}
                        className="w-full accent-[#00D2FF] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">Auth Card Alignment</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'center', label: 'Center Card' },
                      { id: 'split_left', label: 'Left Split' },
                      { id: 'split_right', label: 'Right Split' },
                    ].map(pos => (
                      <button
                        key={pos.id}
                        onClick={() => updatePreview({ auth_card_position: pos.id as any })}
                        className={`p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          previewTheme.auth_card_position === pos.id
                            ? 'bg-[#00D2FF]/20 text-[#00D2FF] border border-[#00D2FF]/40'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                <GlassInput
                  label="Welcome Heading Text"
                  value={previewTheme.auth_heading}
                  onChange={e => updatePreview({ auth_heading: e.target.value })}
                />

                <GlassInput
                  label="Welcome Subtitle"
                  value={previewTheme.auth_subtitle}
                  onChange={e => updatePreview({ auth_subtitle: e.target.value })}
                />

                <GlassToggle
                  label="Allow Self-Registration"
                  description="Display 'Create Account' link on login"
                  checked={previewTheme.auth_allow_registration}
                  onChange={v => updatePreview({ auth_allow_registration: v })}
                />
              </div>
            </GlassCard>
          )}

          {/* Section 5: Branding, Fonts & Custom CSS */}
          {activeSection === 'branding' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Type className="w-4 h-4 text-amber-400" /> Branding, Logos & Wallpapers
              </h3>

              <div className="flex flex-col gap-4">
                <GlassInput
                  label="Panel Name"
                  value={previewTheme.panel_name}
                  onChange={e => updatePreview({ panel_name: e.target.value })}
                />

                {/* Brand Logo Upload & Selector */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#00D2FF]" /> Official Brand Logo
                    </label>
                    <label className="text-[11px] font-semibold text-[#00D2FF] hover:underline cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleFileUpload(e, url => updatePreview({ logo_url: url }))}
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={previewTheme.logo_url || '/logo.jpg'}
                      alt="Logo Preview"
                      className="w-12 h-12 rounded-xl object-cover border border-white/20 shadow-md shrink-0"
                    />
                    <div className="flex-1">
                      <GlassInput
                        label="Logo URL or File Path"
                        value={previewTheme.logo_url || ''}
                        onChange={e => updatePreview({ logo_url: e.target.value })}
                        placeholder="/logo.jpg"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updatePreview({ logo_url: '/logo.jpg' })}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 cursor-pointer"
                    >
                      Use Official SlayerNode SN Logo
                    </button>
                  </div>
                </div>

                {/* Dashboard / Home Page Wallpaper Upload & Physics */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#00D2FF]" /> Dashboard & Home Background Wallpaper
                    </label>
                    <label className="text-[11px] font-semibold text-[#00D2FF] hover:underline cursor-pointer flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Upload Wallpaper
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
                      className="w-16 h-12 rounded-xl bg-cover bg-center border border-white/20 shadow-md shrink-0"
                      style={{ backgroundImage: `url(${previewTheme.custom_wallpaper_url || '/wallpapers/slayernode-liquid-mesh.png'})` }}
                    />
                    <div className="flex-1">
                      <GlassInput
                        label="Dashboard Wallpaper URL"
                        value={previewTheme.custom_wallpaper_url || ''}
                        onChange={e => updatePreview({ custom_wallpaper_url: e.target.value })}
                        placeholder="/wallpapers/slayernode-liquid-mesh.png"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updatePreview({ custom_wallpaper_url: '/wallpapers/slayernode-liquid-mesh.png' })}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 cursor-pointer"
                    >
                      Use SlayerNode Liquid Mesh Wallpaper
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300 font-semibold">Wallpaper Blur</span>
                        <span className="font-mono text-[#00D2FF]">{previewTheme.wallpaper_blur ?? 0}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={30}
                        value={previewTheme.wallpaper_blur ?? 0}
                        onChange={e => updatePreview({ wallpaper_blur: parseInt(e.target.value) })}
                        className="w-full accent-[#00D2FF] cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300 font-semibold">Wallpaper Opacity</span>
                        <span className="font-mono text-[#00D2FF]">{previewTheme.wallpaper_opacity ?? 85}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={previewTheme.wallpaper_opacity ?? 85}
                        onChange={e => updatePreview({ wallpaper_opacity: parseInt(e.target.value) })}
                        className="w-full accent-[#00D2FF] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Primary Font Family</label>
                  <select
                    value={previewTheme.font_family}
                    onChange={e => updatePreview({ font_family: e.target.value })}
                    className="glass-input text-xs w-full px-3 py-2 bg-slate-900 text-white cursor-pointer"
                  >
                    <option value="Inter">Inter (Apple Clean)</option>
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Geometric)</option>
                    <option value="Space Grotesk">Space Grotesk (Tech/Cyber)</option>
                    <option value="JetBrains Mono">JetBrains Mono (Developer)</option>
                  </select>
                </div>

                <GlassToggle
                  label="Announcement Banner"
                  description="Show fleet notification bar at the top"
                  checked={previewTheme.announcement_banner.enabled}
                  onChange={v =>
                    updatePreview({
                      announcement_banner: { ...previewTheme.announcement_banner, enabled: v },
                    })
                  }
                />

                {previewTheme.announcement_banner.enabled && (
                  <GlassInput
                    label="Banner Text"
                    value={previewTheme.announcement_banner.text}
                    onChange={e =>
                      updatePreview({
                        announcement_banner: { ...previewTheme.announcement_banner, text: e.target.value },
                      })
                    }
                  />
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Custom CSS Override (Live Injected)
                  </label>
                  <textarea
                    rows={4}
                    value={previewTheme.custom_css || ''}
                    onChange={e => updatePreview({ custom_css: e.target.value })}
                    placeholder="/* Custom CSS rules injected into document head */"
                    className="glass-input w-full p-3 font-mono text-xs text-sky-200 resize-none selection:bg-sky-500/30"
                  />
                </div>
              </div>
            </GlassCard>
          )}

          {/* Section: Blueprint Framework & Extension Manager */}
          {activeSection === 'blueprint' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-[#00D2FF]" />
                  <h3 className="text-sm font-bold text-white">Blueprint Framework Engine</h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                  v2.4.0 ACTIVE
                </span>
              </div>

              {blueprintNotice && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{blueprintNotice}</span>
                </div>
              )}

              {/* Upload Dropzone */}
              <div className="p-4 rounded-xl border border-dashed border-white/20 bg-slate-900/40 text-center flex flex-col items-center justify-center gap-2">
                <Boxes className="w-8 h-8 text-[#00D2FF] opacity-80" />
                <div>
                  <span className="text-xs font-bold text-white block">Install Blueprint Extension</span>
                  <span className="text-[11px] text-slate-400">Drag and drop or select a <code className="text-[#00D2FF]">.blueprint</code> or <code className="text-[#00D2FF]">.zip</code> package archive</span>
                </div>
                <label className="mt-1 px-3 py-1.5 rounded-lg bg-[#00D2FF] hover:bg-[#26dcff] text-[#090D16] text-xs font-bold cursor-pointer transition-colors">
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
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-slate-300">
                  Installed Extensions ({blueprintExtensions.length})
                </span>

                {blueprintExtensions.map(ext => (
                  <div
                    key={ext.id}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#00D2FF]" />
                        <span className="text-xs font-bold text-white">{ext.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.2 rounded">
                          v{ext.version}
                        </span>
                      </div>
                      <GlassBadge status={ext.enabled ? 'running' : 'default'}>
                        {ext.enabled ? 'ENABLED' : 'DISABLED'}
                      </GlassBadge>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {ext.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] text-slate-400">
                      <span>Author: {ext.author}</span>
                      <button
                        onClick={() => toggleBlueprintExtension(ext.id, ext.enabled)}
                        className={`font-semibold cursor-pointer transition-colors ${
                          ext.enabled ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                      >
                        {ext.enabled ? 'Disable Extension' : 'Enable Extension'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Section 6: Built-in Addon Toggles & API Keys */}
          {activeSection === 'addons' && (
            <GlassCard className="p-5 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" /> Built-In Addon Modules & API Keys
              </h3>

              <div className="flex flex-col gap-3">
                <GlassToggle
                  label="1. Plugin & Modpack Installer"
                  description="Modrinth, CurseForge, Hangar, SpigotMC"
                  checked={previewTheme.addon_mod_installer_enabled}
                  onChange={v => updatePreview({ addon_mod_installer_enabled: v })}
                />

                <GlassToggle
                  label="2. Player Manager"
                  description="Live online players, avatars, kick/ban, OP, gamemode"
                  checked={previewTheme.addon_player_manager_enabled}
                  onChange={v => updatePreview({ addon_player_manager_enabled: v })}
                />

                <GlassToggle
                  label="3. 1-Click Server Software Changer"
                  description="Purpur, Paper, Folia, Fabric, Forge, Velocity"
                  checked={previewTheme.addon_software_changer_enabled}
                  onChange={v => updatePreview({ addon_software_changer_enabled: v })}
                />

                <GlassToggle
                  label="4. Visual Config & server.properties Editor"
                  description="GUI sliders, toggles, and live MOTD preview"
                  checked={previewTheme.addon_config_editor_enabled}
                  onChange={v => updatePreview({ addon_config_editor_enabled: v })}
                />

                <GlassToggle
                  label="5. Server Resource Splitter"
                  description="Sub-container resource partitioning sliders"
                  checked={previewTheme.addon_server_splitter_enabled}
                  onChange={v => updatePreview({ addon_server_splitter_enabled: v })}
                />

                <GlassToggle
                  label="6. Cloudflare Subdomain Manager"
                  description="Automated 1-click custom A and SRV DNS records"
                  checked={previewTheme.addon_subdomain_manager_enabled}
                  onChange={v => updatePreview({ addon_subdomain_manager_enabled: v })}
                />

                <GlassToggle
                  label="7. Smart Crash & Log Stack-Trace Analyzer"
                  description="Heuristic crash detection & 1-click automated fix"
                  checked={previewTheme.addon_crash_analyzer_enabled}
                  onChange={v => updatePreview({ addon_crash_analyzer_enabled: v })}
                />

                <div className="pt-3 border-t border-white/10 flex flex-col gap-3">
                  <GlassInput
                    label="Cloudflare API Token"
                    type="password"
                    placeholder="cf_api_..."
                    value={previewTheme.cloudflare_api_token || ''}
                    onChange={e => updatePreview({ cloudflare_api_token: e.target.value })}
                  />

                  <GlassInput
                    label="CurseForge Core API Key"
                    type="password"
                    placeholder="$2a$10$..."
                    value={previewTheme.curseforge_api_key || ''}
                    onChange={e => updatePreview({ curseforge_api_key: e.target.value })}
                  />
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right Column: Live Interactive Split-Screen Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3 sticky top-4">
          {/* Preview Controls Bar */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-900/80 border border-white/10 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-300 ml-2">Preview Mode:</span>
              <button
                onClick={() => setPreviewMode('dashboard')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  previewMode === 'dashboard' ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setPreviewMode('console')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  previewMode === 'console' ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Console
              </button>
              <button
                onClick={() => setPreviewMode('login')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  previewMode === 'login' ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30' : 'text-slate-400 hover:text-white'
                }`}
              >
                Login View
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setDevicePreview('desktop')}
                className={`p-1.5 rounded-lg transition-colors ${
                  devicePreview === 'desktop' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Desktop View"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDevicePreview('mobile')}
                className={`p-1.5 rounded-lg transition-colors ${
                  devicePreview === 'mobile' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Mobile View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Screen Sandbox */}
          <div
            className={`transition-all duration-300 mx-auto w-full rounded-2xl overflow-hidden border border-white/20 shadow-2xl relative bg-slate-950 min-h-[640px] max-h-[820px] overflow-y-auto ${
              devicePreview === 'mobile' ? 'max-w-sm' : 'max-w-full'
            }`}
          >
            {/* Live Interactive Component */}
            <div className="p-4">
              {previewMode === 'dashboard' && (
                <ServerDashboard onSelectServerDetail={() => setPreviewMode('console')} />
              )}
              {previewMode === 'console' && (
                <ConsoleTerminal />
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
            className="w-full p-4 rounded-xl bg-slate-950 font-mono text-xs text-sky-200 border border-white/10 resize-none selection:bg-sky-500/30"
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
