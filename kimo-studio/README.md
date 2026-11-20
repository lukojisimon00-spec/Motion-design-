# KIMO Studio

Banque d'images du personnage **KIMO** (pull orange brique, jean bleu nuit, baskets blanches) et base de travail pour ses épisodes animés.

## Arborescence

```
kimo-studio/
├── public/
│   ├── characters/kimo/
│   │   ├── poses/            12 poses du corps entier, PNG détourés
│   │   ├── expressions/
│   │   │   ├── a/            12 têtes (planche A, fond blanc, cheveux plus volumineux)
│   │   │   └── b/            18 têtes avec col du pull (planche B)
│   │   └── reference/
│   │       ├── rotation/     6 vues : face, 3/4, profil, profil 3/4, dos, décontracté
│   │       └── planche-*.jpg les 4 planches d'origine, à ne pas modifier
│   ├── backgrounds/          décors
│   ├── audio/{voices,sfx,music}
│   └── props/                accessoires
├── episodes/                 un dossier par épisode (script, voix off, découpage)
├── src/                      page Studio + catalogue kimo.json
├── tools/                    découpe des planches et catalogue
├── index.html
└── package.json
```

## Utilisation

```sh
npm install
npm run dev        # ouvre la page Studio : parcourir les poses et expressions sur fond clair, sombre ou damier
npm run decouper   # re-découpe les 4 planches et régénère src/kimo.json (Python 3, numpy, scipy, Pillow)
```

## Ajouter une planche

1. Déposer le JPG dans `public/characters/kimo/reference/`.
2. Ajouter une ligne dans `tools/decouper-tout.sh` avec les noms des éléments, **ligne par ligne, de gauche à droite**. Pour une grille serrée de têtes, ajouter la taille de la grille en dernier argument (`3x6`).
3. `npm run decouper`, puis vérifier le détourage dans la page Studio sur le fond damier.

## Points d'attention

- **Deux versions du visage.** Les planches A (expressions) et rotation montrent des cheveux plus hauts et un visage plus allongé que les planches poses et expressions B. Dans un même épisode, associer les poses avec les expressions B, et la rotation avec les expressions A, pour garder un KIMO cohérent.
- Les images sont en résolution de planche (≈ 150 à 360 px de haut). C'est suffisant pour des maquettes ; pour une vidéo 1080×1920, il faudra des sources plus grandes ou un agrandissement.
