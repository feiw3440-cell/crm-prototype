/* ===== 移动端预览页：左侧手机框渲染 MobileApp，右侧功能清单与屏幕跳转 ===== */
const MobilePage = {
  components: { PageHead, MobileApp },
  setup() {
    const jumpTo = ref('');
    const feats = [
      ['首页', '问候、今日待办 / 待审批 / 逾期回款、快捷操作、今日日程、最近客户'],
      ['客户', '搜索与等级筛选、我的客户、分页加载；客户详情含联系人 / 跟进 / 商机 / 合同回款 / 工单'],
      ['日程', '周历条、当日活动、新建日程、拜访签到、拜访记录、活动详情'],
      ['待办', '待审批 / 待跟进 / 待回款 / 工单分段，支持完成与快捷处理'],
      ['我的', '个人信息、本月业绩进度、消息通知、业务入口、隐私与授权、退出登录'],
    ];
    const screenOptions = computed(() => Object.values(MSCREENS).map(s => ({ key: s.key, title: s.title, doc: s.doc })));
    const jump = k => { if (k) mgo(k); jumpTo.value = ''; };
    watch(() => mcur.value.key, k => { const s = MSCREENS[k]; if (s) docState.override = s.doc; }, { immediate: true });
    onMounted(() => { mgo('home'); });
    onBeforeUnmount(() => { mSetActions([]); docState.override = ''; });
    return { jumpTo, jump, feats, screenOptions, mnav, mcurScreen };
  },
  template: `<div>
    <page-head :crumbs="['工作台', '移动端预览']" title="移动端工作台" total="H5 / 企业微信 · 外勤、拜访、签到、审批、工单场景">
      <el-tag type="info" effect="plain">第 7 阶段 · 首页 / 客户 / 日程 / 待办 / 我的</el-tag>
    </page-head>
    <div class="mob-wrap">
      <div class="phone"><div class="screen">
        <div class="m-notch"></div>
        <mobile-app :sync-doc="true"/>
      </div></div>
      <div class="mob-side">
        <h3>移动端功能清单</h3>
        <div class="m-demo-tools">
          <span>跳转到屏幕</span>
          <el-select v-model="jumpTo" placeholder="选择要演示的屏幕" size="small" style="width:210px" @change="jump">
            <el-option v-for="s in screenOptions" :key="s.key" :label="s.title + '（' + s.key + '）'" :value="s.key"/>
          </el-select>
          <span class="muted" style="font-size:12px">当前：{{ mcurScreen ? mcurScreen.title : '-' }} · 文档 {{ mcurScreen ? mcurScreen.doc : '-' }}</span>
        </div>
        <table><tr><th>屏 / 功能</th><th>移动端能力</th></tr><tr v-for="f in feats" :key="f[0]"><td>{{ f[0] }}</td><td>{{ f[1] }}</td></tr></table>
        <el-alert type="info" :closable="false" show-icon style="margin-top:14px" title="定位 / 拍照 / 通讯录需明确授权" description="手机内操作会真实修改演示数据（写跟进、新建商机、签到、完成待办等），切换屏幕时右侧需求文档同步切换。"/>
        <p class="muted" style="font-size:13px">底部导航：首页 · 客户 · 日程 · 待办 · 我的；二级页面也保留底部栏。浏览器直接访问 <code>#/m</code> 可脱离 PC 外壳全屏体验。</p>
      </div>
    </div>
  </div>`,
};
registerRoute('/mobile', MobilePage, 'mobile');
registerRoute('/m', MobileStandalone, 'mobile');
registerRoute('/m/:screen', MobileStandalone, 'mobile');
