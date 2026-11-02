// 生成最终截图到 shots/ ；用法: NODE_PATH=... node tests/shots-final.js
const { chromium } = require('playwright-core');
const fs = require('fs'); const D = require('path').resolve(__dirname, '..', 'shots') + '/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = [];
  const mk = async (theme, doc, vp) => {
    const c = await b.newContext({ viewport: vp || { width: 1440, height: 900 } });
    await c.addInitScript(([t, d]) => { localStorage.setItem('crm_theme', t); localStorage.setItem('crm_doc_state', d); }, [theme, doc]);
    const p = await c.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
    await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html') + '#/workbench'); await p.waitForTimeout(600);
    return p;
  };
  const open = async (p, r, wait) => { await p.evaluate(h => { location.hash = '#' + h; }, r); await p.waitForTimeout(wait || 900); };
  // 1 四套主题 × 工作台
  for (const t of ['pink', 'sky', 'white', 'gray']) { const p = await mk(t, 'hidden'); await open(p, '/workbench', 1200); await p.screenshot({ path: D + `theme-${t}-workbench.png` }); await p.context().close(); }
  // 2 文档面板三态
  for (const s of ['hidden', 'half', 'full']) { const p = await mk('sky', s); await open(p, '/customer/KH-202611-0001', 1200); await p.screenshot({ path: D + `doc-panel-${s}.png` }); await p.context().close(); }
  // 3 新详情页
  const p = await mk('sky', 'hidden');
  const ids = await p.evaluate(() => ({ lead: store.leads[0].no, opp: store.opps[0].no, ct: store.ext.contracts[0].no, od: store.ext.orders[0].no, cont: store.ext.contacts[0].no, tk: store.ext.tickets[0].no, cust: store.customers[3].no, quote: store.ext.quotes[5].no, dv: store.ext.deliveries[0].no, act: store.ext.activities[0].no }));
  const pages = { 'lead-detail': '/lead/' + ids.lead, 'opp-detail': '/opp/' + ids.opp, 'contract-detail': '/contract/' + ids.ct, 'order-detail': '/order/' + ids.od, 'contact-detail-relation-graph': '/contact/' + ids.cont, 'customer-detail-other': '/customer/' + ids.cust, 'customer-merge': '/customers/merge', 'pool-rules': '/system/pool-rules', 'approval-templates': '/approvals/templates', 'approval-stats': '/approvals/stats', 'ticket-detail': '/ticket/' + ids.tk, 'delivery-detail': '/delivery/' + ids.dv, 'activity-detail': '/activity/' + ids.act, 'analytics-detail': '/analytics/funnel', 'system-roles': '/system/roles', 'contracts-list-pagination': '/contracts', 'products': '/products', 'quote-detail-2': '/quote/' + ids.quote };
  for (const [n, r] of Object.entries(pages)) { await open(p, r, 1300); await p.screenshot({ path: D + `page-${n}.png` }); }
  await p.context().close();
  // 4 手机端（PC 内嵌预览，手机框截图）
  for (const theme of ['sky', 'pink']) {
    const m = await mk(theme, 'hidden'); await open(m, '/mobile', 1000);
    const shots = [['home'], ['customers'], ['customer-detail', { no: ids.cust }], ['schedule'], ['visit-checkin'], ['visit-records'], ['todo'], ['me'], ['leads'], ['opps'], ['opp-stage', { no: ids.opp }], ['followup-new'], ['approvals'], ['payments'], ['tickets'], ['ticket-detail', { no: ids.tk }], ['ticket-handle', { no: ids.tk }], ['notices']];
    for (const [k, prm] of (theme === 'sky' ? shots : [['home'], ['customer-detail', { no: ids.cust }]])) {
      await m.evaluate(([k, prm]) => mgo(k, prm), [k, prm]); await m.waitForTimeout(500);
      await m.locator('.phone').screenshot({ path: D + `mobile-${theme}-${k}.png` });
    }
    if (theme === 'sky') { await m.evaluate(() => { localStorage.setItem('crm_doc_state', 'full'); }); await m.reload(); await m.waitForTimeout(1200); await m.screenshot({ path: D + 'mobile-with-doc-panel.png' }); }
    await m.context().close();
  }
  console.log('console errors:', errs.length, errs.slice(0, 5));
  await b.close();
})();
