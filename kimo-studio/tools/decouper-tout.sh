#!/bin/sh
# Re-découpe toutes les planches de référence de KIMO puis régénère le catalogue.
set -e
R=public/characters/kimo
python3 tools/decouper.py $R/reference/planche-rotation.jpg $R/reference/rotation 01-face,02-trois-quarts,03-profil,04-profil-trois-quarts,05-dos,06-decontracte
python3 tools/decouper.py $R/reference/planche-poses.jpg $R/poses debout,marche,course,saut-victoire,recul-surpris,assis,bras-croises,assis-explique,pointe-du-doigt,panique-mains-tete,accroupi-elan,celebration
python3 tools/decouper.py $R/reference/planche-expressions-a.jpg $R/expressions/a neutre,sourire,rire-larmes,choc,doute,colere,triste,pleure,peur-sueur,mefiant,satisfait,epuise 3x4
python3 tools/decouper.py $R/reference/planche-expressions-b.jpg $R/expressions/b neutre,sourire,rire,serein,surpris-sueur,inquiet,etonne,horrifie,reflexion,blase,colere,stress-mains-tete,fatigue,panique,triste,pleure,fier,yeux-au-ciel 3x6
python3 tools/catalogue.py
# Ensuite : reporter les nouvelles poses/expressions dans config/assets.json
