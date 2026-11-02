#!/bin/bash
cd "$(dirname "$0")/.."
# 需要 playwright-core 可被 require（可用 NODE_PATH 指向其 node_modules），Chrome 路径可用 CHROME_PATH 覆盖
node build.js >/dev/null 2>&1 || { echo "BUILD FAILED"; node build.js; exit 1; }
rc=0
for t in tests/smoke.js tests/data-check.js tests/customers-all.js tests/mobile.js tests/theme-doc.js tests/doc-crud.js tests/flows.js tests/docs-check.js; do
  [ -f $t ] || continue
  out=$(timeout 600 node $t 2>&1); r=$?
  if [ $r -ne 0 ]; then echo "=== $t FAILED"; echo "$out" | grep -v "^ok" | head -60; rc=1; fi
done
[ $rc -eq 0 ] && echo "ALL TESTS PASSED"
exit $rc
