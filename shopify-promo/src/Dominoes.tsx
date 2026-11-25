// 3D chain reaction: a green ball rolls into growing dominoes (one step of the store per domino),
// light trails follow the wave, the last one slams a lever that launches the ball at the camera.
import React, { useEffect, useMemo, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CamRig, Glow, V3 } from './three/lib';

export const DOM_START = 15.7;
const LIME = '#A3F04A';
const LABELS = ['Idée', 'Boutique', 'Produits', 'Paiements', 'Livraison', 'Visiteurs', 'Panier', 'Commande'];
const N = LABELS.length;
const T0 = 16.45; // the ball touches domino 0
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const sstep = (x: number, a: number, b: number) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const DEG = Math.PI / 180;

// layout of growing dominoes along +x
const DOMS = (() => {
  const out: { h: number; w: number; d: number; a: number; pivot: number; T: number; fd: number }[] = [];
  let a = 0;
  let T = T0;
  for (let i = 0; i < N; i++) {
    const h = 0.55 * Math.pow(1.3, i);
    const d = 0.14 * h;
    const fd = 0.33 * Math.sqrt(h / 0.55);
    out.push({ h, w: 0.55 * h, d, a, pivot: a + d, T, fd });
    a = a + d + 0.6 * h;
    T += fd;
  }
  return out;
})();
const CONTACT = Math.asin(0.6); // ~37°
const LAST = DOMS[N - 1];
const HIT_T = LAST.T + LAST.fd * 1.25; // last domino reaches the lever
const LEVER_X = LAST.pivot + LAST.h * 0.98;
const PLANK = 3.2;
export const LAUNCH_END = HIT_T + 1.15;

function angle(i: number, t: number) {
  const D = DOMS[i];
  if (t <= D.T) return 0;
  const k = (t - D.T) / D.fd;
  if (i === N - 1) {
    // big one goes all the way down onto the lever
    const kk = clamp((t - D.T) / (D.fd * 1.25));
    return 88 * DEG * kk * kk;
  }
  if (k <= 1) return CONTACT * k * k;
  return lerp(CONTACT, 68 * DEG, 1 - Math.pow(1 - clamp((k - 1) / 1.1), 2));
}
/** x position of the falling wave front, for the camera */
function waveX(t: number) {
  if (t < T0) return lerp(-3, 0, sstep(t, DOM_START, T0));
  for (let i = 0; i < N; i++) {
    const D = DOMS[i];
    if (t < D.T + D.fd) return lerp(D.pivot, i + 1 < N ? DOMS[i + 1].pivot : LEVER_X, (t - D.T) / D.fd);
  }
  return LEVER_X;
}
function waveH(t: number) {
  for (let i = 0; i < N; i++) if (t < DOMS[i].T + DOMS[i].fd) return DOMS[i].h;
  return LAST.h;
}

const ballR = 0.17;
function ballPos(t: number): V3 {
  // roll in from the left, rest after hitting domino 0, then hidden; second ball is launched by the lever
  const x = lerp(-3.2, DOMS[0].a - ballR, sstep(t, DOM_START, T0));
  return [Math.min(x, DOMS[0].a - ballR), ballR, 0];
}
function launchPos(t: number): V3 {
  const k = clamp((t - HIT_T) / (LAUNCH_END - HIT_T));
  const sx = LEVER_X + PLANK;
  return [sx + 1.2 * k, 0.5 + 9 * k - 2.5 * k * k, 0 + 9.5 * k * k];
}

function faceTexture(i: number) {
  const c = document.createElement('canvas');
  c.width = 400;
  c.height = 730;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 730);
  gr.addColorStop(0, '#1b1e1b');
  gr.addColorStop(1, '#0a0b0a');
  g.fillStyle = gr;
  g.fillRect(0, 0, 400, 730);
  g.strokeStyle = LIME;
  g.lineWidth = 8;
  g.shadowColor = LIME;
  g.shadowBlur = 30;
  g.beginPath();
  g.roundRect(22, 22, 356, 686, 34);
  g.stroke();
  g.fillStyle = LIME;
  g.font = '700 300px I7, Arial';
  g.textAlign = 'center';
  g.fillText(String(i + 1), 200, 420);
  g.shadowBlur = 0;
  g.fillStyle = '#ffffff';
  g.font = '700 58px I7, Arial';
  g.fillText(LABELS[i], 200, 610);
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 8;
  return tx;
}

const Domino: React.FC<{ i: number; t: number; tex: THREE.Texture }> = ({ i, t, tex }) => {
  const D = DOMS[i];
  const mats = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: '#111311', roughness: 0.25, metalness: 0.7 });
    const face = new THREE.MeshStandardMaterial({ color: '#ffffff', map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.2 });
    return [side, side, side, side, face, face];
  }, [tex]);
  const hit = t > D.T ? Math.exp(-(t - D.T) * 3) : 0;
  return (
    <group position={[D.pivot, 0, 0]} rotation={[0, 0, -angle(i, t)]}>
      <mesh position={[-D.d / 2, D.h / 2, 0]} material={mats} castShadow>
        <boxGeometry args={[D.d, D.h, D.w]} />
      </mesh>
      {hit > 0.02 ? <Glow position={[0, D.h, 0]} size={D.h * 1.4} color={LIME} opacity={hit * 0.8} /> : null}
    </group>
  );
};

/** glowing trail on the floor, drawn behind the wave */
const Trail: React.FC<{ t: number }> = ({ t }) => {
  const x0 = -3.2;
  const x1 = Math.max(x0, Math.min(waveX(t), LEVER_X + PLANK));
  const len = x1 - x0;
  if (len <= 0.01) return null;
  return (
    <group>
      {[-0.55, 0.55].map((z, k) => (
        <mesh key={k} position={[x0 + len / 2, 0.006, z * (0.6 + 0.25 * k)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[len, 0.035]} />
          <meshBasicMaterial color={LIME} toneMapped={false} transparent opacity={0.9} />
        </mesh>
      ))}
      <mesh position={[x0 + len / 2, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[len, 1.9]} />
        <meshBasicMaterial color={LIME} toneMapped={false} transparent opacity={0.035} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};

export const Dominoes: React.FC<{ t: number }> = ({ t }) => {
  const [h] = useState(() => delayRender('domino fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    new FontFace('I7', `url(${staticFile('Inter-700.woff2')})`).load().then((f) => {
      (document.fonts as unknown as { add: (y: FontFace) => void }).add(f);
      setReady(true);
      continueRender(h);
    });
  }, [h]);
  const texs = useMemo(() => (ready ? LABELS.map((_, i) => faceTexture(i)) : []), [ready]);
  if (!ready) return null;

  // ---- camera: low tracking shot beside the wave, then tilts up after the launched ball
  const xw = waveX(t);
  const hw = waveH(t);
  const s = clamp(hw / 1.2, 0.7, 2.6);
  const up = sstep(t, HIT_T - 0.1, LAUNCH_END);
  const bp = launchPos(t);
  const camPos: V3 = [lerp(xw - 1.6 * s, LEVER_X + 0.6, up), lerp(0.55 + 0.75 * s, 2.2, up), lerp(3.4 * s + 1.6, 11, up)];
  const target: V3 = [lerp(xw + 0.9 * s, bp[0], up), lerp(0.45 * hw, bp[1], up), lerp(0, bp[2] * 0.6, up)];
  const shake = t > HIT_T && t < HIT_T + 0.4 ? 0.04 * Math.sin(t * 90) * (1 - (t - HIT_T) / 0.4) : 0;
  camPos[1] += shake;

  const leverA = t < HIT_T ? -14 * DEG : lerp(-14 * DEG, 16 * DEG, sstep(t, HIT_T, HIT_T + 0.12));
  const bpos = ballPos(t);
  return (
    <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: true }}>
      <color attach="background" args={['#050605']} />
      <fogExp2 attach="fog" args={['#030403', 0.03]} />
      <CamRig pos={camPos} target={target} fov={42} exposure={1.1} />
      <ambientLight intensity={0.08} />
      <hemisphereLight args={['#2a3a26', '#000000', 0.25]} />
      <spotLight position={[xw - 2, 9, 6]} target-position={[xw + 1, 0, 0]} angle={0.55} penumbra={0.8} intensity={70} decay={2} color="#e8ffe0" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[xw + 0.6 * s, 1.6 * s, -1.2]} intensity={10 * s} distance={7 * s} decay={1.6} color={LIME} />
      {/* glossy floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#070807" roughness={0.42} metalness={0.6} />
      </mesh>
      <Trail t={t} />
      {DOMS.map((_, i) => <Domino key={i} i={i} t={t} tex={texs[i]} />)}
      {/* rolling ball */}
      {t < LAUNCH_END ? (
        <group position={bpos}>
          <mesh rotation={[0, 0, -bpos[0] / ballR]}>
            <sphereGeometry args={[ballR, 32, 32]} />
            <meshStandardMaterial color={LIME} emissive={LIME} emissiveIntensity={2.2} toneMapped={false} />
          </mesh>
          <Glow position={[0, 0, 0]} size={1.6} color={LIME} opacity={0.8} />
        </group>
      ) : null}
      {/* lever */}
      <group position={[LEVER_X + PLANK / 2, 0.32, 0]}>
        <mesh position={[0, -0.16, 0]}>
          <coneGeometry args={[0.26, 0.32, 4]} />
          <meshStandardMaterial color="#1a1d1a" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh rotation={[0, 0, leverA]} castShadow>
          <boxGeometry args={[PLANK, 0.08, 0.7]} />
          <meshStandardMaterial color="#202420" roughness={0.25} metalness={0.75} emissive={LIME} emissiveIntensity={t > HIT_T ? 0.25 : 0.04} />
        </mesh>
      </group>
      {/* launched ball with trail */}
      {t > HIT_T - 0.01 && t < LAUNCH_END + 0.2 ? (
        <group>
          {[0, 0.03, 0.06, 0.09, 0.12, 0.15].map((dt, k) => (
            <Glow key={k} position={launchPos(t - dt)} size={1.4 - k * 0.15} color={LIME} opacity={0.7 - k * 0.1} />
          ))}
          <mesh position={bp}>
            <sphereGeometry args={[0.24, 32, 32]} />
            <meshStandardMaterial color={LIME} emissive={LIME} emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
      ) : (
        <mesh position={[LEVER_X + PLANK - 0.2, 0.32 + Math.sin(leverA) * (PLANK / 2 - 0.2) + 0.3, 0]}>
          <sphereGeometry args={[0.24, 32, 32]} />
          <meshStandardMaterial color="#d8ffb8" emissive={LIME} emissiveIntensity={1.2} />
        </mesh>
      )}
      <EffectComposer multisampling={0}>
        <Bloom intensity={1.1} luminanceThreshold={0.7} luminanceSmoothing={0.3} mipmapBlur radius={0.75} />
      </EffectComposer>
    </ThreeCanvas>
  );
};
