"""Generate several Piper takes per narration line, process them like the
final voice, transcribe each with Whisper and keep the take whose
transcript matches the script best. Also stores word timings.
Usage: python scripts/select_voice.py <piper_bin> <model.onnx> [takes]
(run with a Python that has faster-whisper installed)"""
import json, os, subprocess, sys, difflib, re, unicodedata, shutil
import numpy as np
from faster_whisper import WhisperModel

piper, model = sys.argv[1], sys.argv[2]
TAKES = int(sys.argv[3]) if len(sys.argv) > 3 else 6
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lines = json.load(open(os.path.join(root, 'scripts', 'narration.json')))
asr = WhisperModel('small', device='cpu', compute_type='int8')
norm = lambda s: re.sub(r'[^a-z ]', ' ', unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode()).split()
CHAIN = ','.join([
    'aresample=48000', 'rubberband=pitch=0.93:formant=shifted:pitchq=quality', 'highpass=f=70',
    'equalizer=f=140:t=q:w=1:g=3.5', 'equalizer=f=380:t=q:w=1.2:g=-2', 'equalizer=f=3200:t=q:w=1.4:g=2',
    'equalizer=f=7500:t=q:w=1.5:g=-2.5', 'acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=4',
    'silenceremove=start_periods=1:start_threshold=-50dB',
    'areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse', 'apad=pad_dur=0.05', 'aresample=44100'])
timings = {}
for l in lines:
    best = None
    for k in range(TAKES):
        raw = f'/tmp/take_{l["id"]}_{k}.wav'
        out = f'/tmp/take_{l["id"]}_{k}_p.wav'
        ns = ['0.45', '0.55', '0.6', '0.667', '0.5', '0.4', '0.7', '0.35'][k % 8]
        subprocess.run([piper, '-m', model, '-s', '1', '--length-scale', '1.2', '--noise-scale', ns,
                        '--noise-w-scale', '0.7', '--sentence-silence', '0.3', '-f', raw],
                       input=l['text'].encode(), check=True, capture_output=True)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-af', CHAIN, '-ac', '1', '-c:a', 'pcm_s16le', out], check=True)
        pcm = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', out, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], capture_output=True).stdout
        segs, _ = asr.transcribe(np.frombuffer(pcm, np.float32), language='fr', word_timestamps=True, beam_size=5)
        words = [(w.word.strip(), round(w.start, 2), round(w.end, 2)) for s in segs for w in s.words]
        text = ' '.join(w[0] for w in words)
        score = difflib.SequenceMatcher(a=norm(l['text']), b=norm(text)).ratio()
        if best is None or score > best[0]:
            best = (score, out, words, text)
        if score == 1.0:
            break
    shutil.copy(best[1], os.path.join(root, 'public', 'voice', f'{l["id"]}.wav'))
    timings[l['id']] = best[2]
    print(f'{l["id"]}  {best[0]:.2f}  {best[3]}', flush=True)
json.dump(timings, open(os.path.join(root, 'scripts', 'word_timings.json'), 'w'), ensure_ascii=False, indent=1)
