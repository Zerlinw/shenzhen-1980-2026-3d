/* =====================================================================
   深圳 1980—2026 · 手作城市模型
   Paper / matte resin / basswood diorama. One soft studio key light.
   All geometry, textures and sound are procedural; no external assets.
   ===================================================================== */
(function () {
  'use strict';

  const START = 1980, END = 2026, SPAN = END - START;
  const CFG = { travel: 0.36 };
  const Q = new URLSearchParams(location.search);
  const STATIC_YEAR = Q.has('year') ? Math.min(END, Math.max(START, parseFloat(Q.get('year')) || START)) : null;
  const AUTOPLAY = Q.get('play') === '1';

  /* ------------------------------------------------------------------ */
  /* utils                                                              */
  /* ------------------------------------------------------------------ */
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const smoothstep = (a, b, x) => smooth((x - a) / (b - a || 1e-6));
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(0x19800826);
  const rand = (a, b) => a + (b - a) * rnd();
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const PI = Math.PI;
  const YAXIS = new THREE.Vector3(0, 1, 0);
  const XAXIS = new THREE.Vector3(1, 0, 0);
  const ZAXIS = new THREE.Vector3(0, 0, 1);

  /* ------------------------------------------------------------------ */
  /* renderer / scene / camera                                          */
  /* ------------------------------------------------------------------ */
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0xd8d2c5, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd8d2c5);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.3, 420);
  camera.position.set(6, 29, 60);

  /* ------------------------------------------------------------------ */
  /* studio light                                                       */
  /* ------------------------------------------------------------------ */
  const key = new THREE.DirectionalLight(0xfff4e6, 3.35);
  key.position.set(-62, 68, 38);
  key.target.position.set(0, 3, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.035;
  key.shadow.radius = 1.8;
  const sc = key.shadow.camera;
  sc.left = -72; sc.right = 72; sc.top = 72; sc.bottom = -72; sc.near = 2; sc.far = 210;
  sc.updateProjectionMatrix();
  scene.add(key);
  scene.add(key.target);

  // A soft bounce card from the front opens the alleys without competing with the key.
  const fill = new THREE.DirectionalLight(0xe9efee, 0.38);
  fill.position.set(32, 24, 58);
  fill.target.position.set(0, 4, 6);
  scene.add(fill);
  scene.add(fill.target);

  const hemi = new THREE.HemisphereLight(0xe7edee, 0xb7a992, 0.48);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0xf0eadf, 0.08);
  scene.add(amb);

  /* ------------------------------------------------------------------ */
  /* procedural textures                                                */
  /* ------------------------------------------------------------------ */
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    draw(x, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (repeat) t.repeat.set(repeat[0], repeat[1]);
    return t;
  }

  function paperTexture(base, fiber, repeat) {
    const rr = mulberry32(0x51ee7);
    const t = canvasTex(512, 512, (x, w, h) => {
      x.fillStyle = base; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 5200; i++) {
        const px = rr() * w, py = rr() * h;
        const len = 2 + rr() * 12, ang = (rr() - 0.5) * 0.9 + (rr() < 0.2 ? 1.57 : 0);
        x.strokeStyle = `rgba(${fiber},${0.018 + rr() * 0.045})`;
        x.lineWidth = 0.5 + rr() * 0.8;
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len); x.stroke();
      }
      for (let i = 0; i < 26; i++) {
        x.strokeStyle = `rgba(120,104,84,${0.016 + rr() * 0.022})`;
        x.lineWidth = 0.8 + rr() * 0.9;
        x.beginPath();
        const y0 = rr() * h;
        x.moveTo(-10, y0);
        x.bezierCurveTo(w * 0.3, y0 + (rr() - 0.5) * 20, w * 0.7, y0 + (rr() - 0.5) * 20, w + 10, y0 + (rr() - 0.5) * 10);
        x.stroke();
      }
      x.fillStyle = 'rgba(255,252,244,0.10)';
      for (let i = 0; i < 900; i++) x.fillRect(rr() * w, rr() * h, 1, 1);
    });
    t.repeat.set(repeat[0], repeat[1]);
    return t;
  }

  const texTerrain = paperTexture('#d3ccc0', '118,106,90', [5, 5]);
  const texTable = paperTexture('#c6c0b4', '106,96,82', [9, 9]);

  const texWood = canvasTex(256, 256, (x, w, h) => {
    const rr = mulberry32(0x77a3);
    x.fillStyle = '#6f4d35'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const y = rr() * h;
      x.strokeStyle = `rgba(${rr() < 0.5 ? '44,28,18' : '158,116,78'},${0.05 + rr() * 0.12})`;
      x.lineWidth = 0.6 + rr() * 2.2;
      x.beginPath(); x.moveTo(0, y);
      x.bezierCurveTo(w * 0.3, y + (rr() - 0.5) * 12, w * 0.7, y + (rr() - 0.5) * 12, w, y + (rr() - 0.5) * 8);
      x.stroke();
    }
    x.fillStyle = 'rgba(255,224,184,.05)';
    for (let i = 0; i < 12; i++) x.fillRect(0, rr() * h, w, 0.6);
  }, [3, 1]);

  const texGrass = canvasTex(256, 256, (x, w, h) => {
    const rr = mulberry32(0x99aa);
    x.fillStyle = '#77805e'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) {
      const g = 78 + Math.floor(rr() * 52);
      x.fillStyle = `rgba(${g - 22},${g},${g - 34},${0.10 + rr() * 0.35})`;
      x.fillRect(rr() * w, rr() * h, 1 + rr() * 2, 1 + rr() * 2);
    }
  }, [4, 4]);

  const texCurtain = canvasTex(256, 512, (x, w, h) => {
    x.fillStyle = '#929ba0'; x.fillRect(0, 0, w, h);
    // fine vertical mullions
    for (let i = 0; i < 64; i++) {
      x.fillStyle = 'rgba(56,66,74,.16)'; x.fillRect(i * 4, 0, 1, h);
      x.fillStyle = 'rgba(232,236,236,.12)'; x.fillRect(i * 4 + 1, 0, 1, h);
    }
    // floor lines, quiet
    for (let y = 0; y < h; y += 14) {
      x.fillStyle = 'rgba(56,66,74,.17)'; x.fillRect(0, y, w, 1);
    }
    // soft paper mottling of the printed facade
    const rr = mulberry32(0x7130);
    for (let i = 0; i < 260; i++) {
      x.fillStyle = `rgba(255,252,246,${0.012 + rr() * 0.025})`;
      x.fillRect(rr() * w, rr() * h, 2 + rr() * 10, 1 + rr() * 3);
    }
  }, [1, 1]);

  const texRibs = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#85827a'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 32; i++) {
      x.fillStyle = i % 2 ? 'rgba(255,250,238,.10)' : 'rgba(48,45,40,.14)';
      x.fillRect(i * 8, 0, 3, h);
    }
    for (let y = 0; y < h; y += 18) { x.fillStyle = 'rgba(48,45,40,.13)'; x.fillRect(0, y, w, 1.2); }
  }, [1, 1]);

  const texBackdrop = canvasTex(512, 512, (x, w, h) => {
    const g = x.createRadialGradient(w * 0.34, h * 0.24, 20, w * 0.5, h * 0.55, w * 0.95);
    g.addColorStop(0, '#ece8de');
    g.addColorStop(0.5, '#d9d3c7');
    g.addColorStop(1, '#c2bbad');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const rr = mulberry32(0x3c3c);
    x.fillStyle = 'rgba(120,104,84,.05)';
    for (let i = 0; i < 1800; i++) x.fillRect(rr() * w, rr() * h, 1, 1);
    // two soft studio-paper folds
    for (const [fx, bend] of [[0.30, 24], [0.72, -18]]) {
      x.strokeStyle = 'rgba(255,255,255,.055)'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(fx * w, 0);
      x.bezierCurveTo(fx * w + bend, h * 0.33, fx * w - bend, h * 0.66, fx * w + bend * 0.4, h);
      x.stroke();
      x.strokeStyle = 'rgba(92,78,60,.035)'; x.lineWidth = 1.2; x.stroke();
    }
  });

  function signTexture(title, sub, bg, fg, border) {
    return canvasTex(512, 256, (x, w, h) => {
      x.fillStyle = bg; x.fillRect(0, 0, w, h);
      if (border) { x.strokeStyle = border; x.lineWidth = 10; x.strokeRect(12, 12, w - 24, h - 24); }
      const rr = mulberry32(0x5a17);
      x.fillStyle = 'rgba(60,48,34,.05)';
      for (let i = 0; i < 500; i++) x.fillRect(rr() * w, rr() * h, 1, 1);
      x.fillStyle = fg;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = 'bold 102px "Microsoft YaHei","PingFang SC",sans-serif';
      x.fillText(title, w / 2, sub ? 104 : 128);
      if (sub) {
        x.font = '34px "Microsoft YaHei","PingFang SC",sans-serif';
        x.fillStyle = fg; x.globalAlpha = 0.7;
        x.fillText(sub, w / 2, 196); x.globalAlpha = 1;
      }
    });
  }

  const signBreakfast = signTexture('肠粉 · 豆浆', '现蒸 · 早市', '#e7dfcc', '#8f3b2c', '#b9a888');
  const signMenu = signTexture('今日菜单', '肠粉 6 元 · 豆浆 3 元', '#d9cfb8', '#4a4337', '#9e8d73');
  const signLychee = signTexture('鲜荔枝', '南山 · 当日', '#e3cf9f', '#3f4a2f', '#b09a68');
  const signShoe = signTexture('修 鞋', '补跟 · 换底', '#4c5850', '#eee7d6', '#8b978b');
  const signGreenway = signTexture('深圳湾绿道', 'SHENZHEN BAY TRAIL', '#4f6255', '#f0eadc', '#c0c9b8');
  const signModel = canvasTex(1024, 192, (x, w, h) => {
    x.fillStyle = '#6f4d35'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,236,206,.05)';
    for (let i = 0; i < 900; i++) x.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    x.fillStyle = '#e6d3b0'; x.textBaseline = 'middle';
    x.font = '600 54px "Songti SC","Microsoft YaHei",serif';
    x.fillText('深 圳 · 1980—2026', 48, 78);
    x.font = '26px "DIN Alternate","Microsoft YaHei",sans-serif';
    x.fillStyle = 'rgba(230,211,176,.68)';
    x.fillText('SHENZHEN  ·  HANDMADE MODEL  ·  1:87', 50, 132);
    x.textAlign = 'right';
    x.fillText('PAPER / RESIN / BASSWOOD', 976, 132);
  });

  /* ------------------------------------------------------------------ */
  /* materials                                                          */
  /* ------------------------------------------------------------------ */
  const MAT = {
    paper: new THREE.MeshStandardMaterial({ map: texTerrain, bumpMap: texTerrain, bumpScale: 0.03, color: 0xffffff, roughness: 1, metalness: 0 }),
    table: new THREE.MeshStandardMaterial({ map: texTable, bumpMap: texTable, bumpScale: 0.025, color: 0xffffff, roughness: 1, metalness: 0 }),
    wood: new THREE.MeshStandardMaterial({ map: texWood, bumpMap: texWood, bumpScale: 0.03, color: 0xffffff, roughness: 0.82, metalness: 0 }),
    grass: new THREE.MeshStandardMaterial({ map: texGrass, color: 0xffffff, roughness: 1, metalness: 0 }),
    city: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, metalness: 0 }),
    curtain: new THREE.MeshStandardMaterial({ map: texCurtain, color: 0xffffff, roughness: 0.86, metalness: 0.02 }),
    ribs: new THREE.MeshStandardMaterial({ map: texRibs, color: 0xffffff, roughness: 0.8, metalness: 0.03 }),
    vertex: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.90, metalness: 0.02 }),
    vertexFine: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.04 }),
    seabed: new THREE.MeshStandardMaterial({ color: 0x41575c, roughness: 1 }),
    acrylic: new THREE.MeshPhysicalMaterial({ color: 0x9fb1b0, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.55, clearcoat: 1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xd8dedb, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.24, depthWrite: false }),
    studio: new THREE.MeshBasicMaterial({ map: texBackdrop, color: 0xffffff, depthWrite: false }),
    backdrop: new THREE.MeshBasicMaterial({ map: texBackdrop, color: 0xffffff, depthWrite: false })
  };

  /* ------------------------------------------------------------------ */
  /* geometry builder                                                   */
  /* ------------------------------------------------------------------ */
  const _q = new THREE.Quaternion();
  const _m = new THREE.Matrix4();
  class GeoBuilder {
    constructor() { this.items = []; this.minY = Infinity; }
    add(geo, color, matrix) {
      this.items.push({ geo, color: new THREE.Color(color), matrix: matrix ? matrix.clone() : new THREE.Matrix4() });
      if (matrix) {
        const v = new THREE.Vector3(0, 0, 0).applyMatrix4(matrix);
        if (v.y < this.minY) this.minY = v.y;
      }
    }
    box(color, x, y, z, w, h, d, ry, rx, rz) {
      const g = new THREE.BoxGeometry(w, h, d);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0));
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
      this.add(g, color, m);
    }
    sphere(color, x, y, z, r, sx, sy, sz, seg) {
      const g = new THREE.SphereGeometry(r, seg || 10, Math.max(6, Math.floor((seg || 10) * 0.7)));
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx || 1, sy || 1, sz || 1));
      this.add(g, color, m);
    }
    cyl(color, x, y, z, rTop, rBot, h, ry, seg) {
      const g = new THREE.CylinderGeometry(rTop, rBot, h, seg || 8, 1, false);
      g.translate(0, h / 2, 0);
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(YAXIS, ry || 0), new THREE.Vector3(1, 1, 1));
      this.add(g, color, m);
    }
    tube(color, a, b, r0, r1, seg) {
      const dir = b.clone().sub(a), len = dir.length();
      if (len < 1e-5) return;
      const g = new THREE.CylinderGeometry(r1, r0, len, seg || 6, 1, false);
      g.translate(0, len / 2, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(YAXIS, dir.normalize());
      const m = new THREE.Matrix4().compose(a, q, new THREE.Vector3(1, 1, 1));
      this.add(g, color, m);
    }
    append(other, root) {
      const r = root || new THREE.Matrix4();
      for (const it of other.items) {
        const m = new THREE.Matrix4().multiplyMatrices(r, it.matrix);
        this.add(it.geo, it.color.getHex(), m);
      }
    }
    build(mat) {
      let total = 0;
      const prepared = [];
      for (const it of this.items) {
        let g = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
        g.applyMatrix4(it.matrix);
        if (!g.attributes.normal) g.computeVertexNormals();
        const pos = g.attributes.position;
        const n = pos.count;
        const col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          col[i * 3] = it.color.r; col[i * 3 + 1] = it.color.g; col[i * 3 + 2] = it.color.b;
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        prepared.push(g);
        total += n;
      }
      const position = new Float32Array(total * 3);
      const normal = new Float32Array(total * 3);
      const color = new Float32Array(total * 3);
      let o = 0;
      for (const g of prepared) {
        const p = g.attributes.position.array, n = g.attributes.normal.array, c = g.attributes.color.array;
        position.set(p, o * 3); normal.set(n, o * 3); color.set(c, o * 3);
        o += g.attributes.position.count;
        g.dispose();
      }
      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.BufferAttribute(position, 3));
      out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
      out.setAttribute('color', new THREE.BufferAttribute(color, 3));
      out.computeBoundingSphere();
      out.computeBoundingBox();
      const mesh = new THREE.Mesh(out, mat || MAT.vertex);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }
  }

  function matAt(x, y, z, ry, sx, sy, sz) {
    return new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromAxisAngle(YAXIS, ry || 0),
      new THREE.Vector3(sx || 1, sy || 1, sz || 1)
    );
  }
  const _up = new THREE.Vector3(0, 1, 0);
  function dirDown(swing, splay) {
    const v = new THREE.Vector3(0, -1, 0);
    v.applyAxisAngle(XAXIS, -(swing || 0));
    v.applyAxisAngle(ZAXIS, splay || 0);
    return v.normalize();
  }
  function dirUp(lean, roll) {
    const v = new THREE.Vector3(0, 1, 0);
    v.applyAxisAngle(XAXIS, lean || 0);
    v.applyAxisAngle(ZAXIS, roll || 0);
    return v.normalize();
  }

  const add = (a, b) => a.clone().add(b);
  const mul = (a, s) => a.clone().multiplyScalar(s);

  /* ------------------------------------------------------------------ */
  /* base, terrain, water, studio                                       */
  /* ------------------------------------------------------------------ */
  const BASE_W = 116, BASE_D = 84, BASE_H = 3.4;
  const PAD = 0.14;

  // paper studio floor
  {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(260, 170), MAT.table);
    floor.rotation.x = -PI / 2;
    floor.position.set(0, -BASE_H - 0.02, -2);
    floor.receiveShadow = true;
    scene.add(floor);
  }
  // seamless paper backdrop
  {
    const back = new THREE.Mesh(new THREE.PlaneGeometry(230, 96), MAT.backdrop);
    back.position.set(0, 36, -55);
    scene.add(back);
    const warm = new THREE.Mesh(new THREE.PlaneGeometry(230, 40), new THREE.MeshBasicMaterial({ color: 0xcfc6b6 }));
    warm.position.set(0, -16, -55.2);
    scene.add(warm);
  }

  // basswood plinth with rounded corners
  {
    const shape = new THREE.Shape();
    const w = BASE_W, h = BASE_D, r = 3.2;
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: BASE_H, bevelEnabled: true, bevelSize: 0.32, bevelThickness: 0.32, bevelSegments: 2, curveSegments: 10 });
    geo.rotateX(-PI / 2);
    geo.computeBoundingBox();
    geo.translate(0, -geo.boundingBox.max.y, 0);
    const plinth = new THREE.Mesh(geo, [MAT.paper, MAT.wood]);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    scene.add(plinth);
  }

  // land sheet
  {
    const land = new THREE.Mesh(new THREE.PlaneGeometry(112, 57.2), MAT.paper);
    land.rotation.x = -PI / 2;
    land.position.set(0, 0.02, -10.4);
    land.receiveShadow = true;
    scene.add(land);

    // coast cut edge
    const edge = new THREE.Mesh(new THREE.BoxGeometry(112, 0.42, 0.55), new THREE.MeshStandardMaterial({ color: 0xb6a88f, roughness: 1 }));
    edge.position.set(0, 0.21, 18.2);
    edge.castShadow = true; edge.receiveShadow = true;
    scene.add(edge);
    const edge2 = new THREE.Mesh(new THREE.BoxGeometry(112, 0.13, 0.6), new THREE.MeshStandardMaterial({ color: 0x8f8168, roughness: 1 }));
    edge2.position.set(0, 0.06, 18.22);
    scene.add(edge2);
  }

  // bay: opaque seabed + thin tinted-acrylic sheet
  const waterMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      uDeep: { value: new THREE.Color('#405a60') },
      uShallow: { value: new THREE.Color('#7b9093') },
      uSky: { value: new THREE.Color('#dcd5c7') },
      uKeyColor: { value: new THREE.Color('#fff0d8') },
      uKeyDir: { value: new THREE.Vector3(-0.46, 0.70, 0.54).normalize() },
      uTime: { value: 0 },
      uOpacity: { value: 0.87 }
    },
    vertexShader: `
      varying vec3 vWorld;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      varying vec3 vWorld;
      uniform vec3 uDeep, uShallow, uSky, uKeyColor, uKeyDir;
      uniform float uTime, uOpacity;
      void main(){
        vec2 p = vWorld.xz;
        float w1 = sin(p.x * 0.55 + uTime * 0.22) * 0.5 + sin(p.y * 0.83 - uTime * 0.18) * 0.5;
        float w2 = sin((p.x + p.y) * 0.27 - uTime * 0.14);
        vec3 N = normalize(vec3(w1 * 0.055 + w2 * 0.025, 1.0, w1 * 0.035 - w2 * 0.030));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.2);
        vec3 col = mix(uDeep, uShallow, 0.46 + 0.16 * w2);
        col = mix(col, uSky, fres * 0.52);
        vec3 R = reflect(-normalize(uKeyDir), N);
        float spec = pow(max(dot(R, V), 0.0), 90.0) * 0.22 + pow(max(dot(R, V), 0.0), 700.0) * 0.8;
        col += uKeyColor * spec;
        // pale shallow-water line at the mangrove edge
        float shore = smoothstep(18.2, 18.55, vWorld.z) * (1.0 - smoothstep(18.55, 19.5, vWorld.z));
        col = mix(col, vec3(0.78, 0.78, 0.72), shore * 0.18);
        // quiet horizontal light bands
        float band = smoothstep(0.86, 1.0, sin(p.y * 1.5 + w1 * 1.4 + uTime * 0.12) * 0.5 + 0.5);
        col += uSky * band * 0.020;
        gl_FragColor = vec4(col, uOpacity);
      }`
  });
  {
    const seabed = new THREE.Mesh(new THREE.PlaneGeometry(112, 23.8), MAT.seabed);
    seabed.rotation.x = -PI / 2;
    seabed.position.set(0, 0.035, 30.1);
    scene.add(seabed);

    const water = new THREE.Mesh(new THREE.PlaneGeometry(112, 23.8), waterMat);
    water.rotation.x = -PI / 2;
    water.position.set(0, 0.36, 30.1);
    water.renderOrder = 3;
    scene.add(water);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(112, 0.34, 0.34), MAT.acrylic);
    rim.position.set(0, 0.22, 18.28);
    rim.renderOrder = 4;
    scene.add(rim);

    // restrained, hand-placed reflections of the skyline
    // reflection is handled inside the acrylic shader; no hard-edged mirror cards
  }

  // label on plinth face
  {
    const label = new THREE.Mesh(new THREE.PlaneGeometry(21, 3.94), new THREE.MeshStandardMaterial({ map: signModel, roughness: 0.88, metalness: 0.02 }));
    label.position.set(38.5, -1.7, BASE_D / 2 + 0.34);
    scene.add(label);
  }

  /* ------------------------------------------------------------------ */
  /* mountains / hills (paper cut-outs)                                 */
  /* ------------------------------------------------------------------ */
  function ridge(z, color, baseH, amp, seed) {
    const rr = mulberry32(seed);
    const shape = new THREE.Shape();
    const x0 = -62, x1 = 62;
    shape.moveTo(x0, -0.2);
    let y = baseH;
    for (let x = x0; x <= x1; x += 4) {
      const t = (x - x0) / (x1 - x0);
      y = baseH + Math.sin(t * 13.2 + seed) * amp * 0.45 + Math.sin(t * 4.6 + seed * 0.7) * amp * 0.55 + rr() * amp * 0.25;
      shape.lineTo(x, Math.max(0.3, y));
    }
    shape.lineTo(x1, -0.2); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.2, bevelEnabled: false });
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 }));
    m.position.set(0, 0, z);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  ridge(-38, '#8e927f', 3.4, 4.6, 2.1);
  ridge(-41.5, '#a0a592', 4.4, 5.8, 5.7);
  ridge(-45, '#aeb1a2', 5.4, 6.8, 8.3);

  // Nanshan paper hill, west
  {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(12, 20, 12), new THREE.MeshStandardMaterial({ color: '#7d856c', roughness: 1 }));
    hill.scale.set(1, 0.24, 0.66);
    hill.position.set(-48, 0.1, -23);
    hill.castShadow = true; hill.receiveShadow = true;
    scene.add(hill);
    const hill2 = new THREE.Mesh(new THREE.SphereGeometry(7.5, 18, 10), new THREE.MeshStandardMaterial({ color: '#87906f', roughness: 1 }));
    hill2.scale.set(1, 0.26, 0.8);
    hill2.position.set(-53, 0.1, -14);
    hill2.castShadow = true; hill2.receiveShadow = true;
    scene.add(hill2);
  }

  /* ------------------------------------------------------------------ */
  /* roads, parks, paddies                                              */
  /* ------------------------------------------------------------------ */
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x5f5b51, roughness: 1 });
  const walkMat = new THREE.MeshStandardMaterial({ color: 0xb7ab96, roughness: 1 });
  const parkMat = new THREE.MeshStandardMaterial({ map: texGrass, color: 0xdde0cf, roughness: 1 });

  function groundPlane(w, d, x, z, y, mat) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  // main east-west avenue in front of the CBD
  groundPlane(104, 2.8, 0, 12.4, 0.055, roadMat);
  groundPlane(104, 0.7, 0, 10.75, 0.075, walkMat);
  groundPlane(104, 0.7, 0, 14.05, 0.075, walkMat);
  // north-south streets
  groundPlane(2.4, 30, -9.5, -3, 0.055, roadMat);
  groundPlane(2.4, 30, 9.0, -3, 0.055, roadMat);
  // plaza at Ping An / Diwang
  groundPlane(26, 12, 0, -6, 0.06, walkMat);
  groundPlane(15, 10, 15, -12, 0.06, walkMat);
  // green park strips
  groundPlane(12, 4.0, -30, 3.0, 0.07, parkMat);
  // west paddies
  for (let i = 0; i < 7; i++) {
    const px = -52 + (i % 2) * 8.2, pz = -2 + Math.floor(i / 2) * 5.2;
    groundPlane(7.2, 4.2, px, pz, 0.072, new THREE.MeshStandardMaterial({ color: i % 2 ? 0x7d8563 : 0x8c906b, roughness: 1 }));
    const rows = new THREE.Group();
    for (let k = 0; k < 7; k++) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.035, 0.10), new THREE.MeshStandardMaterial({ color: 0x6c7452, roughness: 1 }));
      r.position.set(px, 0.085, pz - 1.7 + k * 0.56);
      rows.add(r);
    }
    scene.add(rows);
  }
  // small street lamps along the avenue
  {
    const L = new GeoBuilder();
    for (let x = -44; x <= 44; x += 8) {
      L.cyl('#59564e', x, 0.07, 11.55, 0.035, 0.050, 2.25, 0, 5);
      L.box('#59564e', x, 2.32, 11.82, 0.05, 0.05, 0.58);
      L.box('#6b6559', x, 2.28, 12.08, 0.17, 0.035, 0.13);
      L.sphere('#f1e4c7', x, 2.25, 12.08, 0.065, 1.1, 0.8, 1, 6);
    }
    const lamps = L.build(MAT.vertex);
    scene.add(lamps);
  }

  // crosswalks at the two alley mouths
  [[-16, 9.4], [15.5, 9.2]].forEach(([x, z]) => {
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.02, 1.1), new THREE.MeshStandardMaterial({ color: 0xe6dfcf, roughness: 1 }));
      s.position.set(x - 1.2 + i * 0.6, 0.09, z);
      scene.add(s);
    }
  });

  /* ------------------------------------------------------------------ */
  /* generic city                                                      */
  /* ------------------------------------------------------------------ */
  const CITY_TINTS = ['#a8a095', '#9c968b', '#b3a998', '#918f88', '#a89d8b', '#bbb3a3', '#8e8d86', '#a79c8a', '#b0a493', '#8d9597', '#7f8b8e', '#a29686', '#b6a892', '#949b94'];
  const ROOF_TINTS = ['#847d70', '#8d877a', '#79766d', '#948b7a'];
  const city = [];
  const reserved = [
    { x0: -8.2, x1: 8.2, z0: -12.5, z1: 4.5 },     // Ping An
    { x0: 10.5, x1: 21.5, z0: -21.5, z1: -5.5 },   // Diwang
    { x0: -24.5, x1: -8.0, z0: -4.5, z1: 12.0 },   // breakfast alley
    { x0: 8.0, x1: 24.5, z0: -4.5, z1: 13.0 },     // market alley
    { x0: -55, x1: 55, z0: 12.8, z1: 20 },          // greenway
    { x0: -58, x1: -30, z0: 12.8, z1: 34 },        // west bay margin
    { x0: -30, x1: 20, z0: 10.8, z1: 13.2 }        // avenue
  ];
  function isFree(x, z, r) {
    for (const q of reserved) if (x + r > q.x0 && x - r < q.x1 && z + r > q.z0 && z - r < q.z1) return false;
    return true;
  }
  function addBuilding(x, z, w, d, h, year, color, rot) {
    city.push({
      x, z, w, d, h, year, color: new THREE.Color(color), rot: rot === undefined ? rand(-0.035, 0.035) : rot,
      roof: rnd() < 0.55, roofColor: new THREE.Color(pick(ROOF_TINTS)),
      tank: rnd() < 0.55, bulk: rnd() < 0.4
    });
  }

  const DISTRICTS = [
    { x0: -16, x1: 10, z0: -31, z1: -8.5, step: 4.7, y0: 1988, y1: 2014, h0: 2.8, h1: 9.8 },
    { x0: 19, x1: 38, z0: -31, z1: -7.5, step: 4.4, y0: 1985, y1: 2004, h0: 2.4, h1: 8.2 },
    { x0: -52, x1: -25, z0: -29, z1: 19, step: 5.4, y0: 1981, y1: 2002, h0: 1.5, h1: 5.4 },
    { x0: -22, x1: 8, z0: -39, z1: -31, step: 5.0, y0: 2000, y1: 2024, h0: 1.6, h1: 4.6 },
    { x0: 20, x1: 45, z0: -39, z1: -30, step: 5.0, y0: 2004, y1: 2024, h0: 1.6, h1: 4.6 }
  ];
  DISTRICTS.forEach((d, di) => {
    for (let gx = d.x0; gx <= d.x1; gx += d.step) {
      for (let gz = d.z0; gz <= d.z1; gz += d.step) {
        if (rnd() < 0.22) continue;
        const x = gx + rand(-1.2, 1.2), z = gz + rand(-1.2, 1.2);
        const w = d.step * rand(0.48, 0.78), dd = d.step * rand(0.48, 0.78);
        if (!isFree(x, z, Math.max(w, dd) * 0.55)) continue;
        let h = lerp(d.h0, d.h1, Math.pow(rnd(), 1.7));
        const year = Math.round(lerp(d.y0, d.y1, Math.pow(rnd(), 1.1)));
        addBuilding(x, z, w, dd, h, year, pick(CITY_TINTS));
      }
    }
  });
  // a few taller, later CBD towers
  [
    [-13.5, -17.5, 5.2, 5.2, 12.2, 2011],
    [-4.0, -27.0, 5.8, 5.0, 11.2, 2014],
    [22.5, -14.0, 5.0, 5.0, 10.8, 2007],
    [29.0, -24.0, 5.2, 5.0, 9.6, 2012],
    [35.0, -13.0, 4.8, 4.8, 8.4, 2009],
    [-21.0, -7.0, 5.4, 5.0, 7.4, 1998]
  ].forEach(([x, z, w, d, h, y]) => addBuilding(x, z, w, d, h, y, pick(CITY_TINTS), rand(-0.03, 0.03)));

  const towerGeo = new THREE.BoxGeometry(1, 1, 1); towerGeo.translate(0, 0.5, 0);
  const capGeo = new THREE.BoxGeometry(1, 0.16, 1); capGeo.translate(0, 0.08, 0);
  const roofGeo = new THREE.BoxGeometry(1, 0.52, 1); roofGeo.translate(0, 0.26, 0);

  const towerMesh = new THREE.InstancedMesh(towerGeo, MAT.city, city.length);
  const capMesh = new THREE.InstancedMesh(capGeo, MAT.city, city.length);
  const roofMesh = new THREE.InstancedMesh(roofGeo, MAT.city, city.length);
  const tankGeo = new THREE.CylinderGeometry(0.21, 0.23, 0.48, 7); tankGeo.translate(0, 0.24, 0);
  const bulkGeo = new THREE.BoxGeometry(1, 0.42, 1); bulkGeo.translate(0, 0.21, 0);
  const tankMesh = new THREE.InstancedMesh(tankGeo, MAT.city, city.length);
  const bulkMesh = new THREE.InstancedMesh(bulkGeo, MAT.city, city.length);
  [towerMesh, capMesh, roofMesh, tankMesh, bulkMesh].forEach(m => {
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    scene.add(m);
  });
  city.forEach((b, i) => {
    towerMesh.setColorAt(i, b.color);
    capMesh.setColorAt(i, b.color.clone().multiplyScalar(0.9));
    roofMesh.setColorAt(i, b.roofColor);
    tankMesh.setColorAt(i, b.color.clone().multiplyScalar(0.82));
    bulkMesh.setColorAt(i, b.color.clone().multiplyScalar(0.9));
  });
  [towerMesh, capMesh, roofMesh, tankMesh, bulkMesh].forEach(m => { m.instanceColor.needsUpdate = true; });

  function updateCity(year) {
    city.forEach((b, i) => {
      const g = smoothstep(b.year, b.year + 1.5, year);
      const s = Math.max(0.0001, g);
      const ws = s < 0.02 ? 0.0001 : 1;
      const y = PAD;
      _m.compose(new THREE.Vector3(b.x, y, b.z), _q.setFromAxisAngle(YAXIS, b.rot), new THREE.Vector3(b.w * ws, b.h * s, b.d * ws));
      towerMesh.setMatrixAt(i, _m);
      const cs = s < 0.02 ? 0.0001 : clamp(s * 3.0, 0.0001, 1);
      _m.compose(new THREE.Vector3(b.x, y + b.h * s + 0.01, b.z), _q.setFromAxisAngle(YAXIS, b.rot), new THREE.Vector3(b.w * 1.03 * cs, 1, b.d * 1.03 * cs));
      capMesh.setMatrixAt(i, _m);
      if (b.roof) {
        _m.compose(new THREE.Vector3(b.x, y + b.h * s + 0.17, b.z), _q.setFromAxisAngle(YAXIS, b.rot), new THREE.Vector3(b.w * 0.26 * cs, 1, b.d * 0.26 * cs));
        roofMesh.setMatrixAt(i, _m);
      } else {
        _m.makeScale(0.0001, 0.0001, 0.0001);
        roofMesh.setMatrixAt(i, _m);
      }
      if (b.tank && s > 0.35) {
        _m.compose(new THREE.Vector3(b.x + b.w * 0.24, y + b.h * s + 0.18, b.z - b.d * 0.18), _q.setFromAxisAngle(YAXIS, b.rot), new THREE.Vector3(0.9, 0.9, 0.9));
        tankMesh.setMatrixAt(i, _m);
      } else {
        _m.makeScale(0.0001, 0.0001, 0.0001); tankMesh.setMatrixAt(i, _m);
      }
      if (b.bulk && s > 0.35) {
        _m.compose(new THREE.Vector3(b.x - b.w * 0.22, y + b.h * s + 0.18, b.z + b.d * 0.16), _q.setFromAxisAngle(YAXIS, b.rot), new THREE.Vector3(b.w * 0.26, 1, b.d * 0.26));
        bulkMesh.setMatrixAt(i, _m);
      } else {
        _m.makeScale(0.0001, 0.0001, 0.0001); bulkMesh.setMatrixAt(i, _m);
      }
    });
    towerMesh.instanceMatrix.needsUpdate = true;
    capMesh.instanceMatrix.needsUpdate = true;
    roofMesh.instanceMatrix.needsUpdate = true;
    tankMesh.instanceMatrix.needsUpdate = true;
    bulkMesh.instanceMatrix.needsUpdate = true;
  }

  /* ------------------------------------------------------------------ */
  /* trees                                                              */
  /* ------------------------------------------------------------------ */
  const treeSpots = [];
  {
    const rr = mulberry32(0x2ee7);
    // street trees along the avenue and the two north-south streets
    for (let x = -46; x <= 46; x += 4.6) {
      if (Math.abs(x + 16) < 4.2 || Math.abs(x - 15.5) < 4.2) continue;
      if (rr() > 0.25) treeSpots.push({ x: x + (rr() - 0.5) * 1.2, z: 10.1, s: 0.8 + rr() * 0.7 });
    }
    for (let z = -30; z <= 6; z += 4.2) {
      treeSpots.push({ x: -11.2 + (rr() - 0.5) * 0.8, z, s: 0.7 + rr() * 0.6 });
      treeSpots.push({ x: 10.7 + (rr() - 0.5) * 0.8, z, s: 0.7 + rr() * 0.6 });
    }
    // park + west hill + CBD plaza
    for (let i = 0; i < 26; i++) treeSpots.push({ x: -46 + rr() * 18, z: -26 + rr() * 20, s: 0.9 + rr() * 0.9 });

    for (let i = 0; i < 10; i++) treeSpots.push({ x: -7 + rr() * 14, z: -10 + rr() * 8, s: 0.8 + rr() * 0.5 });
  }
  {
    const trunkGeo = new THREE.CylinderGeometry(0.055, 0.085, 1.5, 6); trunkGeo.translate(0, 0.75, 0);
    const canopyGeo = new THREE.IcosahedronGeometry(0.95, 0); canopyGeo.scale(1, 0.78, 1); canopyGeo.translate(0, 1.85, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b5540, roughness: 1 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeSpots.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, treeSpots.length);
    const cGreen = ['#5e6b50', '#68755a', '#536047', '#737e60'];
    treeSpots.forEach((t, i) => {
      _m.compose(new THREE.Vector3(t.x, 0.03, t.z), _q.identity(), new THREE.Vector3(t.s, t.s, t.s));
      trunks.setMatrixAt(i, _m);
      canopies.setMatrixAt(i, _m);
      canopies.setColorAt(i, new THREE.Color(pick(cGreen)));
    });
    trunks.castShadow = true; trunks.receiveShadow = true; canopies.castShadow = true; canopies.receiveShadow = true;
    trunks.frustumCulled = false; canopies.frustumCulled = false;
    canopies.instanceColor.needsUpdate = true;
    scene.add(trunks, canopies);
  }

  /* ------------------------------------------------------------------ */
  /* Ping An Finance Centre                                             */
  /* ------------------------------------------------------------------ */
  function octagon(s, c) {
    return [
      [s, -(s - c)], [s, s - c], [s - c, s], [-(s - c), s],
      [-s, s - c], [-s, -(s - c)], [-(s - c), -s], [s - c, -s]
    ];
  }
  function loft(rings, material) {
    const pos = [], uv = [], idx = [];
    const n = rings[0].pts.length;
    let vlen = 0;
    for (let i = 1; i < rings.length; i++) vlen += Math.abs(rings[i].y - rings[i - 1].y);
    let vAcc = 0;
    rings.forEach((r, ri) => {
      if (ri > 0) vAcc += Math.abs(r.y - rings[ri - 1].y);
      r.pts.forEach((p, pi) => {
        pos.push(p[0], r.y, p[1]);
        uv.push(pi / n, vAcc / (vlen || 1));
      });
    });
    for (let ri = 0; ri < rings.length - 1; ri++) {
      for (let pi = 0; pi < n; pi++) {
        const a = ri * n + pi, b = ri * n + (pi + 1) % n;
        const c = (ri + 1) * n + pi, d = (ri + 1) * n + (pi + 1) % n;
        idx.push(a, c, b, b, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setIndex(idx);
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const flat = g.toNonIndexed();
    flat.computeVertexNormals();
    g.dispose();
    const m = new THREE.Mesh(flat, material);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function planarCap(pts, y, color, material) {
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], -pts[0][1]);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], -pts[i][1]);
    shape.closePath();
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-PI / 2);
    g.translate(0, y, 0);
    const m = new THREE.Mesh(g, material || new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  const pingan = new THREE.Group();
  {
    const bodyRings = [];
    for (let i = 0; i <= 7; i++) {
      const t = i / 7;
      const s = lerp(4.7, 3.25, t);
      bodyRings.push({ y: 2.2 + t * 22.3, pts: octagon(s, s * 0.24) });
    }
    const body = loft(bodyRings, MAT.curtain);
    pingan.add(body);

    const crownMat = new THREE.MeshStandardMaterial({ color: 0x78848c, roughness: 0.89, metalness: 0.02 });
    pingan.add(loft([{ y: 24.50, pts: octagon(3.31, 0.79) }, { y: 24.64, pts: octagon(3.31, 0.79) }], new THREE.MeshStandardMaterial({ color: 0x6f7a81, roughness: 0.9 })));
    const crown = loft([
      { y: 24.64, pts: octagon(3.27, 0.78) },
      { y: 25.45, pts: octagon(2.66, 0.63) },
      { y: 26.30, pts: octagon(1.78, 0.42) },
      { y: 27.05, pts: octagon(0.86, 0.20) },
      { y: 27.52, pts: octagon(0.22, 0.05) }
    ], crownMat);
    pingan.add(crown);
    pingan.add(planarCap(octagon(0.23, 0.05), 27.53, 0x78848c));

    const B = new GeoBuilder();
    // podium
    B.box('#b0a691', 0, 1.05, 1.2, 15.5, 2.1, 12.5);
    B.box('#bdb3a0', 0, 2.18, 1.2, 16.2, 0.22, 13.2);
    for (let i = 0; i < 4; i++) B.box('#c8bda8', 0, 0.08 + i * 0.12, 8.1 + i * 0.55, 7.2 - i * 0.4, 0.12, 0.55);
    // entrance glass + canopy
    B.box('#6f7f89', 0, 1.0, 7.85, 5.4, 1.8, 0.16);
    for (const mx of [-2.2, -1.1, 0, 1.1, 2.2]) B.box('#46525a', mx, 1.0, 7.94, 0.055, 1.8, 0.05);
    B.box('#59666e', 0, 1.92, 7.94, 5.4, 0.08, 0.06);
    B.box('#a9a08d', 0, 2.1, 8.35, 6.6, 0.16, 1.1);
    // podium roof planters and paving
    for (const px of [-6.0, -3.0, 3.0, 6.0]) {
      B.box('#b3a892', px, 2.40, 5.35, 1.25, 0.26, 0.62);
      B.sphere('#5f6f52', px, 2.62, 5.35, 0.38, 1.35, 0.55, 1, 6);
    }
    for (const px of [-4.5, 0, 4.5]) B.box('#a99f8b', px, 2.305, 3.7, 0.045, 0.02, 4.4);
    // vertical fins at the eight corners
    const fins = new THREE.Group();
    const finPts = octagon(1, 0.24);
    for (const fp of finPts) {
      const a = new THREE.Vector3(fp[0] * 4.70, 2.2, fp[1] * 4.70);
      const b = new THREE.Vector3(fp[0] * 3.26, 24.5, fp[1] * 3.26);
      const g = new THREE.CylinderGeometry(0.048, 0.060, a.distanceTo(b), 5);
      g.translate(0, a.distanceTo(b) / 2, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(YAXIS, b.clone().sub(a).normalize());
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x7c868d, roughness: 0.86, metalness: 0.02 }));
      m.position.copy(a); m.quaternion.copy(q);
      m.castShadow = true;
      fins.add(m);
    }
    pingan.add(fins);
    // spire + beacon
    B.cyl('#6f7a81', 0, 27.53, 0, 0.045, 0.105, 2.65, 0, 5);
    B.cyl('#5f6a71', 0, 30.15, 0, 0.055, 0.055, 0.14, 0, 6);
    B.sphere('#d8d4c6', 0, 30.36, 0, 0.10, 1, 1, 1, 8);
    // roof details
    B.box('#707b82', 0, 24.55, 0, 1.3, 0.3, 1.3);
    const extras = B.build(MAT.vertexFine);
    pingan.add(extras);

    pingan.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    pingan.position.set(0, PAD, -4.0);
    pingan.scale.y = 1;
    scene.add(pingan);
  }

  /* ------------------------------------------------------------------ */
  /* Diwang / Shun Hing Square                                          */
  /* ------------------------------------------------------------------ */
  const diwang = new THREE.Group();
  {
    const rings = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const s = lerp(3.35, 2.75, t);
      rings.push({ y: t * 18.0, pts: octagon(s, s * 0.15) });
    }
    const body = loft(rings, MAT.ribs);
    diwang.add(body);

    const B = new GeoBuilder();
    B.box('#b1a895', 0, 0.8, 0.8, 9.2, 1.6, 8.2);
    B.box('#bdb4a1', 0, 1.72, 0.8, 9.8, 0.22, 8.8);
    // crown
    B.box('#6f6d66', 0, 15.65, 0, 5.8, 0.30, 5.8);
    B.box('#827f76', 0, 18.38, 0, 4.9, 0.55, 4.9);
    B.box('#8d8a81', 0, 18.82, 0, 4.15, 0.38, 4.15);
    B.box('#77756d', 0, 19.06, 0, 3.5, 0.20, 3.5);
    B.cyl('#a7a49a', 0.55, 19.15, 0, 0.035, 0.10, 3.0, 0, 5);
    B.cyl('#a7a49a', -0.55, 19.15, 0, 0.035, 0.10, 2.5, 0, 5);
    B.box('#8f8c83', 0, 20.8, 0, 1.7, 0.10, 0.10);
    // podium roof details
    B.box('#9e9687', 3.4, 1.9, 2.8, 1.2, 0.5, 1.2);
    const extras = B.build(MAT.vertexFine);
    diwang.add(extras);
    diwang.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    diwang.position.set(15.5, PAD, -13.5);
    scene.add(diwang);
  }

  /* ------------------------------------------------------------------ */
  /* west village, boats, billboard, cranes                             */
  /* ------------------------------------------------------------------ */
  const village = new THREE.Group();
  {
    const B = new GeoBuilder();
    const hues = ['#a99980', '#b3a288', '#9b8f7b', '#bcae95'];
    for (let i = 0; i < 16; i++) {
      const x = rand(-48, -33), z = rand(5, 19);
      const w = rand(2.2, 3.8), d = rand(2.0, 3.2), h = rand(1.2, 2.6);
      B.box(pick(hues), x, h / 2, z, w, h, d, rand(-0.2, 0.2));
      // gabled roof
      const g = new THREE.ConeGeometry(Math.max(w, d) * 0.78, 0.9, 4);
      g.rotateY(PI / 4); g.translate(x, h + 0.45, z);
      B.add(g, '#75604c');
    }
    // a few low walls / courtyards
    for (let i = 0; i < 6; i++) B.box('#8e816d', rand(-49, -34), 0.3, rand(5, 19), rand(1.2, 2.2), 0.6, 0.18, rand(-0.3, 0.3));
    // small timber pier reaching into the bay
    B.box('#6a5238', -34, 0.52, 20.2, 1.1, 0.14, 4.4);
    for (let i = 0; i < 6; i++) {
      B.cyl('#5b4734', -34.4, 0.05, 18.4 + i * 0.85, 0.07, 0.08, 0.95, 0, 5);
      B.cyl('#5b4734', -33.6, 0.05, 18.4 + i * 0.85, 0.07, 0.08, 0.95, 0, 5);
    }
    const m = B.build(MAT.vertex);
    village.add(m);
    village.visible = true;
    scene.add(village);
  }

  const boats = [];
  for (let i = 0; i < 3; i++) {
    const B = new GeoBuilder();
    B.box('#6b4d35', 0, 0.35, 0, 3.4, 0.6, 1.2);
    B.box('#7e6248', 0.6, 1.0, 0, 1.2, 0.8, 0.9);
    B.cyl('#4b3a2c', -0.8, 0.7, 0, 0.04, 0.05, 3.1, 0, 5);
    B.cyl('#4b3a2c', 0.9, 0.7, 0, 0.035, 0.045, 2.3, 0, 5);
    B.box('#d7c9ab', 0.6, 1.15, 0.46, 0.5, 0.18, 0.03);
    const g = B.build(MAT.vertex);
    g.position.set([-36, -32, -28][i], 0.28, [20.5, 21.8, 22.8][i]);
    g.scale.setScalar([0.55, 0.50, 0.60][i]);
    g.rotation.y = [0.1, 1.2, 2.4][i];
    scene.add(g);
    boats.push(g);
  }

  const billboard = new THREE.Group();
  {
    const t = signTexture('时间就是金钱', '效率就是生命 · 蛇口 1980', '#8f2f24', '#f1e6c9', '#d9c9a8');
    const m = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 4.2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
    m.position.set(0, 3.2, 0);
    billboard.add(m);
    const B = new GeoBuilder();
    B.box('#5b4734', -3.2, 1.5, 0, 0.28, 3.0, 0.28);
    B.box('#5b4734', 3.2, 1.5, 0, 0.28, 3.0, 0.28);
    const posts = B.build(MAT.vertex); billboard.add(posts);
    billboard.position.set(-27, 0.05, 13.0);
    billboard.rotation.y = -0.12;
    billboard.scale.setScalar(0.50);
    scene.add(billboard);
  }

  const cranes = [];
  for (let i = 0; i < 4; i++) {
    const B = new GeoBuilder();
    B.box('#9b7947', 0, 4.2, 0, 0.22, 8.4, 0.22);
    B.box('#9b7947', 2.6, 8.35, 0, 6.0, 0.18, 0.18);
    B.box('#9b7947', -1.3, 8.35, 0, 1.4, 0.30, 0.30);
    B.box('#b59a6c', 0, 4.2, 0, 0.12, 8.4, 0.12);
    const g = B.build(MAT.vertex);
    g.position.set([-14, 4, 26, -24][i], 0.05, [-2, -20, -17, 2][i]);
    g.userData.spin = rand(0.03, 0.07);
    g.userData.phase = rand(0, 6.28);
    scene.add(g);
    cranes.push(g);
  }

  /* ------------------------------------------------------------------ */
  /* figures                                                            */
  /* ------------------------------------------------------------------ */
  const SKIN = ['#c9a07e', '#b98a68', '#d5ab8b', '#a9795c'];
  const HAIR = ['#2f2924', '#3b3027', '#241f1c', '#4a3b2d'];

  function buildFigure(cfg) {
    const b = new GeoBuilder();
    const hipY = cfg.hipY !== undefined ? cfg.hipY : 0.94;
    const lean = cfg.lean || 0;
    const roll = cfg.roll || 0;
    const skin = cfg.skin || pick(SKIN);
    const hair = cfg.hair || pick(HAIR);
    const shirt = cfg.shirt || '#c8c0b0';
    const pants = cfg.pants || '#4c4a44';
    const shoe = cfg.shoe || '#3a3732';
    const sleeve = cfg.sleeve || 'short';
    const hip = new THREE.Vector3(0, hipY, 0);
    const torsoDir = dirUp(lean, roll);
    const torsoLen = cfg.torsoLen || 0.44;
    const shoulder = add(hip, mul(torsoDir, torsoLen));

    // pelvis + torso
    b.sphere(pants, hip.x, hip.y, hip.z, 0.155, 1.05, 0.82, 0.95, 8);
    b.tube(shirt, hip, shoulder, 0.155, 0.185, 8);
    if (cfg.apron) {
      const ap = add(hip, mul(torsoDir, torsoLen * 0.5));
      b.box(cfg.apron, ap.x, ap.y, ap.z + 0.13, 0.30, torsoLen * 0.82, 0.055, 0, -lean * 0.4);
    }
    if (cfg.backpack) {
      const bp = add(hip, mul(torsoDir, torsoLen * 0.62));
      b.box(cfg.backpack, bp.x, bp.y, bp.z - 0.17, 0.26, 0.32, 0.14);
    }

    // neck + head
    const neck = add(shoulder, new THREE.Vector3(0, 0.04, 0));
    b.tube(skin, neck, add(neck, new THREE.Vector3(0, 0.10, 0)), 0.048, 0.042, 6);
    const head = add(neck, new THREE.Vector3(0.012 * (cfg.headX || 0), 0.19, 0.018 * (cfg.headZ || 0)));
    b.sphere(skin, head.x, head.y, head.z, 0.122, 1, 1.06, 1, 10);
    // hair cap
    const hairCap = new THREE.SphereGeometry(0.126, 10, 6, 0, PI * 2, 0, PI * 0.56);
    hairCap.translate(head.x, head.y + 0.012, head.z - 0.012);
    b.add(hairCap, hair);
    if (cfg.bun) b.sphere(hair, head.x, head.y + 0.12, head.z - 0.07, 0.06, 1, 1, 1, 8);
    if (cfg.hat) {
      b.cyl(cfg.hat, head.x, head.y + 0.10, head.z, 0.15, 0.16, 0.10, 0, 10);
      b.cyl(cfg.hat, head.x, head.y + 0.085, head.z + 0.01, 0.24, 0.24, 0.025, 0, 12);
    }
    if (cfg.cap) {
      const cg = new THREE.SphereGeometry(0.136, 10, 6, 0, PI * 2, 0, PI * 0.5);
      cg.translate(head.x, head.y + 0.01, head.z);
      b.add(cg, cfg.cap);
      b.box(cfg.cap, head.x, head.y + 0.02, head.z + 0.11, 0.18, 0.02, 0.13);
    }
    if (cfg.helmet) {
      const hg = new THREE.SphereGeometry(0.142, 10, 7, 0, PI * 2, 0, PI * 0.52);
      hg.translate(head.x, head.y + 0.02, head.z);
      b.add(hg, cfg.helmet);
    }

    // arms
    const hands = {};
    const armLen = 0.30, foreLen = 0.27;
    for (const side of [-1, 1]) {
      const cfgArm = (side < 0 ? cfg.armL : cfg.armR) || [0.06, side * 0.08, 0.12];
      const sh = add(shoulder, new THREE.Vector3(side * 0.185, -0.015, 0));
      const d1 = dirDown(cfgArm[0], side * (cfgArm[1] || 0));
      const elbow = add(sh, mul(d1, armLen));
      const d2 = dirDown(cfgArm[0] + (cfgArm[2] || 0), side * (cfgArm[1] || 0) * 0.7);
      const wrist = add(elbow, mul(d2, foreLen));
      b.tube(sleeve === 'long' ? shirt : shirt, sh, elbow, 0.055, 0.046, 6);
      b.tube(skin, elbow, wrist, 0.042, 0.036, 6);
      b.sphere(skin, wrist.x, wrist.y, wrist.z, 0.048, 1, 0.9, 1, 7);
      hands[side < 0 ? 'L' : 'R'] = wrist;
    }

    // legs
    const thigh = 0.46, shin = 0.44;
    const feet = [];
    for (const side of [-1, 1]) {
      const leg = (side < 0 ? cfg.legL : cfg.legR) || [0.04, 0.04, 0.05];
      const hipJ = add(hip, new THREE.Vector3(side * 0.105, -0.02, 0));
      const d1 = dirDown(leg[0], side * (leg[1] || 0.04));
      const knee = add(hipJ, mul(d1, thigh));
      const d2 = dirDown(leg[0] - (leg[2] || 0.05), side * (leg[1] || 0.04) * 0.5);
      const ankle = add(knee, mul(d2, shin));
      b.tube(pants, hipJ, knee, 0.078, 0.062, 6);
      b.tube(cfg.shorts ? skin : pants, knee, ankle, 0.060, 0.045, 6);
      const footFwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(YAXIS, 0);
      b.box(shoe, ankle.x, ankle.y - 0.035, ankle.z + 0.045, 0.115, 0.075, 0.26);
      feet.push(ankle.y - 0.0725);
    }

    // props held in hands
    const face = new THREE.Vector3(0, 0, 1);
    function propTray() {
      const m = add(hands.L, hands.R).multiplyScalar(0.5);
      b.box('#b99a6a', m.x, m.y + 0.01, m.z, 0.30, 0.035, 0.48);
      b.cyl('#f4efe3', m.x - 0.05, m.y + 0.03, m.z - 0.13, 0.052, 0.052, 0.035, 0, 8);
      b.cyl('#f4efe3', m.x + 0.05, m.y + 0.03, m.z + 0.02, 0.052, 0.052, 0.035, 0, 8);
      b.cyl('#f4efe3', m.x - 0.03, m.y + 0.03, m.z + 0.15, 0.052, 0.052, 0.035, 0, 8);
    }
    function propPhone() {
      const h = hands.R;
      b.box('#2d3033', h.x, h.y + 0.02, h.z, 0.085, 0.018, 0.15, 0, 0.1);
      b.box('#cfd8d2', h.x, h.y + 0.031, h.z, 0.068, 0.004, 0.128);
    }
    function propCup() {
      const h = hands.R;
      b.cyl('#e6dfcd', h.x, h.y - 0.05, h.z, 0.042, 0.034, 0.13, 0, 8);
      b.cyl('#a9a294', h.x, h.y + 0.08, h.z, 0.044, 0.044, 0.012, 0, 8);
    }
    function propBottle() {
      const h = hands.R;
      b.cyl('#9fb8b6', h.x, h.y - 0.04, h.z, 0.036, 0.036, 0.15, 0, 8);
      b.cyl('#e5e0d3', h.x, h.y + 0.105, h.z, 0.03, 0.03, 0.035, 0, 8);
    }
    function propCamera() {
      const m = add(hands.L, hands.R).multiplyScalar(0.5);
      b.box('#35383a', m.x, m.y + 0.03, m.z + 0.02, 0.15, 0.10, 0.10);
      b.cyl('#222527', m.x, m.y + 0.03, m.z + 0.10, 0.042, 0.042, 0.05, 0, 10);
      b.box('#c9c2b3', m.x, m.y + 0.09, m.z, 0.08, 0.03, 0.04);
    }
    function propBroom() {
      const h = hands.R;
      const ground = new THREE.Vector3(h.x + 0.45, 0.02, h.z + 0.18);
      b.tube('#8a6a45', h, ground.clone().add(new THREE.Vector3(0, 0.05, 0)), 0.014, 0.014, 5);
      b.box('#b89a62', ground.x, 0.08, ground.z, 0.06, 0.14, 0.34, 0.35);
    }
    function propBag(color) {
      const h = hands.R;
      b.box(color || '#e2d7c3', h.x, h.y - 0.16, h.z, 0.18, 0.24, 0.10);
      b.tube('#b6a68e', add(h, new THREE.Vector3(-0.05, 0, 0)), add(h, new THREE.Vector3(-0.05, -0.06, 0)), 0.006, 0.006, 4);
      b.tube('#b6a68e', add(h, new THREE.Vector3(0.05, 0, 0)), add(h, new THREE.Vector3(0.05, -0.06, 0)), 0.006, 0.006, 4);
    }
    function propShoe() {
      const m = add(hands.L, hands.R).multiplyScalar(0.5);
      b.box('#3c3732', m.x, m.y, m.z, 0.11, 0.07, 0.24);
      b.box('#4a443d', m.x, m.y + 0.035, m.z - 0.02, 0.10, 0.035, 0.13);
    }
    function propNewspaper() {
      const m = add(hands.L, hands.R).multiplyScalar(0.5);
      b.box('#e7e0cf', m.x, m.y + 0.05, m.z + 0.06, 0.34, 0.005, 0.24, 0, 0.12);
      b.box('#c9c2b2', m.x, m.y + 0.055, m.z + 0.06, 0.31, 0.002, 0.21);
    }

    if (cfg.prop === 'tray') propTray();
    else if (cfg.prop === 'phone') propPhone();
    else if (cfg.prop === 'cup') propCup();
    else if (cfg.prop === 'bottle') propBottle();
    else if (cfg.prop === 'camera') propCamera();
    else if (cfg.prop === 'broom') propBroom();
    else if (cfg.prop === 'bag') propBag(cfg.propColor);
    else if (cfg.prop === 'shoe') propShoe();
    else if (cfg.prop === 'newspaper') propNewspaper();

    const mesh = b.build(cfg.fine ? MAT.vertexFine : MAT.vertex);
    const minFoot = Math.min.apply(null, feet);
    mesh.position.y = -minFoot;
    const group = new THREE.Group();
    group.add(mesh);
    group.rotation.y = cfg.rotY || 0;
    group.position.set(cfg.x || 0, cfg.y || 0, cfg.z || 0);
    if (cfg.scale) group.scale.setScalar(cfg.scale);
    return { group, mesh, hands, head, height: 1.55 * (cfg.scale || 1) };
  }

  function addFigure(parent, cfg) {
    const f = buildFigure(cfg);
    parent.add(f.group);
    return f;
  }

  /* ------------------------------------------------------------------ */
  /* props helpers                                                      */
  /* ------------------------------------------------------------------ */
  function stool(b, x, z, color, h) {
    const hh = h || 0.30;
    b.cyl(color || '#8a7357', x, 0, z, 0.15, 0.15, 0.035, 0, 10);
    b.cyl(color || '#8a7357', x, 0, z, 0.13, 0.13, hh, 0, 10);
  }
  function table(b, x, z, w, d, h, color) {
    const hh = h || 0.52;
    b.box(color || '#9a7f5c', x, hh, z, w, 0.055, d);
    const lx = w / 2 - 0.10, lz = d / 2 - 0.09;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box('#78624a', x + sx * lx, hh / 2, z + sz * lz, 0.06, hh, 0.06);
  }
  function crate(b, x, y, z, w, h, d, color) {
    b.box(color || '#b19264', x, y + h / 2, z, w, h, d);
    b.box(color || '#b19264', x, y + h + 0.012, z, w * 0.9, 0.02, d * 0.9);
  }
  function lycheePile(b, x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * PI * 2, r = rnd() * 0.16;
      b.sphere(rnd() < 0.25 ? '#7f8b58' : '#a63f36', x + Math.cos(a) * r, y + 0.035 + rnd() * 0.05, z + Math.sin(a) * r, 0.036, 1, 1, 1, 6);
    }
    b.sphere('#6f7d4e', x + 0.03, y + 0.055, z - 0.02, 0.035, 1.4, 0.5, 1, 6);
  }
  function vegPile(b, x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * PI * 2, r = rnd() * 0.16;
      b.sphere(rnd() < 0.5 ? '#6d7f4f' : '#7c8b57', x + Math.cos(a) * r, y + 0.04, z + Math.sin(a) * r, 0.045, 1, 0.8, 1, 6);
    }
  }
  function bikeBuilder(color, basket) {
    const b = new GeoBuilder();
    const wheel = new THREE.TorusGeometry(0.31, 0.025, 5, 16);
    const wm = matAt(0, 0.33, 0.52, 0, 1, 1, 1); b.add(wheel, '#3c3b38', wm);
    const wm2 = matAt(0, 0.33, -0.52, 0, 1, 1, 1); b.add(wheel, '#3c3b38', wm2);
    b.tube(color, new THREE.Vector3(0, 0.33, -0.52), new THREE.Vector3(0, 0.62, 0.16), 0.024, 0.024, 5);
    b.tube(color, new THREE.Vector3(0, 0.62, 0.16), new THREE.Vector3(0, 0.33, 0.52), 0.024, 0.024, 5);
    b.tube(color, new THREE.Vector3(0, 0.33, -0.52), new THREE.Vector3(0, 0.33, 0.10), 0.022, 0.022, 5);
    b.tube(color, new THREE.Vector3(0, 0.33, 0.10), new THREE.Vector3(0, 0.62, 0.16), 0.022, 0.022, 5);
    b.tube(color, new THREE.Vector3(0, 0.62, 0.16), new THREE.Vector3(0, 0.94, 0.44), 0.022, 0.022, 5);
    b.box('#3a3936', 0, 0.92, 0.46, 0.34, 0.035, 0.06, 0.15);
    b.box('#4a4742', 0, 0.76, -0.20, 0.22, 0.045, 0.14);
    b.tube('#4a4742', new THREE.Vector3(0, 0.33, -0.52), new THREE.Vector3(0, 0.78, -0.20), 0.02, 0.02, 5);
    if (basket) b.box('#9a8f7a', 0, 0.84, 0.56, 0.28, 0.16, 0.24);
    return b;
  }

  /* ------------------------------------------------------------------ */
  /* steam sprite texture                                                */
  /* ------------------------------------------------------------------ */
  function steamTextureCanvas() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const x = c.getContext('2d');
    x.clearRect(0, 0, 128, 256);
    for (let i = 0; i < 5; i++) {
      const cx = 64 + Math.sin(i * 1.7) * 10;
      const cy = 190 - i * 38;
      const r = 54 - i * 7;
      const g = x.createRadialGradient(cx, cy, 2, cx, cy, r);
      g.addColorStop(0, `rgba(255,252,244,${0.20 - i * 0.025})`);
      g.addColorStop(0.55, `rgba(255,250,240,${0.08 - i * 0.01})`);
      g.addColorStop(1, 'rgba(255,250,240,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 256);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const steamTexture = steamTextureCanvas();

  /* ------------------------------------------------------------------ */
  /* street facade helper                                               */
  /* ------------------------------------------------------------------ */
  function facadeSouth(B, x, z, w, h, wall, trim, accent, seed) {
    const rr = mulberry32(seed || 7);
    const cols = Math.max(1, Math.floor(w / 1.05));
    const rows = Math.max(1, Math.floor((h - 2.1) / 1.12));
    for (let r = 0; r < rows; r++) {
      const wy = 2.05 + r * 1.12;
      for (let c = 0; c < cols; c++) {
        const wx = x - w / 2 + (c + 0.5) * (w / cols);
        B.box('#4d4a42', wx, wy, z + 0.035, 0.50, 0.64, 0.07);
        B.box(trim, wx, wy + 0.35, z + 0.055, 0.60, 0.055, 0.09);
        B.box(trim, wx, wy - 0.35, z + 0.055, 0.60, 0.06, 0.10);
        if (r === 0 && c === cols - 1 && w > 2.4) {
          // small balcony
          B.box(trim, wx, wy - 0.44, z + 0.18, 0.84, 0.06, 0.32);
          for (let k = 0; k < 4; k++) B.box(trim, wx - 0.36 + k * 0.24, wy - 0.24, z + 0.33, 0.025, 0.40, 0.025);
          B.box(trim, wx, wy - 0.04, z + 0.33, 0.86, 0.035, 0.03);
        }
      }
    }
    // ground-floor door and shopfront
    const doorX = x - w * 0.24;
    B.box('#4b453b', doorX, 1.05, z + 0.045, 0.92, 2.05, 0.08);
    B.box(trim, doorX, 2.12, z + 0.07, 1.04, 0.08, 0.10);
    B.box(trim, doorX - 0.50, 1.05, z + 0.07, 0.06, 2.10, 0.10);
    B.box(trim, doorX + 0.50, 1.05, z + 0.07, 0.06, 2.10, 0.10);
    B.box('#b9ad97', doorX, 0.045, z + 0.24, 1.15, 0.09, 0.55);
    // roller shutter shopfront to the right
    const shopX = x + w * 0.24;
    B.box('#6a6154', shopX, 1.15, z + 0.035, 1.25, 2.15, 0.07);
    for (let i = 0; i < 9; i++) B.box(i % 2 ? '#b4a992' : '#c2b7a0', shopX, 0.20 + i * 0.23, z + 0.075, 1.22, 0.19, 0.035);
    // awning strips
    for (let i = 0; i < 4; i++) B.box(i % 2 ? accent : '#dbd2be', shopX - 0.48 + i * 0.32, 2.48, z + 0.22, 0.33, 0.04, 0.48, 0, 0, 0.14);
    // signboard
    B.box(trim, shopX, 2.98, z + 0.05, 1.32, 0.40, 0.07);
    B.box(accent, shopX, 2.98, z + 0.095, 1.20, 0.30, 0.02);
    // roof parapet, water tank, pipe
    B.box(trim, x, h - 0.10, z - 0.04, w + 0.08, 0.26, 0.20);
    B.cyl('#aa9f8d', x + w * 0.28, h + 0.02, z - 0.65, 0.18, 0.18, 0.48, 0, 8);
    B.cyl('#8e8474', x + w * 0.28, h + 0.50, z - 0.65, 0.19, 0.19, 0.05, 0, 8);
    B.cyl('#8e8474', x - w * 0.38, 0, z + 0.07, 0.035, 0.035, h - 0.3, 0, 5);
    // a few laundry poles / AC shadows on the upper wall
    B.box(trim, x - w * 0.08, h - 0.55, z + 0.10, w * 0.5, 0.03, 0.03);

  }

  /* ------------------------------------------------------------------ */
  /* scene ① breakfast stall                                            */
  /* ------------------------------------------------------------------ */
  const breakfast = new THREE.Group();
  {
    const B = new GeoBuilder();
    // flanking low buildings
    B.box('#b3a792', -3.05, 2.6, 0.2, 2.6, 5.2, 9.0);
    B.box('#a99c86', 3.25, 2.4, 0.1, 3.3, 4.8, 9.4);
    B.box('#9f927d', 0, 2.1, -4.65, 9.0, 4.2, 0.6); // end wall
    // parapets and roof edges
    B.box('#8f8370', -3.05, 5.28, 0.2, 2.75, 0.18, 9.15);
    B.box('#8f8370', 3.25, 4.88, 0.1, 3.45, 0.18, 9.55);
    // street-facing shopfronts
    facadeSouth(B, -3.05, 4.74, 2.6, 5.2, '#b3a792', '#8f8370', '#b06a4e', 13);
    facadeSouth(B, 3.25, 4.84, 3.3, 4.8, '#a99c86', '#8a7f6c', '#5d7470', 17);
    // crates by the doors
    crate(B, -2.25, 0.03, 5.55, 0.55, 0.30, 0.42, '#9c7d54');
    crate(B, 4.25, 0.03, 5.45, 0.48, 0.26, 0.38, '#a88a60');
    B.cyl('#8f6c4b', 4.55, 0.02, 4.98, 0.12, 0.10, 0.22, 0, 8);
    B.sphere('#66744f', 4.55, 0.38, 4.98, 0.18, 1, 1.2, 1, 7);
    // alley floor
    B.box('#a79a84', 0, 0.045, 0.4, 3.5, 0.09, 8.6);
    for (let i = 0; i < 9; i++) B.box('#8f8370', 0, 0.095, -3.4 + i * 1.0, 3.45, 0.008, 0.05);
    // east facade: door, windows, shutter, steps
    B.box('#6a5c4b', 1.55, 1.1, -2.2, 0.10, 2.15, 1.15);      // door recess
    B.box('#c5b9a4', 1.72, 1.12, -2.2, 0.05, 2.2, 0.10);       // frame
    B.box('#c5b9a4', 1.72, 1.12, -1.62, 0.05, 2.2, 0.10);
    B.box('#8d8270', 1.55, 2.35, -2.2, 0.10, 0.10, 1.3);
    B.box('#c8bda9', 0.2, 0.09, -2.2, 2.7, 0.18, 1.6);
    B.box('#c8bda9', 0.55, 0.17, -2.2, 2.0, 0.16, 1.2);
    for (const wz of [0.4, 2.5]) {
      B.box('#5f574b', 1.56, 2.7, wz, 0.08, 1.15, 1.0);
      B.box('#d0c5b1', 1.61, 2.7, wz, 0.04, 1.25, 0.10);
      B.box('#d0c5b1', 1.61, 2.16, wz, 0.04, 0.10, 1.10);
    }
    // west facade: shuttered shop, pipe, AC
    B.box('#7a6d5a', -1.72, 1.55, 2.6, 0.08, 2.9, 2.2);
    for (let i = 0; i < 12; i++) B.box(i % 2 ? '#b9ae99' : '#c6bba6', -1.77, 0.35 + i * 0.235, 2.6, 0.04, 0.20, 2.1);
    B.box('#4f4a42', -1.66, 3.1, 2.6, 0.08, 0.4, 2.4);
    B.cyl('#8b8170', 1.68, 0, -3.4, 0.055, 0.055, 4.6, 0, 6);
    B.box('#b0a692', 1.45, 3.9, 0.9, 0.35, 0.5, 0.75);
    B.box('#8f8677', 1.42, 3.9, 0.9, 0.06, 0.40, 0.62);
    // awning over the stall (kept narrow so the alley keeps its light)
    for (let i = 0; i < 6; i++) {
      B.box(i % 2 ? '#a56650' : '#cfc5b1', -1.85 + i * 0.42, 2.72 + Math.sin(i * 0.4) * 0.03, 1.95, 0.44, 0.035, 2.8, 0, 0, 0.03);
    }
    for (const az of [0.7, 2.0, 3.25]) B.cyl('#6f5a43', 0.68, 0, az, 0.022, 0.03, 2.72, 0, 5);
    // hanging sign over the cart
    B.box('#5a4736', -1.82, 3.25, 1.0, 0.08, 0.55, 0.06);
    B.box('#5a4736', -1.82, 3.25, 3.0, 0.08, 0.55, 0.06);
    B.box('#5a4736', -1.82, 3.50, 1.0, 0.08, 0.06, 2.06);
    // stall cart, set back so the hand-off happens in the open
    B.box('#7d6a52', -1.15, 0.55, 1.0, 0.78, 0.85, 2.1);
    B.box('#d7cdb9', -1.15, 1.02, 1.0, 0.88, 0.07, 2.25);
    B.box('#5d5347', -1.15, 0.28, 1.0, 0.72, 0.22, 2.0);
    B.cyl('#8d8069', -1.15, 0.04, 0.3, 0.22, 0.22, 0.08, 0, 10);
    B.cyl('#8d8069', -1.15, 0.04, 1.7, 0.22, 0.22, 0.08, 0, 10);
    // steamer stack
    for (let i = 0; i < 3; i++) B.cyl('#c8ac7d', -1.15, 1.06 + i * 0.17, 0.65, 0.28, 0.28, 0.17, 0, 12);
    B.cyl('#b59a6d', -1.15, 1.57, 0.65, 0.26, 0.28, 0.06, 0, 12);
    B.cyl('#9c8259', -1.15, 1.63, 0.65, 0.05, 0.05, 0.05, 0, 6);
    // soy milk pot and cups
    B.cyl('#b4b1a6', -0.78, 1.06, 1.55, 0.14, 0.16, 0.24, 0, 10);
    for (let i = 0; i < 3; i++) B.cyl('#efe8d7', -0.78 + (i - 1) * 0.12, 1.06, 1.85, 0.045, 0.037, 0.13, 0, 7);
    // folding table + stools
    table(B, 0.55, 2.55, 1.45, 0.72, 0.50, '#a58b64');
    for (const [sx, sz] of [[0.0, 2.05], [1.05, 2.05], [0.0, 3.0], [1.05, 3.0]]) stool(B, sx, sz, '#b45f46', 0.30);
    for (let i = 0; i < 3; i++) B.cyl('#f3eee2', 0.35 + i * 0.18, 0.535, 2.55, 0.06, 0.05, 0.02, 0, 8);
    // QR stand + menu board on the east wall
    B.box('#3a3732', 0.55, 0.58, 2.80, 0.16, 0.16, 0.03, -0.3);
    B.box('#e8e2d3', 0.55, 0.60, 2.785, 0.11, 0.11, 0.006, -0.3);
    B.box('#5f4b37', 1.62, 1.55, 3.10, 0.06, 0.9, 0.64);
    // small crates under the table
    crate(B, -1.55, 0.04, 3.3, 0.5, 0.32, 0.42, '#9c7d54');
    // potted plants at the door
    B.cyl('#8f6c4b', 1.25, 0.10, -0.7, 0.13, 0.10, 0.24, 0, 8);
    B.sphere('#66744f', 1.25, 0.46, -0.7, 0.20, 1, 1.2, 1, 7);
    const mesh = B.build(MAT.vertex);
    breakfast.add(mesh);

    // sign planes
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshStandardMaterial({ map: signBreakfast, roughness: 0.92 }));
    s1.position.set(-1.70, 3.42, 2.0); s1.rotation.y = PI / 2;
    breakfast.add(s1);
    const s2 = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.78), new THREE.MeshStandardMaterial({ map: signMenu, roughness: 0.95 }));
    s2.position.set(1.51, 1.55, 3.10); s2.rotation.y = -PI / 2;
    breakfast.add(s2);
    const s3 = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.82), new THREE.MeshStandardMaterial({ map: signBreakfast, roughness: 0.95 }));
    s3.position.set(-3.02, 4.48, 5.00);
    breakfast.add(s3);
    const s4 = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.46), new THREE.MeshStandardMaterial({ map: signMenu, roughness: 0.95 }));
    s4.position.set(3.30, 4.12, 5.08);
    breakfast.add(s4);

    // a small condiment shelf, kept low so the hand-off stays visible
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 1.15), new THREE.MeshStandardMaterial({ color: 0x8d8069, roughness: 0.95 }));
    shelf.position.set(-1.48, 1.12, 2.45);
    breakfast.add(shelf);

    // people
    addFigure(breakfast, { x: -1.55, z: 2.35, rotY: PI / 2, lean: 0.12, shirt: '#d7cdb9', apron: '#6f5b45', pants: '#4b4741', armR: [1.45, 0.18, 0.35], armL: [1.35, -0.15, 0.42], prop: 'tray', bun: true });
    addFigure(breakfast, { x: -0.35, z: 2.35, rotY: -PI / 2, lean: -0.05, shirt: '#7b8794', pants: '#3f4348', armR: [1.38, 0.12, 0.28], armL: [1.30, -0.10, 0.32] });
    addFigure(breakfast, { x: 0.55, z: 3.38, rotY: PI, lean: 0.06, shirt: '#b08a4f', pants: '#5d574b', armR: [1.05, 0.22, 1.25], armL: [0.20, -0.12, 0.18], prop: 'phone', backpack: '#6f6553' });
    addFigure(breakfast, { x: 1.25, z: 3.48, rotY: PI / 2, lean: 0.02, shirt: '#c2b6a0', pants: '#4c5a63', armR: [0.30, 0.12, 0.25], armL: [0.18, -0.08, 0.20], headX: 1, hat: '#d6c9b1' });
    addFigure(breakfast, { x: 0.95, z: 4.15, rotY: 0.08, lean: 0.04, shirt: '#9f5a45', pants: '#484b47', armR: [0.12, 0.12, 0.20], armL: [0.35, -0.09, 0.15], prop: 'cup' });

    // steam
    breakfast.userData.steam = [];
    for (let i = 0; i < 3; i++) {
      const sm = new THREE.SpriteMaterial({ map: steamTexture, color: 0xf7f3e9, transparent: true, opacity: 0.34, depthWrite: false });
      const sp = new THREE.Sprite(sm);
      sp.position.set(-1.35 + i * 0.55, 2.55 + i * 0.28, 3.30);
      sp.scale.set(0.34 + i * 0.06, 0.95 + i * 0.16, 1);
      sp.userData = { baseY: sp.position.y, phase: i * 2.1, baseOp: 0.26 - i * 0.04 };
      sp.renderOrder = 8;
      breakfast.add(sp);
      breakfast.userData.steam.push(sp);
    }
  }
  breakfast.position.set(-16, PAD, 5.0);
  scene.add(breakfast);

  /* ------------------------------------------------------------------ */
  /* scene ② Shenzhen Bay greenway                                      */
  /* ------------------------------------------------------------------ */
  const greenway = new THREE.Group();
  {
    const B = new GeoBuilder();
    // promenade — it runs across the whole coast, not just the framed pocket
    B.box('#b6ab94', 0, 0.04, 0.8, 82, 0.08, 2.8);
    B.box('#8f8574', 0, 0.08, -0.70, 82, 0.15, 0.28);
    B.box('#8f8574', 0, 0.08, 2.30, 82, 0.15, 0.28);
    for (let i = 0; i < 41; i++) B.box('#a89c85', -40 + i * 2.0, 0.045, 0.8, 0.05, 0.085, 2.5);
    // grass verge and mud toward the water
    B.box('#5f7052', 0, 0.03, 3.35, 82, 0.07, 2.0);
    B.box('#7d7058', 0, 0.035, 4.35, 82, 0.075, 0.55);
    for (let i = 0; i < 30; i++) B.sphere(i % 2 ? '#4f6147' : '#5a6c4f', -40 + i * 2.7, 0.30, 3.55 + (i % 3) * 0.28, 0.34, 1.3, 0.55, 1, 6);

    // railing
    for (let i = 0; i <= 37; i++) {
      const x = -40 + i * 2.2;
      B.cyl('#58655f', x, 0.10, 4.25, 0.055, 0.065, 1.02, 0, 6);
    }
    B.box('#5f6c66', 0, 1.10, 4.25, 80.8, 0.09, 0.10);
    B.box('#78847d', 0, 0.66, 4.25, 80.8, 0.045, 0.055);
    // bench
    for (let i = 0; i < 4; i++) B.box('#9a7f5c', 3.0, 0.42, -0.95 + i * 0.16, 1.9, 0.055, 0.14);
    B.box('#73624c', 3.0, 0.22, -0.95, 1.8, 0.10, 0.10);
    for (const sx of [-0.75, 0.75]) B.box('#73624c', 3.0 + sx, 0.22, -0.95, 0.10, 0.44, 0.45);
    // small shade pavilion, a landmark for the promenade
    for (const px of [7.0, 9.2]) for (const pz of [-1.9, -0.15]) B.cyl('#715a41', px, 0.06, pz, 0.055, 0.065, 2.25, 0, 5);
    B.box('#c9bda3', 8.1, 2.34, -1.02, 2.9, 0.09, 2.3);
    B.box('#a9967a', 8.1, 2.27, -1.02, 2.7, 0.07, 2.1);
    for (let i = 0; i < 7; i++) B.box('#9c896c', 6.9 + i * 0.4, 2.22, -1.02, 0.05, 0.05, 2.0);
    B.box('#8d7a5f', 8.1, 0.44, -1.0, 1.7, 0.07, 0.42);
    for (const sx of [-0.7, 0.7]) B.box('#6f5c45', 8.1 + sx, 0.22, -1.0, 0.08, 0.44, 0.38);
    // shared bikes + the cyclist's bike
    B.append(bikeBuilder('#c9b05a', true), matAt(-10.2, 0.05, 1.35, 0.05, 1, 1, 1));
    B.append(bikeBuilder('#6e8a94', true), matAt(-9.0, 0.05, 1.42, -0.04, 1, 1, 1));
    B.append(bikeBuilder('#7e8b86', false), matAt(-7.15, 0.05, 0.55, 0.02, 1, 1, 1));
    // bins, small sign post
    B.cyl('#6f7a70', 13.8, 0.06, 0.1, 0.20, 0.18, 0.55, 0, 8);
    B.cyl('#5d685f', 13.8, 0.62, 0.1, 0.22, 0.22, 0.05, 0, 8);
    B.cyl('#73806f', 12.0, 0.06, 1.3, 0.045, 0.05, 2.1, 0, 5);

    // mangroves
    for (let i = 0; i < 17; i++) {
      const mx = -40 + i * 4.8, mz = 4.3 + (i % 2) * 0.8;
      for (let k = 0; k < 4; k++) {
        const a = rnd() * PI * 2, r = rnd() * 0.7;
        B.cyl('#6b5b45', mx + Math.cos(a) * r, 0.02, mz + Math.sin(a) * r, 0.018, 0.028, 0.55 + rnd() * 0.25, 0, 4);
      }
      for (let k = 0; k < 3; k++) B.sphere(k % 2 ? '#4f6244' : '#5d7049', mx + (rnd() - 0.5) * 1.0, 0.78 + rnd() * 0.22, mz + (rnd() - 0.5) * 0.9, 0.50, 1.2, 0.55, 1, 7);
    }
    // low rocks at the water edge
    for (let i = 0; i < 31; i++) B.sphere('#8a8274', -40 + i * 2.6 + rnd(), 0.08, 4.75 + rnd() * 0.25, rand(0.12, 0.30), 1.4, 0.7, 1.1, 5);

    const mesh = B.build(MAT.vertex);
    greenway.add(mesh);

    // greenway sign
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 0.78), new THREE.MeshStandardMaterial({ map: signGreenway, roughness: 0.9 }));
    sg.position.set(12.0, 2.15, 1.30); sg.rotation.y = 0.10;
    greenway.add(sg);
    const sb = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.86, 0.04), new THREE.MeshStandardMaterial({ color: 0x4d5b50, roughness: 0.9 }));
    sb.position.set(12.0, 2.15, 1.27); sb.rotation.y = 0.10;
    greenway.add(sb);

    // dog
    const dog = new GeoBuilder();
    dog.cyl('#b08b5f', 3.45, 0.32, 1.15, 0.11, 0.13, 0.46, PI / 2, 7);
    dog.sphere('#b08b5f', 3.70, 0.42, 1.15, 0.13, 1, 1, 1, 8);
    dog.sphere('#8f6d49', 3.78, 0.42, 1.15, 0.055, 1, 1, 1, 6);
    for (const sx of [-0.12, 0.12]) for (const sz of [-0.12, 0.12]) dog.cyl('#a07d54', 3.45 + sx, 0.02, 1.15 + sz, 0.026, 0.030, 0.30, 0, 5);
    dog.tube('#b08b5f', new THREE.Vector3(3.24, 0.44, 1.15), new THREE.Vector3(3.12, 0.62, 1.24), 0.025, 0.015, 4);
    dog.box('#8f4e3a', 3.67, 0.58, 1.15, 0.03, 0.10, 0.12);
    const dogMesh = dog.build(MAT.vertex);
    greenway.add(dogMesh);

    // people
    addFigure(greenway, { x: -7.15, z: 0.35, rotY: PI / 2, lean: 0.05, shirt: '#5d7470', pants: '#3e4549', helmet: '#d9d2c2', armR: [1.75, 0.25, 1.30], armL: [0.45, -0.15, 0.15], prop: 'bottle', shorts: true });
    addFigure(greenway, { x: -2.55, z: -0.05, rotY: PI / 2, lean: 0.18, shirt: '#b8ae99', pants: '#3f4145', cap: '#7a6d58', armR: [1.05, 0.20, 0.85], armL: [-0.45, -0.12, 0.85], legL: [0.62, 0.05, 0.55], legR: [-0.30, 0.05, 0.95], shorts: true });
    addFigure(greenway, { x: 1.35, z: 0.25, rotY: PI / 2, lean: 0.04, shirt: '#c7b89f', pants: '#5a5b52', armR: [0.55, 0.18, 0.28], armL: [0.25, -0.10, 0.18], hat: '#d9c7a8' });
    addFigure(greenway, { x: 5.0, z: 1.05, rotY: 0.0, lean: 0.30, hipY: 0.78, shirt: '#6f7a6b', pants: '#43474a', cap: '#5f665c', armR: [1.45, 0.22, 1.35], armL: [1.38, -0.20, 1.30], prop: 'camera' });
    addFigure(greenway, { x: 8.0, z: 3.55, rotY: 0.0, lean: 0.34, shirt: '#a8b0ac', pants: '#4b5054', armR: [0.35, 0.20, 0.15], armL: [0.32, -0.18, 0.15] });
    addFigure(greenway, { x: 11.4, z: -0.35, rotY: -PI / 2, lean: 0.10, shirt: '#8d8b6f', pants: '#55564d', hat: '#c2ae86', armR: [0.55, 0.18, 0.18], armL: [0.70, -0.12, 0.25], prop: 'broom' });

    // leash from walker's hand to the dog collar
    {
      const a = new THREE.Vector3(1.35 + 0.30, 1.02, 0.25 + 0.10);
      const c = new THREE.Vector3(3.72, 0.55, 1.15);
      const mid = a.clone().add(c).multiplyScalar(0.5); mid.y -= 0.16;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, c);
      const geo = new THREE.TubeGeometry(curve, 12, 0.012, 4, false);
      const meshL = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x5c5548, roughness: 0.9 }));
      meshL.castShadow = true;
      greenway.add(meshL);
    }
  }
  greenway.position.set(1, PAD, 14.0);
  scene.add(greenway);

  /* ------------------------------------------------------------------ */
  /* scene ③ urban village market                                       */
  /* ------------------------------------------------------------------ */
  const market = new THREE.Group();
  {
    const B = new GeoBuilder();
    // alley walls
    B.box('#b0a28b', -3.2, 2.5, 0.2, 2.5, 5.0, 9.6);
    B.box('#a49782', 3.3, 2.8, 0.1, 3.0, 5.6, 9.8);
    B.box('#978a75', 0, 2.2, -4.7, 9.4, 4.4, 0.55);
    B.box('#8b7f6c', -3.2, 5.05, 0.2, 2.65, 0.18, 9.75);
    B.box('#8b7f6c', 3.3, 5.65, 0.1, 3.15, 0.18, 9.95);
    // street-facing shopfronts
    facadeSouth(B, -3.2, 5.02, 2.5, 5.0, '#b0a28b', '#8b7f6c', '#a35f48', 23);
    facadeSouth(B, 3.3, 5.02, 3.0, 5.6, '#a49782', '#887d6a', '#6b7a5f', 29);
    // crate stack by the fruit shop
    crate(B, -2.45, 0.03, 5.62, 0.62, 0.34, 0.46, '#b19264');
    crate(B, -2.45, 0.37, 5.62, 0.54, 0.28, 0.40, '#a7875c');
    lycheePile(B, -2.45, 0.66, 5.62, 9);
    crate(B, 2.25, 0.03, 5.55, 0.55, 0.30, 0.42, '#a88a60');
    // floor, drainage strip, steps
    B.box('#a49781', 0, 0.045, 0.2, 4.0, 0.09, 9.2);
    B.box('#847b6b', 0, 0.10, 0.2, 0.16, 0.02, 8.8);
    B.box('#c3b7a1', -2.15, 0.09, -1.1, 1.1, 0.18, 1.5);
    B.box('#c3b7a1', -1.85, 0.18, -1.1, 0.6, 0.18, 1.2);
    // back roller shutter + sign
    B.box('#6c6254', 0, 1.55, -4.38, 2.8, 2.8, 0.10);
    for (let i = 0; i < 14; i++) B.box(i % 2 ? '#b8ad98' : '#c6bba6', 0, 0.25 + i * 0.195, -4.32, 2.7, 0.16, 0.04);
    B.box('#4d463c', 0, 3.10, -4.35, 3.2, 0.30, 0.16);
    // east wall: shop windows, doors, AC, pipe
    B.box('#5e574b', 2.15, 2.5, 2.2, 0.08, 1.0, 1.2);
    B.box('#d0c5b1', 2.21, 2.5, 2.2, 0.03, 1.1, 0.10);
    B.box('#d0c5b1', 2.21, 2.0, 2.2, 0.03, 0.10, 1.3);
    B.box('#5e574b', 2.15, 1.15, -0.5, 0.08, 2.1, 1.3);
    B.box('#c7bca7', 2.22, 1.15, -0.5, 0.03, 2.2, 0.10);
    B.box('#b0a48f', 2.45, 4.4, 0.8, 0.45, 0.55, 0.8);
    B.cyl('#938877', -2.10, 0, 4.2, 0.05, 0.05, 5.2, 0, 6);
    // west wall: small windows, cables
    for (const wz of [-2.8, 1.4, 3.2]) {
      B.box('#5e574b', -1.97, 3.1, wz, 0.08, 1.0, 1.0);
      B.box('#c9beaa', -2.03, 3.1, wz, 0.03, 1.1, 0.09);
      B.box('#c9beaa', -2.03, 2.62, wz, 0.03, 0.09, 1.1);
    }
    // overhead cables + bulbs
    B.tube('#4e473d', new THREE.Vector3(-2.0, 4.1, 3.9), new THREE.Vector3(2.2, 4.0, -2.2), 0.012, 0.012, 4);
    B.tube('#4e473d', new THREE.Vector3(-2.0, 3.7, -3.8), new THREE.Vector3(2.2, 3.9, 1.0), 0.010, 0.010, 4);
    for (let i = 0; i < 4; i++) {
      B.cyl('#4b443a', -1.8 + i * 1.25, 3.72 + (i % 2) * 0.12, 0.4 + i * 0.3, 0.008, 0.008, 0.28, 0, 4);
      B.sphere('#f2e6c8', -1.8 + i * 1.25, 3.68 + (i % 2) * 0.12, 0.4 + i * 0.3, 0.055, 1, 1, 1, 7);
    }
    // lychee stall (west side)
    table(B, -1.35, -0.35, 2.2, 0.85, 0.56, '#9a7f5c');
    for (let i = 0; i < 4; i++) {
      crate(B, -1.55 + (i % 2) * 0.48, 0.60, -0.95 + Math.floor(i / 2) * 0.52, 0.42, 0.20, 0.40, '#b19264');
      lycheePile(B, -1.55 + (i % 2) * 0.48, 0.80, -0.95 + Math.floor(i / 2) * 0.52, 9);
    }
    for (let i = 0; i < 3; i++) B.cyl('#7d6c55', -1.95, 0.04, -1.4 + i * 0.45, 0.17, 0.14, 0.34, 0, 8);
    // weighing table
    table(B, -1.35, -2.45, 1.7, 0.8, 0.56, '#a58b64');
    B.box('#3d3c37', -1.35, 0.63, -2.45, 0.26, 0.10, 0.22);
    B.cyl('#d8d0bd', -1.35, 0.68, -2.45, 0.08, 0.08, 0.02, 0, 10);
    B.cyl('#b9b1a0', -0.95, 0.58, -2.45, 0.14, 0.16, 0.12, 0, 8);
    // vegetable stall (east side)
    table(B, 1.35, -1.65, 2.0, 0.8, 0.56, '#9a7f5c');
    for (let i = 0; i < 5; i++) {
      B.cyl('#9b7f58', 1.0 + (i % 3) * 0.36, 0.56, -1.95 + Math.floor(i / 3) * 0.52, 0.17, 0.14, 0.14, 0, 8);
      vegPile(B, 1.0 + (i % 3) * 0.36, 0.68, -1.95 + Math.floor(i / 3) * 0.52, 7);
    }
    // shoe repair corner (east back)
    table(B, 1.45, -3.45, 1.2, 0.7, 0.50, '#8c7354');
    B.box('#4a443b', 1.45, 0.56, -3.45, 0.5, 0.12, 0.35);
    for (let i = 0; i < 4; i++) B.box('#6b5c48', 1.25 + (i % 2) * 0.2, 0.64, -3.55 + Math.floor(i / 2) * 0.18, 0.14, 0.08, 0.08, i * 0.3);
    stool(B, 1.55, -4.05, '#6e5a43', 0.34);
    // cart near the alley mouth
    B.box('#7a6b57', 0.55, 0.55, 2.35, 0.9, 0.7, 1.4);
    B.box('#c3b7a1', 0.55, 0.92, 2.35, 1.0, 0.06, 1.55);
    crate(B, 0.42, 0.95, 2.15, 0.38, 0.16, 0.30, '#b19264');
    vegPile(B, 0.42, 1.10, 2.15, 7);
    crate(B, 0.72, 0.95, 2.55, 0.34, 0.14, 0.28, '#a88a60');
    lycheePile(B, 0.72, 1.08, 2.55, 7);
    B.cyl('#4b4740', 0.25, 0.06, 1.8, 0.22, 0.22, 0.10, 0, 10);
    B.cyl('#4b4740', 0.25, 0.06, 2.9, 0.22, 0.22, 0.10, 0, 10);
    B.tube('#6a5a44', new THREE.Vector3(0.2, 0.85, 1.7), new THREE.Vector3(0.2, 1.05, 1.45), 0.022, 0.022, 4);
    B.tube('#6a5a44', new THREE.Vector3(0.2, 0.85, 3.0), new THREE.Vector3(0.2, 1.05, 3.25), 0.022, 0.022, 4);
    // old man's stool + newspaper stand
    stool(B, 1.55, 0.70, '#6e5a43', 0.36);
    // child's little shopping trolley
    B.box('#c46a4f', -0.72, 0.26, 3.35, 0.28, 0.32, 0.22);
    B.box('#8d4f3c', -0.72, 0.45, 3.35, 0.24, 0.06, 0.18);
    for (const sx of [-0.10, 0.10]) B.cyl('#3d3a35', -0.72 + sx, 0.04, 3.25, 0.035, 0.035, 0.04, 0, 6);
    // baskets, bags
    for (let i = 0; i < 3; i++) B.cyl('#8b7556', 0.15 + i * 0.35, 0.02, 3.7, 0.16, 0.13, 0.26, 0, 7);
    const mesh = B.build(MAT.vertex);
    market.add(mesh);

    // signs
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), new THREE.MeshStandardMaterial({ map: signLychee, roughness: 0.92 }));
    s1.position.set(-1.88, 2.35, -0.35); s1.rotation.y = PI / 2;
    market.add(s1);
    const s2 = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.52), new THREE.MeshStandardMaterial({ map: signShoe, roughness: 0.92 }));
    s2.position.set(1.79, 2.35, -3.55); s2.rotation.y = -PI / 2;
    market.add(s2);
    const s3 = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), new THREE.MeshStandardMaterial({ map: signLychee, roughness: 0.92 }));
    s3.position.set(-1.88, 4.0, -1.2); s3.rotation.y = PI / 2;
    market.add(s3);
    const s4 = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.84), new THREE.MeshStandardMaterial({ map: signLychee, roughness: 0.95 }));
    s4.position.set(-3.18, 4.35, 5.28);
    market.add(s4);
    const s5 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), new THREE.MeshStandardMaterial({ map: signShoe, roughness: 0.95 }));
    s5.position.set(3.30, 4.58, 5.28);
    market.add(s5);

    // people
    addFigure(market, { x: -1.30, z: -0.30, rotY: PI / 2, lean: 0.62, shirt: '#b7a98d', apron: '#6a5a43', pants: '#45423c', armR: [0.95, 0.18, 0.45], armL: [0.85, -0.16, 0.40], bun: true });
    addFigure(market, { x: -1.30, z: -2.40, rotY: PI / 2, lean: 0.26, shirt: '#8b9a8c', apron: '#5e6a5c', pants: '#43463f', armR: [1.05, 0.20, 0.85], armL: [0.70, -0.12, 0.45] });
    addFigure(market, { x: -0.28, z: 0.05, rotY: -PI / 2, lean: 0.02, shirt: '#9f5a45', pants: '#4c4a43', armR: [0.15, 0.10, 0.12], armL: [0.14, -0.10, 0.12], prop: 'bag', propColor: '#e0d5c0' });
    addFigure(market, { x: 0.72, z: -3.00, rotY: -PI / 2, lean: 0.22, shirt: '#c2b6a0', pants: '#4b5058', armR: [0.80, 0.12, 0.70], armL: [0.72, -0.10, 0.65], prop: 'shoe' });
    addFigure(market, { x: 1.42, z: -4.02, rotY: -PI / 2, hipY: 0.58, lean: 0.92, shirt: '#6e7566', apron: '#535a4d', pants: '#45443e', armR: [1.10, 0.22, 0.55], armL: [1.05, -0.20, 0.50], legL: [1.35, 0.06, 1.45], legR: [1.30, 0.06, 1.45], cap: '#5e665c' });
    addFigure(market, { x: 0.10, z: -1.72, rotY: -PI / 2, lean: 0.70, shirt: '#8d7e62', pants: '#3f4144', armR: [0.95, 0.15, 0.55], armL: [0.88, -0.12, 0.50] });
    addFigure(market, { x: 0.25, z: 2.02, rotY: PI, lean: 0.18, shirt: '#a8977a', pants: '#4a4a44', armR: [1.02, 0.18, 0.30], armL: [1.00, -0.16, 0.28] });
    addFigure(market, { x: 1.52, z: 0.74, rotY: -PI / 2, hipY: 0.62, lean: 0.18, shirt: '#b3a68f', pants: '#55534b', armR: [0.95, 0.10, 1.05], armL: [0.92, -0.10, 1.02], prop: 'newspaper', cap: '#6f6857', legL: [1.45, 0.05, 1.45], legR: [1.42, 0.05, 1.45] });
    addFigure(market, { x: -0.68, z: 3.22, rotY: 0.05, lean: 0.02, scale: 0.60, shirt: '#b08a4f', pants: '#4c5a63', armR: [0.15, 0.12, 0.20], armL: [0.32, -0.08, 0.15], prop: 'bag', propColor: '#c46a4f', backpack: '#7a6f5c' });
  }
  market.position.set(15.5, PAD, 6.0);
  scene.add(market);

  /* ------------------------------------------------------------------ */
  /* Shenzhen Bay Bridge, far right                                     */
  /* ------------------------------------------------------------------ */
  const bridge = new THREE.Group();
  {
    const B = new GeoBuilder();
    B.box('#626d68', 0, 1.30, 0, 27, 0.34, 1.15);
    B.box('#78817c', 0, 1.49, 0, 27, 0.06, 1.22);
    // slender cable-stay pylons
    for (const px of [-4.5, 4.5]) {
      B.box('#56625d', px, 3.85, 0, 0.34, 5.0, 0.55);
      B.box('#56625d', px, 6.32, 0, 0.18, 0.26, 0.36);
      for (let i = 0; i < 6; i++) {
        const x0 = px + (i - 2.5) * 2.2;
        B.tube('#495550', new THREE.Vector3(px, 6.18, 0.06), new THREE.Vector3(x0, 1.53, 0.06), 0.011, 0.011, 4);
      }
    }
    for (let i = -3; i <= 3; i++) B.box('#5d6863', i * 4.2, 0.60, 0, 0.36, 1.2, 0.8);
    const mesh = B.build(MAT.vertex);
    bridge.add(mesh);
    bridge.position.set(18, 0.34, 24.5);
    bridge.rotation.y = -0.10;
    bridge.scale.setScalar(0.58);
    scene.add(bridge);
  }

  /* ------------------------------------------------------------------ */
  /* APEC 2026 host mark — HUD badge + day plaque + night hologram       */
  /* ------------------------------------------------------------------ */
  function apecSignTexture() {
    return canvasTex(1024, 384, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.strokeStyle = 'rgba(231,194,125,.95)';
      x.lineWidth = 3;
      x.strokeRect(8, 8, w - 16, h - 16);
      x.lineWidth = 1;
      x.strokeStyle = 'rgba(159,246,255,.35)';
      x.strokeRect(18, 18, w - 36, h - 36);
      // stylized wing / rising roof
      x.strokeStyle = '#e7c27d';
      x.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        x.beginPath();
        x.arc(150, 254 - i * 18, 90 + i * 20, Math.PI * 1.08, Math.PI * 1.72);
        x.stroke();
        x.globalAlpha = 0.55 - i * 0.12;
      }
      x.globalAlpha = 1;
      x.beginPath(); x.arc(214, 168, 8, 0, Math.PI * 2); x.fillStyle = '#9ff6ff'; x.fill();
      x.textAlign = 'left'; x.textBaseline = 'middle';
      x.fillStyle = '#f6d89a';
      x.font = 'bold 108px "DIN Alternate","Bahnschrift","Microsoft YaHei",sans-serif';
      x.fillText('APEC', 300, 105);
      x.fillStyle = '#fff3cf';
      x.font = 'bold 148px "DIN Alternate","Bahnschrift","Microsoft YaHei",sans-serif';
      x.fillText('2026', 300, 208);
      x.fillStyle = '#a9f4ff';
      x.font = '600 52px "DIN Alternate","Bahnschrift","Microsoft YaHei",sans-serif';
      x.fillText('CHINA · SHENZHEN', 304, 295);
      x.fillStyle = 'rgba(255,236,201,.72)';
      x.font = '400 31px "Microsoft YaHei","PingFang SC",sans-serif';
      x.fillText('亚太经合组织 · 深圳', 304, 342);
    });
  }

  const apecDay = new THREE.Group();
  {
    const B = new GeoBuilder();
    B.box('#161b1d', 0, 4.25, 0, 7.8, 3.2, 0.18);
    B.box('#8a5a33', 0, 5.9, 0.02, 7.9, 0.10, 0.26);
    B.box('#5f432d', 0, 2.45, -0.05, 0.16, 4.9, 0.16);
    B.box('#5f432d', 0, 0.22, 0.25, 8.6, 0.44, 1.6);
    B.box('#3f2d20', -3.45, 2.2, 0, 0.14, 4.4, 0.14);
    B.box('#3f2d20', 3.45, 2.2, 0, 0.14, 4.4, 0.14);
    apecDay.add(B.build(MAT.vertexFine));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.7), new THREE.MeshBasicMaterial({
      map: apecSignTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false
    }));
    sign.position.set(0, 4.32, 0.11);
    apecDay.add(sign);
    const wing = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      wing.push(new THREE.Vector3(-4.2 + u * 8.4, 6.35 + Math.sin(u * Math.PI) * 1.25, 0.12));
    }
    apecDay.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wing), new THREE.LineBasicMaterial({
      color: 0xc99a54, transparent: true, opacity: 0.9, fog: false
    })));
    apecDay.position.set(-26, PAD, 16.9);
    apecDay.visible = false;
    scene.add(apecDay);
  }

  /* ================================================================== */
  /* NEON NIGHT — separate scene, batched additive lights               */
  /* ================================================================== */
  const nightScene = new THREE.Scene();
  nightScene.background = new THREE.Color(0x04060e);
  nightScene.fog = new THREE.FogExp2(0x050914, 0.0030);
  const signScene = new THREE.Scene();

  const nightCamera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.3, 620);
  nightCamera.position.set(8, 25, 64);
  const NIGHT_P = new THREE.Vector3(8, 25, 64);
  const NIGHT_T = new THREE.Vector3(0, 11, 2);
  const nightOrbit = { yaw: 0, pitch: 0, yawT: 0, pitchT: 0, zoom: 1, zoomT: 1 };
  let mode = 'day';
  let nightTime = 0;

  nightScene.add(new THREE.HemisphereLight(0x4a78b0, 0x05060c, 1.10));
  const nightMoon = new THREE.DirectionalLight(0x8aa8ff, 0.90);
  nightMoon.position.set(-42, 58, 32);
  nightScene.add(nightMoon);
  const nightFill = new THREE.DirectionalLight(0x6a9ac8, 1.85);
  nightFill.position.set(24, 34, 74);
  nightScene.add(nightFill);

  const nightRnd = mulberry32(0x51ee7);
  const _nC = new THREE.Color();
  const _nV = new THREE.Vector3();
  const _nV2 = new THREE.Vector3();
  const _nm = new THREE.Matrix4();
  const _nq = new THREE.Quaternion();

  // All night neon is accumulated into one line buffer and one point buffer.
  const linePos = [], lineCol = [], lineYear = [];
  const ptPos = [], ptCol = [], ptSize = [], ptAlpha = [], ptYear = [];

  function addLine(a, b, hex, alpha = 1, year = 0) {
    linePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    _nC.setHex(hex);
    lineCol.push(_nC.r * alpha, _nC.g * alpha, _nC.b * alpha, _nC.r * alpha, _nC.g * alpha, _nC.b * alpha);
    lineYear.push(year, year);
  }
  function addLineLocal(m, ax, ay, az, bx, by, bz, hex, alpha = 1, year = 0) {
    _nV.set(ax, ay, az).applyMatrix4(m);
    _nV2.set(bx, by, bz).applyMatrix4(m);
    addLine(_nV, _nV2, hex, alpha, year);
  }
  function addLoopLocal(m, pts, y, hex, alpha = 1, year = 0) {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      addLineLocal(m, a[0], y, a[1], b[0], y, b[1], hex, alpha, year);
    }
  }
  function addPoint(x, y, z, hex, size, alpha = 1, year = 0) {
    const i = ptPos.length / 3;
    ptPos.push(x, y, z);
    _nC.setHex(hex);
    ptCol.push(_nC.r, _nC.g, _nC.b);
    ptSize.push(size);
    ptAlpha.push(alpha);
    ptYear.push(year);
    return i;
  }
  function addPointLocal(m, x, y, z, hex, size, alpha = 1, year = 0) {
    _nV.set(x, y, z).applyMatrix4(m);
    return addPoint(_nV.x, _nV.y, _nV.z, hex, size, alpha, year);
  }

  // --- sky -----------------------------------------------------------
  const nightSkyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vDir;
      void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform float uTime;
      float hash31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main(){
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(vec3(0.12, 0.07, 0.18), vec3(0.010, 0.018, 0.050), pow(h, 0.52));
        float glow = exp(-h * 8.5);
        col += vec3(0.30, 0.08, 0.24) * glow * 0.52;
        col += vec3(0.02, 0.13, 0.18) * glow * 0.34;
        float band = smoothstep(0.70, 1.0, sin(d.x * 2.1 + uTime * 0.012) * 0.5 + 0.5)
                   * smoothstep(0.02, 0.22, d.y) * smoothstep(0.55, 0.22, d.y);
        col += vec3(0.03, 0.10, 0.15) * band * 0.35;
        vec3 sp = d * 280.0;
        vec3 id = floor(sp);
        float star = smoothstep(0.50, 0.0, length(fract(sp) - 0.5)) * step(0.9990, hash31(id));
        col += vec3(0.72, 0.86, 1.0) * star * 0.9;
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const nightSky = new THREE.Mesh(new THREE.SphereGeometry(480, 36, 24), nightSkyMat);
  nightSky.renderOrder = -100;
  nightSky.frustumCulled = false;
  nightScene.add(nightSky);

  const texHorizon = canvasTex(512, 512, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    const g = x.createRadialGradient(w * 0.5, h * 0.76, 8, w * 0.5, h * 0.76, w * 0.62);
    g.addColorStop(0, 'rgba(255,92,190,.42)');
    g.addColorStop(0.28, 'rgba(98,120,255,.20)');
    g.addColorStop(0.62, 'rgba(38,190,220,.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
  const nightHorizon = new THREE.Mesh(new THREE.PlaneGeometry(260, 100), new THREE.MeshBasicMaterial({
    map: texHorizon, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  }));
  nightHorizon.position.set(0, 22, -56);
  nightScene.add(nightHorizon);

  function nightRidge(z, color, baseH, amp, seed) {
    const rr = mulberry32(seed);
    const shape = new THREE.Shape();
    shape.moveTo(-72, -0.3);
    for (let x = -72; x <= 72; x += 4) {
      const t = (x + 72) / 144;
      const y = baseH + Math.sin(t * 11 + seed) * amp * 0.35 + Math.sin(t * 4 + seed * 0.8) * amp * 0.5 + rr() * amp * 0.2;
      shape.lineTo(x, Math.max(0.4, y));
    }
    shape.lineTo(72, -0.3); shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: false }),
      new THREE.MeshBasicMaterial({ color, fog: false }));
    mesh.position.z = z;
    nightScene.add(mesh);
  }
  nightRidge(-44, 0x0b1828, 1.4, 2.6, 2.3);
  nightRidge(-50, 0x0c1a2c, 2.0, 3.4, 5.1);

  const texCityGlow = canvasTex(256, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    const g = x.createRadialGradient(w * 0.5, h * 0.72, 6, w * 0.5, h * 0.72, w * 0.62);
    g.addColorStop(0, 'rgba(46,122,170,.34)');
    g.addColorStop(0.45, 'rgba(30,70,120,.14)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
  const cityGlow = new THREE.Mesh(new THREE.PlaneGeometry(190, 76), new THREE.MeshBasicMaterial({
    map: texCityGlow, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  }));
  cityGlow.position.set(0, 12, -36);
  nightScene.add(cityGlow);
  const groundGlow = new THREE.Mesh(new THREE.PlaneGeometry(128, 74), new THREE.MeshBasicMaterial({
    map: texCityGlow, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  }));
  groundGlow.rotation.x = -PI / 2;
  groundGlow.position.set(0, 0.02, 2);
  nightScene.add(groundGlow);

  // --- city ground / water ------------------------------------------
  const nightGround = new THREE.Mesh(new THREE.PlaneGeometry(150, 100), new THREE.MeshStandardMaterial({
    color: 0x060a12, roughness: 0.88, metalness: 0.15
  }));
  nightGround.rotation.x = -PI / 2;
  nightGround.position.set(0, -0.04, -6);
  nightScene.add(nightGround);

  const nightWaterMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vWorld;
      void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `
      varying vec3 vWorld;
      uniform float uTime;
      void main(){
        vec2 p = vWorld.xz;
        float w1 = sin(p.x * 0.55 + uTime * 0.28) + sin(p.y * 0.82 - uTime * 0.22);
        vec3 N = normalize(vec3(w1 * 0.035, 1.0, w1 * 0.025));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        vec3 col = mix(vec3(0.004, 0.009, 0.020), vec3(0.018, 0.060, 0.090), fres);
        col += vec3(0.09, 0.045, 0.15) * fres * 0.55;
        float band = smoothstep(0.82, 1.0, sin(p.y * 1.3 - uTime * 0.36 + sin(p.x * 0.17) * 2.2) * 0.5 + 0.5);
        col += vec3(0.04, 0.26, 0.34) * band * 0.20;
        float streak = smoothstep(0.955, 1.0, sin(p.x * 1.7 + sin(p.y * 0.26) * 3.0 - uTime * 0.5) * 0.5 + 0.5);
        col += vec3(0.30, 0.05, 0.26) * streak * 0.08;
        float along = smoothstep(17.0, 24.0, p.y) * (1.0 - smoothstep(32.0, 40.0, p.y));
        col += vec3(0.12, 0.52, 0.60) * exp(-abs(p.x) * 0.50) * along * 0.055;
        col += vec3(0.55, 0.08, 0.42) * exp(-abs(p.x - 15.5) * 0.55) * along * 0.050;
        col += vec3(0.10, 0.40, 0.50) * exp(-abs(p.x + 16.0) * 0.55) * along * 0.040;
        col += vec3(0.52, 0.35, 0.10) * exp(-abs(p.x - 24.0) * 0.70) * along * 0.028;
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const nightWater = new THREE.Mesh(new THREE.PlaneGeometry(140, 24), nightWaterMat);
  nightWater.rotation.x = -PI / 2;
  nightWater.position.set(0, 0.16, 30);
  nightScene.add(nightWater);

  // --- waterfront promenade -----------------------------------------
  const prom = new THREE.Mesh(new THREE.BoxGeometry(110, 0.16, 4.4), new THREE.MeshStandardMaterial({
    color: 0x16283e, roughness: 0.72, metalness: 0.25, emissive: 0x0a1a2a, emissiveIntensity: 0.5
  }));
  prom.position.set(0, 0.06, 15.9);
  nightScene.add(prom);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(110, 5.2), new THREE.MeshBasicMaterial({
    color: 0x235a72, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  }));
  pool.rotation.x = -PI / 2;
  pool.position.set(0, 0.16, 16.0);
  nightScene.add(pool);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(100, 0.55), new THREE.MeshBasicMaterial({
    color: 0x5fd8ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  }));
  road.rotation.x = -PI / 2;
  road.position.set(0, 0.04, 12.4);
  nightScene.add(road);
  addLine(new THREE.Vector3(-55, 0.92, 18.15), new THREE.Vector3(55, 0.92, 18.15), 0x9ff6ff, 0.75, 2018);
  for (let x = -45; x <= 45; x += 3.2) {
    addPoint(x, 0.42, 16.8, Math.abs(x) % 6 < 3 ? 0xffd6a0 : 0x9ff6ff, 1.2, 0.5, 2018);
  }
  for (let x = -46; x <= 46; x += 3.0) {
    addPoint(x, 1.15, 12.4, Math.abs(x) % 9 < 4 ? 0xffc46a : 0x7feaff, 1.0, 0.35, 1985);
  }

  // --- generic city, instanced dark volumes ---------------------------
  const nightCityMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.68, metalness: 0.30, emissive: 0x081424, emissiveIntensity: 0.55
  });
  const nightCityGroup = new THREE.Group();
  const nightCityMeshes = [
    new THREE.InstancedMesh(towerGeo, nightCityMat, city.length),
    new THREE.InstancedMesh(capGeo, nightCityMat, city.length),
    new THREE.InstancedMesh(roofGeo, nightCityMat, city.length),
    new THREE.InstancedMesh(tankGeo, nightCityMat, city.length),
    new THREE.InstancedMesh(bulkGeo, nightCityMat, city.length)
  ];
  const [nightTower, nightCap, nightRoof, nightTank, nightBulk] = nightCityMeshes;
  {
    const darks = [0x182a44, 0x1c3150, 0x14243a, 0x223756];
    nightCityMeshes.forEach(m => {
      m.castShadow = m.receiveShadow = false;
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      nightCityGroup.add(m);
    });
    city.forEach((b, i) => {
      nightTower.setColorAt(i, _nC.setHex(darks[i % darks.length]));
      nightCap.setColorAt(i, _nC.clone().multiplyScalar(0.88));
      nightRoof.setColorAt(i, _nC.clone().multiplyScalar(0.76));
      nightTank.setColorAt(i, _nC.clone().multiplyScalar(0.82));
      nightBulk.setColorAt(i, _nC.clone().multiplyScalar(0.9));
    });
    nightCityMeshes.forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    nightScene.add(nightCityGroup);
  }
  function updateNightCity(year) {
    city.forEach((b, i) => {
      const g = smoothstep(b.year, b.year + 1.5, year);
      const s = Math.max(0.0001, g);
      const ws = s < 0.02 ? 0.0001 : 1;
      const y = PAD;
      _nm.compose(_nV.set(b.x, y, b.z), _nq.setFromAxisAngle(YAXIS, b.rot), _nV2.set(b.w * ws, b.h * s, b.d * ws));
      nightTower.setMatrixAt(i, _nm);
      const cs = s < 0.02 ? 0.0001 : clamp(s * 3.0, 0.0001, 1);
      _nm.compose(_nV.set(b.x, y + b.h * s + 0.01, b.z), _nq.setFromAxisAngle(YAXIS, b.rot), _nV2.set(b.w * 1.03 * cs, 1, b.d * 1.03 * cs));
      nightCap.setMatrixAt(i, _nm);
      if (b.roof) {
        _nm.compose(_nV.set(b.x, y + b.h * s + 0.17, b.z), _nq.setFromAxisAngle(YAXIS, b.rot), _nV2.set(b.w * 0.26 * cs, 1, b.d * 0.26 * cs));
        nightRoof.setMatrixAt(i, _nm);
      } else {
        _nm.makeScale(0.0001, 0.0001, 0.0001); nightRoof.setMatrixAt(i, _nm);
      }
      if (b.tank && s > 0.35) {
        _nm.compose(_nV.set(b.x + b.w * 0.24, y + b.h * s + 0.18, b.z - b.d * 0.18), _nq.setFromAxisAngle(YAXIS, b.rot), _nV2.set(0.9, 0.9, 0.9));
        nightTank.setMatrixAt(i, _nm);
      } else {
        _nm.makeScale(0.0001, 0.0001, 0.0001); nightTank.setMatrixAt(i, _nm);
      }
      if (b.bulk && s > 0.35) {
        _nm.compose(_nV.set(b.x - b.w * 0.22, y + b.h * s + 0.18, b.z + b.d * 0.16), _nq.setFromAxisAngle(YAXIS, b.rot), _nV2.set(b.w * 0.26, 1, b.d * 0.26));
        nightBulk.setMatrixAt(i, _nm);
      } else {
        _nm.makeScale(0.0001, 0.0001, 0.0001); nightBulk.setMatrixAt(i, _nm);
      }
    });
    nightCityMeshes.forEach(m => { m.instanceMatrix.needsUpdate = true; });
  }
  updateNightCity(END);

  // window lights on south/east faces
  {
    const palette = [0xffd9a0, 0x8feaff, 0xff7ad9, 0xdff4ff, 0xffc46a];
    for (const b of city) {
      const rows = clamp(Math.floor(b.h / 1.5), 1, 14);
      const cols = clamp(Math.floor(b.w / 1.15), 1, 9);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (nightRnd() > 0.55) continue;
          addPoint(b.x - b.w / 2 + (c + 0.5) / cols * b.w,
            PAD + (r + 0.5) / rows * b.h,
            b.z + b.d / 2 + 0.035,
            palette[(nightRnd() * palette.length) | 0], 1.0 + nightRnd() * 1.1, 1, b.year);
        }
      }
      if (b.h > 5) {
        const rows2 = clamp(Math.floor(b.h / 1.9), 1, 9);
        for (let r = 0; r < rows2; r++) {
          if (nightRnd() > 0.62) continue;
          addPoint(b.x + b.w / 2 + 0.035, PAD + (r + 0.5) / rows2 * b.h,
            b.z + (nightRnd() - 0.5) * b.d * 0.8,
            palette[(nightRnd() * palette.length) | 0], 0.8 + nightRnd(), 1, b.year);
        }
      }
      if (b.h > 9) {
        addPoint(b.x + b.w * 0.3, PAD + b.h + 0.35, b.z + b.d / 2 + 0.04, 0xff4a5a, 2.4 + nightRnd(), 1, b.year);
      }
      if (b.z + b.d / 2 > 7 && b.h > 2.4) {
        for (let k = 0; k < 4; k++) {
          addPoint(b.x + (nightRnd() - 0.5) * b.w * 0.7,
            PAD + 1.4 + nightRnd() * Math.min(5.2, b.h - 1.4),
            b.z + b.d / 2 + 0.05,
            k % 2 ? 0xffd9a0 : 0x8feaff, 1.8 + nightRnd(), 1, b.year);
        }
      }
    }
  }

  // neon building edges + shopfront bands
  {
    const edgeCols = [0x5fe6ff, 0xff62c8, 0xffc46a];
    let n = 0;
    for (const b of city) {
      if (b.h < 5 || n >= 44 || nightRnd() > 0.55) continue;
      const col = edgeCols[n++ % edgeCols.length];
      const x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z + b.d / 2 + 0.04;
      addLine(new THREE.Vector3(x0, PAD, z0), new THREE.Vector3(x0, PAD + b.h, z0), col, 0.8, b.year);
      addLine(new THREE.Vector3(x1, PAD, z0), new THREE.Vector3(x1, PAD + b.h, z0), col, 0.8, b.year);
      addLine(new THREE.Vector3(x0, PAD + b.h, z0), new THREE.Vector3(x1, PAD + b.h, z0), col, 0.8, b.year);
      if (z0 > 8 && b.h > 3) {
        addLine(new THREE.Vector3(x0, 1.25, z0), new THREE.Vector3(x1, 1.25, z0), n % 2 ? 0xffc46a : 0x7feaff, 0.55, b.year);
      }
      addLine(new THREE.Vector3(x0, 1.15, z0), new THREE.Vector3(x1, 1.15, z0), n % 3 ? 0xffc46a : 0x7feaff, 0.4, b.year);
      addLine(new THREE.Vector3(x0, 2.05, z0), new THREE.Vector3(x1, 2.05, z0), n % 3 ? 0x7feaff : 0xff7ad9, 0.4, b.year);
    }
  }

  // --- landmark authoring: merge clone meshes, then batch neon -------
  function mergeByMaterial(root) {
    root.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const buckets = new Map();
    root.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const material = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!material) return;
      let bucket = buckets.get(material);
      if (!bucket) { bucket = { material, geos: [] }; buckets.set(material, bucket); }
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
      if (!g.getAttribute('normal')) g.computeVertexNormals();
      bucket.geos.push(g);
    });
    root.clear();
    for (const { material, geos } of buckets.values()) {
      let count = 0;
      for (const g of geos) count += g.getAttribute('position').count;
      const pos = new Float32Array(count * 3);
      const nor = new Float32Array(count * 3);
      const uv = new Float32Array(count * 2);
      let off = 0;
      for (const g of geos) {
        const p = g.getAttribute('position');
        pos.set(p.array, off * 3);
        const n = g.getAttribute('normal');
        if (n) nor.set(n.array, off * 3);
        const t = g.getAttribute('uv');
        if (t) uv.set(t.array, off * 2);
        off += p.count;
        g.dispose();
      }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = mesh.receiveShadow = false;
      root.add(mesh);
    }
  }

  function nightify(root, glow, tex) {
    const mapped = new THREE.MeshStandardMaterial({
      map: tex, color: 0xffffff, emissive: new THREE.Color(glow), emissiveMap: tex,
      emissiveIntensity: 1.45, roughness: 0.42, metalness: 0.34
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x060b12, emissive: 0x061018, emissiveIntensity: 0.05, roughness: 0.8, metalness: 0.25
    });
    root.traverse(o => {
      if (!o.isMesh) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      o.material = m && m.map ? mapped : dark;
      o.castShadow = o.receiveShadow = false;
    });
    mergeByMaterial(root);
  }

  const texNightCurtain = canvasTex(256, 512, (x, w, h) => {
    x.fillStyle = '#02060c'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 32; i++) {
      x.fillStyle = 'rgba(92,224,255,.11)'; x.fillRect(i * 8, 0, 1, h);
    }
    for (let y = 0; y < h; y += 14) {
      x.fillStyle = 'rgba(70,190,225,.10)'; x.fillRect(0, y, w, 1);
    }
    const rr = mulberry32(0x8b17);
    for (let i = 0; i < 220; i++) {
      x.fillStyle = `rgba(130,245,255,${0.10 + rr() * 0.38})`;
      x.fillRect(Math.floor(rr() * 32) * 8 + 2, Math.floor(rr() * 36) * 14 + 2, 4, 8);
    }
  }, [1, 1]);
  const texNightRibs = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#07030a'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      x.fillStyle = i % 2 ? 'rgba(255,96,205,.26)' : 'rgba(255,170,230,.10)';
      x.fillRect(i * 16, 0, 4, h);
    }
    for (let y = 0; y < h; y += 30) { x.fillStyle = 'rgba(255,90,200,.18)'; x.fillRect(0, y, w, 1); }
  }, [1, 1]);

  const nightPingAn = pingan.clone(true);
  nightPingAn.position.copy(pingan.position);
  nightPingAn.scale.set(1, 0.92, 1);
  nightify(nightPingAn, 0x5fe6ff, texNightCurtain);
  nightPingAn.updateMatrixWorld(true);
  nightScene.add(nightPingAn);
  {
    const paM = nightPingAn.matrixWorld;
    const finPts = octagon(1, 0.24);
    for (const fp of finPts) {
      addLineLocal(paM, fp[0] * 4.70, 2.2, fp[1] * 4.70, fp[0] * 3.26, 24.5, fp[1] * 3.26, 0x8ff6ff, 0.9, 2014.2);
    }
    addLoopLocal(paM, octagon(4.05, 4.05 * 0.24), 8.6, 0x5fe6ff, 0.7, 2014.2);
    addLoopLocal(paM, octagon(3.55, 3.55 * 0.24), 17.2, 0x5fe6ff, 0.7, 2014.2);
    addLoopLocal(paM, octagon(3.3, 0.79), 24.55, 0x9ff6ff, 0.95, 2014.2);
    addLoopLocal(paM, octagon(0.25, 0.06), 27.54, 0xffffff, 0.9, 2014.2);
    addLoopLocal(paM, [[-7.7, -5.1], [7.7, -5.1], [7.7, 7.3], [-7.7, 7.3]], 2.36, 0x5fe6ff, 0.5, 2014.2);
    addLineLocal(paM, 0, 27.55, 0, 0, 30.35, 0, 0xdff8ff, 0.9, 2014.2);
    nightPingAn.userData.beacon = addPointLocal(paM, 0, 30.35, 0, 0xfff2c9, 8, 0.95, 2014.2);
    nightPingAn.userData.halo = addPointLocal(paM, 0, 25.8, 0, 0x63e6ff, 18, 0.22, 2014.2);
  }

  const nightDiwang = diwang.clone(true);
  nightDiwang.position.copy(diwang.position);
  nightDiwang.scale.set(1, 0.92, 1);
  nightify(nightDiwang, 0xff62c8, texNightRibs);
  nightDiwang.updateMatrixWorld(true);
  nightScene.add(nightDiwang);
  {
    const dwM = nightDiwang.matrixWorld;
    const finPts = octagon(1, 0.15);
    for (const fp of finPts) {
      addLineLocal(dwM, fp[0] * 3.35, 0.2, fp[1] * 3.35, fp[0] * 2.76, 18.0, fp[1] * 2.76, 0xff62c8, 0.9, 1994.3);
    }
    addLoopLocal(dwM, octagon(3.15, 3.15 * 0.15), 6.2, 0xff62c8, 0.6, 1994.3);
    addLoopLocal(dwM, octagon(2.95, 2.95 * 0.15), 12.6, 0xff62c8, 0.6, 1994.3);
    addLoopLocal(dwM, octagon(2.82, 0.42), 18.42, 0xffb0e6, 0.9, 1994.3);
    addLoopLocal(dwM, [[-4.7, -3.4], [4.7, -3.4], [4.7, 4.6], [-4.7, 4.6]], 1.85, 0xff62c8, 0.55, 1994.3);
    for (const sx of [-0.6, 0.6]) addPointLocal(dwM, sx, 21.4, 0, 0xffd9f4, 5, 0.9, 1994.3);
    nightDiwang.userData.halo = addPointLocal(dwM, 0, 19.4, 0, 0xff58c6, 14, 0.18, 1994.3);
  }

  const bridgeDark = new THREE.MeshStandardMaterial({
    color: 0x0a1420, emissive: 0x0a3a4a, emissiveIntensity: 0.45, roughness: 0.55, metalness: 0.4
  });
  const nightBridge = bridge.clone(true);
  nightBridge.traverse(o => {
    if (o.isMesh) { o.material = bridgeDark; o.castShadow = o.receiveShadow = false; }
  });
  nightBridge.position.set(16, 0.34, 22.0);
  nightBridge.scale.setScalar(0.62);
  nightBridge.updateMatrixWorld(true);
  mergeByMaterial(nightBridge);
  nightBridge.updateMatrixWorld(true);
  nightScene.add(nightBridge);
  {
    const bm = nightBridge.matrixWorld;
    addLineLocal(bm, -13.5, 1.55, 0.08, 13.5, 1.55, 0.08, 0x7feaff, 0.95, 2020.5);
    for (const px of [-4.5, 4.5]) {
      addLineLocal(bm, px, 0.5, 0.08, px, 6.3, 0.08, 0x7feaff, 0.95, 2020.5);
      addLineLocal(bm, px - 1.9, 1.55, 0.08, px, 6.2, 0.08, 0xff7ad9, 0.9, 2020.5);
      addLineLocal(bm, px + 1.9, 1.55, 0.08, px, 6.2, 0.08, 0xff7ad9, 0.9, 2020.5);
      addPointLocal(bm, px, 6.45, 0, 0x9ff6ff, 7, 0.85, 2020.5);
    }
    for (let x = -13; x <= 13; x += 2.0) addPointLocal(bm, x, 1.72, 0, 0x7feaff, 1.6, 1, 2020.5);
  }

  // rooftop neon sign
  function neonSignTexture() {
    return canvasTex(512, 192, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = 'rgba(95,230,255,.95)'; x.shadowBlur = 19;
      x.fillStyle = '#c8fbff';
      x.font = 'bold 90px "Microsoft YaHei","PingFang SC",sans-serif';
      x.fillText('深 圳', w / 2, 75);
      x.shadowColor = 'rgba(255,98,200,.9)'; x.shadowBlur = 13;
      x.fillStyle = '#ff8bda';
      x.font = '600 26px "DIN Alternate","Microsoft YaHei",sans-serif';
      x.fillText('S H E N Z H E N   ·   2 0 2 6', w / 2, 144);
    });
  }
  {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 3.3), new THREE.MeshBasicMaterial({
      map: neonSignTexture(), transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, side: THREE.DoubleSide, fog: false
    }));
    sign.name = 'night-sign';
    sign.position.set(-18.5, 7.4, 14.4);
    sign.renderOrder = 21;
    sign.material.depthTest = false;
    const B = new GeoBuilder();
    B.box('#05080e', -18.5, 7.4, 13.55, 9.2, 3.7, 0.15);
    B.box('#0b121c', -22.6, 5.6, 13.6, 0.12, 4.0, 0.12);
    B.box('#0b121c', -14.4, 5.6, 13.6, 0.12, 4.0, 0.12);
    const signFrame = B.build(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, depthTest: false }));
    signFrame.renderOrder = 20;
    const nightSignGroup = new THREE.Group();
    nightSignGroup.add(signFrame, sign);
    signScene.add(nightSignGroup);
    var nightNeonSign = nightSignGroup;
  }

  const apecNight = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.5), new THREE.MeshBasicMaterial({
    map: apecSignTexture(), transparent: true, blending: THREE.AdditiveBlending,
    depthTest: false, side: THREE.DoubleSide, fog: false
  }));
  apecNight.position.set(27, 17.6, 11.0);
  apecNight.renderOrder = 22;
  apecNight.visible = false;
  signScene.add(apecNight);

  // golden "鹏翼" light bands, revealed at the APEC finale
  for (const side of [-1, 1]) {
    let prev = null;
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      const px = side * (1.2 + u * 32);
      const py = 21.5 + Math.sin(u * Math.PI) * 7.6;
      const pz = 6.2 - u * 3.2;
      const p = new THREE.Vector3(px, py, pz);
      if (prev) addLine(prev, p, 0xf2c879, 0.95, 2024.8);
      addPoint(px, py, pz, 0xf2c879, 1.8, 1, 2024.8);
      prev = p;
    }
  }

  // 1980 shoreline memory: dark village, boats, billboard and warm lanterns
  const nightEarlyMat = new THREE.MeshStandardMaterial({
    color: 0x071018, emissive: 0x06121c, emissiveIntensity: 0.34, roughness: 0.8, metalness: 0.12
  });
  function darkClone(root) {
    root.traverse(o => { if (o.isMesh) { o.material = nightEarlyMat; o.castShadow = o.receiveShadow = false; } });
    root.visible = true;
  }
  const nightVillage = village.clone(true);
  nightVillage.position.y = 0; nightVillage.scale.set(1, 1, 1);
  darkClone(nightVillage);
  nightScene.add(nightVillage);
  const nightBoats = new THREE.Group();
  boats.forEach(b => { const c = b.clone(true); darkClone(c); nightBoats.add(c); });
  nightScene.add(nightBoats);
  const nightBillboard = billboard.clone(true);
  darkClone(nightBillboard);
  nightScene.add(nightBillboard);
  const villageLightPos = [], villageLightCol = [];
  for (let i = 0; i < 28; i++) {
    const x = -48 + nightRnd() * 15, z = 5 + nightRnd() * 14;
    const c = i % 4 === 0 ? 0xffc46a : (i % 3 === 0 ? 0xffe0a0 : 0xff8a58);
    villageLightPos.push(x, 0.5 + nightRnd() * 1.6, z);
    _nC.setHex(c); villageLightCol.push(_nC.r, _nC.g, _nC.b);
  }
  const villageLightGeo = new THREE.BufferGeometry();
  villageLightGeo.setAttribute('position', new THREE.Float32BufferAttribute(villageLightPos, 3));
  villageLightGeo.setAttribute('color', new THREE.Float32BufferAttribute(villageLightCol, 3));
  const nightVillageLights = new THREE.Points(villageLightGeo, new THREE.PointsMaterial({
    size: 1.5, vertexColors: true, transparent: true, opacity: 0.75,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  }));
  nightScene.add(nightVillageLights);
  addLine(new THREE.Vector3(-55, 0.18, 18.2), new THREE.Vector3(55, 0.18, 18.2), 0x3a7f95, 0.35);

  // one line batch, one static point batch
  const nightLineMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uYear: { value: 2026 } },
    vertexShader: `
      attribute vec3 aColor; attribute float aYear;
      uniform float uYear;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vColor = aColor;
        vAlpha = aYear < 0.5 ? 1.0 : smoothstep(aYear, aYear + 1.6, uYear);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha;
      void main(){ gl_FragColor = vec4(vColor, vAlpha); }`
  });
  const lineMesh = new THREE.LineSegments(
    new THREE.BufferGeometry()
      .setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3))
      .setAttribute('aColor', new THREE.Float32BufferAttribute(lineCol, 3))
      .setAttribute('aYear', new THREE.Float32BufferAttribute(lineYear, 1)),
    nightLineMat
  );
  lineMesh.name = 'night-lines';
  lineMesh.frustumCulled = false;
  nightScene.add(lineMesh);

  const flashSlots = [];
  for (let i = 0; i < 4; i++) flashSlots.push({ idx: addPoint(0, 0, 0, 0xffffff, 0, 0, 2024.8), t: 0, life: 0 });
  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute('position', new THREE.Float32BufferAttribute(ptPos, 3));
  ptGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(ptCol, 3));
  ptGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(ptSize, 1));
  ptGeo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(ptAlpha, 1));
  ptGeo.setAttribute('aYear', new THREE.Float32BufferAttribute(ptYear, 1));
  const nightPointMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uPixelRatio: { value: renderer.getPixelRatio() }, uYear: { value: 2026 } },
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; attribute float aAlpha; attribute float aYear;
      uniform float uPixelRatio, uYear;
      varying vec3 vColor; varying float vAlpha;
      void main(){
        vColor = aColor;
        float vis = aYear < 0.5 ? 1.0 : smoothstep(aYear, aYear + 1.6, uYear);
        vAlpha = aAlpha * vis;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(1.0, aSize * uPixelRatio * (220.0 / max(1.0, -mv.z)));
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      varying vec3 vColor; varying float vAlpha;
      void main(){ float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(vColor, smoothstep(0.5, 0.02, d) * vAlpha); }`
  });
  const pointCloud = new THREE.Points(ptGeo, nightPointMat);
  pointCloud.name = 'night-points';
  pointCloud.frustumCulled = false;
  nightScene.add(pointCloud);

  // --- drone show -----------------------------------------------------
  const DRONE_N = 48;
  const dronePos = new Float32Array(DRONE_N * 3);
  const dronePrev = new Float32Array(DRONE_N * 3);
  const droneCol = new Float32Array(DRONE_N * 3);
  const droneSize = new Float32Array(DRONE_N);
  const droneAlpha = new Float32Array(DRONE_N);
  const droneYear = new Float32Array(DRONE_N).fill(2024.8);
  const droneGeo = new THREE.BufferGeometry();
  droneGeo.setAttribute('position', new THREE.BufferAttribute(dronePos, 3));
  droneGeo.setAttribute('aColor', new THREE.BufferAttribute(droneCol, 3));
  droneGeo.setAttribute('aSize', new THREE.BufferAttribute(droneSize, 1));
  droneGeo.setAttribute('aAlpha', new THREE.BufferAttribute(droneAlpha, 1));
  droneGeo.setAttribute('aYear', new THREE.BufferAttribute(droneYear, 1));
  const dronePoints = new THREE.Points(droneGeo, nightPointMat);
  dronePoints.frustumCulled = false;
  nightScene.add(dronePoints);
  const trailGeo = new THREE.BufferGeometry();
  const trailPos = new Float32Array(DRONE_N * 6);
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  const trailLine = new THREE.LineSegments(trailGeo, new THREE.LineBasicMaterial({
    color: 0x6feaff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  }));
  trailLine.frustumCulled = false;
  nightScene.add(trailLine);
  const droneMeta = [];
  {
    for (let i = 0; i < DRONE_N; i++) {
      const body = i >= 40;
      const side = i < 20 ? -1 : 1;
      const u = (i % 20) / 19;
      _nC.setHex(body ? 0xfff2c9 : (i % 7 === 0 ? 0xff7ad9 : (i % 5 === 0 ? 0xa8f0ff : 0x7feaff)));
      droneCol[i * 3] = _nC.r; droneCol[i * 3 + 1] = _nC.g; droneCol[i * 3 + 2] = _nC.b;
      droneSize[i] = body ? 4.2 : 2.8 + (i % 3) * 0.32;
      droneMeta.push({ side, u, body, phase: i * 0.73 });
    }
  }
  function updateDrones(t) {
    for (let i = 0; i < DRONE_N; i++) {
      const d = droneMeta[i];
      let x, y, z;
      if (d.body) {
        const k = (i - 40) / 7;
        x = Math.sin(t * 0.7 + i) * 0.25;
        y = 32.4 + k * 0.20 + Math.sin(t * 1.2 + i) * 0.10;
        z = 17.5 - k * 2.0;
      } else {
        const flap = Math.sin(t * 1.55 + d.phase * 0.15) * 1.15 * Math.sin(d.u * Math.PI);
        x = d.side * (1.1 + d.u * 14.0) + Math.sin(t * 0.55 + d.phase) * 0.16;
        y = 30.4 + Math.sin(d.u * Math.PI) * 3.9 + flap + Math.sin(t * 1.2 + d.phase) * 0.10;
        z = 18.0 - d.u * 7.4 + Math.cos(t * 0.42 + d.phase) * 0.32;
      }
      const k = i * 3;
      dronePrev[k] = dronePos[k]; dronePrev[k + 1] = dronePos[k + 1]; dronePrev[k + 2] = dronePos[k + 2];
      dronePos[k] = x; dronePos[k + 1] = y; dronePos[k + 2] = z;
      droneAlpha[i] = 0.72 + 0.28 * Math.sin(t * 3.0 + d.phase * 4.0);
      const tk = i * 6;
      trailPos[tk] = x; trailPos[tk + 1] = y; trailPos[tk + 2] = z;
      trailPos[tk + 3] = dronePrev[k]; trailPos[tk + 4] = dronePrev[k + 1]; trailPos[tk + 5] = dronePrev[k + 2];
    }
    droneGeo.attributes.position.needsUpdate = true;
    droneGeo.attributes.aAlpha.needsUpdate = true;
    trailGeo.attributes.position.needsUpdate = true;
  }
  updateDrones(0);

  // --- fireworks ------------------------------------------------------
  const FW_MAX = 760;
  const fwPos = new Float32Array(FW_MAX * 3);
  const fwCol = new Float32Array(FW_MAX * 3);
  const fwAlpha = new Float32Array(FW_MAX);
  const fwSize = new Float32Array(FW_MAX);
  const fwVel = new Float32Array(FW_MAX * 3);
  const fwLife = new Float32Array(FW_MAX);
  const fwMax = new Float32Array(FW_MAX);
  const fwGeo = new THREE.BufferGeometry();
  fwGeo.setAttribute('position', new THREE.BufferAttribute(fwPos, 3));
  fwGeo.setAttribute('aColor', new THREE.BufferAttribute(fwCol, 3));
  fwGeo.setAttribute('aAlpha', new THREE.BufferAttribute(fwAlpha, 1));
  fwGeo.setAttribute('aSize', new THREE.BufferAttribute(fwSize, 1));
  fwGeo.setAttribute('aYear', new THREE.BufferAttribute(new Float32Array(FW_MAX).fill(2024.8), 1));
  const fwPoints = new THREE.Points(fwGeo, nightPointMat);
  fwPoints.frustumCulled = false;
  nightScene.add(fwPoints);
  const fwTrailPos = new Float32Array(FW_MAX * 6);
  const fwTrailCol = new Float32Array(FW_MAX * 6);
  const fwTrailGeo = new THREE.BufferGeometry();
  fwTrailGeo.setAttribute('position', new THREE.BufferAttribute(fwTrailPos, 3));
  fwTrailGeo.setAttribute('color', new THREE.BufferAttribute(fwTrailCol, 3));
  const fwTrail = new THREE.LineSegments(fwTrailGeo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, fog: false
  }));
  fwTrail.frustumCulled = false;
  nightScene.add(fwTrail);
  let fwNext = 0.9, fwCursor = 0, firstBurst = true, flashCursor = 0;
  let flashDirty = false, flashActive = false;
  const fwPalette = [0x65e6ff, 0xff62c8, 0xffc46a, 0xdff4ff, 0x9d8cff];
  function spawnBurst(x, y, z, forceA, forceB, forceN) {
    const ca = forceA !== undefined ? forceA : fwPalette[Math.floor(Math.random() * fwPalette.length)];
    const cb = forceB !== undefined ? forceB : fwPalette[Math.floor(Math.random() * fwPalette.length)];
    const n = forceN || (130 + Math.floor(Math.random() * 45));
    for (let j = 0; j < n; j++) {
      const idx = fwCursor;
      fwCursor = (fwCursor + 1) % FW_MAX;
      const theta = Math.random() * PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = Math.random() < 0.58 ? 5.0 + Math.random() * 1.6 : 1.8 + Math.random() * 7.0;
      const k = idx * 3;
      fwPos[k] = x; fwPos[k + 1] = y; fwPos[k + 2] = z;
      fwVel[k] = Math.sin(phi) * Math.cos(theta) * speed;
      fwVel[k + 1] = Math.cos(phi) * speed;
      fwVel[k + 2] = Math.sin(phi) * Math.sin(theta) * speed * 0.7;
      _nC.setHex(Math.random() < 0.5 ? ca : cb);
      fwCol[k] = _nC.r; fwCol[k + 1] = _nC.g; fwCol[k + 2] = _nC.b;
      const life = 1.25 + Math.random() * 1.15;
      fwLife[idx] = life; fwMax[idx] = life;
      fwAlpha[idx] = 1; fwSize[idx] = 2.0 + Math.random() * 1.8;
    }
    const f = flashSlots[flashCursor]; flashCursor = (flashCursor + 1) % flashSlots.length;
    const k = f.idx * 3;
    ptPos[k] = x; ptPos[k + 1] = y; ptPos[k + 2] = z;
    ptCol[k] = _nC.r; ptCol[k + 1] = _nC.g; ptCol[k + 2] = _nC.b;
    ptSize[f.idx] = 10; ptAlpha[f.idx] = 1;
    f.t = 0; f.life = 0.42;
    _nC.setHex(ca);
    ptCol[k] = _nC.r; ptCol[k + 1] = _nC.g; ptCol[k + 2] = _nC.b;
    flashDirty = true; flashActive = true;
    fwGeo.attributes.aColor.needsUpdate = true;
    fwGeo.attributes.aSize.needsUpdate = true;
  }
  function updateFireworks(t, dt) {
    if (t > fwNext) {
      let x, y, z;
      if (firstBurst) {
        x = 0; y = 34; z = 14;
        firstBurst = false;
        spawnBurst(x, y, z, 0x65e6ff, 0xff62c8, 72);
      } else {
        x = -14 + Math.random() * 28;
        y = 30 + Math.random() * 7;
        z = 9 + Math.random() * 15;
        spawnBurst(x, y, z);
      }
      if (Math.random() < 0.32) spawnBurst(x + (Math.random() - 0.5) * 10, y + 1.5, z + 3);
      fwNext = t + 1.8 + Math.random() * 1.8;
    }
    for (let i = 0; i < FW_MAX; i++) {
      if (fwLife[i] <= 0) {
        fwAlpha[i] = 0;
        const tk = i * 6;
        for (let q = 0; q < 6; q++) { fwTrailPos[tk + q] = 0; fwTrailCol[tk + q] = 0; }
        continue;
      }
      fwLife[i] -= dt;
      const k = i * 3;
      fwVel[k + 1] -= 2.6 * dt;
      fwVel[k] *= 0.985; fwVel[k + 1] *= 0.99; fwVel[k + 2] *= 0.985;
      fwPos[k] += fwVel[k] * dt;
      fwPos[k + 1] += fwVel[k + 1] * dt;
      fwPos[k + 2] += fwVel[k + 2] * dt;
      fwAlpha[i] = Math.max(0, fwLife[i] / fwMax[i]);
      const tk = i * 6;
      fwTrailPos[tk] = fwPos[k]; fwTrailPos[tk + 1] = fwPos[k + 1]; fwTrailPos[tk + 2] = fwPos[k + 2];
      fwTrailPos[tk + 3] = fwPos[k] - fwVel[k] * 0.18;
      fwTrailPos[tk + 4] = fwPos[k + 1] - fwVel[k + 1] * 0.18;
      fwTrailPos[tk + 5] = fwPos[k + 2] - fwVel[k + 2] * 0.18;
      const a = fwAlpha[i] * 0.85;
      fwTrailCol[tk] = fwCol[k] * a; fwTrailCol[tk + 1] = fwCol[k + 1] * a; fwTrailCol[tk + 2] = fwCol[k + 2] * a;
      fwTrailCol[tk + 3] = fwCol[k] * a; fwTrailCol[tk + 4] = fwCol[k + 1] * a; fwTrailCol[tk + 5] = fwCol[k + 2] * a;
    }
    let anyFlash = false;
    for (const f of flashSlots) {
      if (f.life <= 0) continue;
      anyFlash = true;
      f.t += dt;
      const a = 1 - f.t / f.life;
      ptAlpha[f.idx] = Math.max(0, a) * 0.7;
      ptSize[f.idx] = 3 + f.t * 12;
      if (a <= 0) { f.life = 0; ptAlpha[f.idx] = 0; ptSize[f.idx] = 0; }
    }
    flashActive = anyFlash;
    fwGeo.attributes.position.needsUpdate = true;
    fwGeo.attributes.aAlpha.needsUpdate = true;
    fwTrailGeo.attributes.position.needsUpdate = true;
    fwTrailGeo.attributes.color.needsUpdate = true;
    if (flashDirty) {
      ptGeo.attributes.position.needsUpdate = true;
      ptGeo.attributes.aColor.needsUpdate = true;
      flashDirty = false;
    }
    if (flashActive) ptGeo.attributes.aSize.needsUpdate = true;
    ptGeo.attributes.aAlpha.needsUpdate = true;
  }
  updateFireworks(0, 0);

  // --- night camera / update / reset ---------------------------------
  const baseYaw = Math.atan2(NIGHT_P.x - NIGHT_T.x, NIGHT_P.z - NIGHT_T.z);
  const basePitch = Math.asin((NIGHT_P.y - NIGHT_T.y) / NIGHT_P.distanceTo(NIGHT_T));
  const baseDist = NIGHT_P.distanceTo(NIGHT_T);
  function updateNightCamera(time, year) {
    nightOrbit.yaw += (nightOrbit.yawT - nightOrbit.yaw) * 0.1;
    nightOrbit.pitch += (nightOrbit.pitchT - nightOrbit.pitch) * 0.1;
    nightOrbit.zoom += (nightOrbit.zoomT - nightOrbit.zoom) * 0.1;
    const early = 1 - smoothstep(1980, 2000, year);
    const panX = -34 * early;
    const panY = -4 * early;
    const tx = NIGHT_T.x + panX;
    const ty = NIGHT_T.y + panY + Math.sin(time * 0.13) * 0.22;
    const yaw = baseYaw + nightOrbit.yaw + Math.sin(time * 0.045) * 0.018;
    const pitch = clamp(basePitch + nightOrbit.pitch, 0.035, 1.18);
    const dist = baseDist * nightOrbit.zoom;
    nightCamera.position.set(
      tx + Math.sin(yaw) * Math.cos(pitch) * dist,
      ty + Math.sin(pitch) * dist,
      NIGHT_T.z + Math.cos(yaw) * Math.cos(pitch) * dist
    );
    nightCamera.lookAt(tx, ty, NIGHT_T.z);
  }
  updateNightCamera(0, END);

  let nightCityYear = -1;
  function updateNightWorld(year) {
    if (Math.abs(year - nightCityYear) > 0.001) {
      updateNightCity(year);
      nightCityYear = year;
    }
    nightLineMat.uniforms.uYear.value = year;
    nightPointMat.uniforms.uYear.value = year;
    nightPingAn.visible = year >= 2015.8;
    nightPingAn.scale.set(1, 0.92, 1);
    nightDiwang.visible = year >= 1995.8;
    nightDiwang.scale.set(1, 0.92, 1);
    nightBridge.visible = year > 2020.5;
    nightBridge.scale.setScalar(0.62);
    nightVillage.visible = year < 1999;
    nightBoats.visible = year < 1996;
    nightBillboard.visible = year < 1992;
    nightVillageLights.visible = year < 1999;
    const coastOn = year >= 2017.8;
    prom.visible = pool.visible = road.visible = coastOn;
    nightNeonSign.visible = year >= 2024.8;
    apecNight.visible = year >= 2024.8;
    const show = year >= 2024.8;
    dronePoints.visible = trailLine.visible = show;
    fwPoints.visible = fwTrail.visible = show;
  }
  updateNightWorld(END);

  function updateNight(t, dt, year) {
    updateNightWorld(year);
    nightSkyMat.uniforms.uTime.value = t;
    nightWaterMat.uniforms.uTime.value = t;
    updateNightCamera(t, year);
    updateDrones(t);
    updateFireworks(t, dt);
    const pulse = 0.72 + 0.28 * Math.sin(t * 2.2);
    ptAlpha[nightPingAn.userData.beacon] = 0.65 + pulse * 0.35;
    ptAlpha[nightPingAn.userData.halo] = 0.12 + pulse * 0.10;
    ptAlpha[nightDiwang.userData.halo] = 0.10 + pulse * 0.08;
    ptGeo.attributes.aAlpha.needsUpdate = true;
    nightHorizon.material.opacity = 0.62 + Math.sin(t * 0.35) * 0.08;
  }

  function resetNight() {
    nightTime = 0;
    fwNext = 0.9; firstBurst = true; fwCursor = 0; flashCursor = 0;
    fwLife.fill(0); fwAlpha.fill(0);
    fwTrailPos.fill(0); fwTrailCol.fill(0);
    for (const f of flashSlots) {
      f.t = 0; f.life = 0;
      ptAlpha[f.idx] = 0; ptSize[f.idx] = 0;
    }
    nightOrbit.yaw = 0; nightOrbit.yawT = 0;
    nightOrbit.pitch = 0; nightOrbit.pitchT = 0;
    nightOrbit.zoom = 1; nightOrbit.zoomT = 1;
    fwGeo.attributes.aAlpha.needsUpdate = true;
    fwGeo.attributes.aSize.needsUpdate = true;
    fwTrailGeo.attributes.position.needsUpdate = true;
    fwTrailGeo.attributes.color.needsUpdate = true;
    ptGeo.attributes.aAlpha.needsUpdate = true;
    ptGeo.attributes.aSize.needsUpdate = true;
    flashDirty = true; flashActive = false;
  }
  /* ------------------------------------------------------------------ */
  /* camera path                                                        */
  /* ------------------------------------------------------------------ */
  const CAM_KEYS = [
    { y: 1980, p: [-32, 15, 40], t: [-38, 0.0, 4] },
    { y: 1985, p: [-28, 15, 35], t: [-32, 4.0, 6] },
    { y: 1990, p: [-24, 18, 41], t: [-24, 5.0, 4] },
    { y: 1996, p: [-14, 22, 49], t: [-12, 7.0, 3] },
    { y: 2004, p: [-5, 26, 55], t: [-3, 8.0, 3] },
    { y: 2011, p: [2, 28, 59], t: [1, 8.5, 3] },
    { y: 2016, p: [5, 29, 60], t: [0, 8.0, 4] },
    { y: 2026, p: [6, 29, 60], t: [0, 6.0, 4] }
  ].map(k => ({ y: k.y, p: new THREE.Vector3(...k.p), t: new THREE.Vector3(...k.t) }));

  function cameraAt(year, outP, outT) {
    let i = 0;
    while (i < CAM_KEYS.length - 2 && year > CAM_KEYS[i + 1].y) i++;
    const a = CAM_KEYS[i], b = CAM_KEYS[i + 1];
    const tt = smooth((year - a.y) / (b.y - a.y));
    outP.lerpVectors(a.p, b.p, tt);
    outT.lerpVectors(a.t, b.t, tt);
  }

  const userOrbit = { yaw: 0, pitch: 0, yawT: 0, pitchT: 0, zoom: 1, zoomT: 1 };
  const camBaseP = new THREE.Vector3(), camBaseT = new THREE.Vector3();
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
  const tmpV = new THREE.Vector3();

  let camOverride = null;
  function updateCamera(year, time) {
    if (camOverride) {
      camera.position.copy(camOverride.p);
      camera.lookAt(camOverride.t);
      return;
    }
    cameraAt(year, camBaseP, camBaseT);
    userOrbit.yaw += (userOrbit.yawT - userOrbit.yaw) * 0.1;
    userOrbit.pitch += (userOrbit.pitchT - userOrbit.pitch) * 0.1;
    userOrbit.zoom += (userOrbit.zoomT - userOrbit.zoom) * 0.1;

    camTgt.copy(camBaseT);
    camPos.copy(camBaseP);
    tmpV.subVectors(camPos, camTgt);
    const dist = tmpV.length() * userOrbit.zoom;
    let yaw = Math.atan2(tmpV.x, tmpV.z) + userOrbit.yaw;
    let pitch = Math.asin(clamp(tmpV.y / tmpV.length(), -1, 1)) + userOrbit.pitch;
    pitch = clamp(pitch, 0.08, 1.24);
    camPos.set(
      camTgt.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      camTgt.y + Math.sin(pitch) * dist,
      camTgt.z + Math.cos(yaw) * Math.cos(pitch) * dist
    );
    camPos.y += Math.sin(time * 0.24) * 0.05;
    camera.position.copy(camPos);
    camera.lookAt(camTgt);
  }

  /* ------------------------------------------------------------------ */
  /* post: tone, tilt-shift, paper grade                                */
  /* ------------------------------------------------------------------ */
  const canHalf = renderer.extensions.has('EXT_color_buffer_half_float') || renderer.extensions.has('EXT_color_buffer_float');
  const RT_TYPE = canHalf ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const rtScene = new THREE.WebGLRenderTarget(1, 1, { type: RT_TYPE, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, stencilBuffer: false });
  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  quad.frustumCulled = false;
  quadScene.add(quad);
  const VS_QUAD = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

  const focus = [];
  for (let i = 0; i < 6; i++) focus.push(new THREE.Vector4(0.5, 0.5, 0.01, 0));

  const compositeMat = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: null },
      uTexel: { value: new THREE.Vector2(1 / 1600, 1 / 900) },
      uAspect: { value: 16 / 9 },
      uFocus: { value: focus },
      uBlur: { value: 1.5 },
      uExposure: { value: 0.97 },
      uContrast: { value: 1.06 },
      uSaturation: { value: 1.0 },
      uTime: { value: 0 }
    },
    vertexShader: VS_QUAD,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D tScene;
      uniform vec2 uTexel;
      uniform float uAspect, uBlur, uExposure, uContrast, uSaturation, uTime;
      uniform vec4 uFocus[6];
      vec3 aces(vec3 x){
        return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
      }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 uv = vUv;
        float sharp = 0.0;
        for (int i = 0; i < 6; i++) {
          vec4 f = uFocus[i];
          vec2 d = (uv - f.xy) * vec2(uAspect, 1.0);
          float r = max(f.z, 0.0001);
          sharp = max(sharp, 1.0 - smoothstep(r * 0.72, r * 1.5, length(d)));
        }
        vec2 ec = (uv - 0.5) * vec2(uAspect, 1.0);
        float edge = smoothstep(0.38, 0.95, length(ec));
        float blur = clamp((1.0 - sharp) * 0.95 + edge * 0.20, 0.0, 1.0) * uBlur;

        vec3 c = texture2D(tScene, uv).rgb * 0.30;
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.785398 + 0.35;
          float rr = blur * (0.8 + 2.8 * fract(float(i) * 0.371));
          c += texture2D(tScene, uv + vec2(cos(a), sin(a)) * uTexel * rr).rgb * 0.0875;
        }
        c *= uExposure;
        c = aces(c);
        c = mix(vec3(0.46), c, uContrast);
        float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(lum), c, uSaturation);
        c *= vec3(1.004, 1.0, 0.994);
        c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
        float vig = smoothstep(1.18, 0.35, length((uv - 0.5) * vec2(uAspect * 0.62, 1.0)));
        c *= mix(0.86, 1.0, vig);
        float grain = hash(uv * 1000.0 + fract(uTime)) - 0.5;
        c += grain * 0.006;
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false, depthWrite: false
  });

  function sizeTargets(w, h) {
    const dpr = renderer.getPixelRatio();
    const W = Math.max(2, Math.floor(w * dpr));
    const H = Math.max(2, Math.floor(h * dpr));
    rtScene.setSize(W, H);
    const nw = Math.max(2, Math.floor(W / 2)), nh = Math.max(2, Math.floor(H / 2));
    rtNightBloom.setSize(nw, nh);
    rtNightTmp.setSize(nw, nh);
    compositeMat.uniforms.uTexel.value.set(1 / W, 1 / H);
    compositeMat.uniforms.uAspect.value = w / h;
    nightCompositeMat.uniforms.uAspect.value = w / h;
  }

  const _v = new THREE.Vector3();
  function updateFocus() {
    const anchors = [
      { x: 0, y: 15.5, z: -4, r: 0.27 },
      { x: -16, y: 2.4, z: 5.2, r: 0.11 },
      { x: -5, y: 1.3, z: 14.8, r: 0.11 },
      { x: 15.5, y: 2.4, z: 6.4, r: 0.11 },
      { x: 18, y: 1.6, z: 24.5, r: 0.09 },
      { x: 9, y: 1.3, z: 14.8, r: 0.11 }
    ];
    for (let i = 0; i < 6; i++) {
      const a = anchors[i];
      _v.set(a.x, a.y, a.z).project(camera);
      const x = _v.x * 0.5 + 0.5, y = _v.y * 0.5 + 0.5;
      const behind = _v.z > 1 ? 0.0001 : 1;
      focus[i].set(x, y, a.r * behind, 0);
    }
  }

  let sceneCalls = 0, sceneTris = 0;
  function renderPipeline() {
    renderer.setRenderTarget(rtScene);
    renderer.clear();
    renderer.render(scene, camera);
    sceneCalls = renderer.info.render.calls;
    sceneTris = renderer.info.render.triangles;
    updateFocus();
    quad.material = compositeMat;
    compositeMat.uniforms.tScene.value = rtScene.texture;
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCam);
  }

  /* ------------------------------------------------------------------ */
  /* night post: bloom + neon grade                                     */
  /* ------------------------------------------------------------------ */
  const rtNightBloom = new THREE.WebGLRenderTarget(1, 1, { type: RT_TYPE, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false });
  const rtNightTmp = rtNightBloom.clone();

  const nightBrightMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uThreshold: { value: 0.42 }, uKnee: { value: 0.30 } },
    vertexShader: VS_QUAD,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D tDiffuse;
      uniform float uThreshold, uKnee;
      void main(){
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        float k = smoothstep(uThreshold, uThreshold + uKnee, l);
        gl_FragColor = vec4(c * k, 1.0);
      }`,
    depthTest: false, depthWrite: false
  });
  const nightBlurMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) }, uRadius: { value: 1 } },
    vertexShader: VS_QUAD,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D tDiffuse;
      uniform vec2 uDir;
      uniform float uRadius;
      void main(){
        vec2 d = uDir * uRadius;
        vec3 c = texture2D(tDiffuse, vUv).rgb * 0.2270270270;
        c += texture2D(tDiffuse, vUv + d * 1.3846153846).rgb * 0.3162162162;
        c += texture2D(tDiffuse, vUv - d * 1.3846153846).rgb * 0.3162162162;
        c += texture2D(tDiffuse, vUv + d * 3.2307692308).rgb * 0.0702702703;
        c += texture2D(tDiffuse, vUv - d * 3.2307692308).rgb * 0.0702702703;
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false, depthWrite: false
  });
  const nightCompositeMat = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: null }, tBloom: { value: null },
      uStrength: { value: 2.00 }, uExposure: { value: 1.08 },
      uAspect: { value: 16 / 9 }, uTime: { value: 0 }
    },
    vertexShader: VS_QUAD,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D tScene, tBloom;
      uniform float uStrength, uExposure, uAspect, uTime;
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 uv = vUv, cc = uv - 0.5;
        vec3 base = texture2D(tScene, uv).rgb;
        vec3 bloom = texture2D(tBloom, uv).rgb;
        vec3 c = base + bloom * uStrength;
        c *= uExposure;
        c = aces(c);
        float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(lum), c, 1.10);
        c = mix(c, c * vec3(0.90, 0.95, 1.12), (1.0 - lum) * 0.30);
        c = pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
        float vig = smoothstep(1.22, 0.30, length(cc * vec2(uAspect * 0.70, 1.0)));
        c *= mix(0.72, 1.0, vig);
        c += (hash(uv * 1000.0 + fract(uTime)) - 0.5) * 0.007;
        gl_FragColor = vec4(c, 1.0);
      }`,
    depthTest: false, depthWrite: false
  });

  let nightCalls = 0, nightTris = 0;
  function renderNight() {
    renderer.setRenderTarget(rtScene);
    renderer.clear();
    renderer.render(nightScene, nightCamera);
    nightCalls = renderer.info.render.calls;
    nightTris = renderer.info.render.triangles;

    quad.material = nightBrightMat;
    nightBrightMat.uniforms.tDiffuse.value = rtScene.texture;
    renderer.setRenderTarget(rtNightBloom);
    renderer.render(quadScene, quadCam);

    const bw = rtNightBloom.width, bh = rtNightBloom.height;
    quad.material = nightBlurMat;
    nightBlurMat.uniforms.tDiffuse.value = rtNightBloom.texture;
    nightBlurMat.uniforms.uRadius.value = 4.2;
    nightBlurMat.uniforms.uDir.value.set(1 / bw, 0);
    renderer.setRenderTarget(rtNightTmp);
    renderer.render(quadScene, quadCam);
    nightBlurMat.uniforms.tDiffuse.value = rtNightTmp.texture;
    nightBlurMat.uniforms.uDir.value.set(0, 1 / bh);
    renderer.setRenderTarget(rtNightBloom);
    renderer.render(quadScene, quadCam);

    quad.material = nightCompositeMat;
    nightCompositeMat.uniforms.tScene.value = rtScene.texture;
    nightCompositeMat.uniforms.tBloom.value = rtNightBloom.texture;
    nightCompositeMat.uniforms.uTime.value = nightTime;
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCam);
    renderer.autoClear = false;
    renderer.render(signScene, nightCamera);
    renderer.autoClear = true;
    if (nightNeonSign.visible) { nightCalls += 2; nightTris += 14; }
    if (apecNight.visible) { nightCalls += 1; nightTris += 2; }
  }
  /* ------------------------------------------------------------------ */
  /* timeline                                                           */
  /* ------------------------------------------------------------------ */
  const ANCHORS = [
    { y: 1980, hold: 2.0 }, { y: 1985, hold: 0.7 }, { y: 1990, hold: 0.6 },
    { y: 1996, hold: 0.7 }, { y: 2004, hold: 0.6 }, { y: 2011, hold: 0.6 },
    { y: 2016, hold: 0.9 }, { y: 2026, hold: 5.0 }
  ];
  const SEGMENTS = [];
  {
    let t = 0;
    for (let i = 0; i < ANCHORS.length; i++) {
      SEGMENTS.push({ type: 'hold', y: ANCHORS[i].y, t0: t, t1: t + ANCHORS[i].hold });
      t += ANCHORS[i].hold;
      if (i < ANCHORS.length - 1) {
        const dur = (ANCHORS[i + 1].y - ANCHORS[i].y) * CFG.travel;
        SEGMENTS.push({ type: 'move', y0: ANCHORS[i].y, y1: ANCHORS[i + 1].y, t0: t, t1: t + dur });
        t += dur;
      }
    }
  }
  const TOTAL = SEGMENTS[SEGMENTS.length - 1].t1;

  function segmentAt(t) {
    for (let i = 0; i < SEGMENTS.length; i++) if (t < SEGMENTS[i].t1) return SEGMENTS[i];
    return SEGMENTS[SEGMENTS.length - 1];
  }
  function yearAt(t) {
    const s = segmentAt(t);
    if (s.type === 'hold') return s.y;
    const u = clamp((t - s.t0) / (s.t1 - s.t0), 0, 1);
    return lerp(s.y0, s.y1, smooth(u));
  }
  function timeForYear(y) {
    for (let i = 0; i < SEGMENTS.length; i++) {
      const s = SEGMENTS[i];
      if (s.type === 'hold' && Math.abs(s.y - y) < 1e-6) return s.t0;
      if (s.type === 'move' && y >= s.y0 && y <= s.y1) {
        const u = (y - s.y0) / (s.y1 - s.y0);
        const inv = 0.5 - Math.sin(Math.asin(clamp(1 - 2 * u, -1, 1)) / 3);
        return s.t0 + (s.t1 - s.t0) * inv;
      }
    }
    return y <= START ? 0 : TOTAL;
  }

  /* ------------------------------------------------------------------ */
  /* HUD                                                                */
  /* ------------------------------------------------------------------ */
  const UI = {
    year: document.getElementById('year'), era: document.getElementById('era'), yearMeta: document.getElementById('yearMeta'),
    clock: document.getElementById('clock'), fill: document.getElementById('fill'), knob: document.getElementById('knob'),
    track: document.getElementById('track'), chapter: document.getElementById('chapter'), chapterYear: document.getElementById('chapterYear'),
    chapterTag: document.getElementById('chapterTag'), chapterTitle: document.getElementById('chapterTitle'), chapterText: document.getElementById('chapterText'),
    finale: document.getElementById('finale'), legend: document.getElementById('legend'), loader: document.getElementById('loader'),
    playIcon: document.getElementById('playIcon'), playLabel: document.getElementById('playLabel'), soundLabel: document.getElementById('soundLabel'),
    btnPlay: document.getElementById('btnPlay'), btnReplay: document.getElementById('btnReplay'), btnSound: document.getElementById('btnSound'),
    btnMode: document.getElementById('btnMode'), modeIcon: document.getElementById('modeIcon'), modeLabel: document.getElementById('modeLabel'),
    brandSub: document.getElementById('brandSub'), nightCaption: document.getElementById('nightCaption'),
    apecBadge: document.getElementById('apecBadge')
  };

  const ERAS = [
    [1980, 1984, '蛇口滩涂 · 特区元年'],
    [1985, 1989, '罗湖初代天际线'],
    [1990, 1995, '建设年代 · 塔吊之城'],
    [1996, 1998, '地王时代 · 亚洲高度'],
    [1999, 2003, '华强北 · 电子浪潮'],
    [2004, 2010, '福田 CBD · 市民中心'],
    [2011, 2015, '摩天天际线'],
    [2016, 2017, '平安之巅 · 599 米'],
    [2018, 2020, '湾区时代 · 春笋'],
    [2021, 2023, '前海 · 深中通道'],
    [2024, 2025, '超级总部 · 全球城市'],
    [2026, 2026, '湾区 APEC · 亚太共同体']
  ];
  function eraFor(y) { for (const e of ERAS) if (y >= e[0] && y <= e[1]) return e[2]; return ERAS[ERAS.length - 1][2]; }

  const CHAPTERS = {
    1980: { tag: '特区元年', title: '蛇口滩涂', text: '时间就是金钱，效率就是生命' },
    1985: { tag: '深圳速度', title: '国贸大厦', text: '三天一层楼 · 罗湖开始生长' },
    1990: { tag: '建设年代', title: '塔吊与脚手架', text: '整座城市是一座工地' },
    1996: { tag: '383.95 米', title: '地王大厦', text: '亚洲第一高 · 深圳第一次触摸天空' },
    2004: { tag: '福田 CBD', title: '市民中心', text: '大屋顶落下 · 城市重心西移' },
    2011: { tag: '441.8 米', title: '京基 100', text: '天际线第二次跃升' },
    2016: { tag: '599 米', title: '平安金融中心', text: '深圳之巅 · 云层之上的城市' },
    2026: { tag: 'APEC', title: '湾区迎宾', text: '建设亚太共同体，促进共同繁荣' }
  };

  let hudCache = { year: -1, era: '', chapter: -1, finale: false, legend: false, apec: false, clock: '' };
  function fmtTime(s) { const m = Math.floor(s / 60), ss = Math.floor(s % 60); return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss; }

  function updateHUD(year, elapsed) {
    const yInt = Math.floor(year + 0.0001);
    if (yInt !== hudCache.year) {
      UI.year.textContent = String(yInt);
      UI.yearMeta.textContent = '经济特区 第 ' + (yInt - 1980 + 1) + ' 年';
      hudCache.year = yInt;
    }
    const era = eraFor(year);
    if (era !== hudCache.era) { UI.era.textContent = era; hudCache.era = era; }
    const clock = fmtTime(elapsed) + ' / ' + fmtTime(TOTAL);
    if (clock !== hudCache.clock) { UI.clock.textContent = clock; hudCache.clock = clock; }

    const pct = clamp((year - START) / SPAN, 0, 1) * 100;
    UI.fill.style.width = pct.toFixed(2) + '%';
    UI.knob.style.left = pct.toFixed(2) + '%';

    const seg = segmentAt(elapsed);
    let chapterKey = null;
    if (seg.type === 'hold' && CHAPTERS[Math.round(seg.y)]) chapterKey = Math.round(seg.y);
    if (year > 2024.55) chapterKey = null;
    if (chapterKey !== hudCache.chapter) {
      hudCache.chapter = chapterKey;
      if (chapterKey) {
        const c = CHAPTERS[chapterKey];
        UI.chapterYear.textContent = chapterKey;
        UI.chapterTag.textContent = c.tag;
        UI.chapterTitle.textContent = c.title;
        UI.chapterText.textContent = c.text;
        UI.chapter.classList.add('show');
      } else UI.chapter.classList.remove('show');
    }
    const fin = year > 2024.55;
    if (fin !== hudCache.finale) { hudCache.finale = fin; UI.finale.classList.toggle('show', fin); }
    const legendOn = year > 2024.55;
    if (legendOn !== hudCache.legend) { hudCache.legend = legendOn; UI.legend.classList.toggle('show', legendOn); }
    const apecOn = year > 2024.55;
    if (apecOn !== hudCache.apec) { hudCache.apec = apecOn; UI.apecBadge.classList.toggle('live', apecOn); }
  }

  function buildTimelineTicks() {
    for (let y = 1980; y <= 2026; y += 5) {
      const d = document.createElement('div');
      d.className = 'tick' + (y % 10 === 0 ? ' major' : '');
      d.style.left = ((y - 1980) / 46 * 100) + '%';
      UI.track.appendChild(d);
    }
    document.querySelectorAll('.track-labels span').forEach(el => {
      el.style.left = ((parseInt(el.textContent, 10) - 1980) / 46 * 100) + '%';
    });
  }
  buildTimelineTicks();

  /* ------------------------------------------------------------------ */
  /* state                                                              */
  /* ------------------------------------------------------------------ */
  const defaultYear = STATIC_YEAR === null ? END : STATIC_YEAR;
  const state = {
    year: defaultYear,
    elapsed: STATIC_YEAR === null ? TOTAL : timeForYear(STATIC_YEAR),
    playing: AUTOPLAY || (STATIC_YEAR === null ? false : false),
    scrubbing: false,
    ready: false
  };
  if (AUTOPLAY) { state.year = START; state.elapsed = 0; }

  function setYear(y, opts) {
    y = clamp(y, START, END);
    state.year = y;
    state.elapsed = timeForYear(y);
    if (opts && opts.pause) state.playing = false;
    if (opts && opts.play) state.playing = true;
    hudCache.year = -1; hudCache.chapter = -2;
    updateHUD(y, state.elapsed);
  }

  /* ------------------------------------------------------------------ */
  /* world update                                                       */
  /* ------------------------------------------------------------------ */
  let lastShadowYear = -999;
  function updateWorld(year, time) {
    updateCity(year);

    // 1980 props
    billboard.visible = year < 1992;
    apecDay.visible = year >= 2024.8;
    boats.forEach(b => { b.visible = year < 1996; });
    village.visible = year < 1999;
    if (village.visible) {
      const v = smoothstep(1990, 1998, year);
      village.position.y = -v * 0.6;
      village.scale.set(1, Math.max(0.15, 1 - v * 0.7), 1);
    }
    cranes.forEach((c, i) => {
      const live = year > 1987 + i * 1.4 && year < 2002 + i;
      c.visible = live;
      if (live) {
        c.rotation.y = c.userData.phase + time * c.userData.spin;
        const s = smoothstep(1987 + i * 1.4, 1989 + i * 1.4, year);
        c.scale.y = 0.15 + s * 0.85;
      }
    });

    // landmarks grow from the tabletop; scaling all axes avoids a flat "pad" before they exist
    const pS = Math.max(0.0001, smoothstep(2014.2, 2016.4, year));
    const dS = Math.max(0.0001, smoothstep(1994.3, 1996.4, year));
    pingan.scale.set(pS, pS * 0.92, pS);
    diwang.scale.set(dS, dS * 0.92, dS);

    // three everyday scenes pop up as the city matures
    const sb = smoothstep(2011.0, 2013.0, year);
    const sg = smoothstep(2011.2, 2013.4, year);
    const sm = smoothstep(2011.8, 2013.8, year);
    breakfast.scale.setScalar(Math.max(0.0001, sb));
    greenway.scale.setScalar(Math.max(0.0001, sg));
    market.scale.setScalar(Math.max(0.0001, sm));

    bridge.visible = year > 2020.5;
    const bs = Math.max(0.001, smoothstep(2020.5, 2022.0, year));
    bridge.scale.set(0.58, 0.58 * bs, 0.58);

    // steam
    breakfast.userData.steam.forEach((sp, i) => {
      const t = time * 0.55 + sp.userData.phase;
      sp.position.y = sp.userData.baseY + Math.sin(t) * 0.18 + ((time * 0.18 + i * 0.2) % 1) * 0.5;
      sp.material.opacity = sp.userData.baseOp * (0.65 + 0.35 * Math.sin(t * 1.7 + i));
      sp.scale.setScalar(0.55 + i * 0.16 + Math.sin(t * 0.8) * 0.06);
    });

    // water drift
    waterMat.uniforms.uTime.value = time;

    if (Math.abs(year - lastShadowYear) > 0.06) {
      lastShadowYear = year;
      renderer.shadowMap.needsUpdate = true;
    }
    compositeMat.uniforms.uTime.value = time;
    updateCamera(year, time);
  }

  /* ------------------------------------------------------------------ */
  /* audio (optional, procedural)                                       */
  /* ------------------------------------------------------------------ */
  const AudioFX = (function () {
    let ctx = null, master = null, waves = null, pad = null, enabled = false;
    let lastClank = 0, chimed = false;
    function init() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 2.2);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.0; }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      const g = ctx.createGain(); g.gain.value = 0.42;
      src.connect(lp); lp.connect(g); g.connect(master); src.start();
      waves = { g, lp };
      const padGain = ctx.createGain(); padGain.gain.value = 0;
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 55;
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 82.4;
      const o3 = ctx.createOscillator(); o3.type = 'sine'; o3.frequency.value = 110;
      const plp = ctx.createBiquadFilter(); plp.type = 'lowpass'; plp.frequency.value = 250;
      const pg = ctx.createGain(); pg.gain.value = 0.12;
      o1.connect(plp); o2.connect(plp); o3.connect(plp); plp.connect(pg); pg.connect(padGain); padGain.connect(master);
      o1.start(); o2.start(); o3.start();
      pad = { gain: padGain, lp: plp };
      return true;
    }
    function clank() {
      if (!ctx) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = 320 + Math.random() * 700;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.34);
    }
    function chime() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), st = t + i * 0.14;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.055, st + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, st + 2.4);
        o.connect(g); g.connect(master); o.start(st); o.stop(st + 2.6);
      });
    }
    function update(year, dt) {
      if (!ctx || !enabled) return;
      const t = ctx.currentTime;
      waves.g.gain.setTargetAtTime(lerp(0.42, 0.08, smoothstep(1992, 2006, year)), t, 0.4);
      waves.lp.frequency.setTargetAtTime(lerp(420, 210, smoothstep(1992, 2006, year)), t, 0.5);
      pad.gain.gain.setTargetAtTime(lerp(0.01, 0.14, smoothstep(1995, 2018, year)), t, 0.8);
      pad.lp.frequency.setTargetAtTime(lerp(230, 560, smoothstep(2000, 2026, year)), t, 0.8);
      if (year > 1986 && year < 2004 && t - lastClank > 1.8 && Math.random() < dt * 0.7) { lastClank = t + Math.random() * 3; clank(); }
      if (year > 2024.6 && !chimed) { chimed = true; chime(); }
      if (year < 2024.4) chimed = false;
    }
    return {
      toggle() {
        if (!ctx && !init()) return false;
        enabled = !enabled;
        if (ctx.state === 'suspended') ctx.resume();
        master.gain.setTargetAtTime(enabled ? 0.18 : 0, ctx.currentTime, 0.6);
        return enabled;
      },
      update
    };
  })();

  /* ------------------------------------------------------------------ */
  /* interaction                                                        */
  /* ------------------------------------------------------------------ */
  (function interaction() {
    let dragging = false, lastX = 0, lastY = 0;
    const activeOrbit = () => mode === 'night' ? nightOrbit : userOrbit;
    canvas.addEventListener('pointerdown', e => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging');
    });
    canvas.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      const orb = activeOrbit();
      orb.yawT -= dx * 0.0032;
      orb.pitchT = clamp(orb.pitchT + dy * 0.0022, -0.35, 0.55);
    });
    canvas.addEventListener('pointerup', e => {
      dragging = false; canvas.classList.remove('dragging');
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const orb = activeOrbit();
      orb.zoomT = clamp(orb.zoomT * Math.exp(e.deltaY * 0.0008), 0.58, 1.75);
    }, { passive: false });
    canvas.addEventListener('dblclick', () => {
      const orb = activeOrbit();
      orb.yawT = 0; orb.pitchT = 0; orb.zoomT = 1;
    });

    UI.btnPlay.addEventListener('click', () => togglePlay());
    UI.btnReplay.addEventListener('click', () => replay());
    UI.btnSound.addEventListener('click', () => {
      const on = AudioFX.toggle();
      UI.btnSound.classList.toggle('on', on);
      UI.soundLabel.textContent = on ? '静音' : '声音';
    });
    UI.btnMode.addEventListener('click', () => setMode(mode === 'night' ? 'day' : 'night'));
    window.addEventListener('keydown', e => {
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setMode(mode === 'night' ? 'day' : 'night'); return; }
      if (mode === 'night' && e.code === 'Escape') { setMode('day'); return; }
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); stepYear(1); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); stepYear(-1); }
      else if (e.key === 'r' || e.key === 'R') replay();
    });
    function scrubTo(e) {
      const r = UI.track.getBoundingClientRect();
      const u = clamp((e.clientX - r.left) / r.width, 0, 1);
      setYear(START + u * SPAN, { pause: true });
    }
    UI.track.addEventListener('pointerdown', e => {
      state.scrubbing = true; UI.track.setPointerCapture(e.pointerId); scrubTo(e);
    });
    UI.track.addEventListener('pointermove', e => { if (state.scrubbing) scrubTo(e); });
    UI.track.addEventListener('pointerup', e => {
      state.scrubbing = false;
      if (UI.track.hasPointerCapture(e.pointerId)) UI.track.releasePointerCapture(e.pointerId);
    });
  })();

  function setPlayUI(playing) {
    UI.playIcon.textContent = playing ? '❚❚' : '▶';
    UI.playLabel.textContent = playing ? '暂停' : '播放';
  }
  function togglePlay() {
    if (state.elapsed >= TOTAL - 0.01) { replay(); return; }
    state.playing = !state.playing;
    setPlayUI(state.playing);
  }
  function replay() {
    state.elapsed = 0; state.playing = true; state.year = START;
    hudCache.year = -1; hudCache.chapter = -2;
    setPlayUI(true);
  }
  function stepYear(d) {
    setYear(Math.round(state.year) + d, { pause: true });
    setPlayUI(false);
  }
  setPlayUI(state.playing);

  function setMode(next) {
    next = next === 'night' ? 'night' : 'day';
    if (next === mode) return;
    if (next === 'night') {
      mode = 'night';
      resetNight();
      document.body.classList.add('night');
      renderer.setClearColor(0x04060e, 1);
      UI.modeIcon.textContent = '☀';
      UI.modeLabel.textContent = '白天';
      UI.btnMode.setAttribute('aria-label', '切换到白天手作模型');
      UI.btnMode.classList.add('on');
      UI.brandSub.textContent = '霓虹夜景 · APEC 2026 · 时间轴';
      setPlayUI(state.playing);
      updateHUD(state.year, state.elapsed);
      updateNight(0, 0.016, state.year);
      renderNight();
    } else {
      mode = 'day';
      document.body.classList.remove('night');
      renderer.setClearColor(0xd8d2c5, 1);
      UI.modeIcon.textContent = '☾';
      UI.modeLabel.textContent = '夜景';
      UI.btnMode.setAttribute('aria-label', '切换到霓虹夜景');
      UI.btnMode.classList.remove('on');
      UI.brandSub.textContent = '纸、树脂与木 · 1:87 手作模型';
      setPlayUI(state.playing);
      updateWorld(state.year, clockTime);
      updateHUD(state.year, state.elapsed);
      renderPipeline();
    }
  }

  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    nightCamera.aspect = w / h;
    nightCamera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    sizeTargets(w, h);
    nightPointMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    renderer.shadowMap.needsUpdate = true;
  });
  sizeTargets(window.innerWidth, window.innerHeight);

  /* ------------------------------------------------------------------ */
  /* loop                                                               */
  /* ------------------------------------------------------------------ */
  let last = performance.now();
  let clockTime = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clockTime += dt;

    if (mode === 'night') {
      if (state.playing) {
        state.elapsed += dt;
        if (state.elapsed >= TOTAL) { state.elapsed = TOTAL; state.playing = false; setPlayUI(false); }
      }
      const year = yearAt(state.elapsed);
      state.year = year;
      nightTime += dt;
      updateNight(nightTime, dt, year);
      updateHUD(year, state.elapsed);
      AudioFX.update(year, dt);
      renderNight();
    } else {
      if (state.playing) {
        state.elapsed += dt;
        if (state.elapsed >= TOTAL) { state.elapsed = TOTAL; state.playing = false; setPlayUI(false); }
      }
      const year = yearAt(state.elapsed);
      state.year = year;
      updateWorld(year, clockTime);
      updateHUD(year, state.elapsed);
      AudioFX.update(year, dt);
      renderPipeline();
    }

    if (!state.ready) {
      state.ready = true;
      setTimeout(() => UI.loader.classList.add('hide'), 140);
    }
    requestAnimationFrame(frame);
  }

  updateWorld(defaultYear, 0);
  updateHUD(defaultYear, state.elapsed);
  requestAnimationFrame(frame);

  /* ------------------------------------------------------------------ */
  /* debug / automation API                                             */
  /* ------------------------------------------------------------------ */
  window.__sz = {
    get year() { return state.year; },
    get ready() { return state.ready; },
    get total() { return TOTAL; },
    get playing() { return state.playing; },
    get mode() { return mode; },
    setMode(next) { setMode(next); },
    setYear(y) {
      setYear(y, { pause: true }); setPlayUI(false); updateHUD(y, state.elapsed);
      if (mode === 'night') { updateNight(nightTime, 0.016, y); renderNight(); }
      else { updateWorld(y, clockTime); renderPipeline(); }
    },
    play() { state.playing = true; setPlayUI(true); },
    pause() { state.playing = false; setPlayUI(false); },
    replay,
    info() {
      return {
        year: state.year,
        elapsed: state.elapsed,
        total: TOTAL,
        mode: mode,
        buildings: city.length,
        figures: 20,
        drawCalls: mode === 'night' ? nightCalls : sceneCalls,
        triangles: mode === 'night' ? nightTris : sceneTris,
        halfFloat: canHalf,
        colorManagement: THREE.ColorManagement.enabled
      };
    },
    debug: {
      scene, camera, state, compositeMat, pingan, diwang, breakfast, market, greenway,
      nightScene, nightCamera, nightCompositeMat, nightOrbit,
      cameraPos: () => camera.position.toArray().map(v => +v.toFixed(2)),
      nightCameraPos: () => nightCamera.position.toArray().map(v => +v.toFixed(2)),
      setNightPost(o) {
        if (o.exposure !== undefined) nightCompositeMat.uniforms.uExposure.value = o.exposure;
        if (o.strength !== undefined) nightCompositeMat.uniforms.uStrength.value = o.strength;
      },
      nightAt(t) {
        nightTime = t;
        updateNight(t, 0.016, state.year);
        renderNight();
        return nightTime;
      },
      setPost(o) {
        if (o.exposure !== undefined) compositeMat.uniforms.uExposure.value = o.exposure;
        if (o.blur !== undefined) compositeMat.uniforms.uBlur.value = o.blur;
        if (o.saturation !== undefined) compositeMat.uniforms.uSaturation.value = o.saturation;
      },
      look(x, y, z, tx, ty, tz) {
        camOverride = { p: new THREE.Vector3(x, y, z), t: new THREE.Vector3(tx, ty, tz) };
        updateCamera(state.year, clockTime);
        renderPipeline();
        return camera.position.toArray().map(v => +v.toFixed(2));
      },
      resetLook() { camOverride = null; updateCamera(state.year, clockTime); renderPipeline(); },
      pick(nx, ny) {
        const rc = new THREE.Raycaster();
        rc.setFromCamera(new THREE.Vector2(nx, ny), camera);
        return rc.intersectObjects(scene.children, true).slice(0, 6).map(h => ({
          type: h.object.type, name: h.object.name || '(unnamed)', dist: +h.distance.toFixed(1),
          point: h.point.toArray().map(v => +v.toFixed(1))
        }));
      }
    }
  };
})();
