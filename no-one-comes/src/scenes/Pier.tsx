// Blue hour on a wooden pier: POV walking next to Knox. He stops, turns: "Only you."
import React from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { CamRig, mat, basic, Glow, LightCone, walkBody, Body, V3 } from '../three/lib';
import { Sky, Skyline, Ocean, useDowntown, talk } from '../world';
import { Knox } from '../cast';
import { SC, LINE, tod, kf, prog, ease, lerp, WIDTH, HEIGHT } from '../timeline.js';

let PLANKS: THREE.CanvasTexture | null = null;
function planks() {
  if (PLANKS) return PLANKS;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 16; i++) {
    const v = 52 + ((i * 37) % 20);
    g.fillStyle = `rgb(${v + 14},${v},${v - 8})`;
    g.fillRect(0, i * 16, 256, 15);
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, i * 16 + 15, 256, 1);
  }
  PLANKS = new THREE.CanvasTexture(c);
  PLANKS.wrapS = PLANKS.wrapT = THREE.RepeatWrapping;
  PLANKS.repeat.set(1, 60);
  PLANKS.colorSpace = THREE.SRGBColorSpace;
  return PLANKS;
}

export const Pier: React.FC<{ f: number }> = ({ f }) => {
  const [a] = SC.pier;
  const t = tod(f);
  const city = useDowntown(6100);
  const stop = LINE.k3 - 8;
  // walking distance (m), easing into the stop
  const walkT = (Math.min(f, stop) - a) / 30;
  const z = -walkT * 1.25 - Math.max(0, Math.min(1, (f - stop) / 12)) * 0.12;
  const phase = (Math.min(f, stop) - a) * 0.27;
  const bob = f < stop ? Math.abs(Math.sin(phase)) * 0.035 : 0;
  const sway = f < stop ? Math.sin(phase / 2) * 0.012 : 0;
  // Knox beside, half a step ahead, on the right
  const kTalk = Math.max(talk(f, LINE.k2, 'k2'), talk(f, LINE.k3, 'k3'));
  const look = kf(f, [[LINE.k2 - 10, 0], [LINE.k2 + 4, 1], [LINE.k2 + 60, 0.6], [LINE.k2 + 85, 1], [stop - 6, 1]]);
  const face = ease(prog(f, stop, stop + 18));
  const kPos: V3 = [0.5 - 0.12 * face, 0, z - 1.5];
  let kBody: Body = f < stop ? walkBody(phase + Math.PI, 0, 0.05) : { pelvisY: 0.96, spine: 0.03, shL: [0, 0.07], shR: [0, 0.07], elL: 0.2, elR: 0.2 };
  kBody = { ...kBody, head: [0.04 - 0.07 * kTalk, (0.85 * look) * (1 - face)] };
  // a sharp gesture on "Nobody." (right arm)
  const nob = kf(f, [[LINE.k2 + 70, 0], [LINE.k2 + 78, 1], [LINE.k2 + 92, 0]]);
  if (f < stop) kBody = { ...kBody, shR: [-0.9 * nob + (kBody.shR?.[0] ?? 0) * (1 - nob), 0.15], elR: 0.25 + 1.1 * nob };
  const kRot = lerp(Math.PI, 0.35, face);
  // camera: eye height, looks down the pier, glances at Knox, then holds on him
  const head: V3 = [-0.05 + sway, 1.64 + bob, z];
  const fwd: V3 = [0.1, 1.45, z - 12];
  const toK: V3 = [kPos[0] + 0.05, 1.62, kPos[2]];
  const lk = Math.max(0.35 * look * (1 - face), 0.85 * face);
  const target = fwd.map((v, i) => lerp(v, toK[i], ease(lk))) as V3;

  const wood = mat('#3a2e28', 0.9);
  return (
    <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: false }}>
      <fog attach="fog" args={['#14204a', 90, 1300]} />
      <Sky t={t} />
      <hemisphereLight args={['#5a6aa8', '#141420', 1.0]} />
      <directionalLight position={[4, 6, -10]} intensity={0.7} color="#9fb4e8" />
      <CamRig pos={head} target={target} fov={52} exposure={1.4} />
      <Ocean t={t} f={f} />
      <group position={[0, -1, 0]}>
        <Skyline t={t} blocks={city} />
      </group>
      {/* deck */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -100]}>
        <planeGeometry args={[4, 240]} />
        <meshStandardMaterial map={planks()} roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.25, -100]} material={wood}>
        <boxGeometry args={[4.1, 0.4, 240]} />
      </mesh>
      {/* railings + lamps */}
      {Array.from({ length: 50 }, (_, i) => {
        const pz = 6 - i * 3;
        return (
          <group key={i}>
            {[-2, 2].map((x) => (
              <mesh key={x} position={[x, 0.5, pz]} material={wood}>
                <boxGeometry args={[0.1, 1.0, 0.1]} />
              </mesh>
            ))}
          </group>
        );
      })}
      {[-2, 2].map((x) => (
        <mesh key={x} position={[x, 1.02, -70]} material={wood}>
          <boxGeometry args={[0.08, 0.08, 152]} />
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const lz = -4 - i * 12;
        const lx = i % 2 ? 1.95 : -1.95;
        return (
          <group key={i} position={[lx, 0, lz]}>
            <mesh position={[0, 1.8, 0]} material={mat('#141418', 0.5, 0.5)}>
              <cylinderGeometry args={[0.05, 0.07, 3.6, 8]} />
            </mesh>
            <Glow position={[0, 3.65, 0]} size={1.6} color="#ffc287" opacity={0.95} />
            <LightCone position={[0, 3.6, 0]} height={3.6} radius={1.8} color="#ffb877" opacity={0.08} />
            <pointLight position={[0, 3.4, 0]} intensity={1.1} distance={7} decay={1.6} color="#ffb877" />
            {/* its reflection on the water */}
            <mesh rotation-x={-Math.PI / 2} position={[lx > 0 ? 1.4 : -1.4, -1.9, 0.5]} material={basic('#ffb877', 0.18, true)}>
              <planeGeometry args={[0.35, 4]} />
            </mesh>
          </group>
        );
      })}
      <Knox body={kBody} position={kPos} rotY={kRot} />
    </ThreeCanvas>
  );
};
