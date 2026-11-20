"""Régénère src/kimo.json (catalogue des images de KIMO) à partir de public/characters/kimo."""
import json, os, glob
from PIL import Image
base = "public/characters/kimo"
def lister(d):
    out = []
    for f in sorted(glob.glob(f"{base}/{d}/*.png")):
        w, h = Image.open(f).size
        out.append({"nom": os.path.splitext(os.path.basename(f))[0], "src": f, "w": w, "h": h})
    return out
cat = {
    "personnage": "KIMO",
    "rotation": lister("reference/rotation"),
    "poses": lister("poses"),
    "expressions": {"a": lister("expressions/a"), "b": lister("expressions/b")},
    "planches": sorted(p for p in glob.glob(f"{base}/reference/*.jpg")),
}
json.dump(cat, open("src/kimo.json", "w"), ensure_ascii=False, indent=2)
print(sum(len(v) for v in [cat["rotation"], cat["poses"], cat["expressions"]["a"], cat["expressions"]["b"]]), "images")
