"""Professional voice-over with ElevenLabs (eleven_v3, premade voice "Charlie", French).
For every line: several takes, silence-trimmed, transcribed with Whisper; the best take that is
word-perfect AND fits its slot in the edit is kept, preferring the most expressive delivery.
Writes public/voice/<id>.wav (44.1 kHz mono s16). The Piper takes are kept in public/voice_piper/.

The API key is never read here: the network proxy injects it (xi-api-key) into requests to
api.elevenlabs.io. Run with the Whisper venv:  <venv>/bin/python scripts/elevenlabs_voice.py
"""
import json, os, re, shutil, subprocess, sys, unicodedata, urllib.request
import numpy as np
from faster_whisper import WhisperModel

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE_ID = os.environ.get('EL_VOICE', 'IKne3meq5aSn9XLyUdCD')  # Charlie: young, deep, confident, energetic
MODEL = 'eleven_v3'
TAKES = int(os.environ.get('EL_TAKES', '3'))
WORK = os.path.join(ROOT, 'out', 'el_takes')

# id, text sent to the model (v3 audio tags steer the emotion), text expected on screen, max seconds
# (max = time before the next line / the cut in the 20 s edit). v1 is built from two parts so the
# second sentence starts exactly where the original one did.
LINES = [
    ('v1a', '[softly] Parfois, tu regardes les autres réussir.', 'Parfois, tu regardes les autres réussir.', 2.5),
    ('v1b', '[quietly] Et tu te demandes pourquoi ta vie n’avance pas.', 'Et tu te demandes pourquoi ta vie n’avance pas.', 4.0),
    ('v2', '[softly] Tu souris devant les autres. Mais au fond de toi… tu sais que tu veux tellement plus.', 'Tu souris devant les autres. Mais au fond de toi, tu sais que tu veux tellement plus.', 6.5),
    ('v3a', '[thoughtful] Puis un jour, tu comprends une chose.', 'Puis un jour, tu comprends une chose.', 4.2),
    ('v3b', '[serious] Personne ne viendra te sauver.', 'Personne ne viendra te sauver.', 2.7),
    ('v4a', '[determined] Alors, tu arrêtes de chercher des excuses.', 'Alors, tu arrêtes de chercher des excuses.', 4.3),
    ('v4b', '[determined] Tu arrêtes d’attendre.', 'Tu arrêtes d’attendre.', 2.3),
    ('v4c', '[determined] Tu commences à construire.', 'Tu commences à construire.', 1.65),
    ('v5a', '[warmly] Et un jour, tu regarderas derrière toi.', 'Et un jour, tu regarderas derrière toi.', 3.6),
    ('v5b', '[emotional] Tu comprendras que chaque nuit difficile avait une raison.', 'Tu comprendras que chaque nuit difficile avait une raison.', 4.1),
    ('v6a', '[calm] Ta vie peut changer.', 'Ta vie peut changer.', 1.65),
    ('v6b', '[serious] Mais pas si tu restes le même.', 'Mais pas si tu restes le même.', 1.95),
    ('v6c', '[confident] Commence aujourd’hui.', 'Commence aujourd’hui.', 2.1),
]
# takes picked by ear-check of the full mix (fast takes got masked by the montage music)
PREFER = {'v4b': 2}
V1B_OFFSET = 2.64  # where the second sentence of v1 started in the original edit


def tts(text, seed, path):
    body = json.dumps({
        'text': text, 'model_id': MODEL, 'language_code': 'fr', 'seed': seed,
        'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8, 'style': 0.0, 'use_speaker_boost': True},
    }).encode()
    req = urllib.request.Request(
        f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format=mp3_44100_128',
        data=body, headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=120) as r:
        open(path, 'wb').write(r.read())


def to_wav(src, dst):
    # trim leading/trailing silence, mono 44.1 kHz, gentle high-pass
    af = ('highpass=f=70,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,'
          'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', af, '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', dst], check=True)


def pcm(path, sr=16000):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32)


def norm(s):
    s = unicodedata.normalize('NFKD', s.lower().replace('’', "'"))
    return re.sub(r"[^a-z' ]", ' ', ''.join(c for c in s if not unicodedata.combining(c))).split()


def pitch_range(x, sr=16000):
    f = []
    for i in range(0, len(x) - 640, 320):
        fr = x[i:i + 640]
        if np.sqrt((fr ** 2).mean()) < 0.02:
            continue
        ac = np.correlate(fr, fr, 'full')[639:]
        k = sr // 300 + np.argmax(ac[sr // 300:sr // 70])
        if ac[k] > 0.3 * ac[0]:
            f.append(sr / k)
    if len(f) < 5:
        return 0.0
    st = 12 * np.log2(np.array(f) / np.median(f))
    return float(np.percentile(st, 95) - np.percentile(st, 5))


def main():
    os.makedirs(WORK, exist_ok=True)
    vdir = os.path.join(ROOT, 'public', 'voice')
    bak = os.path.join(ROOT, 'public', 'voice_piper')
    if not os.path.isdir(bak):
        shutil.copytree(vdir, bak)
    asr = WhisperModel('small', device='cpu', compute_type='int8')
    chosen = {}
    for lid, text, ref, mx in LINES:
        best = None
        for k in range(TAKES):
            mp3 = os.path.join(WORK, f'{lid}_{k}.mp3')
            wav = os.path.join(WORK, f'{lid}_{k}.wav')
            if not os.path.exists(mp3):
                tts(text, 1000 + k * 17, mp3)
            to_wav(mp3, wav)
            x = pcm(wav)
            dur = len(x) / 16000
            segs, _ = asr.transcribe(x, language='fr', beam_size=5)
            hyp = norm(' '.join(s.text for s in segs))
            exact = hyp == norm(ref)
            pr = pitch_range(x)
            fits = dur <= mx
            score = (exact, fits, PREFER.get(lid) == k, pr if fits else -dur)
            print(f'{lid} take{k}: {dur:4.2f}s/{mx}s exact={exact} range={pr:4.1f}st  "{" ".join(hyp)}"', flush=True)
            if best is None or score > best[0]:
                best = (score, wav, dur)
        (exact, fits, _, _), wav, dur = best
        if not fits:  # gently tighten the pacing (rubberband keeps pitch and timbre)
            tempo = dur / mx
            out = wav.replace('.wav', '_fit.wav')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-af', f'rubberband=tempo={tempo:.4f}:pitchq=quality', out], check=True)
            print(f'  {lid}: tempo x{tempo:.3f} to fit {mx}s')
            wav = out
        if not exact:
            print(f'  WARNING {lid}: no word-perfect take', file=sys.stderr)
        chosen[lid] = wav
    # v1 = v1a + silence + v1b (second sentence on its original beat)
    a = pcm(chosen['v1a'], 44100)
    b = pcm(chosen['v1b'], 44100)
    v1 = np.zeros(int(V1B_OFFSET * 44100) + len(b), np.float32)
    v1[:len(a)] = a
    v1[int(V1B_OFFSET * 44100):] = b
    tmp = os.path.join(WORK, 'v1.f32')
    v1.tofile(tmp)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', '44100', '-ac', '1', '-i', tmp, '-c:a', 'pcm_s16le', os.path.join(vdir, 'v1.wav')], check=True)
    for lid, wav in chosen.items():
        if lid in ('v1a', 'v1b'):
            continue
        shutil.copy(wav, os.path.join(vdir, f'{lid}.wav'))
    print('voice files written to public/voice/')


if __name__ == '__main__':
    main()
