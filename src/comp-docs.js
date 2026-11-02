/* ===== 需求文档说明面板：三种状态（隐藏 / 半隐藏 / 完全展开），内容可增删改，存 localStorage ===== */
const DOC_STATE_KEY = 'crm_doc_state';
const DOC_DATA_KEY = 'crm_docs_v1';

const docDeep = o => JSON.parse(JSON.stringify(o));
const docReadOverride = () => { try { return JSON.parse(localStorage.getItem(DOC_DATA_KEY) || '{}') || {}; } catch (e) { return {}; } };

const DocPanel = {
  setup() {
    const mode = ref(['hidden', 'half', 'full'].includes(localStorage.getItem(DOC_STATE_KEY)) ? localStorage.getItem(DOC_STATE_KEY) : 'half');
    const setMode = m => { if (!['hidden', 'half', 'full'].includes(m)) return; mode.value = m; try { localStorage.setItem(DOC_STATE_KEY, m); } catch (e) {} };
    setMode(mode.value);
    const kw = ref('');
    const overrides = reactive(docReadOverride());
    const curKey = computed(() => docState.override || docState.key);
    const doc = computed(() => {
      const key = curKey.value;
      if (!key || !DOCS_DEFAULT[key]) return null;
      const d = docDeep(DOCS_DEFAULT[key]);
      const ov = overrides[key] && overrides[key].sections;
      if (ov) Object.keys(ov).forEach(i => { if (d.sections[i]) d.sections[i].items = (ov[i] || []).slice(); });
      return d;
    });
    const view = computed(() => {
      const d = doc.value; if (!d) return [];
      const k = kw.value.trim();
      const arr = d.sections.map((s, i) => ({ i, t: s.t, items: s.items.map((x, oi) => ({ x, oi })) }));
      if (!k) return arr;
      return arr.map(s => Object.assign({}, s, { items: s.items.filter(o => o.x.includes(k)) })).filter(s => s.items.length);
    });
    const save = () => { try { localStorage.setItem(DOC_DATA_KEY, JSON.stringify(overrides)); } catch (e) {} };
    const material = si => { const d = doc.value; const key = curKey.value; const items = d.sections[si].items.slice(); overrides[key] = overrides[key] || {}; if (!overrides[key].sections) overrides[key].sections = {}; overrides[key].sections[si] = items; return overrides[key].sections[si]; };
    const promptItem = (title, init) => ElMessageBox.prompt('请输入条目内容（保存到本地存储，可随时“恢复默认”还原）：', title, { confirmButtonText: '保存', cancelButtonText: '取消', inputType: 'textarea', inputValue: init || '', inputPattern: /\S/, inputErrorMessage: '内容不能为空' });
    const addItem = si => promptItem(si === 11 ? '新增变更记录（自动带时间）' : '新增条目').then(({ value }) => { let v = (value || '').trim(); if (si === 11 && !/^\d{4}-\d{2}-\d{2}/.test(v)) v = new Date().toISOString().slice(0, 10) + ' · 张三 · ' + v; material(si).push(v); save(); ElMessage.success('已保存到本地'); }).catch(() => {});
    const editItem = (si, ii) => promptItem('编辑条目', doc.value.sections[si].items[ii]).then(({ value }) => { material(si)[ii] = (value || '').trim(); save(); ElMessage.success('已保存到本地'); }).catch(() => {});
    const delItem = (si, ii) => ElMessageBox.confirm('确认删除该条目？', '删除', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }).then(() => { material(si).splice(ii, 1); save(); ElMessage.success('已删除'); }).catch(() => {});
    const resetCur = () => ElMessageBox.confirm('恢复本页需求文档为默认内容？', '恢复默认（本页）', { type: 'warning', confirmButtonText: '恢复', cancelButtonText: '取消' }).then(() => { delete overrides[curKey.value]; save(); ElMessage.success('已恢复默认'); }).catch(() => {});
    const resetAll = () => ElMessageBox.confirm('恢复全部页面的需求文档为默认内容？将清除所有本地修改。', '恢复默认（全部）', { type: 'warning', confirmButtonText: '全部恢复', cancelButtonText: '取消' }).then(() => { Object.keys(overrides).forEach(k => delete overrides[k]); save(); ElMessage.success('已全部恢复默认'); }).catch(() => {});
    const fileEl = ref(null);
    const importJson = () => fileEl.value && fileEl.value.click();
    const onFile = ev => {
      const f = ev.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const data = JSON.parse(rd.result) || {};
          Object.keys(data).forEach(k => { if (DOCS_DEFAULT[k] && data[k].sections) overrides[k] = { sections: data[k].sections }; });
          save(); ElMessage.success('导入成功');
        } catch (e) { ElMessage.error('导入失败：文件格式不正确'); }
      };
      rd.readAsText(f); ev.target.value = '';
    };
    const exportJson = () => {
      const blob = new Blob([JSON.stringify(overrides, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'crm-docs.json'; a.click(); URL.revokeObjectURL(a.href);
    };
    const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const hl = x => {
      const k = kw.value.trim();
      if (!k) return escapeHtml(x);
      const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      return escapeHtml(x).replace(re, m => '<mark>' + m + '</mark>');
    };
    const FCOLS = ['字段', '类型', '必填', '校验', '说明'];
    const rowCells = x => {
      const parts = String(x).split('｜').map(t => t.trim().replace(/^(类型|必填|校验|说明|字段)[:：]\s*/, ''));
      const name = parts.shift() || ''; const out = [name, '', '', '', ''];
      if (parts.length >= 4) { for (let i = 0; i < 4; i++) out[i + 1] = parts[i] || ''; if (parts.length > 4) out[4] = parts.slice(3).join('｜'); }
      else { if (parts.length) out[4] = parts[parts.length - 1]; if (parts.length > 1) out[1] = parts[0]; if (parts.length > 2) out[2] = parts[1]; }
      return out;
    };
    return { FCOLS, rowCells, mode, setMode, kw, doc, view, curKey, addItem, editItem, delItem, resetCur, resetAll, exportJson, importJson, onFile, fileEl, hl };
  },
  template: `<div v-if="doc">
    <a v-if="mode==='hidden'" class="doc-fab" @click="setMode('half')" title="需求文档说明"><el-icon><document/></el-icon><span>文档</span></a>
    <div v-else class="doc-panel" :class="mode">
      <div class="doc-head">
        <div class="doc-tt"><span class="doc-badge">需求文档</span><b>{{ doc.name }}</b><span class="doc-mod">{{ doc.module }}</span></div>
        <div class="doc-icons">
          <el-icon v-if="mode==='half'" class="doc-act doc-act-full" title="完全展开" @click="setMode('full')"><expand/></el-icon>
          <el-icon v-if="mode==='full'" class="doc-act doc-act-half" title="收窄" @click="setMode('half')"><subtract/></el-icon>
          <el-icon class="doc-act doc-act-hide" title="隐藏面板" @click="setMode('hidden')"><close/></el-icon>
        </div>
      </div>
      <div class="doc-body">
        <template v-if="mode==='half'">
          <div class="doc-sec"><div class="doc-sech"><span class="idx">2</span>页面目标</div><p class="doc-goal">{{ doc.sections[1].items.join(' ') }}</p></div>
          <div class="doc-sec"><div class="doc-sech"><span class="idx">11</span>验收标准摘要</div><p class="doc-goal">{{ doc.sections[10].items[0] }} {{ doc.sections[10].items[1] || '' }}</p></div>
          <div class="doc-tip">点击 <el-icon><expand/></el-icon> 展开查看完整 12 要素（可编辑）</div>
        </template>
        <template v-else>
          <div class="doc-tools">
            <el-input v-model="kw" size="small" placeholder="搜索本文档关键词" prefix-icon="Search" clearable />
            <el-button size="small" link type="primary" @click="exportJson">导出JSON</el-button>
            <el-button size="small" link type="primary" @click="importJson">导入JSON</el-button>
            <el-button size="small" link @click="resetCur">恢复默认（本页）</el-button>
            <el-button size="small" link @click="resetAll">恢复默认（全部）</el-button>
            <input ref="fileEl" type="file" accept="application/json" style="display:none" @change="onFile"/>
          </div>
          <div v-for="s in view" :key="s.i" class="doc-sec">
            <div class="doc-sech"><span class="idx">{{ s.i + 1 }}</span>{{ s.t }}<a class="doc-add" title="新增条目" @click="addItem(s.i)"><el-icon><plus/></el-icon>新增</a></div>
            <table v-if="s.i===5 && s.items.length" class="doc-ftable"><thead><tr><th v-for="c in FCOLS" :key="c">{{ c }}</th><th class="ops-col">操作</th></tr></thead>
              <tbody><tr v-for="o in s.items" :key="o.oi"><td v-for="(c,ci) in rowCells(o.x)" :key="ci" v-html="hl(c)" @dblclick="editItem(s.i, o.oi)"></td>
                <td class="ops-col"><el-icon title="编辑" @click="editItem(s.i, o.oi)"><edit/></el-icon><el-icon title="删除" @click="delItem(s.i, o.oi)"><delete/></el-icon></td></tr></tbody></table>
            <template v-else><div v-for="o in s.items" :key="o.oi" class="doc-item">
              <div class="tx" v-html="hl(o.x)" @dblclick="editItem(s.i, o.oi)"></div>
              <span class="it-ops"><el-icon title="编辑" @click="editItem(s.i, o.oi)"><edit/></el-icon><el-icon title="删除" @click="delItem(s.i, o.oi)"><delete/></el-icon></span>
            </div></template>
          </div>
          <div v-if="!view.length" class="doc-empty">未找到匹配「{{ kw }}」的条目</div>
        </template>
      </div>
    </div>
  </div>`,
};
