// 需求文档面板：新增/编辑/删除条目、关键词搜索、导出/导入 JSON、恢复默认；PC 页与手机端页都测
const { chromium } = require('playwright-core'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await c.addInitScript(() => { localStorage.setItem('crm_doc_state', 'full'); });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  let bad = 0; const check = (n, ok, d) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? ' ' + d : '')); if (!ok) bad++; };
  const run = async (route, label, mobileKey) => {
    await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html') + '#' + route); await p.reload(); await p.waitForTimeout(900);
    if (mobileKey) { await p.evaluate(k => mgo(k, {}), mobileKey); await p.waitForTimeout(400); }
    const items = () => p.locator('.doc-panel .doc-sec').nth(1).locator('.doc-item');
    const n0 = await items().count();
    // 新增
    await p.locator('.doc-panel .doc-sec').nth(1).locator('.doc-add').click(); await p.waitForSelector('.el-message-box__input textarea');
    await p.fill('.el-message-box__input textarea', 'CRUD测试条目ABC'); await p.click('.el-message-box__btns .el-button--primary'); await p.waitForTimeout(400);
    check(label + ' 新增条目', (await items().count()) === n0 + 1);
    // 编辑
    await items().last().hover(); await items().last().locator('.el-icon').first().click(); await p.waitForSelector('.el-message-box__input textarea');
    await p.fill('.el-message-box__input textarea', 'CRUD测试条目已编辑XYZ'); await p.click('.el-message-box__btns .el-button--primary'); await p.waitForTimeout(400);
    check(label + ' 编辑条目', (await items().last().innerText()).includes('已编辑XYZ'));
    // 搜索 + 搜索状态下编辑索引正确
    await p.fill('.doc-tools input', '已编辑XYZ'); await p.waitForTimeout(300);
    const hit = await p.locator('.doc-panel .doc-item').count();
    check(label + ' 关键词搜索只剩命中条目', hit === 1 && (await p.locator('.doc-panel mark').count()) >= 1, 'hits=' + hit);
    await p.locator('.doc-panel .doc-item').first().locator('.el-icon').first().click(); await p.waitForSelector('.el-message-box__input textarea');
    await p.fill('.el-message-box__input textarea', 'CRUD搜索态编辑OK'); await p.click('.el-message-box__btns .el-button--primary'); await p.waitForTimeout(300);
    await p.fill('.doc-tools input', ''); await p.waitForTimeout(300);
    check(label + ' 搜索态编辑写回正确条目', (await items().last().innerText()).includes('搜索态编辑OK') && (await items().count()) === n0 + 1);
    // 导出
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=导出JSON')]); const path = '/tmp/docs-export.json'; await dl.saveAs(path);
    const exp = JSON.parse(fs.readFileSync(path, 'utf8'));
    check(label + ' 导出 JSON 含本页修改', JSON.stringify(exp).includes('搜索态编辑OK'));
    // 删除
    await items().last().hover(); await items().last().locator('.el-icon').nth(1).click(); await p.click('.el-message-box__btns .el-button--primary'); await p.waitForTimeout(400);
    check(label + ' 删除条目', (await items().count()) === n0);
    // 导入
    await p.setInputFiles('.doc-tools input[type=file]', path); await p.waitForTimeout(500);
    check(label + ' 导入 JSON 恢复修改', (await items().count()) === n0 + 1);
    // 刷新持久化
    await p.reload(); await p.waitForTimeout(900); if (mobileKey) { await p.evaluate(k => mgo(k, {}), mobileKey); await p.waitForTimeout(400); }
    check(label + ' 刷新后仍保留', (await items().count()) === n0 + 1);
    // 恢复默认
    await p.click('text=恢复默认（本页）'); await p.click('.el-message-box__btns .el-button--primary'); await p.waitForTimeout(400);
    check(label + ' 恢复默认', (await items().count()) === n0);
  };
  await run('/customers', 'PC客户列表');
  await run('/mobile', '手机端 m-customers', 'customers');
  const hasTable = await p.evaluate(() => { location.hash = '#/customers'; return true; }); await p.waitForTimeout(700);
  check('字段说明以表格呈现', (await p.locator('.doc-ftable th').count()) >= 5);
  check('无控制台错误', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); process.exit(bad ? 1 : 0);
})();
