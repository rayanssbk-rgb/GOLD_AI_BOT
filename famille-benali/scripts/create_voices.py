"""Crée les voix permanentes des personnages avec ElevenLabs Voice Design (eleven_ttv_v3).

Pour chaque personnage SANS voice_id dans config/voices.json :
  1. génère 3 essais à partir de la description vocale de personnages.json ;
  2. les enregistre dans voix/previews/<perso>/essai{1,2,3}.mp3 ;
  3. choisit l'essai le plus intelligible (transcription Whisper comparée au texte) ;
  4. crée la voix dans le compte ElevenLabs et écrit son voice_id dans config/voices.json.

Un voice_id déjà présent n'est JAMAIS remplacé : c'est ce qui garantit la même voix d'un épisode à l'autre.
Pour changer volontairement une voix : supprimer son entrée dans config/voices.json et relancer.

Usage : python scripts/create_voices.py [perso ...]
"""
import base64, os, subprocess, sys, tempfile
from common import ROOT, characters, voices, voices_path, jsave, post, match_ratio

SEED = {'mohamed': 4801, 'nadia': 4401, 'yanis': 2201, 'adam': 1601, 'ines': 1901}


def transcribe(model, mp3):
    with tempfile.NamedTemporaryFile(suffix='.wav') as w:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-ac', '1', '-ar', '16000', w.name], check=True)
        import soundfile as sf
        x, _ = sf.read(w.name, dtype='float32')
        segs, _ = model.transcribe(x, language='fr')
        return ' '.join(s.text for s in segs)


def main(only):
    from faster_whisper import WhisperModel
    asr = WhisperModel('small', device='cpu', compute_type='int8')
    chars, vs = characters(), voices()
    for pid, c in chars.items():
        if only and pid not in only:
            continue
        if vs.get(pid, {}).get('voice_id'):
            print(f'{pid}: voix déjà fixée ({vs[pid]["voice_id"]}), on n’y touche pas')
            continue
        v = c['voix']
        res = post('/v1/text-to-voice/design', {
            'voice_description': v['description'], 'model_id': 'eleven_ttv_v3', 'text': v['texte_essai'],
            'seed': SEED.get(pid), 'guidance_scale': 5, 'loudness': 0.5,
        }, params={'output_format': 'mp3_44100_192'})
        out = os.path.join(ROOT, 'voix', 'previews', pid)
        os.makedirs(out, exist_ok=True)
        jsave(os.path.join(out, 'essais.json'), {'text': res['text'], 'generated_voice_ids': [p['generated_voice_id'] for p in res['previews']]})
        scored = []
        for i, p in enumerate(res['previews'], 1):
            mp3 = os.path.join(out, f'essai{i}.mp3')
            with open(mp3, 'wb') as f:
                f.write(base64.b64decode(p['audio_base_64']))
            r = match_ratio(res['text'], transcribe(asr, mp3))
            scored.append((r, i, p['generated_voice_id']))
            print(f'{pid} essai{i}: intelligibilité {r:.2f}, {p["duration_secs"]:.1f}s')
        best = max(scored)
        made = post('/v1/text-to-voice', {
            'voice_name': f'Benali - {c["nom"].split()[0]}', 'voice_description': v['description'],
            'generated_voice_id': best[2], 'labels': {'serie': 'famille-benali', 'personnage': pid},
            'played_not_selected_voice_ids': [g for _, _, g in scored if g != best[2]],
        })
        vs[pid] = {'voice_id': made['voice_id'], 'nom': c['nom'], 'essai_retenu': f'essai{best[1]}.mp3',
                   'modele_tts': 'eleven_v3', 'reglages': {'stability': 0.5, 'similarity': 0.8}}
        jsave(voices_path(), vs)
        print(f'{pid}: voix créée -> {made["voice_id"]} (essai{best[1]})')


if __name__ == '__main__':
    main(set(sys.argv[1:]))
