"""Align the script text (correct spelling) with Whisper word timestamps
to get per-word subtitle timings. Writes src/subtitles.json."""
import json, difflib, re, unicodedata, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lines = json.load(open(os.path.join(root, 'scripts', 'narration.json')))
wt = json.load(open(os.path.join(root, 'scripts', 'word_timings.json')))
norm = lambda w: re.sub(r'[^a-z]', '', unicodedata.normalize('NFD', w.lower()).encode('ascii', 'ignore').decode())
out = {}
for l in lines:
    words = l['text'].replace('…', '… ').split()
    hw = wt[l['id']]
    # whisper sometimes splits "qu 'il" -> merge apostrophe tokens
    merged = []
    for w, s, e in hw:
        if merged and (w.startswith("'") or w.startswith('-')):
            merged[-1] = (merged[-1][0] + w, merged[-1][1], e)
        else:
            merged.append((w, s, e))
    a = [norm(w) for w in words]
    b = [norm(w) for w, _, _ in merged]
    times = [None] * len(words)
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal' or (tag == 'replace' and i2 - i1 == j2 - j1):
            for k in range(i2 - i1):
                times[i1 + k] = (merged[j1 + k][1], merged[j1 + k][2])
    # interpolate missing
    start, end = merged[0][1], merged[-1][2]
    for i in range(len(words)):
        if times[i] is None:
            prev = next((times[j][1] for j in range(i - 1, -1, -1) if times[j]), start)
            nxt = next((times[j][0] for j in range(i + 1, len(words)) if times[j]), end)
            times[i] = (prev, max(prev, nxt))
    out[l['id']] = [{'w': w, 's': round(t[0], 2), 'e': round(t[1], 2)} for w, t in zip(words, times)]
json.dump(out, open(os.path.join(root, 'src', 'subtitles.json'), 'w'), ensure_ascii=False, indent=1)
print('aligned', len(out), 'lines')
