/* ===== 第 1 阶段：扩展数据层（纯函数与常量，不依赖 store；全部用确定性伪随机，保证每次刷新数据相同） ===== */

/* --- 确定性随机工具（禁用 Math.random） --- */
function extRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function extHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function extPad(n, w) { return String(n).padStart(w || 4, '0'); }
function extPick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
function extRint(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
function extCh(r, p) { return r() < p; }
function extYmd(d) { return d.toISOString().slice(0, 10); }
function extAddDays(str, n) { return extYmd(new Date(new Date(str).getTime() + n * 86400000)); }
function extShort(name) { return String(name).replace(/(有限公司|股份有限公司|集团)$/g, ''); }

/* --- 姓名池（带拼音用于生成邮箱） --- */
const EXT_PY = { 王: 'wang', 李: 'li', 张: 'zhang', 刘: 'liu', 陈: 'chen', 杨: 'yang', 赵: 'zhao', 黄: 'huang', 周: 'zhou', 吴: 'wu', 徐: 'xu', 孙: 'sun', 胡: 'hu', 郭: 'guo', 林: 'lin', 何: 'he', 高: 'gao', 罗: 'luo', 郑: 'zheng', 梁: 'liang', 谢: 'xie', 宋: 'song', 唐: 'tang', 许: 'xu', 韩: 'han', 冯: 'feng', 董: 'dong', 程: 'cheng', 袁: 'yuan', 汪: 'wang', 苏: 'su' };
const EXT_SURNAMES = Object.keys(EXT_PY);
const EXT_GIVENS = ['志强', '文博', '建平', '秀英', '海涛', '丽华', '俊杰', '桂芳', '晨曦', '浩然', '雨欣', '思远', '佳琪', '立德', '永康', '淑华', '雅琴', '家豪', '心怡', '国栋', '雪梅', '启明', '双双', '立群', '晓东', '春燕', '振宇', '巧珍', '正文', '曼华', '明轩', '维宁', '孝慈', '安泰', '乐平', '书华', '云松', '铁军', '雪松', '子谦'];
function extGenName(r, used) {
  for (let t = 0; t < 120; t++) {
    const s = extPick(r, EXT_SURNAMES), g = extPick(r, EXT_GIVENS), n = s + g;
    if (!used.has(n)) { used.add(n); return { name: n, py: EXT_PY[s] }; }
  }
  return { name: '联络人' + extRint(r, 1, 999), py: 'y' };
}
const extPhone = r => '1' + extPick(r, [3, 5, 7, 8]) + extRint(r, 0, 9) + '****' + extPad(extRint(r, 1000, 9999));
function extOwner(r) { return extCh(r, 0.4) ? '张三' : (extCh(r, 0.5) ? '李四' : (extCh(r, 0.5) ? '王五' : '赵六')); }

/* --- 常 量 --- */
const EXT_NJ = '南京某某科技有限公司';
const EXT_ORIG_NO = new Set(CUSTOMERS_INIT.map(c => c.no).concat(['KH-202606-0008']));
const EXT_CITY = [
  ['湖北省', '武汉'], ['湖南省', '长沙'], ['四川省', '成都'], ['陕西省', '西安'], ['山东省', '青岛'], ['山东省', '济南'],
  ['河南省', '郑州'], ['辽宁省', '沈阳'], ['辽宁省', '大连'], ['福建省', '福州'], ['福建省', '厦门'], ['云南省', '昆明'],
  ['江西省', '南昌'], ['重庆市', '重庆'], ['天津市', '天津'], ['河北省', '石家庄'], ['山西省', '太原'], ['贵州省', '贵阳'],
  ['广西壮族自治区', '南宁'], ['海南省', '海口'], ['广东省', '深圳'], ['广东省', '广州'], ['广东省', '佛山'],
  ['江苏省', '南通'], ['江苏省', '徐州'], ['江苏省', '淮安'], ['山东省', '烟台'], ['河南省', '洛阳'], ['江西省', '赣州'], ['安徽省', '芜湖'],
];
const EXT_CITY_GEO = {
  江苏省: [32.06, 118.78], 浙江省: [30.27, 120.15], 安徽省: [31.82, 117.23], 上海市: [31.23, 121.47],
  湖北省: [30.59, 114.31], 湖南省: [28.23, 112.94], 四川省: [30.57, 104.07], 陕西省: [34.26, 108.94],
  山东省: [36.07, 120.38], 河南省: [34.75, 113.63], 辽宁省: [41.8, 123.43], 福建省: [26.08, 119.3],
  云南省: [25.05, 102.71], 江西省: [28.68, 115.86], 重庆市: [29.56, 106.55], 天津市: [39.08, 117.2],
  河北省: [38.04, 114.51], 山西省: [37.87, 112.55], 贵州省: [26.65, 106.63], 广西壮族自治区: [22.82, 108.32],
  海南省: [20.04, 110.32], 广东省: [23.13, 113.26],
};
const EXT_BUSS = ['食品', '电子科技', '机械制造', '建材', '环保科技', '新材料', '生物科技', '医疗器械', '汽车服务', '农业发展', '化工', '家居', '文化传媒', '五金制品', '纺织', '光电科技', '新能源', '包装', '智能装备', '乳业'];
const EXT_REGION_SUF = ['高新区', '经开区', '', '工业园区', '总部经济区'];
const EXT_REMARKS = ['重点维护', '新对接进入观察期', '内部关系成熟，可借力', '对接过一轮，待重启', '更替过一次对接人', '偏好线下沟通'];

/* --- 南京某某科技保留联系人（陈总监/刘经理/周会计/黄工，原字段值不变） --- */
const EXT_NJ_CONTACTS = [
  { no: 'LX-000001', name: '陈总监', customer: EXT_NJ, phone: '138****8888', email: 'chen@example.com', dept: '信息中心', title: 'CIO', role: '决策人', infl: '高', pref: '电话', key: true, attitude: '支持者', reportsTo: '', birthday: '1976-04-11', remark: '原对接的核心决策人，ERP 项目一票拍板', owner: '张三' },
  { no: 'LX-000002', name: '刘经理', customer: EXT_NJ, phone: '139****0021', email: 'liu@example.com', dept: '运营部', title: '运营经理', role: '使用人', infl: '中', pref: '微信', key: false, attitude: '中立', reportsTo: 'LX-000001', birthday: '1985-09-19', remark: '日常使用对接人，反馈移动端问题多', owner: '张三' },
  { no: 'LX-000003', name: '周会计', customer: EXT_NJ, phone: '137****6603', email: 'zhou@example.com', dept: '财务部', title: '财务主管', role: '财务', infl: '中', pref: '邮件', key: false, attitude: '中立', reportsTo: 'LX-000001', birthday: '1983-12-05', remark: '付款流程组织者，对发票抬头敏感', owner: '张三' },
  { no: 'LX-000004', name: '黄工', customer: EXT_NJ, phone: '133****2290', email: 'huang@example.com', dept: '技术部', title: '系统工程师', role: '技术', infl: '低', pref: '微信', key: false, attitude: '中立', reportsTo: 'LX-000001', birthday: '1991-06-27', remark: '现场接口对接人，配合联调', owner: '张三' },
];

/* --- 产品目录（30 个：保留占位 5 条原值 + 生成 25 条） --- */
const EXT_PRODUCTS = [
  { no: 'CP-0001', name: 'CRM 企业版软件授权', cat: '软件', spec: '50 用户 · 年付', unit: '用户·年', price: 3600, cost: 1200, status: '在售', desc: '面向中大型企业的客户全生命周期管理套件' },
  { no: 'CP-0002', name: '移动端扩展包', cat: '软件', spec: '含企业微信集成', unit: '套', price: 28000, cost: 9000, status: '在售', desc: '企业微信/钉钉集成与移动拜访签到' },
  { no: 'CP-0003', name: 'CRM 标准版软件授权', cat: '软件', spec: '20 用户 · 年付', unit: '用户·年', price: 2200, cost: 800, status: '在售', desc: '中小团队轻量客户管理' },
  { no: 'CP-0004', name: '渠道订货模块', cat: '软件', spec: '渠道门户 · 年付', unit: '站点', price: 26000, cost: 8800, status: '在售', desc: '经销商在线订货与返利结算' },
  { no: 'CP-0005', name: 'BI 数据看板', cat: '软件', spec: '经营分析 · 年付', unit: '套', price: 32000, cost: 10500, status: '在售', desc: '销售/回款/服务的经营指标看板' },
  { no: 'CP-0006', name: 'MES 轻量版软件', cat: '软件', spec: '车间产线对接', unit: '套', price: 88000, cost: 32000, status: '停售', desc: '产线工单采集（2026-06 起暂停售卖）' },
  { no: 'CP-0007', name: 'OCR 识别增值包', cat: '增值服务', spec: '发票/单据识别', unit: '套', price: 9800, cost: 3600, status: '在售', desc: '票据批量识别入库' },
  { no: 'CP-0008', name: '电子签章服务', cat: '增值服务', spec: '合规电子合同签署', unit: '份', price: 12, cost: 5, status: '在售', desc: '与第三方 CA 对接的按次签署' },
  { no: 'CP-0009', name: '专属云部署服务', cat: '增值服务', spec: '私有云环境交付', unit: '次', price: 66000, cost: 25000, status: '在售', desc: '客户侧私有云环境安装部署' },
  { no: 'CP-0010', name: '短信充值包（10 万条）', cat: '增值服务', spec: '验证码/营销短信', unit: '包', price: 4500, cost: 3200, status: '在售', desc: '对接三大运营商通道' },
  { no: 'CP-0011', name: '标准实施服务', cat: '实施费用', spec: '标准实施 · 人天', unit: '人天', price: 2000, cost: 1100, status: '在售', desc: '基础配置、流程梳理与上线培训' },
  { no: 'CP-0012', name: '数据迁移服务', cat: '服务', spec: '历史数据清洗导入', unit: '项', price: 15800, cost: 6000, status: '在售', desc: '旧系统客户/商机数据清洗迁移' },
  { no: 'CP-0013', name: '高级定制开发服务', cat: '服务', spec: '需求评估 + 开发', unit: '人天', price: 2600, cost: 1300, status: '在售', desc: '个性化定制开发' },
  { no: 'CP-0014', name: '接口对接开发服务', cat: '服务', spec: '第三方系统对接', unit: '项', price: 24000, cost: 9000, status: '在售', desc: 'ERP/财务/电商平台接口' },
  { no: 'CP-0015', name: '现场培训服务', cat: '服务', spec: '按场次计费', unit: '场', price: 6000, cost: 2200, status: '在售', desc: '线下集中培训' },
  { no: 'CP-0016', name: '上门巡检服务', cat: '维护费用', spec: '季度巡检', unit: '次', price: 3600, cost: 1400, status: '在售', desc: '季度系统健康度巡检' },
  { no: 'CP-0017', name: '系统升级服务', cat: '维护费用', spec: '年度版本升级', unit: '年', price: 12000, cost: 4200, status: '在售', desc: '一年内版本升级与补丁' },
  { no: 'CP-0018', name: '云主机资源包', cat: '增值服务', spec: '中等配置 · 年付', unit: '年', price: 9600, cost: 6100, status: '停用', desc: '已下线，改由客户自备云资源' },
  { no: 'CP-0019', name: '数据备份服务', cat: '增值服务', spec: '异地备份 · 年付', unit: '年', price: 5200, cost: 2100, status: '在售', desc: '每日异地备份' },
  { no: 'CP-0020', name: '会员运营模块', cat: '软件', spec: '积分/卡券体系', unit: '套', price: 36000, cost: 12500, status: '在售', desc: '零售门店会员运营' },
  { no: 'CP-0021', name: '年度运维服务', cat: '维护费用', spec: '7×12 小时响应', unit: '年', price: 18000, cost: 7000, status: '在售', desc: '远程运维与技术支持' },
  { no: 'CP-0022', name: '供应链协同模块', cat: '软件', spec: '采购/库存协同', unit: '套', price: 56000, cost: 19000, status: '在售', desc: '上下游库存与采购协同' },
  { no: 'CP-0023', name: '设备管理模块', cat: '软件', spec: '台账与维保提醒', unit: '套', price: 42000, cost: 15000, status: '在售', desc: '设备台账、维保工单' },
  { no: 'CP-0024', name: '报表定制开发', cat: '服务', spec: '按报表计费', unit: '张', price: 3000, cost: 1200, status: '在售', desc: '复杂报表定制' },
  { no: 'CP-0025', name: '售后驻场服务', cat: '增值服务', spec: '每月 5 人天 · 月付', unit: '月', price: 30000, cost: 12000, status: '在售', desc: '驻场支持' },
  { no: 'CP-0026', name: '微信小程序对接', cat: '增值服务', spec: '客户侧小程序模板', unit: '套', price: 22000, cost: 8200, status: '在售', desc: '小程序与 CRM 打通' },
  { no: 'CP-0027', name: '历史数据修复（增值）', cat: '服务', spec: '过期数据修复', unit: '项', price: 8800, cost: 3500, status: '停售', desc: '一次性数据修复（不再单独售卖）' },
  { no: 'CP-0028', name: '二次开发保留工时（20 人天）', cat: '套餐', spec: '年度打包套餐', unit: '包', price: 46000, cost: 19000, status: '在售', desc: '20 人天开发工时套餐' },
  { no: 'CP-0029', name: '企业版升级套餐', cat: '套餐', spec: '标准版→企业版差额补足', unit: '套', price: 52000, cost: 18000, status: '在售', desc: '版本升级补差' },
  { no: 'CP-0030', name: '基础版续费套餐', cat: '套餐', spec: '标准版次年续费', unit: '套', price: 20000, cost: 7000, status: '在售', desc: '标准版续费优惠包' },
];

/* --- 报价保留 4 条（客户归属与字段值不变，BJ-202611-0008 与折扣审批数据对得上） --- */
const EXT_QUOTES_PRES = [
  { no: 'BJ-202611-0008', customer: EXT_NJ, opp: 'SJ-202609-0012', amount: 334977.2, disc: 25360, date: '2026-11-02', valid: '2026-12-02', owner: '张三', appr: '审批中', ver: 'V3', items: [
    { productNo: 'CP-0001', name: 'CRM 企业版软件授权', qty: 50, unit: '用户·年', price: 3600, discount: 90 },
    { productNo: 'CP-0002', name: '移动端扩展包', qty: 1, unit: '套', price: 28000, discount: 85 },
    { productNo: 'CP-0011', name: '标准实施服务', qty: 40, unit: '人天', price: 2000, discount: 100 },
    { productNo: 'CP-0012', name: '数据迁移服务', qty: 1, unit: '项', price: 15800, discount: 80 },
    { productNo: 'CP-0021', name: '年度运维服务', qty: 1, unit: '年', price: 18000, discount: 100 } ] },
  { no: 'BJ-202610-0019', customer: '合肥某某餐饮连锁有限公司', opp: 'SJ-202609-0006', amount: 260000, disc: 35000, date: '2026-10-30', valid: '2026-11-30', owner: '张三', appr: '审批中', ver: 'V2', items: [
    { productNo: 'CP-0001', name: 'CRM 企业版软件授权', qty: 40, unit: '用户·年', price: 3600, discount: 86 },
    { productNo: 'CP-0011', name: '标准实施服务', qty: 30, unit: '人天', price: 2000, discount: 100 },
    { productNo: 'CP-0021', name: '年度运维服务', qty: 1, unit: '年', price: 18000, discount: 92 } ] },
  { no: 'BJ-202610-0011', customer: EXT_NJ, opp: 'SJ-202608-0004', amount: 100000, disc: 0, date: '2026-10-08', valid: '2026-11-08', owner: '张三', appr: '已通过', ver: 'V1', items: [
    { productNo: 'CP-0011', name: '标准实施服务', qty: 50, unit: '人天', price: 2000, discount: 100 },
    { productNo: 'CP-0012', name: '数据迁移服务', qty: 1, unit: '项', price: 15800, discount: 100 } ] },
  { no: 'BJ-202610-0006', customer: '苏州某某汽配有限公司', opp: 'SJ-202609-0010', amount: 420000, disc: 18000, date: '2026-10-05', valid: '2026-11-05', owner: '李四', appr: '已通过', ver: 'V2', items: [
    { productNo: 'CP-0002', name: '移动端扩展包', qty: 2, unit: '套', price: 28000, discount: 90 },
    { productNo: 'CP-0011', name: '标准实施服务', qty: 80, unit: '人天', price: 2000, discount: 95 },
    { productNo: 'CP-0021', name: '年度运维服务', qty: 2, unit: '年', price: 18000, discount: 100 } ] },
];

/* --- 合同保留 7 条（PH 6 条按原值，另补 HT-202611-0004 使订单 DD-202611-0003 的合同引用成立；回款计划与 buildPay() 不矛盾） --- */
const EXT_CONTRACTS_PRES = [
  { no: 'HT-202611-0003', name: '南京某某科技 ERP 实施合同', customer: EXT_NJ, opp: 'SJ-202608-0004', quote: 'BJ-202610-0011', type: '服务合同', amount: 100000, sign: '2026-10-19', end: '2027-04-19', owner: '张三', status: '履约中',
    signDate: '2026-10-19', startDate: '2026-10-22', payTerms: '30 / 40 / 30',
    plans: [ { stage: '合同签署', date: '2026-10-20', amount: 30000, status: '已回款' }, { stage: '项目上线', date: '2026-10-28', amount: 40000, status: '部分回款' }, { stage: '项目验收', date: '2026-12-15', amount: 30000, status: '未回款' } ],
    attachments: [ { name: 'HT-202611-0003 合同扫描件.pdf', size: '1.6MB', date: '2026-10-19' }, { name: '付款条款确认函.pdf', size: '320KB', date: '2026-10-19' } ],
    approvals: [ { node: '发起申请', who: '张三', result: '提交', time: '2026-10-16 14:00' }, { node: '销售经理', who: '李四', result: '同意', time: '2026-10-17 09:30' }, { node: '财务', who: '王芳', result: '同意', time: '2026-10-18 10:05' } ] },
  { no: 'HT-202611-0004', name: '宁波某某商贸会员系统升级合同', customer: '宁波某某商贸有限公司', opp: 'SJ-202608-0002', quote: '', type: '续费合同', amount: 220000, sign: '2026-10-30', end: '2027-10-29', owner: '张三', status: '生效',
    signDate: '2026-10-30', startDate: '2026-11-05', payTerms: '5 / 5',
    plans: [ { stage: '预付款', date: '2026-11-01', amount: 110000, status: '未回款' }, { stage: '验收款', date: '2027-02-01', amount: 110000, status: '未回款' } ],
    attachments: [ { name: 'HT-202611-0004 合同扫描件.pdf', size: '1.2MB', date: '2026-10-30' } ],
    approvals: [ { node: '发起申请', who: '张三', result: '提交', time: '2026-10-27 09:00' }, { node: '销售经理', who: '周总监', result: '同意', time: '2026-10-28 15:40' }, { node: '财务', who: '王芳', result: '同意', time: '2026-10-29 10:20' } ] },
  { no: 'HT-202611-0006', name: '苏州某某汽配渠道平台合同', customer: '苏州某某汽配有限公司', opp: 'SJ-202609-0010', quote: 'BJ-202610-0006', type: '销售合同', amount: 420000, sign: '-', end: '2027-11-21', owner: '李四', status: '待审批',
    signDate: '', startDate: '', payTerms: '3 / 3 / 4',
    plans: [ { stage: '合同签署', date: '2026-11-20', amount: 126000, status: '未回款' }, { stage: '项目上线', date: '2027-03-20', amount: 126000, status: '未回款' }, { stage: '项目验收', date: '2027-05-20', amount: 168000, status: '未回款' } ],
    attachments: [],
    approvals: [ { node: '发起申请', who: '李四', result: '提交', time: '2026-11-01 17:10' }, { node: '销售经理', who: '张三', result: '待审批', time: '' }, { node: '法务', who: '待指派', result: '等待', time: '' } ] },
  { no: 'HT-202608-0012', name: '江苏某某集团平台建设合同', customer: '江苏某某集团', opp: 'SJ-202607-0003', quote: '', type: '销售合同', amount: 600000, sign: '2026-08-12', end: '2027-08-11', owner: '李四', status: '履约中',
    signDate: '2026-08-12', startDate: '2026-08-15', payTerms: '5 / 5',
    plans: [ { stage: '预付款', date: '2026-08-20', amount: 300000, status: '已回款' }, { stage: '验收款', date: '2026-11-20', amount: 300000, status: '未回款' } ],
    attachments: [ { name: 'HT-202608-0012 合同扫描件.pdf', size: '2.1MB', date: '2026-08-12' } ],
    approvals: [ { node: '发起申请', who: '李四', result: '提交', time: '2026-08-08 11:00' }, { node: '销售经理', who: '周总监', result: '同意', time: '2026-08-09 16:20' }, { node: '法务', who: '陈法务', result: '同意', time: '2026-08-10 10:00' }, { node: '财务', who: '王芳', result: '同意', time: '2026-08-11 09:40' } ] },
  { no: 'HT-202607-0004', name: '杭州某某酒店年度服务合同', customer: '杭州某某酒店管理有限公司', opp: 'SJ-202606-0007', quote: '', type: '续费合同', amount: 180000, sign: '2026-07-05', end: '2026-11-14', owner: '赵六', status: '履约中',
    signDate: '2026-07-05', startDate: '2026-07-08', payTerms: '6 / 4',
    plans: [ { stage: '首付款', date: '2026-07-10', amount: 108000, status: '已回款' }, { stage: '尾款', date: '2026-10-25', amount: 72000, status: '部分回款' } ],
    attachments: [ { name: 'HT-202607-0004 合同扫描件.pdf', size: '0.9MB', date: '2026-07-05' } ],
    approvals: [ { node: '发起申请', who: '赵六', result: '提交', time: '2026-07-01 10:30' }, { node: '销售经理', who: '周总监', result: '同意', time: '2026-07-02 14:10' }, { node: '财务', who: '李琴', result: '同意', time: '2026-07-03 09:25' } ] },
  { no: 'HT-202604-0018', name: '南京某某科技 ERP 软件授权合同', customer: EXT_NJ, opp: 'SJ-202603-0005', quote: '', type: '销售合同', amount: 600000, sign: '2026-04-18', end: '2027-04-17', owner: '张三', status: '履约中',
    signDate: '2026-04-18', startDate: '2026-04-20', payTerms: '4 / 3 / 3',
    plans: [ { stage: '首付款', date: '2026-04-20', amount: 240000, status: '已回款' }, { stage: '二期货款', date: '2026-08-30', amount: 180000, status: '已回款' }, { stage: '三期货款', date: '2026-12-20', amount: 180000, status: '未回款' } ],
    attachments: [ { name: 'HT-202604-0018 合同扫描件.pdf', size: '1.5MB', date: '2026-04-18' } ],
    approvals: [ { node: '发起申请', who: '张三', result: '提交', time: '2026-04-12 09:20' }, { node: '销售经理', who: '周总监', result: '同意', time: '2026-04-13 11:00' }, { node: '法务', who: '陈法务', result: '同意', time: '2026-04-14 16:30' } ] },
  { no: 'HT-202601-0007', name: '南京某某科技 ERP 二期定制开发合同', customer: EXT_NJ, opp: 'SJ-202512-0003', quote: '', type: '销售合同', amount: 560000, sign: '2026-01-16', end: '2027-01-15', owner: '张三', status: '履约中',
    signDate: '2026-01-16', startDate: '2026-01-18', payTerms: '5 / 5',
    plans: [ { stage: '预付款', date: '2026-01-18', amount: 280000, status: '已回款' }, { stage: '验收款', date: '2026-07-18', amount: 280000, status: '已回款' } ],
    attachments: [ { name: 'HT-202601-0007 合同扫描件.pdf', size: '1.9MB', date: '2026-01-16' } ],
    approvals: [ { node: '发起申请', who: '张三', result: '提交', time: '2026-01-10 15:10' }, { node: '销售经理', who: '周总监', result: '同意', time: '2026-01-11 10:45' }, { node: '财务', who: '王芳', result: '同意', time: '2026-01-12 09:30' } ] },
];

/* --- 订单保留 6 条（任务要求保留 3 条 + PH 原有 3 条；合同引用均已闭环） --- */
const EXT_ORDERS_PRES = [
  { no: 'DD-202611-0002', customer: EXT_NJ, contract: 'HT-202611-0003', opp: 'SJ-202608-0004', amount: 100000, date: '2026-10-19', dlv: '2026-12-10', owner: '张三', status: '交付中' },
  { no: 'DD-202611-0003', customer: '宁波某某商贸有限公司', contract: 'HT-202611-0004', opp: 'SJ-202608-0002', amount: 220000, date: '2026-11-01', dlv: '2027-01-10', owner: '张三', status: '待确认' },
  { no: 'DD-202604-0006', customer: EXT_NJ, contract: 'HT-202604-0018', opp: 'SJ-202603-0005', amount: 600000, date: '2026-04-18', dlv: '2026-05-20', owner: '张三', status: '已完成' },
  { no: 'DD-202601-0003', customer: EXT_NJ, contract: 'HT-202601-0007', opp: 'SJ-202512-0003', amount: 560000, date: '2026-01-16', dlv: '2026-03-05', owner: '张三', status: '已完成' },
  { no: 'DD-202608-0009', customer: '江苏某某集团', contract: 'HT-202608-0012', opp: 'SJ-202607-0003', amount: 600000, date: '2026-08-12', dlv: '2026-12-30', owner: '李四', status: '交付中' },
  { no: 'DD-202607-0004', customer: '杭州某某酒店管理有限公司', contract: 'HT-202607-0004', opp: 'SJ-202606-0007', amount: 180000, date: '2026-07-05', dlv: '2026-08-05', owner: '赵六', status: '已完成' },
];

/* --- 交付项目保留 3 条（与占位页一致） --- */
const EXT_DELIVERIES_PRES = [
  { no: 'XM-202611-0002', name: 'ERP 实施项目', customer: EXT_NJ, order: 'DD-202611-0002', pm: '孙工', status: '实施中', progress: 55, planStart: '2026-10-22', planEnd: '2026-12-10' },
  { no: 'XM-202608-0004', name: '协议客户平台建设', customer: '江苏某某集团', order: 'DD-202608-0009', pm: '钱工', status: '实施中', progress: 82, planStart: '2026-08-20', planEnd: '2026-11-15' },
  { no: 'XM-202607-0002', name: '年度服务交付', customer: '杭州某某酒店管理有限公司', order: 'DD-202607-0004', pm: '孙工', status: '已完成', progress: 100, planStart: '2026-07-08', planEnd: '2026-08-30' },
];

/* --- 工单保留 4 条（GD-202611-0005 / GD-202609-0031 属南京某某科技，字段值不变） --- */
const EXT_TICKETS_PRES = [
  { no: 'GD-202611-0005', type: '服务请求', customer: EXT_NJ, contact: '周会计', priority: '中', status: '待客户确认', handler: '客服-小陈', desc: '申请新增 5 个用户账号', created: '2026-11-01 15:30', slaDeadline: '2026-11-02 15:30',
    records: [ { time: '2026-11-01 15:32', who: '客服-小陈', act: '创建工单', note: '待客户确认账号信息' } ], images: [] },
  { no: 'GD-202609-0031', type: '故障报修', customer: EXT_NJ, contact: '黄工', priority: '高', status: '已关闭', handler: '技术-黄工', desc: '月度报表导出出现乱码', created: '2026-09-27 09:40', slaDeadline: '2026-09-27 13:40', solvedTime: '2026-09-28 10:05', rating: 4,
    records: [
      { time: '2026-09-27 09:45', who: '技术-黄工', act: '接单', note: '初步定位为服务器字体缺失' },
      { time: '2026-09-27 15:10', who: '技术-黄工', act: '修复', note: '服务端安装中文字体并回归验证' },
      { time: '2026-09-28 10:05', who: '黄工', act: '客户确认', note: '客户确认问题解决，工单关闭' } ], images: [] },
  { no: 'GD-202611-0007', type: '投诉', customer: '江苏某某集团', contact: '周主任', priority: '紧急', status: '处理中', handler: '林晓', desc: '协议客户报表导出失败，影响月结', created: '2026-11-02 08:20', slaDeadline: '2026-11-02 10:20',
    records: [ { time: '2026-11-02 08:25', who: '林晓', act: '接单', note: '紧急工单，先临时导出协助月结' } ], images: [] },
  { no: 'GD-202610-0042', type: '故障报修', customer: '苏州某某汽配有限公司', contact: '', priority: '高', status: '已关闭', handler: '孙工', desc: '移动端无法同步订单数据', created: '2026-10-30 11:05', slaDeadline: '2026-10-30 15:05',
    records: [ { time: '2026-10-30 11:20', who: '孙工', act: '修复', note: '同步队列积压，清空后恢复正常' }, { time: '2026-10-31 09:00', who: '孙工', act: '客户确认', note: '客户确认已解决，关闭工单' } ], images: [], solvedTime: '2026-10-31 09:00', rating: 5 },
];

/* --- 部门树 / 角色（6 个）/ 用户 --- */
const EXT_DEPTS = [
  { no: 'D00', name: '某某软件有限公司', parent: '' },
  { no: 'D01', name: '总经办', parent: 'D00' },
  { no: 'D02', name: '华东销售中心', parent: 'D00' },
  { no: 'D03', name: '华东销售一部', parent: 'D02' },
  { no: 'D04', name: '华东销售二部', parent: 'D02' },
  { no: 'D05', name: '售前支持部', parent: 'D02' },
  { no: 'D06', name: '财务部', parent: 'D00' },
  { no: 'D07', name: '交付与客服部', parent: 'D00' },
  { no: 'D08', name: '信息技术部', parent: 'D00' },
];
const EXT_ROLES = [
  { key: 'sales', name: '销售', desc: '跟进名下线索/客户/商机，编辑并提交报价', dataScope: '本人', menus: ['工作台', '线索管理', '客户管理', '联系人管理', '商机管理', '报价管理', '活动管理'], buttons: ['新增', '编辑', '记录跟进', '公海领取', '报价提交', '导出'], fieldMask: ['合同-成本价', '报价-毛利率', '回款-财务备注'] },
  { key: 'sales_manager', name: '销售经理', desc: '管理部门团队，可审折扣、转移客户与分配线索', dataScope: '本部门及下级', menus: ['工作台', '线索管理', '客户管理', '联系人管理', '商机管理', '报价管理', '合同管理', '订单管理', '活动管理', '数据分析'], buttons: ['新增', '编辑', '折扣审批', '线索分配', '客户转移', '导出'], fieldMask: ['合同-成本价', '报价-毛利率'] },
  { key: 'presale', name: '售前', desc: '方案支持与标书编写，协助推进商机', dataScope: '本部门', menus: ['工作台', '客户管理', '联系人管理', '商机管理', '报价管理'], buttons: ['方案上传', '跟进记录'], fieldMask: ['回款-全部', '合同-金额明细'] },
  { key: 'finance', name: '财务', desc: '回款确认、开票与合同/报价的财务复核', dataScope: '全部', menus: ['工作台', '合同管理', '订单管理', '回款管理', '报价管理', '数据分析'], buttons: ['回款确认', '开票', '冲销申请'], fieldMask: ['跟进-内容脱敏'] },
  { key: 'delivery_service', name: '交付/客服', desc: '实施交付、项目进度与服务工单处理', dataScope: '本部门及下级', menus: ['工作台', '客户管理', '联系人管理', '交付管理', '服务管理', '活动管理'], buttons: ['新建项目', '受理', '指派处理人', '转派', '关闭工单'], fieldMask: ['报价-折扣明细', '回款-全部'] },
  { key: 'admin', name: '系统管理员', desc: '组织架构、用户与角色权限、流程与字段配置', dataScope: '全部', menus: ['工作台', '线索管理', '客户管理', '商机管理', '报价管理', '合同管理', '订单管理', '回款管理', '活动管理', '交付管理', '服务管理', '数据分析', '系统管理'], buttons: ['全部'], fieldMask: [] },
];
const EXT_USERS = [
  { id: 'u01', acc: 'admin', name: '管理员', dept: '总经办', role: '系统管理员', phone: '139****0001', email: 'admin@example.com', status: '启用', lastLogin: '2026-11-02 07:55' },
  { id: 'u02', acc: 'zhangsan', name: '张三', dept: '华东销售一部', role: '销售经理', phone: '137****5501', email: 'zhangsan@example.com', status: '启用', lastLogin: '2026-11-02 08:31' },
  { id: 'u03', acc: 'lisi', name: '李四', dept: '华东销售二部', role: '销售经理', phone: '137****5502', email: 'lisi@example.com', status: '启用', lastLogin: '2026-11-02 08:47' },
  { id: 'u04', acc: 'wangwu', name: '王五', dept: '华东销售一部', role: '销售', phone: '137****5503', email: 'wangwu@example.com', status: '启用', lastLogin: '2026-11-02 08:12' },
  { id: 'u05', acc: 'zhaoliu', name: '赵六', dept: '华东销售二部', role: '销售', phone: '137****5504', email: 'zhaoliu@example.com', status: '启用', lastLogin: '2026-11-01 18:25' },
  { id: 'u06', acc: 'zhouzj', name: '周总监', dept: '华东销售中心', role: '销售经理', phone: '137****5505', email: 'zhouzj@example.com', status: '启用', lastLogin: '2026-11-01 18:40' },
  { id: 'u07', acc: 'sujian', name: '苏简', dept: '售前支持部', role: '售前', phone: '137****5506', email: 'sujian@example.com', status: '启用', lastLogin: '2026-11-02 09:02' },
  { id: 'u08', acc: 'heqm', name: '何启明', dept: '售前支持部', role: '售前', phone: '137****5507', email: 'heqm@example.com', status: '启用', lastLogin: '2026-11-01 16:44' },
  { id: 'u09', acc: 'wangfang', name: '王芳', dept: '财务部', role: '财务', phone: '137****5508', email: 'wangfang@example.com', status: '启用', lastLogin: '2026-11-02 09:01' },
  { id: 'u10', acc: 'liqin', name: '李琴', dept: '财务部', role: '财务', phone: '137****5509', email: 'liqin@example.com', status: '启用', lastLogin: '2026-11-02 09:05' },
  { id: 'u11', acc: 'sunwg', name: '孙工', dept: '交付与客服部', role: '交付/客服', phone: '137****5510', email: 'sunwg@example.com', status: '启用', lastLogin: '2026-11-02 08:50' },
  { id: 'u12', acc: 'qiangq', name: '钱工', dept: '交付与客服部', role: '交付/客服', phone: '137****5511', email: 'qiangq@example.com', status: '启用', lastLogin: '2026-11-01 17:30' },
  { id: 'u13', acc: 'linxy', name: '林晓', dept: '交付与客服部', role: '交付/客服', phone: '137****5512', email: 'linxy@example.com', status: '启用', lastLogin: '2026-11-02 09:10' },
  { id: 'u14', acc: 'chenyue', name: '陈悦', dept: '交付与客服部', role: '交付/客服', phone: '137****5513', email: 'chenyue@example.com', status: '停用', lastLogin: '2026-09-18 10:12' },
  { id: 'u15', acc: 'maoks', name: '毛科生', dept: '信息技术部', role: '系统管理员', phone: '137****5514', email: 'maoks@example.com', status: '启用', lastLogin: '2026-11-02 08:05' },
  { id: 'u16', acc: 'libw', name: '李彬文', dept: '信息技术部', role: '系统管理员', phone: '137****5515', email: 'libw@example.com', status: '停用', lastLogin: '2026-08-20 14:02' },
];

/* --- 额外客户（29 家，memo 缓存以保证确定性；含少量公海客户 owner:''） --- */
let EXT_EXTRA_CUSTS = null;
function extraCustomers(n) {
  n = n == null ? 29 : n;
  if (n === 29 && EXT_EXTRA_CUSTS) return EXT_EXTRA_CUSTS;
  const r = extRng(971201);
  const used = new Set(CUSTOMERS_INIT.map(c => c.name).concat(['扬州某某教育科技有限公司', '苏州某某智能装备有限公司', '杭州某某连锁餐饮有限公司', '合肥某某贸易有限公司', '无锡某某汽配有限公司', '宁波某某商贸有限公司', '常州某某物流有限公司', '无锡某某精密制造有限公司']));
  const out = [];
  const mc = {};
  for (let i = 0; i < n; i++) {
    if (i === 0) {   // 首条固定为宁波某某商贸（线索 XS-202610-0024 的转化结果，被保留订单/合同引用）
      out.push({ no: 'KH-202610-0036', name: '宁波某某商贸有限公司', type: '企业客户', industry: '零售', level: '普通客户', source: '活动', region: '浙江省宁波市鄞州区', scale: '中型', owner: '张三', status: '正常', lastFollow: '2026-10-29', lastDeal: '2026-10-29', total: 220000, created: '2026-10-24', phone: '134****6602', key: false });
      continue;
    }
    let name = '';
    for (let t = 0; t < 120; t++) {
      const pc = extPick(r, EXT_CITY), biz = extPick(r, EXT_BUSS);
      name = pc[1] + '某某' + biz + '有限公司';
      if (!used.has(name)) { used.add(name); break; }
    }
    const ym = extPick(r, ['202605', '202606', '202607', '202608', '202609', '202610', '202611']);
    mc[ym] = (mc[ym] || 0) + 1;
    const level = extPick(r, ['普通客户', '普通客户', '重点客户', '潜在客户', '战略客户']);
    const pool = extCh(r, 0.2);
    const churn = !pool && extCh(r, 0.1);
    const pause = !pool && !churn && extCh(r, 0.07);
    const status = churn ? '流失' : pause ? '暂停合作' : (pool ? '正常' : extPick(r, ['正常', '跟进中']));
    const owner = pool ? '' : extOwner(r);
    const dealt = !pool && !churn && status !== '潜在客户' && extCh(r, 0.6);
    const pc = EXT_CITY[(i * 7 + 3) % EXT_CITY.length];
    const region = (pc[0] === '上海市' || pc[0] === '天津市' || pc[0] === '重庆市' ? pc[1] + '市' : pc[0] + pc[1] + '市') + extPick(r, EXT_REGION_SUF);
    const cust = {
      no: 'KH-' + ym + '-' + extPad(100 + mc[ym], 4),
      name,
      type: extCh(r, 0.12) ? '渠道客户' : '企业客户',
      industry: extPick(r, INDUSTRIES), level,
      source: extPick(r, ['官网', '广告', '活动', '转介绍', '渠道']),
      region, scale: extPick(r, ['小型', '中型', '中型', '大型']),
      owner, status,
      lastFollow: extAddDays(TODAY, churn || !owner ? -extRint(r, 45, 120) : -extRint(r, 1, 30)),
      lastDeal: dealt ? extAddDays(TODAY, -extRint(r, 18, 210)) : '-',
      total: dealt ? extRint(r, 3, 96) * 10000 : 0,
      created: extAddDays('2026-01-02', extRint(r, 0, 285)),
      phone: extPhone(r),
      key: level === '战略客户' || level === '重点客户',
    };
    out.push(cust);
  }
  if (n === 29) EXT_EXTRA_CUSTS = out;
  return out;
}

/* --- 额外线索（28 条） --- */
let EXT_EXTRA_LEADS = null;
function extraLeads() {
  if (EXT_EXTRA_LEADS) return EXT_EXTRA_LEADS;
  const r = extRng(202699);
  const custs = extraCustomers(29);
  const themes = ['数字化升级', 'MES 选型', 'CRM 部署', '会员运营系统', '数据中台建设', '服务工单系统', '渠道订货平台', '设备台账管理', 'BI 看板建设', '供应链协同', '办公自动化', '移动端开发'];
  const needs = ['CRM 软件', 'ERP 对接', 'MES 系统', '服务工单', 'BI 数据平台', '会员运营', '渠道代理', '实施服务', '培训服务', '定制开发'];
  const contacts = ['马主管', '秦经理', '杜经理', '韩总监', '岑经理', '潘主管', '姜经理', '任主管', '邱主任', '刘主管'];
  const out = [];
  const mc = {};
  for (let i = 0; i < 28; i++) {
    const ym = extPick(r, ['202607', '202608', '202609', '202610', '202611']);
    mc[ym] = (mc[ym] || 0) + 1;
    let company = '', convNo = '';
    if (i % 5 === 3) { const c = custs[(i * 3) % custs.length]; company = c.name; convNo = c.no; }
    else {
      const pc = EXT_CITY[(i * 5 + 1) % EXT_CITY.length];
      company = pc[1] + '某某' + EXT_BUSS[(i * 3 + 7) % EXT_BUSS.length] + '有限公司';
      if (out.some(x => x.company === company) || custs.some(c => c.name === company)) company = company.replace('有限公司', '股份有限公司');
    }
    const st = i < 8 ? '新建' : (i < 18 ? '跟进中' : (i < 21 ? '已转化' : (i < 26 ? '新建' : '无效')));
    const owner = st === '新建' && extCh(r, 0.4) ? '' : extOwner(r);
    const created = (ym === '202611' ? extAddDays(TODAY, -extRint(r, 0, 8)) : ym.slice(0, 4) + '-' + ym.slice(4) + '-' + extPad(extRint(r, 1, 28), 2)) + (extCh(r, 0.5) ? ' 09:00' : ' 14:30');
    const item = {
      no: 'XS-' + ym + '-' + extPad(40 + mc[ym], 4),
      name: extShort(company) + ' ' + extPick(r, themes),
      company,
      contact: contacts[(i * 3 + 2) % contacts.length],
      phone: extPhone(r), source: extPick(r, ['官网', '广告', '渠道', '活动', '转介绍']),
      need: extPick(r, needs), amount: extRint(r, 4, 90) * 10000,
      status: st, owner,
      next: st === '跟进中' ? extAddDays(TODAY, extRint(r, 1, 10)) + ' 10:00' : '',
      created,
    };
    if (st === '已转化') { item.convertedAt = extAddDays(item.created.slice(0, 10), extRint(r, 3, 15)) + ' 11:00'; item.convertedTo = convNo; }
    if (st === '跟进中' && i % 6 === 2) item.dup = { type: '线索', ref: 'XS-202611-0008', why: '手机号相同' };
    out.push(item);
  }
  EXT_EXTRA_LEADS = out;
  return out;
}

/* --- 额外商机（20 条，stage 使用 contact/need/plan/quote/approve） --- */
let EXT_EXTRA_OPPS = null;
function extraOpps() {
  if (EXT_EXTRA_OPPS) return EXT_EXTRA_OPPS;
  const r = extRng(883417);
  const custs = extraCustomers(29);
  const origNames = CUSTOMERS_INIT.map(c => c.name);
  const themes = ['ERP 升级', 'CRM 选型', 'MES 系统', '会员运营', '数据中台', '服务工单', '渠道订货', '设备管理', 'BI 看板', '供应链协同'];
  const out = [];
  const mc = {};
  for (let i = 0; i < 20; i++) {
    const ym = extPick(r, ['202609', '202610', '202611']);
    mc[ym] = (mc[ym] || 0) + 1;
    const target = i < 12 ? custs[(i * 2 + 1) % custs.length].name : origNames[(i - 12) * 2 % origNames.length];
    const stage = extPick(r, ['contact', 'contact', 'need', 'need', 'plan', 'plan', 'quote', 'approve']);
    const info = stage === 'contact' ? {} : {
      demand: extPick(r, ['数字化升级，统一客户管理', '老系统年久故障多', '新业务线扩展需要', '集团统一采购要求']),
      buyDate: extAddDays(TODAY, extRint(r, 20, 70)),
      budget: extRint(r, 6, 70) + '万元',
    };
    if (stage === 'plan' || stage === 'quote' || stage === 'approve') info.solution = extPick(r, ['企业版 + 实施服务', '标准版 + 定制模块', '渠道门户 + 订货', 'BI 看板 + 移动端']);
    if (stage === 'approve') { info.terms = extPick(r, ['30/40/30 分期', '5/5', '年付 92 折']); info.materials = '报价单 + 折扣说明.docx'; }
    const theme = extPick(r, themes);
    out.push({
      no: 'SJ-' + ym + '-' + extPad(50 + mc[ym], 4),
      name: extShort(target) + ' ' + theme,
      customer: target,
      contact: extPick(r, ['王经理', '李总', '张主任', '刘经理', '陈总监', '周会计']),
      source: extPick(r, ['线索', '客户转介绍', '官网', '渠道', '活动', '广告']),
      type: extPick(r, ['新购', '续费', '增购']),
      need: theme + '相关需求',
      competitor: extPick(r, ['-', '-', '用友', '金蝶', '竞品 A']),
      amount: extRint(r, 6, 80) * 10000,
      date: extAddDays(TODAY, extRint(r, 18, 75)),
      owner: extOwner(r), stage,
      prob: (STAGES[STAGE_IDX[stage]] || {}).prob || 10,
      info, flags: {},
    });
  }
  EXT_EXTRA_OPPS = out;
  return out;
}

/* ===== 主体：buildExt(customers, leads, opps) → 所有实体 + 关系图数据 ===== */
function buildExt(customers, leads, opps) {
  const byName = {}; const byNo = {};
  customers.forEach(c => { byName[c.name] = c; byNo[c.no] = c; });
  const oppsByCust = {};
  opps.forEach(o => { (oppsByCust[o.customer] = oppsByCust[o.customer] || []).push(o); });

  /* ---------- 1) 联系人 ---------- */
  const contacts = [];
  const contactsByCust = {};
  customers.forEach(c => { contactsByCust[c.name] = []; });
  const usedNames = new Set(['陈总监', '刘经理', '周会计', '黄工', '周主任', '管理员', '孙工', '钱工', '林晓', '陈悦', '毛科生', '李彬文', '何启明', '苏简', '王芳', '李琴', '周总监']);
  let lxSeq = 1;
  const pushC = c => { contacts.push(c); contactsByCust[c.customer].push(c); };
  EXT_NJ_CONTACTS.forEach(pushC);
  lxSeq = 5;
  const ROLE_DEPTS = {
    使用人: ['运营部', '生产管理部', '客服部', '门店管理部', '仓储部'],
    采购人: ['采购部', '供应链管理部'], 财务: ['财务部'], 技术: ['技术部', 'IT 部', '信息中心'],
  };
  const ROLE_TITLES = {
    使用人: ['运营经理', '系统管理员', '业务主管', '业务专员', '客服主管'],
    采购人: ['采购经理', '采购主管', '采购专员'], 财务: ['财务经理', '财务主管', '出纳'],
    技术: ['系统工程师', '技术主管', 'IT 架构师', '技术经理'],
  };
  const makeContact = (r, cu, role, firstNo) => {
    const isDec = role === '决策人';
    const dept = isDec ? extPick(r, ['总经理办公室', '经营管理部', '信息中心']) : extPick(r, ROLE_DEPTS[role]);
    const title = isDec ? extPick(r, ['总经理', '副总经理', 'CIO', '采购总监', '副总裁']) : extPick(r, ROLE_TITLES[role]);
    const nm = extGenName(r, usedNames);
    const no = 'LX-' + extPad(lxSeq++, 6);
    const infl = isDec ? extPick(r, ['高', '高', '中']) : extPick(r, ['高', '中', '中', '低', '低']);
    return {
      no, name: nm.name, customer: cu.name, phone: extPhone(r),
      email: nm.py + no.slice(3) + '@example.com', dept, title, role, infl,
      pref: extPick(r, ['电话', '微信', '邮件']),
      key: isDec || infl === '高' ? true : extCh(r, 0.25),
      attitude: isDec ? extPick(r, ['支持者', '支持者', '中立', '反对者']) : extPick(r, ['支持者', '中立', '中立', '反对者']),
      reportsTo: isDec || !firstNo || extCh(r, 0.4) ? '' : firstNo,
      birthday: '19' + extPad(extRint(r, 60, 99), 2) + '-' + extPad(extRint(r, 1, 12), 2) + '-' + extPad(extRint(r, 1, 28), 2),
      remark: extPick(r, EXT_REMARKS),
      owner: cu.owner || '',
    };
  };
  const genBlock = (cu, n, decNo) => {
    const r = extRng(extHash(cu.no + '|contacts'));
    let firstNo = decNo || '';
    for (let i = 0; i < n; i++) {
      const role = i === 0 && !decNo ? '决策人' : extPick(r, ['使用人', '使用人', '使用人', '采购人', '财务', '技术']);
      const c = makeContact(r, cu, role, firstNo);
      pushC(c);
      if (i === 0 && !decNo) firstNo = c.no;
    }
  };
  const CONTACT_COUNTS = {
    'KH-202611-0001': 4, 'KH-202611-0002': 7, 'KH-202610-0021': 7, 'KH-202610-0018': 6, 'KH-202610-0015': 6,
    'KH-202609-0032': 6, 'KH-202609-0027': 5, 'KH-202608-0009': 3, 'KH-202608-0004': 5, 'KH-202607-0012': 4, 'KH-202606-0008': 3,
  };
  customers.forEach(cu => {
    if (cu.no === 'KH-202611-0001') { genBlock(cu, 4, 'LX-000001'); return; }
    if (cu.no === 'KH-202611-0002') {
      const keep = { no: 'LX-' + extPad(lxSeq++, 6), name: '周主任', customer: cu.name, phone: '135****9021', email: 'zhouzr@example.com', dept: '采购部', title: '采购主任', role: '采购人', infl: '高', pref: '电话', key: true, attitude: '中立', reportsTo: '', birthday: '1972-03-16', remark: '集团统一采购牵头人', owner: cu.owner || '' };
      pushC(keep);
      genBlock(cu, 7, null);
      return;
    }
    let n;
    if (CONTACT_COUNTS[cu.no] != null) n = CONTACT_COUNTS[cu.no];
    else { const r = extRng(extHash(cu.no + '|cnt')); n = cu.status === '流失' || !cu.owner ? 2 + Math.floor(r() * 2) : 2 + Math.floor(r() * 4); }
    genBlock(cu, n, null);
  });

  /* ---------- 2) 产品 / 价格表 ---------- */
  const products = EXT_PRODUCTS.map(p => ({ ...p }));
  const pricebooks = [
    { no: 'PB-001', name: '标准价', type: '标准价', validFrom: '2026-01-01', validTo: '2026-12-31', status: '启用', items: [] },
    { no: 'PB-002', name: '重点客户价', type: '重点客户价', validFrom: '2026-01-01', validTo: '2026-12-31', status: '启用', items: [] },
    { no: 'PB-003', name: '渠道价', type: '渠道价', validFrom: '2026-01-01', validTo: '2026-12-31', status: '启用', items: [] },
  ];
  products.forEach(p => {
    pricebooks[0].items.push({ productNo: p.no, price: p.price, minDiscount: 85 });
    pricebooks[1].items.push({ productNo: p.no, price: Math.max(1, Math.round(p.price * 0.92)), minDiscount: 90 });
    pricebooks[2].items.push({ productNo: p.no, price: Math.max(1, Math.round(p.price * 0.82)), minDiscount: 80 });
  });

  /* ---------- 3) 报价（保留 4 条 + 生成） ---------- */
  const quotes = EXT_QUOTES_PRES.map(q => ({
    no: q.no, customer: q.customer, opp: q.opp, amount: q.amount, disc: q.disc, date: q.date, valid: q.valid,
    owner: q.owner, appr: q.appr, ver: q.ver, items: JSON.parse(JSON.stringify(q.items)),
  }));
  let bjSeq = 100;
  const genItems = r => {
    const nItems = 1 + Math.floor(r() * 3);
    const chosen = [];
    for (let k = 0; k < 12 && chosen.length < nItems; k++) {
      const p = extPick(r, products);
      if (chosen.some(x => x.productNo === p.no)) continue;
      const qty = p.unit === '用户·年' ? extPick(r, [10, 20, 30, 40, 50]) : (p.unit === '人天' ? extRint(r, 5, 45) : extRint(r, 1, 3));
      chosen.push({ productNo: p.no, name: p.name, qty, unit: p.unit, price: p.price, discount: extPick(r, [100, 100, 95, 92, 90, 88, 85, 80]) });
    }
    if (!chosen.length) { const p = extPick(r, products); chosen.push({ productNo: p.no, name: p.name, qty: 1, unit: p.unit, price: p.price, discount: 92 }); }
    return chosen;
  };
  const genQuote = (cu, r) => {
    const ym = extPick(r, ['202601', '202602', '202603', '202604', '202606', '202608', '202609', '202610', '202611']);
    const items = genItems(r);
    let orig = 0, sub = 0;
    items.forEach(it => { orig += it.price * it.qty; sub += Math.round(it.price * it.qty * it.discount / 100); });
    const myOpps = oppsByCust[cu.name] || [];
    const opp = myOpps.length && extCh(r, 0.8) ? extPick(r, myOpps).no : '';
    const date = ym === '202611' ? extAddDays(TODAY, -extRint(r, 0, 20)) : ym.slice(0, 4) + '-' + ym.slice(4) + '-' + extPad(extRint(r, 1, 28), 2);
    return {
      no: 'BJ-' + ym + '-' + extPad(bjSeq++, 4),
      customer: cu.name, opp, amount: Math.round(sub * 1.13 * 100) / 100,
      disc: Math.round((orig - sub) * 100) / 100,
      date, valid: extAddDays(date, 30),
      owner: cu.owner || '',
      appr: extPick(r, ['已通过', '已通过', '已通过', '已通过', '审批中', '草稿', '已驳回']),
      ver: extPick(r, ['V1', 'V1', 'V2']),
      items,
    };
  };
  customers.forEach(cu => {
    if (EXT_ORIG_NO.has(cu.no)) {
      const r = extRng(extHash(cu.no + '|quotes'));
      const nq = cu.owner ? (cu.status === '流失' ? 1 : 2 + Math.floor(r() * 2)) : 1;
      for (let i = 0; i < nq; i++) quotes.push(genQuote(cu, r));
    } else {
      const r = extRng(extHash(cu.no + '|quotes'));
      if (cu.owner && extCh(r, 0.55)) quotes.push(genQuote(cu, r));
    }
  });
  let qi = 0;
  while (quotes.length < 34) { const cu = customers[qi % customers.length]; quotes.push(genQuote(cu, extRng(extHash(cu.no + '|topq' + qi)))); qi++; }

  /* ---------- 4) 合同（保留 7 条 + 由已通过报价派生 + 补足） ---------- */
  const contracts = EXT_CONTRACTS_PRES.map(c => ({ ...c, plans: c.plans.map(p => ({ ...p })), attachments: c.attachments.map(a => ({ ...a })), approvals: c.approvals.map(a => ({ ...a })) }));
  let htSeq = 100;
  const PAY_TERMS = [
    [['合同签署', 30], ['项目上线', 40], ['项目验收', 30]], [['预付款', 50], ['验收款', 50]],
    [['首付款', 60], ['尾款', 40]], [['合同签署', 30], ['上线试运行', 40], ['终验', 30]],
  ];
  const genContract = (quote, cu, r) => {
    const ym = quote ? quote.date.slice(0, 7).replace('-', '') : extPick(r, ['202509', '202511', '202602', '202603', '202605', '202606']);
    const theme = extPick(r, ['软件授权与实施', '平台建设', '定制开发', '系统升级', '年度服务', '模块采购', '数据平台建设', '渠道系统建设']);
    const signDate = quote ? extAddDays(quote.date, extRint(r, 3, 12)) : ym.slice(0, 4) + '-' + ym.slice(4) + '-' + extPad(extRint(r, 1, 28), 2);
    const startDate = extAddDays(signDate, extRint(r, 1, 8));
    const amount = quote ? quote.amount : extRint(r, 4, 70) * 10000;
    const status = quote ? extPick(r, ['履约中', '履约中', '履约中', '已完成', '审批通过', '待签署', '待审批', '草稿', '已终止', '已到期', '已驳回', '已撤销', '生效']) : extPick(r, ['履约中', '已完成', '已终止', '已到期', '生效']);
    const terms = PAY_TERMS[extRint(r, 0, PAY_TERMS.length - 1)];
    const plans = terms.map((t, idx) => {
      const d = idx === 0 ? signDate : extAddDays(startDate, Math.round(idx * 55 * (1 + r() * 0.4)));
      const paidStatus = ['生效', '履约中', '已完成', '已到期'].includes(status);
      const stt = paidStatus ? (idx === 0 ? '已回款' : (d < extAddDays(TODAY, -5) ? '部分回款' : '未回款')) : '未回款';
      return { stage: t[0], date: d, amount: Math.round(amount * t[1]) / 100, status: stt };
    });
    return {
      no: 'HT-' + ym + '-' + extPad(htSeq++, 4),
      name: extShort(cu.name) + ' ' + theme + '合同',
      customer: cu.name, opp: quote ? quote.opp : '', quote: quote ? quote.no : '',
      type: extPick(r, ['销售合同', '服务合同', '续费合同']),
      amount, signDate, startDate, endDate: extAddDays(startDate, extPick(r, [180, 270, 365, 365, 730])),
      status, owner: cu.owner || '',
      payTerms: terms.map(t => t[0] + ' ' + t[1] + '%').join(' / '),
      plans,
      attachments: ['草稿', '待审批', '已驳回', '已撤销'].includes(status) ? [] : [ { name: '合同扫描件.pdf', size: '1.8MB', date: signDate }, { name: '付款条款确认函.pdf', size: '320KB', date: signDate } ],
      approvals: status === '待审批' || status === '已驳回'
        ? [ { node: '发起申请', who: quote ? quote.owner : (cu.owner || ''), result: '提交', time: extAddDays(signDate, 0) + ' 09:40' }, { node: '销售经理', who: extPick(r, ['张三', '李四', '周总监']), result: '待审批', time: '' } ]
        : (status === '草稿' ? [] : [ { node: '发起申请', who: quote ? quote.owner : (cu.owner || ''), result: '提交', time: extAddDays(signDate, -3) + ' 09:40' }, { node: '销售经理', who: extPick(r, ['张三', '李四', '周总监']), result: '同意', time: extAddDays(signDate, -1) + ' 14:20' } ]),
    };
  };
  quotes.filter(q => q.appr === '已通过' && byName[q.customer]).forEach(q => {
    contracts.push(genContract(q, byName[q.customer], extRng(extHash(q.no + '|c'))));
  });
  let ci = 0;
  while (contracts.length < 32) { const cu = customers[ci % customers.length]; contracts.push(genContract(null, cu, extRng(extHash(cu.no + '|topc' + ci)))); ci++; }

  /* ---------- 5) 订单（保留 6 条 + 由合同派生 + 补足） ---------- */
  const orders = EXT_ORDERS_PRES.map(o => {
    const c = contracts.find(x => x.no === o.contract) || null;
    const q = c && c.quote ? quotes.find(x => x.no === c.quote) : null;
    const items = q ? q.items.map(it => ({ ...it })) : genItems(extRng(extHash(o.no + '|oi')));
    return {
      no: o.no, customer: o.customer, contract: o.contract, opp: o.opp, amount: o.amount, date: o.date, dlv: o.dlv,
      owner: o.owner, status: o.status, items,
      invoiceStatus: o.status === '已完成' ? '已开票' : (o.status === '待确认' ? '未开票' : '部分开票'),
      shipStatus: o.status === '已完成' ? '已签收' : (o.status === '待确认' ? '未发货' : '已发货'),
      address: ((byName[o.customer] || {}).region || '') + '某某产业园',
    };
  });
  let ddSeq = 100;
  const takenContracts = new Set(EXT_ORDERS_PRES.map(o => o.contract));
  const genOrder = (c, r) => {
    const ym = c.signDate ? c.signDate.slice(0, 7).replace('-', '') : extPick(r, ['202604', '202606', '202609', '202610']);
    const q = c.quote ? quotes.find(x => x.no === c.quote) : null;
    const items = q ? q.items.map(it => ({ ...it })) : genItems(r);
    const status = extPick(r, ['待确认', '待确认', '已确认', '待交付', '交付中', '交付中', '已完成', '已完成', '已取消', '暂停执行', '已关闭']);
    const cu = byName[c.customer] || {};
    return {
      no: 'DD-' + ym + '-' + extPad(ddSeq++, 4),
      customer: c.customer, contract: c.no, opp: c.opp || '',
      amount: c.amount, date: extAddDays(c.signDate || TODAY, extRint(r, 0, 5)), dlv: extAddDays(c.signDate || TODAY, extRint(r, 20, 80)),
      owner: c.owner, status, items,
      invoiceStatus: status === '已完成' ? '已开票' : (['待确认', '已确认', '待交付', '已取消', '已关闭', '暂停执行'].includes(status) ? '未开票' : '部分开票'),
      shipStatus: status === '已完成' ? '已签收' : (['待确认', '已确认', '待交付', '已取消', '已关闭', '暂停执行'].includes(status) ? '未发货' : '已发货'),
      address: (cu.region || '') + '某某产业园',
    };
  };
  contracts.forEach(c => {
    if (takenContracts.has(c.no)) return;
    if (['待签署', '生效', '履约中', '已完成', '已到期'].includes(c.status)) orders.push(genOrder(c, extRng(extHash(c.no + '|o'))));
  });
  let oi = 0;
  while (orders.length < 32) { const cu = customers[oi % customers.length]; orders.push(genOrder({ customer: cu.name, no: '', amount: extRint(extRng(extHash(cu.no + '|amo' + oi)), 3, 60) * 10000, signDate: '', owner: cu.owner || '', status: '待确认' }, extRng(extHash(cu.no + '|topo' + oi)))); oi++; }

  /* ---------- 6) 交付项目（保留 3 条 + 由订单派生） ---------- */
  const deliveries = EXT_DELIVERIES_PRES.map(d => ({ ...d }));
  deliveries[0].milestones = [
    { name: '启动会', date: '2026-10-22', status: '已完成' }, { name: '蓝图设计', date: '2026-11-05', status: '已完成' },
    { name: '系统配置', date: '2026-11-25', status: '进行中' }, { name: '数据迁移', date: '2026-12-05', status: '未开始' },
    { name: '上线切换', date: '2026-12-10', status: '未开始' } ];
  deliveries[0].risk = '';
  deliveries[1].milestones = [
    { name: '启动会', date: '2026-08-20', status: '已完成' }, { name: '系统配置', date: '2026-09-15', status: '已完成' },
    { name: '接口联调', date: '2026-10-30', status: '进行中' }, { name: '验收测试', date: '2026-11-15', status: '未开始' } ];
  deliveries[1].risk = '客户侧接口联调延迟，存在延期风险';
  deliveries[2].milestones = [
    { name: '启动会', date: '2026-07-08', status: '已完成' }, { name: '用户体验培训', date: '2026-07-25', status: '已完成' },
    { name: '验收测试', date: '2026-08-20', status: '已完成' } ];
  deliveries[2].risk = '';
  const takenOrders = new Set(EXT_DELIVERIES_PRES.map(d => d.order).concat(EXT_ORDERS_PRES.filter(o => o.status === '待确认').map(o => o.no)));
  let xmSeq = 100;
  const MST = ['启动会', '蓝图设计', '系统配置', '数据迁移', '用户培训', '上线切换', '验收'];
  const genDelivery = (o, r) => {
    const cu = byName[o.customer] || {};
    const ym = o.date.slice(0, 7).replace('-', '');
    let status;
    if (o.status === '已完成') status = '已完成';
    else if (o.status === '交付中') status = extPick(r, ['实施中', '实施中', '验收中']);
    else status = '未启动';
    const planStart = o.date ? extAddDays(o.date, extRint(r, 2, 10)) : extAddDays(TODAY, 5);
    const planEnd = extAddDays(planStart, extPick(r, [45, 60, 90, 120]));
    const progress = status === '已完成' ? 100 : status === '验收中' ? extRint(r, 85, 95) : status === '实施中' ? extRint(r, 20, 80) : 0;
    const cnt = Math.min(MST.length, extRint(r, 4, 6));
    const total = Math.max(cnt + 4, Math.round((new Date(planEnd) - new Date(planStart)) / 86400000));
    const step = Math.max(5, Math.round(total / cnt));
    const cm = Math.floor(cnt * progress / 100);
    const milestones = [];
    for (let m = 0; m < cnt; m++) {
      const d = m === cnt - 1 ? planEnd : extAddDays(planStart, m * step);
      milestones.push({ name: MST[m], date: d, status: progress >= 100 || m < cm ? '已完成' : (m === cm ? '进行中' : '未开始') });
    }
    return {
      no: 'XM-' + ym + '-' + extPad(xmSeq++, 4),
      name: extShort(cu.name || o.customer) + ' ' + extPick(r, ['CRM 实施项目', '平台建设项目', '系统升级项目', '数据迁移与上线', '模块部署项目', '培训交付项目']),
      customer: o.customer, order: o.no, contract: o.contract || '',
      pm: extPick(r, ['孙工', '钱工', '周航', '吴迪']),
      status, progress, planStart, planEnd, milestones,
      risk: extCh(r, 0.75) ? '' : extPick(r, ['客户侧接口联调延迟', '关键用户出差影响培训', '需求范围蔓延', '数据质量差需返工']),
    };
  };
  orders.forEach(o => {
    if (o.status === '已取消' || takenOrders.has(o.no)) return;
    deliveries.push(genDelivery(o, extRng(extHash(o.no + '|xm'))));
  });
  /* 5.13 项目字段：补关联合同与验收状态（未验收 / 阶段验收中 / 已验收，由里程碑推导） */
  deliveries.forEach(d => {
    if (!d.contract) { const o = orders.find(x => x.no === d.order); d.contract = o ? o.contract : ''; }
    const ms = d.milestones || [], done = ms.filter(m => m.status === '已完成').length;
    d.ac = ms.length && done === ms.length ? '已验收' : (done ? '阶段验收中' : '未验收');
  });

  /* ---------- 7) 服务工单（保留 4 条 + 生成） ---------- */
  const tickets = EXT_TICKETS_PRES.map(t => ({ ...t, records: t.records.map(x => ({ ...x })) }));
  let gdSeq = 100;
  const TICKET_CNTS = {
    'KH-202611-0001': 1, 'KH-202611-0002': 2, 'KH-202609-0032': 1, 'KH-202610-0021': 2, 'KH-202610-0018': 2,
    'KH-202610-0015': 2, 'KH-202609-0027': 2, 'KH-202608-0004': 2, 'KH-202607-0012': 1, 'KH-202608-0009': 1, 'KH-202606-0008': 1,
  };
  const SLA_H = { 紧急: 2, 高: 4, 中: 24, 低: 48 };
  const genTicket = (cu, r) => {
    const ym = extPick(r, ['202606', '202607', '202608', '202609', '202610', '202611']);
    const type = extPick(r, ['故障报修', '故障报修', '服务请求', '咨询', '投诉']);
    const priority = extPick(r, ['紧急', '高', '高', '中', '中', '低']);
    const status = extPick(r, ['待受理', '待分派', '处理中', '处理中', '待客户确认', '待客户确认', '已解决', '已关闭', '已关闭', '已退回']);
    const cs = contactsByCust[cu.name] || [];
    const created = (ym === '202611' ? extAddDays(TODAY, -extRint(r, 0, 10)) : ym.slice(0, 4) + '-' + ym.slice(4) + '-' + extPad(extRint(r, 1, 28), 2)) + ' ' + extPad(extRint(r, 8, 17), 2) + ':' + extPad(extRint(r, 0, 5) * 10, 2);
    const sla = new Date(new Date(created).getTime() + SLA_H[priority] * 3600000).toISOString().slice(0, 16).replace('T', ' ');
    const descPool = {
      故障报修: ['登录后列表加载超时', '打印模板字段显示不全', '数据看板图形不渲染', '附件上传报错 500'],
      服务请求: ['申请新增操作账号', '申请批量导入历史数据', '申请开启短信通知', '申请报表权限调整'],
      咨询: ['咨询年费续费与升级方案', '咨询移动端企业微信部署', '咨询报表定制开发报价'],
      投诉: ['工单响应慢，客户不满意', '导入数据字段错乱要求处理', '回访电话打扰过多被投诉'],
    };
    const records = [];
    const who = extPick(r, ['孙工', '钱工', '林晓']);
    const beyond = ['待分派', '处理中', '待客户确认', '已解决', '已关闭', '已退回'].includes(status);
    const handled = ['处理中', '待客户确认', '已解决', '已关闭', '已退回'].includes(status);
    const confirmed = ['已解决', '已关闭', '已退回'].includes(status);
    if (status === '待受理') records.push({ time: created, who: '', act: '提交工单', note: '等待客服受理' });
    else {
      records.push({ time: created, who: '', act: '提交工单', note: '客户提交服务请求' });
      records.push({ time: created.slice(0, 10) + ' 09:10', who: '客服-小陈', act: '受理', note: '客服受理，待指派处理人' });
      if (beyond && status !== '待分派') {
        records.push({ time: created.slice(0, 10) + ' 09:40', who: who, act: '指派处理人', note: '指派给 ' + who + '，按 SLA 启动处理' });
        if (handled && status !== '处理中') records.push({ time: extAddDays(created.slice(0, 10), 1) + ' 10:30', who: who, act: '处理', note: '已完成处理，提交客户确认' });
        if (confirmed) {
          const st = extAddDays(created.slice(0, 10), 1) + ' 15:00';
          records.push({ time: st, who: cs.length ? cs[0].name : '客户', act: status === '已退回' ? '退回' : '解决确认', note: status === '已退回' ? '客户反馈问题未彻底解决，退回重新处理' : '客户确认问题已解决' });
        }
        if (status === '已关闭') records.push({ time: extAddDays(created.slice(0, 10), 2) + ' 09:30', who: cs.length ? cs[0].name : '客户', act: '客户评价', note: '服务满意度 ' + extRint(r, 3, 5) + '/5，工单关闭' });
      }
    }
    const solvedTime = ['已解决', '已关闭'].includes(status) ? extAddDays(created.slice(0, 10), 1) + ' 15:00' : '';
    return {
      no: 'GD-' + ym + '-' + extPad(gdSeq++, 4), type, customer: cu.name,
      contact: cs.length ? extPick(r, cs).name : '',
      priority, status, handler: handled && status !== '已退回' ? who : '',
      desc: extPick(r, descPool[type]), created, slaDeadline: sla, solvedTime,
      rating: status === '已关闭' ? extRint(r, 1, 5) : '',
      records, images: extCh(r, 0.25) ? ['img/' + ym + '-' + extPad(gdSeq, 4) + '-1.png'] : [],
    };
  };
  customers.forEach(cu => {
    let n;
    if (TICKET_CNTS[cu.no] != null) n = TICKET_CNTS[cu.no];
    else { const r = extRng(extHash(cu.no + '|tk')); n = cu.status === '流失' ? 0 : extCh(r, 0.5) ? 1 : 2; }
    const r = extRng(extHash(cu.no + '|tickets'));
    for (let i = 0; i < n; i++) tickets.push(genTicket(cu, r));
  });
  let ti = 0;
  while (tickets.length < 30) { const cu = customers[ti % customers.length]; tickets.push(genTicket(cu, extRng(extHash(cu.no + '|toptk' + ti)))); ti++; }
  tickets.forEach(t => { if (!t.contact) { const cs = contactsByCust[t.customer] || []; if (cs.length) t.contact = cs[0].name; } });

  /* ---------- 8) 活动 / 跟进 ---------- */
  const activities = [];
  let hdSeq = 100;
  const ACT_CNTS = {
    'KH-202611-0001': 10, 'KH-202611-0002': 12, 'KH-202610-0021': 10, 'KH-202610-0018': 8, 'KH-202610-0015': 8,
    'KH-202609-0032': 9, 'KH-202609-0027': 6, 'KH-202608-0009': 3, 'KH-202608-0004': 6, 'KH-202607-0012': 4, 'KH-202606-0008': 2,
  };
  const ACT_TPL = {
    电话: ['与{c}电话沟通{p}的报价与实施排期', '电话回访{c}，确认{p}使用情况与下一步计划', '与{c}电话确认回款与发票信息'],
    微信: ['微信发送{p}方案资料给{c}', '微信向{c}确认拜访时间', '微信跟进{c}，催收商务审批进度'],
    短信: ['短信通知{c}{p}系统维护窗口', '短信向{c}发送服务月报摘要'],
    拜访: ['上门拜访{c}，现场演示{p}', '拜访{c}，沟通{p}实施的详细需求', '与{c}例行拜访，维护客户关系'],
    会议: ['与{c}召开{p}需求评审会', '参加{c}组织的供应商比选会议', '与{c}及我方售前召开方案研讨会'],
    邮件: ['邮件向{c}发送{p}的正式报价单', '邮件跟进{c}，确认合同盖章回寄', '邮件发送{c}月度服务报告'],
    演示: ['远程演示{p}核心功能给{c}', '向{c}演示{p}移动端操作流程'],
    培训: ['为{c}开展{p}操作培训', '{p}管理员培训与答疑'],
    其他: ['整理{c}会议纪要并发送', '协调{p}交付排期事务'],
  };
  const ACT_RESULT = ['已联系', '已联系', '已联系', '待反馈', '待反馈', '需求明确'];
  const ACT_PLAN = ['发送方案补充材料并确认细节', '跟进内部审批进度', '确认下一次沟通时间与议程', '整理本次沟通纪要给客户'];
  const FEEDBACK = ['对方表示需内部评估', '已有初步意向', '提出价格异议', '约定下次会议时间', '无明确反馈，持续跟进', '需求基本明确', '同意推进下一步'];
  const genAct = (cu, r, i) => {
    const cs = contactsByCust[cu.name] || [];
    const contact = cs.length ? cs[(i * 2 + 1) % cs.length].name : '';
    const myOpps = oppsByCust[cu.name] || [];
    const opp = myOpps.length && extCh(r, 0.75) ? extPick(r, myOpps).no : '';
    const type = extPick(r, ['电话', '电话', '微信', '微信', '拜访', '拜访', '拜访', '会议', '邮件', '短信', '演示', '培训', '其他']);
    const status = extPick(r, ['已完成', '已完成', '已完成', '已完成', '计划中', '计划中', '已取消']);
    const planned = status === '计划中';
    const day = planned ? extAddDays(TODAY, extRint(r, 1, 14)) : extAddDays(TODAY, -extRint(r, 1, 45));
    const time = day + ' ' + extPad(extRint(r, 9, 18), 2) + ':' + extPad(extRint(r, 0, 5) * 10, 2);
    const product = extPick(r, products);
    const content = extPick(r, ACT_TPL[type]).replace(/\{c\}/g, contact || '客户').replace(/\{p\}/g, product.name);
    const canceled = status === '已取消';
    const checkin = type === '拜访' && status === '已完成' ? (function () {
      let geo = EXT_CITY_GEO['江苏省'];
      const kn = Object.keys(EXT_CITY_GEO).find(k => ((cu.region || '').indexOf(k) === 0));
      if (kn) geo = EXT_CITY_GEO[kn];
      return { lat: Math.round((geo[0] + r() * 0.04 - 0.02) * 100000) / 100000, lng: Math.round((geo[1] + r() * 0.04 - 0.02) * 100000) / 100000, addr: (cu.region || '') + '某某路' + extRint(r, 1, 200) + '号', time, photo: 'img/checkin/' + ('HD-' + extPad(hdSeq, 6)) + '.jpg' };
    })() : null;
    return {
      no: 'HD-' + extPad(hdSeq++, 6), type, customer: cu.name, contact, opp, owner: cu.owner || '',
      time, content,
      feedback: status === '已完成' ? extPick(r, FEEDBACK) : '',
      result: status === '已完成' ? extPick(r, ACT_RESULT) : '',
      plan: status === '已完成' && extCh(r, 0.5) ? extPick(r, ACT_PLAN) : '',
      next: status === '已完成' && extCh(r, 0.7) ? extAddDays(day, extRint(r, 2, 10)) + ' 10:00' : '',
      files: status === '已完成' && (type === '拜访' || type === '演示' || extCh(r, 0.2)) ? ['img/act-' + ('HD-' + extPad(hdSeq, 6)) + '-1.png'] : [],
      status, checkin,
    };
  };
  customers.forEach(cu => {
    let n;
    if (ACT_CNTS[cu.no] != null) n = ACT_CNTS[cu.no];
    else { const r = extRng(extHash(cu.no + '|ac')); n = cu.status === '流失' || !cu.owner ? 1 + Math.floor(r() * 2) : 1 + Math.floor(r() * 4); }
    const r = extRng(extHash(cu.no + '|acts'));
    for (let i = 0; i < n; i++) activities.push(genAct(cu, r, i));
  });

  /* ---------- 9) 关系图数据（按客户：决策链 / 支持者 / 反对者 / 影响） ---------- */
  const relations = {};
  customers.forEach(cu => {
    const cs = contactsByCust[cu.name] || [];
    const nodes = cs.map(c => ({ id: c.no, name: c.name, title: c.title, role: c.role, attitude: c.attitude, infl: c.infl }));
    const dec = cs.find(c => c.role === '决策人');
    const edges = [];
    cs.forEach(c => {
      if (c.reportsTo) edges.push({ from: c.no, to: c.reportsTo, type: '汇报' });
      if (!dec || c.no === dec.no) return;
      if (c.attitude === '支持者') edges.push({ from: c.no, to: dec.no, type: '支持' });
      if (c.attitude === '反对者') edges.push({ from: c.no, to: dec.no, type: '反对' });
      if (c.key && c.attitude === '中立') edges.push({ from: c.no, to: dec.no, type: '合作' });
      if (c.infl === '高') edges.push({ from: c.no, to: dec.no, type: '影响' });
    });
    relations[cu.name] = { nodes, edges };
  });

  /* ---------- 10) 操作日志（≥60 条，确定性生成） ---------- */
  const logs = [];
  const LOG_MODULES = ['线索', '客户', '联系人', '商机', '报价', '合同', '订单', '回款', '工单', '系统'];
  const LOG_ACTS = ['新建', '编辑', '分配', '审批', '导出', '导入', '转移', '回收', '登录', '作废'];
  { const r = extRng(661023);
    for (let i = 0; i < 64; i++) {
      const u = extPick(r, EXT_USERS);
      const cu = extPick(r, customers);
      const mod = extPick(r, LOG_MODULES);
      const act = extPick(r, LOG_ACTS);
      const d = extAddDays(TODAY, -extRint(r, 0, 9));
      logs.push({
        time: d + ' ' + extPad(extRint(r, 8, 19), 2) + ':' + extPad(extRint(r, 0, 59), 2) + ':' + extPad(extRint(r, 0, 59), 2),
        who: u.name, module: mod, act,
        detail: (act === '登录' ? '登录系统（模块：' + mod + '）' : act + '「' + cu.name + '」的' + mod + '数据' + (act === '导出' ? '（Excel 下载）' : '')),
        ip: '10.20.' + extRint(r, 0, 9) + '.' + extRint(r, 2, 250),
      });
    } }

  return {
    customers, contacts, products, pricebooks, quotes, contracts, orders, activities, deliveries,
    tickets, users: JSON.parse(JSON.stringify(EXT_USERS)), roles: JSON.parse(JSON.stringify(EXT_ROLES)),
    depts: JSON.parse(JSON.stringify(EXT_DEPTS)), logs, relations,
  };
}

/* ===== 客户 360：一次返回该客户的全部相关数据（ECharts 关系图 / 决策链） ===== */
function customerBundle(ext, customerName, oppsIn) {
  const opIn = oppsIn || (typeof store !== 'undefined' && store.opps) || [];
  const nm = customerName;
  const pick = arr => (arr || []).filter(x => x.customer === nm);
  const contacts = (ext.contacts || []).filter(c => c.customer === nm);
  const quoted = pick(ext.quotes).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const bc = {
    customer: (ext.customers || []).find(c => c.name === nm) || null,
    contacts,
    activities: pick(ext.activities).slice().sort((a, b) => (a.time < b.time ? 1 : -1)),
    opps: (opIn || []).filter(o => o.customer === nm).slice().sort((a, b) => b.amount - a.amount),
    quotes: quoted,
    contracts: pick(ext.contracts).slice().sort((a, b) => ((a.signDate || '') < (b.signDate || '') ? 1 : -1)),
    orders: pick(ext.orders).slice().sort((a, b) => (a.date < b.date ? 1 : -1)),
    deliveries: pick(ext.deliveries),
    tickets: pick(ext.tickets).slice().sort((a, b) => (a.created < b.created ? 1 : -1)),
    relations: (ext.relations || {})[nm] || { nodes: [], edges: [] },
    files: [],
  };
  bc.contracts.forEach(t => (t.attachments || []).forEach(a => bc.files.push({ name: a.name, type: '合同附件', ref: t.no, size: a.size, date: a.date })));
  bc.quotes.forEach(q => bc.files.push({ name: '报价单 ' + q.no + '（' + q.ver + '）.pdf', type: '报价单', ref: q.no, size: '260KB', date: q.date }));
  bc.tickets.forEach(t => (t.images || []).forEach(img => bc.files.push({ name: img, type: '工单图片', ref: t.no, size: '480KB', date: (t.created || '').slice(0, 10) })));
  return bc;
}
