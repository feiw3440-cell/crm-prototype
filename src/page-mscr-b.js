/* ===== 第 8 阶段：移动端其余屏幕（线索 / 商机 / 跟进 / 审批 / 回款 / 工单 / 通知） ===== */

/* 补充几条通知（每次加载 store 都是新数据，可直接追加） */
(function msbSeedMsgs() {
  if (store.messages.some(m => m.id === 6)) return;
  [{ id: 6, title: '新线索 XS-202611-0006 已进入公海待领取', time: '今天 09:55', type: '分配通知', read: false },
   { id: 7, title: '回款计划「验收款」将于 18 天后到期（HT-202608-0012）', time: '今天 09:30', type: '到期提醒', read: false },
   { id: 8, title: '工单 GD-202611-0007 已超出 SLA 时限', time: '今天 09:05', type: '逾期提醒', read: false },
   { id: 9, title: '合同审批 HT-202611-0006 待你审批（SP-202611-0040）', time: '今天 08:55', type: '审批提醒', read: false },
   { id: 10, title: '客户「江苏某某集团」今天 14:00 有拜访安排，请按计划签到并记录跟进', time: '今天 08:30', type: '跟进提醒', read: false }
  ].forEach(m => store.messages.push(m));
})();
/* 保证移动端演示至少有 1 张「待受理」工单（工单状态随构建确定性生成） */
(function msbSeedTickets() {
  if (store.ext.tickets.some(t => t.status === '待受理')) return;
  const t = store.ext.tickets.find(x => x.status !== '已关闭') || store.ext.tickets[0];
  if (!t) return;
  t.status = '待受理'; t.handler = '';
  t.records.push({ time: msaNowTime(), who: '系统', act: '重置演示', note: '移动端演示：该工单被置为待受理供受理流程演示' });
})();

const MSB_STATUS_TAG = { 新建: 'info', 跟进中: 'warning', 已转化: 'success', 无效: 'danger' };
const MSB_stageName = k => (STAGES[STAGE_IDX[k]] || {}).name || k;
const MSB_nextLeadNo = () => {
  let mx = 99;
  store.leads.forEach(l => { const n = Number(String(l.no).split('-')[2]); if (n > mx) mx = n; });
  return 'XS-' + TODAY.slice(0, 7).replace('-', '') + '-' + String(mx + 1).padStart(4, '0');
};
const MSB_nextCustNo = () => {
  let mx = 0;
  store.customers.forEach(c => { const n = Number(String(c.no).split('-').pop()); if (n > mx) mx = n; });
  return 'KH-' + TODAY.slice(0, 7).replace('-', '') + '-' + String(mx + 1).padStart(4, '0');
};
const MSB_nextContactNo = () => {
  let mx = 0;
  store.ext.contacts.forEach(c => { const n = Number(String(c.no).split('-')[1]); if (n > mx) mx = n; });
  return 'LX-' + String(mx + 1).padStart(6, '0');
};
/* 手机号格式：支持明文 11 位或演示掩码 138****1234 */
const MSB_phoneOk = v => /^1[3-9]\d{9}$/.test(String(v).replace(/\D/g, '')) || /^1[3-9]\d\*{4}\d{4}$/.test(String(v));

/* 统一回款计划视图：store.pay（含回款核销）+ store.ext.contracts（按计划状态估算） */
function MSB_payPlans() {
  const out = [];
  store.pay.contracts.forEach(c => c.plans.forEach(p => {
    let paid = 0;
    store.pay.records.forEach(r => { if (r.contract === c.no) (r.alloc || []).forEach(a => { if (a.plan === p.id) paid += a.amt; }); });
    out.push({ contract: c.no, cname: c.name, customer: c.customer, owner: c.owner, pid: p.id, stage: p.stage, date: p.date, amount: p.amount, paid });
  }));
  store.ext.contracts.forEach(c => {
    if (store.pay.contracts.some(x => x.no === c.no)) return;
    c.plans.forEach((p, i) => {
      const paid = p.status === '已回款' ? p.amount : (p.status === '部分回款' ? Math.round(p.amount * 0.4) : 0);
      out.push({ contract: c.no, cname: c.name, customer: c.customer, owner: c.owner || '', pid: 'E' + c.no + '-' + i, stage: p.stage, date: String(p.date), amount: p.amount, paid });
    });
  });
  return out;
}
const MSB_planStatus = p => p.paid >= p.amount ? '已回款' : (p.paid > 0 ? '部分回款' : (p.date < TODAY ? '逾期' : '未回款'));

/* ========== 1. 线索 ========== */
const MSBLeadsScreen = {
  components: { MSearch, MTag, MEmpty, MCard },
  setup() {
    const kw = ref(''); const st = ref(''); const limit = ref(10);
    const sts = ['全部', '新建', '跟进中', '已转化', '无效'];
    const filtered = computed(() => {
      let a = store.leads.slice();
      if (kw.value.trim()) { const k = kw.value.trim(); a = a.filter(l => (l.name + l.company + l.no + l.contact + (l.phone || '') + (l.owner || '')).includes(k)); }
      if (st.value) a = a.filter(l => l.status === st.value);
      return a.sort((x, y) => (x.created < y.created ? 1 : -1));
    });
    const shown = computed(() => filtered.value.slice(0, limit.value));
    watch([kw, st], () => { limit.value = 10; });
    const pickSt = s => { st.value = s === '全部' ? '' : s; };
    const counts = computed(() => ({ all: store.leads.length, 新建: store.leads.filter(l => l.status === '新建').length, 跟进中: store.leads.filter(l => l.status === '跟进中').length }));
    onMounted(() => mSetActions([{ icon: 'Plus', title: '新建线索', on: () => mpush('lead-new') }]));
    onBeforeUnmount(() => mSetActions([]));
    return { kw, st, sts, filtered, shown, more: () => { limit.value += 10; }, pickSt, MSB_STATUS_TAG, mgo, mpush, counts, money: msaMoney };
  },
  template: `<div class="m-page">
    <m-search v-model="kw" placeholder="搜索线索：编号 / 公司 / 联系人 / 电话"/>
    <div class="m-chip-row">
      <span v-for="s in sts" :key="s" class="m-chip" :class="{on:(s==='全部'&&!st)||st===s}" @click="pickSt(s)">{{ s }}</span>
      <span class="m-chip" @click="mpush('lead-new')"><el-icon style="vertical-align:-2px"><plus/></el-icon> 新建</span>
    </div>
    <div class="m-result-tip">共 {{ filtered.length }} 条线索 · 新建 {{ counts['新建'] }} · 跟进中 {{ counts['跟进中'] }}</div>
    <m-empty v-if="!shown.length" text="没有匹配的线索，试试调整筛选条件" icon="Aim"/>
    <div class="m-card" v-else>
      <div class="m-list-item" v-for="l in shown" :key="l.no" @click="mpush('lead-detail', {no:l.no})">
        <div class="m-ava">{{ l.company.slice(0, 1) }}</div>
        <div style="flex:1;min-width:0">
          <div class="m-ellipsis" style="font-weight:600">{{ l.name }}</div>
          <div class="muted m-ellipsis" style="font-size:12px">{{ l.company }} · {{ l.contact }} {{ l.phone }} · {{ l.owner || '待分配' }}</div>
        </div>
        <m-tag :type="MSB_STATUS_TAG[l.status] || 'info'" :text="l.status"/>
      </div>
    </div>
    <div class="m-loadmore" v-if="shown.length < filtered.length">
      <el-button size="small" round @click="more">加载更多（已显示 {{ shown.length }} / {{ filtered.length }}）</el-button>
    </div>
    <div class="m-loadmore muted" v-else-if="filtered.length > 10">已加载全部 {{ filtered.length }} 条</div>
  </div>`,
};

const MSBLeadDetailScreen = {
  components: { MCard, MTag, MEmpty, MCell, MActionSheet },
  props: { no: String },
  setup(props) {
    const lead = computed(() => store.leads.find(l => l.no === props.no));
    const assignSheet = ref(false);
    const assignees = computed(() => store.ext.users.filter(u => u.status === '启用' && u.name !== MSA_OWNER).map(u => ({ label: u.name + ' · ' + u.dept, key: u.name })));
    const doAssign = u => {
      const l = lead.value; if (!l || l.owner === u.key) return;
      const from = l.owner || '公海';
      l.owner = u.key;
      if (!l.status || l.status === '新建') l.status = '跟进中';
      msaLog('线索', '分配', '移动端分配线索 ' + l.no + '：' + from + ' → ' + u.key);
      mToast('线索已分配给 ' + u.key, 'success');
    };
    const acts = computed(() => {
      const l = lead.value; if (!l) return [];
      const got = store.ext.activities.filter(a => a.customer === l.company).slice().sort((a, b) => (a.time < b.time ? 1 : -1));
      if (got.length) return got;
      return [];
    });
    const writeFollow = () => lead.value && mpush('followup-new', { customer: lead.value.company });
    const doConvert = () => {
      const l = lead.value; if (!l || l.status === '已转化' || l.status === '无效') return;
      const exist = store.customers.find(c => c.name === l.company);
      let custNo;
      if (exist) {
        custNo = exist.no;
        mToast('客户已存在，直接关联：' + custNo, 'info');
      } else {
        custNo = MSB_nextCustNo();
        store.customers.push({ no: custNo, name: l.company, type: '企业客户', industry: '企业服务', level: '潜在客户', source: l.source, region: '', scale: '小型', owner: l.owner || MSA_OWNER, status: '跟进中', lastFollow: TODAY, lastDeal: '-', total: 0, created: TODAY, phone: l.phone, key: false });
      }
      if (!(store.ext.contacts || []).some(c => c.customer === l.company && c.name === l.contact)) {
        store.ext.contacts.push({ no: MSB_nextContactNo(), name: l.contact, customer: l.company, phone: l.phone, email: '', dept: '', title: '', role: '使用人', infl: '中', pref: '电话', key: false, attitude: '中立', reportsTo: '', birthday: '', remark: '由线索转化生成', owner: l.owner || MSA_OWNER });
      }
      const on = msaOppNo();
      store.opps.push({ no: on, name: extShort(l.company) + ' ' + l.need, customer: l.company, amount: l.amount, date: TODAY, owner: l.owner || MSA_OWNER, stage: 'contact', prob: 10, info: { demand: l.need, budget: msaMoney(l.amount) }, flags: {} });
      l.status = '已转化'; l.convertedAt = msaNowTime(); l.convertedTo = custNo;
      msaLog('线索', '转化', '移动端转化线索 ' + l.no + ' → 客户 ' + custNo + '，商机 ' + on);
      mToast('转化成功：客户 ' + custNo + ' 与商机 ' + on + ' 已创建', 'success');
    };
    const doBack = () => {
      const l = lead.value; if (!l) return;
      ElMessageBox.confirm('确认将「' + l.company + '」退回公海？退回后负责人清空、状态回到「新建」，历史跟进记录保留。', '退回公海', { confirmButtonText: '确认退回', cancelButtonText: '取消', type: 'warning' })
        .then(() => { l.owner = ''; l.status = '新建'; l.next = ''; msaLog('线索', '退回公海', '移动端退回线索 ' + l.no); mToast('已退回公海', 'success'); }).catch(() => {});
    };
    const doInvalid = () => {
      const l = lead.value; if (!l) return;
      ElMessageBox.prompt('请填写标记无效的原因（必填）：', '标记无效', { confirmButtonText: '确认标记', cancelButtonText: '取消', inputPattern: /\S+/, inputErrorMessage: '原因不能为空' })
        .then(({ value }) => { l.status = '无效'; msaLog('线索', '标记无效', '线索 ' + l.no + ' 无效原因：' + value); mToast('已标记为无效，原因已记录', 'success'); }).catch(() => {});
    };
    onMounted(() => mSetActions([{ icon: 'EditPen', title: '写跟进', on: writeFollow }]));
    onBeforeUnmount(() => mSetActions([]));
    return { lead, acts, MSB_STATUS_TAG, writeFollow, doConvert, doBack, doInvalid, doAssign, assignSheet, assignees, mgo, mpush, mToast, money: msaMoney };
  },
  template: `<div class="m-page">
    <m-empty v-if="!lead" text="线索不存在或已被删除" icon="Aim"/>
    <template v-else>
      <m-card>
        <div class="m-cust-head">
          <div class="m-cust-logo">{{ lead.company.slice(0, 1) }}</div>
          <div style="flex:1;min-width:0">
            <div class="m-cust-name">{{ lead.name }}</div>
            <div class="m-cust-meta">{{ lead.no }} · {{ lead.company }}</div>
            <div style="display:flex;gap:6px;margin-top:6px"><m-tag :type="MSB_STATUS_TAG[lead.status]" :text="lead.status"/><m-tag type="info" :text="lead.source"/><m-tag type="info" :text="lead.owner || '公海 · 待分配'"/></div>
          </div>
        </div>
      </m-card>
      <div class="m-action-row">
        <el-button size="small" type="primary" icon="Promotion" :disabled="lead.status==='已转化'||lead.status==='无效'" @click="doConvert">转化</el-button>
        <el-button size="small" icon="EditPen" @click="writeFollow">写跟进</el-button>
      </div>
      <div class="m-action-row">
        <el-button size="small" icon="Position" @click="assignSheet=true">分配</el-button>
        <el-button size="small" icon="Umbrella" :disabled="!lead.owner" @click="doBack">退回公海</el-button>
        <el-button size="small" type="warning" plain :disabled="lead.status==='已转化'||lead.status==='无效'" @click="doInvalid">标记无效</el-button>
      </div>
      <m-card title="基本信息">
        <m-cell label="联系人" :value="lead.contact" :arrow="false"/>
        <m-cell label="电话" :value="lead.phone" :arrow="false"/>
        <m-cell label="需求类型" :value="lead.need" :arrow="false"/>
        <m-cell label="预计金额" :value="money(lead.amount)" :arrow="false"/>
        <m-cell label="下一步" :value="lead.next || '-'" :arrow="false"/>
        <m-cell label="创建时间" :value="lead.created" :arrow="false"/>
        <m-cell label="重复提示" :value="lead.dup ? ('与' + lead.dup.type + '「' + lead.dup.ref + '」' + lead.dup.why) : '未命中查重规则'" :arrow="false"/>
        <m-cell v-if="lead.status==='已转化'" label="转化结果" :value="lead.convertedTo + ' · ' + (lead.convertedAt || '')" :arrow="false"/>
      </m-card>
      <m-card title="跟进记录">
        <m-empty v-if="!acts.length" text="暂无跟进记录，点击上方「写跟进」开始" icon="ChatDotRound"/>
        <div v-for="a in acts" :key="a.no" class="m-list-item">
          <div style="flex:1;min-width:0"><div style="font-weight:600">{{ a.type }} · {{ a.time.slice(5, 16) }}</div><div class="muted m-ellipsis" style="font-size:12px">{{ a.content }}</div></div>
          <m-tag :type="a.status==='已完成'?'success':'warning'" :text="a.status"/>
        </div>
      </m-card>
      <m-action-sheet v-model="assignSheet" title="分配给（启用中的成员）" :actions="assignees" @select="doAssign"/>
    </template>
    </div>`,
};

const MSBLeadNewScreen = {
  components: { MForm, MField, MCard, MEmpty },
  setup() {
    const draft = reactive({ company: '', contact: '', phone: '', source: '官网', need: 'CRM 软件', amount: null });
    const dup = computed(() => {
      const comp = draft.company.trim(); if (!comp) return null;
      const c = store.customers.find(x => x.name === comp);
      if (c) return { type: '客户', ref: c.no + ' ' + c.name, why: '公司名称一致' };
      const l = store.leads.find(x => x.company === comp);
      if (l) return { type: '线索', ref: l.no, why: '公司名称一致' };
      const ph = draft.phone.trim();
      const l2 = ph && store.leads.find(x => x.phone === ph);
      if (l2) return { type: '线索', ref: l2.no, why: '手机号相同' };
      return null;
    });
    const errs = reactive({});
    const save = () => {
      errs.company = !draft.company.trim() ? '请填写公司名称' : '';
      errs.contact = !draft.contact.trim() ? '请填写联系人' : '';
      errs.phone = !draft.phone.trim() ? '请填写联系手机' : (!MSB_phoneOk(draft.phone.trim()) ? '手机号格式不正确' : '');
      if (errs.company) return mToast(errs.company, 'warning');
      if (errs.contact) return mToast(errs.contact, 'warning');
      if (errs.phone) return mToast(errs.phone, 'error');
      const l = {
        no: MSB_nextLeadNo(), name: extShort(draft.company.trim()) + ' ' + draft.need, company: draft.company.trim(),
        contact: draft.contact.trim(), phone: draft.phone.trim(), source: draft.source, need: draft.need,
        amount: Number(draft.amount) || 0, status: '新建', owner: MSA_OWNER, next: '', created: msaNowTime(),
      };
      if (dup.value) l.dup = dup.value;
      store.leads.unshift(l);
      msaLog('线索', '新建', '移动端新建线索 ' + l.no + '（' + l.company + '）');
      mToast('线索已创建：' + l.no + (dup.value ? '（已提示可能重复，转化前请核对）' : ''), 'success');
      setTimeout(() => mgo('leads'), 500);
    };
    return { draft, dup, errs, save, sources: ['官网', '广告', '渠道', '活动', '转介绍', '电话营销'], needs: ['CRM 软件', 'ERP 对接', 'MES 系统', '服务工单', 'BI 数据平台', '会员运营', '渠道代理', '实施服务'] };
  },
  template: `<div class="m-page">
    <div class="m-note"><el-icon><InfoFilled/></el-icon><span>快速录入线索：带 * 为必填；重复的公司或手机号会给出提示，转化前请核对关联已有客户。</span></div>
    <div class="m-note warn" v-if="dup"><el-icon><WarningFilled/></el-icon><span>重复提示：与已有{{ dup.type }}「{{ dup.ref }}」{{ dup.why }}，保存后仍可继续跟进。</span></div>
    <m-card title="新线索">
      <m-form>
        <m-field label="公司名称" required :hint="errs.company"><el-input v-model="draft.company" placeholder="请输入公司全称"/></m-field>
        <m-field label="联系人" required :hint="errs.contact"><el-input v-model="draft.contact" placeholder="姓名，如 王经理"/></m-field>
        <m-field label="联系手机" required :hint="errs.phone || '支持掩码格式 1xx****xxxx'"><el-input v-model="draft.phone" placeholder="如 139****1234"/></m-field>
        <m-field label="来源"><el-select v-model="draft.source" style="width:100%"><el-option v-for="s in sources" :key="s" :value="s"/></el-select></m-field>
        <m-field label="需求类型"><el-select v-model="draft.need" style="width:100%"><el-option v-for="s in needs" :key="s" :value="s"/></el-select></m-field>
        <m-field label="预计金额（元）"><el-input-number v-model="draft.amount" :min="0" :step="10000" :controls="false" style="width:100%" placeholder="如 150000"/></m-field>
      </m-form>
    </m-card>
    <el-button type="primary" style="width:100%" @click="save">保存线索</el-button>
  </div>`,
};

/* ========== 2. 商机 ========== */
const MSBOppsScreen = {
  components: { MTag, MEmpty, MCard, MSearch },
  setup() {
    const kw = ref(''); const st = ref(STAGES[0].key);
    const segs = STAGES.map(s => ({ k: s.key, name: s.name, n: store.opps.filter(o => o.stage === s.key).length }));
    const filtered = computed(() => store.opps.filter(o => o.stage === st.value && (!kw.value.trim() || (o.name + o.customer + o.no).includes(kw.value.trim()))).sort((a, b) => b.amount - a.amount));
    const opened = computed(() => store.opps.filter(o => o.stage !== 'close').length);
    const amountSum = computed(() => filtered.value.reduce((s, o) => s + o.amount, 0));
    const wSum = computed(() => filtered.value.filter(o => o.stage !== 'close').reduce((s, o) => s + wAmount(o), 0));
    return { kw, st, segs, filtered, MSB_stageName, mpush, money: msaMoney, opened, amountSum, wSum, prob: o => o.prob };
  },
  template: `<div class="m-page">
    <m-search v-model="kw" placeholder="搜索商机：名称 / 客户 / 编号"/>
    <div class="m-seg m-seg-scroll">
      <span v-for="s in segs" :key="s.k" :class="{on:st===s.k}" @click="st=s.k">{{ s.name }}<i v-if="s.n">{{ s.n }}</i></span>
    </div>
    <div class="m-result-tip">跟进中商机 {{ opened }} 个 · 当前阶段预计金额 {{ amountSum ? money(amountSum / 10000 * 10000) : '¥0' }}<template v-if="st !== 'close'"> · 加权预测 {{ wSum ? money(wSum) : '¥0' }}</template></div>
    <m-empty v-if="!filtered.length" text="该阶段暂无商机" icon="TrendCharts"/>
    <div class="m-card" v-else>
      <div class="m-list-item" v-for="o in filtered" :key="o.no" @click="mpush('opp-detail', {no:o.no})">
        <div class="m-ava"><el-icon><TrendCharts/></el-icon></div>
        <div style="flex:1;min-width:0">
          <div class="m-ellipsis" style="font-weight:600">{{ o.name }}</div>
          <div class="muted m-ellipsis" style="font-size:12px">{{ o.customer }} · {{ o.owner }} · 预计 {{ o.date }}</div>
        </div>
        <div style="text-align:right"><div class="m-money">{{ money(o.amount) }}</div><div class="muted" style="font-size:11px">赢率 {{ o.stage==='close' ? (o.result==='赢单'?100:0) : o.prob }}%</div></div>
      </div>
    </div>
  </div>`,
};

const MSBOppDetailScreen = {
  components: { MCard, MTag, MEmpty, MCell },
  props: { no: String },
  setup(props) {
    const opp = computed(() => store.opps.find(o => o.no === props.no));
    const idx = computed(() => opp.value ? STAGE_IDX[opp.value.stage] : 0);
    const history = computed(() => (opp.value ? opp.value.history || [] : []));
    const infoRows = computed(() => opp.value ? Object.entries(opp.value.info || {}) : []);
    const lost = computed(() => opp.value.loseReason || '');
    return { opp, idx, history, infoRows, lost, STAGES, STAGE_IDX, MSB_stageName, mpush, mgo, mToast, money: msaMoney, yuan };
  },
  template: `<div class="m-page">
    <m-empty v-if="!opp" text="商机不存在或已被删除" icon="TrendCharts"/>
    <template v-else>
      <m-card>
        <div class="m-cust-head">
          <div class="m-cust-logo"><el-icon><TrendCharts/></el-icon></div>
          <div style="flex:1;min-width:0">
            <div class="m-cust-name">{{ opp.name }}</div>
            <div class="m-cust-meta">{{ opp.no }} · {{ opp.customer }}</div>
            <div style="margin-top:6px;display:flex;align-items:center;gap:6px">
              <m-tag :type="opp.stage==='close'?(opp.result==='赢单'?'success':'danger'):'warning'" :text="opp.stage==='close' ? opp.result : MSB_stageName(opp.stage)"/>
              <m-tag type="info" :text="'赢率 ' + opp.prob + '%'"/>
            </div>
          </div>
        </div>
        <div class="m-stg-bar">
          <template v-for="(s, i) in STAGES" :key="s.key">
            <i :class="{past:i<idx, cur:i===idx}"></i>
            <el-icon v-if="i < STAGES.length-1" style="color:var(--sub);font-size:9px"><right/></el-icon>
          </template>
        </div>
        <div class="muted" style="font-size:11px;text-align:center">当前阶段：{{ opp.stage==='close' ? opp.result : MSB_stageName(opp.stage) }}</div>
      </m-card>
      <div class="m-action-row">
        <el-button v-if="opp.stage!=='close'" type="primary" icon="Promotion" @click="mpush('opp-stage', {no:opp.no})">阶段更新</el-button>
        <el-button size="small" icon="OfficeBuilding" @click="mgo('customers')">查看客户</el-button>
        <el-button size="small" icon="EditPen" @click="mpush('followup-new', {customer:opp.customer, opp:opp.no})">写跟进</el-button>
      </div>
      <m-card title="基本信息">
        <m-cell label="预计金额" :value="money(opp.amount)" :arrow="false"/>
        <m-cell label="预计成交日期" :value="opp.date" :arrow="false"/>
        <m-cell label="负责人" :value="opp.owner" :arrow="false"/>
        <m-cell v-if="lost" label="输单原因" :value="lost" :arrow="false"/>
        <m-cell v-for="r in infoRows" :key="r[0]" :label="r[0]" :value="String(r[1])" :arrow="false"/>
      </m-card>
      <m-card title="阶段变更记录">
        <m-empty v-if="!history.length" text="暂无阶段变更（创建时进入当前阶段）" icon="Promotion"/>
        <div v-for="(h, i) in history" :key="i" class="m-flow-row">
          <span class="m-flow-dot done"></span>
          <div style="flex:1"><div>{{ h.from }} → {{ h.to }}</div><div class="muted" style="font-size:12px">{{ h.by }} · {{ h.time }}<template v-if="h.remark && h.remark!=='-'"> · 备注 {{ h.remark }}</template></div></div>
        </div>
      </m-card>
    </template>
  </div>`,
};

const MSBOppStageScreen = {
  components: { MCard, MField, MForm, MEmpty, MCell },
  props: { no: String },
  setup(props) {
    const opp = computed(() => store.opps.find(o => o.no === props.no));
    const allowed = computed(() => opp.value && opp.value.stage !== 'close' ? STAGES.slice(STAGE_IDX[opp.value.stage] + 1) : []);
    const sel = ref('');
    watch(opp, o => { if (o && !sel.value) sel.value = STAGES[STAGE_IDX[o.stage] + 1] ? STAGES[STAGE_IDX[o.stage] + 1].key : ''; }, { immediate: true });
    const form = reactive({ remark: '' });
    const mode = ref('win');
    const rule = computed(() => sel.value === 'close' ? STAGE_RULES[mode.value] : STAGE_RULES[sel.value]);
    watch([sel, mode], () => {
      const o = opp.value; if (!o || !sel.value) return;
      const k = sel.value === 'close' ? mode.value : sel.value;
      const r = STAGE_RULES[k];
      (r && r.fields ? r.fields : []).forEach(f => { if (!(f.k in form)) form[f.k] = (o.info || {})[f.k] || ''; });
    }, { immediate: true });
    const failed = ref('');
    const checkOk = c => !!(opp.value && opp.value.flags && opp.value.flags[c.k]);
    const confirm = () => {
      const o = opp.value; if (!o || !sel.value) return;
      failed.value = '';
      const cur = STAGE_IDX[o.stage], tgt = STAGE_IDX[sel.value];
      if (tgt - cur > 1) return mToast('禁止跳阶段：只允许推进到相邻下一阶段', 'error');
      const r = rule.value; let bad = false;
      (r.fields || []).forEach(f => { if (!String(form[f.k] || '').trim() && f.k !== 'competitor') { failed.value = '请填写「' + f.label + '」（' + r.title + '阶段必填）'; bad = true; } });
      (r.checks || []).forEach(c => { if (!checkOk(c)) { failed.value = '系统检查未满足：' + c.label + '（' + c.hint + '）'; bad = true; } });
      if (bad) return mToast(failed.value || '不满足进入条件，无法推进', 'error');
      const from = MSB_stageName(o.stage);
      const to = sel.value === 'close' ? (mode.value === 'win' ? '赢单' : '输单') : MSB_stageName(sel.value);
      o.info = Object.assign({}, o.info, form, { remark: undefined });
      if (sel.value === 'close') {
        o.result = to; o.prob = to === '赢单' ? 100 : 0; o.flags = Object.assign({}, o.flags, { contractApproved: to === '赢单' ? true : (o.flags || {}).contractApproved });
        if (to === '输单') o.loseReason = form.loseReason || '未填写（移动端）';
      } else { o.prob = STAGES[tgt].prob; }
      o.stage = sel.value;
      o.history = (o.history || []).concat([{ from, to, by: MSA_OWNER, time: msaNowTime(), remark: form.remark || '-' }]);
      msaLog('商机', '阶段变更', o.no + '（' + o.name + '）：' + from + ' → ' + to);
      mToast('阶段已变更：' + from + ' → ' + to, 'success');
      setTimeout(() => mback(), 500);
    };
    const isCur = () => !!failed.value;
    return { opp, allowed, sel, mode, form, rule, confirm, failed, checkOk, MSB_stageName, mToast, money: msaMoney, STAGE_IDX };
  },
  template: `<div class="m-page">
    <m-empty v-if="!opp" text="商机不存在或已被删除" icon="TrendCharts"/>
    <template v-else>
      <m-card>
        <div style="font-weight:600;margin-bottom:4px">{{ opp.name }}</div>
        <m-cell label="当前阶段" :value="opp.stage==='close' ? (opp.result || '') : MSB_stageName(opp.stage)" :arrow="false"/>
      </m-card>
      <m-card v-if="!allowed.length" title="无法推进"><div class="m-text">该商机已经结束并归档（{{ opp.result }}），不能再更新阶段。</div></m-card>
      <template v-else>
        <m-card title="选择目标阶段">
          <div class="m-chip-row">
            <span v-for="s in allowed" :key="s.key" class="m-chip" :class="{on:sel===s.key}" @click="sel=s.key">{{ s.name }}</span>
          </div>
          <template v-if="sel==='close'">
            <m-field label="成交结果" required hint="赢单需先通过合同审批；输单必须填写原因">
              <div class="m-chip-row" style="margin:0">
                <span class="m-chip" :class="{on:mode==='win'}" @click="mode='win';failed=''">赢单</span>
                <span class="m-chip" :class="{on:mode==='lose'}" @click="mode='lose';failed=''">输单</span>
              </div>
            </m-field>
          </template>
        </m-card>
        <m-card :title="'进入「' + (sel==='close' ? (mode==='win'?'赢单':'输单') : MSB_stageName(sel)) + '」的必填信息'">
          <div class="m-note warn" v-if="failed"><el-icon><CircleCloseFilled/></el-icon><span>{{ failed }}</span></div>
          <m-form>
            <template v-if="rule && (rule.fields||[]).length">
              <m-field v-for="f in rule.fields" :key="f.k" :label="f.label" :required="f.k!=='competitor'">
                <el-input v-if="f.type==='input'" v-model="form[f.k]" :placeholder="f.ph || '请填写'"/>
                <el-input v-else-if="f.type==='textarea'" v-model="form[f.k]" type="textarea" :rows="2" placeholder="请填写"/>
                <el-date-picker v-else-if="f.type==='date'" v-model="form[f.k]" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%"/>
                <el-select v-else v-model="form[f.k]" style="width:100%" placeholder="请选择"><el-option v-for="x in f.opts" :key="x" :value="x"/></el-select>
              </m-field>
            </template>
            <template v-if="rule && (rule.checks||[]).length">
              <div v-for="c in rule.checks" :key="c.k" class="m-flow-row">
                <span class="m-flow-dot" :class="checkOk(c)?'done':'rej'"></span>
                <div style="flex:1"><div>{{ c.label }}</div><div class="muted" style="font-size:12px">系统校验：{{ checkOk(c) ? '已满足' : '未满足 — ' + c.hint }}</div></div>
              </div>
            </template>
            <m-field label="变更备注"><el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填，将写入阶段变更记录"/></m-field>
          </m-form>
        </m-card>
        <el-button type="primary" style="width:100%" @click="confirm">确认变更</el-button>
      </template>
    </template>
  </div>`,
};

/* ========== 3. 跟进记录 ========== */
const MSBFollowupNewScreen = {
  components: { MForm, MField, MCard, MEmpty },
  props: { customer: String, opp: String },
  setup(props) {
    const draft = reactive({ customer: props.customer || '', opp: props.opp || '', type: '电话', content: '', feedback: '', next: '' });
    const customers = computed(() => store.customers.filter(c => c.owner));
    const opps = computed(() => draft.customer ? store.opps.filter(o => o.customer === draft.customer) : []);
    const contact = computed(() => draft.customer ? ((store.ext.contacts || []).filter(c => c.customer === draft.customer)[0] || {}).name || '' : '');
    const photo = ref('');
    const mAuth = k => { try { return !!(JSON.parse(localStorage.getItem('crm_m_auth') || '{}') || {})[k]; } catch (e) { return false; } };
    const voice = () => {
      if (!mAuth('mic')) return mToast('未开启麦克风授权：请到「我的 → 隐私与授权」开启后再使用语音转文字（不会采集音频）', 'warning');
      mToast('语音转文字为演示占位，正式版本接入语音识别服务', 'info');
    };
    const takePhoto = () => {
      if (!photo.value && !mAuth('album')) return mToast('未开启相册 / 拍照授权：请到「我的 → 隐私与授权」开启后再上传照片', 'warning');
      photo.value = photo.value ? '' : 'followup-' + (draft.customer || '客户') + '.jpg'; mToast(photo.value ? '已拍照（演示占位）' : '已移除照片', 'success');
    };
    const submitting = ref(false);
    const save = () => {
      if (!draft.customer) return mToast('请选择客户', 'warning');
      if (!draft.content.trim()) return mToast('请填写跟进内容', 'warning');
      submitting.value = true;
      const no = msaActNo();
      store.ext.activities.unshift({
        no, type: draft.type, customer: draft.customer, contact: contact.value, opp: draft.opp || '', owner: MSA_OWNER,
        time: msaNowTime(), content: draft.content.trim(), feedback: draft.feedback.trim(), next: draft.next,
        status: '已完成', checkin: null,
      });
      const cu = store.customers.find(c => c.name === draft.customer);
      if (cu) cu.lastFollow = TODAY;
      msaLog('活动', '新增跟进', '移动端写跟进（' + draft.customer + '，类型：' + draft.type + '）');
      mToast('跟进记录已保存：' + no, 'success');
      setTimeout(() => { submitting.value = false; mback(); }, 500);
    };
    return { draft, customers, opps, contact, photo, voice, takePhoto, save, submitting, types: MSA_ACT_TYPES };
  },
  template: `<div class="m-page">
    <m-card title="写跟进">
      <m-form>
        <m-field label="客户" required>
          <el-select v-model="draft.customer" filterable placeholder="选择客户" style="width:100%" @change="draft.opp=''">
            <el-option v-for="c in customers" :key="c.no" :label="c.name" :value="c.name"/>
          </el-select>
        </m-field>
        <m-field label="关联商机" :hint="draft.customer ? '' : '先选择客户后可选商机'">
          <el-select v-model="draft.opp" clearable placeholder="可选" style="width:100%">
            <el-option v-for="o in opps" :key="o.no" :label="o.name" :value="o.no"/>
          </el-select>
        </m-field>
        <m-field label="跟进类型">
          <el-select v-model="draft.type" style="width:100%"><el-option v-for="t in types" :key="t" :value="t"/></el-select>
        </m-field>
        <m-field label="跟进内容" required><el-input v-model="draft.content" type="textarea" :rows="3" placeholder="本次沟通内容与结论"/></m-field>
        <m-field label="客户反馈"><el-input v-model="draft.feedback" type="textarea" :rows="2" placeholder="客户的反应与态度（选填）"/></m-field>
        <m-field label="下一步计划时间"><el-date-picker v-model="draft.next" type="datetime" value-format="YYYY-MM-DD HH:mm" placeholder="选填" style="width:100%"/></m-field>
        <div class="m-filebtns">
          <el-button size="small" icon="Microphone" @click="voice">语音转文字</el-button>
          <el-button size="small" :icon="photo ? 'Delete' : 'Camera'" @click="takePhoto">{{ photo ? '移除照片' : '拍照上传（占位）' }}</el-button>
        </div>
        <div v-if="photo" class="m-photo">已附照片：{{ photo }}</div>
      </m-form>
    </m-card>
    <el-button type="primary" style="width:100%" :loading="submitting" @click="save">保存跟进</el-button>
  </div>`,
};

const MSBFollowupsScreen = {
  components: { MSearch, MTag, MEmpty, MCard },
  setup() {
    const kw = ref(''); const cust = ref('');
    const custs = computed(() => {
      const set = new Map();
      store.ext.activities.forEach(a => { const c = a.customer || ''; if (!c) return; set.set(c, (set.get(c) || 0) + 1); });
      return [...set.keys()].sort((a, b) => (set.get(b) - set.get(a)));
    });
    const rows = computed(() => {
      let a = store.ext.activities.slice();
      if (cust.value) a = a.filter(x => x.customer === cust.value);
      if (kw.value.trim()) a = a.filter(x => (x.customer + x.content + x.contact + x.type).includes(kw.value.trim()));
      return a.sort((x, y) => (x.time < y.time ? 1 : -1));
    });
    return { kw, cust, custs, rows, mpush, money: msaMoney };
  },
  template: `<div class="m-page">
    <m-search v-model="kw" placeholder="搜索跟进：客户 / 内容 / 联系人"/>
    <div class="m-form" style="margin-bottom:10px">
      <m-field label="按客户筛选">
        <el-select v-model="cust" filterable clearable placeholder="全部客户" style="width:100%">
          <el-option v-for="c in custs" :key="c" :label="c" :value="c"/>
        </el-select>
      </m-field>
    </div>
    <div class="m-result-tip">共 {{ rows.length }} 条跟进记录{{ cust ? '（' + cust + '）' : '' }}</div>
    <m-empty v-if="!rows.length" text="暂无跟进记录" icon="ChatDotRound"/>
    <div class="m-card" v-else>
      <div class="m-list-item" v-for="a in rows" :key="a.no" @click="mpush('visit-detail', {no:a.no})">
        <div class="m-ava">{{ a.customer.slice(0, 1) }}</div>
        <div style="flex:1;min-width:0">
          <div class="m-ellipsis" style="font-weight:600">{{ a.customer }}</div>
          <div class="muted m-ellipsis" style="font-size:12px">{{ a.time.slice(5, 16) }} · {{ a.type }} · {{ a.content }}</div>
        </div>
        <m-tag :type="a.status==='已完成'?'success':'warning'" :text="a.status"/>
      </div>
    </div>
  </div>`,
};

/* ========== 4. 审批 ========== */
const MSBApprovalsScreen = {
  components: { MTag, MEmpty, MCard },
  setup() {
    const seg = ref('todo');
    const segs = [['todo', '待我审批'], ['mine', '我发起的'], ['done', '已处理']];
    const todo = computed(() => store.approvals.filter(a => a.tab === 'todo'));
    const mine = computed(() => store.approvals.filter(a => a.tab === 'mine' || a.applicant === MSA_OWNER));
    const done = computed(() => store.approvals.filter(a => a.tab === 'done'));
    const rows = computed(() => seg.value === 'todo' ? todo.value : (seg.value === 'mine' ? mine.value : done.value));
    const counts = computed(() => ({ todo: todo.value.length, mine: mine.value.length, done: done.value.length }));
    const statusTxt = a => a.tab === 'todo' ? '待审批' : (a.result || '已处理');
    const statusTag = a => a.tab === 'todo' ? 'warning' : ((a.result || '').indexOf('同意') >= 0 ? 'success' : 'danger');
    return { seg, segs, rows, counts, statusTxt, statusTag, mpush, moneyC: msaMoneyC, todo };
  },
  template: `<div class="m-page">
    <div class="m-seg m-seg-scroll">
      <span v-for="s in segs" :key="s[0]" :class="{on:seg===s[0]}" @click="seg=s[0]">{{ s[1] }}<i v-if="counts[s[0]]">{{ counts[s[0]] }}</i></span>
    </div>
    <m-empty v-if="!rows.length" text="该分段暂无审批单" icon="Finished"/>
    <div class="m-card" v-else>
      <div class="m-list-item" style="align-items:flex-start" v-for="a in rows" :key="a.id" @click="mpush('approval-detail', {id:a.id})">
        <div style="flex:1;min-width:0">
          <div class="m-ellipsis" style="font-weight:600">{{ a.title }}</div>
          <div class="muted m-ellipsis" style="font-size:12px">{{ a.applicant }} · {{ a.dept }} · {{ a.time }}</div>
        </div>
        <div style="text-align:right;flex:none"><div class="m-money" style="font-size:12px">{{ a.amount ? moneyC(a.amount) : '-' }}</div><m-tag :type="statusTag(a)" :text="statusTxt(a)"/></div>
      </div>
    </div>
  </div>`,
};

const MSBApprovalDetailScreen = {
  components: { MCard, MTag, MEmpty, MCell, MActionSheet },
  props: { id: String },
  setup(props) {
    const a = computed(() => store.approvals.find(x => x.id === props.id));
    const curNode = computed(() => a.value ? (a.value.nodes || []).findIndex(n => n.st === 'cur') : -1);
    const advance = (actLabel, opText, resultTxt) => {
      const av = a.value; const i = curNode.value;
      if (i >= 0) { (av.nodes)[i].st = 'done'; (av.nodes)[i].t = msaNowTime().slice(5); let nx = -1;
        for (let j = i + 1; j < av.nodes.length; j++) { if (av.nodes[j].st === 'wait' || av.nodes[j].st === 'skip') { nx = j; break; } }
        if (nx >= 0 && av.nodes[nx].p) av.nodes[nx].st = 'cur';
      }
      av.history.push({ who: MSA_OWNER, act: actLabel, op: opText, t: msaNowTime().slice(5) });
      av.tab = 'done'; av.result = resultTxt;
      msaLog('审批', actLabel, '移动端处理审批 ' + av.id + '：' + resultTxt);
    };
    const agree = () => {
      if (!a.value || a.value.tab !== 'todo') return;
      advance('同意', '移动端同意。', '已同意');
      mToast('已同意该审批，待办已更新', 'success');
      setTimeout(() => mback(), 500);
    };
    const promptReason = label => ElMessageBox.prompt('请填写' + label + '原因（必填）：', label + '审批', { confirmButtonText: '确认' + label, cancelButtonText: '取消', inputPattern: /\S+/, inputErrorMessage: '原因不能为空' });
    const reject = () => { if (!a.value || a.value.tab !== 'todo') return; promptReason('拒绝').then(({ value }) => {
      advance('拒绝', '移动端拒绝，原因：' + value, '已拒绝');
      mToast('已拒绝该审批', 'warning'); setTimeout(() => mback(), 500);
    }).catch(() => {}); };
    const back = () => { if (!a.value || a.value.tab !== 'todo') return; promptReason('退回').then(({ value }) => {
      advance('退回', '移动端退回修改，原因：' + value, '已退回修改');
      mToast('已退回该审批，待申请人修改后重新提交', 'warning'); setTimeout(() => mback(), 500);
    }).catch(() => {}); };
    const transfer = () => { if (!a.value || a.value.tab !== 'todo') return; sheet.value = true; };
    const sheet = ref(false);
    const users = computed(() => store.ext.users.filter(u => u.status === '启用' && u.name !== MSA_OWNER).map(u => ({ label: u.name + ' · ' + u.dept, key: u.name })));
    const doTransfer = u => {
      const av = a.value; const i = curNode.value;
      if (i >= 0) {
        av.nodes[i].p = u.key;
        av.history.push({ who: MSA_OWNER, act: '转交', op: '转交给 ' + u.key + '，由其继续审批。', t: msaNowTime().slice(5) });
        msaLog('审批', '转交', '移动端审批 ' + av.id + ' 转交给 ' + u.key);
        mToast('已转交给 ' + u.key + '，该审批仍在待我审批中', 'success');
      }
    };
    return { a, curNode, agree, reject, back, transfer, sheet, users, doTransfer, mback, mToast, moneyC: msaMoneyC };
  },
  template: `<div class="m-page">
    <m-empty v-if="!a" text="审批单不存在或已处理" icon="Finished"/>
    <template v-else>
      <m-card>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><b style="font-size:16px">{{ a.type }}</b><m-tag :type="a.tab==='todo'?'warning':((a.result||'').indexOf('同意')>=0?'success':'danger')" :text="a.tab==='todo'?'待审批':(a.result||'已处理')"/></div>
        <div style="font-weight:600;margin-bottom:8px">{{ a.title }}</div>
        <m-cell label="申请人" :value="a.applicant + ' · ' + a.dept" :arrow="false"/>
        <m-cell label="业务对象" :value="a.biz" :arrow="false"/>
        <m-cell label="金额" :value="a.amount ? moneyC(a.amount) : '-'" :arrow="false"/>
        <m-cell label="提交时间" :value="a.time" :arrow="false"/>
      </m-card>
      <m-card title="申请内容">
        <div v-for="(s, i) in a.summary" :key="i" class="m-sum-row"><span class="muted">{{ s[0] }}</span><span>{{ s[1] }}</span></div>
      </m-card>
      <m-card title="审批流程节点">
        <div v-for="(n, i) in a.nodes" :key="i" class="m-flow-row"><span class="m-flow-dot" :class="n.st"></span><div style="flex:1"><div>{{ n.n }}</div><div class="muted" style="font-size:12px">{{ n.p || '-' }}<template v-if="n.t"> · {{ n.t }}</template></div></div></div>
      </m-card>
      <m-card title="审批动态">
        <div v-for="(n, i) in a.history" :key="i" class="m-sum-row"><span class="muted">{{ n.who }} · {{ n.act }}</span><span style="flex:1;text-align:right">{{ n.op }}<template v-if="n.t"> · {{ n.t }}</template></span></div>
      </m-card>
      <template v-if="a.tab==='todo'">
        <div class="m-action-row">
          <el-button type="success" style="flex:1" @click="agree">同意</el-button>
          <el-button type="danger" plain style="flex:1" @click="reject">拒绝</el-button>
        </div>
        <div class="m-action-row">
          <el-button type="warning" plain icon="RefreshLeft" style="flex:1" @click="back">退回</el-button>
          <el-button icon="Right" style="flex:1" @click="transfer">转交</el-button>
        </div>
      </template>
      <div v-else class="m-note"><el-icon><InfoFilled/></el-icon><span>该审批已处理（{{ a.result || '已处理' }}），仅可查看。</span></div>
      <m-action-sheet v-model="sheet" title="转交对象（启用中的成员）" :actions="users" @select="doTransfer"/>
    </template>
  </div>`,
};

/* ========== 5. 回款 ========== */
const MSBPaymentsScreen = {
  components: { MSearch, MTag, MEmpty, MCard },
  setup() {
    const st = ref(''); const kw = ref('');
    const plans = computed(() => MSB_payPlans());
    const sum = computed(() => {
      const all = plans.value;
      return {
        contracts: new Set(all.map(p => p.contract)).size,
        amount: all.reduce((s, p) => s + p.amount, 0),
        paid: all.reduce((s, p) => s + p.paid, 0),
        overdue: all.filter(p => MSB_planStatus(p) === '逾期').length,
      };
    });
    const sts = ['全部', '逾期', '未回款', '部分回款', '已回款'];
    const filtered = computed(() => {
      let a = plans.value;
      if (st.value) a = a.filter(p => MSB_planStatus(p) === st.value);
      if (kw.value.trim()) { const k = kw.value.trim(); a = a.filter(p => (p.customer + p.cname + p.contract).includes(k)); }
      return a.sort((x, y) => (x.date < y.date ? -1 : 1));
    });
    const pickSt = s => { st.value = s === '全部' ? '' : s; };
    const planTag = p => ({ 已回款: 'success', 部分回款: 'warning', 逾期: 'danger', 未回款: 'info' })[MSB_planStatus(p)];
    return { st, sts, kw, sum, filtered, pickSt, planTag, MSB_planStatus, mpush, moneyC: msaMoneyC, fmtC };
  },
  template: `<div class="m-page">
    <div class="m-pay-cards">
      <div><b>{{ sum.contracts }}</b><span>合同总数</span></div>
      <div><b>¥{{ (sum.amount/100/10000).toFixed(0) }}万</b><span>应收总额</span></div>
      <div><b>¥{{ (sum.paid/100/10000).toFixed(1) }}万</b><span>已收</span></div>
      <div><b :style="sum.overdue ? 'color:var(--danger)' : ''">{{ sum.overdue }}</b><span>逾期计划</span></div>
    </div>
    <m-search v-model="kw" placeholder="搜索客户 / 合同"/>
    <div class="m-chip-row">
      <span v-for="s in sts" :key="s" class="m-chip" :class="{on:(s==='全部'&&!st)||st===s}" @click="pickSt(s)">{{ s }}</span>
    </div>
    <m-empty v-if="!filtered.length" text="没有匹配的回款计划" icon="Wallet"/>
    <div class="m-card" v-else>
      <div class="m-list-item" v-for="p in filtered" :key="p.contract + p.pid" @click="mpush('payment-detail', {contract:p.contract, id:p.pid})">
        <div style="flex:1;min-width:0">
          <div class="m-ellipsis" style="font-weight:600">{{ p.customer }}</div>
          <div class="m-ellipsis" style="font-size:12px">{{ p.contract }} · {{ p.stage }} · 计划 {{ p.date }}</div>
          <div class="muted" style="font-size:11px;margin-top:2px">已到账 ¥{{ fmtC(p.paid) }} / 计划 ¥{{ fmtC(p.amount) }}</div>
        </div>
        <div style="text-align:right;flex:none">
          <div class="m-money" style="font-size:12px">¥{{ fmtC(p.amount) }}</div>
          <m-tag :type="planTag(p)" :text="MSB_planStatus(p)"/>
        </div>
      </div>
    </div>
  </div>`,
};

const MSBPaymentDetailScreen = {
  components: { MCard, MTag, MEmpty, MCell },
  props: { contract: String, id: String },
  setup(props) {
    const plan = computed(() => MSB_payPlans().find(p => p.contract === props.contract && p.pid === props.id) || null);
    const status = computed(() => plan.value ? MSB_planStatus(plan.value) : '');
    const overdueDays = computed(() => {
      if (!plan.value || status.value !== '逾期') return 0;
      const d1 = new Date(plan.value.date + 'T00:00:00'), d2 = new Date(TODAY + 'T00:00:00');
      return Math.max(1, Math.round((d2 - d1) / 86400000));
    });
    const records = computed(() => plan.value ? store.pay.records.filter(r => r.contract === plan.value.contract).slice().sort((x, y) => (x.date < y.date ? 1 : -1)) : []);
    const allocAmt = r => (r.alloc || []).filter(x => x.plan === plan.value.pid).reduce((s, x) => s + x.amt, 0);
    const percent = computed(() => plan.value ? Math.min(100, Math.round(plan.value.paid * 100 / (plan.value.amount || 1))) : 0);
    return { plan, status, overdueDays, records, allocAmt, percent, TODAY, fmtC, moneyC: msaMoneyC };
  },
  template: `<div class="m-page">
    <m-empty v-if="!plan" text="回款计划不存在" icon="Wallet"/>
    <template v-else>
      <m-card>
        <div class="m-cust-head">
          <div class="m-cust-av m-ava">¥</div>
          <div style="flex:1;min-width:0">
            <div class="m-cust-name">{{ plan.customer }}</div>
            <div class="m-cust-meta">{{ plan.cname }} · {{ plan.contract }}</div>
            <div style="margin-top:6px"><m-tag :type="status==='已回款'?'success':(status==='部分回款'?'warning':(status==='逾期'?'danger':'info'))" :text="status"/></div>
          </div>
        </div>
      </m-card>
      <m-card title="计划明细">
        <m-cell label="回款阶段" :value="plan.stage" :arrow="false"/>
        <m-cell label="计划金额" :value="moneyC(plan.amount)" :arrow="false"/>
        <m-cell label="已收金额" :value="moneyC(plan.paid)" :arrow="false"/>
        <m-cell label="计划日期" :value="plan.date" :arrow="false"/>
        <m-cell v-if="overdueDays" label="逾期天数" :value="overdueDays + ' 天（自 ' + plan.date + ' 起）'" :arrow="false"/>
        <m-cell label="负责人" :value="plan.owner || '-'" :arrow="false"/>
        <div style="margin-top:8px"><el-progress :percentage="percent" :stroke-width="9"/>
          <div class="muted" style="font-size:12px;margin-top:4px">{{ status === '逾期' ? '该计划已逾期 ' + overdueDays + ' 天，请尽快催收并联系财务确认' : '回款进度 ' + percent + '%' }}</div></div>
      </m-card>
      <m-card title="该合同已收记录">
        <m-empty v-if="!records.length" text="该合同暂无已收记录"/>
        <div v-for="r in records" :key="r.id" class="m-list-item">
          <div class="m-ava"><el-icon><Wallet/></el-icon></div>
          <div style="flex:1;min-width:0"><div class="m-ellipsis" style="font-weight:600">{{ r.date }} · {{ r.method }}</div><div class="muted m-ellipsis" style="font-size:12px">{{ r.operator }} · {{ r.confirm }}</div></div>
          <div style="text-align:right"><div class="m-money" style="font-size:12px">¥{{ fmtC(allocAmt(r)) }}</div><m-tag :type="r.confirm==='财务已确认'?'success':'warning'" :text="r.confirm"/></div>
        </div>
      </m-card>
    </template>
  </div>`,
};

/* ========== 6. 服务工单 ========== */
const MSB_TICKET_SEGS = [['待受理', '待受理'], ['待分派', '待分派'], ['处理中', '处理中'], ['待客户确认', '待确认'], ['已解决', '已解决'], ['已关闭', '已关闭'], ['已退回', '已退回']];
const MSBTicketsScreen = {
  components: { MSearch, MTag, MEmpty, MCard },
  setup() {
    const seg = ref('待受理'); const kw = ref('');
    const counts = computed(() => { const m = {}; MSB_TICKET_SEGS.forEach(s => { m[s[0]] = store.ext.tickets.filter(t => t.status === s[0]).length; }); return m; });
    const rows = computed(() => {
      let a = store.ext.tickets.filter(t => t.status === seg.value);
      if (kw.value.trim()) a = a.filter(t => (t.no + t.customer + t.desc + t.type).includes(kw.value.trim()));
      return a.sort((x, y) => (x.created < y.created ? 1 : -1));
    });
    return { seg, kw, counts, rows, MSB_TICKET_SEGS, mpush, sla: t => tkSla(t).k === 'timeout' };
  },
  template: `<div class="m-page">
    <div class="m-seg m-seg-scroll">
      <span v-for="s in MSB_TICKET_SEGS" :key="s[0]" :class="{on:seg===s[0]}" @click="seg=s[0]">{{ s[1] }}<i v-if="counts[s[0]]">{{ counts[s[0]] }}</i></span>
    </div>
    <m-search v-model="kw" placeholder="搜索工单：编号 / 客户 / 描述"/>
    <m-empty v-if="!rows.length" text="该状态下暂无工单" icon="Headset"/>
    <div class="m-card" v-else>
      <div class="m-list-item" style="align-items:flex-start" v-for="t in rows" :key="t.no" @click="mpush('ticket-detail', {no:t.no})">
        <div style="flex:1;min-width:0">
          <div class="m-ellipsis" style="font-weight:600">{{ t.customer }}</div>
          <div class="muted m-ellipsis" style="font-size:12px">{{ t.no }} · {{ t.type }} · {{ t.desc }}</div>
          <div class="muted" style="font-size:11px;margin-top:2px">SLA 截止 {{ t.slaDeadline }}<template v-if="sla(t)">（已超时）</template></div>
        </div>
        <div style="flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <m-tag :type="t.priority==='紧急'?'danger':(t.priority==='高'?'warning':'info')" :text="t.priority"/>
          <m-tag :type="t.status==='已关闭'?'success':(t.status==='处理中'?'info':'warning')" :text="t.status"/>
        </div>
      </div>
    </div>
  </div>`,
};

const MSBTicketDetailScreen = {
  components: { MCard, MTag, MEmpty, MCell },
  props: { no: String },
  setup(props) {
    const t = computed(() => store.ext.tickets.find(x => x.no === props.no) || null);
    const records = computed(() => [...((t.value || {}).records || [])].sort((a, b) => (a.time > b.time ? 1 : -1)));
    const canAct = computed(() => ['待受理', '处理中'].includes((t.value || {}).status));
    const take = () => {
      const w = t.value;
      if (!w || w.status !== '待受理') return;
      w.handler = w.handler || '客服-小陈';
      w.status = '处理中';
      w.records.push({ time: msaNowTime(), who: w.handler, act: '受理', note: '移动端受理并指派处理人，已按 SLA 启动处理' });
      msaLog('工单', '受理', '移动端受理并指派 ' + w.no + '（处理人：' + w.handler + '）');
      mToast('已受理并指派处理人，状态变为「处理中」', 'success');
    };
    return { t, records, canAct, take, sla: () => t.value ? tkSla(t.value) : { k: 'none', txt: '-' }, mpush, mback, mToast };
  },
  template: `<div class="m-page">
    <m-empty v-if="!t" text="工单不存在" icon="Headset"/>
    <template v-else>
      <m-card>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><b style="font-size:16px">{{ t.type }}</b><m-tag :type="t.priority==='紧急'?'danger':(t.priority==='高'?'warning':'info')" :text="t.priority"/><m-tag :type="t.status==='已关闭'?'success':(t.status==='处理中'?'info':'warning')" :text="t.status"/></div>
        <div class="muted" style="font-size:12px;margin-bottom:8px">{{ t.no }} · 提交于 {{ t.created }}</div>
        <div class="m-text">{{ t.desc }}</div>
      </m-card>
      <div class="m-action-row" v-if="canAct">
        <el-button v-if="t.status==='待受理'" type="primary" style="flex:1" icon="Pointer" @click="take">受理</el-button>
        <el-button v-if="t.status==='处理中'" type="primary" style="flex:1" icon="EditPen" @click="mpush('ticket-handle', {no:t.no})">处理并提交确认</el-button>
      </div>
      <m-card title="基本信息">
        <m-cell label="客户" :value="t.customer" :arrow="false"/>
        <m-cell label="联系人" :value="t.contact || '-'" :arrow="false"/>
        <m-cell label="处理人" :value="t.handler || '待分配'" :arrow="false"/>
        <m-cell label="SLA 截止" :value="t.slaDeadline" :arrow="false"/>
        <m-cell v-if="t.images.length" label="现场图片" :value="t.images.length + ' 张（在处理提交时上传）'" :arrow="false"/>
      </m-card>
      <m-card title="处理记录">
        <m-empty v-if="!records.length" text="暂无处理记录" icon="Tickets"/>
        <div v-for="(r, i) in records" :key="i" class="m-flow-row">
          <span class="m-flow-dot" :class="r.act==='受理'?'':(r.act==='客户确认'?'done':'cur')"></span>
          <div style="flex:1"><div><b>{{ r.act }}</b> <span class="muted" style="font-size:12px">{{ r.who || '系统' }}</span></div>
            <div class="muted" style="font-size:12px">{{ r.time }}</div>
            <div class="m-text" style="font-size:12px">{{ r.note }}</div></div>
        </div>
      </m-card>
    </template>
  </div>`,
};

const MSBTicketHandleScreen = {
  components: { MCard, MField, MForm, MEmpty },
  props: { no: String },
  setup(props) {
    const t = computed(() => store.ext.tickets.find(x => x.no === props.no) || null);
    const note = ref('');
    const photos = ref([]);
    const fileEl = ref(null);
    const uploading = ref(false);
    const onFiles = ev => {
      const files = Array.from(ev.target.files || []);
      ev.target.value = '';
      if (!files.length) return;
      for (const f of files) {
        if (photos.value.length >= 3) { mToast('最多上传 3 张图片', 'warning'); break; }
        const fr = new FileReader();
        fr.onload = () => {
          photos.value.push({ name: f.name, url: fr.result });
          mToast('图片已选定：' + f.name + '（' + photos.value.length + '/3）', 'success');
        };
        fr.readAsDataURL(f);
      }
    };
    const remove = p => { photos.value = photos.value.filter(x => x !== p); };
    const submitting = ref(false);
    const submit = () => {
      const w = t.value;
      if (!w) return;
      if (!note.value.trim()) return mToast('处理说明为必填，请填写本次处理内容', 'warning');
      if (w.status !== '处理中') return mToast('当前状态不可提交处理', 'warning');
      submitting.value = true;
      w.records.push({ time: msaNowTime(), who: w.handler || '客服-小陈', act: '处理', note: note.value.trim() + (photos.value.length ? '；附现场图片 ' + photos.value.length + ' 张' : '') + '；状态 → 待客户确认' });
      if (photos.value.length) w.images = (w.images || []).concat(photos.value.map(p => p.name)).slice(0, 3);
      w.status = '待客户确认';
      msaLog('工单', '处理', '移动端处理工单 ' + w.no + '，提交客户确认（说明：' + note.value.trim().slice(0, 20) + '）');
      mToast('已提交客户确认，状态变为「待客户确认」', 'success');
      setTimeout(() => { submitting.value = false; mback(); }, 600);
    };
    return { t, note, photos, fileEl, onFiles, remove, submit, uploading, submitting };
  },
  template: `<div class="m-page">
    <m-empty v-if="!t" text="工单不存在" icon="Headset"/>
    <template v-else>
      <m-card title="处理工单">
        <div class="muted" style="font-size:12px;margin-bottom:8px">{{ t.no }} · {{ t.customer }} · 当前状态：{{ t.status }}</div>
        <m-form>
          <m-field label="处理说明" required hint="提交后工单进入「待客户确认」，客户确认后关闭"><el-input v-model="note" type="textarea" :rows="4" placeholder="填写本次处理过程与结果"/></m-field>
        </m-form>
        <m-field label="上传图片（最多 3 张）">
          <div class="m-thumbs">
            <div class="m-thumb" v-for="p in photos" :key="p.name"><img :src="p.url"/><span class="m-thumb-x" @click="remove(p)">×</span></div>
            <label class="m-file-add" v-if="photos.length < 3">
              <el-icon style="font-size:22px"><Camera/></el-icon>
              <span>拍照 / 相册</span>
              <input class="m-file-input" type="file" accept="image/*" multiple @change="onFiles"/>
            </label>
          </div>
        </m-field>
      </m-card>
      <el-button type="primary" style="width:100%" :loading="submitting" @click="submit">提交处理结果</el-button>
    </template>
  </div>`,
};

/* ========== 7. 通知 ========== */
const MSBNoticesScreen = {
  components: { MTag, MEmpty, MCard },
  setup() {
    const cat = ref('');
    const cats = [['全部', ''], ['跟进', '跟进'], ['审批', '审批'], ['逾期', '逾期'], ['分配', '分配'], ['到期', '到期']];
    const rows = computed(() => {
      let a = store.messages.slice();
      if (cat.value) a = a.filter(m => m.type.includes(cat.value));
      return a.sort((x, y) => (x.time < y.time ? 1 : -1));
    });
    const unread = computed(() => store.messages.filter(m => !m.read).length);
    const jump = m => {
      m.read = true;
      if (m.type.includes('审批')) {
        const mm = String(m.title || '').match(/SP-\d{4}-\d{4}/);
        const av = mm && store.approvals.find(x => x.id === mm[0]);
        return av ? mpush('approval-detail', { id: av.id }) : mgo('approvals');
      }
      if (m.type.includes('分配')) return mgo('leads');
      if (m.type.includes('逾期')) return mgo('payments');
      if (m.type.includes('到期')) return mgo('payments');
      if (m.type.includes('跟进')) return mgo('todo', { seg: 'follow' });
      return mgo('home');
    };
    const readAll = () => { store.messages.forEach(m => m.read = true); mToast('已全部标记为已读', 'success'); };
    return { cat, cats, rows, unread, jump, readAll, mToast };
  },
  template: `<div class="m-page">
    <div class="m-chip-row">
      <span v-for="c in cats" :key="c[1]" class="m-chip" :class="{on:(c[1]===''&&!cat)||cat===c[1]}" @click="cat=c[1]">{{ c[0] }}</span>
      <el-button size="small" round style="margin-left:auto" @click="readAll">全部已读</el-button>
    </div>
    <div class="m-result-tip">未读 {{ unread }} 条 · 共 {{ rows.length }} 条</div>
    <m-empty v-if="!rows.length" text="暂无通知" icon="Bell"/>
    <div class="m-card" v-else>
      <div class="m-list-item" v-for="m in rows" :key="m.id" @click="jump(m)">
        <span class="m-msg-dot" :class="{read:m.read}"></span>
        <div style="flex:1;min-width:0">
          <div :class="{muted:m.read}" style="font-weight:600" class="m-ellipsis">{{ m.title }}</div>
          <div class="muted" style="font-size:12px">{{ m.type }} · {{ m.time }}</div>
        </div>
        <m-tag v-if="!m.read" type="danger" text="未读"/>
      </div>
    </div>
  </div>`,
};

/* ========== 需求文档（12 要素） ========== */
const MSB_DOC_PAGES = {
  'm-leads': {
    name: '移动端 · 线索列表', module: '移动端',
    goal: '在移动端集中查看与筛选线索：支持关键词搜索与状态筛选（全部 / 新建 / 跟进中 / 已转化 / 无效），并可快速新建线索、进入线索详情，服务外勤快速处理线索场景。',
    roles: ['销售：查看与跟进本人线索', '销售经理：查看团队线索并分配', '其他角色：按数据权限查看'],
    enter: ['待办 / 消息通知「分配通知」跳转', '我的页「我的线索」入口', 'PC 移动端预览跳转到屏幕'],
    layout: ['顶部搜索框', '状态筛选 chips + 新建按钮', '结果计数提示', '线索卡片列表（首字头像、名称、公司联系人电话、负责人、状态标签）', '加载更多按钮（每次 10 条）'],
    fields: ['搜索关键字｜文本｜说明：编号 / 公司 / 联系人 / 电话模糊匹配', '线索状态｜枚举｜说明：新建 / 跟进中 / 已转化 / 无效', '线索编号｜只读｜格式 XS-年月-序号'],
    rules: ['列表按创建时间倒序', '筛选变化后重置分页', '点击卡片进入线索详情并保留筛选'],
    flow: ['线索列表 → 线索详情 → 转化 / 退回 / 无效 → 列表状态即时更新'],
    errors: ['无匹配结果：空态提示', '无数据：空态引导'],
    api: ['线索分页查询、搜索接口（示例）'],
    accept: ['搜索与筛选即时生效', '数量与 store.leads 一致', '无控制台报错'],
  },
  'm-lead-detail': {
    name: '移动端 · 线索详情', module: '移动端',
    goal: '查看单条线索完整信息并完成核心操作：转化（生成客户 / 联系人 / 商机）、退回公海、标记无效与写跟进，全程写日志留痕。',
    roles: ['负责人销售：转化 / 退回 / 标记无效 / 写跟进', '销售经理：全部分布操作'],
    enter: ['线索列表点击卡片', '消息通知「分配」类跳转'],
    layout: ['头部信息卡（名称 / 公司 / 编号 / 状态与负责人标签）', '操作行：转化 / 写跟进 / 退回公海 / 标记无效', '基本信息卡（字段列表 + 重复提示）', '跟进记录卡'],
    fields: ['公司 / 联系人 / 电话｜只读', '预计金额｜货币｜只读', '重复提示｜只读｜说明：与已有线索 / 客户重复的依据', '转化结果｜只读｜说明：转化后展示客户编号'],
    rules: ['无效 / 已转化线索不可再转化（按钮禁用）', '退回公海负责人清空、状态回「新建」', '标记无效必填原因（弹窗校验）', '转化为客户时如客户已存在只关联并新建商机'],
    flow: ['新建 / 跟进中 → 已转化 / 无效；跟进中 / 新建可退回公海'],
    errors: ['线索不存在：空态', '标记无效原因为空：拦截'],
    api: ['线索详情 / 转化事务 / 分配 / 退回接口（示例）'],
    accept: ['转化真实写入 store.customers、store.opps 与联系人', '状态与操作日志即时更新', '无控制台报错'],
  },
  'm-lead-new': {
    name: '移动端 · 新建线索', module: '移动端',
    goal: '在移动端快速录入线索：公司、联系人、手机、来源、需求类型与预计金额，必填与手机号格式校验，命中重复给出提示。',
    roles: ['销售：录入本人线索', '销售经理：录入并可分配'],
    enter: ['线索列表「新建」按钮', '首页快捷操作「新增线索」', '列表右上角加号'],
    layout: ['顶部录入说明条', '重复提示条（命中时出现）', '表单卡（6 个字段）', '底部保存按钮'],
    fields: ['公司名称｜文本｜必填：是｜校验：与已有客户 / 线索查重', '联系人｜文本｜必填：是', '联系手机｜文本｜必填：是｜校验：11 位明文或 1xx****xxxx 掩码', '来源｜枚举｜默认官网', '需求类型｜枚举｜默认 CRM 软件', '预计金额｜数字｜选填｜≥0'],
    rules: ['必填校验通过才能保存，并给出轻提示', '手机号格式不合法：错误提示并拦截', '命中重复：显示重复提示条，仍允许保存并在线索上写入 dup 字段', '保存后写入 store.leads 并记录操作日志'],
    flow: ['填写 → 校验 → 保存 → 回到线索列表（新线索可见）'],
    errors: ['空必填项 / 手机号非法：轻提示拦截', '重复线索：提示核对'],
    api: ['线索新建、查重接口（示例）'],
    accept: ['校验失败不落库，成功后列表可搜索到新线索', '重复提示准确', '无控制台报错'],
  },
  'm-opps': {
    name: '移动端 · 商机列表', module: '移动端',
    goal: '按商机销售阶段分段浏览商机，支持搜索与切换阶段，进入详情完成阶段更新等操作。',
    roles: ['销售：本人商机推进', '销售经理：团队商机管理'],
    enter: ['首页快捷操作「新增商机」', '我的页「我的商机」'],
    layout: ['顶部搜索框', '阶段分段栏（带数量徽标）', '结果提示（跟进中商机总数 / 当前阶段预计金额）', '商机卡片列表（名称 / 客户 / 负责人 / 金额 / 赢率）'],
    fields: ['阶段｜枚举｜说明：初步接触 → 赢单/输单 6 段', '预计金额｜货币｜只读', '赢率｜百分比｜随阶段自动更新', '预计成交日期｜日期｜只读'],
    rules: ['数据来自 store.opps，分段计数与实数据一致', '已结束商机不参与跟进中总数', '点击卡片进入商机详情'],
    flow: ['商机列表 → 商机详情 → 阶段更新 → 列表所属分段变化'],
    errors: ['无商机阶段：空态提示'],
    api: ['商机分阶段查询（示例）'],
    accept: ['各分段数量与真实数据一致', '金额合计正确', '无控制台报错'],
  },
  'm-opp-detail': {
    name: '移动端 · 商机详情', module: '移动端',
    goal: '查看商机完整信息：阶段进度条、金额、赢率、阶段字段信息与历史阶段变更记录，并提供阶段更新 / 写跟进 / 查看客户入口。',
    roles: ['负责人销售：阶段更新 / 写跟进', '其他角色：只读'],
    enter: ['商机列表点击卡片', '阶段变更成功后返回本屏'],
    layout: ['头部卡（名称 / 编号 / 客户 / 阶段与赢率标签 + 六段阶段进度条）', '操作行（阶段更新 / 查看客户 / 写跟进）', '基本信息卡（含 info 字段与输单原因）', '阶段变更记录卡'],
    fields: ['阶段｜枚举｜只读（本屏）', '商机信息字段｜文本｜来自阶段门提交内容', '阶段历史｜只读｜变更前后 / 操作人 / 时间 / 备注'],
    rules: ['商机详情使用自身数据，阶段进度条按 STAGES 高亮', '阶段更新入口仅在未结束时显示', '写跟进预填客户与商机'],
    flow: ['商机详情 → 阶段更新 → 填写并确认 → 返回本屏自动刷新'],
    errors: ['商机不存在：空态', '已结束商机：提示不可再更新'],
    api: ['商机详情 / 阶段历史查询（示例）'],
    accept: ['数据与 store.opps 一致', '阶段变更后进度条 / 历史 / 记录即时更新', '无控制台报错'],
  },
  'm-opp-stage': {
    name: '移动端 · 商机阶段更新', module: '移动端',
    goal: '按商机阶段规则推进商机：选择目标阶段（含赢单 / 输单），校验阶段必填信息与系统检查项，通过后写入并生成阶段变更记录。',
    roles: ['负责人销售 / 销售经理'],
    enter: ['商机详情「阶段更新」'],
    layout: ['商机信息卡', '目标阶段选择 chips（最多可见后续全部阶段，非相邻将被禁止）', '成交结果选择（目标为赢单 / 输单时）', '阶段必填信息表单 + 系统检查项 + 变更备注', '确认变更按钮', '校验失败提示条'],
    fields: ['目标阶段｜枚举｜必填', '阶段字段｜按 STAGE_RULES 动态渲染（需求 / 采购时间 / 预算 / 方案 / 商务条件 / 输单原因等）', '系统检查项｜说明：报价单已有、合同已审批（赢单前置）'],
    rules: ['复用 STAGE_RULES：非相邻阶段禁止推进并提示；阶段必填项与检查项未满足不可推进', '赢单需 flags.contractApproved 满足；输单必须填写输单原因', '通过后写入 stage / prob / info / history 并记录操作日志'],
    flow: ['未结束 → 选择目标 → 校验失败提示补全 → 校验通过 → 阶段变更 → 返回详情'],
    errors: ['跳阶段：错误提示', '必填项 / 检查项未通过：提示条 + 轻提示', '已结束商机：提示不可再更新'],
    api: ['阶段门校验 / 阶段变更接口（示例，原型直接写 store.opps）'],
    accept: ['校验失败时不改动任何数据', '校验通过后阶段 / 赢率 / 变更记录 / 操作日志全部更新', '无控制台报错'],
  },
  'm-followup': {
    name: '移动端 · 写跟进', module: '移动端',
    goal: '在移动端快速录入跟进记录：选择客户与商机、跟进类型、填写内容与客户反馈、下一步计划与时间，支持语音转文字与拍照占位；提交后写入活动并出现在客户跟进里。',
    roles: ['销售：为本人客户写跟进'],
    enter: ['客户详情「写跟进」', '线索详情「写跟进」', '商机详情「写跟进」', '首页快捷操作「写跟进」'],
    layout: ['表单卡（客户 / 商机 / 类型 / 内容 / 反馈 / 下一步时间 + 语音、拍照按钮）', '底部保存按钮'],
    fields: ['客户｜选择｜必填：是', '关联商机｜选择｜选填｜选项随客户联动', '跟进类型｜枚举｜默认电话', '跟进内容｜长文本｜必填：是', '客户反馈｜长文本｜选填', '下一步计划时间｜日期时间｜选填'],
    rules: ['客户与内容必填，否则轻提示拦截', '保存写入 store.ext.activities（状态已完成、负责人张三、当前时间）并更新客户最近跟进日', '语音转文字 / 拍照为占位功能，给出明确提示'],
    flow: ['填写 → 校验 → 保存 → 返回上一屏，客户详情跟进与跟进列表均可见'],
    errors: ['客户或内容为空：拦截', '商机选项为空：显示先选客户的提示'],
    api: ['新建跟进 / 语音识别 / 图片上传接口（示例；语音与拍照为占位）'],
    accept: ['提交后 store.ext.activities 出现新记录且客户详情可查', '必填校验生效', '无控制台报错'],
  },
  'm-followups': {
    name: '移动端 · 跟进记录列表', module: '移动端',
    goal: '集中查看全部跟进记录：支持按客户筛选与关键词搜索，点击进入活动详情。',
    roles: ['销售 / 销售经理：按权限查看'],
    enter: ['我的页后续入口', '跟进保存后返回查看'],
    layout: ['搜索框', '客户筛选下拉', '结果计数', '跟进卡片列表（客户 / 时间 / 类型 / 内容 / 状态）'],
    fields: ['客户筛选｜选择｜说明：来自活动数据去重', '关键字｜文本｜说明：客户 / 内容 / 联系人匹配'],
    rules: ['列表按时间倒序', '筛选与搜索可叠加', '点击进入活动详情'],
    flow: ['跟进记录 → 活动详情 → 返回保留筛选'],
    errors: ['无记录：空态'],
    api: ['跟进列表 / 按客户筛选接口（示例）'],
    accept: ['客户筛选生效且计数正确', '无控制台报错'],
  },
  'm-approvals': {
    name: '移动端 · 审批中心', module: '移动端',
    goal: '移动端审批处理：待我审批 / 我发起的 / 已处理分段浏览，点击进入审批详情完成同意 / 拒绝 / 退回 / 转交。',
    roles: ['审批人：处理待我审批', '申请人：查看我发起的进度', '其他角色：按权限查看'],
    enter: ['底部导航「待办」', '首页「待审批」数字', '我的页「我的审批」', '消息通知审批类点击'],
    layout: ['分段栏（带数量徽标）', '审批列表（标题 / 申请人 / 时间 / 金额 / 状态标签）', '空态提示'],
    fields: ['审批单号｜只读｜格式 SP-年-序号', '审批状态｜枚举｜说明：待审批 / 已同意 / 已拒绝 / 已退回修改', '金额｜货币｜只读'],
    rules: ['待我审批 = store.approvals 中 tab=todo', '我发起的 = applicant 张三或 tab=mine', '已处理 = tab=done；每项金额来自单据'],
    flow: ['审批列表 → 详情处理 → 返回后分段计数即时变化'],
    errors: ['分段无数据：空态'],
    api: ['审批分页 / 分段查询（示例）'],
    accept: ['分段计数与分列表一致且随操作实时更新', '无控制台报错'],
  },
  'm-approval-detail': {
    name: '移动端 · 审批详情', module: '移动端',
    goal: '完成审批处理闭环：展示申请内容与流程节点，支持同意 / 拒绝（必填原因）/ 退回 / 转交，操作真实更新 store.approvals 状态与待办数。',
    roles: ['审批人：同意 / 拒绝 / 退回 / 转交', '申请人：查看进度与动态'],
    enter: ['审批列表点击', '待办「去审批」', '消息通知审批类点击'],
    layout: ['审批信息卡（类型 / 标题 / 申请人 / 业务对象 / 金额 / 时间）', '申请内容卡（摘要键值对）', '审批流程节点卡（当前节点高亮）', '审批动态卡', '操作行：同意 / 拒绝 / 退回 / 转交（仅待审批可见）', '转交人员选择抽屉（ActionSheet）'],
    fields: ['审批单号 / 类型 / 状态｜只读', '审批意见｜文本｜拒绝 / 退回时必填（弹窗校验）', '转交对象｜人员｜说明：启用中的成员（不含本人）'],
    rules: ['仅 tab=todo 可操作', '同意后当前节点置 done、下一节点流转，审批置已处理；拒绝 / 退回必须填写原因（Node 弹窗校验）；转交不改状态、待办不减少', '每次操作写入 history 与操作日志，首页 / 待办审批数字同步'],
    flow: ['待审批 → 同意 / 拒绝 / 退回 → 已处理；转交 → 节点处理人更新'],
    errors: ['审批不存在：空态', '拒绝 / 退回原因为空：拦截', '已完成审批：提示仅可查看'],
    api: ['审批详情 / 审批动作接口（示例，原型直接写 store.approvals）'],
    accept: ['操作后状态与待办数真实更新', '拒绝 / 退回必填原因生效', '无控制台报错'],
  },
  'm-payments': {
    name: '移动端 · 回款查询', module: '移动端',
    goal: '移动端查看回款：合同回款汇总卡（合同数 / 应收 / 已收 / 逾期）与回款计划列表，逾期标红，支持按状态与客户筛选，进入计划明细。',
    roles: ['销售：查看本人合同回款', '财务：全量查看', '销售经理：团队回款'],
    enter: ['首页「逾期回款」数字', '我的页「我的回款」', '消息通知逾期 / 到期类点击'],
    layout: ['回款汇总卡（4 个实算数字）', '搜索框', '状态筛选 chips（全部 / 逾期 / 未回款 / 部分回款 / 已回款）', '计划列表（客户 / 合同 / 阶段 / 计划日期 / 金额 / 状态标签）'],
    fields: ['应收总额 / 已收｜货币｜实算（store.pay + store.ext.contracts）', '逾期｜日期早于今天且未收满的计划｜标红', '计划状态｜枚举｜由已收金额与日期推导'],
    rules: ['store.pay.contracts 优先并按核销记录计算已收；store.ext.contracts 的其他合同按计划状态估算，合同重复时去重', '逾期标红并在计数卡显示逾期笔数', '点击进入回款计划明细'],
    flow: ['回款列表 → 计划明细 → 返回'],
    errors: ['无匹配：空态'],
    api: ['回款计划 / 已收 / 核销接口（示例）'],
    accept: ['汇总数字为实算且与列表一致', '逾期筛选准确', '无控制台报错'],
  },
  'm-payment-detail': {
    name: '移动端 · 回款计划明细', module: '移动端',
    goal: '查看单笔回款计划明细与已收记录：阶段、金额、进度与落入该计划的核销记录。',
    roles: ['销售 / 财务'],
    enter: ['回款列表点击计划'],
    layout: ['客户与合同信息卡（状态标签）', '计划明细卡（阶段 / 金额 / 已收 / 日期 / 负责人 + 进度条）', '该合同已收记录列表（日期 / 方式 / 操作人 / 确认状态 / 落入本计划金额）'],
    fields: ['计划金额 / 已收金额｜货币｜只读', '计划日期｜日期｜逾期时在总数红提供预警文案', '已收记录｜列表｜说明：日期 / 方式 / 操作人 / 财务确认'],
    rules: ['进度条 = 已收 / 计划金额（上限 100%）', '逾期计划给出催收提示文案', '记录金额为该计划落入金额而非整笔回款'],
    flow: ['计划明细 → 返回列表'],
    errors: ['计划不存在：空态'],
    api: ['回款计划与核销明细接口（示例）'],
    accept: ['金额与进度与汇总一致', '无控制台报错'],
  },
  'm-tickets': {
    name: '移动端 · 服务工单列表', module: '移动端',
    goal: '按状态分段处理服务工单：待受理 / 待分派 / 处理中 / 待确认 / 已解决 / 已关闭 / 已退回，支持搜索与 SLA 提示，进入详情受理或处理。',
    roles: ['交付 / 客服：受理与处理工单', '销售：跟进客户工单'],
    enter: ['我的页「我的工单」', '待办「工单」待办项'],
    layout: ['状态分段栏（带数量徽标）', '搜索框', '工单卡片列表（客户 / 编号 / 类型 / 描述 / SLA / 优先级与状态标签）'],
    fields: ['工单状态｜枚举｜说明：待受理 / 待分派 / 处理中 / 待客户确认 / 已解决 / 已关闭 / 已退回', '优先级｜枚举｜说明：紧急(2h) 高(4h) 中(24h) 低(48h)', 'SLA｜只读｜超时提示'],
    rules: ['分段数量实算', 'SLA 已超时在卡片给出「已超时」文案', '点击进入工单详情'],
    flow: ['待受理 →（受理并指派）→ 处理中 → 处理 → 待客户确认 → 已解决 → 已关闭；异常走已退回'],
    errors: ['无工单分段：空态'],
    api: ['工单列表 / SLA 计算接口（示例）'],
    accept: ['分段数量准确', '点击进入详情正常', '无控制台报错'],
  },
  'm-ticket-detail': {
    name: '移动端 · 工单详情', module: '移动端',
    goal: '查看工单基本信息与处理记录时间线，并完成受理操作（待受理 → 处理中并写记录），处理在旁边屏幕提交。',
    roles: ['交付 / 客服：受理工单', '其他角色：查看'],
    enter: ['工单列表点击', '待办工单项', '客户详情工单区'],
    layout: ['问题描述卡（类型 / 优先级 / 状态 / 编号 / 提交时间）', '操作行（受理 / 处理并提交确认）', '基本信息卡（客户 / 联系人 / 处理人 / SLA / 图片）', '处理记录时间线'],
    fields: ['工单编号 / 状态 / 处理人｜只读', 'SLA 截止｜只读', '处理记录｜时间 / 操作人 / 动作 / 说明｜每次操作追加'],
    rules: ['仅待受理状态显示受理按钮，受理并指派默认处理人客服-小陈后进入处理中并写记录', '仅处理中可进入处理屏提交客户确认', '记录只可新增不可删改'],
    flow: ['待受理 → 受理并指派（处理中）→ 处理屏 → 待客户确认'],
    errors: ['工单不存在：空态', '状态不匹配：按钮隐藏'],
    api: ['工单详情 / 受理接口（示例）'],
    accept: ['受理后状态与记录即时更新', '无控制台报错'],
  },
  'm-ticket-handle': {
    name: '移动端 · 工单处理提交', module: '移动端',
    goal: '填写处理说明并上传现场图片（FileReader 预览，最多 3 张），提交后工单进入「待客户确认」并留处理记录。',
    roles: ['交付 / 客服'],
    enter: ['工单详情「处理并提交确认」'],
    layout: ['工单信息卡', '处理说明表单（必填）', '图片上传区（缩略图预览 + 删除 + 相册入口，最多 3 张）', '提交按钮'],
    fields: ['处理说明｜长文本｜必填：是', '图片｜文件（image/*）｜最多 3 张｜预览缩略图可删除'],
    rules: ['处理说明为空不可提交', '超过 3 张给出提示且多余忽略', '提交后状态 → 待客户确认，处理记录与工单图片更新', '提交成功返回详情'],
    flow: ['处理中 → 填写说明 → 选图预览 → 提交 → 待客户确认'],
    errors: ['说明为空：提示拦截', '状态已变更：提示不可提交', '工单不存在：空态'],
    api: ['处理提交 / 图片上传接口（示例；说明真实写 store，图片本地预览）'],
    accept: ['选图后出现缩略预览并可删除', '提交后状态与记录更新且待确认分段可见', '无控制台报错'],
  },
  'm-notices': {
    name: '移动端 · 消息通知', module: '移动端',
    goal: '集中查看系统通知：分类筛选（全部 / 审批 / 分配 / 逾期 / 到期）、未读红点、点击标记已读并跳转到的相关屏幕，支持全部已读。',
    roles: ['全体移动端用户'],
    enter: ['首页 / 我的 右上角铃铛', '我的页消息通知入口'],
    layout: ['分类 chips + 全部已读按钮', '未读计数提示', '通知列表（未读红点 / 标题 / 类型 / 时间）'],
    fields: ['通知标题｜文本｜只读', '类型｜枚举｜说明：审批提醒 / 审批结果 / 分配通知 / 逾期提醒 / 到期提醒', '已读状态｜布尔｜点击后置为已读'],
    rules: ['点击通知：置为已读并按类型跳转（审批 → 审批详情 / 审批中心；分配 → 线索列表；逾期 / 到期 → 回款查询）', '全部已读一次更新所有', '未读数与首页 / 我的角标同步'],
    flow: ['未读 → 点击 / 全部已读 → 已读；跳转到相关屏幕'],
    errors: ['无通知：空态', '关联单据已处理：仍可进入查看'],
    api: ['通知列表 / 标记已读 / 跳转路由映射（示例）'],
    accept: ['分类与未读计数正确', '点击跳转的目标屏幕正确且已读生效', '无控制台报错'],
  },
};
Object.entries(MSB_DOC_PAGES).forEach(([k, c]) => { DOCS_DEFAULT[k] = mkDoc(k, c); });

/* ========== 注册屏幕 ========== */
registerMScreen('leads', MSBLeadsScreen, { title: '线索', doc: 'm-leads', tab: 'todo' });
registerMScreen('lead-detail', MSBLeadDetailScreen, { title: '线索详情', doc: 'm-lead-detail', tab: 'todo' });
registerMScreen('lead-new', MSBLeadNewScreen, { title: '新建线索', doc: 'm-lead-new', tab: 'todo' });
registerMScreen('opps', MSBOppsScreen, { title: '商机', doc: 'm-opps', tab: 'todo' });
registerMScreen('opp-detail', MSBOppDetailScreen, { title: '商机详情', doc: 'm-opp-detail', tab: 'todo' });
registerMScreen('opp-stage', MSBOppStageScreen, { title: '阶段更新', doc: 'm-opp-stage', tab: 'todo' });
registerMScreen('followup-new', MSBFollowupNewScreen, { title: '写跟进', doc: 'm-followup', tab: 'todo' });
registerMScreen('followups', MSBFollowupsScreen, { title: '跟进记录', doc: 'm-followups', tab: 'todo' });
registerMScreen('approvals', MSBApprovalsScreen, { title: '审批中心', doc: 'm-approvals', tab: 'todo' });
registerMScreen('approval-detail', MSBApprovalDetailScreen, { title: '审批详情', doc: 'm-approval-detail', tab: 'todo' });
registerMScreen('payments', MSBPaymentsScreen, { title: '回款查询', doc: 'm-payments', tab: 'todo' });
registerMScreen('payment-detail', MSBPaymentDetailScreen, { title: '回款明细', doc: 'm-payment-detail', tab: 'todo' });
registerMScreen('tickets', MSBTicketsScreen, { title: '服务工单', doc: 'm-tickets', tab: 'todo' });
registerMScreen('ticket-detail', MSBTicketDetailScreen, { title: '工单详情', doc: 'm-ticket-detail', tab: 'todo' });
registerMScreen('ticket-handle', MSBTicketHandleScreen, { title: '处理工单', doc: 'm-ticket-handle', tab: 'todo' });
registerMScreen('notices', MSBNoticesScreen, { title: '消息通知', doc: 'm-notices', tab: 'me' });
window.__MSCREENS_KEYS = Object.keys(MSCREENS);
