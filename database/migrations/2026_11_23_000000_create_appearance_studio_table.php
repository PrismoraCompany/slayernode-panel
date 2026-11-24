<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('theme_settings', function (Blueprint $table) {
            $table->string('id', 64)->primary()->default('default');
            $table->string('preset_name', 64)->default('Apple Liquid Glass Pro');

            // Colors & Glass Physics
            $table->string('accent_primary', 32)->default('#38bdf8');
            $table->string('accent_secondary', 32)->default('#818cf8');
            $table->string('status_online', 32)->default('#10b981');
            $table->string('status_starting', 32)->default('#f59e0b');
            $table->string('status_offline', 32)->default('#ef4444');
            $table->string('bg_canvas', 32)->default('#070a13');
            $table->string('color_mode', 16)->default('dark');
            $table->unsignedInteger('glass_blur_px')->default(24);
            $table->unsignedInteger('card_opacity_pct')->default(45);
            $table->unsignedInteger('specular_border_opacity_pct')->default(16);
            $table->unsignedInteger('corner_roundness_px')->default(20);
            $table->string('shadow_depth', 16)->default('deep');

            // Layout & Navigation
            $table->string('navigation_layout', 24)->default('floating_top');
            $table->boolean('sidebar_collapsed_default')->default(false);
            $table->string('server_card_layout', 16)->default('grid');
            $table->string('telemetry_detail_level', 16)->default('detailed');
            $table->json('custom_nav_links')->nullable();

            // Button & UI Styling
            $table->string('button_shape', 16)->default('pill');
            $table->string('button_style', 16)->default('liquid_glass');
            $table->string('hover_motion_intensity', 16)->default('normal');

            // Login & Auth Page
            $table->string('auth_background_type', 24)->default('aurora_mesh');
            $table->text('auth_bg_url')->nullable();
            $table->unsignedInteger('auth_overlay_darkness')->default(60);
            $table->unsignedInteger('auth_overlay_blur')->default(16);
            $table->string('auth_card_position', 16)->default('center');
            $table->string('auth_heading', 128)->default('Welcome to SlayerNode');
            $table->string('auth_subtitle', 255)->default('Next-generation liquid cloud game server orchestrator');
            $table->boolean('auth_allow_registration')->default(true);
            $table->json('auth_footer_links')->nullable();

            // Branding & Custom Injections
            $table->string('panel_name', 128)->default('SlayerNode Panel');
            $table->text('logo_url')->nullable();
            $table->text('favicon_url')->nullable();
            $table->string('font_family', 32)->default('Inter');
            $table->json('announcement_banner')->nullable();
            $table->mediumText('custom_css')->nullable();
            $table->mediumText('custom_head_scripts')->nullable();

            // Built-In Addons Toggles & API Keys
            $table->boolean('addon_mod_installer_enabled')->default(true);
            $table->boolean('addon_player_manager_enabled')->default(true);
            $table->boolean('addon_software_changer_enabled')->default(true);
            $table->boolean('addon_config_editor_enabled')->default(true);
            $table->boolean('addon_server_splitter_enabled')->default(true);
            $table->boolean('addon_subdomain_manager_enabled')->default(true);
            $table->boolean('addon_crash_analyzer_enabled')->default(true);

            $table->text('cloudflare_api_token')->nullable();
            $table->string('cloudflare_zone_id', 64)->nullable();
            $table->text('curseforge_api_key')->nullable();
            $table->text('modrinth_token')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('theme_settings');
    }
};
