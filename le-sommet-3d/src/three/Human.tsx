// Realistic rigged humans (Mixamo-style skeletons from GLB files), posed by the same procedural Body
// angles the mannequin uses, so every walk/climb/fall/kneel beat stays identical.
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Body } from './lib';

const cache = new Map<string, Promise<THREE.Group>>();
function load(file: string) {
  if (!cache.has(file)) {
    cache.set(
      file,
      new Promise((res, rej) => new GLTFLoader().load(staticFile(file), (g) => res(g.scene), undefined, rej)),
    );
  }
  return cache.get(file)!;
}

const DEF: Required<Body> = {
  pelvisY: 0.96, spine: 0.04, head: [0, 0], shL: [0, 0.06], shR: [0, 0.06], elL: 0.15, elR: 0.15,
  hipL: [0, 0.02], hipR: [0, 0.02], knL: 0.05, knR: 0.05,
};

type Rig = {
  root: THREE.Object3D;
  bones: Record<string, THREE.Bone>;
  rest: Record<string, { local: THREE.Quaternion; world: THREE.Quaternion }>;
  height: number;
};
const NAMES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot'];

const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const eul = new THREE.Euler();
function modelQ(x: number, y: number, z: number, order: THREE.EulerOrder = 'XYZ') {
  return new THREE.Quaternion().setFromEuler(eul.set(x, y, z, order));
}
// rotate a bone by a delta expressed in model axes, relative to its rest pose
function apply(r: Rig, name: string, d: THREE.Quaternion) {
  const b = r.bones[name];
  const rs = r.rest[name];
  if (!b || !rs) return;
  qa.copy(rs.world).invert().multiply(d).multiply(rs.world);
  b.quaternion.copy(rs.local).multiply(qa);
}
function captureRest(r: Rig) {
  r.root.updateMatrixWorld(true);
  const inv = new THREE.Quaternion();
  r.root.getWorldQuaternion(inv).invert();
  for (const n of NAMES) {
    const b = r.bones[n];
    if (!b) continue;
    const w = new THREE.Quaternion();
    b.getWorldQuaternion(w);
    r.rest[n] = { local: b.quaternion.clone(), world: inv.clone().multiply(w) };
  }
}

function makeRig(src: THREE.Group): Rig {
  const root = skClone(src);
  const bones: Record<string, THREE.Bone> = {};
  root.traverse((o) => {
    const m = o.name.match(/^(?:mixamorig:?)?(\w+)$/);
    if ((o as THREE.Bone).isBone && m) bones[m[1]] = o as THREE.Bone;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
    }
  });
  const r: Rig = { root, bones, rest: {}, height: 1.8 };
  captureRest(r);
  // straighten the bind pose into the mannequin's rest: arms hanging, legs straight down
  const inv = new THREE.Quaternion();
  const pos = (n: string) => {
    const v = new THREE.Vector3();
    r.bones[n].getWorldPosition(v);
    return v;
  };
  const align = (bone: string, child: string, to: THREE.Vector3) => {
    if (!r.bones[bone] || !r.bones[child]) return;
    r.root.updateMatrixWorld(true);
    const dir = pos(child).sub(pos(bone)).normalize();
    apply(r, bone, new THREE.Quaternion().setFromUnitVectors(dir, to.clone().normalize()));
    captureRest(r);
  };
  void inv;
  for (const [s, side] of [['Left', 1], ['Right', -1]] as const) {
    align(s + 'Arm', s + 'ForeArm', new THREE.Vector3(0.1 * side, -1, 0));
    align(s + 'ForeArm', s + 'Hand', new THREE.Vector3(0.1 * side, -1, 0.04));
    align(s + 'UpLeg', s + 'Leg', new THREE.Vector3(0.02 * side, -1, 0));
    align(s + 'Leg', s + 'Foot', new THREE.Vector3(0, -1, -0.02));
  }
  r.root.updateMatrixWorld(true);
  // feet on the ground
  const foot = Math.min(pos('LeftFoot').y, pos('RightFoot').y);
  r.root.position.y += 0.085 - foot;
  r.root.updateMatrixWorld(true);
  captureRest(r);
  return r;
}

function pose(r: Rig, body: Body) {
  const b = { ...DEF, ...body };
  // side -1 = character's right (x < 0), as in the mannequin
  apply(r, 'Spine', modelQ(b.spine * 0.45, 0, 0));
  apply(r, 'Spine1', modelQ(b.spine * 0.3, 0, 0));
  apply(r, 'Spine2', modelQ(b.spine * 0.25, 0, 0));
  apply(r, 'Neck', modelQ(b.head[0] * 0.35, b.head[1] * 0.4, 0, 'YXZ'));
  apply(r, 'Head', modelQ(b.head[0] * 0.65, b.head[1] * 0.6, 0, 'YXZ'));
  const arm = (bone: string, fore: string, sh: [number, number], el: number, side: 1 | -1) => {
    apply(r, bone, modelQ(sh[0], 0, (sh[1] - 0.06) * side));
    apply(r, fore, modelQ(-el, 0, 0));
  };
  arm('LeftArm', 'LeftForeArm', b.shR, b.elR, 1);
  arm('RightArm', 'RightForeArm', b.shL, b.elL, -1);
  const leg = (up: string, low: string, hip: [number, number], kn: number, side: 1 | -1) => {
    apply(r, up, modelQ(hip[0], 0, (hip[1] - 0.02) * side));
    apply(r, low, modelQ(kn, 0, 0));
  };
  leg('LeftUpLeg', 'LeftLeg', b.hipR, b.knR, 1);
  leg('RightUpLeg', 'RightLeg', b.hipL, b.knL, -1);
}

export type Skin = 'real' | 'shadow';
const shadowMat = new THREE.MeshStandardMaterial({ color: '#060607', roughness: 0.55, metalness: 0.15 });

export const Human: React.FC<{ file: string; body: Body; skin?: Skin; opacity?: number; outfit?: Record<string, string>; eyes?: boolean }> = ({ file, body, skin = 'real', opacity = 1, outfit, eyes = false }) => {
  const [src, setSrc] = useState<THREE.Group | null>(null);
  const [handle] = useState(() => delayRender('load ' + file));
  useLayoutEffect(() => {
    load(file).then((g) => { setSrc(g); continueRender(handle); });
  }, [file, handle]);
  const rig = useMemo(() => {
    if (!src) return null;
    const r = makeRig(src);
    r.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (skin === 'shadow') m.material = shadowMat.clone();
      else {
        const mm = (m.material as THREE.MeshStandardMaterial).clone();
        m.material = mm;
        const c = outfit?.[mm.name.replace('Wolf3D_', '')];
        if (c) { mm.color.set(c); mm.map = mm.name.includes('Footwear') ? mm.map : null; }
      }
      m.userData.own = true;
    });
    if (eyes && r.bones.Head) {
      // two faint glowing eyes in the head bone 
      for (const s of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4.2, 4.6), toneMapped: false }));
        e.position.set(0.032 * s, 0.075, 0.085);
        e.name = 'eye';
        r.bones.Head.add(e);
      }
    }
    return r;
  }, [src, skin, outfit, eyes]);
  if (!rig) return null;
  pose(rig, body);
  rig.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || o.name === 'eye') return;
    const mm = m.material as THREE.MeshStandardMaterial;
    mm.transparent = opacity < 1;
    mm.opacity = opacity;
    mm.depthWrite = opacity > 0.6;
  });
  const b = { ...DEF, ...body };
  return (
    <group position={[0, b.pelvisY - DEF.pelvisY, 0]}>
      <primitive object={rig.root} />
    </group>
  );
};
