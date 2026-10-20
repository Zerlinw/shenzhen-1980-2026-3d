# Changelog

All notable changes to this project are documented here.

## [1.2.0] — 2026-10-20

### Added

- The neon night scene now shares the day 1980—2026 timeline, playback, replay,
  scrubbing and HUD year panel. Night city volumes grow per year; windows and
  neon edges fade in with `aYear`/`uYear`; the early camera pans west to the 1980
  village, boats and lanterns.
- APEC 2026 Shenzhen host mark in both versions:
  - persistent HUD badge with gold live state at 2024.55+;
  - day waterfront plaque with gold wing line from 2024.8;
  - night hologram sign, golden “鹏翼” light bands and APEC finale.
- Night-only 1980 village/boat/billboard dark clones and warm lantern points.
- New night timeline screenshots at 1980 and 2016.

### Changed

- Night city is now five instanced meshes driven by the same growth law as the
  day city; night lights/lines use year attributes rather than being rebuilt.
- Day/night switching preserves the shared year and playback state instead of
  pausing/restoring.
- Night HUD shows the year panel, play/replay, timeline and chapter; night
  caption moved to the upper left.

### Performance

- 2026 night: ~30 draw calls / ~11.2k triangles; 2016 night: ~19 / ~10.8k.
- Day 2026: ~145 / ~56k (APEC plaque adds four draws).

## [1.0.1] — 2026-10-20

### Changed

- Rebuilt the neon night renderer around batched additive light buffers:
  - all static window/promenade/bridge/beacon/flash points share one `Points`
    geometry and one shader;
  - all city, landmark and bridge neon lines share one `LineSegments` buffer;
  - cloned landmark meshes are merged by material, collapsing each tower to two
    draw calls and the bridge to one.
- Replaced the three-level bloom chain (four render targets, six blur passes) with
  one threshold pass and one separable Gaussian pass over two half-resolution
  targets.
- Shared the additive point shader across static lights, drones and fireworks;
  drone twinkle is now an alpha attribute update rather than a dedicated material.
- Removed the unused neon-reflection texture array and per-mesh tube/loop/sprite
  objects.
- Composited the rooftop sign after bloom via a tiny `signScene` to keep the
  CanvasTexture crisp and avoid bloom banding.
- Night draw calls dropped from ~83 to ~25; night triangles ~7.0k. Day scene code
  and visuals are unchanged.
- Refreshed night hero/thumbnail screenshots and performance notes.

## [1.0.0] — 2026-10-19

### Added

- Handcrafted Shenzhen diorama: paper, matte resin, basswood, flocking and thin
  acrylic water, lit by a single soft studio key.
- 1980 → 2026 timeline with eight chapter holds, landmark growth, construction
  cranes, early Shekou village, boats, pier and reclaimed coastline.
- Three everyday scenes and 20 unique 1:87 figures: breakfast rice-roll stall,
  Shenzhen Bay greenway, urban-village market.
- Ping An Finance Centre as the central landmark, Diwang/Shun Hing Square to the
  east, Shenzhen Bay and the cable-stayed bridge across the southern foreground.
- Separate neon night scene fixed at 2026: neon curtain-wall windows, skyline
  edges, rooftop sign, lit promenade, acrylic water reflections, 48-drone
  formation and a 760-particle fireworks pool.
- Day/night switching with the top-right mode button or `N`; day year, playback
  state and orbit are preserved.
- Single-file offline build (`index.html`) with vendored Three.js r160.
- Build, local server, screenshot and smoke-test scripts with no npm dependencies.
- GitHub Pages and build-verification workflows.
- Full screenshot gallery, README and architecture notes.
