// Frame-by-frame choreography of both characters and both ladders.
import {
  GY,
  RAIL,
  RED_X,
  RUNG,
  LADDER_LEN,
  WALL_TOP,
  WHITE_X0,
  WHITE_X,
  T,
  FIG1_WINDOW,
  FIG2_WINDOW,
  clamp,
  lerp,
  prog,
  easeOutCubic,
  easeInOutSine,
  easeInOutCubic,
  fig1Climb,
  fig2Climb,
  fig1Slide,
  redLadderAngle,
} from './timeline.js';
import {
  Pose,
  Pt,
  standPose,
  walkPose,
  climbPose,
  sitPose,
  crouchPose,
  lerpPose,
  ladderToWorld,
  BONE,
} from './pose';

export type LadderState = { baseX: number; angle: number; pivot: Pt };

// ------------------------------------------------------------------ ladders
export function redLadder(f: number): LadderState {
  return { baseX: RED_X, angle: redLadderAngle(f), pivot: [RED_X - RAIL, GY] };
}

export function whiteLadderAngle(f: number): number {
  if (f < T.liftStart) return 90;
  if (f < T.liftEnd) {
    const t = prog(f, T.liftStart, T.liftEnd);
    // a little hitch half-way, as if he re-grips
    const e = easeInOutCubic(t);
    return 90 * (1 - e) + Math.sin(t * Math.PI) * 2.5 * Math.sin(t * 9);
  }
  if (f < T.adjustEnd) {
    const t = prog(f, T.liftEnd, T.adjustEnd);
    return Math.sin(t * Math.PI * 2) * 1.2 * (1 - t);
  }
  if (f >= T.inspectEnd && f < T.shakeEnd) {
    const t = prog(f, T.inspectEnd, T.shakeEnd);
    return Math.sin(t * Math.PI * 7) * 1.1 * Math.sin(t * Math.PI);
  }
  return 0;
}

export function whiteLadder(f: number): LadderState {
  const angle = whiteLadderAngle(f);
  let baseX = WHITE_X0;
  if (f >= T.liftEnd) baseX = lerp(WHITE_X0, WHITE_X, easeInOutSine(prog(f, T.liftEnd + 4, T.adjustEnd)));
  const pivot: Pt = f < T.liftEnd ? [WHITE_X0 + RAIL, GY] : [baseX, GY];
  return { baseX, angle, pivot };
}

const snappy = easeOutCubic;
const smooth = easeInOutSine;

// ------------------------------------------------------------- character 1
export function fig1Pose(f: number): Pose {
  const startX = 450;
  if (f < T.fig1RunStart) {
    const look = prog(f, 2, 9);
    return standPose(startX, GY, { breath: f, look: [-2 * look, -5 * look] });
  }
  if (f < T.fig1ClimbStart - 2) {
    const t = prog(f, T.fig1RunStart, T.fig1ClimbStart - 2);
    const x = lerp(startX, RED_X, easeInOutSine(t));
    const run = walkPose(x, GY, (f - T.fig1RunStart) * 0.85, 15, -1, true);
    if (f < T.fig1RunStart + 4) return lerpPose(standPose(startX, GY, { look: [-2, -5] }), run, prog(f, T.fig1RunStart, T.fig1RunStart + 4));
    return run;
  }
  const L = redLadder(f);
  const toWorld = (p: Pose) => ladderToWorld(p, L.baseX, GY, L.pivot, L.angle);

  if (f < T.fig1ClimbStart + 6) {
    const t = easeOutCubic(prog(f, T.fig1ClimbStart - 2, T.fig1ClimbStart + 6));
    return lerpPose(standPose(RED_X, GY, { look: [0, -6] }), toWorld(climbPose(0, FIG1_WINDOW, snappy, 7)), t);
  }
  if (f < T.slipStart) {
    const c = fig1Climb(f);
    const p = climbPose(c, FIG1_WINDOW, snappy, 7);
    if (f > T.fig1FastEnd) {
      // near the top: he strains, reaching for the edge with his right hand
      const r = easeInOutSine(prog(f, T.fig1FastEnd + 30, T.fig1Reach + 10));
      const jitter = Math.sin(f * 0.7) * 5 * r;
      p.hR = [lerp(p.hR[0], 22, r) + jitter, lerp(p.hR[1], -(LADDER_LEN + 6), r) + Math.abs(jitter)];
      p.head = [p.head[0] + 3 * r, p.head[1] - 5 * r];
      p.hip = [p.hip[0] + Math.sin(f * 0.25) * 3 * r, p.hip[1]];
    }
    return toWorld(p);
  }
  if (f < T.slipSlide) {
    // losing balance: arm flails, body sways off the ladder
    const t = prog(f, T.slipStart, T.slipSlide);
    const p = climbPose(26.6, FIG1_WINDOW, snappy, 0);
    const sw = Math.sin(f * 0.55) * 14 * (0.4 + t);
    p.hip = [p.hip[0] + sw * 0.6, p.hip[1]];
    p.chest = [p.chest[0] + sw, p.chest[1]];
    p.head = [p.head[0] + sw * 1.3, p.head[1] + 3];
    p.hR = [70 + Math.sin(f * 0.9) * 28, p.hip[1] - 120 + Math.cos(f * 0.8) * 30];
    p.fR = [p.fR[0] + 18 * Math.sin(f * 0.6) * t, p.fR[1] - 6 * t];
    return toWorld(p);
  }
  if (f < T.fig1Land) {
    // sliding down the rails, legs dangling
    const c = fig1Slide(f);
    const hipY = -(c * RUNG + 64);
    const dang = Math.sin(f * 0.8) * 10;
    const p: Pose = {
      hip: [dang * 0.3, hipY],
      chest: [dang * 0.2, hipY - BONE.torso],
      head: [dang * 0.1, hipY - BONE.torso - BONE.neck + 4],
      hL: [-RAIL + 4, hipY - 128],
      hR: [RAIL - 4, hipY - 124],
      fL: [-22 + dang, Math.min(0, hipY + 90)],
      fR: [22 + dang * 0.6, Math.min(0, hipY + 88)],
      poleAL: [-1, 0.5],
      poleAR: [1, 0.5],
      poleLL: [-1, -0.5],
      poleLR: [1, -0.5],
    };
    return toWorld(p);
  }
  // landed: stumble backwards and sit down, defeated
  const landed = toWorldAt(T.fig1Land);
  const sitX = RED_X + 70;
  if (f < T.fig1Land + 12) {
    const t = easeOutCubic(prog(f, T.fig1Land, T.fig1Land + 12));
    const stumble = standPose(RED_X + 40, GY, { hipDrop: 12, lean: 10, armSpread: 26, look: [6, -2] });
    stumble.hL = [RED_X + 40 - 58, GY - 150];
    stumble.hR = [RED_X + 40 + 60, GY - 140];
    return lerpPose(landed, stumble, t);
  }
  const sit = sitPose(sitX, GY, f, easeInOutSine(prog(f, T.fig1Land + 30, T.fig1Land + 70)));
  if (f < T.fig1Land + 26) {
    const stumble = standPose(RED_X + 40, GY, { hipDrop: 12, lean: 10, armSpread: 26, look: [6, -2] });
    stumble.hL = [RED_X + 40 - 58, GY - 150];
    stumble.hR = [RED_X + 40 + 60, GY - 140];
    return lerpPose(stumble, sit, easeInOutCubic(prog(f, T.fig1Land + 12, T.fig1Land + 26)));
  }
  // flinch when the ladder crashes down
  const fl = Math.exp(-Math.max(0, f - T.ladderThud) / 6) * (f >= T.ladderThud ? 1 : 0);
  sit.head = [sit.head[0] - 10 * fl, sit.head[1] - 6 * fl];
  sit.chest = [sit.chest[0] + 4 * fl, sit.chest[1]];
  return sit;
}

function toWorldAt(f: number): Pose {
  // pose at the exact landing frame (end of the slide)
  const L = redLadder(f);
  const hipY = -64;
  const dang = Math.sin(f * 0.8) * 10;
  const p: Pose = {
    hip: [dang * 0.3, hipY],
    chest: [dang * 0.2, hipY - BONE.torso],
    head: [dang * 0.1, hipY - BONE.torso - BONE.neck + 4],
    hL: [-RAIL + 4, hipY - 128],
    hR: [RAIL - 4, hipY - 124],
    fL: [-22 + dang, 0],
    fR: [22 + dang * 0.6, 0],
    poleAL: [-1, 0.5],
    poleAR: [1, 0.5],
    poleLL: [-1, -0.5],
    poleLR: [1, -0.5],
  };
  return ladderToWorld(p, L.baseX, GY, L.pivot, L.angle);
}

// ------------------------------------------------------------- character 2
const F2_START = 640;
const F2_LIFT_X = 1000;

/** Point on the white ladder centre line, d px from its base, in world. */
function whitePoint(f: number, d: number, side = 0): Pt {
  const L = whiteLadder(f);
  const a = (L.angle * Math.PI) / 180;
  const lx = side; // ladder-local x
  const ly = -d;
  const wx = lx + L.baseX - L.pivot[0];
  const wy = ly + GY - L.pivot[1];
  return [wx * Math.cos(a) - wy * Math.sin(a) + L.pivot[0], wx * Math.sin(a) + wy * Math.cos(a) + L.pivot[1]];
}

function liftPose(f: number): Pose {
  const d = 140;
  const hL = whitePoint(f, d, -14);
  const hR = whitePoint(f, d + 6, 14);
  const mid: Pt = [(hL[0] + hR[0]) / 2, (hL[1] + hR[1]) / 2];
  const handH = GY - mid[1];
  const x = mid[0] + 6;
  const hipDrop = clamp(90 - (handH + 14), 0, 44);
  const p = standPose(x, GY, { hipDrop, look: [0, -3] });
  p.chest = [x - 4, p.hip[1] - BONE.torso + hipDrop * 0.3];
  p.head = [p.chest[0] - 2, p.chest[1] - BONE.neck];
  p.hL = hL;
  p.hR = hR;
  p.fL = [x - 16, GY];
  p.fR = [x + 16, GY];
  p.poleLL = [-1, -0.6];
  p.poleLR = [1, -0.6];
  return p;
}

function holdPose(f: number, raise = 0): Pose {
  const L = whiteLadder(f);
  const x = L.baseX;
  const p = standPose(x, GY, { breath: f, look: [0, -4] });
  const tilt = (L.angle * Math.PI) / 180;
  const h = 152 + raise;
  p.hL = [x - RAIL + 4 + Math.sin(tilt) * h, GY - h];
  p.hR = [x + RAIL - 4 + Math.sin(tilt) * h, GY - h + 2];
  p.chest = [p.chest[0] + Math.sin(tilt) * 30, p.chest[1]];
  p.poleAL = [-1, 0.6];
  p.poleAR = [1, 0.6];
  return p;
}

export function fig2Pose(f: number): Pose {
  if (f < T.fig2WalkStart) {
    // observes: looks up the wall, glances at the other climber, studies
    const up = easeInOutSine(prog(f, 4, 26)) - 0.5 * easeInOutSine(prog(f, 40, 54));
    const side = -easeInOutSine(prog(f, 28, 38)) + easeInOutSine(prog(f, 44, 54));
    return standPose(F2_START, GY, { breath: f, look: [side * 6, -7 * up] });
  }
  if (f < T.fig2WalkEnd) {
    const t = prog(f, T.fig2WalkStart, T.fig2WalkEnd);
    const x = lerp(F2_START, F2_LIFT_X, easeInOutSine(t));
    const w = walkPose(x, GY, (f - T.fig2WalkStart) * 0.45, 9, 1);
    const blend = Math.min(prog(f, T.fig2WalkStart, T.fig2WalkStart + 6), 1 - prog(f, T.fig2WalkEnd - 6, T.fig2WalkEnd));
    const s = standPose(x, GY, { look: [0, -2] });
    return lerpPose(s, w, blend);
  }
  if (f < T.fig2Grab) {
    // looks down at the ladder lying on the floor
    const d = easeInOutSine(prog(f, T.fig2WalkEnd, T.fig2Grab));
    return standPose(F2_LIFT_X, GY, { breath: f, look: [4 * d, 6 * d] });
  }
  if (f < T.liftStart) {
    const t = easeInOutCubic(prog(f, T.fig2Grab, T.liftStart));
    return lerpPose(standPose(F2_LIFT_X, GY, { look: [4, 6] }), liftPose(T.liftStart), t);
  }
  if (f < T.liftEnd) return liftPose(f);
  if (f < T.adjustEnd) {
    const t = easeInOutSine(prog(f, T.liftEnd, T.liftEnd + 8));
    return lerpPose(liftPose(T.liftEnd), holdPose(f), t);
  }
  if (f < T.inspectEnd) {
    // crouch and check the feet of the ladder
    const x = WHITE_X;
    const t = Math.sin(Math.PI * prog(f, T.adjustEnd, T.inspectEnd));
    const k = easeInOutSine(clamp(t * 1.4));
    const crouch = crouchPose(x, GY, 46, [x - RAIL + 2, GY - 10], [x + RAIL - 2 + Math.sin(f * 0.5) * 3, GY - 12], 14);
    return lerpPose(holdPose(f), crouch, k);
  }
  if (f < T.shakeEnd) {
    // tests the ladder: firm grip, small shakes
    const p = holdPose(f, 12);
    const s = Math.sin(prog(f, T.inspectEnd, T.shakeEnd) * Math.PI * 7) * 4;
    p.hip = [p.hip[0] - s * 0.5, p.hip[1]];
    p.chest = [p.chest[0] + s, p.chest[1]];
    return p;
  }
  const W = whiteLadder(f);
  const toWorld = (p: Pose) => ladderToWorld(p, W.baseX, GY, W.pivot, W.angle);
  if (f < T.fig2ClimbStart) {
    // test step: right foot on the first rung, press, settle
    const t = easeInOutSine(prog(f, T.shakeEnd, T.shakeEnd + 12));
    const climb0 = toWorld(climbPose(0, FIG2_WINDOW, smooth, 3));
    const bounce = Math.sin(Math.PI * prog(f, T.shakeEnd + 10, T.fig2ClimbStart)) * 8;
    const p = lerpPose(holdPose(f, 12), climb0, t);
    p.hip = [p.hip[0], p.hip[1] + bounce];
    p.chest = [p.chest[0], p.chest[1] + bounce * 0.8];
    p.head = [p.head[0], p.head[1] + bounce * 0.7];
    return p;
  }
  if (f < T.fig2ClimbEnd) {
    return toWorld(climbPose(fig2Climb(f), FIG2_WINDOW, smooth, 3));
  }
  return climbOver(f);
}

function climbOver(f: number): Pose {
  const W = whiteLadder(T.fig2ClimbEnd);
  const toWorld = (p: Pose) => ladderToWorld(p, W.baseX, GY, W.pivot, W.angle);
  const x = WHITE_X;
  const topX = WHITE_X + 46;
  const k0 = toWorld(climbPose(26, FIG2_WINDOW, smooth, 3));
  // hands on the top edge
  const k1: Pose = toWorld(climbPose(27.2, FIG2_WINDOW, smooth, 3));
  k1.hL = [x - 24, WALL_TOP - 4];
  k1.hR = [x + 34, WALL_TOP - 4];
  // pushes up, right knee onto the top
  const k2: Pose = {
    hip: [x + 26, WALL_TOP - 34],
    chest: [x + 50, WALL_TOP - 86],
    head: [x + 62, WALL_TOP - 110],
    hL: [x + 4, WALL_TOP - 2],
    hR: [x + 62, WALL_TOP - 2],
    fL: [x - 8, WALL_TOP + 2 * RUNG],
    fR: [x + 40, WALL_TOP - 2],
    poleAL: [-1, 0.3],
    poleAR: [1, 0.3],
    poleLL: [-1, -0.2],
    poleLR: [0, -1],
  };
  const k3 = standPose(topX, WALL_TOP, { look: [2, -2] });
  const k4 = standPose(topX, WALL_TOP, { look: [5, -8], armSpread: 4 });
  const s = [T.fig2ClimbEnd, T.fig2ClimbEnd + 10, T.fig2ClimbEnd + 22, T.fig2OnTop, T.fig2OnTop + 14];
  if (f < s[1]) return lerpPose(k0, k1, easeInOutSine(prog(f, s[0], s[1])));
  if (f < s[2]) return lerpPose(k1, k2, easeInOutSine(prog(f, s[1], s[2])));
  if (f < s[3]) return lerpPose(k2, k3, easeInOutSine(prog(f, s[2], s[3])));
  const p = lerpPose(k3, k4, easeInOutSine(prog(f, s[3], s[4])));
  // calm breathing, standing on top
  const b = Math.sin(f * 0.12) * 1.2;
  p.chest = [p.chest[0], p.chest[1] + b];
  p.head = [p.head[0], p.head[1] + b];
  return p;
}
