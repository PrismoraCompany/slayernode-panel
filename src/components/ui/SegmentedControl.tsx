import React from 'react';
import { motion } from 'framer-motion';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId?: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId = 'segmented-indicator',
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex items-center p-1 rounded-full bg-slate-900/60 backdrop-blur-xl border border-white/10 ${className}`}
    >
      {options.map(option => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`relative px-4 py-1.5 rounded-full text-xs font-semibold select-none transition-colors duration-200 z-10 flex items-center gap-2 cursor-pointer ${
              isSelected ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-500/80 to-indigo-500/80 shadow-md shadow-sky-500/20 border border-white/30"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                style={{ zIndex: -1 }}
              />
            )}
            {option.icon && <span className="w-3.5 h-3.5">{option.icon}</span>}
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white">
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
