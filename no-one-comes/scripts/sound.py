"""Original sound design (no music): synthesised car interior, road, wind, city, water, footsteps,
ignition, breaths; dialogue placed on the timeline with a light space per scene.
Writes public/soundtrack.wav (48 kHz stereo). Run with any Python that has numpy + soundfile."""
import json, os, re
import numpy as np, soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
DUR = 40.0
N = int(SR * DUR)
rng = np.random.default_rng(11)

# ---- timeline (kept in sync with src/timeline.js)
tl = open(os.path.join(ROOT, 'src', 'timeline.js')).read()
LINE = {k: round(float(v) * 30) / 30 for k, v in re.findall(r"(\w+): s\(([\d.]+)\)", tl.split('export const SC')[0])}
SC = {k: (round(float(a) * 30) / 30, round(float(b) * 30) / 30 if b != 'DURATION' else DUR) for k, a, b in re.findall(r"(\w+): \[(?:s\()?([\d.]+)\)?, (?:s\()?([\d.]+|DURATION)\)?\]", tl.split('export const SC')[1].split('export const BEAT')[0])}
SC['car1'] = (0.0, SC['car1'][1])
IGN = 33.9
STAND = 30.6
WORDS = json.load(open(os.path.join(ROOT, 'scripts', 'words.json')))
t = np.arange(N) / SR


def env(a, b, fade=0.25):
    """1 inside [a, b] with raised-cosine fades."""
    e = np.clip(np.minimum((t - a) / fade + 0.5, (b - t) / fade + 0.5), 0, 1)
    return 0.5 - 0.5 * np.cos(np.pi * e)


def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    s = 0.0
    for i in range(len(x)):  # small loops only on short buffers
        s = (1 - a) * x[i] + a * s
        y[i] = s
    return y


def fft_filter(x, lo, hi, slope=1.0):
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(fr)
    if lo:
        g *= 1 / (1 + (lo / np.maximum(fr, 1)) ** (2 * slope))
    if hi:
        g *= 1 / (1 + (fr / hi) ** (2 * slope))
    return np.fft.irfft(X * g, len(x))


def noise(n=N):
    return rng.standard_normal(n)


def norm(x):
    return x / (np.abs(x).max() + 1e-9)


L = np.zeros(N)
R = np.zeros(N)


def add(x, gain=1.0, pan=0.0, at=0.0):
    i = int(at * SR)
    x = x[: N - i]
    L[i:i + len(x)] += x * gain * np.sqrt(0.5 * (1 - pan))
    R[i:i + len(x)] += x * gain * np.sqrt(0.5 * (1 + pan))


# ---------------------------------------------------------------- beds

X = np.fft.rfft(noise()); fr = np.fft.rfftfreq(N, 1 / SR); X /= np.sqrt(np.maximum(fr, 20)); pink = norm(np.fft.irfft(X, N))

# car interior (dusk drive): engine hum + road rumble + wind on the glass
def car_bed(a, b, start_move=None):
    e = env(a, b, 0.3)
    rpm = np.full(N, 2100.0) if start_move is None else np.interp(t, [a, start_move - 0.4, start_move, start_move + 0.6, start_move + 2.5, b], [0, 0, 1500, 3400, 2500, 2700])
    f0 = rpm / 60 * 2  # 4-cyl firing
    ph = 2 * np.pi * np.cumsum(f0) / SR
    eng = sum(np.sin(k * ph + k) / k ** 1.3 for k in range(1, 7)) * (rpm > 50)
    eng = fft_filter(eng * (1 + 0.15 * np.sin(ph * 0.5)), 30, 900) * 0.6
    if start_move is not None:
        moving = np.clip((t - start_move - 0.3) / 2.0, 0, 1)
    else:
        moving = np.ones(N)
    road = fft_filter(pink, 25, 500) * 0.9 * moving
    wind = fft_filter(noise(), 400, 2600) * 0.08 * moving
    return (norm(eng) * 0.5 + norm(road) * 0.55 + wind) * e

car1 = car_bed(*SC['car1'])
add(car1, 0.22)
# passing street lights / palms: soft whooshes every ~1.6 s
for k in np.arange(0.8, SC['car1'][1] - 0.3, 1.64):
    n = int(0.7 * SR)
    w = fft_filter(noise(n), 300, 3000) * np.hanning(n) ** 2
    add(w, 0.05, pan=0.6, at=k)

car2 = car_bed(*SC['car2'], start_move=IGN + 0.45)
add(car2, 0.24)

# ignition: key click, starter whine, catch
add(np.r_[np.zeros(int(0.02 * SR)), np.exp(-np.arange(int(0.05 * SR)) / 200.0) * noise(int(0.05 * SR))], 0.25, at=IGN - 0.1)
n = int(0.55 * SR)
tt = np.arange(n) / SR
starter = np.sin(2 * np.pi * (180 + 40 * np.sin(2 * np.pi * 9 * tt)) * tt) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 9 * tt)))
add(fft_filter(starter, 80, 2500) * np.hanning(n), 0.12, at=IGN)
add(fft_filter(noise(int(0.4 * SR)), 30, 300) * np.exp(-np.arange(int(0.4 * SR)) / (0.12 * SR)), 0.5, at=IGN + 0.45)

# rooftop: wind gusts + distant city + far traffic; horn, siren
def roof_bed(a, b, night):
    e = env(a, b, 0.35)
    gust = 0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t + 1) * np.sin(2 * np.pi * 0.037 * t)
    wind = fft_filter(noise(), 150, 1100) * gust
    city = fft_filter(pink, 40, 350) * (0.9 if night else 0.7)
    return (norm(wind) * 0.35 + norm(city) * 0.4) * e

add(roof_bed(*SC['roof1'], False), 0.2)
add(roof_bed(*SC['roof2'], True), 0.2)
def horn(at, f=392, d=0.5, g=0.04, pan=-0.4):
    n = int(d * SR); tt = np.arange(n) / SR
    x = (np.sign(np.sin(2 * np.pi * f * tt)) + np.sign(np.sin(2 * np.pi * f * 1.26 * tt))) * np.minimum(1, np.minimum(tt / 0.02, (d - tt) / 0.05))
    add(fft_filter(x, 200, 1800), g, pan, at)
horn(12.3); horn(15.9, 349, 0.35, 0.03, 0.5); horn(29.4, 440, 0.4, 0.025, -0.6)
# distant siren sweeping through dusk
n = int(3.5 * SR); tt = np.arange(n) / SR
sir = np.sin(2 * np.pi * np.cumsum(700 + 250 * np.sin(2 * np.pi * 0.6 * tt)) / SR)
add(fft_filter(sir, 300, 1600) * np.hanning(n), 0.012, 0.6, 14.0)

# Vince's footsteps on the gravel roof as he walks up
for k in np.arange(LINE['v1'] - 2.45, LINE['v1'] - 0.35, 0.52):
    n = int(0.18 * SR)
    step = fft_filter(noise(n), 300, 5000) * np.exp(-np.arange(n) / (0.035 * SR))
    add(step, 0.11, 0.35, k)
# Dre stands up: cloth + scuffs
add(fft_filter(noise(int(0.7 * SR)), 800, 6000) * np.hanning(int(0.7 * SR)), 0.05, 0.0, STAND)
for k in (STAND + 0.55, STAND + 0.95):
    n = int(0.2 * SR); add(fft_filter(noise(n), 200, 3000) * np.exp(-np.arange(n) / (0.04 * SR)), 0.09, 0.0, k)

# aerial: high wind + city swell
a, b = SC['aerial']
add((norm(fft_filter(noise(), 200, 2000)) * 0.4 + norm(fft_filter(pink, 30, 400)) * 0.5) * env(a, b, 0.4), 0.2)

# pier: water lapping on the pilings, boards, footsteps on wood (POV + Knox), a far buoy bell
a, b = SC['pier']
lap = np.zeros(N)
for k in np.arange(a, b, 0.9):
    n = int(1.2 * SR)
    w = fft_filter(noise(n), 120, 1400) * np.hanning(n) ** 3
    i = int((k + rng.uniform(0, 0.5)) * SR)
    lap[i:i + n] += w[: max(0, min(n, N - i))]
add(norm(lap) * env(a, b, 0.4), 0.13, -0.3)
add(norm(fft_filter(pink, 40, 300)) * env(a, b, 0.4), 0.08)
stop = LINE['k3'] - 8 / 30
for who, off, pan, g in (('pov', 0.0, -0.1, 0.13), ('knox', 0.23, 0.4, 0.1)):
    for k in np.arange(a + 0.25 + off, stop, 1 / (0.27 * 30 / np.pi)):
        n = int(0.22 * SR)
        thud = fft_filter(noise(n), 60, 1800) * np.exp(-np.arange(n) / (0.03 * SR))
        knock = np.sin(2 * np.pi * 140 * np.arange(n) / SR) * np.exp(-np.arange(n) / (0.025 * SR))
        add(thud * 0.7 + knock * 0.5, g, pan, k)
n = int(2.5 * SR); tt = np.arange(n) / SR
bell = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) for f, d in ((523, 1.4), (1290, 2.2), (2210, 3.0)))
add(bell * 0.3, 0.03, -0.7, 21.6)

# end: low air, one sub hit when the card lands
a, b = SC['end']
add(norm(fft_filter(pink, 30, 200)) * env(a, b, 0.6), 0.05)
n = int(2.2 * SR); tt = np.arange(n) / SR
add(np.sin(2 * np.pi * (48 - 14 * tt) * tt) * np.exp(-tt * 2.2), 0.35, 0, LINE['v4'] - 0.05)

# breaths before Dre's lines
def breath(at, d=0.5, g=0.05):
    n = int(d * SR)
    add(fft_filter(noise(n), 500, 4500) * np.hanning(n) ** 1.5, g, 0, at)
breath(LINE['d0'] - 0.55, 0.55, 0.06)
breath(LINE['d1'] - 0.6)
breath(LINE['d2'] - 0.5, 0.45, 0.06)

# ---------------------------------------------------------------- dialogue
def space(x, scene):
    """tiny early reflections so each line sits in its place"""
    taps = {'car': [(0.006, 0.18), (0.011, 0.12)], 'roof': [(0.03, 0.06), (0.07, 0.04)], 'pier': [(0.02, 0.07), (0.05, 0.05)], 'end': [(0.04, 0.08), (0.09, 0.05)]}[scene]
    y = x.copy()
    for d, g in taps:
        k = int(d * SR)
        y[k:] += x[:-k] * g
    return y

SCENE = {'k1': 'car', 'd0': 'car', 'd1': 'roof', 'v1': 'roof', 'v2': 'roof', 'k2': 'pier', 'k3': 'pier', 'v3': 'roof', 'd2': 'roof', 'k4': 'car', 'v4': 'end'}
PAN = {'k1': 0.3, 'd0': 0.0, 'd1': -0.1, 'v1': 0.2, 'v2': 0.2, 'k2': 0.25, 'k3': 0.1, 'v3': 0.2, 'd2': -0.05, 'k4': 0.3, 'v4': 0.0}
VO_L = np.zeros(N); VO_R = np.zeros(N)
voice_on = np.zeros(N)
for lid, at in LINE.items():
    x, sr = sf.read(os.path.join(ROOT, 'public', 'voice', f'{lid}.wav'), dtype='float64')
    if x.ndim > 1: x = x.mean(1)
    x = np.interp(np.arange(0, len(x), sr / SR), np.arange(len(x)), x)
    x = space(x / (np.abs(x).max() + 1e-9) * 0.8, SCENE[lid])
    i = int(at * SR); x = x[: N - i]
    p = PAN[lid]
    VO_L[i:i + len(x)] += x * np.sqrt(0.5 * (1 - p)); VO_R[i:i + len(x)] += x * np.sqrt(0.5 * (1 + p))
    voice_on[i:i + len(x)] = 1

# gentle ducking of the effects under the dialogue
k = np.exp(-1 / (0.15 * SR))
d = np.zeros(N); s = 0.0
vo = np.convolve(voice_on, np.ones(int(0.05 * SR)) / int(0.05 * SR), 'same')
d = vo  # already smooth enough at this scale
gL = 1 - 0.45 * d
L = L * gL + VO_L * 1.0
R = R * gL + VO_R * 1.0
mix = np.stack([L, R], 1)
mix = np.tanh(mix / np.abs(mix).max() * 1.6) / np.tanh(1.6) * 0.89
fade = np.clip((DUR - t) / 0.4, 0, 1)[:, None]
sf.write(os.path.join(ROOT, 'public', 'soundtrack.wav'), mix * fade, SR, subtype='PCM_16')
print('soundtrack.wav', DUR, 's', 'lines', len(LINE))
