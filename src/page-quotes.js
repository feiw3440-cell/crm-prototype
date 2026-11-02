/* ===== 第 3 阶段：报价列表 /quotes（真实数据 + 新建报价弹窗写回 store.ext.quotes） ===== */
/* 报价状态（规划方案 5.7 列字段，为推导值）：审批未过与审批状态一致；已通过后按引用合同/有效期推导 */
const QUOTE_ST_TAG = { 草稿: 'info', 审批中: 'warning', 已驳回: 'danger', 正式报价: 'success', 已过期: 'warning', 已转合同: '' };
const quoteStOf = q => {
  if (!q) return '草稿';
  if (q.appr !== '已通过') return q.appr;
  if (store.ext.contracts.some(c => c.quote === q.no)) return '已转合同';
  return daysBetween(TODAY, q.valid) < 0 ? '已过期' : '正式报价';
};
const QuotesPage = {
  components: { ListPage },
  setup() {
    const rows = computed(() => store.ext.quotes.map(q => ({ ...q, st: quoteStOf(q) })));
    const totalText = computed(() => '报价列表共 ' + store.ext.quotes.length + ' 份');
    const stats = computed(() => {
      const a = store.ext.quotes; const date = new Date(TODAY);
      const expiring = a.filter(q => q.appr === '已通过' && q.valid && daysBetween(TODAY, q.valid) >= 0 && daysBetween(TODAY, q.valid) <= 7).length;
      return [['报价总数', String(a.length), ''], ['审批中', String(a.filter(q => q.appr === '审批中').length), 'warn'], ['已通过', String(a.filter(q => q.appr === '已通过').length), 'ok'], ['草稿 / 已驳回', String(a.filter(q => q.appr === '草稿' || q.appr === '已驳回').length), ''], ['7 天内到期', String(expiring), 'danger']];
    });
    const owners = computed(() => [...new Set(store.ext.quotes.map(q => q.owner).filter(Boolean))]);
    const cols = [
      { p: 'no', l: '报价编号', w: 150, link: true }, { p: 'customer', l: '客户名称', w: 200, link: 'cust' }, { p: 'opp', l: '关联商机', w: 150 },
      { p: 'amount', l: '报价金额（含税）', w: 140, money: true }, { p: 'disc', l: '折扣金额', w: 110, money: true },
      { p: 'date', l: '报价日期', w: 110 }, { p: 'valid', l: '有效期至', w: 110 }, { p: 'owner', l: '负责人', w: 85 },
      { p: 'appr', l: '审批状态', w: 100, tag: { 草稿: 'info', 审批中: 'warning', 已通过: 'success', 已驳回: 'danger' } }, { p: 'st', l: '报价状态', w: 100, tag: QUOTE_ST_TAG }, { p: 'ver', l: '版本', w: 70 },
    ];
    const filters = computed(() => [
      { k: 'kw', label: '搜索报价', ph: '报价编号 / 客户 / 商机' }, { k: 'appr', label: '审批状态', opts: ['草稿', '审批中', '已通过', '已驳回'] },
      { k: 'owner', label: '负责人', opts: owners.value },
    ]);
    /* ---- 新建报价弹窗 ---- */
    const fref = ref(null);
    const dlg = ref(false); const itemDlg = ref(false);
    const items = ref([]);
    const draft = reactive({ customer: '', opp: '', owner: '张三', date: TODAY, appr: '草稿' });
    const rule = {
      customer: [{ required: true, message: '请选择客户', trigger: 'change' }],
      owner: [{ required: true, message: '请选择负责人', trigger: 'change' }],
    };
    const addProduct = reactive({ no: '', qty: 1, discount: 90 });
    const addProductRow = () => {
      if (!addProduct.no) return ElMessage.warning('请选择产品');
      const p = store.ext.products.find(x => x.no === addProduct.no);
      if (!p) return;
      if (items.value.some(it => it.productNo === p.no)) return ElMessage.warning('该产品已在明细中，请直接调整数量与折扣');
      items.value.push({ productNo: p.no, name: p.name, qty: addProduct.qty, unit: p.unit, price: p.price, discount: addProduct.discount });
      addProduct.no = '';
    };
    const delProductRow = i => items.value.splice(i, 1);
    const money = computed(() => {
      let orig = 0, sub = 0;
      items.value.forEach(it => { orig += it.price * it.qty; sub += Math.round(it.price * it.qty * it.discount / 100); });
      return { orig, sub, amount: Math.round(sub * 1.13 * 100) / 100, disc: Math.round((orig - sub) * 100) / 100 };
    });
    const oppOptions = computed(() => store.opps.filter(o => !draft.customer || o.customer === draft.customer));
    const save = () => fref.value.validate(ok => {
      if (!ok) return;
      if (!items.value.length) return ElMessage.warning('请至少添加一条报价明细');
      const already = new Set(store.ext.quotes.map(q => q.no));
      const base = 'BJ-' + TODAY.slice(0, 7).replace('-', '') + '-';
      let seqS = 100 + store.ext.quotes.filter(q => q.no.startsWith(base)).length;
      let no; do { no = base + String(seqS++).padStart(4, '0'); } while (already.has(no));
      store.ext.quotes.unshift({ no, customer: draft.customer, opp: draft.opp, amount: money.value.amount, disc: money.value.disc, date: draft.date, valid: extAddDays(draft.date, 30), owner: draft.owner, appr: draft.appr, ver: 'V1', items: JSON.parse(JSON.stringify(items.value)) });
      store.ext.logs.unshift({ time: TODAY + ' 09:00', who: '张三', module: '报价', act: '新建', detail: `新建报价「${no}」（客户：${draft.customer}，明细 ${items.value.length} 行）` });
      dlg.value = false; ElMessage.success('报价已创建并写入报价列表');
      go('/quote/' + no);
    });
    /* ---- 行内编辑（金额 / 状态） ---- */
    const edDlg = ref(false); const ed = reactive({});
    const openEdit = row => { Object.keys(ed).forEach(k => delete ed[k]); Object.assign(ed, row); edDlg.value = true; };
    const saveEd = () => {
      const t = store.ext.quotes.find(q => q.no === ed.no); if (!t) return;
      const wasApproved = t.appr === '已通过';
      const oldVer = t.ver || 'V1';
      const nv = wasApproved ? 'V' + ((parseInt(String(oldVer).replace(/\D/g, ''), 10) || 1) + 1) : oldVer;
      Object.assign(t, { amount: ed.amount, disc: ed.disc, owner: ed.owner, date: ed.date, valid: ed.valid, ver: nv, appr: wasApproved ? '草稿' : t.appr });
      store.ext.logs.unshift({ time: TODAY + ' 09:00', who: '张三', module: '报价', act: '编辑', detail: wasApproved
        ? `已审批报价「${t.no}」价格变更：生成新版本 ${oldVer}→${nv}，状态回到草稿并需重新审批（原审批版本锁定）`
        : `编辑报价「${t.no}」金额/负责人等字段（审批状态不直接修改，走审批流程）` });
      edDlg.value = false; ElMessage.success(wasApproved ? `已审批报价不可直接覆盖，已生成新版本 ${nv} 并需重新审批` : '报价已更新');
    };
    return { rows, totalText, stats, cols, filters, store, fref, dlg, items, draft, rule, addProduct, addProductRow, delProductRow, money, oppOptions, save, edDlg, ed, openEdit, saveEd, OWNERS, QUOTE_ST_TAG, fmtC, fmtY };
  },
  template: `<div>
    <list-page :crumbs="['报价管理','报价列表']" title="报价列表" :total-text="totalText" :stats="stats" :filters="filters" :rows="rows" :cols="cols" :action-width="150" note-tag="真实数据 · 点击报价编号进入详情"
      @link="(c,row) => $go('/quote/'+row.no)">
      <template #ops><el-button type="primary" icon="Plus" @click="dlg=true">新增报价</el-button><el-button icon="Download" @click="$msg.info('示例：导出报价（敏感字段按权限脱敏）')">导出</el-button></template>
      <template #actions="{row}">
        <el-button link type="primary" @click="$go('/quote/'+row.no)">查看</el-button>
        <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
      </template>
    </list-page>
    <el-dialog v-model="dlg" title="新增报价" width="720px">
      <el-form ref="fref" :model="draft" :rules="rule" label-width="100px">
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="客户" prop="customer"><el-select v-model="draft.customer" filterable placeholder="选择客户" style="width:100%"><el-option v-for="c in store.customers" :key="c.no" :label="c.name" :value="c.name"/></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="关联商机"><el-select v-model="draft.opp" clearable placeholder="该客户的商机（可空）" style="width:100%"><el-option v-for="o in oppOptions" :key="o.no" :label="o.no + ' · ' + o.name" :value="o.no"/></el-select></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="8"><el-form-item label="负责人" prop="owner"><el-select v-model="draft.owner" style="width:100%"><el-option v-for="o in OWNERS" :key="o" :value="o"/></el-select></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="报价日期"><el-date-picker v-model="draft.date" type="date" value-format="YYYY-MM-DD" style="width:100%"/></el-form-item></el-col>
          <el-col :span="8"><el-form-item label="审批状态"><el-input :model-value="'草稿（提交审批后流转）'" disabled/></el-form-item></el-col>
        </el-row>
        <el-form-item label="产品明细" :required="true">
          <div style="width:100%">
            <el-table :data="items" size="small" border empty-text="尚未添加产品明细">
              <el-table-column prop="name" label="产品" min-width="160"/><el-table-column label="数量" width="90" align="right"><template #default="{row}">{{ row.qty }}</template></el-table-column>
              <el-table-column prop="unit" label="单位" width="70"/><el-table-column label="单价" width="100" align="right"><template #default="{row}">¥{{ fmtY(row.price) }}</template></el-table-column>
              <el-table-column label="折扣" width="80" align="center"><template #default="{row}">{{ row.discount }}%</template></el-table-column>
              <el-table-column label="操作" width="70" align="center"><template #default="{$index}"><el-button link type="danger" @click="delProductRow($index)">删除</el-button></template></el-table-column>
            </el-table>
            <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
              <el-select v-model="addProduct.no" filterable placeholder="从产品目录添加" style="width:260px" size="small"><el-option v-for="p in store.ext.products.filter(p=>p.status==='在售')" :key="p.no" :label="p.no + ' · ' + p.name" :value="p.no"/></el-select>
              <el-input-number v-model="addProduct.qty" :min="1" size="small" style="width:100px"/><span class="muted" style="font-size:12px">数量</span>
              <el-input-number v-model="addProduct.discount" :min="50" :max="100" size="small" style="width:100px"/><span class="muted" style="font-size:12px">折扣%</span>
              <el-button size="small" type="primary" plain icon="Plus" @click="addProductRow">添加</el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <div class="amt-box">
        <div class="r"><span>原价合计</span><span class="money">¥{{ fmtC(Math.round(money.orig*100)) }}</span></div>
        <div class="r"><span>优惠金额</span><span class="money">¥{{ fmtC(Math.round(money.disc*100)) }}</span></div>
        <div class="r total"><span>含税金额（增值税 13%）</span><span class="money">¥{{ fmtC(Math.round(money.amount*100)) }}</span></div>
      </div>
      <template #footer><el-button @click="dlg=false">取消</el-button><el-button type="primary" @click="save">保存并写入列表</el-button></template>
    </el-dialog>
    <el-dialog v-model="edDlg" :title="'编辑报价 · ' + (ed.no || '')" width="520px">
      <el-form label-width="110px">
        <el-form-item label="报价编号"><el-input :model-value="ed.no" disabled/></el-form-item>
        <el-form-item label="客户"><el-input :model-value="ed.customer" disabled/></el-form-item>
        <el-form-item label="报价金额（含税）"><el-input-number v-model="ed.amount" :min="0" :step="1000" :controls="false" style="width:200px"/></el-form-item>
        <el-form-item label="折扣金额"><el-input-number v-model="ed.disc" :min="0" :step="100" :controls="false" style="width:200px"/></el-form-item>
        <el-form-item label="负责人"><el-select v-model="ed.owner" style="width:200px"><el-option v-for="o in OWNERS" :key="o" :value="o"/></el-select></el-form-item>
        <el-form-item label="报价日期"><el-date-picker v-model="ed.date" type="date" value-format="YYYY-MM-DD" style="width:200px"/></el-form-item>
        <el-form-item label="有效期至"><el-date-picker v-model="ed.valid" type="date" value-format="YYYY-MM-DD" style="width:200px"/></el-form-item>
        <el-form-item label="审批状态"><el-input :model-value="ed.appr" disabled/></el-form-item>
      </el-form>
      <el-alert type="info" show-icon :closable="false" title="明细行请在报价单详情页编辑；审批状态不可在此直接修改，须经报价详情「提交审批 / 撤回」或审批中心流转（状态变化不得绕过审批）。已审批通过的报价修改金额/折扣金额时，保存会生成新版本并回到草稿重新审批，不覆盖原批准版本。"/>
      <template #footer><el-button @click="edDlg=false">取消</el-button><el-button type="primary" @click="saveEd">保存</el-button></template>
    </el-dialog>
  </div>`,
};
registerRoute('/quotes', QuotesPage, 'quotes');
