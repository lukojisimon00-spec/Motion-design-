# Le temps est ton capital le plus précieux

Motion design de 20 s, 1920 × 1080, 30 i/s, réalisé avec Remotion.
Rendu final : `renders/le-temps-est-ton-capital.mp4` (H.264 + AAC 320 kb/s, -16 LUFS).

## Structure

```
src/
  timing.json          source unique du minutage (scènes + apparitions de texte), lue par la vidéo ET par l'audio
  theme.ts             couleurs, polices, courbes d'animation
  TimeCapital.tsx      montage : 4 séquences + finition + bande-son
  scenes/
    SceneClock.tsx     0–4 s   cadran qui se dessine, arc doré du temps écoulé
    SceneFlow.tsx      4–8 s   compte à rebours, frise qui défile, réserve qui se vide
    SceneBuild.tsx     8–14 s  silhouette au travail, chaque minute devient un bloc
    SceneFinal.tsx     14–20 s tout se réduit à une ligne, « CONSTRUIS. »
  components/
    RevealLine.tsx     révélation typographique mot à mot sous masque
    Finish.tsx         vignettage + grain
audio/build_audio.py   musique et sound design synthétisés -> public/audio/soundtrack.wav
public/fonts/          Instrument Serif, DM Mono (licence OFL)
```

## Commandes

```bash
npm i
python3 audio/build_audio.py         # régénère la bande-son (numpy, scipy, ffmpeg)
npx remotion studio                  # aperçu
npx remotion render TimeCapital renders/le-temps-est-ton-capital.mp4 --crf=16 --audio-bitrate=320k
```

Pour décaler un texte, modifiez `src/timing.json` puis relancez `build_audio.py` :
l'impact sonore suit automatiquement.

`remotion.config.ts` pointe vers le Chromium préinstallé de l'environnement cloud
(`REMOTION_BROWSER` pour en choisir un autre) ; ailleurs, Remotion télécharge le sien.
