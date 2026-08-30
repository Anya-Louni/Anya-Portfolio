# -*- coding: utf-8 -*-
"""
Renders the social card at public/og.png.

This is the picture that shows up when the link is pasted into LinkedIn, a
message or an email, so it is often the first thing anyone sees. It carries
the name and says what the site is, because a card that shows only a pretty
gradient makes the reader guess.

The sky is the same maths as the wallpaper in wall.py, at card proportions.
Run it after changing the name or the strapline:

    python tools/og.py
Social networks cache a card by its URL, sometimes for weeks, so renaming
the file is the only reliable way to make them pick up a new one. Bump the
number here and in index.html together.
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'og-v3.png')

TITLE = 'OSnya'
LINE = 'My Portfolio: Projects, experience, games and more'

# ---------------------------------------------------------------- the sky
x = np.arange(W, dtype=np.float32)
y = np.arange(H, dtype=np.float32)[:, None]
u, v = x / W, y / H

sky_top = np.array([0.06, 0.32, 0.72], np.float32)
sky_low = np.array([0.55, 0.83, 0.96], np.float32)
t = np.clip(v / 0.62, 0, 1)[..., None] ** 0.85
img = np.broadcast_to(sky_top * (1 - t) + sky_low * t, (H, W, 3)).astype(np.float32).copy()

# sun, upper right, with a soft bloom
sx, sy = 0.79, 0.16
d = np.sqrt(((u - sx) * (W / H)) ** 2 + (v - sy) ** 2)
img += np.clip(1 - d / 0.30, 0, 1)[..., None] ** 2.4 * np.array([1.0, 0.98, 0.92], np.float32)
img += np.clip(1 - d / 0.75, 0, 1)[..., None] ** 3.0 * np.array([0.35, 0.45, 0.55], np.float32)

# hills: two bands of green rolling across the lower third
for base, amp, freq, phase, col in (
    (0.66, 0.030, 1.7, 0.4, (0.42, 0.74, 0.44)),
    (0.78, 0.040, 1.1, 2.1, (0.26, 0.62, 0.32)),
    (0.90, 0.025, 2.3, 4.0, (0.16, 0.48, 0.24)),
):
    ridge = base + amp * np.sin(u * freq * 2 * np.pi + phase)
    mask = (v > ridge)[..., None]
    shade = np.clip((v - ridge) * 2.2, 0, 1)[..., None]
    band = np.array(col, np.float32) * (1 - shade * 0.35)
    img = np.where(mask, band, img)

img = np.clip(img, 0, 1)
card = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), 'RGB')
card = card.filter(ImageFilter.GaussianBlur(0.4))

# ------------------------------------------------------------- the pane
PX, PY, PW, PH = 70, 165, 700, 300
pane = card.crop((PX, PY, PX + PW, PY + PH)).filter(ImageFilter.GaussianBlur(18))
tint = Image.new('RGB', (PW, PH), (26, 42, 68))
pane = Image.blend(pane, tint, 0.62)

mask = Image.new('L', (PW, PH), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, PW - 1, PH - 1), radius=18, fill=255)
card.paste(pane, (PX, PY), mask)

d = ImageDraw.Draw(card, 'RGBA')
d.rounded_rectangle((PX, PY, PX + PW - 1, PY + PH - 1), radius=18, outline=(255, 255, 255, 70), width=1)
d.line((PX + 18, PY + 1, PX + PW - 18, PY + 1), fill=(255, 255, 255, 110), width=1)


def font(name, size):
    for p in (f'C:/Windows/Fonts/{name}', f'/usr/share/fonts/truetype/dejavu/{name}'):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


d.text((PX + 44, PY + 62), TITLE, font=font('segoeuib.ttf', 92), fill=(255, 255, 255))

# The strapline is one line, so it is measured and stepped down until it fits
# rather than trusting a size that happened to work for older wording.
room = PW - 44 - 34
size = 34
while size > 14 and d.textlength(LINE, font=font('segoeui.ttf', size)) > room:
    size -= 1
d.text((PX + 46, PY + 182), LINE, font=font('segoeui.ttf', size), fill=(226, 240, 255))
print('strapline at', size, 'px')

assert d.textlength(TITLE, font=font('segoeuib.ttf', 92)) < room, 'title too wide'

# A flat sky compresses; the wallpaper's dither would triple the file for a
# card nobody inspects that closely.
card = card.quantize(colors=256, method=Image.Quantize.MEDIANCUT).convert('RGB')
card.save(OUT, 'PNG', optimize=True)
print('wrote', OUT, card.size, os.path.getsize(OUT) // 1024, 'KB')
