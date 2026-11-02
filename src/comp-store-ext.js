/* ===== 第 1 阶段：扩展数据层接入 store（在 comp-common.js 之后加载） ===== */
store.customers.push(...extraCustomers(29));
store.leads.push(...extraLeads());
store.opps.push(...extraOpps());
store.ext = reactive(buildExt(store.customers, store.leads, store.opps));

/* 5.14 销售总览口径：商机补 created（创建日期），用于平均成交周期 = 赢单日期 − 创建日期（确定性派生） */
store.opps.forEach(o => { if (!o.created && o.date) o.created = extAddDays(o.date, -(15 + extRint(extRng(extHash(o.no + '|cd')), 5, 45))); });

/* 全局便捷函数：computed 友好（纯函数，返回该客户 360 视图的全部数据） */
const custBundle = name => customerBundle(store.ext, name, store.opps);
