import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function loadHistoryView() {
  const code = readFileSync(new URL('../history-view.js', import.meta.url), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox);
  return sandbox.window.dataHistoryView;
}

test('manual plan history renders without a zero-second workout duration', () => {
  const api = loadHistoryView();
  const ctx = {
    activeRecords(list) { return list || []; },
    parseHistoryDate(value) { return new Date(value); },
    logicalDateKey() { return '2026-09-04'; },
    historyDayKey(entry) { return entry?.dayKey || '2026-09-04'; },
    historyNames(record) { return (record.actions || []).map((item) => item.name); },
    historyIcon(record) { return (record.actions || [])[0]?.name === '拉伸' ? 'self_improvement' : 'fitness_center'; },
    escapeHtml(value) { return String(value ?? ''); },
    isCollapsed() { return false; },
    db: {
      history: [{
        id: 'history-manual',
        date: '2026/9/4 08:00:00',
        dayKey: '2026-09-04',
        duration: 0,
        planManualDone: true,
        actions: [{ id: 'plan-run-task-1', name: '计划·基础臀桥' }]
      }]
    }
  };

  const html = api.renderHistoryList.call(ctx);

  assert.match(html, /手动完成/);
  assert.doesNotMatch(html, /0分0秒/);
});
