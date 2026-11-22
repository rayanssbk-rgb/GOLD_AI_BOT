import React from 'react';
import { GY, RAIL, RUNG, RUNGS, LADDER_LEN } from './timeline.js';
import type { LadderState } from './characters';

type Props = {
  state: LadderState;
  rail: string;
  rung: string;
  highlight?: string;
  flat?: string; // single colour (for shadows)
};

export const Ladder: React.FC<Props> = ({ state, rail, rung, highlight, flat }) => {
  const { baseX, angle, pivot } = state;
  const rungs = [];
  for (let i = 1; i <= RUNGS; i++) {
    rungs.push(
      <rect key={i} x={-RAIL} y={-i * RUNG - 2.5} width={RAIL * 2} height={5.5} rx={2} fill={flat ?? rung} />,
    );
  }
  return (
    <g transform={`translate(${pivot[0]} ${pivot[1]}) rotate(${angle}) translate(${baseX - pivot[0]} ${GY - pivot[1]})`}>
      {rungs}
      <rect x={-RAIL - 5} y={-LADDER_LEN - 6} width={9} height={LADDER_LEN + 6} rx={3} fill={flat ?? rail} />
      <rect x={RAIL - 4} y={-LADDER_LEN - 6} width={9} height={LADDER_LEN + 6} rx={3} fill={flat ?? rail} />
      {!flat && highlight ? (
        <>
          <rect x={-RAIL - 5} y={-LADDER_LEN - 6} width={2.2} height={LADDER_LEN + 6} fill={highlight} opacity={0.55} />
          <rect x={RAIL - 4} y={-LADDER_LEN - 6} width={2.2} height={LADDER_LEN + 6} fill={highlight} opacity={0.55} />
        </>
      ) : null}
      {/* rubber feet */}
      <rect x={-RAIL - 6} y={-6} width={11} height={7} rx={2} fill={flat ?? '#1a1a1a'} />
      <rect x={RAIL - 5} y={-6} width={11} height={7} rx={2} fill={flat ?? '#1a1a1a'} />
    </g>
  );
};
