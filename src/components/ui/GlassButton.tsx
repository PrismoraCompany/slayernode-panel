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

  // Button shape: Square (subtle rounded corners, no pills)
  const shapeClass =
    previewTheme.button_shape === 'squircle'
      ? 'rounded-xl'
      : 'rounded-lg';

  // Size variations
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-semibold gap-1.5',
    md: 'px-4 py-2 text-sm font-semibold gap-2',
    lg: 'px-6 py-2.5 text-base font-bold gap-2.5',
    icon: 'p-2 text-sm aspect-square flex items-center justify-center',
  };

  // Color & Variant styles (Strict Blackish-Gray & Red)
  const variantStyles = {
    glass: 'bg-[#21242C] hover:bg-[#2A2E38] text-slate-100 border border-white/10 shadow-sm',
    accent: 'bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold border border-red-500/30 shadow-md shadow-red-950/30',
    danger: 'bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-bold border border-red-400/20 shadow-md',
    success: 'bg-[#059669] hover:bg-[#047857] text-white font-bold border border-emerald-400/20 shadow-md',
    ghost: 'bg-transparent hover:bg-white/5 text-slate-300 hover:text-white border border-transparent',
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
