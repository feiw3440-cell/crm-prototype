/* ===== 第 3 阶段：客户内部关系图（全局组件 RelationGraph，props: customer 客户名称） =====
   节点按态度着色（支持者/中立/反对者）、按影响力定大小；
   边类型：汇报（实线）/ 影响（虚线）/ 支持（实）/ 反对（虚红）/ 合作（长虚线）；
   自动派生（汇报对象 + 对决策人的态度/影响力）+ 自定义扩展边（本案新增的「影响/合作」等）；
   点击节点跳转该联系人详情；带图例；可编辑：修改态度 / 新增关系（真实写回 store.ext.contacts / 边扩展） */
const REL_ATT_COLOR = () => ({ 支持者: cssVar('--el-color-success') || '#67c23a', 中立: cssVar('--el-color-info') || '#909399', 反对者: cssVar('--el-color-danger') || '#f56c6c' });
const REL_EXTRA = reactive({});                     // 客户名 → [{ from, to, type }]（from/to 为联系人编号）
const RelationGraph = {
  props: { customer: String, current: String, editable: { type: Boolean, default: true }, height: { type: String, default: '340px' } },
  setup(props) {
    const contacts = computed(() => store.ext.contacts.filter(c => c.customer === props.customer));
    const dec = computed(() => contacts.value.find(c => c.role === '决策人') || null);
    const extra = computed(() => REL_EXTRA[props.customer] || []);
    /* ---- 自动边：汇报 / 支持 / 反对 / 合作（按 attitude 与影响力对决策人派生） ---- */
    const autoEdges = computed(() => {
      const d = dec.value; const out = [];
      contacts.value.forEach(c => {
        if (c.reportsTo && contacts.value.some(x => x.no === c.reportsTo)) out.push({ from: c.no, to: c.reportsTo, type: '汇报' });
        if (!d || c.no === d.no) return;
        if (c.attitude === '支持者') out.push({ from: c.no, to: d.no, type: '支持' });
        else if (c.attitude === '反对者') out.push({ from: c.no, to: d.no, type: '反对' });
        else if (c.infl === '高') out.push({ from: c.no, to: d.no, type: '影响' });
        else if (c.key) out.push({ from: c.no, to: d.no, type: '合作' });
      });
      return out;
    });
    const edges = computed(() => autoEdges.value.concat(extra.value.filter(e => e.from && e.to)));
    /* ---- 决策链：按汇报关系从决策人向下逐级 ---- */
    const chain = computed(() => {
      const cs = contacts.value; const kids = {};
      cs.forEach(c => kids[c.no] = []);
      cs.forEach(c => { if (c.reportsTo && kids[c.reportsTo]) kids[c.reportsTo].push(c); });
      const roots = dec.value ? [dec.value] : cs.filter(c => !c.reportsTo);
      const out = []; const walk = (list, lvl) => list.forEach(c => { out.push({ c, lvl }); walk(kids[c.no] || [], lvl + 1); });
      walk(roots, 0);
      return out;
    });
    const supporters = computed(() => contacts.value.filter(c => c.attitude === '支持者'));
    const opponents = computed(() => contacts.value.filter(c => c.attitude === '反对者'));
    /* ---- ECharts graph ---- */
    const el = ref(null); let chart = null;
    const sizeOf = infl => infl === '高' ? 46 : infl === '中' ? 34 : 24;
    const option = computed(() => {
      const col = REL_ATT_COLOR();
      const cats = [{ name: '支持者', itemStyle: { color: col.支持者 } }, { name: '中立', itemStyle: { color: col.中立 } }, { name: '反对者', itemStyle: { color: col.反对者 } }];
      const nameById = {}; contacts.value.forEach(c => nameById[c.no] = c.name);
      const edgeStyle = {
        汇报: { color: cssVar('--text') || '#666', width: 2.2 },
        影响: { color: col.中立, width: 1.6, type: [6, 3] },
        支持: { color: col.支持者, width: 2 },
        反对: { color: col.反对者, width: 2, type: 'dashed' },
        合作: { color: col.中立, width: 1.4, type: [10, 6] },
      };
      return {
        color: cats.map(c => c.itemStyle.color),
        tooltip: { formatter: p => p.dataType === 'node' ? p.data.name + '<br/>' + p.data.title + ' · ' + p.data.role + '<br/>态度：' + p.data.attitude + ' · 影响力：' + p.data.infl : nameById[p.data.source] + ' → ' + nameById[p.data.target] + '（' + p.data.rel + '）' },
        legend: { show: false },
        series: [{
          type: 'graph', layout: 'force', roam: true, categories: cats,
          data: contacts.value.map(c => ({ id: c.no, name: c.name, title: c.title, role: c.role, infl: c.infl, attitude: c.attitude, symbolSize: sizeOf(c.infl), category: c.attitude === '支持者' ? 0 : c.attitude === '反对者' ? 2 : 1, label: { show: true, fontSize: 11, formatter: '{b}' } })),
          links: edges.value.map(e => ({ source: e.from, target: e.to, rel: e.type, lineStyle: edgeStyle[e.type] || { width: 1.5 }, label: { show: true, formatter: e.type, fontSize: 9, color: cssVar('--sub') || '#999' } })),
          force: { repulsion: 300, edgeLength: [70, 150], gravity: 0.06 },
          edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 7, lineStyle: { curveness: 0.08, opacity: 0.75 },
          emphasis: { focus: 'adjacency', label: { fontSize: 13, fontWeight: 'bold' } },
        }],
      };
    });
    const render = () => { if (chart && option.value) chart.setOption(option.value, true); chart && (chart.__disp = true); };
    onMounted(() => {
      if (!el.value || !window.echarts) return;
      chart = echarts.init(el.value, null, { renderer: 'canvas' });
      chart.on('click', p => { if (p.dataType === 'node' && p.data.id) go('/contact/' + p.data.id); });
      render();
      window.addEventListener('resize', () => chart && chart.resize());
    });
    watch(option, () => nextTick(render), { deep: true });
    watch(() => props.customer, () => nextTick(render));
    watch(theme, () => nextTick(render));
    /* ---- 小交互：修改态度 / 新增关系（写回数据） ---- */
    const dlg = reactive({ att: false, rel: false });
    const atf = reactive({ no: '', attitude: '支持者' });
    const rtf = reactive({ from: '', to: '', type: '影响' });
    const openAtt = () => { atf.no = props.current || (contacts.value[0] || {}).no || ''; atf.attitude = (contacts.value.find(c => c.no === atf.no) || {}).attitude || '中立'; dlg.att = true; };
    const doAtt = () => {
      const c = contacts.value.find(x => x.no === atf.no);
      if (!c) return ElMessage.warning('请选择联系人');
      c.attitude = atf.attitude;
      dlg.att = false; ElMessage.success('已修改「' + c.name + '」的态度为「' + atf.attitude + '」，关系图与名单已刷新');
    };
    const openRel = () => { const cs = contacts.value; rtf.from = props.current || (cs[0] || {}).no || ''; rtf.to = (cs.find(c => c.no !== rtf.from) || {}).no || ''; rtf.type = '影响'; dlg.rel = true; };
    const doRel = () => {
      if (!rtf.from || !rtf.to) return ElMessage.warning('请选择两个联系人');
      if (rtf.from === rtf.to) return ElMessage.warning('两个联系人不能相同');
      const a = contacts.value.find(x => x.no === rtf.from), b = contacts.value.find(x => x.no === rtf.to);
      if (rtf.type === '汇报') a.reportsTo = b.no;    // 汇报写回联系人的汇报对象字段
      else {
        REL_EXTRA[props.customer] = (REL_EXTRA[props.customer] || []).filter(e => !(e.from === rtf.from && e.to === rtf.to && e.type === rtf.type));
        REL_EXTRA[props.customer].push({ from: rtf.from, to: rtf.to, type: rtf.type });
      }
      dlg.rel = false; ElMessage.success('关系已新增：「' + a.name + '」 → ' + b.name + '（' + rtf.type + '），数据已写回');
    };
    const goContact = no => go('/contact/' + no);
    return { contacts, dec, edges, chain, supporters, opponents, el, option, render, dlg, atf, rtf, openAtt, doAtt, openRel, doRel, goContact, height: props.height };
  },
  template: `<div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:14px">
    <div>
      <div class="card card-pad" style="padding:10px 14px">
        <div class="card-title" style="margin-bottom:2px">客户内部关系图<el-tag v-if="dec" size="small" type="danger" effect="plain" style="margin-left:8px">决策人：{{ dec.name }}</el-tag>
          <span v-if="editable" style="margin-left:auto"><el-button size="small" type="primary" plain icon="Connection" @click="openRel">新增关系</el-button><el-button size="small" icon="EditPen" @click="openAtt">修改态度</el-button></span></div>
        <div ref="el" :style="{width:'100%',height:height,margin:'0 auto'}"></div>
        <div class="legend" style="display:flex;flex-wrap:wrap;gap:10px;font-size:12px;border-top:1px solid var(--line);padding-top:8px">
          <span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--el-color-success);margin-right:4px"></i>支持者</span>
          <span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--el-color-info);margin-right:4px"></i>中立</span>
          <span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--el-color-danger);margin-right:4px"></i>反对者</span>
          <span style="margin-left:8px"><i style="display:inline-block;width:22px;height:0;border-top:2px solid var(--text);margin-right:4px;vertical-align:middle"></i>汇报</span>
          <span><i style="display:inline-block;width:22px;height:0;border-top:2px dashed var(--el-color-info);margin-right:4px;vertical-align:middle"></i>影响</span>
          <span><i style="display:inline-block;width:22px;height:0;border-top:2px solid var(--el-color-success);margin-right:4px;vertical-align:middle"></i>支持</span>
          <span><i style="display:inline-block;width:22px;height:0;border-top:2px dashed var(--el-color-danger);margin-right:4px;vertical-align:middle"></i>反对</span>
          <span><i style="display:inline-block;width:22px;height:0;border-top:2px dotted var(--el-color-info);margin-right:4px;vertical-align:middle"></i>合作</span>
          <span class="muted" style="margin-left:auto">节点大小 = 影响力 · 点击节点进入联系人详情</span>
        </div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="card card-pad" style="padding:12px 14px">
        <div class="card-title" style="margin-bottom:8px">决策链<el-tag size="small" effect="plain" style="margin-left:6px">按汇报关系</el-tag></div>
        <template v-if="chain.length"><div v-for="(x,i) in chain" :key="x.c.no" style="display:flex;align-items:center;gap:8px;padding:3px 0">
          <span class="muted" style="font-size:11px;width:26px">L{{ x.lvl }}</span>
          <span :style="{paddingLeft:x.lvl*10+'px'}"><a class="link" @click="goContact(x.c.no)">{{ x.c.name }}</a></span>
          <span class="muted" style="font-size:12px">{{ x.c.title }}</span>
          <el-tag size="small" :type="x.c.role==='决策人'?'danger':'info'" effect="plain">{{ x.c.role }}</el-tag></div></template>
        <el-empty v-else description="暂无联系人" :image-size="40"/>
      </div>
      <div class="card card-pad" style="padding:12px 14px">
        <div class="card-title" style="margin-bottom:8px">支持者<el-tag size="small" type="success" effect="plain" style="margin-left:6px">{{ supporters.length }} 人</el-tag></div>
        <div v-if="supporters.length" style="display:flex;flex-wrap:wrap;gap:6px"><el-tag v-for="c in supporters" :key="c.no"><a class="link" style="color:inherit" @click="goContact(c.no)">{{ c.name }}</a></el-tag></div><div class="muted" v-else>暂无</div>
        <div class="card-title" style="margin:14px 0 8px">反对者<el-tag size="small" type="danger" effect="plain" style="margin-left:6px">{{ opponents.length }} 人</el-tag></div>
        <div v-if="opponents.length" style="display:flex;flex-wrap:wrap;gap:6px"><el-tag v-for="c in opponents" :key="c.no" type="danger"><a class="link" style="color:inherit" @click="goContact(c.no)">{{ c.name }}</a></el-tag></div><div class="muted" v-else>暂无</div>
      </div>
      <div class="card card-pad" style="padding:12px 14px">
        <div class="card-title" style="margin-bottom:8px">关系边<el-tag size="small" effect="plain" style="margin-left:6px">{{ edges.length }} 条</el-tag></div>
        <el-table size="small" max-height="180" :data="edges.map(e=>{const n={},cs=contacts;cs.forEach(c=>n[c.no]=c.name);return {from:n[e.from]||e.from,to:n[e.to]||e.to,type:e.type}})">
          <el-table-column min-width="120" :label="'起点 → 终点'"><template #default="{row}">{{ row.from }} → {{ row.to }}</template></el-table-column>
          <el-table-column prop="type" label="类型" width="70"><template #default="{row}"><el-tag size="small" effect="plain">{{ row.type }}</el-tag></template></el-table-column>
        </el-table>
      </div>
    </div>
    <el-dialog v-model="dlg.att" title="修改态度" width="380px">
      <el-form label-width="80px"><el-form-item label="联系人"><el-select v-model="atf.no" style="width:100%"><el-option v-for="c in contacts" :key="c.no" :label="c.name + '（' + c.title + '）'" :value="c.no"/></el-select></el-form-item>
        <el-form-item label="态度"><el-radio-group v-model="atf.attitude"><el-radio-button label="支持者"/><el-radio-button label="中立"/><el-radio-button label="反对者"/></el-radio-group></el-form-item></el-form>
      <template #footer><el-button @click="dlg.att=false">取消</el-button><el-button type="primary" @click="doAtt">保存</el-button></template>
    </el-dialog>
    <el-dialog v-model="dlg.rel" title="新增关系" width="420px">
      <el-form label-width="80px">
        <el-form-item label="起点"><el-select v-model="rtf.from" style="width:100%"><el-option v-for="c in contacts" :key="c.no" :label="c.name" :value="c.no"/></el-select></el-form-item>
        <el-form-item label="终点"><el-select v-model="rtf.to" style="width:100%"><el-option v-for="c in contacts" :key="c.no" :label="c.name" :value="c.no"/></el-select></el-form-item>
        <el-form-item label="关系类型"><el-select v-model="rtf.type" style="width:100%"><el-option label="汇报（写回汇报对象）" value="汇报"/><el-option v-for="t in ['影响','支持','反对','合作']" :key="t" :label="t" :value="t"/></el-select></el-form-item></el-form>
      <template #footer><el-button @click="dlg.rel=false">取消</el-button><el-button type="primary" @click="doRel">保存</el-button></template>
    </el-dialog>
  </div>`,
};
