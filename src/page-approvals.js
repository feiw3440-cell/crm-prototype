const ApprovalsPage = {
  components: { PageHead },
  setup() {
    const tab = ref('todo'); const sel = ref('SP-202611-0042');
    const TABS = { todo: '待我审批', mine: '我发起的', done: '我已审批', cc: '抄送我的' };
    const list = computed(() => (store.approvals || []).filter(a => a.tab === tab.value));
    const count = k => (store.approvals || []).filter(a => a.tab === k).length;
    const cur = computed(() => store.approvals.find(a => a.id === sel.value));
    const avgH = computed(() => {
      const rows = typeof atStatRows === 'function' ? atStatRows() : [];
      if (!rows.length) return '0.0';
      return (rows.reduce((s, r) => s + r.hours, 0) / rows.length).toFixed(1);
    });
    const rejectRate = computed(() => {
      const doneRows = (store.approvals || []).filter(a => a.tab === 'done');
      if (!doneRows.length) return '0.0';
      return (doneRows.filter(a => a.result === '已拒绝' || a.result === '已退回修改').length * 100 / doneRows.length).toFixed(1);
    });
    watch(tab, () => { const l = list.value; if (l.length && !l.find(a => a.id === sel.value)) sel.value = l[0].id; });
    const dlg = reactive({ show: false, kind: '', opinion: '', user: '' });
    const KIND = { approve: ['同意', 'success'], reject: ['拒绝', 'danger'], back: ['退回修改', 'warning'], transfer: ['转交', 'primary'], sign: ['加签', 'primary'], cc: ['抄送', 'info'] };
    const act = k => { Object.assign(dlg, { show: true, kind: k, opinion: '', user: '' }); };
    const need = computed(() => ['reject', 'back'].includes(dlg.kind));
    const needUser = computed(() => ['transfer', 'sign', 'cc'].includes(dlg.kind));
    const submit = () => {
      if (need.value && !dlg.opinion) return ElMessage.warning('请填写审批意见（必填）');
      if (needUser.value && !dlg.user) return ElMessage.warning('请选择人员');
      const a = cur.value; const k = dlg.kind; const nodeIdx = a.nodes.findIndex(n => n.st === 'cur');
      const label = KIND[k][0];
      a.history.push({ who: '张三', act: label + (needUser.value ? ' → ' + dlg.user : ''), op: dlg.opinion || '-', t: '11-02 07:00' });
      if (k === 'approve') {
        a.nodes[nodeIdx].st = 'done'; a.nodes[nodeIdx].t = '11-02 07:00';
        const nx = a.nodes.findIndex((n, i) => i > nodeIdx && n.st === 'wait'); if (nx >= 0) a.nodes[nx].st = 'cur';
        a.tab = 'done'; a.result = '已同意（流程' + (nx >= 0 ? '流转至下一节点' : '结束') + '）';
      } else if (k === 'reject') { a.nodes[nodeIdx].st = 'rej'; a.tab = 'done'; a.result = '已拒绝'; }
      else if (k === 'back') { a.nodes[nodeIdx].st = 'rej'; a.tab = 'done'; a.result = '已退回修改'; }
      else if (k === 'transfer') { a.nodes[nodeIdx].p = dlg.user; ElMessage.success('已转交给 ' + dlg.user); dlg.show = false; return; }
      else if (k === 'sign') { a.nodes.splice(nodeIdx + 1, 0, { n: '加签：' + dlg.user, p: dlg.user, st: 'wait', t: '' }); ElMessage.success('已加签 ' + dlg.user); dlg.show = false; return; }
      else if (k === 'cc') { ElMessage.success('已抄送给 ' + dlg.user); dlg.show = false; return; }
      dlg.show = false; ElNotification({ title: '审批已提交', message: `「${a.title}」${label}，申请人已收到通知。`, type: k === 'approve' ? 'success' : 'warning' });
      const l = list.value; if (l.length) sel.value = l[0].id;
    };
    const resTag = a => (a.result || '').startsWith('已同意') ? 'success' : a.result ? 'danger' : 'warning';
    const nodeIcon = n => ({ done: '✓', cur: '●', rej: '✕', skip: '—', wait: '' }[n.st]);
    return { tab, TABS, list, count, cur, sel, dlg, KIND, act, need, needUser, submit, resTag, nodeIcon, fmtC, avgH, rejectRate, canAct: computed(() => tab.value === 'todo' && cur.value && cur.value.tab === 'todo') };
  },
  template: `<div>
    <page-head :crumbs="['工作台', '审批中心']" title="审批中心" :total="'待我审批 '+count('todo')+' 项'"><el-button icon="Setting" @click="$go('/approvals/templates')">审批模板</el-button><el-button icon="DataLine" @click="$go('/approvals/stats')">审批统计</el-button></page-head>
    <div class="stat-row" style="grid-template-columns:repeat(5,1fr)">
      <div class="stat-card warn"><span class="lb">待我审批</span><span class="vl">{{ count('todo') }}</span><span class="ft">需及时处理</span></div>
      <div class="stat-card"><span class="lb">我发起的</span><span class="vl">{{ count('mine') }}</span><span class="ft">审批中 / 已完成</span></div>
      <div class="stat-card ok"><span class="lb">我已审批</span><span class="vl">{{ count('done') }}</span><span class="ft">本月累计</span></div>
      <div class="stat-card"><span class="lb">平均审批用时</span><span class="vl">{{ avgH }} 小时</span><span class="ft">历史流水均值</span></div>
      <div class="stat-card danger"><span class="lb">驳回率</span><span class="vl">{{ rejectRate }}%</span><span class="ft">已拒绝 / 已处理</span></div>
    </div>
    <div class="appr-wrap">
      <div class="card">
        <el-tabs v-model="tab" style="padding:4px 14px 0"><el-tab-pane v-for="(v,k) in TABS" :key="k" :name="k"><template #label>{{ v }} <el-badge :value="count(k)" :type="k==='todo'?'danger':'info'" style="margin-left:2px"/></template></el-tab-pane></el-tabs>
        <div v-for="a in list" :key="a.id" class="appr-item" :class="{active:sel===a.id}" @click="sel=a.id">
          <div class="tt"><span>{{ a.title }}</span><el-tag size="small" :type="a.result?resTag(a):'warning'" effect="light">{{ a.result ? a.result.slice(0,6) : '审批中' }}</el-tag></div>
          <div class="sm"><span>{{ a.type }}</span><span>申请人：{{ a.applicant }}</span><span>{{ a.time.slice(5,16) }}</span><span v-if="a.amount" class="money" style="margin-left:auto;color:var(--text)">¥{{ fmtC(a.amount) }}</span></div>
        </div>
        <el-empty v-if="!list.length" description="暂无审批" :image-size="80"/>
      </div>
      <div class="card card-pad" v-if="cur">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px"><h3 style="margin:0;font-size:17px">{{ cur.title }}</h3><el-tag size="small">{{ cur.type }}</el-tag><span class="muted" style="margin-left:auto;font-size:12px">{{ cur.id }}</span></div>
        <el-descriptions :column="3" size="small" border style="margin-bottom:14px"><el-descriptions-item label="申请人">{{ cur.applicant }}</el-descriptions-item><el-descriptions-item label="申请部门">{{ cur.dept }}</el-descriptions-item><el-descriptions-item label="申请时间">{{ cur.time }}</el-descriptions-item></el-descriptions>
        <div class="sec-title">业务单据摘要</div>
        <el-descriptions :column="2" size="small" border><el-descriptions-item v-for="s in cur.summary" :key="s[0]" :label="s[0]">{{ s[1] }}</el-descriptions-item></el-descriptions>
        <div class="sec-title" style="margin-top:16px">审批流程 <span class="muted" style="font-weight:400;font-size:12px">当前节点高亮</span></div>
        <div class="flow" style="overflow-x:auto;padding-bottom:6px"><template v-for="(n,i) in cur.nodes" :key="i"><div class="fnode" :class="n.st" :style="n.st==='skip'?'opacity:.55':''"><div class="c">{{ nodeIcon(n) || (i+1) }}</div><div class="nm">{{ n.n }}</div><div class="pp">{{ n.p }}</div><div class="pp" v-if="n.t">{{ n.t }}</div></div><div class="fline" :class="{done:n.st==='done'}" v-if="i<cur.nodes.length-1"></div></template></div>
        <div class="sec-title" style="margin-top:12px">历史审批意见</div>
        <div class="opinion" v-for="(h,i) in cur.history" :key="i"><div><b>{{ h.who }}</b> · <el-tag size="small" :type="h.act.startsWith('拒绝')||h.act.startsWith('退回')?'danger':(h.act==='提交申请'?'info':'success')">{{ h.act }}</el-tag><span class="muted" style="float:right;font-size:12px">{{ h.t }}</span></div><div class="muted" style="margin-top:4px">{{ h.op }}</div></div>
        <div class="sec-title" style="margin-top:12px">业务附件</div>
        <div style="margin-bottom:16px"><el-tag style="margin-right:8px"><el-icon><document/></el-icon> 报价单 V3.pdf</el-tag><el-tag><el-icon><document/></el-icon> 折扣申请说明.docx</el-tag></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:14px;border-top:1px solid var(--line)">
          <el-tooltip :disabled="canAct" content="仅「待我审批」且当前节点轮到我时可操作（按授权启用）"><span><el-button type="success" :disabled="!canAct" @click="act('approve')">同意</el-button></span></el-tooltip>
          <el-button type="danger" plain :disabled="!canAct" @click="act('reject')">拒绝</el-button><el-button type="warning" plain :disabled="!canAct" @click="act('back')">退回修改</el-button>
          <el-button :disabled="!canAct" @click="act('transfer')">转交</el-button><el-button :disabled="!canAct" @click="act('sign')">加签</el-button><el-button @click="act('cc')">抄送</el-button>
          <el-button v-if="cur.type==='报价折扣审批'" link type="primary" style="margin-left:auto" @click="$go('/quote/BJ-202611-0008')">查看报价单 ›</el-button></div>
      </div>
    </div>
    <el-dialog v-model="dlg.show" :title="'审批操作 · '+(KIND[dlg.kind]||[''])[0]" width="480px">
      <el-form label-width="84px"><el-form-item v-if="needUser" label="选择人员" required><el-select v-model="dlg.user" placeholder="请选择" style="width:100%"><el-option v-for="u in ['周总监','陈法务','王财务','李明']" :key="u" :value="u"/></el-select></el-form-item>
      <el-form-item label="审批意见" :required="need"><el-input type="textarea" :rows="4" v-model="dlg.opinion" :placeholder="need ? '拒绝/退回时必须填写原因，将保存并通知申请人' : '选填'"/></el-form-item></el-form>
      <template #footer><el-button @click="dlg.show=false">取消</el-button><el-button :type="(KIND[dlg.kind]||['','primary'])[1]" @click="submit">确认{{ (KIND[dlg.kind]||[''])[0] }}</el-button></template>
    </el-dialog>
  </div>`,
};
registerRoute('/approvals', ApprovalsPage, 'approvals');
