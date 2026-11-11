const RECORD_VIEWS = new Set(['diet', 'weight', 'training', 'calendar']);

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function isRecordsOverviewRoute(host, root) {
    const raw = String(host?.location?.hash || '')
        .replace(/^#/, '')
        .replace(/^!/, '')
        .replace(/^\/?/, '');
    const [pathPart = '', queryPart = ''] = raw.split('?');
    const parts = pathPart.split('/').filter(Boolean);
    const query = new URLSearchParams(queryPart);
    const subview = (parts[0] === 'records' ? parts[1] : '') || query.get('view') || '';
    if (RECORD_VIEWS.has(subview)) {
        if (root?.dataset) root.dataset.v7RecordsMode = 'subview';
        return false;
    }
    if (root?.dataset?.v7RecordsMode === 'subview') {
        return false;
    }
    return true;
}

function resolveDayKey(value) {
    if (!value) return '';
    const s = String(value).trim();
    const dateOnly = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (dateOnly) return `${dateOnly[1]}-${dateOnly[2].padStart(2, '0')}-${dateOnly[3].padStart(2, '0')}`;
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
        if (d.getHours() < 4) d.setDate(d.getDate() - 1);
        return dayKey(d);
    }
    const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    return '';
}

function parseDay(value) {
    const k = resolveDayKey(value);
    if (!k) return null;
    const d = new Date(`${k}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
}

function dayKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function startOfWeek(date) {
    const next = new Date(date);
    const day = next.getDay() || 7;
    next.setDate(next.getDate() - day + 1);
    next.setHours(0, 0, 0, 0);
    return next;
}

function activeHistory(data) {
    const source = Array.isArray(data?.db?.history) ? data.db.history : [];
    const active = typeof data?.activeRecords === 'function' ? data.activeRecords(source) : source.filter((item) => item && !item.deleted);
    return active.filter((item) => parseDay(item?.dayKey || item?.date));
}

function durationSeconds(record) {
    const seconds = Number(record?.duration ?? record?.totalSec ?? 0);
    if (Number.isFinite(seconds) && seconds > 0) return seconds;
    const minutes = Number(record?.minutes ?? record?.durationMin ?? 0);
    return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 0;
}

function countSessions(items) {
    const sessionSet = new Set();
    let legacy = 0;
    items.forEach((item) => {
        if (item.sessionId) sessionSet.add(item.sessionId);
        else legacy += 1;
    });
    return sessionSet.size + legacy;
}

function periodStats(history, now, period = 'week') {
    let start;
    let end;
    let previousStart;
    let previousEnd;
    if (period === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        previousEnd = new Date(start.getTime() - 1);
    } else {
        start = startOfWeek(now);
        end = new Date(start);
        end.setDate(end.getDate() + 7);
        end.setTime(end.getTime() - 1);
        previousStart = new Date(start);
        previousStart.setDate(previousStart.getDate() - 7);
        previousEnd = new Date(start.getTime() - 1);
    }
    const recordTime = (item) => {
        if (!item) return 0;
        if (item.dayKey) {
            const pd = parseDay(item.dayKey);
            if (pd) return pd.getTime();
        }
        if (item.date) {
            const pd = parseDay(item.date);
            if (pd) return pd.getTime();
        }
        return 0;
    };
    const nowTime = now.getTime();
    const current = history.filter((item) => {
        const t = recordTime(item);
        return t && t >= start.getTime() && t <= Math.max(end.getTime(), nowTime);
    });
    const previous = history.filter((item) => {
        const t = recordTime(item);
        return t && t >= previousStart.getTime() && t <= previousEnd.getTime();
    });
    const currentSessions = countSessions(current);
    const previousSessions = countSessions(previous);
    const seconds = current.reduce((sum, item) => sum + durationSeconds(item), 0);
    const previousSeconds = previous.reduce((sum, item) => sum + durationSeconds(item), 0);
    return {
        count: currentSessions,
        actionCount: current.length,
        seconds,
        countDelta: currentSessions - previousSessions,
        secondsDelta: seconds - previousSeconds
    };
}

function streakStats(history, now) {
    const days = new Set(history.map((item) => item.dayKey || resolveDayKey(item.date)).filter(Boolean));
    let current = 0;
    let cursor = new Date(now);
    for (let i = 0; i < 366; i++) {
        const key = dayKey(cursor);
        if (!days.has(key)) {
            if (i === 0) {
                cursor.setDate(cursor.getDate() - 1);
                continue;
            }
            break;
        }
        current += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    const sorted = [...days].sort();
    let longest = 0;
    let run = 0;
    let previous = null;
    sorted.forEach((key) => {
        const date = parseDay(key);
        if (!date) return;
        if (previous && Math.round((date.getTime() - previous.getTime()) / 86400000) === 1) run += 1;
        else run = 1;
        longest = Math.max(longest, run);
        previous = date;
    });
    return { current, longest };
}

function dailyLoadPoints(history, now, count = 7) {
    const totals = new Map();
    history.forEach((item) => {
        const key = item.dayKey || resolveDayKey(item.date);
        if (!key) return;
        totals.set(key, (totals.get(key) || 0) + durationSeconds(item) / 60);
    });
    const points = [];
    for (let i = count - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        points.push({ date, value: totals.get(dayKey(date)) || 0 });
    }
    return points;
}

function trendSvg(points) {
    const width = 320;
    const height = 82;
    const base = 67;
    const max = Math.max(1, ...points.map((point) => point.value));
    const coords = points.map((point, index) => {
        const x = 4 + (312 * index) / Math.max(1, points.length - 1);
        const y = base - (point.value / max) * 48;
        return [x, y];
    });
    const line = coords.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    const area = `${line} L${coords[coords.length - 1][0].toFixed(1)} ${base} L${coords[0][0].toFixed(1)} ${base} Z`;
    return `<svg class="v7-records-trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="最近训练负荷趋势"><g class="v7-records-trend-grid"><line x1="4" y1="18" x2="316" y2="18"></line><line x1="4" y1="42" x2="316" y2="42"></line><line x1="4" y1="66" x2="316" y2="66"></line></g><path class="v7-records-trend-area" d="${area}"></path><path class="v7-records-trend-line" d="${line}"></path>${coords.map(([x, y], index) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" class="${points[index].value ? '' : 'is-zero'}"></circle>`).join('')}</svg>`;
}

function weekdayLabel(date) {
    return ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
}

function twoWeekCalendar(history, now) {
    const activeDays = new Set(history.map((item) => item.dayKey || resolveDayKey(item.date)).filter(Boolean));
    const weekStart = startOfWeek(now);
    const start = new Date(weekStart);
    start.setDate(start.getDate() - 7);
    const days = [];
    for (let i = 0; i < 14; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const key = dayKey(date);
        days.push(`<span class="${key === dayKey(now) ? 'is-today' : ''} ${activeDays.has(key) ? 'has-record' : ''}" title="${key}">${date.getDate()}</span>`);
    }
    return `<div class="v7-records-calendar-weekdays">${['一','二','三','四','五','六','日'].map((label) => `<b>${label}</b>`).join('')}</div><div class="v7-records-calendar-days">${days.join('')}</div>`;
}

function recentRows(data, history, now, limit = 2) {
    const sorted = [...history].sort((a, b) => (parseDay(b.date)?.getTime() || 0) - (parseDay(a.date)?.getTime() || 0)).slice(0, limit);
    if (!sorted.length) return '<div class="v7-records-empty">完成一次训练后，这里会显示最近记录</div>';
    return sorted.map((item, index) => {
        const names = typeof data?.historyNames === 'function' ? data.historyNames(item) : [];
        const title = names?.[0] || (item.type === 'cardio' ? '有氧训练' : '训练记录');
        const mins = Math.max(0, Math.round(durationSeconds(item) / 60));
        const date = parseDay(item.date);
        const daysAgo = date ? Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000) : null;
        const dayText = daysAgo === 0 ? '今天' : daysAgo === 1 ? '昨天' : escapeHtml(item.date || '');
        return `<div class="v7-records-recent-row"><span class="v7-records-recent-icon ${index ? 'is-secondary' : ''}">${index ? '•' : '✓'}</span><span><b>${escapeHtml(title)}</b><small>${mins ? `${mins} 分钟 · ` : ''}${dayText}</small></span></div>`;
    }).join('');
}

function renderRecordsOverview(root, data, host) {
    let shell = root.querySelector('.v7-records-overview-shell');
    if (!shell) {
        shell = root.ownerDocument.createElement('div');
        shell.className = 'v7-records-overview-shell';
        root.querySelector('#recordsOverview')?.before(shell);
    }
    const history = activeHistory(data);
    const todayKey = data?.logicalDateKey?.() || dayKey(new Date());
    const now = parseDay(todayKey) || new Date();
    const period = root.dataset.v7RecordsPeriod === 'month' ? 'month' : 'week';
    const stats = periodStats(history, now, period);
    const streak = streakStats(history, now);
    const points = dailyLoadPoints(history, now, 7);
    const hours = stats.seconds / 3600;
    const durationDeltaHours = stats.secondsDelta / 3600;
    const countDelta = `${stats.countDelta > 0 ? '+' : ''}${stats.countDelta}`;
    const durationDelta = `${durationDeltaHours > 0 ? '+' : ''}${durationDeltaHours.toFixed(1)}h`;
    const signature = JSON.stringify([period, todayKey, history.map((item) => [item.id, item.date, item.duration, item.updatedAt, item.deleted])]);
    if (shell.dataset.v7Signature !== signature) {
        shell.dataset.v7Signature = signature;
        shell.innerHTML = `<nav class="v7-records-subnav" aria-label="记录子视图"><button type="button" class="is-active" data-v7-records-overview-link="true" aria-current="page">总览</button><button type="button" data-v7-records-view="diet">饮食</button><button type="button" data-v7-records-view="weight">体重</button><button type="button" data-v7-records-view="training">健康</button><button type="button" data-v7-records-view="calendar">日历</button></nav><section class="v7-records-summary"><span><small>训练次数</small><b>${stats.count}</b><em>次</em><i class="${stats.countDelta < 0 ? 'is-negative' : ''}">${period === 'week' ? '比上周' : '比上月'} ${countDelta}</i></span><span><small>训练时长</small><b>${hours.toFixed(1)}</b><em>小时</em><i class="${stats.secondsDelta < 0 ? 'is-negative' : ''}">${durationDelta}</i></span><span><small>连续天数</small><b>${streak.current}</b><em>天</em><i>最长 ${streak.longest} 天</i></span></section><section class="v7-records-trend-card"><div class="v7-records-card-head"><b>训练负荷趋势</b><span>近 7 天</span></div>${trendSvg(points)}<div class="v7-records-trend-labels">${points.map((point) => `<span class="${dayKey(point.date) === dayKey(now) ? 'is-current' : ''}">${weekdayLabel(point.date)}</span>`).join('')}</div></section><section class="v7-records-calendar-card"><div class="v7-records-card-head"><b>本月活动</b><button type="button" data-v7-records-view="calendar">查看日历</button></div>${twoWeekCalendar(history, now)}</section><section class="v7-records-recent-section"><div class="v7-records-section-head"><b>最近记录</b><button type="button" data-v7-records-view="training">查看全部</button></div><div class="v7-records-recent-card">${recentRows(data, history, now, 2)}</div></section>`;
    }

    let periodButton = root.querySelector('.v7-records-period-button');
    if (!periodButton) {
        periodButton = root.ownerDocument.createElement('button');
        periodButton.type = 'button';
        periodButton.className = 'v7-records-period-button';
        periodButton.dataset.v7RecordsPeriodToggle = 'true';
        root.querySelector('.md-top-app-bar')?.append(periodButton);
    }
    periodButton.textContent = period === 'week' ? '本周⌄' : '本月⌄';
    periodButton.hidden = false;
    const title = root.querySelector('.md-top-app-bar .app-title');
    if (title) title.textContent = '训练记录';
}

function syncRecordsRouteUi(root, data, host) {
    if (!root?.querySelector || !root?.ownerDocument?.createElement) return;
    const overview = isRecordsOverviewRoute(host, root);
    root.dataset.v7RecordsOverview = String(overview);
    const title = root.querySelector('.md-top-app-bar .app-title');
    const periodButton = root.querySelector('.v7-records-period-button');
    let overviewLink = root.querySelector('.v7-records-overview-link');
    if (overview) {
        overviewLink?.remove();
        renderRecordsOverview(root, data, host);
        return;
    }
    if (periodButton) periodButton.hidden = true;
    const labels = { diet: '饮食记录', weight: '体重记录', training: '训练记录', calendar: '记录日历' };
    if (title) title.textContent = labels[resolveRecordsView(data)] || '记录';
    if (!overviewLink) {
        overviewLink = root.ownerDocument.createElement('button');
        overviewLink.type = 'button';
        overviewLink.className = 'v7-records-overview-link';
        overviewLink.textContent = '总览';
        overviewLink.dataset.v7RecordsOverviewLink = 'true';
        root.querySelector('.md-top-app-bar')?.append(overviewLink);
    }
}

export function resolveRecordsView(data) {
    const view = String(data?.healthView || 'diet');
    return RECORD_VIEWS.has(view) ? view : 'diet';
}

function enhanceRecords(root, data, host = root?.ownerDocument?.defaultView || globalThis) {
    const view = resolveRecordsView(data);
    root.classList.add('v7-feature-records');
    root.dataset.v7RecordsView = view;
    syncRecordsRouteUi(root, data, host);

    root.querySelectorAll('.record-tabs').forEach((element) => element.classList.add('v7-records-segmented'));
    root.querySelectorAll('.record-tab').forEach((element) => element.classList.add('v7-records-segment'));
    root.querySelectorAll([
        '.stat-tile',
        '.md-card',
        '.weight-chart-wrap',
        '.list-item',
        '.day-detail-item',
        '.weight-list-item',
        '.empty-state'
    ].join(',')).forEach((element) => element.classList.add('v7-records-surface'));

    if (view === 'weight') data?.scheduleWeightChartPinchBinding?.();
    return view;
}

function clearEnhancements(root) {
    root.classList.remove('v7-page-mounted', 'v7-feature-records');
    delete root.dataset.v7RecordsView;
    delete root.dataset.v7RecordsOverview;
    delete root.dataset.v7RecordsMode;
    delete root.dataset.v7RecordsPeriod;
    if (root.querySelector) {
        root.querySelector('.v7-records-overview-shell')?.remove();
        root.querySelector('.v7-records-period-button')?.remove();
        root.querySelector('.v7-records-overview-link')?.remove();
    }
    root.querySelectorAll('.v7-records-segmented').forEach((element) => element.classList.remove('v7-records-segmented'));
    root.querySelectorAll('.v7-records-segment').forEach((element) => element.classList.remove('v7-records-segment'));
    root.querySelectorAll('.v7-records-surface').forEach((element) => element.classList.remove('v7-records-surface'));
}

function cancelRecordsChartRuntime(data, root, host) {
    const cancel = host.cancelAnimationFrame || host.clearTimeout;
    if (data?._weightChartBindFrame) cancel?.call(host, data._weightChartBindFrame);
    if (data?._weightChartPinch?.frame) cancel?.call(host, data._weightChartPinch.frame);
    if (data) data._weightChartBindFrame = 0;
    host.clearTimeout?.(data?._weightTipTimer);
    if (data) data._weightTipTimer = 0;
    data?.clearWeightChartPinch?.();
    root.querySelectorAll('.weight-chart-wrap[data-pinch-chart]').forEach((wrap) => {
        wrap._p?.forEach?.(([type, handler]) => wrap.removeEventListener(type, handler));
        delete wrap._p;
        delete wrap._b;
    });
}

export { periodStats, resolveDayKey, parseDay, streakStats };
export const recordsFeature = Object.freeze({
    id: 'records',
    mount({ context, scope }) {
        const root = context.document?.getElementById?.('records');
        if (!root) throw new Error('V7 Records root missing');
        const host = context.document?.defaultView || globalThis;
        const data = context.legacy?.getData?.() || host.data;
        const requestFrame = host.requestAnimationFrame || ((callback) => host.setTimeout?.(callback, 16));
        const cancelFrame = host.cancelAnimationFrame || host.clearTimeout;
        let enhanceFrame = 0;

        root.classList.add('v7-page-shell', 'v7-page-mounted');
        root.dataset.v7Feature = 'records';
        root.dataset.v7Mounted = 'true';
        if (data) {
            data.periodStats = periodStats;
            data.resolveDayKey = resolveDayKey;
        }
        data?.ensureHealthViewCss?.(resolveRecordsView(data));
        data?.renderRecordsPage?.();

        const scheduleEnhance = () => {
            if (enhanceFrame || scope.disposed) return;
            enhanceFrame = requestFrame.call(host, () => {
                enhanceFrame = 0;
                if (!scope.disposed) enhanceRecords(root, data, host);
            });
        };
        enhanceRecords(root, data, host);
        scope.listen(root, 'click', (event) => {
            const periodToggle = event.target?.closest?.('[data-v7-records-period-toggle]');
            if (periodToggle && root.contains(periodToggle)) {
                root.dataset.v7RecordsPeriod = root.dataset.v7RecordsPeriod === 'month' ? 'week' : 'month';
                renderRecordsOverview(root, data, host);
                return;
            }
            const overviewLink = event.target?.closest?.('[data-v7-records-overview-link]');
            if (overviewLink && root.contains(overviewLink)) {
                root.dataset.v7RecordsMode = 'overview';
                root.dataset.v7RecordsOverview = 'true';
                if (host?.location && host.location.hash !== '#/records') {
                    host.location.hash = '#/records';
                }
                enhanceRecords(root, data, host);
                return;
            }
            const viewButton = event.target?.closest?.('[data-v7-records-view], [data-health-view]');
            if (viewButton && root.contains(viewButton)) {
                const next = viewButton.dataset.v7RecordsView || viewButton.dataset.healthView;
                if (RECORD_VIEWS.has(next)) {
                    root.dataset.v7RecordsMode = 'subview';
                    root.dataset.v7RecordsOverview = 'false';
                    if (viewButton.dataset.v7RecordsView) {
                        data?.scrollToHealthView?.(next);
                    }
                    if (host?.location && host.location.hash !== `#/records/${next}`) {
                        host.location.hash = `#/records/${next}`;
                    }
                    enhanceRecords(root, data, host);
                }
                return;
            }
            scheduleEnhance();
        });
        if (typeof host?.addEventListener === 'function') scope.listen(host, 'hashchange', scheduleEnhance);

        const Observer = host.MutationObserver;
        if (Observer) {
            const observer = new Observer(scheduleEnhance);
            scope.observe(observer, root, { childList: true, subtree: true });
        }
        scope.add(() => {
            if (enhanceFrame) cancelFrame?.call(host, enhanceFrame);
            enhanceFrame = 0;
        });

        return () => {
            cancelRecordsChartRuntime(data, root, host);
            host.clearTimeout?.(data?._healthDeckScrollTimer);
            if (data) data._healthDeckScrollTimer = 0;
            clearEnhancements(root);
            root.dataset.v7Mounted = 'false';
        };
    },
    update({ context }) {
        const root = context.document?.getElementById?.('records');
        if (!root) return;
        const host = context.document?.defaultView || globalThis;
        enhanceRecords(root, context.legacy?.getData?.() || host.data, host);
    }
});
