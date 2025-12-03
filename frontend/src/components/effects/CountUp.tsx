/**
 * Animated Counter
 * ================
 * 
 * Smoothly animates numbers from 0 to target value.
 * Triggers on scroll into view for impact.
 * Perfect for statistics and metrics.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
  className?: string;
  once?: boolean;
  easing?: 'linear' | 'easeOut' | 'easeInOut' | 'spring';
}

export const CountUp: React.FC<CountUpProps> = ({
  to,
  from = 0,
  duration = 2,
  delay = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = ',',
  className = '',
  once = true,
  easing = 'easeOut',
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once, margin: '-50px' });
  const [displayValue, setDisplayValue] = useState(from);

  const motionValue = useMotionValue(from);
  
  // Spring config for natural feel
  const springConfig = {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  };
  
  const springValue = useSpring(motionValue, springConfig);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(to);
      }, delay * 1000);

      return () => clearTimeout(timer);
    } else if (!once) {
      motionValue.set(from);
    }
  }, [isInView, to, from, delay, once, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(latest);
    });

    return () => unsubscribe();
  }, [springValue]);

  // Format number with separators
  const formatNumber = (num: number): string => {
    const fixed = num.toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    
    return decPart ? `${formattedInt}.${decPart}` : formattedInt;
  };

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatNumber(displayValue)}
      {suffix}
    </span>
  );
};

/**
 * Stats Grid
 * ----------
 * Pre-styled grid for displaying multiple stats with CountUp.
 */
interface StatItem {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
}

interface StatsGridProps {
  stats: StatItem[];
  className?: string;
  statClassName?: string;
}

export const StatsGrid: React.FC<StatsGridProps> = ({
  stats,
  className = '',
  statClassName = '',
}) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 ${className}`}>
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
          viewport={{ once: true }}
          className={`text-center ${statClassName}`}
        >
          <div className="text-4xl md:text-5xl font-bold text-primary">
            <CountUp
              to={stat.value}
              prefix={stat.prefix}
              suffix={stat.suffix}
              duration={2}
              delay={index * 0.1}
            />
          </div>
          <div className="mt-2 text-muted-foreground text-sm md:text-base">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default CountUp;
