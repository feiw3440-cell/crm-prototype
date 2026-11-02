// 用法: node tests/mobile.js
// 验证：底部五个 tab、客户详情与分段 Tab、签到完成并改状态、新建线索 / 商机阶段 / 跟进 / 审批 / 工单 / 通知流程、
//       docState.override 随屏变化、全屏遍历、主题切换后手机框内主色变化、无控制台报错
const { chromium } = require('playwright-core');
(async () => {
  const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html') + '#/mobile';
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  const fails = [];
  const check = (name, ok, extra) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (extra ? '  [' + extra + ']' : '')); if (!ok) fails.push(name); };
  const title = () => p.locator('.m-nav-title').innerText();
  const docName = () => p.locator('.doc-tt b').innerText().catch(() => '');
  const override = () => p.evaluate(() => (typeof docState !== 'undefined' ? docState.override : 'NO_DOC_STATE'));
  const toast = async () => { await p.waitForTimeout(250); return p.locator('.m-toast').innerText().catch(() => ''); };
  const sel = (q, opt) => p.locator('.m-page ' + q, opt);

  await p.goto(URL); await p.waitForTimeout(700);
  await p.evaluate(() => localStorage.clear());
  await p.reload(); await p.waitForTimeout(700);

  check('手机内默认显示首页', (await title()) === '首页', await title());
  check('首页文档 override = m-home', (await override()) === 'm-home' && (await docName()).includes('首页'), await override());

  /* ========== 1. 底部五个 tab ========== */
  const tabs = [['首页', '首页', 'm-home'], ['客户', '客户', 'm-customers'], ['日程', '日程', 'm-schedule'], ['待办', '待办', 'm-todo'], ['我的', '我的', 'm-me']];
  for (let i = 0; i < tabs.length; i++) {
    const [label, tt, doc] = tabs[i];
    await p.click('.m-tabbar div:nth-child(' + (i + 1) + ')'); await p.waitForTimeout(260);
    check('底部 tab「' + label + '」切换', (await title()) === tt, await title());
    check('屏幕「' + label + '」同步需求文档 ' + doc, (await override()) === doc, await override());
  }

  /* ========== 2. 客户列表 → 客户详情 → 分段 Tab ========== */
  await p.click('.m-tabbar div:nth-child(2)'); await p.waitForTimeout(260);
  const custCount = await p.locator('.m-body .m-list-item').count();
  check('客户列表有数据', custCount > 0, String(custCount));
  const firstName = await p.locator('.m-body .m-list-item .m-ellipsis').first().innerText();
  await p.locator('.m-body .m-list-item').first().click(); await p.waitForTimeout(300);
  check('进入客户详情', (await p.locator('.m-cust-name').count()) === 1, firstName);
  check('客户详情文档 override = m-customer-detail', (await override()) === 'm-customer-detail', await override());
  const detailName = await p.locator('.m-cust-name').innerText();
  check('客户详情展示所选客户', detailName === firstName, detailName + ' / ' + firstName);
  await p.locator('.m-seg span', { hasText: '联系人' }).click(); await p.waitForTimeout(220);
  const contactRows = await p.locator('.m-body .m-card .m-list-item').count();
  check('客户详情可切换到「联系人」Tab', (await p.locator('.m-seg span.on').innerText()) === '联系人' && contactRows > 0, String(contactRows));
  await p.locator('.m-seg span', { hasText: '商机' }).click(); await p.waitForTimeout(220);
  check('客户详情可切换到「商机」Tab', (await p.locator('.m-seg span.on').innerText()) === '商机');
  await p.click('.m-nav-back'); await p.waitForTimeout(250);
  check('客户详情返回客户列表', (await title()) === '客户' && (await override()) === 'm-customers', await override());

  /* ========== 3. 日程 → 拜访签到 → 状态变化 ========== */
  await p.click('.m-tabbar div:nth-child(3)'); await p.waitForTimeout(260);
  const schedCount = await p.locator('.m-body .m-todo').count();
  check('日程显示当日活动', schedCount > 0, String(schedCount));
  await p.locator('button', { hasText: '拜访签到' }).first().click(); await p.waitForTimeout(300);
  check('进入拜访签到屏', (await title()) === '拜访签到' && (await override()) === 'm-visit-checkin', await override());
  const actNo = (await p.locator('.m-cell', { hasText: '活动编号' }).locator('.m-cell-v').innerText()).trim();
  const before = await p.evaluate(n => { const a = store.ext.activities.find(x => x.no === n); return a ? { s: a.status, c: a.checkin } : null; }, actNo);
  check('签到前活动为计划中', !!before && before.s === '计划中', actNo + ' / ' + JSON.stringify(before));
  await p.locator('button', { hasText: '获取定位' }).click(); await p.waitForTimeout(700);
  const hasAddr = await p.locator('.m-cell', { hasText: '签到地址' }).count();
  check('模拟获取定位成功（显示地址）', hasAddr > 0);
  await p.click('.m-photo-box'); await p.waitForTimeout(200);
  await p.locator('button', { hasText: '提交签到并完成拜访' }).click(); await p.waitForTimeout(1200);
  const after = await p.evaluate(n => { const a = store.ext.activities.find(x => x.no === n); return a ? { s: a.status, c: a.checkin } : null; }, actNo);
  check('签到后活动状态变为已完成', !!after && after.s === '已完成', JSON.stringify(after));
  check('签到后生成签到信息', !!after && !!after.c && !!after.c.addr && !!after.c.time, after && after.c && after.c.addr);
  check('签到后返回日程且文档恢复 m-schedule', (await title()) === '日程' && (await override()) === 'm-schedule', await override());

  /* ========== 4. 待办「完成」操作 ========== */
  await p.click('.m-tabbar div:nth-child(4)'); await p.waitForTimeout(260);
  await p.locator('.m-seg span', { hasText: '待跟进' }).click(); await p.waitForTimeout(220);
  const todoBefore = await p.locator('.m-todo-wrap').count();
  if (todoBefore > 0) {
    await p.locator('.m-todo-wrap .el-button').first().click(); await p.waitForTimeout(300);
    const todoAfter = await p.locator('.m-todo-wrap').count();
    check('待办支持完成操作（条目减少）', todoAfter === todoBefore - 1, todoBefore + ' → ' + todoAfter);
  } else check('待办支持完成操作（条目减少）', false, '待跟进列表为空');

  /* ========== 5. 线索：新建（校验 + 保存） ========== */
  await p.evaluate(() => mgo('me')); await p.waitForTimeout(260);
  await p.locator('.m-cell', { hasText: '我的线索' }).click(); await p.waitForTimeout(300);
  check('进入线索列表', (await title()) === '线索' && (await override()) === 'm-leads', await override());
  const leadsN0 = await p.evaluate(() => store.leads.length);
  await sel('.m-chip:has(.el-icon)', { hasText: '新建' }).first().click(); await p.waitForTimeout(300);
  check('进入新建线索屏', (await title()) === '新建线索' && (await override()) === 'm-lead-new', await override());
  await sel('button', { hasText: '保存线索' }).click();
  check('空表单保存被拦截', (await toast()).includes('公司名称'), await toast());
  await sel('input[placeholder="请输入公司全称"]').fill('宁波某某物流科技有限公司');
  await sel('input[placeholder="姓名，如 王经理"]').fill('孙总');
  await sel('input[placeholder="如 139****1234"]').fill('123');
  await sel('button', { hasText: '保存线索' }).click();
  check('手机号非法被拦截', (await toast()).includes('手机号格式不正确'), await toast());
  await sel('input[placeholder="如 139****1234"]').fill('139****5678');
  await sel('button', { hasText: '保存线索' }).click(); await p.waitForTimeout(900);
  const leadsN1 = await p.evaluate(() => store.leads.length);
  check('保存线索成功（store.leads 增长）', leadsN1 === leadsN0 + 1, leadsN0 + ' → ' + leadsN1);
  check('保存后回到线索列表且新线索可见', (await title()) === '线索' && (await p.locator('.m-page', { hasText: '宁波某某物流科技有限公司' }).count()) > 0, await p.evaluate(() => store.leads[0].no));

  /* ========== 6. 商机：阶段更新（校验 + 成功推进） ========== */
  await p.evaluate(() => mgo('me')); await p.waitForTimeout(260);
  await p.locator('.m-cell', { hasText: '我的商机' }).click(); await p.waitForTimeout(300);
  check('进入商机列表', (await title()) === '商机' && (await override()) === 'm-opps', await override());
  const oppNo = await p.evaluate(() => (store.opps.find(o => o.stage === 'contact' && o.owner === '张三') || {}).no || '');
  check('存在张三的初步接触商机', !!oppNo, oppNo);
  await p.evaluate(no => mpush('opp-detail', { no }), oppNo); await p.waitForTimeout(300);
  check('商机详情有阶段进度条', (await sel('.m-stg-bar i').count()) >= 6 && (await override()) === 'm-opp-detail', await override());
  await sel('button', { hasText: '阶段更新' }).click(); await p.waitForTimeout(300);
  check('进入阶段更新屏', (await title()) === '阶段更新' && (await override()) === 'm-opp-stage', await override());
  await sel('button', { hasText: '确认变更' }).click(); await p.waitForTimeout(250);
  check('必填缺失被拦截（提示条 + toast）', (await sel('.m-note.warn').count()) === 1 && (await toast() || '').length > 0, await sel('.m-note.warn span').first().innerText().catch(() => ''));
  await sel('.el-textarea textarea').first().fill('客户需要物流调度与管理一体化，关心司机结算效率');
  await sel('.el-date-editor input').first().fill('2026-12-20'); await p.keyboard.press('Enter');
  await sel('input[placeholder*="30–40"]').fill('28–32 万元');
  await sel('button', { hasText: '确认变更' }).click(); await p.waitForTimeout(1200);
  const oppStage = await p.evaluate(no => { const o = store.opps.find(x => x.no === no); return { s: o.stage, d: (o.info || {}).demand, h: (o.history || []).length }; }, oppNo);
  check('阶段推进成功（contact → need）', oppStage.s === 'need', JSON.stringify(oppStage));
  check('阶段字段已写入 info 且 history 增加', !!oppStage.d && oppStage.h >= 1, oppStage.d);
  check('阶段更新后返回商机详情', (await title()) === '商机详情', await title());

  /* ========== 7. 写跟进 ========== */
  const actsN0 = await p.evaluate(() => store.ext.activities.length);
  await sel('button', { hasText: '写跟进' }).first().click(); await p.waitForTimeout(300);
  check('进入写跟进屏（预填客户与商机）', (await title()) === '写跟进' && (await override()) === 'm-followup', await override());
  await sel('.el-textarea textarea').first().fill('电话回访：确认预算区间与上线时间，约定下周演示');
  await sel('button', { hasText: '保存跟进' }).click(); await p.waitForTimeout(1000);
  const actsN1 = await p.evaluate(no => { const a = store.ext.activities[0]; return { n: store.ext.activities.length, c: a && a.customer, o: a && a.opp }; }, oppNo);
  check('跟进保存成功（activities 增长）', actsN1.n === actsN0 + 1, actsN0 + ' → ' + actsN1.n);
  check('新跟进关联了客户与商机', actsN1.o === oppNo && actsN1.n === actsN0 + 1 && actsN1.c !== '', JSON.stringify(actsN1));

  /* ========== 8. 审批：同意 ========== */
  await p.evaluate(() => mgo('me')); await p.waitForTimeout(260);
  await p.locator('.m-cell', { hasText: '我的审批' }).click(); await p.waitForTimeout(300);
  check('进入审批列表', (await title()) === '审批中心' && (await override()) === 'm-approvals', await override());
  const appr0 = await p.evaluate(() => store.approvals.filter(a => a.tab === 'todo').length);
  await sel('.m-list-item').first().click(); await p.waitForTimeout(300);
  check('进入审批详情', (await title()) === '审批详情' && (await override()) === 'm-approval-detail', await override());
  await sel('button', { hasText: '同意' }).click(); await p.waitForTimeout(900);
  const appr1 = await p.evaluate(() => { const a = store.approvals.filter(a => a.tab === 'todo').length; const d = store.approvals.filter(a => a.tab === 'done' && a.result === '已同意').length; return { todo: a, done: d }; });
  check('同意后待我审批减少', appr1.todo === appr0 - 1, appr0 + ' → ' + appr1.todo);
  check('审批单 result = 已同意 且进已处理', appr1.done >= 1, JSON.stringify(appr1));

  /* ========== 9. 工单：接单 → 处理 → 待客户确认 ========== */
  await p.evaluate(() => mgo('me')); await p.waitForTimeout(260);
  await p.locator('.m-cell', { hasText: '我的工单' }).click(); await p.waitForTimeout(300);
  check('进入工单列表', (await title()) === '服务工单' && (await override()) === 'm-tickets', await override());
  const tkNo = await p.evaluate(() => (store.ext.tickets.find(t => t.status === '待受理') || {}).no || '');
  check('存在待受理工单', !!tkNo, tkNo);
  await sel('.m-list-item', { hasText: tkNo }).first().click(); await p.waitForTimeout(300);
  check('进入工单详情', (await title()) === '工单详情' && (await override()) === 'm-ticket-detail', await override());
  await sel('button', { hasText: '受理' }).click(); await p.waitForTimeout(400);
  const tk1 = await p.evaluate(no => { const t = store.ext.tickets.find(x => x.no === no); return { s: t.status, rec: (t.records || []).length }; }, tkNo);
  check('受理并指派后状态变为处理中', tk1.s === '处理中', JSON.stringify(tk1));
  await sel('button', { hasText: '处理并提交确认' }).click(); await p.waitForTimeout(300);
  check('进入工单处理屏', (await title()) === '处理工单' && (await override()) === 'm-ticket-handle', await override());
  await sel('button', { hasText: '提交处理结果' }).click();
  check('处理说明为必填', (await toast()).includes('必填'), await toast());
  await sel('.el-textarea textarea').first().fill('已现场更换故障模块，设备恢复正常，客户已口头确认');
  const buf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await p.setInputFiles('.m-file-input', [{ name: 'photo.png', mimeType: 'image/png', buffer: buf }]);
  await p.waitForTimeout(400);
  check('图片上传成功（1/3 预览）', (await sel('.m-thumb').count()) === 1, String(await sel('.m-thumb').count()));
  await sel('button', { hasText: '提交处理结果' }).click(); await p.waitForTimeout(1200);
  const tk2 = await p.evaluate(no => { const t = store.ext.tickets.find(x => x.no === no); return { s: t.status, img: (t.images || []).length, rec: (t.records || []).length }; }, tkNo);
  check('提交后状态为待客户确认', tk2.s === '待客户确认', JSON.stringify(tk2));
  check('工单图片与处理记录已写入', tk2.img >= 1 && tk2.rec >= 2, JSON.stringify(tk2));

  /* ========== 10. 回款 与 通知 ========== */
  await p.evaluate(() => mgo('me')); await p.waitForTimeout(260);
  await p.locator('.m-cell', { hasText: '我的回款' }).click(); await p.waitForTimeout(300);
  check('进入回款列表（汇总卡）', (await title()) === '回款查询' && (await sel('.m-pay-cards > div').count()) === 4 && (await override()) === 'm-payments', await override());
  await sel('.m-list-item').first().click(); await p.waitForTimeout(300);
  check('进入回款计划详情', (await title()).includes('回款明细') && (await override()) === 'm-payment-detail', await title() + ' / ' + (await override()));
  await p.evaluate(() => mgo('me')); await p.waitForTimeout(260);
  await p.locator('.m-cell', { hasText: '消息通知' }).click(); await p.waitForTimeout(300);
  check('进入消息通知屏', (await title()) === '消息通知' && (await override()) === 'm-notices', await override());
  const unread0 = await p.evaluate(() => store.messages.filter(m => !m.read).length);
  if (unread0 > 0) {
    const unRow = sel('.m-list-item:has(.m-msg-dot:not(.read))').first();
    if (await unRow.count()) {
      const ut = (await unRow.innerText()).split('\n')[0];
      await unRow.click(); await p.waitForTimeout(500);
      const afterRead = await p.evaluate(t => (store.messages.find(m => m.title === t) || {}).read, ut);
      check('点击通知标为已读', !!afterRead, String(afterRead));
    } else check('点击通知标为已读', false, '列表中未找到未读行');
    await p.evaluate(() => mgo('notices')); await p.waitForTimeout(300);
  } else check('点击通知标为已读', false, '无未读消息可测试');
  await sel('button', { hasText: '全部已读' }).click(); await p.waitForTimeout(300);
  const unreadAll = await p.evaluate(() => store.messages.filter(m => !m.read).length);
  check('全部已读后未读为 0', unreadAll === 0, String(unreadAll));

  /* ========== 11. 全屏遍历（docState.override 一致 + 无报错） ========== */
  const keys = await p.evaluate(() => window.__MSCREENS_KEYS || Object.keys(MSCREENS));
  check('屏幕注册数量完整（26 屏）', keys.length === 26, keys.join(','));
  for (const k of keys) {
    const doc = await p.evaluate(kk => MSCREENS[kk].doc, k);
    await p.evaluate(kk => mgo(kk), k); await p.waitForTimeout(200);
    check('屏「' + k + '」文档同步 ' + doc, (await override()) === doc, await override());
  }

  /* ========== 12. 主题切换：手机框内主色跟随 ========== */
  await p.evaluate(() => mgo('home')); await p.waitForTimeout(260);
  const phoneColor = () => p.evaluate(() => { const el = document.querySelector('.m-app .m-tabbar div.on'); return el ? getComputedStyle(el).color : ''; });
  const skyColor = await phoneColor();
  await p.click('.icon-btn[title="主题切换"]');
  await p.waitForSelector('.el-dropdown-menu__item', { timeout: 3000 });
  await p.click('.el-dropdown-menu__item:has-text("粉")'); await p.waitForTimeout(320);
  const pinkColor = await phoneColor();
  const themeNow = await p.evaluate(() => document.documentElement.dataset.theme);
  check('切换到粉色主题', themeNow === 'pink', themeNow);
  check('手机框内主色计算值随主题变化', !!skyColor && !!pinkColor && skyColor !== pinkColor, skyColor + ' → ' + pinkColor);

  if (errs.length) { console.log('\n控制台问题:'); errs.forEach(e => console.log('  ' + e)); }
  console.log(fails.length ? `\n${fails.length} 项未通过：\n  - ${fails.join('\n  - ')}` : '\n全部通过');
  await b.close(); process.exit(fails.length || errs.length ? 1 : 0);
})();
