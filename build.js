const fs = require('fs');
// 文件顺序：data.js → data-*.js → comp-common.js → comp-*.js → page-*.js → app.js（全部按字母序自动收录）
const all = fs.readdirSync('src').filter(f => f.endsWith('.js'));
const order = [
  'data.js',
  ...all.filter(f => /^data-.+\.js$/.test(f)).sort(),
  'comp-common.js',
  ...all.filter(f => /^comp-.+\.js$/.test(f) && f !== 'comp-common.js').sort(),
  ...all.filter(f => /^page-.+\.js$/.test(f)).sort(),
  'app.js',
];
console.log('build order:', order.join(' > '));
const js = order.map(f => fs.readFileSync('src/' + f, 'utf8')).join('\n');
const css = fs.readFileSync('src/style.css', 'utf8');
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>企业级 CRM 系统 · 高保真原型</title>
<link rel="stylesheet" href="lib/element-plus.css">
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
<script src="lib/vue.global.prod.js"></script>
<script src="lib/element-plus.min.js"></script>
<script src="lib/zh-cn.min.js"></script>
<script src="lib/icons.min.js"></script>
<script src="lib/echarts.min.js"></script>
<script>
${js}
</script>
</body>
</html>`;
fs.writeFileSync('index.html', html);
console.log('built', html.length);
