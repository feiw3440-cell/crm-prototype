/* ===== 第 6 阶段：审批模板 /approvals/templates + 审批统计 /approvals/stats ===== */
const AT_KEY = 'crm_appr_templates_v1';
const AT_NODE_TYPES = ['直属经理', '指定角色', '指定人'];
const AT_ROLE_OPTS = ['销售经理', '销售总监', '财务负责人', '法务', '售前主管'];
const AT_PERSON_OPTS = ['张三', '李四', '王五', '赵六', '周总监', '王芳', '陈法务', '李琴', '管理员'];
const AT_REJECTS = ['退回修改', '自动驳回', '仅提醒'];
const AT_TEMPLATE_INIT = [
  { name: '报价折扣审批', desc: '报价单折扣超出销售授权范围时进入审批（对应 DISCOUNT_RULES 权限阶梯）',
    nodes: [ { name: '销售经理', type: '直属经理', role: '', person: '', cond: '' },
      { name: '销售总监', type: '指定角色', role: '销售总监', person: '', cond: '折扣 > 10% 时触发（整体折扣率超出销售权限）' },
      { name: '总经理', type: '指定人', role: '', person: '周总监', cond: '金额 > 50 万元或折扣 > 20% 时加签' } ],
    cc: ['张三'], timeout: 48, reject: '退回修改', on: true },
  { name: '合同审批', desc: '合同新建 / 变更 / 终止时进入审批，含法务与财务会签',
    nodes: [ { name: '业务负责人', type: '直属经理', role: '', person: '', cond: '' },
      { name: '法务', type: '指定角色', role: '法务', person: '', cond: '合同首次签署时触发' },
      { name: '财务', type: '指定人', role: '', person: '王芳', cond: '合同金额 > 30 万元时加签' } ],
    cc: ['李琴'], timeout: 24, reject: '自动驳回', on: true },
  { name: '客户转移审批', desc: '客户（尤其是重点客户）更换负责人需原负责人直属经理确认',
    nodes: [ { name: '原负责人直属经理', type: '直属经理', role: '', person: '', cond: '' },
      { name: '销售总监', type: '指定角色', role: '销售总监', person: '', cond: '重点客户（战略/重点等级）转移时加签' } ],
    cc: [], timeout: 24, reject: '退回修改', on: true },
  { name: '商机赢单审批', desc: '商机直接标记赢单/输单需提交依据（合同 / 订单 / 输单原因）',
    nodes: [ { name: '销售经理', type: '直属经理', role: '', person: '', cond: '' },
      { name: '管理层', type: '指定人', role: '', person: '李四', cond: '预计金额 > 50 万元时加签总经理' } ],
    cc: [], timeout: 48, reject: '仅提醒', on: true },
  { name: '回款核销审批', desc: '回款核销、冲销与超额到账分配的财务复核',
    nodes: [ { name: '财务负责人', type: '指定角色', role: '财务负责人', person: '', cond: '' },
      { name: '财务总监', type: '指定人', role: '', person: '王芳', cond: '核销金额 > 10 万元或冲销申请时加签' } ],
    cc: [], timeout: 12, reject: '自动驳回', on: true },
  { name: '客户合并审批', desc: '重复客户档案合并（重点客户合并强制审批）',
    nodes: [ { name: '销售经理', type: '直属经理', role: '', person: '', cond: '' },
      { name: '数据管理员', type: '指定人', role: '', person: '管理员', cond: '重点客户合并时加签' } ],
    cc: [], timeout: 24, reject: '退回修改', on: false },
  { name: '线索批量分配审批', desc: '超出普通销售权限的批量分配与公海领取豁免',
    nodes: [ { name: '销售经理', type: '直属经理', role: '', person: '', cond: '' },
      { name: '运营', type: '指定人', role: '', person: '管理员', cond: '单次分配 > 10 条时加签' } ],
    cc: [], timeout: 24, reject: '自动驳回', on: true },
  { name: '应收冲销审批', desc: '重复录入 / 误操作的回款冲销（需银行回单核对）',
    nodes: [ { name: '财务负责人', type: '指定角色', role: '财务负责人', person: '', cond: '' },
      { name: '总经理', type: '指定人', role: '', person: '周总监', cond: '冲销金额 > 20 万元时加签' } ],
    cc: [], timeout: 12, reject: '自动驳回', on: true },
  { name: '商机特殊折扣审批', desc: '商机折扣超出销售授权时进入审批（规划方案 7.2 商机特殊折扣）',
    nodes: [ { name: '销售经理', type: '直属经理', role: '', person: '', cond: '' },
      { name: '销售总监', type: '指定角色', role: '销售总监', person: '', cond: '折扣 > 10% 或预计金额 > 50 万元时加签' } ],
    cc: ['李琴'], timeout: 48, reject: '退回修改', on: true },
  { name: '低价报价审批', desc: '报价低于产品最低限价时进入总监或财务审批（规划方案 7.2 低价报价）',
    nodes: [ { name: '销售总监', type: '指定角色', role: '销售总监', person: '', cond: '低于最低限价时触发' },
      { name: '财务负责人', type: '指定角色', role: '财务负责人', person: '', cond: '低于最低限价 5% 以上或含税金额 > 30 万元时加签' } ],
    cc: ['王芳'], timeout: 24, reject: '退回修改', on: true },
  { name: '合同变更审批', desc: '合同金额、期限、范围变化时重新走相应审批（规划方案 7.2 合同变更）',
    nodes: [ { name: '业务负责人', type: '直属经理', role: '', person: '', cond: '' },
      { name: '法务', type: '指定角色', role: '法务', person: '', cond: '条款或范围变化时必审' },
      { name: '财务', type: '指定人', role: '', person: '王芳', cond: '金额变化 > 10 万元时加签' } ],
    cc: ['李琴'], timeout: 24, reject: '退回修改', on: true },
  { name: '合同终止审批', desc: '合同提前终止或解除时进入指定负责人和管理层审批（规划方案 7.2 合同终止）',
    nodes: [ { name: '指定负责人', type: '指定人', role: '', person: '李四', cond: '' },
      { name: '管理层', type: '指定人', role: '', person: '周总监', cond: '合同金额 > 50 万元或提前终止时加签' } ],
    cc: [], timeout: 48, reject: '自动驳回', on: true },
];
function atRead() {
  let v = null;
  try { v = JSON.parse(localStorage.getItem(AT_KEY) || 'null'); } catch (e) { v = null; }
  return (v && Array.isArray(v.templates) && v.templates.length) ? v.templates : JSON.parse(JSON.stringify(AT_TEMPLATE_INIT));
}

const ApprovalTemplatesPage = {
  components: { PageHead },
  setup() {
    const tmpls = ref(atRead());
    const f = reactive({ show: false, idx: -1, name: '', desc: '', nodes: [], cc: [], timeout: 24, reject: '退回修改', on: true });
    const open = (i) => {
      const t = tmpls.value[i];
      Object.assign(f, { show: true, idx: i, name: t.name, desc: t.desc, cc: [...t.cc], timeout: t.timeout, reject: t.reject, on: t.on });
      f.nodes = t.nodes.map(n => ({ ...n }));
    };
    const addNode = () => f.nodes.push({ name: '', type: '指定人', role: '', person: '', cond: '' });
    const delNode = i => { if (f.nodes.length <= 1) return ElMessage.warning('至少保留一个审批节点'); f.nodes.splice(i, 1); };
    const nodeDesc = n => (n.type === '直属经理' ? n.name + '（直属经理）' : n.type === '指定角色' ? n.name + '（角色：' + (n.role || '未设置') + '）' : n.name + '（' + (n.person || '未设置') + '）');
    const save = () => {
      if (!f.name.trim()) return ElMessage.warning('模板名称不能为空');
      if (!f.nodes.length) return ElMessage.warning('至少保留一个审批节点');
      for (let i = 0; i < f.nodes.length; i++) {
        const n = f.nodes[i];
        if (!n.name.trim()) return ElMessage.warning('第 ' + (i + 1) + ' 个节点的名称不能为空');
        if (n.type === '指定角色' && !n.role) return ElMessage.warning('第 ' + (i + 1) + ' 个节点（指定角色）请选择角色');
        if (n.type === '指定人' && !n.person) return ElMessage.warning('第 ' + (i + 1) + ' 个节点（指定人）请选择审批人');
      }
      Object.assign(tmpls.value[f.idx], { name: f.name.trim(), desc: f.desc.trim(), cc: [...f.cc], timeout: f.timeout, reject: f.reject, on: f.on, nodes: JSON.parse(JSON.stringify(f.nodes)) });
      try { localStorage.setItem(AT_KEY, JSON.stringify({ templates: tmpls.value })); } catch (e) {}
      store.ext.logs.unshift({ time: TODAY + ' 09:30', who: '管理员', module: '系统', act: '编辑', detail: '保存审批模板「' + f.name + '」（节点 ' + f.nodes.length + ' 个 · 超时提醒 ' + f.timeout + ' 小时 · 驳回规则：' + f.reject + '）', ip: '10.20.0.5' });
      f.show = false; ElMessage.success('审批模板已保存（写本地存储，后续新提交的审批将按模板路由）');
    };
    const toggle = t => { t.on = !t.on; try { localStorage.setItem(AT_KEY, JSON.stringify({ templates: tmpls.value })); } catch (e) {} ElMessage.success(t.name + ' 已' + (t.on ? '启用' : '停用为新提交的审批')); };
    return { tmpls, f, open, addNode, delNode, save, nodeDesc, toggle, AT_NODE_TYPES, AT_ROLE_OPTS, AT_PERSON_OPTS, AT_REJECTS };
  },
  template: `<div>
    <page-head :crumbs="['审批管理','审批模板']" title="审批模板" :total="'共 '+tmpls.length+' 个业务模板'">
      <el-button icon="RefreshLeft" @click="$msg.info('示例：恢复模板默认配置')">恢复默认</el-button>
    </page-head>
    <div class="card query" style="display:flex;align-items:center">
      <el-icon style="color:var(--el-color-primary);margin-right:8px"><setting/></el-icon>
      <span style="font-size:13px">模板定义审批流节点（类型与启用条件）、抄送、超时提醒与驳回规则；修改保存到本地存储后对后续新提交的审批生效。</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">
      <div class="card card-pad" v-for="(t,i) in tmpls" :key="t.name">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="width:38px;height:38px;border-radius:10px;background:var(--el-color-primary-light-9);color:var(--el-color-primary);display:flex;align-items:center;justify-content:center"><el-icon><stamp/></el-icon></span>
          <div style="flex:1;min-width:0"><div style="font-weight:600">{{ t.name }}</div><div class="muted" style="font-size:12px;line-height:1.5">{{ t.desc }}</div></div>
          <el-switch :model-value="t.on" inline-prompt active-text="启用" inactive-text="停用" @change="toggle(t)"/>
        </div>
        <div style="margin:10px 0 4px;display:flex;flex-wrap:wrap;gap:6px">
          <el-tag v-for="(n,j) in t.nodes" :key="j" size="small" effect="light" type="primary" style="max-width:100%">{{ nodeDesc(n) }}</el-tag>
        </div>
        <div class="muted" style="font-size:12px;line-height:1.7;margin-top:6px">
          启用条件：<span v-for="(n,j) in t.nodes.filter(n => n.cond)" :key="j">{{ j? '；':'' }}{{ n.name }}：{{ n.cond }}</span><span v-if="!t.nodes.some(n => n.cond)">—</span><br/>
          抄送：{{ t.cc.length ? t.cc.join('、') : '—' }} · 超时提醒：{{ t.timeout }} 小时 · 驳回规则：{{ t.reject }}
        </div>
        <div style="border-top:1px solid var(--line);margin-top:10px;padding-top:10px;display:flex">
          <el-button type="primary" plain icon="Edit" size="small" @click="open(i)">配置审批流</el-button>
        </div>
      </div>
    </div>
    <el-drawer v-model="f.show" :title="'审批模板配置 · ' + f.name" size="640px" destroy-on-close>
      <el-form label-width="96px">
        <el-form-item label="模板名称"><el-input v-model="f.name"/></el-form-item>
        <el-form-item label="用途说明"><el-input v-model="f.desc" type="textarea" :rows="2"/></el-form-item>
      </el-form>
      <div class="sec-title">审批流节点 <span class="muted" style="font-weight:400;font-size:12px">自上而下依次审批；条件不满足时自动跳过该节点</span></div>
      <div v-for="(n,i) in f.nodes" :key="i" style="border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin-bottom:10px;background:var(--soft)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <span class="muted">节点 {{ i+1 }}</span>
          <el-input v-model="n.name" placeholder="节点名称" style="width:180px" size="small"/>
          <el-select v-model="n.type" size="small" style="width:120px">
            <el-option v-for="x in AT_NODE_TYPES" :key="x" :label="x" :value="x"/>
          </el-select>
          <el-button link type="danger" size="small" style="margin-left:auto" @click="delNode(i)">删除节点</el-button>
        </div>
        <el-form label-width="82px">
          <el-form-item v-if="n.type==='指定角色'" label="审批角色"><el-select v-model="n.role" size="small" style="width:240px"><el-option v-for="x in AT_ROLE_OPTS" :key="x" :label="x" :value="x"/></el-select></el-form-item>
          <el-form-item v-if="n.type==='指定人'" label="审批人"><el-select v-model="n.person" filterable size="small" style="width:240px"><el-option v-for="x in AT_PERSON_OPTS" :key="x" :label="x" :value="x"/></el-select></el-form-item>
          <el-form-item label="启用条件"><el-input v-model="n.cond" size="small" placeholder="为空则始终启用；如：折扣 &gt; 10% / 金额 &gt; 50 万 / 重点客户转移"/></el-form-item>
        </el-form>
      </div>
      <el-button icon="Plus" size="small" plain type="primary" @click="addNode">新增节点</el-button>
      <el-form label-width="96px" style="margin-top:14px">
        <el-form-item label="抄送"><el-select v-model="f.cc" multiple collapse-tags filterable placeholder="可多选" style="max-width:100%"><el-option v-for="x in AT_PERSON_OPTS" :key="x" :label="x" :value="x"/></el-select></el-form-item>
        <el-form-item label="超时提醒"><el-input-number v-model="f.timeout" :min="1" :max="168" size="small" style="width:140px"/> <span class="muted" style="font-size:12px;margin-left:8px">小时（超过后企业和邮件提醒审批人）</span></el-form-item>
        <el-form-item label="驳回规则"><el-radio-group v-model="f.reject"><el-radio v-for="x in AT_REJECTS" :key="x" :label="x">{{ x }}</el-radio></el-radio-group>
          <div class="muted" style="font-size:12px">退回修改：申请人可修改后重新提交；自动驳回：流程终止并通知；仅提醒：不做处理仅提醒申请人。</div>
        </el-form-item>
      </el-form>
      <div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--line)">
        <el-button type="primary" @click="save">保存模板</el-button>
        <el-button @click="f.show=false">取消</el-button>
      </div>
    </el-drawer>
  </div>`,
};
registerRoute('/approvals/templates', ApprovalTemplatesPage, 'approval-templates');

/* ---------- 审批统计（确定性生成历史审批流水的统计视图） ---------- */
let AT_STAT_ROWS = null;
function atStatRows() {
  if (AT_STAT_ROWS) return AT_STAT_ROWS;
  const rr = extRng(770211);
  const names = store.ext.users.filter(u => u.status === '启用').map(u => u.name);
  const APPR = ['张三', '李四', '周总监', '王芳', '陈法务', '李琴'];
  const MONTHS = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
  const bizT = ['南京某某科技 ERP 升级项目', '苏州某某汽配渠道平台合同', '合肥某某餐饮连锁续费', '江苏某某集团平台建设', '杭州某某酒店年度服务', '宁波某某商贸会员系统升级'];
  const neg = [];
  const MC = { 报价折扣审批: 9, 合同审批: 8, 客户转移审批: 4, 商机赢单审批: 3, 回款核销审批: 6, 客户合并审批: 2, 应收冲销审批: 3, 线索批量分配审批: 4 };
  let apSeq = 1;
  Object.keys(MC).forEach(t0 => {
    for (let k = 0; k < MC[t0]; k++) {
      const m = extPick(rr, MONTHS.slice(-8));
      const day = extPad(extRint(rr, 1, 28), 2);
      const hourBase = Math.round(1 + rr() * rr() * 92);
      const hours = hourBase < 1 ? 1 : hourBase;
      neg.push({
        id: 'AP-' + extPad(apSeq++, 4), month: m, date: m + '-' + day,
        type: t0, title: (t0.split('审批')[0]) + '审批（示例：' + bizT[apSeq % bizT.length] + '）',
        applicant: extPick(rr, names), approver: extPick(rr, APPR), hours,
        status: extCh(rr, 0.78) ? '已通过' : '已驳回',
        ot: hours > 48, seq: k,
      });
    }
  });
  AT_STAT_ROWS = neg.sort((a, b) => (a.date < b.date ? 1 : -1));
  return AT_STAT_ROWS;
}

const AT_OT_H = 48;
const ApprovalStatsPage = {
  components: { PageHead, EChart },
  setup() {
    const fType = ref(''), fOt = ref('');
    const AT = atStatRows();
    const rows = computed(() => AT.filter(r0 => (!fType.value || r0.type === fType.value) && (!fOt.value || (fOt.value === '超时' ? r0.ot : !r0.ot))));
    const page = ref(1), size = ref(10);
    const paged = computed(() => rows.value.slice((page.value - 1) * size.value, page.value * size.value));
    watch(() => [fType.value, fOt.value], () => { page.value = 1; });
    const todoN = computed(() => store.approvals.filter(a => a.tab === 'todo').length);
    const avgH = computed(() => {
      const a = rows.value; if (!a.length) return 0;
      return Math.round(a.reduce((s, r0) => s + r0.hours, 0) / a.length * 10) / 10;
    });
    const passRate = computed(() => {
      const a = rows.value; if (!a.length) return 0;
      return Math.round(a.filter(r0 => r0.status === '已通过').length * 1000 / a.length) / 10;
    });
    const rejectRate = computed(() => {
      const a = rows.value; if (!a.length) return 0;
      return Math.round(a.filter(r0 => r0.status === '已驳回').length * 1000 / a.length) / 10;
    });
    const totalN = computed(() => rows.value.length);
    const otN = computed(() => (rows.value.filter(r0 => r0.ot)).length);
    const pal = AN_PAL();
    const optType = computed(() => {
      const a = AT.slice();
      const by = {}; a.forEach(r0 => { by[r0.type] = (by[r0.type] || 0) + 1; });
      const ks = Object.keys(by);
      const SUB = cssVar('--sub') || '#67768f';
      return {
        tooltip: { trigger: 'axis' }, grid: { left: 6, right: 10, top: 12, bottom: 0, containLabel: true },
        xAxis: { type: 'category', data: ks, axisLabel: { color: SUB, fontSize: 11, rotate: 20, interval: 0 } },
        yAxis: { type: 'value', ...anBaseAxis() },
        series: [{ type: 'bar', barWidth: 22, itemStyle: { color: (theme.value, cssVar('--el-color-primary')) || '#2f9bff' }, label: { show: true, position: 'top', color: SUB, fontSize: 11 }, data: ks.map(k => by[k]) }],
      };
    });
    const optMonth = computed(() => {
      const SUB = cssVar('--sub') || '#67768f'; const P = (theme.value, cssVar('--el-color-primary')) || '#2f9bff';
      // 排除当前月（进行中），展示完整自然月
      const a = AT.filter(r0 => r0.month !== '2026-11');
      const ms = [...new Set(a.map(r0 => r0.month).sort())];
      return {
        tooltip: { trigger: 'axis' }, legend: { data: ['审批数量', '平均时长(h)'], textStyle: { color: SUB }, right: 6, top: 0 },
        grid: { left: 6, right: 6, top: 30, bottom: 0, containLabel: true },
        xAxis: { type: 'category', data: ms, ...anBaseAxis() },
        yAxis: [{ type: 'value', name: '数量', ...anBaseAxis() }, { type: 'value', name: '小时', axisLabel: { color: SUB, fontSize: 11 }, splitLine: { show: false } }],
        series: [
          { name: '审批数量', type: 'bar', barWidth: 18, itemStyle: { color: mixHex(P, '#ffffff', .38) }, data: ms.map(m => a.filter(r0 => r0.month === m).length) },
          { name: '平均时长(h)', type: 'line', yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 6, itemStyle: { color: P }, data: ms.map(m => { const b = a.filter(r0 => r0.month === m); return b.length ? Math.round(b.reduce((s, r0) => s + r0.hours, 0) / b.length * 10) / 10 : 0; }) } ],
      };
    });
    const optWho = computed(() => {
      const SUB = cssVar('--sub') || '#67768f'; const P = (theme.value, cssVar('--el-color-primary')) || '#2f9bff';
      const a = AT; const who = [...new Set(a.map(r0 => r0.approver))];
      return {
        tooltip: { trigger: 'axis' }, grid: { left: 6, right: 12, top: 12, bottom: 0, containLabel: true },
        xAxis: { type: 'category', data: who, axisLabel: { color: SUB, fontSize: 11, rotate: 12 } },
        yAxis: { type: 'value', name: '平均小时', ...anBaseAxis() },
        series: [{ type: 'bar', barWidth: 26, itemStyle: { color: q => mixHex(P, '#000000', .1 * (q.dataIndex % 4)) },
          label: { show: true, position: 'top', color: SUB, fontSize: 11 },
          data: who.map(w0 => { const b = a.filter(r0 => r0.approver === w0); return Math.round(b.reduce((s, r0) => s + r0.hours, 0) / b.length * 10) / 10; }) }],
      };
    });
    const otTag = r0 => r0.ot ? 'danger' : 'info';
    const stTag = r0 => r0.status === '已通过' ? 'success' : 'danger';
    const atTypes = [...new Set(AT.map(r0 => r0.type))];
    return { fType, fOt, rows, paged, page, size, todoN, avgH, passRate, rejectRate, totalN, otN, optType, optMonth, optWho, otTag, stTag, atTypes };
  },
  template: `<div>
    <page-head :crumbs="['审批管理','审批统计']" title="审批统计" :total="'待办 '+todoN+' 项 · 历史 ' + rows.length + ' 条审批流水'">
      <el-button @click="$go('/approvals')">返回审批中心</el-button>
    </page-head>
    <div class="stat-row" style="grid-template-columns:repeat(6,1fr)">
      <div class="stat-card warn"><span class="lb">待我审批</span><span class="vl">{{ todoN }}</span><span class="ft">来自审批中心实时数据</span></div>
      <div class="stat-card"><span class="lb">审批数量</span><span class="vl">{{ totalN }}</span><span class="ft">当前筛选历史流水</span></div>
      <div class="stat-card"><span class="lb">平均处理时长</span><span class="vl">{{ avgH }} 小时</span><span class="ft">历史审批流水均值</span></div>
      <div class="stat-card ok"><span class="lb">通过率</span><span class="vl">{{ passRate }}%</span><span class="ft">已通过 / 总数</span></div>
      <div class="stat-card danger"><span class="lb">驳回率</span><span class="vl">{{ rejectRate }}%</span><span class="ft">已驳回 / 总数</span></div>
      <div class="stat-card danger"><span class="lb">超时数</span><span class="vl">{{ otN }}</span><span class="ft">处理时长 &gt; 48 小时</span></div>
    </div>
    <div class="card query">
      <el-form inline>
        <el-form-item label="审批类型"><el-select v-model="fType" placeholder="全部" clearable style="width:180px"><el-option v-for="x in atTypes" :key="x" :label="x" :value="x"/></el-select></el-form-item>
        <el-form-item label="时效"><el-select v-model="fOt" placeholder="全部" clearable style="width:130px"><el-option label="仅超时（>48h）" value="超时"/><el-option label="仅未超时" value="未超时"/></el-select></el-form-item>
      </el-form>
    </div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:14px;margin-bottom:14px">
      <div class="card card-pad"><div class="card-title">按审批类型 · 数量分布</div><e-chart :option="optType" height="272px"/></div>
      <div class="card card-pad"><div class="card-title">按月趋势（数量 + 平均处理时长，当前进行中的月份不参与均值）</div><e-chart :option="optMonth" height="252px"/></div>
    </div>
    <div class="card card-pad" style="margin-bottom:14px"><div class="card-title">各审批人 · 平均处理时长（小时）</div><e-chart :option="optWho" height="230px"/></div>
    <div class="card table-card">
      <div style="padding:10px 12px 0;display:flex;align-items:center"><span class="sec-title" style="margin:0">审批流水明细</span><span class="muted" style="font-size:12px;margin-left:10px">真实分页 · 随筛选联动</span></div>
      <el-table :data="paged" style="width:100%" :header-cell-style="{height:'42px'}" empty-text="没有符合条件的审批流水">
        <el-table-column prop="id" label="流水号" min-width="110"/><el-table-column prop="type" label="审批类型" min-width="130"/>
        <el-table-column prop="title" label="标题示例" min-width="260" show-overflow-tooltip/>
        <el-table-column prop="applicant" label="申请人" min-width="80"/><el-table-column prop="approver" label="审批人" min-width="80"/>
        <el-table-column prop="date" label="提交日期" min-width="105"/>
        <el-table-column prop="hours" label="处理时长(小时)" min-width="120" align="right"><template #default="{row}"><span class="mono">{{ row.hours }}</span></template></el-table-column>
        <el-table-column prop="status" label="结果" min-width="90"><template #default="{row}"><el-tag size="small" :type="stTag(row)" effect="light">{{ row.status }}</el-tag></template></el-table-column>
        <el-table-column prop="ot" label="超时" min-width="80"><template #default="{row}"><el-tag size="small" :type="otTag(row)" effect="plain">{{ row.ot ? '超时' : '正常' }}</el-tag></template></el-table-column>
      </el-table>
      <div class="pager"><span class="batch">共 {{ rows.length }} 条</span>
        <el-pagination v-model:current-page="page" v-model:page-size="size" :page-sizes="[10,20,50]" layout="sizes, prev, pager, next, jumper" :total="rows.length" background size="small"/></div>
    </div>
  </div>`,
};
registerRoute('/approvals/stats', ApprovalStatsPage, 'approval-stats');
