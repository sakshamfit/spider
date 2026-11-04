# found — the curiosity cabinet

A single-file, full-screen home page for **found**, a personal archive of
curious objects. Flat electric blue, a giant white wordmark, floating
collectibles — and a photo-real jumping spider that drops in on a silk
thread, chases the fly that replaces your mouse cursor, and spins real
sagging silk between the letters and objects.

Open `index.html`. That's the whole site: every image is embedded as a
base64 data URI (Inter included), there are no libraries, and everything
runs on one 2D canvas.

## Interactions

| input | action |
|---|---|
| move the mouse | the fly follows the cursor (and hides over buttons/links) |
| wait | the fly lands, the spider settles, its head crossfades to a cute face that blinks, and after 8s it falls asleep (zzz) |
| move while it sleeps | a startled hop |
| click / double-tap | the spider pounces at the fly and wraps it in a silk cocoon |
| Delete / Backspace (hold on touch) | the web shakes loose and every dew drop falls |
| player ▶ | three SomaFM streams (Groove Salad / Lush / Drone Zone) |

The spider walks on inverse-kinematics legs sliced from a single photo,
plans alternating tetrapod footsteps, breathes, sways into its turns, and
nudges the objects it brushes past. Silk threads are verlet ropes with
iridescence, micro-hairs, fluff and dew that slides, falls, and splats on
letters and objects — their shadows fall only on the artwork, never on
the blue.

## Rebuilding

`index.html` is generated. To rebuild it after touching the CSS, markup,
engine, or assets:

```
python3 tools/build.py        # assembles src/ + assets/ -> index.html
```

Asset pipeline (only needed if you replace the artwork):

```
python3 tools/process.py      # key blue -> alpha, crop, fit to spec boxes
python3 tools/calibrate.py    # detect the 6 eyes in the idle face
python3 tools/icons.py        # redraw the 11 UI icons
```

`src/engine.p1–7.js` hold the engine (rig, gait, silk, fly, player, loop)
and are concatenated into the page.

## Visual tests

Headless smoke tests via puppeteer-core + `@sparticuz/chromium`:

```
npm install
node tools/shot.js       # boot state + screenshot
node tools/walk.js       # walks the pointer around, screenshots
node tools/behaviour.js  # rest face, pounce, catch, clear-web
node tools/sleeptest.js  # sleep ramp + startled wake
```

(The sandbox chromium needs `LD_LIBRARY_PATH=/tmp/al2023/lib` — handled in
`tools/browser.js` after `node -e "require('@sparticuz/chromium').default
.executablePath()"` has inflated it once.)
