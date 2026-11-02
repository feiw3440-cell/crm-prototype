// 关键业务交互：状态流转写回数据、真分页、搜索跳转
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = [];
  await p.addInitScript(() => localStorage.setItem('crm_doc_state', 'hidden'));
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  let bad = 0; const check = (n, ok, d) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? ' ' + d : '')); if (!ok) bad++; };
  const go = async h => { await p.evaluate(h => { location.hash = '#' + h; }, h); await p.waitForTimeout(700); };
  const confirm = async () => { const btn = p.locator('.el-message-box__btns .el-button--primary'); if (await btn.count()) { await btn.first().click(); await p.waitForTimeout(500); } };
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html') + '#/workbench'); await p.waitForTimeout(600);
  const ids = await p.evaluate(() => ({ lead: store.leads.find(l => l.status === '新建').no, ct: store.ext.contracts.find(c => c.status === '草稿').no, tk: store.ext.tickets.find(t => t.status === '待受理').no, od: store.ext.orders.find(o => o.status === '待确认').no, opp: store.opps.find(o => o.stage === 'contact').no }));
  // 工单受理 → 指派处理人
  await go('/ticket/' + ids.tk); await p.click('.main button:has-text("受理")'); await confirm();
  check('工单受理 → 待分派', await p.evaluate(n => store.ext.tickets.find(t => t.no === n).status === '待分派', ids.tk));
  await p.click('.main button:has-text("指派处理人")'); await p.waitForTimeout(400);
  await p.click('.el-dialog .el-button--primary'); await p.waitForTimeout(500);
  check('工单指派处理人 → 处理中', await p.evaluate(n => store.ext.tickets.find(t => t.no === n).status === '处理中', ids.tk));
  // 合同提交审批
  await go('/contract/' + ids.ct); await p.click('.main button:has-text("提交审批")'); await confirm();
  check('合同提交审批 → 待审批', await p.evaluate(n => store.ext.contracts.find(t => t.no === n).status === '待审批', ids.ct));
  // 订单确认
  await go('/order/' + ids.od); await p.click('.main button:has-text("确认订单")'); await confirm();
  check('订单确认 → 已确认', await p.evaluate(n => store.ext.orders.find(t => t.no === n).status === '已确认', ids.od));
  // 线索标记无效：必须填原因
  await go('/lead/' + ids.lead); await p.click('.main button:has-text("标记无效")'); await p.waitForTimeout(400);
  const hasInput = await p.locator('.el-message-box__input input, .el-message-box__input textarea, .el-dialog textarea, .el-dialog input').count();
  check('标记无效弹出原因输入', hasInput > 0);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // 商机推进
  await go('/opp/' + ids.opp); await p.click('.main button:has-text("推进到下一阶段")'); await p.waitForTimeout(600);
  const stage1 = await p.evaluate(n => store.opps.find(o => o.no === n).stage, ids.opp);
  const dlg = await p.locator('.el-dialog:visible, .el-message-box:visible, .el-message:visible').count();
  check('商机推进有响应（阶段变化或校验提示/弹窗）', stage1 !== 'contact' || dlg > 0, 'stage=' + stage1);
  await p.keyboard.press('Escape');
  // 真分页：客户列表
  await go('/customers'); await p.waitForTimeout(500);
  const info = await p.evaluate(() => ({ n: store.customers.length, rows: document.querySelectorAll('.main .el-table__body-wrapper tbody tr').length, txt: (document.querySelector('.pager') || {}).innerText || '' }));
  check('客户列表真分页（首页行数 < 总数）', info.rows > 0 && info.rows < info.n, JSON.stringify({ n: info.n, rows: info.rows }));
  check('分页总数等于真实条数', info.txt.includes(String(info.n)), info.txt.replace(/\n/g, ' ').slice(0, 60));
  const first1 = await p.locator('.main .el-table__body-wrapper tbody tr').first().innerText();
  await p.click('.el-pagination .el-pager li:has-text("2")'); await p.waitForTimeout(500);
  const first2 = await p.locator('.main .el-table__body-wrapper tbody tr').first().innerText();
  check('翻到第 2 页数据不同', first1 !== first2);
  // 各列表模块总数 = 实际数据
  for (const [route, key] of [['/contacts', 'contacts'], ['/contracts', 'contracts'], ['/orders', 'orders'], ['/service', 'tickets'], ['/delivery', 'deliveries'], ['/activities', 'activities'], ['/products', 'products']]) {
    await go(route); await p.waitForTimeout(400);
    const r = await p.evaluate(k => ({ n: store.ext[k].length, rows: document.querySelectorAll('.main .el-table__body-wrapper tbody tr').length, pager: !!document.querySelector('.el-pagination') }), key);
    check(route + ' 有分页且单页行数≤总数', r.pager && r.rows > 0 && r.rows <= r.n, JSON.stringify(r));
  }
  // 全局搜索
  await go('/workbench'); await p.fill('.top-search input', '南京'); await p.waitForTimeout(600);
  check('全局搜索有联想结果', (await p.locator('.el-autocomplete-suggestion li').count()) > 0);
  check('无控制台错误', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); process.exit(bad ? 1 : 0);
})();
