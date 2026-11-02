/* ===== 第 7 阶段：移动端屏幕（首页 / 客户 / 日程 / 待办 / 我的） ===== */
const MSA_OWNER = '张三';
const MSA_ACT_TYPES = ['电话', '微信', '短信', '拜访', '会议', '邮件', '演示', '培训', '其他'];
const MSA_LEVEL_TAG = { 战略客户: 'danger', 重点客户: 'warning', 普通客户: 'info', 潜在客户: 'info' };
const msaYmd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const msaNowTime = () => { const d = new Date(); return TODAY + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const msaMoney = n => '¥' + fmtY(Math.round(n || 0));
const msaMoneyC = c => '¥' + fmtC(c || 0);
const msaActNo = () => {
  let mx = 99;
  store.ext.activities.forEach(x => { const n = Number(String(x.no).split('-')[1]); if (n > mx) mx = n; });
  return 'HD-' + String(mx + 1).padStart(6, '0');
};
const msaOppNo = () => {
  let mx = 99;
  store.opps.forEach(x => { const n = Number(String(x.no).split('-').pop()); if (n > mx) mx = n; });
  return 'SJ-' + TODAY.slice(0, 7).replace('-', '') + '-' + String(mx + 1).padStart(4, '0');
};
const msaLog = (module, act, detail) => { store.ext.logs.unshift({ time: msaNowTime() + ':00', who: MSA_OWNER, module, act, detail, ip: '10.20.8.21' }); };
/* 为移动端演示补充两条「今天」的活动（仅在当天没有本人活动时注入，不覆盖已有数据） */
(function msaSeedToday() {
  if (store.ext.activities.some(a => a.owner === MSA_OWNER && a.time.slice(0, 10) === TODAY)) return;
  store.ext.activities.unshift({ no: msaActNo(), type: '拜访', customer: '江苏某某集团', contact: '周主任', opp: 'SJ-202610-0018', owner: MSA_OWNER, time: TODAY + ' 14:00', content: '上门拜访，沟通协议客户平台实施排期', feedback: '', next: '', status: '计划中', checkin: null });
  store.ext.activities.unshift({ no: msaActNo(), type: '电话', customer: '南京某某科技有限公司', contact: '陈总监', opp: 'SJ-202609-0012', owner: MSA_OWNER, time: TODAY + ' 09:30', content: '电话跟进 ERP 升级项目报价与审批进度', feedback: '客户希望本周内确认方案', next: TODAY + ' 17:00', status: '已完成', checkin: null });
})();
const msaOverduePlans = () => {
  const out = [];
  store.pay.contracts.forEach(c => {
    c.plans.forEach(p => {
      if (p.date >= TODAY) return;
      let paid = 0;
      store.pay.records.forEach(r => { if (r.contract === c.no) (r.alloc || []).forEach(a => { if (a.plan === p.id) paid += a.amt; }); });
      const due = p.amount - paid;
      if (due > 0) out.push({ contract: c.no, customer: c.customer, owner: c.owner, stage: p.stage, planId: p.id, date: p.date, amount: due });
    });
  });
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
};

/* ========== 1. 首页 home ========== */
const MHomeScreen = {
  components: { MCard, MCell, MTag, MEmpty },
  setup() {
    const todayActs = computed(() => store.ext.activities.filter(a => a.owner === MSA_OWNER && a.time.slice(0, 10) === TODAY).sort((a, b) => (a.time < b.time ? -1 : 1)));
    const pendingToday = computed(() => todayActs.value.filter(a => a.status === '计划中').length);
    const followCount = computed(() => store.ext.activities.filter(a => a.owner === MSA_OWNER && a.status === '计划中').length);
    const apprCount = computed(() => store.approvals.filter(a => a.tab === 'todo').length);
    const overdue = computed(() => msaOverduePlans());
    const overdueCount = computed(() => overdue.value.length);
    const recent = computed(() => store.customers.filter(c => c.owner === MSA_OWNER).slice().sort((a, b) => (a.lastFollow < b.lastFollow ? 1 : -1)).slice(0, 4));
    const todayLabel = computed(() => { const d = new Date(TODAY + 'T00:00:00'); return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · 星期' + '日一二三四五六'[d.getDay()]; });
    const quick = [
      { k: 'lead', t: '新增线索', i: 'Aim', c: 'var(--el-color-primary)' },
      { k: 'cust', t: '新增客户', i: 'OfficeBuilding', c: 'var(--ok)' },
      { k: 'opp', t: '新增商机', i: 'TrendCharts', c: 'var(--warn)' },
      { k: 'visit', t: '安排拜访', i: 'Calendar', c: 'var(--el-color-primary)' },
      { k: 'checkin', t: '拜访签到', i: 'Location', c: 'var(--ok)' },
      { k: 'follow', t: '写跟进', i: 'ChatDotRound', c: 'var(--warn)' },
      { k: 'scan', t: '扫码 / 拍照', i: 'Camera', c: 'var(--sub)' },
    ];
    const doQuick = q => {
      if (q.k === 'lead') return mpush('lead-new');
      if (q.k === 'visit') return mpush('schedule-new');
      if (q.k === 'checkin') return mgo('visit-checkin');
      if (q.k === 'follow') return mpush('followup-new');
      if (q.k === 'opp') return mgo('opps');
      if (q.k === 'cust') return mgo('customers');
      mToast(q.t + '：该功能将在后续阶段开放', 'warning');
    };
    onMounted(() => mSetActions([{ icon: 'Bell', title: '消息通知', on: () => mpush('notices') }]));
    onBeforeUnmount(() => mSetActions([]));
    return { todayActs, pendingToday, followCount, apprCount, overdueCount, recent, todayLabel, quick, doQuick, mgo, mpush, mToast, levelTag: l => MSA_LEVEL_TAG[l] || 'info' };
  },
  template: `<div class="m-page">
    <div class="m-hero">
      <h3>早上好，张三</h3>
      <p>{{ todayLabel }} · 华东销售一部 · 销售经理</p>
      <p class="m-hero-task">今天还有 {{ pendingToday }} 项工作需要处理</p>
      <div class="m-stats">
        <div @click="mgo('todo', {seg:'follow'})"><b>{{ followCount }}</b><span>待跟进</span></div>
        <div @click="mgo('todo', {seg:'approval'})"><b>{{ apprCount }}</b><span>待审批</span></div>
        <div @click="mgo('todo', {seg:'payment'})"><b>{{ overdueCount }}</b><span>逾期回款</span></div>
      </div>
    </div>
    <m-card title="快捷操作">
      <div class="m-quick">
        <div class="qi" v-for="q in quick" :key="q.k" @click="doQuick(q)"><i :style="{background:'var(--tint)',color:q.c}"><el-icon><component :is="q.i"/></el-icon></i>{{ q.t }}</div>
      </div>
    </m-card>
    <m-card title="最近待办">
      <m-empty v-if="!todayActs.length" text="今天暂无日程安排" icon="Calendar"/>
      <div v-for="a in todayActs" :key="a.no" class="m-todo" @click="mpush('visit-detail', {no:a.no})">
        <span class="tm">{{ a.time.slice(11, 16) }}</span>
        <div style="flex:1;min-width:0"><div class="m-ellipsis">{{ a.customer }}</div><div class="muted m-ellipsis" style="font-size:12px">{{ a.type }} · {{ a.content }}</div></div>
        <m-tag :type="a.status==='已完成'?'success':(a.status==='计划中'?'warning':'info')" :text="a.status"/>
      </div>
    </m-card>
    <m-card title="最近客户">
      <div class="m-list-item" v-for="c in recent" :key="c.no" @click="mpush('customer-detail', {no:c.no})">
        <div class="m-ava">{{ c.name.slice(0, 1) }}</div>
        <div style="flex:1;min-width:0"><div class="m-ellipsis" style="font-weight:600">{{ c.name }}</div><div class="muted m-ellipsis" style="font-size:12px">{{ c.region }} · 最近跟进 {{ c.lastFollow }}</div></div>
        <m-tag :type="levelTag(c.level)" :text="c.level"/>
      </div>
    </m-card>
  </div>`,
};

/* ========== 2. 客户列表 / 客户详情 ========== */
const MCustomersScreen = {
  components: { MSearch, MTag, MEmpty, MCard },
  setup() {
    const kw = ref(''); const level = ref(''); const mine = ref(false); const limit = ref(8);
    const levels = ['全部', '战略客户', '重点客户', '普通客户', '潜在客户'];
    const filtered = computed(() => {
      let a = store.customers.slice();
      if (kw.value.trim()) { const k = kw.value.trim(); a = a.filter(c => c.name.includes(k) || c.no.includes(k) || (c.phone || '').includes(k)); }
      if (level.value) a = a.filter(c => c.level === level.value);
      if (mine.value) a = a.filter(c => c.owner === MSA_OWNER);
      return a.sort((x, y) => (x.lastFollow < y.lastFollow ? 1 : -1));
    });
    const shown = computed(() => filtered.value.slice(0, limit.value));
    watch([kw, level, mine], () => { limit.value = 8; });
    const more = () => { limit.value += 8; };
    const pickLevel = l => { level.value = l === '全部' ? '' : l; };
    return { kw, level, mine, limit, levels, filtered, shown, more, pickLevel, mgo, mpush, mToast, levelTag: l => MSA_LEVEL_TAG[l] || 'info' };
  },
  template: `<div class="m-page">
    <m-search v-model="kw" placeholder="搜索客户名称 / 编号 / 电话"/>
    <div class="m-chip-row">
      <span v-for="l in levels" :key="l" class="m-chip" :class="{on:(l==='全部'&&!level)||level===l}" @click="pickLevel(l)">{{ l }}</span>
      <span class="m-chip" :class="{on:mine}" @click="mine=!mine">我的客户</span>
    </div>
    <div class="m-result-tip">共 {{ filtered.length }} 家客户<template v-if="mine"> · 负责人：张三</template></div>
    <m-empty v-if="!shown.length" text="没有匹配的客户，试试调整筛选条件"/>
    <div class="m-card" v-else>
      <div class="m-list-item" v-for="c in shown" :key="c.no" @click="mpush('customer-detail', {no:c.no})">
        <div class="m-ava">{{ c.name.slice(0, 1) }}</div>
        <div style="flex:1;min-width:0">
          <div class="m-ellipsis" style="font-weight:600">{{ c.name }}</div>
          <div class="muted m-ellipsis" style="font-size:12px">{{ c.region }} · {{ c.owner || '公海' }} · 最近跟进 {{ c.lastFollow }}</div>
        </div>
        <m-tag :type="levelTag(c.level)" :text="c.level"/>
      </div>
    </div>
    <div class="m-loadmore" v-if="shown.length < filtered.length">
      <el-button size="small" round @click="more">加载更多（已显示 {{ shown.length }} / {{ filtered.length }}）</el-button>
    </div>
    <div class="m-loadmore muted" v-else-if="filtered.length > 8">已加载全部 {{ filtered.length }} 家</div>
  </div>`,
};

const MCustomerDetailScreen = {
  components: { MCard, MTag, MEmpty, MCell },
  props: { no: String },
  setup(props) {
    const no = props.no || (store.customers[0] || {}).no;
    const cust = computed(() => store.customers.find(c => c.no === no));
    const bundle = computed(() => (cust.value ? custBundle(cust.value.name) : null));
    const tab = ref('overview');
    const tabs = [['overview', '概况'], ['profile', '画像'], ['contacts', '联系人'], ['activities', '跟进'], ['opps', '商机'], ['pay', '合同回款'], ['tickets', '工单']];
    const levelTag = l => MSA_LEVEL_TAG[l] || 'info';
    const profile = computed(() => {
      const b = bundle.value; if (!b) return null;
      return {
        oppOpen: b.opps.filter(o => o.stage !== 'close').length,
        oppWon: b.opps.filter(o => o.stage === 'close' && o.result === '赢单').length,
        openTickets: b.tickets.filter(t => t.status !== '已关闭').length,
        payOk: b.contracts.reduce((s, c) => s + c.plans.filter(p => p.status === '已回款').length, 0),
        plans: b.contracts.reduce((s, c) => s + c.plans.length, 0),
      };
    });
    const dial = phone => mToast('正在拨打 ' + (phone || '客户电话') + '（演示）', 'success');
    const writeFollow = () => {
      if (!cust.value) return;
      const c = bundle.value.contacts[0];
      const noAct = msaActNo();
      store.ext.activities.unshift({ no: noAct, type: '电话', customer: cust.value.name, contact: c ? c.name : '', opp: '', owner: MSA_OWNER, time: msaNowTime(), content: '移动端快速跟进：与客户确认近期需求与下一步安排', feedback: '客户表示继续推进', next: '', status: '已完成', checkin: null });
      msaLog('客户', '跟进', '移动端新增电话跟进（客户：' + cust.value.name + '）');
      mToast('跟进记录已保存（已完成）', 'success');
    };
    const newOpp = () => {
      if (!cust.value) return;
      ElMessageBox.prompt('请输入商机名称：', '新建商机', { confirmButtonText: '保存', cancelButtonText: '取消', inputValue: cust.value.name.replace(/(有限公司|集团)$/g, '') + ' 移动端新建商机', inputPattern: /\S+/, inputErrorMessage: '商机名称不能为空' })
        .then(({ value }) => {
          const on = msaOppNo();
          store.opps.push({ no: on, name: value.trim(), customer: cust.value.name, amount: 100000, date: TODAY, owner: MSA_OWNER, stage: 'contact', prob: 10, info: {}, flags: {} });
          msaLog('商机', '新建', '移动端新建商机 ' + on + '（客户：' + cust.value.name + '）');
          mToast('商机已创建：' + on, 'success');
          tab.value = 'opps';
        }).catch(() => {});
    };
    onMounted(() => mSetActions([{ icon: 'Phone', title: '一键拨号', on: () => dial(cust.value && cust.value.phone) }]));
    onBeforeUnmount(() => mSetActions([]));
    return { cust, bundle, tab, tabs, STAGES, STAGE_IDX, levelTag, profile, dial, writeFollow, newOpp, mgo, mpush, mToast, money: msaMoney, moneyC: msaMoneyC };
  },
  template: `<div class="m-page">
    <m-empty v-if="!cust" text="客户不存在或已被合并" icon="OfficeBuilding"/>
    <template v-else>
      <div class="m-card m-cust-head">
        <div class="m-cust-logo">{{ cust.name.slice(0, 1) }}</div>
        <div style="flex:1;min-width:0">
          <div class="m-cust-name">{{ cust.name }}</div>
          <div class="m-cust-meta">{{ cust.no }} · {{ cust.industry }}</div>
          <div style="display:flex;gap:6px;margin-top:6px"><m-tag :type="levelTag(cust.level)" :text="cust.level"/><m-tag :type="cust.status==='正常'?'success':'warning'" :text="cust.status"/><m-tag type="info" :text="cust.owner || '公海'"/></div>
        </div>
      </div>
      <div class="m-action-row">
        <el-button size="small" icon="Phone" @click="dial(cust.phone)">一键拨号</el-button>
        <el-button size="small" type="primary" icon="EditPen" @click="writeFollow">写跟进</el-button>
        <el-button size="small" icon="TrendCharts" @click="newOpp">新建商机</el-button>
      </div>
      <div class="m-seg m-seg-scroll">
        <span v-for="t in tabs" :key="t[0]" :class="{on:tab===t[0]}" @click="tab=t[0]">{{ t[1] }}</span>
      </div>
      <m-card v-if="tab==='overview'">
        <m-cell label="客户编号" :value="cust.no" :arrow="false"/>
        <m-cell label="客户类型" :value="cust.type" :arrow="false"/>
        <m-cell label="所在地区" :value="cust.region" :arrow="false"/>
        <m-cell label="客户规模" :value="cust.scale" :arrow="false"/>
        <m-cell label="线索来源" :value="cust.source" :arrow="false"/>
        <m-cell label="累计成交" :value="money(cust.total)" :arrow="false"/>
        <m-cell label="最近跟进" :value="cust.lastFollow" :arrow="false"/>
      </m-card>
      <div v-else-if="tab==='profile'">
        <div class="m-stats" style="margin:10px 12px">
          <div><b>{{ money(cust.total) }}</b><span>累计成交</span></div>
          <div><b>{{ bundle.opps.length }}</b><span>商机</span></div>
          <div><b>{{ bundle.activities.length }}</b><span>跟进</span></div>
        </div>
        <m-card title="客户画像">
          <m-cell label="客户等级" :value="cust.level" :arrow="false"/>
          <m-cell label="行业 / 规模" :value="cust.industry + ' · ' + cust.scale" :arrow="false"/>
          <m-cell label="所属区域 / 来源" :value="cust.region + ' · ' + cust.source" :arrow="false"/>
          <m-cell label="最近成交" :value="cust.lastDeal || '-'" :arrow="false"/>
          <m-cell label="商机概况" :value="'跟进中 ' + profile.oppOpen + ' · 赢单 ' + profile.oppWon + ' / 共 ' + bundle.opps.length + ' 个'" :arrow="false"/>
          <m-cell label="合同与报价" :value="'合同 ' + bundle.contracts.length + ' 份 · 报价 ' + bundle.quotes.length + ' 份'" :arrow="false"/>
          <m-cell label="回款情况" :value="'已回款 ' + profile.payOk + ' / 共 ' + profile.plans + ' 笔计划'" :arrow="false"/>
          <m-cell label="服务情况" :value="profile.openTickets ? '未关闭工单 ' + profile.openTickets + ' 张' : '工单全部关闭'" :arrow="false"/>
          <m-cell label="联系人" :value="bundle.contacts.length + ' 位' + (bundle.contacts.some(c => c.role === '决策人') ? '（含决策人）' : '')" :arrow="false"/>
          <m-cell label="跟进活跃度" :value="cust.lastFollow >= TODAY ? '今日已跟进' : ('最近跟进 ' + cust.lastFollow)" :arrow="false"/>
        </m-card>
      </div>
      <m-card v-else-if="tab==='contacts'" title="联系人">
        <m-empty v-if="!bundle.contacts.length" text="暂无联系人"/>
        <div v-for="c in bundle.contacts" :key="c.no" class="m-list-item" @click="dial(c.phone)">
          <div class="m-ava">{{ c.name.slice(0, 1) }}</div>
          <div style="flex:1;min-width:0"><div style="font-weight:600">{{ c.name }} <span class="muted" style="font-weight:400;font-size:12px">{{ c.title }}</span></div><div class="muted m-ellipsis" style="font-size:12px">{{ c.dept }} · {{ c.phone }}</div></div>
          <m-tag :type="c.role==='决策人'?'danger':'info'" :text="c.role"/>
        </div>
      </m-card>
      <m-card v-else-if="tab==='activities'" title="跟进记录">
        <m-empty v-if="!bundle.activities.length" text="暂无跟进记录"/>
        <div v-for="a in bundle.activities" :key="a.no" class="m-list-item" @click="mpush('visit-detail', {no:a.no})">
          <div style="flex:1;min-width:0"><div style="font-weight:600">{{ a.type }} · {{ a.time.slice(5, 16) }}</div><div class="muted m-ellipsis" style="font-size:12px">{{ a.content }}</div></div>
          <m-tag :type="a.status==='已完成'?'success':'warning'" :text="a.status"/>
        </div>
      </m-card>
      <m-card v-else-if="tab==='opps'" title="商机">
        <m-empty v-if="!bundle.opps.length" text="暂无商机"/>
        <div v-for="o in bundle.opps" :key="o.no" class="m-list-item">
          <div style="flex:1;min-width:0"><div style="font-weight:600">{{ o.name }}</div><div class="muted" style="font-size:12px">{{ o.no }} · {{ o.date }}</div></div>
          <div style="text-align:right"><div class="m-money">{{ money(o.amount) }}</div><m-tag type="info" :text="(STAGES[STAGE_IDX[o.stage]] || {}).name || o.stage"/></div>
        </div>
      </m-card>
      <m-card v-else-if="tab==='pay'" title="合同与回款">
        <m-empty v-if="!bundle.contracts.length" text="暂无合同"/>
        <div v-for="c in bundle.contracts" :key="c.no" class="m-contract">
          <div class="m-contract-h"><b>{{ c.no }}</b><m-tag :type="c.status==='履约中'?'success':'info'" :text="c.status"/></div>
          <div class="muted" style="font-size:12px">{{ c.name }}</div>
          <div class="m-money" style="margin:4px 0 6px">{{ money(c.amount) }}</div>
          <div v-for="(p, i) in c.plans" :key="i" class="m-plan-row"><span>{{ p.stage }} · {{ p.date }}</span><span>{{ money(p.amount) }}</span><m-tag :type="p.status==='已回款'?'success':(p.status==='部分回款'?'warning':'info')" :text="p.status"/></div>
        </div>
        <div v-if="bundle.quotes.length" class="muted" style="font-size:12px;margin-top:8px">关联报价 {{ bundle.quotes.length }} 份</div>
      </m-card>
      <m-card v-else title="服务工单">
        <m-empty v-if="!bundle.tickets.length" text="暂无工单"/>
        <div v-for="t in bundle.tickets" :key="t.no" class="m-list-item">
          <div style="flex:1;min-width:0"><div style="font-weight:600">{{ t.type }} · {{ t.no }}</div><div class="muted m-ellipsis" style="font-size:12px">{{ t.desc }}</div></div>
          <m-tag :type="t.status==='已关闭'?'success':(t.priority==='紧急'?'danger':'warning')" :text="t.status"/>
        </div>
      </m-card>
    </template>
  </div>`,
};

/* ========== 3. 日程 / 拜访 ========== */
const MScheduleScreen = {
  components: { MCard, MTag, MEmpty },
  setup() {
    const sel = ref(TODAY);
    const weekLabels = ['一', '二', '三', '四', '五', '六', '日'];
    const week = computed(() => {
      const base = new Date(TODAY + 'T00:00:00');
      const off = (base.getDay() + 6) % 7;
      const mon = new Date(base.getTime() - off * 86400000);
      return weekLabels.map((lb, i) => {
        const d = new Date(mon.getTime() + i * 86400000);
        const ds = msaYmd(d);
        return { d: ds, day: d.getDate(), label: '周' + lb, count: store.ext.activities.filter(a => a.owner === MSA_OWNER && a.time.slice(0, 10) === ds).length };
      });
    });
    const acts = computed(() => store.ext.activities.filter(a => a.owner === MSA_OWNER && a.time.slice(0, 10) === sel.value).sort((a, b) => (a.time < b.time ? -1 : 1)));
    const dayText = computed(() => { const d = new Date(sel.value + 'T00:00:00'); return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · 星期' + '日一二三四五六'[d.getDay()]; });
    onMounted(() => mSetActions([{ icon: 'Plus', title: '新建日程', on: () => mpush('schedule-new') }]));
    onBeforeUnmount(() => mSetActions([]));
    return { sel, week, acts, dayText, mgo, mpush, mToast };
  },
  template: `<div class="m-page">
    <div class="m-week">
      <div v-for="d in week" :key="d.d" class="m-week-d" :class="{on:sel===d.d,today:d.d===TODAY}" @click="sel=d.d">
        <span class="wd">{{ d.label }}</span><b>{{ d.day }}</b><i v-if="d.count">{{ d.count }}</i>
      </div>
    </div>
    <div class="m-section-h"><b>{{ dayText }}</b><span class="muted">{{ acts.length }} 项安排</span></div>
    <div class="m-action-row">
      <el-button size="small" type="primary" icon="Plus" @click="mpush('schedule-new')">新建日程</el-button>
      <el-button size="small" icon="Location" @click="mpush('visit-checkin')">拜访签到</el-button>
      <el-button size="small" icon="Tickets" @click="mpush('visit-records')">拜访记录</el-button>
    </div>
    <m-empty v-if="!acts.length" text="当天暂无安排，可新建日程或发起拜访" icon="Calendar"/>
    <div class="m-card" v-else>
      <div v-for="a in acts" :key="a.no" class="m-todo" @click="mpush('visit-detail', {no:a.no})">
        <span class="tm">{{ a.time.slice(11, 16) }}</span>
        <div style="flex:1;min-width:0"><div class="m-ellipsis" style="font-weight:600">{{ a.customer }}</div><div class="muted m-ellipsis" style="font-size:12px">{{ a.type }} · {{ a.content }}</div></div>
        <m-tag :type="a.status==='已完成'?'success':(a.status==='计划中'?'warning':'info')" :text="a.status"/>
      </div>
    </div>
  </div>`,
};

const MVisitDetailScreen = {
  components: { MCard, MTag, MEmpty, MCell },
  props: { no: String },
  setup(props) {
    const act = computed(() => store.ext.activities.find(a => a.no === props.no));
    const complete = () => {
      if (!act.value) return;
      act.value.status = '已完成';
      if (!act.value.feedback) act.value.feedback = '移动端标记完成，客户沟通正常';
      msaLog('活动', '完成', '移动端标记活动完成（' + act.value.no + '）');
      mToast('活动已标记完成', 'success');
    };
    return { act, complete, mgo, mpush, mToast };
  },
  template: `<div class="m-page">
    <m-empty v-if="!act" text="活动不存在或已被删除" icon="Calendar"/>
    <template v-else>
      <m-card>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><b style="font-size:16px">{{ act.type }} · {{ act.no }}</b><m-tag :type="act.status==='已完成'?'success':(act.status==='计划中'?'warning':'info')" :text="act.status"/></div>
        <m-cell label="客户" :value="act.customer" :arrow="false"/>
        <m-cell label="联系人" :value="act.contact || '-'" :arrow="false"/>
        <m-cell label="时间" :value="act.time" :arrow="false"/>
        <m-cell label="负责人" :value="act.owner" :arrow="false"/>
      </m-card>
      <m-card title="跟进内容"><div class="m-text">{{ act.content }}</div></m-card>
      <m-card title="客户反馈" v-if="act.feedback"><div class="m-text">{{ act.feedback }}</div></m-card>
      <m-card title="签到信息" v-if="act.checkin">
        <m-cell label="签到地址" :value="act.checkin.addr" :arrow="false"/>
        <m-cell label="签到时间" :value="act.checkin.time" :arrow="false"/>
        <m-cell label="坐标" :value="act.checkin.lat + ', ' + act.checkin.lng" :arrow="false"/>
        <div class="m-photo">现场照片：{{ act.checkin.photo || '未上传（占位）' }}</div>
      </m-card>
      <div class="m-action-row" style="margin-top:4px">
        <el-button v-if="act.status==='计划中' && act.type==='拜访'" type="primary" icon="Location" @click="mpush('visit-checkin', {no:act.no})">拜访签到</el-button>
        <el-button v-else-if="act.status==='计划中'" type="primary" icon="Check" @click="complete">标记完成</el-button>
        <el-button icon="Tickets" @click="mpush('visit-records')">拜访记录</el-button>
      </div>
    </template>
  </div>`,
};

const MVisitCheckinScreen = {
  components: { MCard, MField, MEmpty, MCell, MForm },
  props: { no: String },
  setup(props) {
    const findAct = () => {
      let a = props.no ? store.ext.activities.find(x => x.no === props.no) : null;
      if (!a) a = store.ext.activities.filter(x => x.owner === MSA_OWNER && x.type === '拜访' && x.status === '计划中').sort((x, y) => (x.time < y.time ? -1 : 1))[0];
      if (!a) a = store.ext.activities.filter(x => x.type === '拜访' && x.status === '计划中').sort((x, y) => (x.time < y.time ? -1 : 1))[0];
      if (!a) {
        const c = store.customers[0];
        a = { no: msaActNo(), type: '拜访', customer: c ? c.name : '示例客户', contact: '', opp: '', owner: MSA_OWNER, time: TODAY + ' 15:00', content: '移动端发起的临时拜访', feedback: '', next: '', status: '计划中', checkin: null };
        store.ext.activities.unshift(a);
      }
      return a;
    };
    const act = ref(findAct());
    const loc = ref(null); const photo = ref(''); const busy = ref(false); const submitting = ref(false);
    const getLoc = () => {
      if (busy.value) return;
      busy.value = true;
      setTimeout(() => {
        const cust = store.customers.find(c => c.name === (act.value || {}).customer);
        const seq = Number(String((act.value || {}).no || '0').replace(/\D/g, '')) % 100;
        loc.value = { addr: (cust ? cust.region : '江苏省南京市') + '某某路' + (88 + seq) + '号', time: msaNowTime(), lat: 32.0603, lng: 118.7969 };
        busy.value = false;
        mToast('定位成功（模拟授权）', 'success');
      }, 400);
    };
    const takePhoto = () => { photo.value = 'checkin-' + (act.value ? act.value.no : 'temp') + '.jpg'; mToast('照片已上传（占位）', 'success'); };
    const submit = () => {
      if (!act.value) { mToast('未找到待签到的拜访活动', 'error'); return; }
      if (!loc.value) { mToast('请先获取定位后再签到', 'warning'); return; }
      submitting.value = true;
      act.value.status = '已完成';
      act.value.checkin = { addr: loc.value.addr, time: msaNowTime(), lat: loc.value.lat, lng: loc.value.lng, photo: photo.value || '（未拍照，占位）' };
      act.value.feedback = act.value.feedback || '现场签到完成，客户沟通正常';
      msaLog('活动', '签到', '移动端拜访签到成功（' + act.value.no + '，地址：' + loc.value.addr + '）');
      mToast('签到成功，活动已完成', 'success');
      setTimeout(() => { submitting.value = false; mback(); }, 700);
    };
    onMounted(() => mSetActions([{ icon: 'Tickets', title: '拜访记录', on: () => mgo('visit-records') }]));
    onBeforeUnmount(() => mSetActions([]));
    return { act, loc, photo, busy, submitting, getLoc, takePhoto, submit, mgo, mback, mToast };
  },
  template: `<div class="m-page">
    <m-empty v-if="!act" text="暂无可签到的拜访活动" icon="Location"/>
    <template v-else>
      <div class="m-note"><el-icon><InfoFilled/></el-icon><span>签到需要获取您的定位信息，仅用于记录拜访地点与时间；可在「我的 → 隐私与授权」中管理。</span></div>
      <m-card title="拜访信息">
        <m-cell label="活动编号" :value="act.no" :arrow="false"/>
        <m-cell label="客户" :value="act.customer" :arrow="false"/>
        <m-cell label="计划时间" :value="act.time" :arrow="false"/>
        <m-cell label="当前状态" :value="act.status" :arrow="false"/>
      </m-card>
      <m-card title="定位信息">
        <div class="m-map">
          <div class="m-map-pin" :class="{off:!loc}"><el-icon><LocationFilled/></el-icon></div>
          <div class="m-map-tip">{{ loc ? '已获取当前位置' : '尚未获取定位' }}</div>
        </div>
        <m-cell v-if="loc" label="签到地址" :value="loc.addr" :arrow="false"/>
        <m-cell v-if="loc" label="定位时间" :value="loc.time" :arrow="false"/>
        <div class="m-action-row"><el-button size="small" type="primary" :loading="busy" icon="Location" @click="getLoc">{{ loc ? '重新定位' : '获取定位（模拟）' }}</el-button></div>
      </m-card>
      <m-card title="现场拍照">
        <div class="m-photo-box" @click="takePhoto">
          <el-icon><Camera/></el-icon>
          <span>{{ photo || '点击拍照上传（占位）' }}</span>
        </div>
      </m-card>
      <el-button type="primary" style="width:100%;margin-top:4px" :loading="submitting" @click="submit">提交签到并完成拜访</el-button>
    </template>
  </div>`,
};

const MVisitRecordsScreen = {
  components: { MSearch, MCard, MTag, MEmpty },
  setup() {
    const kw = ref('');
    const rows = computed(() => {
      let a = store.ext.activities.filter(x => x.type === '拜访' && x.status === '已完成');
      if (kw.value.trim()) a = a.filter(x => x.customer.includes(kw.value.trim()));
      return a.slice().sort((x, y) => (x.time < y.time ? 1 : -1));
    });
    return { kw, rows, mpush };
  },
  template: `<div class="m-page">
    <m-search v-model="kw" placeholder="按客户名称搜索拜访记录"/>
    <div class="m-result-tip">历史拜访 {{ rows.length }} 条</div>
    <m-empty v-if="!rows.length" text="暂无拜访记录" icon="Tickets"/>
    <div class="m-card" v-else>
      <div v-for="a in rows" :key="a.no" class="m-list-item" @click="mpush('visit-detail', {no:a.no})">
        <div class="m-ava"><el-icon><Location/></el-icon></div>
        <div style="flex:1;min-width:0"><div class="m-ellipsis" style="font-weight:600">{{ a.customer }}</div><div class="muted m-ellipsis" style="font-size:12px">{{ a.time.slice(5, 16) }} · {{ a.checkin ? a.checkin.addr : '未记录地址' }}</div></div>
        <m-tag type="success" text="已签到"/>
      </div>
    </div>
  </div>`,
};

const MScheduleNewScreen = {
  components: { MForm, MField, MCard },
  setup() {
    const draft = reactive({ customer: '', contact: '', time: TODAY + ' 15:00', type: '拜访', remark: '' });
    const customers = computed(() => store.customers.filter(c => c.status !== '流失'));
    const contacts = computed(() => draft.customer ? (store.ext.contacts || []).filter(c => c.customer === draft.customer) : []);
    const save = () => {
      if (!draft.customer) { mToast('请选择客户', 'warning'); return; }
      if (!draft.time) { mToast('请选择时间', 'warning'); return; }
      const no = msaActNo();
      store.ext.activities.unshift({ no, type: draft.type, customer: draft.customer, contact: draft.contact, opp: '', owner: MSA_OWNER, time: draft.time, content: draft.remark || ('移动端新建' + draft.type + '日程'), feedback: '', next: '', status: '计划中', checkin: null });
      msaLog('活动', '新建', '移动端新建' + draft.type + '日程（' + draft.customer + '，' + draft.time + '）');
      mToast('日程已创建：' + no, 'success');
      setTimeout(() => mback(), 400);
    };
    return { draft, customers, contacts, save, mback, mToast, MSA_ACT_TYPES };
  },
  template: `<div class="m-page">
    <m-card title="新建日程">
      <m-form>
        <m-field label="客户" required>
          <el-select v-model="draft.customer" filterable placeholder="选择客户" style="width:100%" @change="draft.contact=''">
            <el-option v-for="c in customers" :key="c.no" :label="c.name" :value="c.name"/>
          </el-select>
        </m-field>
        <m-field label="联系人">
          <el-select v-model="draft.contact" clearable placeholder="可选" style="width:100%">
            <el-option v-for="c in contacts" :key="c.no" :label="c.name + ' · ' + c.title" :value="c.name"/>
          </el-select>
        </m-field>
        <m-field label="时间" required>
          <el-date-picker v-model="draft.time" type="datetime" value-format="YYYY-MM-DD HH:mm" placeholder="选择时间" style="width:100%"/>
        </m-field>
        <m-field label="类型">
          <el-select v-model="draft.type" style="width:100%"><el-option v-for="t in MSA_ACT_TYPES" :key="t" :value="t"/></el-select>
        </m-field>
        <m-field label="备注">
          <el-input v-model="draft.remark" type="textarea" :rows="3" placeholder="填写日程目的与准备事项"/>
        </m-field>
      </m-form>
    </m-card>
    <el-button type="primary" style="width:100%" @click="save">保存日程</el-button>
  </div>`,
};

/* ========== 4. 待办 todo ========== */
const MTodoScreen = {
  components: { MCard, MTag, MEmpty },
  props: { seg: String },
  setup(props) {
    const seg = ref(props.seg || 'all');
    const segs = [['all', '全部'], ['approval', '待审批'], ['follow', '待跟进'], ['payment', '待回款'], ['ticket', '工单']];
    const approvals = computed(() => store.approvals.filter(a => a.tab === 'todo'));
    const follows = computed(() => store.ext.activities.filter(a => a.owner === MSA_OWNER && a.status === '计划中').sort((a, b) => (a.time < b.time ? -1 : 1)));
    const payments = computed(() => msaOverduePlans());
    const tickets = computed(() => store.ext.tickets.filter(t => t.status !== '已关闭').slice().sort((a, b) => (a.created < b.created ? 1 : -1)));
    const items = computed(() => {
      const out = [];
      if (seg.value === 'all' || seg.value === 'approval') approvals.value.forEach(a => out.push({ kind: 'approval', id: a.id, title: a.title, sub: a.applicant + ' · ' + a.dept, tag: a.type, extra: msaMoneyC(a.amount), status: '待审批' }));
      if (seg.value === 'all' || seg.value === 'follow') follows.value.forEach(a => out.push({ kind: 'follow', id: a.no, title: a.customer, sub: a.type + ' · ' + a.content, tag: a.type, extra: a.time.slice(5, 16), status: '待跟进' }));
      if (seg.value === 'all' || seg.value === 'payment') payments.value.forEach(p => out.push({ kind: 'payment', id: p.contract, planId: p.planId, title: p.customer, sub: p.stage + ' · 计划 ' + p.date, tag: '逾期回款', extra: msaMoney(p.amount / 100), status: '待回款' }));
      if (seg.value === 'all' || seg.value === 'ticket') tickets.value.forEach(t => out.push({ kind: 'ticket', id: t.no, title: t.customer, sub: t.type + ' · ' + t.desc, tag: t.priority, extra: t.status, status: t.status }));
      return out;
    });
    const open = it => {
      if (it.kind === 'approval') return mpush('approval-detail', { id: it.id });
      if (it.kind === 'follow') return mpush('visit-detail', { no: it.id });
      if (it.kind === 'payment') return mpush('payment-detail', { contract: it.id, id: it.planId });
      return mpush('ticket-detail', { no: it.id });
    };
    const finish = it => {
      if (it.kind === 'follow') {
        const a = store.ext.activities.find(x => x.no === it.id);
        if (a) { a.status = '已完成'; a.feedback = a.feedback || '移动端标记完成'; msaLog('活动', '完成', '移动端完成待跟进（' + a.no + '）'); mToast('已完成该跟进', 'success'); }
      } else if (it.kind === 'approval') {
        mpush('approval-detail', { id: it.id });
      } else if (it.kind === 'payment') {
        mToast('已发送催收提醒（演示）', 'success');
      } else {
        mToast('已提醒处理人（演示）', 'success');
      }
    };
    const actionText = it => it.kind === 'approval' ? '去审批' : it.kind === 'follow' ? '完成' : it.kind === 'payment' ? '催收' : '处理';
    const counts = computed(() => ({ all: approvals.value.length + follows.value.length + payments.value.length + tickets.value.length, approval: approvals.value.length, follow: follows.value.length, payment: payments.value.length, ticket: tickets.value.length }));
    return { seg, segs, items, counts, open, finish, actionText, mpush, mToast };
  },
  template: `<div class="m-page">
    <div class="m-seg m-seg-scroll">
      <span v-for="s in segs" :key="s[0]" :class="{on:seg===s[0]}" @click="seg=s[0]">{{ s[1] }}<i v-if="counts[s[0]]">{{ counts[s[0]] }}</i></span>
    </div>
    <m-empty v-if="!items.length" text="当前分类下没有待办事项" icon="CircleCheck"/>
    <div class="m-card" v-else>
      <div v-for="it in items" :key="it.kind + it.id" class="m-todo m-todo-wrap" @click="open(it)">
        <div style="flex:1;min-width:0">
          <div class="m-ellipsis" style="font-weight:600">{{ it.title }}</div>
          <div class="muted m-ellipsis" style="font-size:12px">{{ it.sub }}</div>
          <div style="display:flex;gap:6px;margin-top:4px"><m-tag type="info" :text="it.tag"/><span class="muted" style="font-size:12px">{{ it.status }}</span></div>
        </div>
        <div style="text-align:right;flex:none"><div class="m-money" style="font-size:12px">{{ it.extra }}</div><el-button size="small" type="primary" plain style="margin-top:6px" @click.stop="finish(it)">{{ actionText(it) }}</el-button></div>
      </div>
    </div>
  </div>`,
};


/* ========== 5. 我的 me ========== */
const MMeScreen = {
  components: { MCard, MCell, MTag },
  setup() {
    const unread = computed(() => store.messages.filter(m => !m.read).length);
    const myContracts = computed(() => store.ext.contracts.filter(c => c.owner === MSA_OWNER && (c.signDate || '').slice(0, 7) === TODAY.slice(0, 7)));
    const achieved = computed(() => myContracts.value.reduce((s, c) => s + (c.amount || 0), 0));
    const myCount = computed(() => myContracts.value.length);
    const target = 500000;
    const percent = computed(() => Math.min(100, Math.round(achieved.value * 100 / target)));
    const privacy = reactive(Object.assign({ location: true, album: false, contacts: false, mic: false }, (() => { try { return JSON.parse(localStorage.getItem('crm_m_auth') || '{}') || {}; } catch (e) { return {}; } })()));
    watch(privacy, v => { try { localStorage.setItem('crm_m_auth', JSON.stringify(v)); } catch (e) {} }, { deep: true });
    const entries = [
      { k: 'leads', t: '我的线索', i: 'Aim', c: 'var(--el-color-primary)' },
      { k: 'opps', t: '我的商机', i: 'TrendCharts', c: 'var(--warn)' },
      { k: 'approvals', t: '我的审批', i: 'Finished', c: 'var(--ok)' },
      { k: 'payments', t: '我的回款', i: 'Wallet', c: 'var(--el-color-primary)' },
      { k: 'tickets', t: '我的工单', i: 'Headset', c: 'var(--danger)' },
    ];
    const goEntry = e => {
      if (MSCREENS[e.k]) mgo(e.k);
      else ElMessage.warning('「' + e.t + '」将在后续阶段开放');
    };
    const logout = () => {
      ElMessageBox.confirm('退出登录后将返回登录页（原型演示，不会真的退出）。', '退出登录', { confirmButtonText: '退出', cancelButtonText: '取消', type: 'warning' })
        .then(() => mToast('已退出登录（演示）', 'success')).catch(() => {});
    };
    onMounted(() => mSetActions([{ icon: 'Bell', title: '消息通知', on: () => mpush('notices') }]));
    onBeforeUnmount(() => mSetActions([]));
    return { unread, achieved, myCount, target, percent, privacy, entries, goEntry, logout, mgo, mpush, mToast, money: msaMoney };
  },
  template: `<div class="m-page">
    <div class="m-hero m-me-hero">
      <div class="m-me-ava">张</div>
      <div><h3 style="margin:0">张三</h3><p>华东销售一部 · 销售经理 · zhangsan@example.com</p></div>
    </div>
    <m-card title="本月业绩进度">
      <div class="m-perf-top"><b>{{ money(achieved) }}</b><span class="muted">目标 {{ money(target) }}</span></div>
      <el-progress :percentage="percent" :stroke-width="10" :show-text="false"/>
      <div class="muted" style="font-size:12px;margin-top:6px">本月签约合同 {{ percent }}% · 签约 {{ myCount }} 份</div>
    </m-card>
    <m-card>
      <m-cell label="消息通知" icon="Bell" @click="mpush('notices')"><m-tag v-if="unread" type="danger" :text="unread + ' 条未读'"/><span v-else class="muted">暂无未读</span></m-cell>
      <m-cell v-for="e in entries" :key="e.k" :label="e.t" :icon="e.i" @click="goEntry(e)"/>
    </m-card>
    <m-card title="隐私与授权">
      <div class="m-auth-row"><div><div>定位权限</div><div class="muted" style="font-size:12px">用于拜访签到与轨迹记录</div></div><el-switch v-model="privacy.location" size="small"/></div>
      <div class="m-auth-row"><div><div>相册 / 拍照</div><div class="muted" style="font-size:12px">用于上传现场照片与附件</div></div><el-switch v-model="privacy.album" size="small"/></div>
      <div class="m-auth-row"><div><div>通讯录</div><div class="muted" style="font-size:12px">用于快速添加联系人（需单独授权）</div></div><el-switch v-model="privacy.contacts" size="small"/></div>
      <div class="m-auth-row"><div><div>麦克风 / 录音</div><div class="muted" style="font-size:12px">用于跟进语音转文字与通话录音留痕（需单独授权）</div></div><el-switch v-model="privacy.mic" size="small"/></div>
      <div class="muted" style="font-size:12px;margin-top:6px">录音、定位、联系人等敏感数据仅用于业务留痕，授权状态保存在本机，可随时关闭；关闭后对应功能将不可用。</div>
    </m-card>
    <el-button style="width:100%" @click="logout">退出登录</el-button>
  </div>`,
};

/* ========== 需求文档（12 要素） ========== */
const MSA_DOC_PAGES = {
  'm-home': {
    name: '移动端 · 首页', module: '移动端',
    goal: '作为移动端登录后的首屏，汇总今日待办、待审批、逾期回款三个关键数字，并提供快捷操作、今日日程与最近客户，帮助外勤销售快速进入工作。',
    roles: ['销售：查看本人待办、日程与客户', '销售经理：可查看本人及下级的待办摘要', '其他角色：按菜单权限进入'],
    enter: ['移动端登录后默认进入首页', '底部导航「首页」', 'PC 端「移动端预览」中的手机内首页'],
    layout: ['顶部问候横幅：问候语 + 日期 + 岗位 + 三个可点击统计数字', '快捷操作九宫格：新增线索 / 新增客户 / 新增商机 / 拜访签到 / 写跟进 / 扫码拍照', '今日日程列表（按时间排序）', '最近客户列表（按最近跟进时间倒序）'],
    fields: ['今日待办数｜整数｜实时计算｜说明：负责人为张三且当天计划中的活动数', '待审批数｜整数｜实时计算｜说明：审批中心待办 Tab 条数', '逾期回款数｜整数｜实时计算｜说明：回款计划日期早于今天且未结清的数量', '快捷操作｜按钮组｜说明：新增线索→线索新建屏、新增商机→商机屏、拜访签到→签到屏、写跟进→跟进新建屏、新增客户→客户屏'],
    rules: ['所有数字实时取自 store / store.ext，不使用写死假数字', '统计数字点击后跳转到待办对应分段', '今日日程与最近客户均只展示当前登录用户的数据'],
    flow: ['首页 → 新建线索 / 写跟进（push 页）或商机 / 客户 / 签到（Tab 页） → 返回后首页统计同步刷新'],
    errors: ['今日无日程：显示空态引导新建日程', '扫码 / 拍照：轻提示「将在后续阶段开放」'],
    api: ['移动端工作台汇总接口、今日日程查询、最近客户查询（示例）'],
    accept: ['三个统计数字与明细一致且可点击跳转', '快捷操作可跳到对应屏幕且表单可正常提交', '无控制台报错'],
  },
  'm-customers': {
    name: '移动端 · 客户列表', module: '移动端',
    goal: '在移动端快速检索客户：支持名称 / 编号 / 电话搜索、按客户等级与「我的客户」筛选，并分页加载，帮助外勤人员现场找到客户并进入详情。',
    roles: ['销售：查看权限范围内客户', '销售经理：查看团队客户'],
    enter: ['底部导航「客户」', '首页最近客户列表的「更多」入口'],
    layout: ['顶部搜索框', '两行筛选 chips：全部 / 战略 / 重点 / 普通 / 潜在 + 我的客户', '结果计数 + 客户卡片列表（头像、名称、地区、负责人、最近跟进、等级标签）', '底部「加载更多」按钮，每页 8 条'],
    fields: ['搜索关键字｜文本｜说明：名称 / 编号 / 电话模糊匹配', '客户等级｜枚举｜说明：全部 / 战略客户 / 重点客户 / 普通客户 / 潜在客户', '我的客户｜开关｜说明：仅显示负责人为张三的客户'],
    rules: ['筛选条件变化后重置为 8 条并回到顶部逻辑', '列表按最近跟进时间倒序', '点击客户进入客户详情屏，并保留底部客户 Tab 高亮'],
    flow: ['搜索 / 筛选 → 加载更多 → 进入客户详情 → 返回保留筛选条件'],
    errors: ['无匹配结果：显示空态提示', '已加载全部：显示「已加载全部」而非继续出现按钮'],
    api: ['移动端客户分页查询、按等级 / 负责人筛选接口（示例）'],
    accept: ['搜索与 chips 筛选即时生效，加载更多每次追加 8 条', '不同客户进入详情后数据各自独立', '无控制台报错'],
  },
  'm-customer-detail': {
    name: '移动端 · 客户详情', module: '移动端',
    goal: '移动端全景查看单个客户：基础信息、联系人、跟进、商机、合同回款与工单，并提供一键拨号、写跟进、新建商机三个高频操作。',
    roles: ['负责人销售：查看并写跟进 / 新建商机', '销售经理：查看团队客户', '其他角色：只读'],
    enter: ['客户列表点击客户卡片', '首页最近客户点击进入'],
    layout: ['头部客户信息卡：首字头像、名称、编号、行业、等级 / 状态 / 负责人标签', '操作行：一键拨号 / 写跟进 / 新建商机', '分段 Tab：概况 / 联系人 / 跟进 / 商机 / 合同回款 / 工单', '各 Tab 使用该客户自己的 custBundle 数据渲染'],
    fields: ['客户编号｜只读｜格式 KH-年月-序号', '联系人｜列表｜点击可拨号（占位）', '商机金额 / 合同金额 / 回款计划｜货币｜只读', '工单状态 / 优先级｜枚举｜只读'],
    rules: ['详情数据必须使用该客户自己的联系人、跟进、商机、合同、工单，不与其他客户串用', '写跟进会真实新增一条已完成电话跟进并写入操作日志', '新建商机会真实写入 store.opps 并切换到商机 Tab'],
    flow: ['客户详情 → 写跟进（新增记录）→ 跟进 Tab 即时刷新', '客户详情 → 新建商机 → 商机 Tab 出现新记录'],
    errors: ['客户不存在（被合并）：显示空态并提示', '无联系人：联系人 Tab 显示空态', '新建商机名称为空：弹窗校验拦截'],
    api: ['客户 360 查询、联系人 / 跟进 / 商机 / 合同 / 工单子查询、新增跟进、新建商机（示例）'],
    accept: ['不同客户详情数据各不相同', '拨号、写跟进、新建商机均有明确反馈且写操作真实生效', '无控制台报错'],
  },
  'm-schedule': {
    name: '移动端 · 日程', module: '移动端',
    goal: '以周历条展示本周安排，按天查看负责人张三的活动，并提供新建日程、拜访签到、拜访记录三个入口，服务外勤拜访场景。',
    roles: ['销售：查看与新建本人日程', '销售经理：查看本人日程'],
    enter: ['底部导航「日程」', '首页今日日程的「查看全部」'],
    layout: ['顶部周历条：周一至周日，显示日期与当天活动数，今天与选中日高亮', '日期标题 + 活动数', '操作行：新建日程 / 拜访签到 / 拜访记录', '当日活动列表（时间、客户、类型、内容、状态）'],
    fields: ['日期｜日期｜必填：是｜说明：默认今天，可点周历切换', '活动类型｜枚举｜说明：拜访 / 电话 / 微信 / 会议 / 邮件', '活动状态｜枚举｜说明：计划中 / 已完成 / 已取消'],
    rules: ['周历固定以今天所在周展示，活动数为张三当天活动数', '点击活动进入活动详情，可继续签到或标记完成', '无活动时显示空态并引导新建日程'],
    flow: ['计划中 → 签到完成 / 标记完成 → 已完成；已取消活动不在签到候选内'],
    errors: ['当天无安排：空态提示', '活动不存在：详情屏显示空态'],
    api: ['移动端日程按周 / 按日查询、新建日程接口（示例）'],
    accept: ['周历切换与当日列表联动正确', '三个入口可正常跳转', '无控制台报错'],
  },
  'm-visit-detail': {
    name: '移动端 · 活动详情', module: '移动端',
    goal: '查看单条跟进 / 拜访活动的完整信息：客户、联系人、时间、跟进内容、客户反馈与签到信息，并作为签到与完成操作的落点。',
    roles: ['负责人销售：查看、签到、标记完成', '销售经理：查看团队活动'],
    enter: ['日程活动列表点击', '客户详情跟进 Tab 点击', '待办「待跟进」点击', '拜访记录点击'],
    layout: ['活动信息卡（编号 / 类型 / 状态 / 客户 / 联系人 / 时间 / 负责人）', '跟进内容卡', '客户反馈卡（有反馈时显示）', '签到信息卡（已签到时显示地址 / 时间 / 坐标 / 照片）', '底部操作：拜访签到 / 标记完成 / 拜访记录'],
    fields: ['活动编号｜只读｜格式 HD-6 位序号', '签到地址 / 时间 / 坐标｜只读｜签到后生成', '客户反馈｜长文本｜只读展示（本屏）'],
    rules: ['计划中的拜访活动显示「拜访签到」，其他计划中活动显示「标记完成」', '标记完成会写入客户反馈与操作日志', '已完成活动不显示签到 / 完成按钮'],
    flow: ['计划中 → 拜访签到 / 标记完成 → 已完成'],
    errors: ['活动编号不存在：空态提示', '重复点击完成：按钮随状态消失'],
    api: ['活动详情查询、标记完成接口（示例）'],
    accept: ['各卡片数据与该活动自身数据一致', '签到后返回本屏状态与签到信息即时更新', '无控制台报错'],
  },
  'm-visit-checkin': {
    name: '移动端 · 拜访签到', module: '移动端',
    goal: '完成外勤拜访签到：提示定位授权、模拟获取定位地址与时间、拍照上传占位，提交后把拜访活动置为已完成并生成签到信息。',
    roles: ['销售：签到自己负责的拜访活动', '销售经理：可代签（原型不做校验）'],
    enter: ['日程页「拜访签到」', '活动详情页「拜访签到」', '首页快捷操作「拜访签到」'],
    layout: ['顶部定位授权说明条', '拜访信息卡（活动编号 / 客户 / 计划时间 / 当前状态）', '定位卡：模拟地图 + 获取定位按钮 + 地址 / 时间', '拍照卡：点击上传占位', '底部提交按钮'],
    fields: ['定位地址｜文本｜必填：是｜说明：获取后显示，模拟生成', '定位时间｜日期时间｜必填：是', '现场照片｜图片｜选填｜说明：原型为文件名占位', '签到状态｜枚举｜提交后活动状态变为已完成'],
    rules: ['未获取定位不允许提交', '无指定活动时自动选择张三最近一条计划中的拜访活动', '提交后写入活动签到信息、客户反馈并记录操作日志'],
    flow: ['计划中拜访 → 获取定位 → 拍照 → 提交 → 已完成（生成签到记录）'],
    errors: ['未定位提交：轻提示拦截', '无待签到活动：自动创建一条临时拜访，保证流程可演示'],
    api: ['定位获取、照片上传、签到提交接口（示例，原型为模拟）'],
    accept: ['模拟定位与拍照反馈明确', '提交后活动状态变为已完成且签到信息可见', '无控制台报错'],
  },
  'm-visit-records': {
    name: '移动端 · 拜访记录', module: '移动端',
    goal: '集中查看历史已完成的拜访记录，支持按客户名称搜索，并可进入活动详情查看签到地址与跟进内容。',
    roles: ['销售：查看本人及团队拜访记录（原型展示全部已完成拜访）'],
    enter: ['日程页「拜访记录」', '活动详情页「拜访记录」', '我的页后续入口'],
    layout: ['顶部搜索框', '记录计数', '拜访列表：客户、时间、签到地址、已签到标签'],
    fields: ['搜索关键字｜文本｜说明：按客户名称模糊匹配', '签到地址｜文本｜只读｜来自活动签到信息'],
    rules: ['仅展示类型为拜访且状态为已完成的记录', '按拜访时间倒序排列', '点击记录进入活动详情'],
    flow: ['签到完成 → 出现在拜访记录列表 → 点击查看详情'],
    errors: ['无记录：空态提示', '搜索无结果：空态提示'],
    api: ['拜访记录查询、按客户搜索接口（示例）'],
    accept: ['签到后的记录会出现在列表顶部', '搜索可用，点击可进入详情', '无控制台报错'],
  },
  'm-schedule-new': {
    name: '移动端 · 新建日程', module: '移动端',
    goal: '在移动端快速创建一条日程 / 拜访计划：选择客户、联系人、时间、类型并填写备注，保存后成为计划中活动。',
    roles: ['销售：为自己新建日程'],
    enter: ['日程页「新建日程」', '日程页右上角加号'],
    layout: ['表单卡：客户 / 联系人 / 时间 / 类型 / 备注', '底部保存按钮'],
    fields: ['客户｜选择｜必填：是｜校验：必须选择有效客户', '联系人｜选择｜选填｜选项随客户联动', '时间｜日期时间｜必填：是｜默认今天 15:00', '类型｜枚举｜必填：是｜默认拜访', '备注｜长文本｜选填｜作为跟进内容'],
    rules: ['未选客户或时间为空时不允许保存并给出轻提示', '保存后新增活动状态为「计划中」，负责人为张三', '新增成功后返回上一屏，日程列表刷新'],
    flow: ['填写 → 保存 → 新增计划中活动 → 返回日程'],
    errors: ['客户 / 时间缺失：轻提示拦截', '保存成功后自动返回，避免重复提交'],
    api: ['移动端新建活动接口（示例）'],
    accept: ['表单校验生效', '保存后活动出现在对应日期日程中', '无控制台报错'],
  },
  'm-todo': {
    name: '移动端 · 待办', module: '移动端',
    goal: '集中处理移动端待审批、待跟进、待回款与工单：按分段筛选，点击进入对应详情，并支持快捷完成 / 审批 / 催收操作。',
    roles: ['审批人：处理待审批', '销售：处理待跟进与待回款', '交付 / 客服：处理工单'],
    enter: ['底部导航「待办」', '首页三个统计数字点击进入对应分段'],
    layout: ['分段栏：全部 / 待审批 / 待跟进 / 待回款 / 工单（带数量）', '待办列表：标题、摘要、标签、状态、金额 / 时间', '每项右侧操作按钮（去审批 / 完成 / 催收 / 处理）'],
    fields: ['待办类型｜枚举｜说明：审批 / 跟进 / 回款 / 工单', '状态｜文本｜说明：待审批 / 待跟进 / 待回款 / 工单状态', '金额｜货币｜说明：审批金额或逾期回款金额'],
    rules: ['待审批来自 store.approvals 中 tab=todo', '待跟进来自负责人张三、状态计划中的活动', '待回款为逾期未结清的回款计划', '完成待跟进后状态变为已完成并从列表消失'],
    flow: ['待审批 → 审批详情（同意 / 拒绝 / 转交）；待跟进 → 活动详情；待回款 → 回款详情（可登记核销）；工单 → 工单详情（接单后处理）'],
    errors: ['无待办：空态提示', '审批拒绝未填原因：弹窗拦截', '条目被处理后从待办列表即时消失'],
    api: ['移动端待办汇总、审批处理、活动完成、回款催收转发、工单转派接口（示例）'],
    accept: ['分段数量与列表一致', '四类待办点击均可进入对应详情屏', '完成跟进后条目消失且活动状态更新', '无控制台报错'],
  },
  'm-me': {
    name: '移动端 · 我的', module: '移动端',
    goal: '展示个人信息、本月业绩进度、通知入口、业务功能入口与隐私授权开关，并提供退出登录占位。',
    roles: ['全体移动端用户'],
    enter: ['底部导航「我的」'],
    layout: ['个人信息横幅：头像、姓名、部门 / 岗位 / 邮箱', '本月业绩进度：实际签约金额 / 目标、进度条', '消息通知入口（未读数）', '业务入口：我的线索 / 商机 / 审批 / 回款 / 工单', '隐私与授权：定位 / 相册 / 通讯录开关', '退出登录按钮'],
    fields: ['本月业绩｜货币｜实时计算｜说明：本月本人签约合同金额汇总', '业绩目标｜货币｜说明：示例目标 500,000', '通知未读数｜整数｜实时计算', '授权开关｜布尔｜说明：定位 / 相册 / 通讯录，存 localStorage'],
    rules: ['业绩进度由本月本人合同实时汇总，不写死', '业务入口跳转对应屏幕：线索 / 商机 / 审批 / 回款 / 工单', '隐私开关状态写入 localStorage（crm_m_auth）并在刷新后恢复', '退出登录为原型演示，需二次确认'],
    flow: ['我的 → 通知 / 线索 / 商机 / 审批 / 回款 / 工单 / 授权设置 → 返回'],
    errors: ['无本月签约：进度 0% 且显示 ¥0'],
    api: ['个人资料、本月业绩汇总、通知未读数、授权状态接口（示例）'],
    accept: ['业绩进度与本月合同数据一致', '通知未读数与消息数据一致', '五个业务入口可跳转且返回后状态保留', '授权开关刷新后保持', '无控制台报错'],
  },
};
Object.entries(MSA_DOC_PAGES).forEach(([k, c]) => { DOCS_DEFAULT[k] = mkDoc(k, c); });

/* ========== 注册屏幕 ========== */
registerMScreen('home', MHomeScreen, { title: '首页', doc: 'm-home', tab: 'home' });
registerMScreen('customers', MCustomersScreen, { title: '客户', doc: 'm-customers', tab: 'cust' });
registerMScreen('customer-detail', MCustomerDetailScreen, { title: '客户详情', doc: 'm-customer-detail', tab: 'cust' });
registerMScreen('schedule', MScheduleScreen, { title: '日程', doc: 'm-schedule', tab: 'sched' });
registerMScreen('visit-detail', MVisitDetailScreen, { title: '活动详情', doc: 'm-visit-detail', tab: 'sched' });
registerMScreen('visit-checkin', MVisitCheckinScreen, { title: '拜访签到', doc: 'm-visit-checkin', tab: 'sched' });
registerMScreen('visit-records', MVisitRecordsScreen, { title: '拜访记录', doc: 'm-visit-records', tab: 'sched' });
registerMScreen('schedule-new', MScheduleNewScreen, { title: '新建日程', doc: 'm-schedule-new', tab: 'sched' });
registerMScreen('todo', MTodoScreen, { title: '待办', doc: 'm-todo', tab: 'todo' });
registerMScreen('me', MMeScreen, { title: '我的', doc: 'm-me', tab: 'me' });
