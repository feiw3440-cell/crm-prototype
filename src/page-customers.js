const LEVEL_TAG = { 战略客户: 'warning', 重点客户: 'primary', 普通客户: 'info', 潜在客户: 'success' };
const CUST_STATUS_TAG = { 正常: 'success', 跟进中: 'primary', 暂停合作: 'warning', 流失: 'danger' };
const CustomersPage = {
  components: { ListPage },
  props: { tab: { type: String, default: 'all' } },
  setup(props) {
    const TABS = { all: '客户列表', my: '我的客户', pool: '客户公海', key: '重点客户', category: '客户分类', recycle: '客户回收站' };
    const cat = ref('');
    const rows = computed(() => {
      let list = store.customers;
      if (props.tab === 'my') list = list.filter(c => c.owner === '张三');
      else if (props.tab === 'pool') list = list.filter(c => !c.owner);
      else if (props.tab === 'key') list = list.filter(c => c.key);
      else if (props.tab === 'recycle') list = list.filter(c => c.status === '流失' || c.status === '已合并' || c.archived);
      else if (props.tab === 'category') {
        if (cat.value) list = list.filter(c => c.industry === cat.value);
        return list.slice().sort((a, b) => String(a.industry || '').localeCompare(String(b.industry || ''), 'zh') || String(a.level || '').localeCompare(String(b.level || ''), 'zh'));
      }
      return list;
    });
    const t = computed(() => TABS[props.tab]);
    const totalText = computed(() => t.value + '共 ' + rows.value.length + ' 家');
    const stats = computed(() => [['客户总数', String(store.customers.length), '', '含公海客户'], ['本月新增', String(store.customers.filter(c => c.created && c.created.startsWith('2026-11')).length), 'ok'], ['重点 / 战略客户', String(store.customers.filter(c => c.key).length), ''], ['超 14 天未跟进', String(store.customers.filter(c => c.owner && daysBetween(c.lastFollow, TODAY) > 14).length), 'warn'], ['流失客户', String(store.customers.filter(c => c.status === '流失').length), 'danger']]);
    const cols = [
      { p: 'no', l: '客户编号', w: 140 }, { p: 'name', l: '客户名称', w: 220, link: true }, { p: 'type', l: '客户类型', w: 100 }, { p: 'industry', l: '行业分类', w: 120 },
      { p: 'level', l: '客户等级', w: 100, tag: LEVEL_TAG }, { p: 'source', l: '客户来源', w: 100 }, { p: 'region', l: '所属区域', w: 130 }, { p: 'scale', l: '客户规模', w: 80 },
      { p: 'owner', l: '客户负责人', w: 100 }, { p: 'status', l: '客户状态', w: 100, tag: CUST_STATUS_TAG }, { p: 'lastFollow', l: '最近跟进', w: 110 }, { p: 'lastDeal', l: '最近成交', w: 110 },
      { p: 'total', l: '累计成交金额', w: 130, money: true }, { p: 'created', l: '创建时间', w: 110 }];
    const dlg = reactive({ transfer: false, batch: false });
    const target = ref([]); const tf = reactive({ owner: '', reason: '' });
    const quick = reactive({ level: '', status: '' });
    const openTransfer = (rows) => { if (!rows.length) return ElMessage.warning('请先勾选客户'); target.value = rows; Object.assign(tf, { owner: '', reason: '' }); dlg.transfer = true; };
    const writeOwnerLog = (row, oldOwner, act) => {
      store.ext.logs.unshift({ time: TODAY + ' 09:00', who: '张三', module: '客户', act, detail: `客户「${row.name}」（${row.no}）负责人 ${oldOwner || '（公海）'} → ${tf.owner}；原因：${tf.reason}` });
    };
    const doTransfer = () => {
      if (!tf.owner) return ElMessage.warning('请选择新负责人'); if (!tf.reason) return ElMessage.warning('请填写转移原因（将写入负责人变更日志）');
      const keyOnes = target.value.filter(c => c.key);
      const direct = target.value.filter(c => !c.key);
      if (keyOnes.length) {
        keyOnes.forEach(c => store.ext.logs.unshift({ time: TODAY + ' 09:00', who: '张三', module: '客户', act: '提交客户转移审批', detail: `客户「${c.name}」（${c.no}）申请由 ${c.owner || '（公海）'} 转给 ${tf.owner}；原因：${tf.reason}；需原负责人直属经理审批后生效` }));
        direct.forEach(c => { const old = c.owner; c.owner = tf.owner; writeOwnerLog(c, old, '负责人变更'); });
        dlg.transfer = false;
        return ElNotification({ title: '已提交审批', message: `其中 ${keyOnes.length} 家重点客户转移需「原负责人直属经理」审批，审批通过后生效；其余 ${direct.length} 家已直接转移。`, type: 'warning', duration: 5000 });
      }
      target.value.forEach(c => { const old = c.owner; c.owner = tf.owner; writeOwnerLog(c, old, '负责人变更'); });
      dlg.transfer = false; ElMessage.success(`已转移 ${target.value.length} 家客户，变更日志已保留（原负责人 → ${tf.owner}）`);
    };
    const claim = row => {
      let cfg;
      try { cfg = prRead().custs || {}; } catch (e) { cfg = {}; }
      const days = cfg.protectDays == null ? 30 : cfg.protectDays;
      if (cfg.scope && cfg.scope.length && !cfg.scope.includes(row.level)) return ElMessage.warning(`当前公海规则仅允许领取等级：${cfg.scope.join(' / ')}，该客户等级为「${row.level}」`);
      const mine = store.customers.filter(c => c.owner === '张三');
      if (cfg.holdLimit != null && mine.length >= cfg.holdLimit) return ElMessage.warning(`已达同时持有上限 ${cfg.holdLimit} 家，请先释放部分客户后再领取`);
      const todayClaimed = mine.filter(c => c.claimedAt === TODAY).length;
      if (cfg.dailyLimit != null && todayClaimed >= cfg.dailyLimit) return ElMessage.warning(`已达今日领取上限 ${cfg.dailyLimit} 家，请明日再领取`);
      ElMessageBox.confirm(`确认领取客户「${row.name}」？领取后保护期 ${days} 天，保护期内不自动释放。`, '领取客户', { type: 'info' }).then(() => {
        row.owner = '张三'; row.lastFollow = TODAY; row.claimedAt = TODAY; row.protectUntil = extAddDays(TODAY, days);
        store.ext.logs.unshift({ time: TODAY + ' 09:00', who: '张三', module: '客户', act: '领取客户', detail: `从客户公海领取「${row.name}」（${row.no}），保护期至 ${row.protectUntil}` });
        ElMessage.success('领取成功');
      }).catch(() => {});
    };
    const openDrawerInit = row => { quick.level = row.level; quick.status = row.status; };
    const saveQuick = (row, close) => { row.level = quick.level; row.status = quick.status; ElMessage.success('已保存（快捷编辑）'); close(); };
    return { rows, t, TABS, cat, stats, cols, dlg, target, tf, quick, openTransfer, doTransfer, claim, openDrawerInit, saveQuick, OWNERS, INDUSTRIES, go, fmtY, tab: computed(() => props.tab), totalText, levelTag: LEVEL_TAG, stTag: CUST_STATUS_TAG };
  },
  template: `<div>
    <list-page :crumbs="['客户管理', t]" :title="t" :total-text="totalText" :stats="stats" :rows="rows" :cols="cols" :action-width="230" drawer-title="客户快速查看 / 快捷编辑"
      :filters="[{k:'kw',label:'搜索客户',ph:'搜索客户（编号 / 名称）'},{k:'type',label:'客户类型',opts:['企业客户','个人客户','渠道客户']},{k:'level',label:'客户等级',opts:['战略客户','重点客户','普通客户','潜在客户']},{k:'owner',label:'负责人',opts:OWNERS},{k:'status',label:'客户状态',opts:['正常','跟进中','暂停合作','流失']}]"
      @link="(c,row) => $go('/customer/'+row.no)">
      <template #top><el-tabs :model-value="tab" @tab-change="k => $go(k==='all'?'/customers':'/customers/'+k)" style="margin-bottom:6px"><el-tab-pane v-for="(v,k) in TABS" :key="k" :label="v" :name="k"/></el-tabs>
        <div v-if="tab==='category'" style="display:flex;align-items:center;gap:10px;padding:0 2px 10px"><span class="muted">按行业分类查看：</span><el-select v-model="cat" clearable placeholder="全部行业" size="small" style="width:180px"><el-option v-for="x in INDUSTRIES" :key="x" :label="x" :value="x"/></el-select><span class="muted" style="font-size:12px">当前共 {{ rows.length }} 家，按行业与客户等级排序</span></div>
      </template>
      <template #ops="{sel}">
        <el-button type="primary" icon="Plus" @click="$msg.info('示例：新增客户表单（必填项标星，保存前校验格式）')">新增客户</el-button>
        <el-button icon="Upload" @click="$msg.info('示例：导入客户（查重 → 必填校验 → 错误行反馈 → 结果统计）')">导入</el-button>
        <el-button icon="Download" @click="$msg.info('示例：导出（敏感字段按权限脱敏）')">导出</el-button>
        <el-button icon="Switch" @click="openTransfer(sel)">批量分配 / 转移<template v-if="sel.length">（{{ sel.length }}）</template></el-button>
      </template>
      <template #cell-name="{row}"><a class="link" @click="$go('/customer/'+row.no)">{{ row.name }}</a><el-tag v-if="row.key" size="small" type="danger" effect="plain" style="margin-left:6px;transform:scale(.9)">重点</el-tag></template>
      <template #cell-owner="{row}"><span v-if="row.owner">{{ row.owner }}</span><span v-else class="muted">（公海）</span></template>
      <template #actions="{row,open}">
        <el-button link type="primary" @click="openDrawerInit(row); open(row)">查看</el-button>
        <el-button link type="primary" @click="$go('/customer/'+row.no)">详情</el-button>
        <el-button v-if="!row.owner" link type="success" @click="claim(row)">领取</el-button>
        <el-button v-else link type="primary" @click="openTransfer([row])">转移</el-button>
        <el-dropdown trigger="click" @command="c => (c==='客户合并' ? (MERGE_STATE.from=row.name, $go('/customers/merge')) : $msg.info('示例：'+c))"><el-button link type="primary">更多<el-icon class="el-icon--right"><arrow-down/></el-icon></el-button>
          <template #dropdown><el-dropdown-menu><el-dropdown-item command="新建商机">新建商机</el-dropdown-item><el-dropdown-item command="记录跟进">记录跟进</el-dropdown-item><el-dropdown-item command="客户合并（保留关联商机/合同/跟进记录）">客户合并</el-dropdown-item><el-dropdown-item command="作废/归档（需填写原因）">作废</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      </template>
      <template #drawer="{row,close}">
        <div v-if="row">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><div class="cust-logo" style="width:46px;height:46px;font-size:20px">{{ row.name[0] }}</div><div><div style="font-size:17px;font-weight:600">{{ row.name }}</div><div class="muted">{{ row.no }} · {{ row.industry }} · {{ row.region }}</div></div></div>
          <div class="sum-cards" style="margin:0 0 16px"><div class="sum-card" style="flex:1"><div class="v">{{ yuan0(row.total) }}</div><div class="l">累计成交</div></div><div class="sum-card" style="flex:1"><div class="v">{{ row.lastFollow }}</div><div class="l">最近跟进</div></div></div>
          <el-descriptions :column="1" border size="small"><el-descriptions-item label="负责人">{{ row.owner || '（公海）' }}</el-descriptions-item><el-descriptions-item label="联系电话">{{ row.phone }}</el-descriptions-item><el-descriptions-item label="客户来源">{{ row.source }}</el-descriptions-item><el-descriptions-item label="客户规模">{{ row.scale }}</el-descriptions-item></el-descriptions>
          <div class="sec-title" style="margin-top:18px">快捷编辑</div>
          <el-form label-width="84px"><el-form-item label="客户等级"><el-select v-model="quick.level"><el-option v-for="x in ['战略客户','重点客户','普通客户','潜在客户']" :key="x" :value="x"/></el-select></el-form-item>
          <el-form-item label="客户状态"><el-select v-model="quick.status"><el-option v-for="x in ['正常','跟进中','暂停合作','流失']" :key="x" :value="x"/></el-select></el-form-item></el-form>
          <el-button type="primary" @click="saveQuick(row, close)">保存</el-button><el-button @click="$go('/customer/'+row.no)">查看完整详情</el-button>
        </div>
      </template>
    </list-page>
    <el-dialog v-model="dlg.transfer" title="客户转移 / 批量分配" width="480px">
      <el-alert type="info" show-icon :closable="false" style="margin-bottom:14px" :title="'本次操作将影响 '+target.length+' 家客户：'+target.slice(0,3).map(c=>c.name).join('、')+(target.length>3?' 等':'')"/>
      <el-alert v-if="target.some(c=>c.key)" type="warning" show-icon :closable="false" style="margin-bottom:14px" title="包含重点客户：转移需原负责人直属经理审批（方案 7.2）"/>
      <el-form label-width="90px"><el-form-item label="新负责人" required><el-select v-model="tf.owner" placeholder="请选择"><el-option v-for="o in OWNERS" :key="o" :value="o"/></el-select></el-form-item>
      <el-form-item label="转移原因" required><el-input type="textarea" :rows="3" v-model="tf.reason" placeholder="将写入负责人变更日志（原负责人、新负责人、时间、原因）"/></el-form-item></el-form>
      <template #footer><el-button @click="dlg.transfer=false">取消</el-button><el-button type="primary" @click="doTransfer">确认</el-button></template>
    </el-dialog>
  </div>`,
};
const yuan0 = n => n ? '¥' + (n >= 10000 ? (n / 10000).toLocaleString('zh-CN', { maximumFractionDigits: 1 }) + '万' : fmtY(n)) : '¥0';

/* ===== 客户详情（方案 5.3 · 数据全部按当前客户取自 custBundle / store） ===== */
const CustomerDetail = {
  components: { PageHead, RelationGraph },
  props: { no: String },
  setup(props) {
    const c = computed(() => store.customers.find(x => x.no === props.no));
    const b = computed(() => c.value ? custBundle(c.value.name) : null);
    const tab = ref('base');
    const showPhone = ref(false);
    const fullPhone = computed(() => (c.value || {}).phone ? c.value.phone.replace(/\*/g, '8') : '');
    /* ---- 跟进记录（该客户自己的活动 + 新增） ---- */
    const doFollow = () => { if (!ff.content) return ElMessage.warning('请填写跟进内容');
      store.ext.activities.unshift({ no: 'HD-N' + String(store.ext.activities.length + 1).padStart(6, '0'), type: ff.type, customer: c.value.name, contact: b.value.contacts[0] ? b.value.contacts[0].name : '', opp: cform.opp || '', owner: c.value.owner || '', time: TODAY + ' 07:00', content: ff.content, feedback: ff.fb || '-', next: ff.next ? ff.next.replace('T', ' ') + ' 跟进（已生成待办）' : '', status: '已完成', checkin: null });
      logsExtra.value.unshift({ t: TODAY + ' 07:00', who: '张三', act: '新增跟进记录', d: ff.type + ' · ' + ff.content.slice(0, 20) });
      c.value.lastFollow = TODAY; dlg.follow = false; Object.assign(ff, { type: '电话', content: '', fb: '', next: '' }); ElMessage.success('跟进记录已添加到时间线'); };
    const ff = reactive({ type: '电话', content: '', fb: '', next: '' });
    const follows = computed(() => b.value ? b.value.activities.slice().sort((x, y) => (x.time < y.time ? 1 : -1)) : []);
    const fType = ref('');
    const fShow = computed(() => follows.value.filter(f => !fType.value || f.type.includes(fType.value)));
    const fcount = computed(() => fShow.value.length);
    const dlg = reactive({ follow: false, owner: false, create: false });
    /* ---- 操作日志（按当前客户过滤 + 本页面动作） ---- */
    const logsExtra = ref([]);    const logs = computed(() => {
      if (!c.value || !b.value) return logsExtra.value;
      const base = store.ext.logs.filter(x => x.detail.includes(c.value.name)).slice(0, 8).map(x => ({ t: x.time, who: x.who, act: x.module + ' · ' + x.act, d: x.detail }));
      return logsExtra.value.concat(base);
    });
    const ownerForm = reactive({ owner: '', reason: '' });
    const doOwner = () => {
      if (!ownerForm.owner || !ownerForm.reason) return ElMessage.warning('请选择新负责人并填写变更原因');
      if (ownerForm.owner === c.value.owner) return ElMessage.warning('新负责人与当前负责人相同');
      store.ext.logs.unshift({ time: TODAY + ' 07:00', who: '张三', module: '客户', act: c.value.key ? '提交负责人变更审批' : '变更负责人', detail: `客户「${c.value.name}」（${c.value.no}）负责人 ${c.value.owner || '（公海）'} → ${ownerForm.owner}；原因：${ownerForm.reason}` });
      if (c.value.key) { dlg.owner = false; ElNotification({ title: '已提交审批', message: '重点客户变更负责人需直属经理审批，审批通过后生效；变更日志已记录。', type: 'warning' }); return; }
      c.value.owner = ownerForm.owner; dlg.owner = false; ElMessage.success('负责人已变更，变更日志已保留');
    };
    const createCfg = {
      contact: { title: '新建联系人', f: [['姓名', 'name'], ['联系电话', 'phone'], ['职务', 'title']] },
      opp: { title: '新建商机', f: [['商机名称', 'name'], ['预计金额（元）', 'amount'], ['预计成交日期', 'date']] },
      quote: { title: '新建报价', f: [['关联商机', 'opp'], ['有效期至', 'date']] },
      contract: { title: '新建合同', f: [['合同名称', 'name'], ['合同金额（元）', 'amount']] },
      order: { title: '新建订单', f: [['关联合同', 'contract'], ['订单金额（元）', 'amount']] },
    };
    const createType = ref('contact'); const cform = reactive({});
    const openCreate = t => { createType.value = t; Object.keys(cform).forEach(k => delete cform[k]); dlg.create = true; };
    const doCreate = () => {
      const cfg = createCfg[createType.value]; if (cfg.f.some(([l, k]) => !cform[k])) return ElMessage.warning('请填写所有必填项');
      logsExtra.value.unshift({ t: TODAY + ' 07:00', who: '张三', act: cfg.title, d: '客户：' + c.value.name }); dlg.create = false; ElMessage.success(cfg.title.replace('新建', '') + '已创建，并关联到当前客户');
    };
    /* ---- 汇总 / 生命周期（全部按当前客户实际数据计算） ---- */
    const ctAmount = computed(() => b.value ? b.value.contracts.reduce((s, x) => s + (x.amount || 0), 0) : 0);
    const sum = computed(() => b.value ? { opp: b.value.opps.length, ct: b.value.contracts.length, total: c.value.total ? yuan0(c.value.total) : (ctAmount.value ? wan(ctAmount.value) : '¥0') } : { opp: 0, ct: 0, total: '¥0' });
    /* ---- 回款：按该客户合同回款计划计算（store.pay 有精确到账记录的用记录，其余按计划状态推算） ---- */
    const payRows = computed(() => {
      if (!b.value) return [];
      return b.value.contracts.map(ct => {
        const amountC = Math.round((ct.amount || 0) * 100);
        const pc = store.pay.contracts.find(p => p.no === ct.no);
        let got;
        if (pc) got = store.pay.records.filter(r => r.contract === ct.no).reduce((s, r) => s + r.amount, 0);
        else got = (ct.plans || []).reduce((s, p) => s + Math.round(p.amount * 100 * (p.status === '已回款' ? 1 : p.status === '部分回款' ? 0.5 : 0)), 0);
        const rest = Math.max(0, amountC - got);
        const od = (ct.plans || []).filter(p => p.date < TODAY && p.status !== '已回款' && p.amount > 0).length;
        return { no: ct.no, amtC: amountC, gotC: got, restC: rest, od: rest <= 0 ? '已结清' : (od ? '有 ' + od + ' 期已逾期' : '未结清') };
      });
    });
    const paySum = computed(() => ({ got: payRows.value.reduce((s, r) => s + r.gotC, 0), rest: payRows.value.reduce((s, r) => s + r.restC, 0) }));
    const openCnt = computed(() => (b.value ? b.value.tickets.filter(t => t.status !== '已关闭').length : 0));
    /* ---- 组织关系：按联系人汇报关系生成树 ---- */
    const orgTree = computed(() => {
      const cs = b.value ? b.value.contacts : [];
      const kids = {}; cs.forEach(x => kids[x.no] = []);
      const roots = [];
      cs.forEach(x => { if (x.reportsTo && kids[x.reportsTo]) kids[x.reportsTo].push(x); else roots.push(x); });
      const wrap = n => ({ label: n.name + ' · ' + n.title + (n.role === '决策人' ? '（决策人）' : ''), children: (kids[n.no] || []).map(wrap) });
      return roots.map(wrap);
    });
    const stgName = o => o.stage === 'close' ? (o.result || '已结束') : ((STAGES.find(s => s.key === o.stage) || {}).name || o.stage);
    const oppStTag = o => o.stage === 'close' ? (o.result === '赢单' ? 'success' : 'danger') : (o.stage === 'quote' || o.stage === 'approve' ? 'primary' : 'info');
    return { c, b, tab, showPhone, fullPhone, ff, fType, fShow, fcount, dlg, follows, doFollow, logs, ownerForm, doOwner, createCfg, createType, cform, openCreate, doCreate, sum, ctAmount, payRows, paySum, openCnt, orgTree, stgName, oppStTag, OWNERS, MERGE_STATE, levelTag: LEVEL_TAG, stTag: CUST_STATUS_TAG, fmtC, fmtY, yuan, wan };
  },
  template: `<div v-if="c">
    <el-breadcrumb separator="/" class="crumb"><el-breadcrumb-item><a @click="$go('/customers')">客户管理</a></el-breadcrumb-item><el-breadcrumb-item><a @click="$go('/customers')">客户列表</a></el-breadcrumb-item><el-breadcrumb-item>{{ c.name }}</el-breadcrumb-item></el-breadcrumb>
    <div class="card cust-head">
      <div class="cust-logo">{{ c.name[0] }}</div>
      <div>
        <h2>{{ c.name }}<el-tag :type="levelTag[c.level]" size="small">{{ c.level }}</el-tag><el-tag :type="stTag[c.status]" size="small" effect="plain">{{ c.status === '正常' ? '正常合作' : c.status }}</el-tag><el-tag type="info" size="small" effect="plain">{{ c.industry }}</el-tag></h2>
        <div class="cust-meta"><span>客户编号：<b>{{ c.no }}</b></span><span>负责人：<b>{{ c.owner || '（公海）' }}</b> <a @click="dlg.owner=true;ownerForm.owner='';ownerForm.reason=''" style="margin-left:4px">变更</a></span><span>联系电话：<b>{{ showPhone ? fullPhone : c.phone }}</b> <a @click="showPhone=!showPhone;$msg.info(showPhone?'已显示完整号码（敏感字段访问已记录日志）':'已脱敏')">{{ showPhone ? '隐藏' : '显示' }}</a></span></div>
        <div style="margin-top:10px;display:flex;gap:8px">
          <el-button type="primary" size="small" icon="EditPen" @click="dlg.follow=true">记录跟进</el-button>
          <el-dropdown trigger="click" @command="openCreate"><el-button size="small" icon="Plus">新建<el-icon class="el-icon--right"><arrow-down/></el-icon></el-button>
            <template #dropdown><el-dropdown-menu><el-dropdown-item command="contact">联系人</el-dropdown-item><el-dropdown-item command="opp">商机</el-dropdown-item><el-dropdown-item command="quote">报价</el-dropdown-item><el-dropdown-item command="contract">合同</el-dropdown-item><el-dropdown-item command="order">订单</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
          <el-button size="small" @click="$msg.info('示例：编辑客户')">编辑</el-button>
          <el-button size="small" @click="MERGE_STATE.from = c.name; $go('/customers/merge')">客户合并</el-button>
        </div>
      </div>
      <div class="sum-cards"><div class="sum-card"><div class="v">{{ sum.opp }} 个</div><div class="l">关联商机</div></div><div class="sum-card"><div class="v">{{ sum.ct }} 份</div><div class="l">成交合同</div></div><div class="sum-card"><div class="v">{{ sum.total }}</div><div class="l">累计成交</div></div></div>
    </div>
    <div class="card card-pad">
      <el-tabs v-model="tab" class="detail-tabs">
        <el-tab-pane label="基本信息" name="base"><div class="tab-body">
          <div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:20px">
            <div>
              <div class="sec-title">客户基本信息</div>
              <el-descriptions :column="3" border size="default">
                <el-descriptions-item label="客户来源">{{ c.source }}</el-descriptions-item><el-descriptions-item label="所属区域">{{ c.region }}</el-descriptions-item><el-descriptions-item label="创建时间">{{ c.created }}</el-descriptions-item>
                <el-descriptions-item label="客户类型">{{ c.type }}</el-descriptions-item><el-descriptions-item label="客户规模">{{ c.scale }}</el-descriptions-item><el-descriptions-item label="行业分类">{{ c.industry }}</el-descriptions-item>
                <el-descriptions-item label="主负责人">{{ c.owner || '-' }}</el-descriptions-item><el-descriptions-item label="协同负责人">-</el-descriptions-item><el-descriptions-item label="客户状态">{{ c.status }}</el-descriptions-item>
                <el-descriptions-item label="最近跟进时间">{{ c.lastFollow }}</el-descriptions-item><el-descriptions-item label="最近成交时间">{{ c.lastDeal }}</el-descriptions-item><el-descriptions-item label="累计成交金额">{{ c.total ? '¥' + fmtY(c.total) : '-' }}</el-descriptions-item>
              </el-descriptions>
              <div class="sec-title" style="margin-top:20px">最近跟进</div>
              <div class="tl-item-card" v-if="follows.length"><div>{{ follows[0].time }}，{{ follows[0].content }}</div><div class="muted" style="margin-top:4px;font-size:13px">{{ follows[0].who }} · {{ follows[0].type }}</div></div>
              <div class="tl-item-card muted" v-else>暂无跟进记录，点击右上角「记录跟进」新增第一条。</div>
              <div class="sec-title" style="margin-top:20px">全生命周期（成交 / 回款 / 服务）</div>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
                <div class="sum-card"><div class="v">{{ wan(ctAmount) }}</div><div class="l">累计成交（合同签署金额）</div></div>
                <div class="sum-card"><div class="v">¥{{ fmtC(paySum.got) }}</div><div class="l">累计已回款</div></div>
                <div class="sum-card"><div class="v" :class="paySum.rest ? 'danger-text' : ''">¥{{ fmtC(paySum.rest) }}</div><div class="l">未回款</div></div>
                <div class="sum-card"><div class="v">{{ b.tickets.length }} 单</div><div class="l">服务工单（{{ openCnt }} 单进行中）</div></div></div>
            </div>
            <div>
              <div class="sec-title">组织关系</div>
              <el-tree v-if="orgTree.length" class="org-tree" :data="orgTree" default-expand-all :expand-on-click-node="false"/>
              <el-empty v-else description="该客户暂无联系人，无法生成组织关系" :image-size="60"/>
              <div class="sec-title" style="margin-top:20px">公海规则提示</div>
              <el-alert type="info" :closable="false" show-icon :title="c.key ? '本客户为重点客户且存在履约合同，不会被自动释放至公海。负责人变更需保留变更日志。' : '超期未跟进或负责人主动释放后，客户将进入客户公海并进入保护期规则；所有变更保留日志。'"/>
            </div>
          </div>
        </div></el-tab-pane>
        <el-tab-pane label="联系人" name="contacts"><div class="tab-body"><div class="ops"><el-button type="primary" size="small" icon="Plus" @click="openCreate('contact')">新建联系人</el-button></div>
          <el-table v-if="b.contacts.length" :data="b.contacts"><el-table-column prop="no" label="编号" width="110"/><el-table-column prop="name" label="联系人姓名" width="120"><template #default="{row}"><a class="link" @click="$go('/contact/'+row.no)">{{ row.name }}</a></template></el-table-column><el-table-column prop="dept" label="部门" width="110"/><el-table-column prop="title" label="职务" width="110"/>
          <el-table-column prop="role" label="联系人角色" width="110"><template #default="{row}"><el-tag size="small" :type="row.role==='决策人'?'danger':'info'">{{ row.role }}</el-tag></template></el-table-column><el-table-column prop="infl" label="影响力" width="80"/><el-table-column prop="phone" label="联系电话" width="130"/><el-table-column label="关键联系人" width="100"><template #default="{row}">{{ row.key ? '是' : '否' }}</template></el-table-column>
          <el-table-column label="操作" width="160"><template #default="{row}"><el-button link type="primary" @click="$go('/contact/'+row.no)">查看</el-button><el-button link type="primary" @click="$msg.info('示例：编辑联系人')">编辑</el-button></template></el-table-column></el-table>
          <el-empty v-else description="该客户暂无联系人"/>
        </div></el-tab-pane>
        <el-tab-pane label="跟进记录" name="follow"><div class="tab-body">
          <div class="ops"><el-button type="primary" size="small" icon="EditPen" @click="dlg.follow=true">新增跟进</el-button>
            <el-select v-model="fType" clearable placeholder="全部活动类型" size="small" style="width:150px"><el-option v-for="x in ['电话','微信','拜访','会议','邮件']" :key="x" :value="x"/></el-select><span class="grow">共 {{ fcount }} 条 · 汇总客户与商机的所有互动</span></div>
          <el-timeline v-if="fShow.length" style="padding-left:6px"><el-timeline-item v-for="(f,i) in fShow" :key="f.time+i" :timestamp="f.time" placement="top" :type="i===0?'primary':''" :hollow="i!==0">
            <div class="tl-item-card"><div style="display:flex;gap:8px;align-items:center"><el-tag size="small">{{ f.type }}</el-tag><b>{{ f.content }}</b></div>
              <div class="muted" style="font-size:13px;margin-top:6px">客户反馈：{{ f.feedback || '-' }}</div><div class="muted" style="font-size:13px">下一步：{{ f.next || '-' }}　·　{{ f.who }}　·　关联对象：{{ f.contact || '客户' }}</div></div></el-timeline-item></el-timeline>
          <el-empty v-else description="暂无跟进记录"/>
        </div></el-tab-pane>
        <el-tab-pane label="商机" name="opps"><div class="tab-body"><div class="ops"><el-button type="primary" size="small" icon="Plus" @click="openCreate('opp')">新建商机</el-button></div>
          <el-table v-if="b.opps.length" :data="b.opps"><el-table-column prop="no" label="商机编号" width="150"><template #default="{row}"><a class="link" @click="$go('/opp/'+row.no)">{{ row.no }}</a></template></el-table-column><el-table-column prop="name" label="商机名称" min-width="220"/><el-table-column label="当前阶段" width="110"><template #default="{row}"><el-tag size="small" :type="oppStTag(row)">{{ stgName(row) }}</el-tag></template></el-table-column><el-table-column label="预计金额" width="130" align="right"><template #default="{row}"><span class="money">¥{{ fmtY(row.amount) }}</span></template></el-table-column><el-table-column prop="date" label="预计成交日期" width="130"/><el-table-column prop="owner" label="负责人" width="90"/></el-table>
          <el-empty v-else description="该客户暂无商机"/>
        </div></el-tab-pane>
        <el-tab-pane label="报价" name="quotes"><div class="tab-body"><div class="ops"><el-button type="primary" size="small" icon="Plus" @click="openCreate('quote')">新建报价</el-button></div>
          <el-table v-if="b.quotes.length" :data="b.quotes"><el-table-column prop="no" label="报价编号" width="160"><template #default="{row}"><a class="link" @click="$go('/quote/'+row.no)">{{ row.no }}</a></template></el-table-column><el-table-column prop="opp" label="关联商机" width="160"><template #default="{row}"><a v-if="row.opp" class="link" @click="$go('/opp/'+row.opp)">{{ row.opp }}</a><span v-else>-</span></template></el-table-column><el-table-column label="含税金额" width="150" align="right"><template #default="{row}"><span class="money">¥{{ fmtC(Math.round(row.amount*100)) }}</span></template></el-table-column><el-table-column prop="ver" label="版本" width="80"/><el-table-column prop="date" label="报价日期" width="120"/><el-table-column label="审批状态"><template #default="{row}"><el-tag size="small" :type="row.appr==='已通过'?'success':'warning'">{{ row.appr }}</el-tag></template></el-table-column></el-table>
          <el-empty v-else description="该客户暂无报价"/>
        </div></el-tab-pane>
        <el-tab-pane label="合同" name="contracts"><div class="tab-body"><div class="ops"><el-button type="primary" size="small" icon="Plus" @click="openCreate('contract')">新建合同</el-button></div>
          <el-table v-if="b.contracts.length" :data="b.contracts"><el-table-column prop="no" label="合同编号" width="160"><template #default="{row}"><a class="link" @click="$go('/contract/'+row.no)">{{ row.no }}</a></template></el-table-column><el-table-column prop="name" label="合同名称" min-width="200"/><el-table-column label="合同金额" width="140" align="right"><template #default="{row}"><span class="money">¥{{ fmtY(row.amount) }}</span></template></el-table-column><el-table-column prop="signDate" label="签署日期" width="120"/><el-table-column prop="endDate" label="到期日期" width="120"/><el-table-column label="状态" width="100"><template #default="{row}"><el-tag size="small" :type="row.status==='已完成'?'success':'primary'">{{ row.status }}</el-tag></template></el-table-column></el-table>
          <el-empty v-else description="该客户暂无合同"/>
        </div></el-tab-pane>
        <el-tab-pane label="订单" name="orders"><div class="tab-body"><div class="ops"><el-button type="primary" size="small" icon="Plus" @click="openCreate('order')">新建订单</el-button></div>
          <el-table v-if="b.orders.length" :data="b.orders"><el-table-column prop="no" label="订单编号" width="160"><template #default="{row}"><a class="link" @click="$go('/order/'+row.no)">{{ row.no }}</a></template></el-table-column><el-table-column prop="contract" label="合同" width="160"/><el-table-column label="订单金额" width="140" align="right"><template #default="{row}"><span class="money">¥{{ fmtC(Math.round(row.amount*100)) }}</span></template></el-table-column><el-table-column prop="date" label="订单日期" width="120"/><el-table-column label="订单状态"><template #default="{row}"><el-tag size="small" :type="row.status==='已完成'?'success':'primary'">{{ row.status }}</el-tag></template></el-table-column></el-table>
          <el-empty v-else description="该客户暂无订单"/>
        </div></el-tab-pane>
        <el-tab-pane label="回款" name="payments"><div class="tab-body">
          <el-table v-if="payRows.length" :data="payRows">
            <el-table-column label="合同编号" width="170"><template #default="{row}"><a class="link" @click="$go('/contract/'+row.no)">{{ row.no }}</a></template></el-table-column>
            <el-table-column label="合同金额" width="150" align="right"><template #default="{row}"><span class="money">¥{{ fmtY(row.amtC/100) }}</span></template></el-table-column>
            <el-table-column label="累计已收" width="150" align="right"><template #default="{row}"><span class="money ok-text">¥{{ fmtC(row.gotC) }}</span></template></el-table-column>
            <el-table-column label="未收" width="150" align="right"><template #default="{row}"><span class="money" :class="{'danger-text':row.restC>0}">¥{{ fmtC(row.restC) }}</span></template></el-table-column>
            <el-table-column label="状态"><template #default="{row}"><el-tag size="small" :type="row.restC>0?'danger':'success'">{{ row.od }}</el-tag></template></el-table-column></el-table>
          <el-empty v-else description="该客户暂无关联合同，回款数据为空"/>
        </div></el-tab-pane>
        <el-tab-pane label="服务" name="service"><div class="tab-body">
          <el-table v-if="b.tickets.length" :data="b.tickets"><el-table-column prop="no" label="工单编号" width="160"><template #default="{row}"><a class="link" @click="$go('/service')">{{ row.no }}</a></template></el-table-column><el-table-column prop="type" label="工单类型" width="110"/><el-table-column prop="desc" label="问题描述" min-width="220"/><el-table-column prop="priority" label="等级" width="80"/><el-table-column prop="created" label="提交时间" width="150"/><el-table-column label="状态" width="120"><template #default="{row}"><el-tag size="small" :type="row.status==='已关闭'?'info':'warning'">{{ row.status }}</el-tag></template></el-table-column></el-table>
          <el-empty v-else description="该客户暂无服务工单"/>
        </div></el-tab-pane>
        <el-tab-pane label="关系图" name="relations"><div class="tab-body">
          <div class="muted" style="margin-bottom:10px;font-size:13px">客户内部关系网络：节点按对我方态度着色（支持者 / 中立 / 反对者），大小按影响力；边表示汇报 / 影响 / 支持 / 反对 / 合作关系。点击节点可进入该联系人详情。</div>
          <relation-graph v-if="b.contacts.length" :customer="c.name" height="360px"/>
          <el-empty v-else description="该客户暂无联系人，无法生成关系图"/>
        </div></el-tab-pane>
        <el-tab-pane label="附件" name="files"><div class="tab-body"><div class="ops"><el-button size="small" icon="Upload" @click="$msg.info('示例：上传附件（按权限控制）')">上传附件</el-button></div>
          <el-table v-if="b.files.length" :data="b.files"><el-table-column prop="name" label="文件名" min-width="260"><template #default="{row}"><el-icon><document/></el-icon> <a class="link">{{ row.name }}</a></template></el-table-column><el-table-column prop="type" label="类型" width="110"/><el-table-column prop="ref" label="关联单据" width="160"/><el-table-column prop="size" label="大小" width="90"/><el-table-column prop="date" label="上传日期" width="120"/></el-table>
          <el-empty v-else description="该客户暂无附件"/>
        </div></el-tab-pane>
        <el-tab-pane label="操作日志" name="logs"><div class="tab-body"><el-table :data="logs"><el-table-column prop="t" label="时间" width="160"/><el-table-column prop="who" label="操作人" width="130"/><el-table-column prop="act" label="操作" width="160"/><el-table-column prop="d" label="详情" min-width="320"/></el-table></div></el-tab-pane>
      </el-tabs>
    </div>
    <el-dialog v-model="dlg.follow" title="新增跟进记录" width="520px"><el-form label-width="90px"><el-form-item label="关联客户"><el-input :model-value="c.name" disabled/></el-form-item><el-form-item label="活动类型"><el-radio-group v-model="ff.type"><el-radio-button v-for="x in ['电话','微信','拜访','会议','邮件']" :key="x" :label="x"/></el-radio-group></el-form-item><el-form-item label="跟进内容" required><el-input type="textarea" :rows="3" v-model="ff.content"/></el-form-item><el-form-item label="客户反馈"><el-input type="textarea" :rows="2" v-model="ff.fb"/></el-form-item><el-form-item label="下次跟进"><el-date-picker v-model="ff.next" type="datetime" value-format="YYYY-MM-DDTHH:mm" placeholder="自动生成待办"/></el-form-item></el-form>
      <template #footer><el-button @click="dlg.follow=false">取消</el-button><el-button type="primary" @click="doFollow">保存</el-button></template></el-dialog>
    <el-dialog v-model="dlg.owner" title="变更客户负责人" width="460px"><el-alert type="info" :closable="false" show-icon style="margin-bottom:14px" title="负责人变更将保留：原负责人、新负责人、变更时间及原因。"/>
      <el-form label-width="90px"><el-form-item label="当前负责人"><el-input :model-value="c.owner" disabled/></el-form-item><el-form-item label="新负责人" required><el-select v-model="ownerForm.owner"><el-option v-for="o in OWNERS" :key="o" :value="o"/></el-select></el-form-item><el-form-item label="变更原因" required><el-input type="textarea" :rows="3" v-model="ownerForm.reason"/></el-form-item></el-form>
      <template #footer><el-button @click="dlg.owner=false">取消</el-button><el-button type="primary" @click="doOwner">确认变更</el-button></template></el-dialog>
    <el-dialog v-model="dlg.create" :title="createCfg[createType].title" width="480px"><el-form label-width="120px"><el-form-item label="所属客户"><el-input :model-value="c.name" disabled/></el-form-item><el-form-item v-for="f in createCfg[createType].f" :key="f[1]" :label="f[0]" required><el-input v-model="cform[f[1]]"/></el-form-item></el-form>
      <template #footer><el-button @click="dlg.create=false">取消</el-button><el-button type="primary" @click="doCreate">保存</el-button></template></el-dialog>
  </div>
  <div v-else class="card card-pad" style="text-align:center;padding:60px"><el-empty description="未找到该客户（示例数据中不存在）"><el-button type="primary" @click="$go('/customers')">返回客户列表</el-button></el-empty></div>`,
};
registerRoute('/customers', CustomersPage, 'customers', () => ({ tab: 'all' }));
registerRoute('/customers/my', CustomersPage, 'customers', () => ({ tab: 'my' }));
registerRoute('/customers/key', CustomersPage, 'customers', () => ({ tab: 'key' }));
registerRoute('/customers/category', CustomersPage, 'customers', () => ({ tab: 'category' }));
registerRoute('/customers/recycle', CustomersPage, 'customers', () => ({ tab: 'recycle' }));
registerRoute('/customers/pool', CustomersPage, 'customer-pool', () => ({ tab: 'pool' }));
registerRoute('/customer/:no', CustomerDetail, 'customer-detail');
