# Personne ne croyait en lui — vidéo de motivation animée (Remotion)

Animation 2D vectorielle verticale **1080×1920, 30 fps, 61,5 s**, voix off française, sous-titres synchronisés, musique originale.

**Vidéo finale :** `out/personne-ne-croyait-en-lui.mp4` (H.264 High, yuv420p BT.709, AAC 320 kb/s, faststart, −13,4 LUFS). Compatible TikTok, Reels et YouTube Shorts.

## Histoire
| Temps | Scène |
|---|---|
| 0–9 s | **Le rêve** : titre d'accroche, chambre sombre sous la pluie, fil d'actualité de luxe, compte bancaire à 12,47 €, tête baissée. |
| 9–16 s | **Les moqueries** : rue de nuit, deux silhouettes le montrent du doigt et rient ; il passe sans répondre, rentre, ouvre son ordinateur. |
| 16–26 s | **Les échecs** : trois erreurs calées sur « échoué… encore une fois… et encore une fois », écran fermé, tête dans les mains, regard vers la photo « OBJECTIF », il rouvre l'ordinateur. |
| 26–38 s | **La discipline** : montage rythmé (réveil 05:00, immeuble qui s'endort sauf sa fenêtre, apprentissage, construction du projet, revers surmonté, mois qui défilent) ; la lumière devient chaude. |
| 38–48 s | **Le résultat** : tableau de bord, premières ventes, il reste immobile, se lève et regarde la ville. |
| 48–61 s | **La morale** : la caméra recule sur la ville illuminée, fondu au noir, texte, silence, puis « Travaille en silence. Laisse tes résultats faire du bruit. » |

## Fonctionnement
- `src/timeline.js` — timing unique partagé par l'animation et l'audio (débuts des phrases, plans, échecs, coupes du montage).
- `src/pose.ts` / `src/Figure.tsx` — personnages vectoriels sans visage : squelette, cinématique inverse, poses de face et de profil.
- `src/scenes/S1…S5.tsx` — décors et mise en scène ; `src/kit.tsx` — caméra, ville procédurale, pluie, fenêtres, ordinateur.
- `src/Text.tsx` — titre d'accroche, sous-titres mot à mot, texte final.
- `scripts/make_voice.py` — voix off (Piper TTS, voix « pierre » du corpus UPMC, CC BY-SA 4.0) + traitement (voix plus grave, égalisation, compression).
- `scripts/align_subs.py` — aligne le texte sur les horodatages Whisper (`scripts/word_timings.json`) → `src/subtitles.json`.
- `scripts/generate-audio.mjs` — musique originale procédurale (piano, percussions, montée épique), bruitages, mixage voix avec atténuation automatique de la musique, silence avant la dernière phrase.

## Commandes
```bash
npm install
npm run studio          # aperçu interactif
npm run render          # bande-son + rendu Remotion + encodage final (ffmpeg requis)
# Régénérer la voix (optionnel) :
PIPER_BIN=/chemin/piper PIPER_MODEL=/chemin/fr_FR-upmc-medium.onnx npm run voice
```

## Crédits
- Voix : Piper TTS, modèle `fr_FR-upmc-medium` (locuteur « pierre »), données UPMC — licence CC BY-SA 4.0.
- Polices : Inter et Cormorant Garamond (SIL Open Font License).
- Musique et bruitages : générés par `scripts/generate-audio.mjs` (originaux).
