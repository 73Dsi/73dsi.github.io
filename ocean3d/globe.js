/* ============ 第四幕：全球联动 ============ */
(function () {
  const T = THREE, A = window.APP, S = A.S;
  const G = A.group('globe');

  const R = 1.0;

  /* ---------- 数据 ---------- */
  const CUR = [
    { id: 'nep', n: '北赤道暖流', t: 'wind', k: 'warm', w: 3, link: 'wind',
      p: [[-100, 10], [-125, 11], [-150, 12], [-175, 12], [160, 12], [140, 11]],
      why: '东北信风长期吹拂海面，把表层海水推向西，因地转偏向力右偏而与风向成一定夹角。',
      eff: '是北太平洋副热带环流的南部支流，为低纬海区持续输送热量。' },
    { id: 'sep', n: '南赤道暖流', t: 'wind', k: 'warm', w: 3, link: 'wind',
      p: [[-85, -3], [-110, -4], [-140, -4], [-165, -4], [170, -4], [150, -4]],
      why: '东南信风驱动，南半球左偏，自东向西横贯赤道以南洋面。',
      eff: '与北赤道暖流共同构成太平洋副热带环流的南、北两支。' },
    { id: 'ecc', n: '赤道逆流', t: 'comp', k: 'warm', w: 2, link: 'comp',
      p: [[140, 6], [165, 6], [-170, 6], [-145, 6], [-115, 6]],
      why: '南北赤道暖流把赤道海区的水向西带走，赤道海区水位降低，西部海水自西向东回流补充。',
      eff: '典型的水平补偿流，位于两支赤道暖流之间，自西向东流。' },
    { id: 'kuro', n: '黑潮（日本暖流）', t: 'wind', k: 'warm', w: 3, link: 'wind',
      p: [[122, 22], [128, 28], [135, 33], [141, 36], [147, 38]],
      why: '信风与西风驱动的副热带环流在大陆东岸受阻收束，形成窄而急的西部边界流。',
      eff: '沿日本列岛北上，使沿岸冬季温和、降水增多。' },
    { id: 'npw', n: '北太平洋暖流', t: 'wind', k: 'warm', w: 2, link: 'wind',
      p: [[150, 40], [175, 42], [-165, 44], [-140, 45]],
      why: '盛行西风带驱动，洋流自西向东横越北太平洋。',
      eff: '把黑潮的热量输送到北美西岸，是北太平洋环流的北部支流。' },
    { id: 'cal', n: '加利福尼亚寒流', t: 'wind', k: 'cold', w: 2, link: 'wind',
      p: [[-128, 45], [-124, 38], [-118, 30], [-112, 22]],
      why: '副热带环流东侧的回流，由较高纬度流向较低纬度。',
      eff: '降温减湿，是北美西岸夏季多雾、沿岸干燥少雨的原因之一。' },
    { id: 'oyashio', n: '千岛寒流（亲潮）', t: 'wind', k: 'cold', w: 2, link: 'wind',
      p: [[168, 54], [160, 50], [152, 45], [146, 41]],
      why: '极地东风与北太平洋环流共同作用，把千岛群岛附近的冷海水向西南输送。',
      eff: '与黑潮在北海道附近交汇，形成北海道渔场。' },
    { id: 'alaska', n: '阿拉斯加暖流', t: 'wind', k: 'warm', w: 1, link: 'wind',
      p: [[-152, 56], [-142, 58], [-134, 55], [-129, 51]],
      why: '北太平洋暖流在北岸的分支，受地形抬升转向北。',
      eff: '使阿拉斯加南部沿岸冬季不冻，形成温带雨林。' },
    { id: 'peru', n: '秘鲁寒流', t: 'comp', k: 'cold', w: 3, link: 'comp',
      p: [[-75, -42], [-73, -32], [-77, -22], [-80, -12], [-84, -4]],
      why: '离岸的东南信风把表层水吹向远海，深层冷水上涌补偿，形成强劲的上升流。',
      eff: '营养盐上泛，造就世界著名的秘鲁渔场；厄尔尼诺年信风减弱则渔获锐减。' },
    { id: 'gulf', n: '墨西哥湾暖流', t: 'wind', k: 'warm', w: 3, link: 'wind',
      p: [[-80, 25], [-76, 31], [-70, 36], [-62, 40], [-54, 43]],
      why: '信风堆积在加勒比海的水体经佛罗里达海峡流出，受西风带与地转偏向力共同作用向东北输送。',
      eff: '世界上流量最大的暖流，是北大西洋暖流的热量来源。' },
    { id: 'natl', n: '北大西洋暖流', t: 'wind', k: 'warm', w: 3, link: 'wind',
      p: [[-52, 45], [-38, 50], [-24, 55], [-10, 58], [2, 61]],
      why: '盛行西风驱动下自西南向东北输送，是墨西哥湾暖流的延续。',
      eff: '使西欧、北欧冬季远比同纬度温暖湿润，摩尔曼斯克成为终年不冻港。' },
    { id: 'norw', n: '挪威暖流', t: 'wind', k: 'warm', w: 1, link: 'wind',
      p: [[4, 62], [10, 66], [18, 70], [26, 72]],
      why: '北大西洋暖流沿挪威海北上的分支。',
      eff: '使挪威沿岸冬季不结冰，是北极圈内少有的不冻港区。' },
    { id: 'egreen', n: '东格陵兰寒流', t: 'wind', k: 'cold', w: 1, link: 'wind',
      p: [[-12, 74], [-24, 71], [-34, 66], [-42, 61]],
      why: '北冰洋冷水沿格陵兰东岸南下的极地洋流。',
      eff: '把浮冰与冷水带向较低纬度，是北大西洋“冷水舌”的来源。' },
    { id: 'can', n: '加那利寒流', t: 'wind', k: 'cold', w: 2, link: 'wind',
      p: [[-11, 35], [-16, 29], [-21, 22], [-24, 16]],
      why: '副热带环流东侧回流，沿非洲西北岸南下。',
      eff: '降温减湿，加剧撒哈拉西岸的干旱并多海雾。' },
    { id: 'lab', n: '拉布拉多寒流', t: 'wind', k: 'cold', w: 2, link: 'wind',
      p: [[-56, 62], [-53, 55], [-50, 48], [-53, 42]],
      why: '极地东风与西风带共同作用，把北冰洋冷水向南输送。',
      eff: '与墨西哥湾暖流交汇形成纽芬兰渔场，并产生浓密海雾。' },
    { id: 'acc', n: '西风漂流', t: 'wind', k: 'cold', w: 3, link: 'wind',
      p: [[-170, -52], [-120, -53], [-70, -51], [-20, -49], [40, -48], [100, -50], [160, -53]],
      why: '盛行西风在南半球无大陆阻挡，环绕南极一周，是规模最大的风海流。',
      eff: '南半球西风漂流因靠近南极、水温低而属寒流，阻断低纬热量南下。' },
    { id: 'eac', n: '东澳大利亚暖流', t: 'wind', k: 'warm', w: 2, link: 'wind',
      p: [[153, -18], [153, -26], [151, -34], [149, -40]],
      why: '南太平洋副热带环流西侧的西部边界流，沿澳大利亚东岸南下。',
      eff: '使澳大利亚东岸湿润多雨，并孕育大堡礁的生长环境。' },
    { id: 'beng', n: '本格拉寒流', t: 'wind', k: 'cold', w: 2, link: 'wind',
      p: [[13, -32], [11, -24], [9, -16], [8, -10]],
      why: '南大西洋副热带环流东侧回流，伴随沿岸上升流。',
      eff: '降温减湿，形成纳米布沙漠沿岸的干旱与多雾。' },
    { id: 'wac', n: '西澳大利亚寒流', t: 'wind', k: 'cold', w: 2, link: 'wind',
      p: [[113, -32], [111, -24], [109, -17]],
      why: '南印度洋副热带环流东侧回流，沿澳大利亚西岸北上。',
      eff: '降温减湿，是西澳沿岸干燥气候的重要成因。' },
    { id: 'agul', n: '厄加勒斯暖流', t: 'wind', k: 'warm', w: 2, link: 'wind',
      p: [[40, -16], [34, -24], [28, -32], [22, -38]],
      why: '南印度洋副热带环流西侧的西部边界流，沿非洲东南岸南下。',
      eff: '暖湿气流影响南非东岸，使德班一带湿润。' },
    { id: 'braz', n: '巴西暖流', t: 'wind', k: 'warm', w: 2, link: 'wind',
      p: [[-38, -10], [-44, -20], [-50, -30], [-54, -38]],
      why: '南大西洋副热带环流西侧边界流，沿巴西沿岸南下。',
      eff: '与福克兰寒流交汇形成渔场。' },
    { id: 'falk', n: '福克兰寒流', t: 'wind', k: 'cold', w: 1, link: 'wind',
      p: [[-58, -41], [-57, -47], [-55, -52], [-53, -56]],
      why: '西风漂流在北侧的分支，沿南美东南岸北上。',
      eff: '与巴西暖流交汇，形成阿根廷外海的著名渔场。' },
    { id: 'monsoon', n: '北印度洋季风洋流', t: 'wind', k: 'warm', w: 2, link: 'wind',
      p: [[52, 12], [62, 15], [72, 14], [84, 11]],
      why: '北印度洋受季风控制，夏季西南季风使洋流呈顺时针方向流动，冬季则反转。',
      eff: '是世界上季节变化最显著的洋流系统，直接影响南亚航运与渔业。' },
    { id: 'somali', n: '索马里寒流', t: 'comp', k: 'cold', w: 1, link: 'comp',
      p: [[48, 2], [50, 7], [52, 11]],
      why: '夏季西南季风使索马里沿岸表层水离岸，深层冷水上涌补偿，形成上升流。',
      eff: '沿岸水温骤降、渔场兴旺，是上升流型补偿流的又一例证。' },
    { id: 'gib', n: '直布罗陀海峡密度流', t: 'dens', k: 'neutral', w: 2, link: 'dens',
      p: [[-8.5, 35.4], [-5.5, 36.0], [-2.5, 36.6]],
      why: '地中海蒸发旺盛、盐度高、密度大，底层高盐水经海峡流入大西洋，表层低盐水反向流入地中海。',
      eff: '双层反向交换的经典案例，海槛是维持这一结构的关键。' },
    { id: 'mand', n: '曼德海峡密度流', t: 'dens', k: 'neutral', w: 2, link: 'dens',
      p: [[42.2, 11.6], [43.4, 12.4], [44.6, 13.2]],
      why: '红海是世界盐度最高的海域之一，密度大的深层水经曼德海峡流出，表层海水流入补充。',
      eff: '与直布罗陀海峡同理，是密度流的又一典型实例。' }
  ];
  A.CUR = CUR;

  const typeColor = { wind: A.C.wind, dens: A.C.dens, comp: A.C.comp };
  const natColor = { warm: A.C.warm, cold: A.C.cold, neutral: 0xc8d2e0 };
  A.typeColor = typeColor;
  A.natColor = natColor;

  /* ---------- 地球 ---------- */
  const globe = new T.Group();
  G.add(globe);

  const wc = A.worldCanvas(2048, 1024, {
    oceanTop: '#0a2b40', oceanMid: '#06192a', oceanBot: '#04121d',
    land: '#3d7c96', landHi: 'rgba(150,220,240,0.55)', coast: '#c2f4ff', coastAlpha: 0.95
  });
  const landTex = new T.CanvasTexture(wc.cv);
  landTex.colorSpace = T.SRGBColorSpace;
  landTex.anisotropy = 4;

  const baseMat = new T.ShaderMaterial({
    fog: false,
    uniforms: { uMap: { value: landTex } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV;\n' +
      'void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform sampler2D uMap; varying vec2 vUv; varying vec3 vN; varying vec3 vV;\n' +
      'void main(){\n' +
      '  vec3 base = texture2D(uMap, vUv).rgb;\n' +
      '  vec3 N = normalize(vN);\n' +
      '  float lam = clamp(dot(N, normalize(vec3(-0.45,0.55,0.70))), 0.0, 1.0);\n' +
      '  vec3 col = base * (0.46 + 0.78*lam);\n' +
      '  float f = pow(1.0 - abs(dot(N, normalize(vV))), 2.6);\n' +
      '  col += vec3(0.12,0.36,0.50) * f * 0.8;\n' +
      '  gl_FragColor = vec4(col, 1.0);\n' +
      '}'
  });
  globe.add(new T.Mesh(new T.SphereGeometry(R, 96, 64), baseMat));

  const atmo = new T.Mesh(
    new T.SphereGeometry(R * 1.055, 48, 32),
    new T.ShaderMaterial({
      transparent: true, side: T.BackSide, depthWrite: false, fog: false, blending: T.AdditiveBlending,
      vertexShader: 'varying vec3 vN; varying vec3 vV;\n' +
        'void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'varying vec3 vN; varying vec3 vV;\n' +
        'void main(){ float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),2.0);\n' +
        'gl_FragColor=vec4(vec3(0.18,0.55,0.80)*f*0.9, f*0.42); }'
    })
  );
  globe.add(atmo);

  function toVec(lon, lat, r) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    return new T.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }
  A.toVec = toVec;

  /* ---------- 经纬网 ---------- */
  const gratMat = new T.LineBasicMaterial({ color: 0x63c3e0, transparent: true, opacity: 0.16, fog: false });
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 4) pts.push(toVec(lon, lat, R * 1.002));
    const g = new T.BufferGeometry().setFromPoints(pts);
    globe.add(new T.Line(g, gratMat));
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const pts = [];
    for (let lat = -88; lat <= 88; lat += 4) pts.push(toVec(lon, lat, R * 1.002));
    const g = new T.BufferGeometry().setFromPoints(pts);
    globe.add(new T.Line(g, gratMat));
  }
  // 赤道加粗
  (function () {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 3) pts.push(toVec(lon, 0, R * 1.003));
    globe.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),
      new T.LineBasicMaterial({ color: 0x8fe0ff, transparent: true, opacity: 0.35, fog: false })));
  })();

  /* ---------- 洋流 ---------- */
  const pickables = [];
  const items = [];
  const CONE_GEO = new T.ConeGeometry(1, 1, 10, 1, false);
  CONE_GEO.translate(0, -0.45, 0);   // 尖端朝 +Y，原点在锥体中后部

  CUR.forEach((c) => {
    const pts = c.p.map((q) => toVec(q[0], q[1], R * 1.014));
    const curve = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    const rad = c.w >= 3 ? 0.0105 : c.w === 2 ? 0.0075 : 0.0052;
    const geo = new T.TubeGeometry(curve, Math.max(30, pts.length * 14), rad, 7, false);
    const mat = new T.MeshBasicMaterial({
      color: typeColor[c.t], transparent: true, opacity: 0.92, depthWrite: false, fog: false
    });
    const mesh = new T.Mesh(geo, mat);
    mesh.userData.cid = c.id;
    mesh.renderOrder = 4;
    globe.add(mesh);

    const pickGeo = new T.TubeGeometry(curve, Math.max(24, pts.length * 10), Math.max(0.042, rad * 2.6), 5, false);
    const pickMesh = new T.Mesh(pickGeo, new T.MeshBasicMaterial({
      transparent: true, opacity: 0, depthWrite: false, colorWrite: false, fog: false
    }));
    pickMesh.userData.cid = c.id;
    pickMesh.renderOrder = 3;
    globe.add(pickMesh);
    pickables.push(pickMesh);

    let marker = null;
    if (c.t === 'dens') {
      marker = new T.Mesh(
        new T.SphereGeometry(0.03, 14, 14),
        new T.MeshBasicMaterial({ color: typeColor[c.t], transparent: true, opacity: 0.95, fog: false })
      );
      marker.position.copy(curve.getPointAt(0.5));
      marker.userData.cid = c.id;
      globe.add(marker);
      pickables.push(marker);
    }

    // 方向锥
    const nCone = c.w >= 3 ? 3 : 2;
    const cones = [];
    for (let k = 0; k < nCone; k++) {
      const u = (k + 1) / (nCone + 1);
      const p = curve.getPointAt(u);
      const tan = curve.getTangentAt(u).normalize();
      const cm = new T.Mesh(CONE_GEO, mat);
      cm.position.copy(p);
      cm.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), tan);
      const sc = Math.max(0.020, rad * 3.0);
      cm.scale.set(sc * 0.62, sc * 1.5, sc * 0.62);
      cm.renderOrder = 5;
      globe.add(cm);
      cones.push(cm);
    }

    items.push({ c, curve, mesh, marker, mat, cones, base: typeColor[c.t] });
  });

  /* ---------- 流动光点 ---------- */
  const NPT = 3;
  const flowPos = new Float32Array(items.length * NPT * 3);
  const flowCol = new Float32Array(items.length * NPT * 3);
  const flowGeo = new T.BufferGeometry();
  flowGeo.setAttribute('position', new T.BufferAttribute(flowPos, 3));
  flowGeo.setAttribute('color', new T.BufferAttribute(flowCol, 3));
  const flowMat = new T.PointsMaterial({
    size: 0.026, map: A.dot, vertexColors: true, transparent: true, opacity: 0.85,
    depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true, fog: false
  });
  const flowPts = new T.Points(flowGeo, flowMat);
  flowPts.frustumCulled = false;
  globe.add(flowPts);

  /* ---------- 星空 ---------- */
  const starGeo = new T.BufferGeometry();
  const sc = 1200, sp = new Float32Array(sc * 3);
  for (let i = 0; i < sc; i++) {
    const v = new T.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(30 + Math.random() * 20);
    sp[i * 3] = v.x; sp[i * 3 + 1] = v.y; sp[i * 3 + 2] = v.z;
  }
  starGeo.setAttribute('position', new T.BufferAttribute(sp, 3));
  const stars = new T.Points(starGeo, new T.PointsMaterial({
    color: 0x9fc8e0, size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.5, fog: false, depthWrite: false
  }));
  G.add(stars);

  /* ---------- 选中地名标签 ---------- */
  const selLabel = A.label('', 'accent');
  selLabel.on = false;

  /* ---------- 刷新视觉状态 ---------- */
  function colorOf(c) {
    return S.globeColor === 'type' ? typeColor[c.t] : natColor[c.k];
  }

  function refresh() {
    items.forEach((it, i) => {
      const c = it.c;
      const matchFilter = S.filter === 'all' || c.t === S.filter;
      const isSel = S.sel === c.id;
      const dim = !matchFilter ? 0.07 : (S.sel && !isSel ? 0.24 : 0.95);
      const col = colorOf(c);
      it.base = col;
      it.mat.color.setHex(isSel ? 0xffffff : col);
      it.mat.opacity = isSel ? 1 : dim;
      it.cones.forEach((cm) => { cm.visible = matchFilter; });
      if (it.marker) {
        it.marker.material.color.setHex(isSel ? 0xffffff : col);
        it.marker.material.opacity = isSel ? 1 : dim;
        it.marker.scale.setScalar(isSel ? 1.5 : 1.15);
      }
      for (let k = 0; k < NPT; k++) {
        const idx = (i * NPT + k) * 3;
        const cc = new T.Color(isSel ? 0xffffff : col);
        flowCol[idx] = cc.r; flowCol[idx + 1] = cc.g; flowCol[idx + 2] = cc.b;
      }
      if (isSel) {
        selLabel.on = true;
        selLabel.el.textContent = c.n;
        selLabel.pos.copy(it.curve.getPointAt(0.5)).multiplyScalar(1.03);
        selLabel.off = [0, -20];
      }
    });
    flowGeo.attributes.color.needsUpdate = true;
    if (!S.sel) selLabel.on = false;
    if (A.onSelectCurrent) A.onSelectCurrent(S.sel);
  }
  A.globeRefresh = refresh;

  /* ---------- 选择 ---------- */
  function select(id, fly) {
    S.sel = id;
    refresh();
    if (id && fly) {
      const it = items.find((x) => x.c.id === id);
      if (it) {
        const p = it.curve.getPointAt(0.5).normalize();
        A.viewT.theta = Math.atan2(p.x, p.z);
        A.viewT.phi = A.clamp(Math.acos(A.clamp(p.y, -1, 1)), 0.35, 2.6);
        A.viewT.radius = 3.5;
      }
    }
  }
  A.globeSelect = select;
  A.globeFocus = function (id) {
    if (A.setMode) A.setMode('globe');
    select(id, true);
  };

  const _ray = new T.Raycaster();
  function pickAt(e) {
    const ndc = new T.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    _ray.setFromCamera(ndc, A.camera);
    const hit = _ray.intersectObjects(pickables, false);
    return hit.length ? hit[0].object.userData.cid : null;
  }

  // 屏幕最近点兜底（命中更宽容）
  const _pv = new T.Vector3();
  function nearest(e, maxD) {
    let best = null, bd = maxD;
    const cp = A.camera.position;
    items.forEach((it) => {
      for (let i = 0; i <= 12; i++) {
        const p = it.curve.getPointAt(i / 12);
        if (p.clone().normalize().dot(cp.clone().normalize()) < 0.12) continue;  // 背面
        _pv.copy(p).project(A.camera);
        const sx = (_pv.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-_pv.y * 0.5 + 0.5) * window.innerHeight;
        const d = Math.hypot(sx - e.clientX, sy - e.clientY);
        if (d < bd) { bd = d; best = it.c.id; }
      }
    });
    return best;
  }
  A.pickAt = pickAt;

  A.onPick = function (e) {
    if (S.mode !== 'globe') return;
    let id = pickAt(e);
    if (!id) id = nearest(e, 22);
    if (id) select(id, true);
    else select(null, false);
  };

  A.onHover = function (e) {
    if (S.mode !== 'globe') { document.body.style.cursor = ''; return; }
    let id = pickAt(e);
    if (!id) id = nearest(e, 22);
    document.body.style.cursor = id ? 'pointer' : '';
  };

  /* ---------- 更新 ---------- */
  function update(dt) {
    items.forEach((it, i) => {
      for (let k = 0; k < NPT; k++) {
        const u = (S.t * 0.09 + k / NPT + i * 0.137) % 1;
        const p = it.curve.getPointAt(u);
        const idx = (i * NPT + k) * 3;
        flowPos[idx] = p.x; flowPos[idx + 1] = p.y; flowPos[idx + 2] = p.z;
      }
    });
    flowGeo.attributes.position.needsUpdate = true;
    atmo.rotation.y += dt * 0.02;
  }

  A.globe = { G, update, select, items };
})();
