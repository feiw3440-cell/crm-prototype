/* ===== 第 5 阶段：活动管理 /activities（列表 + 日历 + 新增）与活动详情 /activity/:no ===== */
DOCS_DEFAULT['activities'] = mkDoc('activities', {
  name: '跟进活动', module: '活动管理',
  goal: '沉淀与展示客户全生命周期的每一次跟进活动（电话 / 微信 / 拜访 / 会议 / 邮件），支持按类型、客户、负责人、状态与时间区间检索并提供日历视图；销售可在此新增活动与拜访计划，完成后反馈沉淀，形成可复盘的跟进时间线。',
  roles: ['销售：查看与新增本人跟进活动，可标记完成计划中活动', '销售经理：查看团队全部活动，可代填跟进反馈', '交付 / 客服：读写与客户相关的服务类活动', '管理员：全量数据与字段配置'],
  enter: ['左侧导航：活动管理 → 跟进记录', '客户详情「跟进」Tab 的新增跟进 / 活动链接', '商机详情关联跟进活动链接'],
  layout: ['顶部：面包屑 + 页面标题 + 视图切换（列表 / 日历）+ 新增活动按钮', '统计卡：活动总数、已完成、计划中、本月活动、已取消（由数据实算）', '列表视图：筛选区（关键词 / 类型 / 状态 / 负责人 / 时间区间）+ 表格 + 真分页', '日历视图：月历网格，按日显示活动数，点日期查看当日活动并可跳转筛选'],
  fields: [
    '活动编号｜文本｜只读｜格式：HD-6位序号，全库唯一',
    '活动类型｜枚举｜必填：是｜说明：电话 / 微信 / 拜访 / 会议 / 邮件',
    '关联客户｜选择｜必填：是｜校验：必须为有效客户',
    '关联联系人 / 商机｜选择｜必填：否｜选项随客户联动',
    '活动时间｜日期时间｜必填：是｜校验：不能早于当前时间（计划类）',
    '跟进内容｜长文本｜必填：是｜校验：非空',
    '客户反馈｜长文本｜必填：否｜说明：活动完成后填写，为复盘依据',
    '下一步计划｜日期时间｜必填：否｜说明：完成后可设置，进入销售待办',
    '签到信息｜结构｜必填：否｜说明：拜访类完成时记录地址 / 坐标 / 时间 / 现场照片',
  ],
  rules: ['列表数据来自 store.ext.activities，真分页，统计卡由数据实算', '时间区间为前端过滤，其余筛选条件变化后回到第 1 页', '点击活动编号进入 /activity/:no 详情；日历点日期可查看当日活动详情列表', '新增活动默认状态为「计划中」；标记完成后状态改为「已完成」并必须沉淀客户反馈'],
  flow: ['活动状态流转：计划中 →（标记完成）→ 已完成；计划中 / 未开始也可「取消活动」→ 已取消', '已完成活动可设置「下一步计划」时间，到期自动进入销售待办'],
  errors: ['新增未选客户：校验拦截并提示', '内容为空：必填校验拦截', '时间区间起止颠倒：自动交换起止日期', '筛选无结果：显示空态，可一键重置'],
  api: ['活动分页查询、活动新增、活动状态标记完成接口、按日期聚合统计接口（示例）'],
  accept: ['列表 / 日历切换可用，统计卡数字由数据实算', '新增活动写入 store.ext.activities 且出现在列表首位', '详情页 /activity/:no 数据与列表一致，标记完成后状态与反馈即时更新；无控制台报错'],
});
DOCS_DEFAULT['activity-detail'] = mkDoc('activity-detail', {
  name: '活动详情', module: '活动管理',
  goal: '呈现单条跟进活动的完整上下文：关联客户 / 联系人 / 商机、跟进内容、客户反馈与下一步计划；拜访类活动展示签到信息（地址 / 时间 / 坐标 / 现场照片占位），并作为「标记完成」等状态操作的落点页面。',
  roles: ['负责人销售：标记完成、补充反馈与下一步计划', '销售经理：查看并可代填反馈', '其他角色：只读'],
  enter: ['活动列表点击活动编号', '日历视图点日期后点击活动', '客户详情 / 商机详情的跟进时间线关联跳转'],
  layout: ['头部：面包屑 + 活动编号 + 类型 / 状态标签 + 操作按钮（标记完成 / 打印）', '左列：基本信息（时间 / 类型 / 负责人）+ 跟进内容卡 + 客户反馈卡 + 下一步计划 + 拜访签到信息卡（地址 / 时间 / 坐标 / 照片占位）', '右列：关联客户 / 联系人 / 商机卡（可点击跳转）+ 状态提示'],
  fields: ['活动编号 / 类型 / 状态 / 时间｜只读', '跟进内容｜长文本｜只读（历史不可改）', '客户反馈｜长文本｜完成时填写，可编辑', '下一步计划｜日期时间｜可选', '签到信息｜地址 / 时间 / 经纬度 / 照片｜拜访类完成时记录，照片为占位'],
  rules: ['「标记完成」仅对状态为计划中的活动可用；完成后状态改为已完成且必须填写客户反馈', '拜访类完成时若无签到记录则自动按客户所在地区生成签到占位数据', '所有状态变化写入操作日志（store.ext.logs）'],
  flow: ['计划中 →（标记完成：反馈必填）→ 已完成', '计划中 →（取消）→ 已取消'],
  errors: ['活动编号不存在：空态并引导返回列表', '标记完成未填写反馈：弹窗校验拦截', '关联商机或联系人被作废：对应链接置灰提示'],
  api: ['活动详情查询、标记完成（带反馈 / 下一步）接口、签到信息查询（示例）'],
  accept: ['各卡片数据与该活动自身数据一致', '标记完成后状态、反馈、日志即时更新', '无控制台报错'],
});
/* --- 工具 --- */
function acLog(no, act, detail) { store.ext.logs.unshift({ time: TODAY + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0'), who: '张三', module: '活动', act, detail: detail + '（活动：' + no + '）' }); }
function acNextNo() {
  let mx = 99;
  store.ext.activities.forEach(x => { const n = Number(String(x.no).split('-')[1]); if (n > mx) mx = n; });
  return 'HD-' + String(mx + 1).padStart(6, '0');
}
const AC_TAG = { 电话: 'primary', 微信: 'info', 短信: 'info', 拜访: 'success', 会议: 'warning', 邮件: 'primary', 演示: 'success', 培训: 'warning', 其他: 'info' };
const AC_RESULT_TAG = { 已联系: 'primary', 待反馈: 'warning', 需求明确: 'success' };
const AC_STATUS_TAG = { 计划中: 'warning', 已完成: 'success', 已取消: 'info' };

/* ===== 活动列表 /activities ===== */
const ActivitiesPage = {
  components: { ListPage },
  setup() {
    const view = ref('list');
    const d1 = ref(''); const d2 = ref('');
    const rows = computed(() => {
      let a = store.ext.activities;
      if (d1.value && d2.value && d1.value > d2.value) { const t = d1.value; d1.value = d2.value; d2.value = t; }
      if (d1.value) a = a.filter(x => x.time.slice(0, 10) >= d1.value);
      if (d2.value) a = a.filter(x => x.time.slice(0, 10) <= d2.value);
      return a;
    });
    const totalText = computed(() => '跟进活动共 ' + rows.value.length + ' 条');
    const monthStr = computed(() => { let c = 0; store.ext.activities.forEach(x => { if (x.time.slice(0, 7) === TODAY.slice(0, 7)) c++; }); return c; });
    const stats = computed(() => {
      const a = store.ext.activities;
      return [
        ['活动总数', String(a.length), ''],
        ['已完成', String(a.filter(x => x.status === '已完成').length), 'ok'],
        ['计划中', String(a.filter(x => x.status === '计划中').length), 'warn'],
        ['本月活动', String(monthStr.value), ''],
        ['已取消', String(a.filter(x => x.status === '已取消').length), 'danger'],
      ];
    });
    const cols = [
      { p: 'no', l: '活动编号', w: 130, link: true }, { p: 'type', l: '活动类型', w: 90, tag: AC_TAG },
      { p: 'customer', l: '客户', w: 200, link: 'cust' }, { p: 'contact', l: '联系人', w: 90 }, { p: 'opp', l: '商机', w: 140 },
      { p: 'time', l: '时间', w: 140 }, { p: 'content', l: '内容', w: 250 }, { p: 'owner', l: '负责人', w: 80 },
      { p: 'feedback', l: '客户反馈', w: 150 }, { p: 'result', l: '跟进结果', w: 90, tag: AC_RESULT_TAG }, { p: 'next', l: '下次跟进时间', w: 140 },
      { p: 'status', l: '状态', w: 90, tag: AC_STATUS_TAG },
    ];
    const filters = [
      { k: 'kw', label: '搜索活动', ph: '编号 / 客户 / 内容 / 联系人' },
      { k: 'type', label: '活动类型', opts: ['电话', '微信', '短信', '拜访', '会议', '邮件', '演示', '培训', '其他'] },
      { k: 'status', label: '活动状态', opts: ['已完成', '计划中', '已取消'] },
      { k: 'owner', label: '负责人', opts: OWNERS },
    ];
    const onLink = (c, row) => { if (c.p === 'no') go('/activity/' + row.no); };
    /* ---- 日历视图 ---- */
    const month = ref(TODAY.slice(0, 7));
    const byDate = computed(() => { const m = {}; store.ext.activities.forEach(x => { const d = x.time.slice(0, 10); (m[d] = m[d] || []).push(x); }); return m; });
    const calCells = computed(() => {
      const [y, mo] = month.value.split('-').map(Number);
      const first = new Date(y + '-' + String(mo).padStart(2, '0') + '-01T00:00:00');
      let off = (first.getDay() + 6) % 7;
      const start = new Date(first.getTime() - off * 86400000);
      const cells = [];
      for (let i = 0; i < 42; i++) {
        const dd = new Date(start.getTime() + i * 86400000);
        const ds = dd.toISOString().slice(0, 10);
        cells.push({ d: ds, inMonth: ds.slice(0, 7) === month.value, today: ds === TODAY, acts: byDate.value[ds] || [] });
      }
      return cells;
    });
    const monthLabel = computed(() => { const [y, mo] = month.value.split('-'); return y + ' 年 ' + Number(mo) + ' 月'; });
    const mv = off => { const [y, mo] = month.value.split('-').map(Number); const dt = new Date(y, mo - 1 + off, 1); month.value = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0'); };
    const dayDlg = ref(false); const dayDate = ref(''); const dayActs = ref([]);
    const openDay = cell => { dayDate.value = cell.d; dayActs.value = cell.acts; dayDlg.value = true; };
    const listByDay = () => { d1.value = dayDate.value; d2.value = dayDate.value; dayDlg.value = false; view.value = 'list'; ElMessage.info('已按日期「' + dayDate.value + '」筛选列表'); };
    /* ---- 新增活动弹窗 ---- */
    const fref = ref(null); const dlg = ref(false);
    const draft = reactive({ type: '拜访', customer: '', contact: '', opp: '', owner: '张三', time: '', content: '' });
    const rule = {
      customer: [{ required: true, message: '请选择客户', trigger: 'change' }],
      time: [{ required: true, message: '请选择活动时间', trigger: 'change' }],
      content: [{ required: true, message: '请填写跟进内容', trigger: 'blur' }],
    };
    const custOpts = computed(() => store.customers.filter(c => c.status !== '流失'));
    const ctOpts = computed(() => draft.customer ? (store.ext.contacts || []).filter(c => c.customer === draft.customer).map(c => ({ v: c.name, l: c.name + ' · ' + (c.title || '') })) : []);
    const oppOpts = computed(() => draft.customer ? store.opps.filter(o => o.customer === draft.customer).map(o => ({ v: o.no, l: o.no + ' · ' + o.name })) : []);
    const save = () => fref.value.validate(ok => {
      if (!ok) return;
      const no = acNextNo();
      store.ext.activities.unshift({
        no, type: draft.type, customer: draft.customer, contact: draft.contact, opp: draft.opp, owner: draft.owner,
        time: draft.time, content: draft.content, feedback: '', result: '', plan: '', next: '', status: '计划中', checkin: null, files: [],
      });
      acLog(no, '新增', '新增' + draft.type + '活动（客户：' + draft.customer + '，时间：' + draft.time + '）');
      dlg.value = false;
      ElMessage.success('活动已创建（编号 ' + no + '，状态：计划中）');
      go('/activity/' + no);
    });
    return { view, d1, d2, rows, totalText, stats, cols, filters, onLink, month, calCells, monthLabel, mv, dayDlg, dayDate, dayActs, openDay, listByDay, AC_TAG, AC_RESULT_TAG, AC_STATUS_TAG, dlg, fref, draft, rule, custOpts, ctOpts, oppOpts, save, TODAY };
  },
  template: `<div>
    <list-page :crumbs="['活动管理','跟进活动']" title="跟进活动" :total-text="totalText" :stats="stats" :filters="filters" :rows="rows" :cols="cols" :action-width="140" note-tag="真实数据 · 点击编号进入详情"
      @link="onLink">
      <template #top>
        <div class="card query" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <el-radio-group v-model="view" size="small">
            <el-radio-button label="list"><el-icon style="vertical-align:-2px"><tickets/></el-icon> 列表</el-radio-button>
            <el-radio-button label="cal"><el-icon style="vertical-align:-2px"><calendar/></el-icon> 日历</el-radio-button>
          </el-radio-group>
          <el-date-picker v-model="d1" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" clearable style="width:150px" @change="v => { if(!v) d2 = ''; }"/>
          <span class="muted">至</span>
          <el-date-picker v-model="d2" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" clearable style="width:150px"/>
          <el-button v-if="d1 || d2" @click="d1='';d2=''">清除时间区间</el-button>
          <span class="grow muted" style="font-size:12px" v-if="d1 || d2">已按时间区间过滤，区间外活动暂不显示</span>
        </div>
        <div v-if="view==='cal'" class="card card-pad" style="margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <el-button size="small" icon="ArrowLeft" @click="mv(-1)">上月</el-button>
            <b style="font-size:16px">{{ monthLabel }}</b>
            <el-button size="small" @click="mv(1)">下月<el-icon><ArrowRight/></el-icon></el-button>
            <el-button size="small" @click="month = TODAY.slice(0,7)">回到本月</el-button>
            <span class="grow muted" style="font-size:12px">格子中数字为当日活动数，点击日期可查看当日活动详情</span>
          </div>
          <div class="ac-cal">
            <div class="ac-week muted" v-for="w in ['一','二','三','四','五','六','日']" :key="w">周{{ w }}</div>
            <div v-for="c in calCells" :key="c.d" class="ac-cell" :class="{out:!c.inMonth, today:c.today}" @click="openDay(c)">
              <div class="ac-d" :class="{caltoday:c.today, has:c.acts.length}">{{ Number(c.d.slice(8,10)) }}</div>
              <el-tag v-if="c.acts.length" size="small" effect="light" :type="c.acts.length > 3 ? 'danger' : 'primary'">{{ c.acts.length }} 场</el-tag>
              <div class="ac-min" v-else>&nbsp;</div>
              <div class="ac-sub muted" v-if="c.acts.length">
                <div v-for="(a,i) in c.acts.slice(0,2)" :key="a.no">{{ a.time.slice(11,16) }} {{ a.type }} · {{ (a.customer||'').slice(0,9) }}</div>
                <div v-if="c.acts.length > 2">… 等 {{ c.acts.length }} 项</div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #ops>
        <el-button type="primary" icon="Plus" @click="dlg=true">新增活动 / 拜访计划</el-button>
        <el-button icon="Download" @click="$msg.info('示例：导出跟进活动')">导出</el-button>
      </template>
      <template #actions="{row}">
        <el-button link type="primary" @click="$go('/activity/'+row.no)">查看</el-button>
        <el-button v-if="row.checkin" link @click="$msg.info('查看签到详情请进入活动详情页')">签到</el-button>
      </template>
    </list-page>
    <el-dialog v-model="dlg" title="新增活动 / 拜访计划" width="620px">
      <el-form ref="fref" :model="draft" :rules="rule" label-width="100px">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="活动类型">
            <el-select v-model="draft.type" style="width:100%">
              <el-option v-for="t in ['电话','微信','短信','拜访','会议','邮件','演示','培训','其他']" :key="t" :value="t"/>
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="负责人">
            <el-select v-model="draft.owner" style="width:100%"><el-option v-for="o in OWNERS" :key="o" :value="o"/></el-select>
          </el-form-item></el-col>
        </el-row>
        <el-form-item label="关联客户" prop="customer">
          <el-select v-model="draft.customer" filterable placeholder="选择客户（联系人 / 商机选项随客户联动）" style="width:100%" @change="draft.contact='';draft.opp=''">
            <el-option v-for="c in custOpts" :key="c.no" :label="c.name" :value="c.name"/>
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="关联联系人">
            <el-select v-model="draft.contact" clearable placeholder="可选" style="width:100%">
              <el-option v-for="c in ctOpts" :key="c.v" :label="c.l" :value="c.v"/>
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="关联商机">
            <el-select v-model="draft.opp" clearable placeholder="可选" style="width:100%">
              <el-option v-for="o in oppOpts" :key="o.v" :label="o.l" :value="o.v"/>
            </el-select>
          </el-form-item></el-col>
        </el-row>
        <el-form-item label="活动时间" prop="time">
          <el-date-picker v-model="draft.time" type="datetime" value-format="YYYY-MM-DD HH:mm" placeholder="如：2026-11-10 14:00" style="width:100%"/>
        </el-form-item>
        <el-form-item label="跟进内容" prop="content">
          <el-input v-model="draft.content" type="textarea" :rows="3" placeholder="拜访计划可写明目的与准备事项；跟进活动写沟通要义"/>
        </el-form-item>
        <el-alert type="info" show-icon :closable="false" title="新增活动默认状态为「计划中」；完成后在活动详情页「标记完成」并填写客户反馈。"/>
      </el-form>
      <template #footer><el-button @click="dlg=false">取消</el-button><el-button type="primary" @click="save">保存为计划中活动</el-button></template>
    </el-dialog>
    <el-dialog v-model="dayDlg" :title="dayDate + ' 的活动（' + dayActs.length + ' 场）'" width="560px">
      <el-empty v-if="!dayActs.length" description="当天暂无活动"/>
      <div v-else>
        <div v-for="a in dayActs" :key="a.no" style="display:flex;gap:10px;align-items:center;padding:9px 4px;border-bottom:1px dashed var(--line);cursor:pointer" @click="dayDlg=false;$go('/activity/'+a.no)">
          <b class="mono" style="width:44px">{{ a.time.slice(11,16) }}</b>
          <el-tag size="small" :type="AC_TAG[a.type]">{{ a.type }}</el-tag>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ a.customer }}<span class="muted" style="font-size:12px;margin-left:8px">{{ a.content }}</span></span>
          <el-tag size="small" :type="AC_STATUS_TAG[a.status]">{{ a.status }}</el-tag>
        </div>
        <div style="margin-top:12px;text-align:right"><el-button type="primary" plain @click="listByDay">在列表中筛选该日</el-button></div>
      </div>
    </el-dialog>
  </div>`,
};
registerRoute('/activities', ActivitiesPage, 'activities');

/* ===== 活动详情 /activity/:no ===== */
const ActivityDetailPage = {
  props: { no: String },
  setup(props) {
    const a = computed(() => store.ext.activities.find(x => x.no === props.no) || null);
    const cust = computed(() => a.value ? (store.customers.find(c => c.name === a.value.customer) || null) : null);
    const custNo = computed(() => cust.value ? cust.value.no : '');
    const contact = computed(() => a.value && a.value.contact ? store.ext.contacts.find(c => c.customer === a.value.customer && c.name === a.value.contact) || null : null);
    const opp = computed(() => a.value && a.value.opp ? store.opps.find(o => o.no === a.value.opp) || null : null);
    const doneDlg = ref(false); const doneRf = reactive({ feedback: '', result: '已联系', plan: '', next: '' });
    const doComplete = () => {
      if (!doneRf.feedback.trim()) return ElMessage.warning('客户反馈为必填，请填写沟通结果');
      const act = a.value;
      act.status = '已完成';
      act.feedback = doneRf.feedback.trim();
      act.result = doneRf.result;
      act.plan = doneRf.plan.trim();
      act.next = doneRf.next || '';
      if (act.type === '拜访' && !act.checkin) {
        const cu = cust.value || {};
        act.checkin = { lat: 31.99, lng: 118.75, addr: (cu.region || '') + '某某产业园', time: act.time, photo: 'img/checkin/' + act.no + '-1.jpg' };
      }
      acLog(act.no, '标记完成', '状态由「计划中」变为「已完成」；客户反馈：' + act.feedback.slice(0, 20) + (act.feedback.length > 20 ? '…' : ''));
      doneDlg.value = false;
      ElMessage.success('活动已完成，反馈已沉淀' + (act.next ? '，且已设置下一步跟进' : ''));
    };
    const cancel = () => ElMessageBox.prompt('取消后活动进入「已取消」状态（保留记录）。请填写取消原因（必填）：', '取消活动 ' + (a.value ? a.value.no : ''), { inputPattern: /\S+/, inputErrorMessage: '取消原因不能为空' })
      .then(({ value }) => { a.value.status = '已取消'; acLog(a.value.no, '取消', '取消原因：' + value); ElMessage.success('活动已取消'); }).catch(() => {});
    return { a, cust, custNo, contact, opp, doneDlg, doneRf, doComplete, cancel, AC_TAG, AC_RESULT_TAG, AC_STATUS_TAG, custByName, store };
  },
  template: `<div v-if="a">
    <el-breadcrumb separator="/" class="crumb"><el-breadcrumb-item><a @click="$go('/activities')">活动管理</a></el-breadcrumb-item><el-breadcrumb-item><a @click="$go('/activities')">跟进活动</a></el-breadcrumb-item><el-breadcrumb-item>{{ a.no }}</el-breadcrumb-item></el-breadcrumb>
    <div class="page-head"><h1>活动 {{ a.no }}</h1>
      <el-tag :type="AC_TAG[a.type]">{{ a.type }}</el-tag>
      <el-tag :type="AC_STATUS_TAG[a.status]">{{ a.status }}</el-tag>
      <el-tag v-if="a.result" :type="AC_RESULT_TAG[a.result]" effect="plain">跟进结果：{{ a.result }}</el-tag>
      <span class="total">{{ a.time }} · 负责人 {{ a.owner }}</span></div>
    <div class="ops" style="margin-top:-4px">
      <el-button v-if="a.status === '计划中'" type="primary" icon="Check" @click="doneDlg=true">标记完成</el-button>
      <el-button v-if="a.status === '计划中'" icon="CircleClose" @click="cancel">取消活动</el-button>
      <el-button icon="Printer" @click="$msg.info('示例：打印活动跟进单')">打印</el-button>
    </div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px;align-items:start">
      <div>
        <div class="card card-pad" style="margin-bottom:14px">
          <div class="sec-title">基本信息</div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="活动时间">{{ a.time }}</el-descriptions-item>
            <el-descriptions-item label="活动类型">{{ a.type }}</el-descriptions-item>
            <el-descriptions-item label="负责人">{{ a.owner }}</el-descriptions-item>
            <el-descriptions-item label="活动编号">{{ a.no }}</el-descriptions-item>
          </el-descriptions>
        </div>
        <div class="card card-pad" style="margin-bottom:14px">
          <div class="sec-title">跟进内容</div>
          <p style="margin:0;line-height:1.8">{{ a.content || '—' }}</p>
        </div>
        <div class="card card-pad" style="margin-bottom:14px">
          <div class="sec-title">客户反馈</div>
          <p v-if="a.feedback" style="margin:0;line-height:1.8">{{ a.feedback }}</p>
          <el-empty v-else :description="a.status === '计划中' ? '活动完成后填写客户反馈' : '该活动未记录客户反馈'" :image-size="70"/>
        </div>
        <div class="card card-pad" style="margin-bottom:14px">
          <div class="sec-title">下一步</div>
          <template v-if="a.plan || a.next">
            <div v-if="a.plan" style="margin-bottom:6px">
              <b class="muted" style="font-size:12px">下一步计划：</b>{{ a.plan }}
            </div>
            <el-tag v-if="a.next" type="warning" effect="light" size="large"><el-icon style="vertical-align:-2px"><bell/></el-icon> 下次跟进时间：{{ a.next }}</el-tag>
            <span class="muted" style="margin-left:8px;font-size:13px" v-if="a.next">到期后自动进入销售「待办」提醒</span>
          </template>
          <span v-else class="muted" style="font-size:13px">暂未设置下一步跟进计划</span>
        </div>
        <div class="card card-pad" style="margin-bottom:14px">
          <div class="sec-title">跟进附件</div>
          <template v-if="(a.files || []).length">
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <div v-for="f in a.files" :key="f" style="width:132px;height:96px;border:1px dashed var(--line);border-radius:8px;background:var(--soft);display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--sub);font-size:12px;gap:4px">
                <el-icon style="font-size:22px"><paperclip/></el-icon>{{ f.split('/').pop() }}
              </div>
            </div>
            <p class="muted" style="margin:8px 0 0;font-size:12px">附件支持图片 / 文件 / 录音，正式版本按字段权限与角色控制查看（原型以占位卡片代替）。</p>
          </template>
          <span v-else class="muted" style="font-size:13px">未上传附件</span>
        </div>
        <div class="card card-pad" v-if="a.type === '拜访'">
          <div class="sec-title">拜访签到信息</div>
          <template v-if="a.checkin">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="签到地址">{{ a.checkin.addr }}</el-descriptions-item>
              <el-descriptions-item label="签到时间">{{ a.checkin.time }}</el-descriptions-item>
              <el-descriptions-item label="经纬度（坐标占位）">{{ a.checkin.lat + ', ' + a.checkin.lng }}</el-descriptions-item>
              <el-descriptions-item label="签到方式">定位打卡（原型占位）</el-descriptions-item>
            </el-descriptions>
            <div style="display:flex;gap:12px;margin-top:12px">
              <div style="width:132px;height:96px;border:1px dashed var(--line);border-radius:8px;background:var(--soft);display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--sub);font-size:12px;gap:4px">
                <el-icon style="font-size:24px"><camera/></el-icon>现场照片·占位
              </div>
              <div>
                <p style="margin:2px 0;font-size:13px">照片文件：{{ a.checkin.photo }}</p>
                <p class="muted" style="margin:2px 0;font-size:12px">原型阶段以占位图代替真实照片；正式版本上传后显示现场照片与地图打点。</p>
                <el-button size="small" plain @click="$msg.info('示例：打开现场照片查看大图')">查看照片</el-button>
              </div>
            </div>
          </template>
          <el-empty v-else :description="a.status === '计划中' ? '拜访完成后签到；标记完成时自动生成签到占位记录' : '未记录签到信息'" :image-size="70"/>
        </div>
      </div>
      <div>
        <div class="card card-pad" style="margin-bottom:14px">
          <div class="sec-title">关联对象</div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="关联客户">
              <a v-if="cust" class="link" @click="$go('/customer/' + custNo)">{{ a.customer }}</a>
              <span v-else>{{ a.customer }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="客户等级" v-if="cust">{{ cust.level }}<el-tag v-if="cust.key" size="small" type="danger" effect="plain" style="margin-left:8px">重点</el-tag></el-descriptions-item>
            <el-descriptions-item label="关联联系人">
              <template v-if="contact"><a class="link" @click="$go('/contact/' + contact.no)">{{ a.contact }}</a><span class="muted" style="margin-left:6px;font-size:12px">{{ contact.title || '' }} · {{ contact.role || '' }}</span></template>
              <span v-else>{{ a.contact || '未关联' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="关联商机">
              <template v-if="opp"><a class="link" @click="$go('/opp/' + opp.no)">{{ a.opp }}</a><span class="muted" style="margin-left:6px;font-size:12px">{{ opp.name }} · 预计 ¥{{ opp.amount.toLocaleString('zh-CN') }}</span></template>
              <span v-else>未关联</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
        <el-alert v-if="a.status === '计划中'" type="warning" show-icon :closable="false" title="该活动尚未完成：完成后请填写客户反馈与下一步计划。"/>
        <el-alert v-else-if="a.status === '已取消'" type="info" show-icon :closable="false" title="该活动已取消，记录仅供查看。"/>
        <el-alert v-else type="success" show-icon :closable="false" :title="'已完成' + (a.next ? '，下一步跟进时间 ' + a.next : '')"/>
      </div>
    </div>
    <el-dialog v-model="doneDlg" title="标记完成（客户反馈必填）" width="520px">
      <el-form label-width="90px">
        <el-form-item label="客户反馈" required><el-input v-model="doneRf.feedback" type="textarea" :rows="3" placeholder="本次沟通的客户态度 / 结论 / 待办（写入活动记录）"/></el-form-item>
        <el-form-item label="跟进结果"><el-select v-model="doneRf.result" style="width:100%"><el-option v-for="r in ['已联系','待反馈','需求明确']" :key="r" :value="r"/></el-select></el-form-item>
        <el-form-item label="下一步计划"><el-input v-model="doneRf.plan" type="textarea" :rows="2" placeholder="下一次联系内容，如：发送方案补充材料并确认细节"/></el-form-item>
        <el-form-item label="下次跟进时间"><el-date-picker v-model="doneRf.next" type="datetime" value-format="YYYY-MM-DD HH:mm" placeholder="可选，到期自动生成待办" style="width:100%"/></el-form-item>
      </el-form>
      <template #footer><el-button @click="doneDlg=false">取消</el-button><el-button type="primary" @click="doComplete">确认完成</el-button></template>
    </el-dialog>
  </div>`,
};
registerRoute('/activity/:no', ActivityDetailPage, 'activity-detail');
