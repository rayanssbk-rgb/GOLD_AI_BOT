// Shopify presentation ad, v2: dark graphite, lime glow, real CSS 3D panels with depth-of-field focus pulls.
import React from 'react';
import { AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame } from 'remotion';

export const FPS = 60;
export const DUR = 18;
export const LIME = '#A3F04A';
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const inout = Easing.bezier(0.65, 0, 0.35, 1);
const p = (t: number, a: number, b: number, e = ease) => interpolate(t, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e });
const win = (t: number, a: number, b: number, fi = 0.35, fo = 0.35) => Math.min(p(t, a, a + fi, inout), 1 - p(t, b - fo, b, inout));

export const FONT = `
@font-face{font-family:I7;src:url(${staticFile('Inter-700.woff2')})}
@font-face{font-family:I5;src:url(${staticFile('Inter-500.woff2')})}`;

/** Shopify bag logo */
export const Bag: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <svg width={size} height={size} viewBox="-50 -55 100 110" style={style}>
    <path d="M-14 -24 C-14 -52 10 -52 12 -24" stroke="#95BF47" strokeWidth="7" fill="none" strokeLinecap="round" />
    <path d="M-40 -26 L22 -30 L30 52 L-46 44 Z" fill="#95BF47" />
    <path d="M22 -30 L38 -26 L48 46 L30 52 Z" fill="#5E8E3E" />
    <text x="-6" y="34" textAnchor="middle" fontFamily="I7" fontSize="66" fill="#fff" transform="skewX(-8)">S</text>
  </svg>
);

export const Glow: React.FC<{ x: number; y: number; r: number; o: number; c?: string }> = ({ x, y, r, o, c = '130,235,50' }) => (
  <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', opacity: o, background: `radial-gradient(circle, rgba(${c},.85) 0%, rgba(${c},.35) 35%, rgba(${c},0) 70%)`, filter: 'blur(30px)' }} />
);

/** caption: words rise out of blur; words wrapped in * are lime and glow; a thin line sweeps under it */
export const Caption: React.FC<{ t: number; t0: number; t1: number; text: string; y: number; size?: number }> = ({ t, t0, t1, text, y, size = 76 }) => {
  if (t < t0 - 0.01 || t > t1 + 0.01) return null;
  const out = p(t, t1 - 0.35, t1, inout);
  const words = text.split(' ');
  let on = false;
  const his = words.map((w) => { const st = w.startsWith('*'); if (st) on = true; const h = on; if (w.endsWith('*')) on = false; return h; });
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: y, textAlign: 'center', fontFamily: 'I7', fontSize: size, lineHeight: 1.15, letterSpacing: -1.5, color: '#fff', opacity: 1 - out, filter: `blur(${out * 14}px)` }}>
      {words.map((w, i) => {
        const hi = his[i];
        const k = p(t, t0 + i * 0.09, t0 + i * 0.09 + 0.5);
        return (
          <span key={i} style={{ display: 'inline-block', marginRight: '0.26em', opacity: k, transform: `translateY(${(1 - k) * 40}px) scale(${0.92 + 0.08 * k})`, filter: `blur(${(1 - k) * 12}px)`, color: hi ? LIME : '#fff', textShadow: hi ? `0 0 30px rgba(140,240,60,.75)` : '0 2px 30px rgba(0,0,0,.6)' }}>
            {w.replace(/\*/g, '')}
          </span>
        );
      })}
      <div style={{ margin: '26px auto 0', height: 3, width: `${p(t, t0 + 0.3, t0 + 1.1) * 62}%`, background: `linear-gradient(90deg, transparent, ${LIME}, transparent)`, opacity: 0.8 }} />
    </div>
  );
};

/** 3D stage: perspective container */
const Stage: React.FC<{ children: React.ReactNode; persp?: number; style?: React.CSSProperties }> = ({ children, persp = 1600, style }) => (
  <div style={{ position: 'absolute', inset: 0, perspective: persp, perspectiveOrigin: '50% 40%', ...style }}>{children}</div>
);
const panel: React.CSSProperties = {
  position: 'absolute', borderRadius: 40, background: 'linear-gradient(160deg, rgba(48,50,48,.92), rgba(22,23,22,.96))',
  border: '1.5px solid rgba(255,255,255,.12)', boxShadow: '0 60px 120px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.12)',
  fontFamily: 'I7', color: '#fff',
};

// ---- product thumbnails (simple original garments)
const Garment: React.FC<{ kind: 'tee' | 'hoodie' | 'cargo' | 'cap'; color: string; size: number }> = ({ kind, color, size }) => {
  const paths = {
    tee: 'M-30 -70 Q0 -60 30 -70 L62 -62 L88 -10 L64 -2 L58 -18 L58 70 L-58 70 L-58 -18 L-64 -2 L-88 -10 L-62 -62 Z',
    hoodie: 'M-34 -62 Q-30 -92 0 -94 Q30 -92 34 -62 L64 -54 L84 40 L62 46 L56 -6 L56 74 L-56 74 L-56 -6 L-62 46 L-84 40 L-64 -54 Z',
    cargo: 'M-50 -80 L50 -80 L56 80 L14 80 L0 -20 L-14 80 L-56 80 Z',
    cap: 'M-60 10 Q-60 -60 0 -62 Q60 -60 60 10 Z M-60 10 L88 10 Q90 30 60 28 L-60 28 Z',
  } as const;
  return (
    <svg width={size} height={size} viewBox="-100 -100 200 200">
      <path d={paths[kind]} fill={color} />
      {kind === 'tee' || kind === 'hoodie' ? <text x="0" y="-8" textAnchor="middle" fontFamily="I7" fontSize="18" fill="rgba(255,255,255,.9)">ECLAIRE</text> : null}
      {kind === 'cargo' ? <path d="M-46 10 h24 v26 h-24 Z M22 10 h24 v26 h-24 Z" fill="rgba(0,0,0,.25)" /> : null}
    </svg>
  );
};

// =============================================================== scenes
export function SceneLogo({ t }: { t: number }) {
  const v = win(t, 0, 2.7, 0.01, 0.4);
  if (v <= 0) return null;
  const k = p(t, 0.1, 1.3);
  const push = p(t, 2.3, 2.7, inout);
  return (
    <AbsoluteFill style={{ opacity: v }}>
      <Glow x={540} y={1000} r={560} o={0.55 + 0.15 * Math.sin(t * 3)} />
      <Stage>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 640, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 26,
          transform: `translateZ(${-600 + 600 * k + push * 900}px) rotateY(${(1 - k) * 55}deg) rotateX(${(1 - k) * -10}deg)`, filter: `blur(${(1 - k) * 18 + push * 20}px)`, transformStyle: 'preserve-3d' }}>
          <Bag size={230} style={{ filter: 'drop-shadow(0 0 40px rgba(150,240,60,.55))' }} />
          <div style={{ fontFamily: 'I7', fontSize: 150, color: '#fff', letterSpacing: -6, transform: 'skewX(-9deg)', textShadow: '0 10px 60px rgba(0,0,0,.6)' }}>shopify</div>
        </div>
      </Stage>
      <Caption t={t} t0={0.9} t1={2.7} text="Tout part de *ton idée.*" y={1290} />
    </AbsoluteFill>
  );
}

const APPS = ['#2b2e2b', '#3a3f39', '#2a332a', '#434843', '#2f3a2c', '#373a37', '#2c312b', '#3d443b', '#2a2d2a', 'SHOP', '#353b34', '#2e322d', '#3b3f3a', '#2b302a', '#40463e', '#30352f'];
export function ScenePhone({ t }: { t: number }) {
  const v = win(t, 2.5, 5.6, 0.3, 0.3);
  if (v <= 0) return null;
  const rise = p(t, 2.5, 3.5);
  const rotY = interpolate(rise, [0, 1], [-38, -14]) + 4 * Math.sin(t * 1.1);
  const rotX = interpolate(rise, [0, 1], [30, 8]);
  const unlock = p(t, 3.4, 3.9);
  const tap = p(t, 4.35, 4.7);
  const zoom = p(t, 4.7, 5.6, Easing.bezier(0.7, 0, 0.84, 0));
  const screen = (
    <div style={{ position: 'absolute', inset: 16, borderRadius: 74, overflow: 'hidden', background: 'radial-gradient(120% 80% at 30% 20%, #3c7d1f 0%, #16320c 45%, #070c06 100%)' }}>
      {/* lock screen clock */}
      <div style={{ position: 'absolute', top: 150, width: '100%', textAlign: 'center', fontFamily: 'I7', fontSize: 150, color: 'rgba(255,255,255,.92)', opacity: 1 - unlock, transform: `translateY(${-unlock * 80}px)`, letterSpacing: -4 }}>9:41</div>
      {/* app grid */}
      <div style={{ position: 'absolute', top: 150, left: 46, right: 46, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '56px 22px', justifyItems: 'center' }}>
        {APPS.map((c, i) => {
          const k = p(t, 3.55 + i * 0.03, 3.95 + i * 0.03, Easing.bezier(0.34, 1.56, 0.64, 1));
          const shop = c === 'SHOP';
          const press = shop ? 1 - 0.12 * Math.sin(Math.PI * tap) : 1;
          return (
            <div key={i} style={{ width: 92, height: 92, borderRadius: 24, background: shop ? '#fff' : c, transform: `scale(${k * press})`, opacity: k, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: shop ? `0 0 ${40 + 60 * tap}px rgba(150,240,60,${0.4 + 0.5 * tap})` : 'none' }}>
              {shop ? <Bag size={74} /> : <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,.12)' }} />}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 40, left: 40, right: 40, height: 150, borderRadius: 50, background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(10px)', opacity: unlock }} />
    </div>
  );
  // zoom: camera dives into the Shopify icon (row 3, col 2)
  const zx = interpolate(zoom, [0, 1], [0, 120]);
  const zy = interpolate(zoom, [0, 1], [0, 20]);
  return (
    <AbsoluteFill style={{ opacity: v }}>
      <Glow x={560} y={900} r={600} o={0.6} />
      <Stage persp={1700}>
        <div style={{ position: 'absolute', left: 540 - 290, top: 300 + (1 - rise) * 900, width: 580, height: 1180,
          transform: `translate(${-zx}px, ${-zy}px) translateZ(${zoom * 1500}px) rotateY(${rotY * (1 - zoom)}deg) rotateX(${rotX * (1 - zoom)}deg)`, transformOrigin: '36% 46%', filter: `blur(${(1 - rise) * 10}px)` }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 90, background: 'linear-gradient(135deg, #3a3c3a, #121312 40%, #2a2b2a)', boxShadow: '0 80px 140px rgba(0,0,0,.75), 0 0 0 2px rgba(255,255,255,.08)' }} />
          {screen}
          <div style={{ position: 'absolute', top: 40, left: 290 - 80, width: 160, height: 46, borderRadius: 23, background: '#000' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: 90, background: 'linear-gradient(115deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,0) 35%)', pointerEvents: 'none' }} />
        </div>
      </Stage>
      <div style={{ position: 'absolute', inset: 0, background: '#0b0c0b', opacity: p(t, 5.25, 5.6) }} />
      <Caption t={t} t0={3.0} t1={5.3} text="Un tap, et *c'est en ligne.*" y={1560} />
    </AbsoluteFill>
  );
}

const PRODUCTS: [string, string, string, 'tee' | 'hoodie' | 'cargo' | 'cap', string][] = [
  ['T-shirt Oversize Eclaire', '39,00 € · 24 en stock', '#E9A7B8', 'tee', '#d8d3ca'],
  ['Hoodie Obsession', '79,00 € · 12 en stock', '#1E2740', 'hoodie', '#cfd6c4'],
  ['Cargo Technique', '89,00 € · 8 en stock', '#3b3a33', 'cargo', '#d9d2c2'],
  ['Casquette Paris', '29,00 € · 30 en stock', '#141416', 'cap', '#d0d0cc'],
];
export function SceneProducts({ t }: { t: number }) {
  const v = win(t, 5.4, 8.9, 0.35, 0.35);
  if (v <= 0) return null;
  const enter = p(t, 5.4, 6.4);
  const focus = 6.9 + 0.0;
  // focus pull: row 1 comes forward & sharp, others blur
  const fk = p(t, 7.2, 7.8) * (1 - p(t, 8.45, 8.9));
  return (
    <AbsoluteFill style={{ opacity: v }}>
      <Glow x={250} y={1050} r={560} o={0.55} />
      <Glow x={900} y={600} r={300} o={0.2} />
      <Stage persp={1500}>
        <div style={{ ...panel, left: 110, top: 360, width: 860, height: 1000, padding: 50, boxSizing: 'border-box', transformStyle: 'preserve-3d',
          transform: `translateZ(${-500 + 500 * enter}px) rotateY(${interpolate(enter, [0, 1], [40, 16]) - 3 * (t - 6)}deg) rotateX(${interpolate(enter, [0, 1], [20, 6])}deg)`, filter: `blur(${(1 - enter) * 14}px)` }}>
          <div style={{ fontSize: 58, letterSpacing: -1.5, filter: `blur(${fk * 6}px)` }}>Produits</div>
          <div style={{ display: 'flex', gap: 16, margin: '22px 0 34px', filter: `blur(${fk * 6}px)` }}>
            {['Tous', 'Actifs', 'Brouillons'].map((x, i) => (
              <div key={x} style={{ padding: '10px 26px', borderRadius: 30, fontSize: 26, background: i === 0 ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.08)', color: i === 0 ? '#111' : 'rgba(255,255,255,.7)' }}>{x}</div>
            ))}
          </div>
          {PRODUCTS.map(([name, sub, col, kind, bg], i) => {
            const k = p(t, focus - 1.1 + i * 0.16, focus - 0.6 + i * 0.16);
            const active = p(t, 6.6 + i * 0.22, 6.8 + i * 0.22) > 0.5;
            const isF = i === 1;
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 28, padding: 18, marginBottom: 20, borderRadius: 26,
                background: isF ? `rgba(70,74,70,${0.5 + 0.4 * fk})` : 'rgba(255,255,255,.05)', border: isF && fk > 0 ? `1.5px solid rgba(255,255,255,${0.2 * fk})` : '1.5px solid transparent',
                opacity: k, transform: `translateX(${(1 - k) * 120}px) translateZ(${isF ? fk * 160 : 0}px) scale(${isF ? 1 + 0.06 * fk : 1})`,
                filter: `blur(${isF ? 0 : fk * 7}px)`, boxShadow: isF ? `0 ${30 * fk}px ${80 * fk}px rgba(0,0,0,.6)` : 'none' }}>
                <div style={{ width: 120, height: 120, borderRadius: 20, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Garment kind={kind} color={col} size={110} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 34, letterSpacing: -0.6 }}>{name}</div>
                  <div style={{ fontFamily: 'I5', fontSize: 25, color: 'rgba(255,255,255,.55)', marginTop: 8 }}>{sub}</div>
                </div>
                <div style={{ padding: '10px 22px', borderRadius: 24, fontSize: 24, background: active ? 'rgba(140,240,60,.2)' : 'rgba(255,255,255,.08)', color: active ? LIME : 'rgba(255,255,255,.55)' }}>{active ? 'Actif' : 'Brouillon'}</div>
                <div style={{ fontSize: 34, color: 'rgba(255,255,255,.4)' }}>›</div>
              </div>
            );
          })}
        </div>
      </Stage>
      <Caption t={t} t0={6.0} t1={8.9} text="T-shirts, hoodies, *cargos.*" y={1520} />
    </AbsoluteFill>
  );
}

// stylised dotted world map (original noise field)
const MAP = (() => {
  const pts: [number, number][] = [];
  for (let y = 0; y < 22; y++) for (let x = 0; x < 52; x++) {
    const u = x / 52, w = y / 22;
    const n = Math.sin(u * 9 + 1) * Math.cos(w * 7) + 0.7 * Math.sin(u * 21 + w * 5) + 0.5 * Math.cos(u * 4 - w * 11);
    if (n > 0.35 && w > 0.08 && w < 0.92) pts.push([x, y]);
  }
  return pts;
})();
export function SceneLive({ t }: { t: number }) {
  const v = win(t, 8.7, 12.3, 0.35, 0.35);
  if (v <= 0) return null;
  const enter = p(t, 8.7, 9.7);
  const dolly = p(t, 8.7, 12.3, Easing.linear);
  const visitors = t > 10.1 ? 1 : 0;
  const pin = p(t, 10.1, 10.6);
  const stat = (label: string, value: string, x: number, w: number, d: number) => (
    <div style={{ ...panel, left: x, top: 230, width: w, height: 330, padding: 30, boxSizing: 'border-box', borderRadius: 30, opacity: p(t, 9.0 + d, 9.5 + d), transform: `translateZ(${(1 - p(t, 9 + d, 9.6 + d)) * -300}px)` }}>
      <div style={{ fontFamily: 'I5', fontSize: 24, color: 'rgba(255,255,255,.6)' }}>{label}</div>
      <svg width={w - 60} height="120" style={{ marginTop: 30 }}><path d={`M0 100 L${(w - 60) * 0.85} 100`} stroke="rgba(255,255,255,.35)" strokeWidth="3" /><circle cx={(w - 60) * 0.85} cy="100" r="7" fill="#fff" /></svg>
      <div style={{ fontSize: 54, marginTop: 10 }}>{value}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ opacity: v }}>
      <Glow x={540} y={1250} r={600} o={0.5} />
      <Stage persp={1400}>
        <div style={{ position: 'absolute', left: 50, top: 640, width: 1400, height: 1000, transformStyle: 'preserve-3d', transformOrigin: '0 0',
          transform: `scale(0.72) translateX(${-120 * dolly + 60}px) translateZ(${-700 + 600 * enter}px) rotateY(${interpolate(enter, [0, 1], [-35, -18]) + 8 * dolly}deg) rotateX(${interpolate(enter, [0, 1], [22, 10])}deg)`, filter: `blur(${(1 - enter) * 14}px)` }}>
          <div style={{ position: 'absolute', left: 0, top: 80, fontFamily: 'I7', fontSize: 64, color: '#fff', letterSpacing: -2 }}>Live View <span style={{ fontFamily: 'I5', fontSize: 26, color: LIME, verticalAlign: 'middle', marginLeft: 16 }}>● En direct</span></div>
          <div style={{ ...panel, left: 0, top: 230, width: 680, height: 330, borderRadius: 30, overflow: 'hidden' }}>
            <svg width="680" height="330" viewBox="0 0 680 330">
              {MAP.map(([x, y], i) => <circle key={i} cx={30 + x * 12} cy={30 + y * 12.5} r="3.2" fill="rgba(255,255,255,.16)" />)}
              {visitors ? (
                <g>
                  <circle cx={30 + 27 * 12} cy={30 + 7 * 12.5} r={10 + 60 * pin} fill="none" stroke={LIME} strokeOpacity={1 - pin} strokeWidth="3" />
                  <circle cx={30 + 27 * 12} cy={30 + 7 * 12.5} r="9" fill={LIME} style={{ filter: 'drop-shadow(0 0 12px #A3F04A)' }} />
                </g>
              ) : null}
            </svg>
            <div style={{ position: 'absolute', left: 30, bottom: 26, fontFamily: 'I5', fontSize: 22, color: 'rgba(255,255,255,.6)' }}>Visiteurs en ce moment</div>
            <div style={{ position: 'absolute', right: 30, bottom: 18, fontSize: 50, color: visitors ? LIME : '#fff' }}>{visitors}</div>
          </div>
          {stat('Ventes totales', '0,00 €', 710, 330, 0.15)}
          {stat('Commandes', '0', 1070, 300, 0.3)}
          <div style={{ position: 'absolute', left: 0, top: 620, fontFamily: 'I7', fontSize: 40, color: '#fff', opacity: p(t, 9.6, 10.1) }}>Comportement clients</div>
          {['Paniers actifs', 'En paiement', 'Achats'].map((x, i) => (
            <div key={x} style={{ ...panel, left: i * 360, top: 700, width: 340, height: 150, borderRadius: 26, padding: 26, boxSizing: 'border-box', fontFamily: 'I5', fontSize: 24, color: 'rgba(255,255,255,.65)', opacity: p(t, 9.8 + i * 0.12, 10.3 + i * 0.12), filter: 'blur(3px)' }}>
              {x}<div style={{ fontFamily: 'I7', fontSize: 44, color: '#fff', marginTop: 14 }}>{i === 0 ? visitors : 0}</div>
            </div>
          ))}
        </div>
      </Stage>
      <Caption t={t} t0={9.5} t1={12.3} text="Quelque part, *quelqu'un te trouve.*" y={1500} size={70} />
    </AbsoluteFill>
  );
}

export function SceneText({ t }: { t: number }) {
  const v = win(t, 12.1, 14.9, 0.4, 0.01);
  if (v <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: v }}>
      <Glow x={460 + 80 * Math.sin(t)} y={960} r={520 + 60 * p(t, 12.1, 14.9)} o={0.6} />
      <Caption t={t} t0={12.3} t1={13.6} text="Vends ce que *tu crées*" y={890} size={90} />
      <Caption t={t} t0={13.6} t1={14.9} text="et vis ta *première vente.*" y={890} size={90} />
    </AbsoluteFill>
  );
}

export function SceneOrder({ t }: { t: number }) {
  if (t < 14.7) return null;
  const k = p(t, 14.7, 15.25, Easing.bezier(0.34, 1.45, 0.64, 1));
  const rings = p(t, 15.0, 16.0);
  const shrink = p(t, 16.15, 16.6, inout);
  const dot = p(t, 16.45, 16.8);
  const logo = p(t, 16.75, 17.3, Easing.bezier(0.34, 1.56, 0.64, 1));
  const end = p(t, 17.55, 18, inout);
  const pw = interpolate(shrink, [0, 1], [760, 70]);
  const ph = interpolate(shrink, [0, 1], [150, 70]);
  return (
    <AbsoluteFill style={{ opacity: 1 - end }}>
      <Glow x={540} y={960} r={interpolate(rings, [0, 1], [380, 640])} o={0.7} />
      <Stage persp={1400}>
        <div style={{ position: 'absolute', left: 540, top: 960, transform: `translate(-50%,-50%) rotateX(${(1 - k) * 50}deg) translateZ(${(1 - k) * -400}px) scale(${1 - 0.6 * dot * (1 - logo)})`, opacity: k * (1 - logo) }}>
          {[3, 2, 1].map((r) => (
            <div key={r} style={{ position: 'absolute', left: '50%', top: '50%', width: pw + r * 90 * rings, height: ph + r * 90 * rings, transform: 'translate(-50%,-50%)', borderRadius: 999,
              border: `3px solid rgba(170,245,90,${(0.85 - r * 0.2) * (1 - shrink)})`, boxShadow: `0 0 30px rgba(140,240,60,${0.4 * (1 - shrink)})`, opacity: rings }} />
          ))}
          <div style={{ position: 'relative', width: pw, height: ph, borderRadius: 999, background: dot > 0 ? `rgba(${interpolate(dot, [0, 1], [30, 200])},${interpolate(dot, [0, 1], [32, 250])},${interpolate(dot, [0, 1], [30, 90])},1)` : 'linear-gradient(180deg, #2b2d2b, #161716)',
            border: '2px solid rgba(190,250,120,.9)', boxShadow: `0 0 ${40 + 80 * dot}px rgba(150,245,60,${0.5 + 0.5 * dot})`, display: 'flex', alignItems: 'center', gap: 24, padding: '0 30px', boxSizing: 'border-box', overflow: 'hidden' }}>
            <div style={{ opacity: 1 - shrink * 2, display: 'flex', alignItems: 'center', gap: 24, whiteSpace: 'nowrap' }}>
              <div style={{ width: 84, height: 84, borderRadius: 22, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bag size={66} /></div>
              <div>
                <div style={{ fontFamily: 'I7', fontSize: 38, color: '#fff' }}>Commande n°1001</div>
                <div style={{ fontFamily: 'I5', fontSize: 26, color: 'rgba(255,255,255,.6)', marginTop: 4 }}>79,00 € · Hoodie Obsession</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 540, top: 900, transform: `translate(-50%,-50%) scale(${logo})`, opacity: logo }}>
          <Bag size={260} style={{ filter: 'drop-shadow(0 0 50px rgba(150,240,60,.7))' }} />
        </div>
      </Stage>
      <div style={{ position: 'absolute', top: 1110, width: '100%', textAlign: 'center', opacity: p(t, 16.95, 17.35), transform: `translateY(${(1 - p(t, 16.95, 17.35)) * 30}px)` }}>
        <div style={{ fontFamily: 'I7', fontSize: 72, color: '#fff', letterSpacing: -2 }}>Lance ta boutique.</div>
        <div style={{ display: 'inline-block', marginTop: 30, padding: '18px 44px', borderRadius: 50, background: LIME, color: '#0b0c0b', fontFamily: 'I7', fontSize: 34 }}>Lien en bio ↗</div>
      </div>
    </AbsoluteFill>
  );
}

export const Ad: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(130% 90% at 50% 45%, #171917 0%, #0b0c0b 60%, #060706 100%)', overflow: 'hidden' }}>
      <style>{FONT}</style>
      <SceneLogo t={t} />
      <ScenePhone t={t} />
      <SceneProducts t={t} />
      <SceneLive t={t} />
      <SceneText t={t} />
      <SceneOrder t={t} />
      {/* vignette + fade out */}
      <AbsoluteFill style={{ background: 'radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,.6) 100%)' }} />
    </AbsoluteFill>
  );
};
