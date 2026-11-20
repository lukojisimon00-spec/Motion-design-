# KIMO Studio — moteur d'animation 2D (phase 1 : MVP)

Studio d'animation 2D pour des vidéos verticales 9:16 (Shorts, TikTok, Reels), en HTML, CSS,
JavaScript et Canvas. **Aucune dépendance, aucune étape de compilation, aucune API payante.**

## Lancer le studio

Le studio doit être servi par un serveur web : en ouvrant `index.html` directement (`file://`),
le navigateur bloque les modules JavaScript et la lecture des fichiers JSON.

**Sur Android, sans ordinateur (recommandé) : GitHub Pages**
1. Sur GitHub : *Settings → Pages → Deploy from a branch*, choisir la branche, dossier `/ (root)`.
2. Ouvrir `https://<utilisateur>.github.io/<dépôt>/kimo-studio/` dans Chrome Android.
   Tous les chemins sont relatifs : le studio fonctionne dans un sous-dossier.

**Sur Android avec Termux**
```sh
pkg install python
cd kimo-studio && python -m http.server 8080
# puis ouvrir http://localhost:8080 dans Chrome
```

**Sur ordinateur**
```sh
cd kimo-studio
npm start          # = python3 -m http.server 8080 → http://localhost:8080
npm run check      # vérifie la config, l'épisode et la logique du moteur (Node 18+)
```

Autres pages : `bibliotheque.html` (toutes les images découpées sur damier).
Chemins configurables dans l'adresse : `index.html?config=config/assets.json&episode=episodes/demo/episode.json`.

## Utilisation

| Zone | Rôle |
|---|---|
| ▶ Play / ❚❚ Pause / ↺ Reset | lecture de l'épisode, son compris |
| ● Rec | rejoue l'épisode depuis le début et l'enregistre en vidéo (WebM), puis propose le téléchargement |
| Barre de position | se déplacer dans l'épisode |
| **Scènes** | liste des scènes (toucher ▶ pour y aller, durée modifiable) ; ajouter une expression, une pose, un saut, un rebond, un tremblement ou une secousse caméra **à la position actuelle** ; supprimer une action |
| **Assets** | journal de chargement (erreurs en rouge) ; importer un décor, une pose ou une expression depuis le téléphone ; ouvrir ou exporter un épisode `.json` |
| **Audio** | écouter les sons, importer un fichier audio, l'ajouter à la scène à la position actuelle |
| **Réglages** | qualité d'aperçu et d'enregistrement, zones masquées TikTok/Shorts, boucle |

Les modifications faites dans l'interface restent en mémoire jusqu'au rechargement de la page :
**Assets → Exporter l'épisode** pour les garder, puis remplace le fichier dans `episodes/`.
Les fichiers importés depuis le téléphone ne sont pas copiés dans le projet : pour les garder,
dépose-les dans `public/` et déclare-les dans `config/assets.json`.

## Architecture

```
kimo-studio/
├── index.html                 interface du studio
├── bibliotheque.html          planche de toutes les images
├── config/assets.json         déclaration des décors, personnages, poses, expressions, cycles, sons
├── episodes/demo/episode.json épisode de démonstration (4 scènes, 15 s)
├── public/                    fichiers médias (images, sons)
├── tools/                     découpe des planches, vérification du moteur
└── src/
    ├── app.js                 assemble les modules
    ├── assets/
    │   ├── AssetLoader.js     chargement image/JSON avec gestion d'erreur, découpe de planche
    │   └── AssetLibrary.js    bibliothèque : config + imports depuis l'appareil + journal
    ├── characters/
    │   └── Character.js       poses, expressions, cycles d'un personnage (réutilisable)
    ├── motion/
    │   └── actions.js         catalogue des mouvements (move, walk, jump…)
    ├── scenes/
    │   ├── Scene.js           état d'une scène à l'instant t
    │   └── Episode.js         enchaînement des scènes, temps global, sons
    ├── engine/
    │   ├── Engine.js          horloge, play/pause/reset/seek
    │   ├── Renderer.js        dessin Canvas, caméra, repères
    │   └── easing.js          courbes d'animation
    ├── audio/AudioEngine.js   Web Audio : chargement, lecture calée, sortie vers l'enregistreur
    ├── export/Recorder.js     MediaRecorder (WebM)
    └── ui/                    un module par panneau + styles
```

**Principe clé : l'état d'une scène est une fonction pure du temps.** `scene.evaluate(t)` part
de l'état initial et applique toutes les actions commencées avant `t`. On peut donc sauter à
n'importe quel instant (Reset, liste de scènes, barre de position) et obtenir exactement la
même image. C'est ce qui permettra en phase 2 un export image par image, sans saccades.

### Monde et caméra
Le monde mesure toujours 1080×1920. Seule la résolution du canvas change (aperçu léger,
export 720p ou 1080p). La caméra (position, zoom, rotation, secousse) ne sort jamais du décor,
sauf si `"clamp": false` est mis dans la caméra de la scène.

### Personnages : poses + expressions
- Chaque pose a une **ancre** (`anchor`, point des pieds, en fraction de l'image) : la position
  `x, y` d'un acteur est celle de ses pieds, quelle que soit la taille de l'image.
- `heightRef` = hauteur en pixels source d'une pose debout. L'acteur a une `height` à l'écran ;
  toutes les poses sont mises à la même échelle, même si leurs images ont des tailles différentes.
- **Expression = tête posée sur la pose.** Chaque pose compatible déclare où est sa tête
  (`head: { x, y, scale }`). `expressionHead` dit où est la tête dans les images d'expression
  et où couper sous le cou (`clipBottom`). Une pose sans `head` (dos, mains sur la tête,
  bras levés) garde son propre visage.
- Une pose peut venir d'une planche non découpée : `{ "src": "planche.jpg", "rect": [x, y, w, h] }`
  (sans transparence dans ce cas).
- **Cycles** : `"marche": { "frames": ["marche", "debout"], "fps": 3.6, "bob": 14 }`.

### Format d'un épisode
```json
{
  "title": "…",
  "music": { "sound": "musique", "volume": 0.3 },
  "scenes": [{
    "id": "arrivee", "title": "KIMO arrive", "duration": 4.5, "background": "rue",
    "camera": { "x": 540, "y": 960, "zoom": 1 },
    "actors": [{ "id": "kimo", "character": "kimo", "x": -40, "y": 1640, "height": 820,
                 "pose": "debout", "expression": "neutre", "facing": "right" }],
    "actions": [{ "at": 0, "type": "walk", "target": "kimo", "to": [540, 1640], "duration": 3 }],
    "sounds": [{ "at": 3, "sound": "pop", "volume": 0.8 }]
  }]
}
```

### Actions disponibles
| type | paramètres | effet |
|---|---|---|
| `move` | `to:[x,y]` ou `by:[dx,dy]`, `duration`, `ease` | déplacement |
| `walk` | `to`, `duration`, `cycle` (`marche`, `course`) | déplacement + cycle de poses + orientation automatique |
| `jump` | `height`, `duration` | saut |
| `squash` | `amount`, `duration` | rebond écrasé/étiré |
| `shake` | `amount`, `freq`, `duration` | tremblement de l'acteur |
| `scale` | `height`, `duration` | redimensionner |
| `rotate` / `fade` | `deg` / `alpha`, `duration` | rotation / transparence |
| `pose` / `expression` / `face` | `value` | changement instantané |
| `show` / `hide` | — | apparaître / disparaître |
| `camera` | `zoom`, `to:[x,y]`, `rotation`, `duration`, `ease` | caméra |
| `cameraShake` | `amount`, `freq`, `duration` | secousse caméra |
| `background` | `value` | changer de décor |

Toute action avec durée accepte aussi `pose` / `expression` (pendant l'action) et
`thenPose` / `thenExpression` (après). Courbes `ease` : `linear`, `in`, `out`, `inOut`, `back`, `elastic`.
Nouvelle action : `registerAction("nom", { apply(target, p, action, ctx) {…} })`.

## Ce qui a été testé

Test automatique dans Chromium en émulation Pixel 7 (Android) :
- chargement des 37 fichiers de la config, 0 erreur ;
- Play (2,01 s écoulées en 2 s), Pause (le temps ne bouge plus), Reset (retour à 0) ;
- ajout d'une expression depuis l'interface, prise en compte dans l'état de la scène ;
- enregistrement de l'épisode complet : WebM VP9 + Opus, 720×1280, 451 images (15 s à 30 i/s),
  son présent (pic −2,4 dB) ;
- `npm run check` : config, références de l'épisode, marche, cycle, expressions, zoom, saut,
  et évaluation déterministe.

**Pas encore testé sur un vrai téléphone Android ni sur Safari/iOS.** Merci de faire un essai
sur ton téléphone et de me signaler ce qui ne marche pas (onglet Réglages : la ligne du bas dit
si l'enregistrement est disponible).

## Risques et limites connus

**Android / mobile**
- Le son ne démarre qu'après un toucher : c'est voulu par Android, Play et Rec s'en chargent.
- Pendant l'enregistrement, **l'écran doit rester allumé et le studio au premier plan** :
  Chrome met en pause les onglets en arrière-plan. Le studio arrête alors l'enregistrement proprement.
- Un téléphone lent peut sauter des images pendant l'enregistrement (rendu en temps réel).
  Enregistrer en 720×1280 limite ce risque.
- iOS/Safari : MediaRecorder produit du MP4 au lieu du WebM ; c'est prévu dans le code, mais pas testé.

**Vidéo**
- Le WebM de MediaRecorder n'indique pas sa durée dans l'en-tête. La plupart des lecteurs le
  lisent, mais **TikTok et Instagram n'acceptent pas toujours le WebM**. Conversion gratuite :
  `ffmpeg -i kimo.webm -c:v libx264 -pix_fmt yuv420p -c:a aac -r 30 kimo.mp4`.
- La cadence est variable (dépend de l'appareil). Un export image par image à cadence fixe est prévu en phase 2.

**Personnage**
- La marche alterne seulement 2 poses (`marche`, `debout`) avec un léger rebond. Pour une vraie
  marche fluide, il faut 4 à 8 poses de marche : ajoute-les dans `cycles.marche.frames`.
- Les têtes d'expression sont de face, alors que la plupart des poses sont de trois-quarts : le
  raccord est correct pour un dessin animé, mais pas parfait. La série A d'expressions (cheveux
  plus hauts, menton plus long) ne se raccorde pas aux poses : elle n'est pas utilisée.
- Images de petite taille (≈ 360 px de haut pour une pose) : un peu douces en 1080p.

## Phase 2 (pas commencée)
Dialogues et sous-titres synchronisés, mouvements de bouche, plusieurs personnages dans
l'interface, éditeur de timeline, export image par image à cadence fixe, sauvegarde locale
des épisodes, script → épisode.

## Outils
- `npm run decouper` : re-découpe les planches de `public/characters/kimo/reference/` en PNG
  détourés (Python 3, numpy, scipy, Pillow).
- Les sons de démo (`public/audio/`) sont synthétisés, originaux et libres d'utilisation.
