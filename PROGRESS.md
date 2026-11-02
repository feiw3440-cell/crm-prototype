# 进度（第二轮开发）

每个阶段的完成标准：先 `node build.js`，再跑 `tests/all.sh`，输出 `ALL TESTS PASSED` 后才算完成。开发约定见 [`docs/dev-guidelines.md`](./docs/dev-guidelines.md)。

- [x] c0 路由注册表 + 四套主题 + 需求文档面板
- [x] c1 数据层 data-ext.js / comp-store-ext.js
- [x] c2 真分页 + 线索详情/商机详情/客户详情各自数据
- [x] c3 联系人+关系图、客户合并、产品/价格表、报价列表
- [x] c4 合同、订单
- [x] c5 活动、交付、服务工单
- [x] c6 数据分析、系统管理、公海规则、审批模板/统计
- [x] c7 手机端框架 + 首页/客户/日程/待办/我的
- [x] c8 手机端其余屏（线索/商机/跟进/审批/回款/工单/通知）
- [x] c9-c11 各页面需求文档（c9a/c9b PC，c10a/c10b 手机）
- [x] 最终：全量验证、截图、同步到 GitHub Pages

## 规划方案对齐轮（SPEC-ALIGN）

每块：对照规划方案修改 → `tests/all.sh` → 修复 → 记入 [`SPEC-ALIGN.md`](./SPEC-ALIGN.md)。

- [x] s1 工作台/全局 - [x] s2 线索 - [x] s3 客户 - [x] s4 联系人 - [x] s5 商机 - [x] s6 产品报价 - [x] s7 合同订单
- [x] s8 回款 - [x] s9 活动/工单/交付 - [x] s10 分析/系统 - [x] s11 审批 - [x] m1 手机端A - [x] m2 手机端B
- [x] 最终：all.sh 通过、同步发布、确认线上可访问
