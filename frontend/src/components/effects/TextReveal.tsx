/**
 * Text Reveal Animation
 * =====================
 * 
 * Reveals text word-by-word or character-by-character on scroll.
 * Uses GSAP ScrollTrigger for precise scroll-based animation.
 * Perfect for hero headlines and section titles.
 */

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface TextRevealProps {
  children: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  type?: 'words' | 'chars' | 'lines';
  stagger?: number;
  duration?: number;
  delay?: number;
  scrub?: boolean | number;
  start?: string;
  end?: string;
  once?: boolean;
}

export const TextReveal: React.FC<TextRevealProps> = ({
  children,
  className = '',
  as: Tag = 'div',
  type = 'words',
  stagger = 0.03,
  duration = 0.8,
  delay = 0,
  scrub = false,
  start = 'top 85%',
  end = 'top 20%',
  once = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<HTMLSpanElement[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements = elementsRef.current;
    
    // Set initial state
    gsap.set(elements, {
      opacity: 0,
      y: type === 'chars' ? 20 : 40,
      rotateX: type === 'chars' ? -90 : 0,
    });

    // Create animation
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start,
        end: scrub ? end : undefined,
        scrub: scrub,
        once,
        toggleActions: once ? 'play none none none' : 'play reverse play reverse',
      },
    });

    tl.to(elements, {
      opacity: 1,
      y: 0,
      rotateX: 0,
      duration,
      stagger,
      delay,
      ease: 'power3.out',
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, [children, type, stagger, duration, delay, scrub, start, end, once]);

  // Split text based on type
  const splitText = () => {
    if (type === 'chars') {
      return children.split('').map((char, i) => (
        <span
          key={i}
          ref={(el) => { if (el) elementsRef.current[i] = el; }}
          className="inline-block origin-bottom"
          style={{ 
            display: char === ' ' ? 'inline' : 'inline-block',
            whiteSpace: char === ' ' ? 'pre' : 'normal',
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ));
    }

    if (type === 'lines') {
      return children.split('\n').map((line, i) => (
        <span
          key={i}
          ref={(el) => { if (el) elementsRef.current[i] = el; }}
          className="block overflow-hidden"
        >
          <span className="inline-block">{line}</span>
        </span>
      ));
    }

    // Default: words
    return children.split(' ').map((word, i) => (
      <span
        key={i}
        ref={(el) => { if (el) elementsRef.current[i] = el; }}
        className="inline-block mr-[0.25em]"
      >
        {word}
      </span>
    ));
  };

  return (
    <Tag ref={containerRef as any} className={`overflow-hidden ${className}`}>
      {splitText()}
    </Tag>
  );
};

export default TextReveal;
