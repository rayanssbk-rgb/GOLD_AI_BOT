// Animated profile picture: a glowing white hooded silhouette floating up into a diagonal beam of light.
import React, { useLayoutEffect } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CamRig, Mannequin } from './three/lib';

export const FPS = 30;
export const LOOP = 6; // seconds, seamless
export const SIZE = 1080;
const TAU = Math.PI * 2;
const rnd = (i: number, j = 0) => { const s = Math.sin(i * 12.9898 + j * 78.233 + 0.5) * 43758.5453; return s - Math.floor(s); };

/** render every mesh in flat white: a pure silhouette */
const White: React.FC = () => {
  const { scene } = useThree();
  useLayoutEffect(() => {
    scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    return () => { scene.overrideMaterial = null; };
  }, [scene]);
  return null;
};

export const Pdp: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const ph = (t / LOOP) * TAU; // loop phase
  const bob = Math.sin(ph);
  const sway = Math.sin(ph + 1.1);
  const breathe = Math.sin(ph * 2);
  const body = {
    pelvisY: 0.96,
    spine: -0.3 + 0.03 * breathe,
    head: [0.6 + 0.05 * sway, 0] as [number, number],
    shL: [-0.45 + 0.05 * sway, 0.12] as [number, number],
    shR: [0.35 - 0.04 * sway, 0.1] as [number, number],
    elL: 0.25,
    elR: 0.35,
    hipL: [-0.35 + 0.04 * sway, 0.02] as [number, number],
    hipR: [0.1 - 0.03 * sway, 0.02] as [number, number],
    knL: 0.7 + 0.05 * bob,
    knR: 0.25,
  };
  // beam streaks
  const streaks = Array.from({ length: 9 }, (_, i) => ({
    off: (rnd(i, 1) - 0.5) * 300,
    w: 10 + rnd(i, 2) * 60,
    o: 0.2 + 0.4 * rnd(i, 3) * (0.6 + 0.4 * Math.sin(ph * (1 + (i % 3)) + i)),
  }));
  const dust = Array.from({ length: 70 }, (_, i) => {
    const k = ((rnd(i, 4) + t / LOOP * (1 + (i % 2))) % 1);
    // dust drifts up along the beam (towards top-right)
    const along = -420 + k * 900;
    const across = (rnd(i, 5) - 0.5) * 260;
    return { x: 540 + along * 0.62 + across * 0.78, y: 560 - along * 0.78 + across * 0.62, r: 1 + rnd(i, 6) * 2.6, o: Math.sin(Math.PI * k) * (0.3 + 0.6 * rnd(i, 7)) };
  });
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      {/* the beam: from the top-right corner down through the figure */}
      <div style={{ position: 'absolute', left: 540 - 260, top: -500, width: 520, height: 2100, transformOrigin: '50% 50%', transform: 'translate(120px, -40px) rotate(40deg)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,.16) 22%, rgba(255,255,255,.55) 50%, rgba(255,255,255,.16) 78%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 38%, rgba(0,0,0,.55) 58%, transparent 80%)', filter: 'blur(18px)', opacity: 0.85 + 0.15 * Math.sin(ph * 3) }} />
        {streaks.map((s, i) => (
          <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: 260 + s.off - s.w / 2, width: s.w, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.9), transparent)', opacity: s.o,
            WebkitMaskImage: 'linear-gradient(180deg, #000 0%, rgba(0,0,0,.8) 40%, transparent 72%)', filter: 'blur(6px)' }} />
        ))}
      </div>
      {/* hot source in the corner */}
      <div style={{ position: 'absolute', right: -260, top: -260, width: 620, height: 620, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(255,255,255,.35) 30%, transparent 70%)', filter: 'blur(20px)' }} />
      {/* soft dark haze below the figure */}
      <div style={{ position: 'absolute', left: 300, top: 640, width: 480, height: 260, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,.65) 0%, transparent 70%)', filter: 'blur(20px)' }} />
      {/* figure */}
      <AbsoluteFill style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,.95)) drop-shadow(0 0 30px rgba(255,255,255,.6)) blur(1.1px)' }}>
        <ThreeCanvas width={SIZE} height={SIZE} gl={{ antialias: true, alpha: true }}>
          <White />
          <CamRig pos={[0, 0.95, 6.0]} target={[0, 0.95, 0]} fov={34} />
          <group position={[-0.2, 0.05 + 0.07 * bob, 0]} rotation={[0, 0, -0.38 + 0.03 * sway]}>
            <group rotation={[0, 1.57 + 0.06 * sway, 0]}>
              <Mannequin body={body} hood />
            </group>
          </group>
        </ThreeCanvas>
      </AbsoluteFill>
      {/* dust in the light */}
      <svg width={SIZE} height={SIZE} style={{ position: 'absolute', inset: 0 }}>
        {dust.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#fff" opacity={d.o} />)}
      </svg>
      {/* film grain */}
      <svg width={SIZE} height={SIZE} style={{ position: 'absolute', inset: 0, opacity: 0.22, mixBlendMode: 'screen' }}>
        <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed={f % 30} /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter="url(#g)" />
      </svg>
      {/* circular vignette so it reads well in the round avatar */}
      <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 50%, transparent 52%, rgba(0,0,0,.75) 72%)' }} />
    </AbsoluteFill>
  );
};
