"""New vocal identity: ElevenLabs v3, voice 'JT' (charismatic, modern), whole narration in one continuous take
so the emotion builds naturally. Light v3 delivery tags. 3 takes; Whisper checks every word, then we keep the
exact take with the most varied intonation that fits the 35 s film. Writes out/v3/take*.wav + metrics."""
import os, re, subprocess, json, unicodedata, requests, numpy as np, soundfile as sf
from faster_whisper import WhisperModel
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'out', 'v3'); os.makedirs(OUT, exist_ok=True)
VOICE = 'MckrPTWwhRk9MdBsg8c4'
TEXT = ("[confident] Écoute bien… parce que ça, peu de gens le comprennent. "
        "L’obsession, ce n’est pas simplement vouloir réussir. C’est penser à ton objectif… même quand personne ne croit en toi. "
        "Pendant que certains dorment, toi, tu construis. Pendant que certains se moquent, toi, tu progresses. "
        "[serious] Tu vas connaître des échecs, des doutes, des moments où tu voudras tout abandonner. "
        "[intense] Mais c’est justement là que tout se joue. "
        "La motivation te donne envie de commencer. L’obsession, elle, te pousse à continuer quand tu n’as plus envie. "
        "[determined] Alors arrête de parler de tes projets. Travaille en silence. Et laisse tes résultats parler pour toi.")
H = {'xi-api-key': 'dummy', 'Content-Type': 'application/json'}
def norm(s):
    s = re.sub(r'\[[^\]]*\]', ' ', s)
    s = unicodedata.normalize('NFD', s.lower().replace('’', "'"))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r"[^a-z ]", ' ', s.replace("'", ' ')).split()
def f0sd(x, sr):
    hop, win = int(0.01 * sr), int(0.04 * sr); out = []
    for i in range(0, len(x) - win, hop):
        fr = x[i:i + win] * np.hanning(win)
        if np.sqrt(np.mean(fr ** 2)) < 0.02: continue
        ac = np.correlate(fr, fr, 'full')[win - 1:]
        lo, hi = int(sr / 300), int(sr / 70); k = lo + np.argmax(ac[lo:hi])
        if ac[k] / (ac[0] + 1e-9) > 0.45: out.append(sr / k)
    p = np.array(out); st = 12 * np.log2(p / np.median(p))
    st = st[np.abs(st) < 12]  # drop octave errors
    return float(np.median(p)), float(st.std())
asr = WhisperModel('small', device='cpu', compute_type='int8')
CHAIN = ('highpass=f=70,equalizer=f=140:t=q:w=1:g=1.5,deesser=i=0.2,acompressor=threshold=-22dB:ratio=2.2:attack=8:release=140:makeup=2,'
         'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,aresample=48000')
res = []
for take, stab in enumerate((0.5, 0.5, 0.0)):
    r = requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_192', headers=H,
                      json={'text': TEXT, 'model_id': 'eleven_v3', 'language_code': 'fr', 'seed': 100 + take,
                            'voice_settings': {'stability': stab, 'similarity_boost': 0.8}}, timeout=300)
    if r.status_code != 200: print(take, r.status_code, r.text[:300]); continue
    mp3 = os.path.join(OUT, f'take{take}.mp3'); open(mp3, 'wb').write(r.content)
    wav = mp3[:-4] + '.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-af', CHAIN, '-ac', '1', wav], check=True)
    x, sr = sf.read(wav, dtype='float32')
    x16 = np.interp(np.arange(0, len(x), sr / 16000), np.arange(len(x)), x).astype(np.float32)
    segs, _ = asr.transcribe(x16, language='fr', word_timestamps=True)
    ws = [(w.word.strip(), round(w.start, 2), round(w.end, 2)) for s in segs for w in s.words]
    hyp, ref = norm(' '.join(w[0] for w in ws)), norm(TEXT)
    import difflib
    diff = [d for d in difflib.ndiff(ref, hyp) if d[0] in '+-']
    med, sd = f0sd(x16.astype(np.float64), 16000)
    info = {'take': take, 'stab': stab, 'dur': round(len(x) / sr, 2), 'f0': round(med, 1), 'sd_st': round(sd, 2), 'diff': diff}
    res.append(info); print(info, flush=True)
    json.dump(ws, open(os.path.join(OUT, f'take{take}_words.json'), 'w'), ensure_ascii=False)
json.dump(res, open(os.path.join(OUT, 'metrics.json'), 'w'), indent=1, ensure_ascii=False)
