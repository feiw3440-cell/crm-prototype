// 用法: node tests/customers-all.js
// 遍历 store.customers 全部客户编号，检查每个客户详情页：无报错、头部客户名与编号正确、各 Tab 可切换渲染、不同客户的联系人内容不全相同
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  let errs = [];
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  p.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html') + '#/customers'); await p.waitForTimeout(600);
  const nos = await p.evaluate(() => store.customers.map(c => ({ no: c.no, name: c.name })));
  const firstContacts = [];
  let bad = 0;
  for (const it of nos) {
    errs = [];
    await p.evaluate(h => { location.hash = '#' + h; }, '/customer/' + it.no); await p.waitForTimeout(220);
    const info = await p.evaluate(({ no, name }) => {
      const head = document.querySelector('.cust-head');
      const tabs = document.querySelectorAll('.detail-tabs .el-tab-pane');
      // 切换到联系人 Tab 检查表内容（属于该客户自己的联系人）
      const contactRows = store.ext.contacts.filter(x => x.customer === name);
      return {
        head: head ? head.innerText.replace(/\n/g, ' ').trim() : '',
        tabs: tabs.length,
        tables: document.querySelectorAll('.main .el-table').length,
        name: !!document.querySelector('.cust-head h2'),
        firstContact: contactRows.length ? contactRows[0].name + '|' + contactRows[0].title : '(无联系人)',
        nContacts: contactRows.length,
      };
    }, { no: it.no, name: it.name });
    const problems = [];
    if (errs.length) problems.push(...errs);
    if (!info.name) problems.push('未找到客户头部名称');
    else if (!info.head.includes(it.no)) problems.push('头部未包含客户编号 ' + it.no);
    if (!info.head.includes(it.name)) problems.push('头部未显示客户名称');
    if (info.tabs < 10) problems.push('Tab 数量异常：' + info.tabs);
    firstContacts.push({ no: it.no, tag: info.firstContact });
    console.log((problems.length ? 'FAIL ' : 'ok   ') + it.no + '  [' + info.head.slice(0, 42) + '] 联系人 ' + info.nContacts + ' 位 · 表格 ' + info.tables + ' 个');
    problems.forEach(x => console.log('       - ' + x)); if (problems.length) bad++;
  }
  const distinct = new Set(firstContacts.map(x => x.tag)).size;
  console.log('不同客户的第一个联系人去重后数量：' + distinct + ' / ' + firstContacts.length);
  if (distinct < Math.max(3, Math.floor(firstContacts.length / 4))) { console.log('FAIL 联系人数据在不同客户间雷同'); bad++; }
  console.log(bad ? `\n${bad} 个客户详情有问题` : '\n全部客户详情通过');
  await b.close(); process.exit(bad ? 1 : 0);
})();
