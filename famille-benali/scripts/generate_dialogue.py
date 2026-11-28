"""Génère tout le dialogue d'un épisode en UNE prise multi-voix (ElevenLabs text-to-dialogue, eleven_v3),
pour que les personnages se répondent avec un vrai rythme de conversation.

Sorties dans episodes/<ep>/audio/ :
  dialogue_brut.mp3   la prise telle que livrée
  dialogue.wav        nettoyée (passe-haut, de-esser, compression douce, 48 kHz) – sans écho ni réverbe
  timing.json         segments par réplique + timing caractère par caractère (sous-titres et lip-sync)
  par_perso/<perso>.wav  pistes isolées par personnage (le reste en silence) pour la synchro labiale

Usage : python scripts/generate_dialogue.py ep01 [--seed N]
"""
import base64, os, subprocess, sys
import numpy as np, soundfile as sf
from common import ROOT, jload, jsave, post, voices

CHAIN = ('highpass=f=70,deesser=i=0.15,acompressor=threshold=-20dB:ratio=2:attack=10:release=150:makeup=1.5,'
         'aresample=48000')


def main(ep, seed):
    d = os.path.join(ROOT, 'episodes', ep)
    sc, vs = jload(os.path.join(d, 'script.json')), voices()
    lines = sc['repliques']
    missing = {l['perso'] for l in lines} - {k for k, v in vs.items() if v.get('voice_id')}
    if missing:
        sys.exit(f'Voix manquantes : {missing}. Lancer scripts/create_voices.py')
    inputs = [{'text': l['texte'], 'voice_id': vs[l['perso']]['voice_id']} for l in lines]
    n = sum(len(i['text']) for i in inputs)
    print(f'{len(inputs)} répliques, {n} caractères')
    res = post('/v1/text-to-dialogue/with-timestamps',
               {'inputs': inputs, 'model_id': 'eleven_v3', 'language_code': 'fr', 'seed': seed,
                'settings': {'stability': 0.5}}, params={'output_format': 'mp3_44100_192'}, timeout=600)
    a = os.path.join(d, 'audio')
    os.makedirs(os.path.join(a, 'par_perso'), exist_ok=True)
    raw = os.path.join(a, 'dialogue_brut.mp3')
    open(raw, 'wb').write(base64.b64decode(res['audio_base64']))
    wav = os.path.join(a, 'dialogue.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', CHAIN, '-ac', '1', wav], check=True)
    x, sr = sf.read(wav, dtype='float32')
    segs = []
    for s in res['voice_segments']:
        i = s['dialogue_input_index']
        segs.append({'ligne': i, 'perso': lines[i]['perso'], 'debut': s['start_time_seconds'],
                     'fin': s['end_time_seconds'], 'c0': s['character_start_index'], 'c1': s['character_end_index']})
    jsave(os.path.join(a, 'timing.json'), {'duree': len(x) / sr, 'segments': segs, 'alignment': res.get('alignment'),
                                           'seed': seed})
    for p in {l['perso'] for l in lines}:
        y = np.zeros_like(x)
        for s in segs:
            if s['perso'] == p:
                i0, i1 = int(s['debut'] * sr), int(s['fin'] * sr)
                y[i0:i1] = x[i0:i1]
        sf.write(os.path.join(a, 'par_perso', p + '.wav'), y, sr)
    print(f'durée {len(x) / sr:.1f}s -> {wav}')


if __name__ == '__main__':
    seed = int(sys.argv[sys.argv.index('--seed') + 1]) if '--seed' in sys.argv else 1
    main(sys.argv[1], seed)
