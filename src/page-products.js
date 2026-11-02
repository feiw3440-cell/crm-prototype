/* ===== 第 3 阶段：产品目录 /products + 产品详情 /product/:no + 价格表 /pricebooks ===== */
const PRODUCT_CATS = ['产品', '软件', '服务', '实施费用', '维护费用', '增值服务', '套餐'];
const PRODUCT_STS = ['在售', '停售', '停用'];
const PRODUCT_STATUS_TAG = { 在售: 'success', 停售: 'warning', 停用: 'info' };
const genProductNo = () => {
  let seq = store.ext.products.length + 100; let no;
  do { no = 'CP-' + String(seq++).padStart(4, '0'); } while (store.ext.products.some(p => p.no === no));
  return no;
};

/* ----- 产品目录（真写入 store.ext.products） ----- */
const ProductsPage = {
  components: { ListPage },
  setup() {
    const rows = computed(() => store.ext.products.map(p => ({
      ...p, books: store.ext.pricebooks.filter(b => b.items.some(i => i.productNo === p.no)).length + ' 张',
    })));
    const stats = computed(() => {
      const a = store.ext.products;
      return [['产品总数', String(a.length), '', PRODUCT_CATS.length + ' 个分类'], ['在售', String(a.filter(p => p.status === '在售').length), 'ok'], ['停售 / 停用', String(a.filter(p => p.status !== '在售').length), 'warn'], ['价格表', String(store.ext.pricebooks.length), '']];
    });
    const cols = [
      { p: 'no', l: '产品编号', w: 110 }, { p: 'name', l: '产品名称', w: 200, link: true }, { p: 'cat', l: '产品分类', w: 100 },
      { p: 'spec', l: '产品规格', w: 150 }, { p: 'unit', l: '标准单位', w: 95 }, { p: 'price', l: '标准售价', w: 115, money: true },
      { p: 'cost', l: '成本价', w: 110, money: true }, { p: 'status', l: '产品状态', w: 95, tag: PRODUCT_STATUS_TAG }, { p: 'desc', l: '产品说明', w: 220 }, { p: 'books', l: '适用价格表', w: 100 },
    ];
    const filters = [
      { k: 'kw', label: '搜索产品', ph: '产品编号 / 名称 / 说明' }, { k: 'cat', label: '产品分类', opts: PRODUCT_CATS }, { k: 'status', label: '产品状态', opts: PRODUCT_STS },
    ];
    /* ---- 新增 / 编辑 / 停售 ---- */
    const fref = ref(null);
    const dlg = reactive({ open: false, edit: null });
    const f = reactive({});
    const rule = {
      name: [{ required: true, message: '请填写产品名称', trigger: 'blur' }],
      cat: [{ required: true, message: '请选择产品分类', trigger: 'change' }],
      price: [{ required: true, message: '请填写标准售价', trigger: 'blur' }, { type: 'number', min: 0.01, message: '售价必须大于 0', trigger: 'blur' }],
      cost: [{ type: 'number', min: 0, message: '成本价不能为负数', trigger: 'blur' }],
    };
    const openAdd = () => { dlg.edit = null; Object.assign(f, { no: '', name: '', cat: '软件', spec: '', unit: '套', price: null, cost: null, status: '在售', desc: '' }); dlg.open = true; nextTick(() => fref.value && fref.value.clearValidate()); };
    const openEdit = row => { dlg.edit = store.ext.products.find(x => x.no === row.no) || row; Object.keys(f).forEach(k => delete f[k]); Object.assign(f, dlg.edit); dlg.open = true; nextTick(() => fref.value && fref.value.clearValidate()); };
    const save = () => fref.value.validate(ok => {
      if (!ok) return;
      const data = { name: f.name, cat: f.cat, spec: f.spec, unit: f.unit, price: f.price, cost: f.cost || 0, status: f.status, desc: f.desc };
      if (dlg.edit) { Object.assign(dlg.edit, data); store.ext.logs.unshift({ time: TODAY + ' 09:00', who: '张三', module: '系统', act: '编辑', detail: `编辑产品「${f.name}」（${dlg.edit.no}）` }); ElMessage.success('产品已保存，目录与价格表明细即时同步'); }
      else {
        const no = genProductNo(); const p = { no, ...data };
        store.ext.products.push(p);
        store.ext.pricebooks.forEach(b => b.items.push({ productNo: no, price: data.price, minDiscount: b.type === '渠道价' ? 80 : 85 }));
        store.ext.logs.unshift({ time: TODAY + ' 09:00', who: '张三', module: '系统', act: '新建', detail: `新建产品「${f.name}」（${no}），已同步到全部价格表` });
        ElMessage.success('产品已新增并同步到全部价格表');
      }
      dlg.open = false;
    });
    const toggleSale = row => {
      const t = store.ext.products.find(x => x.no === row.no) || row;
      const goOut = t.status === '在售';
      ElMessageBox.confirm(`确认将产品「${t.name}」${goOut ? '停售' : '恢复在售'}？${goOut ? '停售后不能再加入新报价，历史报价不受影响。' : '恢复后可正常用于报价。'}`, goOut ? '停售确认' : '恢复在售', { type: 'warning' }).then(() => {
        t.status = goOut ? '停售' : '在售';
        store.ext.logs.unshift({ time: TODAY + ' 09:00', who: '张三', module: '系统', act: '编辑', detail: `产品「${t.name}」（${t.no}）状态变更为：${t.status}` });
        ElMessage.success(`已${goOut ? '停售' : '恢复在售'}：${t.name}`);
      }).catch(() => {});
    };
    return { rows, stats, cols, filters, dlg, f, fref, rule, openAdd, openEdit, save, toggleSale, PRODUCT_CATS, PRODUCT_STS, store, fmtY, fmtC };
  },
  template: `<div>
    <list-page :crumbs="['产品管理','产品目录']" title="产品目录" :stats="stats" :filters="filters" :rows="rows" :cols="cols" :action-width="170"
      @link="(c,row) => $go('/product/'+row.no)">
      <template #ops><el-button type="primary" icon="Plus" @click="openAdd">新增产品</el-button><el-button icon="Tickets" @click="$go('/pricebooks')">价格表管理</el-button><el-button icon="Upload" @click="$msg.info('示例：导入产品')">导入</el-button></template>
      <template #actions="{row,open}">
        <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button link type="primary" @click="$go('/product/'+row.no)">详情</el-button>
        <el-button v-if="row.status==='在售'" link type="danger" @click="toggleSale(row)">停售</el-button>
        <el-button v-else link type="success" @click="toggleSale(row)">恢复</el-button>
      </template>
    </list-page>
    <el-dialog v-model="dlg.open" :title="dlg.edit ? '编辑产品 · ' + (dlg.edit.name||'') : '新增产品'" width="560px">
      <el-form ref="fref" :model="f" :rules="rule" label-width="96px">
        <el-form-item label="产品名称" prop="name"><el-input v-model="f.name"/></el-form-item>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="产品分类" prop="cat"><el-select v-model="f.cat" style="width:100%"><el-option v-for="x in PRODUCT_CATS" :key="x" :label="x" :value="x"/></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="产品状态"><el-select v-model="f.status" style="width:100%"><el-option v-for="x in PRODUCT_STS" :key="x" :label="x" :value="x"/></el-select></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="产品规格"><el-input v-model="f.spec" placeholder="如 50 用户 · 年付"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="标准单位"><el-input v-model="f.unit" placeholder="如 套 / 人天 / 年"/></el-form-item></el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="标准售价" prop="price"><el-input-number v-model="f.price" :min="0.01" :step="100" :controls="false" style="width:100%" placeholder="元"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="成本价" prop="cost"><el-input-number v-model="f.cost" :min="0" :step="100" :controls="false" style="width:100%" placeholder="元"/></el-form-item></el-col>
        </el-row>
        <el-form-item label="产品说明"><el-input type="textarea" :rows="2" v-model="f.desc"/></el-form-item>
      </el-form>
      <el-alert type="info" show-icon :closable="false" :title="'保存后写入产品目录；新增产品会自动同步到全部 ' + store.ext.pricebooks.length + ' 张价格表'"/>
      <template #footer><el-button @click="dlg.open=false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </div>`,
};
registerRoute('/products', ProductsPage, 'products');

/* ----- 产品详情：各价格表价格 + 引用产品的报价 ----- */
const ProductDetail = {
  components: { PageHead },
  props: { no: String },
  setup(props) {
    const p = computed(() => store.ext.products.find(x => x.no === props.no) || null);
    const bookRows = computed(() => !p.value ? [] : store.ext.pricebooks.map(b => {
      const it = b.items.find(i => i.productNo === p.value.no) || {};
      const price = it.price == null ? (p.value.price || 0) : it.price;
      return { no: b.no, name: b.name, type: b.type, status: b.status, price, minDiscount: it.minDiscount == null ? 85 : it.minDiscount, ratio: p.value.price ? Math.round(price * 100 / p.value.price) : 100 };
    }));
    const quoteRows = computed(() => !p.value ? [] : store.ext.quotes.filter(q => (q.items || []).some(it => it.productNo === props.no)).map(q => {
      const it = (q.items || []).find(x => x.productNo === props.no);
      return { no: q.no, customer: q.customer, date: q.date, appr: q.appr, qty: it.qty, unit: it.unit, price: it.price, discount: it.discount };
    }));
    const appBooks = computed(() => !p.value ? '' : store.ext.pricebooks.filter(b => b.items.some(i => i.productNo === p.value.no)).map(b => b.name).join('、'));
    const QuoteTag = { 已通过: 'success', 审批中: 'warning', 草稿: 'info', 已驳回: 'danger' };
    return { p, bookRows, quoteRows, appBooks, QuoteTag, PRODUCT_STATUS_TAG, fmtY, fmtC, store };
  },
  template: `<div v-if="p">
    <el-breadcrumb separator="/" class="crumb"><el-breadcrumb-item><a @click="$go('/products')">产品管理</a></el-breadcrumb-item><el-breadcrumb-item><a @click="$go('/products')">产品目录</a></el-breadcrumb-item><el-breadcrumb-item>{{ p.name }}</el-breadcrumb-item></el-breadcrumb>
    <div class="card cust-head">
      <div class="cust-logo" style="border-radius:12px;font-size:20px">{{ p.cat }}</div>
      <div>
        <h2>{{ p.name }}<el-tag :type="PRODUCT_STATUS_TAG[p.status]" size="small">{{ p.status }}</el-tag><el-tag type="info" size="small" effect="plain">{{ p.cat }}</el-tag></h2>
        <div class="cust-meta"><span>产品编号：<b>{{ p.no }}</b></span><span>规格：<b>{{ p.spec || '-' }}</b></span><span>标准单位：<b>{{ p.unit }}</b></span><span>适用价格表：<b>{{ appBooks || '-' }}</b></span></div>
        <div style="margin-top:8px"><el-button size="small" type="primary" plain @click="$go('/pricebooks')">价格表管理</el-button></div>
      </div>
      <div class="sum-cards"><div class="sum-card"><div class="v">¥{{ fmtY(p.price) }}</div><div class="l">标准售价</div></div><div class="sum-card"><div class="v">¥{{ fmtY(p.cost) }}</div><div class="l">成本价</div></div><div class="sum-card"><div class="v">{{ quoteRows.length }}</div><div class="l">引用报价数</div></div></div>
    </div>
    <div class="card card-pad" style="margin-bottom:14px"><div class="card-title">各价格表中的价格</div>
      <el-table :data="bookRows" border size="small">
        <el-table-column prop="name" label="价格表" min-width="140"/><el-table-column prop="type" label="类型" width="120"/><el-table-column prop="status" label="状态" width="90"/>
        <el-table-column label="价格" width="130" align="right"><template #default="{row}"><span class="money">¥{{ fmtY(row.price) }}</span></template></el-table-column>
        <el-table-column label="相对标准价" width="110" align="center"><template #default="{row}">{{ row.ratio }}%</template></el-table-column>
        <el-table-column label="最低折扣" width="100" align="center"><template #default="{row}">{{ row.minDiscount }}%</template></el-table-column>
      </el-table>
      <div class="muted" style="font-size:12px;margin-top:8px">报价时按客户命中的价格表取价，折扣不得低于该表的最低折扣。</div>
    </div>
    <div class="card card-pad"><div class="card-title">使用该产品的报价（{{ quoteRows.length }} 份）</div>
      <el-table v-if="quoteRows.length" :data="quoteRows" size="small">
        <el-table-column prop="no" label="报价编号" width="150"><template #default="{row}"><a class="link" @click="$go('/quote/'+row.no)">{{ row.no }}</a></template></el-table-column>
        <el-table-column prop="customer" label="客户" min-width="190" show-overflow-tooltip><template #default="{row}"><a class="link" @click="$go('/customer/'+$cno(row.customer))">{{ row.customer }}</a></template></el-table-column>
        <el-table-column label="报价数量" width="110" align="right"><template #default="{row}">{{ row.qty }} {{ row.unit }}</template></el-table-column>
        <el-table-column label="单价" width="110" align="right"><template #default="{row}"><span class="money">¥{{ fmtY(row.price) }}</span></template></el-table-column>
        <el-table-column label="折扣" width="90" align="center"><template #default="{row}">{{ row.discount }}%</template></el-table-column>
        <el-table-column prop="date" label="报价日期" width="110"/><el-table-column label="审批状态" width="100"><template #default="{row}"><el-tag size="small" :type="QuoteTag[row.appr]||'info'">{{ row.appr }}</el-tag></template></el-table-column>
      </el-table>
      <el-empty v-else description="暂无报价使用该产品" :image-size="60"/>
    </div>
  </div>
  <div v-else class="card card-pad" style="text-align:center;padding:70px 40px"><el-empty description="未找到该产品"><el-button type="primary" @click="$go('/products')">返回产品目录</el-button></el-empty></div>`,
};
registerRoute('/product/:no', ProductDetail, 'product-detail');

/* ----- 价格表：列表 + 详情抽屉（明细可编辑价格 / 最低折扣） ----- */
const PricebooksPage = {
  components: { PageHead },
  setup() {
    const rows = computed(() => store.ext.pricebooks.map(b => ({
      ...b, n: b.items.length, total: b.items.reduce((s, i) => s + i.price, 0),
    })));
    const drawer = ref(false); const curNo = ref('');
    const cur = computed(() => store.ext.pricebooks.find(b => b.no === curNo.value) || null);
    const items = computed(() => !cur.value ? [] : cur.value.items.map(it => ({ it, pname: (store.ext.products.find(x => x.no === it.productNo) || {}).name || '-', std: (store.ext.products.find(x => x.no === it.productNo) || { price: 0 }).price, ratio: (store.ext.products.find(x => x.no === it.productNo) || { price: 0 }).price ? Math.round(it.price * 100 / (store.ext.products.find(x => x.no === it.productNo) || { price: 0 }).price) : 100, outRange: it.minDiscount < 50 || it.minDiscount > 100 })));
    const open = row => { curNo.value = row.no; drawer.value = true; dirty.value = false; };
    const dirty = ref(false);
    const saveAll = () => { dirty.value = false; ElMessage.success('价格表「' + (cur.value || {}).name + '」已保存：价格与最低折扣已写回（操作留痕）'); store.ext.logs.unshift({ time: TODAY + ' 09:00', who: '张三', module: '系统', act: '编辑', detail: `价格表「${(cur.value || {}).name}」明细价格/最低折扣变更` }); };
    return { rows, drawer, curNo, cur, items, open, dirty, saveAll, store, fmtY };
  },
  template: `<div>
    <el-breadcrumb separator="/" class="crumb"><el-breadcrumb-item><a @click="$go('/products')">产品管理</a></el-breadcrumb-item><el-breadcrumb-item>价格表</el-breadcrumb-item></el-breadcrumb>
    <div class="page-head"><h1>价格表</h1><span class="total">共 {{ rows.length }} 张 · 覆盖 {{ store.ext.products.length }} 个产品</span>
      <div class="head-ops"><el-button icon="Download" @click="$msg.info('示例：导出价格表')">导出</el-button></div></div>
    <div class="card table-card">
      <el-table :data="rows" style="width:100%">
        <el-table-column prop="no" label="编号" width="110"/><el-table-column prop="name" label="价格表名称" min-width="160" />
        <el-table-column prop="type" label="价格类型" width="120"/><el-table-column prop="validFrom" label="有效期起" width="110"/><el-table-column prop="validTo" label="有效期止" width="110"/>
        <el-table-column label="状态" width="90"><template #default="{row}"><el-tag size="small" :type="row.status==='启用'?'success':'info'">{{ row.status }}</el-tag></template></el-table-column>
        <el-table-column prop="n" label="明细数" width="90" align="center"/>
        <el-table-column label="明细总价" width="130" align="right"><template #default="{row}"><span class="money">¥{{ fmtY(row.total) }}</span></template></el-table-column>
        <el-table-column label="操作" width="140" fixed="right"><template #default="{row}"><el-button link type="primary" @click="open(row)">查看明细</el-button><el-button link type="primary" @click="$msg.info('示例：新增价格表')">复制</el-button></template></el-table-column>
      </el-table>
    </div>
    <el-drawer v-model="drawer" :title="'价格表明细 · ' + (cur ? cur.name + '（' + cur.no + '）' : '')" size="620px" destroy-on-close>
      <el-alert type="info" show-icon :closable="false" style="margin-bottom:12px" title="可直接编辑价格与最低折扣（折扣范围 50–100%），点击底部「保存修改」写回数据。"/>
      <el-descriptions v-if="cur" :column="2" border size="small" style="margin-bottom:12px">
        <el-descriptions-item label="价格类型">{{ cur.type }}</el-descriptions-item><el-descriptions-item label="状态">{{ cur.status }}</el-descriptions-item>
        <el-descriptions-item label="有效期">{{ cur.validFrom }} ~ {{ cur.validTo }}</el-descriptions-item><el-descriptions-item label="适用对象">{{ cur.type==='标准价' ? '全部客户' : cur.type==='重点客户价' ? '重点 / 战略客户' : '渠道客户' }}</el-descriptions-item>
      </el-descriptions>
      <el-table :data="items" size="small" border>
        <el-table-column prop="productNo" label="产品编号" width="90"><template #default="{row}">{{ row.it.productNo }}</template></el-table-column><el-table-column prop="pname" label="产品名称" min-width="150" show-overflow-tooltip/>
        <el-table-column label="价格" width="150" align="right"><template #default="{row}"><el-input-number v-model="row.it.price" :min="0.01" :step="100" size="small" controls-position="right" style="width:120px" @change="dirty=true"/></template></el-table-column>
        <el-table-column label="相对标准价" width="100" align="center"><template #default="{row}">{{ row.ratio }}%</template></el-table-column>
        <el-table-column label="最低折扣" width="150" align="right"><template #default="{row}"><el-input-number v-model="row.it.minDiscount" :min="50" :max="100" size="small" controls-position="right" style="width:110px" @change="dirty=true"/></template></el-table-column>
      </el-table>
      <div style="margin-top:14px;display:flex;gap:10px"><el-button type="primary" :disabled="!dirty" @click="saveAll">保存修改</el-button><el-button :disabled="!dirty" @click="dirty=false; open({no:curNo})">放弃修改</el-button><span class="grow muted" style="font-size:12px;align-self:center">价格与折扣直接写回该价格表明细</span></div>
    </el-drawer>
  </div>`,
};
registerRoute('/pricebooks', PricebooksPage, 'pricebooks');
