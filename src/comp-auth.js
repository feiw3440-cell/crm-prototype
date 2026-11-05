const AUTH = {
  depts: {},
  users: {},
  roles: {},
  session: null,
  init() {
    const stored = localStorage.getItem('crm_auth_v1');
    if (stored) {
      const data = JSON.parse(stored);
      this.depts = data.depts || {};
      this.users = data.users || {};
      this.roles = data.roles || {};
    }
    this._loadDemoIfNeeded();
    this.session = JSON.parse(localStorage.getItem('crm_auth_session') || 'null');
  },
  save() {
    localStorage.setItem('crm_auth_v1', JSON.stringify({ depts: this.depts, users: this.users, roles: this.roles }));
  },
  _loadDemoIfNeeded() {
    if (Object.keys(this.users).length > 0) return;
    const depts = {
      D00: { id: 'D00', name: '某某软件有限公司', parent: '', level: '公司' },
      D01: { id: 'D01', name: '总经办', parent: 'D00', level: '部门' },
      D02: { id: 'D02', name: '华东销售中心', parent: 'D00', level: '部门' },
      D03: { id: 'D03', name: '华东销售一部', parent: 'D02', level: '团队' },
      D04: { id: 'D04', name: '华东销售二部', parent: 'D02', level: '团队' },
      D06: { id: 'D06', name: '财务部', parent: 'D00', level: '部门' },
    };
    this.depts = depts;
    const users = {
      u01: { id: 'u01', acc: 'admin', name: '管理员', phone: '13900000001', pwd: 'Crm@2026', mustChange: false, status: '启用', dept: 'D01', manager: '', role: 'admin' },
      u02: { id: 'u02', acc: 'zhouzj', name: '周总监', phone: '13700005505', pwd: 'Crm@2026', mustChange: false, status: '启用', dept: 'D02', manager: 'u01', role: 'director' },
      u03: { id: 'u03', acc: 'zhangsan', name: '张三', phone: '13700005501', pwd: 'Crm@2026', mustChange: false, status: '启用', dept: 'D03', manager: 'u02', role: 'manager' },
      u04: { id: 'u04', acc: 'lisi', name: '李四', phone: '13700005502', pwd: 'Crm@2026', mustChange: false, status: '启用', dept: 'D04', manager: 'u02', role: 'manager' },
      u05: { id: 'u05', acc: 'wangwu', name: '王五', phone: '13700005503', pwd: 'Crm@2026', mustChange: false, status: '启用', dept: 'D03', manager: 'u03', role: 'sales' },
      u06: { id: 'u06', acc: 'zhaoliu', name: '赵六', phone: '13700005504', pwd: 'Crm@2026', mustChange: false, status: '启用', dept: 'D04', manager: 'u04', role: 'sales' },
      u07: { id: 'u07', acc: 'wangfang', name: '王芳', phone: '13700005508', pwd: 'Crm@2026', mustChange: false, status: '启用', dept: 'D06', manager: '', role: 'finance' },
      u08: { id: 'u08', acc: 'chenyue', name: '陈悦', phone: '13700005513', pwd: 'Crm@2026', mustChange: false, status: '停用', dept: 'D03', manager: 'u03', role: 'sales' },
      u09: { id: 'u09', acc: 'newbie', name: '新同事', phone: '13700005520', pwd: 'Init@1234', mustChange: true, status: '启用', dept: 'D04', manager: 'u04', role: 'sales' },
    };
    this.users = users;
    const roles = {
      admin: { key: 'admin', name: '系统管理员', desc: '', menus: ['工作台', '线索管理', '客户管理', '联系人管理', '商机管理', '产品管理', '报价管理', '合同管理', '订单管理', '回款管理', '活动管理', '数据分析', '系统管理', '审批中心'], buttons: ['新增', '编辑', '删除', '导出', '分配'], scope: '全部', phoneFull: true, noFollowUp: false, home: '/system/auth/users', demoUid: 'u01' },
      director: { key: 'director', name: '销售总监', desc: '', menus: ['工作台', '线索管理', '客户管理', '联系人管理', '商机管理', '产品管理', '报价管理', '合同管理', '订单管理', '回款管理', '活动管理', '数据分析', '审批中心'], buttons: ['新增', '编辑', '删除', '导出', '分配'], scope: '本部门及下属', phoneFull: true, noFollowUp: false, home: '/workbench', demoUid: 'u02' },
      manager: { key: 'manager', name: '销售经理', desc: '', menus: ['工作台', '线索管理', '客户管理', '联系人管理', '商机管理', '产品管理', '报价管理', '合同管理', '订单管理', '回款管理', '活动管理', '数据分析', '审批中心'], buttons: ['新增', '编辑', '导出', '分配'], scope: '本部门', phoneFull: true, noFollowUp: false, home: '/workbench', demoUid: 'u03' },
      sales: { key: 'sales', name: '销售人员', desc: '', menus: ['工作台', '线索管理', '客户管理', '联系人管理', '商机管理', '报价管理', '活动管理', '服务管理', '审批中心'], buttons: ['新增', '编辑'], scope: '本人', phoneFull: true, noFollowUp: false, home: '/workbench', demoUid: 'u05' },
      finance: { key: 'finance', name: '财务人员', desc: '', menus: ['工作台', '合同管理', '订单管理', '回款管理', '数据分析', '审批中心'], buttons: ['导出'], scope: '全部', phoneFull: false, noFollowUp: true, home: '/payments', demoUid: 'u07' },
    };
    this.roles = roles;
    this.save();
  },

  // ===== 会话与登录 =====
  authUser() { return this.session ? this.users[this.session.uid] || null : null; },
  authRole() { return this.session ? this.roles[this.users[this.session.uid]?.role || ''] || null : null; },
  authLoggedIn() { return this.session !== null; },

  authLogin(account, pwd) {
    let user = null;
    for (const k of Object.keys(this.users)) {
      const u = this.users[k];
      if ((u.acc === account || u.phone === account) && u.pwd === pwd) {
        if (u.status === '停用') return { ok: false, msg: '该账号已停用，请联系管理员', user: null };
        user = u; break;
      }
    }
    if (!user) return { ok: false, msg: '账号或密码错误', user: null };
    this.session = { uid: user.id };
    localStorage.setItem('crm_auth_session', JSON.stringify(this.session));
    return { ok: true, msg: '登录成功', user };
  },

  authResetDemo() {
    this.depts = {}; this.users = {}; this.roles = {};
    this.session = null;
    localStorage.removeItem('crm_auth_session');
    localStorage.removeItem('crm_auth_v1');
    this._loadDemoIfNeeded();
    this.save();
  },

  authLogout(stay) {
    this.session = null;
    localStorage.removeItem('crm_auth_session');
    if (!stay) location.hash = '#/login';
  },

  // ===== 密码改动 =====
  authChangePwd(old, neu) {
    const user = this.authUser();
    if (!user) return { ok: false, msg: '未登录' };
    if (user.pwd !== old) return { ok: false, msg: '旧密码错误' };
    if (neu.length < 8) return { ok: false, msg: '新密码至少8位' };
    if (!/[a-zA-Z]/.test(neu) || !/[0-9]/.test(neu)) return { ok: false, msg: '新密码需包含字母和数字' };
    if (neu === old) return { ok: false, msg: '新密码不能与旧密码相同' };
    user.pwd = neu;
    user.mustChange = false;
    this.save();
    localStorage.removeItem('crm_auth_session');
    this.session = null;
    return { ok: true, msg: '密码修改成功' };
  },

  // ===== 角色切换 =====
  authSwitchRole(roleKey) {
    const role = this.roles[roleKey];
    if (!role) return;
    this.session = { uid: role.demoUid };
    localStorage.setItem('crm_auth_session', JSON.stringify(this.session));
    location.hash = `#${role.home}`;
  },

  // ===== 菜单权限 =====
  authCanMenu(menuTitle) {
    const role = this.authRole();
    if (!role) return false;
    return role.menus && role.menus.includes(menuTitle);
  },

  authCanBtn(kind) {
    const user = this.authUser();
    if (!user) return false;
    const role = this.roles[user.role || ''];
    if (!role) return false;
    const btns = role.buttons || [];
    if (kind && btns.indexOf(kind) >= 0) return true;
    if (!kind) return true;
    return false;
  },

  // 确保销售人员无“分配”按钮权限
  authCanBtnAllocate() {
    const user = this.authUser();
    if (!user) return false;
    const role = this.roles[user.role || ''];
    if (!role) return false;
    if (user.role === 'sales') return false;
    return this.authCanBtn('分配');
  },

  authScope() {
    const user = this.authUser();
    if (!user) return '全部';
    const role = this.roles[user.role || ''];
    return role ? role.scope : '全部';
  },

  // ===== 数据可见性 =====
  authVisibleOwners() {
    const user = this.authUser();
    if (!user) return new Set();
    if (user.role === 'finance') {
      return null;
    }
    const role = this.roles[user.role] || { scope: '全部' };
    const scope = role.scope;
    if (scope === '全部') return null;
    const deptId = user.dept;
    const result = new Set();
    for (const k of Object.keys(this.users)) {
      const u = this.users[k];
      if (u.status !== '启用') continue;
      if (scope === '本人') {
        if (u.id === user.id) result.add(u.name);
      } else if (scope === '本部门') {
        if (u.id === user.id) result.add(u.name);
        else if (deptId && u.dept === deptId) result.add(u.name);
      } else if (scope === '本部门及下级' || scope === '本部门及下属') {
        if (u.id === user.id) result.add(u.name);
        else if (deptId && u.dept === deptId) result.add(u.name);
        else if (deptId) {
          const descendants = this._deptDescendants(deptId);
          if (descendants.has(u.dept)) result.add(u.name);
        }
      }
    }
    return result;
  },

  _deptDescendants(deptId) {
    const result = new Set();
    const visit = [deptId];
    while (visit.length) {
      const id = visit.shift();
      for (const d of Object.values(this.depts)) {
        if (d.parent === id && !result.has(d.id)) {
          result.add(d.id);
          visit.push(d.id);
        }
      }
    }
    return result;
  },

  authRowVisible(row) {
    const owners = this.authVisibleOwners();
    if (owners === null) return true;
    if (!row || !row.owner) {
      const user = this.authUser();
      return user && (user.role === 'admin' || user.role === 'finance');
    }
    return owners.has(row.owner);
  },

authFilter(rows) {
    if (!rows || rows.length === 0) return rows;
    if (!rows.some(r => r && 'owner' in r)) return rows;
    return rows.filter(r => this.authRowVisible(r));
},

  // ===== 手机号脱敏 =====
  authMaskPhone(p) {
    if (p === '' || p === undefined || p === null) return '';
    const phoneFull = this.authRole() && this.authRole().phoneFull;
    if (phoneFull) {
      const stars = p.indexOf('*');
      if (stars >= 0) {
        const prefix = p.slice(0, stars);
        const suffix = p.slice(stars + 4);
        if (prefix.length >= 3 && suffix.length >= 4) return prefix + '****' + suffix;
      }
      return p;
    }
    return p.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  },

  // ===== 路由权限 =====
  authRouteAllowed(path) {
    if (path === '/login' || path === '/change-password' || path === '/no-permission') return { ok: true };
    const role = this.authRole();
    if (!role) return { ok: false, reason: '未登录，请先登录' };
    const menuTitle = this._pathToMenu(path);
    if (!menuTitle) return { ok: false, reason: '无菜单权限' };
    if (!this.authCanMenu(menuTitle)) {
      return { ok: false, reason: `您的角色「${role.name}」没有「${menuTitle}」模块的访问权限` };
    }
    return { ok: true };
  },

  _pathToMenu(path) {
    const map = {
      '/workbench': '工作台', '/approvals': '审批中心', '/mobile': '移动端预览',
      '/leads': '线索管理', '/lead/': '线索管理',
      '/customers': '客户管理', '/customer/': '客户管理',
      '/opps': '商机管理', '/opp/': '商机管理',
      '/products': '产品管理', '/pricebooks,/product/': '产品管理',
      '/quotes': '报价管理', '/quote/': '报价管理',
      '/contracts': '合同管理', '/contract/': '合同管理',
      '/orders': '订单管理', '/order/': '订单管理',
      '/payments': '回款管理', '/payments': '回款管理',
      '/activities': '活动管理', '/activity/': '活动管理',
      '/delivery': '交付管理', '/delivery': '交付管理',
      '/service': '服务管理', '/ticket/': '服务管理',
      '/analytics': '数据分析', '/system': '系统管理', '/approvals/templates': '系统管理',
      '/mobile,/m': null,
    };
    for (const [k, v] of Object.entries(map)) {
      if (path === k || path.startsWith(k)) return v;
    }
    return null;
  },

  // ===== 按钮权限 =====
  authBtnAllowed(label) {
    const kindMap = {
      '新增': '新增', '新建': '新增', '添加': '新增', '创建': '新增',
      '编辑': '编辑', '修改': '编辑',
      '删除': '删除', '作废': '删除',
      '导出': '导出',
      '分配': '分配', '转移': '分配', '指派': '分配', '批量分配': '分配',
    };
    const parts = label.split('/').map(s => s.trim());
    const kind = parts.reduce((acc, part) => acc || kindMap[part], null);
    if (kind) {
      if (kind === '分配') {
        const user = this.authUser();
        const role = this.roles[user.role || ''];
        if (role && role.noFollowUp && label.includes('跟进')) return false;
      }
      return this.authCanBtn(kind);
    }
    return true;
  },

  // ===== 权限守卫（点击拦截 + 隐藏）=====
  authGuardInstall() {
    const main = document.querySelector('.main');
    if (!main) return;
    const dialogLabels = ['确定', '取消', '保存', '提交'];
    const selectors = '.el-button,.row-actions a,.row-actions button,.ops button';
    const btnText = el => (el.textContent || '').trim();
    const isDialogBtn = el => !!el.closest('.el-dialog,.el-message-box__wrapper');
    const check = el => {
      if (!el || !main.contains(el) || isDialogBtn(el)) return;
      const t = btnText(el);
      if (dialogLabels.indexOf(t) >= 0) return;
      if (!AUTH.authBtnAllowed(t)) el.style.display = 'none';
    };
    document.addEventListener('click', e => {
      if (!main || !main.contains(e.target)) return;
      const el = e.target.closest(selectors);
      if (!el) return;
      const t = btnText(el);
      if (dialogLabels.indexOf(t) >= 0) return;
      if (!AUTH.authBtnAllowed(t)) {
        e.stopPropagation();
        e.preventDefault();
        ElMessage.error('无权限：当前角色不能执行「' + t + '」');
      }
    }, true);
    let raf = null;
    new MutationObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; main.querySelectorAll(selectors).forEach(check); });
    }).observe(main, { childList: true, subtree: true });
  },

  // ===== 辅助函数 =====
  authDeptDescendants(deptId) {
    return this._deptDescendants(deptId);
  },
  authDeptName(id) {
    return this.depts[id] ? this.depts[id].name : '';
  },
  authUserName(id) {
    for (const k of Object.keys(this.users)) {
      if (this.users[k].id === id) return this.users[k].name;
    }
    return '';
  },
};

AUTH.init();
window.AUTH = AUTH;