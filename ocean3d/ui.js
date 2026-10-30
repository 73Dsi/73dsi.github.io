/* ============ UI / 交互 / 主循环 ============ */
(function () {
  const T = THREE, A = window.APP, S = A.S;

  const panel = document.getElementById('panel');
  const modebar = document.getElementById('modebar');
  const chips = document.getElementById('chips');
  const caption = document.getElementById('caption');
  const card = document.getElementById('card');
  const boot = document.getElementById('boot');

  const TYPE_CN = { wind: '风海流', dens: '密度流', comp: '补偿流' };
  const MODE_CN = { wind: '风海流', dens: '密度流', comp: '补偿流', globe: '全球联动', map: '平面世界地图' };

  function h(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---------------- 模式切换 ---------------- */
  const MODES = [
    { id: 'wind', no: '01', name: '风海流', sub: '风的手指' },
    { id: 'dens', no: '02', name: '密度流', sub: '沉默的门槛' },
    { id: 'comp', no: '03', name: '补偿流', sub: '海的回声' },
    { id: 'globe', no: '04', name: '全球洋流', sub: '归因与联动' },
    { id: 'map', no: '05', name: '平面地图', sub: '课本视角' }
  ];

  MODES.forEach((m) => {
    const b = h('button', 'mode');
    b.dataset.mode = m.id;
    b.innerHTML = '<i>' + m.no + '</i><b>' + m.name + '</b><span>' + m.sub + '</span>';
    b.onclick = () => setMode(m.id);
    modebar.appendChild(b);
  });

  function setMode(mode) {
    S.mode = mode;
    document.querySelectorAll('.mode').forEach((el) => el.classList.toggle('on', el.dataset.mode === mode));
    for (const k in A.scenes) A.scenes[k].visible = (k === mode);
    document.body.classList.toggle('flat', mode === 'map');
    if (mode === 'comp' && A.comp) {
      if (A.comp.GV) A.comp.GV.visible = S.compKind !== 'h';
      if (A.comp.GH) A.comp.GH.visible = S.compKind === 'h';
    }
    A.goView(mode === 'comp' ? (S.compKind === 'h' ? 'comph' : 'comp') : mode);
    if (mode !== 'globe' && mode !== 'map') card.classList.remove('show');
    buildPanel();
    if ((mode === 'globe' || mode === 'map') && A.globeRefresh) A.globeRefresh();
    if (mode === 'map' && A.mapEnter) A.mapEnter();
    updateCaption();
  }
  A.setMode = setMode;

  /* ---------------- 控件 ---------------- */
  function slider(label, min, max, step, val, fmt, onInput) {
    const wrap = h('div', 'ctl');
    const top = h('div', 'ctl-top');
    top.appendChild(h('span', 'ctl-label', label));
    const v = h('span', 'ctl-val', fmt(val));
    top.appendChild(v);
    wrap.appendChild(top);
    const inp = h('input', 'rng');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
    inp.oninput = () => {
      const x = parseFloat(inp.value);
      v.textContent = fmt(x);
      onInput(x);
      updateCaption();
    };
    wrap.appendChild(inp);
    panel.appendChild(wrap);
    return { set: (x) => { inp.value = x; v.textContent = fmt(x); } };
  }

  function toggle(label, on, onClick) {
    const row = h('div', 'ctl row');
    row.appendChild(h('span', 'ctl-label', label));
    const sw = h('button', 'sw' + (on ? ' on' : ''));
    sw.innerHTML = '<i></i>';
    sw.onclick = () => {
      const next = !sw.classList.contains('on');
      sw.classList.toggle('on', next);
      onClick(next);
      updateCaption();
    };
    row.appendChild(sw);
    panel.appendChild(row);
    return sw;
  }

  function seg(label, opts, val, onPick) {
    const wrap = h('div', 'ctl');
    wrap.appendChild(h('div', 'ctl-label', label));
    const box = h('div', 'seg');
    opts.forEach((o) => {
      const b = h('button', 'segbtn' + (o.v === val ? ' on' : ''), o.t);
      b.onclick = () => {
        box.querySelectorAll('.segbtn').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        onPick(o.v);
        updateCaption();
      };
      box.appendChild(b);
    });
    wrap.appendChild(box);
    panel.appendChild(wrap);
  }

  function note(text) {
    const n = h('p', 'note', text);
    panel.appendChild(n);
    return n;
  }

  function links(list) {
    const wrap = h('div', 'links');
    wrap.appendChild(h('div', 'ctl-label', '关联洋流 · 点击去全球定位'));
    const box = h('div', 'linkbox');
    list.forEach(([id, name]) => {
      const b = h('button', 'link', name);
      b.onclick = () => A.globeFocus(id);
      box.appendChild(b);
    });
    wrap.appendChild(box);
    panel.appendChild(wrap);
  }

  /* ---------------- 面板 ---------------- */
  function buildPanel() {
    panel.innerHTML = '';
    const head = h('div', 'phead');
    head.appendChild(h('h3', null, MODE_CN[S.mode]));
    head.appendChild(h('span', 'phint', S.mode === 'globe' ? '点击洋流' : '拖动参数'));
    panel.appendChild(head);

    if (S.mode === 'wind') {
      slider('风速', 0, 20, 0.5, S.wind, (v) => v.toFixed(1) + ' m/s', (v) => (S.wind = v));
      slider('地球自转（科里奥利）', 0, 100, 1, S.rot * 100, (v) => v.toFixed(0) + '%', (v) => (S.rot = v / 100));
      seg('半球', [{ v: '1', t: '北半球（右偏）' }, { v: '-1', t: '南半球（左偏）' }], String(S.hemi), (v) => (S.hemi = parseInt(v, 10)));
      toggle('力的透视镜', S.forces, (v) => (S.forces = v));
      note('把自转调到 0%，看螺旋如何消失——净输送也从 90° 回到 0°。');
      links([['kuro', '黑潮'], ['npw', '北太平洋暖流'], ['acc', '西风漂流']]);
    }

    if (S.mode === 'dens') {
      slider('盐度差（地中海 − 大西洋）', 0, 4, 0.1, S.sal, (v) => v.toFixed(1) + '‰', (v) => (S.sal = v));
      slider('海槛深度', -28, -8, 0.5, S.sill, (v) => v.toFixed(0) + ' m', (v) => { S.sill = v; A.dens.rebuild(); });
      const bar = h('div', 'gauge');
      bar.innerHTML = '<span>交换强度</span><div class="bar"><i></i></div>';
      panel.appendChild(bar);
      A._densBar = bar.querySelector('i');
      note('海槛越浅，高盐水越难翻越；抬到 −10 m 附近，交换几乎中断。');
      links([['gib', '直布罗陀'], ['mand', '曼德海峡']]);
    }

    if (S.mode === 'comp') {
      seg('补偿类型', [
        { v: 'v', t: '垂直补偿 · 上升流' },
        { v: 'h', t: '水平补偿 · 赤道逆流' }
      ], S.compKind, (v) => { if (A.comp) A.comp.setKind(v); buildPanel(); });
      if (S.compKind === 'h') {
        slider('信风强度', 0, 15, 0.5, S.offshore, (v) => v.toFixed(1) + ' m/s', (v) => (S.offshore = v));
        const bar = h('div', 'gauge');
        bar.innerHTML = '<span>东西向补偿强度</span><div class="bar cold"><i></i></div>';
        panel.appendChild(bar);
        A._compBar = bar.querySelector('i');
        note('南北赤道暖流把水带向西，赤道海区水位降低；西侧的海水因此自西向东回流补充，形成赤道逆流。');
        links([['ecc', '赤道逆流'], ['nep', '北赤道暖流']]);
      } else {
        slider('离岸风（东南信风）', 0, 15, 0.5, S.offshore, (v) => v.toFixed(1) + ' m/s', (v) => (S.offshore = v));
        toggle('厄尔尼诺模式', S.elnino, (v) => (S.elnino = v));
        const bar = h('div', 'gauge');
        bar.innerHTML = '<span>上升流强度</span><div class="bar cold"><i></i></div>';
        panel.appendChild(bar);
        A._compBar = bar.querySelector('i');
        note('先流走，再补充——注意箭头出现的时间差；这就是“垂直补偿”。');
        links([['peru', '秘鲁寒流'], ['somali', '索马里寒流']]);
      }
    }

    if (S.mode === 'map') {
      seg('着色方式', [{ v: 'type', t: '按成因' }, { v: 'nature', t: '按性质' }], S.globeColor, (v) => {
        S.globeColor = v; if (A.globeRefresh) A.globeRefresh();
      });
      seg('筛选', [
        { v: 'all', t: '全部' }, { v: 'wind', t: '风海流' },
        { v: 'dens', t: '密度流' }, { v: 'comp', t: '补偿流' }
      ], S.filter, (v) => { S.filter = v; if (A.globeRefresh) A.globeRefresh(); });
      const lg = h('div', 'legend');
      lg.innerHTML =
        '<div><i style="background:#f2a24a"></i>风海流</div>' +
        '<div><i style="background:#b46cf0"></i>密度流</div>' +
        '<div><i style="background:#35d0a0"></i>补偿流</div>' +
        '<div class="sep"></div>' +
        '<div><i style="background:#ff7a59"></i>暖流</div>' +
        '<div><i style="background:#4fc3ff"></i>寒流</div>';
      panel.appendChild(lg);
      note('课本视角：线越粗洋流越重要，虚线在流动；点击任意洋流查看成因。');
    }

    if (S.mode === 'globe') {
      seg('着色方式', [{ v: 'type', t: '按成因' }, { v: 'nature', t: '按性质' }], S.globeColor, (v) => {
        S.globeColor = v; A.globeRefresh();
      });
      seg('筛选', [
        { v: 'all', t: '全部' }, { v: 'wind', t: '风海流' },
        { v: 'dens', t: '密度流' }, { v: 'comp', t: '补偿流' }
      ], S.filter, (v) => { S.filter = v; A.globeRefresh(); });
      const lg = h('div', 'legend');
      lg.innerHTML =
        '<div><i style="background:#f2a24a"></i>风海流</div>' +
        '<div><i style="background:#b46cf0"></i>密度流</div>' +
        '<div><i style="background:#35d0a0"></i>补偿流</div>' +
        '<div class="sep"></div>' +
        '<div><i style="background:#ff7a59"></i>暖流</div>' +
        '<div><i style="background:#4fc3ff"></i>寒流</div>';
      panel.appendChild(lg);
      note('成因分类与寒暖性质是两套标签——切换着色方式体会一下区别。');
    }
  }

  /* ---------------- 字幕 / 读数 ---------------- */
  function updateCaption() {
    let t = '';
    if (S.mode === 'wind') {
      t = S.rot < 0.02
        ? '自转关闭：表层海水顺着风走，螺旋消失，净输送与风向重合——偏转 90° 的力量来自地球。'
        : '风推着表层水走，水却偏了 45°；越往深处越慢、越偏，整层净输送与风向成 90°。';
    } else if (S.mode === 'dens') {
      t = A.dens.strength() < 0.12
        ? '海槛太浅：高盐水翻不过去，两侧水体几乎停止交换。'
        : '地中海又热又咸，密度大——底层重水翻过海槛流进大西洋，表层轻水反向补进来。';
    } else if (S.mode === 'comp' && S.compKind === 'h') {
      t = '南北两支赤道暖流把水带向西，赤道海区水位降低——西侧海水自西向东回流，形成赤道逆流，这是“水平补偿”。';
    } else if (S.mode === 'comp') {
      t = S.elnino
        ? '厄尔尼诺：信风减弱，上升流受抑，营养盐供应中断，渔获骤减。'
        : '离岸风把表层水推走，近岸水位降低，深层冷水被动上涌——渔场就是这样来的。';
    } else if (S.mode === 'map') {
      t = S.sel ? '' : '平面世界地图：粗线是主干洋流，流动虚线表示方向；点击任意洋流看它属于哪一类成因。';
    } else {
      t = S.sel ? '' : '拖动地球，点击任意一条洋流，看它属于哪一类成因；也可以按成因筛选。';
    }
    caption.textContent = t;
    caption.style.opacity = t ? '1' : '0';
  }

  function drawChips() {
    let arr = [];
    if (S.mode === 'wind') {
      const ang = 45 * S.rot;
      const side = S.hemi > 0 ? '右' : '左';
      arr = [
        ['风速', S.wind.toFixed(1) + ' m/s'],
        ['表层偏角', ang < 0.5 ? '0°' : side + ' ' + ang.toFixed(0) + '°'],
        ['净输送偏角', ang < 0.5 ? '0°' : side + ' 90°'],
        ['表层流速', (S.wind * 0.03).toFixed(2) + ' m/s']
      ];
    } else if (S.mode === 'dens') {
      const st = A.dens.strength();
      arr = [
        ['交换强度', (st * 100).toFixed(0) + '%'],
        ['海槛深度', S.sill.toFixed(0) + ' m'],
        ['盐度差', S.sal.toFixed(1) + '‰']
      ];
      if (A._densBar) A._densBar.style.width = Math.round(A.clamp(st, 0, 1) * 100) + '%';
    } else if (S.mode === 'comp' && S.compKind === 'h') {
      const w = S.offshore;
      arr = [
        ['信风', w.toFixed(1) + ' m/s'],
        ['东西补偿', (A.clamp(w / 12, 0, 1) * 100).toFixed(0) + '%'],
        ['流向', '自西向东']
      ];
      if (A._compBar) A._compBar.style.width = Math.round(A.clamp(w / 12, 0, 1) * 100) + '%';
    } else if (S.mode === 'comp') {
      const w = A.comp.windNow();
      arr = [
        ['离岸风', w.toFixed(1) + ' m/s'],
        ['上升流', (A.clamp(w / 12, 0, 1) * 100).toFixed(0) + '%'],
        ['渔获指数', (A.clamp(w / 12, 0, 1) * 100).toFixed(0)]
      ];
      if (A._compBar) A._compBar.style.width = Math.round(A.clamp(w / 12, 0, 1) * 100) + '%';
    } else {
      const n = A.CUR.filter((c) => S.filter === 'all' || c.t === S.filter).length;
      arr = [['洋流', n + ' 条'], ['着色', S.globeColor === 'type' ? '按成因' : '按性质']];
    }
    chips.innerHTML = arr.map((a) => '<span class="chip"><em>' + a[0] + '</em>' + a[1] + '</span>').join('');
  }

  /* ---------------- 洋流卡片 ---------------- */
  let cardOpen = false;
  A.onSelectCurrent = function (id) {
    if (!id) { card.classList.remove('show'); return; }
    const c = A.CUR.find((x) => x.id === id);
    if (!c) return;
    const col = '#' + (S.globeColor === 'type' ? A.typeColor[c.t] : A.natColor[c.k]).toString(16).padStart(6, '0');
    const nat = c.k === 'warm' ? '暖流' : c.k === 'cold' ? '寒流' : '双层交换';
    card.innerHTML =
      '<div class="cmini"><span class="dot" style="background:' + col + '"></span>' +
      '<b>' + c.n + '</b><em>' + TYPE_CN[c.t] + ' · ' + nat + '</em>' +
      '<button class="x">×</button><button class="ctog">▼</button></div>' +
      '<div class="cbody">' +
      '<p class="why">' + c.why + '</p>' +
      '<p class="eff">' + c.eff + '</p>' +
      '<button class="go">看它怎么形成 →</button></div>';
    card.classList.add('show');
    card.classList.toggle('open', cardOpen);
    card.querySelector('.x').onclick = (ev) => { ev.stopPropagation(); A.globeSelect(null, false); };
    card.querySelector('.ctog').onclick = (ev) => {
      ev.stopPropagation();
      cardOpen = !cardOpen;
      card.classList.toggle('open', cardOpen);
    };
    card.querySelector('.cmini').onclick = () => { cardOpen = true; card.classList.add('open'); };
    card.querySelector('.go').onclick = () => A.setMode(c.link);
  };

  /* ---------------- 主循环 ---------------- */
  const clock = new T.Clock();
  let frame = 0;

  function tick() {
    requestAnimationFrame(tick);
    const raw = Math.min(clock.getDelta(), 0.06);
    const dt = S.playing ? raw * S.speed : 0;
    S.t += dt;

    const g = A.scenes[S.mode];
    if (g) {
      if (S.mode === 'wind') A.wind.update(dt);
      else if (S.mode === 'dens') A.dens.update(dt);
      else if (S.mode === 'comp') A.comp.update(dt);
      else if (S.mode === 'globe') A.globe.update(dt);
    }
    if (S.mode === 'map' && A.map2d) A.map2d.update(dt);

    A.updateCamera();
    A.updateLabels();
    A.renderer.render(A.scene, A.camera);

    if (frame % 6 === 0) drawChips();
    frame++;
    if (boot && frame === 2) boot.classList.add('gone');
  }

  /* ---------------- 启动 ---------------- */
  setMode('wind');
  A.goView('wind', true);
  tick();

  window.addEventListener('keydown', (e) => {
    const map = { '1': 'wind', '2': 'dens', '3': 'comp', '4': 'globe', '5': 'map' };
    if (map[e.key]) setMode(map[e.key]);
    if (e.key === ' ') { S.playing = !S.playing; }
  });
})();
