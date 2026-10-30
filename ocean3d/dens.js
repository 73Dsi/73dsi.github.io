/* ============ 第二幕：密度流（直布罗陀海峡） ============ */
(function () {
  const T = THREE, A = window.APP, S = A.S;
  const G = A.group('dens');

  const ZD = 26;          // 剖面厚度
  let seabed = null;

  const seabedMat = new T.MeshStandardMaterial({
    color: 0x27333f, roughness: 0.9, metalness: 0.15, flatShading: true
  });

  function buildSeabed() {
    if (seabed) {
      G.remove(seabed);
      seabed.geometry.dispose();
    }
    const s = new T.Shape();
    const st = S.sill;
    s.moveTo(-62, -52);
    s.lineTo(-62, -34);
    s.lineTo(-20, -34);
    s.lineTo(-12, -29);
    s.lineTo(-5, st);
    s.lineTo(5, st);
    s.lineTo(12, -29);
    s.lineTo(20, -34);
    s.lineTo(62, -34);
    s.lineTo(62, -52);
    s.lineTo(-62, -52);
    const geo = new T.ExtrudeGeometry(s, { depth: ZD, bevelEnabled: false });
    geo.translate(0, 0, -ZD / 2);
    seabed = new T.Mesh(geo, seabedMat);
    G.add(seabed);
  }
  buildSeabed();

  /* ---------- 水体 ---------- */
  const waterMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide, fog: false,
    uniforms: {
      uSill: { value: S.sill },
      uTint: { value: 0 },
      uLight: { value: new T.Color(0x2f86c9) },
      uDense: { value: new T.Color(0xe08a3c) }
    },
    vertexShader: 'varying vec3 vW; void main(){ vW=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `
      uniform float uSill; uniform float uTint;
      uniform vec3 uLight; uniform vec3 uDense;
      varying vec3 vW;
      void main(){
        float x = vW.x, d = -vW.y;
        float base = mix(27.0, 15.0, smoothstep(-32.0, 6.0, x));
        float idepth = mix(base, -uSill, exp(-x*x/70.0));
        float dense = smoothstep(idepth-1.4, idepth+1.4, d);
        vec3 col = mix(uLight, uDense, dense);
        float band = exp(-pow((d-idepth)/1.1, 2.0));
        col += vec3(0.75,0.95,1.0) * band * 0.35;
        col *= mix(1.0, 0.42, clamp(d/38.0, 0.0, 1.0));
        col *= 0.85 + 0.35*smoothstep(0.0, -6.0, vW.y);
        float a = 0.30 + 0.42*smoothstep(10.0, 0.0, d);
        a *= 0.75 + 0.25*smoothstep(-52.0, -20.0, abs(x));
        gl_FragColor = vec4(col, a);
      }`
  });
  const water = new T.Mesh(new T.PlaneGeometry(124, 36), waterMat);
  water.position.set(0, -18, 0);
  water.renderOrder = 2;
  G.add(water);

  /* ---------- 水面线 ---------- */
  const surfGeo = new T.BufferGeometry();
  surfGeo.setAttribute('position', new T.BufferAttribute(new Float32Array([-62, 0.1, 0, 62, 0.1, 0]), 3));
  const surf = new T.Line(surfGeo, new T.LineBasicMaterial({
    color: 0x9fe8ff, transparent: true, opacity: 0.55, depthWrite: false, fog: false
  }));
  G.add(surf);

  /* ---------- 流动曲线 ---------- */
  let curveOut = null, curveIn = null;
  function curvePoints() {
    const st = S.sill;
    return {
      out: [
        [42, -31], [26, -30], [14, -27], [7, st - 2.2], [0, st - 2.2], [-7, st - 2.2],
        [-14, -27], [-24, -30.5], [-38, -32], [-52, -32.5]
      ],
      in: [
        [-56, -3.4], [-38, -3.0], [-20, -3.2], [-8, -3.4], [0, -3.6], [10, -3.6], [24, -4.0], [40, -4.6], [56, -5.2]
      ]
    };
  }
  function rebuildCurves() {
    const p = curvePoints();
    curveOut = new T.CatmullRomCurve3(p.out.map((q) => new T.Vector3(q[0], q[1], 0)), false, 'catmullrom', 0.4);
    curveIn = new T.CatmullRomCurve3(p.in.map((q) => new T.Vector3(q[0], q[1], 0)), false, 'catmullrom', 0.4);
  }
  rebuildCurves();

  /* ---------- 粒子 ---------- */
  const COUNT = 90;
  const outPts = A.points(COUNT, 0xffb066, 1.5, 0.95);
  const inPts = A.points(COUNT, 0x6fd0ff, 1.4, 0.9);
  outPts.renderOrder = 8; inPts.renderOrder = 8;
  G.add(outPts, inPts);

  const phases = new Float32Array(COUNT);
  const jitter = [];
  for (let i = 0; i < COUNT; i++) {
    phases[i] = i / COUNT;
    jitter.push({ z: (Math.random() * 2 - 1) * 7, o: (Math.random() * 2 - 1) * 1.2, s: Math.random() * 6.283 });
  }

  /* ---------- 箭头 ---------- */
  const aOut = A.arrow(0xffa657, { opacity: 0.95 });
  const aIn = A.arrow(0x63c8ff, { opacity: 0.95 });
  const outFlow = [A.arrow(0xffb066, { opacity: 0.7 }), A.arrow(0xffb066, { opacity: 0.7 })];
  const inFlow = [A.arrow(0x6fd0ff, { opacity: 0.7 }), A.arrow(0x6fd0ff, { opacity: 0.7 })];

  /* ---------- 标签 ---------- */
  const lAtl = A.label('大 西 洋'), lMed = A.label('地 中 海');
  const lSill = A.label('海槛', 'dim');
  const lOut = A.label('高盐高密水 · 底层流出', 'amber');
  const lIn = A.label('低盐海水 · 表层流入', 'cyan');
  const lInt = A.label('密度界面', 'dim');
  const lSalt = A.label('盐度 38‰ · 高密', 'amber');

  /* ---------- 物理 ---------- */
  function strength() {
    const sillF = A.clamp((-S.sill - 8) / 14, 0, 1);
    const salF = 0.18 + (S.sal / 4) * 1.0;
    return sillF * salF;
  }

  const _p = new T.Vector3(), _p2 = new T.Vector3(), _t = new T.Vector3();

  function update(dt) {
    const str = strength();
    const speed = 0.055 * str;

    const op = outPts.geometry.attributes.position.array;
    const ip = inPts.geometry.attributes.position.array;

    for (let i = 0; i < COUNT; i++) {
      phases[i] = (phases[i] + dt * speed * (i % 3 === 0 ? 1.12 : 1)) % 1;
      const j = jitter[i];
      if (curveOut) {
        curveOut.getPointAt(phases[i], _p);
        _p.z = j.z;
        _p.y += Math.sin(S.t * 1.6 + j.s) * 0.25;
        op[i * 3] = _p.x; op[i * 3 + 1] = _p.y; op[i * 3 + 2] = _p.z;
      }
      if (curveIn) {
        curveIn.getPointAt((phases[i] + 0.35) % 1, _p2);
        _p2.z = j.z * 0.9;
        _p2.y += Math.cos(S.t * 1.4 + j.s) * 0.22;
        ip[i * 3] = _p2.x; ip[i * 3 + 1] = _p2.y; ip[i * 3 + 2] = _p2.z;
      }
    }
    outPts.geometry.attributes.position.needsUpdate = true;
    inPts.geometry.attributes.position.needsUpdate = true;

    const vis = str > 0.06;
    outPts.material.opacity = 0.25 + str * 0.7;
    inPts.material.opacity = 0.25 + str * 0.65;

    /* 主箭头 */
    if (curveOut) {
      curveOut.getPointAt(0.30, _p); curveOut.getTangentAt(0.30, _t);
      aOut.setArrow(_p, _t, 9 + str * 10, 0.55);
      lOut.pos.copy(_p).add(new T.Vector3(0, -4, 0));
      outFlow[0].setArrow(curveOut.getPointAt(0.62, _p).clone(), curveOut.getTangentAt(0.62, _t), 5, 0.3);
      outFlow[1].setArrow(curveOut.getPointAt(0.84, _p).clone(), curveOut.getTangentAt(0.84, _t), 5, 0.3);
    }
    if (curveIn) {
      curveIn.getPointAt(0.34, _p); curveIn.getTangentAt(0.34, _t);
      aIn.setArrow(_p, _t, 9 + str * 10, 0.55);
      lIn.pos.copy(_p).add(new T.Vector3(0, 4.2, 0));
      inFlow[0].setArrow(curveIn.getPointAt(0.64, _p).clone(), curveIn.getTangentAt(0.64, _t), 5, 0.3);
      inFlow[1].setArrow(curveIn.getPointAt(0.85, _p).clone(), curveIn.getTangentAt(0.85, _t), 5, 0.3);
    }

    const dim = vis ? 0.95 : 0.2;
    aOut.setOpacity(dim); aIn.setOpacity(dim);
    lOut.on = vis; lIn.on = vis;
    lOut.el.style.opacity = vis ? '1' : '0.25';
    lIn.el.style.opacity = vis ? '1' : '0.25';

    /* 静态标签 */
    lAtl.pos.set(-40, 6, 0);
    lMed.pos.set(38, 6, 0);
    lSill.pos.set(0, S.sill - 4.5, 0);
    lInt.pos.set(-30, -27, 0);
    lSalt.pos.set(22, -14, 0);

    waterMat.uniforms.uSill.value = S.sill;
    waterMat.uniforms.uDense.value.setHex(S.sal > 2.6 ? 0xf0d070 : 0xe08a3c);
  }

  function rebuild() {
    buildSeabed();
    rebuildCurves();
  }

  A.dens = { G, update, rebuild, strength };
})();
