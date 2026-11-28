"""Animatique de l'épisode : vraies voix + sous-titres synchronisés + découpage plan par plan sur fond neutre.
Ce N'EST PAS l'épisode animé : c'est la piste de montage qui sert à valider rythme, voix et sous-titres
avant de payer la génération des images. Une fois les clips du service vidéo dans episodes/<ep>/clips/Pxx.mp4,
scripts/assemble.py les remplace.
Usage : python scripts/make_animatic.py ep01
"""
import os, subprocess, sys
from common import ROOT, jload

FR = {'mohamed': 'MOHAMED', 'nadia': 'NADIA', 'yanis': 'YANIS', 'adam': 'ADAM', 'ines': 'INÈS'}


def esc(s):
    return s.replace('\\', '\\\\').replace(':', '\\:').replace("'", '’').replace(',', '\\,')


def main(ep):
    d = os.path.join(ROOT, 'episodes', ep)
    dec = jload(os.path.join(d, 'decoupage.json'))
    end = dec['plans'][-1]['fin']
    font = '/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf'
    dt = []
    for p in dec['plans']:
        en = f"between(t,{p['debut']:.2f},{p['fin']:.2f})"
        who = ' + '.join(FR[x] for x in p['persos'])
        dt.append(f"drawtext=fontfile={font}:text='{p['id']}':fontsize=64:fontcolor=white@0.9:x=(w-tw)/2:y=360:enable='{en}'")
        dt.append(f"drawtext=fontfile={font}:text='{esc(who)}':fontsize=50:fontcolor=0xF2C14E:x=(w-tw)/2:y=460:enable='{en}'")
        dt.append(f"drawtext=fontfile={font}:text='{esc(p['decor'].upper())} – {esc(p['cadre'][:46])}':fontsize=30:fontcolor=white@0.6:x=(w-tw)/2:y=540:enable='{en}'")
    ass = os.path.join(d, 'sous-titres', 'episode.ass').replace(':', '\\:')
    vf = ','.join(dt) + f",drawtext=fontfile={font}:text='ANIMATIQUE – images 3D à générer':fontsize=30:fontcolor=white@0.45:x=(w-tw)/2:y=140,ass='{ass}'"
    out = os.path.join(d, 'animatique.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', f'color=c=0x15171c:s=1080x1920:r=30:d={end:.2f}',
                    '-i', os.path.join(d, 'audio', 'dialogue.wav'), '-vf', vf, '-af', 'loudnorm=I=-14:TP=-1.5,apad',
                    '-t', f'{end:.2f}', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', out], check=True)
    print('->', out)


if __name__ == '__main__':
    main(sys.argv[1])
