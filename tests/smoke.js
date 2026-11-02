// 用法: node tests/smoke.js [extra-route ...]
// 逐个打开 tests/routes.json 中的路由，检查：无 console error / pageerror、页面主区域有内容、需求文档面板存在
const { chromium } = require('playwright-core');
const fs = require('fs');
const routes = process.argv.length > 2 ? process.argv.slice(2) : JSON.parse(fs.readFileSync(__dirname + '/routes.json', 'utf8'));
const needDoc = !process.env.NO_DOC;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  let errs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html') + '#/workbench'); await p.waitForTimeout(500);
  let bad = 0;
  for (const r of routes) {
    errs = [];
    await p.evaluate(h => { location.hash = '#' + h; }, r); await p.waitForTimeout(450);
    const info = await p.evaluate(() => { const m = document.querySelector('.main'); return { len: m ? m.innerText.trim().length : 0, doc: !!document.querySelector('.doc-panel, .doc-fab'), h1: (document.querySelector('.main h1') || {}).innerText || '' }; });
    const problems = [];
    if (errs.length) problems.push(...errs);
    if (info.len < 30) problems.push('页面内容几乎为空');
    if (needDoc && !info.doc) problems.push('缺少需求文档面板(.doc-panel/.doc-fab)');
    console.log((problems.length ? 'FAIL ' : 'ok   ') + r + '  [' + info.h1 + ']');
    problems.forEach(x => console.log('       - ' + x)); if (problems.length) bad++;
  }
  console.log(bad ? `\n${bad} 个路由有问题` : '\n全部路由通过');
  await b.close(); process.exit(bad ? 1 : 0);
})();
