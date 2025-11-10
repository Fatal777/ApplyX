import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere } from '@react-three/drei';
import * as THREE from 'three';

function FloatingOrb({ position, color, size = 1 }: { position: [number, number, number]; color: string; size?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
    meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={meshRef} args={[size, 32, 32]} position={position}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.6}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
}

export default function ThreeBackground() {
  const [webGLAvailable, setWebGLAvailable] = useState(true);

  useEffect(() => {
    // Check if WebGL is available
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLAvailable(false);
      }
    } catch (e) {
      setWebGLAvailable(false);
    }
  }, []);

  // If WebGL is not available, return a gradient background instead
  if (!webGLAvailable) {
    return (
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 -z-10 opacity-40">
      <Canvas 
        camera={{ position: [0, 0, 10], fov: 50 }}
        onCreated={({ gl }) => {
          // Additional WebGL context check
          if (!gl) {
            setWebGLAvailable(false);
          }
        }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <FloatingOrb position={[-4, 2, -5]} color="#5b68f5" size={1.5} />
        <FloatingOrb position={[4, -2, -5]} color="#c7ff6b" size={1.2} />
        <FloatingOrb position={[0, 0, -8]} color="#ffffff" size={0.8} />
        <FloatingOrb position={[-2, -3, -6]} color="#5b68f5" size={1} />
        <FloatingOrb position={[3, 3, -7]} color="#c7ff6b" size={0.9} />
      </Canvas>
    </div>
  );
}
