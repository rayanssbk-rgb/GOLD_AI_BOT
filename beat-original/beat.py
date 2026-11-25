# Original dark trap / rage instrumental (150 BPM, F minor) — fully synthesized, no samples.
# usage: python beat.py out.wav
import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
BPM = 150
STEP = 60 / BPM / 4  # 16th note
BAR = STEP * 16
rng = np.random.default_rng(2026)

# structure (bars): intro 4, drop A 12, break 4, drop B 12, outro 4
SECTIONS = [('intro', 4), ('dropA', 12), ('break', 4), ('dropB', 12), ('outro', 4)]
NBARS = sum(n for _, n in SECTIONS)
DUR = NBARS * BAR + 3.0
N = int(SR * DUR)
bus = {k: np.zeros(N) for k in ['kick', 'b808', 'clap', 'hat', 'lead', 'bell', 'pad', 'fx']}
pan_bus = {k: 0.0 for k in bus}

def sec_of(bar):
    b = 0
    for name, n in SECTIONS:
        if bar < b + n: return name, bar - b
        b += n
    return 'end', 0

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def lp(x, fc, order=2): return sosfilt(butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos'), x)
def hp(x, fc, order=2): return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def put(name, t, sig, g=1.0):
    i = int(t * SR)
    if i >= N: return
    sig = sig[: N - i]
    bus[name][i:i + len(sig)] += sig * g

# ------------------------------------------------------------------ instruments
def kick():
    n = int(SR * 0.45); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t / 0.025)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18)
    click = hp(rng.standard_normal(n), 2000) * np.exp(-t / 0.004) * 0.5
    return np.tanh(2.2 * (s + click))

def b808(f0, dur, glide_to=None):
    n = int(SR * (dur + 0.15)); t = np.arange(n) / SR
    f = np.full(n, f0)
    if glide_to:
        g0 = int(SR * dur * 0.55)
        k = np.clip((np.arange(n) - g0) / (SR * 0.09), 0, 1)
        f = f0 * (glide_to / f0) ** k
    f = f * (1 + 0.9 * np.exp(-t / 0.02))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.18 * np.sin(2 * ph)
    env = np.minimum(1, t / 0.003) * np.where(t < dur, np.exp(-t / (dur * 1.4 + 0.2)), np.exp(-dur / (dur * 1.4 + 0.2)) * np.exp(-(t - dur) / 0.03))
    return np.tanh(3.2 * s * env) * 0.9

def clap():
    n = int(SR * 0.5); t = np.arange(n) / SR
    noise = bp(rng.standard_normal(n), 900, 5000)
    env = np.zeros(n)
    for d in (0, 0.011, 0.022):
        i = int(d * SR); env[i:] += np.exp(-(t[: n - i]) / 0.012)
    env += 0.5 * np.exp(-t / 0.16) * (t > 0.03)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.6
    return np.tanh(1.8 * (noise * env * 0.9 + body))

def hat(open_=False):
    n = int(SR * (0.35 if open_ else 0.06)); t = np.arange(n) / SR
    s = hp(rng.standard_normal(n), 7500, 4)
    return s * np.exp(-t / (0.11 if open_ else 0.014)) * (0.7 if open_ else 1)

def supersaw(m, dur, bright=1.0, voices=7):
    n = int(SR * (dur + 0.25)); t = np.arange(n) / SR
    f = mtof(m); s = np.zeros(n)
    for v in range(voices):
        det = (v - (voices - 1) / 2) * 0.11  # semitone spread
        fv = f * 2 ** (det / 12)
        ph = (fv * t + rng.random()) % 1.0
        s += 2 * ph - 1
    s /= voices
    s += 0.4 * np.sign(np.sin(2 * np.pi * f / 2 * t))  # sub square, octave down
    env = np.minimum(1, t / 0.004) * np.where(t < dur, 1 - 0.25 * np.minimum(1, t / dur), 0.75 * np.exp(-(t - dur) / 0.06))
    s = lp(s, 900 + 5200 * bright, 2)
    return np.tanh(2.6 * s) * env

def bell(m, dur=0.5):
    n = int(SR * (dur + 0.6)); t = np.arange(n) / SR; f = mtof(m)
    s = np.sin(2 * np.pi * f * t + 1.8 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t / 0.15))
    return s * np.exp(-t / 0.35) * np.minimum(1, t / 0.002)

def pad(ms, dur):
    n = int(SR * dur); t = np.arange(n) / SR; s = np.zeros(n)
    for m in ms:
        for d in (-0.08, 0.0, 0.08):
            s += np.sin(2 * np.pi * mtof(m + d) * t) + 0.3 * np.sin(2 * np.pi * mtof(m + 12 + d) * t)
    s = lp(s, 1600) / (len(ms) * 3)
    return s * np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.6)

def riser(dur):
    n = int(SR * dur); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n); chunk = 2048
    for i in range(0, n, chunk):
        fc = 300 + 9000 * (i / n) ** 2
        out[i:i + chunk] = bp(noise[i:i + chunk], fc, min(fc * 1.6, SR * 0.45))
    f = 200 * 2 ** (3 * t / dur)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    return (out * 0.9 + tone) * (t / dur) ** 2

def impact():
    n = int(SR * 2.2); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.7)
    crash = hp(rng.standard_normal(n), 3000) * np.exp(-t / 0.5) * 0.35
    return np.tanh(1.5 * boom) + crash

# ------------------------------------------------------------------ composition (F minor)
F1, Ab1, Bb1, Db1, Eb1, F2 = mtof(29), mtof(32), mtof(34), mtof(25), mtof(27), mtof(41)
# 808 pattern over 2 bars: (step, length in steps, freq, glide target)
P808 = [(0, 5, F1, None), (6, 3, F1, None), (10, 6, Ab1, None),
        (16, 5, Db1, None), (22, 3, Db1, None), (26, 6, Eb1, F2)]
P808_B = [(0, 5, F1, None), (6, 3, F1, None), (10, 6, Bb1, None),
          (16, 5, Ab1, None), (22, 4, Eb1, None), (27, 5, F1, F2)]
KICKS = [0, 6, 10, 16, 22, 26, 29]
# lead motif: (step, len, midi) over 2 bars — original melody
LEAD_A = [(0, 2, 72), (3, 2, 68), (6, 2, 72), (8, 1, 75), (10, 2, 73), (12, 3, 72), (15, 1, 68),
          (16, 2, 72), (19, 2, 68), (22, 2, 65), (24, 2, 67), (26, 2, 68), (28, 4, 63)]
LEAD_B = [(0, 2, 77), (3, 2, 75), (6, 2, 73), (8, 1, 72), (10, 2, 73), (12, 3, 75), (15, 1, 77),
          (16, 2, 80), (19, 2, 77), (22, 2, 75), (24, 2, 73), (26, 2, 72), (28, 4, 68)]
BELL = [77, 80, 84, 80, 77, 75, 72, 75]
CHORDS = [[53, 56, 60], [49, 53, 56], [51, 55, 58], [53, 56, 60]]  # Fm, Db, Eb, Fm

for bar in range(NBARS):
    sec, bi = sec_of(bar)
    t0 = bar * BAR
    pair = bar // 2
    half = bar % 2  # which bar of the 2-bar phrase
    # pads everywhere except the drops' full energy (still there, quieter)
    if half == 0:
        put('pad', t0, pad(CHORDS[pair % 4], 2 * BAR), 0.55 if sec in ('intro', 'break', 'outro') else 0.3)
    if sec in ('dropA', 'dropB'):
        pat = P808 if (pair % 2 == 0 or sec == 'dropA') else P808_B
        for st, ln, f, gl in pat:
            if (st >= 16) != bool(half): continue
            put('b808', t0 + (st % 16) * STEP, b808(f, ln * STEP, gl))
        for st in KICKS:
            if (st >= 16) == bool(half): put('kick', t0 + (st % 16) * STEP, kick())
        put('clap', t0 + 8 * STEP, clap())
        if bi % 4 == 3: put('clap', t0 + 15 * STEP, clap(), 0.5)
        # hats: 8ths, 16ths in drop B, rolls at phrase ends
        for st in range(0, 16, 2 if sec == 'dropA' else 1):
            put('hat', t0 + st * STEP, hat(), 0.55 + 0.25 * (st % 4 == 0))
        if bi % 2 == 1:
            for r in range(6):  # 32nd-triplet roll into the next bar
                put('hat', t0 + 12 * STEP + r * STEP * 4 / 6, hat(), 0.4 + 0.08 * r)
        if bi % 4 == 0: put('hat', t0 + 14 * STEP, hat(True), 0.5)
        mot = LEAD_A if (sec == 'dropA' or pair % 2 == 0) else LEAD_B
        for st, ln, m in mot:
            if (st >= 16) != bool(half): continue
            put('lead', t0 + (st % 16) * STEP, supersaw(m, ln * STEP * 0.9, 1.0), 0.55)
            if sec == 'dropB': put('lead', t0 + (st % 16) * STEP, supersaw(m - 12, ln * STEP * 0.9, 0.6), 0.3)
        if sec == 'dropB':
            for k in range(8):
                put('bell', t0 + k * 2 * STEP, bell(BELL[(k + bar * 8) % 8] + 12, 0.2), 0.12)
    elif sec == 'intro':
        # filtered lead + bells, hats come in on bar 3
        for st, ln, m in LEAD_A:
            if (st >= 16) != bool(half): continue
            put('lead', t0 + (st % 16) * STEP, supersaw(m, ln * STEP * 0.9, 0.08 + 0.12 * bi), 0.5)
        for k in range(8): put('bell', t0 + k * 2 * STEP, bell(BELL[k] , 0.3), 0.18)
        if bi >= 2:
            for st in range(0, 16, 2): put('hat', t0 + st * STEP, hat(), 0.45)
    elif sec == 'break':
        for k in range(8): put('bell', t0 + k * 2 * STEP, bell(BELL[(k + 3) % 8], 0.4), 0.22)
        if bi == 1: put('b808', t0, b808(F1, 8 * STEP), 0.8)
    elif sec == 'outro':
        for st, ln, m in LEAD_A:
            if (st >= 16) != bool(half): continue
            put('lead', t0 + (st % 16) * STEP, supersaw(m, ln * STEP * 0.9, 0.35 - 0.08 * bi), 0.45 * (1 - bi / 4))
        if bi == 0: put('b808', t0, b808(F1, 16 * STEP), 0.9)

# risers + impacts into each drop
for name, start in (('dropA', 4), ('dropB', 20)):
    put('fx', start * BAR - 2 * BAR, riser(2 * BAR), 0.5)
    put('fx', start * BAR, impact(), 0.8)
put('fx', 16 * BAR - BAR, riser(BAR), 0.35)

# ------------------------------------------------------------------ mix
# sidechain: duck lead/pad/bell under kicks + 808 attacks
kick_env = np.abs(bus['kick'])
kick_env = np.convolve(kick_env, np.ones(int(SR * 0.01)) / int(SR * 0.01), mode='same')
duck = 1 - 0.55 * np.clip(kick_env / (kick_env.max() + 1e-9) * 3, 0, 1)
duck = lp(duck, 30, 1)
for k in ('lead', 'pad', 'bell'): bus[k] *= duck

def reverb(x, seconds=1.6, mix=0.25):
    n = int(SR * seconds); t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t / (seconds / 5))
    ir = lp(ir, 6000)
    wet = fftconvolve(x, ir)[: len(x)]
    wet /= (np.abs(wet).max() + 1e-9) / (np.abs(x).max() + 1e-9)
    return x * (1 - mix) + wet * mix

GAIN = {'kick': 0.75, 'b808': 0.5, 'clap': 0.9, 'hat': 0.32, 'lead': 1.25, 'bell': 0.9, 'pad': 0.5, 'fx': 0.45}
L = np.zeros(N); R = np.zeros(N)
for k, x in bus.items():
    if k in ('lead', 'clap', 'bell', 'pad'):
        x = reverb(x, 1.8 if k != 'clap' else 1.0, 0.22 if k != 'pad' else 0.4)
    x = x * GAIN[k]
    if k in ('lead', 'pad'):
        # stereo width: tiny Haas delay on one side
        d = int(SR * 0.012)
        L += x; R += np.concatenate([np.zeros(d), x[:-d]])
    elif k == 'hat':
        L += x * 0.8; R += x * 1.0
    elif k == 'bell':
        L += x * 1.0; R += x * 0.75
    else:
        L += x; R += x
mix = np.stack([L, R], 1)
mix = np.stack([hp(mix[:, 0], 28), hp(mix[:, 1], 28)], 1)
mix /= np.abs(mix).max() + 1e-9
mix = np.tanh(1.6 * mix) / np.tanh(1.6)  # glue / soft clip
fade = int(SR * 2.5)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix *= 0.9
import wave
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('duration', round(DUR, 2), 's')
