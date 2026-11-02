/* ===== 第 3 阶段：客户合并 /customers/merge（四步流程 + 合并记录，可从客户详情带入当前客户） ===== */
const MERGE_STATE = reactive({ from: '' });
const MERGE_FIELDS = [
  ['name', '客户名称'], ['type', '客户类型'], ['industry', '行业分类'], ['level', '客户等级'], ['source', '客户来源'],
  ['region', '所属区域'], ['scale', '客户规模'], ['owner', '客户负责人'], ['phone', '联系电话'], ['status', '客户状态'],
];
const CustomerMergePage = {
  components: { PageHead },
  setup() {
    const step = ref(1);
    const form = reactive({ main: '', merged: '', reason: '' });
    const keep = reactive({});
    const custNames = computed(() => store.customers.map(c => c.name));
    const mainC = computed(() => store.customers.find(c => c.name === form.main) || null);
    const subC = computed(() => store.customers.find(c => c.name === form.merged) || null);
    const fields = computed(() => MERGE_FIELDS.map(([k, l]) => ({
      k, l, mv: mainC.value ? String(mainC.value[k] ?? '-') : '', sv: subC.value ? String(subC.value[k] ?? '-') : '', same: mainC.value && subC.value && String(mainC.value[k] ?? '-') === String(subC.value[k] ?? '-'),
    })));
    const resetKeep = () => MERGE_FIELDS.forEach(([k]) => keep[k] = 'main');
    watch(() => [form.main, form.merged], resetKeep, { immediate: true });
    if (MERGE_STATE.from && store.customers.some(c => c.name === MERGE_STATE.from)) { const f0 = MERGE_STATE.from; MERGE_STATE.from = ''; form.merged = f0; }
    /* 迁移预览：联系人/商机/报价/合同/订单/跟进 数量 */
    const migRows = computed(() => {
      if (!subC.value) return [];
      const n = subC.value.name; const cnt = f => (f || []).filter(x => x.customer === n).length;
      return [
        { k: 'contact', l: '联系人', n: cnt(store.ext.contacts) }, { k: 'opp', l: '商机', n: cnt(store.opps) },
        { k: 'quote', l: '报价', n: cnt(store.ext.quotes) }, { k: 'contract', l: '合同', n: cnt(store.ext.contracts) },
        { k: 'order', l: '订单', n: cnt(store.ext.orders) }, { k: 'act', l: '跟进记录', n: cnt(store.ext.activities) },
      ];
    });
    const migTotal = computed(() => migRows.value.reduce((s, r) => s + r.n, 0));
    const pickCount = computed(() => MERGE_FIELDS.filter(([k]) => keep[k] === 'sub').length);
    const mergedBlocked = c => !!c && (c.status === '已合并' || c.archived);
    const canNext = computed(() => {
      if (step.value === 1) return !!mainC.value && !!subC.value && form.main !== form.merged && !mergedBlocked(mainC.value) && !mergedBlocked(subC.value);
      return true;
    });
    const next = () => {
      if (step.value === 1 && !canNext.value) {
        if (mergedBlocked(mainC.value) || mergedBlocked(subC.value)) return ElMessage.warning('已合并或已归档客户不可再次参与合并');
        return ElMessage.warning('请选择主客户与被合并客户（两个客户不能相同）');
      }
      if (step.value < 4) step.value++;
    };
    const prev = () => step.value > 1 && step.value--;
    /* ---- 合并记录 ---- */
    if (!store.ext.merges) store.ext.merges = [];
    /* ---- 提交合并 ---- */
    const doMerge = () => {
      if (!form.reason || !form.reason.trim()) return ElMessage.warning('请填写合并原因（必填）');
      const m = mainC.value, s = subC.value; if (!m || !s) return ElMessage.warning('请选择主客户与被合并客户');
      if (mergedBlocked(m) || mergedBlocked(s)) return ElMessage.warning('已合并或已归档客户不可再次参与合并');
      MERGE_FIELDS.forEach(([k]) => { if (keep[k] === 'sub') m[k] = s[k]; });     // 冲突字段按选择保留
      // 关联数据真实迁移：改归属到主客户
      const n = s.name;
      store.ext.contacts.forEach(x => { if (x.customer === n) x.customer = m.name; });
      store.opps.forEach(x => { if (x.customer === n) x.customer = m.name; });
      ['quotes', 'contracts', 'orders', 'activities'].forEach(k => store.ext[k].forEach(x => { if (x.customer === n) x.customer = m.name; }));
      s.status = '已合并'; s.mergedTo = m.no; s.mergedAt = TODAY;                 // 原编号保留，记录映射
      store.ext.logs.unshift({ time: TODAY + ' 09:00', who: '张三', module: '客户', act: '客户合并', detail: `客户合并「${s.name}」（${s.no}）→「${m.name}」（${m.no}）；迁移 ${migTotal.value} 条关联数据；原因：${form.reason}` });
      store.ext.merges.unshift({ time: TODAY + ' 09:00', main: m.name, mainNo: m.no, sub: n, subNo: s.no, mig: migTotal.value, pick: pickCount.value, reason: form.reason, who: '张三', appr: m.key ? '审批中' : '已通过' });
      step.value = 1; form.main = ''; form.merged = ''; form.reason = ''; resetKeep();
      if (m.key) ElNotification({ title: '合并已完成（重点客户审批提示）', message: `「${n}」已合并入「${m.name}」，迁移 ${migTotal.value} 条关联数据。重点客户合并需补充「${m.owner}」的直属经理审批留痕，审批流程已生成。`, type: 'warning', duration: 6000 });
      else ElMessage.success(`客户合并完成：「${n}」已并入「${m.name}」，迁移 ${migTotal.value} 条关联数据，操作日志已记录`);
    };
    return { step, form, keep, fields, migRows, migTotal, pickCount, canNext, next, prev, doMerge, custNames, mainC, subC, resetKeep, store };
  },
  template: `<div>
    <el-breadcrumb separator="/" class="crumb"><el-breadcrumb-item><a @click="$go('/customers')">客户管理</a></el-breadcrumb-item><el-breadcrumb-item><a @click="$go('/customers')">客户列表</a></el-breadcrumb-item><el-breadcrumb-item>客户合并</el-breadcrumb-item></el-breadcrumb>
    <div class="page-head"><h1>客户合并</h1><span class="total" v-if="store.customers.length">当前可用客户 {{ store.customers.length }} 家</span></div>
    <el-alert type="warning" show-icon :closable="false" style="margin-bottom:14px" title="合并不可简单撤销：被合并客户将被置为「已合并」并保留原编号映射；关联数据（联系人/商机/报价/合同/订单/跟进）全部迁移至主客户。重点客户合并需走审批。"/>
    <div class="card card-pad">
      <el-steps :active="step - 1" align-center finish-status="success" style="margin-bottom:20px">
        <el-step title="选择客户" description="主客户 + 被合并客户"/><el-step title="字段冲突对比" description="逐字段选择保留值"/>
        <el-step title="迁移预览" description="关联数据归属变更"/><el-step title="确认提交" description="填写原因并提交"/>
      </el-steps>
      <div v-if="step===1">
        <el-form label-width="110px" style="max-width:640px;margin:6px auto 0">
          <el-form-item label="主客户" required><el-select v-model="form.main" filterable placeholder="搜索并选择保留的主档案" style="width:100%"><el-option v-for="n in custNames" :key="'m'+n" :label="n" :value="n"/></el-select></el-form-item>
          <el-form-item label="被合并客户" required><el-select v-model="form.merged" filterable :class="{'is-self':form.merged && form.merged===form.main}" placeholder="搜索并选择要并入的客户" style="width:100%"><el-option v-for="n in custNames.filter(n=>n!==form.main)" :key="'s'+n" :label="n" :value="n"/></el-select><div class="muted" style="font-size:12px;margin-top:4px">客户详情页「客户合并」会将当前客户自动带入该选择</div></el-form-item>
          <el-alert v-if="form.main && form.main===form.merged" type="error" :closable="false" show-icon :title="'主客户与被合并客户相同，请重新选择'"/>
        </el-form>
      </div>
      <div v-else-if="step===2">
        <div class="muted" style="margin:0 0 10px">逐字段选择合并后保留的值；相同字段无需选择。左侧为主客户 <b>{{ mainC ? mainC.name : '-' }}</b>，右侧为被合并客户 <b>{{ subC ? subC.name : '-' }}</b>。</div>
        <el-table :data="fields" border><el-table-column prop="l" label="字段" width="140"/>
          <el-table-column label="主客户值" min-width="200"><template #default="{row}">{{ row.mv }}</template></el-table-column>
          <el-table-column label="被合并客户值" min-width="200"><template #default="{row}">{{ row.sv }}</template></el-table-column>
          <el-table-column label="保留" width="200" align="center"><template #default="{row}">
            <span v-if="row.same" class="muted">相同</span>
            <el-radio-group v-else v-model="keep[row.k]" size="small"><el-radio-button label="main">保留主客户</el-radio-button><el-radio-button label="sub">保留被合并</el-radio-button></el-radio-group>
          </template></el-table-column></el-table>
        <div class="muted" style="margin-top:8px">已选择保留被合并客户值的字段：{{ pickCount }} 个</div>
      </div>
      <div v-else-if="step===3">
        <div class="muted" style="margin:0 0 10px">以下 <b>{{ subC ? subC.name : '' }}</b> 的关联数据将迁移到主客户 <b>{{ mainC ? mainC.name : '' }}</b> 名下（原编号与历史记录保留）。</div>
        <div class="stat-row" style="grid-template-columns:repeat(6,1fr);margin-bottom:14px">
          <div class="stat-card" v-for="r in migRows" :key="r.k"><span class="lb">{{ r.l }}</span><span class="vl">{{ r.n }}</span><span class="ft">{{ r.n ? '将迁移' : '无数据' }}</span></div>
        </div>
        <el-alert :type="migTotal ? 'info' : 'success'" show-icon :closable="false" :title="migTotal ? ('合计迁移 ' + migTotal + ' 条关联数据的 customer 归属字段改写为「' + (mainC ? mainC.name : '') + '」') : '被合并客户暂无关联数据，仅做档案合并'"/>
      </div>
      <div v-else>
        <el-form label-width="110px" style="max-width:700px">
          <el-form-item label="合并摘要"><el-descriptions :column="2" border size="small" style="width:100%">
            <el-descriptions-item label="主客户">{{ mainC ? mainC.name + '（' + mainC.no + '）' : '-' }}</el-descriptions-item>
            <el-descriptions-item label="被合并客户">{{ subC ? subC.name + '（' + subC.no + '）' : '-' }}<el-tag v-if="subC && subC.no" size="small" effect="plain" style="margin-left:6px">原编号映射保留</el-tag></el-descriptions-item>
            <el-descriptions-item label="迁移关联数据">{{ migTotal }} 条</el-descriptions-item>
            <el-descriptions-item label="字段保留：被合并值"> {{ pickCount }} 个字段</el-descriptions-item>
          </el-descriptions></el-form-item>
          <el-form-item label="合并原因" required><el-input type="textarea" :rows="3" v-model="form.reason" placeholder="如：线索查重发现为同一主体，档案重复，并入主客户"/></el-form-item>
          <el-alert v-if="mainC && mainC.key" type="warning" show-icon :closable="false" title="主客户为重点客户：合并需「原负责人直属经理」审批；提交后将生成审批流程并记录操作人。"/>
        </el-form>
      </div>
      <div style="margin-top:18px;display:flex;gap:10px">
        <el-button v-if="step>1" @click="prev">上一步</el-button>
        <el-button v-if="step<4" type="primary" @click="next">下一步</el-button>
        <el-button v-if="step===4" type="danger" icon="Check" @click="doMerge">确认合并</el-button>
      </div>
    </div>
    <div class="card card-pad" style="margin-top:14px">
      <div class="card-title">合并记录<el-tag size="small" effect="plain" style="margin-left:6px">{{ store.ext.merges.length }} 条</el-tag></div>
      <el-table :data="store.ext.merges" size="small" empty-text="暂无合并记录">
        <el-table-column prop="time" label="时间" width="150"/><el-table-column label="主客户" min-width="180" show-overflow-tooltip><template #default="{row}">{{ row.main }}（{{ row.mainNo }}）</template></el-table-column>
        <el-table-column label="被合并客户" min-width="180" show-overflow-tooltip><template #default="{row}">{{ row.sub }}（{{ row.subNo }}）</template></el-table-column>
        <el-table-column prop="mig" label="迁移数据（条）" width="120" align="center"/><el-table-column prop="reason" label="原因" min-width="200" show-overflow-tooltip/>
        <el-table-column prop="who" label="操作人" width="90"/><el-table-column label="审批" width="100"><template #default="{row}"><el-tag size="small" :type="row.appr==='已通过'?'success':'warning'">{{ row.appr }}</el-tag></template></el-table-column>
      </el-table>
    </div>
  </div>`,
};
registerRoute('/customers/merge', CustomerMergePage, 'customer-merge');
