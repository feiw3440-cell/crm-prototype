const OppsPage = {
  components: { PageHead },
  props: { view: { type: String, default: 'board' } },
  setup(props) {
    const owner = ref(''); const kw = ref(''); const source = ref(''); const type = ref('');
    const SOURCES = ['线索', '客户转介绍', '官网', '渠道', '活动', '广告'];
    const TYPES = ['新购', '续费', '增购'];
    const cards = computed(() => store.opps.filter(o => (!owner.value || o.owner === owner.value) && (!source.value || o.source === source.value) && (!type.value || o.type === type.value) && (!kw.value || (o.name + o.customer + o.no + (o.contact || '') + (o.need || '')).includes(kw.value))));
    const colCards = key => cards.value.filter(o => o.stage === key);
    const colCount = key => store.opps.filter(o => o.stage === key).length;
    const colAmount = key => store.opps.filter(o => o.stage === key).reduce((s, o) => s + o.amount, 0);
    const totalOpen = computed(() => STAGES.slice(0, 5).reduce((s, st) => s + colCount(st.key), 0));
    const totalAmt = computed(() => STAGES.slice(0, 5).reduce((s, st) => s + colAmount(st.key), 0));
    const totalW = computed(() => store.opps.filter(o => o.stage !== 'close').reduce((s, o) => s + wAmount(o), 0));
    const colW = key => store.opps.filter(o => o.stage === key).reduce((s, o) => s + wAmount(o), 0);
    const thisMonthAmount = computed(() => wan(store.opps.filter(o => o.stage !== 'close' && o.date >= TODAY.slice(0, 8) + '01' && o.date < '2026-12-01').reduce((s, o) => s + o.amount, 0)));
    const wonCount = computed(() => store.opps.filter(o => o.stage === 'close' && o.result === '赢单').length);
    const lostCount = computed(() => store.opps.filter(o => o.stage === 'close' && o.result === '输单').length);
    const stalled = computed(() => store.opps.filter(o => o.flags && o.flags.stalled).length);
    // ---- 拖拽 ----
    const dragNo = ref(''); const overKey = ref('');
    const onDrop = key => { overKey.value = ''; const o = store.opps.find(x => x.no === dragNo.value); if (o) request(o, key); };
    // ---- 阶段推进校验 ----
    const gate = reactive({ show: false, opp: null, target: '', mode: 'win', form: {}, errors: {}, failed: false, remark: '' });
    const nextStage = o => STAGES[STAGE_IDX[o.stage] + 1];
    const request = (o, key) => {
      const cur = STAGE_IDX[o.stage], tgt = STAGE_IDX[key];
      if (cur === tgt) return;
      if (o.stage === 'close') return ElMessage.warning('该商机已结束并归档，不能再推进');
      if (tgt < cur) return ElMessage.warning('暂不支持直接回退阶段；如需回退请提交「阶段回退」申请并填写原因');
      if (tgt - cur > 1) return ElMessage.error(`禁止跳阶段：「${o.name}」当前处于「${STAGES[cur].name}」，下一阶段应为「${STAGES[cur + 1].name}」`);
      Object.assign(gate, { show: true, opp: o, target: key, mode: 'win', form: JSON.parse(JSON.stringify(o.info || {})), errors: {}, failed: false, remark: '' });
    };
    const rule = computed(() => gate.target === 'close' ? STAGE_RULES[gate.mode] : STAGE_RULES[gate.target]);
    const sysOk = chk => !!(gate.opp && gate.opp.flags && gate.opp.flags[chk.k]);
    const confirmMove = () => {
      const r = rule.value; const errs = {}; let bad = false;
      (r.fields || []).forEach(f => { if (!gate.form[f.k] && !(f.k === 'competitor')) errs[f.k] = '必填'; });
      (r.checks || []).forEach(c => { if (!sysOk(c)) { errs[c.k] = '未满足'; bad = true; } });
      gate.errors = errs; gate.failed = Object.keys(errs).length > 0;
      if (gate.failed) return ElMessage.error('不满足进入条件，无法推进，请补全必填项');
      const o = gate.opp; const from = STAGES[STAGE_IDX[o.stage]].name;
      o.info = { ...o.info, ...gate.form };
      if (gate.target === 'close') { o.result = gate.mode === 'win' ? '赢单' : '输单'; o.prob = gate.mode === 'win' ? 100 : 0; if (gate.mode === 'lose') o.loseReason = gate.form.loseReason; }
      else o.prob = STAGES[STAGE_IDX[gate.target]].prob;
      o.stage = gate.target; o.history = (o.history || []).concat([{ from, to: gate.target === 'close' ? o.result : STAGES[STAGE_IDX[gate.target]].name, by: '张三', time: '2026-11-02 07:00', remark: gate.remark || '-' }]);
      gate.show = false; ElMessage.success(`阶段已变更：${from} → ${gate.target === 'close' ? o.result : STAGES[STAGE_IDX[gate.target]].name}，变更记录已保留`);
    };
    const stageName = k => (STAGES.find(s => s.key === k) || {}).name;
    const stageTagType = o => o.stage === 'close' ? (o.result === '赢单' ? 'success' : 'danger') : 'primary';
    const listRows = computed(() => cards.value);
    const page = ref(1); const size = 20;
    const pagedRows = computed(() => listRows.value.slice((page.value - 1) * size, page.value * size));
    watch([owner, kw, source, type], () => { page.value = 1; });
    return { owner, kw, source, type, SOURCES, TYPES, cards, colCards, colCount, colAmount, colW, totalOpen, totalAmt, totalW, thisMonthAmount, wAmount, wonCount, lostCount, stalled, dragNo, overKey, onDrop, gate, nextStage, request, rule, sysOk, confirmMove, stageName, stageTagType, listRows, pagedRows, page, size, STAGES, OWNERS, fmtY, yuan, wan, go, view: computed(() => props.view), STAGE_IDX };
  },
  template: `<div>
    <page-head :crumbs="['商机管理', view==='board' ? '商机看板' : '商机列表']" :title="view==='board' ? '商机看板' : '商机列表'" :total="'跟进中商机共 '+totalOpen+' 个'">
      <el-radio-group :model-value="view" @change="v => $go(v==='board'?'/opps':'/opps/list')"><el-radio-button label="board"><el-icon><grid/></el-icon> 看板视图</el-radio-button><el-radio-button label="list"><el-icon><list/></el-icon> 列表视图</el-radio-button></el-radio-group>
      <el-button type="primary" icon="Plus" @click="$msg.info('示例：新建商机（必须关联客户）')">新建商机</el-button>
    </page-head>
    <div class="stat-row" style="grid-template-columns:repeat(6,1fr)">
      <div class="stat-card"><span class="lb">跟进中商机</span><span class="vl">{{ totalOpen }}</span><span class="ft">初步接触 → 商务审批</span></div>
      <div class="stat-card"><span class="lb">商机预计金额</span><span class="vl">{{ wan(totalAmt) }}</span><span class="ft">不含已结束商机</span></div>
      <div class="stat-card" :class="thisMonthAmount ? 'ok' : ''"><span class="lb">本月预计成交</span><span class="vl">{{ thisMonthAmount }}</span><span class="ft">按预计成交日期（未结束商机）</span></div>
      <div class="stat-card" :class="totalW ? 'ok' : ''"><span class="lb">加权预测金额合计</span><span class="vl">{{ wan(totalW) }}</span><span class="ft">Σ 预计金额 × 赢率（不含赢单/输单）</span></div>
      <div class="stat-card warn"><span class="lb">停滞商机</span><span class="vl">{{ stalled }}</span><span class="ft">超 7 天未推进，已提醒负责人与经理</span></div>
      <div class="stat-card"><span class="lb">已赢单 / 已输单</span><span class="vl">{{ wonCount }} / {{ lostCount }}</span><span class="ft">输单需填原因与竞争对手</span></div>
    </div>
    <div class="card query" style="padding-bottom:2px"><el-form inline><el-form-item><el-input v-model="kw" placeholder="搜索商机名称 / 客户 / 编号" clearable style="width:260px" prefix-icon="Search"/></el-form-item><el-form-item label="负责人"><el-select v-model="owner" clearable placeholder="全部" style="width:120px"><el-option v-for="o in OWNERS" :key="o" :value="o"/></el-select></el-form-item><el-form-item label="来源"><el-select v-model="source" clearable placeholder="全部" style="width:120px"><el-option v-for="x in SOURCES" :key="x" :value="x"/></el-select></el-form-item><el-form-item label="类型"><el-select v-model="type" clearable placeholder="全部" style="width:110px"><el-option v-for="x in TYPES" :key="x" :value="x"/></el-select></el-form-item><el-form-item><el-button type="primary" icon="Search">查询</el-button><el-button @click="owner='';kw='';source='';type=''">重置</el-button></el-form-item>
      <el-form-item style="margin-left:auto;margin-right:0"><span class="muted" style="font-size:12px">提示：可拖拽卡片到相邻阶段，或点击卡片上的「推进」；系统将校验阶段必填项，禁止跳阶段、禁止直接赢单。</span></el-form-item></el-form></div>

    <div v-if="view==='board'" class="kanban">
      <div class="kcol" :class="{over:overKey===s.key}" v-for="s in STAGES" :key="s.key" @dragover.prevent="overKey=s.key" @dragleave="overKey=''" @drop.prevent="onDrop(s.key)">
        <div class="kcol-h"><b>{{ s.name }}</b><span class="cnt">{{ colCount(s.key) }}</span><span class="muted" style="margin-left:auto;font-size:12px">{{ s.key==='close' ? '本月' : '漏斗展示宽度 '+s.funnelWidth+'%' }}</span></div>
        <div class="kcol-sum">预计金额 {{ wan(colAmount(s.key)) }}<span v-if="s.key!=='close'"> · 加权预测 {{ wan(colW(s.key)) }}</span></div>
        <div class="kcard" v-for="o in colCards(s.key)" :key="o.no" draggable="true" @dragstart="dragNo=o.no" @click="go('/opp/'+o.no)">
          <div class="nm">{{ o.name }}</div><div class="cu">{{ o.customer }}</div>
          <div class="muted" style="font-size:12px;margin-top:2px">{{ o.source }} · {{ o.type }} · {{ o.contact }}</div>
          <div class="am">{{ yuan(o.amount) }}</div>
          <div class="tags" v-if="(o.flags && o.flags.stalled) || s.key==='close'">
            <el-tag v-if="o.flags && o.flags.stalled" size="small" type="warning" effect="plain">停滞 {{ o.flags.stalled }} 天</el-tag>
            <el-tag v-if="s.key==='close'" size="small" :type="o.result==='赢单'?'success':'danger'" effect="light">{{ o.result }}</el-tag></div>
          <div class="ft"><el-icon><calendar/></el-icon>{{ o.date.slice(5) }}<span>· {{ o.owner }}</span>
            <el-button v-if="s.key!=='close'" class="adv" size="small" type="primary" plain @click.stop="request(o, STAGES[STAGE_IDX[o.stage]+1].key)">推进</el-button></div>
        </div>
        <div class="kmore" v-if="s.key!=='close' && colCount(s.key) > colCards(s.key).length">… 另有 {{ colCount(s.key) - colCards(s.key).length }} 个（查看全部）</div>
      </div>
    </div>
    <div v-else class="card table-card"><el-table :data="pagedRows" style="width:100%">
      <el-table-column type="selection" width="46"/>
      <el-table-column prop="no" label="商机编号" min-width="140"><template #default="{row}"><a class="link" @click="go('/opp/'+row.no)">{{ row.no }}</a></template></el-table-column>
      <el-table-column prop="name" label="商机名称" min-width="220"/>
      <el-table-column label="关联客户" min-width="210"><template #default="{row}"><a class="link" @click="$go('/customer/'+($cno(row.customer)))">{{ row.customer }}</a></template></el-table-column>
      <el-table-column prop="contact" label="关联联系人" min-width="110"/>
      <el-table-column prop="source" label="商机来源" min-width="100"/>
      <el-table-column prop="type" label="商机类型" min-width="90"/>
      <el-table-column label="预计金额" min-width="120" align="right"><template #default="{row}"><span class="money">{{ yuan(row.amount) }}</span></template></el-table-column>
      <el-table-column label="当前阶段" min-width="110"><template #default="{row}"><el-tag size="small" :type="stageTagType(row)">{{ row.stage==='close' ? row.result : stageName(row.stage) }}</el-tag></template></el-table-column>
      <el-table-column label="赢率" min-width="100"><template #default="{row}"><el-progress :percentage="row.stage==='close' ? (row.result==='赢单'?100:0) : row.prob" :stroke-width="6"/></template></el-table-column>
      <el-table-column label="加权预测金额" min-width="130" align="right"><template #default="{row}"><span class="money">{{ row.stage!=='close' ? yuan(wAmount(row)) : '—' }}</span></template></el-table-column>
      <el-table-column prop="date" label="预计成交日期" min-width="120"/><el-table-column prop="owner" label="负责人" min-width="80"/>
      <el-table-column label="操作" width="170" fixed="right"><template #default="{row}"><el-button link type="primary" @click="go('/opp/'+row.no)">查看</el-button><el-button link type="primary" :disabled="row.stage==='close'" @click="request(row, STAGES[STAGE_IDX[row.stage]+1].key)">推进阶段</el-button></template></el-table-column>
    </el-table><div class="pager"><span class="batch">共 {{ listRows.length }} 条示例商机</span><el-pagination v-model:current-page="page" layout="prev, pager, next" :total="listRows.length" :page-size="size" background size="small"/></div></div>

    <el-dialog v-model="gate.show" :title="'推进阶段校验 · '+(rule ? rule.title : '')" width="620px" :close-on-click-modal="false">
      <template v-if="gate.opp && rule">
        <div class="stage-flow"><el-tag effect="plain">{{ stageName(gate.opp.stage) }}</el-tag><el-icon><right/></el-icon><el-tag type="primary">{{ gate.target==='close' ? '赢单 / 输单' : stageName(gate.target) }}</el-tag><span class="muted" style="margin-left:auto">{{ gate.opp.name }}</span></div>
        <el-alert v-if="gate.failed" type="error" show-icon :closable="false" style="margin-bottom:12px" title="不满足阶段进入条件，不能推进。请补全下列必填信息或先完成前置业务。"/>
        <el-alert v-else type="info" show-icon :closable="false" style="margin-bottom:12px" :title="'进入「'+(gate.target==='close' ? (gate.mode==='win'?'赢单':'输单') : stageName(gate.target))+'」的最少必填信息（阶段规则可在后台配置）'"/>
        <el-form-item v-if="gate.target==='close'" label="成交结果" label-width="90px"><el-radio-group v-model="gate.mode" @change="gate.errors={};gate.failed=false"><el-radio-button label="win">赢单</el-radio-button><el-radio-button label="lose">输单</el-radio-button></el-radio-group></el-form-item>
        <div class="gate-row" :class="{bad:gate.errors[f.k]}" v-for="f in (rule.fields||[])" :key="f.k">
          <el-icon class="st" :color="gate.errors[f.k]?'#d9534f':(gate.form[f.k]?'#2e9e6a':'#9aa5b8')"><component :is="gate.errors[f.k]?'CircleCloseFilled':(gate.form[f.k]?'SuccessFilled':'InfoFilled')"/></el-icon>
          <div style="flex:1"><div style="margin-bottom:6px"><b>{{ f.label }}</b><span v-if="f.k!=='competitor'" style="color:#d9534f"> *</span><span v-if="gate.errors[f.k]" class="danger-text" style="margin-left:8px;font-size:12px">请填写{{ f.label }}</span></div>
            <el-input v-if="f.type==='input'" v-model="gate.form[f.k]" :placeholder="f.ph"/>
            <el-input v-else-if="f.type==='textarea'" type="textarea" :rows="2" v-model="gate.form[f.k]" :placeholder="f.ph"/>
            <el-date-picker v-else-if="f.type==='date'" v-model="gate.form[f.k]" type="date" value-format="YYYY-MM-DD" style="width:100%"/>
            <el-select v-else v-model="gate.form[f.k]" style="width:100%" placeholder="请选择"><el-option v-for="x in f.opts" :key="x" :value="x"/></el-select></div></div>
        <div class="gate-row" :class="{bad:!sysOk(c)}" v-for="c in (rule.checks||[])" :key="c.k">
          <el-icon class="st" :color="sysOk(c)?'#2e9e6a':'#d9534f'"><component :is="sysOk(c)?'SuccessFilled':'CircleCloseFilled'"/></el-icon>
          <div style="flex:1"><b>{{ c.label }}</b><div class="muted" style="font-size:13px;margin-top:4px">系统校验：<span :class="sysOk(c)?'ok-text':'danger-text'">{{ sysOk(c) ? '已满足' : '未满足 — ' + c.hint }}</span></div></div>
          <el-button v-if="!sysOk(c)" size="small" type="primary" plain @click="gate.show=false;$go(c.link)">前往处理</el-button></div>
        <el-form-item label="变更备注" label-width="90px" style="margin-top:6px"><el-input v-model="gate.remark" placeholder="选填，将与变更前后阶段、变更人、变更时间一并记录"/></el-form-item>
      </template>
      <template #footer><el-button @click="gate.show=false">取消</el-button><el-button type="primary" @click="confirmMove">确认推进</el-button></template>
    </el-dialog>
  </div>`,
};
registerRoute('/opps', OppsPage, 'opps-board', () => ({ view: 'board' }));
registerRoute('/opps/list', OppsPage, 'opps-list', () => ({ view: 'list' }));
