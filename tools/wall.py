# -*- coding: utf-8 -*-
"""
Renders the three desktop wallpapers.

Everything here is per-pixel float maths - gradients, bloom, atmospheric
haze, rim light - so the result has the soft continuous falloff a photo has
and the hard vector edges of the old SVG version did not. A little noise
goes in at the end because 8-bit output bands badly across a sky this large.
"""
import os

import numpy as np
from PIL import Image, ImageFilter

W, H = 2560, 1440
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'wall')

x = np.arange(W, dtype=np.float32)
y = np.arange(H, dtype=np.float32)[:, None]
u, v = x / W, y / H


def smooth(a, b, t):
    t = np.clip((t - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def ramp(stops, t):
    """piecewise-linear colour ramp; stops = [(pos, (r, g, b)), ...]"""
    out = np.zeros(t.shape + (3,), np.float32)
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        m = (t >= p0) & (t <= p1)
        k = np.clip((t - p0) / (p1 - p0), 0, 1)[..., None]
        out = np.where(m[..., None], np.float32(c0) * (1 - k) + np.float32(c1) * k, out)
    return out


THEMES = {
    # Frutiger Aero proper: saturated blue sky, glossy green hills, hard sun.
    'aero': dict(
        hz=0.615, sun=(0.775, 0.185), sun_amp=(0.55, 0.50, 0.95), shafts=0.20,
        horizon_glow=0.42, star=0.0,
        sky=[(0.00, (0.031, 0.192, 0.560)), (0.26, (0.075, 0.353, 0.780)),
             (0.50, (0.204, 0.573, 0.918)), (0.70, (0.451, 0.784, 0.965)),
             (0.86, (0.639, 0.859, 0.973)), (1.00, (0.784, 0.914, 0.984))],
        swoosh=[(0.40, 0.075, 0.4, 0.110, (0.85, 0.97, 1.00), 0.22),
                (0.50, 0.055, 2.3, 0.080, (1.00, 1.00, 1.00), 0.15)],
        hills=[(0.612, 0.016, 4.1, 0.7, (0.596, 0.792, 0.831), (0.478, 0.706, 0.769), 0.20),
               (0.655, 0.026, 2.7, 2.1, (0.494, 0.784, 0.639), (0.310, 0.643, 0.514), 0.34),
               (0.720, 0.038, 1.9, 4.4, (0.373, 0.749, 0.451), (0.157, 0.522, 0.310), 0.55),
               (0.830, 0.055, 1.3, 0.9, (0.278, 0.667, 0.361), (0.055, 0.341, 0.208), 0.80)],
        bokeh_tint=(1.0, 1.0, 1.0), vig=0.30,
    ),
    # Deep Field: the same landscape after dark. Stars, an aurora, a low moon.
    'night': dict(
        hz=0.615, sun=(0.205, 0.155), sun_amp=(0.16, 0.20, 0.75), shafts=0.05,
        horizon_glow=0.10, star=1.0,
        sky=[(0.00, (0.016, 0.020, 0.086)), (0.30, (0.035, 0.055, 0.180)),
             (0.55, (0.063, 0.118, 0.310)), (0.76, (0.110, 0.220, 0.451)),
             (0.90, (0.208, 0.353, 0.561)), (1.00, (0.365, 0.478, 0.639))],
        swoosh=[(0.44, 0.070, 0.9, 0.130, (0.42, 1.00, 0.78), 0.20),
                (0.52, 0.050, 2.8, 0.090, (0.62, 0.60, 1.00), 0.14)],
        hills=[(0.612, 0.016, 4.1, 0.7, (0.196, 0.278, 0.400), (0.145, 0.212, 0.322), 0.10),
               (0.655, 0.026, 2.7, 2.1, (0.129, 0.243, 0.290), (0.086, 0.169, 0.216), 0.14),
               (0.720, 0.038, 1.9, 4.4, (0.078, 0.196, 0.204), (0.043, 0.118, 0.137), 0.20),
               (0.830, 0.055, 1.3, 0.9, (0.047, 0.137, 0.129), (0.016, 0.055, 0.067), 0.26)],
        bokeh_tint=(0.72, 0.85, 1.0), vig=0.42,
    ),
    # Luna: XP's palette - a paler, warmer sky and one very green hill.
    'luna': dict(
        hz=0.640, sun=(0.700, 0.150), sun_amp=(0.42, 0.34, 0.70), shafts=0.10,
        horizon_glow=0.30, star=0.0,
        sky=[(0.00, (0.114, 0.353, 0.729)), (0.28, (0.204, 0.482, 0.855)),
             (0.54, (0.365, 0.663, 0.937)), (0.74, (0.596, 0.827, 0.965)),
             (0.88, (0.788, 0.910, 0.976)), (1.00, (0.925, 0.965, 0.980))],
        swoosh=[(0.30, 0.050, 1.2, 0.120, (1.00, 1.00, 1.00), 0.32),
                (0.42, 0.040, 3.4, 0.095, (1.00, 1.00, 1.00), 0.24)],
        hills=[(0.640, 0.012, 3.6, 1.4, (0.612, 0.769, 0.694), (0.510, 0.694, 0.612), 0.12),
               (0.690, 0.030, 2.2, 3.0, (0.545, 0.769, 0.416), (0.396, 0.639, 0.290), 0.22),
               (0.790, 0.048, 1.5, 0.4, (0.478, 0.741, 0.310), (0.286, 0.545, 0.180), 0.34),
               (0.900, 0.040, 1.1, 2.6, (0.404, 0.678, 0.243), (0.180, 0.416, 0.114), 0.48)],
        bokeh_tint=(1.0, 1.0, 1.0), vig=0.22,
    ),
}


def render(name, T):
    HZ = T['hz']
    SUNX, SUNY = T['sun']

    # ------------------------------------------------------------ sky
    # tilted very slightly so the deepest colour sits up and to the left
    t = np.clip((v + (u - 0.5) * 0.055) / HZ, 0, 1) + np.zeros_like(u)
    img = ramp(T['sky'], t)

    # ------------------------------------------------------------ stars
    if T['star']:
        rng = np.random.default_rng(3)
        f = rng.random((H, W)).astype(np.float32)
        s = np.clip((f - 0.99935) / 0.00065, 0, 1) ** 0.6
        s *= smooth(HZ, 0.05, v)                       # thin out toward the horizon
        s *= 0.35 + 0.65 * rng.random((H, W)).astype(np.float32)
        s = np.asarray(Image.fromarray(np.clip(s * 255, 0, 255).astype(np.uint8))
                       .filter(ImageFilter.GaussianBlur(0.7)), np.float32) / 255
        img += s[..., None] * 1.5

    # ------------------------------------------------------------ sun
    d = np.hypot((u - SUNX) * (W / H), v - SUNY)
    a1, a2, a3 = T['sun_amp']
    img += smooth(0.62, 0.0, d)[..., None] * a1 * np.float32((1.0, 0.99, 0.96))
    img += smooth(0.20, 0.0, d)[..., None] * a2
    img += smooth(0.035, 0.0, d)[..., None] * a3

    img += (smooth(0.34, 0.0, np.abs(u - SUNX))
            * smooth(0.10, 0.0, np.abs(v - HZ)) * T['horizon_glow'])[..., None]

    # light shafts: soft angular fans from the sun, fading with distance
    ang = np.arctan2(v - SUNY, (u - SUNX) * (W / H))
    fan = np.zeros_like(u + v)
    for a0, wid, amp in ((1.32, 0.055, 0.9), (1.62, 0.030, 0.6), (1.95, 0.070, 0.75), (2.35, 0.040, 0.5)):
        fan += amp * np.exp(-(((ang - a0) / wid) ** 2))
    img += (fan * smooth(0.05, 0.35, d) * smooth(1.05, 0.30, d) * T['shafts'])[..., None]

    # ------------------------------------------------------------ swooshes
    # Glossy light gels arcing across the frame. The alpha peaks just under
    # each curve and falls off fast above it, which gives the wet edge.
    for y0, amp, phase, thick, tint, strength in T['swoosh']:
        c = y0 + amp * np.sin(u * 3.0 + phase) + amp * 0.45 * np.sin(u * 6.4 + phase * 1.7)
        dv = v - c
        band = smooth(thick, 0.0, np.abs(dv)) * np.where(dv > 0, 1.0, 0.55)
        edge = np.exp(-((dv / (thick * 0.10)) ** 2)) * 1.6
        img += (np.clip(band * 0.55 + edge, 0, 1) * strength)[..., None] * np.float32(tint)

    # ------------------------------------------------------------ hills
    # Far hills are hazed toward the sky colour, near ones are saturated: the
    # usual atmospheric-perspective trick, and the reason the depth reads.
    for base, amp, freq, ph, top, bot, gloss in T['hills']:
        ridge = base + amp * np.sin(u * freq + ph) + amp * 0.4 * np.sin(u * freq * 2.6 + ph * 2)
        below = smooth(-0.0016, 0.0016, v - ridge)
        depth = np.clip((v - ridge) / 0.42, 0, 1)
        body = np.float32(top) * (1 - depth[..., None]) + np.float32(bot) * depth[..., None]
        # the flank turned toward the light stays brighter
        body = body * (1 + 0.22 * smooth(0.9, 0.0, np.abs(u - SUNX))[..., None])
        # a bright sheet just under the ridge: the Aero plastic look
        body += (np.exp(-((v - ridge) / 0.055) ** 2) * gloss * 0.30)[..., None]
        # rim light along the ridge itself
        body += (np.exp(-((v - ridge) / 0.0032) ** 2) * 0.75 * (0.35 if T['star'] else 1.0))[..., None]
        img = img * (1 - below[..., None]) + body * below[..., None]

    # ------------------------------------------------------------ bokeh
    bok = np.zeros_like(img)
    for bx, by, br, ba in ((0.62, 0.10, 0.055, 0.16), (0.70, 0.22, 0.032, 0.20), (0.84, 0.13, 0.026, 0.18),
                           (0.90, 0.28, 0.044, 0.14), (0.55, 0.19, 0.018, 0.17), (0.79, 0.33, 0.014, 0.13),
                           (0.34, 0.14, 0.022, 0.10), (0.47, 0.30, 0.030, 0.09)):
        r = np.hypot((u - bx) * (W / H), v - by)
        # a real out-of-focus disc is flat with a brighter rim, not a soft blob
        disc = smooth(br, br * 0.86, r) * (0.55 + 0.75 * smooth(br * 0.70, br * 0.97, r))
        bok += (disc * ba)[..., None] * np.float32(T['bokeh_tint'])
    bok = np.asarray(Image.fromarray(np.clip(bok * 255, 0, 255).astype(np.uint8))
                     .filter(ImageFilter.GaussianBlur(7)), np.float32) / 255
    img += bok * (0.55 if T['star'] else 1.0)

    # ------------------------------------------------------------ finish
    img *= 1 - T['vig'] * smooth(0.52, 1.05, np.hypot((u - 0.5) * 1.15, (v - 0.44) * 1.25))[..., None]
    img += np.random.default_rng(7).normal(0, 0.0016, img.shape).astype(np.float32)

    out = Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))
    path = os.path.join(OUT, name + '.webp')
    out.save(path, quality=90, method=6)
    print(name + '.webp  ' + str(os.path.getsize(path) // 1024) + 'KB')


os.makedirs(OUT, exist_ok=True)
for k, t in THEMES.items():
    render(k, t)
