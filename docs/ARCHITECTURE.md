# Architecture

This document describes how the single-file Shenzhen diorama is organised, how
the day and night scenes stay independent, and where to extend it.

## 1. Constraints

- **One deployable file.** `index.html` is generated from `src/` and inlines
  Three.js, CSS, JS and every texture. It must work from `file://` with no
  network.
- **No runtime dependencies.** No CDN, no image/font/audio assets, no shader
  includes from addons.
- **Two scenes, one timeline.** The day diorama and the neon night interpretation
  are separate `THREE.Scene` instances, cameras and post pipelines, but they share
  the same `elapsed / year / playing` timeline state.
- **Artistic compression.** The model is not a surveyed plan: landmark spacing,
  city depth, hills and figure scale are deliberately adjusted for readability.

## 2. Coordinate system and composition

| Axis | Direction | Notes |
| --- | --- | --- |
| +X | east | Ping An is near x=0; Diwang is east/right at x≈15.5 |
| +Z | south | Shenzhen Bay is south, z≈18–42; camera sits south of the model |
| +Y | up | terrain top y≈0, landmark bases at `PAD = 0.14` |

| Element | Position | Approx. height |
| --- | --- | --- |
| Ping An Finance Centre | `(0, PAD, -4)` | 30.4 model units (≈599 m in the story) |
| Diwang / Shun Hing Square | `(15.5, PAD, -13.5)` | 22.5 units |
| Coastline / promenade | `z ≈ 18.2` | y≈0.2 |
| Shenzhen Bay water | `z 18.2 … 42` | y≈0.36 |
| Bridge | `(18, 0.34, 24.5)`, scale 0.58 | low deck, two pylons |
| Breakfast alley | `(-16, PAD, 5)` | five figures |
| Greenway | `(1, PAD, 14)` | six figures |
| Market alley | `(15.5, PAD, 6)` | nine figures |
| Day camera (2026) | `(6, 29, 60) → (0, 6, 4)` | FOV 45° |

The day camera is intentionally high enough to keep the water, three life
scenes and both towers in one frame. The night camera is a separate low-ish
skyline view:

- night camera: `(8, 25, 64)`, target `(0, 11, 2)`, FOV 55°; for 1980–2000 it
  translates west by up to `-34` in X / `-4` in Y, then returns to the 2026 view.
- night orbit clamps pitch to `[0.035, 1.18]`

## 3. Source and build

```
src/shell.html   page skeleton, HUD, caption markup
src/style.css    HUD, shared timeline, day/night themes, APEC badge
src/app.js       the complete scene engine (IIFE)
vendor/three.min.js
scripts/build.mjs  replaces three placeholders in shell.html
```

`scripts/build.mjs` validates that all source files and placeholder tokens exist,
strips the legacy Three.js deprecation warning, and writes a deterministic
`index.html`. No bundler is used.

## 4. Day scene

### 4.1 Renderer and studio

- `WebGLRenderer` with `NoToneMapping`; final grading happens in the composite
  pass.
- `PCFSoftShadowMap` with a single 2048² directional key light from the
  left-front-upper direction, plus a low frontal bounce and hemisphere fill.
- Shadow auto-update is disabled; the map is rebuilt only when the year or
  geometry changes.

### 4.2 Materials and procedural textures

All maps are `CanvasTexture`s generated at runtime:

- paper fibres, folds and bump (`paperTexture`)
- basswood grain (`texWood`)
- flocking / grass
- curtain-wall grid and printed rib pattern
- water is a custom `ShaderMaterial`
- signage (`signTexture`), table label, backdrop gradient and folds

Day materials are deliberately matte: roughness ≈0.8–1.0, metalness ≈0. The
water is a tinted acrylic shader rather than a mirror.

### 4.3 Terrain, plinth and bay

- A rounded, bevelled extruded basswood plinth; the land sheet is paper.
- Coast cut edge, opaque seabed and a thin 0.3-unit water box with a transparent
  rim.
- Paper ridges and a low Nanshan hill frame the city.
- The acrylic water shader uses a low-amplitude normal approximation, Fresnel,
  a shallow-water line and a restrained specular term.

### 4.4 City generation and growth

`city[]` contains ~101 generic buildings with `{x,z,w,d,h,year,roof,tank,bulk}`.
Three instanced meshes draw towers, caps, roof boxes, rooftop tanks and
stair/bulk volumes. For every frame (or year change):

```
s  = smoothstep(b.year, b.year + 1.5, currentYear)
ws = s < 0.02 ? 0.0001 : 1
tower matrix = (b.w*ws, b.h*s, b.d*ws)
```

Caps and roof pieces are scaled by `clamp(s*3, 0.0001, 1)` so an unbuilt
building leaves no flat pad on the ground. Roof tanks/bulkheads appear only when
`s > 0.35`.

### 4.5 Landmarks

- **Ping An**: a lofted octagonal tower, 8 tapered corner fins, three subtle
  crowns, a spire plus beacon and a detailed podium/plaza. The night clone
  replaces its materials with a neon curtain texture and adds bright corner
  tubes, rings and a beacon.
- **Diwang**: a tapered square tower with step crown, twin masts and podium.
- Landmark groups scale on all axes from the ground; they are not visible before
  their construction window.

### 4.6 Three everyday scenes

Each scene is a `THREE.Group` at its anchor and contains a merged opaque
geometry, separate mapped signs, figures and (for the stall) steam sprites.

- **Breakfast**: narrow alley, shopfronts, awning, cart, steamer, folding table,
  stools, QR stand, tray, five figures.
- **Greenway**: 82-unit promenade, railing, pavilion, benches, shared bikes, dog
  and leash, mangroves, six figures.
- **Market**: alley, roller shutter, lychee/vegetable/shoe stalls, crates,
  cart, nine figures.

Figures are built with `GeoBuilder`: every limb is a cylinder/tube between
joints; feet are boxes; head/hair/hat are low-poly spheres. All parts are merged
into one vertex-coloured mesh per figure. The result is 20 draw calls for 20
figures, with hands/feet positions available for props and contact checks.
No facial features are added.

### 4.7 Timeline

`ANCHORS` defines eight chapter holds (1980, 1985, 1990, 1996, 2004, 2011,
2016, 2026); `SEGMENTS` alternate holds and eased moves. `yearAt(t)` drives
growth, camera keys and HUD; `timeForYear(y)` is used for scrubbing. The camera
interpolates between `CAM_KEYS` and adds user yaw/pitch/zoom.

### 4.8 Day post-processing

1. Render scene to a HalfFloat (or UnsignedByte) `rtScene`.
2. Composite full-screen quad:
   - radial tilt-shift blur driven by projected focus anchors (Ping An, two
     greenway points, breakfast, market, bridge)
   - ACES tone mapping, warm-grey contrast/saturation, gentle vignette
   - 1/255 dithering, no Bloom, no full-frame grain texture
3. Blit to the canvas.

## 5. Night scene

`nightScene` is built once at startup and is **not** a child of the day scene.

### 5.1 Sky, city and water

- A shader sky sphere with a deep-violet gradient, horizon glow and sparse stars.
- Additive horizon/city glow cards behind the skyline.
- Two low dark ridges; a dark ground plane; a waterfront promenade with neon
  rail and path lights.
- Generic city volumes use five `InstancedMesh` layers (tower, cap, roof, tank,
  bulk) sharing the day geometry but a dark night material. `updateNightCity(year)`
  writes the same per-building growth matrices used by the day scene, so the
  night skyline grows from 1980 to 2026.
- Window points and neon lines carry an `aYear` attribute. Their shaders compare it
  with `uYear` and fade each element in as its building comes up, without
  rebuilding any buffer.
- All static night lights are accumulated into **one** additive `Points` batch:
  windows, promenade lamps, boulevard lamps, bridge deck/pylon lights, landmark
  beacons and fireworks flashes. One shader (`nightPointMat`) is shared with the
  drone and firework point clouds.
- All neon strokes—city edges, shopfronts, landmark rings/fins, bridge cables
  and the coast rail—are accumulated into **one** `LineSegments` buffer. Colors
  are pre-multiplied by per-segment opacity, so no material/style switch is
  needed.
- The water is a custom dark shader with Fresnel, moving bands and soft neon
  reflection columns under Ping An/Diwang. No mirror render target is used.

### 5.2 Timeline and 1980 memory

- The night scene shares the day `state.elapsed / state.year / state.playing`.
  `updateNight(t, dt, year)` advances the same timeline, HUD and audio; there is
  no separate fixed-2026 clock.
- At 1980 the night scene shows a dark clone of the day village, its boats and
  the old billboard, plus 28 warm lantern points, all toggled in
  `updateNightWorld(year)`.
- The night camera translates west for 1980–2000 (`panX = -34 * (1 - smoothstep(1980,2000,year))`)
  and returns to the 2026 skyline composition after 2000.
- Promenade/bridge meshes and their lights switch on in the 2017.8–2020.5 window;
  the bridge follows the day 2020.5 growth gate.

### 5.3 Landmarks and bridge

- `pingan.clone(true)` and `diwang.clone(true)` preserve the exact hero
  silhouettes. `nightify()` assigns two shared materials:
  - mapped meshes use a hand-drawn neon grid as `map` + `emissiveMap`
  - non-mapped podium/vertex meshes become nearly black
- `mergeByMaterial()` then flattens each clone to **two draw calls** (mapped +
  dark) by baking child transforms into a merged `BufferGeometry`; the day
  geometries are shared and are never modified. The bridge becomes a single
  dark merge.
- Neon lines follow the tower corner geometry; rings mark crown/shoulder levels;
  beacons are point-batch entries; the rooftop sign is mounted over the
  old-street block.
- The bridge clone receives a lit deck line, cable neon, pylon beacons and deck
  points.

### 5.4 Drone show

48 additive points are arranged as two wings (40) and a body (8). Positions are
computed every frame:

```
wing: x = side * (1.1 + u * 14.0)
      y = 30.4 + sin(u*PI) * 3.9 + flap + sin(t*1.2 + phase) * 0.10
      z = 18.0 - u * 7.4 + cos(t*0.42 + phase) * 0.32
body: x ≈ 0, y = 32.4 + k*0.20, z = 17.5 - k*2.0
```

A second `LineSegments` buffer draws short motion trails. The shared additive
point shader adds the soft disc; per-drone alpha produces the twinkle, and Bloom
turns the points into lights.

### 5.5 Fireworks

- One 760-particle pool (`position`, `aColor`, `aAlpha`, `aSize`) plus a
  `LineSegments` trail buffer.
- Bursts spawn 130–175 particles: 58% on a shell speed band, the rest with a
  wider random spread. Gravity `-2.6`, drag ≈0.985, life 1.25–2.4 s.
- The first burst is forced to the centre at 34 units for a reliable hero frame;
  subsequent bursts are random over the bay.
- Four rotating flash slots in the static point batch add a brief centre glow
  (no Sprite objects or extra draw calls).
- The night composer's bloom is what makes the bursts read as fireworks rather
  than coloured dots.

### 5.6 APEC 2026 host mark

- A single `apecSignTexture()` draws the original APEC 2026 / CHINA · SHENZHEN
  host mark with a gold wing/roof emblem, a gold border and Chinese host line.
- The day scene has an `apecDay` group on the west waterfront: dark plaque,
  posts, sign plane and a gold wing line; `updateWorld()` reveals it from 2024.8.
- The night scene has an additive `apecNight` plane in `signScene` plus 50 gold
  wing points/lines at `aYear = 2024.8` in the batched lights.
- The persistent HUD `#apecBadge` is visible in both modes and gets `.live` gold
  styling once `year > 2024.55`.
- The mark is an original host-city visual, not a reproduction of the official
  APEC trademark.

### 5.7 Night post-processing

1. Render `nightScene` to the shared scene RT.
2. Threshold pass (`uThreshold 0.42`, knee 0.30) into a half-resolution bright RT.
3. One separable Gaussian pass: horizontal to a temporary half-res RT, then
   vertical back to the bloom RT (`uRadius 4.2`).
4. Composite: `base + bloom * 2.00`, exposure 1.08, ACES, cool-shadow grade,
   vignette, tiny dither. No anamorphic streaks or lens dirt.
5. Render the rooftop sign and the APEC hologram from a tiny `signScene` with the
   same night camera after the composite, with depth testing disabled. This keeps
   the CanvasTextures crisp and keeps their high-frequency glow out of the
   half-res bloom (which otherwise produced visible vertical banding). It costs
   two draws for the rooftop sign and one for APEC.

## 6. Day/night state machine

```
mode = 'day' | 'night'
state.elapsed / state.year / state.playing   // shared by both scenes
nightTime                                     // ambient sky/water/firework clock
```

`setMode('night')` keeps the current timeline state, resets only the night
ambient clock/show effects and orbit, switches the body class and renderer clear
colour, and renders one night frame immediately. `setMode('day')` uses the same
year and playing state and renders the day scene; no year/playback restore is
needed.

The frame loop advances the shared timeline in either mode:

```
if (mode === 'night') {
  advance state.elapsed -> state.year
  nightTime += dt
  updateNight(nightTime, dt, state.year)
  updateHUD(state.year, state.elapsed)
  renderNight()
} else {
  advance state.elapsed -> state.year
  updateWorld(year, clockTime)
  updateHUD(year, state.elapsed)
  renderPipeline()
}
```

Keyboard: `N` toggles modes; `Esc` leaves night; `Space`, arrows and `R` work in
both modes. The bottom timeline is present in both and scrubs the shared year.

## 7. Performance

Measured in headless Chromium/SwiftShader at 1600×900:

| View | Draw calls | Triangles |
| --- | ---: | ---: |
| Day 2026 | ~145 | ~56k |
| Night 2016 | ~19 | ~10.8k |
| Night 2026 | ~30 | ~11.2k |

Strategies: merged figures/scene props, instanced generic city, five instanced
night city layers, material-grouped landmark clones, one batched neon
`LineSegments`, one static additive `Points` batch (plus shared-material
drone/firework points), a single separable bloom pass with two half-res RTs,
static shadow map.

## 8. Debug API

`window.__sz` is available in the browser console:

```js
__sz.setYear(1996)          // jump and pause
__sz.play() / __sz.pause()
__sz.setMode('night')      // or 'day'
__sz.info()                // mode, year, draw calls, triangles
__sz.debug.camera
__sz.debug.nightAt(5.6)    // deterministic night-show time
__sz.debug.look(x,y,z, tx,ty,tz)
__sz.debug.resetLook()
__sz.debug.setPost({ exposure, blur, saturation })
__sz.debug.setNightPost({ exposure, strength })
```

## 9. Extension recipes

### Add a generic tower

Add to the `city` array via `addBuilding(x,z,w,d,h,year,color,rot)` before the
instanced meshes are built. Night windows/edges are derived automatically.

### Add a landmark

Build a `THREE.Group` with base at y=0, add it to the day scene, then clone it
into `nightScene`, call `nightify()`, and add neon accents. Add its year to
`updateWorld` if it needs growth.

### Add a figure

Add a config object to one of the three `addFigure` blocks. Use `armL/armR`,
`legL/legR`, `lean`, `hipY`, `prop` and colors. Keep the total at 20 (or update
the HUD and README consistently). Props are merged into the figure mesh.

### Add a night effect

Prefer additive `Points`/`LineSegments` and let the Bloom pass do the glow.
Update in `updateNight()`; keep the day scene untouched.

## 10. Known limitations

- The model is intentionally non-uniform: 1:87 figures coexist with compressed
  landmark spacing and heights.
- The night scene follows the same timeline but is still an artistic night
  interpretation: the 1980 village/boats are low-detail dark clones, and
  landmark reveals pop in at their day-scene completion thresholds rather than
  growing smoothly (their neon lines use per-vertex year fading).
- The APEC 2026 mark is an original host-city visual, not the official APEC logo.
- `file://` works in Chromium-based browsers; some browsers restrict local
  resources, so `npm run serve` is the most reliable option.
- Headless screenshots need a Chromium browser and may be slow under
  SwiftShader; they are development/verification tools, not part of the page.
