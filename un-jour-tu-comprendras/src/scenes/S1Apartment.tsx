// SCENE 1 — LA RÉALITÉ (POV): door, keys, jacket, phone feed, window over the night city.
import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { CamRig, Hand, mat, Buildings, makeBlocks, Glow, V3 } from '../three/lib';
import { Phone, drawFeed, RainGlass } from '../three/props';
import { SC, BEAT, kf, prog, ease, easeOut, lerp, clamp, rnd, WIDTH, HEIGHT } from '../timeline.js';

const [A] = SC.apartment;

/** Small key ring. */
const Keys: React.FC<{ position: V3; rotation?: V3 }> = ({ position, rotation = [0, 0, 0] }) => {
  const metal = mat('#b9bcc2', 0.25, 0.9);
  return (
    <group position={position} rotation={rotation}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={metal}>
        <torusGeometry args={[0.014, 0.0025, 8, 20]} />
      </mesh>
      {[0.35, -0.4].map((a, i) => (
        <group key={i} rotation={[0, 0, a]}>
          <mesh position={[0, -0.035, 0]} material={metal}>
            <boxGeometry args={[0.008, 0.045, 0.002]} />
          </mesh>
          <mesh position={[0, -0.006, 0]} material={mat(i ? '#2a2f37' : '#8a6a3a', 0.4, 0.6)}>
            <boxGeometry args={[0.02, 0.018, 0.004]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export const Apartment: React.FC<{ f: number }> = ({ f }) => {
  // ------------------------------------------------ camera path
  const walkPhase = (f - A) * 0.32;
  const walking = clamp(prog(f, 38, 60) - prog(f, 104, 120)) + clamp(prog(f, 392, 410) - prog(f, 470, 490));
  const bob = Math.sin(walkPhase * 2) * 0.018 * walking;
  const sway = Math.sin(walkPhase) * 0.012 * walking;
  const pos = kf(f, [
    [0, [0, 1.66, 3.95]],
    [40, [0, 1.66, 3.75]],
    [118, [-0.55, 1.66, 1.75]],
    [380, [-0.5, 1.66, 1.7]],
    [470, [0.85, 1.66, -1.35]],
    [492, [0.95, 1.64, -1.75]],
  ]) as V3;
  const target = kf(f, [
    [0, [0, 1.55, 0]],
    [60, [-0.2, 1.4, 0]],
    [118, [-0.95, 0.78, 0.55]],
    [150, [-0.95, 0.78, 0.55]],
    [170, [0.1, 1.1, 1.0]],
    [232, [0.55, 0.7, 1.35]],
    [250, [-0.45, 1.35, 0.6]],
    [380, [-0.45, 1.3, 0.6]],
    [430, [1.0, 1.45, -2.6]],
    [492, [1.05, 1.5, -2.6]],
  ]) as V3;
  const camPos: V3 = [pos[0] + sway, pos[1] + bob, pos[2]];

  // ------------------------------------------------ door
  const door = -1.75 * ease(prog(f, BEAT.doorOpen, BEAT.doorOpen + 40));

  // ------------------------------------------------ hands (camera space)
  // right hand: keys (60-155), jacket (160-235), phone (240-385)
  const rKeys = kf(f, [
    [60, [0.2, -0.45, -0.32]],
    [86, [0.11, -0.13, -0.4]],
    [130, [0.0, -0.16, -0.46]],
    [150, [-0.02, -0.2, -0.47]],
    [168, [0.15, -0.5, -0.38]],
  ]) as V3;
  const keysInHand = f < BEAT.keys;
  const keysOnTable: V3 = [-0.92, 0.77, 0.6];
  // jacket: right arm slides out of the sleeve (pulled back by the left hand)
  const jk = prog(f, 165, 230);
  const rJacket: V3 = [lerp(0.14, 0.24, jk), lerp(-0.16, -0.45, ease(jk)), lerp(-0.4, -0.12, ease(jk))];
  const lJacket: V3 = [lerp(-0.1, 0.05, ease(prog(f, 160, 185))), lerp(-0.5, -0.17, ease(prog(f, 160, 185))) - 0.25 * ease(prog(f, 205, 232)), -0.37];
  const sleeveOff = ease(prog(f, 180, 228));
  // phone
  const ph = kf(f, [
    [236, [0.1, -0.5, -0.34]],
    [262, [0.025, -0.085, -0.33]],
    [372, [0.025, -0.085, -0.33]],
    [398, [0.1, -0.52, -0.3]],
  ]) as V3;
  const swipes = [0, 1, 2, 3].map((i) => 272 + i * 24);
  const scroll = swipes.reduce((acc, s0) => acc + 0.92 * easeOut(prog(f, s0, s0 + 12)), 0);
  const thumbUp = swipes.reduce((acc, s0) => acc + Math.sin(Math.PI * prog(f, s0 - 4, s0 + 12)), 0);

  let rightHand: React.ReactNode = null;
  if (f >= 60 && f < 160) {
    rightHand = (
      <group position={rKeys} rotation={[0.35, -0.25, -0.15]}>
        <Hand curl={keysInHand ? 0.6 : 0.3} thumb={0.6} />
        {keysInHand ? <Keys position={[0.0, -0.035, -0.09]} rotation={[0.3, 0, 0.2]} /> : null}
      </group>
    );
  } else if (f >= 160 && f < 236) {
    rightHand = (
      <group position={rJacket} rotation={[0.35, -0.2, -0.3]}>
        <Hand curl={0.35} sleeve={sleeveOff > 0.6 ? '#3d4452' : '#1b1f27'} />
      </group>
    );
  } else if (f >= 236 && f < 400) {
    rightHand = (
      <group position={ph} rotation={[0.18, 0.12, 0]}>
        {/* palm behind the phone, facing the user; fingers wrap the back */}
        <group position={[0.004, -0.098, -0.042]} rotation={[-(Math.PI / 2 + 0.06), Math.PI, 0.08]}>
          <Hand curl={0.02} thumb={0.15 + 0.4 * Math.min(1, thumbUp)} sleeve="#3d4452" spread={0.02} />
        </group>
        <Phone id="feed" draw={drawFeed(scroll, '23:47')} light={false} />
      </group>
    );
  }
  const leftHand =
    f >= 160 && f < 236 ? (
      <group position={lJacket} rotation={[0.35, 0.5, 0.6]}>
        <Hand mirror curl={0.75} thumb={0.7} />
      </group>
    ) : null;

  // jacket flies to the chair
  const toss = prog(f, BEAT.jacketToss - 8, BEAT.jacketToss + 10);
  const jacketVisible = f >= BEAT.jacketToss - 8;
  const chair: V3 = [0.6, 0.48, 1.3];
  const jStart: V3 = [-0.2, 1.1, 1.3];
  const jPos: V3 = [lerp(jStart[0], chair[0], toss), lerp(jStart[1], chair[1] + 0.05, toss) + Math.sin(Math.PI * toss) * 0.25, lerp(jStart[2], chair[2], toss)];

  const city = useMemo(
    () => makeBlocks(300, 190, (i) => [(rnd(i + 1) - 0.5) * 1600, -220 - rnd(i + 2) * 900], [40, 40], [40, 260]),
    [],
  );

  const phoneLight = clamp(prog(f, 250, 270) - prog(f, 372, 392));

  return (
    <ThreeCanvas width={WIDTH} height={HEIGHT} gl={{ antialias: false }}>
      <color attach="background" args={['#020306']} />
      <fog attach="fog" args={['#0b1220', 250, 1500]} />
      <hemisphereLight args={['#3a4868', '#0a0b0e', 1.4]} />
      {/* cold city light through the window */}
      <directionalLight position={[2, 6, -10]} intensity={2.2} color="#7f9cd0" />
      {/* warm hallway light behind the door */}
      {f < 200 ? <pointLight position={[0, 2.3, 4.6]} intensity={18 * (1 - 0.7 * prog(f, 60, 140))} distance={9} decay={1.6} color="#ffb36b" /> : null}
      {/* dim floor lamp in the corner */}
      {f < 380 ? <pointLight position={[2.3, 1.5, 1.6]} intensity={3} distance={5} decay={1.6} color="#ff9d5c" /> : null}
      {/* phone glow on the hand */}
      {phoneLight > 0 ? <pointLight position={[camPos[0], camPos[1] - 0.1, camPos[2] - 0.3]} intensity={1.1 * phoneLight} distance={2.5} decay={1.5} color="#9fb8ff" /> : null}
      <CamRig pos={camPos} target={target} fov={52} roll={sway * 0.6} exposure={1.5}>
        {rightHand}
        {leftHand}
      </CamRig>

      {/* hallway */}
      <mesh position={[0, 1.35, 4.2]} material={mat('#2a2521', 0.9)}>
        <boxGeometry args={[2.2, 2.7, 3.2]} />
      </mesh>
      {/* room shell (inside faces) */}
      <mesh position={[0, 2.7, 0]} rotation-x={Math.PI / 2} material={mat('#16181e', 0.95)}>
        <planeGeometry args={[6, 5.2]} />
      </mesh>
      <mesh position={[-3, 1.35, 0]} rotation-y={Math.PI / 2} material={mat('#1b1e25', 0.95)}>
        <planeGeometry args={[5.2, 2.7]} />
      </mesh>
      <mesh position={[3, 1.35, 0]} rotation-y={-Math.PI / 2} material={mat('#1b1e25', 0.95)}>
        <planeGeometry args={[5.2, 2.7]} />
      </mesh>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, 0]} material={mat('#2a221d', 0.55)}>
        <planeGeometry args={[6, 5.2]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0.2, 0.004, -0.4]} material={mat('#1d2129', 1)}>
        <planeGeometry args={[2.4, 1.6]} />
      </mesh>
      {/* front wall with door opening (two slabs + lintel), facing the room */}
      <mesh position={[-1.74, 1.35, 2.58]} material={mat('#1b1e25', 0.95)}>
        <boxGeometry args={[2.52, 2.7, 0.06]} />
      </mesh>
      <mesh position={[1.74, 1.35, 2.58]} material={mat('#1b1e25', 0.95)}>
        <boxGeometry args={[2.52, 2.7, 0.06]} />
      </mesh>
      <mesh position={[0, 2.38, 2.58]} material={mat('#1b1e25', 0.95)}>
        <boxGeometry args={[0.96, 0.64, 0.06]} />
      </mesh>
      {/* door (hinge on the left) */}
      <group position={[-0.475, 1.03, 2.6]} rotation={[0, door, 0]}>
        <mesh position={[0.475, 0, 0]} material={mat('#3a2e26', 0.6)}>
          <boxGeometry args={[0.95, 2.06, 0.045]} />
        </mesh>
        <mesh position={[0.86, 0, -0.04]} material={mat('#b9bcc2', 0.3, 0.9)}>
          <boxGeometry args={[0.1, 0.02, 0.03]} />
        </mesh>
      </group>
      {/* back wall with a big window */}
      <group position={[0, 0, -2.6]}>
        <mesh position={[-1.85, 1.35, 0]} material={mat('#1b1e25', 0.95)}>
          <boxGeometry args={[2.3, 2.7, 0.08]} />
        </mesh>
        <mesh position={[2.75, 1.35, 0]} material={mat('#1b1e25', 0.95)}>
          <boxGeometry args={[0.5, 2.7, 0.08]} />
        </mesh>
        <mesh position={[1.0, 0.3, 0]} material={mat('#1b1e25', 0.95)}>
          <boxGeometry args={[3.0, 0.6, 0.08]} />
        </mesh>
        <mesh position={[1.0, 2.5, 0]} material={mat('#1b1e25', 0.95)}>
          <boxGeometry args={[3.0, 0.4, 0.08]} />
        </mesh>
        {/* frame + mullion */}
        <mesh position={[1.0, 1.45, 0]} material={mat('#0e1014', 0.6)}>
          <boxGeometry args={[0.06, 1.7, 0.1]} />
        </mesh>
        <mesh position={[1.0, 0.62, 0.05]} material={mat('#2a2e36', 0.6)}>
          <boxGeometry args={[3.0, 0.05, 0.25]} />
        </mesh>
        <RainGlass f={f} w={3.0} h={1.7} position={[1.0, 1.45, 0.02]} id="glass1" />
      </group>
      {/* the night city far below */}
      <group position={[0, -45, 0]}>
        <Buildings blocks={city} lit={0.3} warm={0.65} ei={2.4} />
        {/* street lights grid far below */}
        {Array.from({ length: 60 }, (_, i) => (
          <Glow key={i} position={[(rnd(i + 900) - 0.5) * 1400, 1, -200 - rnd(i + 901) * 900]} size={14} color={i % 3 ? '#ffb46b' : '#cfe0ff'} opacity={0.6} />
        ))}
      </group>
      <Glow position={[100, 20, -900]} size={1400} color="#2c4a80" opacity={0.3} />

      {/* furniture */}
      <group position={[-0.95, 0, 0.6]}>
        <mesh position={[0, 0.74, 0]} material={mat('#3b2f27', 0.45)}>
          <boxGeometry args={[1.2, 0.04, 0.75]} />
        </mesh>
        {[
          [-0.55, -0.33],
          [0.55, -0.33],
          [-0.55, 0.33],
          [0.55, 0.33],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.36, z]} material={mat('#24201c', 0.6)}>
            <boxGeometry args={[0.04, 0.72, 0.04]} />
          </mesh>
        ))}
        {/* a few objects: mug, unopened letters */}
        <mesh position={[0.35, 0.8, -0.15]} material={mat('#d8d4cc', 0.5)}>
          <cylinderGeometry args={[0.04, 0.035, 0.09, 16]} />
        </mesh>
        <mesh position={[-0.25, 0.765, 0.05]} rotation={[0, 0.3, 0]} material={mat('#c9c2b2', 0.9)}>
          <boxGeometry args={[0.22, 0.006, 0.11]} />
        </mesh>
        <mesh position={[-0.22, 0.771, 0.08]} rotation={[0, -0.2, 0]} material={mat('#e3ddd0', 0.9)}>
          <boxGeometry args={[0.22, 0.006, 0.11]} />
        </mesh>
      </group>
      {f >= BEAT.keys ? <Keys position={keysOnTable} rotation={[-Math.PI / 2 + 0.05, 0, 0.6]} /> : null}
      {/* chair */}
      <group position={[0.6, 0, 1.3]} rotation={[0, -0.5, 0]}>
        <mesh position={[0, 0.46, 0]} material={mat('#26221f', 0.7)}>
          <boxGeometry args={[0.45, 0.05, 0.45]} />
        </mesh>
        <mesh position={[0, 0.75, -0.2]} material={mat('#26221f', 0.7)}>
          <boxGeometry args={[0.45, 0.55, 0.04]} />
        </mesh>
        {[
          [-0.2, -0.2],
          [0.2, -0.2],
          [-0.2, 0.2],
          [0.2, 0.2],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.23, z]} material={mat('#1d1a17', 0.6)}>
            <boxGeometry args={[0.035, 0.46, 0.035]} />
          </mesh>
        ))}
      </group>
      {jacketVisible ? (
        <group position={jPos} rotation={[lerp(0.6, 0.15, toss), lerp(0, -0.5, toss), lerp(1.2, 0.1, toss)]}>
          <mesh material={mat('#3d4452', 0.9)} scale={[1, 0.25, 0.8]}>
            <sphereGeometry args={[0.28, 16, 10]} />
          </mesh>
          <mesh position={[0.25, -0.05, 0.1]} rotation={[0, 0, 1.2]} material={mat('#3d4452', 0.9)}>
            <capsuleGeometry args={[0.06, 0.35, 4, 10]} />
          </mesh>
        </group>
      ) : null}
      {/* sofa, shelf, plant silhouettes */}
      <group position={[-2.2, 0, -1.2]}>
        <mesh position={[0, 0.25, 0]} material={mat('#23262e', 0.95)}>
          <boxGeometry args={[1.0, 0.5, 2.0]} />
        </mesh>
        <mesh position={[-0.4, 0.6, 0]} material={mat('#23262e', 0.95)}>
          <boxGeometry args={[0.22, 0.7, 2.0]} />
        </mesh>
      </group>
      <group position={[2.6, 0, 0.6]}>
        <mesh position={[0, 0.9, 0]} material={mat('#201c19', 0.8)}>
          <boxGeometry args={[0.35, 1.8, 1.0]} />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[-0.18, 0.35 + Math.floor(i / 3) * 0.5, -0.35 + (i % 3) * 0.12]} material={mat(['#3a2c26', '#26303a', '#2f2a22'][i % 3], 0.8)}>
            <boxGeometry args={[0.02, 0.28, 0.08]} />
          </mesh>
        ))}
      </group>
    </ThreeCanvas>
  );
};

