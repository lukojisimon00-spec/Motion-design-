"""Photographic finish for the Cycles plate: neutral-to-warm balance on the
limestone, gentle highlight shoulder and fine monochrome grain.
Usage: python3 grade.py in.png out.png
"""
import sys
import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32) / 255.0

# sample the empty limestone (upper-left quadrant) and pull it to the target bone tone
patch = im[60:420, 40:520].reshape(-1, 3)
cur = np.median(patch, axis=0)
target = np.array([231, 224, 213], np.float32) / 255.0
gain = target / cur
print("limestone before", (cur * 255).round(), "gain", gain.round(3))
out = im * gain

# soft shoulder so polished steel highlights never clip harshly
knee = 0.92
over = out > knee
out[over] = knee + (1 - knee) * (1 - np.exp(-(out[over] - knee) / (1 - knee)))

# fine luminance grain, ~ISO 100 medium format
rng = np.random.default_rng(7)
grain = rng.normal(0, 0.0085, out.shape[:2]).astype(np.float32)[..., None]
out = np.clip(out + grain, 0, 1)

Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(dst)
print("saved", dst)
