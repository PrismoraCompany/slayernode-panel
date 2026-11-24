import React from 'react';
import { ServerStatus } from '../../types';

interface GlassBadgeProps {
  status?: ServerStatus | 'info' | 'warning' | 'default';
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  status = 'default',
  children,
  dot = true,
  className = '',
}) => {
  const statusStyles: Record<string, { bg: string; border: string; text: string; dotColor: string }> = {
    running: {
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/30',
      text: 'text-emerald-300',
      dotColor: 'bg-emerald-400 animate-pulse',
    },
    starting: {
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/30',
      text: 'text-amber-300',
      dotColor: 'bg-amber-400 animate-ping',
    },
    stopping: {
      bg: 'bg-orange-500/15',
      border: 'border-orange-500/30',
      text: 'text-orange-300',
      dotColor: 'bg-orange-400',
    },
    offline: {
      bg: 'bg-rose-500/15',
      border: 'border-rose-500/30',
      text: 'text-rose-300',
      dotColor: 'bg-rose-400',
    },
    installing: {
      bg: 'bg-sky-500/15',
      border: 'border-sky-500/30',
      text: 'text-sky-300',
      dotColor: 'bg-sky-400 animate-pulse',
    },
    restoring: {
      bg: 'bg-purple-500/15',
      border: 'border-purple-500/30',
      text: 'text-purple-300',
      dotColor: 'bg-purple-400',
    },
    info: {
      bg: 'bg-sky-500/15',
      border: 'border-sky-500/30',
      text: 'text-sky-300',
      dotColor: 'bg-sky-400',
    },
    warning: {
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/30',
      text: 'text-amber-300',
      dotColor: 'bg-amber-400',
    },
    default: {
      bg: 'bg-white/10',
      border: 'border-white/15',
      text: 'text-slate-300',
      dotColor: 'bg-slate-400',
    },
  };

  const style = statusStyles[status] || statusStyles.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium backdrop-blur-md border ${style.bg} ${style.border} ${style.text} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${style.dotColor}`} />}
      {children}
    </span>
  );
};
