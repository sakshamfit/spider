#!/usr/bin/env python3
"""Draw the 11 UI icons as transparent PNGs (2x for crispness)."""
import math, os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
SS = 4  # supersample

def canvas(w, h):
    im = Image.new('RGBA', (w * SS, h * SS), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)

def save(im, name, w, h):
    im = im.resize((w, h), Image.LANCZOS)
    im.save(os.path.join(OUT, name), optimize=True)
    print(name, im.size, os.path.getsize(os.path.join(OUT, name)))

WHITE = (255, 255, 255, 255)

# ---- search.png 52 (26u) ----
im, d = canvas(52, 52)
d.ellipse([7*SS, 7*SS, 34*SS, 34*SS], outline=WHITE, width=5*SS)
d.line([31*SS, 31*SS, 45*SS, 45*SS], fill=WHITE, width=6*SS)
d.ellipse([44*SS-3*SS, 44*SS-3*SS, 44*SS+3*SS, 44*SS+3*SS], fill=WHITE)
save(im, 'search.png', 52, 52)

# ---- menu.png 52 (26u) ----
im, d = canvas(52, 52)
d.rounded_rectangle([6*SS, 17*SS, 46*SS, 22*SS], radius=2.5*SS, fill=WHITE)
d.rounded_rectangle([6*SS, 33*SS, 46*SS, 38*SS], radius=2.5*SS, fill=WHITE)
save(im, 'menu.png', 52, 52)

# ---- heart.png 40 (20u) ----
im, d = canvas(40, 40)
pts = []
for i in range(100):
    t = 2 * math.pi * i / 100
    x = 16 * math.sin(t) ** 3
    y = 13 * math.cos(t) - 5 * math.cos(2*t) - 2 * math.cos(3*t) - math.cos(4*t)
    pts.append((20*SS + x*SS*1.02, 21*SS - y*SS*1.02))
d.polygon(pts, fill=WHITE)
save(im, 'heart.png', 40, 40)

# ---- shuffle.png 32 (16u) ----
im, d = canvas(32, 32)
w = 3 * SS
d.line([4*SS, 9*SS, 12*SS, 9*SS], fill=WHITE, width=w)
d.line([4*SS, 23*SS, 12*SS, 23*SS], fill=WHITE, width=w)
d.line([12*SS, 9*SS, 21*SS, 23*SS], fill=WHITE, width=w)
d.line([12*SS, 23*SS, 21*SS, 9*SS], fill=WHITE, width=w)
d.line([21*SS, 23*SS, 25*SS, 23*SS], fill=WHITE, width=w)
d.line([21*SS, 9*SS, 25*SS, 9*SS], fill=WHITE, width=w)
# arrowheads
d.polygon([(24*SS, 6*SS), (30*SS, 9*SS), (24*SS, 12*SS)], fill=WHITE)
d.polygon([(24*SS, 20*SS), (30*SS, 23*SS), (24*SS, 26*SS)], fill=WHITE)
save(im, 'shuffle.png', 32, 32)

# ---- prev.png 48 (24u) ----
im, d = canvas(48, 48)
d.polygon([(10*SS, 8*SS), (10*SS, 40*SS), (12*SS, 40*SS), (12*SS, 8*SS)], fill=WHITE)
d.polygon([(26*SS, 8*SS), (26*SS, 40*SS), (12*SS, 24*SS)], fill=WHITE)
d.polygon([(44*SS, 8*SS), (44*SS, 40*SS), (30*SS, 24*SS)], fill=WHITE)
save(im, 'prev.png', 48, 48)

# ---- next.png 48 (24u) ----
im, d = canvas(48, 48)
d.polygon([(38*SS, 8*SS), (36*SS, 8*SS), (36*SS, 40*SS), (38*SS, 40*SS)], fill=WHITE)
d.polygon([(22*SS, 8*SS), (22*SS, 40*SS), (36*SS, 24*SS)], fill=WHITE)
d.polygon([(4*SS, 8*SS), (4*SS, 40*SS), (18*SS, 24*SS)], fill=WHITE)
save(im, 'next.png', 48, 48)

# ---- repeat.png 32 (16u) ----
im, d = canvas(32, 32)
w = 3 * SS
d.arc([5*SS, 8*SS, 27*SS, 24*SS], start=250, end=130, fill=WHITE, width=w)
d.arc([5*SS, 8*SS, 27*SS, 24*SS], start=70, end=290, fill=WHITE, width=w)
d.polygon([(25*SS, 12*SS), (31*SS, 16*SS), (24*SS, 20*SS)], fill=WHITE)
d.polygon([(7*SS, 12*SS), (1*SS, 16*SS), (8*SS, 20*SS)], fill=WHITE)
save(im, 'repeat.png', 32, 32)

# ---- play.png 96 (48u) ----
im, d = canvas(96, 96)
d.ellipse([0, 0, 96*SS, 96*SS], fill=WHITE)
save(im, 'play.png', 96, 96)

# ---- logoback.png 106x82 (53x41u) — folder back with tab ----
im, d = canvas(106, 82)
s = SS
def rr_path(d, pts, r, width, close=True):
    # polyline with rounded corners via joint='curve'
    d.line(pts + ([pts[0]] if close else []), fill=WHITE, width=width, joint='curve')
    for p in pts:
        pass
w = 6 * s
# back panel: tab + box outline
pts = [(8*s, 24*s), (8*s, 12*s), (36*s, 12*s), (46*s, 22*s), (98*s, 22*s), (98*s, 70*s), (8*s, 70*s)]
d.line([(8*s, 28*s)] + pts[1:], fill=WHITE, width=w, joint='curve')
d.line(pts, fill=WHITE, width=w, joint='curve')
for p in [pts[0], pts[1], pts[2], pts[3], pts[4], pts[5], pts[6]]:
    d.ellipse([p[0]-w/2, p[1]-w/2, p[0]+w/2, p[1]+w/2], fill=WHITE)
save(im, 'logoback.png', 106, 82)

# ---- logofront.png 106x68 (53x34u) — folder front panel ----
im, d = canvas(106, 68)
s = SS
w = 6 * s
pts = [(6*s, 16*s), (100*s, 16*s), (100*s, 58*s), (6*s, 58*s)]
d.line(pts + [pts[0]], fill=WHITE, width=w, joint='curve')
for p in pts:
    d.ellipse([p[0]-w/2, p[1]-w/2, p[0]+w/2, p[1]+w/2], fill=WHITE)
save(im, 'logofront.png', 106, 68)

# ---- art.png 80 (40u) — player thumbnail: mini gradient artwork ----
im = Image.new('RGBA', (80 * SS, 80 * SS), (0, 0, 0, 0))
px = im.load()
for y in range(80 * SS):
    for x in range(80 * SS):
        u, v = x / (80 * SS), y / (80 * SS)
        r = int(255 - 90 * u)
        g = int(120 + 60 * v)
        b = int(90 + 140 * (1 - u) * v)
        px[x, y] = (r, g, b, 255)
d = ImageDraw.Draw(im)
d.ellipse([18*SS, 22*SS, 62*SS, 66*SS], fill=(255, 255, 255, 230))
d.ellipse([28*SS, 32*SS, 52*SS, 56*SS], fill=(255, 140, 160, 255))
im = im.resize((80, 80), Image.LANCZOS)
mask = Image.new('L', (80*SS, 80*SS), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, 80*SS, 80*SS], radius=24*SS, fill=255)
mask = mask.resize((80, 80), Image.LANCZOS)
im.putalpha(mask)
im.save(os.path.join(OUT, 'art.png'), optimize=True)
print('art.png', im.size, os.path.getsize(os.path.join(OUT, 'art.png')))
