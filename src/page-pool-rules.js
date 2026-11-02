/* ===== 第 6 阶段：公海规则配置 /system/pool-rules（线索公海 / 客户公海 + 规则试算 + 变更记录） ===== */
const PR_KEY = 'crm_pool_rules_v1';
const PR_DEFAULT = {
  leads: { noFollow: 15, noDeal: 45, protectKey: false, protectContract: false, dailyLimit: 5, holdLimit: 20, protectDays: 15, needAudit: false, alloc: '手动', scope: [] },
  custs: { noFollow: 15, noDeal: 90, protectKey: true, protectContract: true, dailyLimit: 5, holdLimit: 30, protectDays: 30, needAudit: true, alloc: '手动', scope: [] },
  logs: [ { time: '2026-10-12 10:20', who: '管理员', desc: '初始化公海规则：客户公海 15 天未跟进 / 90 天未成交自动释放，重点客户与履约合同客户保护。' } ],
};
const prDeep = o => JSON.parse(JSON.stringify(o));
function prRead() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(PR_KEY) || 'null'); } catch (e) { saved = null; }
  if (!saved || typeof saved !== 'object') return prDeep(PR_DEFAULT);
  const out = prDeep(PR_DEFAULT);
  ['leads', 'custs'].forEach(k => { if (saved[k]) out[k] = Object.assign(out[k], saved[k]); });
  if (Array.isArray(saved.logs)) out.logs = saved.logs;
  return out;
}
const prHasContract = c => (store.ext.contracts || []).some(t => t.customer === c.name && (t.status === '履约中' || t.status === '生效' || t.status === '待签署' || t.status === '审批通过'));
const prHasOpenComplaint = c => (store.ext.tickets || []).some(t => t.customer === c.name && t.type === '投诉' && t.status !== '已关闭');
const prHasSpecial = c => !!(c.specialProtect || c.protected);

const PoolRulesPage = {
  components: { PageHead },
  setup() {
    const r = reactive(prRead());
    const active = ref('custs');
    const trial = reactive({ show: '', rows: [], kept: [], note: '' });
    const todayStr = TODAY;
    const diff = (a, b) => daysBetween(a, b);

    const stats = computed(() => {
      const poolCust = store.customers.filter(c => !c.owner).length;
      const poolLead = store.leads.filter(l => !l.owner && l.status !== '已转化').length;
      const protectCust = store.customers.filter(c => c.owner && (c.key || prHasContract(c) || prHasOpenComplaint(c) || prHasSpecial(c))).length;
      return [['公海客户（无负责人）', String(poolCust), 'warn'], ['公海线索（无负责人）', String(poolLead), 'warn'],
        ['受保护客户', String(protectCust), 'ok'], ['规则变更记录', String(r.logs.length), '']];
    });
    const SRC_OPTS = ['官网', '广告', '活动', '转介绍', '渠道'];
    const LVL_OPTS = ['战略客户', '重点客户', '普通客户', '潜在客户'];
    const ALLOCS = ['手动', '轮流', '按区域'];

    const save = () => {
      try { localStorage.setItem(PR_KEY, JSON.stringify({ leads: r.leads, custs: r.custs, logs: r.logs })); } catch (e) {}
      ElMessage.success('公海规则已保存（本地持久化，刷新后仍生效）');
    };
    const saveLogs = () => {
      const d = active.value === 'custs' ? '客户公海' : '线索公海';
      r.logs.unshift({ time: todayStr + ' ' + String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0'), who: '管理员', desc: '调整' + d + '规则：未跟进 ' + (active.value === 'custs' ? r.custs.noFollow : r.leads.noFollow) + ' 天 / 未成交 ' + (active.value === 'custs' ? r.custs.noDeal : r.leads.noDeal) + ' 天，保护期 ' + (active.value === 'custs' ? r.custs.protectDays : r.leads.protectDays) + ' 天，分配方式：' + (active.value === 'custs' ? r.custs.alloc : r.leads.alloc) + '。' });
      if (r.logs.length > 30) r.logs.length = 30;
      save(); ElMessage.success('规则已保存，并已写入变更记录');
    };
    const reset = () => {
      ElMessageBox.confirm('恢复本次公海规则的默认配置？', '恢复默认', { type: 'warning', confirmButtonText: '恢复', cancelButtonText: '取消' })
        .then(() => { Object.assign(r, prDeep(PR_DEFAULT)); save(); ElMessage.success('已恢复默认规则'); }).catch(() => {});
    };

    const runTrial = which => {
      active.value = which;
      const rule = which === 'custs' ? r.custs : r.leads;
      const rows = [], kept = [];
      if (which === 'custs') {
        store.customers.forEach(c => {
          if (c.status === '流失' || (c.mergedTo !== undefined)) return;
          const inScope = !rule.scope.length || rule.scope.includes(c.level);
          const dFollow = diff(c.lastFollow, todayStr);
          const dDeal = c.lastDeal && c.lastDeal !== '-' ? diff(c.lastDeal, todayStr) : diff(c.created, todayStr);
          if (!c.owner) {
            kept.push({ n: c.name, w: '—（已在公海）', why: c.status === '潜在客户' ? '潜在客户尚未分配' : '公海存量' });
            return;
          }
          if (c.protectUntil && c.protectUntil >= todayStr) {
            kept.push({ n: c.name, w: c.owner, why: '领取保护期内（至 ' + c.protectUntil + '），不释放' });
            return;
          }
          if (c.key && rule.protectKey) {
            kept.push({ n: c.name, w: c.owner, why: '重点客户保护开启' });
            return;
          }
          if (rule.protectContract && prHasContract(c)) return kept.push({ n: c.name, w: c.owner, why: '名下有生效/履约中合同（保护）' });
          if (prHasOpenComplaint(c)) return kept.push({ n: c.name, w: c.owner, why: '存在未处理投诉（保护，6.2）' });
          if (prHasSpecial(c)) return kept.push({ n: c.name, w: c.owner, why: '客户存在特殊保护（保护，6.2）' });
          if (!inScope) {
            kept.push({ n: c.name, w: c.owner, why: '生效范围未覆盖「' + c.level + '」' });
            return;
          }
          const reasons = [];
          if (dFollow >= rule.noFollow) reasons.push('超 ' + rule.noFollow + ' 天未跟进（最后跟进 ' + (c.lastFollow || '—') + '）');
          if (dDeal >= rule.noDeal) reasons.push('超 ' + rule.noDeal + ' 天未成交（' + (c.lastDeal !== '-' ? '最近成交 ' + c.lastDeal : '从未成交') + '）');
          if (reasons.length) rows.push({ n: c.name, w: c.owner, why: reasons.join('；') });
          else kept.push({ n: c.name, w: c.owner, why: '持续跟进中，不触发释放' });
        });
      } else {
        store.leads.forEach(l => {
          if (l.status === '已转化' || l.status === '无效') {
            kept.push({ n: l.no + ' ' + l.company, w: l.owner || '—', why: '状态为「' + l.status + '」，不参与释放' });
            return;
          }
          const base = (l.created || '').slice(0, 10);
          const d = diff(base, todayStr);
          const inScope = !rule.scope.length || rule.scope.includes(l.source);
          if (!l.owner) {
            kept.push({ n: l.no + ' ' + l.company, w: '—（公海）', why: '待领取' });
            return;
          }
          if (!inScope) return kept.push({ n: l.no + ' ' + l.company, w: l.owner, why: '生效范围未覆盖来源「' + l.source + '」' });
          if (d >= rule.noFollow) rows.push({ n: l.no + ' ' + l.company, w: l.owner, why: '创建后超 ' + rule.noFollow + ' 天未跟进（' + base + '）' });
          else kept.push({ n: l.no + ' ' + l.company, w: l.owner, why: d >= 0 ? '跟进窗口内（' + d + ' 天）' : '新增线索' });
        });
      }
      trial.rows = rows; trial.kept = kept; trial.show = which;
      trial.note = which === 'custs'
        ? '试算口径：对 store.customers 中全部在档客户按当前规则模拟释放（不写数据）。重点客户保护 / 履约合同保护优先生效。'
        : '试算口径：对 store.leads 中全部线索按当前规则模拟释放（不写数据）；已转化 / 无效线索不参与。';
      ElMessage.success('试算完成：将释放 ' + rows.length + ' 条、受保护/不触发 ' + kept.length + ' 条');
    };

    return { r, active, trial, save, saveLogs, reset, runTrial, stats, SRC_OPTS, LVL_OPTS, ALLOCS, trialPane: computed(() => trial.show === 'custs' ? '客户公海' : '线索公海') };
  },
  template: `<div>
    <page-head :crumbs="['系统管理','公海规则']" title="公海规则配置" :total="'线索公海 / 客户公海 · 规则离线持久化'">
      <el-button icon="RefreshLeft" @click="reset">恢复默认</el-button>
    </page-head>
    <div class="stat-row" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card" v-for="s in stats" :key="s[0]" :class="s[2]"><span class="lb">{{ s[0] }}</span><span class="vl">{{ s[1] }}</span><span class="ft">试算与限额实时核对</span></div>
    </div>
    <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start">
      <div class="card card-pad" v-for="(pool,key) in {leads:'线索公海',custs:'客户公海'}" :key="key" :style="active===key ? 'border-color:var(--el-color-primary)' : ''">
        <div class="card-title" style="justify-content:space-between">
          <span><el-icon style="color:var(--el-color-primary);margin-right:6px"><bucket/></el-icon>{{ pool }}规则</span>
          <el-tag size="small" effect="plain">生效范围：{{ r[key].scope.length ? (key==='custs' ? r[key].scope.join(' / ') : r[key].scope.join(' / ')) : '全部（不限）' }}</el-tag>
        </div>
        <el-form label-width="150px" style="margin-top:4px">
          <el-form-item label="自动释放条件">
            <div style="display:flex;flex-direction:column;gap:8px;width:100%">
              <div style="display:flex;align-items:center;gap:8px">超 <el-input-number v-model="r[key].noFollow" :min="1" :max="365" size="small" style="width:100px"/> 天未跟进</div>
              <div style="display:flex;align-items:center;gap:8px">超 <el-input-number v-model="r[key].noDeal" :min="1" :max="365" size="small" style="width:100px"/> 天未成交</div>
            </div>
          </el-form-item>
          <el-form-item label="客户保护">
            <div style="display:flex;flex-direction:column;gap:6px">
              <el-checkbox v-model="r[key].protectKey">重点客户（战略/重点等级）保护，不自动释放</el-checkbox>
              <el-checkbox v-model="r[key].protectContract">有履约中 / 已签署合同的客户保护</el-checkbox>
            </div>
          </el-form-item>
          <el-form-item label="领取限制">
            <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
              <span>每人每日上限 <el-input-number v-model="r[key].dailyLimit" :min="1" :max="100" size="small" style="width:92px"/></span>
              <span>同时持有上限 <el-input-number v-model="r[key].holdLimit" :min="1" :max="500" size="small" style="width:92px"/></span>
            </div>
          </el-form-item>
          <el-form-item label="保护期天数">
            <span style="display:flex;align-items:center;gap:8px">领取后 <el-input-number v-model="r[key].protectDays" :min="0" :max="120" size="small" style="width:92px"/> 天内不释放（保护期优先于释放条件）</span>
          </el-form-item>
          <el-form-item label="退回公海需审批">
            <el-radio-group v-model="r[key].needAudit"><el-radio :label="true">需要（走「客户转移审批」）</el-radio><el-radio :label="false">不需要</el-radio></el-radio-group>
          </el-form-item>
          <el-form-item label="分配方式">
            <el-radio-group v-model="r[key].alloc"><el-radio v-for="a in ALLOCS" :key="a" :label="a">{{ a }}</el-radio></el-radio-group>
          </el-form-item>
          <el-form-item :label="key==='custs' ? '生效范围（等级）' : '生效范围（来源）'">
            <el-select v-if="key==='custs'" v-model="r[key].scope" multiple collapse-tags placeholder="不限（全部等级）" style="width:100%">
              <el-option v-for="l in LVL_OPTS" :key="l" :label="l" :value="l"/>
            </el-select>
            <el-select v-else v-model="r[key].scope" multiple collapse-tags placeholder="不限（全部来源）" style="width:100%">
              <el-option v-for="s in SRC_OPTS" :key="s" :label="s" :value="s"/>
            </el-select>
          </el-form-item>
        </el-form>
        <div style="display:flex;gap:8px;border-top:1px solid var(--line);padding-top:12px">
          <el-button type="primary" icon="Check" @click="saveLogs()">保存规则</el-button>
          <el-button icon="MagicStick" @click="runTrial(key)">规则试算</el-button>
          <span class="muted" style="margin-left:auto;align-self:center;font-size:12px">{{ active===key ? '当前操作目标' : '' }}</span>
        </div>
      </div>
    </div>

    <div class="card table-card" v-if="trial.show" style="margin-top:14px">
      <div style="padding:10px 12px 6px;display:flex;align-items:center;gap:10px">
        <span class="sec-title" style="margin:0">规则试算 · {{ trialPane }}</span>
        <el-tag size="small" type="warning" effect="light">释放 {{ trial.rows.length }} 条</el-tag>
        <el-tag size="small" type="success" effect="light">不释放 / 受保护 {{ trial.kept.length }} 条</el-tag>
        <el-button link type="primary" style="margin-left:auto" @click="trial.show=''">收起</el-button>
      </div>
      <div class="muted" style="padding:0 14px 8px;font-size:12px">{{ trial.note }}</div>
      <el-table :data="trial.rows" style="width:100%" :header-cell-style="{height:'42px'}" empty-text="当前规则下没有会被自动释放的对象">
        <el-table-column prop="n" :label="trial.show==='custs' ? '客户名称' : '线索'" min-width="230"/>
        <el-table-column prop="w" label="当前负责人" min-width="110"/>
        <el-table-column prop="why" label="释放原因（命中条件）" min-width="320"/>
      </el-table>
      <div style="padding:10px 14px;border-top:1px solid var(--line)">
        <div class="muted" style="font-size:12px;margin-bottom:6px">不释放明细（抽样展示，共 {{ trial.kept.length }} 条）</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;max-height:130px;overflow:auto">
          <el-tag v-for="(k,i) in trial.kept.slice(0, 40)" :key="i" size="small" type="info" effect="plain" :title="k.why" class="dup-tag">{{ k.n }} · {{ k.w }}</el-tag>
        </div>
      </div>
    </div>
    <el-empty v-else description="尚未运行规则试算：点击上方「规则试算」按钮，按当前规则对真实数据模拟释放清单" style="margin-top:8px;padding:28px 0 36px"/>

    <div class="card table-card" style="margin-top:14px">
      <div style="padding:10px 12px 0"><span class="sec-title" style="margin:0">规则变更记录</span><span class="muted" style="font-size:12px;margin-left:10px">每次保存自动追加（保存至本地存储）</span></div>
      <el-table :data="r.logs" style="width:100%" :header-cell-style="{height:'42px'}" empty-text="暂无变更记录">
        <el-table-column prop="time" label="变更时间" min-width="160"/>
        <el-table-column prop="who" label="操作人" min-width="100"/>
        <el-table-column prop="desc" label="变更摘要" min-width="560" show-overflow-tooltip/>
      </el-table>
    </div>
  </div>`,
};
registerRoute('/system/pool-rules', PoolRulesPage, 'pool-rules');
