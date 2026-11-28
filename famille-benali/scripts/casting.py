"""Casting de voix réelles (bibliothèque ElevenLabs, voix clonées de vraies personnes marocaines) parlant français.
Chaque candidate dit la même réplique du personnage ; on mesure :
  - intelligibilité : transcription Whisper (fr) comparée au texte ;
  - accent : probabilité « français » selon Whisper (plus elle est basse, plus l'accent est marqué).
Sorties : voix/casting/<perso>/<nom>.mp3, voix/casting/<perso>_ecoute.mp3 (toutes à la suite), casting.json
Usage : python scripts/casting.py
"""
import os, subprocess, requests
import numpy as np, soundfile as sf
from common import ROOT, API, headers, jsave, match_ratio

LIGNES = {
    'mohamed': "[angry] Wach nta hmeq ?! Deux cents euros ! Moi je travaille toute la semaine, et toi tu jettes l'argent par la fenêtre ? Hchouma, wallah, hchouma !",
    'nadia': "[shouting] Baraka ! Vous allez encore crier comme ça toute la soirée ? Wallah je fais à manger, je range, et vous… yallah, à table, ça refroidit !",
    'yanis': "[casual] Wesh papa, écoute-moi, khoya… c'est pas une dépense, c'est un investissement. Dans six mois je suis à mon compte, wallah c'est carré.",
    'adam': "[laughs] Non mais khoya, chouf-toi, t'es matrixé ! Tu parles de trading toute la journée et t'as même pas de quoi payer un kebab. J'suis mort !",
    'ines': "[whispering, amused] Chut… je filme. Non mais chouf sa tête, wallah j'en peux plus. Celle-là, je la poste direct, c'est mieux que Netflix.",
}
CANDIDATS = {
    'mohamed': {'Yassin': 'HDOMjJHzRAmQp1WILXWb', 'Tariq': 'hiDWCdbsrOy64l833ab2', 'Jawad': 'PmGnwGtnBs40iau7JfoF',
                'Badr': 'pNCAEmZFNur1TpjR9TC0', 'Rachid': '0Up3glsGKvZx3M5JI0XB', 'Adil': 'j3nEsGUwbVLzxIkOwfXY'},
    'nadia': {'Ghizlane': 'OfGMGmhShO8iL9jCkXy8', 'Ghalia': 'ugVysa6SU3kBjf7zmeSV', 'Loubna': 'C5sH6vPhsC46AKaQmXXJ'},
    'yanis': {'KarimBen': 'y7xXnNGaYeVHZS9szDxN', 'Mehdi': 'Vsm8jlUqY4LxvQNtr7R6', 'Houssam': 'NMWQDQipWXm8HlCLKapi',
              'Khalil': 'NrhVFquWMOHTRNOAY8AO', 'Ali': '5lXEHh42xcasVuJofypc'},
    'adam': {'Anas': 'JyOZ8fOJkYGmajIlFsJ4', 'Soljatech': '9wgywDFq3hOfIPOhPVMc', 'Abderrahmane': 'pchObSjcWci9U7IOuAsg',
             'Hamid': 'A9ATTqUUQ6GHu0coCz8t', 'Ezzine': 'hIvt4L9VXpeewKZtybZ7'},
    'ines': {'Loubna': 'C5sH6vPhsC46AKaQmXXJ', 'Ghalia': 'ugVysa6SU3kBjf7zmeSV', 'Ghizlane': 'OfGMGmhShO8iL9jCkXy8'},
}


def load16(mp3):
    w = mp3[:-4] + '.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-ac', '1', '-ar', '16000', w], check=True)
    x, _ = sf.read(w, dtype='float32'); os.remove(w)
    return x


def main():
    from faster_whisper import WhisperModel
    asr = WhisperModel('small', device='cpu', compute_type='int8')
    out = os.path.join(ROOT, 'voix', 'casting'); res = {}
    for perso, cands in CANDIDATS.items():
        d = os.path.join(out, perso); os.makedirs(d, exist_ok=True); res[perso] = []
        for nom, vid in cands.items():
            mp3 = os.path.join(d, nom + '.mp3')
            if not os.path.exists(mp3):
                r = requests.post(f'{API}/v1/text-to-speech/{vid}', params={'output_format': 'mp3_44100_192'}, headers=headers(),
                                  json={'text': LIGNES[perso], 'model_id': 'eleven_v3', 'language_code': 'fr', 'seed': 7,
                                        'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8}}, timeout=300)
                if r.status_code != 200: print(perso, nom, r.status_code, r.text[:200]); continue
                open(mp3, 'wb').write(r.content)
            x = load16(mp3)
            segs, info = asr.transcribe(x, language='fr')
            intel = match_ratio(LIGNES[perso], ' '.join(s.text for s in segs))
            _, info2 = asr.transcribe(x[:16000 * 10])
            pfr = dict(info2.all_language_probs or []).get('fr', 0)
            res[perso].append({'nom': nom, 'voice_id': vid, 'intelligibilite': round(intel, 2), 'proba_fr': round(pfr, 3), 'duree': round(len(x) / 16000, 1)})
            print(perso, nom, res[perso][-1], flush=True)
        # fichier d'écoute : annonce bip + candidates à la suite
        lst = os.path.join(d, 'l.txt')
        with open(lst, 'w') as f:
            for c in res[perso]:
                f.write(f"file '{os.path.join(d, c['nom'] + '.mp3')}'\nfile '{os.path.join(out, 'pause.mp3')}'\n")
        if not os.path.exists(os.path.join(out, 'pause.mp3')):
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=f=880:d=0.15:sample_rate=44100',
                            '-af', 'volume=0.2,adelay=500,apad=whole_dur=1.3', '-ac', '1', '-b:a', '192k', os.path.join(out, 'pause.mp3')], check=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-ac', '1', '-b:a', '192k', os.path.join(out, f'{perso}_ecoute.mp3')], check=True)
        os.remove(lst)
    jsave(os.path.join(out, 'casting.json'), res)


if __name__ == '__main__':
    main()
