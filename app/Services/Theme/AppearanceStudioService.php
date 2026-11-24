<?php

namespace SlayerNode\Services\Theme;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use SlayerNode\Exceptions\DisplayException;

class AppearanceStudioService
{
    const CACHE_KEY = 'slayernode:theme_studio_settings';
    const CACHE_TTL = 86400; // 24 hours in Redis

    /**
     * Retrieve the active Theme Studio settings from Redis cache or database.
     */
    public function getActiveTheme(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            $setting = DB::table('theme_settings')->where('id', 'default')->first();
            if (!$setting) {
                return $this->getDefaultSettings();
            }

            $data = (array) $setting;
            $data['custom_nav_links'] = json_decode($data['custom_nav_links'] ?? '[]', true);
            $data['announcement_banner'] = json_decode($data['announcement_banner'] ?? '{}', true);
            $data['auth_footer_links'] = json_decode($data['auth_footer_links'] ?? '[]', true);

            // Decrypt API keys if present
            if (!empty($data['cloudflare_api_token'])) {
                try {
                    $data['cloudflare_api_token'] = Crypt::decryptString($data['cloudflare_api_token']);
                } catch (\Exception $e) {}
            }

            return $data;
        });
    }

    /**
     * Update and publish new theme settings, invalidating Redis cache.
     */
    public function updateTheme(array $settings): void
    {
        // Encrypt sensitive external API keys
        if (!empty($settings['cloudflare_api_token'])) {
            $settings['cloudflare_api_token'] = Crypt::encryptString($settings['cloudflare_api_token']);
        }
        if (!empty($settings['curseforge_api_key'])) {
            $settings['curseforge_api_key'] = Crypt::encryptString($settings['curseforge_api_key']);
        }

        $formatted = [
            'id' => 'default',
            'preset_name' => $settings['preset_name'] ?? 'Liquid Glass Pro',
            'accent_primary' => $settings['accent_primary'] ?? '#38bdf8',
            'accent_secondary' => $settings['accent_secondary'] ?? '#818cf8',
            'status_online' => $settings['status_online'] ?? '#10b981',
            'status_starting' => $settings['status_starting'] ?? '#f59e0b',
            'status_offline' => $settings['status_offline'] ?? '#ef4444',
            'bg_canvas' => $settings['bg_canvas'] ?? '#070a13',
            'glass_blur_px' => (int) ($settings['glass_blur_px'] ?? 24),
            'card_opacity_pct' => (int) ($settings['card_opacity_pct'] ?? 45),
            'specular_border_opacity_pct' => (int) ($settings['specular_border_opacity_pct'] ?? 16),
            'corner_roundness_px' => (int) ($settings['corner_roundness_px'] ?? 20),
            'shadow_depth' => $settings['shadow_depth'] ?? 'deep',
            'navigation_layout' => $settings['navigation_layout'] ?? 'floating_top',
            'button_shape' => $settings['button_shape'] ?? 'pill',
            'button_style' => $settings['button_style'] ?? 'liquid_glass',
            'hover_motion_intensity' => $settings['hover_motion_intensity'] ?? 'normal',
            'auth_background_type' => $settings['auth_background_type'] ?? 'aurora_mesh',
            'auth_bg_url' => $settings['auth_bg_url'] ?? null,
            'auth_overlay_darkness' => (int) ($settings['auth_overlay_darkness'] ?? 60),
            'auth_overlay_blur' => (int) ($settings['auth_overlay_blur'] ?? 16),
            'auth_card_position' => $settings['auth_card_position'] ?? 'center',
            'auth_heading' => $settings['auth_heading'] ?? 'Welcome to SlayerNode',
            'auth_subtitle' => $settings['auth_subtitle'] ?? 'Next-generation liquid cloud game server orchestrator',
            'auth_allow_registration' => (bool) ($settings['auth_allow_registration'] ?? true),
            'panel_name' => $settings['panel_name'] ?? 'SlayerNode Panel',
            'font_family' => $settings['font_family'] ?? 'Inter',
            'custom_nav_links' => json_encode($settings['custom_nav_links'] ?? []),
            'announcement_banner' => json_encode($settings['announcement_banner'] ?? []),
            'auth_footer_links' => json_encode($settings['auth_footer_links'] ?? []),
            'custom_css' => $settings['custom_css'] ?? null,
            'addon_mod_installer_enabled' => (bool) ($settings['addon_mod_installer_enabled'] ?? true),
            'addon_player_manager_enabled' => (bool) ($settings['addon_player_manager_enabled'] ?? true),
            'addon_software_changer_enabled' => (bool) ($settings['addon_software_changer_enabled'] ?? true),
            'addon_config_editor_enabled' => (bool) ($settings['addon_config_editor_enabled'] ?? true),
            'addon_server_splitter_enabled' => (bool) ($settings['addon_server_splitter_enabled'] ?? true),
            'addon_subdomain_manager_enabled' => (bool) ($settings['addon_subdomain_manager_enabled'] ?? true),
            'addon_crash_analyzer_enabled' => (bool) ($settings['addon_crash_analyzer_enabled'] ?? true),
            'updated_at' => now(),
        ];

        DB::table('theme_settings')->updateOrInsert(['id' => 'default'], $formatted);

        // Invalidate Redis cache immediately
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Reset to default Apple Liquid Glass settings.
     */
    public function resetToDefault(): void
    {
        DB::table('theme_settings')->where('id', 'default')->delete();
        Cache::forget(self::CACHE_KEY);
    }

    public function getDefaultSettings(): array
    {
        return [
            'id' => 'default',
            'preset_name' => 'Apple Liquid Glass Pro',
            'accent_primary' => '#38bdf8',
            'accent_secondary' => '#818cf8',
            'status_online' => '#10b981',
            'status_starting' => '#f59e0b',
            'status_offline' => '#ef4444',
            'bg_canvas' => '#070a13',
            'glass_blur_px' => 24,
            'card_opacity_pct' => 45,
            'specular_border_opacity_pct' => 16,
            'corner_roundness_px' => 20,
            'shadow_depth' => 'deep',
            'navigation_layout' => 'floating_top',
            'button_shape' => 'pill',
            'button_style' => 'liquid_glass',
            'hover_motion_intensity' => 'normal',
            'auth_background_type' => 'aurora_mesh',
            'auth_card_position' => 'center',
            'auth_heading' => 'Welcome to SlayerNode',
            'auth_subtitle' => 'Next-generation liquid cloud game server orchestrator',
            'auth_allow_registration' => true,
            'panel_name' => 'SlayerNode Panel',
            'font_family' => 'Inter',
            'custom_nav_links' => [],
            'announcement_banner' => ['enabled' => true, 'text' => 'Liquid Engine Active with SlayerWings 1.0.0.'],
            'auth_footer_links' => [],
            'addon_mod_installer_enabled' => true,
            'addon_player_manager_enabled' => true,
            'addon_software_changer_enabled' => true,
            'addon_config_editor_enabled' => true,
            'addon_server_splitter_enabled' => true,
            'addon_subdomain_manager_enabled' => true,
            'addon_crash_analyzer_enabled' => true,
        ];
    }
}
