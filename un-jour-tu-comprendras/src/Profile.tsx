// Profile picture (1080x1080): the hooded figure seen from behind on the rooftop, facing the sunrise city.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { CamRig, Mannequin, Buildings, makeBlocks, Glow, LightCone, gradientTexture, mat, V3 } from './three/lib';
import { rnd } from './timeline.js';

export const Profile: React.FC = () => {
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
    'sunriseProfile',
  );
  const SUN: V3 = [-60, 140, -1500];
  const pos: V3 = [0.2, 1.25, 3.6];
  const target: V3 = [0, 1.55, -0.55];
  return (
    <ThreeCanvas width={1080} height={1080} gl={{ antialias: false }}>
      <fog attach="fog" args={['#f1b685', 120, 1500]} />
      <mesh>
        <sphereGeometry args={[1900, 48, 24]} />
        <meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} toneMapped={false} />
      </mesh>
      <hemisphereLight args={['#ffd8b0', '#2a2430', 1.3]} />
      <directionalLight position={[-60, 30, -60]} intensity={4} color="#ffc28a" />
      <Glow position={SUN} size={190} color="#fff6dd" opacity={1} />
      <Glow position={SUN} size={1300} color="#ffb060" opacity={0.6} />
      {[-0.22, -0.1, 0.04, 0.16, 0.3].map((ang, i) => (
        <LightCone key={i} position={SUN} rotation={[-Math.PI / 2 + 0.03 * i, 0, ang]} height={1500} radius={160 + i * 30} color="#ffd8a0" opacity={0.05} />
      ))}
      <CamRig pos={pos} target={target} fov={34} exposure={1.0} />
      <mesh position={[0, -0.1, 4]} material={mat('#3a3330', 0.9)}>
        <boxGeometry args={[16, 0.2, 10]} />
      </mesh>
      <mesh position={[0, 0.25, -1.05]} material={mat('#46403b', 0.85)}>
        <boxGeometry args={[16, 0.5, 0.3]} />
      </mesh>
      <Mannequin body={{ head: [-0.1, 0.12], spine: -0.02, shL: [0, 0.08], shR: [0, 0.08], elL: 0.12, elR: 0.12 }} position={[0, 0, -0.55]} rotY={Math.PI} hood cloth="#262b34" />
      <mesh rotation-x={-Math.PI / 2} position={[0, -62, -700]} material={mat('#3a3038', 0.95)}>
        <planeGeometry args={[3000, 2000]} />
      </mesh>
      <group position={[0, -62, 0]}>
        <Buildings blocks={city} lit={0.08} warm={0.95} ei={0.5} color="#5a4c50" />
      </group>
    </ThreeCanvas>
  );
};
