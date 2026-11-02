const App = {
  components: { DocPanel },
  setup() {
    const parse = () => { const h = (location.hash || '#/workbench').slice(1); return h || '/workbench'; };
    const path = ref(parse());
    window.addEventListener('hashchange', () => { path.value = parse(); document.querySelector('.main') && (document.querySelector('.main').scrollTop = 0); });
    const view = computed(() => {
      const m = matchRoute(path.value);
      if (m) return { comp: m.comp, props: m.props, docKey: m.docKey };
      return { comp: NotFoundPage, props: {}, docKey: '' };
    });
    watch(view, v => { docState.key = v.docKey; docState.override = ''; }, { immediate: true });
    const active = computed(() => {
      const p = path.value;
      if (p.startsWith('/customer/')) return '/customers';
      if (p.startsWith('/quote/')) return '/quotes';
      if (p.startsWith('/lead/')) return '/leads/my';
      if (p.startsWith('/opp/')) return '/opps/list';
      if (p.startsWith('/analytics/')) return '/analytics';
      if (p.startsWith('/system/user/')) return '/system';
      if (p.startsWith('/approvals/')) return '/approvals/templates';
      return p;
    });
    const standalone = computed(() => path.value === '/m' || path.value.indexOf('/m/') === 0);
    const menu = ref(null);
    const opened = computed(() => { const n = NAV.find(n => n.children && n.children.some(c => c.path === active.value)); return n ? [n.key] : []; });
    watch(opened, v => { v.length && menu.value && menu.value.open(v[0]); });
    // 全局搜索
    const kw = ref('');
    const searchFn = (q, cb) => {
      if (!q) return cb([]);
      const r = [];
      store.customers.forEach(c => { if (c.name.includes(q) || c.no.includes(q)) r.push({ value: c.name, tag: '客户', to: '/customer/' + c.no }); });
      store.leads.forEach(l => { if (l.company.includes(q) || l.no.includes(q) || l.contact.includes(q)) r.push({ value: l.company + '（' + l.no + '）', tag: '线索', to: '/lead/' + l.no }); });
      store.opps.forEach(o => { if (o.name.includes(q) || o.no.includes(q)) r.push({ value: o.name, tag: '商机', to: '/opp/' + o.no }); });
      PH.contacts.rows.forEach(c => { if (c.name.includes(q)) r.push({ value: c.name + ' · ' + c.customer, tag: '联系人', to: '/contacts' }); });
      cb(r.slice(0, 8));
    };
    const selectSearch = it => { go(it.to); kw.value = ''; };
    const unread = computed(() => store.messages.filter(m => !m.read).length);
    const todoCount = computed(() => store.approvals.filter(a => a.tab === 'todo').length + (store.ext ? store.ext.activities.filter(a => a.owner === '张三' && a.status === '计划中').length : 0));
    const readAll = () => store.messages.forEach(m => m.read = true);
    return { path, view, active, standalone, menu, opened, NAV, kw, searchFn, selectSearch, unread, todoCount, store, go, readAll, THEMES, theme, applyTheme };
  },
  template: `<div class="layout" :class="{standalone}">
    <div class="topbar" v-if="!standalone">
      <div class="brand"><div class="logo">C</div>CRM 客户管理系统</div>
      <el-autocomplete v-model="kw" class="top-search" :fetch-suggestions="searchFn" placeholder="全局搜索：客户 / 线索 / 商机 / 联系人" prefix-icon="Search" clearable @select="selectSearch" :trigger-on-focus="false">
        <template #default="{item}"><el-tag size="small" effect="plain" style="margin-right:8px">{{ item.tag }}</el-tag>{{ item.value }}</template></el-autocomplete>
      <div class="top-right">
        <el-button size="small" plain icon="Iphone" @click="go('/mobile')">移动端预览</el-button>
        <el-dropdown trigger="click" @command="applyTheme">
          <div class="icon-btn" title="主题切换"><el-icon><brush/></el-icon></div>
          <template #dropdown><el-dropdown-menu>
            <el-dropdown-item v-for="t in THEMES" :key="t[0]" :command="t[0]">
              <span class="theme-dot" :style="{background:t[2]}"></span>{{ t[1] }}
              <el-icon v-if="theme === t[0]" style="margin-left:auto;color:var(--el-color-primary)"><check/></el-icon>
            </el-dropdown-item>
          </el-dropdown-menu></template>
        </el-dropdown>
        <el-popover placement="bottom-end" :width="360" trigger="click">
          <template #reference><div class="icon-btn" title="消息通知"><el-icon><bell/></el-icon><el-badge :value="unread" :hidden="!unread"/></div></template>
          <div style="display:flex;align-items:center;margin-bottom:6px"><b>消息通知</b><a style="margin-left:auto;font-size:13px" @click="readAll">全部已读</a></div>
          <div class="msg" :class="{read:m.read}" v-for="m in store.messages" :key="m.id" @click="m.read=true"><span class="u" :class="{read:m.read}"></span><div><div>{{ m.title }}</div><div class="muted" style="font-size:12px">{{ m.type }} · {{ m.time }}</div></div></div>
        </el-popover>
        <div class="icon-btn" title="待办 / 审批" @click="go('/approvals')"><el-icon><finished/></el-icon><el-badge :value="todoCount" type="warning"/></div>
        <el-dropdown trigger="click"><div class="user-chip"><div class="avatar">张</div><div style="line-height:1.2"><div style="font-size:13px;font-weight:600">张三</div><div style="font-size:11px;color:var(--sub)">销售经理</div></div><el-icon><arrow-down/></el-icon></div>
          <template #dropdown><el-dropdown-menu><el-dropdown-item>个人设置</el-dropdown-item><el-dropdown-item>切换数据范围</el-dropdown-item><el-dropdown-item divided>退出登录</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      </div>
    </div>
    <div class="body">
      <div class="sidebar" v-if="!standalone">
        <el-menu ref="menu" :default-active="active" :default-openeds="opened" unique-opened @select="p => go(p)">
          <template v-for="n in NAV" :key="n.key">
            <el-sub-menu v-if="n.children" :index="n.key"><template #title><el-icon><component :is="n.icon"/></el-icon><span>{{ n.title }}</span></template>
              <el-menu-item v-for="c in n.children" :key="c.path" :index="c.path">{{ c.title }}</el-menu-item></el-sub-menu>
            <el-menu-item v-else :index="n.path"><el-icon><component :is="n.icon"/></el-icon><span>{{ n.title }}</span></el-menu-item>
          </template>
        </el-menu>
      </div>
      <div class="main" :class="{mfull:standalone}"><component :is="view.comp" :key="path" v-bind="view.props"/></div>
      <doc-panel v-if="!standalone"/>
    </div>
  </div>`,
};
const app = Vue.createApp(App);
app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
Object.entries(ElementPlusIconsVue).forEach(([k, v]) => app.component(k, v));
Object.assign(app.config.globalProperties, { $go: go, $msg: ElMessage, $cno: cno, $yuan: yuan, $fmtY: fmtY, $fmtC: fmtC });
app.mount('#app');
