# vendor/three.min.js

This is the **Three.js r160** minified build, vendored so the final page can be a
single offline HTML file (no CDN, no runtime fetch).

- Upstream: <https://threejs.org>
- Package version: `three@0.160.1`
- License: MIT — see [LICENSE.three](LICENSE.three) and the license header in the bundle.
- The build script inlines this file into `index.html`.

Do not edit the bundle. To update it, replace this file with the matching
`build/three.min.js` from the upstream package and run:

```bash
npm run build
```
