const { ref, reactive, computed, watch, onMounted, nextTick, onBeforeUnmount } = Vue;
const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;
const go = path => { location.hash = '#' + path; };

/* ===== 主题（粉 / 天蓝 / 白 / 灰），存 localStorage('crm_theme') ===== */
const THEMES = [['sky', '天蓝', '#2f9bff'], ['pink', '粉', '#e8588d'], ['white', '白', '#2b3a55'], ['gray', '灰', '#5b6b7f']];
const theme = ref(localStorage.getItem('crm_theme') || 'sky');
const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const hex2rgb = h => { h = (h || '#000000').replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) || 0); };
const mixHex = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const applyTheme = t => {
  theme.value = t;
  document.documentElement.dataset.theme = t;
  localStorage.setItem('crm_theme', t);
};
applyTheme(theme.value);

/* ===== 需求文档面板全局状态（key 由路由更新，override 由手机端各屏设置） ===== */
const docState = reactive({ key: '', override: '' });

/* ===== 路由注册表 ===== */
const ROUTES = [];
const registerRoute = (pattern, comp, docKey, propsFn) => {
  ROUTES.push({ pattern, segs: pattern.split('/').filter(Boolean), comp, docKey, propsFn });
};
const matchRoute = path => {
  const segs = path.split('/').filter(Boolean);
  for (const r of ROUTES) {
    if (r.segs.length !== segs.length) continue;
    const params = {}; let ok = true;
    r.segs.forEach((s, i) => { if (s[0] === ':') params[s.slice(1)] = decodeURIComponent(segs[i]); else if (s !== segs[i]) ok = false; });
    if (ok) return Object.assign({}, r, { params, props: r.propsFn ? r.propsFn(params) : Object.assign({}, params) });
  }
  return null;
};

/* ===== 全局 mock 数据仓库（可交互修改） ===== */
const stageProb = o => o.stage === 'close' ? (o.result === '赢单' ? 100 : 0) : (o.prob || 0);
const wAmount = o => Math.round((o.amount || 0) * stageProb(o) / 100);
const store = reactive({
  leads: JSON.parse(JSON.stringify(LEADS_INIT)),
  customers: JSON.parse(JSON.stringify(CUSTOMERS_INIT)).concat([
    { no: 'KH-202606-0008', name: '扬州某某教育科技有限公司', type: '企业客户', industry: '企业服务', level: '潜在客户', source: '广告', region: '江苏省扬州市', scale: '小型', owner: '', status: '正常', lastFollow: '2026-07-01', lastDeal: '-', total: 0, created: '2026-06-18', phone: '159****2218', key: false } ]),
  opps: JSON.parse(JSON.stringify(OPPS_INIT)),
  pay: buildPay(),
  approvals: JSON.parse(JSON.stringify(APPROVALS_INIT)),
  messages: JSON.parse(JSON.stringify(MESSAGES)),
  seq: { customer: 2, contact: 12 },
});

/* ===== 通用组件 ===== */
const PageHead = {
  props: { crumbs: Array, title: String, total: String },
  template: `<div>
    <el-breadcrumb separator="/" class="crumb">
      <el-breadcrumb-item v-for="(c,i) in crumbs" :key="i" :to="c.to ? {} : undefined" @click="c.to && $go(c.to)">{{ c.t || c }}</el-breadcrumb-item>
    </el-breadcrumb>
    <div class="page-head"><h1>{{ title }}</h1><span class="total" v-if="total">{{ total }}</span><div class="head-ops"><slot/></div></div>
  </div>`,
};

const EChart = {
  props: { option: Object, height: { type: String, default: '260px' } },
  setup(props) {
    const el = ref(null); let chart = null;
    const render = () => { if (chart && props.option) chart.setOption(props.option, true); };
    onMounted(() => {
      chart = echarts.init(el.value, null, { renderer: 'canvas' }); render();
      window.addEventListener('resize', resize);
    });
    const resize = () => chart && chart.resize();
    onBeforeUnmount(() => { window.removeEventListener('resize', resize); chart && chart.dispose(); });
    watch(() => props.option, render, { deep: true });
    watch(() => props.option, render, { deep: true });
    watch(theme, () => nextTick(render));
    return { el };
  },
  template: `<div ref="el" :style="{width:'100%',height:height}"></div>`,
};

const ListPage = {
  components: { PageHead },
  props: { crumbs: Array, title: String, totalText: String, stats: Array, filters: Array, rows: Array, cols: Array, total: Number, actionWidth: { type: Number, default: 200 }, selectable: { type: Boolean, default: true }, drawerTitle: String, noteTag: String },
  emits: ['link', 'reset'],
  setup(props, { emit }) {
    const q = reactive({}); const applied = reactive({}); const sel = ref([]); const page = ref(1); const size = ref(10);
    const drawer = ref(false); const cur = ref(null);
    const filtered = computed(() => props.rows.filter(r => (props.filters || []).every(f => {
      const v = applied[f.k]; if (!v) return true;
      if (f.k === 'kw') return Object.values(r).some(x => typeof x === 'string' && x.includes(v));
      return r[f.k] === v;
    })));
    const paged = computed(() => filtered.value.slice((page.value - 1) * size.value, page.value * size.value));
    watch(() => [filtered.value.length, size.value], () => { const max = Math.max(1, Math.ceil(filtered.value.length / size.value)); if (page.value > max) page.value = max; });
    const apply = () => { (props.filters || []).forEach(f => { applied[f.k] = q[f.k] || ''; }); page.value = 1; };
    const reset = () => { Object.keys(q).forEach(k => delete q[k]); Object.keys(applied).forEach(k => delete applied[k]); page.value = 1; emit('reset'); };
    const open = row => { cur.value = row; drawer.value = true; };
    const onLink = (c, row) => {
      if (c.link === 'cust') { const cu = custByName(row.customer); if (cu) return go('/customer/' + cu.no); }
      if (c.link === 'quote') return go('/quote/' + row.no);
      emit('link', c, row);
    };
    const tagType = (c, v) => (c.tag && c.tag[v]) || 'info';
    const doVoid = row => ElMessageBox.prompt('重要业务对象不做物理删除，将作废并归档。请填写作废原因（必填，并记录操作人）：', '作废确认', { confirmButtonText: '确认作废', cancelButtonText: '取消', inputPattern: /\S+/, inputErrorMessage: '作废原因不能为空' }).then(() => ElMessage.success('已作废并归档，操作日志已记录（操作人：张三）')).catch(() => {});
    return { q, applied, sel, page, size, drawer, cur, filtered, paged, apply, reset, open, onLink, tagType, doVoid, yuan, fmtC };
  },
  template: `<div>
    <page-head :crumbs="crumbs" :title="title" :total="totalText"><el-tag v-if="noteTag" type="info" effect="plain">{{ noteTag }}</el-tag><slot name="head-ops"/></page-head>
    <slot name="top"/>
    <div class="stat-row" v-if="stats" :style="{gridTemplateColumns:'repeat('+stats.length+',1fr)'}">
      <div class="stat-card" :class="s[2]" v-for="s in stats" :key="s[0]"><span class="lb">{{ s[0] }}</span><span class="vl">{{ s[1] }}</span><span class="ft" v-if="s[3]">{{ s[3] }}</span></div>
    </div>
    <div class="card query" v-if="filters && filters.length">
      <el-form inline @submit.prevent="apply">
        <el-form-item v-for="f in filters" :key="f.k" :label="f.opts ? f.label : ''">
          <el-input v-if="!f.opts" v-model="q[f.k]" :placeholder="f.ph || f.label" clearable style="width:240px" :prefix-icon="'Search'" @keyup.enter="apply" @clear="q[f.k]='';apply()" />
          <el-select v-else v-model="q[f.k]" :placeholder="'全部'" clearable style="width:150px" @change="v => { if (!v) apply(); }" @keyup.enter="apply"><el-option v-for="o in f.opts" :key="o" :label="o" :value="o"/></el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" icon="Search" @click="apply">查询</el-button><el-button @click="reset">重置</el-button></el-form-item>
      </el-form>
    </div>
    <div class="ops"><slot name="ops" :sel="sel"/><span class="grow" v-if="sel.length">已选 {{ sel.length }} 条</span></div>
    <div class="card table-card">
      <el-table :data="paged" @selection-change="v => sel = v" row-key="no" style="width:100%" empty-text="暂无数据（可调整筛选条件或点「重置」）" :header-cell-style="{height:'42px'}">
        <el-table-column v-if="selectable" type="selection" width="46" fixed />
        <el-table-column v-for="c in cols" :key="c.p" :prop="c.p" :label="c.l" :min-width="c.w" :show-overflow-tooltip="!c.noTip">
          <template #default="{row}">
            <slot :name="'cell-'+c.p" :row="row">
              <a v-if="c.link" class="link" @click.stop="onLink(c,row)">{{ row[c.p] }}</a>
              <el-tag v-else-if="c.tag" :type="tagType(c,row[c.p])" size="small" effect="light">{{ row[c.p] }}</el-tag>
              <span v-else-if="c.money" class="money">{{ row[c.p] === '-' ? '-' : ('¥' + (Number(row[c.p]) % 1 ? fmtC(Math.round(row[c.p]*100)) : Number(row[c.p]).toLocaleString('zh-CN'))) }}</span>
              <el-tag v-else-if="c.bool" size="small" :type="row[c.p] ? 'danger' : 'info'" effect="plain">{{ row[c.p] ? '是' : '否' }}</el-tag>
              <el-progress v-else-if="c.progress" :percentage="row[c.p]" :stroke-width="8" :status="row[c.p]===100?'success':''" />
              <span v-else>{{ row[c.p] === '' ? '-' : row[c.p] }}</span>
            </slot>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" :min-width="actionWidth" class-name="row-actions">
          <template #default="{row}">
            <slot name="actions" :row="row" :open="open">
              <el-button link type="primary" @click="open(row)">查看</el-button>
              <el-button link type="primary" @click="$msg.info('示例：进入编辑表单（必填项标星，保存前校验）')">编辑</el-button>
              <el-button link type="danger" @click="doVoid(row)">作废</el-button>
            </slot>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager"><span class="batch">共 {{ filtered.length }} 条<template v-if="sel.length"> · 已选 {{ sel.length }} 条</template></span>
        <el-pagination v-model:current-page="page" v-model:page-size="size" :page-sizes="[10,20,50]" layout="sizes, prev, pager, next, jumper" :total="filtered.length" background size="small"/></div>
    </div>
    <el-drawer v-model="drawer" :title="drawerTitle || '详情（快速查看）'" size="480px" destroy-on-close>
      <slot name="drawer" :row="cur" :close="() => drawer = false">
        <el-descriptions v-if="cur" :column="1" border>
          <el-descriptions-item v-for="c in cols" :key="c.p" :label="c.l">{{ typeof cur[c.p] === 'boolean' ? (cur[c.p] ? '是' : '否') : (c.money && cur[c.p] !== '-' ? '¥' + fmtY(cur[c.p]) : cur[c.p]) }}</el-descriptions-item>
        </el-descriptions>
        <div style="margin-top:16px"><el-button type="primary" @click="$msg.info('示例：进入完整详情页')">查看完整详情</el-button><el-button @click="drawer=false">关闭</el-button></div>
      </slot>
    </el-drawer>
  </div>`,
};

const PlaceholderPage = {
  components: { ListPage },
  props: { k: String },
  setup(props) {
    const cfg = computed(() => PH[props.k]);
    const stats = computed(() => cfg.value.stats);
    const crumbs = computed(() => cfg.value.crumbs);
    const totalText = computed(() => cfg.value.crumbs[1] + '共 ' + cfg.value.rows.length.toLocaleString('zh-CN') + ' ' + cfg.value.unit);
    return { cfg, stats, crumbs, totalText };
  },
  template: `<list-page :key="k" :crumbs="crumbs" :title="cfg.crumbs[1]" :total-text="totalText" :stats="cfg.stats" :filters="cfg.filters" :rows="cfg.rows" :cols="cfg.cols" note-tag="占位页 · 示例数据">
    <template #ops="{sel}">
      <el-button v-for="(o,i) in cfg.ops" :key="o" :type="i===0?'primary':''" :icon="i===0?'Plus':(o==='导出'?'Download':(o==='导入'?'Upload':''))" @click="$msg.info('示例：' + o)">{{ o }}</el-button>
      <el-button :disabled="!sel.length" @click="$msg.info('将批量操作 ' + sel.length + ' 条记录')">批量操作</el-button>
    </template>
  </list-page>`,
};
const cno = name => { const c = custByName(name); return c ? c.no : 'NA'; };

/* ===== 未匹配路由：友好提示页 ===== */
const NotFoundPage = {
  template: `<div class="card card-pad" style="text-align:center;padding:80px 40px">
    <el-empty description="页面不存在">
      <p class="muted" style="margin:0 0 18px;font-size:13px">访问的地址未找到对应的页面（可能是链接已失效或地址输错），请检查后重试。</p>
      <el-button type="primary" icon="HomeFilled" @click="$go('/workbench')">返回工作台</el-button>
    </el-empty>
  </div>`,
};

/* ===== 占位模块路由说明：analytics / system 已由 page-analytics.js / page-system.js 替代，此处不再注册占位路由 ===== */
