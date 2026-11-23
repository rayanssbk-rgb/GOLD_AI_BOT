"""35 s cut of out/obsession.mp4: removes silent stretches (no narration is cut or sped up).
Hard cuts at shot changes, one 0.5 s dissolve into the dawn, fade out at the end."""
import subprocess, numpy as np, soundfile as sf, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = f'{ROOT}/out/obsession.mp4', f'{ROOT}/out/obsession_35s.mp4'
SEG = [(0, 6.6), (8.6, 12.8), (13.4, 16.4), (17.0, 23.4), (24.0, 26.4), (27.0, 29.3), (30.0, 32.3), (33.9, 42.2)]
XF = 0.5  # dissolve between the last two segments
total = sum(b - a for a, b in SEG) - XF
print('length', round(total, 3))
# ---- audio: 40 ms crossfades at hard cuts, 0.5 s overlap at the dissolve
tmp = f'{ROOT}/out/_a.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-ac', '2', '-ar', '48000', tmp], check=True)
x, sr = sf.read(tmp); os.remove(tmp)
out = np.zeros((int(round(total * sr)) + sr, 2))
pos = 0.0  # start of this segment on the output timeline
D = 0.04
for i, (a, b) in enumerate(SEG):
    last = i == len(SEG) - 1
    d = XF if last else (D if i > 0 else 0)
    pre = 0 if last else d / 2           # hard cuts: centred 40 ms crossfade
    post = 0 if last or i == len(SEG) - 2 else D / 2
    seg = x[int(round((a - pre) * sr)): int(round((b + post) * sr))].copy()
    i0 = int(round((pos - (XF if last else pre)) * sr))
    k = int(round(d * sr))
    if k:
        r = np.linspace(0, 1, k)[:, None]
        seg[:k] *= r
        out[i0:i0 + k] *= (1 - r)
        out[i0 + k:] = 0
    out[i0:i0 + len(seg)] += seg
    pos += (b - a) - (XF if last else 0)
out = out[: int(round(total * sr))]
fade = np.clip((total - np.arange(len(out)) / sr) / 0.8, 0, 1)[:, None]
out *= fade
sf.write(f'{ROOT}/out/_a35.wav', out.astype(np.float32), sr)
# ---- video
fc, labels = [], []
for i, (a, b) in enumerate(SEG):
    fc.append(f'[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS,settb=AVTB,fps=30[v{i}]')
labels = ''.join(f'[v{i}]' for i in range(len(SEG) - 1))
fc.append(f'{labels}concat=n={len(SEG) - 1}:v=1:a=0,settb=AVTB,fps=30[pre]')
pre_len = sum(b - a for a, b in SEG[:-1])
fc.append(f'[pre][v{len(SEG) - 1}]xfade=transition=fade:duration={XF}:offset={pre_len - XF}[x]')
fc.append(f'[x]fade=t=out:st={total - 0.8}:d=0.8,format=yuv420p[v]')
fc.append('[1:a]loudnorm=I=-14:TP=-1.0:LRA=11[a]')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-i', f'{ROOT}/out/_a35.wav', '-filter_complex', ';'.join(fc),
                '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-t', f'{total}', OUT], check=True)
os.remove(f'{ROOT}/out/_a35.wav')
print('done', OUT)
