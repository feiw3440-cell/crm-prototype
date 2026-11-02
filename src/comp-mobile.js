/* ===== 第 7 阶段：移动端框架（屏幕注册表 / 导航栈 / 通用组件） ===== */
const MSCREENS = {};
const registerMScreen = (key, comp, meta) => {
  meta = meta || {};
  MSCREENS[key] = { key, comp, title: meta.title || key, doc: meta.doc || ('m-' + key), tab: meta.tab || '' };
};

const mnav = reactive({ stack: [{ key: 'home', params: {} }], actions: [] });
const mcur = computed(() => mnav.stack[mnav.stack.length - 1] || { key: 'home', params: {} });
const mcurScreen = computed(() => MSCREENS[mcur.value.key] || MSCREENS.home || null);
const mgo = (key, params) => {
  if (!MSCREENS[key]) { ElMessage.warning('该功能将在后续阶段开放'); return false; }
  mnav.stack = [{ key, params: params || {} }];
  return true;
};
const mpush = (key, params) => {
  if (!MSCREENS[key]) { ElMessage.warning('该功能将在后续阶段开放'); return false; }
  mnav.stack.push({ key, params: params || {} });
  return true;
};
const mback = () => {
  if (mnav.stack.length > 1) mnav.stack.pop();
  else mgo('home');
};
const mSetActions = arr => { mnav.actions.splice(0, mnav.actions.length, ...(arr || [])); };

const M_TABS = [
  { key: 'home', label: '首页', icon: 'HomeFilled', screen: 'home' },
  { key: 'cust', label: '客户', icon: 'OfficeBuilding', screen: 'customers' },
  { key: 'sched', label: '日程', icon: 'Calendar', screen: 'schedule' },
  { key: 'todo', label: '待办', icon: 'List', screen: 'todo' },
  { key: 'me', label: '我的', icon: 'User', screen: 'me' },
];

/* ---------- 通用小组件 ---------- */
const MCard = {
  props: { title: String, noPad: Boolean },
  template: `<div class="m-card" :class="{nopad:noPad}"><h4 v-if="title">{{ title }}</h4><slot/></div>`,
};
const MCell = {
  props: { label: String, value: [String, Number], icon: String, arrow: { type: Boolean, default: true } },
  emits: ['click'],
  template: `<div class="m-cell" @click="$emit('click')">
    <span v-if="icon" class="m-cell-ic"><el-icon><component :is="icon"/></el-icon></span>
    <span class="m-cell-lb">{{ label }}</span>
    <span class="m-cell-v"><slot>{{ value }}</slot></span>
    <el-icon v-if="arrow" class="m-cell-ar"><arrow-right/></el-icon>
  </div>`,
};
const MTag = {
  props: { type: String, text: String },
  template: `<span class="m-tag" :class="'t-' + (type || 'info')">{{ text }}<slot/></span>`,
};
const MSearch = {
  props: { modelValue: String, placeholder: { type: String, default: '搜索' } },
  emits: ['update:modelValue'],
  template: `<div class="m-search"><el-input :model-value="modelValue" :placeholder="placeholder" prefix-icon="Search" clearable @update:model-value="v => $emit('update:modelValue', v)"/></div>`,
};
const MEmpty = {
  props: { text: { type: String, default: '暂无数据' }, icon: { type: String, default: 'Box' } },
  template: `<div class="m-empty"><el-icon><component :is="icon"/></el-icon><span>{{ text }}</span></div>`,
};
const MForm = { template: `<div class="m-form"><slot/></div>` };
const MField = {
  props: { label: String, required: Boolean, hint: String },
  template: `<div class="m-field"><div class="m-field-lb">{{ label }}<i v-if="required">*</i></div><div class="m-field-ctl"><slot/><div v-if="hint" class="m-field-hint">{{ hint }}</div></div></div>`,
};
const MActionSheet = {
  props: { modelValue: Boolean, title: String, actions: { type: Array, default: () => [] } },
  emits: ['update:modelValue', 'select'],
  template: `<transition name="m-fade"><div v-if="modelValue" class="m-sheet-mask" @click.self="$emit('update:modelValue', false)">
    <div class="m-sheet"><div class="m-sheet-tt">{{ title }}</div>
      <div v-for="(a, i) in actions" :key="i" class="m-sheet-it" :class="{danger:a.danger}" @click="$emit('select', a); $emit('update:modelValue', false)">{{ a.label }}</div>
      <div class="m-sheet-cancel" @click="$emit('update:modelValue', false)">取消</div>
    </div></div></transition>`,
};

/* ---------- 手机内轻提示 ---------- */
const mToastState = reactive({ show: false, msg: '', type: 'info', timer: null });
const mToast = (msg, type) => {
  mToastState.msg = msg; mToastState.type = type || 'info'; mToastState.show = true;
  if (mToastState.timer) clearTimeout(mToastState.timer);
  mToastState.timer = setTimeout(() => { mToastState.show = false; }, 2200);
};
const MToastHost = {
  setup() { return { mToastState }; },
  template: `<transition name="m-fade"><div v-if="mToastState.show" class="m-toast" :class="'t-' + mToastState.type">{{ mToastState.msg }}</div></transition>`,
};

/* ---------- 手机外壳：状态栏 + 导航栏 + 屏幕容器 + 底部 tabbar ---------- */
const MobileApp = {
  components: { MToastHost },
  props: { syncDoc: Boolean, initialScreen: String },
  setup(props) {
    const screen = computed(() => MSCREENS[mcur.value.key] || MSCREENS.home || { title: 'CRM', tab: 'home', comp: { template: '<div/>' } });
    const curTab = computed(() => screen.value.tab || 'home');
    const title = computed(() => screen.value.title || 'CRM 移动端');
    const clock = ref('9:41');
    onMounted(() => {
      if (props.initialScreen) mgo(props.initialScreen);
      const tick = () => { const d = new Date(); clock.value = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
      tick();
    });
    watch(() => mcur.value.key, () => { mnav.actions.splice(0, mnav.actions.length); }, { flush: 'pre' });
    watch(() => screen.value.doc, d => { if (props.syncDoc) docState.override = d || ''; }, { immediate: true });
    onBeforeUnmount(() => { if (props.syncDoc) docState.override = ''; });
    const tabGo = k => { mgo(k); };
    return { mnav, mcur, screen, curTab, title, clock, M_TABS, mback, tabGo, mgo, mpush };
  },
  template: `<div class="m-app">
    <div class="m-status"><span>{{ clock }}</span><span>5G ▮▮▮ 86%</span></div>
    <div class="m-nav">
      <div class="m-nav-back" :class="{hide:mnav.stack.length<=1}" @click="mback"><el-icon><arrow-left/></el-icon></div>
      <div class="m-nav-title">{{ title }}</div>
      <div class="m-nav-right">
        <span v-for="(a, i) in mnav.actions" :key="i" class="m-nav-act" :title="a.title" @click="a.on && a.on()"><el-icon><component :is="a.icon"/></el-icon></span>
      </div>
    </div>
    <div class="m-body">
      <component :is="screen.comp" v-bind="mcur.params" :key="mnav.stack.length + '-' + mcur.key"/>
    </div>
    <div class="m-tabbar">
      <div v-for="t in M_TABS" :key="t.key" :class="{on:curTab===t.key}" @click="tabGo(t.screen)">
        <el-icon><component :is="t.icon"/></el-icon>{{ t.label }}
      </div>
    </div>
    <m-toast-host/>
  </div>`,
};

/* 浏览器窄屏直开 #/m 时使用：脱离 PC 外壳，全屏显示手机界面 */
const MobileStandalone = {
  components: { MobileApp },
  props: { screen: String },
  setup(props) {
    watch(() => props.screen, s => { mgo(s || 'home'); }, { immediate: true });
    return {};
  },
  template: `<div class="m-standalone"><mobile-app :sync-doc="false"/></div>`,
};
