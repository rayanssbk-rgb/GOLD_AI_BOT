"""Outils partagés : chemins, config, appels ElevenLabs.

La clé ElevenLabs n'est JAMAIS écrite dans le code : elle est lue dans la variable d'environnement
ELEVENLABS_API_KEY (voir config/.env.example). Dans l'environnement cloud de Claude, le proxy réseau
injecte la vraie clé ; la valeur « proxy » ci-dessous n'est qu'un remplissage.
"""
import json, os, re, unicodedata, difflib, requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = os.path.join(ROOT, 'config')
API = 'https://api.elevenlabs.io'


def key():
    return os.environ.get('ELEVENLABS_API_KEY', 'proxy')


def headers():
    return {'xi-api-key': key(), 'Content-Type': 'application/json'}


def post(path, body, params=None, timeout=300):
    r = requests.post(API + path, headers=headers(), json=body, params=params, timeout=timeout)
    if r.status_code != 200:
        raise RuntimeError(f'{path} -> {r.status_code}: {r.text[:400]}')
    return r.json()


def jload(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def jsave(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')


def characters():
    return jload(os.path.join(ROOT, 'personnages', 'personnages.json'))['personnages']


def voices_path():
    return os.path.join(CFG, 'voices.json')


def voices():
    p = voices_path()
    return jload(p) if os.path.exists(p) else {}


def norm_words(s):
    s = re.sub(r'\[[^\]]*\]', ' ', s)
    s = unicodedata.normalize('NFD', s.lower().replace('’', "'"))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r"[^a-z0-9 ]", ' ', s.replace("'", ' ')).split()


def match_ratio(ref, hyp):
    return difflib.SequenceMatcher(None, norm_words(ref), norm_words(hyp)).ratio()
