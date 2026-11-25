// v3 "mix": typed-prompt opening -> 3D UI montage (v2) -> first order.
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Bag, FONT, Glow, LIME, SceneLive, SceneLogo, SceneOrder, ScenePhone, SceneProducts, SceneText } from './Ad';

export const FPS = 60;
export const DUR = 21.6;
const OFF = 3.6; // v2 montage starts after the prompt
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const inout = Easing.bezier(0.65, 0, 0.35, 1);
const p = (t: number, a: number, b: number, e = ease) => interpolate(t, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e });

const PROMPT = 'Crée ma boutique de streetwear';
function ScenePrompt({ t }: { t: number }) {
  if (t > 4.0) return null;
  const typed = PROMPT.slice(0, Math.floor(interpolate(t, [0.55, 2.05], [0, PROMPT.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  const caret = Math.floor(t * 2.2) % 2 === 0 || (t > 0.55 && t < 2.05);
  const chip = p(t, 2.1, 2.45, Easing.bezier(0.34, 1.56, 0.64, 1));
  const press = Math.sin(Math.PI * p(t, 2.6, 2.8, Easing.linear));
  const fold = p(t, 2.8, 3.25, inout); // the box folds into the send button
  const move = p(t, 3.1, 3.6, inout); // the dot travels to the centre where the logo will appear
  const fadeOut = p(t, 3.55, 3.95, inout);
  const enter = p(t, 0, 0.7);
  const bw = interpolate(fold, [0, 1], [900, 84]);
  const bh = interpolate(fold, [0, 1], [300, 84]);
  // send button position (bottom-right of the box), then to the logo spot
  const bx0 = 540 + 450 - 62;
  const by0 = 960 + 150 - 62;
  const btnX = interpolate(move, [0, 1], [interpolate(fold, [0, 1], [bx0, 540]), 540]);
  const btnY = interpolate(move, [0, 1], [interpolate(fold, [0, 1], [by0, 960]), 760]);
  const tilt = (1 - enter) * 28 + 10 * (1 - fold) - 2 * t;
  return (
    <AbsoluteFill style={{ opacity: 1 - fadeOut }}>
      <Glow x={540} y={1000} r={interpolate(fold, [0, 1], [700, 380])} o={0.32 + 0.3 * fold} />
      <div style={{ position: 'absolute', inset: 0, perspective: 1500 }}>
        {/* the prompt box */}
        <div style={{ position: 'absolute', left: 540 - bw / 2 + (bx0 - 540) * fold * 0.94, top: 960 - bh / 2 + (by0 - 960) * fold * 0.92, width: bw, height: bh, borderRadius: interpolate(fold, [0, 1], [44, 42]),
          background: 'linear-gradient(170deg, rgba(40,42,40,.95), rgba(18,19,18,.97))', border: '1.5px solid rgba(255,255,255,.13)', boxShadow: '0 50px 120px rgba(0,0,0,.7)',
          transform: `rotateX(${tilt}deg) translateZ(${(1 - enter) * -400}px)`, opacity: enter * (1 - fold * 0.98), filter: `blur(${(1 - enter) * 16 + fold * 6}px)`, overflow: 'hidden', boxSizing: 'border-box', padding: '40px 46px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'I5', fontSize: 26, color: 'rgba(255,255,255,.55)', whiteSpace: 'nowrap' }}>
            <Bag size={34} /> Assistant boutique
          </div>
          <div style={{ marginTop: 34, fontFamily: 'I5', fontSize: 46, color: typed ? '#fff' : 'rgba(255,255,255,.35)', whiteSpace: 'nowrap', letterSpacing: -0.5 }}>
            {typed || 'Dis-moi ce que tu veux vendre…'}
            <span style={{ display: 'inline-block', width: 4, height: 50, marginLeft: 4, verticalAlign: -8, background: LIME, opacity: caret ? 1 : 0 }} />
          </div>
          <div style={{ position: 'absolute', left: 46, bottom: 36, padding: '10px 24px', borderRadius: 26, background: 'rgba(163,240,74,.14)', color: LIME, fontFamily: 'I7', fontSize: 24, opacity: chip, transform: `scale(${0.6 + 0.4 * chip})`, transformOrigin: 'left center', whiteSpace: 'nowrap' }}>
            Niche : Streetwear
          </div>
        </div>
        {/* send button -> glowing dot */}
        <div style={{ position: 'absolute', left: btnX - 42, top: btnY - 42, width: 84, height: 84, borderRadius: '50%', opacity: enter,
          background: fold > 0 ? `radial-gradient(circle, #eaffd0 0%, ${LIME} 55%)` : LIME, transform: `scale(${(1 - 0.15 * press) * (1 - 0.45 * move)})`,
          boxShadow: `0 0 ${30 + 90 * fold}px rgba(163,240,74,${0.45 + 0.5 * fold})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'I7', fontSize: 40, color: '#0b0c0b' }}>
          <span style={{ opacity: 1 - fold }}>↑</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const Mix: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const o = t - OFF;
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(130% 90% at 50% 45%, #171917 0%, #0b0c0b 60%, #060706 100%)', overflow: 'hidden' }}>
      <style>{FONT}</style>
      <ScenePrompt t={t} />
      {t > OFF - 0.1 ? (
        <>
          <SceneLogo t={o} />
          <ScenePhone t={o} />
          <SceneProducts t={o} />
          <SceneLive t={o} />
          <SceneText t={o} />
          <SceneOrder t={o} />
        </>
      ) : null}
      <AbsoluteFill style={{ background: 'radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,.55) 100%)' }} />
    </AbsoluteFill>
  );
};
