// 用法: node tests/theme-doc.js
// 验证：四套主题（data-theme + localStorage + --el-color-primary 计算值互不相同）；
//       文档面板三种状态切换（localStorage 持久）；新增条目刷新仍在；恢复默认生效。
const { chromium } = require('playwright-core');
(async () => {
  const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html') + '#/workbench';
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  let errs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text().slice(0, 240)); });
  p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  const fails = [];
  const check = (name, ok, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); if (!ok) fails.push(name); };
  const ls = () => p.evaluate(() => localStorage);
  await p.goto(URL); await p.waitForTimeout(600);
  await p.evaluate(() => localStorage.clear());
  await p.reload(); await p.waitForTimeout(600);

  /* ========== 1. 主题 ========== */
  const getTheme = () => p.evaluate(() => ({ t: document.documentElement.dataset.theme, v: getComputedStyle(document.documentElement).getPropertyValue('--el-color-primary').trim(), ls: localStorage.getItem('crm_theme') }));
  let s = await getTheme();
  check('默认主题为天蓝', s.t === 'sky' && s.ls === 'sky' && s.v === '#2f9bff', JSON.stringify(s));
  const colors = { sky: s.v };
  const openMenu = async () => { await p.click('.icon-btn[title="主题切换"]'); await p.waitForSelector('.el-dropdown-menu__item', { timeout: 3000 }); };
  const pick = async name => { await p.click(`.el-dropdown-menu__item:has-text("${name}")`); await p.waitForTimeout(250); };
  for (const [name, key] of [['粉', 'pink'], ['白', 'white'], ['灰', 'gray'], ['天蓝', 'sky']]) {
    await openMenu(); await pick(name);
    s = await getTheme();
    check(`切换主题 ${key}`, s.t === key && s.ls === key, JSON.stringify(s));
    colors[key] = s.v;
    if (key !== 'sky') await p.screenshot({ path: '/tmp/crm-shots/theme-' + key + '.png' }).catch(() => {});
  }
  const uniq = new Set(Object.values(colors));
  check('四套主题 --el-color-primary 计算值互不相同', uniq.size === 4, JSON.stringify(colors));
  // 刷新后恢复
  await openMenu(); await pick('粉');
  await p.reload(); await p.waitForTimeout(500);
  s = await getTheme();
  check('刷新后主题恢复（pink）', s.t === 'pink' && s.ls === 'pink', JSON.stringify(s));

  /* ========== 2. 文档面板三种状态 ========== */
  const state = () => p.evaluate(() => ({ m: localStorage.getItem('crm_doc_state'), half: !!document.querySelector('.doc-panel.half'), full: !!document.querySelector('.doc-panel.full'), fab: !!document.querySelector('.doc-fab') }));
  let d = await state();
  check('默认文档面板状态 half', d.m === 'half' && d.half, JSON.stringify(d));
  await p.click('.doc-panel.half .doc-act-full'); await p.waitForTimeout(150);
  d = await state();
  check('half → full 切换', d.m === 'full' && d.full && !d.fab, JSON.stringify(d));
  await p.click('.doc-panel.full .doc-act-half'); await p.waitForTimeout(150);
  d = await state();
  check('full → half 切换', d.m === 'half' && d.half, JSON.stringify(d));
  await p.click('.doc-panel.half .doc-act-hide'); await p.waitForTimeout(150);
  d = await state();
  check('half → hidden 切换（只剩浮标）', d.m === 'hidden' && d.fab && !d.half && !d.full, JSON.stringify(d));
  await p.click('.doc-fab'); await p.waitForTimeout(150);
  d = await state();
  check('浮标点击 → half', d.m === 'half' && d.half, JSON.stringify(d));

  /* ========== 3. 新增条目持久化 ========== */
  const TXT = '测试新增条目XYZ123';
  await p.click('.doc-panel.half .doc-act-full'); await p.waitForTimeout(150);
  await p.click('.doc-sec .doc-add >> nth=0'); await p.waitForTimeout(300);
  await p.fill('.el-message-box__input textarea', TXT);
  await p.click('.el-message-box__btns .el-button--primary'); await p.waitForTimeout(300);
  d = await p.evaluate(() => ({ shown: document.querySelector('.doc-item') && !!Array.from(document.querySelectorAll('.doc-item')).some(x => x.innerText.includes('测试新增条目XYZ123')), saved: JSON.parse(localStorage.getItem('crm_docs_v1') || '{}')['workbench'] }));
  check('新增条目显示且写入 localStorage', d.shown && !!d.saved, JSON.stringify(d).slice(0, 160));
  await p.reload(); await p.waitForTimeout(500);
  d = await p.evaluate(() => !!Array.from(document.querySelectorAll('.doc-item')).some(x => x.innerText.includes('测试新增条目XYZ123')));
  check('刷新后新增条目仍然存在', d);

  /* ========== 4. 恢复默认 ========== */
  await p.click('button:has-text("恢复默认（本页）")'); await p.waitForTimeout(300);
  await p.click('.el-message-box__btns .el-button--primary'); await p.waitForTimeout(300);
  d = await p.evaluate(() => ({ gone: !Array.from(document.querySelectorAll('.doc-item')).some(x => x.innerText.includes('测试新增条目XYZ123')), saved: JSON.parse(localStorage.getItem('crm_docs_v1') || '{}')['workbench'] }));
  check('恢复默认后条目消失且本地覆盖被清除', d.gone && !d.saved, JSON.stringify(d));

  if (errs.length) { console.log('\n控制台问题:'); errs.forEach(e => console.log('  ' + e)); }
  console.log(fails.length ? `\n${fails.length} 项未通过：\n  - ${fails.join('\n  - ')}` : '\n全部通过');
  await b.close(); process.exit(fails.length || errs.length ? 1 : 0);
})();
