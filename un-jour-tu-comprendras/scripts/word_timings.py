"""Whisper word timestamps for every public/voice/<id>.wav -> scripts/word_timings.json (input of align_subs.py)."""
import json, os, subprocess
import numpy as np
from faster_whisper import WhisperModel
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ids = [l['id'] for l in json.load(open(os.path.join(root, 'scripts', 'narration.json')))]
m = WhisperModel('small', device='cpu', compute_type='int8')
out = {}
for i in ids:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(root, 'public', 'voice', f'{i}.wav'), '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], capture_output=True).stdout
    segs, _ = m.transcribe(np.frombuffer(raw, np.float32), language='fr', beam_size=5, word_timestamps=True)
    out[i] = [[w.word.strip(), round(w.start, 2), round(w.end, 2)] for s in segs for w in s.words]
    print(i, ' '.join(w for w, _, _ in out[i]))
json.dump(out, open(os.path.join(root, 'scripts', 'word_timings.json'), 'w'), ensure_ascii=False, indent=1)
