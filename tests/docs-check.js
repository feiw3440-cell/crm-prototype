// 检查每个 PC 路由 docKey 与每个手机屏 doc key 都有完整的需求文档（12 个要素，每个要素有内容，非占位骨架）
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html') + '#/workbench'); await p.waitForTimeout(500);
  const res = await p.evaluate(() => {
    const keys = new Set(); ROUTES.forEach(r => r.docKey && keys.add(r.docKey));
    try { Object.values(MSCREENS).forEach(s => s.doc && keys.add(s.doc)); } catch (e) {}
    const TITLES = ['页面名称与所属模块','页面目标','使用角色与权限','入口与跳转','页面布局与元素','字段说明','交互与操作规则','业务规则与状态流转','异常与边界场景','关联数据与接口','验收标准','版本与变更记录'];
    const out = [];
    keys.forEach(k => {
      const d = DOCS_DEFAULT[k]; const probs = [];
      if (!d) { out.push([k, ['无文档']]); return; }
      if (d.sections.length !== 12) probs.push('要素数=' + d.sections.length);
      d.sections.forEach((s, i) => { if (s.t !== TITLES[i]) probs.push('第' + (i + 1) + '要素标题应为' + TITLES[i]); const n = (s.items || []).length; const min = [2,1,2,1,2,3,2,1,1,1,2,1][i]; if (n < min) probs.push(s.t + ' 条目不足(' + n + '<' + min + ')'); });
      const all = JSON.stringify(d.sections);
      if (all.includes('占位示例字段') || all.includes('本期为占位页')) probs.push('仍是占位骨架');
      if (all.length < 900) probs.push("文档内容过短(" + all.length + "字符)"); if (/兜底|自动生成的骨架/.test(all)) probs.push('仍是兜底骨架');
      out.push([k, probs]);
    });
    return out;
  });
  let bad = 0;
  res.forEach(([k, pr]) => { if (pr.length) { bad++; console.log('FAIL ' + k + ': ' + pr.join('；')); } else console.log('ok   ' + k); });
  console.log(`共 ${res.length} 个文档，${bad} 个不合格`);
  await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();
