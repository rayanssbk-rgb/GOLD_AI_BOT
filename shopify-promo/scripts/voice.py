"""French voice-over (ElevenLabs v3, voice 'JT'), one continuous take, 2 takes; Whisper checks every word.
Writes out/v/take*.wav + word timings."""
import os, re, json, subprocess, unicodedata, difflib, requests, numpy as np, soundfile as sf
from faster_whisper import WhisperModel
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'out', 'v'); os.makedirs(OUT, exist_ok=True)
VOICE = 'MckrPTWwhRk9MdBsg8c4'
TEXT = ("[calm] Tout part d'une idée. "
        "Un téléphone, quelques minutes… et ta boutique est en ligne. "
        "Hoodies, t-shirts, cargos : tes produits sont prêts à être vendus. "
        "[intrigued] Et quelque part, quelqu'un découvre ta marque. "
        "Puis arrive ce petit son que tout le monde attend… "
        "[excited] Ta première vente. Lance-toi sur Shopify.")
H = {'xi-api-key': 'dummy', 'Content-Type': 'application/json'}
def norm(s):
    s = re.sub(r'\[[^\]]*\]', ' ', s)
    s = unicodedata.normalize('NFD', s.lower().replace('’', "'"))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r"[^a-z ]", ' ', s.replace("'", ' ').replace('-', ' ')).split()
asr = WhisperModel('small', device='cpu', compute_type='int8')
CHAIN = ('highpass=f=70,equalizer=f=140:t=q:w=1:g=1.5,deesser=i=0.2,acompressor=threshold=-22dB:ratio=2.2:attack=8:release=140:makeup=2,'
         'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,aresample=48000')
for take, stab in enumerate((0.5, 0.0)):
    r = requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_192', headers=H,
                      json={'text': TEXT, 'model_id': 'eleven_v3', 'language_code': 'fr', 'seed': 300 + take, 'voice_settings': {'stability': stab, 'similarity_boost': 0.8}}, timeout=300)
    if r.status_code != 200: print(take, r.status_code, r.text[:200]); continue
    mp3 = os.path.join(OUT, f'take{take}.mp3'); open(mp3, 'wb').write(r.content)
    wav = mp3[:-4] + '.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-af', CHAIN, '-ac', '1', wav], check=True)
    x, sr = sf.read(wav, dtype='float32')
    x16 = np.interp(np.arange(0, len(x), sr / 16000), np.arange(len(x)), x).astype(np.float32)
    segs, _ = asr.transcribe(x16, language='fr', word_timestamps=True)
    ws = [(w.word.strip(), round(w.start, 2), round(w.end, 2)) for s in segs for w in s.words]
    diff = [d for d in difflib.ndiff(norm(TEXT), norm(' '.join(w[0] for w in ws))) if d[0] in '+-']
    print({'take': take, 'dur': round(len(x) / sr, 2), 'diff': diff}, flush=True)
    json.dump(ws, open(os.path.join(OUT, f'take{take}_words.json'), 'w'), ensure_ascii=False)
