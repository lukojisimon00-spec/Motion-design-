"""Score + sound design for "Le temps est ton capital le plus précieux".

Everything is synthesised (no samples): pads, plucks, ticks, whooshes,
impacts, riser. Cue times come from src/timing.json, the same file the
Remotion scenes read, so picture and sound cannot drift apart.

Usage: python3 audio/build_audio.py   ->  public/audio/soundtrack.wav (48 kHz, 24-bit stereo, -16 LUFS)
"""
import json
import os
import subprocess
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(ROOT, "src", "timing.json")))
FPS = T["fps"]
DUR = T["durationInFrames"] / FPS
SR = 48000
N = int(DUR * SR)
rng = np.random.default_rng(11)


def g(scene, key):  # global time in seconds of a text cue
    return (T["scenes"][scene]["from"] + T["text"][key]) / FPS


def fr(f):
    return f / FPS


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def buf():
    return np.zeros((N, 2))


def place(dst, sig, t, gain=1.0, pan=0.0):
    """Add mono or stereo `sig` into dst at time t (s)."""
    i = int(round(t * SR))
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l, sig * r], 1) * np.sqrt(2)
    j = min(N, i + len(sig))
    if j > i >= 0:
        dst[i:j] += sig[: j - i] * gain


def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, "low", fs=SR, output="sos"), x, axis=0)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x, axis=0)


def db(x):
    return 10 ** (x / 20)


# ------------------------------------------------------------------ reverb
def make_ir(seconds=3.2, decay=0.9):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-t / decay)[:, None]
    ir = lp(ir, 5500)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum(0))


IR = make_ir()


def reverb(x, wet=0.35):
    y = np.stack([fftconvolve(x[:, c], IR[:, c])[: len(x)] for c in range(2)], 1)
    return x * (1 - wet) + y * wet * 2.2


# ------------------------------------------------------------------ instruments
def pad_note(f, dur, fc=1800, detune=(-7, 0, 7)):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for k, cents in enumerate(detune):
        ff = f * 2 ** (cents / 1200)
        nh = int(min(28, 9000 / ff))
        w = np.zeros(n)
        for h in range(1, nh + 1):
            amp = (1 / h) / (1 + (h * ff / fc) ** 2)
            w += amp * np.sin(2 * np.pi * h * ff * t + rng.uniform(0, 2 * np.pi))
        pan = (k - 1) * 0.55
        out[:, 0] += w * np.cos((pan + 1) * np.pi / 4)
        out[:, 1] += w * np.sin((pan + 1) * np.pi / 4)
    # gentle movement
    out *= (1 + 0.06 * np.sin(2 * np.pi * 0.23 * t + rng.uniform(0, 6)))[:, None]
    return out / len(detune)


def chord(notes, t0, t1, fc, attack=1.4, release=1.6, gain=1.0):
    dur = t1 - t0 + release
    n = int(dur * SR)
    env = np.ones(n)
    a = int(attack * SR)
    env[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    r = int(release * SR)
    env[-r:] = np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    s = sum(pad_note(midi(m), dur, fc) for m in notes) / np.sqrt(len(notes))
    return s * env[:, None] * gain


def pluck(f, dur=1.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for h in range(1, 9):
        s += (0.6 ** (h - 1)) * np.sin(2 * np.pi * h * f * t) * np.exp(-t * (3.2 + h * 1.6))
    s *= np.minimum(1, t / 0.004)
    return s


def tick(pitch=1.0, dur=0.06):
    n = int(dur * SR)
    t = np.arange(n) / SR
    click = rng.standard_normal(n) * np.exp(-t / 0.0025)
    click = bp(click, 1500, 9000)
    body = (np.sin(2 * np.pi * 2300 * pitch * t) * 0.5 + np.sin(2 * np.pi * 3550 * pitch * t) * 0.3) * np.exp(-t / 0.012)
    return (click * 0.8 + body) * 0.9


def whoosh(length=1.1, peak=0.72, lo=250, hi=5200):
    """Filtered-noise sweep; `peak` is the fraction of `length` where it is loudest."""
    n = int(length * SR)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    # time-varying band: crossfade a bank of band-passed copies
    bands = np.geomspace(lo, hi, 7)
    pos = np.clip(np.where(t < peak, t / peak, 1 - (t - peak) / (1 - peak) * 0.6), 0, 1) * (len(bands) - 1.001)
    out = np.zeros(n)
    for i, fc in enumerate(bands):
        b = bp(noise, fc / 1.5, min(fc * 1.5, 20000))
        wgt = np.clip(1 - np.abs(pos - i), 0, 1)
        out += b * wgt
    env = np.where(t < peak, (t / peak) ** 2.2, np.exp(-(t - peak) / (1 - peak) * 4.5))
    out = out * env
    pan = np.linspace(-0.7, 0.7, n)
    st = np.stack([out * np.cos((pan + 1) * np.pi / 4), out * np.sin((pan + 1) * np.pi / 4)], 1)
    return st / (np.abs(st).max() + 1e-9)


def impact(strength=1.0):
    dur = 0.5 + 1.6 * strength
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 42 + 58 * np.exp(-t / 0.07)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.18 + 0.5 * strength))
    trans = lp(rng.standard_normal(n) * np.exp(-t / 0.012), 2600)
    body = lp(rng.standard_normal(n) * np.exp(-t / 0.09), 700) * 0.6
    s = sub * 1.0 + trans * 0.35 + body * 0.45 * strength
    return s / np.abs(s).max()


def riser(length):
    n = int(length * SR)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    bands = np.geomspace(400, 9000, 8)
    pos = t * (len(bands) - 1.001)
    for i, fc in enumerate(bands):
        out += bp(noise, fc / 1.4, min(fc * 1.4, 20000)) * np.clip(1 - np.abs(pos - i), 0, 1)
    tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (t * 1.6)) / SR) * 0.25
    s = (out * 0.7 + tone) * t ** 2.4
    s[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
    return s / np.abs(s).max()


# ------------------------------------------------------------------ score
music = buf()
HIT = g("final", "finalB")                       # CONSTRUIS. lands
S = {k: v["from"] / FPS for k, v in T["scenes"].items()}

progression = [
    # (notes, start, end, filter cutoff, gain)
    ([38, 45, 53, 60, 64], 0.0, S["flow"], 900, 0.9),                 # Dm9: quiet, dark
    ([34, 41, 50, 57, 60], S["flow"], S["build"], 1200, 0.95),        # Bbmaj7(9)
    ([41, 48, 57, 64, 67], S["build"], S["build"] + 3.0, 1900, 1.0),  # Fmaj7(9): it opens
    ([40, 48, 55, 62, 67], S["build"] + 3.0, S["final"], 2300, 1.0),  # C/E: lift
    ([33, 40, 50, 52, 57], S["final"], HIT - 0.14, 1500, 0.9),        # Asus4: held breath
    ([38, 45, 54, 57, 62, 66], HIT, DUR, 2600, 1.15),                 # D major: resolution
]
for notes, a, b, fc, gn in progression:
    att = 0.05 if a == HIT else (2.2 if a == 0 else 1.0)
    rel = 0.12 if b == HIT - 0.14 else 1.6
    place(music, chord(notes, a, b, fc, attack=att, release=rel, gain=gn), a)

# arpeggio from scene 3: one note every 8 frames, building with the blocks
arp_chords = {0: [65, 69, 72, 76, 79, 76, 72, 69], 1: [64, 67, 72, 74, 79, 74, 72, 67]}
step = 8 / FPS
t = S["build"] + 0.4
i = 0
while t < S["final"] - 0.2:
    which = 0 if t < S["build"] + 3.0 else 1
    note = arp_chords[which][i % 8]
    vel = 0.45 + 0.4 * min(1, (t - S["build"]) / 5.0)
    place(music, pluck(midi(note)), t, gain=vel * 0.32, pan=0.35 if i % 2 else -0.35)
    t += step
    i += 1

# low heartbeat pulse under scene 3 (every 15 frames)
pulse = np.sin(2 * np.pi * np.cumsum(48 + 30 * np.exp(-np.arange(int(0.35 * SR)) / SR / 0.04)) / SR) * np.exp(-np.arange(int(0.35 * SR)) / SR / 0.11)
f = T["scenes"]["build"]["from"] + 30
while f < T["scenes"]["final"]["from"] - 10:
    place(music, pulse, fr(f), gain=0.32)
    f += 15

# shimmer on the resolution
bell = sum(pluck(midi(n), 4.0) * a for n, a in [(86, 0.5), (93, 0.3), (98, 0.18)])
place(music, bell, HIT + 0.02, gain=0.16)

music = reverb(music, wet=0.42)

# ------------------------------------------------------------------ sound design
sfx = buf()
# scene 1: two clock ticks while the dial draws, then the ellipsis lands dot by dot
for k, fr_ in enumerate([12, 40]):
    place(sfx, tick(1.0 if k % 2 == 0 else 0.86), fr(fr_), gain=0.42, pan=0.35)
dots0 = T["scenes"]["clock"]["from"] + T["text"]["clock"] + 34
for k in range(3):
    place(sfx, tick(1.12 - 0.06 * k), fr(dots0 + k * 9), gain=0.30, pan=-0.25)
# scene 2: ticks accelerate with the countdown
t = S["flow"] + 0.18
gap = 0.42
k = 0
while t < S["build"] - 0.25:
    place(sfx, tick(1.0 if k % 2 == 0 else 0.86), t, gain=0.26 + 0.1 * (t - S["flow"]) / 4, pan=0.25 if k % 2 else -0.25)
    t += gap
    gap = max(0.11, gap * 0.86)
    k += 1

# transitions (whoosh peaks land on the cut)
for t_cut, length, gain in [(S["flow"], 1.0, 0.55), (S["build"], 0.9, 0.38), (S["final"] - 0.15, 1.3, 0.34)]:
    w = whoosh(length)
    place(sfx, w, t_cut - 0.72 * length, gain=gain)

# impacts on the important words
for scene, key, s in [("clock", "clock", 0.45), ("flow", "flowA", 0.4), ("flow", "flowB", 0.7),
                      ("build", "buildA", 0.3), ("build", "buildB", 0.3), ("build", "buildC", 0.6),
                      ("final", "finalA", 0.5), ("final", "finalB", 1.0)]:
    place(sfx, impact(s), g(scene, key), gain=0.35 + 0.45 * s)

# riser into CONSTRUIS., with a breath of silence before the hit
rs = riser(1.45)
place(sfx, rs, HIT - 0.14 - 1.45, gain=0.30)

sfx = reverb(sfx, wet=0.22)

# ------------------------------------------------------------------ ambience
amb = rng.standard_normal((N, 2))
amb = lp(np.cumsum(amb, 0) * 0.02, 380)  # brown-ish air
amb = hp(amb, 30)
amb /= np.abs(amb).max()

# ------------------------------------------------------------------ mix
tt = np.arange(N) / SR
# music automation: starts withdrawn, grows with the story, breathes before the hit
auto_t = [0, S["flow"], S["build"], S["final"], HIT - 0.15, HIT, DUR]
auto_db = [-8.5, -6.0, -3.0, -2.0, -4.5, 0.0, 0.0]
music_gain = db(np.interp(tt, auto_t, auto_db))
# make room for every impact (3 dB dip, 60 ms down, 450 ms back)
cues = [g(s, k) for s, k in [("clock", "clock"), ("flow", "flowA"), ("flow", "flowB"), ("build", "buildA"),
                              ("build", "buildB"), ("build", "buildC"), ("final", "finalA")]]
duck = np.zeros(N)
for c in cues:
    d = np.interp(tt, [c - 0.06, c, c + 0.15, c + 0.6], [0, 1, 1, 0])
    duck = np.maximum(duck, d)
music_gain *= db(-3 * duck)

mix = music * db(-10) * music_gain[:, None] + sfx * db(-2.5) + amb * db(-30)
tt = np.arange(N) / SR
fade = np.clip(tt / 0.35, 0, 1) * np.clip((DUR - tt) / 1.4, 0, 1) ** 1.5
mix *= fade[:, None]
mix = np.tanh(mix * 1.1) / np.tanh(1.1)          # soft clip, never harsh

raw = os.path.join(ROOT, "audio", "_raw.wav")
from scipy.io import wavfile
wavfile.write(raw, SR, (mix / np.abs(mix).max() * 0.89).astype(np.float32))

# two-pass loudness normalisation: -16 LUFS integrated, -1.5 dBTP
out = os.path.join(ROOT, "public", "audio", "soundtrack.wav")
p = subprocess.run(["ffmpeg", "-hide_banner", "-i", raw, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                   capture_output=True, text=True)
js = json.loads(p.stderr[p.stderr.rfind("{"):])
flt = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
       f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af", flt, "-ar", str(SR), "-c:a", "pcm_s24le", out], check=True)
os.remove(raw)
print("wrote", out, "| input", js["input_i"], "LUFS")
