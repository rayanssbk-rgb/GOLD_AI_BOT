import React from 'react';
import { Pose, buildSkeleton, BONE } from './pose';

type Props = {
  pose: Pose;
  fill?: string;
  filter?: string;
  opacity?: number;
};

const P = (p: [number, number]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;

/** Minimalist faceless silhouette, fully vector, driven by a Pose. */
export const Figure: React.FC<Props> = ({ pose, fill = '#f2f2f0', filter, opacity = 1 }) => {
  const s = buildSkeleton(pose);
  const footDir = (foot: [number, number], hip: [number, number], side: number) =>
    [foot[0] + side * 7, foot[1] + (foot[1] < hip[1] ? 0 : 0)] as [number, number];
  return (
    <g filter={filter} opacity={opacity}>
      {/* legs */}
      <path d={`M${P(s.hipL)} L${P(s.knL)} L${P(s.fL)}`} stroke={fill} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={`M${P(s.hipR)} L${P(s.knR)} L${P(s.fR)}`} stroke={fill} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={`M${P(s.fL)} L${P(footDir(s.fL, s.hip, -1))}`} stroke={fill} strokeWidth={11} strokeLinecap="round" />
      <path d={`M${P(s.fR)} L${P(footDir(s.fR, s.hip, 1))}`} stroke={fill} strokeWidth={11} strokeLinecap="round" />
      {/* torso */}
      <path
        d={`M${P(s.shL)} L${P(s.shR)} L${P(s.hipR)} L${P(s.hipL)} Z`}
        fill={fill}
        stroke={fill}
        strokeWidth={12}
        strokeLinejoin="round"
      />
      <circle cx={s.hip[0]} cy={s.hip[1]} r={13} fill={fill} />
      {/* arms */}
      <path d={`M${P(s.shL)} L${P(s.elL)} L${P(s.hL)}`} stroke={fill} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={`M${P(s.shR)} L${P(s.elR)} L${P(s.hR)}`} stroke={fill} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={s.hL[0]} cy={s.hL[1]} r={6.5} fill={fill} />
      <circle cx={s.hR[0]} cy={s.hR[1]} r={6.5} fill={fill} />
      {/* neck + head */}
      <path d={`M${P(s.chest)} L${P(s.head)}`} stroke={fill} strokeWidth={10} strokeLinecap="round" />
      <circle cx={s.head[0]} cy={s.head[1]} r={BONE.headR} fill={fill} />
    </g>
  );
};
