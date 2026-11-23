// The three original characters.
import React from 'react';
import { Mannequin, Body, Look, V3 } from './three/lib';

/** DRE: early twenties, navy hoodie, hood down or up. */
export const DRE_LOOK: Look = { skin: '#6b4a3a', pants: '#1c2028', hair: '#120d0b' };
/** VINCE: fifties, charcoal coat with collar, grey hair and beard, broad. */
export const VINCE_LOOK: Look = { skin: '#9c765e', pants: '#1a1a1d', hair: '#8a8a8c', collar: true, shoulders: 1.08 };
/** KNOX: thirties, oxblood jacket, black beanie, dark stubble. */
export const KNOX_LOOK: Look = { skin: '#b08a70', pants: '#24262a', beanie: '#141416', collar: true };

type P = { body: Body; position?: V3; rotY?: number; scale?: number };
export const Dre: React.FC<P & { hood?: boolean }> = ({ hood, ...p }) => <Mannequin {...p} hood={hood} cloth="#232c45" look={hood ? { ...DRE_LOOK, hair: undefined } : DRE_LOOK} />;
export const Vince: React.FC<P> = (p) => <Mannequin {...p} cloth="#38383d" look={VINCE_LOOK} scale={1.03} />;
export const Knox: React.FC<P> = (p) => <Mannequin {...p} cloth="#4e2420" look={KNOX_LOOK} />;
