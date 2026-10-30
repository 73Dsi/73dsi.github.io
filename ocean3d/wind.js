/* ============ 第一幕：风海流 ============ */
(function () {
  const T = THREE, A = window.APP, S = A.S;
  const G = A.group('wind');

  /* ---------- 水箱 ---------- */
  A.tank(58, 64, 58, 0, -25, 0, 0x63b9d6);
  A.waterVolume(56, 56, 56, 0, -28, 0, 0x1a6c8e);

  /* ---------- 海面 ---------- */
  const oceanGeo = new T.PlaneGeometry(56, 56, 80, 80);
  oceanGeo.rotateX(-Math.PI / 2);

  const oceanMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide, fog: false,
    uniforms: { uTime: { value: 0 }, uWind: { value: 8 } },
    vertexShader: `
      uniform float uTime; uniform float uWind;
      varying vec3 vW; varying vec3 vN; varying float vH;
      void main(){
        vec3 p = position;
        float t = uTime;
        vec2 g = vec2(0.0);
        float h = 0.0;
        vec2 d1 = normalize(vec2(1.0, 0.28));
        float k1 = 0.115, a1 = 0.55;
        float ph1 = dot(d1, p.xz)*k1 + t*1.05;
        h += a1*sin(ph1); g += a1*k1*d1*cos(ph1);
        vec2 d2 = normalize(vec2(-0.55, 1.0));
        float k2 = 0.19, a2 = 0.34;
        float ph2 = dot(d2, p.xz)*k2 + t*1.6;
        h += a2*sin(ph2); g += a2*k2*d2*cos(ph2);
        vec2 d3 = normalize(vec2(0.75, -0.66));
        float k3 = 0.40, a3 = 0.16;
        float ph3 = dot(d3, p.xz)*k3 + t*2.5;
        h += a3*sin(ph3); g += a3*k3*d3*cos(ph3);

        float amp = 0.55 + uWind*0.06;
        p.y += h*amp;
        vH = h;
        vW = (modelMatrix * vec4(p,1.0)).xyz;
        vN = normalize(vec3(-g.x*amp, 1.0, -g.y*amp));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
      }`,
    fragmentShader: `
      varying vec3 vW; varying vec3 vN; varying float vH;
      void main(){
        vec3 V = normalize(cameraPosition - vW);
        vec3 N = normalize(vN);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 3.5);
        vec3 deep = vec3(0.028, 0.105, 0.150);
        vec3 mid  = vec3(0.060, 0.290, 0.390);
        vec3 sky  = vec3(0.140, 0.430, 0.560);
        vec3 col = mix(deep, mid, 0.45 + 0.55*smoothstep(-0.6, 0.9, vH));
        col = mix(col, sky, fres*0.75);
        vec3 L = normalize(vec3(0.35, 0.72, 0.42));
        vec3 Hv = normalize(L + V);
        float spec = pow(max(dot(N, Hv), 0.0), 120.0);
        col += vec3(0.9, 0.97, 1.0) * spec * 1.4;

        vec2 gp = vW.xz / 16.0;
        vec2 q = abs(fract(gp - 0.5) - 0.5);
        float d = min(q.x, q.y);
        float w = 0.008 + length(vW.xz) * 0.00035;
        float grid = 1.0 - smoothstep(0.0, w, d);
        col = mix(col, vec3(0.55, 0.92, 1.0), grid * 0.18);

        float dist = length(vW.xz);
        float alpha = (1.0 - smoothstep(72.0, 128.0, dist)) * 0.94;
        gl_FragColor = vec4(col, alpha);
      }`
  });
  const ocean = new T.Mesh(oceanGeo, oceanMat);
  ocean.renderOrder = 3;
  G.add(ocean);

  /* ---------- 深处网格 ---------- */
  [-30, -56].forEach((y, i) => {
    const gh = new T.GridHelper(52, 8, 0x2a8ea8, 0x0e3a4a);
    gh.position.y = y;
    gh.material.transparent = true;
    gh.material.opacity = 0.18 - i * 0.06;
    gh.material.depthWrite = false;
    gh.renderOrder = 1;
    G.add(gh);
  });

  /* ---------- 示踪粒子 ---------- */
  const LAYERS = [0, -13, -26, -39, -52];
  const PER = 34;
  const N = LAYERS.length * PER;
  const HALF = 26;

  const px = new Float32Array(N), pz = new Float32Array(N);
  const vx = new Float32Array(N), vz = new Float32Array(N);
  const layerOf = new Uint8Array(N);

  const colors = new Float32Array(N * 3);
  const cTop = new T.Color(0xc8fbff), cBot = new T.Color(0x3a86d8);

  for (let i = 0; i < N; i++) {
    const li = Math.floor(i / PER);
    layerOf[i] = li;
    px[i] = (Math.random() * 2 - 1) * HALF;
    pz[i] = (Math.random() * 2 - 1) * HALF;
    const c = cTop.clone().lerp(cBot, li / (LAYERS.length - 1));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }

  const pGeo = new T.BufferGeometry();
  pGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(N * 3), 3));
  pGeo.setAttribute('color', new T.BufferAttribute(colors, 3));
  const pMat = new T.PointsMaterial({
    size: 2.0, map: A.dot, vertexColors: true, transparent: true, opacity: 0.95,
    depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true, fog: false
  });
  const pts = new T.Points(pGeo, pMat);
  pts.frustumCulled = false;
  pts.renderOrder = 6;
  G.add(pts);

  const sGeo = new T.BufferGeometry();
  sGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(N * 6), 3));
  const sMat = new T.LineBasicMaterial({
    color: 0x7fe3ff, transparent: true, opacity: 0.35,
    depthWrite: false, blending: T.AdditiveBlending, fog: false
  });
  const streaks = new T.LineSegments(sGeo, sMat);
  streaks.frustumCulled = false;
  streaks.renderOrder = 5;
  G.add(streaks);

  /* ---------- 埃克曼螺旋 ---------- */
  const COL = { x: -11, z: -2 };
  const ekArrows = LAYERS.map(() => A.arrow(0x9df0ff, { opacity: 0.92 }));
  const envGeo = new T.BufferGeometry();
  envGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(LAYERS.length * 3), 3));
  const envLine = new T.Line(envGeo, new T.LineBasicMaterial({
    color: 0xffc06a, transparent: true, opacity: 0.75, depthWrite: false, fog: false
  }));
  envLine.frustumCulled = false;
  envLine.renderOrder = 7;
  G.add(envLine);

  const colGeo = new T.BufferGeometry();
  colGeo.setAttribute('position', new T.BufferAttribute(new Float32Array([
    COL.x, 1, COL.z, COL.x, -54, COL.z
  ]), 3));
  const colLine = new T.Line(colGeo, new T.LineBasicMaterial({
    color: 0x4fa0b8, transparent: true, opacity: 0.45, depthWrite: false, fog: false
  }));
  colLine.renderOrder = 4;
  G.add(colLine);

  /* ---------- 风、表层流、净输送 ---------- */
  const windArrows = [];
  for (let i = 0; i < 7; i++) windArrows.push(A.arrow(0xe8f7ff, { opacity: 0.55 }));

  const aFlow = A.arrow(0x6ef0b0, { opacity: 1 });
  const aNet = A.arrow(0xffb15c, { opacity: 1 });

  const ARC_N = 40;
  const arcGeo = new T.BufferGeometry();
  arcGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(ARC_N * 3), 3));
  const arcLine = new T.Line(arcGeo, new T.LineBasicMaterial({
    color: 0xffb15c, transparent: true, opacity: 0.55, depthWrite: false, fog: false
  }));
  arcLine.frustumCulled = false;
  arcLine.renderOrder = 9;
  G.add(arcLine);

  const lWind = A.label('风（信风）', 'accent'); lWind.off = [-10, -20];
  lWind.pos.set(-24, 4, -16);
  const lFlow = A.label('表层流速 · 偏 45°', 'green'); lFlow.off = [70, 10];
  const lNet = A.label('净输送 · 偏 90°', 'amber'); lNet.off = [0, -26];
  const lCol = A.label('埃克曼螺旋', 'amber'); lCol.off = [-96, 6];
  const lDeep = A.label('深度增加 · 流速递减 · 持续右偏', 'dim'); lDeep.off = [40, 26];

  /* ---------- 物理 ---------- */
  const DEG = Math.PI / 180;
  function angleAt(li) {
    return S.hemi * S.rot * (45 + 32 * li) * DEG;
  }
  function speedAt(li) {
    return S.wind * 0.30 * Math.exp(-li * 0.38);
  }

  const _o = new T.Vector3(), _d = new T.Vector3();

  function update(dt) {
    oceanMat.uniforms.uTime.value = S.t;
    oceanMat.uniforms.uWind.value = S.wind;

    const P = pGeo.attributes.position.array;
    const SP = sGeo.attributes.position.array;
    const E = envGeo.attributes.position.array;

    for (let i = 0; i < N; i++) {
      const li = layerOf[i];
      const sp = speedAt(li);
      const an = angleAt(li);
      vx[i] = Math.cos(an) * sp;
      vz[i] = Math.sin(an) * sp;

      px[i] += vx[i] * dt;
      pz[i] += vz[i] * dt;
      if (px[i] > HALF) px[i] -= HALF * 2;
      if (px[i] < -HALF) px[i] += HALF * 2;
      if (pz[i] > HALF) pz[i] -= HALF * 2;
      if (pz[i] < -HALF) pz[i] += HALF * 2;

      const y = LAYERS[li];
      P[i * 3] = px[i]; P[i * 3 + 1] = y; P[i * 3 + 2] = pz[i];

      const k = 0.34;
      SP[i * 6] = px[i] - vx[i] * k; SP[i * 6 + 1] = y; SP[i * 6 + 2] = pz[i] - vz[i] * k;
      SP[i * 6 + 3] = px[i]; SP[i * 6 + 4] = y; SP[i * 6 + 5] = pz[i];
    }
    pGeo.attributes.position.needsUpdate = true;
    sGeo.attributes.position.needsUpdate = true;

    /* 螺旋 */
    for (let i = 0; i < LAYERS.length; i++) {
      const y = LAYERS[i], sp = speedAt(i), an = angleAt(i);
      _o.set(COL.x, y, COL.z);
      _d.set(Math.cos(an), 0, Math.sin(an));
      const len = 5.0 + sp * 2.6;
      ekArrows[i].setArrow(_o, _d, len, 0.4);
      E[i * 3] = COL.x + Math.cos(an) * len;
      E[i * 3 + 1] = y;
      E[i * 3 + 2] = COL.z + Math.sin(an) * len;
    }
    envGeo.attributes.position.needsUpdate = true;
    lCol.pos.set(COL.x, -6, COL.z);
    lDeep.pos.set(COL.x, -48, COL.z);

    /* 风箭头 */
    const wl = 9 + S.wind * 0.35;
    for (let i = 0; i < windArrows.length; i++) {
      const a = windArrows[i];
      const x = -26 + ((i * 9 + S.t * 8) % 52);
      _o.set(x, 4 + Math.sin(S.t * 1.2 + i) * 0.4, -20 + (i % 3) * 9);
      _d.set(1, 0, 0);
      a.setArrow(_o, _d, wl, 0.30);
    }
    
    /* 表层流 */
    const sp0 = speedAt(0), an0 = angleAt(0);
    _o.set(COL.x, 0.4, COL.z);
    const lv = 6 + sp0 * 5.4;
    aFlow.setArrow(_o, new T.Vector3(Math.cos(an0), 0, Math.sin(an0)), lv, 0.36);
    lFlow.pos.set(COL.x + Math.cos(an0) * (lv + 2), 0.4, COL.z + Math.sin(an0) * (lv + 2));
    const degTxt = Math.round(45 * S.rot);
    if (lFlow.el.textContent !== '表层流速 · 偏 ' + degTxt + '°') lFlow.el.textContent = '表层流速 · 偏 ' + degTxt + '°';
    lNet.el.textContent = '净输送 · 偏 ' + Math.round(90 * S.rot) + '°';

    /* 净输送：圆弧 + 末端箭头 */
    const ang = Math.PI / 2 * S.rot * S.hemi;
    const AP = arcGeo.attributes.position.array;
    const R0 = 11, cy = -1.4;
    for (let i = 0; i < ARC_N; i++) {
      const a = ang * i / (ARC_N - 1);
      AP[i * 3] = COL.x - Math.sin(a) * R0;
      AP[i * 3 + 1] = cy;
      AP[i * 3 + 2] = COL.z + Math.cos(a) * R0;
    }
    arcGeo.attributes.position.needsUpdate = true;
    arcLine.visible = Math.abs(ang) > 0.05;

    const sgn = ang >= 0 ? 1 : -1;
    const ex = COL.x - Math.sin(ang) * R0, ez = COL.z + Math.cos(ang) * R0;
    const tanx = -Math.cos(ang) * sgn, tanz = -Math.sin(ang) * sgn;
    aNet.visible = Math.abs(ang) > 0.05;
    if (aNet.visible) {
      aNet.setArrow(new T.Vector3(ex, cy, ez), new T.Vector3(tanx, 0, tanz), 6 + S.wind * 0.25, 0.42);
      lNet.pos.set(ex, cy + 1, ez);
    }
    lNet.on = aNet.visible;
  }

  A.wind = { G, update, speedAt, angleAt };
})();
