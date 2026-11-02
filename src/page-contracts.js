/* ===== 第 4 阶段：合同列表 /contracts（真实数据）与合同详情 /contract/:no ===== */
DOCS_DEFAULT['contracts'] = mkDoc('contracts', {
  name: '合同台账', module: '合同管理',
  goal: '将销售合同全部生命周期（草稿 → 审批 → 签署 → 履约 → 完成 / 终止）集中管理：提供合同总量与状态统计、按关键词 / 客户 / 状态 / 负责人 / 签署日期区间的筛选查询，并支持新建合同与状态流转，保证合同数据与订单、报价、回款互相引用、可追溯。',
  roles: ['销售：查看本人合同，可新建合同草稿、提交审批', '销售经理：查看本部门及下级合同，可流转与审批', '财务：查看合同金额与回款计划（按角色字段权限脱敏）', '管理员：全部合同数据'],
  enter: ['左侧导航：合同管理 → 合同管理', '报价审批通过后「转为合同」生成合同', '工作台「即将到期合同」卡片、商机详情关联合同链接'],
  layout: ['顶部：面包屑 + 页面标题 + 合同总数', '统计卡：合同总数、履约中、即将到期(30天内)、总金额（均由列表数据实算）', '筛选区：关键词、客户、合同状态、负责人、签署日期区间（区间单独一行）', '表格：10 列 + 操作列（查看 / 推进 / 终止）', '分页：20 / 50 每页，真实分页'],
  fields: [
    '合同编号｜文本｜只读｜格式：HT-年月-序号，全库唯一',
    '合同名称｜文本｜必填：是｜说明：一般取「客户简称 + 主题 + 合同」',
    '客户｜文本｜必填：是｜校验：必须为已存在的客户',
    '金额｜货币｜必填：是｜校验：> 0｜说明：元，界面以千分位显示',
    '签署 / 起止日期｜日期｜必填：是｜校验：结束 ≥ 开始',
    '付款条款｜文本｜必填：是｜校验：分期比例合计 = 100%｜说明：生成回款计划',
    '状态｜枚举｜只读｜草稿 / 审批中 / 已签署 / 履约中 / 已完成 / 已终止 / 已到期',
  ],
  rules: ['列表数据全部来自 store.ext.contracts（真实分页），统计卡实时计算', '签署日期区间筛选在列表数据上先做区间过滤，再叠加关键词 / 客户 / 状态 / 负责人', '新建合同写入 store.ext.contracts 并生成对应回款计划，写操作日志', ' terminate / 流转均需留日志：谁、何时、从哪个状态到哪个状态'],
  flow: ['合同状态流转：草稿 → 提交审批 → 审批中 → 审批通过 → 已签署 → 开始履约 → 履约中 → 完成履约 → 已完成', '终止：审批中 / 已签署 / 履约中可终止，必须填写原因并记录，状态变为「已终止」', '已终止 / 已到期为终态，不再可流转'],
  errors: ['新建表单必填项未填：前端拦截并高亮错误', '终止未填原因：拦截并提示', '查询无结果：显示空态，可重置筛选'],
  api: ['合同分页查询、合同新建写入、合同状态流转接口、回款计划生成接口（示例）'],
  accept: ['统计卡数字由全部合同数据实算而非写死', '新建合同后列表与统计立即更新且可进入详情', '列表筛选（含日期区间）与分页可用，整页无控制台报错'],
  version: ['2026-11-02 · 张三 · 创建本页需求文档（原型版）'],
});
DOCS_DEFAULT['contract-detail'] = mkDoc('contract-detail', {
  name: '合同详情', module: '合同管理',
  goal: '展示单份合同的全量信息（基本信息、条款、回款计划、关单据与日志），并作为合同状态流转与终止操作的落点页面，保证每一步状态变化实时写回数据并留痕。',
  roles: ['负责人销售：查看本人合同、推进状态流转、发起终止', '销售经理：可流转审批并终止合同', '财务：查看回款计划与已收 / 未收（字段权限内）', '管理员：全部查看'],
  enter: ['合同台账点击合同编号或「查看」', '客户详情「合同」Tab、商机详情「关联合同」、订单详情「关联合同」链接', '报价页「转为合同」成功提示'],
  layout: ['头部：面包屑 + 合同名称 + 状态标签 + 合同金额 + 客户链接 + 状态流转按钮', 'Tab：基本信息 / 合同条款与付款条款 / 回款计划 / 关联订单 / 关联报价与商机 / 附件 / 审批记录 / 操作日志', '回款计划：分期列表 + 已收 / 待收汇总 + 前往回款管理链接'],
  fields: [
    '合同编号 / 名称 / 类型｜文本｜只读',
    '合同金额｜货币｜只读｜说明：与本次订单金额上限校验基准一致',
    '签署日期 / 起止日期｜日期｜只读',
    '付款条款｜文本｜只读｜说明：分期阶段与比例',
    '回款计划行：阶段 / 计划日期 / 金额 / 已收 / 待收 / 状态｜只读',
    '附件：文件名 / 大小 / 上传日期｜只读',
  ],
  rules: ['状态流转按钮按当前状态动态显示，操作后状态立即写回 store.ext.contracts 并新增操作日志', '终止必须填写原因（弹窗必填校验）后才允许执行', '回款计划的已收金额优先取回款管理(store.pay)中该合同的核销记录，否则按计划状态折算', '关单据（订单 / 报价 / 商机）均可点击跳转'],
  flow: ['草稿 → 提交审批 → 审批中 → 审批通过 → 已签署 → 开始履约 → 履约中 → 完成履约 → 已完成', '审批中 / 已签署 / 履约中可「终止」：状态 → 已终止，原因必填并入日志'],
  errors: ['合同编号不存在：页面提示未找到数据并给出返回列表入口', '终止原因未填：前端拦截', '回款数据缺失：按计划状态展示，不显示报错'],
  api: ['合同详情查询、状态流转接口、终止（带原因）接口、回款计划与核销记录查询、关单据联动查询（示例）'],
  accept: ['头部状态 / 金额 / 客户链接正确展示且客户可跳转', '任一状态流转操作后头部标签、统计与日志即时更新', '八个 Tab 内容与该合同自身数据一致，无控制台报错'],
  version: ['2026-11-02 · 张三 · 创建本页需求文档（原型版）'],
});

/* --- 字段规范：保留行用 sign/end，生成行用 startDate/endDate，统一补齐 --- */
store.ext.contracts.forEach(ct => { if (!ct.startDate) ct.startDate = ct.signDate || ''; if (!ct.endDate) ct.endDate = ct.end || ''; });

/* --- 合同状态流转定义与写日志工具 --- */
const CT_FLOW = [
  { from: '草稿', act: '提交审批', to: '待审批', tip: '提交后进入审批流程（销售经理 / 法务 / 财务）' },
  { from: '已驳回', act: '重新提交', to: '待审批', tip: '按驳回原因修改后重新提交审批' },
  { from: '待审批', act: '审批通过', to: '审批通过', tip: '审批链全部同意，进入待签署' },
  { from: '审批通过', act: '发起签署', to: '待签署', tip: '审批通过后发送客户签署' },
  { from: '待签署', act: '确认签署', to: '生效', tip: '双方签署完成，合同正式生效' },
  { from: '生效', act: '开始履约', to: '履约中', tip: '合同生效进入履约期，可开始回款与交付' },
  { from: '履约中', act: '完成履约', to: '已完成', tip: '款项与交付完成后归档' },
];
const CT_STATUS_ALL = ['草稿', '待审批', '审批通过', '待签署', '生效', '履约中', '已完成', '已驳回', '已撤销', '已终止', '已到期'];
const CT_TERMINABLE = ['待签署', '生效', '履约中'];
const CT_WITHDRAWABLE = ['草稿', '待审批', '审批通过', '待签署'];
const ctLogTime = () => TODAY + ' 0' + ((store.ext.logs.length % 8) + 1) + ':' + ((store.ext.logs.length * 7 % 55) + 5);
function ctLog(no, act, detail) { store.ext.logs.unshift({ time: ctLogTime(), who: '张三', module: '合同', act, detail: detail + '（合同：' + no + '）' }); }
function ctTransit(ct, act) {
  const step = CT_FLOW.find(f => f.from === ct.status && f.act === act);
  if (!step) return false;
  ct.status = step.to;
  ctLog(ct.no, act, '状态由「' + step.from + '」变更为「' + step.to + '」');
  return true;
}
/* 新建合同付款条款模板（分期比例合计恒为 100%） */
const CT_PAY_TPLS = [
  { key: 'A', label: '合同签署 30% / 项目上线 40% / 项目验收 30%', stages: [['合同签署', 30], ['项目上线', 40], ['项目验收', 30]] },
  { key: 'B', label: '预付款 50% / 验收款 50%', stages: [['预付款', 50], ['验收款', 50]] },
  { key: 'C', label: '首付款 60% / 尾款 40%', stages: [['首付款', 60], ['尾款', 40]] },
];
/* 合同已收金额：优先取回款管理（store.pay）中该合同的核销记录，否则按计划状态折算 */
const ctRecvOf = (ct, plan) => {
  const fallback = plan.status === '已回款' ? plan.amount : plan.status === '部分回款' ? plan.amount / 2 : 0;
  const pc = (typeof store.pay !== 'undefined') && store.pay.contracts.find(x => x.no === ct.no);
  if (!pc || !plan.stage) return fallback;
  const got = store.pay.records.reduce((s, r) => s + r.alloc.filter(a => pc.plans.filter(p => p.stage === plan.stage).some(p => p.id === a.plan)).reduce((x, a) => x + a.amt, 0), 0);
  return Math.max(got / 100, fallback);
};

const ContractsPage = {
  components: { ListPage },
  setup() {
    const totalText = computed(() => '合同台账共 ' + store.ext.contracts.length + ' 份');
    const stats = computed(() => {
      const a = store.ext.contracts;
      const expiring = a.filter(ct => ct.status === '履约中' && ct.endDate && daysBetween(TODAY, ct.endDate) >= 0 && daysBetween(TODAY, ct.endDate) <= 30).length;
      return [
        ['合同总数', String(a.length), ''],
        ['履约中', String(a.filter(ct => ct.status === '履约中').length), 'ok'],
        ['即将到期 (30天内)', String(expiring), 'danger'],
        ['总金额', '¥' + fmtY(a.reduce((s, ct) => s + (ct.amount || 0), 0)), ''],
      ];
    });
    /* 签署日期区间（ListPage 只支持精确匹配，区间先在父组件过滤） */
    const dr = reactive({ from: '', to: '' });
    const rows = computed(() => store.ext.contracts.filter(ct => (!dr.from || (ct.signDate || '') >= dr.from) && (!dr.to || (ct.signDate || '') <= dr.to)));
    const customerOpts = computed(() => [...new Set(store.ext.contracts.map(ct => ct.customer).filter(Boolean))].sort());
    const ownerOpts = computed(() => [...new Set(store.ext.contracts.map(ct => ct.owner).filter(Boolean))]);
    const statusOpts = CT_STATUS_ALL;
    const cols = [
      { p: 'no', l: '合同编号', w: 150, link: true }, { p: 'name', l: '合同名称', w: 220 }, { p: 'customer', l: '客户名称', w: 200, link: 'cust' },
      { p: 'opp', l: '关联商机', w: 150, link: true }, { p: 'type', l: '合同类型', w: 100 }, { p: 'amount', l: '合同金额', w: 130, money: true },
      { p: 'signDate', l: '签署日期', w: 110 }, { p: 'startDate', l: '生效日期', w: 110 }, { p: 'endDate', l: '到期日期', w: 110 },
      { p: 'owner', l: '负责人', w: 90 },
      { p: 'status', l: '合同状态', w: 100, tag: { 草稿: 'info', 待审批: 'warning', 审批通过: 'warning', 待签署: 'primary', 生效: 'primary', 履约中: 'primary', 已完成: 'success', 已驳回: 'danger', 已撤销: 'info', 已终止: 'danger', 已到期: 'info' } },
    ];
    const filters = computed(() => [
      { k: 'kw', label: '搜索合同', ph: '合同编号 / 名称 / 客户' }, { k: 'customer', label: '客户', opts: customerOpts.value },
      { k: 'type', label: '合同类型', opts: ['销售合同', '服务合同', '续费合同'] },
      { k: 'status', label: '状态', opts: statusOpts }, { k: 'owner', label: '负责人', opts: ownerOpts.value },
    ]);
    /* ---- 行内操作 ---- */
    const onLink = (c, row) => (c.p === 'opp' && row.opp ? go('/opp/' + row.opp) : go('/contract/' + row.no));
    const transit = row => { const step = CT_FLOW.find(f => f.from === row.status); if (!step) return ElMessage.info('当前状态「' + row.status + '」不可推进'); ctTransit(row, step.act); ElMessage.success('已' + step.act + '（' + step.tip + '），状态与日志已更新'); };
    const terminate = row => ElMessageBox.prompt('终止后合同进入「已终止」终态，未收回款与未完成订单将保持但不允许再推进。请填写终止原因（必填）：', '终止合同 ' + row.no, { confirmButtonText: '确认终止', cancelButtonText: '取消', inputPattern: /\S+/, inputErrorMessage: '终止原因不能为空' })
      .then(({ value }) => { const prev = row.status; row.status = '已终止'; ctLog(row.no, '终止', '原因：' + value + '；原状态：' + prev); ElMessage.success('合同已终止，原因已记录'); }).catch(() => {});
    /* ---- 新建合同弹窗 ---- */
    const fref = ref(null);
    const dlg = ref(false);
    const draft = reactive({ customer: '', name: '', quote: '', opp: '', type: '销售合同', amount: null, taxRate: 6, signDate: TODAY, startDate: '', endDate: '', tpl: 'A', owner: '张三' });
    const rule = {
      customer: [{ required: true, message: '请选择客户', trigger: 'change' }],
      name: [{ required: true, message: '请填写合同名称', trigger: 'blur' }],
      amount: [{ required: true, message: '请填写合同金额', trigger: 'blur' }],
      dates: [{ required: true, message: '请选择起止日期', trigger: 'change', validator: (r, v, cb) => (draft.startDate && draft.endDate && draft.endDate >= draft.startDate ? cb() : cb(new Error('请选择起止日期且结束不早于开始'))) }],
      tpl: [{ required: true, message: '请选择付款条款', trigger: 'change' }],
    };
    const quoteOpts = computed(() => draft.customer ? store.ext.quotes.filter(q => q.customer === draft.customer && q.appr === '已通过') : []);
    const oppOpts = computed(() => draft.customer ? store.opps.filter(o => o.customer === draft.customer) : []);
    const watchCust = nv => { draft.quote = ''; draft.opp = ''; if (!draft.name) draft.name = extShort(nv) + ' ' + draft.type; };
    const watchQuote = nv => { const q = quoteOpts.value.find(x => x.no === nv); if (q && q.opp) draft.opp = q.opp; };
    const save = () => fref.value.validate(ok => {
      if (!ok) return;
      const tpl = CT_PAY_TPLS.find(t => t.key === draft.tpl);
      const base = 'HT-' + TODAY.slice(0, 7).replace('-', '') + '-';
      const already = new Set(store.ext.contracts.map(ct => ct.no));
      let seq = 100 + store.ext.contracts.filter(ct => ct.no.startsWith(base)).length;
      let no; do { no = base + String(seq++).padStart(4, '0'); } while (already.has(no));
      const plans = tpl.stages.map((st, i) => ({ stage: st[0], date: extAddDays(draft.startDate, i * 60), amount: Math.round(draft.amount * st[1]) / 100, status: i === 0 ? '未回款' : '未回款' }));
      store.ext.contracts.unshift({
        no, name: draft.name, customer: draft.customer, quote: draft.quote || '', opp: draft.opp || (quoteOpts.value.find(q => q.no === draft.quote) || {}).opp || '',
        type: draft.type, amount: draft.amount, taxRate: draft.taxRate, signDate: draft.signDate, startDate: draft.startDate, endDate: draft.endDate,
        status: '草稿', owner: draft.owner, payTerms: tpl.stages.map(s => s[0] + ' ' + s[1] + '%').join(' / '),
        plans, attachments: [], changes: [], approvals: [{ node: '发起申请', who: draft.owner, result: '草稿保存', time: TODAY + ' 09:00' }],
      });
      ctLog(no, '新建', '新建合同（客户：' + draft.customer + '，金额：¥' + fmtY(draft.amount) + '，付款条款：' + tpl.label + '）');
      dlg.value = false; ElMessage.success('合同已保存为草稿，可提交审批');
      go('/contract/' + no);
    });
    return { totalText, stats, rows, cols, filters, dr, store, dlg, fref, draft, rule, CT_PAY_TPLS, quoteOpts, oppOpts, watchCust, watchQuote, save, onLink, transit, terminate, fmtY, fmtC, today: TODAY };
  },
  template: `<div>
    <list-page :crumbs="['合同管理','合同台账']" title="合同台账" :total-text="totalText" :stats="stats" :filters="filters" :rows="rows" :cols="cols" :action-width="200" note-tag="真实数据 · 点击合同编号进入详情"
      @link="onLink">
      <template #ops>
        <el-button type="primary" icon="Plus" @click="draft.customer='';draft.name='';dlg=true">新建合同</el-button>
        <el-button icon="Download" @click="$msg.info('示例：导出合同（按数据权限脱敏）')">导出</el-button>
      </template>
      <template #top>
        <div class="card" style="margin-bottom:12px;padding:12px 18px">
          <span class="muted" style="font-size:13px;margin-right:8px">签署日期区间</span>
          <el-date-picker v-model="dr.from" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" clearable style="width:150px"/>
          <span style="margin:0 6px">-</span>
          <el-date-picker v-model="dr.to" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" clearable style="width:150px"/>
          <el-button v-if="dr.from||dr.to" link type="primary" @click="dr.from='';dr.to=''">清除</el-button>
          <span class="muted" style="font-size:12px;margin-left:12px">区间按签署日期过滤后，再叠加下方关键词 / 客户 / 状态 / 负责人筛选</span>
        </div>
      </template>
      <template #actions="{row}">
        <el-button link type="primary" @click="$go('/contract/'+row.no)">查看</el-button>
        <el-button v-if="['草稿','已驳回','待审批','审批通过','待签署','生效','履约中'].includes(row.status)" link type="primary" @click="transit(row)">{{ ({'草稿':'提交审批','已驳回':'重新提交','待审批':'审批通过','审批通过':'发起签署','待签署':'确认签署','生效':'开始履约','履约中':'完成履约'})[row.status] }}</el-button>
        <el-button v-if="['待签署','生效','履约中'].includes(row.status)" link type="danger" @click="terminate(row)">终止</el-button>
      </template>
    </list-page>
    <el-dialog v-model="dlg" title="新建合同（保存为草稿）" width="680px">
      <el-form ref="fref" :model="draft" :rules="rule" label-width="110px">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="客户" prop="customer"><el-select v-model="draft.customer" filterable placeholder="选择客户" style="width:100%" @change="watchCust"><el-option v-for="c in store.customers" :key="c.no" :label="c.name" :value="c.name"/></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="关联报价"><el-select v-model="draft.quote" clearable placeholder="该客户已通过的报价" style="width:100%" @change="watchQuote"><el-option v-for="q in quoteOpts" :key="q.no" :label="q.no + '（¥' + fmtY(q.amount) + '）'" :value="q.no"/></el-select></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="关联商机"><el-select v-model="draft.opp" clearable filterable placeholder="选择该客户的商机" style="width:100%"><el-option v-for="o in oppOpts" :key="o.no" :label="o.no + ' · ' + o.name" :value="o.no"/></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="合同名称" prop="name"><el-input v-model="draft.name" placeholder="如：某某科技 ERP 实施合同" style="width:100%"/></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="8"><el-form-item label="合同金额" prop="amount"><el-input-number v-model="draft.amount" :min="0" :step="10000" :controls="false" placeholder="元" style="width:100%"/></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="合同类型"><el-select v-model="draft.type" style="width:100%"><el-option v-for="x in ['销售合同','服务合同','续费合同']" :key="x" :value="x"/></el-select></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="税率(%)"><el-input-number v-model="draft.taxRate" :min="0" :max="100" :controls="false" style="width:100%"/></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="签署日期"><el-date-picker v-model="draft.signDate" type="date" value-format="YYYY-MM-DD" style="width:100%"/></el-form-item></el-col>
        </el-row>
        <el-form-item label="起止日期" prop="dates">
          <el-date-picker v-model="draft.startDate" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" style="width:49%"/>
          <span style="margin:0 6px">-</span>
          <el-date-picker v-model="draft.endDate" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" style="width:49%"/>
        </el-form-item>
        <el-form-item label="负责人"><el-select v-model="draft.owner" style="width:240px"><el-option v-for="o in OWNERS" :key="o" :value="o"/></el-select></el-form-item>
        <el-form-item label="付款条款" prop="tpl"><el-select v-model="draft.tpl" style="width:100%"><el-option v-for="t in CT_PAY_TPLS" :key="t.key" :label="t.label" :value="t.key"/></el-select></el-form-item>
      </el-form>
      <el-alert type="info" show-icon :closable="false" :title="'保存后「' + ((CT_PAY_TPLS.find(t=>t.key===draft.tpl)||{}).label || '') + '」将生成对应回款计划；签署日期区间筛选会包含本合同。'"/>
      <template #footer><el-button @click="dlg=false">取消</el-button><el-button type="primary" @click="save">保存为草稿</el-button></template>
    </el-dialog>
  </div>`,
};
registerRoute('/contracts', ContractsPage, 'contracts');

/* ===== 合同详情 /contract/:no ===== */
const ContractDetailPage = {
  components: { PageHead },
  props: { no: String },
  setup(props) {
    const ct = computed(() => store.ext.contracts.find(x => x.no === props.no) || null);
    const tab = ref('info');
    const custNo = computed(() => cno((ct.value || {}).customer || ''));
    /* -- 回款计划 -- */
    const planRows = computed(() => {
      const c = ct.value; if (!c) return []; let n = 1;
      return (c.plans || []).map(p => {
        const got = ctRecvOf(c, p);
        const rest = Math.max(0, p.amount - got);
        return { seq: n++, stage: p.stage, date: p.date, amount: p.amount, got, rest, status: p.status, info: got >= p.amount ? '已收齐' : (got > 0 ? '已部分核销' : '尚未回款') };
      });
    });
    const paySum = computed(() => ({ got: planRows.value.reduce((s, r) => s + r.got, 0), rest: planRows.value.reduce((s, r) => s + r.rest, 0) }));
    /* -- 关联数据 -- */
    const ordersOf = computed(() => ct.value ? store.ext.orders.filter(o => o.contract === ct.value.no) : []);
    const quoteOf = computed(() => ct.value ? store.ext.quotes.find(q => q.no === ct.value.quote) || null : null);
    const oppOf = computed(() => ct.value ? store.opps.find(o => o.no === ct.value.opp) || null : null);
    const logs = computed(() => {
      const c = ct.value; if (!c) return []; const base = [];
      (c.approvals || []).forEach(a => base.push({ time: a.time || '', who: a.who, act: (a.node || '') + ' · ' + (a.result || ''), detail: a.result === '草稿保存' ? '合同创建为草稿' : '审批节点「' + a.node + '」：' + a.result }));
      store.ext.logs.filter(x => x.module === '合同' && x.detail.includes(c.no)).forEach(x => base.push({ time: x.time, who: x.who, act: x.act, detail: x.detail }));
      return base.filter(x => x.time).sort((a, b) => (a.time < b.time ? 1 : -1));
    });
    /* -- 状态流转 -- */
    const buttons = computed(() => {
      const c = ct.value; if (!c) return [];
      const b = [];
      if (c.status === '待审批') {
        b.push({ act: '审批通过', type: 'primary', label: '审批通过', tip: '审批链同意后进入审批通过' });
        b.push({ act: 'reject', type: 'danger', plain: true, label: '驳回' });
      } else {
        const step = CT_FLOW.find(f => f.from === c.status);
        if (step) b.push({ act: step.act, type: 'primary', label: step.act, tip: step.tip });
      }
      if (CT_WITHDRAWABLE.includes(c.status)) b.push({ act: 'withdraw', type: 'warning', plain: true, label: '撤销' });
      if (['生效', '履约中'].includes(c.status)) b.push({ act: 'change', type: 'warning', plain: true, label: '合同变更' });
      if (CT_TERMINABLE.includes(c.status)) b.push({ act: 'terminate', type: 'danger', plain: true, label: '终止合同' });
      return b;
    });
    const termDlg = ref(false); const termRf = reactive({ reason: '' });
    const reasonDlg = ref(false); const reasonMode = ref('reject'); const reasonRf = reactive({ reason: '' });
    const chgDlg = ref(false); const chgRf = reactive({ type: '金额变更', reason: '', amount: 0 });
    const changes = computed(() => (ct.value && ct.value.changes) || []);
    const taxRate = computed(() => (ct.value && ct.value.taxRate != null ? ct.value.taxRate : 6));
    const parties = computed(() => {
      const c = ct.value; if (!c) return [];
      return [
        ['甲方（客户）', c.customer],
        ['乙方（我方）', '某某软件有限公司'],
        ['甲方签约人', c.owner || '-'],
        ['乙方签约人', '商务负责人 ' + (c.owner || '-')],
        ['签署方式', c.signDate ? '电子签章 + 纸质原件' : '待签署'],
        ['签署时间', c.signDate || '待签署'],
      ];
    });
    const doAct = b => {
      if (b.act === 'terminate') { termRf.reason = ''; termDlg.value = true; return; }
      if (b.act === 'reject') { reasonMode.value = 'reject'; reasonRf.reason = ''; reasonDlg.value = true; return; }
      if (b.act === 'withdraw') { reasonMode.value = 'withdraw'; reasonRf.reason = ''; reasonDlg.value = true; return; }
      if (b.act === 'change') { chgRf.type = '金额变更'; chgRf.reason = ''; chgRf.amount = ct.value.amount; chgDlg.value = true; return; }
      if (ctTransit(ct.value, b.act)) ElMessage.success('已' + b.act + '（' + b.tip + '），状态与操作日志已更新');
      else ElMessage.info('当前状态不可执行该操作');
    };
    const doReason = () => {
      const v = reasonRf.reason.trim();
      if (!v) return ElMessage.warning('请填写原因（必填）');
      const prev = ct.value.status;
      if (reasonMode.value === 'reject') {
        ct.value.status = '已驳回';
        ct.value.approvals = ct.value.approvals || [];
        ct.value.approvals.push({ node: '审批驳回', who: '审批人', result: '已驳回', time: TODAY + ' 15:00' });
        ctLog(ct.value.no, '驳回', '审批驳回，原因：' + v + '；原状态：' + prev);
      } else {
        ct.value.status = '已撤销';
        ctLog(ct.value.no, '撤销', '撤销原因：' + v + '；原状态：' + prev);
      }
      reasonDlg.value = false;
      ElMessage.success(reasonMode.value === 'reject' ? '合同已驳回，原因已记录' : '合同已撤销，原因已记录');
    };
    const doTerminate = () => {
      const v = termRf.reason.trim();
      if (!v) return ElMessage.warning('请填写终止原因（必填）');
      const prev = ct.value.status;
      ct.value.status = '已终止';
      ctLog(ct.value.no, '终止', '终止原因：' + v + '；原状态：' + prev);
      termDlg.value = false;
      ElMessage.success('合同已终止，原因已写入操作日志');
    };
    const doChange = () => {
      const v = chgRf.reason.trim();
      if (!v) return ElMessage.warning('请填写变更原因（必填）');
      if (chgRf.type === '金额变更' && (!chgRf.amount || chgRf.amount <= 0)) return ElMessage.warning('变更后金额必须大于 0');
      const c = ct.value;
      if (!c.changes) c.changes = [];
      c.changes.unshift({ time: TODAY + ' 16:00', type: chgRf.type, reason: v, before: c.amount, after: chgRf.type === '金额变更' ? chgRf.amount : c.amount, status: '待审批', who: '张三' });
      ctLog(c.no, '变更申请', chgRf.type + '：' + v + '；变更前 ¥' + fmtY(c.amount) + (chgRf.type === '金额变更' ? '，变更后 ¥' + fmtY(chgRf.amount) : '') + '，需重新审批后生效');
      chgDlg.value = false;
      ElMessage.success('变更申请已提交，需重新审批后生效');
    };
    return { ct, tab, custNo, planRows, paySum, ordersOf, quoteOf, oppOf, logs, buttons, doAct, termDlg, termRf, doTerminate, reasonDlg, reasonMode, reasonRf, doReason, chgDlg, chgRf, doChange, changes, taxRate, parties, fmtY, fmtC, CT_FLOW, today: TODAY };
  },
  template: `<div v-if="ct">
    <el-breadcrumb separator="/" class="crumb"><el-breadcrumb-item><a @click="$go('/contracts')">合同管理</a></el-breadcrumb-item><el-breadcrumb-item><a @click="$go('/contracts')">合同台账</a></el-breadcrumb-item><el-breadcrumb-item>{{ ct.no }}</el-breadcrumb-item></el-breadcrumb>
    <div class="page-head"><h1>{{ ct.name }}</h1><el-tag :type="({草稿:'info',待审批:'warning',审批通过:'warning',待签署:'primary',生效:'primary',履约中:'primary',已完成:'success',已驳回:'danger',已撤销:'info',已终止:'danger',已到期:'info'})[ct.status]||'info'">{{ ct.status }}</el-tag><span class="total">合同金额 ¥{{ fmtY(ct.amount) }} · <a class="link" @click="$go('/customer/'+custNo)">{{ ct.customer }}</a></span></div>
    <div class="ops" style="margin-top:-4px">
      <el-button v-for="b in buttons" :key="b.act" :type="b.type" :plain="!!b.plain" @click="doAct(b)">{{ b.label }}</el-button>
      <el-button icon="Document" @click="$msg.info('示例：下载合同 PDF')">下载</el-button>
    </div>
    <el-alert v-if="ct.status==='已终止'" type="error" show-icon :closable="false" style="margin-bottom:12px" title="该合同已终止：仅可查看历史数据，不可再推进状态或新增订单。"/>
    <el-card shadow="never" style="margin-bottom:14px" :body-style="{padding:'0'}">
      <el-tabs v-model="tab">
        <el-tab-pane label="基本信息" name="info">
          <div class="card card-pad" style="padding:14px 18px">
            <el-descriptions :column="3" border>
              <el-descriptions-item label="合同编号">{{ ct.no }}</el-descriptions-item>
              <el-descriptions-item label="合同名称">{{ ct.name }}</el-descriptions-item>
              <el-descriptions-item label="合同类型">{{ ct.type }}</el-descriptions-item>
              <el-descriptions-item label="客户"><a class="link" @click="$go('/customer/'+custNo)">{{ ct.customer }}</a></el-descriptions-item>
              <el-descriptions-item label="关联商机"><a v-if="ct.opp" class="link" @click="$go('/opp/'+ct.opp)">{{ ct.opp }}</a><span v-else>-</span></el-descriptions-item>
              <el-descriptions-item label="合同金额"><span class="money">¥{{ fmtY(ct.amount) }}</span></el-descriptions-item>
              <el-descriptions-item label="税率">{{ taxRate }}%</el-descriptions-item>
              <el-descriptions-item label="负责人">{{ ct.owner }}</el-descriptions-item>
              <el-descriptions-item label="签署日期">{{ ct.signDate || '-' }}</el-descriptions-item>
              <el-descriptions-item label="生效日期">{{ ct.startDate || '-' }}</el-descriptions-item>
              <el-descriptions-item label="到期日期">{{ ct.endDate || '-' }}</el-descriptions-item>
            </el-descriptions>
            <el-descriptions :column="1" border style="margin-top:12px">
              <el-descriptions-item label="履约期限">{{ (ct.startDate || '-') + ' 至 ' + (ct.endDate || '-') }}</el-descriptions-item>
              <el-descriptions-item label="付款条件">{{ ct.payTerms || '-' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-tab-pane>
        <el-tab-pane label="签约与变更" name="sign">
          <div class="card card-pad" style="padding:14px 18px">
            <div class="card-title">合同主体及签约方</div>
            <el-descriptions :column="2" border>
              <el-descriptions-item v-for="p in parties" :key="p[0]" :label="p[0]">{{ p[1] }}</el-descriptions-item>
            </el-descriptions>
            <div class="card-title" style="margin-top:16px">签署信息</div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="签署日期">{{ ct.signDate || '待签署' }}</el-descriptions-item>
              <el-descriptions-item label="合同生效日期">{{ ct.startDate || '-' }}</el-descriptions-item>
              <el-descriptions-item label="签署状态">{{ ct.signDate ? '已签署' : '待签署' }}</el-descriptions-item>
              <el-descriptions-item label="合同文件">{{ (ct.attachments && ct.attachments.length) ? ct.attachments[0].name : '待上传' }}</el-descriptions-item>
            </el-descriptions>
            <div class="card-title" style="margin-top:16px">变更、补充协议</div>
            <el-alert v-if="!changes.length" type="info" show-icon :closable="false" title="暂无变更记录；合同审批后如需修改金额 / 付款条件，应提交变更申请并重新审批（第十二章「合同审批后修改」）。"/>
            <el-table v-else :data="changes" size="small" border>
              <el-table-column prop="time" label="申请时间" width="150"/><el-table-column prop="type" label="变更类型" width="110"/>
              <el-table-column prop="reason" label="变更原因" min-width="220"/>
              <el-table-column label="金额变化" width="220"><template #default="{row}">¥{{ fmtY(row.before) }} → ¥{{ fmtY(row.after) }}</template></el-table-column>
              <el-table-column prop="status" label="审批状态" width="100"><template #default="{row}"><el-tag size="small" :type="row.status==='已通过'?'success':'warning'">{{ row.status }}</el-tag></template></el-table-column>
              <el-table-column prop="who" label="申请人" width="90"/>
            </el-table>
          </div>
        </el-tab-pane>
        <el-tab-pane label="合同条款与付款条款" name="terms">
          <div class="card card-pad" style="padding:14px 18px">
            <div class="card-title">合同条款摘要</div>
            <el-descriptions :column="2" border><el-descriptions-item label="交付约定">合同生效后按《实施计划》完成部署与验收</el-descriptions-item><el-descriptions-item label="验收标准">按合同附件《验收标准清单》逐项确认</el-descriptions-item><el-descriptions-item label="违约与终止">任一方违约可提前终止，需书面通知并结算未付款项</el-descriptions-item><el-descriptions-item label="知识产权">交付成果在收清全部款项后归客户所有</el-descriptions-item></el-descriptions>
            <div class="card-title" style="margin-top:16px">付款条款（{{ ct.payTerms }}）</div>
            <el-table :data="planRows" size="small" border>
              <el-table-column prop="stage" label="款项阶段" min-width="120"/><el-table-column label="承付比例" width="100"><template #default="{row}">{{ Math.round(row.amount*100/ct.amount) }}%</template></el-table-column><el-table-column prop="date" label="计划日期" width="120"/>
              <el-table-column label="金额" width="130" align="right"><template #default="{row}"><span class="money">¥{{ fmtY(row.amount) }}</span></template></el-table-column>
            </el-table>
            <el-alert type="info" show-icon :closable="false" style="margin-top:10px" title="分期比例合计恒为 100%；各期金额随状态于「回款计划」Tab 跟踪核销。"/>
          </div>
        </el-tab-pane>
        <el-tab-pane label="回款计划" name="plans">
          <div class="card card-pad" style="padding:14px 18px">
            <div class="stat-row" style="grid-template-columns:repeat(3,1fr);margin-bottom:10px">
              <div class="stat-card"><span class="lb">已收金额</span><span class="vl">¥{{ fmtY(paySum.got) }}</span><span class="ft">含部分核销</span></div>
              <div class="stat-card warn"><span class="lb">待收金额</span><span class="vl">¥{{ fmtY(paySum.rest) }}</span><span class="ft">计划总额 ¥{{ fmtY(ct.amount) }}</span></div>
              <div class="stat-card ok"><span class="lb">回款完成度</span><span class="vl">{{ ct.amount ? Math.round(paySum.got*100/ct.amount) : 0 }}%</span><span class="ft">已收 / 合同金额</span></div>
            </div>
            <el-table :data="planRows" size="small" border>
              <el-table-column prop="seq" label="期次" width="60"/>
              <el-table-column prop="stage" label="款项阶段" min-width="110"/><el-table-column prop="date" label="计划日期" width="110"/>
              <el-table-column label="计划金额" width="120" align="right"><template #default="{row}"><span class="money">¥{{ fmtY(row.amount) }}</span></template></el-table-column>
              <el-table-column label="已收" width="120" align="right"><template #default="{row}"><span class="money ok-text">¥{{ fmtY(row.got) }}</span></template></el-table-column>
              <el-table-column label="待收" width="120" align="right"><template #default="{row}"><span class="money" :class="{'danger-text':row.rest>0}">¥{{ fmtY(row.rest) }}</span></template></el-table-column>
              <el-table-column label="状态" min-width="130"><template #default="{row}"><el-tag size="small" :type="({已回款:'success',部分回款:'warning',未回款:'info'})[row.status]||'info'">{{ row.status }}</el-tag><span class="muted" style="font-size:12px;margin-left:6px">{{ row.info }}</span></template></el-table-column>
            </el-table>
            <div style="margin-top:12px"><el-button type="primary" plain icon="Wallet" @click="$go('/payments')">前往回款管理（登记收款 / 核销）</el-button></div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="关联订单" name="orders">
          <div class="card card-pad" style="padding:14px 18px">
            <el-alert v-if="!ordersOf.length" type="info" show-icon :closable="false" title="该合同下暂无订单；可在订单管理新建订单并选择本合同。"/>
            <el-table v-else :data="ordersOf" size="small" border>
              <el-table-column prop="no" label="订单编号" width="150"><template #default="{row}"><a class="link" @click="$go('/order/'+row.no)">{{ row.no }}</a></template></el-table-column>
              <el-table-column label="订单金额" width="130" align="right"><template #default="{row}"><span class="money">¥{{ fmtY(row.amount) }}</span></template></el-table-column>
              <el-table-column prop="date" label="订单日期" width="110"/><el-table-column prop="dlv" label="交付日期" width="110"/>
              <el-table-column prop="owner" label="负责人" width="90"/>
              <el-table-column label="状态" width="100"><template #default="{row}"><el-tag size="small" :type="({待确认:'info',已确认:'warning',待交付:'warning',交付中:'primary',已完成:'success',已取消:'danger',已关闭:'info',暂停执行:'danger'})[row.status]||'info'">{{ row.status }}</el-tag></template></el-table-column>
            </el-table>
            <div style="margin-top:12px"><el-button type="primary" plain icon="Plus" @click="$go('/orders')">去订单管理新建</el-button></div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="关联报价与商机" name="source">
          <div class="card card-pad" style="padding:14px 18px">
            <div class="card-title">关联报价</div>
            <el-table v-if="quoteOf" :data="[quoteOf]" size="small" border>
              <el-table-column prop="no" label="报价编号" width="160"><template #default="{row}"><a class="link" @click="$go('/quote/'+row.no)">{{ row.no }}</a></template></el-table-column>
              <el-table-column label="含税金额" width="140" align="right"><template #default="{row}"><span class="money">¥{{ fmtY(row.amount) }}</span></template></el-table-column>
              <el-table-column prop="appr" label="审批状态" width="110"/><el-table-column prop="ver" label="版本" width="70"/>
              <el-table-column prop="date" label="报价日期"/>
            </el-table>
            <el-empty v-else description="该合同未关联报价"/>
            <div class="card-title" style="margin-top:14px">关联商机</div>
            <el-table v-if="oppOf" :data="[oppOf]" size="small" border>
              <el-table-column prop="no" label="商机编号" width="160"><template #default="{row}"><a class="link" @click="$go('/opp/'+row.no)">{{ row.no }}</a></template></el-table-column>
              <el-table-column prop="name" label="商机名称" min-width="180"/>
              <el-table-column label="预计金额" width="130" align="right"><template #default="{row}">¥{{ fmtY(row.amount) }}</template></el-table-column>
              <el-table-column prop="owner" label="负责人" width="90"/>
            </el-table>
            <el-empty v-else description="该合同未关联商机"/>
          </div>
        </el-tab-pane>
        <el-tab-pane label="附件" name="files">
          <div class="card card-pad" style="padding:14px 18px">
            <el-alert v-if="!(ct.attachments||[]).length" type="info" show-icon :closable="false" title="暂无附件；草稿 / 待审批合同可先上传付款条款确认函等材料。"/>
            <el-table v-else :data="ct.attachments" size="small" border>
              <el-table-column label="文件名" min-width="240"><template #default="{row}"><a class="link"><el-icon style="vertical-align:-2px"><document/></el-icon> {{ row.name }}</a></template></el-table-column>
              <el-table-column prop="size" label="大小" width="90"/><el-table-column prop="date" label="上传日期" width="120"/>
            </el-table>
            <div style="margin-top:12px"><el-button size="small" icon="Upload" @click="$msg.info('示例：上传合同附件（扫描件 / 补充协议）')">上传附件</el-button></div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="审批记录" name="appr">
          <div class="card card-pad" style="padding:14px 18px">
            <el-table :data="ct.approvals||[]" size="small" border>
              <el-table-column prop="node" label="审批节点" width="150"/><el-table-column prop="who" label="处理人" width="120"/>
              <el-table-column label="结果" width="110"><template #default="{row}"><el-tag size="small" :type="({同意:'success',提交:'primary',待审批:'warning',等待:'info',草稿保存:'info'})[row.result]||'info'">{{ row.result }}</el-tag></template></el-table-column>
              <el-table-column prop="time" label="时间" width="150"><template #default="{row}">{{ row.time || '-' }}</template></el-table-column>
            </el-table>
            <div style="margin-top:10px"><el-button size="small" link type="primary" @click="$go('/approvals')">前往审批中心</el-button></div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="操作日志" name="logs"><div class="card card-pad" style="padding:14px 18px">
          <el-table :data="logs" size="small"><el-table-column prop="time" label="时间" width="150"/><el-table-column prop="who" label="操作人" width="100"/><el-table-column prop="act" label="操作" width="130"/><el-table-column prop="detail" label="内容" min-width="280"/></el-table>
        </div></el-tab-pane>
      </el-tabs>
    </el-card>
    <el-dialog v-model="reasonDlg" :title="reasonMode==='reject' ? '驳回合同（原因必填）' : '撤销合同（原因必填）'" width="480px">
      <el-alert type="warning" show-icon :closable="false" style="margin-bottom:12px" :title="reasonMode==='reject' ? '驳回后合同状态变为「已驳回」，修改后可重新提交审批。' : '撤销后合同状态变为「已撤销」，可在合同台账查看历史记录。'"/>
      <el-input v-model="reasonRf.reason" type="textarea" :rows="3" placeholder="请填写原因（将写入审批记录与操作日志）"/>
      <template #footer><el-button @click="reasonDlg=false">取消</el-button><el-button type="danger" @click="doReason">确认</el-button></template>
    </el-dialog>
    <el-dialog v-model="chgDlg" title="合同变更申请（需重新审批）" width="520px">
      <el-alert type="warning" show-icon :closable="false" style="margin-bottom:12px" title="合同审批后修改金额、付款条件或补充协议，必须提交变更申请并重新审批；未审批通过前不覆盖原合同内容。"/>
      <el-form label-width="100px">
        <el-form-item label="变更类型"><el-select v-model="chgRf.type" style="width:100%"><el-option v-for="x in ['金额变更','付款条件变更','补充协议']" :key="x" :value="x"/></el-select></el-form-item>
        <el-form-item v-if="chgRf.type==='金额变更'" label="变更后金额"><el-input-number v-model="chgRf.amount" :min="0" :step="10000" :controls="false" style="width:100%"/></el-form-item>
        <el-form-item label="变更原因"><el-input v-model="chgRf.reason" type="textarea" :rows="3" placeholder="请填写变更原因（必填）"/></el-form-item>
      </el-form>
      <template #footer><el-button @click="chgDlg=false">取消</el-button><el-button type="primary" @click="doChange">提交变更审批</el-button></template>
    </el-dialog>
    <el-dialog v-model="termDlg" title="终止合同（原因必填）" width="480px">
      <el-alert type="warning" show-icon :closable="false" style="margin-bottom:12px" title="终止后合同进入终态「已终止」，未收回款与未完成订单保持原状且不可再推进。"/>
      <el-input v-model="termRf.reason" type="textarea" :rows="3" placeholder="请填写终止原因（将写入操作日志）"/>
      <template #footer><el-button @click="termDlg=false">取消</el-button><el-button type="danger" @click="doTerminate">确认终止</el-button></template>
    </el-dialog>
  </div>`,
};
registerRoute('/contract/:no', ContractDetailPage, 'contract-detail');
