import React from 'react';
import { Pose, buildSkeleton, BONE, Pt } from './pose';

type Props = {
  pose: Pose;
  x: number;
  y: number;
  k?: number; // scale
  side?: number; // 0 front/back, 1 profile
  fill?: string;
  far?: string; // colour of far limbs in profile
  opacity?: number;
  glow?: boolean;
  handsBehindHead?: boolean;
};

const P = (p: Pt) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;

/** Minimalist faceless white silhouette. */
export const Figure: React.FC<Props> = ({ pose, x, y, k = 1, side = 0, fill = '#f3f4f6', far, opacity = 1, glow = true, handsBehindHead = false }) => {
  const s = buildSkeleton(pose, side);
  const farFill = side > 0.5 ? far ?? '#b9bec7' : fill;
  const limb = (a: Pt, b: Pt, c: Pt, w: number, col: string) => (
    <path d={`M${P(a)} L${P(b)} L${P(c)}`} stroke={col} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  );
  const foot = (f: Pt, kn: Pt, col: string) => {
    // feet point toward the knee direction in profile, outward from the front
    const dx = side > 0.5 ? Math.sign(kn[0] - f[0] || 1) * 9 : Math.sign(f[0] - s.hip[0] || 1) * 6;
    return <path d={`M${P(f)} L${P([f[0] + dx, f[1]])}`} stroke={col} strokeWidth={11} strokeLinecap="round" />;
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`} opacity={opacity} filter={glow ? 'url(#figGlow)' : undefined}>
      {/* far limbs */}
      {limb(s.hipL, s.knL, s.fL, 14, farFill)}
      {foot(s.fL, s.knL, farFill)}
      {side > 0.5 ? limb(s.shL, s.elL, s.hL, 11, farFill) : null}
      {side > 0.5 ? <circle cx={s.hL[0]} cy={s.hL[1]} r={6.5} fill={farFill} /> : null}
      {/* near leg */}
      {limb(s.hipR, s.knR, s.fR, 14, fill)}
      {foot(s.fR, s.knR, fill)}
      {/* torso */}
      <path d={`M${P(s.shL)} L${P(s.shR)} L${P(s.hipR)} L${P(s.hipL)} Z`} fill={fill} stroke={fill} strokeWidth={12} strokeLinejoin="round" />
      <circle cx={s.hip[0]} cy={s.hip[1]} r={side > 0.5 ? 11 : 13} fill={fill} />
      {/* arms */}
      {side > 0.5 ? null : limb(s.shL, s.elL, s.hL, 11, fill)}
      {side > 0.5 ? null : <circle cx={s.hL[0]} cy={s.hL[1]} r={6.5} fill={fill} />}
      {handsBehindHead ? limb(s.shR, s.elR, s.hR, 11, fill) : null}
      {/* neck + head */}
      <path d={`M${P(s.chest)} L${P(s.head)}`} stroke={fill} strokeWidth={10} strokeLinecap="round" />
      {handsBehindHead ? <circle cx={s.head[0]} cy={s.head[1]} r={BONE.headR + 2.5} fill="#0b0f16" opacity={0.9} /> : null}
      <circle cx={s.head[0]} cy={s.head[1]} r={BONE.headR} fill={fill} />
      {handsBehindHead ? null : limb(s.shR, s.elR, s.hR, 11, fill)}
      {handsBehindHead ? null : <circle cx={s.hR[0]} cy={s.hR[1]} r={6.5} fill={fill} />}
    </g>
  );
};
