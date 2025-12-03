/**
 * Fade In Animation
 * =================
 * 
 * Simple but elegant fade-in animation on scroll.
 * Configurable direction, delay, and trigger point.
 * Drop-in replacement for static elements.
 */

import React from 'react';
import { motion, Variants } from 'framer-motion';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  direction?: Direction;
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  threshold?: number;
  as?: keyof JSX.IntrinsicElements;
}

const getDirectionOffset = (direction: Direction, distance: number) => {
  switch (direction) {
    case 'up':
      return { y: distance };
    case 'down':
      return { y: -distance };
    case 'left':
      return { x: distance };
    case 'right':
      return { x: -distance };
    default:
      return {};
  }
};

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  className = '',
  direction = 'up',
  delay = 0,
  duration = 0.6,
  distance = 30,
  once = true,
  threshold = 0.1,
  as = 'div',
}) => {
  const variants: Variants = {
    hidden: {
      opacity: 0,
      ...getDirectionOffset(direction, distance),
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  const MotionComponent = motion[as as keyof typeof motion] as typeof motion.div;

  return (
    <MotionComponent
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: threshold }}
      variants={variants}
      className={className}
    >
      {children}
    </MotionComponent>
  );
};

/**
 * Stagger Container
 * -----------------
 * Wraps children and staggers their appearance.
 */
interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  once?: boolean;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  className = '',
  staggerDelay = 0.1,
  once = true,
}) => {
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once }}
      variants={containerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Stagger Item
 * ------------
 * Child of StaggerContainer, inherits stagger timing.
 */
interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  direction?: Direction;
  distance?: number;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({
  children,
  className = '',
  direction = 'up',
  distance = 20,
}) => {
  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      ...getDirectionOffset(direction, distance),
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
};

/**
 * Scale In
 * --------
 * Fade in with a subtle scale effect.
 */
interface ScaleInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  scale?: number;
  once?: boolean;
}

export const ScaleIn: React.FC<ScaleInProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 0.6,
  scale = 0.95,
  once = true,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default FadeIn;
