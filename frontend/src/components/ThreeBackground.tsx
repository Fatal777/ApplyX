/**
 * Lightweight CSS-based background with GPU-accelerated animations
 * Replaced Three.js for better performance
 */
export default function ThreeBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Static gradient orbs - no animation for performance */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #5b68f5 0%, transparent 70%)',
          top: '10%',
          left: '-10%',
          transform: 'translate3d(0,0,0)', // Force GPU layer
        }}
      />
      <div 
        className="absolute w-[400px] h-[400px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, #c7ff6b 0%, transparent 70%)',
          top: '60%',
          right: '-5%',
          transform: 'translate3d(0,0,0)',
        }}
      />
      <div 
        className="absolute w-[300px] h-[300px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, #5b68f5 0%, transparent 70%)',
          bottom: '20%',
          left: '30%',
          transform: 'translate3d(0,0,0)',
        }}
      />
    </div>
  );
}
