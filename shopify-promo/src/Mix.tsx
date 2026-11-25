// v3 "mix": typed-prompt opening -> 3D UI montage (v2) -> realistic phone receiving Shopify order notifications.
import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { Bag, Caption, FONT, Glow, LIME, SceneLive, SceneLogo, ScenePhone, SceneProducts, SceneText } from './Ad';

export const FPS = 60;
export const DUR = 25.2;
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

// ------------------------------------------------------------------ realistic phone receiving orders
const ORDERS: [string, string, string][] = [
  ['1001', '79,00 €', 'Hoodie Obsession'],
  ['1002', '39,00 €', 'T-shirt Oversize Eclaire'],
  ['1003', '118,00 €', 'Hoodie Obsession · Casquette Paris'],
  ['1004', '89,00 €', 'Cargo Technique'],
  ['1005', '39,00 €', 'T-shirt Oversize Eclaire'],
  ['1006', '128,00 €', 'Cargo Technique · T-shirt Oversize'],
  ['1007', '79,00 €', 'Hoodie Obsession'],
  ['1008', '29,00 €', 'Casquette Paris'],
];
export const NOTIF_AT = [15.35, 16.45, 17.25, 17.85, 18.3, 18.65, 18.95, 19.2];
const S0 = 14.75;
const S1 = 20.0;
const Notif: React.FC<{ n: number; k: number; y: number; scale: number; opacity: number }> = ({ n, k, y, scale, opacity }) => (
  <div style={{ position: 'absolute', left: 22, right: 22, top: y, height: 146, borderRadius: 40, padding: '24px 26px', boxSizing: 'border-box',
    background: 'rgba(58,60,58,.62)', backdropFilter: 'blur(24px) saturate(1.6)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,.08)',
    boxShadow: '0 10px 30px rgba(0,0,0,.35)', display: 'flex', gap: 22, alignItems: 'center', transform: `translateY(${(1 - k) * -170}px) scale(${scale * (0.9 + 0.1 * k)})`, transformOrigin: 'top center', opacity: opacity * Math.min(1, k * 1.5) }}>
    <div style={{ width: 76, height: 76, borderRadius: 18, background: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,.25)' }}><Bag size={62} /></div>
    <div style={{ flex: 1, minWidth: 0, color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'I7', fontSize: 27 }}>
        <span>Shopify</span><span style={{ fontFamily: 'I5', fontSize: 22, color: 'rgba(255,255,255,.55)' }}>maintenant</span>
      </div>
      <div style={{ fontFamily: 'I7', fontSize: 26, marginTop: 4, whiteSpace: 'nowrap' }}>Commande n°{ORDERS[n][0]} · {ORDERS[n][1]}</div>
      <div style={{ fontFamily: 'I5', fontSize: 23, color: 'rgba(255,255,255,.78)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ORDERS[n][2]}</div>
    </div>
  </div>
);
function SceneSales({ t }: { t: number }) {
  if (t < S0 || t > S1 + 0.1) return null;
  const rise = p(t, S0, S0 + 0.9);
  const out = p(t, S1 - 0.55, S1, inout);
  const arrived = NOTIF_AT.filter((x) => t >= x).length;
  // vibration on each arrival
  const lastHit = NOTIF_AT.filter((x) => t >= x).pop() ?? -9;
  const buzz = t - lastHit < 0.28 ? Math.sin((t - lastHit) * 140) * 7 * (1 - (t - lastHit) / 0.28) : 0;
  const wake = p(t, NOTIF_AT[0] - 0.12, NOTIF_AT[0]);
  const pulse = lastHit > 0 ? Math.exp(-(t - lastHit) * 3) : 0;
  const rotY = interpolate(rise, [0, 1], [-34, -9]) + 3 * Math.sin(t * 0.9);
  const rotX = interpolate(rise, [0, 1], [26, 7]) + 1.5 * Math.sin(t * 0.7);
  const zoom = interpolate(t, [S0, S1], [0, 1]);
  const PW = 640;
  const PH = 1310;
  const stackTop = 560;
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <Glow x={560} y={980} r={620 + 120 * pulse} o={0.45 + 0.35 * pulse} />
      <div style={{ position: 'absolute', inset: 0, perspective: 1900 }}>
        <div style={{ position: 'absolute', left: 540 - PW / 2 + buzz, top: 300 + (1 - rise) * 1000, width: PW, height: PH,
          transform: `translateZ(${zoom * 140 + out * 300}px) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${buzz * 0.08}deg)`, filter: `blur(${(1 - rise) * 12 + out * 14}px)`, transformStyle: 'preserve-3d' }}>
          {/* side buttons */}
          <div style={{ position: 'absolute', left: -7, top: 250, width: 8, height: 70, borderRadius: 4, background: '#5a5c5a' }} />
          <div style={{ position: 'absolute', left: -7, top: 350, width: 8, height: 110, borderRadius: 4, background: '#5a5c5a' }} />
          <div style={{ position: 'absolute', left: -7, top: 480, width: 8, height: 110, borderRadius: 4, background: '#5a5c5a' }} />
          <div style={{ position: 'absolute', right: -7, top: 400, width: 8, height: 170, borderRadius: 4, background: '#5a5c5a' }} />
          {/* titanium frame */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 104, background: 'linear-gradient(135deg, #9a9d9a 0%, #3b3d3b 18%, #7d807d 40%, #2a2c2a 70%, #8c8f8c 100%)', boxShadow: '0 90px 160px rgba(0,0,0,.8), 0 30px 60px rgba(0,0,0,.5)' }} />
          <div style={{ position: 'absolute', inset: 6, borderRadius: 98, background: '#050505' }} />
          {/* screen */}
          <div style={{ position: 'absolute', inset: 22, borderRadius: 84, overflow: 'hidden', background: '#000' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.35 + 0.65 * wake, background: 'radial-gradient(90% 60% at 30% 25%, #4f9a2a 0%, #1d4310 40%, #08120a 75%, #030503 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, opacity: 0.25, background: 'radial-gradient(60% 40% at 80% 85%, #A3F04A 0%, transparent 70%)' }} />
            {/* status bar */}
            <div style={{ position: 'absolute', top: 30, left: 56, right: 50, display: 'flex', justifyContent: 'space-between', fontFamily: 'I7', fontSize: 26, color: '#fff', opacity: 0.4 + 0.6 * wake }}>
              <span>Free</span><span>􀙇 ▮▮▮ 87 %</span>
            </div>
            {/* lock + date + time */}
            <div style={{ position: 'absolute', top: 110, width: '100%', textAlign: 'center', color: '#fff', opacity: 0.4 + 0.6 * wake }}>
              <div style={{ fontFamily: 'I7', fontSize: 30 }}>🔒</div>
              <div style={{ fontFamily: 'I7', fontSize: 30, marginTop: 10, opacity: 0.85 }}>mardi 25 novembre</div>
              <div style={{ fontFamily: 'I7', fontSize: 196, lineHeight: 1, letterSpacing: -6, marginTop: 4, color: 'rgba(235,255,225,.95)' }}>9:41</div>
            </div>
            {/* notification stack: newest on top, older pushed down */}
            {NOTIF_AT.map((at, n) => {
              if (t < at) return null;
              const k = p(t, at, at + 0.45, Easing.bezier(0.2, 1.25, 0.4, 1));
              const above = arrived - 1 - n; // how many newer notifs are above this one
              const shift = NOTIF_AT.slice(n + 1).reduce((acc, x) => acc + p(t, x, x + 0.4, ease), 0);
              const visible = shift < 3.6;
              if (!visible) return null;
              return <Notif key={n} n={n} k={k} y={stackTop + shift * 160} scale={1} opacity={above > 2 ? Math.max(0, 1 - (shift - 2.6)) : 1} />;
            })}
            {/* bottom bar & torch/camera */}
            <div style={{ position: 'absolute', bottom: 64, left: 60, width: 92, height: 92, borderRadius: '50%', background: 'rgba(40,40,40,.6)', backdropFilter: 'blur(10px)' }} />
            <div style={{ position: 'absolute', bottom: 64, right: 60, width: 92, height: 92, borderRadius: '50%', background: 'rgba(40,40,40,.6)', backdropFilter: 'blur(10px)' }} />
            <div style={{ position: 'absolute', bottom: 22, left: '50%', width: 230, height: 9, marginLeft: -115, borderRadius: 5, background: 'rgba(255,255,255,.85)' }} />
            {/* dynamic island */}
            <div style={{ position: 'absolute', top: 22, left: '50%', width: 220, height: 64, marginLeft: -110, borderRadius: 32, background: '#000' }} />
            {/* glass reflection */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(118deg, rgba(255,255,255,.13) 0%, rgba(255,255,255,.03) 28%, rgba(255,255,255,0) 45%)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>
      <Caption t={t} t0={15.5} t1={17.3} text="Ta *première vente.*" y={130} size={78} />
      <Caption t={t} t0={17.4} t1={S1 - 0.3} text="Puis *la suivante.*" y={130} size={78} />
    </AbsoluteFill>
  );
}
function SceneEnd({ t }: { t: number }) {
  if (t < S1 - 0.3) return null;
  const logo = p(t, S1 - 0.2, S1 + 0.4, Easing.bezier(0.34, 1.56, 0.64, 1));
  const txt = p(t, S1 + 0.25, S1 + 0.7);
  return (
    <AbsoluteFill>
      <Glow x={540} y={880} r={560} o={0.6 * logo} />
      <div style={{ position: 'absolute', left: 540, top: 820, transform: `translate(-50%,-50%) scale(${logo})`, opacity: Math.min(1, logo * 1.4) }}>
        <Bag size={280} style={{ filter: 'drop-shadow(0 0 50px rgba(150,240,60,.7))' }} />
      </div>
      <div style={{ position: 'absolute', top: 1030, width: '100%', textAlign: 'center', opacity: txt, transform: `translateY(${(1 - txt) * 30}px)` }}>
        <div style={{ fontFamily: 'I7', fontSize: 76, color: '#fff', letterSpacing: -2 }}>Lance ta boutique.</div>
        <div style={{ display: 'inline-block', marginTop: 34, padding: '20px 48px', borderRadius: 50, background: LIME, color: '#0b0c0b', fontFamily: 'I7', fontSize: 36 }}>Lien en bio ↗</div>
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
          <SceneSales t={o} />
          <SceneEnd t={o} />
        </>
      ) : null}
      <AbsoluteFill style={{ background: 'radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,.55) 100%)' }} />
    </AbsoluteFill>
  );
};
