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

  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.3, 420);
  camera.position.set(6, 32, 66);

  /* ------------------------------------------------------------------ */
  /* studio light                                                       */
  /* ------------------------------------------------------------------ */
  const key = new THREE.DirectionalLight(0xfff0d9, 2.55);
  key.position.set(-46, 70, 54);
  key.target.position.set(0, 3, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.035;
  key.shadow.radius = 2.6;
  const sc = key.shadow.camera;
  sc.left = -72; sc.right = 72; sc.top = 72; sc.bottom = -72; sc.near = 2; sc.far = 210;
  sc.updateProjectionMatrix();
  scene.add(key);
  scene.add(key.target);

  const hemi = new THREE.HemisphereLight(0xe7edee, 0xb7a992, 0.78);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0xf0eadf, 0.20);
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

  const texTerrain = paperTexture('#d6cdba', '122,106,84', [5, 5]);
  const texTable = paperTexture('#c9c1b1', '110,96,78', [9, 9]);

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
    const rr = mulberry32(0x7130);
    x.fillStyle = '#77828b'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 28; i++) {
      x.fillStyle = `rgba(${rr() < 0.5 ? '210,220,226' : '48,58,66'},${0.05 + rr() * 0.08})`;
      x.fillRect(i * 9, 0, 6, h);
    }
    for (let y = 0; y < h; y += 14) {
      x.fillStyle = 'rgba(46,55,62,.30)'; x.fillRect(0, y, w, 1.4);
      x.fillStyle = 'rgba(226,232,234,.12)'; x.fillRect(0, y + 1.4, w, 0.8);
    }
    for (let i = 0; i < 120; i++) {
      x.fillStyle = `rgba(30,38,45,${rr() * 0.07})`;
      x.fillRect(Math.floor(rr() * 28) * 9, Math.floor(rr() * 36) * 14, 9, 14);
    }
    for (let i = 0; i < 9; i++) { x.fillStyle = 'rgba(20,26,32,.28)'; x.fillRect(i * 28, 0, 2, h); }
  }, [1, 1]);

  const texRibs = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#8d8a82'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 32; i++) {
      x.fillStyle = i % 2 ? 'rgba(255,250,238,.14)' : 'rgba(54,50,44,.16)';
      x.fillRect(i * 8, 0, 3, h);
    }
    for (let y = 0; y < h; y += 18) { x.fillStyle = 'rgba(54,50,44,.14)'; x.fillRect(0, y, w, 1.2); }
  }, [1, 1]);

  const texWaterNormal = (() => {
    const s = 256, c = document.createElement('canvas');
    c.width = c.height = s;
    const x = c.getContext('2d');
    const img = x.createImageData(s, s);
    const hgt = (i, j) => Math.sin(i * 0.16 + Math.sin(j * 0.05) * 2) * 0.7 + Math.sin(j * 0.21 + i * 0.03) * 0.5 + Math.sin((i + j) * 0.07) * 0.6;
    for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) {
      const dx = hgt(i + 1, j) - hgt(i - 1, j);
      const dy = hgt(i, j + 1) - hgt(i, j - 1);
      const k = (j * s + i) * 4;
      img.data[k] = clamp(128 + dx * 38, 0, 255);
      img.data[k + 1] = clamp(128 + dy * 38, 0, 255);
      img.data[k + 2] = 255;
      img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(7, 2);
    return t;
  })();

  const texBackdrop = canvasTex(512, 512, (x, w, h) => {
    const g = x.createRadialGradient(w * 0.34, h * 0.24, 20, w * 0.5, h * 0.55, w * 0.95);
    g.addColorStop(0, '#eee9de');
    g.addColorStop(0.5, '#ddd6c8');
    g.addColorStop(1, '#c4bcac');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const rr = mulberry32(0x3c3c);
    x.fillStyle = 'rgba(120,104,84,.05)';
    for (let i = 0; i < 1800; i++) x.fillRect(rr() * w, rr() * h, 1, 1);
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
    paper: new THREE.MeshStandardMaterial({ map: texTerrain, color: 0xffffff, roughness: 1, metalness: 0 }),
    table: new THREE.MeshStandardMaterial({ map: texTable, color: 0xffffff, roughness: 1, metalness: 0 }),
    wood: new THREE.MeshStandardMaterial({ map: texWood, color: 0xffffff, roughness: 0.82, metalness: 0 }),
    grass: new THREE.MeshStandardMaterial({ map: texGrass, color: 0xffffff, roughness: 1, metalness: 0 }),
    city: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, metalness: 0 }),
    curtain: new THREE.MeshStandardMaterial({ map: texCurtain, color: 0xffffff, roughness: 0.76, metalness: 0.05 }),
    ribs: new THREE.MeshStandardMaterial({ map: texRibs, color: 0xffffff, roughness: 0.8, metalness: 0.03 }),
    vertex: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.90, metalness: 0.02 }),
    vertexFine: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.04 }),
    water: new THREE.MeshPhysicalMaterial({
      color: 0x7b9294, roughness: 0.20, metalness: 0.0, transparent: true, opacity: 0.84,
      clearcoat: 1.0, clearcoatRoughness: 0.22, normalMap: texWaterNormal,
      normalScale: new THREE.Vector2(0.22, 0.22), depthWrite: false
    }),
    seabed: new THREE.MeshStandardMaterial({ color: 0x5d6f6d, roughness: 0.95 }),
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
    const land = new THREE.Mesh(new THREE.PlaneGeometry(112, 64.6), MAT.paper);
    land.rotation.x = -PI / 2;
    land.position.set(0, 0.02, -6.7);
    land.receiveShadow = true;
    scene.add(land);

    // coast cut edge
    const edge = new THREE.Mesh(new THREE.BoxGeometry(112, 0.42, 0.55), new THREE.MeshStandardMaterial({ color: 0xb6a88f, roughness: 1 }));
    edge.position.set(0, 0.21, 25.7);
    edge.castShadow = true; edge.receiveShadow = true;
    scene.add(edge);
    const edge2 = new THREE.Mesh(new THREE.BoxGeometry(112, 0.13, 0.6), new THREE.MeshStandardMaterial({ color: 0x8f8168, roughness: 1 }));
    edge2.position.set(0, 0.06, 25.72);
    scene.add(edge2);
  }

  // bay: opaque seabed + thin acrylic water
  {
    const seabed = new THREE.Mesh(new THREE.PlaneGeometry(112, 15.8), MAT.seabed);
    seabed.rotation.x = -PI / 2;
    seabed.position.set(0, 0.035, 33.8);
    scene.add(seabed);

    const water = new THREE.Mesh(new THREE.BoxGeometry(112, 0.30, 15.6), MAT.water);
    water.position.set(0, 0.21, 33.8);
    water.renderOrder = 3;
    water.receiveShadow = false;
    scene.add(water);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(112, 0.34, 0.34), MAT.acrylic);
    rim.position.set(0, 0.22, 25.98);
    rim.renderOrder = 4;
    scene.add(rim);
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
  ridge(-38, '#8b907c', 7.5, 10, 2.1);
  ridge(-41.5, '#9aa08d', 10.5, 13, 5.7);
  ridge(-45, '#a9ad9d', 13.0, 15, 8.3);

  // Nanshan paper hill, west
  {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(15, 20, 12), new THREE.MeshStandardMaterial({ color: '#7d856c', roughness: 1 }));
    hill.scale.set(1, 0.32, 0.72);
    hill.position.set(-47, 0.1, -21);
    hill.castShadow = true; hill.receiveShadow = true;
    scene.add(hill);
    const hill2 = new THREE.Mesh(new THREE.SphereGeometry(9, 18, 10), new THREE.MeshStandardMaterial({ color: '#87906f', roughness: 1 }));
    hill2.scale.set(1, 0.30, 0.8);
    hill2.position.set(-53, 0.1, -13);
    hill2.castShadow = true; hill2.receiveShadow = true;
    scene.add(hill2);
  }

  /* ------------------------------------------------------------------ */
  /* roads, parks, paddies                                              */
  /* ------------------------------------------------------------------ */
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x736d61, roughness: 1 });
  const walkMat = new THREE.MeshStandardMaterial({ color: 0xc1b6a1, roughness: 1 });
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
  groundPlane(38, 2.2, -6, 15.4, 0.07, parkMat);
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
  const CITY_TINTS = ['#a8a095', '#9c968b', '#b3a998', '#918f88', '#a89d8b', '#bbb3a3', '#8e8d86', '#a79c8a', '#b0a493'];
  const ROOF_TINTS = ['#847d70', '#8d877a', '#79766d', '#948b7a'];
  const city = [];
  const reserved = [
    { x0: -8.2, x1: 8.2, z0: -12.5, z1: 4.5 },     // Ping An
    { x0: 10.5, x1: 21.5, z0: -21.5, z1: -5.5 },   // Diwang
    { x0: -24.5, x1: -8.0, z0: -4.5, z1: 12.0 },   // breakfast alley
    { x0: 8.0, x1: 24.5, z0: -4.5, z1: 13.0 },     // market alley
    { x0: -30, x1: 20, z0: 17, z1: 28 },           // greenway
    { x0: -58, x1: -30, z0: 22, z1: 41 },          // west bay margin
    { x0: -30, x1: 20, z0: 12.8, z1: 17 }          // avenue
  ];
  function isFree(x, z, r) {
    for (const q of reserved) if (x + r > q.x0 && x - r < q.x1 && z + r > q.z0 && z - r < q.z1) return false;
    return true;
  }
  function addBuilding(x, z, w, d, h, year, color, rot) {
    city.push({ x, z, w, d, h, year, color: new THREE.Color(color), rot: rot === undefined ? rand(-0.035, 0.035) : rot, roof: rnd() < 0.55, roofColor: new THREE.Color(pick(ROOF_TINTS)) });
  }

  const DISTRICTS = [
    { x0: -16, x1: 10, z0: -31, z1: -8.5, step: 4.7, y0: 1988, y1: 2014, h0: 3.2, h1: 13.5 },
    { x0: 19, x1: 38, z0: -31, z1: -7.5, step: 4.4, y0: 1985, y1: 2004, h0: 2.6, h1: 10.5 },
    { x0: -52, x1: -25, z0: -29, z1: 19, step: 5.4, y0: 1981, y1: 2002, h0: 1.6, h1: 6.8 },
    { x0: -22, x1: 8, z0: -39, z1: -31, step: 5.0, y0: 2000, y1: 2024, h0: 1.8, h1: 5.5 },
    { x0: 20, x1: 45, z0: -39, z1: -30, step: 5.0, y0: 2004, y1: 2024, h0: 1.8, h1: 5.5 }
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
    [-13.5, -17.5, 5.2, 5.2, 18.5, 2011],
    [-4.0, -27.0, 5.8, 5.0, 16.5, 2014],
    [22.5, -14.0, 5.0, 5.0, 14.5, 2007],
    [29.0, -24.0, 5.2, 5.0, 12.5, 2012],
    [35.0, -13.0, 4.8, 4.8, 11.0, 2009],
    [-21.0, -7.0, 5.4, 5.0, 8.5, 1998]
  ].forEach(([x, z, w, d, h, y]) => addBuilding(x, z, w, d, h, y, pick(CITY_TINTS), rand(-0.03, 0.03)));

  const towerGeo = new THREE.BoxGeometry(1, 1, 1); towerGeo.translate(0, 0.5, 0);
  const capGeo = new THREE.BoxGeometry(1, 0.16, 1); capGeo.translate(0, 0.08, 0);
  const roofGeo = new THREE.BoxGeometry(1, 0.52, 1); roofGeo.translate(0, 0.26, 0);

  const towerMesh = new THREE.InstancedMesh(towerGeo, MAT.city, city.length);
  const capMesh = new THREE.InstancedMesh(capGeo, MAT.city, city.length);
  const roofMesh = new THREE.InstancedMesh(roofGeo, MAT.city, city.length);
  [towerMesh, capMesh, roofMesh].forEach(m => {
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    scene.add(m);
  });
  city.forEach((b, i) => {
    towerMesh.setColorAt(i, b.color);
    capMesh.setColorAt(i, b.color.clone().multiplyScalar(0.9));
    roofMesh.setColorAt(i, b.roofColor);
  });
  towerMesh.instanceColor.needsUpdate = true;
  capMesh.instanceColor.needsUpdate = true;
  roofMesh.instanceColor.needsUpdate = true;

  function updateCity(year) {
    city.forEach((b, i) => {
      const g = smoothstep(b.year, b.year + 1.5, year);
      const s = Math.max(0.0001, g);
      const y = PAD;
      _m.compose(new THREE.Vector3(b.x, y, b.z), _q.setFromAxisAngle(YAXIS, b.rot), new THREE.Vector3(b.w, b.h * s, b.d));
      towerMesh.setMatrixAt(i, _m);
      _m.compose(new THREE.Vector3(b.x, y + b.h * s + 0.01, b.z), _q.setFromAxisAngle(YAXIS, b.rot), new THREE.Vector3(b.w * 1.03, 1, b.d * 1.03));
      capMesh.setMatrixAt(i, _m);
      if (b.roof) {
        _m.compose(new THREE.Vector3(b.x, y + b.h * s + 0.17, b.z), _q.setFromAxisAngle(YAXIS, b.rot), new THREE.Vector3(b.w * 0.26, 1, b.d * 0.26));
        roofMesh.setMatrixAt(i, _m);
      } else {
        _m.makeScale(0.0001, 0.0001, 0.0001);
        roofMesh.setMatrixAt(i, _m);
      }
    });
    towerMesh.instanceMatrix.needsUpdate = true;
    capMesh.instanceMatrix.needsUpdate = true;
    roofMesh.instanceMatrix.needsUpdate = true;
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
      if (rr() > 0.25) treeSpots.push({ x: x + (rr() - 0.5) * 1.2, z: rr() < 0.55 ? 15.6 : 10.1, s: 0.8 + rr() * 0.7 });
    }
    for (let z = -30; z <= 6; z += 4.2) {
      treeSpots.push({ x: -11.2 + (rr() - 0.5) * 0.8, z, s: 0.7 + rr() * 0.6 });
      treeSpots.push({ x: 10.7 + (rr() - 0.5) * 0.8, z, s: 0.7 + rr() * 0.6 });
    }
    // park + west hill + CBD plaza
    for (let i = 0; i < 26; i++) treeSpots.push({ x: -46 + rr() * 18, z: -26 + rr() * 20, s: 0.9 + rr() * 0.9 });
    for (let i = 0; i < 12; i++) treeSpots.push({ x: -26 + rr() * 12, z: 14 + rr() * 2.2, s: 0.7 + rr() * 0.5 });
    for (let i = 0; i < 10; i++) treeSpots.push({ x: -7 + rr() * 14, z: -10 + rr() * 8, s: 0.8 + rr() * 0.5 });
  }
  {
    const trunkGeo = new THREE.CylinderGeometry(0.055, 0.085, 1.5, 6); trunkGeo.translate(0, 0.75, 0);
    const canopyGeo = new THREE.IcosahedronGeometry(0.92, 1); canopyGeo.scale(1, 0.78, 1); canopyGeo.translate(0, 1.85, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b5540, roughness: 1 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeSpots.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, treeSpots.length);
    const cGreen = ['#697553', '#75805c', '#5d6a4e', '#7f8964'];
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
      const s = lerp(4.7, 3.72, t);
      bodyRings.push({ y: 2.2 + t * 22.3, pts: octagon(s, s * 0.24) });
    }
    const body = loft(bodyRings, MAT.curtain);
    pingan.add(body);

    const crownRings = [];
    for (let i = 0; i <= 3; i++) {
      const t = i / 3;
      const s = lerp(3.72, 2.6, t);
      crownRings.push({ y: 24.5 + t * 3.1, pts: octagon(s, s * 0.18) });
    }
    const crown = loft(crownRings, new THREE.MeshStandardMaterial({ color: 0x8d99a1, roughness: 0.7, metalness: 0.08 }));
    pingan.add(crown);
    pingan.add(planarCap(octagon(2.6, 0.47), 27.62, 0x8d99a1));

    const B = new GeoBuilder();
    // podium
    B.box('#b0a691', 0, 1.05, 1.2, 15.5, 2.1, 12.5);
    B.box('#bdb3a0', 0, 2.18, 1.2, 16.2, 0.22, 13.2);
    for (let i = 0; i < 4; i++) B.box('#c8bda8', 0, 0.08 + i * 0.12, 8.1 + i * 0.55, 7.2 - i * 0.4, 0.12, 0.55);
    // entrance glass + canopy
    B.box('#53616a', 0, 1.0, 7.85, 5.4, 1.8, 0.16);
    B.box('#a9a08d', 0, 2.1, 8.35, 6.6, 0.16, 1.1);
    // banding
    for (const by of [8.2, 14.4, 20.4]) {
      const r0 = [], r1 = [];
      const t0 = (by - 2.2) / 22.3, t1 = (by + 0.18 - 2.2) / 22.3;
      for (const [t, arr] of [[t0, r0], [t1, r1]]) {
        const s = lerp(4.7, 3.72, t) + 0.09;
        arr.push({ y: by, pts: octagon(s, s * 0.24) });
      }
      const band = loft([r0[0], { y: r0[0].y + 0.18, pts: r1[0].pts }], new THREE.MeshStandardMaterial({ color: 0xaeb8be, roughness: 0.62, metalness: 0.12 }));
      pingan.add(band);
    }
    // vertical fins at the eight corners
    const fins = new THREE.Group();
    const finPts = octagon(1, 0.24);
    for (const fp of finPts) {
      const a = new THREE.Vector3(fp[0] * 4.70, 2.2, fp[1] * 4.70);
      const b = new THREE.Vector3(fp[0] * 3.73, 24.5, fp[1] * 3.73);
      const g = new THREE.CylinderGeometry(0.075, 0.085, a.distanceTo(b), 5);
      g.translate(0, a.distanceTo(b) / 2, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(YAXIS, b.clone().sub(a).normalize());
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xb5bec4, roughness: 0.55, metalness: 0.16 }));
      m.position.copy(a); m.quaternion.copy(q);
      m.castShadow = true;
      fins.add(m);
    }
    pingan.add(fins);
    // spire + beacon
    B.cyl('#b8c1c7', 0, 27.5, 0, 0.06, 0.20, 3.0, 0, 6);
    B.sphere('#d8d4c6', 0, 30.55, 0, 0.14, 1, 1, 1, 8);
    // roof details
    B.box('#9aa5ab', 0, 24.7, 0, 1.3, 0.3, 1.3);
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
    B.box('#8e8b81', 0, 18.35, 0, 5.2, 0.7, 5.2);
    B.cyl('#a7a49a', 0.6, 18.75, 0, 0.04, 0.12, 3.7, 0, 5);
    B.cyl('#a7a49a', -0.6, 18.75, 0, 0.04, 0.12, 3.0, 0, 5);
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
    const m = B.build(MAT.vertex);
    village.add(m);
    village.visible = true;
    scene.add(village);
  }

  const boats = [];
  for (let i = 0; i < 3; i++) {
    const B = new GeoBuilder();
    B.box('#5f4a37', 0, 0.35, 0, 3.4, 0.6, 1.2);
    B.box('#6e5842', 0.6, 1.0, 0, 1.2, 0.8, 0.9);
    B.cyl('#4b3a2c', -0.8, 0.7, 0, 0.04, 0.05, 2.4, 0, 5);
    const g = B.build(MAT.vertex);
    g.position.set(rand(-50, -40), 0.28, rand(29, 36));
    g.rotation.y = rand(0, PI);
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
    billboard.position.set(-39, 0.05, 20.5);
    billboard.rotation.y = 0.28;
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
      b.box('#e9e2d1', m.x, m.y + 0.01, m.z, 0.30, 0.035, 0.48);
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
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 60);
    g.addColorStop(0, 'rgba(255,252,244,.82)');
    g.addColorStop(0.45, 'rgba(255,250,240,.28)');
    g.addColorStop(1, 'rgba(255,250,240,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const steamTexture = steamTextureCanvas();

  /* ------------------------------------------------------------------ */
  /* scene ① breakfast stall                                            */
  /* ------------------------------------------------------------------ */
  const breakfast = new THREE.Group();
  {
    const B = new GeoBuilder();
    // flanking low buildings
    B.box('#b3a792', -3.05, 3.2, 0.2, 2.6, 6.4, 9.0);
    B.box('#a99c86', 3.25, 2.6, 0.1, 3.3, 5.2, 9.4);
    B.box('#9f927d', 0, 2.4, -4.65, 9.0, 4.8, 0.6); // end wall
    // parapets and roof edges
    B.box('#8f8370', -3.05, 6.45, 0.2, 2.75, 0.18, 9.15);
    B.box('#8f8370', 3.25, 5.25, 0.1, 3.45, 0.18, 9.55);
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
    // awning over the stall
    for (let i = 0; i < 9; i++) {
      B.box(i % 2 ? '#b06a4e' : '#d8cdb7', -1.75 + i * 0.42, 2.72 + Math.sin(i * 0.4) * 0.03, 2.1, 0.44, 0.035, 3.4, 0, 0, 0.03);
    }
    for (const az of [0.5, 2.0, 3.6]) B.cyl('#6f5a43', 1.9, 0, az, 0.022, 0.03, 2.72, 0, 5);
    // hanging sign over the cart
    B.box('#5a4736', -1.82, 3.25, 1.0, 0.08, 0.55, 0.06);
    B.box('#5a4736', -1.82, 3.25, 3.0, 0.08, 0.55, 0.06);
    B.box('#5a4736', -1.82, 3.50, 1.0, 0.08, 0.06, 2.06);
    // stall cart
    B.box('#7d6a52', -1.15, 0.55, 1.8, 0.78, 0.85, 2.1);
    B.box('#d7cdb9', -1.15, 1.02, 1.8, 0.88, 0.07, 2.25);
    B.box('#5d5347', -1.15, 0.28, 1.8, 0.72, 0.22, 2.0);
    B.cyl('#8d8069', -1.15, 0.04, 1.1, 0.22, 0.22, 0.08, 0, 10);
    B.cyl('#8d8069', -1.15, 0.04, 2.5, 0.22, 0.22, 0.08, 0, 10);
    // steamer stack
    for (let i = 0; i < 3; i++) B.cyl('#c8ac7d', -1.15, 1.06 + i * 0.17, 1.55, 0.28, 0.28, 0.17, 0, 12);
    B.cyl('#b59a6d', -1.15, 1.57, 1.55, 0.26, 0.28, 0.06, 0, 12);
    B.cyl('#9c8259', -1.15, 1.63, 1.55, 0.05, 0.05, 0.05, 0, 6);
    // soy milk pot and cups
    B.cyl('#b4b1a6', -0.78, 1.06, 2.45, 0.14, 0.16, 0.24, 0, 10);
    for (let i = 0; i < 3; i++) B.cyl('#efe8d7', -0.78 + (i - 1) * 0.12, 1.06, 2.78, 0.045, 0.037, 0.13, 0, 7);
    // folding table + stools
    table(B, 0.55, 2.55, 1.45, 0.72, 0.50, '#a58b64');
    for (const [sx, sz] of [[0.0, 2.05], [1.05, 2.05], [0.0, 3.0], [1.05, 3.0]]) stool(B, sx, sz, '#b45f46', 0.30);
    for (let i = 0; i < 3; i++) B.cyl('#f3eee2', 0.35 + i * 0.18, 0.535, 2.55, 0.06, 0.05, 0.02, 0, 8);
    // QR stand + menu board on the east wall
    B.box('#3a3732', 0.95, 0.58, 1.75, 0.10, 0.16, 0.03, -0.3);
    B.box('#e8e2d3', 0.95, 0.60, 1.735, 0.07, 0.11, 0.006, -0.3);
    B.box('#5f4b37', 1.62, 1.55, 1.55, 0.06, 0.9, 0.64);
    // small crates under the table
    crate(B, -1.55, 0.04, 3.3, 0.5, 0.32, 0.42, '#9c7d54');
    // potted plants at the door
    B.cyl('#8f6c4b', 1.25, 0.10, -0.7, 0.13, 0.10, 0.24, 0, 8);
    B.sphere('#66744f', 1.25, 0.46, -0.7, 0.20, 1, 1.2, 1, 7);
    const mesh = B.build(MAT.vertex);
    breakfast.add(mesh);

    // sign planes
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshStandardMaterial({ map: signBreakfast, roughness: 0.92 }));
    s1.position.set(-1.74, 3.42, 2.0); s1.rotation.y = PI / 2;
    breakfast.add(s1);
    const s2 = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.78), new THREE.MeshStandardMaterial({ map: signMenu, roughness: 0.95 }));
    s2.position.set(1.55, 1.55, 1.55); s2.rotation.y = -PI / 2;
    breakfast.add(s2);

    // glass display case
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.55, 1.9), MAT.glass);
    glass.position.set(-0.94, 1.36, 1.8);
    glass.renderOrder = 5;
    breakfast.add(glass);

    // people
    addFigure(breakfast, { x: -1.55, z: 1.55, rotY: PI / 2, lean: 0.12, shirt: '#d7cdb9', apron: '#6f5b45', pants: '#4b4741', armR: [1.45, 0.18, 0.35], armL: [1.35, -0.15, 0.42], prop: 'tray', bun: true });
    addFigure(breakfast, { x: -0.45, z: 1.55, rotY: -PI / 2, lean: -0.05, shirt: '#7b8794', pants: '#3f4348', armR: [1.38, 0.12, 0.28], armL: [1.30, -0.10, 0.32] });
    addFigure(breakfast, { x: 0.18, z: 2.32, rotY: -PI / 2, lean: 0.06, shirt: '#b08a4f', pants: '#5d574b', armR: [0.95, 0.22, 1.30], armL: [0.20, -0.12, 0.18], prop: 'phone', backpack: '#6f6553' });
    addFigure(breakfast, { x: 1.18, z: 2.95, rotY: PI / 2, lean: 0.02, shirt: '#c2b6a0', pants: '#4c5a63', armR: [0.30, 0.12, 0.25], armL: [0.18, -0.08, 0.20], headX: 1, hat: '#d6c9b1' });
    addFigure(breakfast, { x: 0.95, z: 3.72, rotY: 0.08, lean: 0.04, shirt: '#9f5a45', pants: '#484b47', armR: [0.12, 0.12, 0.20], armL: [0.35, -0.09, 0.15], prop: 'cup' });

    // steam
    breakfast.userData.steam = [];
    for (let i = 0; i < 3; i++) {
      const sm = new THREE.SpriteMaterial({ map: steamTexture, color: 0xf7f3e9, transparent: true, opacity: 0.34, depthWrite: false });
      const sp = new THREE.Sprite(sm);
      sp.position.set(-1.12 + (i - 1) * 0.14, 1.95 + i * 0.3, 1.55);
      sp.scale.set(0.55 + i * 0.18, 0.8 + i * 0.24, 1);
      sp.userData = { baseY: sp.position.y, phase: i * 2.1, baseOp: 0.30 - i * 0.05 };
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
    // promenade
    B.box('#c3b9a6', 0, 0.04, 0.8, 40, 0.08, 2.8);
    B.box('#a79d8a', 0, 0.08, -0.70, 40, 0.15, 0.28);
    B.box('#a79d8a', 0, 0.08, 2.30, 40, 0.15, 0.28);
    for (let i = 0; i < 20; i++) B.box('#b2a894', -19 + i * 2.0, 0.045, 0.8, 0.05, 0.085, 2.5);
    // grass and mud toward the water
    B.box('#74805e', 0, 0.03, 3.45, 40, 0.06, 2.1);
    B.box('#8b7f66', 0, 0.035, 4.45, 40, 0.07, 0.5);

    // railing
    for (let i = 0; i <= 16; i++) {
      const x = -18 + i * 2.2;
      B.cyl('#7f8b84', x, 0.10, 4.25, 0.045, 0.055, 1.02, 0, 6);
    }
    B.box('#87948d', 0, 1.10, 4.25, 36.4, 0.075, 0.09);
    B.box('#9aa69e', 0, 0.66, 4.25, 36.4, 0.035, 0.05);
    // bench
    for (let i = 0; i < 4; i++) B.box('#9a7f5c', 3.0, 0.42, -0.95 + i * 0.16, 1.9, 0.055, 0.14);
    B.box('#73624c', 3.0, 0.22, -0.95, 1.8, 0.10, 0.10);
    for (const sx of [-0.75, 0.75]) B.box('#73624c', 3.0 + sx, 0.22, -0.95, 0.10, 0.44, 0.45);
    // shared bikes + the cyclist's bike
    B.append(bikeBuilder('#c9b05a', true), matAt(-10.2, 0.05, 1.35, 0.05, 1, 1, 1));
    B.append(bikeBuilder('#6e8a94', true), matAt(-9.0, 0.05, 1.42, -0.04, 1, 1, 1));
    B.append(bikeBuilder('#7e8b86', false), matAt(-6.75, 0.05, 0.45, 0.02, 1, 1, 1));
    // bins, small sign post
    B.cyl('#6f7a70', 13.8, 0.06, 0.1, 0.20, 0.18, 0.55, 0, 8);
    B.cyl('#5d685f', 13.8, 0.62, 0.1, 0.22, 0.22, 0.05, 0, 8);
    B.cyl('#73806f', 12.0, 0.06, 1.3, 0.045, 0.05, 2.1, 0, 5);

    // mangroves
    for (let i = 0; i < 7; i++) {
      const mx = -17 + i * 4.8, mz = 4.3 + (i % 2) * 0.8;
      for (let k = 0; k < 4; k++) {
        const a = rnd() * PI * 2, r = rnd() * 0.7;
        B.cyl('#6b5b45', mx + Math.cos(a) * r, 0.02, mz + Math.sin(a) * r, 0.018, 0.028, 0.55 + rnd() * 0.25, 0, 4);
      }
      for (let k = 0; k < 3; k++) B.sphere(k % 2 ? '#5d7049' : '#6d7f53', mx + (rnd() - 0.5) * 1.0, 0.62 + rnd() * 0.2, mz + (rnd() - 0.5) * 0.9, 0.45, 1.2, 0.55, 1, 7);
    }
    // low rocks at the water edge
    for (let i = 0; i < 14; i++) B.sphere('#8a8274', -18 + i * 2.6 + rnd(), 0.08, 4.75 + rnd() * 0.25, rand(0.12, 0.30), 1.4, 0.7, 1.1, 5);

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
    addFigure(greenway, { x: -7.15, z: 0.35, rotY: PI / 2, lean: 0.05, shirt: '#5d7470', pants: '#3e4549', helmet: '#d9d2c2', armR: [1.75, 0.25, 1.30], armL: [1.05, -0.22, 0.30], prop: 'bottle', shorts: true });
    addFigure(greenway, { x: -2.55, z: -0.05, rotY: PI / 2, lean: 0.18, shirt: '#b8ae99', pants: '#3f4145', cap: '#7a6d58', armR: [1.05, 0.20, 0.85], armL: [0.95, -0.18, 0.80], legL: [0.62, 0.05, 0.55], legR: [-0.30, 0.05, 0.95], shorts: true });
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
  greenway.position.set(1, PAD, 21.4);
  scene.add(greenway);

  /* ------------------------------------------------------------------ */
  /* scene ③ urban village market                                       */
  /* ------------------------------------------------------------------ */
  const market = new THREE.Group();
  {
    const B = new GeoBuilder();
    // alley walls
    B.box('#b0a28b', -3.2, 2.9, 0.2, 2.5, 5.8, 9.6);
    B.box('#a49782', 3.3, 3.3, 0.1, 3.0, 6.6, 9.8);
    B.box('#978a75', 0, 2.4, -4.7, 9.4, 4.8, 0.55);
    B.box('#8b7f6c', -3.2, 5.85, 0.2, 2.65, 0.18, 9.75);
    B.box('#8b7f6c', 3.3, 6.65, 0.1, 3.15, 0.18, 9.95);
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
    s1.position.set(-1.92, 2.35, -0.35); s1.rotation.y = PI / 2;
    market.add(s1);
    const s2 = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.52), new THREE.MeshStandardMaterial({ map: signShoe, roughness: 0.92 }));
    s2.position.set(1.83, 2.35, -3.55); s2.rotation.y = -PI / 2;
    market.add(s2);
    const s3 = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), new THREE.MeshStandardMaterial({ map: signLychee, roughness: 0.92 }));
    s3.position.set(-1.92, 4.0, -1.2); s3.rotation.y = PI / 2;
    market.add(s3);

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
    B.box('#9a9d98', 0, 2.0, 0, 40, 0.55, 1.7);
    B.box('#8a8d88', 0, 2.32, 0, 40, 0.10, 1.8);
    for (const px of [-10, 10]) {
      B.box('#a2a49e', px, 4.2, 0, 0.65, 5.2, 0.85);
      B.box('#a2a49e', px, 6.75, 0, 0.35, 0.2, 0.5);
    }
    // cables
    for (const px of [-10, 10]) {
      for (let i = 0; i < 8; i++) {
        const x0 = px + (i - 3.5) * 3.1;
        B.tube('#6f7470', new THREE.Vector3(px, 6.7, 0.1), new THREE.Vector3(x0, 2.35, 0.1), 0.018, 0.018, 4);
      }
    }
    // piers
    for (let i = -4; i <= 4; i++) B.box('#b0b1aa', i * 4.5, 1.0, 0, 0.55, 2.0, 1.2);
    const mesh = B.build(MAT.vertex);
    bridge.add(mesh);
    bridge.position.set(26, 0.32, 36.5);
    bridge.rotation.y = -0.20;
    scene.add(bridge);
  }

  /* ------------------------------------------------------------------ */
  /* camera path                                                        */
  /* ------------------------------------------------------------------ */
  const CAM_KEYS = [
    { y: 1980, p: [-30, 13, 31], t: [-36, 3.5, 8] },
    { y: 1985, p: [-27, 16, 37], t: [-31, 4.5, 6] },
    { y: 1990, p: [-23, 19, 43], t: [-23, 6.0, 4] },
    { y: 1996, p: [-14, 23, 51], t: [-12, 8.0, 3] },
    { y: 2004, p: [-5, 26, 57], t: [-3, 9.5, 3] },
    { y: 2011, p: [2, 29, 61], t: [1, 10.5, 3] },
    { y: 2016, p: [5, 31.5, 64.5], t: [0, 11.2, 4] },
    { y: 2026, p: [6, 32, 66], t: [0, 11.5, 4] }
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

  function updateCamera(year, time) {
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
      uBlur: { value: 1.0 },
      uExposure: { value: 1.02 },
      uContrast: { value: 1.035 },
      uSaturation: { value: 0.96 },
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
          float rr = blur * (0.6 + 1.7 * fract(float(i) * 0.371));
          c += texture2D(tScene, uv + vec2(cos(a), sin(a)) * uTexel * rr).rgb * 0.0875;
        }
        c *= uExposure;
        c = aces(c);
        c = mix(vec3(0.46), c, uContrast);
        float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(lum), c, uSaturation);
        c *= vec3(1.018, 1.0, 0.972);
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
    compositeMat.uniforms.uTexel.value.set(1 / W, 1 / H);
    compositeMat.uniforms.uAspect.value = w / h;
  }

  const _v = new THREE.Vector3();
  function updateFocus() {
    const anchors = [
      { x: 0, y: 17, z: -4, r: 0.34 },
      { x: -16, y: 2.4, z: 5.2, r: 0.115 },
      { x: 1, y: 1.5, z: 22.2, r: 0.16 },
      { x: 15.5, y: 2.4, z: 6.4, r: 0.115 },
      { x: 27, y: 4, z: 36, r: 0.10 },
      { x: 0, y: 3, z: 2, r: 0.12 }
    ];
    for (let i = 0; i < 6; i++) {
      const a = anchors[i];
      _v.set(a.x, a.y, a.z).project(camera);
      const x = _v.x * 0.5 + 0.5, y = _v.y * 0.5 + 0.5;
      const behind = _v.z > 1 ? 0.0001 : 1;
      focus[i].set(x, y, a.r * behind, 0);
    }
  }

  function renderPipeline() {
    renderer.setRenderTarget(rtScene);
    renderer.clear();
    renderer.render(scene, camera);
    updateFocus();
    quad.material = compositeMat;
    compositeMat.uniforms.tScene.value = rtScene.texture;
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCam);
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
    btnPlay: document.getElementById('btnPlay'), btnReplay: document.getElementById('btnReplay'), btnSound: document.getElementById('btnSound')
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

  let hudCache = { year: -1, era: '', chapter: -1, finale: false, legend: false, clock: '' };
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
    const legendOn = year > 2015.5;
    if (legendOn !== hudCache.legend) { hudCache.legend = legendOn; UI.legend.classList.toggle('show', legendOn); }
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

    // landmarks grow
    pingan.scale.y = Math.max(0.001, smoothstep(2014.2, 2016.4, year));
    diwang.scale.y = Math.max(0.001, smoothstep(1994.3, 1996.4, year));

    // three everyday scenes pop up as the city matures
    const sb = smoothstep(2014.6, 2016.3, year);
    const sg = smoothstep(2016.2, 2018.0, year);
    const sm = smoothstep(2015.2, 2017.2, year);
    breakfast.scale.setScalar(Math.max(0.0001, sb));
    greenway.scale.setScalar(Math.max(0.0001, sg));
    market.scale.setScalar(Math.max(0.0001, sm));

    bridge.visible = year > 2020.5;
    bridge.scale.set(1, Math.max(0.001, smoothstep(2020.5, 2022.0, year)), 1);

    // steam
    breakfast.userData.steam.forEach((sp, i) => {
      const t = time * 0.55 + sp.userData.phase;
      sp.position.y = sp.userData.baseY + Math.sin(t) * 0.18 + ((time * 0.18 + i * 0.2) % 1) * 0.5;
      sp.material.opacity = sp.userData.baseOp * (0.65 + 0.35 * Math.sin(t * 1.7 + i));
      sp.scale.setScalar(0.55 + i * 0.16 + Math.sin(t * 0.8) * 0.06);
    });

    // water drift
    texWaterNormal.offset.x = time * 0.0035;
    texWaterNormal.offset.y = time * 0.0022;

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
    canvas.addEventListener('pointerdown', e => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging');
    });
    canvas.addEventListener('pointermove', e => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      userOrbit.yawT -= dx * 0.0032;
      userOrbit.pitchT = clamp(userOrbit.pitchT + dy * 0.0022, -0.35, 0.55);
    });
    canvas.addEventListener('pointerup', e => {
      dragging = false; canvas.classList.remove('dragging');
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      userOrbit.zoomT = clamp(userOrbit.zoomT * Math.exp(e.deltaY * 0.0008), 0.58, 1.75);
    }, { passive: false });
    canvas.addEventListener('dblclick', () => { userOrbit.yawT = 0; userOrbit.pitchT = 0; userOrbit.zoomT = 1; });

    UI.btnPlay.addEventListener('click', () => togglePlay());
    UI.btnReplay.addEventListener('click', () => replay());
    UI.btnSound.addEventListener('click', () => {
      const on = AudioFX.toggle();
      UI.btnSound.classList.toggle('on', on);
      UI.soundLabel.textContent = on ? '静音' : '声音';
    });
    window.addEventListener('keydown', e => {
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

  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    sizeTargets(w, h);
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
    setYear(y) { setYear(y, { pause: true }); setPlayUI(false); updateWorld(y, clockTime); updateHUD(y, state.elapsed); renderPipeline(); },
    play() { state.playing = true; setPlayUI(true); },
    pause() { state.playing = false; setPlayUI(false); },
    replay,
    info() {
      return {
        year: state.year,
        elapsed: state.elapsed,
        total: TOTAL,
        buildings: city.length,
        figures: 20,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        halfFloat: canHalf,
        colorManagement: THREE.ColorManagement.enabled
      };
    },
    debug: {
      scene, camera, state, compositeMat, pingan, diwang, breakfast, market, greenway,
      cameraPos: () => camera.position.toArray().map(v => +v.toFixed(2)),
      setPost(o) {
        if (o.exposure !== undefined) compositeMat.uniforms.uExposure.value = o.exposure;
        if (o.blur !== undefined) compositeMat.uniforms.uBlur.value = o.blur;
        if (o.saturation !== undefined) compositeMat.uniforms.uSaturation.value = o.saturation;
      },
      look(x, y, z, tx, ty, tz) {
        camera.position.set(x, y, z);
        camera.lookAt(tx, ty, tz);
        return camera.position.toArray();
      },
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
