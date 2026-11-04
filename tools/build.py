#!/usr/bin/env python3
"""Assemble the single-file index.html from src/ + assets/."""
import base64, json, os

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'src')
A = os.path.join(ROOT, 'assets')

def b64(path, mime):
    with open(path, 'rb') as f:
        return f'data:{mime};base64,' + base64.b64encode(f.read()).decode()

def read(p):
    with open(p) as f:
        return f.read()

assets = {
    'spider': b64(f'{A}/spider.webp', 'image/webp'),
    'face': b64(f'{A}/idleface.webp', 'image/webp'),
    'fly': b64(f'{A}/fly.webp', 'image/webp'),
    'mug': b64(f'{A}/mug.png', 'image/png'),
    'ibook': b64(f'{A}/ibook.png', 'image/png'),
    'book': b64(f'{A}/book.png', 'image/png'),
    'tshirt': b64(f'{A}/tshirt.png', 'image/png'),
    'art': b64(f'{A}/art.png', 'image/png'),
    'logoback': b64(f'{A}/logoback.png', 'image/png'),
    'logofront': b64(f'{A}/logofront.png', 'image/png'),
    'search': b64(f'{A}/search.png', 'image/png'),
    'menu': b64(f'{A}/menu.png', 'image/png'),
    'heart': b64(f'{A}/heart.png', 'image/png'),
    'shuffle': b64(f'{A}/shuffle.png', 'image/png'),
    'prev': b64(f'{A}/prev.png', 'image/png'),
    'play': b64(f'{A}/play.png', 'image/png'),
    'next': b64(f'{A}/next.png', 'image/png'),
    'repeat': b64(f'{A}/repeat.png', 'image/png'),
    'github': b64(f'{A}/github.png', 'image/png'),
    'mail': b64(f'{A}/mail.png', 'image/png'),
}

css = read(f'{SRC}/styles.css')
css = css.replace('__FONT_400__', b64(f'{ROOT}/raw/fonts/inter-latin-400-normal.woff2', 'font/woff2'))
css = css.replace('__FONT_500__', b64(f'{ROOT}/raw/fonts/inter-latin-500-normal.woff2', 'font/woff2'))
css = css.replace('__FONT_600__', b64(f'{ROOT}/raw/fonts/inter-latin-600-normal.woff2', 'font/woff2'))
for k, v in assets.items():
    css = css.replace(f'__{k.upper()}__', v)

body = read(f'{SRC}/body.html')
for k, v in assets.items():
    body = body.replace(f'__{k.upper()}__', v)

eyes = json.load(open(os.path.join(ROOT, 'raw', 'eyes.json')))
eyes6 = [
    [round(eyes[0]['x'], 1), round(eyes[0]['y'], 1), round(eyes[0]['r'], 1)],
    [round(eyes[1]['x'], 1), round(eyes[1]['y'], 1), round(eyes[1]['r'], 1)],
    [round(eyes[3]['x'], 1), round(eyes[3]['y'], 1), round(eyes[3]['r'], 1)],
    [round(eyes[2]['x'], 1), round(eyes[2]['y'], 1), round(eyes[2]['r'], 1)],
    [round(eyes[6]['x'], 1), round(eyes[6]['y'], 1), round(eyes[6]['r'], 1)],
    [round(eyes[5]['x'], 1), round(eyes[5]['y'], 1), round(eyes[5]['r'], 1)],
]

js = '\n'.join(read(f'{SRC}/engine.p{i}.js') for i in range(1, 8))
prelude = 'const ASSETS = ' + json.dumps(assets) + ';\n'
prelude += 'window.__EYES__ = ' + json.dumps(eyes6) + ';\n'

html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Found</title>
<style>
{css}
</style>
</head>
<body>
{body}
<script>
{prelude}
{js}
</script>
</body>
</html>
'''
out = os.path.join(ROOT, 'index.html')
with open(out, 'w') as f:
    f.write(html)
print('wrote', out, f'{os.path.getsize(out)/1024:.0f} KB')
