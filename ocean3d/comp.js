/* ============ 第三幕：补偿流（秘鲁沿岸上升流） ============ */
(function () {
  const T = THREE, A = window.APP, S = A.S;
  const G = A.group('comp');

  /* ---------- 地形 ---------- */
  const landShape = new T.Shape();
  landShape.moveTo(-58, 9);
  landShape.lineTo(-26, 9);
  landShape.lineTo(-26, 1.8);
  landShape.lineTo(-22.5, -3.5);
  landShape.lineTo(-19.5, -15);
  landShape.lineTo(-14, -24);
  landShape.lineTo(-4, -27);
  landShape.lineTo(14, -29);
  landShape.lineTo(70, -30);
  landShape.lineTo(70, -36);
  landShape.lineTo(-58, -36);

  const landGeo = new T.ExtrudeGeometry(landShape, { depth: 26, bevelEnabled: false });
  landGeo.translate(0, 0, -13);
  const land = new T.Mesh(landGeo, new T.MeshStandardMaterial({
    color: 0x5a6878, roughness: 0.92, metalness: 0.1, flatShading: true
  }));
  G.add(land);

  /* ---------- 水体 ---------- */
  const waterGeo = new T.PlaneGeometry(140, 30, 70, 12);
  waterGeo.translate(0, -15, 0);

  const waterMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide, fog: false,
    uniforms: { uDip: { value: 0 }, uCold: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `
      uniform float uDip;
      varying vec3 vW;
      void main(){
        vec3 p = position;
        float edge = smoothstep(-31.0, -5.0, p.y);
        p.y -= uDip * exp(-pow((p.x + 21.0)/14.0, 2.0)) * edge;
        vW = (modelMatrix*vec4(p,1.0)).xyz;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }`,
    fragmentShader: `
      uniform float uCold; uniform float uTime;
      varying vec3 vW;
      void main(){
        float d = -vW.y;
        vec3 surf = vec3(0.10, 0.40, 0.53);
        vec3 deep = vec3(0.012, 0.050, 0.088);
        vec3 col = mix(surf, deep, smoothstep(1.0, 24.0, d));
        float plume = exp(-pow((vW.x + 13.0)/13.0, 2.0)) * smoothstep(1.0, 24.0, d) * uCold;
        col = mix(col, vec3(0.20, 0.52, 0.82), plume * 0.6);
        float a = 0.52 - 0.14*smoothstep(0.0, 28.0, d);
        gl_FragColor = vec4(col, a);
      }`
  });
  const water = new T.Mesh(waterGeo, waterMat);
  water.renderOrder = 2;
  G.add(water);

  /* ---------- 水面高光线 ---------- */
  const surfN = 60;
  const surfGeo = new T.BufferGeometry();
  surfGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(surfN * 3), 3));
  const surfLine = new T.Line(surfGeo, new T.LineBasicMaterial({
    color: 0x9fe8ff, transparent: true, opacity: 0.6, depthWrite: false, fog: false
  }));
  G.add(surfLine);

  /* ---------- 上升流曲线 ---------- */
  const upCurve = new T.CatmullRomCurve3([
    new T.Vector3(-17, -25, 0), new T.Vector3(-16.4, -19, 0), new T.Vector3(-15.4, -13, 0),
    new T.Vector3(-13.6, -8, 0), new T.Vector3(-11, -4, 0), new T.Vector3(-7, -1.4, 0),
    new T.Vector3(0, -1.5, 0), new T.Vector3(14, -2.2, 0)
  ], false, 'catmullrom', 0.4);

  const COUNT = 150;
  const upPts = A.points(COUNT, 0x8fe3ff, 1.7, 0.95);
  const nutPts = A.points(90, 0x8ef2a0, 1.3, 0.9);
  const fishPts = A.points(120, 0xe8fbff, 1.5, 0.0);
  upPts.renderOrder = 8; nutPts.renderOrder = 8; fishPts.renderOrder = 8;
  G.add(upPts, nutPts, fishPts);

  const upPhase = new Float32Array(COUNT), nutPhase = new Float32Array(90);
  const upOff = [], nutOff = [];
  for (let i = 0; i < COUNT; i++) {
    upPhase[i] = Math.random();
    upOff.push({ z: (Math.random() * 2 - 1) * 8, a: Math.random() * 2 - 1, s: Math.random() * 6.283 });
  }
  for (let i = 0; i < 90; i++) {
    nutPhase[i] = Math.random();
    nutOff.push({ z: (Math.random() * 2 - 1) * 7, a: Math.random() * 2 - 1, s: Math.random() * 6.283 });
  }

  const fishPos = new Float32Array(120 * 3);
  const fishBase = [];
  for (let i = 0; i < 120; i++) {
    const x = -4 + Math.random() * 34;
    const y = -6 + Math.random() * 4;
    const z = (Math.random() * 2 - 1) * 9;
    fishBase.push({ x, y, z, p: Math.random() * 6.283, r: 0.6 + Math.random() * 1.6 });
    fishPos[i * 3] = x; fishPos[i * 3 + 1] = y; fishPos[i * 3 + 2] = z;
  }
  fishPts.geometry.attributes.position.array.set(fishPos);

  /* ---------- 风 ---------- */
  const windArrows = [];
  for (let i = 0; i < 7; i++) windArrows.push(A.arrow(0xdff2ff, { opacity: 0.7 }));
  const aUp = A.arrow(0x8fd8ff, { opacity: 0.9 });
  const aSurf = A.arrow(0x7df5b5, { opacity: 0.85 });

  /* ---------- 标签 ---------- */
  const lLand = A.label('秘鲁沿岸');
  const lWind = A.label('离岸风（东南信风）');
  const lSurf = A.label('表层水离岸', 'cyan');
  const lUp = A.label('深层冷水上涌', 'cyan');
  const lNut = A.label('营养盐上泛', 'green');
  const lFish = A.label('秘鲁渔场', 'amber');
  const lEln = A.label('厄尔尼诺：信风减弱', 'red');
  lEln.on = false;

  const _p = new T.Vector3();

  function windNow() {
    return S.offshore * (S.elnino ? 0.22 : 1);
  }

  function update(dt) {
    if (S.compKind === 'h') { updateH(dt); return; }
    const w = windNow();
    const strength = A.clamp(w / 12, 0, 1.35);

    waterMat.uniforms.uDip.value = 2.2 * strength;
    waterMat.uniforms.uCold.value = A.clamp(strength * 1.2, 0, 1);
    waterMat.uniforms.uTime.value = S.t;

    /* 水面高光线 */
    const SP = surfGeo.attributes.position.array;
    for (let i = 0; i < surfN; i++) {
      const x = -66 + (132 * i) / (surfN - 1);
      SP[i * 3] = x;
      SP[i * 3 + 1] = -2.0 * strength * Math.exp(-Math.pow((x + 21) / 14, 2)) + 0.15;
      SP[i * 3 + 2] = 0;
    }
    surfGeo.attributes.position.needsUpdate = true;

    /* 上升流粒子 */
    const UP = upPts.geometry.attributes.position.array;
    const NT = nutPts.geometry.attributes.position.array;
    const spd = 0.05 + strength * 0.10;

    for (let i = 0; i < COUNT; i++) {
      upPhase[i] = (upPhase[i] + dt * spd * (0.75 + (i % 5) * 0.09)) % 1;
      upCurve.getPointAt(upPhase[i], _p);
      const o = upOff[i];
      UP[i * 3] = _p.x + o.a * 1.8 + Math.sin(S.t * 1.2 + o.s) * 0.3;
      UP[i * 3 + 1] = _p.y;
      UP[i * 3 + 2] = _p.z = o.z;
    }
    upPts.geometry.attributes.position.needsUpdate = true;

    for (let i = 0; i < 90; i++) {
      nutPhase[i] = (nutPhase[i] + dt * spd * 0.9) % 1;
      upCurve.getPointAt(nutPhase[i], _p);
      const o = nutOff[i];
      NT[i * 3] = _p.x + o.a * 2.4 + Math.sin(S.t * 1.7 + o.s) * 0.4;
      NT[i * 3 + 1] = _p.y;
      NT[i * 3 + 2] = o.z;
    }
    nutPts.geometry.attributes.position.needsUpdate = true;

    nutPts.material.opacity = 0.15 + strength * 0.75;
    upPts.material.opacity = 0.2 + strength * 0.7;

    /* 鱼群 */
    const FP = fishPts.geometry.attributes.position.array;
    for (let i = 0; i < 120; i++) {
      const b = fishBase[i];
      FP[i * 3] = b.x + Math.sin(S.t * 0.5 + b.p) * b.r;
      FP[i * 3 + 1] = b.y + Math.cos(S.t * 0.7 + b.p * 1.3) * b.r * 0.4;
      FP[i * 3 + 2] = b.z + Math.cos(S.t * 0.4 + b.p) * b.r * 0.6;
    }
    fishPts.geometry.attributes.position.needsUpdate = true;
    fishPts.material.opacity = A.clamp(strength * 1.4 - 0.25, 0, 0.95);

    /* 风箭头 */
    const wl = 8 + w * 0.9;
    for (let i = 0; i < windArrows.length; i++) {
      const x = -30 + ((i * 11 + S.t * (6 + w)) % 66);
      windArrows[i].setArrow(new T.Vector3(x, 7 + Math.sin(S.t * 1.3 + i) * 0.4, -14 + (i % 3) * 12),
        new T.Vector3(1, 0, 0), wl, 0.28);
      windArrows[i].setOpacity(0.25 + A.clamp(w / 12, 0, 1) * 0.55);
    }

    /* 主箭头 */
    upCurve.getPointAt(0.30, _p);
    aUp.setArrow(_p.clone(), new T.Vector3(0.16, 1, 0).normalize(), 10 + strength * 12, 0.45);
    lUp.pos.copy(_p).add(new T.Vector3(-7, 12, 0));

    aSurf.setArrow(new T.Vector3(-12, 0.6, 0), new T.Vector3(1, 0, 0), 6 + strength * 12, 0.35);
    lSurf.pos.set(2, 3.4, 0);

    aUp.setOpacity(0.2 + strength * 0.75);
    aSurf.setOpacity(0.2 + strength * 0.7);

    /* 静态标签 */
    lLand.pos.set(-38, 6.5, 0);
    lWind.pos.set(6, 9.5, 0);
    lNut.pos.set(-17, -18, 0);
    lFish.pos.set(6, -6, 0);
    lEln.pos.set(18, 15, 0);
    lEln.on = S.elnino;
    lUp.el.style.opacity = strength > 0.15 ? '1' : '0.3';
  }


  /* ================= 拆分：垂直补偿 GV / 水平补偿 GH ================= */
  const GV = new T.Group();
  while (G.children.length) GV.add(G.children[0]);
  G.add(GV);

  // 垂直场景：给标签打上 kind，并加入水箱
  [lLand, lWind, lSurf, lUp, lNut, lFish, lEln].forEach((l) => { l.kind = 'v'; });
  A.curGroup = GV;
  A.tank(146, 54, 34, 2, -9.5, 0, 0x4fc9a8);
  A.curGroup = G;

  /* ---------------- 水平补偿：赤道逆流 ---------------- */
  const GH = new T.Group();
  GH.visible = false;
  G.add(GH);
  A.curGroup = GH;

  A.tank(100, 30, 48, 0, 3, 0, 0x4fc9a8);

  // 海面（西高东低）
  const seaGeo = new T.PlaneGeometry(96, 46, 1, 1);
  seaGeo.rotateX(-Math.PI / 2);
  const seaMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide, fog: false,
    uniforms: { uT: { value: 0 } },
    vertexShader: 'uniform float uT; varying vec3 vW; varying vec2 vP;\n' +
      'void main(){ vP = position.xz; vec3 p = position; p.y += sin(p.x*0.35 + uT*1.6)*0.16 + sin(p.z*0.5 - uT*1.1)*0.12;\n' +
      'vW = (modelMatrix*vec4(p,1.0)).xyz; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }',
    fragmentShader: 'varying vec3 vW; varying vec2 vP;\n' +
      'void main(){ float band = exp(-pow(vP.y/13.0,2.0));\n' +
      'vec3 c = mix(vec3(0.05,0.20,0.30), vec3(0.10,0.42,0.52), band);\n' +
      'float grid = 1.0 - smoothstep(0.0,0.06,min(abs(fract(vP.x/16.0-0.5)-0.5),abs(fract(vP.y/16.0-0.5)-0.5)));\n' +
      'c += vec3(0.20,0.55,0.65)*grid*0.18;\n' +
      'gl_FragColor = vec4(c, 0.9); }'
  });
  const sea = new T.Mesh(seaGeo, seaMat);
  sea.rotation.z = -0.030;            // 西侧（-x）抬高
  sea.renderOrder = 3;
  GH.add(sea);

  // 西侧堆积的水体
  const humpGeo = new T.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const hump = new T.Mesh(humpGeo, new T.MeshBasicMaterial({
    color: 0x2f9fc4, transparent: true, opacity: 0.22, depthWrite: false, fog: false
  }));
  hump.scale.set(15, 2.6, 22);
  hump.position.set(-40, 0.4, 0);
  hump.renderOrder = 2;
  GH.add(hump);

  // 风（东北信风 / 东南信风）
  const hWind = [];
  for (let i = 0; i < 6; i++) hWind.push(A.windMark(0xdff2ff, { opacity: 0.6 }));
  // 三支洋流（波浪箭头）
  const aN = A.wave(0xff8a63, { opacity: 0.95 });
  const aS = A.wave(0xff8a63, { opacity: 0.95 });
  const aE = A.wave(0x7df5b5, { opacity: 1 });
  const aP = A.arrow(0xb46cf0, { opacity: 0.55 });

  const hLabels = [
    A.label('北赤道暖流 · 西流', 'amber'),
    A.label('南赤道暖流 · 西流', 'amber'),
    A.label('赤道逆流 · 东流（水平补偿）', 'green'),
    A.label('东北信风', 'dim'),
    A.label('东南信风', 'dim'),
    A.label('西部水位抬高', 'cyan'),
    A.label('赤道海区水位低', 'dim')
  ];
  hLabels.forEach((l) => { l.kind = 'h'; });

  A.curGroup = G;

  /* ---------------- 水平场景更新 ---------------- */
  const _h = new T.Vector3();
  function updateH(dt) {
    seaMat.uniforms.uT.value = S.t;
    const w = A.clamp(S.offshore / 12, 0.15, 1.3);

    for (let i = 0; i < hWind.length; i++) {
      const row = i < 3 ? 1 : -1;
      const k = i % 3;
      const x = 30 - ((S.t * (7 + 7 * w) + k * 26) % 78);
      _h.set(x, 7.5, row * (12 + k * 1.5));
      hWind[i].setWind(_h, new T.Vector3(-1, 0, 0), 14, 0.85);
      hWind[i].setOpacity(0.34 + w * 0.5);
    }

    aN.setArrow(new T.Vector3(40, 2.2, 13), new T.Vector3(-1, 0, 0), 64, 0.42, 0.42);
    aS.setArrow(new T.Vector3(40, 2.2, -13), new T.Vector3(-1, 0, 0), 64, 0.42, 0.42);
    aE.setArrow(new T.Vector3(-34, 2.6, 0), new T.Vector3(1, 0, 0), 60, 0.5, 0.56);
    aE.setOpacity(0.35 + w * 0.6);

    _h.set(2, 0.8, 0);
    aP.setArrow(_h, new T.Vector3(1, 0, 0), 16 + w * 8, 0.3);
    aP.setOpacity(0.18 + w * 0.3);

    hLabels[0].pos.set(-4, 2.4, 13); hLabels[0].off = [0, 19];
    hLabels[1].pos.set(-4, 2.4, -13); hLabels[1].off = [0, -18];
    hLabels[2].pos.set(6, 3.0, 0); hLabels[2].off = [0, -20];
    hLabels[3].pos.set(24, 8.2, 13.5);
    hLabels[4].pos.set(24, 8.2, -13.5);
    hLabels[5].pos.set(-40, 3.4, 0);
    hLabels[6].pos.set(34, 2.6, 0);
    hLabels[5].off = [0, -22];
    hLabels[6].off = [0, -18];
  }

  function setKind(k) {
    S.compKind = k;
    GV.visible = k === 'v';
    GH.visible = k === 'h';
    if (A.goView) A.goView(k === 'h' ? 'comph' : 'comp');
  }
  A.compKind = setKind;

  A.comp = { G, GV, GH, update, updateH, windNow, setKind };
})();
