"""Audition of French voices on eleven_v3: same opening for each, then pitch / intonation-range / pace metrics."""
import os, subprocess, json, requests, numpy as np, soundfile as sf
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'out', 'audition')
CANDS = {'lucas_narr': 'EkJ5RDvSjqVhPFYzTy96', 'jt': 'MckrPTWwhRk9MdBsg8c4', 'max': 'Xy5q4w05TJGcKXPWeWoz',
         'raphael': 'OKpKhTrwN6S16IfQTHzZ', 'lucas_deep': 't28pUgJnL2wUUQ8SOnaU'}
TEXT = "Écoute bien… parce que ça, peu de gens le comprennent. L’obsession, ce n’est pas simplement vouloir réussir."
H = {'xi-api-key': 'dummy', 'Content-Type': 'application/json'}
def owner(vid, name):
    r = requests.get('https://api.elevenlabs.io/v1/shared-voices', headers=H, params={'language': 'fr', 'search': name, 'page_size': 30}).json()
    for v in r.get('voices', []):
        if v['voice_id'] == vid: return v['public_owner_id']
def f0(x, sr):
    hop, win = int(0.01 * sr), int(0.04 * sr); out = []
    for i in range(0, len(x) - win, hop):
        fr = x[i:i + win] * np.hanning(win)
        if np.sqrt(np.mean(fr ** 2)) < 0.02: continue
        ac = np.correlate(fr, fr, 'full')[win - 1:]
        lo, hi = int(sr / 300), int(sr / 70)
        k = lo + np.argmax(ac[lo:hi])
        if ac[k] / (ac[0] + 1e-9) > 0.45: out.append(sr / k)
    return np.array(out)
names = {'lucas_narr': 'Lucas', 'jt': 'JT', 'max': 'Max', 'raphael': 'Raphael', 'lucas_deep': 'Lucas'}
res = {}
for k, vid in CANDS.items():
    o = owner(vid, names[k])
    if o: requests.post(f'https://api.elevenlabs.io/v1/voices/add/{o}/{vid}', headers=H, json={'new_name': f'OBS {k}'})
    r = requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_192', headers=H,
                      json={'text': TEXT, 'model_id': 'eleven_v3', 'language_code': 'fr', 'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8}}, timeout=180)
    if r.status_code != 200: print(k, r.status_code, r.text[:200]); continue
    mp3 = os.path.join(OUT, f'{k}.mp3'); open(mp3, 'wb').write(r.content)
    wav = mp3[:-4] + '.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-ac', '1', '-ar', '16000', wav], check=True)
    x, sr = sf.read(wav)
    p = f0(x, sr); st = 12 * np.log2(p / np.median(p))
    res[k] = {'dur': round(len(x) / sr, 2), 'f0_med': round(float(np.median(p)), 1),
              'range_st': round(float(np.percentile(st, 95) - np.percentile(st, 5)), 1), 'sd_st': round(float(st.std()), 2)}
    print(k, res[k], flush=True)
json.dump(res, open(os.path.join(OUT, 'metrics.json'), 'w'), indent=1)
