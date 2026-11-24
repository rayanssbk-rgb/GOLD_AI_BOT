import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { CamRig, Mannequin, Glow } from './three/lib';
import { Hall, Ascent, Monolith, Shaft, Particles, lightCol } from './world';
import { hero } from './hero';
import { camera, FLASH_AT } from './shots';
import { FPS, W, H, B, PLAT_Y, lerp, sstep, clamp, warmth } from './timeline.js';

export const Main: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const h = hero(t);
  const c = camera(t);
  const fogCol = new THREE.Color('#0c121b').lerp(new THREE.Color('#140d06'), sstep(t, B.touch, B.touch + 2));
  const fogD = lerp(0.03, 0.016, sstep(t, 6, 14)) * lerp(1, 0.7, sstep(t, 14, 20)) * lerp(1, 0.45, sstep(t, B.touch, B.touch + 3));
  const keyI = 90 * sstep(t, 5.8, 6.5) + lerp(0, 220, sstep(t, 13.5, 16)) + 300 * sstep(t, 20, 24);
  const fl = FLASH_AT.reduce((m, x) => Math.max(m, t >= x ? Math.exp(-(t - x) * 14) : 0), 0) * (t >= B.touch ? 1.6 : 1);
  const col = lightCol(t);
  const heroRef = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    heroRef.current?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  });
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <ThreeCanvas width={W} height={H} shadows gl={{ antialias: false }}>
        <color attach="background" args={[fogCol]} />
        <fogExp2 attach="fog" args={[fogCol, fogD]} />
        <CamRig pos={c.pos} target={c.target} roll={c.roll} fov={c.fov} exposure={lerp(1.55, 1.25, warmth(t)) * lerp(1, 0.85, sstep(t, B.touch, B.touch + 0.6))}>
          {fl > 0.01 ? <Glow position={[0, 0, -1]} size={3.5} color="#fff1d8" opacity={clamp(fl)} /> : null}
        </CamRig>
        <hemisphereLight args={['#233246', '#050607', lerp(0.6, 0.9, sstep(t, 14, 22)) + 1.2 * sstep(t, B.touch, B.touch + 1.5)]} />
        <directionalLight position={[h.pos[0] - 4, h.pos[1] + 9, h.pos[2] + 30]} target-position={h.pos} intensity={lerp(1.4, 2.2, sstep(t, 14, 22))} color="#8fb2ff" />
        <Shaft t={t} />
        <Hall t={t} />
        <Ascent t={t} />
        <Monolith t={t} />
        {keyI > 0 ? (
          <spotLight position={[h.pos[0] + 3, h.pos[1] + 7, h.pos[2] - 2.5]} target-position={h.pos} angle={0.5} penumbra={0.7} intensity={keyI} distance={0} decay={2} color={col} castShadow={t >= 6 && t < B.touch} shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.0003} />
        ) : null}
        <pointLight position={[h.pos[0] - 1.5, h.pos[1] + 2.5, h.pos[2] + 2]} intensity={lerp(0.5, 10, sstep(t, 5.8, 6.5)) + 25 * sstep(t, 8.2, 8.5) * (1 - sstep(t, 9.8, 10.4)) + lerp(0, 14, sstep(t, 13.5, 22))} distance={12} decay={1.6} color={col} />
        <group ref={heroRef} position={h.pos} rotation={[h.pitch, h.rotY, 0]}>
          <Mannequin body={h.body} hood cloth="#24272d" look={{ pants: '#16181c', skin: '#8e929a' }} core={h.core} coreColor={t > 20 ? '#ffb25a' : '#ffc27a'} />
        </group>
        <Particles t={t} center={[h.pos[0], Math.max(0, h.pos[1] - 2), h.pos[2] + 2]} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
