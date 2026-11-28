"""Sous-titres synchronisés mot à mot à partir du timing ElevenLabs.

Sorties dans episodes/<ep>/sous-titres/ : episode.srt (standard) et episode.ass (style TikTok :
gros blanc gras contour noir, couleur de nom par personnage, groupes de 2 à 4 mots).
Usage : python scripts/make_subtitles.py ep01
"""
import os, re, sys
from common import ROOT, jload

COUL = {'mohamed': '&H0066B3FF', 'nadia': '&H00A070FF', 'yanis': '&H00FFC84A', 'adam': '&H0060E0A0', 'ines': '&H00E89BFF'}
TAG = re.compile(r'\[[^\]]*\]')


def spoken_words(chars, t0, t1, c0, c1):
    """mots prononcés (balises retirées) avec leurs temps"""
    out, cur, ts, in_tag = [], '', None, False
    for k in range(c0, c1):
        ch = chars[k]
        if ch == '[': in_tag = True
        if in_tag:
            if ch == ']': in_tag = False
            if cur: out.append((cur, ts, t1[k - 1])); cur = ''
            continue
        if ch.isspace() or ch in '—':
            if cur: out.append((cur, ts, t1[k - 1])); cur = ''
        else:
            if not cur: ts = t0[k]
            cur += ch
    if cur: out.append((cur, ts, t1[c1 - 1]))
    return [w for w in out if re.search(r'\w', w[0])]


def groups(words, n=3):
    g, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= n or re.search(r'[.!?…,]$', w[0]) and len(cur) >= 2:
            g.append(cur); cur = []
    if cur: g.append(cur)
    return g


def ts_srt(t):
    h, m, s = int(t // 3600), int(t % 3600 // 60), t % 60
    return f'{h:02d}:{m:02d}:{s:06.3f}'.replace('.', ',')


def ts_ass(t):
    return f'{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}'


def main(ep):
    d = os.path.join(ROOT, 'episodes', ep)
    sc, tm = jload(os.path.join(d, 'script.json')), jload(os.path.join(d, 'audio', 'timing.json'))
    al = tm['alignment']
    ch, t0, t1 = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    cues = []
    for s in tm['segments']:
        line = sc['repliques'][s['ligne']]
        sp = spoken_words(ch, t0, t1, s['c0'], s['c1'])
        shown = []
        for w in (line.get('affiche') or TAG.sub('', line['texte'])).replace('—', ' ').split():
            if shown and not re.search(r'\w', w): shown[-1] += ' ' + w  # « ?! » reste collé au mot
            else: shown.append(w)
        if not sp: continue
        # chaque mot affiché prend le temps du mot prononcé correspondant (proportionnel si « 200 » = « deux cents »)
        words = []
        for k, w in enumerate(shown):
            a = sp[min(len(sp) - 1, round(k * len(sp) / len(shown)))]
            b = sp[min(len(sp) - 1, round((k + 1) * len(sp) / len(shown)) - 1)]
            words.append((w, a[1], max(b[2], a[1] + 0.05)))
        for g in groups(words):
            cues.append((line['perso'], g[0][1], g[-1][2], ' '.join(w[0] for w in g)))
    # chaque sous-titre reste affiché jusqu'au suivant (max +0.4 s) : pas de clignotement
    for i in range(len(cues)):
        p, a, b, txt = cues[i]
        nxt = cues[i + 1][1] if i + 1 < len(cues) else b + 0.4
        cues[i] = (p, a, min(nxt, max(b + 0.25, a + 0.4)), txt)
    out = os.path.join(d, 'sous-titres'); os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, 'episode.srt'), 'w', encoding='utf-8') as f:
        for i, (p, a, b, txt) in enumerate(cues, 1):
            f.write(f'{i}\n{ts_srt(a)} --> {ts_srt(b)}\n{txt}\n\n')
    hdr = ('[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n\n[V4+ Styles]\n'
           'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, '
           'Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, '
           'MarginR, MarginV, Encoding\n'
           'Style: Sub,Inter Display Black,78,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,6,2,2,90,90,560,1\n'
           'Style: Nom,Inter Display Black,44,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,2,0,1,4,1,2,90,90,660,1\n\n'
           '[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n')
    names = {k: v['nom'].split()[0].upper() for k, v in jload(os.path.join(ROOT, 'personnages', 'personnages.json'))['personnages'].items()}
    with open(os.path.join(out, 'episode.ass'), 'w', encoding='utf-8') as f:
        f.write(hdr)
        for p, a, b, txt in cues:
            f.write(f'Dialogue: 0,{ts_ass(a)},{ts_ass(b)},Sub,{p},0,0,0,,{{\\fscx92\\fscy92\\t(0,90,\\fscx100\\fscy100)}}{txt.upper()}\n')
        for s in tm['segments']:
            p = s['perso']
            f.write(f'Dialogue: 1,{ts_ass(s["debut"])},{ts_ass(s["fin"])},Nom,{p},0,0,0,,{{\\c{COUL[p]}}}{names[p]}\n')
    print(f'{len(cues)} sous-titres -> {out}')


if __name__ == '__main__':
    main(sys.argv[1])
