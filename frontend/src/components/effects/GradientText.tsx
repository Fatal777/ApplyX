/**
 * Animated Gradient Text
 * ======================
 * 
 * Text with animated gradient background.
 * Uses CSS for performance, no JS animations.
 * Brand colors: #5B68F5 (blue), #c7ff6b (neon green)
 */

import React from 'react';
import { motion } from 'framer-motion';

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  animationDuration?: number;
  animate?: boolean;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'p';
}

export const GradientText: React.FC<GradientTextProps> = ({
  children,
  className = '',
  colors = ['#5B68F5', '#c7ff6b', '#5B68F5'],
  animationDuration = 3,
  animate = true,
  as: Tag = 'span',
}) => {
  const gradient = `linear-gradient(90deg, ${colors.join(', ')})`;

  return (
    <Tag
      className={`bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: gradient,
        backgroundSize: animate ? '200% auto' : '100% auto',
        animation: animate ? `gradient-flow ${animationDuration}s linear infinite` : 'none',
      }}
    >
      {children}
      
      <style>{`
        @keyframes gradient-flow {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </Tag>
  );
};

/**
 * Shimmer Text
 * ------------
 * Text with a shimmer/shine effect that sweeps across.
 */
interface ShimmerTextProps {
  children: React.ReactNode;
  className?: string;
  shimmerColor?: string;
  duration?: number;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'p';
}

export const ShimmerText: React.FC<ShimmerTextProps> = ({
  children,
  className = '',
  shimmerColor = 'rgba(255, 255, 255, 0.3)',
  duration = 2,
  as: Tag = 'span',
}) => {
  return (
    <Tag className={`relative inline-block ${className}`}>
      <span className="relative z-10">{children}</span>
      
      <span
        className="absolute inset-0 z-20 overflow-hidden"
        style={{
          WebkitMaskImage: 'linear-gradient(transparent, transparent)',
          maskImage: 'linear-gradient(transparent, transparent)',
        }}
      >
        <span
          className="absolute inset-0"
          style={{
            background: `linear-gradient(
              90deg,
              transparent 0%,
              ${shimmerColor} 50%,
              transparent 100%
            )`,
            animation: `shimmer ${duration}s infinite`,
          }}
        />
      </span>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </Tag>
  );
};

/**
 * Typewriter Text
 * ---------------
 * Text that types out character by character.
 */
interface TypewriterTextProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  cursor?: boolean;
  cursorChar?: string;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  className = '',
  speed = 0.05,
  delay = 0,
  cursor = true,
  cursorChar = '|',
}) => {
  const characters = text.split('');

  return (
    <span className={className}>
      {characters.map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.01,
            delay: delay + index * speed,
          }}
        >
          {char}
        </motion.span>
      ))}
      
      {cursor && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        >
          {cursorChar}
        </motion.span>
      )}
    </span>
  );
};

/**
 * Highlight Text
 * --------------
 * Text with an animated highlight/underline effect.
 */
interface HighlightTextProps {
  children: React.ReactNode;
  className?: string;
  highlightColor?: string;
  delay?: number;
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  children,
  className = '',
  highlightColor = 'rgba(199, 255, 107, 0.3)',
  delay = 0.5,
}) => {
  return (
    <motion.span
      className={`relative inline-block ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <span className="relative z-10">{children}</span>
      
      <motion.span
        className="absolute bottom-0 left-0 h-[30%] w-full -z-10"
        style={{ backgroundColor: highlightColor }}
        variants={{
          hidden: { scaleX: 0, originX: 0 },
          visible: {
            scaleX: 1,
            transition: { duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] },
          },
        }}
      />
    </motion.span>
  );
};

export default GradientText;
