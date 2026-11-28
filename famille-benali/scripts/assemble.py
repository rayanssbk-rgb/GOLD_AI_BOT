"""Montage final : clips du service vidéo (episodes/<ep>/clips/Pxx.mp4, déjà synchronisés aux lèvres)
recadrés en 1080x1920, coupés à la durée exacte de chaque plan, enchaînés, puis dialogue + ambiance + sous-titres.
Un plan sans clip est remplacé par un fond neutre (signalé dans la console).
Usage : python scripts/assemble.py ep01 [--clips DOSSIER] [--ambiance fichier.wav]
"""
import os, subprocess, sys, tempfile
from common import ROOT, jload


def main(ep, clips, amb):
    d = os.path.join(ROOT, 'episodes', ep)
    dec = jload(os.path.join(d, 'decoupage.json'))
    clips = clips or os.path.join(d, 'clips')
    tmp = tempfile.mkdtemp()
    parts = []
    for p in dec['plans']:
        dur = p['fin'] - p['debut']
        src = os.path.join(clips, p['id'] + '.mp4')
        out = os.path.join(tmp, p['id'] + '.mp4')
        if os.path.exists(src):
            cmd = ['-i', src, '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1']
        else:
            print('plan manquant :', p['id'])
            cmd = ['-f', 'lavfi', '-i', 'color=c=0x15171c:s=1080x1920:r=30']
        subprocess.run(['ffmpeg', '-v', 'error', '-y', *cmd, '-t', f'{dur:.3f}', '-an', '-c:v', 'libx264', '-crf', '16',
                        '-pix_fmt', 'yuv420p', out], check=True)
        parts.append(out)
    lst = os.path.join(tmp, 'l.txt')
    open(lst, 'w').write(''.join(f"file '{x}'\n" for x in parts))
    ass = os.path.join(d, 'sous-titres', 'episode.ass').replace(':', '\\:')
    ins = ['-f', 'concat', '-safe', '0', '-i', lst, '-i', os.path.join(d, 'audio', 'dialogue.wav')]
    af = '[1:a]loudnorm=I=-14:TP=-1.5,apad[a]'
    if amb:
        ins += ['-stream_loop', '-1', '-i', amb]
        af = '[2:a]volume=0.12[b];[1:a][b]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5,apad[a]'
    end = dec['plans'][-1]['fin']
    out = os.path.join(d, f'{ep}.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', f'[0:v]ass=\'{ass}\'[v];{af}', '-map', '[v]',
                    '-map', '[a]', '-t', f'{end:.3f}', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt',
                    'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out], check=True)
    print('->', out)


if __name__ == '__main__':
    a = sys.argv
    opt = lambda k: a[a.index(k) + 1] if k in a else None
    main(a[1], opt('--clips'), opt('--ambiance'))
