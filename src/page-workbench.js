const WorkbenchPage = {
  components: { PageHead, EChart },
  setup() {
    const period = ref('month');
    // 销售漏斗「可按时间查看」：按预计成交日期在本月 / 本季 / 本年内的进行中商机统计（5.1）
    const periodOpps = computed(() => {
      const now = new Date(TODAY);
      const y = now.getFullYear(), m = now.getMonth();
      const fd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const from = p => (p === 'month' ? fd(new Date(y, m, 1)) : p === 'quarter' ? fd(new Date(y, m - (m % 3), 1)) : fd(new Date(y, 0, 1)));
      const to = p => (p === 'month' ? fd(new Date(y, m + 1, 1)) : p === 'quarter' ? fd(new Date(y, m - (m % 3) + 3, 1)) : fd(new Date(y + 1, 0, 1)));
      return store.opps.filter(o => o.date >= from(period.value) && o.date < to(period.value));
    });
    const funnelC = computed(() => STAGES.slice(0, 5).map(s => periodOpps.value.filter(o => o.stage === s.key).length));
    const funnelA = computed(() => STAGES.slice(0, 5).map(s => Math.round(periodOpps.value.filter(o => o.stage === s.key).reduce((x, o) => x + o.amount, 0) / 10000)));
    // 加权预测金额 = 预计金额 × 赢率（按分计算），仅未结束商机计入预测；漏斗宽度只是展示宽度（funnelWidth），不代表转化率或赢率
    const funnelW = computed(() => STAGES.slice(0, 5).map(s => periodOpps.value.filter(o => o.stage === s.key && o.stage !== 'close').reduce((x, o) => x + wAmount(o), 0) / 10000));
    const funnelOpt = computed(() => {
      const c = funnelC.value, a = funnelA.value, w = funnelW.value;
      const p = (theme.value, cssVar('--el-color-primary')) || '#2f9bff';
      const shades = [mixHex(p, '#ffffff', 0.35), mixHex(p, '#ffffff', 0.15), p, mixHex(p, '#000000', 0.2), mixHex(p, '#000000', 0.38)];
      return {
        tooltip: { trigger: 'item', formatter: p => `<b>${p.name}</b><br/>商机数量：${c[p.dataIndex]} 个<br/>预计金额：¥${a[p.dataIndex]} 万<br/>加权预测金额：¥${w[p.dataIndex]} 万（= 预计金额 × 赢率）` },
        series: [{ type: 'funnel', left: '4%', right: '4%', top: 6, bottom: 6, width: '92%', min: 0, max: 100, minSize: '40%', maxSize: '100%', sort: 'none', gap: 3,
          label: { show: true, position: 'inside', color: '#fff', fontSize: 12, formatter: p => `${p.name}  ${c[p.dataIndex]} 个 · ¥${a[p.dataIndex]}万` },
          itemStyle: { borderWidth: 0 },
          data: STAGES.slice(0, 5).map((s, i) => ({ name: s.name, value: s.funnelWidth, itemStyle: { color: shades[i] } })) }],
      };
    });
    const perfColor = computed(() => (theme.value, cssVar('--el-color-primary')));
    const perfPeriod = ref('month');
    const perfData = { month: { target: 1000000, done: 786000, label: '本月' }, quarter: { target: 3000000, done: 2460000, label: '本季度' }, year: { target: 12000000, done: 8160000, label: '本年' } };
    const perf = computed(() => { const p = perfData[perfPeriod.value]; return { ...p, rate: Math.round(p.done * 1000 / p.target) / 10 }; });
    const authUser = computed(() => AUTH.authUser());
    const authRole = computed(() => AUTH.authRole());
    const msgs = computed(() => store.messages);
    const unread = computed(() => store.messages.filter(m => !m.read).length);
    // 我的待办（5.1：待跟进、待审批、待处理任务），数字由真实数据实算，点击进入具体业务
    const toDo = [
      { t: '待跟进客户', icon: 'PhoneFilled', bg: 'var(--el-color-primary-light-9)', c: 'var(--el-color-primary)', to: '/activities',
        n: () => store.ext.activities.filter(a => a.owner === '张三' && a.status === '计划中').length },
      { t: '待审批报价', icon: 'Stamp', bg: '#fff3e0', c: '#e08a00', to: '/approvals',
        n: () => store.approvals.filter(a => a.tab === 'todo' && a.type.includes('报价')).length },
      { t: '即将到期合同', icon: 'Clock', bg: '#fdeceb', c: '#d9534f', to: '/contracts',
        n: () => store.ext.contracts.filter(t => !['草稿', '已终止', '已到期', '已撤销', '已驳回'].includes(t.status) && (t.endDate || t.end) && daysBetween(TODAY, t.endDate || t.end) > 0 && daysBetween(TODAY, t.endDate || t.end) <= 30).length },
      { t: '待处理客户投诉', icon: 'WarningFilled', bg: '#fdeceb', c: '#c0392b', to: '/service',
        n: () => store.ext.tickets.filter(t => t.type === '投诉' && !['已解决', '已关闭'].includes(t.status)).length },
    ];
    const todos = computed(() => toDo.map(t => ({ ...t, n: t.n() })));
    const plannedActs = computed(() => store.ext.activities.filter(a => a.owner === '张三' && a.status === '计划中').length);
    const recent = [
      { t: '今天 10:00', c: '南京某某科技', a: '方案沟通', cno: 'KH-202611-0001' },
      { t: '今天 14:30', c: '江苏某某集团', a: '商务拜访', cno: 'KH-202611-0002' },
      { t: '明天 09:00', c: '安徽某某连锁', a: '报价反馈', cno: 'KH-202610-0021' },
    ];
    const sched = [
      { tm: '09:30', t: '电话跟进 · 南京某某科技', s: '已完成', c: '#2e9e6a' },
      { tm: '10:00', t: '方案沟通 · 南京某某科技', s: '已完成', c: '#2e9e6a' },
      { tm: '14:30', t: '商务拜访 · 江苏某某集团', s: '待开始', c: 'var(--el-color-primary)' },
      { tm: '16:00', t: '周例会 · 销售团队会议', s: '待开始', c: '#e08a00' },
    ];
    const quick = [['新建线索', 'Aim', '/leads'], ['新建客户', 'OfficeBuilding', '/customers'], ['新建商机', 'TrendCharts', '/opps'], ['记录跟进', 'EditPen', '/activities']];
    const myCusts = computed(() => store.customers.filter(c => c.owner === '张三'));
    const myNewCusts = computed(() => myCusts.value.filter(c => c.created && c.created.startsWith('2026-11')).length);
    const txnAmt = computed(() => wan(store.opps.filter(o => o.stage !== 'close' && o.date >= '2026-11-01' && o.date < '2026-12-01').reduce((s, o) => s + o.amount, 0)));
    const paidMonth = computed(() => wan(store.pay.records.filter(r => r.date >= '2026-11-01' && r.date < '2026-12-01').reduce((s, r) => s + (r.confirm === '财务已确认' ? r.amount : 0), 0) / 100));
    const readMsg = m => { m.read = true; };
    const readAll = () => store.messages.forEach(m => m.read = true);
    return { period, funnelOpt, funnelC, funnelA, funnelW, perfColor, perfPeriod, perf, msgs, unread, todos, recent, sched, quick, readMsg, readAll, myCusts, myNewCusts, txnAmt, paidMonth, plannedActs, yuan, fmtY, store };
  },
  template: `<div>
    <el-breadcrumb separator="/" class="crumb"><el-breadcrumb-item>工作台</el-breadcrumb-item><el-breadcrumb-item>个人工作台</el-breadcrumb-item></el-breadcrumb>
    <div class="wb-hello">
      <div><h2>欢迎回来，{{ authUser.name }}</h2><div class="d">{{ TODAY }} {{ authRole?.name }}{{ authUser?.role === 'admin' ? '' : '（数据范围：' + authRole?.scope + '）' }}</div></div>
      <div class="seg"><div><b>{{ plannedActs }}</b><span>待跟进</span></div><div><b>{{ todos[1].n }}</b><span>待审批报价</span></div><div><b>{{ unread }}</b><span>未读消息</span></div></div>
    </div>
    <div class="wb-grid">
      <div>
        <div class="stat-row" style="grid-template-columns:repeat(4,1fr)">
          <div class="stat-card"><span class="lb">我的客户</span><span class="vl">{{ myCusts.length }}</span><span class="ft">本月新增 {{ myNewCusts }} 家</span></div>
          <div class="stat-card warn"><span class="lb">跟进中商机</span><span class="vl">{{ store.opps.filter(o => o.stage !== 'close').length }}</span><span class="ft">待跟进 {{ plannedActs }} 个 · 停滞 {{ store.opps.filter(o => o.flags && o.flags.stalled).length }} 个</span></div>
          <div class="stat-card ok"><span class="lb">本月预计成交</span><span class="vl">{{ txnAmt }}</span><span class="ft">预计金额</span></div>
          <div class="stat-card"><span class="lb">本月已回款</span><span class="vl">{{ paidMonth }}</span><span class="ft">财务已确认到账</span></div>
        </div>
        <div style="display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:14px;margin-bottom:14px">
          <div class="card card-pad">
            <div class="card-title">销售漏斗
              <el-radio-group v-model="period" size="small" style="margin-left:auto"><el-radio-button label="month">本月</el-radio-button><el-radio-button label="quarter">本季</el-radio-button><el-radio-button label="year">本年</el-radio-button></el-radio-group></div>
            <e-chart :option="funnelOpt" height="290px"/>
            <div class="muted" style="font-size:12px;margin-top:4px">注：漏斗各段宽度仅为展示宽度（100%/80%/60%/40%/25%，funnelWidth），不代表转化率，也不是赢率；统计周期内按预计成交日期（本月/本季/本年）分组。tooltip 口径：预计金额、加权预测金额 = ⌊预计金额 × 阶段默认赢率 / 100⌋（按分计算，默认赢率 10/25/45/65/85，原型假设，待业务确认），仅未结束商机计入预测。当前周期加权预测金额合计：¥{{ Math.round(funnelW.reduce((a,b)=>a+b,0)) }} 万。</div>
          </div>
          <div class="card card-pad">
            <div class="card-title">业绩进度
              <el-radio-group v-model="perfPeriod" size="small" style="margin-left:auto"><el-radio-button label="month">月</el-radio-button><el-radio-button label="quarter">季</el-radio-button><el-radio-button label="year">年</el-radio-button></el-radio-group></div>
            <div style="display:flex;align-items:center;gap:22px;margin-top:6px">
              <el-progress type="dashboard" :percentage="perf.rate" :width="150" :stroke-width="12" :color="perfColor"><template #default="{percentage}"><div style="font-size:24px;font-weight:700">{{ percentage }}%</div><div class="muted" style="font-size:12px">完成率</div></template></el-progress>
              <div style="flex:1"><div class="perf-num" style="flex-direction:column;gap:12px;margin:0"><div><span>{{ perf.label }}目标</span><b>{{ yuan(perf.target) }}</b></div><div><span>已完成（合同签署金额）</span><b style="color:var(--el-color-primary)">{{ yuan(perf.done) }}</b></div><div><span>距目标</span><b>{{ yuan(perf.target - perf.done) }}</b></div></div></div>
            </div>
          </div>
        </div>
        <div class="card card-pad">
          <div class="card-title">近期客户跟进<a class="more" @click="$go('/activities')">全部跟进记录 ›</a></div>
          <div class="tl-line" v-for="r in recent" :key="r.t"><span class="t">{{ r.t }}</span><span><a @click="$go('/customer/'+r.cno)">{{ r.c }}</a> · {{ r.a }}</span><el-button link type="primary" style="margin-left:auto" @click="$go('/customer/'+r.cno)">查看客户</el-button></div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="card card-pad"><div class="card-title">快捷入口</div>
          <div class="quick"><div class="q" v-for="q in quick" :key="q[0]" @click="$go(q[2])"><el-icon><component :is="q[1]"/></el-icon><div>{{ q[0] }}</div></div></div></div>
        <div class="card card-pad"><div class="card-title">我的待办</div>
          <div class="todo-item" v-for="t in todos" :key="t.t" @click="$go(t.to)"><span class="dot" :style="{background:t.bg,color:t.c}"><el-icon><component :is="t.icon"/></el-icon></span><span>{{ t.t }}</span><span class="n">{{ t.n }}<small>{{ t.u }}</small></span></div></div>
        <div class="card card-pad"><div class="card-title">今日日程<a class="more" @click="$msg.info('示例：新建日程并设置提醒')">+ 新建</a></div>
          <div class="sch" v-for="s in sched" :key="s.tm"><span class="tm">{{ s.tm }}</span><span class="bar" :style="{background:s.c}"></span><div style="flex:1">{{ s.t }}<div class="muted" style="font-size:12px">{{ s.s }}</div></div></div></div>
        <div class="card card-pad"><div class="card-title">消息通知<el-badge :value="unread" v-if="unread" /><a class="more" @click="readAll">全部已读</a></div>
          <div class="msg" :class="{read:m.read}" v-for="m in msgs.slice(0,4)" :key="m.id" @click="readMsg(m)"><span class="u" :class="{read:m.read}"></span><div><div>{{ m.title }}</div><div class="muted" style="font-size:12px">{{ m.type }} · {{ m.time }}</div></div></div></div>
      </div>
    </div>
  </div>`,
};
registerRoute('/workbench', WorkbenchPage, 'workbench');
