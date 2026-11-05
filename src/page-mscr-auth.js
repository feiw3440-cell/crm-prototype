/* ===== 移动端登录/改密屏 ===== */
const MLoginScreen = {
  components: { MForm, MField, MCard, MEmpty },
  template: `<div class="m-page" :class="{'no-tabbar': true}">
    <m-card title="登录">
      <m-form>
        <m-field label="账号或手机号" required>
          <el-input v-model="account" placeholder="请输入账号或手机号"/>
        </m-field>
        <m-field label="密码" required>
          <el-input v-model="pwd" type="password" placeholder="请输入密码"/>
        </m-field>
        <el-button type="primary" style="width:100%" @click="login">登录</el-button>
      </m-form>
    </m-card>
    <div class="m-demo-hint">
      <span>演示账号：</span>
      <table style="width:100%;border-collapse:collapse;margin-top:6px">
        <tr v-for="u in demoUsers" :key="u.id" style="font-size:12px;">
          <td style="padding:2px 4px;width:30%;"><b>{{ u.acc }}</b></td>
          <td style="padding:2px 4px;width:30%;"><b>{{ u.pwd }}</b></td>
          <td style="padding:2px 4px;width:20%;"><b>{{ u.name }}</b></td>
          <td style="padding:2px 4px;width:20%;"><b>{{ u.mustChange ? '需改密' : '' }}</b></td>
        </tr>
      </table>
      <el-button size="mini" style="margin-top:4px;float:right" @click="resetDemo">重置演示数据</el-button>
    </div>`,
  setup() {
    const AUTH = window.AUTH;
    const account = ref(''); const pwd = ref('');
    const demoUsers = computed(() => {
      const users = {}; let k = Object.keys(AUTH.users || {}); while (k.length) { const u = AUTH.users[k.shift()]; users[u.id] = u; } return Object.values(users);
    });
    const login = () => {
      const r = AUTH.authLogin(account.value.trim(), pwd.value.trim());
      if (!r.ok) { mToast(r.msg, 'error'); return; }
      if (r.user.mustChange) { mgo('changepw'); } else { mgo('home'); }
    };
    const resetDemo = () => { AUTH.authResetDemo(); mToast('演示数据已重置', 'success'); };
    return { account, pwd, login, resetDemo, mToast, mgo, demoUsers };
  }
};

const MChangePwdScreen = {
  components: { MForm, MField, MCard, MEmpty },
  template: `<div class="m-page" :class="{'no-tabbar': true}">
    <m-card title="修改密码">
      <m-form>
        <m-field label="旧密码" required>
          <el-input v-model="oldPwd" type="password" placeholder="请输入旧密码"/>
        </m-field>
        <m-field label="新密码" required>
          <el-input v-model="newPwd" type="password" placeholder="请输入新密码"/>
        </m-field>
        <m-field label="确认新密码" required>
          <el-input v-model="confirmPwd" type="password" placeholder="请再次输入新密码"/>
        </m-field>
        <el-button type="primary" style="width:100%" @click="save">保存</el-button>
      </m-form>
      <div v-if="mustChange" style="margin:8px 0;padding:4px;background:#fff8e1;border-left:3px solid #f5a623;font-size:12px;">
        当前为强制改密状态，请务必修改密码
      </div>
    </m-card>
  </m-card>`,
  setup() {
    const AUTH = window.AUTH;
    const oldPwd = ref(''); const newPwd = ref(''); const confirmPwd = ref('');
    const user = computed(() => AUTH.authUser());
    const mustChange = computed(() => user.value && user.value.mustChange === true);
    const save = () => {
      if (newPwd.value !== confirmPwd.value) { mToast('两次输入密码不一致', 'error'); return; }
      const r = AUTH.authChangePwd(oldPwd.value.trim(), newPwd.value.trim());
      if (!r.ok) { mToast(r.msg, 'error'); return; }
      mToast('密码修改成功', 'success');
      mgo('home');
    };
    return { oldPwd, newPwd, confirmPwd, save, mustChange, mToast, mgo };
  }
};

registerMScreen('login', MLoginScreen, { title: '登录', doc: 'm-login', tab: '' });
registerMScreen('changepw', MChangePwdScreen, { title: '修改密码', doc: 'm-changepw', tab: '' });