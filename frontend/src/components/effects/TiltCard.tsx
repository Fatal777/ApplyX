/**
 * Tilt Card
 * =========
 * 
 * Creates a 3D perspective tilt effect on hover.
 * Adds depth and premium feel to cards and elements.
 * Uses vanilla JS for performance (no heavy deps).
 */

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  tiltAmount?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
  glare?: boolean;
  glareOpacity?: number;
  reset?: boolean;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  tiltAmount = 15,
  perspective = 1000,
  scale = 1.02,
  speed = 400,
  glare = true,
  glareOpacity = 0.2,
  reset = true,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for smooth animation
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring physics for natural movement
  const springConfig = { stiffness: 300, damping: 30 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [tiltAmount, -tiltAmount]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-tiltAmount, tiltAmount]), springConfig);
  const scaleValue = useSpring(isHovered ? scale : 1, springConfig);

  // Glare position
  const glareX = useTransform(x, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(y, [-0.5, 0.5], ['0%', '100%']);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = (e.clientX - rect.left) / rect.width - 0.5;
    const centerY = (e.clientY - rect.top) / rect.height - 0.5;

    x.set(centerX);
    y.set(centerY);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (reset) {
      x.set(0);
      y.set(0);
    }
  };

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      style={{
        perspective,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          scale: scaleValue,
          transformStyle: 'preserve-3d',
        }}
        transition={{ duration: speed / 1000 }}
        className="relative w-full h-full"
      >
        {children}

        {/* Glare effect */}
        {glare && (
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-inherit"
            style={{
              background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,${glareOpacity}), transparent 50%)`,
              opacity: isHovered ? 1 : 0,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.div>
    </motion.div>
  );
};

export default TiltCard;
