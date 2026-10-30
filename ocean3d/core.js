/* ============ core：渲染器 / 相机 / 标签 / 箭头 / 通用工具 ============ */
const APP = (window.APP = {});
(function () {
  const T = THREE;

  APP.S = {
    mode: 'wind',
    wind: 8, rot: 1, hemi: 1,
    sal: 2, sill: -22,
    offshore: 9, elnino: false, compKind: 'v',
    forces: true,
    globeColor: 'type',
    filter: 'all',
    sel: null,
    t: 0, speed: 1, playing: true
  };

  APP.C = {
    wind: 0xf2a24a,
    dens: 0xb46cf0,
    comp: 0x35d0a0,
    warm: 0xff7a59,
    cold: 0x4fc3ff,
    cyan: 0x62d6f0,
    amber: 0xffb15c
  };

  APP.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  APP.lerp = (a, b, t) => a + (b - a) * t;
  APP.labels = [];
  APP.scenes = {};

  /* ---------------- renderer ---------------- */
  const canvas = document.getElementById('c');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  APP.renderer = renderer;

  const scene = (APP.scene = new T.Scene());
  scene.fog = new T.FogExp2(0x04080e, 0.0058);

  const camera = (APP.camera = new T.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.05, 4000));

  /* ---------------- 背景 ---------------- */
  const bg = new T.Mesh(
    new T.SphereGeometry(1600, 32, 16),
    new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: { uTop: { value: new T.Color(0x0a2334) }, uBot: { value: new T.Color(0x010306) } },
      vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uTop; uniform vec3 uBot; varying vec3 vP;\n' +
        'void main(){ float h=normalize(vP).y*0.5+0.5; vec3 c=mix(uBot,uTop,pow(h,1.35)); gl_FragColor=vec4(c,1.0); }'
    })
  );
  bg.renderOrder = -100;
  scene.add(bg);

  /* ---------------- 灯光 ---------------- */
  scene.add(new T.HemisphereLight(0x9fdcff, 0x02060c, 1.5));
  const dir = new T.DirectionalLight(0xffe2bd, 2.4);
  dir.position.set(-40, 70, 50);
  scene.add(dir);
  const fill = new T.DirectionalLight(0x9fd8ff, 1.5);
  fill.position.set(60, 30, 80);
  scene.add(fill);

  /* ---------------- 视角控制 ---------------- */
  const VIEWS = {
    wind:  { theta: 0.62, phi: 0.84, radius: 196, target: [8, -25, 0], min: 80, max: 300, range: null },
    dens:  { theta: 0.14, phi: 0.90, radius: 188, target: [4, -26, 0], min: 90, max: 280, range: 0.45 },
    comp:  { theta: 0.10, phi: 1.20, radius: 176, target: [2, -7, 0], min: 80, max: 300, range: 0.45 },
    comph: { theta: 0.10, phi: 0.98, radius: 152, target: [4, 0, 0], min: 70, max: 220, range: 0.6 },
    map:   { theta: 0, phi: 1.2, radius: 60, target: [0, 0, 0], min: 30, max: 120, range: null },
    globe: { theta: 0.55, phi: 1.34, radius: 3.72, target: [0.12, 0, 0], min: 1.85, max: 7.5, range: null }
  };
  APP.VIEWS = VIEWS;

  const view = {
    theta: VIEWS.wind.theta, phi: VIEWS.wind.phi, radius: VIEWS.wind.radius,
    target: new T.Vector3(...VIEWS.wind.target)
  };
  const viewT = {
    theta: view.theta, phi: view.phi, radius: view.radius,
    target: view.target.clone()
  };
  APP.viewT = viewT;

  APP.goView = function (mode, instant) {
    const v = VIEWS[mode];
    viewT.theta = v.theta; viewT.phi = v.phi; viewT.radius = v.radius;
    viewT.target.set(v.target[0], v.target[1], v.target[2]);
    if (instant) {
      view.theta = v.theta; view.phi = v.phi; view.radius = v.radius;
      view.target.copy(viewT.target);
      APP.updateCamera();
    }
  };

  APP.updateCamera = function () {
    view.theta += (viewT.theta - view.theta) * 0.16;
    view.phi += (viewT.phi - view.phi) * 0.16;
    view.radius += (viewT.radius - view.radius) * 0.14;
    view.target.lerp(viewT.target, 0.12);
    camera.position.set(
      view.target.x + view.radius * Math.sin(view.phi) * Math.sin(view.theta),
      view.target.y + view.radius * Math.cos(view.phi),
      view.target.z + view.radius * Math.sin(view.phi) * Math.cos(view.theta)
    );
    camera.lookAt(view.target);
  };

  /* ---------------- 指针 ---------------- */
  let dragging = false, px = 0, py = 0, moved = 0;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; px = e.clientX; py = e.clientY; moved = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) { if (APP.onHover) APP.onHover(e); return; }
    const dx = e.clientX - px, dy = e.clientY - py;
    px = e.clientX; py = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    const v = VIEWS[APP.S.mode];
    viewT.theta -= dx * 0.0062;
    viewT.phi = APP.clamp(viewT.phi - dy * 0.0048, 0.2, 1.52);
    if (v.range != null) viewT.theta = APP.clamp(viewT.theta, -v.range, v.range);
  });
  canvas.addEventListener('pointerup', (e) => {
    dragging = false;
    if (moved < 7 && APP.onPick) APP.onPick(e);
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const v = VIEWS[APP.S.mode];
    viewT.radius = APP.clamp(viewT.radius * (1 + e.deltaY * 0.0011), v.min, v.max);
  }, { passive: false });

  /* ---------------- 标签 ---------------- */
  const labelLayer = document.getElementById('labels');
  APP.label = function (text, cls) {
    const el = document.createElement('div');
    el.className = 'lab' + (cls ? ' ' + cls : '');
    el.textContent = text;
    labelLayer.appendChild(el);
    const o = { el, pos: new T.Vector3(), on: true, w: 0, mode: APP.curMode };
    APP.labels.push(o);
    return o;
  };
  const _v = new T.Vector3();
  APP.updateLabels = function () {
    const W = window.innerWidth, H = window.innerHeight;
    for (let i = 0; i < APP.labels.length; i++) {
      const L = APP.labels[i];
      if (!L.on || (L.mode && L.mode !== APP.S.mode) || (L.kind && L.kind !== APP.S.compKind)) { if (L.el.style.opacity !== '0') L.el.style.opacity = '0'; continue; }
      _v.copy(L.pos).project(camera);
      if (_v.z > 1 || _v.z < -1 || Math.abs(_v.x) > 1.3 || Math.abs(_v.y) > 1.25) {
        L.el.style.opacity = '0'; continue;
      }
      L.el.style.opacity = '1';
      const ox = L.off ? L.off[0] : 0, oy = L.off ? L.off[1] : 0;
      L.el.style.transform = 'translate(-50%,-50%) translate(' + (((_v.x * 0.5 + 0.5) * W) + ox).toFixed(1) + 'px,' + (((-_v.y * 0.5 + 0.5) * H) + oy).toFixed(1) + 'px)';
    }
  };

  /* ---------------- 箭头 ---------------- */
  const UP = new T.Vector3(0, 1, 0);
  APP.arrow = function (color, opts) {
    opts = opts || {};
    const mat = new T.MeshBasicMaterial({
      color, transparent: true, opacity: opts.opacity == null ? 0.95 : opts.opacity,
      depthWrite: false, fog: false
    });
    const g = new T.Group();
    const sg = new T.CylinderGeometry(1, 1, 1, 10, 1, false);
    sg.translate(0, 0.5, 0);
    const shaft = new T.Mesh(sg, mat);
    const hg = new T.ConeGeometry(1, 1, 14, 1, false);
    hg.translate(0, 0.5, 0);
    const head = new T.Mesh(hg, mat);
    g.add(shaft, head);
    g.mat = mat;
    g.userData.len = 1;
    g.userData.rad = 0.22;

    g.setArrow = function (origin, direction, len, rad) {
      if (len < 0.001) { g.visible = false; return; }
      g.visible = true;
      const r = rad == null ? g.userData.rad : rad;
      const hl = Math.min(len * 0.34, r * 7.5);
      g.position.copy(origin);
      g.quaternion.setFromUnitVectors(UP, direction.clone().normalize());
      shaft.scale.set(r, Math.max(0.0001, len - hl), r);
      head.scale.set(r * 2.5, hl, r * 2.5);
      head.position.y = len - hl;
    };
    g.setOpacity = function (o) { mat.opacity = o; g.visible = o > 0.01; };
    g.renderOrder = 9;
    (APP.curGroup || scene).add(g);
    return g;
  };

  /* ---------------- 圆点贴图 ---------------- */
  APP.dot = (function () {
    const s = 64, cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const g = cv.getContext('2d');
    const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.28, 'rgba(255,255,255,0.95)');
    rg.addColorStop(0.62, 'rgba(255,255,255,0.32)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); g.fill();
    const t = new T.CanvasTexture(cv);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  })();

  APP.points = function (n, color, size, opacity) {
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3));
    const mat = new T.PointsMaterial({
      color, size, map: APP.dot, transparent: true, opacity: opacity == null ? 0.9 : opacity,
      depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true, fog: false
    });
    const p = new T.Points(geo, mat);
    p.frustumCulled = false;
    return p;
  };

  APP.group = function (name) {
    const g = new T.Group();
    g.name = name;
    g.visible = false;
    APP.curMode = name;
    APP.curGroup = g;
    scene.add(g);
    APP.scenes[name] = g;
    return g;
  };


  /* ---------------- 世界底图（供 3D 地球贴图与 2D 地图共用） ---------------- */
  APP.worldCanvas = function (W, H, opt) {
    opt = opt || {};
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const rings = window.LAND_RINGS || [];

    if (!opt.noOcean) {
      const grd = g.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, opt.oceanTop || '#0b2b40');
      grd.addColorStop(0.48, opt.oceanMid || '#081d2c');
      grd.addColorStop(1, opt.oceanBot || '#061420');
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
    }

    const X = (lon) => (lon + 180) / 360 * W;
    const Y = (lat) => (90 - lat) / 180 * H;

    g.beginPath();
    rings.forEach((ring) => {
      for (let i = 0; i < ring.length; i++) {
        const x = X(ring[i][0]), y = Y(ring[i][1]);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath();
    });
    g.fillStyle = opt.land || '#1e4356';
    g.fill('evenodd');

    g.save();
    g.clip('evenodd');
    const lg = g.createLinearGradient(0, 0, W * 0.4, H);
    lg.addColorStop(0, opt.landHi || 'rgba(60,120,142,0.55)');
    lg.addColorStop(0.5, 'rgba(40,86,104,0.18)');
    lg.addColorStop(1, 'rgba(16,44,58,0.42)');
    g.fillStyle = lg;
    g.fillRect(0, 0, W, H);
    g.restore();

    g.strokeStyle = opt.coast || '#79cfe8';
    g.lineWidth = Math.max(1, W / 1500);
    g.globalAlpha = opt.coastAlpha == null ? 0.55 : opt.coastAlpha;
    rings.forEach((ring) => {
      g.beginPath();
      for (let i = 0; i < ring.length; i++) {
        const x = X(ring[i][0]), y = Y(ring[i][1]);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    });
    g.globalAlpha = 1;

    return { cv, X, Y, W, H };
  };

  /* ---------------- 玻璃水箱（把场景微缩成模型） ---------------- */
  APP.tank = function (w, h, d, cx, cy, cz, tint) {
    const g = new T.Group();
    const geo = new T.BoxGeometry(w, h, d);
    const edges = new T.LineSegments(
      new T.EdgesGeometry(geo),
      new T.LineBasicMaterial({ color: tint || 0x63b9d6, transparent: true, opacity: 0.26, depthWrite: false, fog: false })
    );
    edges.position.set(cx, cy, cz);
    edges.renderOrder = 2;
    g.add(edges);

    const topGeo = new T.BoxGeometry(w, 0.02, d);
    const top = new T.LineSegments(
      new T.EdgesGeometry(topGeo),
      new T.LineBasicMaterial({ color: 0xa9e6ff, transparent: true, opacity: 0.5, depthWrite: false, fog: false })
    );
    top.position.set(cx, cy + h / 2, cz);
    top.renderOrder = 2;
    g.add(top);

    const glass = new T.Mesh(geo, new T.MeshBasicMaterial({
      color: 0x5fb8dc, transparent: true, opacity: 0.03, side: T.BackSide, depthWrite: false, fog: false
    }));
    glass.position.set(cx, cy, cz);
    glass.renderOrder = 1;
    g.add(glass);

    // 四个立柱，强化“立方体”感
    const [hw, hh, hd] = [w / 2, h / 2, d / 2];
    const cornerPts = [];
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
      cornerPts.push(cx + sx * hw, cy - hh, cz + sz * hd, cx + sx * hw, cy + hh, cz + sz * hd);
    });
    const cg = new T.BufferGeometry();
    cg.setAttribute('position', new T.Float32BufferAttribute(cornerPts, 3));
    const corners = new T.LineSegments(cg, new T.LineBasicMaterial({
      color: tint || 0x63b9d6, transparent: true, opacity: 0.22, depthWrite: false, fog: false
    }));
    corners.renderOrder = 2;
    g.add(corners);

    (APP.curGroup || scene).add(g);
    return g;
  };

  /* ---------------- 水体容积（让水箱里“有水的体积感”） ---------------- */
  APP.waterVolume = function (w, h, d, cx, cy, cz, color) {
    const mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, side: T.BackSide, fog: false,
      uniforms: { uColor: { value: new T.Color(color || 0x0d4a66) } },
      vertexShader: 'varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uColor; varying float vY; void main(){ float h = clamp((vY+0.5),0.0,1.0); float a = 0.16*pow(h,1.6)+0.02; gl_FragColor = vec4(uColor, a); }'
    });
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(cx, cy, cz);
    m.renderOrder = 2;
    (APP.curGroup || scene).add(m);
    return m;
  };

  /* ---------------- 波浪箭头（海水流动） ---------------- */
  const XAXIS = new T.Vector3(1, 0, 0);
  APP.wave = function (color, opts) {
    opts = opts || {};
    const mat = new T.MeshBasicMaterial({
      color, transparent: true, opacity: opts.opacity == null ? 0.95 : opts.opacity,
      depthWrite: false, fog: false
    });
    const g = new T.Group();
    let body = null, tip = null, key = '';

    function build(len, amp, rad) {
      if (body) { g.remove(body); body.geometry.dispose(); }
      if (tip) { g.remove(tip); tip.geometry.dispose(); }
      const N = Math.max(16, Math.round(len * 2.2));
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        pts.push(new T.Vector3(u * len, Math.sin(u * Math.PI * 2.6 - 1.2) * amp, 0));
      }
      const cv = new T.CatmullRomCurve3(pts);
      body = new T.Mesh(new T.TubeGeometry(cv, N, rad, 7, false), mat);
      g.add(body);
      const hl = Math.min(len * 0.30, rad * 8.5);
      tip = new T.Mesh(new T.ConeGeometry(rad * 2.7, hl, 14, 1, false), mat);
      tip.quaternion.setFromUnitVectors(UP, XAXIS);
      tip.position.set(len + hl * 0.42, 0, 0);
      g.add(tip);
      key = len.toFixed(2) + '|' + amp.toFixed(3) + '|' + rad.toFixed(3);
    }

    g.setArrow = function (origin, dir, len, amp, rad) {
      if (len < 0.001) { g.visible = false; return; }
      g.visible = true;
      amp = amp == null ? 0.16 : amp;
      rad = rad == null ? 0.22 : rad;
      const k = len.toFixed(2) + '|' + amp.toFixed(3) + '|' + rad.toFixed(3);
      if (k !== key) build(len, amp, rad);
      g.position.copy(origin);
      g.quaternion.setFromUnitVectors(XAXIS, dir.clone().normalize());
    };
    g.setOpacity = function (o) { mat.opacity = o; g.visible = o > 0.01; };
    g.renderOrder = 9;
    (APP.curGroup || scene).add(g);
    return g;
  };

  /* ---------------- 风纹（风的形状） ---------------- */
  APP.windMark = function (color, opts) {
    opts = opts || {};
    const mat = new T.LineBasicMaterial({
      color, transparent: true, opacity: opts.opacity == null ? 0.75 : opts.opacity,
      depthWrite: false, fog: false
    });
    const g = new T.Group();
    let lines = null, key = '';

    function build(len, amp) {
      if (lines) { g.remove(lines); lines.geometry.dispose(); }
      const N = 34;
      const pos = [];
      const rows = [{ o: -0.30, s: 0.80, p: 0.0 }, { o: 0.0, s: 1.0, p: 0.6 }, { o: 0.30, s: 0.72, p: 1.3 }];
      rows.forEach((r) => {
        let prev = null;
        for (let i = 0; i <= N; i++) {
          const u = i / N;
          const x = u * len * r.s;
          const y = r.o * amp * 2.2 + Math.sin(u * Math.PI * 2.2 + r.p) * amp;
          if (prev) pos.push(prev[0], prev[1], 0, x, y, 0);
          prev = [x, y];
        }
      });
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      lines = new T.LineSegments(geo, mat);
      g.add(lines);
      key = len.toFixed(2) + '|' + amp.toFixed(3);
    }

    g.setWind = function (origin, dir, len, amp) {
      if (len < 0.001) { g.visible = false; return; }
      g.visible = true;
      amp = amp == null ? 0.5 : amp;
      const k = len.toFixed(2) + '|' + amp.toFixed(3);
      if (k !== key) build(len, amp);
      g.position.copy(origin);
      g.quaternion.setFromUnitVectors(XAXIS, dir.clone().normalize());
    };
    g.setOpacity = function (o) { mat.opacity = o; g.visible = o > 0.01; };
    g.renderOrder = 9;
    (APP.curGroup || scene).add(g);
    return g;
  };

  /* ---------------- resize ---------------- */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  APP.updateCamera();
})();
