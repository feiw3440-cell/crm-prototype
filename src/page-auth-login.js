const LoginPage = {
  template: `<div class="card card-pad" style="max-width:400px;margin:80px auto">
    <div class="brand">CRM 登录</div>
    <h2>登录</h2>
    <el-form :model="loginForm" :rules="loginRules" ref="loginForm" inline class="form-gutter">
      <el-form-item label="账号或手机号" prefix-icon="User">
        <el-input v-model="loginForm.account" placeholder="请输入账号或手机号" clearable />
      </el-form-item>
      <el-form-item label="密码" prefix-icon="Lock">
        <el-input v-model="loginForm.pwd" type="password" placeholder="请输入密码" clearable />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="login">登录</el-button>
      </el-form-item>
    </el-form>
    <div style="margin-top:24px">
      <el-button type="danger" @click="authResetDemo">重置演示数据</el-button>
    </div>
    <div style="margin-top:24px;max-height:300px;overflow:auto">
      <el-tag type="primary" effect="plain">演示账号</el-tag>
      <table style="width:100%;border-collapse:collapse;margin-top:10px">
        <tr style="background:#f5f7fa"><th style="padding:8px">账号</th><th style="padding:8px">密码</th><th style="padding:8px">角色</th><th style="padding:8px">首次改密</th><th style="padding:8px">操作</th></tr>
        <tr v-for="acc in demoAccounts" :key="acc.id" style="border-bottom:1px solid #eee"><td style="padding:8px">{{ acc.account }}</td><td style="padding:8px">{{ acc.pwd }}</td><td style="padding:8px">{{ acc.role }}</td><td style="padding:8px">{{ acc.mustChange ? '是' : '否' }}</td><td style="padding:8px"><el-button size="small" @click="fillAccount(acc)">一键填入</el-button></td></tr>
        <tr><td colspan="5" style="padding:8px;text-align:center">---</td></tr>
      </table>
    </div>
  </div>`,
  data() { return { loginForm: { account: '', pwd: '' }, loginRules: { account: { required: true, message: '账号或手机号不能为空' }, pwd: { required: true, message: '密码不能为空' } }, demoAccounts: [{ id: 'u01', account: 'admin', pwd: 'Crm@2026', role: '系统管理员', mustChange: false }, { id: 'u02', account: 'zhouzj', pwd: 'Crm@2026', role: '销售总监', mustChange: false }, { id: 'u03', account: 'zhangsan', pwd: 'Crm@2026', role: '销售经理', mustChange: false }, { id: 'u04', account: 'lisi', pwd: 'Crm@2026', role: '销售经理', mustChange: false }, { id: 'u05', account: 'wangwu', pwd: 'Crm@2026', role: '销售人员', mustChange: false }, { id: 'u06', account: 'zhaoliu', pwd: 'Crm@2026', role: '销售人员', mustChange: false }, { id: 'u07', account: 'wangfang', pwd: 'Crm@2026', role: '财务人员', mustChange: false }, { id: 'u08', account: 'chenyue', pwd: 'Crm@2026', role: '销售人员', mustChange: false, status: '停用' }, { id: 'u09', account: 'newbie', pwd: 'Init@1234', role: '销售人员', mustChange: true }], _dummy: [] }},
  methods: { login() { const r = AUTH.authLogin(this.loginForm.account, this.loginForm.pwd); if (!r.ok) { ElMessage.error(r.msg); return; } if (r.user.mustChange) { location.hash = '#/change-password'; } else { location.hash = AUTH.roles[r.user.role]?.home || '/workbench'; } }, fillAccount(acc) { this.loginForm.account = acc.account; this.loginForm.pwd = acc.pwd; } }
};
registerRoute('/login', LoginPage, 'auth-login');

const ChangePwdPage = {
  template: `<div class="card card-pad" style="max-width:400px;margin:80px auto">
    <h2>修改密码</h2>
    <el-form :model="pwdForm" :rules="pwdRules" ref="pwdForm" inline class="form-gutter">
      <el-form-item label="旧密码" prefix-icon="Lock">
        <el-input v-model="pwdForm.old" type="password" placeholder="请输入旧密码" clearable />
      </el-form-item>
      <el-form-item label="新密码" prefix-icon="Lock">
        <el-input v-model="pwdForm.neu" type="password" placeholder="请输入新密码" clearable />
      </el-form-item>
      <el-form-item label="确认新密码">
        <el-input v-model="pwdForm.neuConfirm" type="password" placeholder="请再次输入新密码" clearable />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="changePwd">保存</el-button>
        <el-button v-if="!mustChange" @click="goBack">返回</el-button>
      </el-form-item>
      <template v-if="mustChange"><p style="color:#e96e00;margin:16px 0;font-size:13px">当前为强制改密状态，请务必修改密码</p></template>
    </el-form>
  </div>`,
  data() { return { pwdForm: { old: '', neu: '', neuConfirm: '' }, pwdRules: { old: { required: true, message: '旧密码不能为空' }, neu: { required: true, message: '新密码不能为空' }, neuConfirm: { required: true, message: '请再次输入新密码' } }, mustChange: false, _dummy: [] }},
  methods: { changePwd() { this.$refs.pwdForm.validate((valid) => { if (valid) { if (this.pwdForm.neu !== this.pwdForm.neuConfirm) { ElMessage.error('两次输入的密码不一致'); return; } const r = AUTH.authChangePwd(this.pwdForm.old, this.pwdForm.neu); if (!r.ok) { ElMessage.error(r.msg); return; } ElMessage.success(r.msg); location.hash = '#/workbench'; } else { ElMessage.error('请填写完整表单'); } }); }, goBack() { if (!this.mustChange) { location.hash = '#/workbench'; } } }
};
registerRoute('/change-password', ChangePwdPage, 'auth-changepw');

const NoPermissionPage = {
  props: { reason: String },
  template: `<div class="card card-pad">
    <el-alert type="error" show-icon :closable="false" style="margin-bottom:24px" title="无权限访问"/>
    <p style="margin:0 0 24px;font-size:13px">{{ reason }}</p>
    <el-button type="primary" @click="$go('/workbench')">返回我的工作台</el-button>
  </div>`
};
registerRoute('/no-permission', NoPermissionPage, 'auth-nopermission');