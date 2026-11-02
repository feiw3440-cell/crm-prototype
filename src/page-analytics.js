/* ===== 第 6 阶段：数据分析（报表列表 /analytics + 报表详情 /analytics/:id） ===== */
const AN_REPORTS = [
  { id: 'overview', name: '销售总览', icon: 'TrendCharts', metric: '销售额、目标完成率、赢单率、平均成交周期', text: '销售额口径：已签署合同金额（履约中/生效/已完成/已到期）', who: '老板/管理层' },
  { id: 'funnel', name: '销售漏斗', icon: 'Filter', metric: '各阶段商机数量与预计金额', text: '按商机当前阶段汇总；金额为预计成交金额（不含税）', who: '销售经理' },
  { id: 'target', name: '业绩目标达成', icon: 'Aim', metric: '月度合同签署金额 vs 目标与达成率', text: '销售额口径：已签署合同金额（示例目标 60 万/月）', who: '管理层' },
  { id: 'opps', name: '商机分析', icon: 'Trophy', metric: '商机金额、各阶段金额、赢单率、输单原因', text: '统计「赢单 / 输单」商机并按阶段汇总金额', who: '销售经理' },
  { id: 'staff', name: '销售人员分析', icon: 'User', metric: '个人业绩、跟进次数、商机转化、排名', text: '个人业绩 = 名下已签署合同金额，按业绩倒序排名', who: '销售经理' },
  { id: 'customer', name: '客户分析', icon: 'OfficeBuilding', metric: '客户数量、客户等级、客户增长、流失率', text: '按客户档案的行业与等级统计，客户增长按创建时间', who: '管理层' },
  { id: 'lead', name: '线索分析', icon: 'Share', metric: '线索量、来源分布、有效率、转化率', text: '有效率 =（线索量 − 无效）/ 线索量', who: '市场/经理' },
  { id: 'contract', name: '合同分析', icon: 'Tickets', metric: '合同金额、签署数量、到期数量、履约情况', text: '按签署日期统计合同金额与状态分布', who: '销售经理/法务' },
  { id: 'payment', name: '回款分析', icon: 'Coin', metric: '应收金额、已收金额、逾期金额、回款率', text: '已回款 = 财务已确认到账金额；逾期 = 计划日期已过未结清', who: '财务' },
  { id: 'activity', name: '活动效率', icon: 'Calendar', metric: '跟进方式分布与完成率', text: '统计跟进活动按方式 / 状态分布', who: '经理' },
  { id: 'ticket', name: '服务分析', icon: 'Headset', metric: '工单数量、处理时长、超时率、满意度', text: '超时 = 未在紧急 2h/高 4h/中 24h/低 48h SLA 内解决或关闭', who: '客服' },
  { id: 'delivery', name: '交付分析', icon: 'Box', metric: '项目数量、完成率、延期率、验收通过率', text: '延期 = 计划结束日期已过仍未完成；验收状态由里程碑推导', who: '交付/管理层' },
];
const AN_SIGNED = ['生效', '履约中', '已完成', '已到期']; /* 销售额统计口径：已签署状态 */
const AN_PERIODS = {
  m3: ['2026-09', '2026-10', '2026-11'], m6: ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'],
  y: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'],
};
const AN_TARGET_MONTH = 600000; // 示例目标：60 万/月
const AN_PAL = () => {
  const p = (theme.value, cssVar('--el-color-primary')) || '#2f9bff';
  const d2 = (theme.value, cssVar('--el-color-primary-dark-2')) || '#247acc';
  return [p, mixHex(p, '#000000', .42), mixHex(p, '#ffffff', .34), d2, mixHex(p, '#000000', .6), mixHex(p, '#ffffff', .58)];
};
const anBaseAxis = () => ({ axisLine: { lineStyle: { color: cssVar('--line') || '#dfe9f5' } }, axisLabel: { color: cssVar('--sub') || '#67768f', fontSize: 11 }, splitLine: { lineStyle: { color: cssVar('--line') || '#dfe9f5' } } });

/* ---------- 报表列表页 ---------- */
const AnalyticsPage = {
  components: { PageHead },
  setup() {
    const kw = ref('');
    const cards = computed(() => AN_REPORTS.filter(r => !kw.value.trim() || r.name.includes(kw.value.trim()) || r.metric.includes(kw.value.trim())));
    const stats = computed(() => {
      const c = store.customers.filter(x => x.owner);
      return [
        ['可用报表', String(AN_REPORTS.length), 'ok'], ['商机数', String(store.opps.length), ''],
        ['在护客户', String(c.length), ''], ['服务工单', String(store.ext.tickets.length), 'warn'],
      ];
    });
    return { kw, cards, stats, store, wan, AN_REPORTS };
  },
  template: `<div>
    <page-head :crumbs="['数据分析','经营报表']" title="经营报表" :total="'共 '+AN_REPORTS.length+' 张报表'">
      <el-button icon="Download" @click="$msg.info('示例：导出全部报表（Excel）')">导出</el-button>
    </page-head>
    <div class="stat-row" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card" v-for="s in stats" :key="s[0]" :class="s[2]"><span class="lb">{{ s[0] }}</span><span class="vl">{{ s[1] }}</span><span class="ft">数据更新：2026-11-02 06:00</span></div>
    </div>
    <div class="card query" style="display:flex;align-items:center">
      <el-input v-model="kw" placeholder="搜索报表名称 / 核心指标" prefix-icon="Search" clearable style="width:280px"/>
      <span class="muted" style="margin-left:14px;font-size:13px">点击卡片进入报表详情，图表与明细随筛选联动</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px">
      <div class="card card-pad" v-for="r in cards" :key="r.id" style="cursor:pointer;display:flex;flex-direction:column;gap:6px;min-height:150px" @click="$go('/analytics/'+r.id)">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="width:40px;height:40px;border-radius:10px;background:var(--el-color-primary-light-9);color:var(--el-color-primary);display:flex;align-items:center;justify-content:center"><el-icon :size="20"><component :is="r.icon"/></el-icon></span>
          <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:15px">{{ r.name }}</div><div class="muted" style="font-size:12px">{{ r.who }}</div></div>
        </div>
        <div style="font-size:13px;color:var(--text);line-height:1.5">{{ r.metric }}</div>
        <div class="muted" style="font-size:12px;flex:1">{{ r.text }}</div>
        <div style="display:flex;align-items:center"><span class="link" style="font-size:13px">查看报表 ›</span><span class="muted" style="margin-left:auto;font-size:12px">每日 06:00 更新</span></div>
      </div>
      <el-empty v-if="!cards.length" description="没有匹配的报表" style="grid-column:1/-1"/>
    </div>
  </div>`,
};

/* ---------- 报表详情页 ---------- */
const AnalyticsDetailPage = {
  components: { PageHead, EChart },
  props: { id: String },
  setup(props) {
    const rep = computed(() => AN_REPORTS.find(r => r.id === props.id));
    const period = ref('m6'), owner = ref('');
    const SIGNED = ['生效', '履约中', '已完成', '已到期'];
    /* 5.14 统一筛选项：时间范围、部门、员工、客户类型、客户来源、行业、区域 */
    const dept = ref(''), ctype = ref(''), csrc = ref(''), cind = ref(''), creg = ref('');
    const anDepts = computed(() => store.ext.depts.map(d => d.name));
    const anCtypes = ['企业客户', '个人客户', '渠道客户'];
    const anCsrcs = computed(() => [...new Set(store.customers.map(c => c.source).filter(Boolean))]);
    const anInds = computed(() => [...new Set(store.customers.map(c => c.industry).filter(Boolean))]);
    const anRegs = computed(() => [...new Set(store.customers.map(c => c.region).filter(Boolean))]);
    const anDeptOf = n => { const u = store.ext.users.find(x => x.name === n); return u ? u.dept : ''; };
    const passO = o => (!owner.value || o === owner.value) && (!dept.value || (!!o && anDeptOf(o) === dept.value));
    const passC = n => {
      if (!ctype.value && !csrc.value && !cind.value && !creg.value) return true;
      const c = custByName(String(n || '')); if (!c) return false;
      return (!ctype.value || c.type === ctype.value) && (!csrc.value || c.source === csrc.value) &&
        (!cind.value || c.industry === cind.value) && (!creg.value || c.region === creg.value);
    };
    const clearF = () => { dept.value = ''; ctype.value = ''; csrc.value = ''; cind.value = ''; creg.value = ''; };
    const months = computed(() => AN_PERIODS[period.value] || []);
    const page = ref(1), size = ref(10);
    watch([period, owner, dept, ctype, csrc, cind, creg], () => { page.value = 1; });

    const data = computed(() => {
      const M = months.value, inM = y => M.includes((y || '').slice(0, 7)), owf = owner.value, hasO = !!owf;
      const pal = AN_PAL(), SUB = cssVar('--sub') || '#67768f', axis = anBaseAxis();
      const wanT = n => '¥' + (n / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 1 }) + ' 万';
      /* --- 销售总览 --- */
      if (props.id === 'overview') {
        const cs = store.ext.contracts.filter(c => c.amount > 0 && SIGNED.includes(c.status) && inM(c.signDate) && passO(c.owner) && passC(c.customer));
        const byM = {}; cs.forEach(c => { byM[c.signDate.slice(0, 7)] = (byM[c.signDate.slice(0, 7)] || 0) + c.amount; });
        const mAmt = M.map(m => byM[m] || 0), mTgt = M.map(() => AN_TARGET_MONTH);
        const done = mAmt.reduce((a, b) => a + b, 0), tgt = mTgt.reduce((a, b) => a + b, 0);
        const closes = store.opps.filter(o => o.stage === 'close' && o.result && inM(o.date) && passO(o.owner) && passC(o.customer));
        const wins = closes.filter(o => o.result === '赢单');
        const cycles = wins.map(o => Math.round((new Date(o.date) - new Date(o.created)) / 86400000)).filter(v => v >= 0);
        const avgCyc = cycles.length ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : 0;
        return {
          stats: [['销售额（已签署合同）', wanT(done), 'ok'], ['目标完成率', Math.round(done * 1000 / tgt) / 10 + '%', done >= tgt ? 'ok' : 'warn'],
            ['赢单率', (closes.length ? Math.round(wins.length * 1000 / closes.length) / 10 : 0) + '%', ''], ['平均成交周期', avgCyc + ' 天', '']],
          opt: {
            tooltip: { trigger: 'axis' }, legend: { data: ['合同签署金额', '目标'], textStyle: { color: SUB }, right: 6, top: 0, itemWidth: 14 },
            grid: { left: 8, right: 14, top: 30, bottom: 4, containLabel: true },
            xAxis: { type: 'category', data: M, ...axis }, yAxis: { type: 'value', name: '万元', axisLabel: { color: SUB, fontSize: 11, formatter: v => v / 10000 }, splitLine: axis.splitLine },
            series: [
              { name: '合同签署金额', type: 'bar', barWidth: 18, itemStyle: { color: pal[0] }, data: mAmt.map(v => Math.round(v / 10000 * 10) / 10) },
              { name: '目标', type: 'line', smooth: true, symbol: 'circle', symbolSize: 7, itemStyle: { color: pal[3] }, data: mTgt.map(v => v / 10000) } ],
          },
          note: '注：销售额 = 已签署合同金额（履约中/生效/已完成/已到期状态，签署口径，按月归集）；目标完成率 = 区间销售额 ÷ 区间目标（示例 60 万/月，可在系统管理调整）；赢单率 = 赢单 ÷（赢单 + 输单）；平均成交周期 = 赢单商机「创建 → 赢单」的平均天数。',
          rows: M.map((m, i) => ({ m, amt: mAmt[i], target: mTgt[i], rate: mTgt[i] ? Math.round(mAmt[i] * 1000 / mTgt[i]) / 10 : 0, ok: mAmt[i] >= mTgt[i] })),
          cols: [{ p: 'm', l: '月份', w: 100, fmt: 'tag', tagMap: {} }, { p: 'amt', l: '已签金额', w: 120, fmt: 'money' }, { p: 'target', l: '目标', w: 120, fmt: 'money' },
            { p: 'rate', l: '达成率', w: 140, fmt: 'rate' }],
        };
      }
      /* --- 销售漏斗 --- */
      if (props.id === 'funnel') {
        const xs = store.opps.filter(o => inM(o.date) && passO(o.owner) && passC(o.customer));
        const cnt = STAGES.map(s => xs.filter(o => o.stage === s.key).length);
        const amt = STAGES.map(s => Math.round(xs.filter(o => o.stage === s.key).reduce((x, o) => x + o.amount, 0)));
        const wAmt = STAGES.map(s => xs.filter(o => o.stage === s.key && o.stage !== 'close').reduce((x, o) => x + wAmount(o), 0));
        const custs = new Set(xs.map(o => o.customer));
        const shape = STAGES.map(s => s.funnelWidth);
        const wTotal = wAmt.reduce((a, b) => a + b, 0);
        return {
          stats: [['商机总数', String(xs.length), ''], ['预计总金额', wanT(amt.reduce((a, b) => a + b, 0)), 'ok'], ['加权预测金额（未结束商机）', wanT(wTotal), 'ok'], ['覆盖客户', String(custs.size), '']],
          opt: {
            tooltip: { trigger: 'item', formatter: q => '<b>' + q.name + '</b><br/>商机数量：' + cnt[q.dataIndex] + ' 个<br/>预计金额：' + wanT(amt[q.dataIndex]) + '<br/>加权预测金额：' + wanT(wAmt[q.dataIndex]) + '（= 预计金额 × 赢率，未结束商机计入）' },
            series: [{ type: 'funnel', left: '6%', right: '6%', top: 8, bottom: 8, min: 0, max: 100, minSize: '18%', sort: 'none', gap: 3,
              label: { show: true, position: 'inside', color: '#fff', fontSize: 12, formatter: q => q.name + '  ' + cnt[q.dataIndex] + ' 个 · ' + wanT(amt[q.dataIndex]) },
              data: STAGES.map((s, i) => ({ name: s.name, value: shape[i], itemStyle: { color: mixHex(pal[0], '#000000', .48 * i / 5) } })) }],
          },
          note: '注：漏斗各段宽度仅按 funnelWidth（100%/80%/60%/40%/25%/15%）展示，不代表转化率、也不代表赢率；各阶段默认赢率为初步接触 10%、需求确认 25%、方案沟通 45%、报价谈判 65%、商务审批 85%、赢单 100%、输单 0%（原型假设，待业务确认）；加权预测金额 = ⌊预计金额 × 赢率 / 100⌋（按分计算），仅未结束商机（stage ≠ close）计入预测。数据取预计成交日期在筛选区间内的全部商机。',
          rows: xs.slice().sort((a, b) => b.amount - a.amount).map(o => ({ ...o, wAmt: o.stage !== 'close' ? wAmount(o) : '—' })),
          cols: [{ p: 'no', l: '商机编号', w: 130, fmt: 'mono' }, { p: 'name', l: '商机名称', w: 200, fmt: 'link', to: 'opp' },
            { p: 'customer', l: '客户', w: 190, fmt: 'custName' }, { p: 'stage', l: '阶段', w: 100, fmt: 'tag', tagMap: STAGES.reduce((m, s) => (m[s.name] = 'primary', m), {}) },
            { p: 'amount', l: '预计金额', w: 110, fmt: 'money' }, { p: 'wAmt', l: '加权预测金额', w: 120, fmt: 'money' }, { p: 'owner', l: '负责人', w: 90 }, { p: 'date', l: '预计成交', w: 110 }],
        };
      }
      /* --- 业绩目标达成 --- */
      if (props.id === 'target') {
        const cs = store.ext.contracts.filter(c => inM(c.signDate) && passO(c.owner) && passC(c.customer) && c.amount > 0 && SIGNED.includes(c.status));
        const byM = {}; cs.forEach(c => { byM[c.signDate.slice(0, 7)] = (byM[c.signDate.slice(0, 7)] || 0) + c.amount; });
        const mAmt = M.map(m => byM[m] || 0), mTgt = M.map(() => AN_TARGET_MONTH);
        const done = mAmt.reduce((a, b) => a + b, 0), tgt = mTgt.reduce((a, b) => a + b, 0);
        return {
          stats: [['区间总目标', wanT(tgt), ''], ['已签合同金额', wanT(done), 'ok'], ['达成率', Math.round(done * 1000 / tgt) / 10 + '%', done >= tgt ? 'ok' : 'warn'], ['达标月份', mAmt.filter((v, i) => v >= mTgt[i]).length + ' / ' + M.length, '']],
          opt: {
            tooltip: { trigger: 'axis' }, legend: { data: ['合同签署金额', '目标'], textStyle: { color: SUB }, right: 6, top: 0, itemWidth: 14 },
            grid: { left: 8, right: 14, top: 30, bottom: 4, containLabel: true },
            xAxis: { type: 'category', data: M, ...axis }, yAxis: { type: 'value', name: '万元', axisLabel: { color: SUB, fontSize: 11, formatter: v => v / 10000 }, splitLine: axis.splitLine },
            series: [
              { name: '合同签署金额', type: 'bar', barWidth: 18, itemStyle: { color: pal[0] }, data: mAmt.map(v => Math.round(v / 10000 * 10) / 10) },
              { name: '目标', type: 'line', smooth: true, symbol: 'circle', symbolSize: 7, itemStyle: { color: pal[3] }, data: mTgt.map(v => v / 10000) } ],
          },
          note: '注：销售额 = 已签署合同金额（履约中/生效/已完成/已到期状态）；示例目标 60 万/月，可在系统管理中调整（原型为常量）。',
          rows: M.map((m, i) => ({ m, amt: mAmt[i], target: mTgt[i], rate: mTgt[i] ? Math.round(mAmt[i] * 1000 / mTgt[i]) / 10 : 0, ok: mAmt[i] >= mTgt[i] })),
          cols: [{ p: 'm', l: '月份', w: 100, fmt: 'tag', tagMap: {} }, { p: 'amt', l: '已签金额', w: 120, fmt: 'money' }, { p: 'target', l: '目标', w: 120, fmt: 'money' },
            { p: 'rate', l: '达成率', w: 140, fmt: 'rate' }],
        };
      }
      /* --- 回款分析 --- */
      if (props.id === 'payment') {
        const payMap = {}; store.pay.contracts.forEach(c => { payMap[c.no] = c; });
        const stAmt = s => s === '已回款' ? -1 : 0;
        const recOf = (cno, plan) => {
          const c = payMap[cno];
          const fallback = plan.status === '已回款' ? plan.amount : (plan.status === '部分回款' ? Math.round(plan.amount * 0.5) : 0);
          const p0 = c && (c.plans || []).find(q => q.stage === plan.stage);
          if (!p0) return fallback;
          let s = 0;
          store.pay.records.filter(r => r.contract === cno && r.confirm === '财务已确认').forEach(r => (r.alloc || []).forEach(a => { if (a.plan === p0.id) s += a.amt; }));
          return s;
        };
        const rows0 = []; store.ext.contracts.forEach(c => (c.plans || []).forEach(p => {
          if (!inM(p.date) || !passO(c.owner) || !passC(c.customer)) return; const got = recOf(c.no, p);
          rows0.push({ no: c.no, customer: c.customer, stage: p.stage, date: p.date, amount: p.amount, got,
            status: p.status ? p.status : (got >= p.amount ? '已回款' : got > 0 ? '部分回款' : '未回款'), plan: p.id || c.no + '#' + p.stage });
        }));
        const perM = {}, gotM = {};
        rows0.forEach(r => { perM[r.date.slice(0, 7)] = (perM[r.date.slice(0, 7)] || 0) + r.amount; gotM[r.date.slice(0, 7)] = (gotM[r.date.slice(0, 7)] || 0) + r.got; });
        const planSum = rows0.reduce((a, r) => a + r.amount, 0), gotSum = rows0.reduce((a, r) => a + r.got, 0);
        const overdue = rows0.filter(r => r.date < TODAY && r.got < r.amount), overdueAmt = overdue.reduce((a, r) => a + (r.amount - r.got), 0);
        return {
          stats: [['应收金额（区间）', wanT(planSum), ''], ['已收金额（已确认）', wanT(gotSum), 'ok'], ['回款率', (planSum ? Math.round(gotSum * 1000 / planSum) / 10 : 0) + '%', gotSum >= planSum ? 'ok' : 'warn'], ['逾期金额（' + overdue.length + ' 期）', wanT(overdueAmt), overdueAmt ? 'danger' : 'ok']],
          opt: {
            tooltip: { trigger: 'axis' }, legend: { data: ['计划回款', '已回款'], textStyle: { color: SUB }, right: 6, top: 0 },
            grid: { left: 8, right: 14, top: 30, bottom: 4, containLabel: true },
            xAxis: { type: 'category', data: M, ...axis }, yAxis: { type: 'value', name: '万元', axisLabel: { color: SUB, fontSize: 11, formatter: v => v / 10000 }, splitLine: axis.splitLine },
            series: [
              { name: '计划回款', type: 'bar', barWidth: 18, itemStyle: { color: mixHex(pal[0], '#ffffff', .35) }, data: M.map(m => Math.round((perM[m] || 0) / 10000 * 10) / 10) },
              { name: '已回款', type: 'line', smooth: true, symbol: 'circle', symbolSize: 7, itemStyle: { color: pal[0] }, areaStyle: { color: mixHex(pal[0], '#ffffff', .75) }, data: M.map(m => Math.round((gotM[m] || 0) / 10000 * 10) / 10) } ],
          },
          note: '注：应收金额 = 区间回款计划金额；已收金额 = 财务已确认到账金额（按核销匹配到计划期次），不含待核实/预收款；逾期金额与份数 = 计划日期早于今天且未结清的计划金额 − 已回款；根据合同回款计划的状态字段对未登记合同按状态折算。',
          rows: rows0.sort((a, b) => (a.date < b.date ? 1 : -1)),
          cols: [{ p: 'no', l: '合同编号', w: 130, fmt: 'link', to: 'contract' }, { p: 'customer', l: '客户', w: 180, fmt: 'custName' }, { p: 'stage', l: '计划期次', w: 100 },
            { p: 'date', l: '计划日期', w: 105 }, { p: 'amount', l: '计划金额', w: 110, fmt: 'money' }, { p: 'got', l: '已回款', w: 110, fmt: 'money' },
            { p: 'status', l: '状态', w: 100, fmt: 'tag', tagMap: { 已回款: 'success', 部分回款: 'warning', 未回款: 'info' } }],
        };
      }
      /* --- 客户分析 --- */
      if (props.id === 'customer') {
        const xs = store.customers.filter(c => inM(c.created) && passO(c.owner) && passC(c.name));
        const byInd = {}, byLvl = {};
        xs.forEach(c => { byInd[c.industry] = (byInd[c.industry] || 0) + 1; byLvl[c.level] = (byLvl[c.level] || 0) + 1; });
        const allLvl = ['战略客户', '重点客户', '普通客户', '潜在客户'];
        const amt = xs.reduce((a, c) => a + (c.total || 0), 0);
        return {
          stats: [['客户数量', String(xs.length), ''], ['流失率', Math.round(xs.filter(c => c.status === '流失').length * 1000 / Math.max(1, xs.length)) / 10 + '%', xs.some(c => c.status === '流失') ? 'danger' : 'ok'], ['累计成交额', wanT(amt), 'ok'], ['公海（无负责人）', String(xs.filter(c => !c.owner).length), 'warn']],
          opt: {
            tooltip: { trigger: 'item', formatter: q => '<b>' + q.name + '</b><br/>客户数：' + q.value + ' 家（' + q.percent + '%）' },
            legend: { bottom: 0, textStyle: { color: SUB }, itemWidth: 12, type: 'scroll' },
            series: [{ type: 'pie', center: ['50%', '44%'], radius: ['34%', '66%'], label: { color: SUB, fontSize: 11, formatter: '{b} {d}%' }, itemStyle: { borderColor: cssVar('--card') || '#fff', borderWidth: 2 },
              data: Object.keys(byInd).sort((a, b) => byInd[b] - byInd[a]).map((k, i) => ({ name: k, value: byInd[k], itemStyle: { color: pal[i % pal.length] } })) }],
          },
          opt2: {
            tooltip: { trigger: 'axis' }, grid: { left: 6, right: 10, top: 14, bottom: 0, containLabel: true },
            xAxis: { type: 'category', data: allLvl, ...axis }, yAxis: { type: 'value', ...axis },
            series: [{ type: 'bar', barWidth: 26, label: { show: true, position: 'top', color: SUB, fontSize: 11 },
              itemStyle: { color: q => [pal[3], pal[0], pal[5], pal[2]][q.dataIndex % 4] }, data: allLvl.map(k => byLvl[k] || 0) }],
          },
          opt2Title: '客户等级分布',
          note: '注：客户增长 = 筛选区间内新建档客户数（本表按创建日期筛选）；等级结构见下方「客户等级分布」；流失率 = 状态为「流失」的客户 ÷ 区间客户总数；金额为档案中的累计成交额。',
          rows: xs.slice().sort((a, b) => (b.total || 0) - (a.total || 0)),
          cols: [{ p: 'no', l: '客户编号', w: 130, fmt: 'mono' }, { p: 'name', l: '客户名称', w: 200, fmt: 'custName' }, { p: 'industry', l: '行业', w: 130 },
            { p: 'level', l: '等级', w: 90, fmt: 'tag', tagMap: { 战略客户: 'warning', 重点客户: 'primary', 普通客户: 'info', 潜在客户: 'success' } },
            { p: 'owner', l: '负责人', w: 90, fmt: 'owner' }, { p: 'total', l: '累计成交', w: 110, fmt: 'money' }, { p: 'created', l: '创建日期', w: 105 }],
        };
      }
      /* --- 线索来源转化 --- */
      if (props.id === 'lead') {
        const xs = store.leads.filter(l => inM(l.created) && passO(l.owner) && passC(l.company));
        const bySrc = {}; xs.forEach(l => { bySrc[l.source] = bySrc[l.source] || { n: 0, cv: 0 }; bySrc[l.source].n++; if (l.status === '已转化') bySrc[l.source].cv++; });
        const srcs = Object.keys(bySrc);
        const cvSum = xs.filter(l => l.status === '已转化').length;
        const eff = xs.length - xs.filter(l => l.status === '无效').length;
        return {
          stats: [['线索量', String(xs.length), ''], ['有效率', Math.round(eff * 1000 / Math.max(1, xs.length)) / 10 + '%', 'ok'], ['整体转化率', (xs.length ? Math.round(cvSum * 1000 / xs.length) / 10 : 0) + '%', cvSum / Math.max(1, xs.length) >= .3 ? 'ok' : 'warn'], ['未分配（公海）', String(xs.filter(l => !l.owner).length), 'warn']],
          opt: {
            tooltip: { trigger: 'axis' }, legend: { data: ['线索数', '转化率'], textStyle: { color: SUB }, right: 6, top: 0 },
            grid: { left: 8, right: 14, top: 30, bottom: 4, containLabel: true },
            xAxis: { type: 'category', data: srcs, ...axis },
            yAxis: [{ type: 'value', name: '线索数', ...axis }, { type: 'value', name: '转化率 %', axisLabel: { color: SUB, fontSize: 11 }, splitLine: { show: false } }],
            series: [
              { name: '线索数', type: 'bar', barWidth: 26, itemStyle: { color: pal[0] }, data: srcs.map(s => bySrc[s].n) },
              { name: '转化率', type: 'line', yAxisIndex: 1, symbol: 'circle', symbolSize: 7, itemStyle: { color: pal[3] }, data: srcs.map(s => bySrc[s].n ? Math.round(bySrc[s].cv * 1000 / bySrc[s].n) / 10 : 0) } ],
          },
          note: '注：线索量 = 区间内新建档线索（按创建时间筛选）；有效率 =（线索量 − 无效线索）÷ 线索量；转化率 = 已转化线索 / 该来源线索总数；来源枚举为 官网 / 广告 / 活动 / 转介绍 / 渠道（可在系统管理·字典管理配置）。',
          rows: xs.slice().sort((a, b) => (a.created < b.created ? 1 : -1)),
          cols: [{ p: 'no', l: '线索编号', w: 130, fmt: 'mono' }, { p: 'company', l: '公司', w: 200 }, { p: 'source', l: '来源', w: 90, fmt: 'tag', tagMap: {} },
            { p: 'status', l: '状态', w: 90, fmt: 'tag', tagMap: { 新建: 'info', 跟进中: 'primary', 已转化: 'success', 无效: 'danger' } },
            { p: 'amount', l: '预计金额', w: 110, fmt: 'money' }, { p: 'owner', l: '负责人', w: 90, fmt: 'owner' }, { p: 'created', l: '创建时间', w: 140 }],
        };
      }
      /* --- 商机赢输单分析 --- */
      if (props.id === 'opps') {
        const xs = store.opps.filter(o => o.stage === 'close' && inM(o.date) && passO(o.owner) && passC(o.customer));
        const win = xs.filter(o => o.result === '赢单'), lose = xs.filter(o => o.result && o.result !== '赢单');
        const byReason = {}; lose.forEach(o => { const r = o.loseReason || '未填写'; byReason[r] = (byReason[r] || 0) + 1; });
        const winAmt = win.reduce((a, o) => a + o.amount, 0), loseAmt = lose.reduce((a, o) => a + o.amount, 0);
        const stalledN = store.opps.filter(o => inM(o.date) && passO(o.owner) && passC(o.customer) && o.flags && o.flags.stalled).length;
        return {
          stats: [['商机总金额', wanT(winAmt + loseAmt), 'ok'], ['赢单率（赢单 ' + win.length + ' / 输单 ' + lose.length + '）', (xs.length ? Math.round(win.length * 1000 / xs.length) / 10 : 0) + '%', ''], ['停滞商机（自动提醒）', String(stalledN), stalledN ? 'danger' : 'ok'], ['输单金额', wanT(loseAmt), 'danger']],
          opt: {
            tooltip: { trigger: 'item', formatter: q => '<b>' + q.name + '</b><br/>' + q.value + ' 个（' + q.percent + '%）' },
            legend: { bottom: 0, textStyle: { color: SUB } },
            series: [{ type: 'pie', center: ['50%', '44%'], radius: ['36%', '64%'], label: { color: SUB, fontSize: 11, formatter: '{b} {d}%' }, itemStyle: { borderColor: cssVar('--card') || '#fff', borderWidth: 2 },
              data: [{ name: '赢单', value: win.length, itemStyle: { color: pal[0] } }, { name: '输单', value: lose.length, itemStyle: { color: mixHex(pal[0], '#000000', .45) } }].filter(x => x.value) }],
          },
          opt2: {
            tooltip: { trigger: 'axis' }, grid: { left: 6, right: 10, top: 14, bottom: 0, containLabel: true },
            xAxis: { type: 'category', data: Object.keys(byReason), axisLabel: { color: SUB, fontSize: 11, rotate: 14 } },
            yAxis: { type: 'value', ...axis },
            series: [{ type: 'bar', barWidth: 26, itemStyle: { color: mixHex(pal[0], '#000000', .42) }, label: { show: true, position: 'top', color: SUB, fontSize: 11 }, data: Object.values(byReason) }],
          },
          opt2Title: '输单原因分布',
          note: '注：赢单率 = 赢单 /（赢单 + 输单）；各阶段金额见「销售漏斗」报表；输单原因来自商机关闭时填写的信息；停滞商机在系统管理中设置停滞提醒天数，超期自动提醒（第十二章）。',
          rows: xs.slice().sort((a, b) => (a.date < b.date ? 1 : -1)),
          cols: [{ p: 'no', l: '商机编号', w: 130, fmt: 'mono' }, { p: 'name', l: '商机名称', w: 200, fmt: 'link', to: 'opp' },
            { p: 'customer', l: '客户', w: 180, fmt: 'custName' }, { p: 'result', l: '结果', w: 80, fmt: 'tag', tagMap: { 赢单: 'success', 输单: 'danger' } },
            { p: 'loseReason', l: '输单原因', w: 100, fmt: 'tag', tagMap: {} }, { p: 'amount', l: '金额', w: 110, fmt: 'money' }, { p: 'owner', l: '负责人', w: 90 }, { p: 'date', l: '关闭日期', w: 105 }],
        };
      }
      /* --- 活动效率 --- */
      if (props.id === 'activity') {
        const xs = store.ext.activities.filter(a => inM(a.time) && passO(a.owner) && passC(a.customer));
        const TYPES = ['电话', '微信', '拜访', '会议', '邮件'];
        const done = xs.filter(a => a.status === '已完成');
        const byT = t => TYPES.map(v => xs.filter(a => a.type === v && a.status === t).length);
        return {
          stats: [['活动总数', String(xs.length), ''], ['已完成', String(done.length), 'ok'], ['完成率', (xs.length ? Math.round(done.length * 1000 / xs.length) / 10 : 0) + '%', done.length / Math.max(1, xs.length) >= .7 ? 'ok' : 'warn'], ['计划中', String(xs.filter(a => a.status === '计划中').length), '']],
          opt: {
            tooltip: { trigger: 'axis' }, legend: { data: ['已完成', '计划中', '已取消'], textStyle: { color: SUB }, right: 6, top: 0 },
            grid: { left: 8, right: 14, top: 30, bottom: 4, containLabel: true },
            xAxis: { type: 'category', data: TYPES, ...axis }, yAxis: { type: 'value', ...axis },
            series: [{ name: '已完成', type: 'bar', stack: 's', barWidth: 24, itemStyle: { color: pal[0] }, data: byT('已完成') },
              { name: '已取消', type: 'bar', stack: 's', itemStyle: { color: mixHex(pal[0], '#000000', .3) }, data: byT('已取消') },
              { name: '计划中', type: 'bar', stack: 's', itemStyle: { color: mixHex(pal[0], '#ffffff', .45) }, data: byT('计划中') }],
          },
          note: '注：按活动类型统计完成/计划/取消分布；拜访类活动含外勤打卡数据。',
          rows: xs.slice().sort((a, b) => (a.time < b.time ? 1 : -1)),
          cols: [{ p: 'time', l: '时间', w: 140 }, { p: 'customer', l: '客户', w: 180, fmt: 'custName' }, { p: 'type', l: '方式', w: 80, fmt: 'tag', tagMap: { 电话: 'primary', 拜访: 'success', 会议: 'warning', 微信: 'info', 邮件: '' } },
            { p: 'status', l: '状态', w: 80, fmt: 'tag', tagMap: { 已完成: 'success', 计划中: 'warning', 已取消: 'info' } },
            { p: 'owner', l: '负责人', w: 90 }, { p: 'feedback', l: '反馈', w: 130 }],
        };
      }
      /* --- 服务工单分析 --- */
      if (props.id === 'ticket') {
        const ownO = c => { const cu = custByName(String(c)); return passC(String(c)) && passO(cu ? cu.owner : ''); };
        const xs = store.ext.tickets.filter(t => inM(t.created) && ownO(t.customer));
        const TYPES = ['故障报修', '服务请求', '咨询', '投诉'];
        const STS = ['待受理', '待分派', '处理中', '待客户确认', '已解决', '已关闭', '已退回'];
        const SLA_H = { 紧急: 2, 高: 4, 中: 24, 低: 48 };
        const nowT = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const solved = xs.filter(t => t.solvedTime && t.created);
        const durH = t => Math.max(1, Math.round((new Date(t.solvedTime) - new Date(t.created)) / 3600000));
        const avgDur = solved.length ? Math.round(solved.reduce((a, t) => a + durH(t), 0) / solved.length) : 0;
        const overN = solved.filter(t => (new Date(t.solvedTime) - new Date(t.created)) > (SLA_H[t.priority] || 24) * 3600000).length + xs.filter(t => ['待受理', '待分派', '处理中', '待客户确认'].includes(t.status) && t.slaDeadline && t.slaDeadline < nowT).length;
        const overRate = xs.length ? Math.round(overN * 1000 / xs.length) / 10 : 0;
        const rated = xs.filter(t => t.rating);
        const avgSat = rated.length ? Math.round(rated.reduce((a, t) => a + t.rating, 0) * 10 / rated.length) / 10 : 0;
        const byT2 = v => TYPES.map(x => xs.filter(t => t.type === x && t.status === v).length);
        return {
          stats: [['工单数量', String(xs.length), ''], ['平均处理时长', avgDur + ' 小时', ''], ['超时率（' + overN + ' 单）', overRate + '%', overRate > 20 ? 'danger' : 'ok'], ['平均满意度', avgSat ? avgSat + ' / 5' : '—', avgSat >= 4 ? 'ok' : 'warn']],
          opt: {
            tooltip: { trigger: 'item', formatter: q => '<b>' + q.name + '</b><br/>' + q.value + ' 单（' + q.percent + '%）' },
            legend: { bottom: 0, textStyle: { color: SUB } },
            series: [{ type: 'pie', center: ['50%', '44%'], radius: ['36%', '64%'], label: { color: SUB, fontSize: 11, formatter: '{b} {d}%' }, itemStyle: { borderColor: cssVar('--card') || '#fff', borderWidth: 2 },
              data: TYPES.map((k, i) => ({ name: k, value: xs.filter(t => t.type === k).length, itemStyle: { color: pal[i % pal.length] } })).filter(x => x.value) }],
          },
          opt2: {
            tooltip: { trigger: 'axis' }, legend: { data: STS, textStyle: { color: SUB }, right: 6, top: 0 },
            grid: { left: 6, right: 10, top: 30, bottom: 0, containLabel: true },
            xAxis: { type: 'category', data: TYPES, axisLabel: { color: SUB, fontSize: 11, rotate: 12 } }, yAxis: { type: 'value', ...axis },
            series: STS.map((s, i) => ({ name: s, type: 'bar', stack: 's', itemStyle: { color: [mixHex(pal[0], '#000000', .5), mixHex(pal[0], '#ffffff', .65), pal[0], mixHex(pal[0], '#000000', .25), mixHex(pal[0], '#ffffff', .3), mixHex(pal[0], '#000000', .1), '#cc7a7a'][i] }, data: byT2(s) })),
          },
          opt2Title: '各类型工单状态分布',
          note: '注：处理时长 = 提交 → 解决的平均时长（样本：已解决/已关闭工单）；超时 = 未在紧急 2h / 高 4h / 中 24h / 低 48h SLA 内解决或关闭（含仍处理中且已过 SLA 时限）；满意度 = 客户评分（1–5 分）；待受理 / 待分派 / 处理中 / 已退回视为待处理。',
          rows: xs.slice().sort((a, b) => (a.created < b.created ? 1 : -1)),
          cols: [{ p: 'no', l: '工单编号', w: 130, fmt: 'mono' }, { p: 'customer', l: '客户', w: 170, fmt: 'custName' }, { p: 'type', l: '类型', w: 90, fmt: 'tag', tagMap: {} },
            { p: 'priority', l: '问题等级', w: 90, fmt: 'tag', tagMap: { 紧急: 'danger', 高: 'warning', 中: 'primary', 低: 'info' } },
            { p: 'status', l: '状态', w: 110, fmt: 'tag', tagMap: { 待受理: 'info', 待分派: 'info', 处理中: 'primary', 待客户确认: 'warning', 已解决: 'success', 已关闭: 'success', 已退回: 'danger' } },
            { p: 'handler', l: '处理人', w: 100 }, { p: 'created', l: '提交时间', w: 140 }],
        };
      }
      /* --- 销售人员分析 --- */
      if (props.id === 'staff') {
        const rowsS = OWNERS.filter(n => passO(n)).map(n => {
          const cts = store.ext.contracts.filter(c => c.owner === n && c.amount > 0 && SIGNED.includes(c.status) && inM(c.signDate) && passC(c.customer));
          const ops = store.opps.filter(o => o.owner === n && inM(o.date) && passC(o.customer));
          const closed = ops.filter(o => o.stage === 'close'), win = closed.filter(o => o.result === '赢单');
          const acts = store.ext.activities.filter(a => a.owner === n && inM(a.time) && passC(a.customer));
          return { owner: n, perf: cts.reduce((a, c) => a + c.amount, 0), ctSum: cts.length, oppN: ops.length, winN: win.length,
            winRate: closed.length ? Math.round(win.length * 1000 / closed.length) / 10 : 0, followN: acts.length,
            custN: new Set(store.customers.filter(c => c.owner === n && passC(c.name)).map(c => c.no)).size };
        }).sort((a, b) => b.perf - a.perf);
        rowsS.forEach((r, i) => { r.rank = String(i + 1); r.ok = r.winRate >= 30; });
        const best = rowsS[0] || { owner: '—', perf: 0 };
        return {
          stats: [['上榜销售', String(rowsS.length), ''], ['业绩第一名', best.owner + '（' + wanT(best.perf) + '）', rowsS.length ? 'ok' : ''],
            ['合计业绩', wanT(rowsS.reduce((a, b) => a + b.perf, 0)), 'ok'], ['合计跟进次数', String(rowsS.reduce((a, b) => a + b.followN, 0)), '']],
          opt: {
            tooltip: { trigger: 'axis' }, legend: { data: ['个人业绩', '赢单率'], textStyle: { color: SUB }, right: 6, top: 0 },
            grid: { left: 8, right: 14, top: 30, bottom: 4, containLabel: true },
            xAxis: { type: 'category', data: rowsS.map(r => r.owner), ...axis },
            yAxis: [{ type: 'value', name: '万元', axisLabel: { color: SUB, fontSize: 11, formatter: v => v / 10000 }, splitLine: axis.splitLine }, { type: 'value', name: '赢单率 %', axisLabel: { color: SUB, fontSize: 11 }, splitLine: { show: false } }],
            series: [
              { name: '个人业绩', type: 'bar', barWidth: 30, itemStyle: { color: pal[0] }, data: rowsS.map(r => Math.round(r.perf / 10000 * 10) / 10) },
              { name: '赢单率', type: 'line', yAxisIndex: 1, symbol: 'circle', symbolSize: 7, itemStyle: { color: pal[3] }, data: rowsS.map(r => r.winRate) } ],
          },
          note: '注：个人业绩 = 名下已签署合同金额（签于筛选区间）；商机转化 = 赢单 /（赢单 + 输单）；跟进次数 = 区间内本人名下跟进活动数；排名按个人业绩倒序。',
          rows: rowsS,
          cols: [{ p: 'rank', l: '排名', w: 70, fmt: 'tag', tagMap: {} }, { p: 'owner', l: '销售人员', w: 100 }, { p: 'ctSum', l: '签约合同', w: 90 },
            { p: 'perf', l: '个人业绩', w: 120, fmt: 'money' }, { p: 'oppN', l: '商机数', w: 90 }, { p: 'winN', l: '赢单数', w: 90 },
            { p: 'winRate', l: '赢单率', w: 110, fmt: 'rate' }, { p: 'followN', l: '跟进次数', w: 100 }, { p: 'custN', l: '负责客户', w: 100 }],
        };
      }
      /* --- 合同分析 --- */
      if (props.id === 'contract') {
        const xs = store.ext.contracts.filter(c => c.amount > 0 && inM(c.signDate) && passO(c.owner) && passC(c.customer));
        const amtSum = xs.reduce((a, c) => a + c.amount, 0);
        const d30 = extAddDays(TODAY, 30);
        const dueN = xs.filter(c => c.endDate && c.endDate <= d30 && c.status !== '已完成').length;
        const STS_C = ['草稿', '待签署', '生效', '履约中', '已完成', '已到期'];
        const perfN = xs.filter(c => c.status === '生效' || c.status === '履约中').length;
        const bySign = {}; xs.forEach(c => { bySign[c.signDate.slice(0, 7)] = (bySign[c.signDate.slice(0, 7)] || 0) + c.amount; });
        return {
          stats: [['签署数量', String(xs.length), ''], ['合同总金额', wanT(amtSum), 'ok'], ['到期数量（30 天内含已到期）', String(dueN), dueN ? 'danger' : ''],
            ['履约中（生效+履约中）', perfN + ' / ' + xs.length, perfN / Math.max(1, xs.length) >= .5 ? 'ok' : 'warn']],
          opt: {
            tooltip: { trigger: 'item', formatter: q => '<b>' + q.name + '</b><br/>' + q.value + ' 份（' + q.percent + '%）' },
            legend: { bottom: 0, textStyle: { color: SUB }, itemWidth: 12, type: 'scroll' },
            series: [{ type: 'pie', center: ['50%', '44%'], radius: ['34%', '66%'], label: { color: SUB, fontSize: 11, formatter: '{b} {d}%' }, itemStyle: { borderColor: cssVar('--card') || '#fff', borderWidth: 2 },
              data: STS_C.map((k, i) => ({ name: k, value: xs.filter(c => c.status === k).length, itemStyle: { color: pal[i % pal.length] } })).filter(x => x.value) }],
          },
          opt2: {
            tooltip: { trigger: 'axis' }, grid: { left: 6, right: 10, top: 14, bottom: 0, containLabel: true },
            xAxis: { type: 'category', data: M, ...axis }, yAxis: { type: 'value', name: '万元', axisLabel: { color: SUB, fontSize: 11, formatter: v => v / 10000 }, splitLine: axis.splitLine },
            series: [{ type: 'bar', barWidth: 22, itemStyle: { color: mixHex(pal[0], '#000000', .3) }, label: { show: true, position: 'top', color: SUB, fontSize: 11 }, data: M.map(m => Math.round((bySign[m] || 0) / 10000 * 10) / 10) }],
          },
          opt2Title: '月度签署金额',
          note: '注：合同金额 = 含税合同金额，按签署日期归集；到期数量 = 到期日期在 30 天内（含已到期）且状态不是已完成；履约情况 = 生效/履约中合同份数；已到期合同状态由到期日期自动判定。',
          rows: xs.slice().sort((a, b) => (a.signDate < b.signDate ? 1 : -1)),
          cols: [{ p: 'no', l: '合同编号', w: 130, fmt: 'link', to: 'contract' }, { p: 'customer', l: '客户', w: 180, fmt: 'custName' }, { p: 'type', l: '合同类型', w: 100 },
            { p: 'amount', l: '合同金额', w: 110, fmt: 'money' }, { p: 'signDate', l: '签署日期', w: 105 }, { p: 'endDate', l: '到期日期', w: 105 },
            { p: 'status', l: '状态', w: 100, fmt: 'tag', tagMap: { 草稿: 'info', 待签署: 'info', 生效: 'primary', 履约中: 'warning', 已完成: 'success', 已到期: 'danger' } }],
        };
      }
      /* --- 交付分析 --- */
      if (props.id === 'delivery') {
        const xs = store.ext.deliveries.filter(d => inM(d.planStart) && passC(d.customer) && passO(d.pm));
        const done = xs.filter(d => d.status === '已完成' || d.progress >= 100);
        const delay = xs.filter(d => d.status !== '已完成' && d.planEnd && d.planEnd < TODAY);
        const acOk = xs.filter(d => d.ac === '已验收');
        const rate = arr => xs.length ? Math.round(arr.length * 1000 / xs.length) / 10 : 0;
        const STS_D = ['未启动', '实施中', '验收中', '已完成'];
        return {
          stats: [['项目数量', String(xs.length), ''], ['完成率', rate(done) + '%', 'ok'], ['延期率（' + delay.length + ' 个）', rate(delay) + '%', delay.length ? 'danger' : 'ok'], ['验收通过率', rate(acOk) + '%', rate(acOk) >= 30 ? 'ok' : 'crit']],
          opt: {
            tooltip: { trigger: 'item', formatter: q => '<b>' + q.name + '</b><br/>' + q.value + ' 个（' + q.percent + '%）' },
            legend: { bottom: 0, textStyle: { color: SUB }, itemWidth: 12 },
            series: [{ type: 'pie', center: ['50%', '44%'], radius: ['36%', '64%'], label: { color: SUB, fontSize: 11, formatter: '{b} {d}%' }, itemStyle: { borderColor: cssVar('--card') || '#fff', borderWidth: 2 },
              data: STS_D.map((k, i) => ({ name: k, value: xs.filter(d => d.status === k).length, itemStyle: { color: pal[i % pal.length] } })).filter(x => x.value) }],
          },
          opt2: {
            tooltip: { trigger: 'axis' }, grid: { left: 6, right: 10, top: 14, bottom: 0, containLabel: true },
            xAxis: { type: 'category', data: ['已验收', '阶段验收中', '未验收'], ...axis }, yAxis: { type: 'value', ...axis },
            series: [{ type: 'bar', barWidth: 34, itemStyle: { color: mixHex(pal[0], '#000000', .35) }, label: { show: true, position: 'top', color: SUB, fontSize: 11 },
              data: [acOk.length, xs.filter(d => d.ac === '阶段验收中').length, xs.filter(d => d.ac === '未验收').length] }],
          },
          opt2Title: '验收情况',
          note: '注：项目数量按计划开始日期统计；延期 = 计划结束日期早于今天且项目未完成（触发预警并记录延期原因，第十二章）；验收状态由项目里程碑完成情况推导；进度 = 已完成里程碑的估算进度。',
          rows: xs.slice().sort((a, b) => (a.planEnd > b.planEnd ? 1 : -1)),
          cols: [{ p: 'no', l: '项目编号', w: 130, fmt: 'mono' }, { p: 'name', l: '项目名称', w: 190 }, { p: 'customer', l: '客户', w: 170, fmt: 'custName' },
            { p: 'status', l: '状态', w: 90, fmt: 'tag', tagMap: { 未启动: 'info', 实施中: 'primary', 验收中: 'warning', 已完成: 'success' } },
            { p: 'progress', l: '进度（%）', w: 90 }, { p: 'planStart', l: '计划开始', w: 105 }, { p: 'planEnd', l: '计划结束', w: 105 },
            { p: 'ac', l: '验收状态', w: 100, fmt: 'tag', tagMap: { 已验收: 'success', 阶段验收中: 'warning', 未验收: 'info' } }, { p: 'pm', l: '项目经理', w: 90 }],
        };
      }
      return { stats: [], opt: {}, rows: [], cols: [], note: '' };
    });

    const rowsF = computed(() => data.value.rows || []);
    const paged = computed(() => rowsF.value.slice((page.value - 1) * size.value, page.value * size.value));
    const tagType = (c, v) => (c.tagMap || {})[v] || 'info';
    const gotoCust = row => { const no = cno(row.customer); if (no && no !== 'NA') return go('/customer/' + no); ElMessage.info('该客户未建档（线索阶段）'); };
    const cellLink = (row, c) => { if (c.to === 'contract') return go('/contract/' + row.no); if (row.no) return go('/opp/' + row.no); };
    const fmtMoney = v => typeof v === 'number' ? yuan(Math.round(v)) : (v || '¥0');
    return { rep, period, owner, months, page, size, data, rowsF, paged, tagType, gotoCust, cellLink, fmtMoney, AN_REPORTS,
      dept, ctype, csrc, cind, creg, anDepts, anCtypes, anCsrcs, anInds, anRegs, clearF };
  },
  template: `<div>
    <page-head :crumbs="[{t:'数据分析',to:'/analytics'},'报表详情 · ' + (rep ? rep.name : '')]" title="报表详情" :total="rep ? rep.metric : ''">
      <el-select v-model="period" style="width:130px;margin-right:8px"><el-option label="近 3 个月" value="m3"/><el-option label="近 6 个月" value="m6"/><el-option label="本年（2026）" value="y"/></el-select>
      <el-select v-model="owner" clearable placeholder="全部负责人" style="width:130px;margin-right:8px"><el-option v-for="o in OWNERS" :key="o" :label="o" :value="o"/></el-select>
      <el-button icon="Download" @click="$msg.info('示例：导出报表（含明细）')">导出</el-button>
    </page-head>
    <div class="card query" style="margin-bottom:14px">
      <el-form inline>
        <el-form-item label="部门"><el-select v-model="dept" clearable placeholder="全部" style="width:150px"><el-option v-for="d in anDepts" :key="d" :label="d" :value="d"/></el-select></el-form-item>
        <el-form-item label="客户类型"><el-select v-model="ctype" clearable placeholder="全部" style="width:120px"><el-option v-for="t in anCtypes" :key="t" :label="t" :value="t"/></el-select></el-form-item>
        <el-form-item label="客户来源"><el-select v-model="csrc" clearable filterable placeholder="全部" style="width:130px"><el-option v-for="t in anCsrcs" :key="t" :label="t" :value="t"/></el-select></el-form-item>
        <el-form-item label="行业"><el-select v-model="cind" clearable filterable placeholder="全部" style="width:160px"><el-option v-for="t in anInds" :key="t" :label="t" :value="t"/></el-select></el-form-item>
        <el-form-item label="区域"><el-select v-model="creg" clearable filterable placeholder="全部" style="width:150px"><el-option v-for="t in anRegs" :key="t" :label="t" :value="t"/></el-select></el-form-item>
        <el-button icon="Refresh" style="margin-top:22px" @click="clearF">重置筛选</el-button>
        <span class="muted" style="margin-left:12px;font-size:12px;line-height:2.2">统一筛选（5.14）：按单据关联客户的类型/来源/行业/区域与数据负责人的部门过滤；未建档客户（线索阶段）在启用客户维度筛选时不计入报表。</span>
      </el-form>
    </div>
    <div class="stat-row" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card" v-for="s in data.stats" :key="s[0]" :class="s[2]"><span class="lb">{{ s[0] }}</span><span class="vl">{{ s[1] }}</span><span class="ft">随筛选实时计算</span></div>
    </div>
    <div style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:14px;margin-bottom:14px">
      <div class="card card-pad">
        <div class="card-title">{{ rep ? rep.name : '' }}</div>
        <e-chart :option="data.opt" height="280px"/>
      </div>
      <div class="card card-pad" v-if="data.opt2">
        <div class="card-title">{{ data.opt2Title || '辅助视图' }}</div>
        <e-chart :option="data.opt2" height="280px"/>
      </div>
      <div class="card card-pad" v-else style="display:flex;flex-direction:column;justify-content:center">
        <div class="sec-title">报表口径</div>
        <div class="muted" style="font-size:13px;line-height:1.8">{{ data.note || (rep ? rep.text : '') }}</div>
        <el-alert type="info" show-icon :closable="false" style="margin-top:10px"
          title="数据说明" description="本页所有统计与明细均由系统内真实数据（客户 / 商机 / 合同 / 回款 / 工单）聚合而成，随筛选条件变化。"/>
      </div>
    </div>
    <div class="card table-card">
      <div style="padding:10px 12px 0;display:flex;align-items:center">
        <span class="sec-title" style="margin:0">明细数据</span>
        <span class="muted" style="margin-left:10px;font-size:13px">{{ data.note }}</span>
        <el-button link type="primary" style="margin-left:auto" @click="$go('/analytics')">‹ 返回报表列表</el-button>
      </div>
      <el-table :data="paged" style="width:100%" :header-cell-style="{height:'42px'}" empty-text="该筛选条件下暂无明细数据">
        <el-table-column v-for="c in data.cols" :key="c.p" :prop="c.p" :label="c.l" :min-width="c.w" :show-overflow-tooltip="true">
          <template #default="{row}">
            <template v-if="!c.hide">
              <a v-if="c.fmt==='link'" class="link" @click="cellLink(row,c)">{{ row[c.p] }}</a>
              <a v-else-if="c.fmt==='custName'" class="link" @click="gotoCust(row)">{{ row[c.p] }}</a>
              <a v-else-if="c.fmt==='owner'" @click="">{{ row[c.p] || '—（公海）' }}</a>
              <span v-else-if="c.fmt==='money'" class="money">{{ fmtMoney(row[c.p]) }}</span>
              <el-tag v-else-if="c.fmt==='rate'" size="small" :type="(row.ok ? 'success' : 'warning')" effect="light">{{ row[c.p] }}%</el-tag>
              <el-tag v-else-if="c.fmt==='tag'" size="small" effect="light" :type="tagType(c,row[c.p])">{{ row[c.p] || '—' }}</el-tag>
              <span v-else class="mono">{{ row[c.p] === '-' || row[c.p] === undefined ? '—' : row[c.p] }}</span>
            </template>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager"><span class="batch">共 {{ rowsF.length }} 条</span>
        <el-pagination v-model:current-page="page" v-model:page-size="size" :page-sizes="[10,20,50]" layout="sizes, prev, pager, next, jumper" :total="rowsF.length" background size="small"/></div>
    </div>
  </div>`,
};

registerRoute('/analytics', AnalyticsPage, 'analytics');
registerRoute('/analytics/:id', AnalyticsDetailPage, 'analytics-detail');
