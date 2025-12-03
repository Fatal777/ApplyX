/**
 * ApplyX Premium Effects Library
 * ==============================
 * 
 * A collection of premium animation and interaction effects
 * built with Framer Motion, GSAP, and Lenis.
 * 
 * Design System:
 * - Primary: #5B68F5 (ApplyX Blue)
 * - Accent: #c7ff6b (Neon Green)
 * - Smooth, subtle, professional animations
 */

// Smooth Scroll
export { SmoothScrollProvider, useSmoothScroll } from './SmoothScroll';

// Magnetic Button
export { MagneticButton } from './MagneticButton';

// Text Animations
export { TextReveal } from './TextReveal';
export { 
  GradientText, 
  ShimmerText, 
  TypewriterText, 
  HighlightText 
} from './GradientText';

// Cards & Tilt
export { TiltCard } from './TiltCard';

// Scroll Effects
export { HorizontalScroll, HorizontalScrollItem } from './HorizontalScroll';
export { 
  ParallaxSection, 
  ParallaxLayer, 
  ParallaxImage 
} from './ParallaxSection';

// Fade & Reveal
export { 
  FadeIn, 
  StaggerContainer, 
  StaggerItem, 
  ScaleIn 
} from './FadeIn';

// Counter Animation
export { CountUp, StatsGrid } from './CountUp';

// Cursor & Glow Effects
export { 
  CursorGlow, 
  GradientBorder, 
  Spotlight 
} from './CursorGlow';
