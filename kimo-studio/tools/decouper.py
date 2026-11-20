"""Découpe une planche de personnage en PNG individuels détourés (fond transparent).
Usage : python3 tools/decouper.py planche.jpg dossier_sortie nom1,nom2,...
Les éléments sont lus ligne par ligne, de gauche à droite."""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, out, names = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
grid = sys.argv[4] if len(sys.argv) > 4 else None   # ex. "3x6" pour une grille de têtes
im = np.asarray(Image.open(src).convert("RGB")).astype(int)
h, w, _ = im.shape
border = np.concatenate([im[:4].reshape(-1, 3), im[-4:].reshape(-1, 3), im[:, :4].reshape(-1, 3), im[:, -4:].reshape(-1, 3)])
bg = np.median(border, axis=0)
diff = np.abs(im - bg).max(axis=2)
mask = ndi.binary_opening(diff > 28, np.ones((5, 5)))          # enlève les filets de construction
mask = ndi.binary_closing(mask, np.ones((15, 15)))
def cut(proj, k):                                                # coupe au creux le plus proche
    L = len(proj); c = [0]
    for i in range(1, k):
        a, b = int(L * i / k - L / (3 * k)), int(L * i / k + L / (3 * k))
        c.append(a + int(np.argmin(proj[a:b])))
    return c + [L]
if grid:
    r, c = map(int, grid.split("x"))
    raw = diff > 28
    ys = cut(raw.sum(1), r); lab = np.zeros((h, w), int); k = 0
    for i in range(r):
        xs = cut(raw[ys[i]:ys[i + 1]].sum(0), c)
        for j in range(c):
            k += 1; lab[ys[i]:ys[i + 1], xs[j]:xs[j + 1]] = np.where(mask[ys[i]:ys[i + 1], xs[j]:xs[j + 1]], k, 0)
else:
    lab, n = ndi.label(mask)
objs = [s for i, s in enumerate(ndi.find_objects(lab)) if s is not None and (lab[s] == i + 1).sum() > 3000]
ids = {(s[0].start, s[1].start): i + 1 for i, s in enumerate(ndi.find_objects(lab)) if s is not None}
objs.sort(key=lambda s: (s[0].start + s[0].stop) / 2)
rows, cur = [], []
for s in objs:                                                   # regroupe par rangée
    if cur and (s[0].start + s[0].stop) / 2 - (cur[-1][0].start + cur[-1][0].stop) / 2 > 120:
        rows.append(cur); cur = []
    cur.append(s)
rows.append(cur)
objs = [s for r in rows for s in sorted(r, key=lambda s: s[1].start)]
assert len(objs) == len(names), f"{len(objs)} éléments trouvés, {len(names)} noms"
os.makedirs(out, exist_ok=True)
pad = 12
for s, name in zip(objs, names):
    y0, y1 = max(s[0].start - pad, 0), min(s[0].stop + pad, h)
    x0, x1 = max(s[1].start - pad, 0), min(s[1].stop + pad, w)
    crop, d = im[y0:y1, x0:x1], diff[y0:y1, x0:x1]
    # silhouette = plus grand bloc de la case ; les trous fermés (yeux, dents) restent opaques,
    # seuls les grands trous couleur fond (entre bras et corps) deviennent transparents
    own = lab[y0:y1, x0:x1] == ids[(s[0].start, s[1].start)]
    lb, k = ndi.label(own)
    own = lb == (1 + int(np.argmax(ndi.sum(own, lb, range(1, k + 1)))))
    obj = ndi.binary_closing(d > 28, np.ones((3, 3))) & ndi.binary_dilation(own, iterations=3)
    lb, k = ndi.label(obj)
    sizes = ndi.sum(obj, lb, range(1, k + 1))
    obj = np.isin(lb, 1 + np.flatnonzero(sizes > 0.02 * sizes.max()))
    full = ndi.binary_fill_holes(obj)
    holes, k = ndi.label(full & ~obj)
    for i in range(1, k + 1):
        m = holes == i
        if d[m].mean() < 22 and (m.sum() > 1500 or (bg.mean() < 215 and m.sum() > 40)):  # fond gris : les yeux blancs ne se confondent pas avec le fond
            full &= ~m
    alpha = ndi.gaussian_filter(full.astype(float) * 255, 0.7)
    rgba = np.dstack([crop, alpha.clip(0, 255)]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(os.path.join(out, name + ".png"))
    print(name, (x0, y0, x1, y1))
