const LeadsPage = {
  components: { ListPage },
  props: { tab: { type: String, default: 'all' } },
  setup(props) {
    const TABS = { all: '线索列表', my: '我的线索', pool: '线索公海', records: '线索转化记录' };
    const rows = computed(() => store.leads.filter(l => props.tab === 'my' ? l.owner === '张三' : props.tab === 'pool' ? !l.owner && l.status !== '已转化' : props.tab === 'records' ? l.status === '已转化' : true));
    const dupCount = computed(() => store.leads.filter(l => l.dup && l.status !== '已转化').length);
    const totalText = computed(() => '线索共 ' + store.leads.length + ' 条');
    const stats = computed(() => [
      ['线索总数', String(store.leads.length), '', '含公海与已转化'], ['待分配（公海）', String(store.leads.filter(l => !l.owner && l.status !== '已转化').length), 'warn'],
      ['跟进中', String(store.leads.filter(l => l.status === '跟进中').length)], ['疑似重复', String(dupCount.value), 'danger'], ['本月已转化', String(store.leads.filter(l => l.status === '已转化').length), 'ok']]);
    const cols = computed(() => {
      const base = [
        { p: 'no', l: '线索编号', w: 140, link: true }, { p: 'name', l: '线索名称', w: 160 }, { p: 'company', l: '公司名称', w: 270, noTip: true }, { p: 'contact', l: '联系人', w: 90 },
        { p: 'phone', l: '手机号码', w: 120 }, { p: 'source', l: '来源渠道', w: 90 }, { p: 'need', l: '需求类型', w: 120 }, { p: 'amount', l: '预计金额', w: 110, money: true },
        { p: 'status', l: '线索状态', w: 100, tag: { 新建: 'info', 跟进中: 'primary', 已转化: 'success', 无效: 'danger' } }, { p: 'owner', l: '负责人', w: 90 }, { p: 'next', l: '下次联系时间', w: 150 }, { p: 'created', l: '创建时间', w: 150 }];
      return props.tab === 'records' ? base.concat([{ p: 'convertedAt', l: '转化时间', w: 150 }, { p: 'convertedTo', l: '转化为客户', w: 140 }]) : base;
    });
    const t = computed(() => TABS[props.tab]);
    // ---------- 弹窗状态 ----------
    const dlg = reactive({ assign: false, follow: false, invalid: false, convert: false, add: false });
    const curLead = ref(null); const batch = ref([]);
    const assignForm = reactive({ owner: '', reason: '' });
    const followForm = reactive({ type: '电话', content: '', feedback: '', next: '' });
    const invalidForm = reactive({ reason: '', remark: '' });
    const addForm = reactive({ company: '', contact: '', phone: '', source: '官网', need: '', amount: 0 });
    const dupCheck = computed(() => {
      const res = [];
      if (addForm.phone && addForm.phone.length >= 7) store.leads.concat([]).forEach(l => { if (l.phone.replace(/\*/g, '').length && addForm.phone.replace(/\D/g, '').slice(-4) === l.phone.slice(-4) && addForm.phone.replace(/\D/g, '').slice(0, 3) === l.phone.slice(0, 3)) res.push({ why: '手机号相同', ref: l.no + ' · ' + l.company }); });
      if (addForm.company && addForm.company.length >= 4) {
        store.customers.forEach(c => { if (c.name.includes(addForm.company) || addForm.company.includes(c.name)) res.push({ why: '公司名称与已有客户一致', ref: c.no + ' · ' + c.name }); });
        store.leads.forEach(l => { if (l.company === addForm.company) res.push({ why: '公司名称相同', ref: l.no + ' · ' + l.company }); });
      }
      return res;
    });
    const openAssign = (row, sel) => { batch.value = row ? [row] : sel; if (!batch.value.length) return ElMessage.warning('请先勾选需要分配的线索'); assignForm.owner = ''; assignForm.reason = ''; dlg.assign = true; };
    const doAssign = () => { if (!assignForm.owner) return ElMessage.warning('请选择负责人');
      batch.value.forEach(l => { l.owner = assignForm.owner; }); dlg.assign = false; ElMessage.success(`已将 ${batch.value.length} 条线索分配给 ${assignForm.owner}，操作记录已写入`); };
    const claim = row => ElMessageBox.confirm(`确认从公海领取线索「${row.company}」？领取后保护期 7 天，每人领取上限 50 条（当前已领 18 条）。`, '领取线索', { type: 'info' }).then(() => { row.owner = '张三'; row.status = '跟进中'; ElMessage.success('领取成功，已加入「我的线索」'); }).catch(() => {});
    const openFollow = row => { curLead.value = row; Object.assign(followForm, { type: '电话', content: '', feedback: '', next: '' }); dlg.follow = true; };
    const doFollow = () => { if (!followForm.content) return ElMessage.warning('请填写跟进内容');
      curLead.value.status = '跟进中'; if (followForm.next) curLead.value.next = followForm.next.replace('T', ' ').slice(0, 16); dlg.follow = false; ElMessage.success('跟进记录已保存' + (followForm.next ? '，已按下次联系时间自动生成待办' : '')); };
    const openInvalid = row => { curLead.value = row; Object.assign(invalidForm, { reason: '', remark: '' }); dlg.invalid = true; };
    const doInvalid = () => { if (!invalidForm.reason) return ElMessage.warning('请选择无效原因（必填）'); curLead.value.status = '无效'; dlg.invalid = false; ElMessage.success('已标记为无效，原因已记录'); };
    const release = row => ElMessageBox.confirm(`确认将线索「${row.company}」退回公海？`, '退回公海', { type: 'warning' }).then(() => { row.owner = ''; row.status = '新建'; ElMessage.success('已退回公海，历史跟进记录保留'); }).catch(() => {});
    const cmd = (c, row) => ({ assign: () => openAssign(row), invalid: () => openInvalid(row), release: () => release(row) })[c]();
    const submitAdd = () => { if (!addForm.company || !addForm.contact || !addForm.phone) return ElMessage.warning('公司名称、联系人、手机号码为必填项');
      if (!/^1\d{10}$/.test(addForm.phone) && !/^1\d{2}\*{4}\d{4}$/.test(addForm.phone)) return ElMessage.warning('手机号格式不正确');
      const n = String(store.leads.length + 20).padStart(4, '0');
      store.leads.unshift({ no: 'XS-202611-' + n, name: addForm.need || '新建线索', company: addForm.company, contact: addForm.contact, phone: addForm.phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2'), source: addForm.source, need: addForm.need || '-', amount: addForm.amount || 0, status: '新建', owner: '', next: '', created: '2026-11-02 07:00', dup: dupCheck.value.length ? { type: '线索/客户', ref: dupCheck.value[0].ref, why: dupCheck.value[0].why } : undefined });
      dlg.add = false; ElMessage.success('线索已创建并进入待分配线索池'); };
    const openAdd = () => { Object.assign(addForm, { company: '', contact: '', phone: '', source: '官网', need: '', amount: 0 }); dlg.add = true; };
    const NEED_TYPES = ['CRM 软件', 'ERP 对接', 'MES 系统', '服务工单', 'BI 数据平台', '会员运营', '渠道代理', '实施服务', '培训服务', '定制开发'];
    // ---------- 转化客户（方案 6.1） ----------
    const cv = reactive({ mode: 'new', custName: '', custType: '企业客户', industry: '', owner: '张三', linkNo: '', contactName: '', contactPhone: '', contactTitle: '', createOpp: true, oppName: '', oppAmount: 0, oppDate: '', saving: false });
    const cvDup = computed(() => curLead.value && curLead.value.dup && curLead.value.dup.customerNo ? curLead.value.dup : null);
    const openConvert = row => {
      curLead.value = row;
      Object.assign(cv, { mode: row.dup && row.dup.customerNo ? 'link' : 'new', custName: row.company, custType: '企业客户', industry: '', owner: '张三', linkNo: row.dup && row.dup.customerNo ? row.dup.customerNo : '', contactName: row.contact, contactPhone: row.phone, contactTitle: '', createOpp: true, oppName: row.company.replace(/有限公司|有限责任公司/, '') + ' ' + row.need + ' 项目', oppAmount: row.amount, oppDate: '2026-12-31', saving: false });
      dlg.convert = true;
    };
    const doConvert = () => {
      if (cv.mode === 'new' && (!cv.custName || !cv.industry)) return ElMessage.warning('请填写客户名称并选择所属行业');
      if (cv.mode === 'link' && !cv.linkNo) return ElMessage.warning('请选择要关联的现有客户');
      if (!cv.contactName || !cv.contactPhone) return ElMessage.warning('请填写联系人姓名及联系方式');
      if (cv.createOpp && (!cv.oppName || !cv.oppAmount || !cv.oppDate)) return ElMessage.warning('请完整填写商机名称、预计金额、预计成交日期');
      cv.saving = true;
      setTimeout(() => {
        const l = curLead.value; let custNo = cv.linkNo; const created = [];
        if (cv.mode === 'new') {
          store.seq.customer++; custNo = 'KH-202611-' + String(store.seq.customer).padStart(4, '0');
          store.customers.unshift({ no: custNo, name: cv.custName, type: cv.custType, industry: cv.industry, level: '潜在客户', source: l.source, region: '江苏省南京市', scale: '中型', owner: cv.owner, status: '跟进中', lastFollow: TODAY, lastDeal: '-', total: 0, created: TODAY, phone: cv.contactPhone, key: false });
          created.push('客户 ' + custNo);
        } else created.push('关联现有客户 ' + custNo);
        created.push('联系人 ' + cv.contactName);
        if (cv.createOpp) { store.opps.unshift({ no: 'SJ-202611-0' + (40 + store.opps.length), name: cv.oppName, customer: cv.mode === 'new' ? cv.custName : (store.customers.find(c => c.no === custNo) || {}).name, amount: cv.oppAmount, date: cv.oppDate, owner: cv.owner, stage: 'contact', prob: 10, info: {}, flags: {} }); created.push('商机「' + cv.oppName + '」'); }
        l.status = '已转化'; l.convertedAt = '2026-11-02 07:00'; l.convertedTo = custNo; cv.saving = false; dlg.convert = false;
        ElNotification({ title: '线索转化完成', message: '已在同一事务中创建：' + created.join('、') + '。原始线索与跟进历史已保留。', type: 'success', duration: 5000 });
      }, 700);
    };
    const dupLink = row => ({ type: row.dup.type, text: row.dup.why + '：' + row.dup.ref });
    const hasCust = no => store.customers.some(c => c.no === no);
    return { hasCust, rows, stats, cols, t, TABS, dlg, curLead, batch, assignForm, followForm, invalidForm, addForm, dupCheck, openAssign, doAssign, claim, openFollow, doFollow, openInvalid, doInvalid, release, cmd, openAdd, submitAdd, NEED_TYPES, cv, cvDup, openConvert, doConvert, dupLink, dupCount, totalText, OWNERS, INDUSTRIES, EXISTING_CUSTOMERS: computed(() => store.customers.slice(0, 12)), go, yuan, tab: computed(() => props.tab) };
  },
  template: `<div>
    <list-page :crumbs="['线索管理', t]" :title="t" :total-text="totalText" :stats="stats" :rows="rows" :cols="cols" :action-width="260" drawer-title="线索详情（快速查看）"
      :filters="[{k:'kw',label:'搜索线索',ph:'线索编号 / 公司 / 联系人 / 手机'},{k:'source',label:'来源渠道',opts:['官网','广告','转介绍','活动','渠道']},{k:'status',label:'线索状态',opts:['新建','跟进中','已转化','无效']},{k:'owner',label:'负责人',opts:OWNERS}]">
      <template #top>
        <el-tabs :model-value="tab" @tab-change="k => $go(k==='all'?'/leads':'/leads/'+k)" style="margin-bottom:6px"><el-tab-pane v-for="(v,k) in TABS" :key="k" :label="v" :name="k"/></el-tabs>
        <el-alert v-if="dupCount && tab!=='records'" type="warning" show-icon :closable="false" style="margin-bottom:12px" :title="'查重提示：当前有 '+dupCount+' 条线索的手机号或公司名称与已有线索/客户重复，请核对后合并、关联已有客户，避免重复建档。'"/>
      </template>
      <template #ops="{sel}">
        <el-button type="primary" icon="Plus" @click="openAdd">新增线索</el-button>
        <el-button icon="Upload" @click="$msg.info('示例：导入 Excel（含查重、必填校验、错误行反馈）')">导入</el-button>
        <el-button icon="Download" @click="$msg.info('示例：导出（按字段权限脱敏）')">导出</el-button>
        <el-button icon="User" :disabled="false" @click="openAssign(null, sel)">批量分配<template v-if="sel.length">（{{ sel.length }}）</template></el-button>
      </template>
      <template #cell-no="{row}"><a class="link" @click="$go('/lead/'+row.no)">{{ row.no }}</a></template>
      <template #cell-name="{row}"><a class="link" @click="$go('/lead/'+row.no)">{{ row.name }}</a></template>
      <template #cell-company="{row}">
        <span>{{ row.company }}</span>
        <el-popover v-if="row.dup && row.status!=='已转化'" placement="bottom" :width="300" trigger="hover">
          <template #reference><el-tag type="danger" size="small" effect="plain" class="dup-tag" style="margin-left:6px">疑似重复</el-tag></template>
          <div><b>查重结果</b><div style="margin:6px 0;color:#c0392b">{{ dupLink(row).text }}</div><div class="muted" style="font-size:12px">检测依据：手机号、公司名称。可「关联已有客户」后再转化，或人工确认合并。</div></div>
        </el-popover>
      </template>
      <template #actions="{row,open}">
        <template v-if="row.status==='已转化'"><el-button link type="primary" @click="open(row)">查看</el-button><el-button link type="primary" v-if="hasCust(row.convertedTo)" @click="$go('/customer/'+row.convertedTo)">查看客户</el-button></template>
        <template v-else-if="!row.owner"><el-button link type="primary" @click="claim(row)">领取</el-button><el-button link type="primary" @click="openAssign(row)">分配</el-button><el-button link @click="open(row)">查看</el-button></template>
        <template v-else>
          <el-button link type="primary" @click="openFollow(row)">记录跟进</el-button>
          <el-button link type="success" :disabled="row.status==='无效'" @click="openConvert(row)">转化客户</el-button>
          <el-dropdown trigger="click" @command="c => cmd(c,row)"><el-button link type="primary">更多<el-icon class="el-icon--right"><arrow-down/></el-icon></el-button>
            <template #dropdown><el-dropdown-menu><el-dropdown-item command="assign">分配</el-dropdown-item><el-dropdown-item command="invalid">标记无效</el-dropdown-item><el-dropdown-item command="release">退回公海</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
        </template>
      </template>
      <template #drawer="{row}">
        <div v-if="row">
          <el-descriptions title="基本信息" :column="2" border size="small"><el-descriptions-item label="线索编号">{{ row.no }}</el-descriptions-item><el-descriptions-item label="线索状态">{{ row.status }}</el-descriptions-item><el-descriptions-item label="公司名称" :span="2">{{ row.company }}</el-descriptions-item><el-descriptions-item label="联系人">{{ row.contact }}</el-descriptions-item><el-descriptions-item label="手机号码">{{ row.phone }}</el-descriptions-item><el-descriptions-item label="来源渠道">{{ row.source }}</el-descriptions-item><el-descriptions-item label="负责人">{{ row.owner || '（公海）' }}</el-descriptions-item></el-descriptions>
          <el-descriptions title="需求信息" :column="2" border size="small" style="margin-top:16px"><el-descriptions-item label="需求类型">{{ row.need }}</el-descriptions-item><el-descriptions-item label="预计金额">{{ yuan(row.amount) }}</el-descriptions-item><el-descriptions-item label="下次联系">{{ row.next || '-' }}</el-descriptions-item><el-descriptions-item label="创建时间">{{ row.created }}</el-descriptions-item></el-descriptions>
          <div class="sec-title" style="margin-top:18px">跟进记录</div>
          <el-timeline><el-timeline-item timestamp="2026-11-02 09:20" placement="top">电话沟通：客户有 MES 系统需求，预算待确认。<div class="muted">张三</div></el-timeline-item><el-timeline-item timestamp="2026-11-02 09:05" placement="top">线索创建（来源：{{ row.source }}）</el-timeline-item></el-timeline>
          <div class="sec-title">操作记录</div><div class="muted" style="font-size:13px">创建 → 分配 → 修改 → 转化 / 退回，均保留操作人与时间。</div>
        </div>
      </template>
    </list-page>

    <!-- 新增线索（含实时查重） -->
    <el-dialog v-model="dlg.add" title="新增线索" width="560px">
      <el-alert v-if="dupCheck.length" type="warning" show-icon :closable="false" style="margin-bottom:14px" title="发现疑似重复">
        <div v-for="d in dupCheck" :key="d.ref" style="font-size:13px">· {{ d.why }}：{{ d.ref }}</div></el-alert>
      <el-form label-width="96px">
        <el-form-item label="公司名称" required><el-input v-model="addForm.company" placeholder="如：南京某某科技有限公司" /></el-form-item>
        <el-form-item label="联系人" required><el-input v-model="addForm.contact" /></el-form-item>
        <el-form-item label="手机号码" required><el-input v-model="addForm.phone" maxlength="11" placeholder="11 位手机号（参与重复检测）" /></el-form-item>
        <el-form-item label="来源渠道"><el-select v-model="addForm.source"><el-option v-for="s in ['官网','广告','转介绍','活动','渠道']" :key="s" :value="s"/></el-select></el-form-item>
        <el-form-item label="需求类型"><el-select v-model="addForm.need" filterable allow-create default-first-option placeholder="选择或输入产品/服务类别"><el-option v-for="s in NEED_TYPES" :key="s" :value="s"/></el-select></el-form-item>
        <el-form-item label="预计金额"><el-input-number v-model="addForm.amount" :min="0" :step="10000" :controls="false" style="width:200px"/> 元</el-form-item>
      </el-form>
      <template #footer><el-button @click="dlg.add=false">取消</el-button><el-button type="primary" @click="submitAdd">保存</el-button></template>
    </el-dialog>

    <!-- 分配 -->
    <el-dialog v-model="dlg.assign" :title="batch.length>1 ? '批量分配线索' : '分配线索'" width="460px">
      <el-alert type="info" show-icon :closable="false" style="margin-bottom:14px" :title="'本次操作将影响 '+batch.length+' 条线索'" />
      <el-form label-width="84px"><el-form-item label="分配给" required><el-select v-model="assignForm.owner" placeholder="选择销售人员"><el-option v-for="o in OWNERS" :key="o" :value="o"/></el-select></el-form-item>
      <el-form-item label="备注"><el-input v-model="assignForm.reason" type="textarea" :rows="2"/></el-form-item></el-form>
      <template #footer><el-button @click="dlg.assign=false">取消</el-button><el-button type="primary" @click="doAssign">确认分配</el-button></template>
    </el-dialog>

    <!-- 记录跟进 -->
    <el-dialog v-model="dlg.follow" title="记录跟进" width="520px">
      <el-form label-width="96px"><el-form-item label="活动类型"><el-radio-group v-model="followForm.type"><el-radio-button v-for="x in ['电话','微信','拜访','邮件']" :key="x" :label="x"/></el-radio-group></el-form-item>
      <el-form-item label="跟进内容" required><el-input v-model="followForm.content" type="textarea" :rows="3"/></el-form-item>
      <el-form-item label="客户反馈"><el-input v-model="followForm.feedback" type="textarea" :rows="2"/></el-form-item>
      <el-form-item label="下次联系"><el-date-picker v-model="followForm.next" type="datetime" value-format="YYYY-MM-DDTHH:mm" placeholder="自动生成待办"/></el-form-item></el-form>
      <template #footer><el-button @click="dlg.follow=false">取消</el-button><el-button type="primary" @click="doFollow">保存</el-button></template>
    </el-dialog>

    <!-- 标记无效 -->
    <el-dialog v-model="dlg.invalid" title="标记无效" width="460px">
      <el-form label-width="84px"><el-form-item label="无效原因" required><el-select v-model="invalidForm.reason" placeholder="请选择"><el-option v-for="x in ['联系方式无效','无采购意向','已被竞品签约','信息不真实','重复线索']" :key="x" :value="x"/></el-select></el-form-item>
      <el-form-item label="补充说明"><el-input v-model="invalidForm.remark" type="textarea" :rows="3"/></el-form-item></el-form>
      <template #footer><el-button @click="dlg.invalid=false">取消</el-button><el-button type="danger" @click="doInvalid">确认标记</el-button></template>
    </el-dialog>

    <!-- 转化客户（方案 6.1） -->
    <el-dialog v-model="dlg.convert" title="转化客户" width="700px" top="6vh" :close-on-click-modal="false" class="convert-dlg">
      <template v-if="curLead">
        <el-alert v-if="cvDup" type="warning" show-icon :closable="false" style="margin-bottom:14px">
          <template #title>转化前查重：检测到已存在客户「{{ cvDup.ref }}」（{{ cvDup.why }}）</template>
          <div style="font-size:12px;margin-top:4px">为避免重复建客户，建议关联现有客户；仍需新建请确认不是同一组织。</div></el-alert>
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
          <el-form-item v-else label="现有客户" required><el-select v-model="cv.linkNo" filterable placeholder="搜索并选择现有客户" style="width:100%"><el-option v-for="c in EXISTING_CUSTOMERS" :key="c.no" :value="c.no" :label="c.no+' · '+c.name"/></el-select></el-form-item>
          <div class="sec-title">联系人</div>
          <el-row :gutter="12"><el-col :span="12"><el-form-item label="联系人姓名" required><el-input v-model="cv.contactName"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="联系方式" required><el-input v-model="cv.contactPhone"/></el-form-item></el-col></el-row>
          <div class="sec-title">商机</div>
          <el-form-item label="创建商机"><el-switch v-model="cv.createOpp" active-text="是" inactive-text="否"/></el-form-item>
          <template v-if="cv.createOpp">
            <el-form-item label="商机名称" required><el-input v-model="cv.oppName"/></el-form-item>
            <el-row :gutter="12"><el-col :span="12"><el-form-item label="预计金额" required><el-input-number v-model="cv.oppAmount" :min="0" :step="10000" :controls="false" :formatter="v => '¥ ' + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/[^\d.]/g, '')" style="width:100%;text-align:left" class="left-num"/></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="预计成交日期" required><el-date-picker v-model="cv.oppDate" type="date" value-format="YYYY-MM-DD" style="width:100%"/></el-form-item></el-col></el-row>
          </template>
        </el-form>
        <div class="muted" style="font-size:12px;padding-left:4px"><el-icon><lock/></el-icon> 保存时客户、联系人、商机在同一事务中创建，任一步失败则整体回滚，原始线索与跟进历史始终保留。</div>
      </template>
      <template #footer><el-button @click="dlg.convert=false">取消</el-button><el-button type="primary" :loading="cv.saving" @click="doConvert">确认转化</el-button></template>
    </el-dialog>
  </div>`,
};
registerRoute('/leads', LeadsPage, 'leads', () => ({ tab: 'all' }));
registerRoute('/leads/my', LeadsPage, 'leads', () => ({ tab: 'my' }));
registerRoute('/leads/pool', LeadsPage, 'lead-pool', () => ({ tab: 'pool' }));
registerRoute('/leads/records', LeadsPage, 'lead-records', () => ({ tab: 'records' }));
