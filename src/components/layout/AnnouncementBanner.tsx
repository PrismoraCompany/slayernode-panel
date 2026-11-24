import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, AlertTriangle, AlertCircle, CheckCircle, X, ExternalLink } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const AnnouncementBanner: React.FC = () => {
  const { previewTheme } = useTheme();
  const banner = previewTheme.announcement_banner;
  const [dismissed, setDismissed] = useState(false);

  if (!banner || !banner.enabled || !banner.text || dismissed) return null;

  const typeConfig = {
    info: {
      bg: 'bg-sky-500/15 border-sky-400/30 text-sky-200',
      icon: <Info className="w-4 h-4 text-sky-400 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-500/15 border-amber-400/30 text-amber-200',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    },
    danger: {
      bg: 'bg-rose-500/15 border-rose-400/30 text-rose-200',
      icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200',
      icon: <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />,
    },
  };

  const current = typeConfig[banner.type] || typeConfig.info;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`w-full max-w-7xl mx-auto px-4 py-2.5 rounded-2xl border backdrop-blur-xl mb-4 flex items-center justify-between gap-3 text-xs shadow-lg ${current.bg}`}
      >
        <div className="flex items-center gap-2.5 font-medium">
          {current.icon}
          <span>{banner.text}</span>
          {banner.action_url && (
            <a
              href={banner.action_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold underline hover:text-white ml-2"
            >
              {banner.action_label || 'Learn more'} <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        {banner.dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
