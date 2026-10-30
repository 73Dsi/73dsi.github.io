/* ============ core：渲染器 / 相机 / 标签 / 箭头 / 通用工具 ============ */
const APP = (window.APP = {});
(function () {
  const T = THREE;

  APP.S = {
    mode: 'wind',
    wind: 8, rot: 1, hemi: 1,
    sal: 2, sill: -22,
    offshore: 9, elnino: false,
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
    wind:  { theta: 0.62, phi: 0.74, radius: 96, target: [0, -20, 0], min: 40, max: 190, range: null },
    dens:  { theta: 0.14, phi: 1.36, radius: 112, target: [0, -16, 0], min: 62, max: 160, range: 0.5 },
    comp:  { theta: 0.12, phi: 1.40, radius: 98, target: [4, -12, 0], min: 58, max: 160, range: 0.5 },
    globe: { theta: 0.55, phi: 1.32, radius: 3.42, target: [0.15, 0, 0], min: 1.85, max: 6.5, range: null }
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
    if (!dragging) return;
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
      if (!L.on || (L.mode && L.mode !== APP.S.mode)) { if (L.el.style.opacity !== '0') L.el.style.opacity = '0'; continue; }
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

  /* ---------------- resize ---------------- */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  APP.updateCamera();
})();
