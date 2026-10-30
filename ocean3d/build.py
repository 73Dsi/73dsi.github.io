import io, re, os
tpl = open('template.html', encoding='utf-8').read()
parts = {
  'THREE': 'vendor/three.min.js',
  'LAND':  'vendor/land.js',
  'CORE':  'core.js',
  'WIND':  'wind.js',
  'DENS':  'dens.js',
  'COMP':  'comp.js',
  'GLOBE': 'globe.js',
  'UI':    'ui.js',
}
for k, p in parts.items():
    src = open(p, encoding='utf-8').read()
    tpl = tpl.replace('/*__%s__*/' % k, '\n' + src + '\n')
out = '../洋流动力密码.html'
open(out, 'w', encoding='utf-8').write(tpl)
print(out, round(os.path.getsize(out)/1024), 'KB')
