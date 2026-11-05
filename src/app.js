const App = {
  components: { DocPanel },
  setup() {
    const parse = () => { const h = (location.hash || '#login').slice(1); return h || '/login'; };
    const path = ref(parse());
    const notLogged = computed(() => !AUTH.authLoggedIn());
    const isMobile = computed(() => path.value === '/m' || path.value.indexOf('/m/') === 0);
    const redirectTo = ref(null);
    window.addEventListener('hashchange', () => {
      const newPath = parse();
      if (notLogged.value && !isMobile.value) { redirectTo.value = newPath; path.value = '/login'; }
      else { path.value = newPath; document.querySelector('.main') && (document.querySelector('.main').scrollTop = 0); }
    });
    const view = computed(() => {
      if (notLogged.value && !isMobile.value) return { comp: LoginPage, props: {}, docKey: 'auth-login' };
      const user = AUTH.authUser();
      if (user && user.mustChange && path.value !== '/change-password') return { comp: ChangePwdPage, props: {}, docKey: 'auth-changepw' };
      const m = matchRoute(path.value);
      if (m) {
        const allowed = AUTH.authRouteAllowed(path.value);
        if (!allowed.ok) return { comp: NoPermissionPage, props: { reason: allowed.reason }, docKey: 'auth-nopermission' };
        return { comp: m.comp, props: m.props, docKey: m.docKey };
      }
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
    const authCanMenu = (menuTitle) => {
      const role = AUTH.authRole();
      if (!role) return false;
      return role.menus && role.menus.includes(menuTitle);
    };
    const opened = computed(() => {
      const p = active.value;
      const topKey = p.split('/')[1] || '';
      const n = NAV.find(n => n.key === topKey);
      if (!n) return [];
      if (n.children) {
        const filteredChildren = n.children.filter(c => authCanMenu(c.path));
        return filteredChildren.length > 0 ? [n.key] : [];
      }
      return authCanMenu(n.path) ? [n.key] : [];
    });
    watch(opened, v => { v.length && menu.value && menu.value.open(v[0]); });
    const kw = ref('');
    const searchFn = (q, cb) => {
      if (!q) return cb([]);
      const r = [];
      store.customers.forEach(c => { if (authRowVisibleAuth(c)) r.push({ value: c.name, tag: '客户', to: '/customer/' + c.no }); });
      store.leads.forEach(l => { if (authRowVisibleAuth(l)) r.push({ value: l.company + '（' + l.no + '）', tag: '线索', to: '/lead/' + l.no }); });
      store.opps.forEach(o => { if (authRowVisibleAuth(o)) r.push({ value: o.name, tag: '商机', to: '/opp/' + o.no }); });
      PH.contacts.rows.forEach(c => { if (authRowVisibleAuth(c)) r.push({ value: c.name + ' · ' + c.customer, tag: '联系人', to: '/contacts' }); });
      cb(r.slice(0, 8));
    };
    const selectSearch = it => { go(it.to); kw.value = ''; };
    const unread = computed(() => store.messages.filter(m => !m.read).length);
    const todoCount = computed(() => store.approvals.filter(a => a.tab === 'todo').length + (store.ext ? store.ext.activities.filter(a => a.owner === '张三' && a.status === '计划中').length : 0));
    const readAll = () => store.messages.forEach(m => m.read = true);
    onMounted(() => { if (!isMobile.value) authGuardInstall(); });
    const currentUser = computed(() => AUTH.authUser());
    const currentRole = computed(() => AUTH.authRole());
    const handleRoleSwitch = key => { if (!key) return; AUTH.authSwitchRole(key); };
    const handleUserCmd = cmd => { if (cmd === 'changepwd') go('/change-password'); else if (cmd === 'logout') AUTH.authLogout(); };
    const themeRef = ref(localStorage.getItem('crm_theme') || 'sky');
    const theme = computed({ get() { return themeRef.value; }, set(t) { themeRef.value = t; applyTheme(t); localStorage.setItem('crm_theme', t); } });
    const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const applyTheme = t => { themeRef.value = t; document.documentElement.dataset.theme = t; localStorage.setItem('crm_theme', t); };
    applyTheme(themeRef.value);
    const fmtY = n => Number(n).toLocaleString('zh-CN');
    const yuan = n => '¥' + fmtY(n);
    const fmtC = c => (c / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const TODAY = '2026-11-02';
    const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
    const go = path => { location.hash = '#' + path; };
    const cno = name => { const c = custByName(name); return c ? c.no : 'NA'; };
    const authRowVisibleAuth = row => {
      const user = AUTH.authUser();
      if (!user) return true;
      const deptId = user.dept;
      if (user.role === 'admin') return true;
      if (user.id === (row.owner || '').toString()) return true;
      if (deptId && row.dept === deptId) return true;
      return false;
    };
    const authCanBtn = (kind) => {
      const user = AUTH.authUser();
      if (!user) return false;
      const role = AUTH.roles[user.role || ''];
      if (!role) return false;
      const btns = role.buttons || [];
      if (kind && btns.indexOf(kind) >= 0) return true;
      if (!kind) return true;
      return false;
    };
    const filteredNAV = computed(() => {
      return NAV.filter(n => authCanMenu(n.title));
    });
    return { path, view, active, standalone, menu, opened, NAV, filteredNAV, kw, searchFn, selectSearch, unread, todoCount, store, go, readAll, theme, applyTheme, notLogged, isMobile, authRowVisibleAuth, authCanMenu, authCanBtn, fmtY, yuan, fmtC, TODAY, daysBetween, go, cno, currentUser, currentRole, handleRoleSwitch, handleUserCmd, redirectTo };
  },
  template: `<div class="layout" :class="{standalone}">
    <div class="topbar" v-if="!standalone && !notLogged">
      <div class="brand"><div class="logo">C</div>CRM 客户管理系统</div>
      <el-autocomplete v-model="kw" class="top-search" :fetch-suggestions="searchFn" placeholder="全局搜索：客户 / 线索 / 商机 / 联系人" prefix-icon="Search" clearable @select="selectSearch" :trigger-on-focus="false">
        <template #default="{item}"><el-tag size="small" effect="plain" style="margin-right:8px">{{ item.tag }}</el-tag>{{ item.value }}</template></el-autocomplete>
      <div class="top-right">
        <el-button size="small" plain icon="Iphone" @click="go('/mobile')">移动端预览</el-button>
        <el-dropdown trigger="click" @command="applyTheme">
          <div class="icon-btn" title="主题切换"><el-icon><brush/></el-icon></div>
          <template #dropdown><el-dropdown-menu>
            <el-dropdown-item v-for="t in ['sky','pink','white','gray']" :key="t" :command="t">
              <span class="theme-dot" :style="{background:t==='sky'?'#2f9bff':t==='pink'?'#e8588d':t==='white'?'#2b3a55':'#5b6b7f'}"></span>{{ t }}
              <el-icon v-if="theme===t" style="margin-left:auto;color:var(--el-color-primary)"><check/></el-icon>
            </el-dropdown-item>
          </el-dropdown-menu></template>
        </el-dropdown>
        <el-popover placement="bottom-end" :width="360" trigger="click">
          <template #reference><div class="icon-btn" title="消息通知"><el-icon><bell/></el-icon><el-badge :value="unread" :hidden="!unread"/></div></template>
          <div style="display:flex;align-items:center;margin-bottom:6px"><b>消息通知</b><a style="margin-left:auto;font-size:13px" @click="readAll">全部已读</a></div>
          <div class="msg" :class="{read:m.read}" v-for="m in store.messages" :key="m.id" @click="m.read=true"><span class="u" :class="{read:m.read}"></span><div><div>{{ m.title }}</div><div class="muted" style="font-size:12px">{{ m.type }} · {{ m.time }}</div></div></div>
        </el-popover>
        <div class="icon-btn" title="待办 / 审批" @click="go('/approvals')"><el-icon><finished/></el-icon><el-badge :value="todoCount" type="warning"/></div>
        <el-dropdown trigger="click" @command="handleRoleSwitch"><div class="icon-btn" title="角色切换"><el-icon><Switch/></el-icon><span style="font-size:12px">角色切换</span><el-badge class="demo-tag" value="演示" style="margin-left:6px;font-size:10px;padding:1px 4px;border-radius:3px;background:var(--el-color-warning);color:#fff"/></div><template #dropdown><el-dropdown-menu><el-dropdown-item v-for="r in Object.values(AUTH.roles||{})" :key="r.key" :command="r.key" :disabled="currentRole && currentRole.key===r.key">{{ r.name }}{{ currentRole && currentRole.key===r.key ? ' （当前）' : '' }}</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
        <el-dropdown trigger="click" @command="handleUserCmd"><div class="user-chip"><div class="avatar">{{ currentUser ? currentUser.name[0] : '?' }}</div><div style="line-height:1.2"><div style="font-size:13px;font-weight:600">{{ currentUser ? currentUser.name : '' }}</div><div style="font-size:11px;color:var(--sub)"> {{ currentRole ? currentRole.name : '' }}</div></div><el-icon><arrow-down/></el-icon></div><template #dropdown><el-dropdown-menu><el-dropdown-item command="profile">个人设置</el-dropdown-item><el-dropdown-item command="changepwd">修改密码</el-dropdown-item><el-dropdown-item divided command="logout">退出登录</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
      </div>
    </div>
    <div class="sidebar" v-if="!standalone && !notLogged">
      <el-menu ref="menu" :default-active="active" :default-openeds="opened" unique-opened @select="p => go(p)">
        <template v-for="n in filteredNAV" :key="n.key">
          <el-sub-menu v-if="n.children" :index="n.key"><template #title><el-icon><component :is="n.icon"/></el-icon><span>{{ n.title }}</span></template><el-menu-item v-for="c in n.children" :key="c.path" :index="c.path">{{ c.title }}</el-menu-item></el-sub-menu><el-menu-item v-else :index="n.path"><el-icon><component :is="n.icon"/></el-icon><span>{{ n.title }}</span></el-menu-item>
        </template>
      </el-menu>
    </div>
    <div class="main" :class="{mfull:standalone}"><component :is="view.comp" :key="path" v-bind="view.props"/></div>
    <doc-panel v-if="!standalone && !notLogged"/><doc-panel v-if="notLogged && view.docKey === 'auth-login'"/><doc-panel v-if="notLogged && view.docKey === 'auth-changepw'"/><doc-panel v-if="notLogged && view.docKey === 'auth-nopermission'"/>
  </div>`,
};
const app = Vue.createApp(App);
app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
Object.entries(ElementPlusIconsVue).forEach(([k, v]) => app.component(k, v));
Object.assign(app.config.globalProperties, { $go: go, $msg: ElMessage, $cno: cno, $yuan: yuan, $fmtY: fmtY, $fmtC: fmtC, $mask: AUTH.authMaskPhone });
app.mount('#app');