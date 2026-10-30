/* ============ 第三幕：补偿流（秘鲁沿岸上升流） ============ */
(function () {
  const T = THREE, A = window.APP, S = A.S;
  const G = A.group('comp');

  /* ---------- 地形 ---------- */
  const landShape = new T.Shape();
  landShape.moveTo(-58, 11);
  landShape.lineTo(-26, 11);
  landShape.lineTo(-26, 2.5);
  landShape.lineTo(-22, -1.5);
  landShape.lineTo(-14, -9);
  landShape.lineTo(-4, -22);
  landShape.lineTo(8, -30);
  landShape.lineTo(26, -36);
  landShape.lineTo(70, -38);
  landShape.lineTo(70, -58);
  landShape.lineTo(-58, -58);
  landShape.lineTo(-70, 20);

  const landGeo = new T.ExtrudeGeometry(landShape, { depth: 26, bevelEnabled: false });
  landGeo.translate(0, 0, -13);
  const land = new T.Mesh(landGeo, new T.MeshStandardMaterial({
    color: 0x44515f, roughness: 0.92, metalness: 0.1, flatShading: true
  }));
  G.add(land);

  /* ---------- 水体 ---------- */
  const waterGeo = new T.PlaneGeometry(140, 46, 70, 14);
  waterGeo.translate(0, -23, 0);

  const waterMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide, fog: false,
    uniforms: { uDip: { value: 0 }, uCold: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `
      uniform float uDip;
      varying vec3 vW;
      void main(){
        vec3 p = position;
        float edge = smoothstep(-46.0, -6.0, p.y);
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
        vec3 col = mix(surf, deep, smoothstep(1.0, 32.0, d));
        float plume = exp(-pow((vW.x + 13.0)/13.0, 2.0)) * smoothstep(1.0, 24.0, d) * uCold;
        col = mix(col, vec3(0.20, 0.52, 0.82), plume * 0.6);
        float a = 0.44 - 0.12*smoothstep(0.0, 42.0, d);
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
    new T.Vector3(-18, -40, 0), new T.Vector3(-17, -30, 0), new T.Vector3(-16, -20, 0),
    new T.Vector3(-14.5, -11, 0), new T.Vector3(-12, -4, 0), new T.Vector3(-8, -1.2, 0),
    new T.Vector3(0, -1.4, 0), new T.Vector3(14, -2, 0)
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
      SP[i * 3 + 1] = -2.2 * strength * Math.exp(-Math.pow((x + 21) / 14, 2)) + 0.15;
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
    lLand.pos.set(-40, 8, 0);
    lWind.pos.set(6, 12.5, 0);
    lNut.pos.set(-20, -20, 0);
    lFish.pos.set(16, -8, 0);
    lEln.pos.set(18, 15, 0);
    lEln.on = S.elnino;
    lUp.el.style.opacity = strength > 0.15 ? '1' : '0.3';
  }

  A.comp = { G, update, windNow };
})();
