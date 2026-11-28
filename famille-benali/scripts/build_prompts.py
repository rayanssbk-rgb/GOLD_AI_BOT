"""Prépare tout ce qu'il faut envoyer au service vidéo IA, sans rien générer ni dépenser.

1. personnages/fiches/<perso>.txt : prompt de fiche de référence (turnaround face / 3/4 / profil + expressions),
   à générer UNE fois ; l'image validée devient la référence fixe du personnage pour tous les épisodes.
2. episodes/<ep>/plans/<Pxx>/ : prompt.txt (style + décor + personnages + action + caméra),
   dialogue.wav (extrait du plan) et voix_<perso>.wav (voix isolée de celui qui parle, pour le lip-sync).
Usage : python scripts/build_prompts.py ep01
"""
import os, subprocess, sys
from common import ROOT, jload

NEG = 'children cartoon, flat 2D, anime, plastic skin, deformed hands, extra fingers, text, watermark, logo, brand marks'


def main(ep):
    pj = jload(os.path.join(ROOT, 'personnages', 'personnages.json'))
    style, chars = pj['style_global'], pj['personnages']
    decors = jload(os.path.join(ROOT, 'decors', 'decors.json'))
    fd = os.path.join(ROOT, 'personnages', 'fiches'); os.makedirs(fd, exist_ok=True)
    for pid, c in chars.items():
        with open(os.path.join(fd, pid + '.txt'), 'w', encoding='utf-8') as f:
            f.write(f'{style}\n\nCharacter reference sheet, neutral light grey background, soft studio lighting. '
                    f'Front view, three-quarter view, side view, full body, plus four facial expressions '
                    f'(neutral, laughing, angry, surprised). Same face, same hairstyle, same outfit in every view.\n\n'
                    f'{c["apparence"]}\n\nNEGATIVE: {NEG}\n')
    d = os.path.join(ROOT, 'episodes', ep)
    dec = jload(os.path.join(d, 'decoupage.json'))
    wav = os.path.join(d, 'audio', 'dialogue.wav')
    for p in dec['plans']:
        od = os.path.join(d, 'plans', p['id']); os.makedirs(od, exist_ok=True)
        dc = decors[p['decor']]
        who = '\n'.join(f'- {chars[x]["nom"].split()[0]}: {chars[x]["apparence"]} (match the reference sheet exactly)' for x in p['persos'])
        dur = p['fin'] - p['debut']
        with open(os.path.join(od, 'prompt.txt'), 'w', encoding='utf-8') as f:
            f.write(f'{style}\n\nSETTING: {dc["description"]}\nLIGHTING: {dc["lumiere"]}\n\nCHARACTERS:\n{who}\n\n'
                    f'ACTION: {p["action"]}\nCAMERA: {p["cadre"]}. Vertical 9:16 framing, cinematic, fluid natural body '
                    f'motion, characters react to each other.\nDURATION: {dur:.1f}s (generate 5s, trimmed in edit)\n'
                    f'LIP-SYNC: {chars[p["parle"]]["nom"].split()[0]} speaks, use voix_{p["parle"]}.wav\n\nNEGATIVE: {NEG}\n')
        cut = ['-ss', f'{p["debut"]:.3f}', '-t', f'{dur:.3f}']
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, *cut, os.path.join(od, 'dialogue.wav')], check=True)
        iso = os.path.join(d, 'audio', 'par_perso', p['parle'] + '.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', iso, *cut, os.path.join(od, f'voix_{p["parle"]}.wav')], check=True)
    print(f'{len(chars)} fiches, {len(dec["plans"])} plans prêts')


if __name__ == '__main__':
    main(sys.argv[1])
