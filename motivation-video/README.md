# Les Deux Échelles — vidéo de motivation (Remotion)

Animation 2D vectorielle verticale 1080×1920, 30 fps, 20 s, prête pour TikTok, Reels et Shorts.

**Vidéo finale :** `out/les-deux-echelles.mp4` (H.264 High, yuv420p BT.709, AAC 320 kb/s, faststart, ~−15 LUFS)

## Scénario
| Temps | Action |
|---|---|
| 0–4 s | Deux silhouettes devant un mur immense. La première court vers l'échelle rouge et grimpe aussitôt ; la seconde observe le mur. |
| 4–9 s | La première monte très vite et arrive près du sommet. La seconde relève son échelle blanche, la repositionne, vérifie les appuis et la secoue pour tester sa stabilité. |
| 9–14 s | L'échelle rouge glisse ; le premier perd l'équilibre, redescend en glissant et l'échelle s'effondre. Pendant ce temps, le second grimpe calmement. |
| 14–20 s | La caméra suit le second jusqu'au sommet, sous la lune. Fondu au noir, puis la citation apparaît mot à mot, dans le silence. |

## Fonctionnement
- `src/timeline.js` : **source unique du timing**, partagée par l'animation et l'audio (chaque bruit d'échelon est calé sur l'image).
- `src/pose.ts` : squelette et cinématique inverse à deux segments (coudes et genoux résolus à chaque image).
- `src/characters.ts` : chorégraphie image par image des deux personnages et des deux échelles.
- `src/DeuxEchelles.tsx` : décor (ciel, lune, mur, sol réfléchissant), ombres portées, caméra (travelling, grue, secousses), poussière, grain, vignettage, texte.
- `scripts/generate-audio.mjs` : bande-son procédurale sans dépendance (nappes de cordes, battement de cœur, montée, impact, piano, vent, bruits d'échelons, de pas et de glissement, chute, réverbération) → `public/soundtrack.wav`.

## Commandes
```bash
npm install
npm run studio   # aperçu interactif
npm run render   # audio + rendu Remotion + encodage final (requiert ffmpeg)
```
Pour utiliser un Chromium local : `REMOTION_BROWSER=/chemin/vers/chrome npm run render`.

Police : Cormorant Garamond (SIL Open Font License), incluse dans `public/`.
