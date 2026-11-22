# Un jour, tu comprendras — court-métrage motivationnel en 3D (Remotion + Three.js)

Court-métrage vertical **1080×1920, 30 fps, 83 s**, entièrement en 3D temps réel (Three.js / React Three Fiber dans Remotion), avec vues subjectives (POV), voix off française, sous-titres synchronisés et musique originale.

**Vidéo finale :** `out/un-jour-tu-comprendras.mp4` — H.264 High, yuv420p BT.709, AAC 320 kb/s, faststart.

## Découpage
| Temps | Scène | Mise en scène |
|---|---|---|
| 0–16 s | **La réalité** (POV) | La porte s'ouvre, les mains posent les clés, retirent la veste, le téléphone montre la réussite des autres ; la caméra va vers la fenêtre et la ville sous la pluie. |
| 16–30 s | **La solitude** | POV : marche sous la pluie, reflets, voitures, passants. Puis plan extérieur : il reste immobile pendant que la foule et les phares accélèrent autour de lui. |
| 30–45 s | **Le déclic** (POV, plan continu) | L'horloge passe à 02:00, l'ordinateur s'ouvre, les poings se serrent sur « Personne ne viendra te sauver », il écrit ses objectifs, la lampe s'allume, il tape. |
| 45–61 s | **La transformation** | Montage rythmé : réveil 05:00, travail à l'aube, apprentissage, course, échec, recommencer, journée difficile, nuits en accéléré, course au soleil — de plus en plus lumineux. |
| 61–73 s | **Le résultat** | Sur un toit au lever du soleil, la caméra tourne derrière lui et révèle la ville. |
| 73–83 s | **La phrase finale** | Écran noir, « TA VIE PEUT CHANGER. MAIS PAS SI TU RESTES LE MÊME. », 2 s de silence, « COMMENCE AUJOURD'HUI. » |

## Fonctionnement
- `src/timeline.js` — timing unique (narration, plans, temps forts) partagé par l'image et le son.
- `src/three/lib.tsx` — caméra, mains POV articulées, mannequin humain (marche, course, assis), ville procédurale, pluie, faisceaux volumétriques, sol mouillé réfléchissant.
- `src/three/props.tsx` — téléphone (fil d'actualité animé), ordinateur (code, erreurs), carnet (écriture progressive), horloge, vitre pluvieuse.
- `src/scenes/` — les six scènes. `src/Text.tsx` — titre, sous-titres, cartons finaux.
- `scripts/select_voice.py` — voix off Piper TTS (voix « pierre », UPMC, CC BY-SA 4.0) : plusieurs prises par phrase, transcription Whisper, la plus fidèle est conservée.
- `scripts/generate-audio.mjs` — musique originale (piano → cordes → percussions orchestrales → final), bruitages (pluie, pas, respiration, clavier, horloge, porte, ville), mixage voix + atténuation de la musique, silence de 2 s avant la signature.
- `scripts/assemble.sh` — concatène les rendus, étalonnage (bloom, teinte froide/chaude, contraste, vignettage, grain) et mixage final.

## Rendu
Le rendu WebGL se fait en logiciel (SwiftShader) dans ce conteneur : ~2–4 s par image, d'où le rendu en deux parties.
```bash
npm install
npm run studio     # aperçu
npm run render     # audio + rendu (2 parties) + étalonnage + mixage
```
Sur une machine avec GPU, retirer `--gl=swangle` accélère fortement le rendu.

## Crédits
Voix : Piper TTS, modèle `fr_FR-upmc-medium` (locuteur « pierre ») — CC BY-SA 4.0. Polices : Inter, Cormorant Garamond (SIL OFL). Musique et sons : originaux, générés par script.
