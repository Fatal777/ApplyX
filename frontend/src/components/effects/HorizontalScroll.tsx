/**
 * Horizontal Scroll Section
 * =========================
 * 
 * Creates a horizontal scrolling gallery that pins while scrolling.
 * Uses GSAP ScrollTrigger for smooth, performant animation.
 * Perfect for features showcase or portfolio galleries.
 */

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  speed?: number;
  snap?: boolean | number;
  direction?: 'left' | 'right';
  start?: string;
  end?: string;
}

export const HorizontalScroll: React.FC<HorizontalScrollProps> = ({
  children,
  className = '',
  containerClassName = '',
  speed = 1,
  snap = false,
  direction = 'left',
  start = 'top top',
  end = () => `+=${window.innerWidth * 2}`,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !scrollerRef.current) return;

    const container = containerRef.current;
    const scroller = scrollerRef.current;

    // Calculate the total scroll width
    const scrollWidth = scroller.scrollWidth - window.innerWidth;
    const directionMultiplier = direction === 'left' ? -1 : 1;

    // Build ScrollTrigger config
    const scrollTriggerConfig: ScrollTrigger.Vars = {
      trigger: container,
      start,
      end: typeof end === 'function' ? end() : end,
      scrub: 1 / speed,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    };

    // Only add snap if enabled
    if (snap) {
      scrollTriggerConfig.snap = typeof snap === 'number' ? 1 / snap : 'labels';
    }

    // Create horizontal scroll animation
    const tl = gsap.timeline({
      scrollTrigger: scrollTriggerConfig,
    });

    tl.to(scroller, {
      x: scrollWidth * directionMultiplier,
      ease: 'none',
    });

    // Handle resize
    const handleResize = () => {
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(st => st.kill());
      window.removeEventListener('resize', handleResize);
    };
  }, [direction, speed, snap, start, end]);

  return (
    <section ref={containerRef} className={`relative overflow-hidden ${containerClassName}`}>
      <div 
        ref={scrollerRef} 
        className={`flex will-change-transform ${className}`}
      >
        {children}
      </div>
    </section>
  );
};

/**
 * Horizontal Scroll Item
 * ----------------------
 * Use this wrapper for each item in the horizontal scroll.
 */
interface HorizontalScrollItemProps {
  children: React.ReactNode;
  className?: string;
  width?: string;
}

export const HorizontalScrollItem: React.FC<HorizontalScrollItemProps> = ({
  children,
  className = '',
  width = '80vw',
}) => {
  return (
    <div 
      className={`flex-shrink-0 ${className}`}
      style={{ width }}
    >
      {children}
    </div>
  );
};

export default HorizontalScroll;
