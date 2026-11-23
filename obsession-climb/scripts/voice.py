"""ElevenLabs narration, one clip per paragraph (with previous/next text for continuous prosody).
Two takes each; Whisper checks the words, keeps the exact take with the best pacing.
Writes public/voice/<id>.wav and scripts/words.json. The API key is injected by the proxy."""
import json, os, re, subprocess, sys, requests, numpy as np, soundfile as sf
from faster_whisper import WhisperModel
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE = 'V2bPluzT7MuirpucVAKH'
P = json.load(open(os.path.join(ROOT, 'scripts', 'narration.json')))
asr = WhisperModel('small', device='cpu', compute_type='int8')
tk = os.path.join(ROOT, 'out', 'takes'); os.makedirs(tk, exist_ok=True)
norm = lambda s: re.sub(r"[^a-z' ]", ' ', s.lower().replace('’', "'")).split()
CHAIN = ('highpass=f=60,equalizer=f=140:t=q:w=1:g=2,deesser=i=0.25,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=150:makeup=2,'
         'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,aresample=48000')
words = {}
for i, p in enumerate(P):
    best = None
    for take, stab in enumerate((0.42, 0.55)):
        body = {'text': p['text'], 'model_id': 'eleven_multilingual_v2',
                'voice_settings': {'stability': stab, 'similarity_boost': 0.8, 'style': 0.35, 'use_speaker_boost': True, 'speed': 0.92},
                'previous_text': ' '.join(x['text'] for x in P[:i]) or None, 'next_text': ' '.join(x['text'] for x in P[i+1:]) or None}
        r = requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_192',
                          headers={'xi-api-key': 'dummy', 'Content-Type': 'application/json'}, json=body, timeout=120)
        r.raise_for_status()
        mp3 = os.path.join(tk, f"{p['id']}_{take}.mp3"); open(mp3, 'wb').write(r.content)
        wav = mp3.replace('.mp3', '.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-af', CHAIN, '-ac', '1', wav], check=True)
        x, sr = sf.read(wav, dtype='float32')
        segs, _ = asr.transcribe(np.interp(np.arange(0, len(x), sr / 16000), np.arange(len(x)), x).astype(np.float32), language='en', word_timestamps=True)
        ws = [w for s in segs for w in s.words]
        ok = norm(' '.join(w.word for w in ws)) == norm(p['text'])
        dur = len(x) / sr
        print(f"{p['id']} take{take}: {dur:.2f}s ok={ok} | {' '.join(w.word.strip() for w in ws)}", flush=True)
        score = (ok, -abs(dur / len(p['text']) - 0.068))
        if best is None or score > best[0]:
            best = (score, wav, [(w.word.strip(), round(w.start, 2), round(w.end, 2)) for w in ws], dur, take)
    subprocess.run(['cp', best[1], os.path.join(ROOT, 'public', 'voice', f"{p['id']}.wav")], check=True)
    words[p['id']] = {'dur': round(best[3], 3), 'take': best[4], 'words': best[2]}
json.dump(words, open(os.path.join(ROOT, 'scripts', 'words.json'), 'w'), indent=1)
print('done')
