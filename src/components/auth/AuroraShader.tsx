import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const AuroraShader: React.FC = () => {
  const { previewTheme } = useTheme();

  const wallpaperUrl = previewTheme.custom_wallpaper_url || previewTheme.auth_bg_url || '/wallpapers/slayernode-liquid-mesh.png';
  const overlayDarkness = (previewTheme.auth_overlay_darkness ?? 45) / 100;
  const overlayBlur = previewTheme.auth_overlay_blur ?? 0;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* High-res Wallpaper Background Visible Through Glass */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: `url(${wallpaperUrl})`,
          filter: `blur(${overlayBlur}px)`,
          transform: 'scale(1.02)',
        }}
      />
      {/* Subtle overlay so text remains readable while keeping wallpaper prominent */}
      <div
        className="absolute inset-0 bg-[#090D16]"
        style={{ opacity: overlayDarkness }}
      />
    </div>
  );
};
