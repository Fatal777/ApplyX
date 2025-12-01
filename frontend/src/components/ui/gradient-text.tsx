/**
 * GradientText Component
 * Premium animated gradient text with multiple presets
 * Inspired by modern SaaS applications like Linear, Vercel, Stripe
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type GradientPreset = 
  | 'primary'      // Blue to purple
  | 'accent'       // Neon green gradient
  | 'sunset'       // Orange to pink
  | 'ocean'        // Cyan to blue
  | 'aurora'       // Green to purple
  | 'fire'         // Red to yellow
  | 'rainbow'      // Full spectrum
  | 'gold'         // Gold shimmer
  | 'hired'        // Special "hired" gradient - green to lime
  | 'premium'      // Premium purple to pink
  | 'custom';      // Custom gradient via props

interface GradientTextProps {
  children: React.ReactNode;
  preset?: GradientPreset;
  className?: string;
  animate?: boolean;
  animationDuration?: number;
  customGradient?: string;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div';
  shimmer?: boolean;
}

const gradientPresets: Record<GradientPreset, string> = {
  primary: 'from-[#6366f1] via-[#8b5cf6] to-[#a855f7]',
  accent: 'from-[#c7ff6b] via-[#a8e063] to-[#7ed321]',
  sunset: 'from-[#f97316] via-[#ec4899] to-[#f43f5e]',
  ocean: 'from-[#06b6d4] via-[#3b82f6] to-[#6366f1]',
  aurora: 'from-[#22c55e] via-[#10b981] to-[#8b5cf6]',
  fire: 'from-[#ef4444] via-[#f97316] to-[#facc15]',
  rainbow: 'from-[#ef4444] via-[#22c55e] to-[#3b82f6]',
  gold: 'from-[#fbbf24] via-[#f59e0b] to-[#d97706]',
  hired: 'from-[#22c55e] via-[#84cc16] to-[#c7ff6b]',
  premium: 'from-[#ec4899] via-[#8b5cf6] to-[#6366f1]',
  custom: '',
};

export function GradientText({
  children,
  preset = 'primary',
  className,
  animate = false,
  animationDuration = 3,
  customGradient,
  as: Component = 'span',
  shimmer = false,
}: GradientTextProps) {
  const gradientClass = preset === 'custom' && customGradient 
    ? customGradient 
    : gradientPresets[preset];

  const baseClasses = cn(
    'bg-gradient-to-r bg-clip-text text-transparent',
    gradientClass,
    animate && 'animate-gradient bg-[length:200%_auto]',
    shimmer && 'relative overflow-hidden',
    className
  );

  if (shimmer) {
    return (
      <Component className={baseClasses}>
        {children}
        <motion.span
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          }}
        />
      </Component>
    );
  }

  return <Component className={baseClasses}>{children}</Component>;
}

/**
 * AnimatedGradientText - Text with animated moving gradient
 */
export function AnimatedGradientText({
  children,
  className,
  colors = ['#c7ff6b', '#22c55e', '#6366f1', '#8b5cf6', '#c7ff6b'],
}: {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
}) {
  return (
    <span
      className={cn(
        'bg-clip-text text-transparent animate-gradient',
        className
      )}
      style={{
        backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
        backgroundSize: '300% 100%',
        animation: 'gradient 4s ease infinite',
      }}
    >
      {children}
    </span>
  );
}

/**
 * ShimmerText - Text with shimmer effect overlay
 */
export function ShimmerText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('relative inline-block overflow-hidden', className)}>
      <span className="relative z-10">{children}</span>
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
        animate={{
          x: ['-200%', '200%'],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          repeatDelay: 2,
          ease: 'easeInOut',
        }}
      />
    </span>
  );
}

/**
 * GlowText - Text with glow effect
 */
export function GlowText({
  children,
  className,
  glowColor = '#c7ff6b',
  intensity = 'medium',
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  intensity?: 'low' | 'medium' | 'high';
}) {
  const glowSizes = {
    low: '10px',
    medium: '20px',
    high: '30px',
  };

  return (
    <span
      className={cn('relative', className)}
      style={{
        textShadow: `0 0 ${glowSizes[intensity]} ${glowColor}40, 0 0 ${parseInt(glowSizes[intensity]) * 2}px ${glowColor}20`,
      }}
    >
      {children}
    </span>
  );
}

export default GradientText;
