"""Dialogue with Kokoro-82M (Apache-2.0, free, runs locally). For each line a few takes at slightly
different tempos; Whisper checks every take and the word-perfect one closest to the target tempo is kept.
Then a light voice chain (high-pass, de-ess, compression, warmth) for a clean, deep, close-mic sound.
Writes public/voice/<id>.wav (44.1 kHz mono) and scripts/words.json (word timings for subtitles).
Usage: <venv>/bin/python scripts/voices.py <kokoro_dir>"""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
from faster_whisper import WhisperModel

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KD = sys.argv[1]
lines = json.load(open(os.path.join(ROOT, 'scripts', 'lines.json')))
k = Kokoro(os.path.join(KD, 'kokoro-v1.0.onnx'), os.path.join(KD, 'voices-v1.0.bin'))
asr = WhisperModel('small', device='cpu', compute_type='int8')
os.makedirs(os.path.join(ROOT, 'public', 'voice'), exist_ok=True)
tmp = os.path.join(ROOT, 'out', 'takes'); os.makedirs(tmp, exist_ok=True)
norm = lambda s: re.sub(r"[^a-z0-9' ]", ' ', s.lower().replace('thirty', '30')).split()
CHAIN = ('highpass=f=80,lowpass=f=12500,equalizer=f=180:t=q:w=1:g=2.5,equalizer=f=3200:t=q:w=1.5:g=1.5,'
         'deesser=i=0.3,acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=3,'
         'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
         'aresample=44100')
words = {}
for l in lines:
    best = None
    for dv in (0.0, -0.04, 0.04):
        a, sr = k.create(l['text'], voice=l['voice'], speed=l['speed'] + dv, lang=l['lang'])
        raw = os.path.join(tmp, f"{l['id']}_{dv:+.2f}.wav"); sf.write(raw, a, sr)
        out = raw.replace('.wav', '_fx.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', CHAIN, '-ac', '1', '-c:a', 'pcm_s16le', out], check=True)
        x, _ = sf.read(out, dtype='float32')
        x16 = np.interp(np.arange(0, len(x), 44100 / 16000), np.arange(len(x)), x).astype(np.float32)
        segs, _ = asr.transcribe(x16, language='en', beam_size=5, word_timestamps=True)
        ws = [w for s in segs for w in s.words]
        hyp = norm(' '.join(w.word for w in ws))
        ok = hyp == norm(l['text'])
        print(f"{l['id']} {dv:+.2f}: {len(x)/44100:4.2f}s ok={ok} | {' '.join(hyp)}", flush=True)
        score = (ok, -abs(dv))
        if best is None or score > best[0]:
            best = (score, out, [(w.word.strip(), round(w.start, 2), round(w.end, 2)) for w in ws], len(x) / 44100)
    (ok, _), out, ws, dur = best
    if not ok: print('  WARNING no exact take for', l['id'])
    subprocess.run(['cp', out, os.path.join(ROOT, 'public', 'voice', f"{l['id']}.wav")], check=True)
    words[l['id']] = {'dur': round(dur, 3), 'words': ws}
json.dump(words, open(os.path.join(ROOT, 'scripts', 'words.json'), 'w'), indent=1)
print('done')
