import json, math

d = json.load(open('vendor/land-110m.json'))
tr = d['transform']; sx, sy = tr['scale']; tx, ty = tr['translate']

arcs = []
for arc in d['arcs']:
    x = y = 0; pts = []
    for dx, dy in arc:
        x += dx; y += dy
        pts.append((x*sx+tx, y*sy+ty))
    arcs.append(pts)

def ring(idxs):
    out = []
    for i in idxs:
        a = arcs[i] if i >= 0 else list(reversed(arcs[~i]))
        out.extend(a if not out else a[1:])
    return out

def rdp(pts, eps):
    if len(pts) < 3: return pts
    dmax = 0; idx = 0
    x1,y1 = pts[0]; x2,y2 = pts[-1]
    dx, dy = x2-x1, y2-y1
    norm = math.hypot(dx, dy)
    if norm < 1e-12: return [pts[0], pts[-1]]
    for i in range(1, len(pts)-1):
        x0,y0 = pts[i]
        dist = abs(dy*(x0-x1) - dx*(y0-y1)) / norm
        if dist > dmax: dmax, idx = dist, i
    if dmax > eps:
        return rdp(pts[:idx+1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]

rings = []
for geom in d['objects']['land']['geometries']:
    polys = geom['arcs'] if geom['type'] == 'MultiPolygon' else [geom['arcs']]
    for poly in polys:
        for r in poly:
            p = ring(r)
            xs = [q[0] for q in p]; ys = [q[1] for q in p]
            if (max(xs)-min(xs)) < 2.5 and (max(ys)-min(ys)) < 2.5: continue
            closed = abs(p[0][0]-p[-1][0]) < 1e-9 and abs(p[0][1]-p[-1][1]) < 1e-9
            body = p[:-1] if closed else p
            if len(body) < 4: continue
            # split at index 0 rotate: use first point as anchor, simplify open polyline
            s = rdp(body, 0.4)
            if closed: s = s + [s[0]]
            rings.append([[round(a,1), round(b,1)] for a,b in s])

clean = []
for r in rings:
    out = [r[0]]
    for p in r[1:]:
        if p != out[-1]: out.append(p)
    if len(out) >= 4: clean.append(out)

n = sum(len(r) for r in clean)
print('rings', len(clean), 'points', n)
js = 'const LAND_RINGS=' + json.dumps(clean, separators=(',',':')) + ';'
open('vendor/land.js','w').write(js)
print('bytes', len(js))
