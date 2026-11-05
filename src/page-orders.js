/* ===== 第 4 阶段：订单列表 /orders（真实数据）与订单详情 /order/:no ===== */
DOCS_DEFAULT['orders'] = mkDoc('orders', {
  name: '销售订单', module: '订单管理',
  goal: '承接合同签订后的执行环节：以合同为源头创建订单并进行金额上限校验，跟踪订单状态（待确认 → 备货中 → 交付中 → 已完成 / 已取消）、发货与开票信息，保证订单与合同、交付项目联动可追溯。',
  roles: ['销售：查看本人订单，可从合同新建订单、确认订单', '销售经理：查看团队订单并可流转状态', '交付 / 客服：查看发货与交付信息', '财务：查看开票信息（部分开票 / 已开票）'],
  enter: ['左侧导航：订单管理 → 订单管理', '合同详情「关联订单」Tab 中新建 / 查看', '客户详情「订单」Tab、商机详情关联订单链接'],
  layout: ['顶部：面包屑 + 页面标题 + 订单总数', '统计卡：订单总数、待确认、交付中、已完成、已取消（由列表数据实算）', '筛选区：关键词、客户、订单状态、开票状态', '表格：9 列 + 操作列（查看 / 推进 / 取消）', '分页：真实分页 10 / 20 / 50'],
  fields: [
    '订单编号｜文本｜只读｜格式：DD-年月-序号，全库唯一',
    '合同｜文本｜必填：是｜校验：必须为已签署 / 履约中 / 已完成合同',
    '客户｜文本｜只读｜说明：选合同后自动带出，不可修改',
    '金额｜货币｜必填：是｜校验：> 0 且 ≤ 该合同剩余可开单额（合同金额 - 未取消订单合计）',
    '状态｜枚举｜只读｜待确认 / 备货中 / 交付中 / 已完成 / 已取消',
    '开票状态｜枚举｜只读｜未开票 / 部分开票 / 已开票',
    '发货状态｜枚举｜只读｜未发货 / 已发货 / 已签收',
  ],
  rules: ['订单数据全部来自 store.ext.orders（真实分页），统计卡实时计算', '新建订单必须先选合同：客户自动带出；校验「同合同未取消订单金额合计 + 本单 ≤ 合同金额」，超出时给出明确错误并阻止保存', '取消订单必须填写原因并写操作日志；已取消订单不计入合同金额占用', '状态与操作日志实时写回 store'],
  flow: ['订单状态流转：待确认 → 确认订单 → 备货中 → 开始交付 → 交付中 → 确认完成 → 已完成', '取消：待确认 / 备货中 / 交付中可取消，必须填写原因，状态变为「已取消」', '已取消为终态，释放合同金额占用'],
  errors: ['未选合同直接保存：前端拦截提示', '订单金额超过合同剩余额度：明确提示“超出合同金额上限 ¥xx”并阻止保存', '取消未填原因：拦截并提示', '查询无结果：显示空态，可重置筛选'],
  api: ['订单分页查询、订单新建（含合同额度校验）接口、订单状态流转接口、开票信息查询（示例）'],
  accept: ['统计卡数字由全部订单数据实算而非写死', '新建订单超合同上限时能给出明确错误且不写入', '状态流转后列表 / 详情 / 日志即时更新，整页无控制台报错'],
  version: ['2026-11-02 · 张三 · 创建本页需求文档（原型版）'],
});
DOCS_DEFAULT['order-detail'] = mkDoc('order-detail', {
  name: '订单详情', module: '订单管理',
  goal: '展示单笔订单的明细、交付 / 发货状态、开票信息与关联单据，并作为订单状态流转与取消操作的落点页面，保证每一步状态变化实时写回数据并留痕。',
  roles: ['负责人销售：推进状态流转、取消订单', '销售经理：可流转与取消', '交付 / 客服：查看交付信息与关联交付项目', '财务：查看开票信息'],
  enter: ['订单列表点击订单编号或「查看」', '合同详情「关联订单」Tab、客户详情「订单」Tab 链接'],
  layout: ['头部：面包屑 + 订单编号 + 状态标签 + 状态流转按钮', 'Tab：订单明细 / 交付与发货 / 开票信息 / 关联合同与客户 / 关联交付项目 / 操作日志'],
  fields: [
    '订单编号 / 合同 / 客户 / 负责人｜文本｜只读',
    '订单金额｜货币｜只读｜说明：明细行小计之和',
    '明细行：产品 / 数量 / 单位 / 单价 / 折扣 / 小计｜只读',
    '发货状态 / 计划交付日期 / 收货地址｜只读',
    '开票状态 / 发票抬头 / 开票金额｜只读',
    '操作日志行：时间 / 操作人 / 操作 / 内容｜只读',
  ],
  rules: ['状态流转按钮按当前状态动态显示，操作后状态立即写回 store.ext.orders 并写日志', '取消必须填写原因（弹窗必填）后才执行', '订单明细行金额按 元 精确显示；开票金额按开票状态折算', '关联合同 / 客户 / 交付项目均可点击跳转'],
  flow: ['待确认 →（确认订单）→ 备货中 →（开始交付）→ 交付中 →（确认完成）→ 已完成', '待确认 / 备货中 / 交付中可「取消订单」：状态 → 已取消，原因必填并入日志', '已取消 / 已完成为终态'],
  errors: ['订单编号不存在：提示未找到数据并给出返回列表入口', '取消原因未填：前端拦截', '暂无交付项目 / 开票记录：显示空态提示而非报错'],
  api: ['订单详情查询、状态流转、取消（带原因）接口、交付项目与开票信息联动查询（示例）'],
  accept: ['头部状态正确并可流转；每步操作后状态、日志即时更新', '六个 Tab 内容与该订单自身数据一致，明细金额与订单金额一致', '无控制台报错'],
  version: ['2026-11-02 · 张三 · 创建本页需求文档（原型版）'],
});

/* --- 订单状态流转定义 --- */
const OD_FLOW = [
  { from: '待确认', act: '确认订单', to: '已确认', tip: '订单信息确认无误，进入已确认' },
  { from: '已确认', act: '确认待交付', to: '待交付', tip: '商品 / 服务准备就绪，进入待交付' },
  { from: '待交付', act: '开始交付', to: '交付中', tip: '开始向客户交付货物或服务' },
  { from: '交付中', act: '确认完成', to: '已完成', tip: '客户已签收 / 验收通过' },
];
const OD_STATUS_ALL = ['待确认', '已确认', '待交付', '交付中', '已完成', '已取消', '已关闭', '暂停执行'];
const OD_CANCELABLE = ['待确认', '已确认', '待交付'];
const OD_PAUSABLE = ['已确认', '待交付', '交付中'];
const OD_CLOSABLE = ['待确认', '已确认', '待交付', '交付中', '暂停执行'];
function odLog(no, act, detail) { store.ext.logs.unshift({ time: TODAY + ' 1' + ((store.ext.logs.length % 7) + 1) + ':' + ((store.ext.logs.length * 13 % 50) + 9), who: '张三', module: '订单', act, detail: detail + '（订单：' + no + '）' }); }
function odShipOf(status) {
  if (status === '已完成') return '已签收';
  if (status === '交付中') return '已发货';
  return '未发货';
}
function odTransit(od, act) {
  const step = OD_FLOW.find(f => f.from === od.status && f.act === act);
  if (!step) return false;
  od.status = step.to;
  od.shipStatus = odShipOf(od.status);
  odLog(od.no, act, '状态由「' + step.from + '」变更为「' + step.to + '」');
  return true;
}
/* 合同剩余可开单额度：合同金额 - 关联未取消订单合计 */
const odCapOf = ct => Math.max(0, (ct.amount || 0) - store.ext.orders.filter(o => o.contract === ct.no && o.status !== '已取消').reduce((s, o) => s + (o.amount || 0), 0));

const OrdersPage = {
  components: { ListPage },
  setup() {
    const totalText = computed(() => '销售订单共 ' + store.ext.orders.length + ' 笔');
    const stats = computed(() => {
      const a = store.ext.orders || [];
      return [
        ['订单总数', String(a.length), ''],
        ['待处理', String(a.filter(o => ['待确认', '已确认', '待交付'].includes(o.status)).length), 'warn'],
        ['交付中', String(a.filter(o => o.status === '交付中').length), 'ok'],
        ['已完成', String(a.filter(o => o.status === '已完成').length), 'ok'],
        ['异常', String(a.filter(o => ['已取消', '已关闭', '暂停执行'].includes(o.status)).length), 'danger'],
      ];
    });
    const rows = computed(() => AUTH.authFilter(store.ext.orders));
    const cols = [
      { p: 'no', l: '订单编号', w: 150, link: true }, { p: 'customer', l: '客户', w: 200, link: 'cust' }, { p: 'contract', l: '合同', w: 160, link: true },
      { p: 'opp', l: '商机', w: 150, link: true }, { p: 'amount', l: '订单金额', w: 130, money: true }, { p: 'date', l: '订单日期', w: 110 }, { p: 'dlv', l: '交付日期', w: 110 },
      { p: 'owner', l: '负责人', w: 90 }, { p: 'status', l: '订单状态', w: 100, tag: { 待确认: 'info', 已确认: 'warning', 待交付: 'warning', 交付中: 'primary', 已完成: 'success', 已取消: 'danger', 已关闭: 'info', 暂停执行: 'danger' } },
      { p: 'invoiceStatus', l: '开票状态', w: 100, tag: { 未开票: 'info', 部分开票: 'warning', 已开票: 'success' } },
    ];
    const filters = computed(() => [
      { k: 'kw', label: '搜索订单', ph: '订单编号 / 客户 / 合同' }, { k: 'status', label: '订单状态', opts: OD_STATUS_ALL },
      { k: 'invoiceStatus', label: '开票状态', opts: ['未开票', '部分开票', '已开票'] },
    ]);
    const onLink = (c, row) => (c.p === 'contract' && row.contract ? go('/contract/' + row.contract) : (c.p === 'opp' && row.opp ? go('/opp/' + row.opp) : go('/order/' + row.no)));
    const transit = row => { const step = OD_FLOW.find(f => f.from === row.status); if (!step) return ElMessage.info('当前状态「' + row.status + '」不可推进'); odTransit(row, step.act); ElMessage.success('已' + step.act + '（' + step.tip + '），状态与日志已更新'); };
    const cancel = row => ElMessageBox.prompt('取消后订单进入「已取消」终态，可释放该合同的金额占用。请填写取消原因（必填）：', '取消订单 ' + row.no, { confirmButtonText: '确认取消', cancelButtonText: '返回', inputPattern: /\S+/, inputErrorMessage: '取消原因不能为空' })
      .then(({ value }) => { row.status = '已取消'; row.shipStatus = '未发货'; odLog(row.no, '取消', '取消原因：' + value + '；合同金额占用已释放'); ElMessage.success('订单已取消，原因已记录'); }).catch(() => {});
    /* ---- 新建订单弹窗 ---- */
    const fref = ref(null);
    const dlg = ref(false);
    const draft = reactive({ contract: '', amount: null, date: TODAY, dlv: '', owner: '张三' });
    const rule = { contract: [{ required: true, message: '请选择合同', trigger: 'change' }], amount: [{ required: true, message: '请填写订单金额', trigger: 'blur' }] };
    const ctOpts = computed(() => store.ext.contracts.filter(ct => ['审批通过', '待签署', '生效', '履约中', '已完成'].includes(ct.status)));
    const selCt = computed(() => store.ext.contracts.find(ct => ct.no === draft.contract) || null);
    const cap = computed(() => selCt.value ? odCapOf(selCt.value) : 0);
    /* 订单默认明细：优先复用合同报价明细，否则单行合同标的 */
    const defaultItems = ct => {
      const q = ct.quote ? store.ext.quotes.find(x => x.no === ct.quote) : null;
      if (q && q.items && q.items.length) return q.items.map(it => ({ ...it }));
      return [{ productNo: '', name: '合同标的（' + (ct.type || '产品 / 服务') + '）', qty: 1, unit: '项', price: ct.amount || 0, discount: 100 }];
    };
    const save = () => fref.value.validate(ok => {
      if (!ok) return;
      const ct = selCt.value;
      if (!ct) return ElMessage.warning('请先选择合同，客户将自动带出');
      const amo = draft.amount || 0;
      if (amo <= 0) return ElMessage.warning('订单金额必须大于 0');
      if (amo > odCapOf(ct)) return ElMessage.error('保存失败：订单金额 ¥' + fmtY(amo) + ' 超出该合同剩余可开单额度 ¥' + fmtY(odCapOf(ct)) + '（合同金额 ¥' + fmtY(ct.amount) + ' 减去已下订单合计），请调整金额');
      const base = 'DD-' + TODAY.slice(0, 7).replace('-', '') + '-';
      const already = new Set(store.ext.orders.map(o => o.no));
      let seq = 100 + store.ext.orders.filter(o => o.no.startsWith(base)).length;
      let no; do { no = base + String(seq++).padStart(4, '0'); } while (already.has(no));
      store.ext.orders.unshift({
        no, customer: ct.customer, contract: ct.no, opp: ct.opp || '', amount: amo, date: draft.date, dlv: draft.dlv || extAddDays(draft.date, 30),
        owner: draft.owner, status: '待确认', items: defaultItems(ct), invoiceStatus: '未开票', shipStatus: '未发货',
        address: ((store.customers.find(c => c.name === ct.customer) || {}).region || '') + '某某产业园',
      });
      odLog(no, '新建', '从合同 ' + ct.no + ' 新建订单（客户：' + ct.customer + '，金额：¥' + fmtY(amo) + '，明细 ' + (defaultItems(ct).length) + ' 行）');
      ctLog(ct.no, '新增订单', '关联合同新增订单 ' + no + '（金额：¥' + fmtY(amo) + '）');
      dlg.value = false; ElMessage.success('订单已创建，可在详情页推进状态');
      go('/order/' + no);
    });
    return { totalText, stats, cols, filters, store, dlg, fref, draft, rule, ctOpts, selCt, cap, save, onLink, transit, cancel, fmtY };
  },
  template: `<div>
    <list-page :crumbs="['订单管理','销售订单']" title="销售订单" :total-text="totalText" :stats="stats" :filters="filters" :rows="rows" :cols="cols" :action-width="200" note-tag="真实数据 · 点击订单编号进入详情"
      @link="onLink">
      <template #ops>
        <el-button type="primary" icon="Plus" @click="dlg=true">新建订单</el-button>
        <el-button icon="Download" @click="$msg.info('示例：导出订单')">导出</el-button>
      </template>
      <template #actions="{row}">
        <el-button link type="primary" @click="$go('/order/'+row.no)">查看</el-button>
        <el-button v-if="['待确认','已确认','待交付','交付中'].includes(row.status)" link type="primary" @click="transit(row)">{{ ({'待确认':'确认订单','已确认':'确认待交付','待交付':'开始交付','交付中':'确认完成'})[row.status] }}</el-button>
        <el-button v-if="['待确认','已确认','待交付'].includes(row.status)" link type="danger" @click="cancel(row)">取消</el-button>
      </template>
    </list-page>
    <el-dialog v-model="dlg" title="新建订单（从合同发起）" width="640px">
      <el-form ref="fref" :model="draft" :rules="rule" label-width="110px">
        <el-form-item label="关联合同" prop="contract">
          <el-select v-model="draft.contract" filterable placeholder="选择审批通过 / 待签署 / 生效 / 履约中 / 已完成的合同" style="width:100%">
            <el-option v-for="c in ctOpts" :key="c.no" :label="c.no + ' · ' + c.name" :value="c.no"/>
          </el-select>
        </el-form-item>
        <el-form-item label="客户"><el-input :model-value="selCt ? selCt.customer : ''" disabled placeholder="选合同后自动带出"/></el-form-item>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="订单金额" prop="amount"><el-input-number v-model="draft.amount" :min="0" :step="10000" :controls="false" placeholder="元" style="width:100%"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="负责人"><el-select v-model="draft.owner" style="width:100%"><el-option v-for="o in OWNERS" :key="o" :value="o"/></el-select></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="订单日期"><el-date-picker v-model="draft.date" type="date" value-format="YYYY-MM-DD" style="width:100%"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="计划交付日期"><el-date-picker v-model="draft.dlv" type="date" value-format="YYYY-MM-DD" placeholder="默认 30 天后" style="width:100%"/></el-form-item></el-col>
        </el-row>
      </el-form>
      <el-alert v-if="selCt" type="info" show-icon :closable="false" style="margin-bottom:8px"
        :title="'合同金额 ¥' + fmtY(selCt.amount) + ' · 已下订单合计（未取消）¥' + fmtY(selCt.amount - cap) + ' · 剩余可开单 ¥' + fmtY(cap)"/>
      <el-alert type="warning" show-icon :closable="false" title="校验规则：同一合同下「未取消订单金额合计 + 本单」不得超过合同金额；超出将无法保存。"/>
      <template #footer><el-button @click="dlg=false">取消</el-button><el-button type="primary" @click="save">保存为待确认订单</el-button></template>
    </el-dialog>
  </div>`,
};
registerRoute('/orders', OrdersPage, 'orders');

/* ===== 订单详情 /order/:no ===== */
const OrderDetailPage = {
  components: { PageHead },
  props: { no: String },
  setup(props) {
    const od = computed(() => store.ext.orders.find(x => x.no === props.no) || null);
    const tab = ref('info');
    const custNo = computed(() => cno((od.value || {}).customer || ''));
    const ct = computed(() => od.value ? store.ext.contracts.find(c => c.no === od.value.contract) || null : null);
    const opp = computed(() => (od.value && od.value.opp) ? store.opps.find(o => o.no === od.value.opp) || null : null);
    const items = computed(() => (od.value ? od.value.items || [] : []).map((it, i) => ({ ...it, seq: i + 1, sub: Math.round((it.price || 0) * (it.qty || 1) * ((it.discount == null ? 100 : it.discount)) / 100) })));
    const deliveryOf = computed(() => od.value ? store.ext.deliveries.filter(d => d.order === od.value.no) : []);
    const planRows = computed(() => {
      const o = od.value, c = ct.value; if (!o || !c) return []; let n = 1;
      return (c.plans || []).map(p => {
        const got = ctRecvOf(c, p);
        return { seq: n++, stage: p.stage, date: p.date, amount: p.amount, got, rest: Math.max(0, p.amount - got), status: p.status };
      });
    });
    const paySum = computed(() => ({ got: planRows.value.reduce((s, r) => s + r.got, 0), rest: planRows.value.reduce((s, r) => s + r.rest, 0) }));
    const changes = computed(() => (od.value && od.value.changes) || []);
    const invoiceAmt = computed(() => {
      if (!od.value) return 0;
      if (od.value.invoiceStatus === '已开票') return od.value.amount;
      if (od.value.invoiceStatus === '部分开票') return od.value.amount / 2;
      return 0;
    });
    const logs = computed(() => {
      const o = od.value; if (!o) return []; const base = [
        { time: o.date + ' 09:00', who: o.owner, act: '创建订单', detail: '从合同 ' + o.contract + ' 新建订单（金额：¥' + fmtY(o.amount) + '）' },
        { time: o.date + ' 10:30', who: '系统', act: '开票状态', detail: '开票状态初始化：' + o.invoiceStatus + '；发货状态：' + o.shipStatus },
      ];
      store.ext.logs.filter(x => x.module === '订单' && x.detail.includes(o.no)).forEach(x => base.push({ time: x.time, who: x.who, act: x.act, detail: x.detail }));
      return base.sort((a, b) => (a.time < b.time ? 1 : -1));
    });
    const buttons = computed(() => {
      const o = od.value; if (!o) return [];
      const b = [];
      const step = OD_FLOW.find(f => f.from === o.status);
      if (step) b.push({ act: step.act, type: 'primary', label: step.act, tip: step.tip });
      if (OD_PAUSABLE.includes(o.status)) b.push({ act: 'pause', type: 'warning', plain: true, label: '暂停执行' });
      if (o.status === '暂停执行') b.push({ act: 'resume', type: 'primary', plain: true, label: '恢复执行' });
      if (OD_CANCELABLE.includes(o.status)) b.push({ act: 'cancel', type: 'danger', plain: true, label: '取消订单' });
      if (OD_CLOSABLE.includes(o.status)) b.push({ act: 'close', type: 'danger', plain: true, label: '关闭订单' });
      return b;
    });
    const doAct = b => {
      if (['cancel', 'pause', 'close'].includes(b.act)) { cfRf.mode = b.act; cfRf.reason = ''; cfDlg.value = true; return; }
      if (b.act === 'resume') { od.value.status = '待交付'; od.value.shipStatus = '未发货'; odLog(od.value.no, '恢复执行', '订单由「暂停执行」恢复为「待交付」'); ElMessage.success('订单已恢复执行'); return; }
      if (odTransit(od.value, b.act)) ElMessage.success('已' + b.act + '（' + b.tip + '），状态与操作日志已更新');
      else ElMessage.info('当前状态不可执行该操作');
    };
    const cfDlg = ref(false); const cfRf = reactive({ reason: '', mode: 'cancel' });
    const cfTitle = computed(() => cfRf.mode === 'cancel' ? '取消订单（原因必填）' : (cfRf.mode === 'pause' ? '暂停执行（原因必填）' : '关闭订单（原因必填）'));
    const doCancel = () => {
      const v = cfRf.reason.trim();
      if (!v) return ElMessage.warning('请填写原因（必填）');
      const map = { cancel: ['已取消', '取消'], pause: ['暂停执行', '暂停执行'], close: ['已关闭', '关闭'] };
      const m = map[cfRf.mode];
      od.value.status = m[0];
      od.value.shipStatus = '未发货';
      odLog(od.value.no, m[1], '原因：' + v + '；状态变更为「' + m[0] + '」' + (cfRf.mode === 'cancel' ? '，合同金额占用已释放' : ''));
      cfDlg.value = false;
      ElMessage.success('订单已' + m[1] + '，原因已写入操作日志');
    };
    const chgDlg = ref(false); const chgRf = reactive({ type: '交付日期变更', reason: '', date: '', amount: 0 });
    const doChange = () => {
      const v = chgRf.reason.trim();
      if (!v) return ElMessage.warning('请填写变更原因（必填）');
      const o = od.value;
      if (!o.changes) o.changes = [];
      o.changes.unshift({ time: TODAY + ' 16:20', type: chgRf.type, reason: v, before: chgRf.type === '订单金额变更' ? o.amount : o.dlv, after: chgRf.type === '订单金额变更' ? chgRf.amount : (chgRf.date || o.dlv), status: '已登记', who: '张三' });
      odLog(o.no, '订单变更', chgRf.type + '：' + v + '；变更已登记并留痕');
      chgDlg.value = false;
      ElMessage.success('订单变更已登记，可在「订单变更」页签查看');
    };
    return { od, tab, custNo, ct, opp, items, deliveryOf, planRows, paySum, changes, invoiceAmt, logs, buttons, doAct, cfDlg, cfRf, cfTitle, doCancel, chgDlg, chgRf, doChange, fmtY, fmtC, OD_FLOW };
  },
  template: `<div v-if="od">
    <el-breadcrumb separator="/" class="crumb"><el-breadcrumb-item><a @click="$go('/orders')">订单管理</a></el-breadcrumb-item><el-breadcrumb-item><a @click="$go('/orders')">销售订单</a></el-breadcrumb-item><el-breadcrumb-item>{{ od.no }}</el-breadcrumb-item></el-breadcrumb>
    <div class="page-head"><h1>订单 {{ od.no }}</h1><el-tag :type="({待确认:'info',已确认:'warning',待交付:'warning',交付中:'primary',已完成:'success',已取消:'danger',已关闭:'info',暂停执行:'danger'})[od.status]||'info'">{{ od.status }}</el-tag><span class="total">订单金额 ¥{{ fmtY(od.amount) }} · 负责人 {{ od.owner }}</span></div>
    <div class="ops" style="margin-top:-4px">
      <el-button v-for="b in buttons" :key="b.act" :type="b.type" :plain="!!b.plain" @click="doAct(b)">{{ b.label }}</el-button>
      <el-button icon="Printer" @click="$msg.info('示例：打印销售订单')">打印</el-button>
    </div>
    <el-alert v-if="od.status==='已取消'" type="error" show-icon :closable="false" style="margin-bottom:12px" title="该订单已取消：仅可查看历史数据，取消原因见「操作日志」。"/>
    <el-alert v-if="od.status==='已关闭'" type="info" show-icon :closable="false" style="margin-bottom:12px" title="该订单已关闭：仅可查看历史数据，关闭原因见「操作日志」。"/>
    <el-alert v-if="od.status==='暂停执行'" type="warning" show-icon :closable="false" style="margin-bottom:12px" title="该订单已暂停执行：恢复后进入「待交付」；暂停原因见「操作日志」。"/>
    <el-alert v-if="!ct" type="warning" show-icon :closable="false" style="margin-bottom:12px" title="该订单关联合同在合同台账中查不到（历史数据），合同相关字段展示为空。"/>
    <el-card shadow="never" style="margin-bottom:14px" :body-style="{padding:'0'}">
      <el-tabs v-model="tab">
        <el-tab-pane label="基本信息" name="info"><div class="card card-pad" style="padding:14px 18px">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="订单编号">{{ od.no }}</el-descriptions-item>
            <el-descriptions-item label="客户"><a class="link" @click="$go('/customer/'+custNo)">{{ od.customer }}</a></el-descriptions-item>
            <el-descriptions-item label="关联合同"><a v-if="ct" class="link" @click="$go('/contract/'+ct.no)">{{ ct.no }}</a><span v-else>{{ od.contract || '-' }}</span></el-descriptions-item>
            <el-descriptions-item label="关联商机"><a v-if="opp" class="link" @click="$go('/opp/'+opp.no)">{{ opp.no }} · {{ opp.name }}</a><span v-else>{{ od.opp || '-' }}</span></el-descriptions-item>
            <el-descriptions-item label="订单金额"><span class="money">¥{{ fmtY(od.amount) }}</span></el-descriptions-item>
            <el-descriptions-item label="负责人">{{ od.owner }}</el-descriptions-item>
            <el-descriptions-item label="订单日期">{{ od.date }}</el-descriptions-item>
            <el-descriptions-item label="交付日期">{{ od.dlv }}</el-descriptions-item>
            <el-descriptions-item label="订单状态">{{ od.status }}</el-descriptions-item>
            <el-descriptions-item label="订单明细">{{ items.length }} 行</el-descriptions-item>
            <el-descriptions-item label="开票状态">{{ od.invoiceStatus }}</el-descriptions-item>
            <el-descriptions-item label="发货状态">{{ od.shipStatus }}</el-descriptions-item>
          </el-descriptions>
          <div style="margin-top:12px"><el-button size="small" type="primary" plain @click="chgRf.type='交付日期变更';chgRf.reason='';chgRf.date=od.dlv;chgDlg=true">登记订单变更</el-button></div>
        </div></el-tab-pane>
        <el-tab-pane label="订单明细" name="items"><div class="card card-pad" style="padding:14px 18px">
          <el-table :data="items" size="small" border show-summary :summary-method="() => ['','合计 ' + items.length + ' 行','','','','','¥' + fmtY(items.reduce((s,i)=>s+i.sub,0))]">
            <el-table-column prop="seq" label="行" width="50"/>
            <el-table-column label="产品 / 服务" min-width="180"><template #default="{row}">{{ row.name || row.productNo || '-' }}</template></el-table-column>
            <el-table-column label="数量" width="70" align="right"><template #default="{row}">{{ row.qty || 1 }}</template></el-table-column>
            <el-table-column prop="unit" label="单位" width="80"/>
            <el-table-column label="单价" width="110" align="right"><template #default="{row}"><span class="money">¥{{ fmtY(row.price) }}</span></template></el-table-column>
            <el-table-column label="折扣" width="70" align="center"><template #default="{row}">{{ (row.discount==null?100:row.discount) }}%</template></el-table-column>
            <el-table-column label="小计" width="130" align="right"><template #default="{row}"><span class="money"><b>¥{{ fmtY(row.sub) }}</b></span></template></el-table-column>
          </el-table>
          <el-descriptions :column="2" border style="margin-top:12px">
            <el-descriptions-item label="订单金额"><span class="money">¥{{ fmtY(od.amount) }}</span></el-descriptions-item>
            <el-descriptions-item label="明细合计"><span class="money">¥{{ fmtY(items.reduce((s,i)=>s+i.sub,0)) }}</span></el-descriptions-item>
          </el-descriptions>
        </div></el-tab-pane>
        <el-tab-pane label="交付与发货" name="delivery"><div class="card card-pad" style="padding:14px 18px">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="发货状态"><el-tag size="small" :type="({未发货:'info',已发货:'primary',已签收:'success'})[od.shipStatus]||'info'">{{ od.shipStatus }}</el-tag></el-descriptions-item>
            <el-descriptions-item label="计划交付日期">{{ od.dlv }}</el-descriptions-item>
            <el-descriptions-item label="收货地址">{{ od.address || '-' }}</el-descriptions-item>
            <el-descriptions-item label="订单日期">{{ od.date }}</el-descriptions-item>
          </el-descriptions>
          <div class="card-title" style="margin-top:14px">关联交付项目</div>
          <el-alert v-if="!deliveryOf.length" type="info" show-icon :closable="false" title="该订单暂无交付项目；交付管理可按订单新建项目。"/>
          <el-table v-else :data="deliveryOf" size="small" border>
            <el-table-column prop="no" label="项目编号" width="150"><template #default="{row}"><a class="link" @click="$go('/delivery')">{{ row.no }}</a></template></el-table-column>
            <el-table-column prop="name" label="项目名称" min-width="180"/>
            <el-table-column prop="pm" label="项目经理" width="100"/>
            <el-table-column prop="planStart" label="计划开始" width="110"/><el-table-column prop="planEnd" label="计划完成" width="110"/>
            <el-table-column label="进度" width="150"><template #default="{row}"><el-progress :percentage="row.progress" :stroke-width="8" :status="row.progress===100?'success':''"/></el-table-column>
            <el-table-column label="状态" width="100"><template #default="{row}"><el-tag size="small" :type="({未开始:'info',实施中:'primary',验收中:'warning',已完成:'success'})[row.status]||'info'">{{ row.status }}</el-tag></template></el-table-column>
          </el-table>
        </div></el-tab-pane>
        <el-tab-pane label="开票信息" name="invoice"><div class="card card-pad" style="padding:14px 18px">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="开票状态"><el-tag size="small" :type="({未开票:'info',部分开票:'warning',已开票:'success'})[od.invoiceStatus]||'info'">{{ od.invoiceStatus }}</el-tag></el-descriptions-item>
            <el-descriptions-item label="发票抬头">{{ od.customer }}</el-descriptions-item>
            <el-descriptions-item label="开票金额"><span class="money">¥{{ fmtY(invoiceAmt) }}</span></el-descriptions-item>
            <el-descriptions-item label="未开票金额"><span class="money">¥{{ fmtY(od.amount - invoiceAmt) }}</span></el-descriptions-item>
            <el-descriptions-item label="开票类型">增值税专用发票（13%）</el-descriptions-item>
            <el-descriptions-item label="开票记录">由财务在开票登记后自动写入（原型仅展示）</el-descriptions-item>
          </el-descriptions>
          <div style="margin-top:12px"><el-button size="small" type="primary" plain @click="$msg.success('已提交开票申请，将由财务复核（示例）')">申请开票</el-button></div>
        </div></el-tab-pane>
        <el-tab-pane label="关联合同与客户" name="source"><div class="card card-pad" style="padding:14px 18px">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="关联合同"><a v-if="ct" class="link" @click="$go('/contract/'+ct.no)">{{ ct.no + ' · ' + ct.name }}</a><span v-else>-</span></el-descriptions-item>
            <el-descriptions-item v-if="ct" label="合同金额"><span class="money">¥{{ fmtY(ct.amount) }}</span></el-descriptions-item>
            <el-descriptions-item v-if="ct" label="合同状态"><el-tag size="small">{{ ct.status }}</el-tag></el-descriptions-item>
            <el-descriptions-item label="客户"><a class="link" @click="$go('/customer/'+custNo)">{{ od.customer }}</a></el-descriptions-item>
          </el-descriptions>
          <div style="margin-top:12px"><el-button size="small" @click="$go('/contract/'+od.contract)">查看合同详情</el-button></div>
        </div></el-tab-pane>
        <el-tab-pane label="回款计划" name="plans"><div class="card card-pad" style="padding:14px 18px">
          <el-alert v-if="!ct" type="info" show-icon :closable="false" title="该订单未关联有效合同，暂无回款计划；回款计划以合同付款条件为准。"/>
          <template v-else>
            <div class="stat-row" style="grid-template-columns:repeat(3,1fr);margin-bottom:10px">
              <div class="stat-card"><span class="lb">已收金额</span><span class="vl">¥{{ fmtY(paySum.got) }}</span><span class="ft">含部分核销</span></div>
              <div class="stat-card warn"><span class="lb">待收金额</span><span class="vl">¥{{ fmtY(paySum.rest) }}</span><span class="ft">合同计划总额 ¥{{ fmtY(ct.amount) }}</span></div>
              <div class="stat-card ok"><span class="lb">回款完成度</span><span class="vl">{{ ct.amount ? Math.round(paySum.got*100/ct.amount) : 0 }}%</span><span class="ft">已收 / 合同金额</span></div>
            </div>
            <el-table :data="planRows" size="small" border>
              <el-table-column prop="seq" label="期次" width="60"/><el-table-column prop="stage" label="款项阶段" min-width="110"/><el-table-column prop="date" label="计划日期" width="110"/>
              <el-table-column label="计划金额" width="120" align="right"><template #default="{row}">¥{{ fmtY(row.amount) }}</template></el-table-column>
              <el-table-column label="已收" width="120" align="right"><template #default="{row}">¥{{ fmtY(row.got) }}</template></el-table-column>
              <el-table-column label="待收" width="120" align="right"><template #default="{row}">¥{{ fmtY(row.rest) }}</template></el-table-column>
              <el-table-column prop="status" label="状态" width="110"><template #default="{row}"><el-tag size="small" :type="({已回款:'success',部分回款:'warning',未回款:'info'})[row.status]||'info'">{{ row.status }}</el-tag></template></el-table-column>
            </el-table>
            <div style="margin-top:12px"><el-button size="small" type="primary" plain @click="$go('/payments')">前往回款管理登记收款</el-button></div>
          </template>
        </div></el-tab-pane>
        <el-tab-pane label="订单变更" name="changes"><div class="card card-pad" style="padding:14px 18px">
          <div class="ops"><el-button size="small" type="primary" plain @click="chgRf.type='交付日期变更';chgRf.reason='';chgRf.date=od.dlv;chgDlg=true">登记变更</el-button></div>
          <el-alert v-if="!changes.length" type="info" show-icon :closable="false" title="暂无订单变更记录；交付日期、金额等变更需登记原因并保留历史。"/>
          <el-table v-else :data="changes" size="small" border>
            <el-table-column prop="time" label="登记时间" width="150"/><el-table-column prop="type" label="变更类型" width="130"/><el-table-column prop="reason" label="变更原因" min-width="220"/>
            <el-table-column label="变更前 → 变更后" min-width="220"><template #default="{row}">{{ row.before }} → {{ row.after }}</template></el-table-column>
            <el-table-column prop="status" label="状态" width="100"/><el-table-column prop="who" label="操作人" width="90"/>
          </el-table>
        </div></el-tab-pane>
        <el-tab-pane label="操作日志" name="logs"><div class="card card-pad" style="padding:14px 18px">
          <el-table :data="logs" size="small"><el-table-column prop="time" label="时间" width="150"/><el-table-column prop="who" label="操作人" width="100"/><el-table-column prop="act" label="操作" width="130"/><el-table-column prop="detail" label="内容" min-width="280"/></el-table>
        </div></el-tab-pane>
      </el-tabs>
    </el-card>
    <el-dialog v-model="cfDlg" :title="cfTitle" width="480px">
      <el-alert type="warning" show-icon :closable="false" style="margin-bottom:12px" :title="cfRf.mode==='cancel' ? '取消后订单进入终态「已取消」，并释放该合同的金额占用。' : (cfRf.mode==='pause' ? '暂停后订单进入「暂停执行」，恢复后回到「待交付」。' : '关闭后订单进入终态「已关闭」，仅保留历史记录。')"/>
      <el-input v-model="cfRf.reason" type="textarea" :rows="3" placeholder="请填写原因（将写入操作日志）"/>
      <template #footer><el-button @click="cfDlg=false">返回</el-button><el-button type="danger" @click="doCancel">确认</el-button></template>
    </el-dialog>
    <el-dialog v-model="chgDlg" title="登记订单变更（留痕）" width="500px">
      <el-alert type="info" show-icon :closable="false" style="margin-bottom:12px" title="订单交付日期、金额或明细变更需登记原因并保留历史；订单变更不得绕过合同额度校验。"/>
      <el-form label-width="100px">
        <el-form-item label="变更类型"><el-select v-model="chgRf.type" style="width:100%"><el-option v-for="x in ['交付日期变更','订单金额变更','订单明细变更']" :key="x" :value="x"/></el-select></el-form-item>
        <el-form-item v-if="chgRf.type==='交付日期变更'" label="变更后日期"><el-date-picker v-model="chgRf.date" type="date" value-format="YYYY-MM-DD" style="width:100%"/></el-form-item>
        <el-form-item v-if="chgRf.type==='订单金额变更'" label="变更后金额"><el-input-number v-model="chgRf.amount" :min="0" :step="10000" :controls="false" style="width:100%"/></el-form-item>
        <el-form-item label="变更原因"><el-input v-model="chgRf.reason" type="textarea" :rows="3" placeholder="请填写变更原因（必填）"/></el-form-item>
      </el-form>
      <template #footer><el-button @click="chgDlg=false">取消</el-button><el-button type="primary" @click="doChange">确认登记</el-button></template>
    </el-dialog>
  </div>`,
};
registerRoute('/order/:no', OrderDetailPage, 'order-detail');
