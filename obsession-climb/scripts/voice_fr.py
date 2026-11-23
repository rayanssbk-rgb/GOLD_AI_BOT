"""French narration (ElevenLabs, voice 'Tristan Grech', multilingual v2), one clip per sentence,
two takes each, Whisper (fr) checks the words. Writes public/voice_fr/<id>.wav + scripts/words_fr.json."""
import json, os, re, subprocess, unicodedata, requests, numpy as np, soundfile as sf
from faster_whisper import WhisperModel
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = 'hv6gVog5LgtIUX88Nmq8'
NARR = os.environ.get('NARR', 'narration_fr.json'); VDIR = os.environ.get('VDIR', 'voice_fr'); SPEED = float(os.environ.get('SPEED', '0.95'))
P = json.load(open(os.path.join(ROOT, 'scripts', NARR)))
asr = WhisperModel('small', device='cpu', compute_type='int8')
od = os.path.join(ROOT, 'public', VDIR); os.makedirs(od, exist_ok=True)
tk = os.path.join(ROOT, 'out', 'takes_' + VDIR); os.makedirs(tk, exist_ok=True)
def norm(s):
    s = unicodedata.normalize('NFD', s.lower().replace('’', "'"))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r"[^a-z ]", ' ', s.replace("'", ' ')).split()
CHAIN = ('highpass=f=70,equalizer=f=150:t=q:w=1:g=1.5,deesser=i=0.25,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150:makeup=2,'
         'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,aresample=48000')
res = {}
for i, p in enumerate(P):
    best = None
    for take, stab in enumerate((0.45, 0.6)):
        body = {'text': p['text'], 'model_id': 'eleven_multilingual_v2', 'language_code': 'fr',
                'voice_settings': {'stability': stab, 'similarity_boost': 0.8, 'style': 0.3, 'use_speaker_boost': True, 'speed': SPEED},
                'previous_text': ' '.join(x['text'] for x in P[:i]) or None, 'next_text': ' '.join(x['text'] for x in P[i + 1:]) or None}
        r = requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_192',
                          headers={'xi-api-key': 'dummy', 'Content-Type': 'application/json'}, json=body, timeout=120)
        if r.status_code != 200 and 'language_code' in body:
            body.pop('language_code')
            r = requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_192',
                              headers={'xi-api-key': 'dummy', 'Content-Type': 'application/json'}, json=body, timeout=120)
        r.raise_for_status()
        mp3 = os.path.join(tk, f"{p['id']}_{take}.mp3"); open(mp3, 'wb').write(r.content)
        wav = mp3.replace('.mp3', '.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-af', CHAIN, '-ac', '1', wav], check=True)
        x, sr = sf.read(wav, dtype='float32')
        segs, _ = asr.transcribe(np.interp(np.arange(0, len(x), sr / 16000), np.arange(len(x)), x).astype(np.float32), language='fr', word_timestamps=True)
        ws = [w for s in segs for w in s.words]
        hyp = ' '.join(w.word.strip() for w in ws)
        ok = norm(hyp) == norm(p['text'])
        dur = len(x) / sr
        print(f"{p['id']} take{take}: {dur:.2f}s ok={ok} | {hyp}", flush=True)
        score = (ok, -dur)
        if best is None or score > best[0]: best = (score, wav, dur, take)
    subprocess.run(['cp', best[1], os.path.join(od, f"{p['id']}.wav")], check=True)
    res[p['id']] = {'dur': round(best[2], 3), 'take': best[3]}
json.dump(res, open(os.path.join(ROOT, 'scripts', 'durs_' + VDIR + '.json'), 'w'), indent=1)
print('done')
