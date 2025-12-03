/**
 * Parallax Section
 * ================
 * 
 * Creates depth effect with elements moving at different speeds.
 * Adds immersive scrolling experience.
 * Uses Framer Motion for smooth performance.
 */

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

interface ParallaxSectionProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  offset?: [string, string];
}

export const ParallaxSection: React.FC<ParallaxSectionProps> = ({
  children,
  className = '',
  speed = 0.5,
  direction = 'up',
  offset = ['start end', 'end start'],
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: offset as any,
  });

  // Calculate movement based on direction
  const movement = 100 * speed;
  
  const yUp = useTransform(scrollYProgress, [0, 1], [movement, -movement]);
  const yDown = useTransform(scrollYProgress, [0, 1], [-movement, movement]);
  const xLeft = useTransform(scrollYProgress, [0, 1], [movement, -movement]);
  const xRight = useTransform(scrollYProgress, [0, 1], [-movement, movement]);

  // Apply spring for smooth animation
  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
  const smoothY = useSpring(direction === 'up' ? yUp : yDown, springConfig);
  const smoothX = useSpring(direction === 'left' ? xLeft : xRight, springConfig);

  const isHorizontal = direction === 'left' || direction === 'right';

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        style={{
          y: isHorizontal ? 0 : smoothY,
          x: isHorizontal ? smoothX : 0,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

/**
 * Parallax Layer
 * --------------
 * Individual layer within a parallax scene with its own speed.
 */
interface ParallaxLayerProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  zIndex?: number;
}

export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({
  children,
  className = '',
  speed = 0.5,
  zIndex = 0,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [100 * speed, -100 * speed]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30 });

  return (
    <motion.div
      ref={ref}
      className={`${className}`}
      style={{
        y: smoothY,
        zIndex,
        position: 'relative',
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Parallax Image
 * --------------
 * Image with parallax zoom and movement effect.
 */
interface ParallaxImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  speed?: number;
  scale?: [number, number];
}

export const ParallaxImage: React.FC<ParallaxImageProps> = ({
  src,
  alt,
  className = '',
  containerClassName = '',
  speed = 0.3,
  scale = [1.1, 1],
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [50 * speed, -50 * speed]);
  const scaleValue = useTransform(scrollYProgress, [0, 1], scale);

  const smoothY = useSpring(y, { stiffness: 100, damping: 30 });
  const smoothScale = useSpring(scaleValue, { stiffness: 100, damping: 30 });

  return (
    <div ref={ref} className={`overflow-hidden ${containerClassName}`}>
      <motion.img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${className}`}
        style={{
          y: smoothY,
          scale: smoothScale,
        }}
      />
    </div>
  );
};

export default ParallaxSection;
