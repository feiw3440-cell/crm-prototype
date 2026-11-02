/* ===== 第 5 阶段：交付管理 /delivery（交付项目列表）与项目详情 /delivery/:no ===== */
DOCS_DEFAULT['delivery'] = mkDoc('delivery', {
  name: '交付项目', module: '交付管理',
  goal: '跟踪订单签订后的实施交付：以里程碑驱动项目进度，支持按状态、项目经理、客户检索，及时发现延期与风险项目，保证交付过程可追溯、进度真实可信。',
  roles: ['交付 / 客服（项目经理）：查看与推进名下交付项目、标记里程碑完成', '销售经理：查看团队客户的项目进度与风险', '管理员：全量数据维护'],
  enter: ['左侧导航：交付管理 → 项目列表', '订单详情「关联交付项目」Tab、客户详情「交付」Tab 链接'],
  layout: ['顶部：面包屑 + 页面标题 + 项目总数', '统计卡：项目总数、实施中、延期预警、已完成（由数据实算）', '筛选区：关键词 / 项目状态 / 项目经理', '表格：编号、名称、客户、订单、项目经理、起止日期、进度条、状态、风险等列 + 行内操作（查看 / 标记里程碑）', '分页：真实分页'],
  fields: [
    '项目编号｜文本｜只读｜格式：XM-年月-序号',
    '项目名称 / 客户 / 订单｜文本｜只读｜来源：订单派生',
    '项目经理｜人员｜必填：是',
    '计划开始 / 计划完成｜日期｜必填：是｜校验：开始 ≤ 完成',
    '进度｜百分比｜只读｜说明：由完成里程碑数实算，不允许手改',
    '项目状态｜枚举｜说明：未启动 / 实施中 / 验收中 / 已完成',
    '风险提示｜长文本｜说明：非空即视为风险项目，标红提醒',
  ],
  rules: ['列表数据来自 store.ext.deliveries，真分页，统计卡由数据实算', '进度由里程碑完成情况自动重算，完成后不可回退', '延期预警规则：状态非「已完成」且计划完成日期早于今天', '点击项目编号进入 /delivery/:no 详情'],
  flow: ['项目状态：未启动 → 实施中 → 验收中 →（全部里程碑完成）→ 已完成'],
  errors: ['筛选无结果：空态可重置', '里程碑被并发修改：提示刷新', '项目计划完成日期已过期：列表与详情出现红色预警'],
  api: ['交付项目分页查询、里程碑完成状态更新（含进度重算）、项目风险查询（示例）'],
  accept: ['统计卡数字由数据实算', '进度与里程碑一致，标记完成后自动重算', '无控制台报错'],
});
DOCS_DEFAULT['delivery-detail'] = mkDoc('delivery-detail', {
  name: '交付项目详情', module: '交付管理',
  goal: '展示单个交付项目的里程碑时间线、风险提示、关联订单 / 合同 / 客户与实施记录；项目经理可逐个标记里程碑完成，完成后项目进度自动重算，并记录进项目日志。',
  roles: ['项目经理：标记里程碑完成、补充实施记录', '交付负责人与销售经理：查看进度与风险', '其他角色：只读'],
  enter: ['交付项目列表点击项目编号', '订单详情 / 客户详情的关联交付项目链接'],
  layout: ['头部：面包屑 + 项目编号 + 进度条 + 状态标签 + 操作按钮', '左列：里程碑时间线（可标记完成）+ 实施记录时间线', '右列：基本信息（工期 / 项目经理）+ 关联订单 / 合同 / 客户卡', '顶部：风险提示红色告警（无风险时隐藏）'],
  fields: ['里程碑｜名称 / 日期 / 状态｜必填：是｜说明：未开始 / 进行中 / 已完成，完成后不可回退', '进度｜百分比｜只读｜说明：完成里程碑 / 总里程碑数', '实施记录｜时间 / 记录人 / 事项｜说明：完成里程碑与操作时自动追加'],
  rules: ['仅「未开始 / 进行中」里程碑可标记完成，完成后状态锁定', '每次标记完成立即重算进度并写操作日志与实施记录', '里程碑全部完成后项目状态自动变为「已完成」'],
  flow: ['里程碑：未开始 / 进行中 →（标记完成）→ 已完成', '项目：未启动 → 实施中 → 已完成'],
  errors: ['项目编号不存在：空态并引导返回', '重复标记完成：提示已处于完成状态', '关联合同已终止：仍可查看但显示提示'],
  api: ['项目详情查询、里程碑状态更新（进度重算）、实施记录追加接口（示例）'],
  accept: ['标记完成后进度条与状态即时更新并留痕', '里程碑、订单、客户链接正确', '无控制台报错'],
});
function dlLog(no, act, detail) { store.ext.logs.unshift({ time: TODAY + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0'), who: '张三', module: '交付', act, detail: detail + '（项目：' + no + '）' }); }
function dlProg(d) {
  const ms = d.milestones || [];
  const done = ms.filter(m => m.status === '已完成').length;
  d.progress = ms.length ? Math.round(done * 100 / ms.length) : 0;
  if (done === ms.length && ms.length) d.status = '已完成';
  else if (!d.status || d.status === '未启动') d.status = '实施中';
  d.ac = ms.length && done === ms.length ? '已验收' : (done ? '阶段验收中' : '未验收');
}
function dlTouch(d) { if (!d.recs) d.recs = (d.milestones || []).filter(m => m.status === '已完成').map(m => ({ time: m.date, who: d.pm, act: '里程碑完成', note: m.name + '（里程碑验收通过）' })); }
function dlNext(d) { const nx = (d.milestones || []).find(m => m.status !== '已完成'); if (nx && nx.status !== '进行中') nx.status = '进行中'; return nx; }
const DL_TAG = { 未开始: 'info', 进行中: 'primary', 已完成: 'success' };
const DL_STATUS_TAG = { 未启动: 'info', 实施中: 'primary', 验收中: 'warning', 已完成: 'success' };

/* ===== 交付项目列表 /delivery ===== */
const DeliveryPage = {
  components: { ListPage },
  setup() {
    const rows = computed(() => store.ext.deliveries);
    const totalText = computed(() => '交付项目共 ' + rows.value.length + ' 个');
    const stats = computed(() => {
      const a = store.ext.deliveries;
      return [
        ['项目总数', String(a.length), ''],
        ['实施中', String(a.filter(x => x.status === '实施中').length), 'ok'],
        ['延期预警', String(a.filter(x => x.status !== '已完成' && x.planEnd < TODAY).length), 'danger'],
        ['风险项目', String(a.filter(x => x.risk).length), 'warn'],
        ['已完成', String(a.filter(x => x.status === '已完成').length), 'ok'],
      ];
    });
    const cols = [
      { p: 'no', l: '项目编号', w: 140, link: true }, { p: 'name', l: '项目名称', w: 190 },
      { p: 'customer', l: '客户', w: 200, link: 'cust' }, { p: 'order', l: '关联订单', w: 150 }, { p: 'contract', l: '关联合同', w: 150 },
      { p: 'pm', l: '项目经理', w: 90 }, { p: 'planStart', l: '计划开始日期', w: 110 }, { p: 'planEnd', l: '计划完成日期', w: 110 },
      { p: 'progress', l: '进度', w: 140, noTip: true, progress: true },
      { p: 'status', l: '项目状态', w: 95, tag: { 未启动: 'info', 实施中: 'primary', 验收中: 'warning', 已完成: 'success' } },
      { p: 'ac', l: '验收状态', w: 100, tag: { 未验收: 'info', 阶段验收中: 'warning', 已验收: 'success' } },
      { p: 'risk', l: '风险', w: 85, noTip: true },
    ];
    const filters = [
      { k: 'kw', label: '搜索项目', ph: '项目编号 / 名称 / 客户' },
      { k: 'status', label: '项目状态', opts: ['未启动', '实施中', '验收中', '已完成'] },
      { k: 'ac', label: '验收状态', opts: ['未验收', '阶段验收中', '已验收'] },
      { k: 'pm', label: '项目经理', opts: ['孙工', '钱工', '周航', '吴迪'] },
    ];
    const onLink = (c, row) => { if (c.p === 'no') go('/delivery/' + row.no); };
    const finishOne = row => {
      const nx = (row.milestones || []).find(m => m.status !== '已完成');
      if (!nx) return ElMessage.info('该项目里程碑已全部完成');
      nx.status = '已完成';
      dlTouch(row);
      dlProg(row);
      dlNext(row);
      row.recs.unshift({ time: TODAY, who: '张三', act: '里程碑完成', note: nx.name + '（进度重算为 ' + row.progress + '%）' });
      dlLog(row.no, '里程碑完成', '里程碑「' + nx.name + '」标记完成，进度由系统重算为 ' + row.progress + '%' + (row.progress >= 100 ? '，项目已完成' : ''));
      ElMessage.success('已标记里程碑「' + nx.name + '」完成，进度重算为 ' + row.progress + '%');
    };
    return { rows, totalText, stats, cols, filters, onLink, finishOne, TODAY };
  },
  template: `<div>
    <list-page :crumbs="['交付管理','交付项目']" title="交付项目" :total-text="totalText" :stats="stats" :filters="filters" :rows="rows" :cols="cols" :action-width="170" note-tag="真实数据 · 点击编号进入详情"
      @link="onLink">
      <template #ops>
        <el-button icon="Download" @click="$msg.info('示例：导出交付项目')">导出</el-button>
      </template>
      <template #cell-risk="{row}"><el-tag v-if="row.risk" type="danger" size="small" effect="light">有风险</el-tag><span v-else>-</span></template>
      <template #actions="{row}">
        <el-button link type="primary" @click="$go('/delivery/'+row.no)">查看</el-button>
        <el-button v-if="(row.milestones||[]).some(m => m.status !== '已完成')" link type="primary" @click="finishOne(row)">完成下一里程碑</el-button>
      </template>
    </list-page>
  </div>`,
};
registerRoute('/delivery', DeliveryPage, 'delivery');

/* ===== 交付项目详情 /delivery/:no ===== */
const DeliveryDetailPage = {
  props: { no: String },
  setup(props) {
    const d = computed(() => store.ext.deliveries.find(x => x.no === props.no) || null);
    const tab = ref('ms');
    const order = computed(() => d.value ? store.ext.orders.find(o => o.no === d.value.order) || null : null);
    const ct = computed(() => order.value ? store.ext.contracts.find(c => c.no === order.value.contract) || null : null);
    const cust = computed(() => d.value ? store.customers.find(c => c.name === d.value.customer) || null : null);
    const custNo = computed(() => cust.value ? cust.value.no : cno((d.value || {}).customer || ''));
    const overdue = computed(() => d.value && d.value.status !== '已完成' && d.value.planEnd < TODAY);
    const touch = () => dlTouch(d.value);
    touch();
    const recs = computed(() => [...(d.value ? d.value.recs || [] : [])].sort((a, b) => (a.time < b.time ? 1 : -1)));
    const finish = m => {
      if (m.status === '已完成') return ElMessage.info('该里程碑已完成');
      m.status = '已完成';
      const d2 = d.value;
      dlTouch(d2);
      dlProg(d2);
      dlNext(d2);
      d2.recs.unshift({ time: TODAY, who: '张三', act: '里程碑完成', note: m.name + '（进度重算为 ' + d2.progress + '%）' });
      dlLog(d2.no, '里程碑完成', '里程碑「' + m.name + '」标记完成，进度重算为 ' + d2.progress + '%' + (d2.progress >= 100 ? '，项目状态变更为「已完成」' : ''));
      ElMessage.success('「' + m.name + '」已完成，项目进度重算为 ' + d2.progress + '%');
    };
    const nextMs = computed(() => d.value ? (d.value.milestones || []).find(m => m.status !== '已完成') || null : null);
    return { d, tab, order, ct, cust, custNo, overdue, recs, finish, nextMs, DL_TAG, DL_STATUS_TAG, fmtY };
  },
  template: `<div v-if="d && d.recs">
    <el-breadcrumb separator="/" class="crumb"><el-breadcrumb-item><a @click="$go('/delivery')">交付管理</a></el-breadcrumb-item><el-breadcrumb-item><a @click="$go('/delivery')">交付项目</a></el-breadcrumb-item><el-breadcrumb-item>{{ d.no }}</el-breadcrumb-item></el-breadcrumb>
    <div class="page-head"><h1>项目 {{ d.no }}</h1><el-tag :type="({未启动:'info',实施中:'primary',验收中:'warning',已完成:'success'})[d.status]||'info'">{{ d.status }}</el-tag>
      <el-tag :type="({未验收:'info',阶段验收中:'warning',已验收:'success'})[d.ac]||'info'" effect="plain">验收状态：{{ d.ac || '未验收' }}</el-tag>
      <span class="total">{{ d.name }} · 项目经理 {{ d.pm }}</span></div>
    <div class="ops" style="margin-top:-4px">
      <el-progress style="width:280px" :percentage="d.progress" :stroke-width="12" :status="d.progress===100?'success':''"/>
      <el-button v-if="nextMs" type="primary" icon="Check" @click="finish(nextMs)">标记里程碑「{{ nextMs.name }}」完成</el-button>
      <el-button icon="Printer" @click="$msg.info('示例：打印项目周报')">打印周报</el-button>
    </div>
    <el-alert v-if="d.risk" type="error" show-icon :closable="false" style="margin-bottom:12px" :title="'风险提示：' + d.risk + '。请与客户确认应对措施并更新计划。'"/>
    <el-alert v-else-if="overdue" type="error" show-icon :closable="false" style="margin-bottom:12px" :title="'计划完成日期 ' + d.planEnd + ' 已过期，但项目仍在交付中：存在延期风险，请重新排期。'"/>
    <el-alert v-if="!d.risk && !overdue && d.status !== '已完成'" type="info" show-icon :closable="false" style="margin-bottom:12px" :title="nextMs ? '当前进行中的里程碑：' + nextMs.name + '（计划 ' + nextMs.date + '）' : '里程碑推进正常'"/>
    <el-card shadow="never" :body-style="{padding:'0'}">
      <el-tabs v-model="tab" style="padding:0 18px">
        <el-tab-pane label="里程碑时间线" name="ms"><div style="padding:16px 6px">
          <el-timeline>
            <el-timeline-item v-for="(m,i) in d.milestones" :key="i" :timestamp="m.date" placement="top"
              :type="m.status==='已完成' ? 'success' : (m.status==='进行中' ? 'primary' : 'info')"
              :hollow="m.status!=='已完成'">
              <div style="display:flex;align-items:center;gap:10px;padding:2px 0">
                <b>{{ m.name }}</b>
                <el-tag size="small" :type="({未开始:'info',进行中:'primary',已完成:'success'})[m.status]">{{ m.status }}</el-tag>
                <el-button v-if="m.status !== '已完成'" size="small" type="primary" plain @click="finish(m)">标记完成</el-button>
                <el-icon v-else style="color:var(--ok)"><check/></el-icon>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-alert type="info" show-icon :closable="false" title="里程碑每完成一项，项目进度自动按「已完成里程碑数 / 总数」重算，全部完成后项目状态自动变为「已完成」。"/>
        </div></el-tab-pane>
        <el-tab-pane :label="'实施记录（' + recs.length + '）'" name="recs"><div style="padding:16px 6px">
          <el-timeline>
            <el-timeline-item v-for="(r,i) in recs" :key="i" :timestamp="r.time" placement="top" type="primary">
              <div class="tl-item-card"><b style="margin-right:8px">{{ r.act }}</b><span class="muted" style="font-size:12px">{{ r.who }}</span>
                <div style="line-height:1.7;margin-top:2px">{{ r.note }}</div></div>
            </el-timeline-item>
          </el-timeline>
        </div></el-tab-pane>
        <el-tab-pane label="关联订单与客户" name="src"><div style="padding:16px 6px" class="card card-pad" >
          <el-descriptions :column="1" border>
            <el-descriptions-item label="关联订单"><a v-if="order" class="link" @click="$go('/order/'+order.no)">{{ order.no }}</a><span v-else>-</span></el-descriptions-item>
            <el-descriptions-item label="关联合同"><a v-if="d.contract" class="link" @click="$go('/contract/'+d.contract)">{{ d.contract }}</a><span v-else>{{ ct ? ct.no : '-' }}</span></el-descriptions-item>
            <el-descriptions-item label="订单金额" v-if="order"><span class="money">¥{{ fmtY(order.amount) }}</span></el-descriptions-item>
            <el-descriptions-item label="客户"><a class="link" @click="$go('/customer/'+custNo)">{{ d.customer }}</a></el-descriptions-item>
            <el-descriptions-item label="项目经理">{{ d.pm }}</el-descriptions-item>
            <el-descriptions-item label="计划开始日期">{{ d.planStart }}</el-descriptions-item>
            <el-descriptions-item label="计划完成日期">{{ d.planEnd }}</el-descriptions-item>
            <el-descriptions-item label="项目状态">{{ d.status }}</el-descriptions-item>
            <el-descriptions-item label="验收状态">{{ d.ac || '未验收' }}</el-descriptions-item>
          </el-descriptions>
        </div></el-tab-pane>
      </el-tabs>
    </el-card>
  </div>`,
};
registerRoute('/delivery/:no', DeliveryDetailPage, 'delivery-detail');
