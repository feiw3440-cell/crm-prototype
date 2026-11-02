/* ===== 商机详情（/opp/:no）===== */
DOCS_DEFAULT['opp-detail'] = mkDoc('opp-detail', {
  name: '商机详情', module: '商机管理',
  goal: '全景展示单个商机的基础信息、阶段进度、跟进与关联数据（联系人 / 报价 / 合同），并提供合规的阶段推进、赢单 / 输单操作，确保成交旅程可追溯。',
  roles: ['负责人销售：编辑、推进商机', '销售经理：审核阶段推进校验与特殊折扣', '管理员：全量权限'],
  enter: ['商机看板 / 商机列表点击商机编号', '客户详情商机 Tab 点击商机编号', '顶部全局搜索命中商机'],
  layout: ['头部：商机名称 + 客户链接 + 金额 + 预计成交日期 + 负责人 + 阶段进度条 + 赢率 + 推进 / 赢单 / 输单按钮', 'Tab：基本信息 / 跟进记录 / 关联联系人 / 关联报价 / 关联合同 / 阶段变更历史 / 操作日志'],
  fields: [
    '商机编号｜文本｜只读｜格式：SJ-年月-序号',
    '阶段｜枚举｜必填：是｜校验：仅能按相邻阶段推进，报价谈判前须有有效报价', '赢率｜百分比｜只读｜说明：随阶段取默认赢率（初步接触 10%、需求确认 25%、方案沟通 45%、报价谈判 65%、商务审批 85%、赢单 100%、输单 0%；默认赢率为原型假设，待业务确认）',
    '预计金额｜货币｜必填：是｜校验：> 0',
    '加权预测金额｜货币（计算）｜只读｜校验：= Math.round(预计金额 × 赢率 / 100)，按分计算｜说明：仅未结束商机（stage ≠ close）计入预测；漏斗图的 100%/80%/60%/40%/25%/15% 仅为展示宽度，不代表转化率或赢率。',
    '阶段必填信息｜按阶段｜推进时校验：需求确认 / 方案沟通 / 商务审批各有最少必填项',
  ],
  rules: ['阶段推进需通过阶段门：必填项完整 + 系统校验（如报价谈判需有效报价、赢单需合同审批通过）', '禁止跳阶段与回退；回退需提交「阶段回退」申请', '输单必须填写输单原因；赢单赢率置 100、输单赢率置 0，加权预测金额同步重算（= 预计金额 × 赢率，按分计算）'],
  flow: ['阶段流转：初步接触 → 需求确认 → 方案沟通 → 报价谈判 → 商务审批 → 赢单 / 输单', '每次变更记录：变更前后阶段、变更人、变更时间、备注'],
  errors: ['不满足阶段条件推进：校验弹窗标红缺失项并阻止', '输单未填原因：前端拦截'],
  api: ['商机详情查询、阶段变更接口 / 阶段门校验接口、报价与合同关联查询、跟进时间线查询（示例）'],
  accept: ['头部与 Tab 数据均来自该商机与其客户自身数据', '阶段推进校验生效，变更历史完整', '无控制台报错'],
  version: ['2026-11-02 · 张三 · 创建本页需求文档（原型版）'],
});
const OppDetailPage = {
  components: { PageHead },
  props: { no: String },
  setup(props) {
    const opp = computed(() => store.opps.find(o => o.no === props.no));
    const c = computed(() => opp.value && (custBundle(opp.value.customer)));
    const tab = ref('base');
    const stageName = k => (STAGES.find(s => s.key === k) || {}).name || k;
    const stageTag = o => o.stage === 'close' ? (o.result === '赢单' ? 'success' : 'danger') : 'primary';
    const INFO_LABEL = { demand: '客户需求', buyDate: '采购时间', budget: '预算范围', solution: '方案说明', participants: '参与沟通的联系人', terms: '商务条件', materials: '审批材料' };
    const infoRows = computed(() => { const o = opp.value; if (!o || !o.info) return []; return Object.keys(INFO_LABEL).filter(k => o.info[k]).map(k => [INFO_LABEL[k], o.info[k]]); });
    const follows = computed(() => { const o = opp.value; if (!o) return []; return store.ext.activities.filter(a => a.opp === o.no).slice().sort((a, b) => (a.time < b.time ? 1 : -1)); });
    const quotesOf = computed(() => { const o = opp.value; if (!o) return []; return store.ext.quotes.filter(q => q.opp === o.no); });
    const contractsOf = computed(() => { const o = opp.value; if (!o) return []; return store.ext.contracts.filter(x => x.opp === o.no); });
    const ordersOf = computed(() => { const o = opp.value; if (!o) return []; return store.ext.orders.filter(x => x.opp === o.no); });
    const filesOf = computed(() => {
      const out = [];
      quotesOf.value.forEach(q => out.push({ name: '报价单 ' + q.no + '（' + q.ver + '）.pdf', type: '报价单', ref: q.no, size: '260KB', date: q.date }));
      contractsOf.value.forEach(t => (t.attachments || []).forEach(a => out.push({ name: a.name, type: '合同附件', ref: t.no, size: a.size, date: a.date })));
      return out;
    });
    const logs = computed(() => {
      const o = opp.value; if (!o) return [];
      const arr = store.ext.logs.filter(x => x.detail.includes(o.no) || x.detail.includes(o.name)).slice(0, 5)
        .map(x => ({ time: x.time, who: x.who, act: x.module + ' · ' + x.act, detail: x.detail }));
      if (!arr.length) arr.push({ time: o.date, who: o.owner, act: '系统', detail: '商机创建（示例环境未记录更早日志）' });
      return arr;
    });
    /* ---- 阶段推进 / 赢单 / 输单（复用 page-opps 的 STAGE_RULES 规则与弹窗） ---- */
    const gate = reactive({ show: false, opp: null, target: '', mode: 'win', form: {}, errors: {}, failed: false, remark: '' });
    const request = (o, key) => {
      if (typeof o === 'string') o = store.opps.find(x => x.no === o);
      const cur = STAGE_IDX[o.stage], tgt = STAGE_IDX[key];
      if (cur === tgt) return;
      if (o.stage === 'close') return ElMessage.warning('该商机已结束并归档，不能再推进');
      if (tgt < cur) return ElMessage.warning('暂不支持直接回退阶段；如需回退请提交「阶段回退」申请并填写原因');
      if (tgt - cur > 1) return ElMessage.error('禁止跳阶段：「' + o.name + '」当前处于「' + STAGES[cur].name + '」，下一阶段应为「' + STAGES[cur + 1].name + '」');
      Object.assign(gate, { show: true, opp: o, target: key, mode: 'win', form: JSON.parse(JSON.stringify(o.info || {})), errors: {}, failed: false, remark: '' });
    };
    const rule = computed(() => gate.target === 'close' ? STAGE_RULES[gate.mode] : STAGE_RULES[gate.target]);
    const sysOk = chk => !!(gate.opp && gate.opp.flags && gate.opp.flags[chk.k]);
    const confirmMove = () => {
      const r = rule.value; const errs = {};
      (r.fields || []).forEach(f => { if (!gate.form[f.k] && !(f.k === 'competitor')) errs[f.k] = '必填'; });
      (r.checks || []).forEach(cn => { if (!sysOk(cn)) errs[cn.k] = '未满足'; });
      gate.errors = errs; gate.failed = Object.keys(errs).length > 0;
      if (gate.failed) return ElMessage.error('不满足进入条件，无法推进，请补全必填项或先完成前置业务');
      const o = gate.opp; const from = STAGES[STAGE_IDX[o.stage]].name;
      o.info = { ...o.info, ...gate.form };
      if (gate.target === 'close') { o.result = gate.mode === 'win' ? '赢单' : '输单'; o.prob = gate.mode === 'win' ? 100 : 0; if (gate.mode === 'lose') o.loseReason = gate.form.loseReason; }
      else o.prob = STAGES[STAGE_IDX[gate.target]].prob;
      o.stage = gate.target; o.history = (o.history || []).concat([{ from, to: gate.target === 'close' ? o.result : STAGES[STAGE_IDX[gate.target]].name, by: '张三', time: TODAY + ' 16:00', remark: gate.remark || '-' }]);
      gate.show = false; ElMessage.success('阶段已变更：' + from + ' → ' + (gate.target === 'close' ? o.result : STAGES[STAGE_IDX[gate.target]].name) + '，变更记录已保留');
    };
    return { opp, c, tab, stageName, stageTag, INFO_LABEL, infoRows, follows, quotesOf, contractsOf, ordersOf, filesOf, logs, gate, request, rule, sysOk, confirmMove, go, yuan, fmtC, fmtY, wAmount, STAGES, STAGE_IDX };
  },
  template: `<div v-if="opp">
    <el-breadcrumb separator="/" class="crumb"><el-breadcrumb-item><a @click="$go('/opps')">商机管理</a></el-breadcrumb-item><el-breadcrumb-item><a @click="$go('/opps/list')">商机列表</a></el-breadcrumb-item><el-breadcrumb-item>{{ opp.no }}</el-breadcrumb-item></el-breadcrumb>
    <div class="card cust-head">
      <div class="cust-logo">{{ opp.name[0] }}</div>
      <div>
        <h2>{{ opp.name }}<el-tag :type="stageTag(opp)" size="small">{{ opp.stage === 'close' ? opp.result : stageName(opp.stage) }}</el-tag><el-tag type="danger" size="small" effect="plain" v-if="opp.loseReason">{{ opp.loseReason }}</el-tag><el-tag type="success" size="small" effect="plain" v-if="opp.winReason">{{ opp.winReason }}</el-tag></h2>
        <div class="cust-meta"><span>商机编号：<b>{{ opp.no }}</b></span><span>客户：<b><a @click="$go('/customer/'+($cno(opp.customer)))">{{ opp.customer }}</a></b></span><span>联系人：<b>{{ opp.contact || '-' }}</b></span><span>负责人：<b>{{ opp.owner }}</b></span><span>预计成交：<b>{{ opp.date }}</b></span></div>
        <div style="margin-top:10px;display:flex;gap:8px">
          <el-button type="primary" size="small" icon="TopRight" :disabled="opp.stage==='close'" @click="request(opp, STAGES[STAGE_IDX[opp.stage]+1].key)">推进到下一阶段</el-button>
          <el-button size="small" type="success" :disabled="opp.stage==='close'" @click="request(opp, 'close'); gate.mode='win'">标记赢单</el-button>
          <el-button size="small" :disabled="opp.stage==='close'" @click="request(opp, 'close'); gate.mode='lose'">标记输单</el-button>
        </div>
      </div>
      <div class="sum-cards"><div class="sum-card"><div class="v">{{ yuan(opp.amount) }}</div><div class="l">预计金额</div></div><div class="sum-card"><div class="v">{{ opp.prob }}%</div><div class="l">赢率（按阶段默认赢率）</div></div><div class="sum-card" :class="opp.stage!=='close' ? 'ok' : ''"><div class="v">{{ yuan(wAmount(opp) || 0) }}</div><div class="l">加权预测金额</div></div></div>
    </div>
    <div class="card card-pad">
      <el-steps :active="STAGE_IDX[opp.stage]+(opp.stage==='close'?1:0)" finish-status="success" align-center style="margin-bottom:18px"><el-step v-for="s in STAGES" :key="s.key" :title="s.name.replace(' / ','/')"/></el-steps>
      <el-tabs v-model="tab" class="detail-tabs">
        <el-tab-pane label="基本信息" name="base"><div class="tab-body">
          <el-descriptions :column="3" border size="default">
            <el-descriptions-item label="商机名称" :span="2">{{ opp.name }}</el-descriptions-item><el-descriptions-item label="负责人">{{ opp.owner }}</el-descriptions-item>
            <el-descriptions-item label="关联客户" :span="2"><a @click="$go('/customer/'+($cno(opp.customer)))">{{ opp.customer }}</a></el-descriptions-item><el-descriptions-item label="关联联系人">{{ opp.contact || '-' }}</el-descriptions-item>
            <el-descriptions-item label="商机来源">{{ opp.source || '-' }}</el-descriptions-item><el-descriptions-item label="商机类型">{{ opp.type || '-' }}</el-descriptions-item><el-descriptions-item label="预计金额">{{ yuan(opp.amount) }}</el-descriptions-item>
            <el-descriptions-item label="预计成交日期">{{ opp.date }}</el-descriptions-item><el-descriptions-item label="当前阶段">{{ opp.stage === 'close' ? opp.result : stageName(opp.stage) }}</el-descriptions-item><el-descriptions-item label="赢率">{{ opp.prob }}%</el-descriptions-item><el-descriptions-item label="加权预测金额" :span="3">{{ opp.stage !== 'close' ? yuan(wAmount(opp) || 0) + '（预计金额 × 赢率，未结束商机计入预测）' : '—（已赢单/输单，不再计入预测）' }}</el-descriptions-item>
            <el-descriptions-item label="主要需求" :span="3">{{ opp.need || '-' }}</el-descriptions-item>
            <el-descriptions-item v-if="opp.loseReason" label="输单原因" :span="3">{{ opp.loseReason }}</el-descriptions-item>
            <el-descriptions-item v-if="opp.winReason" label="赢单原因" :span="3">{{ opp.winReason }}</el-descriptions-item>
          </el-descriptions>
          <div class="sec-title" style="margin-top:18px">竞争对手分析</div>
          <el-descriptions :column="2" border size="small"><el-descriptions-item label="竞争对手">{{ opp.competitor || '未填写' }}</el-descriptions-item><el-descriptions-item label="竞争情况">{{ opp.competitor && opp.competitor !== '-' ? '存在竞争，关注报价与方案差异' : '暂无明显竞争对手' }}</el-descriptions-item></el-descriptions>
          <div class="sec-title" style="margin-top:18px">各阶段必填信息</div>
          <el-descriptions v-if="infoRows.length" :column="2" border size="small">
            <el-descriptions-item v-for="r in infoRows" :key="r[0]" :label="r[0]">{{ r[1] }}</el-descriptions-item>
          </el-descriptions>
          <el-empty v-else description="当前阶段尚无补充信息（进入下一阶段时将按规则弹出校验并要求补全）" :image-size="72"/>
        </div></el-tab-pane>
        <el-tab-pane label="跟进记录" name="follow"><div class="tab-body">
          <el-timeline v-if="follows.length" style="padding-left:6px">
            <el-timeline-item v-for="(a,i) in follows" :key="a.no+i" :timestamp="a.time + ' · ' + a.who" placement="top" :type="i===0?'primary':''" :hollow="i!==0">
              <div class="tl-item-card"><div style="display:flex;gap:8px;align-items:center"><el-tag size="small">{{ a.type }}</el-tag><b>{{ a.content }}</b></div>
                <div class="muted" style="font-size:13px;margin-top:6px" v-if="a.feedback">反馈：{{ a.feedback }}</div>
                <div class="muted" style="font-size:13px">状态：{{ a.status }}<template v-if="a.next"> · 下一步：{{ a.next }}</template></div></div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无本商机关联的跟进记录（跟进时选择本商机后会出现在这里）" :image-size="72"/>
        </div></el-tab-pane>
        <el-tab-pane label="关联联系人" name="contacts"><div class="tab-body">
          <el-table :data="c.contacts" size="small"><el-table-column prop="no" label="编号" width="110"/><el-table-column prop="name" label="姓名" width="110"/><el-table-column prop="title" label="职务" width="130"/><el-table-column prop="dept" label="部门" width="130"/>
            <el-table-column prop="role" label="角色" width="100"><template #default="{row}"><el-tag size="small" :type="row.role==='决策人'?'danger':'info'">{{ row.role }}</el-tag></template></el-table-column>
            <el-table-column prop="infl" label="影响力" width="90"/><el-table-column prop="attitude" label="态度" width="90"/><el-table-column prop="phone" label="电话" width="130"/>
          </el-table>
        </div></el-tab-pane>
        <el-tab-pane label="关联报价" name="quotes"><div class="tab-body">
          <el-table v-if="quotesOf.length" :data="quotesOf" size="small"><el-table-column prop="no" label="报价编号" width="160"><template #default="{row}"><a class="link" @click="$go('/quote/'+row.no)">{{ row.no }}</a></template></el-table-column>
            <el-table-column label="含税金额" width="150" align="right"><template #default="{row}"><span class="money">¥{{ fmtC(Math.round(row.amount*100)) }}</span></template></el-table-column>
            <el-table-column prop="ver" label="版本" width="80"/><el-table-column prop="date" label="报价日期" width="120"/><el-table-column prop="valid" label="有效期至" width="120"/>
            <el-table-column label="审批状态"><template #default="{row}"><el-tag size="small" :type="row.appr==='已通过'?'success':'warning'">{{ row.appr }}</el-tag></template></el-table-column></el-table>
          <el-empty v-else description="暂无关联报价（进入「报价谈判」阶段前必须存在有效报价单）" :image-size="72"/>
        </div></el-tab-pane>
        <el-tab-pane label="关联合同" name="contracts"><div class="tab-body">
          <el-table v-if="contractsOf.length" :data="contractsOf" size="small"><el-table-column prop="no" label="合同编号" width="170"><template #default="{row}"><a class="link" @click="$go('/contract/'+row.no)">{{ row.no }}</a></template></el-table-column>
            <el-table-column prop="name" label="合同名称" min-width="220"/><el-table-column label="金额" width="140" align="right"><template #default="{row}"><span class="money">¥{{ fmtY(row.amount) }}</span></template></el-table-column>
            <el-table-column prop="signDate" label="签署日期" width="120"/><el-table-column label="状态" width="100"><template #default="{row}"><el-tag size="small" type="primary">{{ row.status }}</el-tag></template></el-table-column></el-table>
          <el-empty v-else description="暂无关联合同（赢单前需合同审批通过或订单已确认）" :image-size="72"/>
        </div></el-tab-pane>
        <el-tab-pane label="关联订单" name="orders"><div class="tab-body">
          <el-table v-if="ordersOf.length" :data="ordersOf" size="small"><el-table-column prop="no" label="订单编号" width="170"><template #default="{row}"><a class="link" @click="$go('/order/'+row.no)">{{ row.no }}</a></template></el-table-column>
            <el-table-column prop="contract" label="关联合同" width="170"/><el-table-column label="订单金额" width="140" align="right"><template #default="{row}"><span class="money">{{ yuan(row.amount) }}</span></template></el-table-column>
            <el-table-column prop="date" label="下单日期" width="120"/><el-table-column prop="owner" label="负责人" width="90"/><el-table-column label="状态" width="100"><template #default="{row}"><el-tag size="small" type="primary">{{ row.status }}</el-tag></template></el-table-column></el-table>
          <el-empty v-else description="暂无关联订单（赢单后可基于合同生成订单与交付任务）" :image-size="72"/>
        </div></el-tab-pane>
        <el-tab-pane label="商机附件" name="files"><div class="tab-body">
          <div class="ops"><el-button size="small" icon="Upload" @click="$msg.info('示例：上传商机附件（按权限控制）')">上传附件</el-button></div>
          <el-table v-if="filesOf.length" :data="filesOf" size="small"><el-table-column prop="name" label="文件名" min-width="260"><template #default="{row}"><el-icon><document/></el-icon> <a class="link">{{ row.name }}</a></template></el-table-column>
            <el-table-column prop="type" label="类型" width="110"/><el-table-column prop="ref" label="关联单据" width="170"/><el-table-column prop="size" label="大小" width="90"/><el-table-column prop="date" label="上传日期" width="120"/></el-table>
          <el-empty v-else description="暂无商机附件（报价单与合同附件会自动归集到这里）" :image-size="72"/>
        </div></el-tab-pane>
        <el-tab-pane label="阶段变更历史" name="history"><div class="tab-body">
          <el-timeline v-if="opp.history && opp.history.length">
            <el-timeline-item v-for="(h,i) in opp.history" :key="i" :timestamp="h.time + ' · ' + h.by" placement="top" :hollow="i!==0">
              <b>{{ h.from }} → {{ h.to }}</b><div class="muted" style="font-size:13px">备注：{{ h.remark }}</div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无阶段变更（创建时进入「初步接触」）。每次变更将记录变更前后阶段、变更人、变更时间、备注。" :image-size="72"/>
        </div></el-tab-pane>
        <el-tab-pane label="操作日志" name="logs"><div class="tab-body">
          <el-table :data="logs" size="small"><el-table-column prop="time" label="时间" width="170"/><el-table-column prop="who" label="操作人" width="130"/><el-table-column prop="act" label="操作" width="170"/><el-table-column prop="detail" label="详情" min-width="320"/></el-table>
        </div></el-tab-pane>
      </el-tabs>
    </div>
    <el-dialog v-model="gate.show" :title="'推进阶段校验 · '+(rule ? rule.title : '')" width="620px" :close-on-click-modal="false">
      <template v-if="gate.opp && rule">
        <div class="stage-flow"><el-tag effect="plain">{{ stageName(gate.opp.stage) }}</el-tag><el-icon><right/></el-icon><el-tag type="primary">{{ gate.target==='close' ? (gate.mode==='win' ? '赢单' : '输单') : stageName(gate.target) }}</el-tag><span class="muted" style="margin-left:auto">{{ gate.opp.name }}</span></div>
        <el-alert v-if="gate.failed" type="error" show-icon :closable="false" style="margin-bottom:12px" title="不满足阶段进入条件，不能推进。请补全下列必填信息或先完成前置业务。"/>
        <el-alert v-else type="info" show-icon :closable="false" style="margin-bottom:12px" :title="'进入「'+(gate.target==='close' ? (gate.mode==='win'?'赢单':'输单') : stageName(gate.target))+'」的最少必填信息（阶段规则可在后台配置）'"/>
        <el-form-item v-if="gate.target==='close'" label="成交结果" label-width="90px"><el-radio-group v-model="gate.mode" @change="gate.errors={};gate.failed=false"><el-radio-button label="win">赢单</el-radio-button><el-radio-button label="lose">输单</el-radio-button></el-radio-group></el-form-item>
        <div class="gate-row" :class="{bad:gate.errors[f.k]}" v-for="f in (rule.fields||[])" :key="f.k">
          <el-icon class="st"><component :is="gate.errors[f.k]?'CircleCloseFilled':(gate.form[f.k]?'SuccessFilled':'InfoFilled')"/></el-icon>
          <div style="flex:1"><div style="margin-bottom:6px"><b>{{ f.label }}</b><span v-if="f.k!=='competitor'" style="color:var(--el-color-danger)"> *</span><span v-if="gate.errors[f.k]" class="danger-text" style="margin-left:8px;font-size:12px">请填写{{ f.label }}</span></div>
            <el-input v-if="f.type==='input'" v-model="gate.form[f.k]" :placeholder="f.ph"/>
            <el-input v-else-if="f.type==='textarea'" type="textarea" :rows="2" v-model="gate.form[f.k]" :placeholder="f.ph"/>
            <el-date-picker v-else-if="f.type==='date'" v-model="gate.form[f.k]" type="date" value-format="YYYY-MM-DD" style="width:100%"/>
            <el-select v-else v-model="gate.form[f.k]" style="width:100%" placeholder="请选择"><el-option v-for="x in f.opts" :key="x" :value="x"/></el-select></div></div>
        <div class="gate-row" :class="{bad:!sysOk(cn)}" v-for="cn in (rule.checks||[])" :key="cn.k">
          <el-icon class="st"><component :is="sysOk(cn)?'SuccessFilled':'CircleCloseFilled'"/></el-icon>
          <div style="flex:1"><b>{{ cn.label }}</b><div class="muted" style="font-size:13px;margin-top:4px">系统校验：<span :class="sysOk(cn)?'ok-text':'danger-text'">{{ sysOk(cn) ? '已满足' : '未满足 — ' + cn.hint }}</span></div></div>
          <el-button v-if="!sysOk(cn)" size="small" type="primary" plain @click="gate.show=false;$go(cn.link)">前往处理</el-button></div>
        <el-form-item label="变更备注" label-width="90px" style="margin-top:6px"><el-input v-model="gate.remark" placeholder="选填，将与变更前后阶段、变更人、变更时间一并记录"/></el-form-item>
      </template>
      <template #footer><el-button @click="gate.show=false">取消</el-button><el-button type="primary" @click="confirmMove">确认推进</el-button></template>
    </el-dialog>
  </div>
  <div v-else class="card card-pad" style="text-align:center;padding:60px"><el-empty description="未找到该商机（示例数据中不存在）"><el-button type="primary" @click="$go('/opps')">返回商机看板</el-button></el-empty></div>`,
};
registerRoute('/opp/:no', OppDetailPage, 'opp-detail');
