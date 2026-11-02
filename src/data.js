/* ===== 工具函数 ===== */
const toC = n => Math.round(n * 100);                       // 元 → 分（金额一律用整数分计算，避免浮点误差）
const fmtC = c => (c / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtY = n => Number(n).toLocaleString('zh-CN');
const yuan = n => '¥' + fmtY(n);
const wan = n => '¥' + (n / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 1 }) + '万';
const TODAY = '2026-11-02';
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

/* ===== 导航（方案 4.1 的 15 个一级模块） ===== */
const NAV = [
  { key: 'workbench', title: '工作台', icon: 'HomeFilled', children: [
    { path: '/workbench', title: '个人工作台' }, { path: '/approvals', title: '审批中心' }, { path: '/mobile', title: '移动端预览' } ] },
  { key: 'leads', title: '线索管理', icon: 'Aim', children: [
    { path: '/leads', title: '线索列表' }, { path: '/leads/my', title: '我的线索' }, { path: '/leads/pool', title: '线索公海' }, { path: '/leads/records', title: '线索转化记录' } ] },
  { key: 'customers', title: '客户管理', icon: 'OfficeBuilding', children: [
    { path: '/customers', title: '客户列表' }, { path: '/customers/my', title: '我的客户' }, { path: '/customers/pool', title: '客户公海' }, { path: '/customers/key', title: '重点客户' }, { path: '/customers/category', title: '客户分类' }, { path: '/customers/recycle', title: '客户回收站' }, { path: '/customers/merge', title: '客户合并' } ] },
  { key: 'contacts', title: '联系人管理', icon: 'User', path: '/contacts' },
  { key: 'opps', title: '商机管理', icon: 'TrendCharts', children: [
    { path: '/opps', title: '商机看板' }, { path: '/opps/list', title: '商机列表' } ] },
  { key: 'products', title: '产品管理', icon: 'Goods', children: [
    { path: '/products', title: '产品目录' }, { path: '/pricebooks', title: '价格表' } ] },
  { key: 'quotes', title: '报价管理', icon: 'Tickets', children: [
    { path: '/quotes', title: '报价列表' }, { path: '/quote/BJ-202611-0008', title: '报价单详情' } ] },
  { key: 'contracts', title: '合同管理', icon: 'Document', path: '/contracts' },
  { key: 'orders', title: '订单管理', icon: 'ShoppingCart', path: '/orders' },
  { key: 'payments', title: '回款管理', icon: 'Wallet', path: '/payments' },
  { key: 'activities', title: '活动管理', icon: 'Calendar', path: '/activities' },
  { key: 'delivery', title: '交付管理', icon: 'Box', path: '/delivery' },
  { key: 'service', title: '服务管理', icon: 'Headset', path: '/service' },
  { key: 'analytics', title: '数据分析', icon: 'DataAnalysis', children: [
    { path: '/analytics', title: '经营报表' } ] },
  { key: 'system', title: '系统管理', icon: 'Setting', children: [
    { path: '/system', title: '用户管理' }, { path: '/system/roles', title: '角色权限' }, { path: '/system/org', title: '组织架构' },
    { path: '/system/logs', title: '操作日志' }, { path: '/system/pool-rules', title: '公海规则' }, { path: '/approvals/templates', title: '审批模板' } ] },
];

/* ===== 消息 / 待办 ===== */
const MESSAGES = [
  { id: 1, title: '线索 XS-202611-0008 已分配给你', time: '今天 09:12', type: '分配通知', read: false },
  { id: 2, title: '报价 BJ-202611-0008 (V3) 折扣审批待处理', time: '今天 08:40', type: '审批提醒', read: false },
  { id: 3, title: '回款计划「项目上线」已逾期 5 天', time: '今天 08:00', type: '逾期提醒', read: false },
  { id: 4, title: '合同 HT-202607-0004 将于 12 天后到期', time: '昨天 17:30', type: '到期提醒', read: true },
  { id: 5, title: '你提交的客户转移申请已通过', time: '11-01 15:20', type: '审批结果', read: true },
];

/* ===== 线索（方案 5.2 字段） ===== */
const LEADS_INIT = [
  { no: 'XS-202611-0008', name: '智能产线改造项目', company: '苏州某某智能装备有限公司', contact: '王经理', phone: '139****1234', source: '官网', need: 'MES 系统', amount: 300000, status: '新建', owner: '张三', next: '2026-11-03 10:00', created: '2026-11-02 09:05', dup: { type: '线索', ref: 'XS-202610-0031', why: '手机号相同' } },
  { no: 'XS-202611-0007', name: 'ERP 二期扩容需求', company: '南京某某科技有限公司', contact: '陈总监', phone: '138****8888', source: '转介绍', need: 'ERP 增购', amount: 450000, status: '跟进中', owner: '张三', next: '2026-11-02 14:30', created: '2026-11-01 16:20', dup: { type: '客户', ref: 'KH-202611-0001 南京某某科技有限公司', why: '公司名称一致', customerNo: 'KH-202611-0001' } },
  { no: 'XS-202611-0006', name: '连锁门店 CRM 咨询', company: '杭州某某连锁餐饮有限公司', contact: '李店长', phone: '137****5566', source: '广告', need: 'CRM 软件', amount: 120000, status: '新建', owner: '', next: '', created: '2026-11-01 11:42' },
  { no: 'XS-202611-0005', name: '渠道代理合作', company: '合肥某某贸易有限公司', contact: '赵先生', phone: '136****7788', source: '渠道', need: '渠道代理', amount: 80000, status: '新建', owner: '', next: '', created: '2026-11-01 10:08' },
  { no: 'XS-202611-0004', name: '酒店集团协议客户', company: '江苏某某集团', contact: '周主任', phone: '135****9021', source: '活动', need: '协议客户系统', amount: 680000, status: '跟进中', owner: '李四', next: '2026-11-04 09:30', created: '2026-10-31 14:15', dup: { type: '客户', ref: 'KH-202611-0002 江苏某某集团', why: '公司名称一致', customerNo: 'KH-202611-0002' } },
  { no: 'XS-202610-0033', name: '售后服务系统建设', company: '无锡某某汽配有限公司', contact: '孙工', phone: '188****3321', source: '官网', need: '服务工单', amount: 150000, status: '跟进中', owner: '张三', next: '2026-11-05 15:00', created: '2026-10-30 09:40' },
  { no: 'XS-202610-0031', name: '智能装备 MES 咨询', company: '苏州某某智能装备有限公司', contact: '王经理', phone: '139****1234', source: '广告', need: 'MES 系统', amount: 280000, status: '跟进中', owner: '王五', next: '2026-11-03 16:00', created: '2026-10-28 13:30', dup: { type: '线索', ref: 'XS-202611-0008', why: '手机号相同' } },
  { no: 'XS-202610-0028', name: '实施交付外包', company: '常州某某物流有限公司', contact: '吴经理', phone: '133****4410', source: '转介绍', need: '实施服务', amount: 60000, status: '无效', owner: '李四', next: '', created: '2026-10-26 10:00' },
  { no: 'XS-202610-0024', name: '会员系统升级', company: '宁波某某商贸有限公司', contact: '郑总', phone: '134****6602', source: '活动', need: '会员运营', amount: 220000, status: '已转化', owner: '张三', next: '', created: '2026-10-22 15:48', convertedAt: '2026-10-29 11:20', convertedTo: 'KH-202610-0036' },
  { no: 'XS-202610-0019', name: '数据平台试点', company: '上海某某信息技术有限公司', contact: '冯总', phone: '151****0098', source: '官网', need: 'BI 数据平台', amount: 360000, status: '已转化', owner: '王五', next: '', created: '2026-10-18 09:12', convertedAt: '2026-10-24 16:05', convertedTo: 'KH-202610-0018' },
  { no: 'XS-202610-0012', name: '库房协同管理', company: '宿迁某某仓储有限公司', contact: '韩经理', phone: '152****7755', source: '渠道', need: 'ERP 对接', amount: 95000, status: '新建', owner: '', next: '', created: '2026-10-12 17:30' },
  { no: 'XS-202610-0009', name: '培训服务采购', company: '扬州某某教育科技公司', contact: '许老师', phone: '159****2218', source: '广告', need: '培训服务', amount: 40000, status: '新建', owner: '', next: '', created: '2026-10-09 08:55' },
];
const EXISTING_CUSTOMERS = [
  { no: 'KH-202611-0001', name: '南京某某科技有限公司' }, { no: 'KH-202611-0002', name: '江苏某某集团' },
  { no: 'KH-202610-0021', name: '安徽某某连锁有限公司' }, { no: 'KH-202610-0018', name: '上海某某信息技术有限公司' },
  { no: 'KH-202609-0032', name: '苏州某某汽配有限公司' } ];
const OWNERS = ['张三', '李四', '王五', '赵六'];
const INDUSTRIES = ['制造业', '零售', '酒店餐饮', '汽车后市场', '企业软件 / SaaS', '企业服务', '物流仓储'];

/* ===== 客户（方案 5.3 字段） ===== */
const CUSTOMERS_INIT = [
  { no: 'KH-202611-0001', name: '南京某某科技有限公司', type: '企业客户', industry: '制造业', level: '重点客户', source: '渠道转介绍', region: '江苏省南京市', scale: '中型', owner: '张三', status: '正常', lastFollow: '2026-11-02', lastDeal: '2026-10-19', total: 1260000, created: '2026-11-01', phone: '138****8888', key: true },
  { no: 'KH-202611-0002', name: '江苏某某集团', type: '企业客户', industry: '酒店餐饮', level: '战略客户', source: '官网', region: '江苏省苏州市', scale: '大型', owner: '李四', status: '跟进中', lastFollow: '2026-11-02', lastDeal: '2026-08-12', total: 3860000, created: '2026-10-28', phone: '135****9021', key: true },
  { no: 'KH-202610-0021', name: '安徽某某连锁有限公司', type: '企业客户', industry: '零售', level: '重点客户', source: '活动', region: '安徽省合肥市', scale: '中型', owner: '张三', status: '跟进中', lastFollow: '2026-10-31', lastDeal: '-', total: 0, created: '2026-10-20', phone: '137****5566', key: true },
  { no: 'KH-202610-0018', name: '上海某某信息技术有限公司', type: '企业客户', industry: '企业软件 / SaaS', level: '普通客户', source: '官网', region: '上海市浦东新区', scale: '小型', owner: '王五', status: '正常', lastFollow: '2026-10-29', lastDeal: '2026-10-30', total: 360000, created: '2026-10-24', phone: '151****0098', key: false },
  { no: 'KH-202610-0015', name: '杭州某某酒店管理有限公司', type: '企业客户', industry: '酒店餐饮', level: '普通客户', source: '广告', region: '浙江省杭州市', scale: '中型', owner: '赵六', status: '正常', lastFollow: '2026-10-25', lastDeal: '2026-07-05', total: 520000, created: '2026-09-30', phone: '136****2210', key: false },
  { no: 'KH-202609-0032', name: '苏州某某汽配有限公司', type: '渠道客户', industry: '汽车后市场', level: '重点客户', source: '渠道', region: '江苏省苏州市', scale: '中型', owner: '李四', status: '正常', lastFollow: '2026-10-30', lastDeal: '2026-09-18', total: 890000, created: '2026-09-12', phone: '139****3380', key: true },
  { no: 'KH-202609-0027', name: '无锡某某精密制造有限公司', type: '企业客户', industry: '制造业', level: '普通客户', source: '转介绍', region: '江苏省无锡市', scale: '中型', owner: '张三', status: '暂停合作', lastFollow: '2026-09-02', lastDeal: '2026-03-20', total: 240000, created: '2026-09-05', phone: '133****7791', key: false },
  { no: 'KH-202608-0009', name: '常州某某物流有限公司', type: '企业客户', industry: '物流仓储', level: '潜在客户', source: '官网', region: '江苏省常州市', scale: '小型', owner: '王五', status: '流失', lastFollow: '2026-07-15', lastDeal: '-', total: 0, created: '2026-08-02', phone: '158****4021', key: false },
  { no: 'KH-202608-0004', name: '合肥某某餐饮连锁有限公司', type: '企业客户', industry: '酒店餐饮', level: '普通客户', source: '活动', region: '安徽省合肥市', scale: '大型', owner: '赵六', status: '跟进中', lastFollow: '2026-10-28', lastDeal: '2026-06-18', total: 410000, created: '2026-08-01', phone: '188****6612', key: false },
  { no: 'KH-202607-0012', name: '宁波某某贸易有限公司', type: '个人客户', industry: '零售', level: '潜在客户', source: '广告', region: '浙江省宁波市', scale: '小型', owner: '张三', status: '正常', lastFollow: '2026-10-20', lastDeal: '-', total: 0, created: '2026-07-11', phone: '150****8803', key: false },
];

/* ===== 商机与阶段（方案 5.5 / 6.3） ===== */
const STAGES = [
  /* prob = 默认赢率（原型假设，待业务确认）；funnelWidth = 漏斗图展示宽度，不代表转化率或赢率 */
  { key: 'contact', name: '初步接触', prob: 10, funnelWidth: 100, color: '#6b8fc9', total: 8, amount: 1560000 },
  { key: 'need', name: '需求确认', prob: 25, funnelWidth: 80, color: '#4b78bd', total: 10, amount: 2380000 },
  { key: 'plan', name: '方案沟通', prob: 45, funnelWidth: 60, color: '#2f62b0', total: 8, amount: 1920000 },
  { key: 'quote', name: '报价谈判', prob: 65, funnelWidth: 40, color: '#1f4e9c', total: 6, amount: 1680000 },
  { key: 'approve', name: '商务审批', prob: 85, funnelWidth: 25, color: '#163b7a', total: 4, amount: 960000 },
  { key: 'close', name: '赢单 / 输单', prob: 100, funnelWidth: 15, color: '#0f2a57', total: 5, amount: 830000 },
];
const STAGE_RULES = {
  need: { title: '需求确认', fields: [
    { k: 'demand', label: '客户需求', type: 'textarea' }, { k: 'buyDate', label: '采购时间', type: 'date' }, { k: 'budget', label: '预算范围', type: 'input', ph: '如 30–40 万元' } ] },
  plan: { title: '方案沟通', fields: [
    { k: 'solution', label: '方案说明', type: 'textarea' }, { k: 'participants', label: '参与沟通的联系人', type: 'select', opts: ['陈总监（决策人）', '刘经理（使用人）', '周会计（财务）', '黄工（技术）'] } ] },
  quote: { title: '报价谈判', checks: [{ k: 'hasQuote', label: '必须存在有效报价单', hint: '请先创建并通过审批的报价单', link: '/quote/BJ-202611-0008' }] },
  approve: { title: '商务审批', fields: [
    { k: 'terms', label: '商务条件', type: 'textarea', ph: '付款方式、交付周期、服务期限、折扣依据…' }, { k: 'materials', label: '审批材料', type: 'select', opts: ['报价单 V3 + 折扣说明.pdf', '客户采购意向函.pdf'] } ] },
  win: { title: '赢单', checks: [{ k: 'contractApproved', label: '合同已审批或订单已确认（企业配置的成交条件）', hint: '禁止直接标记赢单，需先完成合同审批', link: '/contracts' }] },
  lose: { title: '输单', fields: [
    { k: 'loseReason', label: '输单原因', type: 'select', opts: ['价格偏高', '功能不满足', '竞品中标', '客户预算取消', '项目延期'] }, { k: 'competitor', label: '竞争对手', type: 'input', ph: '适用时填写' } ] },
};
const OPPS_INIT = [
  { no: 'SJ-202611-0031', name: '苏州某某智能装备 MES 项目', customer: '苏州某某智能装备有限公司', contact: '王经理', source: '线索', type: '新购', need: 'MES 系统与产线数据采集', competitor: '-', amount: 300000, date: '2026-12-20', owner: '张三', stage: 'contact', prob: 10, info: {}, flags: {} },
  { no: 'SJ-202611-0029', name: '杭州某某连锁门店 CRM', customer: '杭州某某连锁餐饮有限公司', contact: '李店长', source: '广告', type: '新购', need: '连锁门店会员与营销管理', competitor: '竞品 A', amount: 120000, date: '2027-01-15', owner: '李四', stage: 'contact', prob: 10, info: {}, flags: {} },
  { no: 'SJ-202611-0027', name: '合肥某某渠道代理系统', customer: '合肥某某贸易有限公司', contact: '赵先生', source: '渠道', type: '新购', need: '渠道代理订货与返利', competitor: '-', amount: 80000, date: '2027-01-30', owner: '赵六', stage: 'contact', prob: 10, info: {}, flags: {} },
  { no: 'SJ-202610-0026', name: '安徽某某连锁会员系统', customer: '安徽某某连锁有限公司', contact: '李店长', source: '官网', type: '增购', need: '会员积分体系、门店收银对接', competitor: '金蝶', amount: 260000, date: '2026-12-10', owner: '张三', stage: 'need', prob: 25, info: { demand: '会员积分体系、门店收银对接', buyDate: '2026-12-01', budget: '25–30 万元' }, flags: { stalled: 12 } },
  { no: 'SJ-202610-0024', name: '无锡某某服务工单系统', customer: '无锡某某汽配有限公司', contact: '孙工', source: '官网', type: '新购', need: '售后服务工单管理', competitor: '-', amount: 150000, date: '2026-12-05', owner: '张三', stage: 'need', prob: 25, info: {}, flags: {} },
  { no: 'SJ-202610-0022', name: '上海某某数据平台二期', customer: '上海某某信息技术有限公司', contact: '冯总', source: '线索', type: '增购', need: 'BI 看板、跨系统数据同步', competitor: '帆软', amount: 360000, date: '2026-11-30', owner: '王五', stage: 'need', prob: 25, info: { demand: 'BI 看板、跨系统数据同步', buyDate: '2026-11-20', budget: '35–40 万元' }, flags: {} },
  { no: 'SJ-202610-0018', name: '江苏某某集团协议客户平台', customer: '江苏某某集团', contact: '周主任', source: '客户转介绍', type: '新购', need: '集团协议客户统一管理', competitor: '-', amount: 680000, date: '2026-12-18', owner: '李四', stage: 'plan', prob: 45, info: { demand: '集团协议客户统一管理', buyDate: '2026-12-01', budget: '60–70 万元', solution: '集团版 + 门店端移动应用', participants: '陈总监（决策人）' }, flags: {} },
  { no: 'SJ-202610-0015', name: '杭州某某酒店续约方案', customer: '杭州某某酒店管理有限公司', contact: '刘经理', source: '客户转介绍', type: '续费', need: '年度续约与用户增购', competitor: '-', amount: 180000, date: '2026-11-28', owner: '赵六', stage: 'plan', prob: 45, info: { demand: '年度续约+增购 20 用户', buyDate: '2026-11-20', budget: '18 万元', solution: '续约 + 增购方案', participants: '刘经理（使用人）' }, flags: { stalled: 9 } },
  { no: 'SJ-202609-0012', name: '南京某某 ERP 升级项目', customer: '南京某某科技有限公司', contact: '陈总监', source: '客户转介绍', type: '增购', need: 'ERP 升级、移动端扩展', competitor: '用友', amount: 340000, date: '2026-11-25', owner: '张三', stage: 'quote', prob: 65, info: { demand: 'ERP 升级、移动端扩展', buyDate: '2026-11-15', budget: '30–35 万元', solution: 'CRM 企业版 + 移动扩展 + 实施', participants: '陈总监（决策人）' }, flags: { hasQuote: true }, quoteNo: 'BJ-202611-0008' },
  { no: 'SJ-202609-0010', name: '苏州某某汽配渠道平台', customer: '苏州某某汽配有限公司', contact: '黄工', source: '渠道', type: '新购', need: '渠道订货、返利', competitor: '金蝶', amount: 420000, date: '2026-11-22', owner: '李四', stage: 'quote', prob: 65, info: { demand: '渠道订货、返利', buyDate: '2026-11-10', budget: '40 万元', solution: '渠道门户+订货', participants: '黄工（技术）' }, flags: {} },
  { no: 'SJ-202609-0006', name: '合肥某某餐饮连锁续费', customer: '合肥某某餐饮连锁有限公司', contact: '周会计', source: '客户转介绍', type: '续费', need: '到期续费', competitor: '-', amount: 260000, date: '2026-11-18', owner: '赵六', stage: 'approve', prob: 85, info: { demand: '到期续费', buyDate: '2026-11-10', budget: '26 万元', solution: '原方案续费', participants: '周会计（财务）', terms: '年付，95 折', materials: '报价单 V3 + 折扣说明.pdf' }, flags: { hasQuote: true, contractApproved: false }, quoteNo: 'BJ-202610-0019' },
  { no: 'SJ-202610-0020', name: '无锡某某精密制造设备管理项目', customer: '无锡某某精密制造有限公司', contact: '黄工', source: '客户转介绍', type: '新购', need: '设备台账与维保管理', competitor: '-', amount: 240000, date: '2026-11-12', owner: '张三', stage: 'approve', prob: 85, info: { demand: '设备台账与维保管理', buyDate: '2026-11-05', budget: '24 万元', solution: '设备管理模块定制', participants: '黄工（技术）', terms: '合同签署付 50%，验收付 50%', materials: '报价单 V3 + 折扣说明.pdf' }, flags: { hasQuote: true, contractApproved: true }, quoteNo: 'BJ-202610-0015' },
  { no: 'SJ-202608-0004', name: '南京某某 ERP 实施项目', customer: '南京某某科技有限公司', contact: '陈总监', source: '客户转介绍', type: '新购', need: 'ERP 实施与上线支持', competitor: '-', winReason: '方案匹配', amount: 100000, date: '2026-10-19', owner: '张三', stage: 'close', prob: 100, result: '赢单', info: {}, flags: {} },
  { no: 'SJ-202608-0002', name: '宁波某某会员运营', customer: '宁波某某商贸有限公司', contact: '郑总', source: '活动', type: '新购', need: '会员运营体系', competitor: '-', winReason: '价格优势', amount: 220000, date: '2026-10-29', owner: '张三', stage: 'close', prob: 100, result: '赢单', info: {}, flags: {} },
  { no: 'SJ-202607-0008', name: '常州某某物流调度', customer: '常州某某物流有限公司', contact: '吴经理', source: '客户转介绍', type: '新购', need: '物流调度与司机结算', competitor: '用友', amount: 190000, date: '2026-10-15', owner: '王五', stage: 'close', prob: 0, result: '输单', loseReason: '竞品中标', info: {}, flags: {} },
];
const STAGE_IDX = Object.fromEntries(STAGES.map((s, i) => [s.key, i]));

/* ===== 报价单（方案 5.7）· 金额全部以“分”精确计算 ===== */
const QUOTE_ITEMS = [
  { id: 1, name: 'CRM 企业版软件授权', spec: '50 用户 · 年付', qty: 50, unit: '用户·年', price: 3600, disc: 90 },
  { id: 2, name: '移动端扩展包', spec: '含企业微信集成', qty: 1, unit: '套', price: 28000, disc: 85 },
  { id: 3, name: '标准实施服务', spec: '标准实施 · 人天', qty: 40, unit: '人天', price: 2000, disc: 100 },
  { id: 4, name: '数据迁移服务', spec: '历史数据清洗导入', qty: 1, unit: '项', price: 15800, disc: 80 },
  { id: 5, name: '年度运维服务', spec: '7×12 小时响应', qty: 1, unit: '年', price: 18000, disc: 100 },
];
const TAX_RATE_BP = 1300; // 13.00%（基点）
const DISCOUNT_RULES = [
  { max: 500, role: '销售人员（授权范围内，自动通过）' }, { max: 1000, role: '销售经理' }, { max: 2000, role: '销售总监' }, { max: 10001, role: '总经理 / 财务负责人（低于价格底线）' } ];
function calcQuote(items) {
  let orig = 0, sub = 0;
  const rows = items.map(it => {
    const stdC = toC(it.price);
    const dealC = Math.round(stdC * it.disc / 100);           // 成交单价（分）
    const lineOrig = stdC * it.qty, lineSub = dealC * it.qty;
    orig += lineOrig; sub += lineSub;
    return { ...it, stdC, dealC, lineSub };
  });
  const discount = orig - sub;
  const tax = Math.round(sub * TAX_RATE_BP / 10000);
  const discBp = orig ? Math.round(discount * 10000 / orig) : 0;
  const rule = DISCOUNT_RULES.find(r => discBp <= r.max);
  return { rows, orig, sub, discount, tax, total: sub + tax, discBp, rule };
}

/* ===== 回款（方案 5.10）· 合同 100,000 元 30/40/30 ===== */
function buildPay() {
  return {
    contracts: [
      { no: 'HT-202611-0003', name: '南京某某科技 ERP 实施合同', customer: '南京某某科技有限公司', order: 'DD-202611-0002', owner: '张三', amount: toC(100000), plans: [
        { id: 'P1', stage: '合同签署', ratio: 30, date: '2026-10-20', amount: toC(30000) },
        { id: 'P2', stage: '项目上线', ratio: 40, date: '2026-10-28', amount: toC(40000) },
        { id: 'P3', stage: '项目验收', ratio: 30, date: '2026-12-15', amount: toC(30000) } ] },
      { no: 'HT-202608-0012', name: '江苏某某集团平台建设合同', customer: '江苏某某集团', order: 'DD-202608-0009', owner: '李四', amount: toC(600000), plans: [
        { id: 'P4', stage: '预付款', ratio: 50, date: '2026-08-20', amount: toC(300000) },
        { id: 'P5', stage: '验收款', ratio: 50, date: '2026-11-20', amount: toC(300000) } ] },
      { no: 'HT-202607-0004', name: '杭州某某酒店年度服务合同', customer: '杭州某某酒店管理有限公司', order: 'DD-202607-0004', owner: '赵六', amount: toC(180000), plans: [
        { id: 'P6', stage: '首付款', ratio: 60, date: '2026-07-10', amount: toC(108000) },
        { id: 'P7', stage: '尾款', ratio: 40, date: '2026-10-25', amount: toC(72000) } ] },
    ],
    records: [
      { id: 'SK-202610-0007', contract: 'HT-202611-0003', date: '2026-10-19', amount: toC(30000), method: '银行转账', confirm: '财务已确认', operator: '财务-王芳', alloc: [{ plan: 'P1', amt: toC(30000) }] },
      { id: 'SK-202610-0012', contract: 'HT-202611-0003', date: '2026-10-30', amount: toC(25000), method: '银行转账', confirm: '财务已确认', operator: '财务-王芳', alloc: [{ plan: 'P2', amt: toC(25000) }] },
      { id: 'SK-202608-0003', contract: 'HT-202608-0012', date: '2026-08-19', amount: toC(300000), method: '银行转账', confirm: '财务已确认', operator: '财务-王芳', alloc: [{ plan: 'P4', amt: toC(300000) }] },
      { id: 'SK-202607-0002', contract: 'HT-202607-0004', date: '2026-07-09', amount: toC(108000), method: '电汇', confirm: '财务已确认', operator: '财务-王芳', alloc: [{ plan: 'P6', amt: toC(108000) }] },
      { id: 'SK-202610-0015', contract: 'HT-202607-0004', date: '2026-10-31', amount: toC(40000), method: '银行转账', confirm: '待财务复核', operator: '财务-王芳', alloc: [{ plan: 'P7', amt: toC(40000) }] },
      { id: 'SK-202611-0001', contract: 'HT-202607-0004', date: '2026-11-01', amount: toC(20000), method: '银行转账', confirm: '财务已确认', operator: '财务-王芳', alloc: [{ plan: 'P7', amt: toC(20000) }] },
    ],
  };
}

/* ===== 审批（方案 7.1） ===== */
const APPROVALS_INIT = [
  { id: 'SP-202611-0042', tab: 'todo', type: '报价折扣审批', title: '报价 BJ-202611-0008 (V3) 折扣审批', biz: '南京某某 ERP 升级项目', applicant: '王五', dept: '华东销售一部', time: '2026-11-02 08:40', amount: toC(334977.2), summary: [['客户', '南京某某科技有限公司'], ['关联商机', 'SJ-202609-0012'], ['整体折扣', '7.88%（超出销售授权 5%）'], ['含税金额', '¥334,977.20'], ['报价版本', 'V3']], nodes: [
    { n: '发起申请', p: '王五', st: 'done', t: '11-02 08:40' }, { n: '销售经理', p: '张三（我）', st: 'cur', t: '' }, { n: '销售总监', p: '（折扣>10% 时触发）', st: 'skip', t: '' }, { n: '审批完成', p: '', st: 'wait', t: '' } ], history: [{ who: '王五', act: '提交申请', op: '客户为重点客户，申请 92 折以内的组合折扣，竞品报价较低。', t: '11-02 08:40' }], cc: false },
  { id: 'SP-202611-0043', tab: 'todo', type: '低价报价审批', title: '报价 BJ-202611-0011 低价报价审批', biz: '杭州某某酒店年度服务', applicant: '赵六', dept: '华东销售二部', time: '2026-11-02 09:10', amount: toC(158000), summary: [['客户', '杭州某某酒店管理有限公司'], ['报价版本', 'V1'], ['报价金额', '¥158,000.00'], ['最低限价', '¥165,000.00（低于限价 4.24%）']], nodes: [
    { n: '发起申请', p: '赵六', st: 'done', t: '11-02 09:10' }, { n: '销售总监', p: '周总监', st: 'cur', t: '' }, { n: '财务负责人', p: '王财务', st: 'wait', t: '' }, { n: '审批完成', p: '', st: 'wait', t: '' } ], history: [{ who: '赵六', act: '提交申请', op: '酒店年度服务竞标，申请低于最低限价报价。', t: '11-02 09:10' }], cc: false },
  { id: 'SP-202611-0040', tab: 'todo', type: '合同审批', title: '合同 HT-202611-0006 新建合同审批', biz: '苏州某某汽配渠道平台合同', applicant: '李四', dept: '华东销售二部', time: '2026-11-01 17:10', amount: toC(420000), summary: [['客户', '苏州某某汽配有限公司'], ['合同金额', '¥420,000.00'], ['付款方式', '3 / 3 / 4 分期'], ['签约方', '我方：某某软件有限公司']], nodes: [
    { n: '发起申请', p: '李四', st: 'done', t: '11-01 17:10' }, { n: '业务负责人（销售经理）', p: '张三（我）', st: 'cur', t: '' }, { n: '法务', p: '陈法务', st: 'wait', t: '' }, { n: '财务', p: '王财务', st: 'wait', t: '' } ], history: [{ who: '李四', act: '提交申请', op: '合同已与客户确认条款。', t: '11-01 17:10' }], cc: false },
  { id: 'SP-202611-0038', tab: 'todo', type: '客户转移', title: '重点客户转移 · 苏州某某汽配有限公司', biz: '负责人 李四 → 王五', applicant: '李四', dept: '华东销售二部', time: '2026-10-31 14:20', amount: 0, summary: [['客户', '苏州某某汽配有限公司（重点客户）'], ['原负责人', '李四'], ['新负责人', '王五'], ['转移原因', '区域调整']], nodes: [
    { n: '发起申请', p: '李四', st: 'done', t: '10-31 14:20' }, { n: '原负责人直属经理', p: '张三（我）', st: 'cur', t: '' }, { n: '审批完成', p: '', st: 'wait', t: '' } ], history: [{ who: '李四', act: '提交申请', op: '区域调整，客户移交王五。', t: '10-31 14:20' }], cc: false },
  { id: 'SP-202611-0035', tab: 'mine', type: '报价折扣审批', title: '报价 BJ-202610-0019 低价报价审批', biz: '合肥某某餐饮连锁续费', applicant: '张三', dept: '华东销售一部', time: '2026-10-30 10:05', amount: toC(260000), summary: [['客户', '合肥某某餐饮连锁有限公司'], ['含税金额', '¥260,000.00'], ['整体折扣', '12%']], nodes: [
    { n: '发起申请', p: '张三', st: 'done', t: '10-30 10:05' }, { n: '销售经理', p: '李明', st: 'done', t: '10-30 11:20' }, { n: '销售总监', p: '周总监', st: 'cur', t: '' }, { n: '审批完成', p: '', st: 'wait', t: '' } ], history: [{ who: '张三', act: '提交申请', op: '续费客户，申请优惠。', t: '10-30 10:05' }, { who: '李明', act: '同意', op: '同意，转总监。', t: '10-30 11:20' }], cc: false },
  { id: 'SP-202610-0031', tab: 'mine', type: '应收冲销', title: '回款冲销 · SK-202610-0009', biz: '录入错误更正', applicant: '张三', dept: '华东销售一部', time: '2026-10-27 09:30', amount: toC(5000), summary: [['合同', 'HT-202607-0004'], ['冲销金额', '¥5,000.00'], ['原因', '重复录入']], nodes: [
    { n: '发起申请', p: '张三', st: 'done', t: '10-27 09:30' }, { n: '财务负责人', p: '王财务', st: 'rej', t: '10-27 15:00' } ], history: [{ who: '张三', act: '提交申请', op: '重复录入，申请冲销。', t: '10-27 09:30' }, { who: '王财务', act: '拒绝', op: '银行回单核对为两笔不同到账，请勿冲销。', t: '10-27 15:00' }], cc: false, result: '已拒绝' },
  { id: 'SP-202610-0027', tab: 'done', type: '线索批量分配', title: '线索批量分配 · 12 条', biz: '超出普通销售权限', applicant: '赵六', dept: '华东销售二部', time: '2026-10-25 13:40', amount: 0, summary: [['线索数量', '12 条'], ['分配对象', '华东销售二部']], nodes: [
    { n: '发起申请', p: '赵六', st: 'done', t: '10-25 13:40' }, { n: '销售经理', p: '张三', st: 'done', t: '10-25 14:10' } ], history: [{ who: '赵六', act: '提交申请', op: '活动线索统一分配。', t: '10-25 13:40' }, { who: '张三', act: '同意', op: '同意分配。', t: '10-25 14:10' }], cc: false, result: '已同意' },
  { id: 'SP-202610-0022', tab: 'done', type: '商机特殊折扣', title: '商机 SJ-202609-0010 特殊折扣', biz: '苏州某某汽配渠道平台', applicant: '李四', dept: '华东销售二部', time: '2026-10-22 09:50', amount: toC(420000), summary: [['折扣', '9 折'], ['客户', '苏州某某汽配有限公司']], nodes: [
    { n: '发起申请', p: '李四', st: 'done', t: '10-22 09:50' }, { n: '销售经理', p: '张三', st: 'rej', t: '10-22 11:00' } ], history: [{ who: '李四', act: '提交申请', op: '渠道客户申请折扣。', t: '10-22 09:50' }, { who: '张三', act: '拒绝', op: '折扣不合理，请调整到 95 折以内。', t: '10-22 11:00' }], cc: false, result: '已拒绝' },
  { id: 'SP-202611-0041', tab: 'cc', type: '合同变更', title: '合同 HT-202604-0018 金额变更', biz: '南京某某科技 ERP 软件授权合同', applicant: '王五', dept: '华东销售一部', time: '2026-11-01 16:30', amount: toC(600000), summary: [['合同', 'HT-202604-0018'], ['变更内容', '增加 10 个用户授权'], ['变更后金额', '¥600,000.00']], nodes: [
    { n: '发起申请', p: '王五', st: 'done', t: '11-01 16:30' }, { n: '销售总监', p: '周总监', st: 'cur', t: '' }, { n: '法务', p: '陈法务', st: 'wait', t: '' } ], history: [{ who: '王五', act: '提交申请', op: '客户新增用户，申请变更合同金额。', t: '11-01 16:30' }], cc: true },
  { id: 'SP-202610-0029', tab: 'cc', type: '合同终止', title: '合同 HT-202511-0009 提前终止', biz: '无锡某某精密制造', applicant: '张三', dept: '华东销售一部', time: '2026-10-26 11:15', amount: toC(240000), summary: [['合同', 'HT-202511-0009'], ['终止原因', '客户暂停合作']], nodes: [
    { n: '发起申请', p: '张三', st: 'done', t: '10-26 11:15' }, { n: '指定负责人', p: '李明', st: 'done', t: '10-26 14:00' }, { n: '管理层', p: '周总监', st: 'done', t: '10-27 09:00' } ], history: [{ who: '张三', act: '提交申请', op: '客户暂停合作。', t: '10-26 11:15' }], cc: true, result: '已同意' },
];

/* ===== 占位模块配置（统一布局 · 少量 mock 行） ===== */
const T = (map) => map;
const PH = {
  contacts: { title: '联系人管理', crumbs: ['联系人管理', '联系人列表'], unit: '位', total: 3426, stats: [['联系人总数', '3,426'], ['关键决策人', '412', 'ok'], ['本月新增', '86'], ['长期未联系 (>60天)', '37', 'warn']],
    filters: [{ k: 'kw', label: '搜索联系人', ph: '姓名 / 电话 / 客户' }, { k: 'role', label: '联系人角色', opts: ['决策人', '使用人', '采购人', '财务', '技术'] }, { k: 'infl', label: '影响力', opts: ['高', '中', '低'] }],
    ops: ['新增联系人', '导入', '导出'],
    cols: [{ p: 'name', l: '联系人姓名', link: true, w: 120 }, { p: 'customer', l: '所属客户', w: 220, link: 'cust' }, { p: 'phone', l: '联系电话', w: 130 }, { p: 'email', l: '电子邮箱', w: 190 }, { p: 'dept', l: '部门', w: 100 }, { p: 'title', l: '职务', w: 110 }, { p: 'role', l: '联系人角色', w: 110, tag: { 决策人: 'danger', 使用人: 'info', 采购人: 'warning', 财务: 'success', 技术: 'primary' } }, { p: 'infl', l: '影响力', w: 80 }, { p: 'pref', l: '联系偏好', w: 90 }, { p: 'key', l: '关键联系人', w: 100, bool: true }],
    rows: [
      { name: '陈总监', customer: '南京某某科技有限公司', phone: '138****8888', email: 'chen@example.com', dept: '信息中心', title: 'CIO', role: '决策人', infl: '高', pref: '电话', key: true },
      { name: '刘经理', customer: '南京某某科技有限公司', phone: '139****0021', email: 'liu@example.com', dept: '运营部', title: '运营经理', role: '使用人', infl: '中', pref: '微信', key: false },
      { name: '周会计', customer: '南京某某科技有限公司', phone: '137****6603', email: 'zhou@example.com', dept: '财务部', title: '财务主管', role: '财务', infl: '中', pref: '邮件', key: false },
      { name: '周主任', customer: '江苏某某集团', phone: '135****9021', email: 'zhouzr@example.com', dept: '采购部', title: '采购主任', role: '采购人', infl: '高', pref: '电话', key: true },
      { name: '黄工', customer: '苏州某某汽配有限公司', phone: '133****2290', email: 'huang@example.com', dept: '技术部', title: '系统工程师', role: '技术', infl: '低', pref: '微信', key: false } ] },
  products: { title: '产品管理', crumbs: ['产品管理', '产品目录'], unit: '项', total: 168, stats: [['产品总数', '168'], ['在售', '142', 'ok'], ['停售', '18', 'warn'], ['价格表', '6']],
    filters: [{ k: 'kw', label: '搜索产品', ph: '产品编号 / 名称' }, { k: 'cat', label: '产品分类', opts: ['软件', '服务', '实施费用', '维护费用', '增值服务', '套餐'] }, { k: 'status', label: '产品状态', opts: ['在售', '停售', '停用'] }],
    ops: ['新增产品', '导入', '价格表管理'],
    cols: [{ p: 'no', l: '产品编号', w: 120 }, { p: 'name', l: '产品名称', w: 200, link: true }, { p: 'cat', l: '产品分类', w: 100 }, { p: 'spec', l: '产品规格', w: 150 }, { p: 'unit', l: '标准单位', w: 90 }, { p: 'price', l: '标准售价', w: 120, money: true }, { p: 'cost', l: '成本价', w: 110, money: true }, { p: 'status', l: '产品状态', w: 100, tag: { 在售: 'success', 停售: 'warning', 停用: 'info' } }, { p: 'book', l: '适用价格表', w: 150 }],
    rows: [
      { no: 'CP-0001', name: 'CRM 企业版软件授权', cat: '软件', spec: '50 用户 · 年付', unit: '用户·年', price: 3600, cost: 1200, status: '在售', book: '标准价 / 重点客户价' },
      { no: 'CP-0002', name: '移动端扩展包', cat: '软件', spec: '含企业微信集成', unit: '套', price: 28000, cost: 9000, status: '在售', book: '标准价' },
      { no: 'CP-0011', name: '标准实施服务', cat: '实施费用', spec: '人天', unit: '人天', price: 2000, cost: 1100, status: '在售', book: '标准价 / 渠道价' },
      { no: 'CP-0012', name: '数据迁移服务', cat: '服务', spec: '历史数据清洗导入', unit: '项', price: 15800, cost: 6000, status: '在售', book: '标准价' },
      { no: 'CP-0021', name: '年度运维服务', cat: '维护费用', spec: '7×12 小时响应', unit: '年', price: 18000, cost: 7000, status: '在售', book: '标准价' } ] },
  contracts: { title: '合同管理', crumbs: ['合同管理', '合同台账'], unit: '份', total: 436, stats: [['合同总数', '436'], ['待审批', '7', 'warn'], ['履约中', '218', 'ok'], ['30天内到期', '9', 'danger']],
    filters: [{ k: 'kw', label: '搜索合同', ph: '合同编号 / 名称 / 客户' }, { k: 'type', label: '合同类型', opts: ['销售合同', '服务合同', '续费合同'] }, { k: 'status', label: '合同状态', opts: ['草稿', '待审批', '审批通过', '待签署', '生效', '履约中', '已完成', '已驳回', '已撤销', '已终止', '已到期'] }],
    ops: ['新增合同', '导出'],
    cols: [{ p: 'no', l: '合同编号', w: 150, link: true }, { p: 'name', l: '合同名称', w: 230 }, { p: 'customer', l: '客户名称', w: 210, link: 'cust' }, { p: 'opp', l: '关联商机', w: 150, link: true }, { p: 'type', l: '合同类型', w: 100 }, { p: 'amount', l: '合同金额', w: 120, money: true }, { p: 'sign', l: '签署日期', w: 110 }, { p: 'end', l: '到期日期', w: 110 }, { p: 'owner', l: '负责人', w: 80 }, { p: 'status', l: '合同状态', w: 100, tag: { 草稿: 'info', 审批中: 'warning', 履约中: 'primary', 已完成: 'success', 已驳回: 'danger' } }],
    rows: [
      { no: 'HT-202611-0006', name: '苏州某某汽配渠道平台合同', customer: '苏州某某汽配有限公司', opp: 'SJ-202609-0010', type: '销售合同', amount: 420000, sign: '-', end: '2027-11-21', owner: '李四', status: '待审批' },
      { no: 'HT-202611-0003', name: '南京某某科技 ERP 实施合同', customer: '南京某某科技有限公司', opp: 'SJ-202608-0004', type: '服务合同', amount: 100000, sign: '2026-10-19', end: '2027-04-19', owner: '张三', status: '履约中' },
      { no: 'HT-202608-0012', name: '江苏某某集团平台建设合同', customer: '江苏某某集团', opp: 'SJ-202607-0003', type: '销售合同', amount: 600000, sign: '2026-08-12', end: '2027-08-11', owner: '李四', status: '履约中' },
      { no: 'HT-202607-0004', name: '杭州某某酒店年度服务合同', customer: '杭州某某酒店管理有限公司', opp: 'SJ-202606-0007', type: '续费合同', amount: 180000, sign: '2026-07-05', end: '2026-11-14', owner: '赵六', status: '履约中' },
      { no: 'HT-202601-0007', name: '南京某某科技 ERP 二期定制开发合同', customer: '南京某某科技有限公司', opp: 'SJ-202512-0003', type: '销售合同', amount: 560000, sign: '2026-01-16', end: '2027-01-15', owner: '张三', status: '履约中' },
      { no: 'HT-202604-0018', name: '南京某某科技 ERP 软件授权合同', customer: '南京某某科技有限公司', opp: 'SJ-202603-0005', type: '销售合同', amount: 600000, sign: '2026-04-18', end: '2027-04-17', owner: '张三', status: '履约中' } ] },
  orders: { title: '订单管理', crumbs: ['订单管理', '销售订单'], unit: '笔', total: 389, stats: [['订单总数', '389'], ['待确认', '11', 'warn'], ['交付中', '96', 'ok'], ['异常（暂停/取消）', '5', 'danger']],
    filters: [{ k: 'kw', label: '搜索订单', ph: '订单编号 / 客户 / 合同' }, { k: 'status', label: '订单状态', opts: ['待确认', '已确认', '待交付', '交付中', '已完成', '已取消'] }],
    ops: ['新增订单', '导出'],
    cols: [{ p: 'no', l: '订单编号', w: 140, link: true }, { p: 'customer', l: '客户', w: 210, link: 'cust' }, { p: 'contract', l: '合同', w: 150, link: true }, { p: 'opp', l: '商机', w: 150, link: true }, { p: 'amount', l: '订单金额', w: 120, money: true }, { p: 'date', l: '订单日期', w: 110 }, { p: 'dlv', l: '交付日期', w: 110 }, { p: 'owner', l: '负责人', w: 80 }, { p: 'status', l: '订单状态', w: 100, tag: { 待确认: 'info', 已确认: 'primary', 待交付: 'warning', 交付中: 'primary', 已完成: 'success', 已取消: 'danger' } }],
    rows: [
      { no: 'DD-202611-0002', customer: '南京某某科技有限公司', contract: 'HT-202611-0003', opp: 'SJ-202608-0004', amount: 100000, date: '2026-10-19', dlv: '2026-12-10', owner: '张三', status: '交付中' },
      { no: 'DD-202608-0009', customer: '江苏某某集团', contract: 'HT-202608-0012', opp: 'SJ-202607-0003', amount: 600000, date: '2026-08-12', dlv: '2026-12-30', owner: '李四', status: '交付中' },
      { no: 'DD-202607-0004', customer: '杭州某某酒店管理有限公司', contract: 'HT-202607-0004', opp: 'SJ-202606-0007', amount: 180000, date: '2026-07-05', dlv: '2026-08-05', owner: '赵六', status: '已完成' },
      { no: 'DD-202611-0003', customer: '宁波某某商贸有限公司', contract: 'HT-202611-0004', opp: 'SJ-202608-0002', amount: 220000, date: '2026-11-01', dlv: '2027-01-10', owner: '张三', status: '待确认' } ] },
  activities: { title: '活动管理', crumbs: ['活动管理', '跟进记录'], unit: '条', total: 9217, stats: [['本月跟进记录', '1,284'], ['今日待跟进', '8', 'warn'], ['本周拜访', '23', 'ok'], ['逾期未跟进', '6', 'danger']],
    filters: [{ k: 'kw', label: '搜索', ph: '客户 / 内容' }, { k: 'type', label: '活动类型', opts: ['电话', '微信', '拜访', '会议', '邮件', '演示', '培训'] }],
    ops: ['记录跟进', '新建日程', '导出'],
    cols: [{ p: 'no', l: '跟进编号', w: 130 }, { p: 'customer', l: '关联客户', w: 210, link: 'cust' }, { p: 'contact', l: '关联联系人', w: 100 }, { p: 'opp', l: '关联商机', w: 150 }, { p: 'type', l: '活动类型', w: 90, tag: { 电话: 'primary', 拜访: 'success', 会议: 'warning', 微信: 'info', 演示: 'danger' } }, { p: 'time', l: '跟进时间', w: 150 }, { p: 'content', l: '跟进内容', w: 280 }, { p: 'result', l: '跟进结果', w: 100 }, { p: 'next', l: '下次跟进', w: 150 }],
    rows: [
      { no: 'GJ-20261102-001', customer: '南京某某科技有限公司', contact: '陈总监', opp: 'SJ-202609-0012', type: '电话', time: '2026-11-02 10:00', content: '产品方案沟通，客户本周内部评审', result: '待反馈', next: '2026-11-05 10:00' },
      { no: 'GJ-20261102-002', customer: '江苏某某集团', contact: '周主任', opp: 'SJ-202610-0018', type: '拜访', time: '2026-11-02 14:30', content: '商务拜访，讨论集团协议客户平台', result: '需求明确', next: '2026-11-08 09:00' },
      { no: 'GJ-20261101-006', customer: '安徽某某连锁有限公司', contact: '李店长', opp: 'SJ-202610-0026', type: '微信', time: '2026-11-01 16:20', content: '报价反馈沟通', result: '已联系', next: '2026-11-03 09:00' },
      { no: 'GJ-20261031-003', customer: '苏州某某汽配有限公司', contact: '黄工', opp: 'SJ-202609-0010', type: '演示', time: '2026-10-31 15:00', content: '渠道订货平台演示', result: '需求明确', next: '2026-11-06 14:00' } ] },
  delivery: { title: '交付管理', crumbs: ['交付管理', '项目列表'], unit: '个', total: 74, stats: [['项目总数', '74'], ['实施中', '31', 'ok'], ['延期预警', '4', 'danger'], ['待验收', '6', 'warn']],
    filters: [{ k: 'kw', label: '搜索项目', ph: '项目编号 / 名称 / 客户' }, { k: 'status', label: '项目状态', opts: ['未开始', '实施中', '已延期', '已完成'] }],
    ops: ['新建项目', '导出'],
    cols: [{ p: 'no', l: '项目编号', w: 130, link: true }, { p: 'customer', l: '客户名称', w: 210, link: 'cust' }, { p: 'name', l: '项目名称', w: 200 }, { p: 'contract', l: '合同', w: 140 }, { p: 'pm', l: '项目经理', w: 90 }, { p: 'start', l: '计划开始', w: 110 }, { p: 'endd', l: '计划完成', w: 110 }, { p: 'progress', l: '进度', w: 160, progress: true }, { p: 'status', l: '项目状态', w: 100, tag: { 未开始: 'info', 实施中: 'primary', 已延期: 'danger', 已完成: 'success' } }, { p: 'accept', l: '验收状态', w: 100 }],
    rows: [
      { no: 'XM-202611-0002', customer: '南京某某科技有限公司', name: 'ERP 实施项目', contract: 'HT-202611-0003', pm: '孙工', start: '2026-10-22', endd: '2026-12-10', progress: 55, status: '实施中', accept: '阶段验收中' },
      { no: 'XM-202608-0004', customer: '江苏某某集团', name: '协议客户平台建设', contract: 'HT-202608-0012', pm: '钱工', start: '2026-08-20', endd: '2026-11-15', progress: 82, status: '已延期', accept: '待验收' },
      { no: 'XM-202607-0002', customer: '杭州某某酒店管理有限公司', name: '年度服务交付', contract: 'HT-202607-0004', pm: '孙工', start: '2026-07-08', endd: '2026-08-30', progress: 100, status: '已完成', accept: '已验收' } ] },
  service: { title: '服务管理', crumbs: ['服务管理', '服务工单'], unit: '单', total: 612, stats: [['工单总数', '612'], ['待受理', '9', 'warn'], ['SLA 即将超时', '3', 'danger'], ['平均满意度', '4.7 / 5', 'ok']],
    filters: [{ k: 'kw', label: '搜索工单', ph: '工单编号 / 客户 / 描述' }, { k: 'status', label: '当前状态', opts: ['待受理', '待分派', '处理中', '待客户确认', '已解决', '已关闭'] }, { k: 'level', label: '问题等级', opts: ['紧急', '高', '中', '低'] }],
    ops: ['新建工单', '导出'],
    cols: [{ p: 'no', l: '工单编号', w: 140, link: true }, { p: 'customer', l: '客户名称', w: 210, link: 'cust' }, { p: 'type', l: '工单类型', w: 100 }, { p: 'level', l: '问题等级', w: 90, tag: { 紧急: 'danger', 高: 'warning', 中: 'primary', 低: 'info' } }, { p: 'desc', l: '问题描述', w: 260 }, { p: 'time', l: '提交时间', w: 150 }, { p: 'handler', l: '处理人', w: 80 }, { p: 'status', l: '当前状态', w: 110, tag: { 待受理: 'info', 处理中: 'primary', 待客户确认: 'warning', 已解决: 'success', 已关闭: 'info' } }, { p: 'sla', l: 'SLA 剩余', w: 100 }, { p: 'sat', l: '满意度', w: 80 }],
    rows: [
      { no: 'GD-202611-0007', customer: '江苏某某集团', type: '客户投诉', level: '紧急', desc: '协议客户报表导出失败，影响月结', time: '2026-11-02 08:20', handler: '客服-小林', status: '处理中', sla: '1小时20分', sat: '-' },
      { no: 'GD-202611-0005', customer: '南京某某科技有限公司', type: '服务请求', level: '中', desc: '申请新增 5 个用户账号', time: '2026-11-01 15:30', handler: '客服-小陈', status: '待客户确认', sla: '-', sat: '-' },
      { no: 'GD-202610-0042', customer: '苏州某某汽配有限公司', type: '故障报修', level: '高', desc: '移动端无法同步订单数据', time: '2026-10-30 11:05', handler: '技术-黄工', status: '已解决', sla: '-', sat: '5' } ] },
  analytics: { title: '数据分析', crumbs: ['数据分析', '经营报表'], unit: '张', total: 9, stats: [['销售额（按合同签署金额）', '¥286万'], ['目标完成率', '78.6%', 'ok'], ['赢单率', '31.4%'], ['平均成交周期', '47 天']],
    filters: [{ k: 'kw', label: '搜索报表', ph: '报表名称' }, { k: 'role', label: '适用角色', opts: ['老板', '经理', '销售', '财务', '客服'] }],
    ops: ['新建看板', '导出'],
    cols: [{ p: 'name', l: '报表名称', w: 180, link: true }, { p: 'metric', l: '核心指标', w: 360 }, { p: 'caliber', l: '统计口径', w: 300 }, { p: 'role', l: '适用角色', w: 100 }, { p: 'upd', l: '更新时间', w: 150 }],
    rows: [
      { name: '销售总览', metric: '销售额、目标完成率、赢单率、平均成交周期', caliber: '销售额 = 已审批合同签署金额（不含税）', role: '老板', upd: '2026-11-02 06:00' },
      { name: '线索分析', metric: '线索量、来源分布、有效率、转化率', caliber: '转化率 = 已转化线索 / 当期新增线索', role: '经理', upd: '2026-11-02 06:00' },
      { name: '回款分析', metric: '应收金额、已收金额、逾期金额、回款率', caliber: '已收 = 财务已确认到账金额', role: '财务', upd: '2026-11-02 06:00' },
      { name: '服务分析', metric: '工单数量、处理时长、超时率、满意度', caliber: '超时率 = 超出 SLA 工单 / 已处理工单', role: '客服', upd: '2026-11-02 06:00' } ] },
  system: { title: '系统管理', crumbs: ['系统管理', '用户管理'], unit: '人', total: 86, stats: [['用户总数', '86'], ['在线', '23', 'ok'], ['已停用', '5', 'warn'], ['角色数', '9']],
    filters: [{ k: 'kw', label: '搜索用户', ph: '姓名 / 账号' }, { k: 'role', label: '角色', opts: ['系统管理员', '销售总监', '销售经理', '销售人员', '财务人员', '客服人员'] }, { k: 'status', label: '状态', opts: ['启用', '停用'] }],
    ops: ['新增用户', '重置密码', '导入'],
    cols: [{ p: 'acc', l: '账号', w: 130 }, { p: 'name', l: '姓名', w: 90, link: true }, { p: 'dept', l: '所属部门', w: 140 }, { p: 'role', l: '角色', w: 110 }, { p: 'scope', l: '数据权限', w: 150 }, { p: 'last', l: '最近登录', w: 150 }, { p: 'status', l: '状态', w: 90, tag: { 启用: 'success', 停用: 'info' } }],
    rows: [
      { acc: 'zhangsan', name: '张三', dept: '华东销售一部', role: '销售经理', scope: '本部门及下属', last: '2026-11-02 08:31', status: '启用' },
      { acc: 'wangwu', name: '王五', dept: '华东销售一部', role: '销售人员', scope: '仅本人', last: '2026-11-02 08:12', status: '启用' },
      { acc: 'zhouzj', name: '周总监', dept: '华东销售中心', role: '销售总监', scope: '所管辖部门', last: '2026-11-01 18:40', status: '启用' },
      { acc: 'wangfang', name: '王芳', dept: '财务部', role: '财务人员', scope: '合同/回款（只读跟进）', last: '2026-11-02 09:01', status: '启用' } ] },
  quotes: { title: '报价管理', crumbs: ['报价管理', '报价列表'], unit: '份', total: 521, stats: [['报价总数', '521'], ['审批中', '3', 'warn'], ['已发送客户', '64', 'ok'], ['即将过期', '5', 'danger']],
    filters: [{ k: 'kw', label: '搜索报价', ph: '报价编号 / 客户 / 商机' }, { k: 'appr', label: '审批状态', opts: ['草稿', '审批中', '已通过', '已驳回'] }],
    ops: ['新增报价', '导出'],
    cols: [{ p: 'no', l: '报价编号', w: 150, link: 'quote' }, { p: 'customer', l: '客户名称', w: 210, link: 'cust' }, { p: 'opp', l: '关联商机', w: 150 }, { p: 'amount', l: '报价金额（含税）', w: 140, money: true }, { p: 'disc', l: '折扣金额', w: 110, money: true }, { p: 'date', l: '报价日期', w: 110 }, { p: 'valid', l: '有效期至', w: 110 }, { p: 'owner', l: '负责人', w: 80 }, { p: 'appr', l: '审批状态', w: 100, tag: { 草稿: 'info', 审批中: 'warning', 已通过: 'success', 已驳回: 'danger' } }, { p: 'ver', l: '版本', w: 70 }],
    rows: [
      { no: 'BJ-202611-0008', customer: '南京某某科技有限公司', opp: 'SJ-202609-0012', amount: 334977.2, disc: 25360, date: '2026-11-02', valid: '2026-12-02', owner: '张三', appr: '审批中', ver: 'V3' },
      { no: 'BJ-202610-0019', customer: '合肥某某餐饮连锁有限公司', opp: 'SJ-202609-0006', amount: 260000, disc: 35000, date: '2026-10-30', valid: '2026-11-30', owner: '张三', appr: '审批中', ver: 'V2' },
      { no: 'BJ-202610-0011', customer: '南京某某科技有限公司', opp: 'SJ-202608-0004', amount: 100000, disc: 0, date: '2026-10-08', valid: '2026-11-08', owner: '张三', appr: '已通过', ver: 'V1' },
      { no: 'BJ-202610-0006', customer: '苏州某某汽配有限公司', opp: 'SJ-202609-0010', amount: 420000, disc: 18000, date: '2026-10-05', valid: '2026-11-05', owner: '李四', appr: '已通过', ver: 'V2' } ] },
};
