"""Synthesise the French male narration with Piper (voice: upmc 'pierre',
CC BY-SA 4.0) and process it into a deeper, warmer broadcast voice.
Usage: python scripts/make_voice.py <piper_bin> <model.onnx>
"""
import json, subprocess, sys, os
piper, model = sys.argv[1], sys.argv[2]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lines = json.load(open(os.path.join(root, 'scripts', 'narration.json')))
os.makedirs(os.path.join(root, 'public', 'voice'), exist_ok=True)
for l in lines:
    raw = f'/tmp/raw_{l["id"]}.wav'
    ls = '1.10' if l['id'].startswith('n6') else '1.16'
    subprocess.run([piper, '-m', model, '-s', '1', '--length-scale', ls,
                    '--noise-scale', '0.6', '--noise-w-scale', '0.75',
                    '--sentence-silence', '0.30', '-f', raw],
                   input=l['text'].encode(), check=True, capture_output=True)
    out = os.path.join(root, 'public', 'voice', f'{l["id"]}.wav')
    chain = ','.join([
        'aresample=48000',
        'rubberband=pitch=0.925:formant=shifted:pitchq=quality',   # deeper voice
        'highpass=f=70',
        'equalizer=f=140:t=q:w=1:g=3.5',      # chest warmth
        'equalizer=f=380:t=q:w=1.2:g=-2',     # less boxy
        'equalizer=f=3200:t=q:w=1.4:g=2',     # presence / intelligibility
        'equalizer=f=7500:t=q:w=1.5:g=-2.5',  # soften synthetic hiss / sibilance
        'acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=4',
        'silenceremove=start_periods=1:start_threshold=-50dB',
        'areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse',
        'apad=pad_dur=0.05',
        'aresample=44100',
    ])
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', raw, '-af', chain,
                    '-ac', '1', '-c:a', 'pcm_s16le', out], check=True)
    print(l['id'], subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                   '-of', 'csv=p=0', out], capture_output=True, text=True).stdout.strip())
