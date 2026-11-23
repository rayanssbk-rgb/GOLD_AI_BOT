"""Photographic-style profile picture: hooded figure from behind, backlit by a sunrise over a hazy city.
Rendered at 2x then downsampled. Output: out/photo-profil.png (1080x1080)."""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S = 2160
rng = np.random.default_rng(7)
yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) / S
SUN = (0.575, 0.40)  # just above-right of the hood
HOR = 0.70


def lerp(a, b, t):
    return a + (b - a) * t


def gradient(y, stops):
    out = np.zeros(y.shape + (3,), np.float32)
    ps = [p for p, _ in stops]
    cs = [np.array(c, np.float32) / 255 for _, c in stops]
    for i in range(3):
        out[..., i] = np.interp(y, ps, [c[i] for c in cs])
    return out


def fbm(w, h, octaves=6, sx=1.0, sy=1.0, seed=0):
    r = np.random.default_rng(seed)
    acc = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0
    for o in range(octaves):
        gw, gh = max(2, int(4 * sx * 2 ** o)), max(2, int(4 * sy * 2 ** o))
        g = Image.fromarray((r.random((gh, gw)) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        acc += amp * np.asarray(g, np.float32) / 255
        tot += amp
        amp *= 0.55
    return acc / tot


def blur(a, r):
    """Gaussian approx: three separable box blurs (cumulative sums), edge-padded."""
    a = a.astype(np.float32)
    k = max(1, int(round(r * 1.15)))
    for ax in (0, 1):
        for _ in range(3):
            pad = [(0, 0)] * a.ndim
            pad[ax] = (k + 1, k)
            c = np.cumsum(np.pad(a, pad, mode='edge'), axis=ax)
            hi = np.take(c, np.arange(2 * k + 1, c.shape[ax]), axis=ax)
            lo = np.take(c, np.arange(0, c.shape[ax] - 2 * k - 1), axis=ax)
            a = (hi - lo) / (2 * k + 1)
    return a


# ---------- sky ----------
sky = gradient(yy, [(0, (38, 48, 74)), (0.25, (92, 88, 112)), (0.45, (190, 132, 118)), (0.6, (244, 170, 110)), (HOR, (255, 214, 150)), (1, (255, 214, 150))])
d = np.sqrt(((xx - SUN[0]) * 1.0) ** 2 + ((yy - SUN[1]) * 1.1) ** 2)
sky += np.array([1.0, 0.78, 0.5])[None, None] * (0.55 * np.exp(-d / 0.16) + 0.35 * np.exp(-d / 0.05))[..., None]

# clouds: stretched fbm, thin layers, lit from below near the sun
n = fbm(S, S, 7, sx=0.6, sy=2.2, seed=3)
band = np.clip(1 - np.abs(yy - 0.33) / 0.2, 0, 1) ** 1.5
cov = np.clip((n - 0.46) * 4.5, 0, 1) * band
cloud_dark = np.array([88, 70, 92], np.float32) / 255
cloud_lit = np.array([255, 196, 150], np.float32) / 255
lit = np.clip(np.exp(-d / 0.28) * 1.4, 0, 1)[..., None]
ccol = lerp(cloud_dark, cloud_lit, lit)
# brighter rims on cloud undersides
edge = np.clip(cov - blur(cov, 6) * 0.9, 0, 1)
sky = lerp(sky, ccol, cov[..., None] * 0.85) + edge[..., None] * lit * np.array([1, 0.8, 0.55]) * 1.5

# ---------- city: three skyline layers with atmospheric haze ----------
img = sky.copy()
haze_col = np.array([255, 200, 150], np.float32) / 255


def skyline(seed, base, hmin, hmax, wmin, wmax, haze, win, dark):
    r = np.random.default_rng(seed)
    m = Image.new('L', (S, S), 0)
    dr = ImageDraw.Draw(m)
    wins = np.zeros((S, S), np.float32)
    x = -50
    while x < S + 50:
        w = r.uniform(wmin, wmax) * S
        h = r.uniform(hmin, hmax) * S
        # towers near the sun are taller (downtown)
        h *= 1 + 0.6 * np.exp(-((x / S - SUN[0]) / 0.18) ** 2) * r.random()
        top = base * S - h
        dr.rectangle([x, top, x + w, S], fill=255)
        if r.random() < 0.35:  # setback top
            dr.rectangle([x + w * 0.2, top - h * 0.12, x + w * 0.8, top], fill=255)
        if r.random() < 0.25:  # antenna
            dr.rectangle([x + w * 0.5 - 2, top - h * 0.25, x + w * 0.5 + 2, top], fill=255)
        if win > 0:
            cw, chh = max(2, int(w / 26)), max(3, int(S * 0.0032))
            for wy in range(int(top + 10), int(base * S), chh * 2):
                for wx in range(int(x + 6), int(x + w - 6), cw * 2):
                    if r.random() < win:
                        wins[wy:wy + chh, max(0, wx):max(0, wx + cw)] = r.uniform(0.25, 0.8)
        x += w + r.uniform(-0.2, 0.6) * w * 0.3
    mask = np.asarray(m, np.float32) / 255
    col = lerp(np.array(dark, np.float32) / 255, haze_col, haze)
    # vertical haze: building bases dissolve in mist
    mist = np.clip((yy - (base - 0.12)) / 0.12, 0, 1)[..., None] * 0.6
    layer = lerp(col[None, None], haze_col[None, None] * 0.95, mist)
    layer = layer + wins[..., None] * np.array([1, 0.75, 0.45]) * 0.5 * mask[..., None]
    return mask, layer


for seed, base, hmin, hmax, wmin, wmax, haze, win, dark in [
    (11, 0.76, 0.05, 0.16, 0.025, 0.06, 0.82, 0.0, (110, 80, 90)),
    (12, 0.80, 0.06, 0.22, 0.04, 0.08, 0.62, 0.04, (80, 58, 72)),
    (13, 0.86, 0.10, 0.34, 0.06, 0.13, 0.35, 0.08, (46, 34, 46)),
]:
    m, layer = skyline(seed, base, hmin, hmax, wmin, wmax, haze, win, dark)
    m = blur(m, 1.2)
    img = lerp(img, layer, m[..., None])

# low mist band at the horizon
img = lerp(img, haze_col[None, None], (np.exp(-((yy - 0.79) / 0.06) ** 2) * 0.35 * fbm(S, S, 4, 1.5, 0.8, 9))[..., None])

# rooftop ledge (foreground, out of focus)
ledge = (yy > 0.9).astype(np.float32)
img = lerp(img, np.array([0.05, 0.04, 0.04])[None, None], blur(ledge, 6)[..., None])

img = blur(img, 3.5)  # shallow depth of field: background slightly out of focus

# ---------- hooded figure ----------
def catmull(pts, n=24):
    pts = [pts[0]] + pts + [pts[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = map(np.array, pts[i - 1:i + 3])
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(np.array(pts[-2], float))
    return [tuple(p * S / 1080) for p in out]


body = [
    (282, 1120), (276, 990), (280, 890), (298, 836), (336, 804), (398, 784), (438, 764),
    (452, 726), (447, 668), (439, 606), (441, 548), (458, 498), (490, 461), (530, 442),
    (550, 437), (580, 447), (613, 475), (635, 521), (645, 581), (641, 641), (633, 701),
    (642, 748), (684, 777), (742, 797), (784, 826), (802, 882), (806, 985), (800, 1120),
]
pts = np.array(catmull(body, 40))
# fabric wrinkles: displace the outline along its normal with smooth noise
tang = np.gradient(pts, axis=0)
nrm = np.stack([tang[:, 1], -tang[:, 0]], 1)
nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-6
t = np.arange(len(pts))
wob = sum(np.sin(t * f + ph) * a for f, ph, a in [(0.05, 1.0, 3.0), (0.13, 2.0, 1.8), (0.31, 0.5, 0.9)])
pts = pts + nrm * wob[:, None]
fm = Image.new('L', (S, S), 0)
ImageDraw.Draw(fm).polygon([tuple(p) for p in pts], fill=255)
fig = blur(np.asarray(fm, np.float32) / 255, 1.4)

# fabric: very dark, faint folds and a hood seam
fab = np.full((S, S, 3), [0.022, 0.02, 0.024], np.float32)
folds = fbm(S, S, 5, 3, 1, 21)
fab *= (0.75 + 0.6 * folds)[..., None]
seam = np.exp(-((xx - 0.502 - (yy - 0.4) * 0.02) / 0.0016) ** 2) * ((yy > 0.4) & (yy < 0.69))
fab -= seam[..., None] * 0.012
# shoulder crease shadows / highlights
fab += (np.exp(-(((xx - 0.36) / 0.08) ** 2 + ((yy - 0.84) / 0.05) ** 2)) * 0.02)[..., None]

# rim light: inner edge of the silhouette, stronger towards the sun
inner = np.clip(fig - blur(fig * 0, 1), 0, 1)
edge_in = np.clip(fig - blur(fig, 4), 0, 1) * 2.0
dir_w = np.clip(1.25 - np.sqrt((xx - SUN[0]) ** 2 + (yy - SUN[1]) ** 2) * 2.4, 0.05, 1) ** 1.5
rim = (edge_in * dir_w)[..., None] * np.array([1.0, 0.72, 0.42])
fab = fab + rim * 0.9
up = np.clip(fig - np.roll(fig, 28, axis=0), 0, 1)
up = blur(up, 14) * fig
fab = fab + up[..., None] * np.array([0.16, 0.11, 0.09]) * (0.4 + dir_w[..., None])
fuzz = np.clip(fig - blur(fig, 1.5), 0, 1) * (0.5 + fbm(S, S, 3, 40, 40, 33)) * dir_w
fab = fab + (fuzz * 2.4 * np.clip(1.3 - yy * 1.4, 0, 1))[..., None] * np.array([1.0, 0.8, 0.5])
img = lerp(img, fab, fig[..., None])

# light wrap: the bright background bleeds over the silhouette edge
wrap = blur(img * (1 - fig[..., None]), 14) * (fig - blur(fig, 3) * 0)[..., None] * 0.0
bg_glow = blur(img * (1 - fig[..., None]), 18)
img = img + bg_glow * (fig * (1 - blur(fig, 4) + 0.0))[..., None] * 0.0
edgeband = np.clip(blur(fig, 5) - blur(fig, 2) * 0, 0, 1) * fig
img = img + bg_glow * (fig * np.clip(1 - blur(fig, 5), 0, 1) * 1.2 * dir_w)[..., None]

# ---------- lens: bloom, sun flare, ghosts ----------
lum = img.mean(-1)
hi = np.clip(img * np.clip((lum - 0.78) / 0.22, 0, 1)[..., None], 0, None)
img = img + blur(hi, 30) * 0.7 + blur(hi, 90) * 0.5
# sun core peeking above the hood
sd = np.sqrt((xx - SUN[0]) ** 2 + (yy - SUN[1]) ** 2)
img = img + (np.exp(-sd / 0.012) * 1.6)[..., None] * np.array([1, 0.95, 0.85]) * (1 - fig[..., None] * 0.97)
# anamorphic streak
img = img + (np.exp(-np.abs(yy - SUN[1]) / 0.0035) * np.exp(-np.abs(xx - SUN[0]) / 0.25) * 0.35)[..., None] * np.array([1, 0.8, 0.55])
# flare ghosts along the axis through the centre
for t, rad, a in [(-0.35, 0.025, 0.08), (-0.7, 0.05, 0.05), (-1.1, 0.012, 0.1)]:
    gx, gy = 0.5 + (SUN[0] - 0.5) * t, 0.5 + (SUN[1] - 0.5) * t
    g = np.clip(1 - np.sqrt((xx - gx) ** 2 + (yy - gy) ** 2) / rad, 0, 1) ** 0.6
    img = img + (g * a * (1 - fig))[..., None] * np.array([1, 0.75, 0.5])

# ---------- grade: filmic tone map, split-tone, vignette, grain ----------
img = np.clip(img, 0, None)
img = img / (1 + img * 0.28) * 1.18  # soft shoulder
img = np.clip(img, 0, 1)
shadows = (1 - img.mean(-1, keepdims=True)) ** 2
img = img + shadows * np.array([-0.01, 0.0, 0.025]) * 1.0  # teal shadows
img = np.clip(img, 0, 1) ** np.array([0.98, 1.0, 1.05])
img = (img - 0.5) * 1.06 + 0.5
v = np.sqrt((xx - 0.5) ** 2 + (yy - 0.48) ** 2)
img *= (1 - np.clip((v - 0.35) / 0.5, 0, 1) ** 1.6 * 0.55)[..., None]
img = np.clip(img, 0, 1)

out = Image.fromarray((img * 255).astype(np.uint8)).resize((1080, 1080), Image.LANCZOS)
a = np.asarray(out, np.float32)
grain = rng.normal(0, 4.5, (1080, 1080, 1)).astype(np.float32)
a = np.clip(a + grain * (0.6 + 0.4 * (1 - a.mean(-1, keepdims=True) / 255)), 0, 255)
Image.fromarray(a.astype(np.uint8)).save('out/photo-profil.png', optimize=True)
print('ok')
