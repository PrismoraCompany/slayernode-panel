import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface GlassButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'glass' | 'accent' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'glass',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const { previewTheme } = useTheme();

  // Dynamic button shape classes
  const shapeClass =
    previewTheme.button_shape === 'pill'
      ? 'rounded-full'
      : previewTheme.button_shape === 'squircle'
      ? 'rounded-2xl'
      : 'rounded-lg';

  // Size variations
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-medium gap-1.5',
    md: 'px-4 py-2 text-sm font-medium gap-2',
    lg: 'px-6 py-3 text-base font-semibold gap-2.5',
    icon: 'p-2.5 text-sm aspect-square flex items-center justify-center',
  };

  // Color & Variant styles
  const variantStyles = {
    glass: 'glass-button-pill text-slate-100 text-shadow-sm',
    accent: 'glass-button-accent text-white shadow-lg',
    danger: 'bg-gradient-to-b from-rose-500/80 to-rose-600/90 hover:from-rose-500 hover:to-rose-600 border border-rose-400/30 text-white shadow-lg shadow-rose-950/40',
    success: 'bg-gradient-to-b from-emerald-500/80 to-emerald-600/90 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-400/30 text-white shadow-lg shadow-emerald-950/40',
    ghost: 'bg-transparent hover:bg-white/10 text-slate-300 hover:text-white border border-transparent hover:border-white/10',
  };

  const motionScale =
    previewTheme.hover_motion_intensity === 'energetic'
      ? { hover: 1.04, tap: 0.95 }
      : previewTheme.hover_motion_intensity === 'subtle'
      ? { hover: 1.01, tap: 0.99 }
      : { hover: 1.02, tap: 0.97 };

  return (
    <motion.button
      whileHover={disabled || isLoading ? undefined : { scale: motionScale.hover }}
      whileTap={disabled || isLoading ? undefined : { scale: motionScale.tap }}
      transition={{ type: 'spring', stiffness: 450, damping: 25 }}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${shapeClass} ${sizeClasses[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          {children && <span>{children}</span>}
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </motion.button>
  );
};
