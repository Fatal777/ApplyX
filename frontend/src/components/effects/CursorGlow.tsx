/**
 * Cursor Glow Effect
 * ==================
 * 
 * Creates a subtle glow that follows the cursor.
 * Adds depth and interactivity to dark sections.
 * Performance optimized with RAF.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface CursorGlowProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  glowSize?: number;
  glowOpacity?: number;
  glowBlur?: number;
}

export const CursorGlow: React.FC<CursorGlowProps> = ({
  children,
  className = '',
  glowColor = 'rgba(91, 104, 245, 0.3)',
  glowSize = 400,
  glowOpacity = 0.5,
  glowBlur = 80,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { stiffness: 150, damping: 20 };
  const glowX = useSpring(mouseX, springConfig);
  const glowY = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect */}
      <motion.div
        className="pointer-events-none absolute"
        style={{
          width: glowSize,
          height: glowSize,
          x: glowX,
          y: glowY,
          translateX: '-50%',
          translateY: '-50%',
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          filter: `blur(${glowBlur}px)`,
          opacity: isHovered ? glowOpacity : 0,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? glowOpacity : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

/**
 * Gradient Border
 * ---------------
 * Animated gradient border that rotates on hover.
 */
interface GradientBorderProps {
  children: React.ReactNode;
  className?: string;
  borderWidth?: number;
  gradientColors?: string[];
  borderRadius?: string;
  animationDuration?: number;
}

export const GradientBorder: React.FC<GradientBorderProps> = ({
  children,
  className = '',
  borderWidth = 2,
  gradientColors = ['#5B68F5', '#c7ff6b', '#5B68F5'],
  borderRadius = '1rem',
  animationDuration = 3,
}) => {
  const gradient = `linear-gradient(90deg, ${gradientColors.join(', ')})`;

  return (
    <div
      className={`relative p-[${borderWidth}px] ${className}`}
      style={{
        borderRadius,
        background: gradient,
        backgroundSize: '200% 200%',
        animation: `gradient-rotate ${animationDuration}s linear infinite`,
      }}
    >
      <div
        className="relative bg-background w-full h-full"
        style={{ borderRadius: `calc(${borderRadius} - ${borderWidth}px)` }}
      >
        {children}
      </div>

      <style>{`
        @keyframes gradient-rotate {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

/**
 * Spotlight Effect
 * ----------------
 * Creates a spotlight that follows cursor over cards/sections.
 */
interface SpotlightProps {
  children: React.ReactNode;
  className?: string;
  spotlightSize?: number;
}

export const Spotlight: React.FC<SpotlightProps> = ({
  children,
  className = '',
  spotlightSize = 300,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Spotlight */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(${spotlightSize}px circle at ${position.x}px ${position.y}px, 
            rgba(255,255,255,0.06), 
            transparent 40%)`,
        }}
        animate={{
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
      />

      {children}
    </div>
  );
};

export default CursorGlow;
