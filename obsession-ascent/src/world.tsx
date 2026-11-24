// The hall: monumental pillars, two giant blocks, the stairs, the platform and the monolith. Lights, particles, shockwaves.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mat, basic, Glow, LightCone, glowTexture, V3 } from './three/lib';
import { B, BLOCK1, BLOCK2, STAIRS, RUN, PLAT_Y, MONO, PILLAR_Z, pillarIgnite, timeAtZ, warmth, rnd, clamp, lerp, sstep, prog, easeOut } from './timeline.js';

const ICE = new THREE.Color('#9fd3ff');
const GOLD = new THREE.Color('#ffb257');
const WHITEGOLD = new THREE.Color('#ffe2a8');
export const lightCol = (t: number, extra = 0) => ICE.clone().lerp(GOLD, clamp(warmth(t) + extra));
/** ignition envelope: dark -> flash -> settles */
export const ign = (t: number, t0: number, settle = 0.75) => {
  if (t < t0) return 0;
  const d = t - t0;
  return d < 0.06 ? d / 0.06 * 1.8 : lerp(settle, 1.8, Math.exp(-(d - 0.06) * 5));
};
/** the light wave that runs through the hall after the eruption */
export const wave = (t: number, dist: number) => (t < B.touch ? 0 : ign(t, B.touch + 0.1 + dist / 70, 1.0));

// soft horizontal-falloff texture for glow planes
let GLOWV: THREE.CanvasTexture | null = null;
function glowV() {
  if (GLOWV) return GLOWV;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 4;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 128, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.5, 'rgba(255,255,255,1)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 4);
  GLOWV = new THREE.CanvasTexture(c);
  return GLOWV;
}
const add = (c: THREE.Color, o: number) => new THREE.MeshBasicMaterial({ color: c, map: glowV(), transparent: true, opacity: clamp(o), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
const lineMat = (c: THREE.Color, k: number) => new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(clamp(k, 0, 1.8)), toneMapped: false });

const CONCRETE = '#1e2126';

export const Hall: React.FC<{ t: number }> = ({ t }) => {
  const floor = useMemo(() => new THREE.MeshStandardMaterial({ color: '#15181d', roughness: 0.3, metalness: 0.3 }), []);
  const pillarM = mat(CONCRETE, 0.92);
  const pillars: React.ReactNode[] = [];
  for (const z of PILLAR_Z) {
    for (const x of [-10, 10, -24, 24]) {
      const outer = Math.abs(x) > 15;
      const ti = pillarIgnite(z, outer);
      let I = ign(t, ti) + wave(t, Math.hypot(x, z - MONO.z)) * 0.8;
      I *= 1 + 0.25 * Math.sin(t * 31 + z) * sstep(t, B.sprint, B.sprint + 0.5) * (t < B.touch ? 1 : 0); // flicker in the obsession
      const col = lightCol(t, t > B.touch ? 1 : 0);
      const face = -Math.sign(x) * 1.52;
      pillars.push(
        <group key={`${x}_${z}`} position={[x, 0, z]}>
          <mesh position={[0, 40, 0]} material={pillarM} receiveShadow>
            <boxGeometry args={[3, 80, 3]} />
          </mesh>
          {I > 0.01 ? (
            <>
              <mesh position={[face, 38, 0]} material={lineMat(col, I)}>
                <boxGeometry args={[0.06, 74, 0.16]} />
              </mesh>
              <mesh position={[face * 1.05, 38, 0]} rotation={[0, Math.PI / 2, 0]} material={add(col, 0.22 * I)}>
                <planeGeometry args={[2.6, 74]} />
              </mesh>
            </>
          ) : null}
        </group>,
      );
    }
  }
  // light running along the floor toward the blocks
  const fl = sstep(t, B.floorLight, B.floorLight + 1.0);
  const flI = fl > 0 ? 1.2 : 0;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} material={floor} receiveShadow>
        <planeGeometry args={[400, 400]} />
      </mesh>
      {pillars}
      {fl > 0
        ? [-3.4, 3.4].map((x) => (
            <mesh key={x} position={[x, 0.012, lerp(-30, -30 + 34 * fl, 0.5)]} rotation-x={-Math.PI / 2} material={lineMat(lightCol(t), flI)}>
              <planeGeometry args={[0.05, 34 * fl]} />
            </mesh>
          ))
        : null}
      {/* floor grid revealed by the final wave */}
      {t > B.touch
        ? Array.from({ length: 21 }, (_, i) => {
            const z = -70 + i * 7;
            const k = wave(t, Math.abs(z - MONO.z)) * 0.35;
            return k > 0.01 ? (
              <mesh key={i} position={[0, 0.01, z]} rotation-x={-Math.PI / 2} material={lineMat(WHITEGOLD, k)}>
                <planeGeometry args={[46, 0.035]} />
              </mesh>
            ) : null;
          })
        : null}
    </group>
  );
};

export const Ascent: React.FC<{ t: number }> = ({ t }) => {
  const stone = mat('#1a1c21', 0.86);
  const stone2 = mat('#16181c', 0.9);
  const steps: React.ReactNode[] = [];
  for (let i = 0; i < STAIRS.n; i++) {
    const z0 = STAIRS.z0 + i * RUN;
    const top = STAIRS.y0 + (i + 1) * STAIRS.rise;
    const ti = timeAtZ(z0 + RUN) - 0.08;
    let I = t >= B.top2 ? ign(t, ti, 0.55) : 0;
    I = Math.max(I, wave(t, Math.abs(z0 - MONO.z)) * 0.9);
    steps.push(
      <group key={i}>
        <mesh position={[0, top / 2, z0 + RUN / 2]} material={i % 2 ? stone : stone2} receiveShadow castShadow={false}>
          <boxGeometry args={[6, top, RUN]} />
        </mesh>
        {I > 0.01 ? (
          <mesh position={[0, top + 0.012, z0 + 0.02]} material={lineMat(lightCol(t, t > B.touch ? 1 : 0), I)}>
            <boxGeometry args={[5.9, 0.02, 0.05]} />
          </mesh>
        ) : null}
      </group>,
    );
  }
  // parapets along the stairs with their own light rail
  const len = Math.hypot(STAIRS.z1 - STAIRS.z0, PLAT_Y - STAIRS.y0);
  const ang = Math.atan2(PLAT_Y - STAIRS.y0, STAIRS.z1 - STAIRS.z0);
  const railI = Math.max(sstep(t, 16, 17) * 0.6, wave(t, 20));
  const edge = (y: number, z: number, at: number) => {
    const I = ign(t, at, 0.6) + wave(t, Math.abs(z - MONO.z));
    return I > 0.01 ? (
      <mesh position={[0, y + 0.012, z + 0.02]} material={lineMat(lightCol(t), I)}>
        <boxGeometry args={[5.9, 0.025, 0.06]} />
      </mesh>
    ) : null;
  };
  return (
    <group>
      <mesh position={[0, BLOCK1.h / 2, (BLOCK1.z0 + BLOCK1.z1) / 2]} material={stone} receiveShadow castShadow>
        <boxGeometry args={[6, BLOCK1.h, BLOCK1.z1 - BLOCK1.z0]} />
      </mesh>
      <mesh position={[0, BLOCK2.h / 2, (BLOCK2.z0 + BLOCK2.z1) / 2]} material={stone2} receiveShadow castShadow>
        <boxGeometry args={[6, BLOCK2.h, BLOCK2.z1 - BLOCK2.z0]} />
      </mesh>
      {edge(BLOCK1.h, BLOCK1.z0, B.top1 - 0.1)}
      {edge(BLOCK2.h, BLOCK2.z0, B.top2 - 0.1)}
      {steps}
      {[-3.15, 3.15].map((x) => (
        <group key={x} position={[x, (STAIRS.y0 + PLAT_Y) / 2 + 0.5, (STAIRS.z0 + STAIRS.z1) / 2]} rotation={[-ang, 0, 0]}>
          <mesh material={stone2}>
            <boxGeometry args={[0.3, 1.0, len]} />
          </mesh>
          {railI > 0.01 ? (
            <mesh position={[0, 0.52, 0]} material={lineMat(lightCol(t), railI)}>
              <boxGeometry args={[0.05, 0.03, len]} />
            </mesh>
          ) : null}
        </group>
      ))}
      {/* platform */}
      <mesh position={[0, PLAT_Y / 2, 64]} material={stone} receiveShadow>
        <boxGeometry args={[34, PLAT_Y, 20]} />
      </mesh>
    </group>
  );
};

/** the goal: a dark monolith with a gold seam that splits open into a column of light */
export const Monolith: React.FC<{ t: number }> = ({ t }) => {
  const open = easeOut(prog(t, B.open, B.open + 0.9));
  const pre = 0.15 + 0.25 * sstep(t, 14, 20) + 0.6 * sstep(t, 20, 25.8);
  const blast = t < B.touch ? 0 : Math.exp(-(t - B.touch) * 1.6);
  const y0 = PLAT_Y;
  const half = (s: number) => (
    <mesh position={[s * (MONO.w / 4 + open * 1.7), y0 + MONO.h / 2, MONO.z]} material={mat('#0c0d10', 0.28, 0.6)} castShadow receiveShadow>
      <boxGeometry args={[MONO.w / 2 - 0.02, MONO.h, MONO.d]} />
    </mesh>
  );
  const coreW = 0.05 + open * 3.3;
  const beamO = sstep(t, B.touch, B.touch + 0.5);
  return (
    <group>
      {half(-1)}
      {half(1)}
      <mesh position={[0, y0 + MONO.h / 2, MONO.z]} material={lineMat(GOLD.clone().lerp(WHITEGOLD, 0.5 * open), Math.min(1.1, 1.2 * pre + 0.5 * open))}>
        <boxGeometry args={[coreW, MONO.h - 0.1, MONO.d * 0.6]} />
      </mesh>
      <Glow position={[0, y0 + MONO.h / 2, MONO.z - 0.8]} size={3 + 10 * pre + 22 * open + 18 * blast} color="#ffb860" opacity={Math.min(0.85, 0.35 * pre + 0.6 * open)} />
      <pointLight position={[0, y0 + 3, MONO.z - 1.5]} intensity={40 * pre + 220 * open + 500 * blast} distance={0} decay={2} color="#ffc070" />
      {open > 0.01 ? (
        <spotLight position={[0, y0 + 2.2, MONO.z - 0.8]} target-position={[0, y0, MONO.z - 30]} angle={0.75} penumbra={0.6} intensity={420 * open} distance={0} decay={2} color="#ffd08a" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.0004} />
      ) : null}
      {beamO > 0 ? (
        <>
          <mesh position={[0, y0 + MONO.h + 300, MONO.z]} material={add(GOLD, 0.7 * beamO)}>
            <planeGeometry args={[2.6 + 3 * blast, 600]} />
          </mesh>
          <mesh position={[0, y0 + MONO.h + 300, MONO.z]} rotation={[0, Math.PI / 2, 0]} material={add(GOLD, 0.7 * beamO)}>
            <planeGeometry args={[2.6 + 3 * blast, 600]} />
          </mesh>
          <LightCone position={[0, y0 + 200, MONO.z]} height={200} radius={14} color="#ffcf8a" opacity={0.22 * beamO} rotation={[Math.PI, 0, 0]} />
        </>
      ) : null}
      {/* shockwave rings: on the platform, then down across the hall floor */}
      {[
        [y0 + 0.04, B.touch, 70],
        [0.04, B.touch + 0.45, 60],
      ].map(([y, t0, sp], i) => {
        const d = t - t0;
        if (d < 0 || d > 2.2) return null;
        const r = 1 + d * sp;
        return (
          <mesh key={i} position={[0, y, MONO.z]} rotation-x={-Math.PI / 2} material={new THREE.MeshBasicMaterial({ color: WHITEGOLD, transparent: true, opacity: 0.85 * (1 - d / 2.2), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })}>
            <ringGeometry args={[r, r + 0.6 + d * 1.5, 96]} />
          </mesh>
        );
      })}
    </group>
  );
};

/** cold shaft of light over the kneeling figure (the departure) */
export const Shaft: React.FC<{ t: number }> = ({ t }) => {
  const k = 1 - 0.75 * sstep(t, 13, 16);
  return (
    <group>
      <spotLight position={[0.6, 42, -1.5]} target-position={[0, 0, 0.3]} angle={0.075} penumbra={0.55} intensity={16000 * k} distance={0} decay={2} color="#cfe6ff" castShadow={t < 6} shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.0003} />
      <LightCone position={[0.6, 42, -1.5]} height={42} radius={3.3} color="#bcdcff" opacity={0.3 * k} rotation={[0.035, 0, 0.014]} />
    </group>
  );
};

/** dust in the air, plus the burst of sparks from the monolith */
export const Particles: React.FC<{ t: number; center: V3 }> = ({ t, center }) => {
  const N = 2600;
  const { geo, base } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const b = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      b[i * 3] = (rnd(i, 1) - 0.5) * 26;
      b[i * 3 + 1] = rnd(i, 2) * 14 - 2;
      b[i * 3 + 2] = (rnd(i, 3) - 0.5) * 30;
    }
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    return { geo: g, base: b };
  }, []);
  const p = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < N; i++) {
    // a volume that follows the action (wraps around the centre), slowly drifting up
    const wrap = (v: number, c: number, s: number) => c + ((((v - c + s / 2) % s) + s) % s) - s / 2;
    p.array[i * 3] = wrap(base[i * 3] + Math.sin(t * 0.3 + i) * 0.3, center[0], 26);
    p.array[i * 3 + 1] = wrap(base[i * 3 + 1] + t * 0.12, center[1] + 5, 14);
    p.array[i * 3 + 2] = wrap(base[i * 3 + 2] + Math.cos(t * 0.27 + i) * 0.3, center[2], 30);
  }
  p.needsUpdate = true;
  const col = lightCol(t).clone().lerp(new THREE.Color('#ffffff'), 0.5);
  // sparks
  const M = 900;
  const sp = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(M * 3), 3));
    return g;
  }, []);
  const d = t - B.touch;
  const sa = sp.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < M; i++) {
    const th = rnd(i, 7) * Math.PI * 2;
    const vh = 4 + rnd(i, 8) * 14;
    const vy = 3 + rnd(i, 9) * 16;
    const dd = Math.max(0, d) * (0.6 + 0.4 * rnd(i, 10));
    sa.array[i * 3] = Math.cos(th) * vh * dd * Math.exp(-dd * 0.25);
    sa.array[i * 3 + 1] = PLAT_Y + MONO.h * rnd(i, 11) + vy * dd * Math.exp(-dd * 0.2);
    sa.array[i * 3 + 2] = MONO.z + Math.sin(th) * vh * dd * Math.exp(-dd * 0.25);
  }
  sa.needsUpdate = true;
  return (
    <group>
      <points geometry={geo}>
        <pointsMaterial size={0.045} map={glowTexture()} color={col} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </points>
      {d > 0 ? (
        <points geometry={sp}>
          <pointsMaterial size={0.35} map={glowTexture()} color="#ffd38a" transparent opacity={clamp(1.2 - d * 0.18)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </points>
      ) : null}
    </group>
  );
};
