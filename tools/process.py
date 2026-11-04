#!/usr/bin/env python3
"""Process raw AI-generated assets into the final embedded images.

Stage 1: key the flat blue background to transparency, crop, measure.
Writes assets/ and raw/measure.json
"""
import json, os, math
import numpy as np
from PIL import Image, ImageFilter

RAW = os.path.join(os.path.dirname(__file__), '..', 'raw')
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets')
os.makedirs(OUT, exist_ok=True)

def load(name):
    return Image.open(os.path.join(RAW, name)).convert('RGB')

def bg_color(img, edge=24):
    """Median color of the four corners."""
    w, h = img.size
    px = np.asarray(img)
    corners = np.concatenate([
        px[:edge, :edge].reshape(-1, 3),
        px[:edge, -edge:].reshape(-1, 3),
        px[-edge:, :edge].reshape(-1, 3),
        px[-edge:, -edge:].reshape(-1, 3),
    ])
    return np.median(corners, axis=0)

def key_blue(img, thresh=105.0, lo=0.06, hi=0.94):
    """Convert flat blue bg to alpha; un-premultiply against the bg color."""
    rgb = np.asarray(img).astype(np.float32)
    bg = bg_color(img)
    d = rgb - bg[None, None, :]
    dist = np.sqrt((d * d).sum(-1))
    alpha = np.clip(dist / thresh, 0.0, 1.0)
    # soften: remove faint bg noise, solidify core
    alpha = np.where(alpha < lo, 0.0, alpha)
    alpha = np.where(alpha > hi, 1.0, alpha)
    # slight smooth on the alpha channel only
    a_img = Image.fromarray((alpha * 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.asarray(a_img).astype(np.float32) / 255.0
    alpha = np.maximum(alpha, np.where(dist > thresh, 1.0, 0.0))  # keep hard edges hard
    eps = 1e-4
    al = alpha[..., None]
    orig = (rgb - (1.0 - al) * bg[None, None, :]) / np.maximum(al, eps)
    orig = np.clip(orig, 0, 255)
    out = np.dstack([orig, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

def despeckle(img, min_px=40):
    """Remove connected alpha components smaller than min_px."""
    from scipy import ndimage
    a = np.asarray(img)[..., 3]
    lab, n = ndimage.label(a > 8)
    if n:
        sizes = ndimage.sum(a, lab, range(1, n + 1))
        kill = np.isin(lab, np.where(sizes < min_px)[0] + 1)
        a = np.where(kill, 0, a)
    out = np.asarray(img).copy()
    out[..., 3] = a
    return Image.fromarray(out, 'RGBA')

def content_bbox(img, amin=12, frac=0.004):
    """Count-based bbox: rows/cols keep > frac of their length above amin."""
    a = np.asarray(img)[..., 3] > amin
    w, h = a.shape[1], a.shape[0]
    cols = np.where(a.sum(0) > w * frac)[0]
    rows = np.where(a.sum(1) > h * frac)[0]
    return int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1

def crop_pad(img, pad_frac=0.02):
    x0, y0, x1, y1 = content_bbox(img)
    w, h = x1 - x0, y1 - y0
    pad = int(round(max(w, h) * pad_frac))
    x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad); y1 = min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1)), (x0, y0, x1, y1)

meas = {}

# ---------------- objects (PNG) ----------------
# (source, box W x H from the spec, vertical anchor: 'center' or 'bottom')
OBJECTS = {
    'mug':   ('mug_raw2.png',    241, 220, 'center'),
    'ibook': ('ibook_raw2.png',  312, 377, 'center'),
    'book':  ('book_raw2.png',   293, 322, 'center'),
    'tshirt':('tshirt_raw.png',  250, 226, 'bottom'),
}
for name, (src, W, H, anch) in OBJECTS.items():
    img = load(src)
    cut, bbox = crop_pad(despeckle(key_blue(img)))
    s = min(W / cut.width, H / cut.height)
    cw, ch = max(1, int(round(cut.width * s))), max(1, int(round(cut.height * s)))
    cut = cut.resize((cw, ch), Image.LANCZOS)
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px, py = (W - cw) // 2, (H - ch) // 2 if anch == 'center' else H - ch
    canvas.paste(cut, (px, py))
    canvas.save(os.path.join(OUT, f'{name}.png'), optimize=True)
    meas[name] = {'src_size': list(img.size), 'bbox': list(bbox), 'out': [W, H], 'content': [cw, ch, px, py]}
    print(name, img.size, '-> content', (cw, ch), 'in', (W, H), anch)

# ---------------- idle face (WebP 308) ----------------
face = despeckle(key_blue(load('idleface_raw.png'), thresh=95), min_px=60)
face_c, fb = crop_pad(face, pad_frac=0.015)
side = max(face_c.width, face_c.height)
sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
sq.paste(face_c, ((side - face_c.width) // 2, (side - face_c.height) // 2))
sq = sq.resize((308, 308), Image.LANCZOS)
sq.save(os.path.join(OUT, 'idleface.webp'), 'WEBP', quality=88)
meas['idleface'] = {'bbox': list(fb), 'out': [308, 308]}
print('idleface', face_c.size, '-> 308')

# ---------------- fly (WebP) ----------------
fly = despeckle(key_blue(load('fly_raw.png'), thresh=80), min_px=60)
fly_c, flb = crop_pad(fly, pad_frac=0.03)
meas['fly'] = {'bbox': list(flb), 'crop_size': list(fly_c.size)}
fly_c.save(os.path.join(RAW, 'fly_crop.png'))
print('fly crop', fly_c.size)

# ---------------- spider (WebP 560) ----------------
sp = despeckle(key_blue(load('spider_photo_raw.png'), thresh=95, lo=0.05, hi=0.93), min_px=60)
sp_c, spb = crop_pad(sp, pad_frac=0.01)
meas['spider'] = {'bbox': list(spb), 'crop_size': list(sp_c.size)}
# save big working copy (content square) for rig calibration
side = max(sp_c.width, sp_c.height)
sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
sq.paste(sp_c, ((side - sp_c.width) // 2, (side - sp_c.height) // 2))
sq.save(os.path.join(RAW, 'spider_crop.png'))
print('spider crop', sp_c.size)

with open(os.path.join(RAW, 'measure.json'), 'w') as f:
    json.dump(meas, f, indent=1)
print('done')
