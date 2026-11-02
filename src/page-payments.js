const PaymentsPage = {
  components: { PageHead },
  setup() {
    const tab = ref('plan');
    const kw = ref(''); const fst = ref('');
    const recvOf = (planId) => store.pay.records.reduce((s, r) => s + r.alloc.filter(a => a.plan === planId).reduce((x, a) => x + a.amt, 0), 0);
    const recsOfPlan = (planId) => store.pay.records.filter(r => r.alloc.some(a => a.plan === planId));
    const lastDate = (planId) => { const ds = recsOfPlan(planId).map(r => r.date).sort(); return ds.length ? ds[ds.length - 1] : '-'; };
    const methodOf = (planId) => { const ms = recsOfPlan(planId).map(r => r.method).filter(Boolean); return ms.length ? Array.from(new Set(ms)).join(' / ') : '-'; };
    const confirmOf = (planId) => { const rs = recsOfPlan(planId); if (!rs.length) return '-'; return rs.every(r => r.confirm === '财务已确认') ? '财务已确认' : '待财务复核'; };
    const planRows = computed(() => {
      const out = [];
      store.pay.contracts.forEach(ct => ct.plans.forEach((p, i) => {
        const got = recvOf(p.id); const rest = p.amount - got; const due = p.date <= TODAY;
        const overdue = rest > 0 && p.date < TODAY; const days = overdue ? daysBetween(p.date, TODAY) : 0;
        const status = got >= p.amount ? '已核销' : overdue ? (got > 0 ? '部分核销 · 逾期' : '逾期未收') : got > 0 ? '部分核销' : '未到期';
        out.push({ no: 'HK-' + p.id.replace('P', '').padStart(4, '0'), ct, contract: ct.no, customer: ct.customer, order: ct.order, stage: p.stage, ratio: p.ratio, date: p.date, plan: p.amount, got, rest, due, overdue, days, status, last: lastDate(p.id), method: methodOf(p.id), confirm: confirmOf(p.id), owner: ct.owner, pid: p.id, seq: i + 1 });
      }));
      return out;
    });
    const rows = computed(() => planRows.value.filter(r => (!kw.value || (r.contract + r.customer + r.stage).includes(kw.value)) && (!fst.value || r.status.includes(fst.value))));
    const sum = computed(() => { const a = planRows.value; const S = f => a.reduce((s, r) => s + f(r), 0);
      return { due: S(r => r.due ? r.plan : 0), got: S(r => r.got), rest: S(r => r.rest), overdue: S(r => r.overdue ? r.rest : 0), n: a.filter(r => r.overdue).length, all: S(r => r.plan) }; });
    const stTag = s => s === '已核销' ? 'success' : s.includes('逾期') ? 'danger' : s === '部分核销' ? 'warning' : 'info';
    const recRows = computed(() => store.pay.records.map(r => ({ ...r, customer: (store.pay.contracts.find(c => c.no === r.contract) || {}).customer || '-' })));
    const recTag = t => t === '退款' ? 'warning' : t === '冲销' ? 'danger' : 'success';
    // ---- 抽屉：合同回款详情 ----
    const drawer = ref(false); const curNo = ref('');
    const curCt = computed(() => store.pay.contracts.find(c => c.no === curNo.value));
    const ctPlans = computed(() => planRows.value.filter(r => r.contract === curNo.value));
    const ctRecs = computed(() => store.pay.records.filter(r => r.contract === curNo.value));
    const ctSum = computed(() => { const p = ctPlans.value; const S = f => p.reduce((s, r) => s + f(r), 0); return { amount: curCt.value ? curCt.value.amount : 0, due: S(r => r.due ? r.plan : 0), got: S(r => r.got), rest: S(r => r.rest), overdue: S(r => r.overdue ? r.rest : 0) }; });
    const openCt = no => { curNo.value = no; drawer.value = true; };
    // ---- 登记收款 + 自动核销 ----
    const dlg = ref(false);
    const rf = reactive({ contract: '', amount: 0, date: TODAY, method: '银行转账', plan: 'auto', remark: '' });
    const openReg = (no, pid) => { Object.assign(rf, { contract: no || store.pay.contracts[0].no, amount: 0, date: TODAY, method: '银行转账', plan: pid || 'auto', remark: '' }); dlg.value = true; };
    const preview = computed(() => {
      const ct = store.pay.contracts.find(c => c.no === rf.contract); if (!ct) return { rows: [], excess: 0 };
      let left = toC(rf.amount || 0); const plans = ct.plans.slice().sort((a, b) => (b.id === rf.plan) - (a.id === rf.plan) || a.date.localeCompare(b.date));
      const rows = [];
      plans.forEach(p => { const rest = p.amount - recvOf(p.id); if (rest <= 0 || left <= 0) return; const use = Math.min(rest, left); left -= use; rows.push({ id: p.id, stage: p.stage, rest, use, after: rest - use, date: p.date }); });
      return { rows, excess: left };
    });
    const nextRecId = prefix => prefix + '-' + TODAY.slice(0, 7).replace('-', '') + '-' + String(store.pay.records.length + 20).padStart(4, '0');
    const doReg = () => {
      if (!rf.amount || rf.amount <= 0) return ElMessage.warning('请输入实际到账金额');
      if (!rf.date) return ElMessage.warning('请选择实际回款日期');
      const pv = preview.value; const id = nextRecId('SK');
      store.pay.records.push({ id, type: '收款', contract: rf.contract, date: rf.date, amount: toC(rf.amount), method: rf.method, confirm: '待财务复核', operator: '财务-王芳', alloc: pv.rows.map(r => ({ plan: r.id, amt: r.use })), excess: pv.excess, remark: rf.remark });
      dlg.value = false;
      if (pv.excess > 0) ElNotification({ title: '超额收款提示', message: `本次到账超出应收 ¥${fmtC(pv.excess)}，已转入「待核实 / 预收款」，请财务确认。其余金额已自动核销。`, type: 'warning', duration: 6000 });
      else ElMessage.success('收款已登记，已自动核销对应回款计划，并重新计算未收金额与逾期状态');
    };
    const reverse = r => {
      const org = store.pay.records.find(x => x.id === r.id); if (!org) return;
      if (org.type === '冲销' || org.type === '退款' || org.voided) return ElMessage.warning('该记录已冲销或为退款/冲销记录，不能重复操作');
      ElMessageBox.prompt('回款录入错误须走冲销/更正流程并保留原记录。请填写冲销原因：', '申请冲销 ' + org.id, { inputPattern: /\S+/, inputErrorMessage: '原因必填' }).then(({ value }) => {
        const id = nextRecId('CX');
        store.pay.records.push({ id, type: '冲销', contract: org.contract, date: TODAY, amount: -org.amount, method: '冲销', confirm: '待财务复核', operator: '财务-王芳', reverseOf: org.id, reason: value, alloc: org.alloc.map(a => ({ plan: a.plan, amt: -a.amt })), excess: -(org.excess || 0) });
        org.voided = true;
        ElMessage.success('已提交「应收冲销」审批（财务负责人），冲销记录 ' + id + ' 已生成，原记录保留');
      }).catch(() => {});
    };
    const refundDlg = ref(false); const refundRf = reactive({ recordId: '', amount: 0, date: TODAY, reason: '' }); const refundSrc = ref(null);
    const refundableOf = r => r.amount - store.pay.records.filter(x => (x.refundOf === r.id || x.reverseOf === r.id)).reduce((s, x) => s - x.amount, 0);
    const openRefund = r => { refundSrc.value = r; Object.assign(refundRf, { recordId: r.id, amount: Number((refundableOf(r) / 100).toFixed(2)), date: TODAY, reason: '' }); refundDlg.value = true; };
    const doRefund = () => {
      const r = refundSrc.value; if (!r) return;
      const org = store.pay.records.find(x => x.id === r.id); if (!org) return;
      const cents = toC(refundRf.amount || 0); const max = refundableOf(org);
      if (cents <= 0) return ElMessage.warning('请输入退款金额');
      if (cents > max) return ElMessage.warning('退款金额不能超过该笔收款的可退金额 ¥' + fmtC(max));
      if (!refundRf.reason.trim()) return ElMessage.warning('请填写退款原因');
      let left = cents; const alloc = [];
      org.alloc.forEach(a => { if (left <= 0 || a.amt <= 0) return; const take = Math.min(a.amt, left); left -= take; alloc.push({ plan: a.plan, amt: -take }); });
      const id = nextRecId('TK');
      store.pay.records.push({ id, type: '退款', contract: org.contract, date: refundRf.date || TODAY, amount: -cents, method: org.method, confirm: '待财务复核', operator: '财务-王芳', refundOf: org.id, reason: refundRf.reason, alloc, excess: -left });
      refundDlg.value = false;
      ElMessage.success('退款 ' + id + ' 已登记并提交「应收冲销」审批（财务负责人），已回写核销与未收金额');
    };
    const confirmRec = r => { const org = store.pay.records.find(x => x.id === r.id); if (!org) return; org.confirm = '财务已确认'; ElMessage.success('财务复核通过'); };
    return { tab, kw, fst, rows, sum, stTag, recRows, recTag, drawer, curNo, curCt, ctPlans, ctRecs, ctSum, openCt, dlg, rf, openReg, preview, doReg, reverse, refundDlg, refundRf, refundSrc, refundableOf, openRefund, doRefund, confirmRec, fmtC, store, TODAY };
  },
  template: `<div>
    <page-head :crumbs="['回款管理', '回款计划与收款']" title="回款管理" :total="'回款计划共 '+rows.length+' 笔 · 示例合同 '+store.pay.contracts.length+' 份'">
      <el-button type="primary" icon="Plus" @click="openReg()">登记收款</el-button><el-button icon="Download" @click="$msg.info('示例：导出')">导出</el-button></page-head>
    <div class="stat-row" style="grid-template-columns:repeat(5,1fr)">
      <div class="stat-card"><span class="lb">累计应收（已到期）</span><span class="vl">¥{{ fmtC(sum.due) }}</span><span class="ft">计划回款日期 ≤ 今日</span></div>
      <div class="stat-card ok"><span class="lb">累计已收</span><span class="vl">¥{{ fmtC(sum.got) }}</span><span class="ft">含待财务复核</span></div>
      <div class="stat-card warn"><span class="lb">未收金额（含未到期）</span><span class="vl">¥{{ fmtC(sum.rest) }}</span><span class="ft">计划总额 ¥{{ fmtC(sum.all) }}</span></div>
      <div class="stat-card danger"><span class="lb">逾期金额</span><span class="vl">¥{{ fmtC(sum.overdue) }}</span><span class="ft">{{ sum.n }} 笔逾期，已提醒财务与销售负责人</span></div>
      <div class="stat-card"><span class="lb">回款率（已收 / 已到期应收）</span><span class="vl">{{ (sum.got*100/sum.due).toFixed(1) }}%</span><span class="ft">统计口径：财务确认 + 待复核到账</span></div>
    </div>
    <el-tabs v-model="tab"><el-tab-pane label="回款计划（计划 vs 实际）" name="plan"/><el-tab-pane label="收款记录" name="rec"/></el-tabs>
    <div class="card query"><el-form inline><el-form-item><el-input v-model="kw" placeholder="合同编号 / 客户 / 款项阶段" clearable style="width:260px" prefix-icon="Search"/></el-form-item><el-form-item label="状态"><el-select v-model="fst" clearable placeholder="全部" style="width:140px"><el-option v-for="x in ['已核销','部分核销','逾期','未到期']" :key="x" :value="x"/></el-select></el-form-item><el-form-item><el-button type="primary" icon="Search">查询</el-button><el-button @click="kw='';fst=''">重置</el-button></el-form-item></el-form></div>
    <div class="card table-card" v-if="tab==='plan'">
      <el-table :data="rows" style="width:100%" :row-class-name="({row}) => row.overdue ? 'row-overdue' : ''" size="small">
        <el-table-column label="回款编号 / 合同编号" min-width="160"><template #default="{row}"><a class="link" @click="openCt(row.contract)">{{ row.no }}</a><div class="muted" style="font-size:12px">{{ row.contract }}</div></template></el-table-column>
        <el-table-column label="客户名称" min-width="170" show-overflow-tooltip><template #default="{row}"><a class="link" @click="$go('/customer/'+$cno(row.customer))">{{ row.customer }}</a></template></el-table-column>
        <el-table-column label="订单编号" min-width="140"><template #default="{row}"><span class="muted">{{ row.order || '-' }}</span></template></el-table-column>
        <el-table-column label="款项阶段" min-width="105"><template #default="{row}">{{ row.stage }}<div class="muted" style="font-size:12px">{{ row.ratio }}%</div></template></el-table-column>
        <el-table-column label="计划回款日期 / 金额" min-width="130" align="right"><template #default="{row}"><span class="money">¥{{ fmtC(row.plan) }}</span><div class="muted" style="font-size:12px">{{ row.date }}</div></template></el-table-column>
        <el-table-column label="实际回款日期 / 到账金额" min-width="140" align="right"><template #default="{row}"><span class="money ok-text">¥{{ fmtC(row.got) }}</span><div class="muted" style="font-size:12px">{{ row.last }}</div></template></el-table-column>
        <el-table-column label="未收金额" min-width="105" align="right"><template #default="{row}"><span class="money" :class="{'danger-text':row.overdue}">¥{{ fmtC(row.rest) }}</span></template></el-table-column>
        <el-table-column label="收款方式" min-width="110"><template #default="{row}"><span class="muted">{{ row.method }}</span></template></el-table-column>
        <el-table-column label="核销进度" min-width="110"><template #default="{row}"><el-progress :percentage="Math.round(row.got*100/row.plan)" :stroke-width="7" :status="row.got>=row.plan?'success':(row.overdue?'exception':'')"/></template></el-table-column>
        <el-table-column label="状态 / 逾期天数 / 财务确认" min-width="180"><template #default="{row}"><el-tag size="small" :type="stTag(row.status)">{{ row.status }}</el-tag><div class="muted" style="font-size:12px;margin-top:2px"><b v-if="row.overdue" class="danger-text">逾期 {{ row.days }} 天 · </b>{{ row.confirm }}</div></template></el-table-column>
        <el-table-column label="负责人" min-width="90"><template #default="{row}">{{ row.owner }}</template></el-table-column>
        <el-table-column label="操作" width="140" fixed="right"><template #default="{row}"><el-button link type="primary" @click="openCt(row.contract)">详情</el-button><el-button link type="primary" :disabled="row.rest<=0" @click="openReg(row.contract,row.pid)">登记收款</el-button></template></el-table-column>
      </el-table>
      <div class="pager"><span class="batch">逾期行以红色标记；金额均为精确小数（分）计算</span><el-pagination layout="prev, pager, next" :total="rows.length" :page-size="20" background size="small"/></div>
    </div>
    <div class="card table-card" v-else>
      <el-table :data="recRows" style="width:100%"><el-table-column prop="id" label="收款编号" width="150"/><el-table-column prop="contract" label="合同编号" width="150"/><el-table-column prop="customer" label="客户名称" min-width="200"/><el-table-column prop="date" label="实际回款日期" width="120"/>
        <el-table-column label="到账金额" width="130" align="right"><template #default="{row}"><span class="money">¥{{ fmtC(row.amount) }}</span></template></el-table-column>
        <el-table-column label="核销对象" min-width="220"><template #default="{row}"><span v-for="a in row.alloc" :key="a.plan" style="margin-right:8px">{{ a.plan }}：¥{{ fmtC(a.amt) }}</span><el-tag v-if="row.excess>0" size="small" type="warning">超额 ¥{{ fmtC(row.excess) }} 待核实</el-tag><div v-if="row.reverseOf" class="muted" style="font-size:12px">冲销原单：{{ row.reverseOf }}</div><div v-if="row.refundOf" class="muted" style="font-size:12px">退款原单：{{ row.refundOf }}</div></template></el-table-column>
        <el-table-column prop="method" label="收款方式" width="100"/><el-table-column label="类型" width="90"><template #default="{row}"><el-tag size="small" :type="recTag(row.type)">{{ row.type || '收款' }}</el-tag></template></el-table-column><el-table-column label="财务确认" width="120"><template #default="{row}"><el-tag size="small" :type="row.confirm==='财务已确认'?'success':'warning'">{{ row.confirm }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="220" fixed="right"><template #default="{row}"><el-button link type="primary" v-if="row.confirm!=='财务已确认'" @click="confirmRec(row)">财务复核</el-button><el-button link type="primary" v-if="row.type!=='冲销' && row.type!=='退款' && row.amount>0 && !row.voided" @click="openRefund(row)">退款</el-button><el-button link type="danger" v-if="row.type!=='冲销' && row.type!=='退款' && !row.voided" @click="reverse(row)">申请冲销</el-button></template></el-table-column></el-table></div>

    <el-drawer v-model="drawer" size="640px" :title="'回款详情 · '+curNo">
      <div v-if="curCt">
        <div style="font-size:16px;font-weight:600">{{ curCt.name }}</div><div class="muted" style="margin:4px 0 14px">{{ curCt.customer }} · 订单 {{ curCt.order }} · 负责人 {{ curCt.owner }}</div>
        <div class="stat-row" style="grid-template-columns:repeat(3,1fr);margin-bottom:10px">
          <div class="stat-card"><span class="lb">合同金额</span><span class="vl" style="font-size:20px">¥{{ fmtC(ctSum.amount) }}</span></div>
          <div class="stat-card"><span class="lb">累计应收（已到期）</span><span class="vl" style="font-size:20px">¥{{ fmtC(ctSum.due) }}</span></div>
          <div class="stat-card ok"><span class="lb">累计已收</span><span class="vl" style="font-size:20px">¥{{ fmtC(ctSum.got) }}</span></div>
          <div class="stat-card warn"><span class="lb">未收金额</span><span class="vl" style="font-size:20px">¥{{ fmtC(ctSum.rest) }}</span></div>
          <div class="stat-card danger"><span class="lb">其中逾期</span><span class="vl" style="font-size:20px">¥{{ fmtC(ctSum.overdue) }}</span></div>
          <div class="stat-card"><span class="lb">回款完成度</span><span class="vl" style="font-size:20px">{{ (ctSum.got*100/ctSum.amount).toFixed(1) }}%</span></div></div>
        <div class="sec-title" style="margin-top:14px">回款计划（计划 vs 实际）</div>
        <el-table :data="ctPlans" size="small" border><el-table-column prop="stage" label="阶段" width="90"/><el-table-column label="比例" width="60"><template #default="{row}">{{ row.ratio }}%</template></el-table-column><el-table-column prop="date" label="计划日期" width="100"/>
          <el-table-column label="计划金额" width="110" align="right"><template #default="{row}">¥{{ fmtC(row.plan) }}</template></el-table-column><el-table-column label="实收" width="110" align="right"><template #default="{row}">¥{{ fmtC(row.got) }}</template></el-table-column>
          <el-table-column label="未收" width="100" align="right"><template #default="{row}"><span :class="{'danger-text':row.overdue}">¥{{ fmtC(row.rest) }}</span></template></el-table-column>
          <el-table-column label="状态" min-width="110"><template #default="{row}"><el-tag size="small" :type="stTag(row.status)">{{ row.status }}</el-tag><div v-if="row.overdue" class="danger-text" style="font-size:12px">逾期 {{ row.days }} 天</div></template></el-table-column></el-table>
        <div class="sec-title" style="margin-top:18px">到账记录<el-button size="small" type="primary" style="margin-left:auto" @click="openReg(curNo)">登记收款</el-button></div>
        <el-table :data="ctRecs" size="small" border><el-table-column prop="id" label="收款编号" width="140"/><el-table-column prop="date" label="实际回款日期" width="120"/><el-table-column label="类型" width="80"><template #default="{row}"><el-tag size="small" :type="recTag(row.type)">{{ row.type || '收款' }}</el-tag></template></el-table-column><el-table-column label="金额" width="110" align="right"><template #default="{row}"><span :class="{'danger-text':row.amount<0}">¥{{ fmtC(row.amount) }}</span></template></el-table-column><el-table-column label="核销" min-width="100"><template #default="{row}"><span v-for="a in row.alloc" :key="a.plan" style="margin-right:6px">{{ a.plan }}：¥{{ fmtC(a.amt) }}</span></template></el-table-column><el-table-column label="确认" width="100"><template #default="{row}"><el-tag size="small" :type="row.confirm==='财务已确认'?'success':'warning'">{{ row.confirm }}</el-tag></template></el-table-column></el-table>
        <div class="sec-title" style="margin-top:18px">相关凭证</div><div><el-tag style="margin-right:8px"><el-icon><picture/></el-icon> 银行回单-1019.png</el-tag><el-tag><el-icon><picture/></el-icon> 银行回单-1030.png</el-tag></div>
      </div>
    </el-drawer>

    <el-dialog v-model="dlg" title="登记收款（自动核销）" width="620px">
      <el-form label-width="104px">
        <el-form-item label="合同" required><el-select v-model="rf.contract" style="width:100%"><el-option v-for="c in store.pay.contracts" :key="c.no" :value="c.no" :label="c.no+' · '+c.name"/></el-select></el-form-item>
        <el-row :gutter="12"><el-col :span="12"><el-form-item label="到账金额" required><el-input-number v-model="rf.amount" :min="0" :precision="2" :step="1000" :controls="false" style="width:100%"/></el-form-item></el-col><el-col :span="12"><el-form-item label="到账日期" required><el-date-picker v-model="rf.date" type="date" value-format="YYYY-MM-DD" style="width:100%"/></el-form-item></el-col></el-row>
        <el-row :gutter="12"><el-col :span="12"><el-form-item label="收款方式"><el-select v-model="rf.method" style="width:100%"><el-option v-for="x in ['银行转账','电汇','支票','微信/支付宝']" :key="x" :value="x"/></el-select></el-form-item></el-col><el-col :span="12"><el-form-item label="核销计划"><el-select v-model="rf.plan" style="width:100%"><el-option label="自动（按计划日期顺序）" value="auto"/><el-option v-for="p in (store.pay.contracts.find(c=>c.no===rf.contract)||{plans:[]}).plans" :key="p.id" :value="p.id" :label="'优先：'+p.stage"/></el-select></el-form-item></el-col></el-row>
        <el-form-item label="备注 / 凭证"><el-input v-model="rf.remark" placeholder="银行回单号等；凭证可上传"/></el-form-item>
      </el-form>
      <div class="sec-title">核销预览</div>
      <el-alert type="info" show-icon :closable="false" style="margin-bottom:8px" title="一次收款可自动核销多个回款计划：优先核销选定计划，其余按计划回款日期先后分配；不足一期的部分收款按部分核销处理。"/>
      <el-table :data="preview.rows" size="small" border empty-text="请输入到账金额以预览核销结果"><el-table-column prop="stage" label="计划" width="100"/><el-table-column label="核销前未收" align="right"><template #default="{row}">¥{{ fmtC(row.rest) }}</template></el-table-column><el-table-column label="本次核销" align="right"><template #default="{row}"><b class="ok-text">¥{{ fmtC(row.use) }}</b></template></el-table-column><el-table-column label="核销后未收" align="right"><template #default="{row}">¥{{ fmtC(row.after) }}</template></el-table-column><el-table-column label="结果" width="100"><template #default="{row}"><el-tag size="small" :type="row.after===0?'success':'warning'">{{ row.after===0 ? '全额核销' : '部分核销' }}</el-tag></template></el-table-column></el-table>
      <el-alert v-if="preview.excess>0" type="warning" show-icon :closable="false" style="margin-top:10px" :title="'超额收款：超出应收 ¥'+fmtC(preview.excess)+'，将转入「待核实 / 预收款」，不会自动核销。'"/>
      <template #footer><el-button @click="dlg=false">取消</el-button><el-button type="primary" @click="doReg">确认登记</el-button></template>
    </el-dialog>

    <el-dialog v-model="refundDlg" title="登记退款（应收冲销审批）" width="520px">
      <el-alert type="warning" show-icon :closable="false" style="margin-bottom:12px" :title="'退款须走「应收冲销」审批（财务负责人）。当前可退金额 ¥'+fmtC(refundSrc ? refundableOf(refundSrc) : 0)+'，原收款记录保留不删除。'"/>
      <el-form label-width="96px">
        <el-form-item label="原收款编号"><el-input :model-value="refundRf.recordId" disabled/></el-form-item>
        <el-form-item label="退款金额" required><el-input-number v-model="refundRf.amount" :min="0" :precision="2" :step="1000" :controls="false" style="width:100%"/></el-form-item>
        <el-form-item label="退款日期" required><el-date-picker v-model="refundRf.date" type="date" value-format="YYYY-MM-DD" style="width:100%"/></el-form-item>
        <el-form-item label="退款原因" required><el-input v-model="refundRf.reason" type="textarea" :rows="3" placeholder="如客户退回部分款项、重复收款退回，原因必填"/></el-form-item>
      </el-form>
      <template #footer><el-button @click="refundDlg=false">取消</el-button><el-button type="primary" @click="doRefund">提交退款</el-button></template>
    </el-dialog>
  </div>`,
};
registerRoute('/payments', PaymentsPage, 'payments');
