/* ===== 第 5 阶段：服务工单 /service（列表 + SLA 超时标红）与工单详情 /ticket/:no（状态流转 + 处理记录） ===== */
/* 状态枚举与流程按规划方案 5.12：待受理 → 待分派 → 处理中 → 待客户确认 → 已解决 → 已关闭；客户退回 → 已退回 */
DOCS_DEFAULT['service'] = mkDoc('service', {
  name: '服务工单', module: '服务管理',
  goal: '集中受理客户故障报修、服务请求、咨询与投诉：按类型 / 问题等级 / 状态 / 处理人筛选，以 SLA 时限驱动处理速度（超时标红预警），客服与技术可新建工单并全程留痕，保障服务质量可考核。',
  roles: ['交付 / 客服：受理、指派、处理、评价、关闭工单', '销售经理：查看名下客户工单与 SLA 达成情况', '管理员：全量数据与 SLA 规则配置'],
  enter: ['左侧导航：服务管理 → 服务工单', '客户详情「服务」Tab、交付项目详情关联跳转'],
  layout: ['顶部：面包屑 + 页面标题 + 工单总数', '统计卡：工单总数、待受理、处理中、SLA 超时、待客户确认（由数据实算）', '筛选区：关键词 / 工单类型 / 问题等级 / 状态 / 处理人', '表格：编号、客户、类型、问题等级、问题描述、提交时间、处理人、状态、解决时间、满意度、SLA 列（超时标红）', '新建工单弹窗'],
  fields: [
    '工单编号｜文本｜只读｜格式：GD-年月-序号',
    '工单类型｜枚举｜必填：是｜说明：故障报修 / 服务请求 / 咨询 / 投诉',
    '客户 / 联系人｜选择｜必填：是｜联系人选项随客户联动',
    '问题等级｜枚举｜必填：是｜校验：必须为字典项｜说明：紧急(2h) / 高(4h) / 中(24h) / 低(48h) 决定 SLA 时限',
    '问题描述｜长文本｜必填：是',
    '处理人｜人员｜说明：指派后写入，可转派并留记录',
    'SLA 截止时间｜时间｜系统按问题等级自动计算',
    '解决时间｜时间｜只读｜说明：客户解决确认时记录',
    '满意度｜整数｜只读｜说明：1-5 星，客户评价后记录',
    '当前状态｜枚举｜说明：待受理 / 待分派 / 处理中 / 待客户确认 / 已解决 / 已关闭 / 已退回'],
  rules: ['列表数据来自 store.ext.tickets，真分页，统计卡由数据实算', 'SLA 超时规则：未关闭 / 未解决且当前时间已过 SLA 截止时间的工单，SLA 列标红', '新建工单默认状态「待受理」，处理人留空，由客服先受理再指派，不允许新建时直接指派绕过受理环节', '每次状态流转都要写入处理记录（时间 / 操作人 / 动作 / 说明）', '「关闭（客户评价）」必须选择满意度（1-5 星），不评价不得关闭'],
  flow: ['工单流程：客户提交 → 客服受理 → 指派处理人 → 问题处理 → 解决确认 → 客户评价 → 工单关闭', '状态流转：待受理 →（受理）→ 待分派 →（指派处理人）→ 处理中 →（填处理说明）→ 待客户确认 →（解决确认，记解决时间）→ 已解决 →（客户评价记满意度）→ 已关闭', '客户反馈未彻底解决：待客户确认 / 已解决 / 已关闭 →（重新打开）→ 已退回，原因必填；已退回只能处理后再提交确认', '处理中可转派他人并写转派记录'],
  errors: ['新建未选客户或未填描述：必填校验拦截', 'SLA 超时后工单仍可处理，但页面持续红色预警', '工单重复提交：正式版需提示相似工单并允许关联已有工单（原型未实现识别）', '投诉级别升级：正式版按问题等级通知主管与相关负责人（原型未实现自动升级）', '筛选无结果：空态可重置'],
  api: ['工单分页查询、新建工单（含 SLA 计算）、受理 / 指派 / 转派 / 处理 / 解决确认 / 评价关闭接口、处理记录与相似工单查询（示例）'],
  accept: ['统计卡数字由数据实算', 'SLA 超时工单在列表标红', '新建工单写入 store.ext.tickets 并出现在详情与列表', '完整走过一条「提交 → 受理 → 指派 → 处理 → 解决确认 → 评价关闭」链路后，状态、解决时间、满意度与处理记录串联合理', '无控制台报错'],
});
DOCS_DEFAULT['ticket-detail'] = mkDoc('ticket-detail', {
  name: '工单详情', module: '服务管理',
  goal: '呈现单个服务工单的完整处理过程：问题等级 / 状态 / SLA 剩余或超时预警、客户与联系人信息、问题描述、图片附件与处理记录时间线；支持受理、指派处理人、转派、处理（→待客户确认）、解决确认（记解决时间）、客户评价并关闭（记满意度）与退回，每一步操作都真实改变状态并写入处理记录。',
  roles: ['交付 / 客服：受理、指派、处理、转派、退回', '客户确认与评价（由客服代录入结果）：解决确认与评价关闭', '销售经理：跟进客户服务满意度与 SLA 达成', '管理员：全量'],
  enter: ['服务工单列表点击工单编号', '客户详情 / 交付项目详情的工单链接'],
  layout: ['头部：面包屑 + 工单号 + 类型 / 问题等级 / 状态标签 + SLA 剩余或超时提示 + 操作按钮组', '左列：问题描述卡（含图片附件占位与解决方案摘要）+ 处理记录时间线', '右列：SLA 与工单信息卡（类型 / 问题等级 / 处理人 / SLA 截止 / 解决时间 / 满意度）+ 客户与联系人卡'],
  fields: ['工单编号 / 类型 / 状态 / 处理人｜只读（指派与转派会更新处理人）', '问题等级｜枚举｜说明：紧急(2h) / 高(4h) / 中(24h) / 低(48h)，影响 SLA 时限', 'SLA 截止时间｜时间｜系统按问题等级自动计算', '解决时间｜时间｜只读｜说明：客户解决确认时写入', '满意度｜整数｜只读｜说明：1-5 星，客户评价后写入', '处理记录｜时间 / 操作人 / 动作 / 说明｜每次操作追加，只可新增不可删改'],
  rules: ['「受理」仅对待受理可用：待受理 → 待分派，写受理记录', '「指派处理人」仅对待分派可用：选择处理人（必选）→ 处理中，写指派记录', '「处理」处理中 / 已退回 → 待客户确认，处理说明必填', '「解决确认」仅对待客户确认可用：→ 已解决并写入解决时间', '「（客户）评价并关闭」仅对已解决可用：满意度（1-5 星）必选，选后 → 已关闭', '「重新打开（退回）」对已关闭 / 已解决 / 待客户确认可用：→ 已退回，原因必填并写记录；「转派」需选择新处理人并写转派记录'],
  flow: ['待受理 → 待分派 → 处理中 → 待客户确认 → 已解决 → 已关闭；待客户确认 / 已解决也可被客户退回 → 已退回，处理后重新进入待客户确认', '所有状态变更、指派与转派都追加处理记录'],
  errors: ['工单编号不存在：空态并引导返回列表', '未填处理说明直接确认：校验拦截', '未选满意度直接关闭：校验拦截', '重新打开 / 退回未填原因：校验拦截', 'SLA 已超时：头部红色预警且不阻断处理'],
  api: ['工单详情查询、受理 / 指派 / 转派 / 处理 / 解决确认 / 评价关闭 / 退回接口、处理记录追加（示例）'],
  accept: ['每个操作后状态、处理人、解决时间、满意度、处理记录与统计卡即时更新', 'SLA 剩余 / 超时显示正确，已解决 / 已关闭不再计 SLA', '无控制台报错'],
});
const TK_HANDLERS = ['客服-小陈', '客服-小林', '技术-黄工', '孙工', '钱工', '林晓'];
const TK_SLA_H = { 紧急: 2, 高: 4, 中: 24, 低: 48 };
const TK_ST_TAG = { 待受理: 'info', 待分派: 'info', 处理中: 'primary', 待客户确认: 'warning', 已解决: 'success', 已关闭: 'success', 已退回: 'danger' };
function tkNow() { const n = new Date(); return TODAY + ' ' + String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); }
function tkLog(no, act, detail) { store.ext.logs.unshift({ time: tkNow(), who: '张三', module: '工单', act, detail: detail + '（工单：' + no + '）' }); }
function tkNextNo() { let mx = 99; store.ext.tickets.forEach(x => { const n = Number(String(x.no).split('-')[2]); if (n > mx) mx = n; }); return 'GD-' + TODAY.slice(0, 7).replace('-', '') + '-' + String(mx + 1).padStart(4, '0'); }
function tkSla(t) {
  if (['已关闭', '已解决'].includes(t.status)) return { k: 'none', txt: '-' };
  const dead = new Date(String(t.slaDeadline).replace(' ', 'T'));
  const now = new Date(String(tkNow()).replace(' ', 'T'));
  const rem = dead.getTime() - now.getTime();
  if (rem < 0) {
    const hs = Math.round(-rem / 1800000) / 2;
    return { k: 'timeout', txt: '超时 ' + (hs >= 1 ? (hs % 1 ? hs.toFixed(1) : hs) + ' 小时' : Math.round(-rem / 60000) + ' 分钟') };
  }
  const h = Math.floor(rem / 3600000), m = Math.ceil(rem % 3600000 / 60000);
  const txt = (h ? h + ' 小时 ' : '') + (h || m ? m + ' 分' : '不足 1 分钟') + ' 剩余';
  return { k: h <= 1 ? 'soon' : 'ok', txt };
}

/* ===== 服务工单列表 /service ===== */
const ServicePage = {
  components: { ListPage },
  setup() {
    const rows = computed(() => store.ext.tickets);
    const totalText = computed(() => '服务工单共 ' + rows.value.length + ' 张');
    const stats = computed(() => {
      const a = store.ext.tickets;
      return [
        ['工单总数', String(a.length), ''],
        ['待受理', String(a.filter(x => ['待受理', '待分派'].includes(x.status)).length), 'warn'],
        ['处理中', String(a.filter(x => x.status === '处理中').length), 'ok'],
        ['SLA 超时', String(a.filter(x => tkSla(x).k === 'timeout').length), 'danger'],
        ['待客户确认', String(a.filter(x => x.status === '待客户确认').length), 'warn'],
      ];
    });
    const cols = [
      { p: 'no', l: '工单编号', w: 140, link: true }, { p: 'customer', l: '客户', w: 190, link: 'cust' },
      { p: 'type', l: '工单类型', w: 100, tag: { 故障报修: 'danger', 服务请求: 'primary', 咨询: 'info', 投诉: 'warning' } },
      { p: 'priority', l: '问题等级', w: 90, tag: { 紧急: 'danger', 高: 'warning', 中: 'primary', 低: 'info' } },
      { p: 'desc', l: '问题描述', w: 210 }, { p: 'created', l: '提交时间', w: 140 }, { p: 'contact', l: '联系人', w: 90 },
      { p: 'handler', l: '处理人', w: 90 }, { p: 'status', l: '当前状态', w: 110, tag: TK_ST_TAG },
      { p: 'solvedTime', l: '解决时间', w: 140 }, { p: 'rating', l: '满意度', w: 90, noTip: true },
      { p: 'sla', l: 'SLA', w: 150, noTip: true },
    ];
    const filters = [
      { k: 'kw', label: '搜索工单', ph: '工单编号 / 客户 / 描述' },
      { k: 'type', label: '工单类型', opts: ['故障报修', '服务请求', '咨询', '投诉'] },
      { k: 'priority', label: '问题等级', opts: ['紧急', '高', '中', '低'] },
      { k: 'status', label: '状态', opts: ['待受理', '待分派', '处理中', '待客户确认', '已解决', '已关闭', '已退回'] },
      { k: 'handler', label: '处理人', opts: TK_HANDLERS },
    ];
    const onLink = (c, row) => { if (c.p === 'no') go('/ticket/' + row.no); };
    const fref = ref(null); const dlg = ref(false);
    const draft = reactive({ type: '故障报修', customer: '', contact: '', priority: '中', desc: '' });
    const rule = {
      customer: [{ required: true, message: '请选择客户', trigger: 'change' }],
      priority: [{ required: true, message: '请选择问题等级', trigger: 'change' }],
      desc: [{ required: true, message: '请填写问题描述', trigger: 'blur' }],
    };
    const slaTip = computed(() => TK_SLA_H[draft.priority] ? 'SLA 时限：' + TK_SLA_H[draft.priority] + ' 小时（截止 ' + (function () { const d = new Date(new Date(String(tkNow()).replace(' ', 'T')).getTime() + TK_SLA_H[draft.priority] * 3600000); return d.toISOString().slice(0, 16).replace('T', ' '); })() + '）' : '');
    const custOpts = computed(() => store.customers.filter(c => c.status !== '流失'));
    const ctOpts = computed(() => draft.customer ? (store.ext.contacts || []).filter(c => c.customer === draft.customer).map(c => c.name) : []);
    const save = () => fref.value.validate(ok => {
      if (!ok) return;
      const no = tkNextNo();
      const created = tkNow();
      const sla = new Date(new Date(created.replace(' ', 'T')).getTime() + TK_SLA_H[draft.priority] * 3600000).toISOString().slice(0, 16).replace('T', ' ');
      store.ext.tickets.unshift({ no, type: draft.type, customer: draft.customer, contact: draft.contact, priority: draft.priority, status: '待受理', handler: '', desc: draft.desc, created, slaDeadline: sla, solvedTime: '', rating: '', records: [{ time: created, who: '张三', act: '提交工单', note: '新建工单，等待客服受理' }], images: [] });
      tkLog(no, '新建', '新建' + draft.type + '工单（客户：' + draft.customer + '，问题等级：' + draft.priority + '，SLA 截止：' + sla + '）');
      dlg.value = false;
      ElMessage.success('工单已创建（编号 ' + no + '，状态：待受理，SLA 截止 ' + sla + '）');
      go('/ticket/' + no);
    });
    return { rows, totalText, stats, cols, filters, onLink, dlg, fref, draft, rule, custOpts, ctOpts, save, tkSla, slaTip, TK_ST_TAG };
  },
  template: `<div>
    <list-page :crumbs="['服务管理','服务工单']" title="服务工单" :total-text="totalText" :stats="stats" :filters="filters" :rows="rows" :cols="cols" :action-width="140" note-tag="真实数据 · 点击编号进入详情"
      @link="onLink">
      <template #ops>
        <el-button type="primary" icon="Plus" @click="dlg=true">新建工单</el-button>
        <el-button icon="Download" @click="$msg.info('示例：导出工单')">导出</el-button>
      </template>
      <template #cell-sla="{row}">
        <span v-if="tkSla(row).k==='timeout'" class="danger-text" style="font-weight:600"><el-icon style="vertical-align:-2px"><alarm-clock/></el-icon> {{ tkSla(row).txt }}</span>
        <span v-else-if="tkSla(row).k==='soon'" style="color:var(--warn)">{{ tkSla(row).txt }}</span>
        <span v-else style="width:150px" class="mono">{{ tkSla(row).txt }}</span>
      </template>
      <template #cell-rating="{row}">
        <span v-if="row.rating" style="color:#e6a23c">{{ '★'.repeat(row.rating) }}</span><span v-else class="muted">未评价</span>
      </template>
      <template #actions="{row}">
        <el-button link type="primary" @click="$go('/ticket/'+row.no)">查看</el-button>
        <el-button v-if="['待受理','待分派'].includes(row.status)" link type="primary" @click="$msg.info('在工单详情页进行受理 / 指派操作')">受理</el-button>
      </template>
    </list-page>
    <el-dialog v-model="dlg" title="新建工单" width="620px">
      <el-form ref="fref" :model="draft" :rules="rule" label-width="100px">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="工单类型">
            <el-select v-model="draft.type" style="width:100%"><el-option v-for="t in ['故障报修','服务请求','咨询','投诉']" :key="t" :value="t"/></el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="问题等级" prop="priority">
            <el-select v-model="draft.priority" style="width:100%"><el-option v-for="p in ['紧急','高','中','低']" :key="p" :value="p"/></el-select>
          </el-form-item></el-col>
        </el-row>
        <el-form-item label="客户" prop="customer">
          <el-select v-model="draft.customer" filterable placeholder="选择客户（联系人选项随客户联动）" style="width:100%" @change="draft.contact=''">
            <el-option v-for="c in custOpts" :key="c.no" :label="c.name" :value="c.name"/>
          </el-select>
        </el-form-item>
        <el-form-item label="关联联系人"><el-select v-model="draft.contact" clearable placeholder="可选" style="width:100%"><el-option v-for="c in ctOpts" :key="c" :label="c" :value="c"/></el-select></el-form-item>
        <el-form-item label="问题描述" prop="desc"><el-input v-model="draft.desc" type="textarea" :rows="3" placeholder="简述客户报修 / 诉求，会在工单详情展示"/></el-form-item>
        <el-alert v-if="slaTip" type="info" show-icon :closable="false" :title="slaTip + '；工单创建后为「待受理」，由客服受理并指派处理人后开始处理。'"/>
      </el-form>
      <template #footer><el-button @click="dlg=false">取消</el-button><el-button type="primary" @click="save">创建工单</el-button></template>
    </el-dialog>
  </div>`,
};
registerRoute('/service', ServicePage, 'service');

/* ===== 工单详情 /ticket/:no ===== */
const TicketDetailPage = {
  props: { no: String },
  setup(props) {
    const t = computed(() => store.ext.tickets.find(x => x.no === props.no) || null);
    const sla = computed(() => tkSla(t.value || { status: '已关闭', slaDeadline: TODAY }));
    const cust = computed(() => t.value ? store.customers.find(c => c.name === t.value.customer) || null : null);
    const custNo = computed(() => cust.value ? cust.value.no : cno((t.value || {}).customer || ''));
    const contact = computed(() => t.value && t.value.contact ? (store.ext.contacts || []).find(c => c.customer === t.value.customer && c.name === t.value.contact) || null : null);
    const records = computed(() => [...(t.value ? t.value.records || [] : [])].sort((a, b) => (a.time > b.time ? 1 : -1)));
    const solution = computed(() => {
      const hs = records.value.filter(r => r.act === '处理');
      return hs.length ? hs[hs.length - 1].note : '';
    });
    // 操作：受理 / 指派处理人 / 转派 / 处理 / 解决确认 / 评价关闭 / 退回
    const doTake = () => {
      const w = t.value;
      if (w.status !== '待受理') return ElMessage.info('当前状态不可受理');
      w.status = '待分派';
      w.records.push({ time: tkNow(), who: '客服-小陈', act: '受理', note: '客服已受理，待指派处理人' });
      tkLog(w.no, '受理', '客服受理，状态 → 待分派');
      ElMessage.success('工单已受理，状态变更为「待分派」，请指派处理人');
    };
    const apDlg = ref(false); const ap = reactive({ who: '客服-小陈' });
    const doAssign = () => {
      const w = t.value;
      if (!ap.who) return ElMessage.warning('请选择处理人');
      w.handler = ap.who;
      w.status = '处理中';
      w.records.push({ time: tkNow(), who: '张三', act: '指派处理人', note: '处理人指派为「' + ap.who + '」，按 SLA 启动处理' });
      tkLog(w.no, '指派处理人', '指派处理人「' + ap.who + '」，状态 → 处理中');
      apDlg.value = false; ap.who = '';
      ElMessage.success('已指派给 ' + w.handler + '，状态变更为「处理中」');
    };
    const tpDlg = ref(false); const tp = reactive({ who: '' });
    const canTransfer = computed(() => ['待分派', '处理中', '待客户确认', '已退回'].includes((t.value || {}).status));
    const doTransfer = () => {
      const w = t.value;
      if (!tp.who) return ElMessage.warning('请选择新的处理人');
      const old = w.handler || '（空）';
      w.handler = tp.who;
      w.records.push({ time: tkNow(), who: '张三', act: '转派', note: '处理人由「' + old + '」转派为「' + tp.who + '」' });
      tkLog(w.no, '转派', '处理人由「' + old + '」转派为「' + tp.who + '」');
      tpDlg.value = false; tp.who = '';
      ElMessage.success('已转派给 ' + w.handler + '，处理记录已更新');
    };
    const hdDlg = ref(false); const hd = reactive({ note: '' });
    const doHandle = () => {
      const v = hd.note.trim();
      if (!v) return ElMessage.warning('处理说明为必填，请填写本次处理内容');
      const w = t.value;
      const fromRet = w.status === '已退回';
      w.records.push({ time: tkNow(), who: w.handler || '客服', act: '处理', note: (fromRet ? '退回后重新处理：' : '') + v + '；状态 → 待客户确认' });
      w.status = '待客户确认';
      tkLog(w.no, '处理', '填写处理说明并提交客户确认（说明：' + v.slice(0, 20) + (v.length > 20 ? '…' : '') + '）');
      hdDlg.value = false; hd.note = '';
      ElMessage.success('已提交客户确认，状态变更为「待客户确认」');
    };
    const doConfirm = () => {
      const w = t.value;
      if (w.status !== '待客户确认') return ElMessage.info('当前状态不可解决确认（需先处理并等待客户确认）');
      w.status = '已解决';
      w.solvedTime = tkNow();
      w.records.push({ time: tkNow(), who: w.contact || '客户方', act: '解决确认', note: '客户确认问题已解决（解决时间：' + w.solvedTime + '），等待客户评价' });
      tkLog(w.no, '解决确认', '客户确认问题已解决，状态 → 已解决；解决时间：' + w.solvedTime);
      ElNotification({ title: '问题已解决', message: w.no + ' 客户确认解决（解决时间 ' + w.solvedTime + '），请进行客户评价后关闭。', type: 'success' });
    };
    const rateDlg = ref(false); const rate = reactive({ stars: 5, note: '' });
    const doRate = () => {
      const w = t.value;
      if (!rate.stars || rate.stars < 1) return ElMessage.warning('请选择满意度（1-5 星）后才可关闭工单');
      w.rating = rate.stars;
      w.status = '已关闭';
      w.records.push({ time: tkNow(), who: w.contact || '客户方', act: '客户评价', note: '满意度 ' + rate.stars + '/5' + (rate.note.trim() ? '（' + rate.note.trim() + '）' : '') + '，工单关闭' });
      tkLog(w.no, '客户评价关闭', '满意度 ' + rate.stars + '/5，状态 → 已关闭');
      rateDlg.value = false; rate.note = '';
      ElNotification({ title: '工单已关闭', message: w.no + ' 客户评价完成（满意度 ' + rate.stars + '/5），处理记录留痕。', type: 'success' });
    };
    const openDlg = ref(false); const opRf = reactive({ reason: '' });
    const canReopen = computed(() => ['已关闭', '已解决', '待客户确认'].includes((t.value || {}).status));
    const doReopen = () => {
      const v = opRf.reason.trim();
      if (!v) return ElMessage.warning('请填写退回原因（必填）');
      const w = t.value;
      w.status = '已退回';
      w.records.push({ time: tkNow(), who: w.contact || '客户方', act: '退回', note: '原因：' + v + '；工单退回（已退回），需重新处理' });
      tkLog(w.no, '退回', '原因：' + v + '；状态 → 已退回');
      openDlg.value = false; opRf.reason = '';
      ElMessage.success('工单已退回（状态：已退回），可重新处理后再提交客户确认');
    };
    return { t, sla, cust, custNo, contact, records, solution, doTake, apDlg, ap, doAssign, doTransfer, canTransfer, tpDlg, tp, hdDlg, hd, doHandle, doConfirm, rateDlg, rate, doRate, openDlg, opRf, doReopen, canReopen, tkSla, TK_ST_TAG, fmtY };
  },
  template: `<div v-if="t">
    <el-breadcrumb separator="/" class="crumb"><el-breadcrumb-item><a @click="$go('/service')">服务管理</a></el-breadcrumb-item><el-breadcrumb-item><a @click="$go('/service')">服务工单</a></el-breadcrumb-item><el-breadcrumb-item>{{ t.no }}</el-breadcrumb-item></el-breadcrumb>
    <div class="page-head"><h1>工单 {{ t.no }}</h1>
      <el-tag :type="({ 故障报修:'danger', 服务请求:'primary', 咨询:'info', 投诉:'warning' })[t.type]">{{ t.type }}</el-tag>
      <el-tag :type="{紧急:'danger',高:'warning',中:'primary',低:'info'}[t.priority]" effect="dark">问题等级：{{ t.priority }}</el-tag>
      <el-tag :type="TK_ST_TAG[t.status]">{{ t.status }}</el-tag>
      <span class="total">提交 {{ t.created }} · 处理人 {{ t.handler || '待分配' }}</span></div>
    <el-alert v-if="sla.k==='timeout'" type="error" show-icon :closable="false" style="margin-bottom:12px" :title="'SLA 超时预警：本工单已超出 SLA 时限（' + tkSla(t).txt + '）。请优先处理并联系客户说明情况，超时情况已计入考核统计。'"/>
    <el-alert v-else-if="t.status === '已关闭'" type="success" show-icon :closable="false" style="margin-bottom:12px" :title="'工单已关闭：客户满意度 ' + (t.rating ? t.rating + '/5' : '未评价') + '。如客户仍有问题可退回重开，处理记录将保留留痕。'"/>
    <el-alert v-else-if="t.status === '已退回'" type="warning" show-icon :closable="false" style="margin-bottom:12px" title="工单已退回：客户反馈问题未彻底解决，请重新处理后提交客户确认。"/>
    <div class="ops" style="margin-top:-4px">
      <el-button v-if="t.status==='待受理'" type="primary" icon="Pointer" @click="doTake">受理</el-button>
      <el-button v-if="t.status==='待分派'" type="primary" icon="UserFilled" @click="apDlg=true">指派处理人</el-button>
      <el-button v-if="canTransfer" icon="Switch" @click="tpDlg=true">转派</el-button>
      <el-button v-if="['处理中','已退回'].includes(t.status)" type="warning" icon="EditPen" @click="hdDlg=true">处理（提交客户确认）</el-button>
      <el-button v-if="t.status==='待客户确认'" type="success" icon="CircleCheck" @click="doConfirm">解决确认（客户确认）</el-button>
      <el-button v-if="t.status==='已解决'" type="success" icon="Star" @click="rate.stars = 5; rateDlg=true">客户评价并关闭</el-button>
      <el-button v-if="canReopen" icon="RefreshLeft" @click="openDlg=true">退回 / 重新打开</el-button>
      <el-button icon="Printer" @click="$msg.info('示例：打印工单回执')">打印</el-button>
    </div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:14px;align-items:start">
      <div>
        <div class="card card-pad" style="margin-bottom:14px">
          <div class="sec-title">问题描述</div>
          <p style="margin:0;line-height:1.8">{{ t.desc }}</p>
          <template v-if="(t.images||[]).length">
            <div class="sec-title" style="margin-top:16px">图片附件（{{ t.images.length }}）</div>
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <div v-for="img in t.images" :key="img" style="width:130px;height:96px;border:1px dashed var(--line);border-radius:8px;background:var(--soft);display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--sub);font-size:12px;gap:4px">
                <el-icon style="font-size:22px"><camera/></el-icon>{{ img.split('/').pop() }}
              </div>
            </div>
            <p class="muted" style="margin:8px 0 0;font-size:12px">原型阶段以占位卡片代替真实图片；正式版本点击可查看大图。</p>
          </template>
          <p v-else class="muted" style="margin:12px 0 0;font-size:12px">工单未上传图片附件（客户可在移动端补充）。</p>
          <template v-if="solution">
            <div class="sec-title" style="margin-top:16px">解决方案（最近一次处理）</div>
            <p style="margin:0;line-height:1.8">{{ solution }}</p>
          </template>
        </div>
        <div class="card card-pad">
          <div class="sec-title">处理记录时间线（{{ records.length }}）</div>
          <el-timeline>
            <el-timeline-item v-for="(r,i) in records" :key="i" :timestamp="r.time" placement="top"
              :type="({ 受理:'primary', 指派处理人:'primary', 处理:'warning', 解决确认:'success', 客户评价:'success', 转派:'', 退回:'danger', 重新打开:'danger', 提交工单:'info' })[r.act] || 'primary'">
              <div class="tl-item-card">
                <b style="margin-right:8px">{{ r.act }}</b><span class="muted" style="font-size:12px">{{ r.who || '系统' }}</span>
                <div style="line-height:1.7;margin-top:2px">{{ r.note }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
      <div>
        <div class="card card-pad" style="margin-bottom:14px">
          <div class="sec-title">SLA 与工单信息</div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="SLA 状态">
              <el-tag v-if="sla.k==='timeout'" type="danger" effect="dark">{{ sla.txt }}（截止 {{ t.slaDeadline }}）</el-tag>
              <el-tag v-else-if="sla.k==='none'">{{ sla.txt }}</el-tag>
              <el-tag v-else-if="sla.k==='soon'" type="warning">{{ sla.txt }}</el-tag>
              <el-tag v-else type="info" effect="plain">{{ sla.txt }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="SLA 截止时间">{{ t.slaDeadline }}</el-descriptions-item>
            <el-descriptions-item label="工单类型">{{ t.type }}</el-descriptions-item>
            <el-descriptions-item label="问题等级">{{ t.priority }}<span class="muted" style="margin-left:6px;font-size:12px">SLA 时限 {{ ({紧急:2,高:4,中:24,低:48})[t.priority] }} 小时</span></el-descriptions-item>
            <el-descriptions-item label="当前处理人">{{ t.handler || '待分配' }}</el-descriptions-item>
            <el-descriptions-item label="提交时间">{{ t.created }}</el-descriptions-item>
            <el-descriptions-item label="解决时间">{{ t.solvedTime || '-' }}</el-descriptions-item>
            <el-descriptions-item label="满意度">
              <span v-if="t.rating" style="color:#e6a23c">{{ '★'.repeat(t.rating) }}</span><span v-else class="muted">未评价</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="card card-pad">
          <div class="sec-title">客户与联系人</div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="客户"><a class="link" @click="$go('/customer/'+custNo)">{{ t.customer }}</a></el-descriptions-item>
            <el-descriptions-item label="客户等级" v-if="cust">{{ cust.level }}<el-tag v-if="cust.key" size="small" type="danger" effect="plain" style="margin-left:8px">重点</el-tag></el-descriptions-item>
            <el-descriptions-item label="联系人"><template v-if="contact"><a class="link" @click="$go('/contact/'+contact.no)">{{ t.contact || '未关联' }}</a><span class="muted" style="margin-left:6px;font-size:12px">{{ contact.title || '' }}</span></template><span v-else>{{ t.contact || '未关联' }}</span></el-descriptions-item>
            <el-descriptions-item label="联系电话" v-if="contact">{{ contact.phone }}</el-descriptions-item>
            <el-descriptions-item label="责任销售">{{ (cust && cust.owner) || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </div>
    <el-dialog v-model="apDlg" title="指派处理人（待分派 → 处理中）" width="440px">
      <el-form label-width="90px">
        <el-form-item label="处理人" required><el-select v-model="ap.who" placeholder="选择处理人" style="width:100%"><el-option v-for="h in ['客服-小陈','客服-小林','技术-黄工','孙工','钱工','林晓']" :key="h" :value="h"/></el-select></el-form-item>
      </el-form>
      <template #footer><el-button @click="apDlg=false">取消</el-button><el-button type="primary" @click="doAssign">确认指派</el-button></template>
    </el-dialog>
    <el-dialog v-model="tpDlg" title="转派工单" width="440px">
      <el-form label-width="90px">
        <el-form-item label="当前处理人"><el-input :model-value="t.handler || '待分配'" disabled/></el-form-item>
        <el-form-item label="新处理人" required><el-select v-model="tp.who" placeholder="选择处理人" style="width:100%"><el-option v-for="h in ['客服-小陈','客服-小林','技术-黄工','孙工','钱工','林晓']" :key="h" :value="h"/></el-select></el-form-item>
      </el-form>
      <template #footer><el-button @click="tpDlg=false">取消</el-button><el-button type="primary" @click="doTransfer">确认转派</el-button></template>
    </el-dialog>
    <el-dialog v-model="hdDlg" title="处理工单（处理说明必填）" width="520px">
      <el-alert type="info" show-icon :closable="false" style="margin-bottom:12px" title="提交后工单进入「待客户确认」，客户解决确认后记录解决时间，再评价关闭。"/>
      <el-input v-model="hd.note" type="textarea" :rows="4" placeholder="填写本次处理过程与解决方案，例如：已重置服务端缓存并完成回归验证…"/>
      <template #footer><el-button @click="hdDlg=false">取消</el-button><el-button type="primary" @click="doHandle">提交处理结果</el-button></template>
    </el-dialog>
    <el-dialog v-model="rateDlg" title="客户评价并关闭（满意度必选）" width="480px">
      <el-form label-width="90px">
        <el-form-item label="满意度" required>
          <el-rate v-model="rate.stars" :max="5" show-score score-template="{value} / 5"/>
        </el-form-item>
        <el-form-item label="评价备注"><el-input v-model="rate.note" type="textarea" :rows="2" placeholder="客户反馈意见（可选，写入处理记录）"/></el-form-item>
      </el-form>
      <template #footer><el-button @click="rateDlg=false">取消</el-button><el-button type="primary" @click="doRate">确认评价并关闭</el-button></template>
    </el-dialog>
    <el-dialog v-model="openDlg" title="退回 / 重新打开工单（原因必填）" width="480px">
      <el-alert type="info" show-icon :closable="false" style="margin-bottom:12px" title="客户反馈问题未彻底解决时退回重开，工单进入「已退回」，重新处理后提交客户确认。"/>
      <el-input v-model="opRf.reason" type="textarea" :rows="3" placeholder="请填写退回原因（将写入处理记录）"/>
      <template #footer><el-button @click="openDlg=false">取消</el-button><el-button type="danger" @click="doReopen">确认退回</el-button></template>
    </el-dialog>
  </div>`,
};
registerRoute('/ticket/:no', TicketDetailPage, 'ticket-detail');
