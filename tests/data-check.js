/* tests/data-check.js —— 第 1 阶段数据层自检：用 vm 加载 data.js + data-ext.js（最小 mock，无 Vue 依赖） */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/data.js'), 'utf8'), ctx, { filename: 'data.js' });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/data-ext.js'), 'utf8'), ctx, { filename: 'data-ext.js' });

const R = vm.runInContext(`(() => {
  const yz = { no: 'KH-202606-0008', name: '扬州某某教育科技有限公司', type: '企业客户', industry: '企业服务', level: '潜在客户', source: '广告', region: '江苏省扬州市', scale: '小型', owner: '', status: '正常', lastFollow: '2026-07-01', lastDeal: '-', total: 0, created: '2026-06-18', phone: '159****2218', key: false };
  const customers = CUSTOMERS_INIT.concat([yz]).concat(extraCustomers(29));
  const leads = LEADS_INIT.concat(extraLeads());
  const opps = OPPS_INIT.concat(extraOpps());
  const ext1 = buildExt(customers, leads, opps);
  const ext2 = buildExt(customers, leads, opps);
  return { customers, leads, opps, ext: ext1, deterministic: JSON.stringify(ext1) === JSON.stringify(ext2) };
})()`, ctx);

const { customers, leads, opps, ext } = R;
const names = new Set(customers.map(c => c.name));
const nameOf = no => { const c = customers.find(x => x.no === no); return c ? c.name : no; };

let failed = 0, passed = 0;
function ok(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.error('  ✗ ' + msg); }
}
function sect(t) { console.log('== ' + t); }

/* 1) 数量达标 */
sect('数量达标');
ok(R.deterministic, 'buildExt 两次构建结果一致（确定性）');
ok(customers.length === 40, '客户总数 40（11 原有 + 29 扩展）, 实际 ' + customers.length);
ok(leads.length === 40, '线索总数 40（12 原有 + 28 扩展）, 实际 ' + leads.length);
ok(opps.length === 35, '商机总数 35（15 原有 + 20 扩展）, 实际 ' + opps.length);
ok(ext.contacts.length >= 60, '联系人 ≥60, 实际 ' + ext.contacts.length);
ok(ext.products.length >= 30, '产品 ≥30, 实际 ' + ext.products.length);
ok(ext.pricebooks.length === 3, '价格表 3 张, 实际 ' + ext.pricebooks.length);
ext.pricebooks.forEach(pb => ok(pb.items.length === ext.products.length, '价格表 ' + pb.name + ' 覆盖全部产品'));
ok(ext.quotes.length >= 30, '报价 ≥30, 实际 ' + ext.quotes.length);
ok(ext.contracts.length >= 30, '合同 ≥30, 实际 ' + ext.contracts.length);
ok(ext.orders.length >= 30, '订单 ≥30, 实际 ' + ext.orders.length);
ok(ext.activities.length >= 80, '活动/跟进 ≥80, 实际 ' + ext.activities.length);
ok(ext.deliveries.length >= 25, '交付项目 ≥25, 实际 ' + ext.deliveries.length);
ok(ext.tickets.length >= 30, '服务工单 ≥30, 实际 ' + ext.tickets.length);
ok(ext.users.length >= 15, '用户 ≥15, 实际 ' + ext.users.length);
ok(ext.roles.length === 6, '角色 6 个, 实际 ' + ext.roles.length);
ok(ext.depts.length >= 6, '部门树非空, 实际 ' + ext.depts.length);
ok(ext.logs.length >= 60, '操作日志 ≥60, 实际 ' + ext.logs.length);

/* 2) 编号唯一 */
sect('编号唯一');
const uniq = (arr, key, tag) => {
  const set = new Set(); let dup = '';
  arr.forEach(x => { if (set.has(x[key])) dup += (dup ? ',' : '') + x[key]; set.add(x[key]); });
  ok(!dup, tag + ' 无重复编号' + (dup ? '（重复: ' + dup + '）' : ''));
};
uniq(ext.contacts, 'no', '联系人');
uniq(ext.products, 'no', '产品');
uniq(ext.quotes, 'no', '报价');
uniq(ext.contracts, 'no', '合同');
uniq(ext.orders, 'no', '订单');
uniq(ext.activities, 'no', '活动');
uniq(ext.deliveries, 'no', '交付');
uniq(ext.tickets, 'no', '工单');
uniq(ext.users, 'id', '用户');
uniq(customers, 'no', '客户');
uniq(leads, 'no', '线索');
uniq(opps, 'no', '商机');
ok(/LX-\d{6}$/.test(ext.contacts[0].no), '联系人编号 LX-xxxxxx 格式: ' + ext.contacts[0].no);

/* 3) customer 字段交叉引用 */
sect('客户交叉引用');
const custEntities = ['contacts', 'quotes', 'contracts', 'orders', 'activities', 'deliveries', 'tickets'];
custEntities.forEach(k => {
  let bad = '';
  ext[k].forEach(x => { if (!x.customer || !names.has(x.customer)) bad += (bad ? ',' : '') + (x.customer || '空') + '(' + x.no + ')'; });
  ok(!bad, k + ' 的 customer 全部能匹配客户 ' + (bad ? '（异常: ' + bad + '）' : ''));
});
ok(ext.quotes.every(q => !q.opp || opps.some(o => o.no === q.opp && o.customer === q.customer)), '报价关联的商机归属同一客户');
ok(ext.contracts.every(c => !c.quote || ext.quotes.some(q => q.no === c.quote)), '合同引用的报价单存在');
ok(ext.orders.every(o => !o.contract || ext.contracts.some(c => c.no === o.contract)), '订单引用的合同存在');
ok(ext.deliveries.every(d => !d.order || ext.orders.some(o => o.no === d.order)), '交付项目引用的订单存在');
ok(ext.quotes.every(q => q.items.every(it => ext.products.some(p => p.no === it.productNo))), '报价行产品编号存在');
ok(ext.orders.every(o => o.items.every(it => ext.products.some(p => p.no === it.productNo))), '订单行产品编号存在');
ok(ext.activities.every(a => !a.contact || (ext.contacts.some(c => c.customer === a.customer && c.name === a.contact))), '活动关联联系人属于该客户');

/* 4) 11 个原客户数据非空且各不相同 */
sect('原 11 客户各自的联系人/跟进');
const origNos = ['KH-202611-0001', 'KH-202611-0002', 'KH-202610-0021', 'KH-202610-0018', 'KH-202610-0015', 'KH-202609-0032', 'KH-202609-0027', 'KH-202608-0009', 'KH-202608-0004', 'KH-202607-0012', 'KH-202606-0008'];
const nameSets = {};
origNos.forEach(no => {
  const nm = nameOf(no);
  const cs = ext.contacts.filter(c => c.customer === nm);
  const ac = ext.activities.filter(a => a.customer === nm);
  ok(cs.length >= 3, nm + ' 联系人 ≥3（实际 ' + cs.length + '）');
  ok(cs.some(c => c.role === '决策人'), nm + ' 至少一个决策人');
  ok(ac.length >= 2, nm + ' 跟进 ≥2（实际 ' + ac.length + '）');
  nameSets[nm] = new Set(cs.map(c => c.name));
});
const origNames = origNos.map(nameOf);
for (let i = 0; i < origNames.length; i++) for (let j = i + 1; j < origNames.length; j++) {
  let inter = 0;
  nameSets[origNames[i]].forEach(n => { if (nameSets[origNames[j]].has(n)) inter++; });
  ok(inter === 0, origNames[i] + ' 与 ' + origNames[j] + ' 联系人互不相同');
}
/* 每个客户的数据形态存在差异 */
const spread = origNos.map(no => ext.contacts.filter(c => c.customer === nameOf(no)).length);
ok(new Set(spread).size >= 4, '各客户联系人数量有差异（' + spread.join(',') + '）');

/* 5) 保留数据未变 */
sect('南京某某科技保留数据');
const nj = '南京某某科技有限公司';
const njc = ext.contacts.filter(c => c.customer === nj);
const keep4 = { 陈总监: { phone: '138****8888', email: 'chen@example.com', dept: '信息中心', title: 'CIO', role: '决策人', infl: '高', pref: '电话', key: true }, 刘经理: { phone: '139****0021', email: 'liu@example.com', dept: '运营部', title: '运营经理', role: '使用人', infl: '中', pref: '微信', key: false }, 周会计: { phone: '137****6603', email: 'zhou@example.com', dept: '财务部', title: '财务主管', role: '财务', infl: '中', pref: '邮件', key: false }, 黄工: { phone: '133****2290', email: 'huang@example.com', dept: '技术部', title: '系统工程师', role: '技术', infl: '低', pref: '微信', key: false } };
Object.keys(keep4).forEach(nm => {
  const c = njc.find(x => x.name === nm);
  ok(!!c, '保留联系人 ' + nm + ' 存在');
  if (c) Object.keys(keep4[nm]).forEach(f => ok(c[f] === keep4[nm][f], nm + '.' + f + ' 保持原值 (' + c[f] + ')'));
});
const jq = (o, ks) => ks.map(k => String(o[k])).join('|');
const qPres = [
  ['BJ-202611-0008', nj, 'SJ-202609-0012', '334977.2', '25360', '2026-11-02', '2026-12-02', '张三', '审批中', 'V3'],
  ['BJ-202610-0019', '合肥某某餐饮连锁有限公司', 'SJ-202609-0006', '260000', '35000', '2026-10-30', '2026-11-30', '张三', '审批中', 'V2'],
];
qPres.forEach(row => {
  const q = ext.quotes.find(x => x.no === row[0]);
  ok(!!q, '保留报价 ' + row[0] + ' 存在');
  if (q) ok(jq(q, ['customer', 'opp', 'amount', 'disc', 'date', 'valid', 'owner', 'appr', 'ver']) === row.slice(1).join('|'), row[0] + ' 字段值不变');
});
const cPres = [
  ['HT-202611-0003', nj, 'SJ-202608-0004', '服务合同', '100000', '2026-10-19', '2027-04-19', '张三', '履约中'],
  ['HT-202604-0018', nj, 'SJ-202603-0005', '销售合同', '600000', '2026-04-18', '2027-04-17', '张三', '履约中'],
  ['HT-202601-0007', nj, 'SJ-202512-0003', '销售合同', '560000', '2026-01-16', '2027-01-15', '张三', '履约中'],
];
cPres.forEach(row => {
  const c = ext.contracts.find(x => x.no === row[0]);
  ok(!!c, '保留合同 ' + row[0] + ' 存在');
  if (c) ok(jq(c, ['customer', 'opp', 'type', 'amount', 'sign', 'end', 'owner', 'status']) === row.slice(1).join('|'), row[0] + ' 字段值不变');
});
const p3 = ext.contracts.find(c => c.no === 'HT-202611-0003');
ok(!!p3 && p3.plans.map(p => p.amount + ':' + p.status).join('|') === '30000:已回款|40000:部分回款|30000:未回款', 'HT-202611-0003 回款计划与 buildPay() 对应（30/40/30）');
const oPres = [
  ['DD-202611-0002', nj, 'HT-202611-0003', 'SJ-202608-0004', '100000', '2026-10-19', '张三', '交付中'],
  ['DD-202604-0006', nj, 'HT-202604-0018', 'SJ-202603-0005', '600000', '2026-04-18', '张三', '已完成'],
  ['DD-202601-0003', nj, 'HT-202601-0007', 'SJ-202512-0003', '560000', '2026-01-16', '张三', '已完成'],
];
oPres.forEach(row => {
  const o = ext.orders.find(x => x.no === row[0]);
  ok(!!o, '保留订单 ' + row[0] + ' 存在');
  if (o) ok(jq(o, ['customer', 'contract', 'opp', 'amount', 'date', 'owner', 'status']) === row.slice(1).join('|'), row[0] + ' 字段值不变');
});
const gd = ext.tickets.find(x => x.no === 'GD-202611-0005');
ok(!!gd && gd.customer === nj && gd.type === '服务请求' && gd.desc === '申请新增 5 个用户账号' && gd.status === '待客户确认', '工单 GD-202611-0005 属南京且数据不变');
const gd2 = ext.tickets.find(x => x.no === 'GD-202609-0031');
ok(!!gd2 && gd2.customer === nj && gd2.type === '故障报修', '工单 GD-202609-0031 属南京某某科技');
/* 客户字段与 CUSTOMERS_INIT 一致 */
const INIT = vm.runInContext('JSON.parse(JSON.stringify(CUSTOMERS_INIT))', ctx);
['KH-202611-0001', 'KH-202611-0002', 'KH-202608-0009'].forEach(no => {
  const c = customers.find(x => x.no === no), init = INIT.find(x => x.no === no);
  ok(!!c && JSON.stringify(c) === JSON.stringify(init), '客户 ' + no + ' 基础数据未变');
});

/* 6) 关系图端点 */
sect('关系图');
Object.keys(ext.relations).forEach(nm => {
  const ids = new Set(ext.relations[nm].nodes.map(n => n.id));
  let bad = 0;
  ext.relations[nm].edges.forEach(e => { if (!ids.has(e.from) || !ids.has(e.to)) bad++; });
  ok(bad === 0, nm + ' 关系图边端点均在节点中' + (bad ? '（' + bad + ' 条异常）' : ''));
  ok(relEdgeTypesOk(ext.relations[nm]), nm + ' 边类型合法');
});
function relEdgeTypesOk(g) { return g.edges.every(e => ['汇报', '影响', '支持', '反对', '合作'].includes(e.type)); }
ok(ext.contacts.every(c => !c.reportsTo || (function () { const sib = ext.contacts.find(x => x.no === c.reportsTo); return sib && sib.customer === c.customer; })()), '汇报关系均在同客户内');

/* 7) 联系人字段完备 */
sect('联系人字段');
ok(ext.contacts.every(c => ['决策人', '使用人', '采购人', '财务', '技术'].includes(c.role)), '联系人角色合法');
ok(ext.contacts.every(c => ['高', '中', '低'].includes(c.infl)), '影响力合法');
ok(ext.contacts.every(c => ['支持者', '中立', '反对者'].includes(c.attitude)), '态度合法');
ok(ext.contacts.every(c => ['电话', '微信', '邮件'].includes(c.pref)), '偏好合法');
ok(ext.contacts.every(c => /^\d{4}-\d{2}-\d{2}$/.test(c.birthday)), '生日格式合法');

/* 8) customerBundle */
sect('customerBundle');
const cbFn = vm.runInContext('customerBundle', ctx);
const bb = cbFn(ext, nj, opps);
ok(!!bb.customer && bb.customer.no === 'KH-202611-0001', 'bundle.customer 正确');
['contacts', 'activities', 'opps', 'quotes', 'contracts', 'orders', 'deliveries', 'tickets', 'files'].forEach(k => ok(Array.isArray(bb[k]), 'bundle.' + k + ' 存在'));
ok(bb.relations && Array.isArray(bb.relations.nodes) && Array.isArray(bb.relations.edges), 'bundle.relations（nodes/edges）存在');
ok(bb.contacts.length === njc.length && bb.activities.length >= 2 && bb.opps.length >= 2 && bb.files.length > 0, 'bundle 数据非空（contacts ' + bb.contacts.length + ' / activities ' + bb.activities.length + ' / opps ' + bb.opps.length + ' / files ' + bb.files.length + '）');
ok(bb.opps.every(o => o.customer === nj) && bb.quotes.every(q => q.customer === nj), 'bundle 数据全部归属同一客户');

/* 9) 扩展数据形态 */
sect('扩展客户/线索/商机');
const fnExtra = vm.runInContext('extraCustomers', ctx), fnLeads = vm.runInContext('extraLeads', ctx), fnOpps = vm.runInContext('extraOpps', ctx);
const extras = fnExtra(29);
ok(extras.length === 29, 'extraCustomers 默认 29 条');
ok(extras.every(c => c.owner !== undefined && c.status && (/^KH-\d{6}-\d{4}$/).test(c.no)), '扩展客户编号与字段与 CUSTOMERS_INIT 形态一致');
ok(extras.filter(c => !c.owner).length >= 3, '扩展客户中包含公海客户（owner 为空, ' + extras.filter(c => !c.owner).length + ' 家）');
ok(extras.every(c => c.name.includes('某某')), '扩展客户为「某某」风格虚构企业');
ok(fnLeads().every(l => l.no && l.company && l.name !== undefined), 'extraLeads 字段形态一致');
ok(fnOpps().every(o => ['contact', 'need', 'plan', 'quote', 'approve'].includes(o.stage)), 'extraOpps 阶段合法');

console.log('\n通过 ' + passed + ' 项断言' + (failed ? '，失败 ' + failed + ' 项' : '，全部通过'));
process.exit(failed ? 1 : 0);
