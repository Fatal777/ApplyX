/**
 * Magnetic Button
 * ===============
 * 
 * Creates a magnetic pull effect on hover.
 * Button subtly follows cursor within its bounds.
 * Uses Framer Motion for smooth animation.
 */

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  radius?: number;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className = '',
  strength = 0.35,
  radius = 150,
  onClick,
  href,
  disabled = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || disabled) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);

    if (distance < radius) {
      const magnetStrength = (1 - distance / radius) * strength;
      setPosition({
        x: distanceX * magnetStrength,
        y: distanceY * magnetStrength,
      });
    }
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const springTransition = {
    type: 'spring' as const,
    stiffness: 350,
    damping: 15,
    mass: 0.5,
  };

  if (href) {
    return (
      <motion.a
        ref={ref as any}
        href={href}
        className={`inline-block ${className}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={position}
        transition={springTransition}
        onClick={onClick}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={position}
      transition={springTransition}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

export default MagneticButton;
