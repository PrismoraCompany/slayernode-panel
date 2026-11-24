import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  interactive?: boolean;
  specularHeader?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  interactive = false,
  specularHeader = true,
  children,
  className = '',
  ...props
}) => {
  return (
    <motion.div
      whileHover={interactive ? { y: -3, scale: 1.008 } : undefined}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className={`glass-card relative overflow-hidden ${interactive ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {/* Specular Inner Edge Light Simulation */}
      {specularHeader && (
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" />
      )}
      {children}
    </motion.div>
  );
};
