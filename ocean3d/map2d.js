/* ============ 第五幕：平面世界地图 ============ */
(function () {
  const T = THREE, A = window.APP, S = A.S;

  const cv = document.getElementById('flatmap');
  const ctx = cv.getContext('2d');

  let W = 0, H = 0, DPR = 1;
  let base = null;          // 预渲染的海陆底图
  let geo = null;           // 绘图区
  let hoverId = null;

  const MODE = 'map';

  /* ---------- 底图 ---------- */
  function buildBase() {
    const wc = A.worldCanvas(2048, 1024, {
      oceanTop: '#0b2f47', oceanMid: '#071d2d', oceanBot: '#05131e',
      land: '#3d7c96', landHi: 'rgba(150,220,240,0.55)', coast: '#c2f4ff', coastAlpha: 0.95
    });
    base = wc.cv;
  }

  /* ---------- 尺寸 ---------- */
  function layout() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';

    const padL = 262, padR = 348, padT = 74, padB = 132;
    let w = Math.max(420, W - padL - padR);
    let h = w / 2;
    const maxH = H - padT - padB;
    if (h > maxH) { h = maxH; w = h * 2; }
    geo = {
      x: Math.round(padL + (W - padL - padR - w) / 2),
      y: Math.round(padT + (maxH - h) / 2),
      w: Math.round(w), h: Math.round(h)
    };
  }

  const X = (lon) => geo.x + (lon + 180) / 360 * geo.w;
  const Y = (lat) => geo.y + (90 - lat) / 180 * geo.h;

  /* ---------- 序贯经度 ---------- */
  function seqLon(pts) {
    const out = [[pts[0][0], pts[0][1]]];
    for (let i = 1; i < pts.length; i++) {
      let prev = out[i - 1][0];
      let dl = pts[i][0] - prev;
      while (dl > 180) dl -= 360;
      while (dl < -180) dl += 360;
      out.push([prev + dl, pts[i][1]]);
    }
    return out;
  }

  function sampleCatmull(seq, n) {
    const out = [];
    for (let i = 0; i < seq.length - 1; i++) {
      const p0 = seq[Math.max(0, i - 1)], p1 = seq[i], p2 = seq[i + 1], p3 = seq[Math.min(seq.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        const lon = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        const lat = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        out.push([lon, lat]);
      }
    }
    out.push([seq[seq.length - 1][0], seq[seq.length - 1][1]]);
    return out;
  }

  const CACHE = {};
  function pathOf(c) {
    if (!CACHE[c.id]) {
      const s = sampleCatmull(seqLon(c.p), 12);
      CACHE[c.id] = s;
    }
    return CACHE[c.id];
  }

  function colorOf(c) {
    return S.globeColor === 'type' ? A.typeColor[c.t] : A.natColor[c.k];
  }
  function css(hex, a) {
    const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  /* ---------- 绘制 ---------- */
  function draw() {
    if (!geo) layout();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // 外框
    ctx.save();
    ctx.beginPath();
    roundRect(geo.x - 14, geo.y - 14, geo.w + 28, geo.h + 28, 16);
    ctx.fillStyle = 'rgba(8,18,28,.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,230,.16)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 海陆底图
    if (!base) buildBase();
    ctx.save();
    ctx.beginPath();
    roundRect(geo.x, geo.y, geo.w, geo.h, 3);
    ctx.clip();
    ctx.drawImage(base, geo.x, geo.y, geo.w, geo.h);

    // 经纬网
    ctx.strokeStyle = 'rgba(120,200,230,.13)';
    ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath(); ctx.moveTo(geo.x, Y(lat)); ctx.lineTo(geo.x + geo.w, Y(lat)); ctx.stroke();
    }
    for (let lon = -150; lon <= 150; lon += 30) {
      ctx.beginPath(); ctx.moveTo(X(lon), geo.y); ctx.lineTo(X(lon), geo.y + geo.h); ctx.stroke();
    }
    // 赤道 / 回归线
    ctx.strokeStyle = 'rgba(143,224,255,.42)';
    ctx.beginPath(); ctx.moveTo(geo.x, Y(0)); ctx.lineTo(geo.x + geo.w, Y(0)); ctx.stroke();
    ctx.strokeStyle = 'rgba(242,162,74,.22)';
    ctx.setLineDash([4, 5]);
    [23.5, -23.5].forEach((lat) => {
      ctx.beginPath(); ctx.moveTo(geo.x, Y(lat)); ctx.lineTo(geo.x + geo.w, Y(lat)); ctx.stroke();
    });
    ctx.setLineDash([]);

    // 纬度刻度
    ctx.save();
    ctx.font = '8.5px "PingFang SC",sans-serif';
    ctx.fillStyle = 'rgba(160,205,225,.4)';
    ctx.textBaseline = 'middle';
    [60, 30, 0, -30, -60].forEach((lat) => {
      ctx.fillText((lat === 0 ? '0°' : Math.abs(lat) + '°' + (lat > 0 ? 'N' : 'S')), geo.x + 5, Y(lat) + (lat === 0 ? -7 : 0));
    });
    ctx.restore();

    // 洋流
    const t = S.t;
    A.CUR.forEach((c) => {
      const matchFilter = S.filter === 'all' || c.t === S.filter;
      const isSel = S.sel === c.id;
      const isHover = hoverId === c.id;
      if (!matchFilter && !isSel) return;
      const col = isSel ? 0xffffff : colorOf(c);
      const alpha = isSel ? 1 : (S.sel ? 0.52 : 0.95);
      const lw = c.w >= 3 ? 2.6 : c.w === 2 ? 1.9 : 1.35;
      const pts = pathOf(c);

      for (const shift of [-geo.w, 0, geo.w]) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(geo.x, geo.y, geo.w, geo.h);
        ctx.clip();

        // 底层柔光
        ctx.beginPath();
        pts.forEach((p, i) => {
          const x = X(p[0]) + shift, y = Y(p[1]);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = css(col, alpha * 0.16);
        ctx.lineWidth = lw * 3.4;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // 主体
        ctx.strokeStyle = css(col, alpha * (isHover ? 1 : 0.82));
        ctx.lineWidth = lw;
        ctx.stroke();

        // 流动虚线
        ctx.setLineDash([6, 13]);
        ctx.lineDashOffset = -((t * 34) % 19);
        ctx.strokeStyle = css(0xffffff, alpha * (isSel ? 0.95 : 0.5));
        ctx.lineWidth = Math.max(1, lw * 0.55);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // 箭头
      if (alpha > 0.5) {
        const us = c.w >= 3 ? [0.3, 0.62, 0.88] : [0.45, 0.85];
        us.forEach((u) => {
          const i = Math.min(pts.length - 1, Math.round(u * (pts.length - 1)));
          const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)];
          let x = X(p[0]), y = Y(p[1]);
          let dx = X(q[0]) - x, dy = Y(q[1]) - y;
          const len = Math.hypot(dx, dy) || 1;
          dx /= len; dy /= len;
          const s = c.w >= 3 ? 7 : 5.4;
          ctx.beginPath();
          ctx.moveTo(x + dx * s, y + dy * s);
          ctx.lineTo(x - dy * s * 0.72 - dx * s * 0.5, y + dx * s * 0.72 - dy * s * 0.5);
          ctx.lineTo(x + dy * s * 0.72 - dx * s * 0.5, y - dx * s * 0.72 - dy * s * 0.5);
          ctx.closePath();
          ctx.fillStyle = css(col, alpha);
          ctx.fill();
        });
      }
    });

    ctx.restore();

    // 地名标签
    drawLabels();

    // 小标题
    ctx.save();
    ctx.font = '11px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillStyle = 'rgba(150,190,210,.75)';
    ctx.fillText(S.globeColor === 'type' ? '按成因着色' : '按性质着色', geo.x, geo.y - 24);
    ctx.fillStyle = 'rgba(120,160,180,.55)';
    ctx.fillText('点击任意洋流查看成因', geo.x + 88, geo.y - 24);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawLabels() {
    const boxes = [];
    ctx.font = '10.5px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textBaseline = 'middle';
    const list = A.CUR.filter((c) => (S.filter === 'all' || c.t === S.filter) && c.w >= 2);
    const cx = geo.x + geo.w * 0.5;
    list.forEach((c) => {
      const pts = pathOf(c);
      let bestI = -1, bestD = 1e9;
      for (let i = 0; i < pts.length; i++) {
        const xx = X(pts[i][0]);
        if (xx < geo.x + 24 || xx > geo.x + geo.w - 24) continue;
        const d = Math.abs(xx - cx);
        if (d < bestD) { bestD = d; bestI = i; }
      }
      if (bestI < 0) return;
      const p = pts[bestI];
      const x = X(p[0]), y = Y(p[1]);
      const w = ctx.measureText(c.n).width + 8;
      const box = { x: x - w / 2, y: y - 15, w, h: 14 };
      if (boxes.some((b) => !(box.x > b.x + b.w || box.x + box.w < b.x || box.y > b.y + b.h || box.y + box.h < b.y))) return;
      boxes.push(box);
      const isSel = S.sel === c.id;
      const col = isSel ? 0xffffff : colorOf(c);
      ctx.fillStyle = 'rgba(4,10,16,.66)';
      ctx.beginPath();
      roundRect(box.x, box.y, box.w, box.h, 4);
      ctx.fill();
      ctx.fillStyle = css(col, S.sel && !isSel ? 0.55 : 0.95);
      ctx.fillText(c.n, box.x + 4, box.y + 7);
    });
  }

  /* ---------- 命中 ---------- */
  function hit(e) {
    if (!geo) return null;
    let best = null, bestD = 12;
    A.CUR.forEach((c) => {
      if (S.filter !== 'all' && c.t !== S.filter) return;
      const pts = pathOf(c);
      for (let shift = -1; shift <= 1; shift++) {
        for (let i = 0; i < pts.length - 1; i++) {
          const x1 = X(pts[i][0]) + shift * geo.w, y1 = Y(pts[i][1]);
          const x2 = X(pts[i + 1][0]) + shift * geo.w, y2 = Y(pts[i + 1][1]);
          if (Math.max(x1, x2) < geo.x - 40 || Math.min(x1, x2) > geo.x + geo.w + 40) continue;
          const d = segDist(e.clientX, e.clientY, x1, y1, x2, y2);
          if (d < bestD) { bestD = d; best = c.id; }
        }
      }
    });
    return best;
  }

  function segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  /* ---------- 事件 ---------- */
  window.addEventListener('resize', () => { layout(); });

  cv.addEventListener('pointermove', (e) => {
    if (S.mode !== MODE) return;
    const id = hit(e);
    hoverId = id;
    cv.style.cursor = id ? 'pointer' : 'default';
  });
  cv.addEventListener('pointerup', (e) => {
    if (S.mode !== MODE) return;
    const id = hit(e);
    A.globeSelect(id, false);
  });

  A.map2d = {
    update() { if (S.mode === MODE) draw(); },
    enter() { layout(); draw(); },
    colorOf
  };
  A.mapEnter = function () { layout(); draw(); };
})();
