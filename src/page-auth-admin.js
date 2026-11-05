const AuthDeptsPage = {
  template: `<div class="card card-pad">
    <h2>部门管理</h2>
    <el-tree :data="depts" node-key="id" :props="{ label: 'name', children: 'children' }" style="width:200px;height:400px;margin-right:24px;float:left">
      <template #label="{ node }">{{ node.name }}({{ node.level }})</template>
    </el-tree>
    <div style="margin-top:24px;overflow:auto">
      <el-button type="primary" style="float:left;margin-right:16px" v-if="AUTH.authCanBtn('新增')">新增</el-button>
      <el-button type="success" style="float:left;margin-right:16px" v-if="AUTH.authCanBtn('编辑')">编辑</el-button>
      <el-button type="danger" style="float:left;margin-right:16px" v-if="AUTH.authCanBtn('删除')">删除</el-button>
      <el-button type="warning" style="float:left">重置演示数据</el-button>
      <div style="clearfix"></div>
      <div style="margin-top:24px;border:1px dashed #dcdfe6;padding:16px">
        <p>部门树规则：公司只能建部门，部门只能建团队，团队不可再建</p>
        <el-form :model="form" inline class="form-gutter" style="max-width:400px">
          <el-form-item label="父级部门" prefix-icon="Folder">
            <el-select v-model="form.parentId" style="width:100%">
              <el-option label="公司" value="D00" />
              <el-option label="总经办" value="D01" />
              <el-option label="华东销售中心" value="D02" />
              <el-option label="华东销售一部" value="D03" />
              <el-option label="华东销售二部" value="D04" />
              <el-option label="财务部" value="D06" />
            </el-select>
          </el-form-item>
          <el-form-item label="部门名称" prefix-icon="Name">
            <el-input v-model="form.name" placeholder="请输入部门名称" />
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>`,
  data() { return { depts: {}, form: { name: '', parentId: 'D00' } }; },
  mounted() {
    const depts = AUTH.depts || {};
    const nodeMap = {};
    const roots = [];
    for (const k of Object.keys(depts)) {
      const d = { id: k, name: depts[k].name, level: depts[k].level, children: [] };
      nodeMap[k] = d;
      if (depts[k].parent === '') {
        roots.push(d);
      } else if (nodeMap[depts[k].parent]) {
        nodeMap[depts[k].parent].children.push(d);
      } else {
        roots.push(d);
      }
    }
    this.depts = roots;
    this.form.parentId = 'D00';
    this.$nextTick(() => {});
  }
};
registerRoute('/system/auth/depts', AuthDeptsPage, 'auth-depts');

const AuthUsersPage = {
  template: `<div class="card card-pad">
    <h2>用户管理</h2>
    <el-form inline class="form-gutter" style="margin-bottom:16px">
      <el-form-item label="关键字" :width="80">
        <el-input v-model="queryKey" placeholder="账号/姓名/手机" />
      </el-form-item>
      <el-form-item label="部门" :width="100">
        <el-select v-model="queryDept" style="width:100%">
          <el-option label="全部" value="" />
          <el-option label="某某软件有限公司" value="D00" />
          <el-option label="总经办" value="D01" />
          <el-option label="华东销售中心" value="D02" />
          <el-option label="华东销售一部" value="D03" />
          <el-option label="华东销售二部" value="D04" />
          <el-option label="财务部" value="D06" />
        </el-select>
      </el-form-item>
      <el-form-item label="角色" :width="100">
        <el-select v-model="queryRole" style="width:100%">
          <el-option label="全部" value="" />
          <el-option label="系统管理员" value="admin" />
          <el-option label="销售总监" value="director" />
          <el-option label="销售经理" value="manager" />
          <el-option label="销售人员" value="sales" />
          <el-option label="财务人员" value="finance" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" :width="100">
        <el-select v-model="queryStatus" style="width:100%">
          <el-option label="全部" value="" />
          <el-option label="启用" value="启用" />
          <el-option label="停用" value="停用" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="search">查询</el-button>
        <el-button type="link" @click="authResetDemo">重置演示数据</el-button>
      </el-form-item>
    </el-form>
    <el-table :data="filteredUsers" style="width:100%" border highlight-current-row>
      <el-table-column prop="account" label="账号" width="120" />
      <el-table-column prop="name" label="姓名" width="100" />
      <el-table-column prop="phone" label="手机号" width="130" align="center">
        <template #default="{ row }">{{ AUTH.authMaskPhone(row.phone) }}</template>
      </el-table-column>
      <el-table-column prop="dept" label="部门" width="100" />
      <el-table-column prop="manager" label="直属上级" width="100" />
      <el-table-column prop="role" label="角色" width="100" />
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{ row }">{{ row.status }}</template>
      </el-table-column>
      <el-table-column prop="mustChange" label="待改密" width="80" align="center">
        <template #default="{ row }">{{ row.mustChange ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" align="center">
        <template #default="{ row }">
          <el-button size="small" @click="editUser(row)" v-if="AUTH.authCanBtn('编辑')">编辑</el-button>
          <el-button size="small" type="danger" @click="doDisable(row)">停用</el-button>
          <el-button size="small" @click="resetPwd(row)">重置密码</el-button>
    </el-table>
    <div style="margin-top:24px">
      <el-dialog title="停用用户" :visible="dialogVisible" width="400">
        <p>用户：{{ dialogName }}（{{ dialogDeptName }}）</p>
        <p v-if="hasCustomers > 0">该用户下有 {{ hasCustomers }} 个客户，<el-button type="primary" @click="selectReceiver">指定接收人</el-button> 后才能停用</p>
        <p v-else>确定要停用该用户吗？</p>
        <div style="margin-top:24px">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmDisable">确定停用</el-button>
        </div>
      </el-dialog>
      <el-dialog title="重置密码" :visible="pwdDialogVisible" width="400">
        <p>生成临时密码：Rst@{{ pwdSuffix }}</p>
        <p>该用户将首次登录时被强制改密</p>
        <div style="margin-top:24px">
          <el-button @click="pwdDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="confirmResetPwd">确定重置</el-button>
        </div>
      </el-dialog>
    </div>
  </div>`,
  data() { return { 
    queryKey: '', queryDept: '', queryRole: '', queryStatus: '',
    dialogVisible: false, dialogName: '', dialogDeptName: '',
    hasCustomers: 0, pwdDialogVisible: false, pwdSuffix: '4'
  }; },
  mounted() {
  },
  computed: {
    filteredUsers() {
      const all = Object.values(AUTH.users || {});
      let res = all;
      if (this.queryKey) {
        res = res.filter(u => u.acc.includes(this.queryKey) || u.name.includes(this.queryKey) || u.phone.includes(this.queryKey));
      }
      if (this.queryDept) res = res.filter(u => u.dept === this.queryDept);
      if (this.queryRole) res = res.filter(u => u.role === this.queryRole);
      if (this.queryStatus) res = res.filter(u => u.status === this.queryStatus);
      return res;
    }
  },
  methods: {
    search() {},
    hasCustomerCount(uid) {
      const u = AUTH.users ? AUTH.users[uid] : undefined;
      if (!u) return 0;
      let count = 0;
      for (const c of Object.values(store.customers || {})) {
        if (c.owner === u.name) count++;
      }
      return count;
    },
    editUser(u) {
      this.dialogName = u.name;
      this.dialogDeptName = u.dept ? (this.depts[u.dept] ? this.depts[u.dept].name : '') : '';
      this.hasCustomers = this.hasCustomerCount(u.id);
      this.dialogVisible = true;
    },
    confirmDisable() {
      const u = AUTH.users ? AUTH.users[this.dialogName || ''] : undefined;
      const adminCount = Object.values(AUTH.users || {}).filter(u => u.role === 'admin' && u.status === '启用').length;
      if (this.hasCustomers > 0) {
        ElMessage.warning('该用户下有客户，需指定接收人后才能停用');
      } else if (u && u.role === 'admin' && adminCount <= 1) {
        ElMessage.warning('系统至少保留一个管理员账号，不能停用最后一位管理员');
      } else {
        if (u) u.status = '停用';
        this.dialogVisible = false;
        ElMessage.success('用户已停用');
      }
    },
    resetPwd(u) {
      this.dialogName = u.name;
      this.dialogDeptName = u.dept ? (this.depts[u.dept] ? this.depts[u.dept].name : '') : '';
      this.pwdSuffix = '4';
      this.pwdDialogVisible = true;
    },
    confirmResetPwd() {
      const u = AUTH.users ? AUTH.users[this.dialogName || ''] : undefined;
      if (!u) return;
      u.pwd = 'Rst@' + this.pwdSuffix;
      u.mustChange = true;
      this.pwdDialogVisible = false;
      ElMessage.success('密码已重置，临时密码为 Rst@' + this.pwdSuffix + '，请下次登录时修改');
    },
    selectReceiver() { this.dialogVisible = false; ElMessage.info('请在对话框中指定接收人'); },
    authResetDemo() { AUTH.authResetDemo(); this.search(); }
  }
};
registerRoute('/system/auth/users', AuthUsersPage, 'auth-users');

const AuthRolesPage = {
  template: `<div class="card card-pad">
    <h2>角色管理</h2>
    <el-form :model="roleForm" inline>
      <el-form-item label="角色名称" prop="name">
        <el-input v-model="roleForm.name" disabled />
      </el-form-item>
      <el-form-item label="说明" prop="desc">
        <el-input v-model="roleForm.desc" disabled />
      </el-form-item>
      <el-form-item label="菜单权限" prop="menus">
        <el-checkbox-group :options="menuOptions" v-model="roleForm.menus" />
      </el-form-item>
      <el-form-item label="按钮权限" prop="buttons">
        <el-checkbox-group :options="buttonOptions" v-model="roleForm.buttons" />
      </el-form-item>
      <el-form-item label="数据范围" prop="scope">
        <el-radio-group v-model="roleForm.scope">
          <el-radio label="本人" /> <el-radio label="本部门" /> <el-radio label="本部门及下属" /> <el-radio label="全部" />
        </el-radio-group>
      </el-form-item>
      <el-form-item label="查看完整手机号">
        <el-switch v-model="roleForm.phoneFull" />
      </el-form-item>
    </el-form>
    <p style="margin-top:24px;color:#909399;">财务角色固定：不能修改销售跟进</p>
    <div style="margin-top:24px">
      <el-button type="primary">保存</el-button>
      <el-button type="link">重置</el-button>
    </div>
    <div style="margin-top:24px;padding:16px;border:1px dashed #dcdfe6">
      <p>当前角色拥有的权限摘要：</p>
      <p>菜单: 工作台, 线索管理, 客户管理, 联系人管理, 商机管理, 报价管理, 合同管理, 订单管理, 回款管理, 活动管理, 数据分析</p>
      <p>按钮: 新增, 编辑, 导出, 分配</p>
      <p>数据范围: 本人</p>
      <p>查看手机号: 开</p>
    </div>
  </div>`,
  data() { return { 
    roleForm: { name: '系统管理员', desc: '', menus: ['工作台', '线索管理', '客户管理', '联系人管理', '商机管理', '产品管理', '报价管理', '合同管理', '订单管理', '回款管理', '活动管理', '数据分析'], buttons: ['新增', '编辑', '删除', '导出', '分配'], scope: '全部', phoneFull: true },
    menuOptions: ['工作台', '线索管理', '客户管理', '联系人管理', '商机管理', '产品管理', '报价管理', '合同管理', '订单管理', '回款管理', '活动管理', '数据分析', '系统管理'],
    buttonOptions: ['新增', '编辑', '删除', '导出', '分配']
  }; },
  methods: { authResetDemo() { AUTH.authResetDemo(); } }
};
registerRoute('/system/auth/roles', AuthRolesPage, 'auth-roles');