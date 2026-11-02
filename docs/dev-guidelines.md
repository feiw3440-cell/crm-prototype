# CRM 原型项目开发约定（所有界面文字必须是中文）

技术栈：Vue 3（全局构建，非 SFC）+ Element Plus + ECharts，库在 lib/ 下用相对路径，必须离线可用（不能引用 CDN）。
源码在 src/，`node build.js` 把 src/*.js 按顺序拼成单文件 index.html。**不要手改 index.html。**
所有代码是同一个全局作用域（没有 import/export），顶层 `const` 名字不能重复，新文件的全局名要带前缀避免冲突。

## 文件顺序（build.js 规则）
data.js → data-*.js（字母序）→ comp-common.js → comp-*.js（字母序）→ page-*.js（字母序）→ app.js。
新增 data-*.js / comp-*.js / page-*.js 会被 build.js 自动收录，不用改 build.js。

## 已有的全局对象（先读 src/comp-common.js、src/app.js、src/data.js）
- `store`（reactive 数据仓库）、`go(path)`（改 hash 跳转）、`PageHead`、`EChart`、`ListPage`（通用列表：筛选 + 表格 + 分页 + 抽屉）、`NAV`（左侧菜单）。
- `ElMessage / ElMessageBox / ElNotification`，Vue 的 `ref reactive computed watch onMounted ...` 已解构为全局。
- 金额：data.js 里 `fmtY/yuan/fmtC`。

## 路由注册表（由 comp-common.js 提供）
```js
registerRoute('/contract/:no', ContractDetail, 'contract-detail');       // 路径模式, 组件, 文档key
registerRoute('/contracts', ContractsPage, 'contracts', params => ({}));  // 第4个参数可选：把路径参数转成组件 props
```
- `:name` 段会作为 props 传给组件（默认 `{ ...params }`，同时组件被加 key=当前路径，路由变化会重建）。
- **每个路由都必须有 docKey**（见下面需求文档面板），多个 tab 路由可以共用同一个 docKey。
- 新页面文件末尾自己 registerRoute，不要往 app.js 的 switch 里加。

## 需求文档说明面板（DocPanel，comp-docs.js）
- 每个页面（PC 路由和手机端每个屏）都有一份文档，按 docKey 取。默认内容放在 `DOCS_DEFAULT[docKey]`，结构由 `mkDoc({...})` 生成（见 data-docs.js）。
- 固定 12 个要素（顺序不变）：页面名称与所属模块、页面目标、使用角色与权限（菜单/按钮/数据/字段）、入口与跳转、页面布局与元素、字段说明（表格：字段/类型/必填/校验/说明）、交互与操作规则、业务规则与状态流转、异常与边界场景、关联数据与接口、验收标准、版本与变更记录。
- 面板三种状态：隐藏（右侧边缘只剩一个小浮标 `.doc-fab`）、半隐藏（右侧窄条 `.doc-panel.half`，显示页面名称+页面目标+验收标准摘要）、完全展开（`.doc-panel.full`，宽约 520px，覆盖在页面右侧，不挤压主区域）。状态存 localStorage。
- 手机端预览页里，切换手机内的屏时，通过 `docState.override = 'm-xxx'` 切换文档；离开页面清空。
- 每个要素下是可增删改的条目：新增 / 编辑 / 删除；顶部关键词搜索（过滤并高亮条目）；修改存 localStorage（key `crm_docs_v1`）；导出 JSON / 导入 JSON / 恢复默认（单页恢复和全部恢复）。

## 主题（themes）
主题切换在顶部栏：粉 / 天蓝 / 白 / 灰。靠 `<html data-theme="pink|sky|white|gray">` + CSS 变量实现，选择存 localStorage（key `crm_theme`）。
样式里**不要写死颜色**，用变量：`--el-color-primary` 系列、`--navy/--navy2`（侧栏背景）、`--bg`（页面背景）、`--card`（卡片背景）、`--line`、`--text`、`--sub`、`--sidebar-text` 等。手机框也必须用这些变量，主题切换后手机端自动跟随。

## 数据与列表
- 列表必须是**真分页**：行数据要足够多（≥ 25 行，用生成函数产生），`ListPage` 按 page/size 切片，total 取过滤后的真实条数；不要再写死“共 1,268 条”这类假数字，统计卡数字由实际数据算出来。
- 每个客户（store.customers 里的每一个）的详情页必须使用该客户自己的数据（联系人、跟进、商机、报价、合同、订单、回款、关系图），不能共用南京某某科技的数据。

## 验证
- `node tests/smoke.js [路由...]`（需要 playwright-core 可被 require，可用 NODE_PATH 指向其 node_modules） 用无头 Chrome 打开路由，检查控制台无 error/warning、页面有内容、文档面板存在。tests/routes.json 是全量路由清单，新页面的路由要追加进去。
- 改完必须 `node build.js` 并跑 `tests/all.sh`；报错就修，直到输出 `ALL TESTS PASSED`。

## 规划方案（最高优先级依据）
完整规划方案文本：`spec/crm-plan.txt`（16 章）。页面字段、状态流转、业务规则、验收标准、手机端内容与规划方案冲突时，以规划方案为准。
需求文档（DOCS_DEFAULT）：PC 的在 src/page-zz-docs-pc.js（以及各 page-*.js 里的旧 DOCS_DEFAULT，后加载者覆盖），手机端的在 src/page-zz-docs-m.js 与 page-mscr-*.js；改文档时优先改 page-zz-docs-*.js 里对应 docKey 的 mkDoc，没有就在那里新增覆盖。
变更记录：每做完一个对齐任务，在 SPEC-ALIGN.md 末尾追加一节（按页面：改了什么/为什么，引用规划方案的章节号）。
