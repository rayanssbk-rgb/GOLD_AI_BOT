# La famille Benali : série animée 3D humoristique (TikTok, 9:16)

## Où en est le projet

| Élément | État |
|---|---|
| Fiches des 5 personnages (apparence, personnalité, voix) | ✅ `personnages/personnages.json` |
| Décors : salon, cuisine, cité HLM | ✅ `decors/decors.json` |
| **5 voix permanentes ElevenLabs** (Voice IDs) | ✅ créées, `config/voices.json` |
| Épisode 1 « Le père découvre les 200 € » : dialogue joué (37,5 s, une seule prise multi-voix) | ✅ `episodes/ep01/audio/` |
| Sous-titres synchronisés mot à mot (SRT + style TikTok ASS) | ✅ `episodes/ep01/sous-titres/` |
| Données de synchro labiale (ouverture + visèmes, 30 i/s) | ✅ `episodes/ep01/lipsync/` |
| Découpage en 15 plans + prompts + audio par plan | ✅ `episodes/ep01/plans/` |
| Animatique (voix + sous-titres + découpage, **sans images 3D**) | ✅ `episodes/ep01/animatique.mp4` |
| Images 3D animées des plans | ⏳ en attente du service vidéo IA (clé API nécessaire) |
| Fiches de référence visuelles (turnarounds) | ⏳ prompts prêts dans `personnages/fiches/`, même service |

## Dossiers

```
personnages/   fiches personnages (source unique) + prompts de fiches de référence
decors/        décors réutilisables d'un épisode à l'autre
voix/previews/ essais Voice Design écoutables (l'essai retenu est noté dans config/voices.json)
animations/    réservé aux clips/références d'animation réutilisables (poses, réactions)
episodes/epXX/ script.json, decoupage.json, audio/, sous-titres/, lipsync/, plans/, clips/, epXX.mp4
config/        voices.json (Voice IDs permanents), .env.example (modèle de clés, jamais commité)
scripts/       pipeline
```

## Pipeline d'un épisode

```bash
python scripts/create_voices.py          # une seule fois : ne remplace jamais une voix existante
python scripts/generate_dialogue.py ep01 # dialogue joué + timings (crédits ElevenLabs)
python scripts/make_subtitles.py ep01
python scripts/lipsync.py ep01
python scripts/build_prompts.py ep01     # prompts + audio par plan pour le service vidéo
python scripts/make_animatic.py ep01     # validation rythme/voix avant de générer l'image
# … générer chaque plan avec le service vidéo -> episodes/ep01/clips/P01.mp4 … P15.mp4
python scripts/assemble.py ep01 [--ambiance salon.wav]
```

Nouvel épisode : copier `episodes/ep01/script.json` et `decoupage.json`, changer les répliques et les plans ;
les voix et les fiches ne bougent pas.

## Continuité

- **Voix** : un `voice_id` par personnage dans `config/voices.json`, jamais régénéré automatiquement. Même modèle
  (`eleven_v3`) et mêmes réglages à chaque épisode.
- **Visuel** : chaque personnage aura UNE fiche de référence validée (image) ; tous les plans sont générés
  avec cette image en référence + la même description (`personnages.json`) + le même style global.
- **Décors** : descriptions fixes dans `decors/decors.json`.

## Clés API (sécurité)

Aucune clé dans le code ni dans Git. Les scripts lisent `ELEVENLABS_API_KEY` / `VIDEO_API_KEY` dans
l'environnement (`config/.env`, ignoré par Git). Dans la session Claude cloud, les clés sont injectées par
le proxy réseau via le formulaire sécurisé (« network secrets » de l'environnement), jamais collées dans le chat.

## Brancher le service vidéo IA

Le rendu 3D de qualité cinématographique (visages expressifs, cheveux, plis, lumière) vient d'un service de
génération vidéo par IA qui accepte une **image de référence de personnage** et idéalement une **synchro
labiale sur fichier audio**. Il faut :
1. choisir le service et créer une clé API sur ton compte ;
2. me donner son nom : je demande la clé via le formulaire sécurisé et j'écris l'adaptateur ;
3. valider les 5 fiches de référence avant de lancer les 15 plans (c'est là que se joue la cohérence).
