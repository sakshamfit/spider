#!/usr/bin/env python3
"""Detect the 6 eye blobs in idleface.webp -> raw/eyes.json"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage

im = Image.open('assets/idleface.webp').convert('RGBA')
# composite on the skin-ish avg color to catch dark eyes vs blue bg
a = np.asarray(im).astype(np.float32)
alpha = a[...,3:4]/255.0
rgb = a[...,:3]
dark = (rgb.mean(-1) < 90) & (alpha[...,0] > 0.6)
lab, n = ndimage.label(dark)
objs = ndimage.find_objects(lab)
eyes = []
for i, sl in enumerate(objs):
    if sl is None: continue
    m = (lab[sl] == i+1)
    size = m.sum()
    if size < 30: continue
    h = sl[0].stop-sl[0].start; w = sl[1].stop-sl[1].start
    if h > 200 or w > 200: continue
    cy, cx = ndimage.center_of_mass(m)
    eyes.append({'x': float(sl[1].start+cx), 'y': float(sl[0].start+cy),
                 'r': float(max(h,w)/2), 'size': int(size)})
eyes.sort(key=lambda e: -e['size'])
eyes = eyes[:8]
print(json.dumps(eyes, indent=0))
with open('raw/eyes.json','w') as f: json.dump(eyes, f)
