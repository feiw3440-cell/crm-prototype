/* ===== 第 6 阶段：系统管理（用户管理 / 角色权限 / 组织架构 / 操作日志） + 用户详情页 ===== */
const SYS_PAGES = { users: '用户管理', roles: '角色权限', org: '组织架构', dict: '字典管理', num: '编号规则', notify: '通知与提醒', logs: '操作日志' };
const SYS_TITLE = { users: '用户管理', roles: '角色权限', org: '组织架构', dict: '字典管理', num: '编号规则', notify: '通知与提醒', logs: '操作日志' };
const SYS_DATA_SCOPE = ['本人', '本部门', '本部门及下级', '全部'];
const SYS_MASK_OPTS = ['合同-成本价', '报价-毛利率', '回款-全部', '报价-折扣明细', '跟进-内容脱敏', '合同-金额明细', '回款-财务备注'];
const SYS_BTN_OPTS = ['新增', '编辑', '删除', '导出', '导入', '作废', '记录跟进', '折扣审批', '合同审批', '回款确认', '客户转移', '线索分配', '全部'];
const SYS_MENU_TREE = NAV.map(n => ({ label: n.title, children: n.children ? n.children.map(c => ({ label: c.title })) : [] }));
const sysNow = () => TODAY + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0');

const SystemPage = {
  components: { PageHead },
  props: { tab: { type: String, default: 'users' } },
  setup(props) {
    /* ---------- 用户管理 ---------- */
    const uQ = reactive({ kw: '', dept: '', role: '', status: '' });
    const uPage = ref(1), uSize = ref(10);
    const uDepts = computed(() => store.ext.depts.map(d => d.name));
    const uRoles = computed(() => store.ext.roles.map(r => r.name));
    const uFiltered = computed(() => store.ext.users.filter(u =>
      (!uQ.kw || [u.name, u.acc, u.email, u.phone].some(v => String(v || '').includes(uQ.kw))) &&
      (!uQ.dept || u.dept === uQ.dept) && (!uQ.role || u.role === uQ.role) && (!uQ.status || u.status === uQ.status)));
    const uPaged = computed(() => uFiltered.value.slice((uPage.value - 1) * uSize.value, uPage.value * uSize.value));
    watch(() => [uQ.kw, uQ.dept, uQ.role, uQ.status], () => { uPage.value = 1; });
    const uStats = computed(() => {
      const us = store.ext.users;
      return [['用户总数', String(us.length), ''], ['启用', String(us.filter(u => u.status === '启用').length), 'ok'],
        ['已停用', String(us.filter(u => u.status === '停用').length), 'warn'], ['角色数', String(store.ext.roles.length), '']];
    });
    const uDlg = reactive({ show: false, edit: '' });
    const uForm = reactive({ id: '', acc: '', name: '', dept: '', role: '', phone: '', email: '', status: '启用' });
    const uRules = {
      acc: [{ required: true, message: '请输入账号', trigger: 'blur' }],
      name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
      dept: [{ required: true, message: '请选择部门', trigger: 'change' }],
      role: [{ required: true, message: '请选择角色', trigger: 'change' }],
    };
    const uRef = ref(null);
    const uOpen = row => {
      Object.assign(uForm, row || { id: '', acc: '', name: '', dept: '', role: '', phone: '', email: '', status: '启用' }, { id: row ? row.id : '', status: row ? row.status : '启用' });
      uDlg.edit = row ? row.id : ''; uDlg.show = true;
    };
    const uSave = () => uRef.value.validate(ok => {
      if (!ok) return;
      const dup = store.ext.users.find(u => u.acc === uForm.acc && u.id !== uForm.id);
      if (dup) return ElMessage.warning('账号「' + uForm.acc + '」已存在（账号需唯一）');
      if (uForm.id) {
        const t = store.ext.users.find(u => u.id === uForm.id);
        Object.assign(t, { acc: uForm.acc, name: uForm.name, dept: uForm.dept, role: uForm.role, phone: uForm.phone, email: uForm.email, status: uForm.status });
        store.ext.logs.unshift({ time: sysNow(), who: '管理员', module: '系统', act: '编辑', detail: '编辑用户「' + uForm.name + '」（账号：' + uForm.acc + '）', ip: '10.20.0.5' });
      } else {
        let n = 1;
        store.ext.users.forEach(u => { const k = Number(String(u.id).slice(1)); if (k >= n) n = k + 1; });
        store.ext.users.push({ id: 'u' + String(n).padStart(2, '0'), acc: uForm.acc, name: uForm.name, dept: uForm.dept, role: uForm.role, phone: uForm.phone, email: uForm.email, status: uForm.status, lastLogin: '—' });
        store.ext.logs.unshift({ time: sysNow(), who: '管理员', module: '系统', act: '新建', detail: '新增用户「' + uForm.name + '」（账号：' + uForm.acc + '，角色：' + uForm.role + '）', ip: '10.20.0.5' });
      }
      uDlg.show = false; ElMessage.success('已保存并写回用户列表');
    });
    const uToggle = row => ElMessageBox.confirm(
      row.status === '启用' ? '停用后「' + row.name + '」将立即失去登录权限，进行中的审批不受影响。' : '启用后该用户恢复登录与数据访问权限。',
      row.status === '启用' ? '停用确认' : '启用确认', { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }).then(() => {
      row.status = row.status === '启用' ? '停用' : '启用';
      store.ext.logs.unshift({ time: sysNow(), who: '管理员', module: '系统', act: row.status === '停用' ? '停用' : '启用', detail: (row.status === '停用' ? '停用' : '启用') + '用户「' + row.name + '」', ip: '10.20.0.5' });
      ElMessage.success('已' + (row.status === '停用' ? '停用' : '启用') + '：' + row.name);
    }).catch(() => {});
    const uDrawer = reactive({ show: false, cur: null });
    const uShow = row => { uDrawer.cur = row; uDrawer.show = true; };
    const uLogs = computed(() => uDrawer.cur ? store.ext.logs.filter(l => l.who === uDrawer.cur.name).slice(0, 6) : []);

    /* ---------- 角色权限 ---------- */
    const roleK = ref('sales');
    const roleTree = ref(null);
    const role = computed(() => store.ext.roles.find(r => r.key === roleK.value) || store.ext.roles[0]);
    const rData = reactive({ desc: '', scope: '', btns: [], masks: [] });
    const roleMenus = ref([]);
    const syncChecked = () => {
      roleMenus.value = [];
      (role.value.menus || []).forEach(k => {
        roleMenus.value.push(k);
        SYS_MENU_TREE.forEach(n => {
          if (n.children && n.children.some(c => c.label === k)) roleMenus.value.push(n.label);
        });
      });
      if (roleTree.value) roleTree.value.setCheckedKeys([...new Set(roleMenus.value)]);
    };
    watch(roleK, () => {
      rData.desc = role.value.desc; rData.scope = role.value.dataScope;
      rData.btns = [...role.value.buttons]; rData.masks = [...role.value.fieldMask];
      nextTick(syncChecked);
    }, { immediate: true });
    const roleSave = () => {
      const ck = [...(roleTree.value ? roleTree.value.getCheckedKeys() : []), ...(roleTree.value ? roleTree.value.getHalfCheckedKeys() : [])];
      const r = role.value;
      r.menus = [...new Set(ck)];
      r.desc = rData.desc; r.dataScope = rData.scope; r.buttons = [...rData.btns]; r.fieldMask = [...rData.masks];
      store.ext.logs.unshift({ time: sysNow(), who: '管理员', module: '系统', act: '编辑', detail: '保存角色权限「' + r.name + '」（菜单 ' + r.menus.length + ' 项 · 数据范围：' + r.dataScope + '）', ip: '10.20.0.5' });
      ElMessage.success('角色「' + r.name + '」权限已保存并生效');
    };

    /* ---------- 组织架构 ---------- */
    const orgT = computed(() => {
      const nodes = {};
      store.ext.depts.forEach(d => { nodes[d.no] = { label: d.name, no: d.no, count: store.ext.users.filter(u => u.dept === d.name).length, children: [] }; });
      const roots = [];
      store.ext.depts.forEach(d => { if (d.parent && nodes[d.parent]) nodes[d.parent].children.push(nodes[d.no]); else roots.push(nodes[d.no]); });
      return roots;
    });
    const oDlg = ref(false);
    const oForm = reactive({ parent: '某某软件有限公司', name: '' });
    const oSave = () => {
      const name = (oForm.name || '').trim();
      if (!name) return ElMessage.warning('请输入部门名称');
      if (store.ext.depts.some(d => d.name === name)) return ElMessage.warning('部门「' + name + '」已存在');
      const parent = store.ext.depts.find(d => d.name === oForm.parent);
      let n = 0;
      store.ext.depts.forEach(d => { const k = Number(String(d.no).slice(1)); if (k >= n) n = k + 1; });
      store.ext.depts.push({ no: 'D' + String(n).padStart(2, '0'), name, parent: parent ? parent.no : 'D00' });
      store.ext.logs.unshift({ time: sysNow(), who: '管理员', module: '系统', act: '新建', detail: '新增部门「' + name + '」（上级：' + oForm.parent + '）', ip: '10.20.0.5' });
      oDlg.value = false; oForm.name = '';
      ElMessage.success('部门已创建并出现在组织架构树中');
    };

    /* ---------- 操作日志 ---------- */
    const lQ = reactive({ kw: '', who: '', module: '' });
    const lPage = ref(1), lSize = ref(10);
    const logAll = computed(() => store.ext.logs.slice().sort((a, b) => (a.time < b.time ? 1 : -1)));
    const lWho = computed(() => [...new Set(store.ext.logs.map(l => l.who))]);
    const lMod = computed(() => [...new Set(store.ext.logs.map(l => l.module))]);
    const lFiltered = computed(() => logAll.value.filter(l =>
      (!lQ.kw || (l.detail + l.act + l.module).includes(lQ.kw)) && (!lQ.who || l.who === lQ.who) && (!lQ.module || l.module === lQ.module)));
    const lPaged = computed(() => lFiltered.value.slice((lPage.value - 1) * lSize.value, lPage.value * lSize.value));
    watch(() => [lQ.kw, lQ.who, lQ.module], () => { lPage.value = 1; });
    const lStats = computed(() => {
      const a = store.ext.logs;
      return [['日志总数（示例周期）', String(a.length), ''], ['今日操作', String(a.filter(l => l.time.startsWith(TODAY)).length), 'ok'],
        ['系统模块操作', String(a.filter(l => l.module === '系统').length), ''], ['涉及操作人', String(new Set(a.map(l => l.who)).size), 'warn']];
    });
    const actTag = act => ({ 新建: 'success', 编辑: 'primary', 登录: 'info', 作废: 'danger', 回收: 'warning' }[act] || 'warning');

    const crumbs = computed(() => ['系统管理', SYS_PAGES[props.tab] || '用户管理']);
    const tabPath = { users: '/system', roles: '/system/roles', org: '/system/org', dict: '/system/dict', num: '/system/numbers', notify: '/system/notice', logs: '/system/logs' };
    const onTab = t => { if (tabPath[t]) go(tabPath[t]); };

    /* ---------- 字典管理（8.1 业务参数 / 第八章 字典管理） ---------- */
    const SYS_DICT_BASE = {
      线索来源: ['官网', '广告', '活动', '转介绍', '渠道'],
      客户类型: ['企业客户', '个人客户', '渠道客户'],
      客户等级: ['战略客户', '重点客户', '普通客户', '潜在客户'],
      客户行业: [...new Set(store.customers.map(c => c.industry).filter(Boolean))],
      客户状态: ['正常', '跟进中', '暂停合作', '流失'],
      客户规模: ['大型', '中型', '小型'],
      商机阶段: STAGES.map(s => s.name),
    };
    const dictCats = Object.keys(SYS_DICT_BASE);
    const dictK = ref('线索来源');
    const dictOff = reactive({});
    const dictExtra = reactive({});
    dictCats.forEach(k => { dictExtra[k] = []; SYS_DICT_BASE[k].forEach(v => { dictOff[k + '|' + v] = false; }); });
    const dictRows = computed(() => {
      const k = dictK.value, base = (SYS_DICT_BASE[k] || []).map(o => ({ val: o, base: true, prob: k === '商机阶段' ? (o === STAGES[5].name ? '赢单 100% / 输单 0%' : ((STAGES.find(s => s.name === o) || {}).prob || 0) + '%') : '' }));
      const extra = dictExtra[k].map(o => ({ val: o, base: false, prob: '' }));
      return base.concat(extra);
    });
    const dictAddV = ref('');
    const sysLog = (act, detail) => store.ext.logs.unshift({ time: sysNow(), who: '管理员', module: '系统', act, detail, ip: '10.20.0.5' });
    const dictIsOff = row => !!dictOff[dictK.value + '|' + row.val];
    const dictToggle = row => {
      const k = dictK.value + '|' + row.val;
      dictOff[k] = !dictOff[k];
      sysLog('编辑', (dictOff[k] ? '停用' : '启用') + '字典「' + dictK.value + '」选项「' + row.val + '」');
      ElMessage.success('已' + (dictOff[k] ? '停用' : '启用') + '选项「' + row.val + '」');
    };
    const dictDel = row => {
      if (row.base) return ElMessage.warning('内置字典选项不可删除，正式版删除前将校验引用（先停用）');
      dictExtra[dictK.value] = dictExtra[dictK.value].filter(o => o !== row.val);
      sysLog('删除', '删除字典「' + dictK.value + '」新增选项「' + row.val + '」'); ElMessage.success('已删除「' + row.val + '」');
    };
    const dictAdd = () => {
      const k = dictK.value, v = dictAddV.value.trim();
      if (!v) return ElMessage.warning('请输入选项名称');
      if ((SYS_DICT_BASE[k] || []).includes(v) || dictExtra[k].includes(v)) return ElMessage.warning('选项「' + v + '」已存在');
      dictExtra[k].push(v); dictOff[k + '|' + v] = false; dictAddV.value = '';
      sysLog('新建', '在字典「' + k + '」中新增选项「' + v + '」'); ElMessage.success('字典选项「' + v + '」已加入「' + k + '」');
    };

    /* ---------- 编号规则（第八章 编号规则 / 9.4 全局唯一编号） ---------- */
    const ntfChOpts = ['站内消息', '邮件', '短信'];
    const numRows = reactive([
      { name: '客户编号', prefix: 'KH', fmt: 'YYYY-MM', digits: 4 },
      { name: '联系人编号', prefix: 'LX', fmt: '无日期', digits: 6 },
      { name: '线索编号', prefix: 'XS', fmt: 'YYYY-MM', digits: 4 },
      { name: '商机编号', prefix: 'SJ', fmt: 'YYYY-MM', digits: 4 },
      { name: '报价编号', prefix: 'BJ', fmt: 'YYYY-MM', digits: 4 },
      { name: '合同编号', prefix: 'HT', fmt: 'YYYY-MM', digits: 4 },
      { name: '订单编号', prefix: 'DD', fmt: 'YYYY-MM', digits: 4 },
      { name: '工单编号', prefix: 'GD', fmt: 'YYYY-MM', digits: 4 },
      { name: '项目编号', prefix: 'XM', fmt: 'YYYY-MM', digits: 4 },
      { name: '活动编号', prefix: 'GJ', fmt: 'YYYYMMDD', digits: 3 },
    ]);
    const numEx = r => r.prefix + '-' + (r.fmt === 'YYYY-MM' ? TODAY.slice(0, 7) : r.fmt === 'YYYYMMDD' ? TODAY.replace(/-/g, '') : '') + '-' + extPad(1, r.digits);
    const numFmts = ['YYYY-MM', 'YYYYMMDD', '无日期'];
    const numSave = () => {
      sysLog('编辑', '保存编号规则（' + numRows.map(r => r.name + ' ' + numEx(r)).join('；') + '）');
      ElMessage.success('编号规则已保存，新单据按新规则取号（原型演示，写回正式编号服务）');
    };

    /* ---------- 通知与提醒（8.1 回款节点及逾期提醒 / 第十二章 自动提醒） ---------- */
    const ntfRows = reactive([
      { name: '客户超期未跟进提醒', on: true, days: 7, ch: ['站内消息', '邮件'], note: '超过天数无有效跟进时提醒客户负责人，与公海回收规则联动（公海规则页可配置回收阈值）' },
      { name: '商机停滞提醒', on: true, days: 14, ch: ['站内消息', '邮件'], note: '商机超过天数未推进时自动提醒负责人，支持经理介入（商机分析报表中的「停滞商机」）' },
      { name: '回款逾期提醒', on: true, days: 3, ch: ['站内消息', '邮件', '短信'], note: '计划回款日期前 N 天提醒客户负责人与财务，逾期后可配置升级提醒（回款管理 5.8）' },
      { name: '到期合同提醒', on: true, days: 30, ch: ['站内消息', '邮件'], note: '合同到期前 N 天提醒负责人，数据同步到合同分析报表「到期数量」' },
      { name: '工单 SLA 超时提醒', on: true, hours: 2, ch: ['站内消息'], note: '工单超过 SLA 剩余时限 N 小时提醒处理人，未处理升级通知主管（第十二章：客户投诉升级）' },
    ]);
    const ntfSave = () => {
      const onN = ntfRows.filter(n => n.on).length;
      sysLog('编辑', '保存通知与提醒规则：' + onN + ' 条启用 ' + ntfRows.map(n => n.name + (n.on ? '（' + (n.hours !== undefined ? 'SLA 前 ' + n.hours + ' 小时' : '提前 ' + n.days + ' 天') + '）' : '')).join('、'));
      ElMessage.success('提醒规则已保存：' + onN + ' 条启用，渠道含站内消息/邮件/短信');
    };

    return { crumbs, tabPath, onTab, SYS_MENU_TREE, SYS_BTN_OPTS, SYS_MASK_OPTS, SYS_DATA_SCOPE, store,
      uQ, uPage, uSize, uDepts, uRoles, uFiltered, uPaged, uStats, uDlg, uForm, uRef, uRules, uOpen, uSave, uToggle, uDrawer, uShow, uLogs, actTag,
      roleK, roleTree, role, rData, roleSave,
      orgT, oDlg, oForm, oSave,
      lQ, lPage, lSize, lWho, lMod, lFiltered, lPaged, lStats,
      dictCats, dictK, dictRows, dictIsOff, dictToggle, dictDel, dictAdd, dictAddV,
      numRows, numEx, numFmts, numSave, extPad,
      ntfRows, ntfChOpts, ntfSave, SYS_TITLE };
  },
  template: `<div>
    <page-head :crumbs="crumbs" :title="SYS_TITLE[tab] || '用户管理'" :total="tab==='users' ? ('用户共 '+uFiltered.length+' 人（真实分页）') : (tab==='logs' ? ('日志共 '+lFiltered.length+' 条') : '')">
      <el-button v-if="tab==='users'" type="primary" icon="Plus" @click="uOpen(null)">新增用户</el-button>
      <el-button v-if="tab==='org'" type="primary" icon="Plus" @click="oForm.parent='某某软件有限公司';oDlg=true">新增部门</el-button>
      <el-button v-if="tab==='logs'" icon="Download" @click="$msg.info('示例：导出操作日志（Excel）')">导出</el-button>
      <el-button v-if="tab==='roles'" type="primary" icon="Check" @click="roleSave">保存权限</el-button>
      <el-button v-if="tab==='num'" type="primary" icon="Check" @click="numSave">保存编号规则</el-button>
      <el-button v-if="tab==='notify'" type="primary" icon="Check" @click="ntfSave">保存提醒规则</el-button>
    </page-head>
    <el-tabs :model-value="tab" @tab-click="t => onTab(t.name)">
      <el-tab-pane name="users" label="用户管理"/>
      <el-tab-pane name="roles" label="角色权限"/>
      <el-tab-pane name="org" label="组织架构"/>
      <el-tab-pane name="dict" label="字典管理"/>
      <el-tab-pane name="num" label="编号规则"/>
      <el-tab-pane name="notify" label="通知与提醒"/>
      <el-tab-pane name="logs" label="操作日志"/>
    </el-tabs>

    <!-- 用户管理 -->
    <template v-if="tab==='users'">
      <div class="stat-row" style="grid-template-columns:repeat(4,1fr)">
        <div class="stat-card" v-for="s in uStats" :key="s[0]" :class="s[2]"><span class="lb">{{ s[0] }}</span><span class="vl">{{ s[1] }}</span><span class="ft">实时统计</span></div>
      </div>
      <div class="card query">
        <el-form inline>
          <el-form-item label="搜索"><el-input v-model="uQ.kw" placeholder="姓名 / 账号 / 邮箱" prefix-icon="Search" clearable style="width:220px"/></el-form-item>
          <el-form-item label="部门"><el-select v-model="uQ.dept" placeholder="全部" clearable style="width:160px"><el-option v-for="d in uDepts" :key="d" :label="d" :value="d"/></el-select></el-form-item>
          <el-form-item label="角色"><el-select v-model="uQ.role" placeholder="全部" clearable style="width:140px"><el-option v-for="r in uRoles" :key="r" :label="r" :value="r"/></el-select></el-form-item>
          <el-form-item label="状态"><el-select v-model="uQ.status" placeholder="全部" clearable style="width:110px"><el-option label="启用" value="启用"/><el-option label="停用" value="停用"/></el-select></el-form-item>
        </el-form>
      </div>
      <div class="card table-card">
        <el-table :data="uPaged" style="width:100%" :header-cell-style="{height:'42px'}" empty-text="没有符合条件的用户">
          <el-table-column prop="acc" label="账号" min-width="110"/><el-table-column prop="name" label="姓名" min-width="100"/>
          <el-table-column prop="dept" label="所属部门" min-width="140"/><el-table-column prop="role" label="角色" min-width="110"/>
          <el-table-column prop="phone" label="联系电话" min-width="120"/>
          <el-table-column prop="lastLogin" label="最近登录" min-width="150"/>
          <el-table-column prop="status" label="状态" min-width="90"><template #default="{row}"><el-tag size="small" :type="row.status==='启用'?'success':'info'" effect="light">{{ row.status }}</el-tag></template></el-table-column>
          <el-table-column label="操作" fixed="right" min-width="190">
            <template #default="{row}">
              <el-button link type="primary" @click="uShow(row)">查看</el-button>
              <el-button link type="primary" @click="uOpen(row)">编辑</el-button>
              <el-button link :type="row.status==='启用'?'danger':'success'" @click="uToggle(row)">{{ row.status==='启用'?'停用':'启用' }}</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pager"><span class="batch">共 {{ uFiltered.length }} 条</span>
          <el-pagination v-model:current-page="uPage" v-model:page-size="uSize" :page-sizes="[10,20,50]" layout="sizes, prev, pager, next, jumper" :total="uFiltered.length" background size="small"/></div>
      </div>
      <el-drawer v-model="uDrawer.show" :title="'用户详情 · ' + (uDrawer.cur ? uDrawer.cur.name : '')" size="460px" destroy-on-close>
        <el-descriptions v-if="uDrawer.cur" :column="1" border>
          <el-descriptions-item v-for="f in [['id','用户ID'],['acc','账号'],['name','姓名'],['dept','部门'],['role','角色'],['phone','电话'],['email','邮箱'],['status','状态'],['lastLogin','最近登录']]" :key="f[0]" :label="f[1]">{{ uDrawer.cur[f[0]] || '—' }}</el-descriptions-item>
        </el-descriptions>
        <div class="sec-title" style="margin-top:16px">操作日志（本人）</div>
        <div v-if="uLogs.length" style="display:flex;flex-direction:column;gap:6px">
          <div v-for="(l,i) in uLogs" :key="i" style="padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--soft)">
            <div style="display:flex;gap:8px;align-items:center"><el-tag size="small" :type="actTag(l.act)" effect="light">{{ l.act }}</el-tag><span class="muted" style="font-size:12px">{{ l.time }}</span></div>
            <div style="font-size:13px;margin-top:3px">{{ l.detail }}</div>
          </div>
        </div>
        <div v-else class="muted" style="font-size:13px">该用户暂无操作日志</div>
        <div style="margin-top:16px;display:flex;gap:8px">
          <el-button type="primary" :disabled="!uDrawer.cur" @click="$go('/system/user/' + uDrawer.cur.id)">进入完整详情页</el-button>
          <el-button @click="uDrawer.show=false">关闭</el-button>
        </div>
      </el-drawer>
    </template>

    <!-- 角色权限 -->
    <template v-else-if="tab==='roles'">
      <div style="display:grid;grid-template-columns:240px minmax(0,1fr);gap:14px;align-items:start">
        <div class="card">
          <div v-for="r in store.ext.roles" :key="r.key" @click="roleK=r.key"
            style="padding:12px 14px;border-bottom:1px solid var(--line);cursor:pointer;display:flex;flex-direction:column;gap:2px"
            :style="roleK===r.key ? 'background:var(--el-color-primary-light-9);border-left:3px solid var(--el-color-primary)' : 'border-left:3px solid transparent'">
            <div style="display:flex;align-items:center;gap:8px"><b style="font-size:14px">{{ r.name }}</b></div>
            <div class="muted" style="font-size:12px;line-height:1.5">{{ r.desc }}</div>
          </div>
        </div>
        <div class="card card-pad" v-if="role">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <h3 style="margin:0;font-size:16px">{{ role.name }}</h3>
            <el-tag size="small" effect="plain">启用成员 {{ store.ext.users.filter(u => u.role === role.name && u.status === '启用').length }} 人</el-tag>
            <span class="muted" style="margin-left:auto;font-size:12px">保存后对该角色全部成员立即生效</span>
          </div>
          <el-form label-width="110px">
            <el-form-item label="菜单权限">
              <el-tree ref="roleTree" :data="SYS_MENU_TREE" show-checkbox node-key="label" default-expand-all
                :expand-on-click-node="false" :check-strictly="false"
                style="border:1px solid var(--line);border-radius:8px;padding:8px;min-width:420px"/>
              <div class="muted" style="font-size:12px;margin-top:4px">勾选父级时自动包含子菜单；保存时合并半勾选父级。</div>
            </el-form-item>
            <el-form-item label="数据权限">
              <el-radio-group v-model="rData.scope"><el-radio-button v-for="s in SYS_DATA_SCOPE" :key="s" :label="s">{{ s }}</el-radio-button></el-radio-group>
            </el-form-item>
            <el-form-item label="按钮权限">
              <el-checkbox-group v-model="rData.btns">
                <el-checkbox v-for="b in SYS_BTN_OPTS" :key="b" :label="b">{{ b }}</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="字段脱敏">
              <el-checkbox-group v-model="rData.masks">
                <el-checkbox v-for="m in SYS_MASK_OPTS" :key="m" :label="m">{{ m }}</el-checkbox>
              </el-checkbox-group>
              <div class="muted" style="font-size:12px">示例：勾选「合同-成本价」后，该角色在列表/详情中成本价显示为 ****。</div>
            </el-form-item>
            <el-form-item label="角色说明"><el-input v-model="rData.desc" type="textarea" :rows="2" style="max-width:560px"/></el-form-item>
          </el-form>
          <div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--line)">
            <el-button type="primary" icon="Check" @click="roleSave">保存权限</el-button>
            <el-button @click="$msg.info('示例：恢复默认权限')">恢复默认</el-button>
          </div>
        </div>
      </div>
    </template>

    <!-- 组织架构 -->
    <template v-else-if="tab==='org'">
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:14px;align-items:start">
        <div class="card card-pad">
          <div class="card-title">组织架构树 <span class="muted" style="font-weight:400;font-size:12px">共 {{ store.ext.depts.length }} 个部门 · 点击部门名可展开</span></div>
          <el-tree :data="orgT" node-key="no" default-expand-all :expand-on-click-node="false" class="org-tree">
            <template #default="{ data }">
              <div style="display:flex;align-items:center;gap:8px;flex:1;padding-right:10px">
                <el-icon style="color:var(--el-color-primary)"><office-building/></el-icon>
                <span>{{ data.label }}</span>
                <el-tag size="small" type="info" effect="plain" v-if="data.count">{{ data.count }} 人</el-tag>
                <span class="link" style="margin-left:auto;font-size:12px" @click.stop="oForm.parent=data.label;oDlg=true">＋ 新建子部门</span>
              </div>
            </template>
          </el-tree>
        </div>
        <div class="card card-pad">
          <div class="card-title">部门概览</div>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="部门总数">{{ store.ext.depts.length }}</el-descriptions-item>
            <el-descriptions-item label="一级部门">{{ orgT.length }}</el-descriptions-item>
            <el-descriptions-item label="有成员的部门">{{ store.ext.depts.filter(d => store.ext.users.some(u => u.dept === d.name)).length }}</el-descriptions-item>
            <el-descriptions-item label="未挂载成员的部门">{{ store.ext.depts.filter(d => !store.ext.users.some(u => u.dept === d.name)).length }}</el-descriptions-item>
          </el-descriptions>
          <el-alert type="info" show-icon :closable="false" style="margin-top:12px" title="说明" description="新增部门写回部门表并立即出现在树中；可在用户管理里把用户改属新部门。"/>
        </div>
      </div>
    </template>

    <!-- 字典管理（8.1 业务参数 / 第八章 字典管理） -->
    <template v-else-if="tab==='dict'">
      <div style="display:grid;grid-template-columns:220px minmax(0,1fr);gap:14px;align-items:start">
        <div class="card">
          <div v-for="k in dictCats" :key="k" @click="dictK=k"
            style="padding:12px 14px;border-bottom:1px solid var(--line);cursor:pointer"
            :style="dictK===k ? 'background:var(--el-color-primary-light-9);border-left:3px solid var(--el-color-primary)' : 'border-left:3px solid transparent'">
            <b style="font-size:14px">{{ k }}</b>
            <div class="muted" style="font-size:12px;margin-top:2px">{{ k === '商机阶段' ? '阶段与概率（8.1）' : '枚举选项配置' }}</div>
          </div>
        </div>
        <div class="card table-card">
          <div style="padding:12px 14px;display:flex;align-items:center;gap:10px">
            <span class="sec-title" style="margin:0">「{{ dictK }}」选项</span>
            <span class="muted" style="font-size:12px">停用的选项不再出现在相关表单中（原型演示，正式版同步新表表单与导入模板）；商机阶段默认赢率为原型假设，待业务确认，需要在阶段配置中调整（8.1）。</span>
          </div>
          <div style="padding:0 14px 12px;display:flex;gap:8px">
            <el-input v-model="dictAddV" placeholder="新增选项名称，如：抖音" style="width:220px" @keyup.enter="dictAdd"/>
            <el-button type="primary" icon="Plus" @click="dictAdd">新增选项</el-button>
          </div>
          <el-table :data="dictRows" style="width:100%" :header-cell-style="{height:'42px'}" :empty-text="'「' + dictK + '」暂无选项'">
            <el-table-column prop="val" label="选项值" min-width="180"/>
            <el-table-column label="附加信息" min-width="150"><template #default="{row}"><span v-if="row.prob">默认赢率 {{ row.prob }}</span><span v-else class="muted">—</span></template></el-table-column>
            <el-table-column label="状态" min-width="90"><template #default="{row}"><el-tag size="small" :type="dictIsOff(row)?'info':'success'" effect="light">{{ dictIsOff(row)?'停用':'启用' }}</el-tag></template></el-table-column>
            <el-table-column label="操作" min-width="150">
              <template #default="{row}">
                <el-button link :type="dictIsOff(row)?'success':'warning'" @click="dictToggle(row)">{{ dictIsOff(row)?'启用':'停用' }}</el-button>
                <el-button link type="danger" :disabled="row.base" @click="dictDel(row)">删除</el-button>
                <span v-if="row.base" class="muted" style="font-size:12px;margin-left:6px">内置</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </template>

    <!-- 编号规则（9.4 全局唯一编号） -->
    <template v-else-if="tab==='num'">
      <div class="card table-card">
        <div style="padding:12px 14px">
          <span class="sec-title" style="margin:0">编号规则</span>
          <span class="muted" style="font-size:12px;margin-left:8px">客户、商机、合同、订单等对象全局唯一编号（9.4）；修改只影响之后的新单据，历史数据不变。</span>
        </div>
        <el-table :data="numRows" style="width:100%" :header-cell-style="{height:'42px'}">
          <el-table-column prop="name" label="对象" min-width="120"/>
          <el-table-column prop="prefix" label="前缀" min-width="80"><template #default="{row}"><span class="mono">{{ row.prefix }}</span></template></el-table-column>
          <el-table-column label="日期格式" min-width="140">
            <template #default="{row}">
              <el-select v-model="row.fmt" style="width:120px" size="small"><el-option v-for="f in numFmts" :key="f" :label="f" :value="f"/></el-select>
            </template>
          </el-table-column>
          <el-table-column label="序号位数" min-width="120">
            <template #default="{row}">
              <el-select v-model="row.digits" style="width:100px" size="small"><el-option :label="'3 位'" :value="3"/><el-option :label="'4 位'" :value="4"/><el-option :label="'6 位'" :value="6"/></el-select>
            </template>
          </el-table-column>
          <el-table-column label="规则示例" min-width="180"><template #default="{row}"><span class="mono">{{ numEx(row) }}</span></template></el-table-column>
          <el-table-column label="说明" min-width="220"><template #default="{row}"><span class="muted" style="font-size:12px">{{ {无日期: '连续序号，不分周期'}[row.fmt] || '按 ' + row.fmt + ' 月份重置序号' }}</span></template></el-table-column>
        </el-table>
      </div>
      <el-alert type="info" show-icon :closable="false" style="margin-top:14px" title="说明" description="保存后新单据按新规则取号并保持全局唯一（原型演示由前端写示例日志；正式版编号在校验唯一后写入）。"/>
    </template>

    <!-- 通知与提醒（8.1 / 12 章 自动化提醒规则） -->
    <template v-else-if="tab==='notify'">
      <div class="card table-card">
        <div style="padding:12px 14px">
          <span class="sec-title" style="margin:0">自动化提醒规则</span>
          <span class="muted" style="font-size:12px;margin-left:8px">每条规则支持启用/停用、阈值与通知渠道（站内消息 / 邮件 / 短信）；执行结果进入站内消息与操作日志。</span>
        </div>
        <el-table :data="ntfRows" style="width:100%" :header-cell-style="{height:'42px'}">
          <el-table-column prop="name" label="提醒规则" min-width="170"/>
          <el-table-column label="启用" width="80"><template #default="{row}"><el-switch v-model="row.on"/></template></el-table-column>
          <el-table-column label="阈值" min-width="150">
            <template #default="{row}">
              <span v-if="row.hours !== undefined" style="display:flex;align-items:center;gap:6px"><el-input-number v-model="row.hours" :min="1" :max="72" size="small" style="width:100px"/>小时</span>
              <span v-else style="display:flex;align-items:center;gap:6px"><el-input-number v-model="row.days" :min="1" :max="90" size="small" style="width:100px"/>天</span>
            </template>
          </el-table-column>
          <el-table-column label="通知渠道" min-width="200">
            <template #default="{row}"><el-checkbox-group v-model="row.ch" size="small"><el-checkbox v-for="c in ntfChOpts" :key="c" :label="c">{{ c }}</el-checkbox></el-checkbox-group></template>
          </el-table-column>
          <el-table-column prop="note" label="规则说明" min-width="330" show-overflow-tooltip/>
        </el-table>
      </div>
      <el-alert type="info" show-icon :closable="false" style="margin-top:14px" title="说明" description="客户/线索回收周期、商机阶段默认赢率（10/25/45/65/85，赢单 100 / 输单 0，原型假设，待业务确认）等业务参数在公海规则与字典管理中配置；本页规则触发后写入操作日志，超时升级按规则通知主管（第十二章）。"/>
    </template>

    <!-- 操作日志 -->
    <template v-else-if="tab==='logs'">
      <div class="stat-row" style="grid-template-columns:repeat(4,1fr)">
        <div class="stat-card" v-for="s in lStats" :key="s[0]" :class="s[2]"><span class="lb">{{ s[0] }}</span><span class="vl">{{ s[1] }}</span><span class="ft">可追溯审计</span></div>
      </div>
      <div class="card query">
        <el-form inline>
          <el-form-item label="搜索"><el-input v-model="lQ.kw" placeholder="操作内容 / 动作" prefix-icon="Search" clearable style="width:220px"/></el-form-item>
          <el-form-item label="操作人"><el-select v-model="lQ.who" placeholder="全部" clearable filterable style="width:140px"><el-option v-for="w in lWho" :key="w" :label="w" :value="w"/></el-select></el-form-item>
          <el-form-item label="模块"><el-select v-model="lQ.module" placeholder="全部" clearable style="width:130px"><el-option v-for="m in lMod" :key="m" :label="m" :value="m"/></el-select></el-form-item>
        </el-form>
      </div>
      <div class="card table-card">
        <el-table :data="lPaged" style="width:100%" :header-cell-style="{height:'42px'}" empty-text="没有符合条件的操作日志">
          <el-table-column prop="time" label="操作时间" min-width="165"/><el-table-column prop="who" label="操作人" min-width="90"/>
          <el-table-column prop="module" label="模块" min-width="80"><template #default="{row}"><el-tag size="small" effect="plain">{{ row.module }}</el-tag></template></el-table-column>
          <el-table-column prop="act" label="动作" min-width="80"><template #default="{row}"><el-tag size="small" :type="actTag(row.act)" effect="light">{{ row.act }}</el-tag></template></el-table-column>
          <el-table-column prop="detail" label="操作内容" min-width="320" show-overflow-tooltip/>
          <el-table-column prop="ip" label="来源 IP" min-width="110"/>
        </el-table>
        <div class="pager"><span class="batch">共 {{ lFiltered.length }} 条</span>
          <el-pagination v-model:current-page="lPage" v-model:page-size="lSize" :page-sizes="[10,20,50]" layout="sizes, prev, pager, next, jumper" :total="lFiltered.length" background size="small"/></div>
      </div>
    </template>

    <el-dialog v-model="oDlg" title="新增部门" width="420px">
      <el-form label-width="90px">
        <el-form-item label="上级部门" required>
          <el-select v-model="oForm.parent" filterable style="width:100%">
            <el-option v-for="d in store.ext.depts" :key="d.no" :label="d.name" :value="d.name"/>
          </el-select>
        </el-form-item>
        <el-form-item label="部门名称" required><el-input v-model="oForm.name" placeholder="如：华东销售三部" maxlength="20"/></el-form-item>
      </el-form>
      <template #footer><el-button @click="oDlg=false">取消</el-button><el-button type="primary" @click="oSave">创建</el-button></template>
    </el-dialog>

    <el-dialog v-model="uDlg.show" :title="uDlg.edit ? '编辑用户' : '新增用户'" width="560px" destroy-on-close>
      <el-form ref="uRef" :model="uForm" :rules="uRules" label-width="100px">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="账号" prop="acc"><el-input v-model="uForm.acc" placeholder="登录账号（唯一）" :disabled="!!uForm.id"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="姓名" prop="name"><el-input v-model="uForm.name"/></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="所属部门" prop="dept"><el-select v-model="uForm.dept" filterable style="width:100%"><el-option v-for="d in store.ext.depts" :key="d.no" :label="d.name" :value="d.name"/></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="角色" prop="role"><el-select v-model="uForm.role" style="width:100%"><el-option v-for="r in store.ext.roles" :key="r.key" :label="r.name" :value="r.name"/></el-select></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="联系电话"><el-input v-model="uForm.phone"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="邮箱"><el-input v-model="uForm.email"/></el-form-item></el-col>
        </el-row>
        <el-form-item label="状态"><el-radio-group v-model="uForm.status"><el-radio label="启用"/><el-radio label="停用"/></el-radio-group></el-form-item>
      </el-form>
      <el-alert type="info" show-icon :closable="false" title="保存即写回用户列表与操作日志（角色决定菜单/按钮/数据范围权限）。"/>
      <template #footer><el-button @click="uDlg.show=false">取消</el-button><el-button type="primary" @click="uSave">保存</el-button></template>
    </el-dialog>
  </div>`,
};

/* ---------- 用户详情页 /system/user/:id ---------- */
const UserDetailPage = {
  components: { PageHead },
  props: { id: String },
  setup(props) {
    const user = computed(() => store.ext.users.find(u => u.id === props.id) || null);
    const role = computed(() => user.value ? store.ext.roles.find(r => r.name === user.value.role) : null);
    const logs = computed(() => user.value ? store.ext.logs.filter(l => l.who === user.value.name).slice().sort((a, b) => (a.time < b.time ? 1 : -1)).slice(0, 12) : []);
    const deptName = computed(() => user.value ? user.value.dept : '');
    return { user, role, logs, deptName, SYS_DATA_SCOPE };
  },
  template: `<div>
    <page-head :crumbs="[{t:'系统管理',to:'/system'}, '用户详情 · ' + (user ? user.name : '')]" title="用户详情" v-if="user">
      <el-button icon="Back" @click="$go('/system')">返回用户管理</el-button>
    </page-head>
    <el-empty v-if="!user" description="用户不存在（可能已被删除）"><el-button type="primary" @click="$go('/system')">返回用户管理</el-button></el-empty>
    <template v-if="user">
      <div class="cust-head" style="background:var(--card);border:1px solid var(--line);border-radius:10px">
        <div class="cust-logo">{{ user.name.slice(0,1) }}</div>
        <div>
          <h2>{{ user.name }}<el-tag size="small" :type="user.status==='启用'?'success':'info'" effect="light" style="margin-left:8px">{{ user.status }}</el-tag></h2>
          <div class="cust-meta"><span>账号：<b>{{ user.acc }}</b></span><span>角色：<b>{{ user.role }}</b></span><span>部门：<b>{{ user.dept }}</b></span><span>最近登录：<b>{{ user.lastLogin }}</b></span></div>
        </div>
        <div class="sum-cards">
          <div class="sum-card"><div class="v">{{ logs.length }}</div><div class="l">相关操作日志</div></div>
          <div class="sum-card"><div class="v">{{ role ? role.menus.length : 0 }}</div><div class="l">可访问菜单</div></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px">
        <div class="card card-pad">
          <div class="card-title">基本信息</div>
          <el-descriptions :column="1" border>
            <el-descriptions-item v-for="f in [['acc','账号'],['name','姓名'],['dept','所属部门'],['role','角色'],['phone','联系电话'],['email','邮箱'],['status','状态'],['lastLogin','最近登录']]" :key="f[0]" :label="f[1]">{{ user[f[0]] || '—' }}</el-descriptions-item>
          </el-descriptions>
          <div style="margin-top:14px;display:flex;gap:8px">
            <el-button type="primary" icon="Edit" @click="$msg.info('示例：编辑用户（在用户管理内完成）')">编辑</el-button>
            <el-button icon="Key" @click="$msg.info('示例：重置密码（重置后通过邮件通知）')">重置密码</el-button>
          </div>
        </div>
        <div class="card card-pad">
          <div class="card-title">角色权限摘要（{{ role ? role.name : '—' }}）</div>
          <el-descriptions :column="1" border v-if="role">
            <el-descriptions-item label="数据权限">{{ role.dataScope }}</el-descriptions-item>
            <el-descriptions-item label="角色说明">{{ role.desc }}</el-descriptions-item>
            <el-descriptions-item label="菜单权限">{{ role.menus.join('、') || '—' }}</el-descriptions-item>
            <el-descriptions-item label="按钮权限">{{ role.buttons.join('、') || '—' }}</el-descriptions-item>
            <el-descriptions-item label="字段脱敏">{{ role.fieldMask && role.fieldMask.length ? role.fieldMask.join('、') : '无' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      <div class="card table-card" style="margin-top:14px">
        <div style="padding:10px 12px 0"><span class="sec-title" style="margin:0">本人的操作日志</span></div>
        <el-table :data="logs" style="width:100%" :header-cell-style="{height:'42px'}" empty-text="暂无相关日志">
          <el-table-column prop="time" label="操作时间" min-width="165"/><el-table-column prop="module" label="模块" min-width="80"/>
          <el-table-column prop="act" label="动作" min-width="80"><template #default="{row}"><el-tag size="small" effect="light">{{ row.act }}</el-tag></template></el-table-column>
          <el-table-column prop="detail" label="操作内容" min-width="320" show-overflow-tooltip/><el-table-column prop="ip" label="来源 IP" min-width="110"/>
        </el-table>
      </div>
    </template>
  </div>`,
};

registerRoute('/system', SystemPage, 'system', () => ({ tab: 'users' }));
registerRoute('/system/roles', SystemPage, 'system', () => ({ tab: 'roles' }));
registerRoute('/system/org', SystemPage, 'system', () => ({ tab: 'org' }));
registerRoute('/system/dict', SystemPage, 'system', () => ({ tab: 'dict' }));
registerRoute('/system/numbers', SystemPage, 'system', () => ({ tab: 'num' }));
registerRoute('/system/notice', SystemPage, 'system', () => ({ tab: 'notify' }));
registerRoute('/system/logs', SystemPage, 'system', () => ({ tab: 'logs' }));
registerRoute('/system/user/:id', UserDetailPage, 'user-detail');
