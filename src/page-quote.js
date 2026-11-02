/* ===== 报价单详情（第 3 阶段改造：按编号从 store.ext.quotes 取数，任意报价编号可渲染不报错）
   BJ-202611-0008 保持原有演示数据与版本/审批记录不变；其余报价按真实数据渲染，缺省字段给默认值 ===== */
const QuotePage = {
  components: { PageHead },
  props: { no: String },
  setup(props) {
    const isFixed = props.no === 'BJ-202611-0008';        // 原演示报价：数据与历史版本保持原样
    const q = computed(() => store.ext.quotes.find(x => x.no === props.no) || null);
    const prodOf = pno => store.ext.products.find(p => p.no === pno) || {};
    /* ---- 明细（可编辑）：NJ 演示单用原 QUOTE_ITEMS；其余按报价单自带 items 映射并补默认值 ---- */
    const items = ref(isFixed ? JSON.parse(JSON.stringify(QUOTE_ITEMS)) : ((q.value && q.value.items) || []).map((it, i) => ({
      id: i + 1, name: it.name || prodOf(it.productNo).name || '（未知产品）',
      spec: prodOf(it.productNo).spec || it.unit || '',
      qty: Number(it.qty) || 1, unit: it.unit || prodOf(it.productNo).unit || '件',
      price: Number(it.price) || 0, disc: it.discount == null ? 100 : Number(it.discount),
    })));
    const base = JSON.stringify(items.value);
    const modified = computed(() => JSON.stringify(items.value) !== base);
    const calc = computed(() => calcQuote(items.value));
    /* 最低价格底线：按客户类型/等级命中价格表，逐行比较折扣是否低于该表最低折扣（5.7、7.2） */
    const floorViolations = computed(() => {
      if (isFixed || !q.value) return [];
      const cu = store.customers.find(c => c.name === q.value.customer);
      const bookType = cu && cu.type === '渠道客户' ? '渠道价' : (cu && (cu.level === '重点客户' || cu.level === '战略客户') ? '重点客户价' : '标准价');
      const books = store.ext.pricebooks.filter(b => b.type === bookType);
      const book = books.find(b => b.status === '启用') || books[0];
      if (!book) return [];
      const out = [];
      items.value.forEach((it, i) => {
        const pno = ((q.value.items || [])[i] || {}).productNo || '';
        const row = book.items.find(x => x.productNo === pno);
        if (row && Number(it.disc) < row.minDiscount) out.push({ name: it.name, disc: Number(it.disc), min: row.minDiscount });
      });
      return out;
    });
    const autoPass = computed(() => !floorViolations.value.length && calc.value.discBp <= 500);
    const approvalRole = computed(() => floorViolations.value.length ? '总经理 / 财务负责人（低于最低价格底线）' : calc.value.rule.role);
    const status = ref((q.value && q.value.appr) || (isFixed ? '审批中' : '草稿'));
    const version = ref((q.value && q.value.ver) || 'V1');
    const versions = ref(isFixed ? [
      { v: 'V3', date: '2026-11-02 08:40', by: '张三', total: toC(334977.2), disc: 25360, st: '审批中（当前版本）', note: '含数据迁移服务，折扣 7.88%', cur: true },
      { v: 'V2', date: '2026-10-30 15:10', by: '张三', total: 34465000, disc: 1680000, st: '已发送客户 · 客户要求调整', note: '未含移动端扩展包', cur: false },
      { v: 'V1', date: '2026-10-20 10:30', by: '张三', total: 36363400, disc: 0, st: '已发送客户（已锁定）', note: '初版，按标准价', cur: false } ] : [
      { v: version.value, date: (q.value && ((q.value.date || TODAY) + ' 09:00')) || TODAY + ' 09:00', by: (q.value && (q.value.owner || '张三')) || '张三', total: toC((q.value && q.value.amount) || 0), disc: calc.value.discount, st: '当前版本 · ' + status.value, note: (q.value && q.value.opp ? '关联商机 ' + q.value.opp : '按价格表标准价') + '，共 ' + items.value.length + ' 行明细', cur: true } ]);
    // 付款条件：前两期按比例取整，末期倒挤，保证分项之和 = 含税金额
    const pays = computed(() => { const t = calc.value.total; const a = Math.round(t * 0.3), b = Math.round(t * 0.4); return [
      { n: '预付款（合同签署后 5 个工作日）', r: 30, a }, { n: '阶段款（系统上线）', r: 40, a: b }, { n: '验收款（终验通过后 10 个工作日）', r: 30, a: t - a - b } ]; });
    const payOk = computed(() => pays.value.reduce((s, p) => s + p.a, 0) === calc.value.total);
    const appr = ref(isFixed ? [
      { t: '2026-11-02 08:40', who: '王五', role: '申请人（销售人员）', act: '提交审批', op: '客户为重点客户，申请组合折扣，竞品报价较低。', st: 'done' },
      { t: '待处理', who: '张三', role: '销售经理', act: '审批中', op: '整体折扣 7.88% 超出销售授权（5%），需销售经理审批。', st: 'cur' } ] : [
      { t: ((q.value && q.value.date) || TODAY) + ' 08:40', who: (q.value && q.value.owner) || '张三', role: '申请人（销售人员）', act: '提交审批', op: '按' + ((q.value && q.value.opp) || '客户') + '报价需求提交折扣审批。', st: 'done' },
      { t: '待处理', who: '张三', role: '销售经理', act: status.value === '审批中' ? '审批中' : '待提交', op: discountNote(), st: status.value === '审批中' ? 'cur' : 'done' } ]);
    const oppName = computed(() => { const o = store.opps.find(x => x.no === (q.value || {}).opp); return o ? o.name : ''; });
    const custNo = computed(() => cno((q.value || {}).customer || ''));
    const contactName = computed(() => { const cs = (custBundle((q.value || {}).customer || '') || {}).contacts || []; return cs.length ? cs[0].name : '-'; });
    function discountNote() {
      const d = calc.value.discBp / 100;
      if (floorViolations.value.length) return '整体折扣 ' + d.toFixed(2) + '%，且存在低于最低价格底线的明细（' + floorViolations.value.map(x => x.name + ' ' + x.disc + '% < ' + x.min + '%').join('；') + '），需总经理 / 财务负责人审批。';
      if (d <= 5) return '整体折扣 ' + d.toFixed(2) + '%，在销售授权范围内，提交后自动通过。';
      return '整体折扣 ' + d.toFixed(2) + '%，超出销售授权（5%），需「' + approvalRole.value + '」审批。';
    }
    const nextVer = v => 'V' + ((parseInt(String(v || 'V1').replace(/\D/g, ''), 10) || 1) + 1);
    const delta = ref('');
    const save = () => {
      if (!modified.value) return ElMessage.info('没有变更，无需保存');
      versions.value.forEach(v => v.cur = false);
      const nv = nextVer(version.value);
      versions.value.unshift({ v: nv, date: TODAY + ' 07:05', by: '张三', total: calc.value.total, disc: calc.value.discount, st: '草稿（当前版本）', note: '修改明细后保存草稿，已审批通过的旧版本保持锁定', cur: true });
      version.value = nv; status.value = '草稿';
      if (q.value) { q.value.ver = nv; q.value.appr = '草稿'; }
      ElMessage.success(`已生成新版本 ${nv}；已审批通过的旧版本保持锁定、不被覆盖`);
    };
    const revise = () => ElMessageBox.confirm('已审批通过的版本已锁定，修改价格必须生成新版本并重新审批。确认由当前版本生成新版本？', '生成新版本', { type: 'warning' }).then(() => {
      const oldVer = version.value;
      versions.value.forEach(v => v.cur = false);
      const nv = nextVer(oldVer);
      version.value = nv; status.value = '草稿';
      if (q.value) { q.value.ver = nv; q.value.appr = '草稿'; }
      versions.value.unshift({ v: nv, date: TODAY + ' 09:05', by: '张三', total: calc.value.total, disc: calc.value.discount, st: '草稿（当前版本，可修改）', note: '由已审批版本 ' + oldVer + ' 派生新版本，原版本锁定不被覆盖', cur: true });
      ElMessage.success('已生成新版本 ' + nv + '，原审批版本保持锁定');
    }).catch(() => {});
    const submit = () => {
      const tip = autoPass.value
        ? `提交审批：整体折扣 ${(calc.value.discBp / 100).toFixed(2)}%，在销售授权范围内，将自动通过并锁定当前版本。`
        : `将提交审批：整体折扣 ${(calc.value.discBp / 100).toFixed(2)}%，需「${approvalRole.value}」审批。`;
      return ElMessageBox.confirm(tip, '提交审批', { type: 'info' }).then(() => {
        if (autoPass.value) {
          status.value = '已通过'; if (q.value) q.value.appr = '已通过';
          appr.value[1] = { t: TODAY + ' 09:00', who: '系统', role: '销售人员（授权范围内自动通过）', act: '自动通过', op: discountNote(), st: 'done' };
          ElMessage.success('已提交并按授权规则自动通过，当前版本已锁定');
        } else {
          status.value = '审批中'; if (q.value) q.value.appr = '审批中';
          appr.value[1] = { t: TODAY + ' 09:00', who: '张三', role: approvalRole.value, act: '审批中', op: discountNote(), st: 'cur' };
          ElMessage.success('已提交审批，审批人已收到通知');
        }
      }).catch(() => {});
    };
    const withdraw = () => ElMessageBox.confirm('撤回后报价回到草稿状态，可修改后重新提交。', '撤回审批', { type: 'warning' }).then(() => { status.value = '草稿'; if (q.value) q.value.appr = '草稿'; ElMessage.success('已撤回'); }).catch(() => {});
    const toContract = () => { if (status.value !== '已通过') return ElMessage.warning('报价审批通过后才能转为合同（当前：' + status.value + '）'); ElMessage.success('已生成合同草稿，可在合同模块继续完善'); };
    const approvedSim = () => {
      status.value = '已通过'; if (q.value) q.value.appr = '已通过';
      appr.value[appr.value.length - 1] = { t: TODAY + ' 07:10', who: '张三', role: approvalRole.value, act: '同意', op: '同意，折扣与价格底线符合审批规则。', st: 'done' };
      ElMessage.success('（演示）审批已通过，已审批版本被锁定，可转为合同');
    };
    const stTag = computed(() => ({ 草稿: 'info', 审批中: 'warning', 已通过: 'success', 已驳回: 'danger' }[status.value] || 'info'));
    /* 报价状态（规划方案 5.7 列字段）：审批未过与审批状态一致，已通过后按引用合同/有效期推导 */
    const qSt = computed(() => { const qq = q.value; const a = status.value; if (a !== '已通过') return a; if (qq && store.ext.contracts.some(c => c.quote === qq.no)) return '已转合同'; return daysBetween(TODAY, (qq || {}).valid) < 0 ? '已过期' : '正式报价'; });
    const qStTag = computed(() => ({ 草稿: 'info', 审批中: 'warning', 已驳回: 'danger', 正式报价: 'success', 已过期: 'warning', 已转合同: '' }[qSt.value] || 'info'));
    const reset = () => { items.value = JSON.parse(base); };
    const titleTag = computed(() => isFixed ? '南京某某 ERP 升级项目' : (oppName.value || ((q.value || {}).customer || '通用报价')));
    return { items, modified, calc, floorViolations, autoPass, approvalRole, status, version, versions, pays, payOk, appr, save, revise, submit, withdraw, toContract, approvedSim, stTag, qSt, qStTag, reset, fmtC, fmtY, TAX_RATE_BP, tab: ref('appr'), locked: computed(() => status.value === '已通过'), isFixed, q, custNo, contactName, titleTag, oppName };
  },
  template: `<div>
    <el-breadcrumb separator="/" class="crumb"><el-breadcrumb-item>报价管理</el-breadcrumb-item><el-breadcrumb-item><a @click="$go('/quotes')">报价列表</a></el-breadcrumb-item><el-breadcrumb-item>{{ no }}</el-breadcrumb-item></el-breadcrumb>
    <div class="page-head"><h1>报价单 {{ no }}</h1><el-tag :type="stTag">{{ status }}</el-tag><el-tag :type="qStTag" effect="plain">报价状态：{{ qSt }}</el-tag><el-tag type="primary" effect="plain">{{ version }}</el-tag><span class="total">{{ titleTag }}</span></div>
    <div class="ops" style="margin-top:-4px">
      <div style="display:flex;gap:8px;flex-wrap:wrap"><el-button @click="save">保存草稿</el-button><el-button v-if="locked" type="warning" plain @click="revise">生成新版本</el-button><el-button type="primary" @click="submit" :disabled="status==='审批中'">提交审批</el-button><el-button @click="withdraw" :disabled="status!=='审批中'">撤回</el-button><el-button @click="$msg.success('已复制为新报价草稿')">复制报价</el-button><el-button icon="Download" @click="$msg.info('示例：下载正式报价 PDF')">下载 PDF</el-button><el-button @click="$msg.info('示例：发送给客户（仅审批通过版本）')">发送客户</el-button><el-button type="success" @click="toContract">转为合同</el-button></div></div>
    <el-alert v-if="locked" type="success" show-icon :closable="false" style="margin-bottom:12px" title="该版本已审批通过并锁定；修改价格将生成新版本并重新审批。"/>
    <el-alert v-if="!q" type="warning" show-icon :closable="false" style="margin-bottom:12px" title="该报价编号在报价列表中不存在（未找到数据），以下按缺省字段渲染。"/>
    <div class="card card-pad" style="margin-bottom:14px"><div class="card-title">报价基本信息</div>
      <el-descriptions :column="4" border><el-descriptions-item label="报价编号">{{ no }}</el-descriptions-item><el-descriptions-item label="客户"><a class="link" @click="$go('/customer/'+custNo)">{{ (q && q.customer) || '-' }}</a></el-descriptions-item><el-descriptions-item label="联系人">{{ contactName }}</el-descriptions-item><el-descriptions-item label="关联商机"><a v-if="q && q.opp" class="link" @click="$go('/opp/'+q.opp)">{{ q.opp }}</a><span v-else>-</span></el-descriptions-item><el-descriptions-item label="报价日期">{{ (q && q.date) || TODAY }}</el-descriptions-item><el-descriptions-item label="有效期至">{{ (q && q.valid) || '-' }}</el-descriptions-item><el-descriptions-item label="负责人">{{ (q && q.owner) || '张三' }}</el-descriptions-item><el-descriptions-item label="币种 / 税率">人民币 / 增值税 {{ TAX_RATE_BP/100 }}%</el-descriptions-item></el-descriptions></div>
    <div class="card card-pad" style="margin-bottom:14px">
      <div class="card-title">产品明细<span class="muted" style="font-weight:400;font-size:12px">金额按「分」整数精确计算，无浮点误差；数量与折扣可编辑</span>
        <span style="margin-left:auto"><el-button size="small" icon="Plus" @click="$msg.info('示例：从产品目录添加')">添加产品</el-button><el-button size="small" @click="reset" :disabled="!modified">还原</el-button></span></div>
      <el-alert v-if="modified" type="warning" show-icon :closable="false" style="margin-bottom:10px" title="明细已修改：保存将生成新版本并通过折扣规则重新审批；已提交审批的旧版本保持锁定。"/>
      <el-table :data="calc.rows" show-summary :summary-method="() => ['','合计','','','','','','','¥'+fmtC(calc.sub)]" border>
        <el-table-column type="index" label="#" width="50"/>
        <el-table-column prop="name" label="产品" min-width="170"/><el-table-column prop="spec" label="规格" min-width="150"/>
        <el-table-column label="数量" width="130"><template #default="{row}"><el-input-number v-model="items[row.id-1].qty" :min="1" size="small" :disabled="locked" controls-position="right" style="width:100px"/></template></el-table-column>
        <el-table-column prop="unit" label="单位" width="80"/>
        <el-table-column label="标准单价" width="120" align="right"><template #default="{row}"><span class="money">¥{{ fmtC(row.stdC) }}</span></template></el-table-column>
        <el-table-column label="折扣（%）" width="130"><template #default="{row}"><el-input-number v-model="items[row.id-1].disc" :min="50" :max="100" size="small" :disabled="locked" controls-position="right" style="width:100px"/></template></el-table-column>
        <el-table-column label="成交单价" width="120" align="right"><template #default="{row}"><span class="money">¥{{ fmtC(row.dealC) }}</span></template></el-table-column>
        <el-table-column label="小计" width="140" align="right"><template #default="{row}"><span class="money"><b>¥{{ fmtC(row.lineSub) }}</b></span></template></el-table-column>
      </el-table>
      <div style="display:flex;margin-top:16px;gap:24px;align-items:flex-start">
        <div style="flex:1">
          <div class="sec-title">审批规则触发</div>
          <el-alert :type="autoPass?'success':'warning'" show-icon :closable="false" :title="'整体折扣 '+(calc.discBp/100).toFixed(2)+'%（优惠 ¥'+fmtC(calc.discount)+'）→ '+(autoPass?'销售授权内自动通过':'需「'+approvalRole+'」审批')"/>
          <div v-if="floorViolations.length" class="muted danger-text" style="font-size:12px;margin-top:4px">低于价格底线：{{ floorViolations.map(x => x.name+' '+x.disc+'% < '+x.min+'%').join('；') }}</div>
          <div class="muted" style="font-size:12px;margin-top:8px;line-height:1.8">规则：≤5% 销售授权内自动通过；≤10% 销售经理；≤20% 销售总监；超过 20% 或低于价格底线 → 总经理 / 财务负责人。</div>
          <div class="sec-title" style="margin-top:14px">交付说明</div>
          <el-descriptions :column="1" size="small" border><el-descriptions-item label="交付周期">合同生效后 90 个自然日内完成上线（以合同约定为准）</el-descriptions-item><el-descriptions-item label="实施范围">按报价明细行对应的部署范围执行</el-descriptions-item><el-descriptions-item label="服务期限">软件授权按年度；运维服务自验收之日起按合同周期</el-descriptions-item></el-descriptions>
        </div>
        <div class="amt-box" style="margin-left:0">
          <div class="r"><span>原价合计</span><span class="money">¥{{ fmtC(calc.orig) }}</span></div>
          <div class="r"><span>优惠金额</span><span class="money danger-text">- ¥{{ fmtC(calc.discount) }}</span></div>
          <div class="r"><span>不含税金额</span><span class="money">¥{{ fmtC(calc.sub) }}</span></div>
          <div class="r"><span>税额（{{ TAX_RATE_BP/100 }}%）</span><span class="money">¥{{ fmtC(calc.tax) }}</span></div>
          <div class="r total"><span>含税金额</span><span class="money">¥{{ fmtC(calc.total) }}</span></div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:14px">
      <div class="card card-pad"><div class="card-title">付款条件<el-tag size="small" :type="payOk?'success':'danger'" effect="plain" style="margin-left:6px">分项合计 {{ payOk ? '= 含税金额 ✓' : '≠ 含税金额' }}</el-tag></div>
        <el-table :data="pays" border size="small"><el-table-column prop="n" label="款项" min-width="220"/><el-table-column label="比例" width="70"><template #default="{row}">{{ row.r }}%</template></el-table-column><el-table-column label="金额（含税）" width="140" align="right"><template #default="{row}"><span class="money">¥{{ fmtC(row.a) }}</span></template></el-table-column></el-table></div>
      <div class="card card-pad"><el-tabs v-model="tab">
        <el-tab-pane label="审批记录" name="appr">
          <div class="flow" style="margin-bottom:12px"><template v-for="(a,i) in appr" :key="i"><div class="fnode" :class="a.st"><div class="c">{{ a.st==='done' ? '✓' : i+1 }}</div><div class="nm">{{ a.role.split('（')[0] }}</div><div class="pp">{{ a.who }}</div></div><div v-if="i<appr.length-1" class="fline" :class="{done:a.st==='done'}"></div></template><div class="fline"></div><div class="fnode"><div class="c">✓</div><div class="nm">完成</div></div></div>
          <el-table :data="appr" size="small"><el-table-column prop="t" label="时间" width="140"/><el-table-column label="审批人" width="150"><template #default="{row}">{{ row.who }}<div class="muted" style="font-size:12px">{{ row.role }}</div></template></el-table-column><el-table-column prop="act" label="结果" width="80"/><el-table-column prop="op" label="审批意见" min-width="180"/></el-table>
          <div style="margin-top:8px"><el-button size="small" link type="primary" @click="approvedSim" v-if="status==='审批中'">（演示）模拟经理审批通过</el-button><el-button size="small" link type="primary" @click="$go('/approvals')">前往审批中心</el-button></div></el-tab-pane>
        <el-tab-pane label="版本记录" name="ver"><el-table :data="versions" size="small"><el-table-column prop="v" label="版本" width="60"/><el-table-column prop="date" label="时间" width="140"/><el-table-column label="含税金额" width="130" align="right"><template #default="{row}"><span class="money">¥{{ fmtC(row.total) }}</span></template></el-table-column><el-table-column label="状态" min-width="170"><template #default="{row}"><el-tag size="small" :type="row.cur?'warning':'info'">{{ row.st }}</el-tag></template></el-table-column><el-table-column prop="note" label="说明" min-width="150"/></el-table><div class="muted" style="font-size:12px;margin-top:8px">已发送客户的历史版本不会被覆盖。</div></el-tab-pane>
        <el-tab-pane label="附件" name="files"><el-table :data="[{n:'正式报价单 '+version.value+'.pdf',s:'352 KB',t:'正式报价 PDF'},{n:'折扣申请说明.docx',s:'48 KB',t:'补充文件'}]" size="small"><el-table-column prop="n" label="文件名"><template #default="{row}"><a class="link">{{ row.n }}</a></template></el-table-column><el-table-column prop="t" label="类型" width="110"/><el-table-column prop="s" label="大小" width="80"/></el-table></el-tab-pane>
      </el-tabs></div>
    </div>
  </div>`,
};
registerRoute('/quote/:no', QuotePage, 'quote-detail');
