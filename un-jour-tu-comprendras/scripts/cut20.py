"""20-second cut (English subtitles): six excerpts of the film, graded, subtitled after the grade,
joined with short crossfades. Needs out/seg/s1..s6.mp4 (clean renders), out/subs_en.mov, public/soundtrack.wav."""
import os, subprocess
SEGDIR = os.environ.get('SEGDIR', 'out/seg')
OUT = os.environ.get('OUT', 'out/un-jour-tu-comprendras_20s_EN.mp4')

FPS = 30
# segment -> source frame range (inclusive), rendered by the clean composition
SEGS = [(243, 324), (1117, 1208), (1527, 1658), (1981, 2112), (2203, 2325), (2383, 2460)]
XV = 0.12  # video crossfade (s)
XA = XV  # audio crossfade: same length, keeps lips/voice in sync
GRADE = ("split=2[b{i}][h{i}];[h{i}]curves=all='0/0 0.6/0 1/1',gblur=sigma=26[gl{i}];[b{i}][gl{i}]blend=all_mode=screen:all_opacity=0.5,"
         "curves=r='0/0.01 0.5/0.5 1/1':g='0/0.015 0.5/0.49 1/0.98':b='0/0.05 0.5/0.48 1/0.9',eq=contrast=1.07:saturation=0.94:gamma=1.02,"
         "vignette=angle=PI/5.2,noise=alls=5:allf=t+u")

inputs, fc = [], []
for i, (a, b) in enumerate(SEGS):
    inputs += ['-i', f'{SEGDIR}/s{i+1}.mp4']
inputs += ['-i', os.environ.get('SUBS', 'out/subs_en.mov'), '-i', 'public/soundtrack.wav']
n = len(SEGS)
SUB, AUD = n, n + 1
fc.append(f'[{SUB}:v]split={n}' + ''.join(f'[sub{i}]' for i in range(n)))
fc.append(f'[{AUD}:a]asplit={n}' + ''.join(f'[aud{i}]' for i in range(n)))
durs = []
for i, (a, b) in enumerate(SEGS):
    t0, t1 = a / FPS, (b + 1) / FPS
    durs.append(t1 - t0)
    fc.append(f'[{i}:v]scale=in_range=full:out_range=tv,setpts=PTS-STARTPTS,' + GRADE.format(i=i) + f'[g{i}]')
    fc.append(f'[sub{i}]trim=start={t0:.4f}:end={t1:.4f},setpts=PTS-STARTPTS[s{i}]')
    fc.append(f'[g{i}][s{i}]overlay=format=auto,format=yuv420p,settb=1/{FPS},fps={FPS}[v{i}]')
    fc.append(f'[aud{i}]atrim=start={t0:.4f}:end={t1:.4f},asetpts=PTS-STARTPTS[a{i}]')
# chain crossfades
prev, off = 'v0', 0.0
for i in range(1, n):
    off += durs[i - 1] - XV
    fc.append(f'[{prev}][v{i}]xfade=transition=fade:duration={XV}:offset={off:.4f}[x{i}]')
    prev = f'x{i}'
total = sum(durs) - XV * (n - 1)
fc.append(f'[{prev}]fade=t=in:st=0:d=0.3,fade=t=out:st={total-0.5:.3f}:d=0.5,format=yuv420p[vout]')
prev = 'a0'
for i in range(1, n):
    fc.append(f'[{prev}][a{i}]acrossfade=d={XA}:c1=qsin:c2=qsin[y{i}]')
    prev = f'y{i}'
fc.append(f'[{prev}]afade=t=in:st=0:d=0.15,afade=t=out:st={total-0.6:.3f}:d=0.6,loudnorm=I=-14:TP=-1.0:LRA=11,aresample=44100[aout]')
cmd = ['ffmpeg', '-loglevel', 'error', '-y', *inputs, '-filter_complex', ';'.join(fc), '-map', '[vout]', '-map', '[aout]',
       '-t', f'{total:.3f}', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-level', '4.2', '-r', '30',
       '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
       '-c:a', 'aac', '-b:a', '320k', '-ar', '44100', '-movflags', '+faststart', OUT]
subprocess.run(cmd, check=True)
print(f'done: {OUT} ({total:.2f}s)')
