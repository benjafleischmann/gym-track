#!/usr/bin/env python3
"""Generate GymTrack PWA icons from the in-app 'dumbbell' SVG mark.

Mirrors js/app.js _icon(): 24x24 viewBox, fill none, stroke-width 2,
round caps/joins, accent background #FC4C02 (--accent in css/app.css).
"""
from PIL import Image, ImageDraw

ACCENT = (252, 76, 2)
WHITE = (255, 255, 255)
SS = 4           # supersample factor for smooth edges
ART_FRAC = 0.56  # keep mark inside the maskable safe zone

# dumbbell paths from js/app.js, in 24x24 viewBox units
LINES = [(6.5, 6.5, 17.5, 6.5), (6.5, 17.5, 17.5, 17.5),
         (3, 9.5, 21, 9.5),     (3, 14.5, 21, 14.5)]
RECTS = [(5, 5, 3, 14, 1), (16, 5, 3, 14, 1)]  # x, y, w, h, rx


def make(size):
    s = size * SS
    img = Image.new('RGB', (s, s), ACCENT)
    d = ImageDraw.Draw(img)

    art = s * ART_FRAC
    off = (s - art) / 2
    k = art / 24
    def P(v):
        return off + v * k

    sw = max(1, round(2 * k))  # stroke-width 2

    for x1, y1, x2, y2 in LINES:
        d.line([P(x1), P(y1), P(x2), P(y2)], fill=WHITE, width=sw)
        for cx, cy in ((x1, y1), (x2, y2)):  # stroke-linecap: round
            d.ellipse([P(cx) - sw / 2, P(cy) - sw / 2,
                       P(cx) + sw / 2, P(cy) + sw / 2], fill=WHITE)

    for x, y, w, h, rx in RECTS:
        d.rounded_rectangle([P(x), P(y), P(x + w), P(y + h)],
                            radius=rx * k, outline=WHITE, width=sw)

    return img.resize((size, size), Image.LANCZOS)


if __name__ == '__main__':
    import os
    os.makedirs('icons', exist_ok=True)
    for n in (192, 512):
        path = f'icons/icon-{n}.png'
        make(n).save(path, optimize=True)
        print('wrote', path)
