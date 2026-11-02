/* ===== 线索详情（/lead/:no）===== */
DOCS_DEFAULT['lead-detail'] = mkDoc('lead-detail', {
  name: '线索详情', module: '线索管理',
  goal: '集中展示单条线索的五个信息区域（基本信息、需求信息、跟进记录、关联信息、操作记录），并提供转化客户、分配、退回公海、标记无效等操作入口，作为线索从跟进到客户转化的落点页面，保证处理过程全程留痕（规划方案 5.2 / 6.1）。',
  roles: [
    '菜单 / 数据：负责人销售可转化、记录跟进、退回公海、标记无效本人线索；销售经理可分配团队线索；管理员可查看全部线索与操作日志；非授权人无操作按钮。',
    '按钮权限：转化客户、分配、退回公海、标记无效按角色显示；已转化 / 无效线索的转化按钮置灰。',
    '字段权限：手机号码等敏感字段按权限脱敏展示；操作日志对所有有权查看本线索的角色可见。'
  ],
  enter: [
    '线索列表 / 我的线索 / 公海点击线索编号或名称进入 /lead/:no。',
    '顶部全局搜索命中线索后跳转；跟进记录页、客户关联信息反查线索的链接。',
    '转化成功通知中「查看客户」链接可反查本页原始线索。'
  ],
  layout: [
    '头部：面包屑 + 线索名称 + 状态标签 + 来源标签 + 操作按钮（转化客户 / 分配 / 退回公海 / 标记无效）+ 预计金额与下次联系摘要卡。',
    '基本信息区：线索编号、状态、公司名称、联系人、联系电话、来源渠道、负责人、创建时间、重复提示。',
    '需求信息区：产品需求（需求类型）、预算（预计金额）、采购时间、需求描述。',
    '跟进记录区：按时间倒序的跟进时间线（电话 / 微信 / 拜访 / 邮件，含反馈与下一步）。',
    '关联信息区：来源活动、推荐人、相关附件。',
    '操作记录区：创建 / 分配 / 修改 / 转化 / 退回 / 无效的全部留痕（操作人 + 时间 + 内容）。'
  ],
  fields: [
    '线索编号｜类型：自动编号｜必填：是｜校验：全局唯一，格式 XS-年月-四位序号｜说明：系统生成，原始线索档案标识。',
    '线索名称｜类型：文本｜必填：是｜校验：非空｜说明：个人、公司或项目名称。',
    '公司名称｜类型：文本｜必填：是｜校验：与已有线索 / 客户名称查重｜说明：潜在企业名称，命中查重时头部与重复提示区展示重复对象。',
    '联系人｜类型：文本｜必填：是｜校验：非空｜说明：联系人姓名。',
    '手机号码｜类型：手机号｜必填：是｜校验：11 位手机号格式，参与查重｜说明：联系电话，按字段权限脱敏展示。',
    '来源渠道｜类型：下拉框｜必填：是｜校验：枚举（官网 / 广告 / 转介绍 / 活动 / 渠道）｜说明：来源标签展示在名称旁。',
    '需求类型｜类型：下拉框｜必填：否｜校验：产品或服务类别字典｜说明：需求信息区「产品需求」来源。',
    '预计金额｜类型：金额｜必填：否｜校验：大于等于 0｜说明：初步预算，转化时作为商机预计金额默认值。',
    '采购时间｜类型：日期｜必填：否｜校验：不早于创建时间｜说明：需求信息区展示的计划采购时间（原型示例数据）。',
    '需求描述｜类型：多行文本｜必填：否｜校验：无｜说明：需求信息区的文字描述。',
    '下次联系时间｜类型：日期时间｜必填：否｜校验：不早于当前时间｜说明：计划跟进时间，头部摘要卡展示。',
    '线索状态｜类型：状态｜必填：是｜校验：枚举（新建 / 跟进中 / 已转化 / 无效）｜说明：只能通过业务操作流转，不能直接修改。',
    '重复提示｜类型：文本｜必填：否｜校验：命中查重规则时生成｜说明：提示重复对象、重复依据，转化前建议关联已有客户。',
    '来源活动 / 推荐人 / 相关附件｜类型：文本 / 附件｜必填：否｜校验：来源为活动或转介绍时展示｜说明：关联信息区内容，保留线索溯源信息。'
  ],
  rules: [
    '转化客户弹窗按规划方案 6.1 展示：客户处理方式（创建新客户 / 关联现有客户）、客户名称、客户类型、所属行业、联系人姓名及联系方式、是否创建商机（商机名称 / 预计金额 / 预计成交日期）、新客户负责人；保存时同一事务创建客户 / 联系人 /（可选）商机，任一步失败整体回滚。',
    '转化前先检查客户是否已存在（按手机号、公司名称）：线索命中已有客户时默认「关联现有客户」，避免重复建档；转化后状态置为「已转化」、保留原始线索与全部跟进历史。',
    '分配必须选择负责人（必选校验），可填备注；分配后写入操作日志。',
    '退回公海：负责人清空、状态回到「新建」，历史跟进记录保留，弹出确认框防止误操作。',
    '标记无效必须填写无效原因（枚举：联系方式无效 / 无采购意向 / 已被竞品签约 / 信息不真实 / 重复线索）与补充说明，原因写入操作日志。',
    '操作留痕：创建、分配、修改、转化、退回、标记无效全部记录操作人与时间，重要操作可在系统日志查询。'
  ],
  flow: [
    '状态流转：新建 → 跟进中（记录跟进）→ 已转化 / 无效；跟进中 / 新建且无异常时可退回公海（回到新建、负责人清空）；已转化为终态不可再转化，转化按钮置灰。',
    '转化链路（规划方案 6.1）：转化客户 → 重复检测（客户是否已存在）→ 创建或关联客户 → 创建或关联联系人 → 创建商机 → 线索转化完成；转化失败整体回滚并保留原始线索。',
    '自动化提醒（规划方案 7.3）：到达下次联系时间创建待办并通知负责人；超过指定时长未跟进提醒负责人或按公海规则自动回收。'
  ],
  errors: [
    '线索不存在：显示空态与「返回线索列表」按钮，不报错。',
    '线索转化失败：客户 / 联系人 / 商机任一步创建失败整体回滚，不生成半成品客户关系，原始线索与跟进历史保留（规划方案十二「线索转化失败」）。',
    '重复提示：命中查重的线索头部展示警示条，转化弹窗默认关联现有客户，可人工确认合并或关联（规划方案十二「重复录入」）。',
    '分配未选负责人 / 标记无效未填原因：前端拦截并提示，弹窗保持打开。',
    '用户越权操作：非负责人 / 非授权角色不展示操作按钮，越权请求后端拦截并记录安全日志（规划方案十二）。'
  ],
  api: [
    '线索详情查询接口：返回线索字段、查重结果、关联信息与操作日志。',
    '线索转化事务接口：同一事务创建 / 关联客户、联系人、商机，返回结果；失败回滚。',
    '分配 / 领取 / 退回公海 / 标记无效接口：校验与权限检查，写操作日志。',
    '跟进时间线查询、待办生成与操作日志接口（示例）。'
  ],
  accept: [
    '对应规划方案第十四章「线索管理：能创建、分配、查重、跟进、转化」：本页可完成分配、跟进查看、转化、标记无效、退回公海全部操作并即时更新状态与日志。',
    '对应重点验收场景「从新增线索开始，完整转化为客户、联系人和商机」：在详情页发起转化，完成后状态置为已转化、写入转化时间与客户编号，客户 / 商机详情可反查。',
    '五个信息区域（基本信息 / 需求信息 / 跟进记录 / 关联信息 / 操作记录）与规划方案 5.2 一致，本线索数据与其他线索隔离。',
    '转化弹窗字段与校验齐全：未选客户处理方式 / 商机信息缺失时拦截；命中已有客户时默认关联现有客户。',
    '操作后无控制台报错，操作日志按时间倒序追加，操作人与时间完整可查。'
  ],
  version: ['2026-11-02 · 张三 · 创建本页需求文档（原型版）', '2026-11-02 · 对齐规划方案 5.2 / 6.1 / 7.3 / 十二 / 十四 · 补需求信息与关联信息区、转化弹窗五要素与验收标准'],
});
const LeadDetailPage = {
  components: { PageHead },
  props: { no: String },
  setup(props) {
    const lead = computed(() => store.leads.find(l => l.no === props.no));
    const stTag = { 新建: 'info', 跟进中: 'primary', 已转化: 'success', 无效: 'danger' };
    const acts = computed(() => {
      const l = lead.value; if (!l) return [];
      const got = store.ext.activities.filter(a => a.customer === l.company).slice().sort((a, b) => (a.time < b.time ? 1 : -1));
      if (got.length) return got;
      const day = l.created.slice(0, 10);
      return [
        { no: '', time: l.created, who: '系统', type: '系统', status: '已完成', content: '线索创建（来源：' + l.source + '）', feedback: '', next: '' },
        { no: '', time: day + ' 15:30', who: l.owner || '待分配', type: '微信', status: '已完成', content: '微信发送公司介绍与「' + l.need + '」相关产品资料给 ' + l.contact + '。', feedback: l.next ? '已约定下次跟进时间。' : '对方暂未回复。', next: '' },
        { no: '', time: day + ' 10:00', who: l.owner || '待分配', type: '电话', status: '已完成', content: '与 ' + l.contact + ' 首次电话沟通「' + l.need + '」需求，确认职位与采购角色。', feedback: '有初步意向，待确认预算与决策周期。', next: l.next || '' },
      ];
    });
    const logsExtra = ref([]);
    const addLog = (act, detail) => logsExtra.value.unshift({ time: TODAY + ' 16:00', who: '张三', act, detail });
    const logsBase = computed(() => {
      const l = lead.value; if (!l) return [];
      const arr = [{ time: l.created, who: l.owner || '张三', act: '创建线索', detail: '来源：' + l.source + '；需求：' + l.need }];
      if (l.owner) arr.push({ time: l.created.slice(0, 10) + ' 10:30', who: '销售经理', act: '分配线索', detail: '分配给 ' + l.owner });
      if (l.status === '已转化') arr.push({ time: l.convertedAt || (l.created.slice(0, 10) + ' 17:00'), who: l.owner || '张三', act: '转化为客户', detail: '已生成客户编号 ' + (l.convertedTo || '-') });
      store.ext.logs.filter(x => x.detail.includes(l.company)).slice(0, 4).forEach(x => arr.push({ time: x.time, who: x.who, act: x.module + ' · ' + x.act, detail: x.detail }));
      return arr;
    });
    const logs = computed(() => logsExtra.value.concat(logsBase.value));
    const dlg = reactive({ assign: false, invalid: false, convert: false });
    const af = reactive({ owner: '', reason: '' });
    const iv = reactive({ reason: '', remark: '' });
    // 需求信息与关联信息（规划方案 5.2 详情页区域）
    const needTime = computed(() => lead.value && lead.value.status === '跟进中' ? '2026 年 Q4（跟进中确认）' : '—');
    const relActivity = computed(() => lead.value && lead.value.source === '活动' ? '2026 华东数字化巡展' : '—');
    const referrer = computed(() => lead.value && lead.value.source === '转介绍' ? '江苏某某集团 · 周主任' : '—');
    const doAssign = () => {
      if (!af.owner) return ElMessage.warning('请选择负责人');
      lead.value.owner = af.owner; addLog('分配线索', '分配给 ' + af.owner + (af.reason ? '；原因：' + af.reason : ''));
      dlg.assign = false; ElMessage.success('已将线索分配给 ' + af.owner + '，操作已记录');
    };
    const doBack = () => ElMessageBox.confirm('确认将线索「' + lead.value.company + '」退回公海？退回后负责人清空、状态回到「新建」，历史跟进记录保留。', '退回公海', { type: 'warning', confirmButtonText: '确认退回', cancelButtonText: '取消' })
      .then(() => { lead.value.owner = ''; lead.value.status = '新建'; addLog('退回公海', '负责人清空，线索回到公海'); ElMessage.success('已退回公海，历史跟进记录保留'); }).catch(() => {});
    const doInvalid = () => {
      if (!iv.reason) return ElMessage.warning('请选择无效原因（必填）');
      lead.value.status = '无效'; addLog('标记无效', '原因：' + iv.reason + (iv.remark ? '；说明：' + iv.remark : ''));
      dlg.invalid = false; ElMessage.success('已标记为无效，原因已记录');
    };
    // 转化客户弹窗（规划方案 6.1：客户处理方式 / 客户信息 / 联系人 / 商机 / 新客户负责人）
    const cv = reactive({ mode: 'new', custName: '', custType: '企业客户', industry: '', owner: '张三', linkNo: '', contactName: '', contactPhone: '', createOpp: true, oppName: '', oppAmount: 0, oppDate: '', saving: false });
    const exCusts = computed(() => store.customers.slice(0, 12));
    const cvDup = computed(() => lead.value && lead.value.dup && lead.value.dup.customerNo ? lead.value.dup : null);
    const openConvert = () => {
      const l = lead.value; if (!l || l.status === '已转化' || l.status === '无效') return;
      Object.assign(cv, { mode: (l.dup && l.dup.customerNo) ? 'link' : 'new', custName: l.company, custType: '企业客户', industry: '', owner: l.owner || '张三', linkNo: (l.dup && l.dup.customerNo) || '', contactName: l.contact, contactPhone: l.phone, createOpp: true, oppName: l.company.replace(/有限公司|有限责任公司/, '') + ' ' + l.need + ' 项目', oppAmount: l.amount, oppDate: '2026-12-31', saving: false });
      dlg.convert = true;
    };
    const doConvert = () => {
      if (cv.mode === 'new' && (!cv.custName || !cv.industry)) return ElMessage.warning('请填写客户名称并选择所属行业');
      if (cv.mode === 'link' && !cv.linkNo) return ElMessage.warning('请选择要关联的现有客户');
      if (!cv.contactName || !cv.contactPhone) return ElMessage.warning('请填写联系人姓名及联系方式');
      if (cv.createOpp && (!cv.oppName || !cv.oppAmount || !cv.oppDate)) return ElMessage.warning('请完整填写商机名称、预计金额、预计成交日期');
      cv.saving = true;
      setTimeout(() => {
        const l = lead.value; let custNo = cv.linkNo; const created = [];
        try {
          if (cv.mode === 'new') {
            if (store.customers.some(c => c.name === cv.custName)) throw new Error('客户名称已存在，请选择关联现有客户');
            store.seq.customer++; custNo = 'KH-202611-' + String(store.seq.customer).padStart(4, '0');
            store.customers.unshift({ no: custNo, name: cv.custName, type: cv.custType, industry: cv.industry, level: '潜在客户', source: l.source, region: '江苏省南京市', scale: '中型', owner: cv.owner, status: '跟进中', lastFollow: TODAY, lastDeal: '-', total: 0, created: TODAY, phone: cv.contactPhone, key: false });
            created.push('客户 ' + custNo);
          } else created.push('关联现有客户 ' + custNo);
          created.push('联系人 ' + cv.contactName);
          if (cv.createOpp) { store.opps.unshift({ no: 'SJ-202611-0' + (40 + store.opps.length), name: cv.oppName, customer: cv.mode === 'new' ? cv.custName : (store.customers.find(c => c.no === custNo) || {}).name, amount: cv.oppAmount, date: cv.oppDate, owner: cv.owner, stage: 'contact', prob: 10, info: {}, flags: {} }); created.push('商机「' + cv.oppName + '」'); }
          l.status = '已转化'; l.convertedAt = TODAY + ' 16:00'; l.convertedTo = custNo;
          addLog('转化为客户', '同一事务创建：' + created.join('、') + '；原始线索与跟进历史保留');
          cv.saving = false; dlg.convert = false;
          ElNotification({ title: '线索转化完成', message: '已在同一事务中创建：' + created.join('、') + '。原始线索与跟进历史已保留。', type: 'success', duration: 5000 });
        } catch (e) {
          cv.saving = false;
          ElMessage.error('线索转化失败：' + e.message + '。已整体回滚，原始线索与跟进历史保留，未生成半成品客户关系');
        }
      }, 700);
    };
    return { lead, stTag, acts, logs, dlg, af, iv, doAssign, doBack, doInvalid, openConvert, doConvert, cv, cvDup, exCusts, needTime, relActivity, referrer, OWNERS, INDUSTRIES, go, yuan };
  },
  template: `<div v-if="lead">
    <el-breadcrumb separator="/" class="crumb"><el-breadcrumb-item><a @click="$go('/leads')">线索管理</a></el-breadcrumb-item><el-breadcrumb-item><a @click="$go('/leads')">线索列表</a></el-breadcrumb-item><el-breadcrumb-item>{{ lead.no }}</el-breadcrumb-item></el-breadcrumb>
    <div class="card cust-head">
      <div class="cust-logo">{{ lead.company[0] }}</div>
      <div>
        <h2>{{ lead.name }}<el-tag :type="stTag[lead.status]" size="small">{{ lead.status }}</el-tag><el-tag type="info" size="small" effect="plain">{{ lead.source }}</el-tag></h2>
        <div class="cust-meta"><span>线索编号：<b>{{ lead.no }}</b></span><span>负责人：<b>{{ lead.owner || '（公海 · 待分配）' }}</b></span><span>创建时间：<b>{{ lead.created }}</b></span></div>
        <div style="margin-top:10px;display:flex;gap:8px">
          <el-button type="primary" size="small" icon="Promotion" :disabled="lead.status==='已转化'||lead.status==='无效'" @click="openConvert">转化客户 / 商机</el-button>
          <el-button size="small" icon="User" @click="af.owner=lead.owner;af.reason='';dlg.assign=true">分配</el-button>
          <el-button size="small" :disabled="!lead.owner" @click="doBack">退回公海</el-button>
          <el-button size="small" type="warning" plain :disabled="lead.status==='已转化'" @click="iv.reason='';iv.remark='';dlg.invalid=true">标记无效</el-button>
        </div>
      </div>
      <div class="sum-cards"><div class="sum-card"><div class="v">{{ yuan(lead.amount) }}</div><div class="l">预计金额</div></div><div class="sum-card"><div class="v">{{ lead.next || '-' }}</div><div class="l">下次联系</div></div></div>
    </div>
    <el-alert v-if="lead.dup" type="warning" show-icon :closable="false" style="margin-bottom:12px" :title="'重复提示：该线索与已有' + lead.dup.type + '可能重复（' + lead.dup.why + '：' + lead.dup.ref + '），转化前请核对合并或关联已有客户。'"/>
    <div class="card card-pad">
      <div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:20px">
        <div>
          <div class="sec-title">基本信息</div>
          <el-descriptions :column="2" border size="default">
            <el-descriptions-item label="线索编号">{{ lead.no }}</el-descriptions-item><el-descriptions-item label="线索状态">{{ lead.status }}</el-descriptions-item>
            <el-descriptions-item label="公司名称" :span="2">{{ lead.company }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ lead.contact }}</el-descriptions-item><el-descriptions-item label="联系电话">{{ lead.phone }}</el-descriptions-item>
            <el-descriptions-item label="来源渠道">{{ lead.source }}</el-descriptions-item><el-descriptions-item label="负责人">{{ lead.owner || '（公海 · 待分配）' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间" :span="2">{{ lead.created }}</el-descriptions-item>
            <el-descriptions-item label="重复提示" :span="2">{{ lead.dup ? ('与' + lead.dup.type + '「' + lead.dup.ref + '」' + lead.dup.why) : '未命中查重规则' }}</el-descriptions-item>
          </el-descriptions>
          <div class="sec-title" style="margin-top:20px">需求信息</div>
          <el-descriptions :column="2" border size="default">
            <el-descriptions-item label="产品需求（需求类型）">{{ lead.need }}</el-descriptions-item><el-descriptions-item label="预算（预计金额）">{{ yuan(lead.amount) }}</el-descriptions-item>
            <el-descriptions-item label="采购时间">{{ needTime }}</el-descriptions-item><el-descriptions-item label="下次跟进时间">{{ lead.next || '-' }}</el-descriptions-item>
            <el-descriptions-item label="需求描述" :span="2">围绕「{{ lead.need }}」方向的初步商务沟通，预算与采购周期以跟进记录确认为准。</el-descriptions-item>
          </el-descriptions>
          <div class="sec-title" style="margin-top:20px">跟进记录时间线</div>
          <el-timeline style="padding-left:6px">
            <el-timeline-item v-for="(a,i) in acts" :key="(a.no||'')+a.time+i" :timestamp="a.time + ' · ' + (a.who || lead.owner || '待分配')" placement="top" :type="i===0?'primary':''" :hollow="i!==0">
              <div class="tl-item-card"><div style="display:flex;gap:8px;align-items:center"><el-tag size="small">{{ a.type }}</el-tag><b>{{ a.content }}</b></div>
                <div class="muted" style="font-size:13px;margin-top:6px" v-if="a.feedback">反馈：{{ a.feedback }}</div>
                <div class="muted" style="font-size:13px">状态：{{ a.status }}<template v-if="a.next"> · 下一步：{{ a.next }}</template></div></div>
            </el-timeline-item>
          </el-timeline>
        </div>
        <div>
          <div class="sec-title">关联信息</div>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="来源活动">{{ relActivity }}</el-descriptions-item>
            <el-descriptions-item label="推荐人">{{ referrer }}</el-descriptions-item>
            <el-descriptions-item label="相关附件"><a class="link" @click="$msg.info('示例：预觘认证文件（按权限展示）')">名片信息.jpg</a> · <a class="link" @click="$msg.info('示例：下载附件（按权限展示）')">需求初稿.xlsx</a></el-descriptions-item>
          </el-descriptions>
          <div class="sec-title" style="margin-top:20px">操作日志</div>
          <el-timeline>
            <el-timeline-item v-for="(g,i) in logs" :key="g.time+g.act+i" :timestamp="g.time + ' · ' + g.who" placement="top" :hollow="i!==0">
              <b>{{ g.act }}</b><div class="muted" style="font-size:13px">{{ g.detail }}</div>
            </el-timeline-item>
          </el-timeline>
          <div class="sec-title" style="margin-top:20px">操作规则</div>
          <el-alert type="info" :closable="false" show-icon title="转化、分配、退回公海与标记无效均写入操作日志（操作人/时间/内容）；标记无效必须填写原因；已转化线索不可再次转化。"/>
        </div>
      </div>
    </div>
    <el-dialog v-model="dlg.assign" title="分配线索" width="440px">
      <el-form label-width="90px"><el-form-item label="分配给" required><el-select v-model="af.owner" placeholder="选择销售人员" style="width:100%"><el-option v-for="o in OWNERS" :key="o" :value="o"/></el-select></el-form-item>
      <el-form-item label="备注"><el-input v-model="af.reason" type="textarea" :rows="2"/></el-form-item></el-form>
      <template #footer><el-button @click="dlg.assign=false">取消</el-button><el-button type="primary" @click="doAssign">确认分配</el-button></template>
    </el-dialog>
    <el-dialog v-model="dlg.convert" title="转化客户" width="700px" top="6vh" :close-on-click-modal="false">
      <template v-if="lead">
        <el-alert v-if="cvDup" type="warning" show-icon :closable="false" style="margin-bottom:14px">
          <template #title>转化前查重：检测到已存在客户「{{ cvDup.ref }}」（{{ cvDup.why }}）</template>
          <div style="font-size:12px;margin-top:4px">为避免重复建客户，已默认关联现有客户；仍需新建请确认不是同一组织。</div></el-alert>
        <el-alert v-else type="success" show-icon :closable="false" style="margin-bottom:14px" title="转化前查重：未发现重复客户（已按手机号、公司名称检查），可创建新客户。" />
        <el-form label-width="108px" size="default">
          <div class="sec-title">客户处理方式</div>
          <el-form-item label="处理方式" required><el-radio-group v-model="cv.mode"><el-radio-button label="new">创建新客户</el-radio-button><el-radio-button label="link">关联现有客户</el-radio-button></el-radio-group></el-form-item>
          <template v-if="cv.mode==='new'">
            <el-row :gutter="12"><el-col :span="12"><el-form-item label="客户名称" required><el-input v-model="cv.custName"/></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="客户类型" required><el-select v-model="cv.custType" style="width:100%"><el-option v-for="x in ['企业客户','个人客户','渠道客户']" :key="x" :value="x"/></el-select></el-form-item></el-col></el-row>
            <el-row :gutter="12"><el-col :span="12"><el-form-item label="所属行业" required><el-select v-model="cv.industry" placeholder="请选择" style="width:100%"><el-option v-for="x in INDUSTRIES" :key="x" :value="x"/></el-select></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="新客户负责人" required><el-select v-model="cv.owner" style="width:100%"><el-option v-for="x in OWNERS" :key="x" :value="x"/></el-select></el-form-item></el-col></el-row>
          </template>
          <el-form-item v-else label="现有客户" required><el-select v-model="cv.linkNo" filterable placeholder="搜索并选择现有客户" style="width:100%"><el-option v-for="c in exCusts" :key="c.no" :value="c.no" :label="c.no+' · '+c.name"/></el-select></el-form-item>
          <div class="sec-title">联系人</div>
          <el-row :gutter="12"><el-col :span="12"><el-form-item label="联系人姓名" required><el-input v-model="cv.contactName"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="联系方式" required><el-input v-model="cv.contactPhone"/></el-form-item></el-col></el-row>
          <div class="sec-title">商机</div>
          <el-form-item label="创建商机"><el-switch v-model="cv.createOpp" active-text="是" inactive-text="否"/></el-form-item>
          <template v-if="cv.createOpp">
            <el-form-item label="商机名称" required><el-input v-model="cv.oppName"/></el-form-item>
            <el-row :gutter="12"><el-col :span="12"><el-form-item label="预计金额" required><el-input-number v-model="cv.oppAmount" :min="0" :step="10000" :controls="false" style="width:100%"/></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="预计成交日期" required><el-date-picker v-model="cv.oppDate" type="date" value-format="YYYY-MM-DD" style="width:100%"/></el-form-item></el-col></el-row>
          </template>
        </el-form>
        <div class="muted" style="font-size:12px;padding-left:4px"><el-icon><lock/></el-icon> 保存时客户、联系人、商机在同一事务中创建，任一步失败则整体回滚，原始线索与跟进历史始终保留。</div>
      </template>
      <template #footer><el-button @click="dlg.convert=false">取消</el-button><el-button type="primary" :loading="cv.saving" @click="doConvert">确认转化</el-button></template>
    </el-dialog>
    <el-dialog v-model="dlg.invalid" title="标记无效" width="440px">
      <el-form label-width="90px"><el-form-item label="无效原因" required><el-select v-model="iv.reason" placeholder="请选择" style="width:100%"><el-option v-for="x in ['联系方式无效','无采购意向','已被竞品签约','信息不真实','重复线索']" :key="x" :value="x"/></el-select></el-form-item>
      <el-form-item label="补充说明"><el-input v-model="iv.remark" type="textarea" :rows="3"/></el-form-item></el-form>
      <template #footer><el-button @click="dlg.invalid=false">取消</el-button><el-button type="danger" @click="doInvalid">确认标记</el-button></template>
    </el-dialog>
  </div>
  <div v-else class="card card-pad" style="text-align:center;padding:60px"><el-empty description="未找到该线索（示例数据中不存在）"><el-button type="primary" @click="$go('/leads')">返回线索列表</el-button></el-empty></div>`,
};
registerRoute('/lead/:no', LeadDetailPage, 'lead-detail');
