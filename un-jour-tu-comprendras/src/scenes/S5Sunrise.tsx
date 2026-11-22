// SCENE 5 — LE RÉSULTAT: rooftop at sunrise, the camera circles behind him and reveals the city.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { CamRig, Mannequin, Buildings, makeBlocks, Glow, LightCone, gradientTexture, mat, V3 } from '../three/lib';
import { SC, prog, ease, easeInOut, lerp, rnd, WIDTH, HEIGHT } from '../timeline.js';

const Bird: React.FC<{ p: V3; f: number; i: number }> = ({ p, f, i }) => {
  const flap = Math.sin(f * 0.5 + i) * 0.6;
  const m = mat('#1a1410', 0.9);
  return (
    <group position={p}>
      <mesh rotation={[0, 0, 0.3 + flap]} position={[-0.35, 0, 0]} material={m}>
        <boxGeometry args={[0.7, 0.04, 0.18]} />
      </mesh>
      <mesh rotation={[0, 0, -0.3 - flap]} position={[0.35, 0, 0]} material={m}>
        <boxGeometry args={[0.7, 0.04, 0.18]} />
      </mesh>
    </group>
  );
};

export const Sunrise: React.FC<{ f: number }> = ({ f }) => {
  const [a, b] = SC.sunrise;
  const k = prog(f, a, b);
  const e = easeInOut(k);
  // orbit from his front-left side to behind him, then crane up and back
  const th = lerp(0.95, Math.PI, ease(prog(f, a, a + 260)));
  const r = lerp(2.4, 7.5, ease(prog(f, a + 90, b)));
  const h = lerp(1.25, 4.2, ease(prog(f, a + 120, b)));
  const pos: V3 = [Math.sin(th) * r, h, -Math.cos(th) * r];
  const look = ease(prog(f, a + 150, b));
  const target: V3 = [0, lerp(1.45, 1.0, look), lerp(-0.55, -60, look)];
  const sunY = lerp(20, 190, ease(k));
  const city = useMemo(
    () => [
      ...makeBlocks(2000, 240, (i) => [(rnd(i) - 0.5) * 1800, -180 - rnd(i + 3) * 1300], [30, 30], [15, 110]),
      ...makeBlocks(2600, 16, (i) => [(rnd(i) - 0.5) * 900, -500 - rnd(i + 3) * 700], [40, 40], [140, 260]),
    ],
    [],
  );
  const sky = gradientTexture(
    [
      [0, '#2c4670'],
      [0.42, '#8a7a8a'],
      [0.5, '#f2a46a'],
      [0.56, '#ffd6a0'],
      [1, '#ffe8c4'],
    ],
    'sunrise',
  );
  const breath = Math.sin(f * 0.08) * 0.01;
  return (
    <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: false }}>
      <fog attach="fog" args={['#f1b685', 120, 1500]} />
      <mesh>
        <sphereGeometry args={[1900, 48, 24]} />
        <meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} toneMapped={false} />
      </mesh>
      <hemisphereLight args={['#ffd8b0', '#2a2430', 1.6]} />
      <directionalLight position={[0, 20 + sunY * 0.3, -60]} intensity={4.5} color="#ffc28a" />
      {/* the sun + volumetric shafts */}
      <Glow position={[60, sunY, -1500]} size={260} color="#fff1cc" opacity={1} />
      <Glow position={[60, sunY, -1500]} size={1300} color="#ffb060" opacity={0.55} />
      {[-0.22, -0.1, 0.04, 0.16, 0.3].map((ang, i) => (
        <LightCone key={i} position={[60, sunY, -1500]} rotation={[-Math.PI / 2 + 0.03 * i, 0, ang]} height={1500} radius={160 + i * 30} color="#ffd8a0" opacity={0.05} />
      ))}
      <CamRig pos={pos} target={target} fov={lerp(38, 62, e)} exposure={1.05} />
      {/* rooftop */}
      <mesh position={[0, -0.1, 4]} material={mat('#3a3330', 0.9)}>
        <boxGeometry args={[16, 0.2, 10]} />
      </mesh>
      <mesh position={[0, 0.25, -1.05]} material={mat('#46403b', 0.85)}>
        <boxGeometry args={[16, 0.5, 0.3]} />
      </mesh>
      {/* rooftop details */}
      <mesh position={[-4, 0.6, 5]} material={mat('#2c2826', 0.8)}>
        <boxGeometry args={[2, 1.2, 1.6]} />
      </mesh>
      <mesh position={[5, 1.4, 6]} material={mat('#2c2826', 0.6, 0.4)}>
        <cylinderGeometry args={[0.9, 0.9, 2.8, 20]} />
      </mesh>
      <Mannequin body={{ head: [-0.08 + breath, 0], spine: -0.02, shL: [0, 0.08], shR: [0, 0.08], elL: 0.12, elR: 0.12 }} position={[0, 0, -0.55]} rotY={Math.PI} hood cloth="#262b34" />
      {/* the city */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -62, -700]} material={mat('#3a3038', 0.95)}>
        <planeGeometry args={[3000, 2000]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[120, -61.5, -700]} material={mat('#e6a476', 0.12, 0.8)}>
        <planeGeometry args={[90, 2000]} />
      </mesh>
      <group position={[0, -62, 0]}>
        <Buildings blocks={city} lit={0.08} warm={0.95} ei={0.5} color="#5a4c50" />
      </group>
      {Array.from({ length: 7 }, (_, i) => (
        <Bird key={i} f={f} i={i} p={[-60 + i * 9 + (f - a) * 0.25, 18 + Math.sin(i * 2) * 4 + Math.sin(f * 0.05 + i) * 0.8, -90 - i * 6]} />
      ))}
    </ThreeCanvas>
  );
};
