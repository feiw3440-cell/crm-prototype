/* ===== 第 3 阶段：联系人列表 /contacts + 联系人详情 /contact/:no ===== */
const custByName = name => store.customers.find(c => c.name === name);
const CONTACT_ROLES = ['决策人', '使用人', '采购人', '财务', '技术'];
const CONTACT_INFLS = ['高', '中', '低'];
const CONTACT_ATTS = ['支持者', '中立', '反对者'];
const CONTACT_ROLE_TAG = { 决策人: 'danger', 使用人: 'info', 采购人: 'warning', 财务: 'success', 技术: 'primary' };
const CONTACT_ATT_TAG = { 支持者: 'success', 中立: 'info', 反对者: 'danger' };
const genContactNo = () => {
  let seq = store.ext.contacts.length + 200; let no;
  do { no = 'LX-' + String(seq++).padStart(6, '0'); } while (store.ext.contacts.some(c => c.no === no));
  return no;
};

/* ----- 联系人列表 ----- */
const ContactsPage = {
  components: { ListPage },
  setup() {
    const rows = computed(() => store.ext.contacts.map(c => ({ ...c, keyT: c.key ? '是' : '否' })));
    const stats = computed(() => {
      const a = store.ext.contacts;
      return [['联系人总数', String(a.length), '', '来自 ' + store.customers.length + ' 家客户'], ['关键联系人', String(a.filter(c => c.key).length), 'ok'], ['支持者', String(a.filter(c => c.attitude === '支持者').length), ''], ['反对者', String(a.filter(c => c.attitude === '反对者').length), 'warn']];
    });
    const custOpts = computed(() => store.customers.map(c => c.name));
    const cols = [
      { p: 'name', l: '联系人姓名', w: 110, link: true }, { p: 'customer', l: '所属客户', w: 200, link: 'cust' }, { p: 'phone', l: '联系电话', w: 125 },
      { p: 'email', l: '电子邮箱', w: 180 }, { p: 'dept', l: '部门', w: 100 }, { p: 'title', l: '职务', w: 110 },
      { p: 'role', l: '联系人角色', w: 105, tag: CONTACT_ROLE_TAG }, { p: 'infl', l: '影响力', w: 80 },
      { p: 'attitude', l: '对我方态度', w: 100, tag: CONTACT_ATT_TAG }, { p: 'pref', l: '联系偏好', w: 90 }, { p: 'key', l: '关键联系人', w: 100, bool: true },
    ];
    const filters = computed(() => [
      { k: 'kw', label: '搜索联系人', ph: '姓名 / 电话 / 邮箱 / 客户' }, { k: 'customer', label: '所属客户', opts: custOpts.value },
      { k: 'role', label: '联系人角色', opts: CONTACT_ROLES }, { k: 'infl', label: '影响力', opts: CONTACT_INFLS },
      { k: 'attitude', label: '对我方态度', opts: CONTACT_ATTS }, { k: 'keyT', label: '关键联系人', opts: ['是', '否'] },
    ]);
    /* ---- 新增 / 编辑 / 删除 ---- */
    const fref = ref(null);
    const dlg = reactive({ open: false, edit: null });
    const f = reactive({});
    const rule = {
      name: [{ required: true, message: '请填写联系人姓名', trigger: 'blur' }],
      customer: [{ required: true, message: '请选择所属客户', trigger: 'change' }],
      phone: [{ required: true, message: '请填写联系电话', trigger: 'blur' }, { pattern: /^[0-9][0-9*\-]+$/, message: '电话格式不正确（允许数字 / * / -）', trigger: 'blur' }],
      email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
      role: [{ required: true, message: '请选择联系人角色', trigger: 'change' }],
    };
    const peerContacts = computed(() => store.ext.contacts.filter(c => c.customer === f.customer && c.no !== f.no));
    const openAdd = () => { dlg.edit = null; Object.assign(f, { no: '', name: '', customer: '', phone: '', email: '', dept: '', title: '', role: '使用人', infl: '中', pref: '电话', attitude: '中立', key: false, reportsTo: '', birthday: '', remark: '', owner: '张三' }); dlg.open = true; nextTick(() => fref.value && fref.value.clearValidate()); };
    const openEdit = row => { dlg.edit = store.ext.contacts.find(x => x.no === row.no) || row; Object.keys(f).forEach(k => delete f[k]); Object.assign(f, dlg.edit); dlg.open = true; nextTick(() => fref.value && fref.value.clearValidate()); };
    const save = () => fref.value.validate(ok => {
      if (!ok) return;
      const data = { ...f, key: !!f.key };
      delete data.keyT;
      if (dlg.edit) { Object.assign(dlg.edit, data); logsPush('编辑', data.name + '（' + data.customer + '）'); ElMessage.success('联系人已更新，列表已刷新'); }
      else { store.ext.contacts.unshift({ no: genContactNo(), ...data, keyT: data.key ? '是' : '否' }); logsPush('新建', data.name + '（' + data.customer + '）'); ElMessage.success('联系人已新增并写回数据'); }
      dlg.open = false;
    });
    const del = row => ElMessageBox.confirm(`确认删除联系人「${row.name}」（${row.customer}）？删除后将同步清理其汇报关系，操作记录日志。`, '删除联系人', { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }).then(() => {
      store.ext.contacts = store.ext.contacts.filter(c => c.no !== row.no);
      store.ext.contacts.forEach(c => { if (c.reportsTo === row.no) c.reportsTo = ''; });
      logsPush('删除', row.name + '（' + row.customer + '）');
      ElMessage.success('联系人已删除');
    }).catch(() => {});
    const logsPush = (act, d) => store.ext.logs.unshift({ time: TODAY + ' ' + new Date().toTimeString().slice(0, 5), who: '张三', module: '联系人', act, detail: d });
    const logsShow = computed(() => store.ext.logs.filter(x => x.module === '联系人').slice(0, 8).map(x => ({ t: x.time, who: x.who, act: x.act, d: x.detail })));
    return { rows, stats, cols, filters, dlg, f, fref, rule, peerContacts, openAdd, openEdit, save, del, logsShow, CONTACT_ROLES, CONTACT_INFLS, CONTACT_ATTS, OWNERS, store, go, fmtY };
  },
  template: `<div>
    <list-page :crumbs="['联系人管理','联系人列表']" title="联系人列表" :stats="stats" :filters="filters" :rows="rows" :cols="cols" :action-width="150" :total="'联系人共 ' + rows.length + ' 位（来自全部客户档案）'"
      @link="(c,row) => $go('/contact/'+row.no)">
      <template #ops><el-button type="primary" icon="Plus" @click="openAdd">新增联系人</el-button><el-button icon="Upload" @click="$msg.info('示例：导入联系人（查重 → 校验 → 反馈结果）')">导入</el-button><el-button icon="Download" @click="$msg.info('示例：导出联系人')">导出</el-button></template>
      <template #actions="{row,open}">
        <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button link type="primary" @click="$go('/contact/'+row.no)">详情</el-button>
        <el-button link type="danger" @click="del(row)">删除</el-button>
      </template>
    </list-page>
    <el-dialog v-model="dlg.open" :title="dlg.edit ? '编辑联系人 · ' + (dlg.edit.name||'') : '新增联系人'" width="640px">
      <el-form ref="fref" :model="f" :rules="rule" label-width="96px">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="联系人姓名" prop="name"><el-input v-model="f.name" placeholder="如 陈总监"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="所属客户" prop="customer"><el-select v-model="f.customer" filterable placeholder="请选择客户" style="width:100%"><el-option v-for="c in store.customers" :key="c.no" :label="c.name" :value="c.name"/></el-select></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="联系电话" prop="phone"><el-input v-model="f.phone" placeholder="139****1234"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="电子邮箱" prop="email"><el-input v-model="f.email" placeholder="name@example.com"/></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="部门"><el-input v-model="f.dept"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="职务"><el-input v-model="f.title"/></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="联系人角色" prop="role"><el-select v-model="f.role" style="width:100%"><el-option v-for="x in CONTACT_ROLES" :key="x" :label="x" :value="x"/></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="影响力"><el-select v-model="f.infl" style="width:100%"><el-option v-for="x in CONTACT_INFLS" :key="x" :label="x" :value="x"/></el-select></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="对我方态度"><el-select v-model="f.attitude" style="width:100%"><el-option v-for="x in CONTACT_ATTS" :key="x" :label="x" :value="x"/></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="联系偏好"><el-select v-model="f.pref" style="width:100%"><el-option v-for="x in ['电话','微信','邮件']" :key="x" :label="x" :value="x"/></el-select></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="汇报对象"><el-select v-model="f.reportsTo" clearable placeholder="该客户内联系人（可空）" style="width:100%"><el-option v-for="c in peerContacts" :key="c.no" :label="c.name + ' · ' + c.title" :value="c.no"/></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="负责人"><el-select v-model="f.owner" style="width:100%"><el-option v-for="o in OWNERS" :key="o" :value="o"/></el-select></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="生日"><el-date-picker v-model="f.birthday" type="date" value-format="YYYY-MM-DD" style="width:100%"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="关键联系人"><el-switch v-model="f.key" active-text="是" inactive-text="否"/></el-form-item></el-col>
        </el-row>
        <el-form-item label="备注"><el-input type="textarea" :rows="2" v-model="f.remark"/></el-form-item>
      </el-form>
      <el-alert type="info" show-icon :closable="false" title="保存后立即写回数据并反映到列表 / 所属客户详情 / 关系图。"/>
      <template #footer><el-button @click="dlg.open=false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
    <div class="card card-pad" style="margin-top:12px"><div class="card-title">最近操作日志</div>
      <el-table :data="logsShow" size="small" max-height="160"><el-table-column prop="t" label="时间" width="150"/><el-table-column prop="who" label="操作人" width="110"/><el-table-column prop="act" label="操作" width="90"/><el-table-column prop="d" label="详情" min-width="280"/></el-table>
    </div>
  </div>`,
};
registerRoute('/contacts', ContactsPage, 'contacts');

/* ----- 联系人详情 ----- */
const ContactDetail = {
  components: { PageHead, RelationGraph },
  props: { no: String },
  setup(props) {
    const c = computed(() => store.ext.contacts.find(x => x.no === props.no) || null);
    if (!store.ext.contacts.some(x => x.no === props.no)) { /* 不存在的编号：渲染空态，不报错 */ }
    const custNo = computed(() => c.value ? cno(c.value.customer) : '');
    const myOpps = computed(() => c.value ? store.opps.filter(o => o.customer === c.value.customer) : []);
    const myActs = computed(() => c.value ? store.ext.activities.filter(a => a.customer === c.value.customer && (!c.value.name || a.contact === c.value.name)) : []);
    const myQuotes = computed(() => c.value ? store.ext.quotes.filter(q => q.customer === c.value.customer) : []);
    const reportsToName = computed(() => { if (!c.value || !c.value.reportsTo) return ''; const p = store.ext.contacts.find(x => x.no === c.value.reportsTo); return p ? p.name + '（' + p.title + '）' : ''; });
    const peersOfSame = computed(() => c.value ? store.ext.contacts.filter(x => x.customer === c.value.customer && x.no !== c.value.no) : []);
    const myLogs = computed(() => c.value ? store.ext.logs.filter(x => x.module === '联系人' && (x.detail.includes(c.value.name) || x.detail.includes(c.value.no) || x.detail.includes(c.value.customer))).slice(0, 8).map(x => ({ t: x.time, who: x.who, act: x.act, d: x.detail })) : []);
    /* ---- 便捷小交互：快速改态度（与关系图一致的真实写回） ---- */
    const stTag = a => ({ 支持者: 'success', 中立: 'info', 反对者: 'danger' }[a] || 'info');
    return { c, custNo, myOpps, myActs, myQuotes, reportsToName, peersOfSame, myLogs, stTag, go, fmtY, fmtC };
  },
  template: `<div v-if="c">
    <el-breadcrumb separator="/" class="crumb"><el-breadcrumb-item><a @click="$go('/contacts')">联系人管理</a></el-breadcrumb-item><el-breadcrumb-item><a @click="$go('/contacts')">联系人列表</a></el-breadcrumb-item><el-breadcrumb-item>{{ c.name }}</el-breadcrumb-item></el-breadcrumb>
    <div class="card cust-head">
      <div class="cust-logo" style="border-radius:50%">{{ c.name.slice(0,1) }}</div>
      <div>
        <h2>{{ c.name }}<el-tag :type="c.role==='决策人'?'danger':'info'" size="small">{{ c.role }}</el-tag><el-tag :type="stTag(c.attitude)" size="small" effect="plain">{{ c.attitude }}</el-tag><el-tag v-if="c.key" type="warning" size="small" effect="plain">关键联系人</el-tag><el-tag type="primary" size="small" effect="plain">影响力 · {{ c.infl }}</el-tag></h2>
        <div class="cust-meta"><span>联系人编号：<b>{{ c.no }}</b></span><span>所属客户：<a class="link" @click="$go('/customer/'+custNo)">{{ c.customer }}</a></span><span>负责人：<b>{{ c.owner || '-' }}</b></span></div>
        <div style="margin-top:8px"><el-button size="small" type="primary" plain icon="Connection" @click="$msg.info('请在下方关系图「新增关系」中维护内部关系')">维护关系</el-button><el-button size="small" @click="$msg.info('示例：编辑联系人表单')"><el-icon><edit/></el-icon>编辑</el-button></div>
      </div>
      <div class="sum-cards"><div class="sum-card"><div class="v">{{ myOpps.length }}</div><div class="l">关联商机</div></div><div class="sum-card"><div class="v">{{ myActs.length }}</div><div class="l">跟进活动</div></div><div class="sum-card"><div class="v">{{ myQuotes.length }}</div><div class="l">客户报价</div></div></div>
    </div>
    <div class="card card-pad" style="margin-bottom:14px">
      <div class="card-title">基本信息</div>
      <el-descriptions :column="4" border size="default">
        <el-descriptions-item label="姓名">{{ c.name }}</el-descriptions-item><el-descriptions-item label="部门">{{ c.dept || '-' }}</el-descriptions-item><el-descriptions-item label="职务">{{ c.title || '-' }}</el-descriptions-item><el-descriptions-item label="联系人角色">{{ c.role }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ c.phone }}</el-descriptions-item><el-descriptions-item label="电子邮箱">{{ c.email || '-' }}</el-descriptions-item><el-descriptions-item label="联系偏好">{{ c.pref }}</el-descriptions-item><el-descriptions-item label="生日">{{ c.birthday || '-' }}</el-descriptions-item>
        <el-descriptions-item label="对我方态度"><el-tag :type="stTag(c.attitude)" size="small">{{ c.attitude }}</el-tag></el-descriptions-item><el-descriptions-item label="关键联系人">{{ c.key ? '是' : '否' }}</el-descriptions-item><el-descriptions-item label="汇报对象">{{ reportsToName || '（顶层）' }}</el-descriptions-item><el-descriptions-item label="关系备注">{{ c.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </div>
    <relation-graph :customer="c.customer" :current="c.no" height="330px"/>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;margin-top:14px">
      <div class="card card-pad"><div class="card-title">参与商机（所属客户）</div>
        <el-table v-if="myOpps.length" :data="myOpps" size="small"><el-table-column prop="no" label="商机编号" width="150"><template #default="{row}"><a class="link" @click="$go('/opp/'+row.no)">{{ row.no }}</a></template></el-table-column><el-table-column prop="name" label="商机名称" min-width="160" show-overflow-tooltip/><el-table-column label="预计金额" width="110" align="right"><template #default="{row}"><span class="money">¥{{ fmtY(row.amount) }}</span></template></el-table-column><el-table-column prop="owner" label="负责人" width="80"/></el-table>
        <el-empty v-else description="该客户暂无商机" :image-size="50"/>
      </div>
      <div class="card card-pad"><div class="card-title">历史沟通记录</div>
        <el-table v-if="myActs.length" :data="myActs" size="small"><el-table-column prop="time" label="时间" width="150"/><el-table-column prop="type" label="类型" width="70"/><el-table-column prop="content" label="跟进内容" min-width="200" show-overflow-tooltip/><el-table-column prop="owner" label="跟进人" width="80"/></el-table>
        <el-empty v-else description="该联系人暂无跟进记录" :image-size="50"/>
      </div>
    </div>
    <div class="card card-pad" style="margin-top:14px"><div class="card-title">操作日志</div>
      <el-table v-if="myLogs.length" :data="myLogs" size="small" max-height="220"><el-table-column prop="t" label="时间" width="160"/><el-table-column prop="who" label="操作人" width="100"/><el-table-column prop="act" label="操作" width="90"/><el-table-column prop="d" label="详情" min-width="280" show-overflow-tooltip/></el-table>
      <el-empty v-else description="该联系人暂无维护日志（新增/编辑/态度/关系变更后自动记录）" :image-size="50"/>
    </div>
  </div>
  <div v-else class="card card-pad" style="text-align:center;padding:70px 40px"><el-empty description="未找到该联系人（可能已被删除或编号输错）"><el-button type="primary" @click="$go('/contacts')">返回联系人列表</el-button></el-empty></div>`,
};
registerRoute('/contact/:no', ContactDetail, 'contact-detail');
