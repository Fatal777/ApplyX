/**
 * Premium Loading Components
 * 3D animated loaders, skeleton states, and page transitions
 * Inspired by Linear, Vercel, and modern SaaS applications
 */

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * 3D Cube Loader - Premium rotating cube
 */
export function CubeLoader({ 
  size = 40, 
  color = '#c7ff6b',
  className 
}: { 
  size?: number; 
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative perspective-[800px]', className)} style={{ width: size, height: size }}>
      <motion.div
        className="w-full h-full relative preserve-3d"
        animate={{
          rotateX: [0, 360],
          rotateY: [0, 360],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: `linear-gradient(135deg, ${color}40, ${color}80)`,
            transform: `translateZ(${size / 2}px)`,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${color}50`,
          }}
        />
        {/* Back */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: `linear-gradient(135deg, ${color}30, ${color}60)`,
            transform: `rotateY(180deg) translateZ(${size / 2}px)`,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${color}40`,
          }}
        />
        {/* Left */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: `linear-gradient(135deg, ${color}20, ${color}50)`,
            transform: `rotateY(-90deg) translateZ(${size / 2}px)`,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${color}30`,
          }}
        />
        {/* Right */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            background: `linear-gradient(135deg, ${color}50, ${color}90)`,
            transform: `rotateY(90deg) translateZ(${size / 2}px)`,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${color}60`,
          }}
        />
      </motion.div>
    </div>
  );
}

/**
 * Pulse Ring Loader - Expanding rings animation
 */
export function PulseRingLoader({
  size = 60,
  color = '#c7ff6b',
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2"
          style={{ borderColor: color }}
          initial={{ scale: 0.5, opacity: 1 }}
          animate={{
            scale: [0.5, 1.5],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeOut',
          }}
        />
      ))}
      <div
        className="absolute inset-[30%] rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

/**
 * Dots Wave Loader - Bouncing dots
 */
export function DotsWaveLoader({
  color = '#c7ff6b',
  className,
}: {
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: color }}
          animate={{
            y: [0, -12, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Orbital Loader - Orbiting particles
 */
export function OrbitalLoader({
  size = 50,
  color = '#c7ff6b',
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      {/* Center dot */}
      <div
        className="absolute inset-[40%] rounded-full"
        style={{ 
          background: color,
          boxShadow: `0 0 20px ${color}80`,
        }}
      />
      
      {/* Orbiting particles */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{ 
            background: color,
            left: '50%',
            top: '50%',
            marginLeft: -4,
            marginTop: -4,
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 1.5 + i * 0.3,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ 
              background: color,
              transform: `translateX(${(size / 2) - 8 - i * 6}px)`,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Gradient Spinner - Modern gradient spinner
 */
export function GradientSpinner({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={cn('rounded-full', className)}
      style={{
        width: size,
        height: size,
        background: 'conic-gradient(from 0deg, transparent 0%, #c7ff6b 25%, #6366f1 50%, #c7ff6b 75%, transparent 100%)',
        WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${size / 8}px), #000 calc(100% - ${size / 8}px))`,
        mask: `radial-gradient(farthest-side, transparent calc(100% - ${size / 8}px), #000 calc(100% - ${size / 8}px))`,
      }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

/**
 * Premium Skeleton Loader
 */
export function SkeletonPremium({
  className,
  shimmer = true,
}: {
  className?: string;
  shimmer?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800',
        className
      )}
    >
      {shimmer && (
        <motion.div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            translateX: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </div>
  );
}

/**
 * Card Skeleton - Full card loading state
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800', className)}>
      <SkeletonPremium className="h-12 w-12 rounded-xl mb-4" />
      <SkeletonPremium className="h-4 w-24 mb-2" />
      <SkeletonPremium className="h-6 w-3/4 mb-3" />
      <SkeletonPremium className="h-4 w-full mb-2" />
      <SkeletonPremium className="h-4 w-5/6" />
    </div>
  );
}

/**
 * Page Loading Screen
 */
export function PageLoader({
  text = 'Loading...',
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-[#0a0a0f]',
        className
      )}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[100px] animate-pulse" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-[#c7ff6b]/10 blur-[80px] animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      
      <div className="relative z-10 flex flex-col items-center">
        <CubeLoader size={60} />
        <motion.p
          className="mt-6 text-lg font-medium text-gray-600 dark:text-gray-400"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {text}
        </motion.p>
      </div>
    </motion.div>
  );
}

/**
 * Button Loading State
 */
export function ButtonLoader({
  size = 'default',
  color = 'currentColor',
}: {
  size?: 'sm' | 'default' | 'lg';
  color?: string;
}) {
  const sizes = {
    sm: 14,
    default: 18,
    lg: 22,
  };

  return (
    <motion.svg
      width={sizes[size]}
      height={sizes[size]}
      viewBox="0 0 24 24"
      fill="none"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="60"
        strokeDashoffset="20"
        opacity={0.3}
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="60"
        strokeDashoffset="45"
      />
    </motion.svg>
  );
}

/**
 * Page Transition Wrapper
 */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default {
  CubeLoader,
  PulseRingLoader,
  DotsWaveLoader,
  OrbitalLoader,
  GradientSpinner,
  SkeletonPremium,
  CardSkeleton,
  PageLoader,
  ButtonLoader,
  PageTransition,
};
