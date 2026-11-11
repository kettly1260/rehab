// @ts-nocheck
(function () {
    'use strict';

    function n0(v) { return +v || 0; }

    function taskSort(task) {
        const order = { 'in-progress': 0, todo: 1, done: 2, skipped: 3 };
        return order[task?.status] ?? 9;
    }

    function taskSpecText(task = {}) {
        const spec = task.spec || {};
        const reps = Number(spec.reps || 0);
        const work = Number(spec.work || 0);
        const main = reps > 0 ? `每组${reps}次` : work > 0 ? `每次${work}秒` : '参数不完整';
        const details = [
            Number(spec.repRest || 0) > 0 ? `次休${Number(spec.repRest || 0)}秒` : '',
            Number(spec.actionRest || 0) > 0 ? `组休${Number(spec.actionRest || 0)}秒` : '',
            spec.isAlt ? '双侧交替' : ''
        ].filter(Boolean);
        const category = task.category === 'warmup' ? '热身' : task.category === 'cooldown' ? '拉伸' : '主训练';
        return `${category} · ${Number(spec.sets || 1)}组 · ${main}${details.length ? ` · ${details.join(' · ')}` : ''}`;
    }

    function planTypeMeta(type = 'rehab', title = '') {
        const key = ['rehab', 'cut', 'bulk', 'maintenance', 'custom'].includes(type) ? type : 'rehab';
        const map = {
            rehab: { label: '康复计划', icon: 'self_improvement' },
            cut: { label: '减脂日程', icon: 'local_fire_department' },
            bulk: { label: '增肌日程', icon: 'fitness_center' },
            maintenance: { label: '综合训练', icon: 'health_and_safety' },
            custom: { label: title || '自定义计划', icon: 'event_note' }
        };
        return map[key];
    }

    function completionRate(plan = {}) {
        const items = (Array.isArray(plan.items) ? plan.items : [])
            .filter((item) => item && !item.deleted && item.category !== 'cooldown');
        if (!items.length) return { done: 0, total: 0, rate: 0 };
        const done = items.filter((item) => item.status === 'done').length;
        return { done, total: items.length, rate: done / items.length };
    }

    function aggregateCompletionRate(plans = []) {
        const list = Array.isArray(plans) ? plans : [];
        const rates = list.map((plan) => completionRate(plan));
        const done = rates.reduce((sum, item) => sum + Number(item.done || 0), 0);
        const total = rates.reduce((sum, item) => sum + Number(item.total || 0), 0);
        return { done, total, rate: total ? done / total : 0 };
    }

    function todayKey(ctx) {
        return ctx.logicalDateKey?.() || ctx.dateKey?.(new Date()) || '';
    }

    function activeList(ctx, list) {
        if (typeof ctx.activeRecords === 'function') return ctx.activeRecords(list);
        return (Array.isArray(list) ? list : []).filter((item) => item && !item.deleted);
    }

    function readTodayPlans(ctx, date = todayKey(ctx)) {
        const raw = ctx.db?.dailyPlans;
        return activeList(ctx, raw).filter((plan) => String(plan?.date || '') === String(date || ''));
    }

    function selectedPlan(ctx, plans) {
        return plans.find((item) => item.id === ctx.selectedPlanId) || plans[0] || null;
    }

    function latestPainFeedback(plans = []) {
        let score;
        let latestAt = -Infinity;
        for (const plan of plans) {
            for (const item of plan?.items || []) {
                const value = Number(item?.feedback?.painScore);
                if (!Number.isFinite(value)) continue;
                const at = Number(item?.feedback?.doneAt || item?.updatedAt || plan?.updatedAt || 0);
                if (at >= latestAt) {
                    score = value;
                    latestAt = at;
                }
            }
        }
        return score;
    }

    function ths(ctx, s) {
        if (s && typeof s === 'object') return s;
        if (ctx?._ths) return ctx._ths;
        const today = todayKey(ctx);
        s = window.healthSummaryPure?.summarizeToday?.(ctx.db, today, {
            historyDayKey: (r) => ctx.historyDayKey?.(r) || r?.dayKey || r?.date || ''
        });
        if (s) return s;
        const m = ctx.todayMacros?.() || {};
        const g = ctx.defaultDietGoals?.() || {};
        return {
            intake: n0(ctx.todayCalories?.()),
            macros: { pro: n0(m.pro), carb: n0(m.carb), fat: n0(m.fat) },
            goals: {
                cal: n0(g.cal || ctx.db?.health?.dietGoal?.dailyCal),
                pro: n0(g.pro),
                carb: n0(g.carb),
                fat: n0(g.fat)
            }
        };
    }

    window.dataTodayViewCore = {
        getTodayDailyPlans(date) {
            return readTodayPlans(this, date ?? todayKey(this));
        },

        completionRate(plan) {
            return completionRate(plan);
        },

        aggregateCompletionRate(plans) {
            return aggregateCompletionRate(plans == null ? this.getTodayDailyPlans?.() || [] : plans);
        },

        planTypeMeta(type, title) {
            return planTypeMeta(type, title);
        },

        renderPlanIntakeRing(summary) {
            summary = ths(this, summary);
            const m = summary.macros || {};
            const g = summary.goals || {};
            const intake = n0(summary.intake);
            const goalCal = n0(g.cal || this.db?.health?.dietGoal?.dailyCal);
            const displayPercent = goalCal ? Math.max(0, Math.round(intake / goalCal * 100)) : 0;
            const ringProgress = Math.min(100, displayPercent);
            if (!goalCal) {
                return '<div class="ring ring-diet"><span class="ring-motion-aura" aria-hidden="true"></span><div><b>--</b><small>饮食</small></div></div>';
            }
            const st = (v, t, b) => b + Math.min(120, this.ratio(n0(v), n0(t)) * 1.2);
            return `<div class="ring ring-diet" style="--progress:${ringProgress};--pro-stop:${st(m.pro, g.pro, 0)}deg;--carb-stop:${st(m.carb, g.carb, 120)}deg;--fat-stop:${st(m.fat, g.fat, 240)}deg"><span class="ring-motion-aura" aria-hidden="true"></span><div><b>${displayPercent}%</b><small>饮食</small><em>${intake}/${goalCal}</em></div></div>`;
        },

        switchTodayOverviewTab(tab, triggerEl) {
            const nextTab = tab === 'status' ? 'status' : 'recovery';
            this._todayOverviewTab = nextTab;
            const root = (triggerEl && typeof triggerEl.closest === 'function' && triggerEl.closest('.today-readiness-card'))
                || (typeof document !== 'undefined' && document.querySelector?.('#todayOverview .today-readiness-card'))
                || null;
            if (!root) return;
            if (root.dataset) root.dataset.overviewTab = nextTab;
            const tabs = root.querySelectorAll?.('[data-overview-tab]') || [];
            tabs.forEach((btn) => {
                const active = btn.getAttribute('data-overview-tab') === nextTab;
                btn.classList?.toggle('is-active', active);
                btn.setAttribute?.('aria-selected', active ? 'true' : 'false');
            });
            const panes = root.querySelectorAll?.('[data-overview-pane]') || [];
            panes.forEach((pane) => {
                const active = pane.getAttribute('data-overview-pane') === nextTab;
                pane.classList?.toggle('is-active', active);
                pane.hidden = !active;
            });
        },

        renderPlanTodaySection(summary) {
            const todayPlans = this.getTodayDailyPlans();
            const aggregate = this.aggregateCompletionRate(todayPlans);
            const streakDays = this.computeStreakDays?.() || 0;
            const pain = latestPainFeedback(todayPlans);
            const recoveryIndex = typeof this.recoveryIndex === 'function'
                ? Number(this.recoveryIndex(this.db))
                : (typeof window.planAnalytics?.recoveryIndex === 'function' ? Number(window.planAnalytics.recoveryIndex(this.db)) : NaN);
            const hasRecovery = Number.isFinite(recoveryIndex);
            const boundedRecovery = hasRecovery ? Math.max(0, Math.min(100, Math.round(recoveryIndex))) : null;
            const status = hasRecovery
                ? (boundedRecovery >= 80 ? '恢复状态良好' : boundedRecovery >= 60 ? '恢复状态一般' : '建议优先恢复')
                : '恢复状态待评估';
            const hint = hasRecovery
                ? (boundedRecovery >= 80 ? '可按计划训练，避免额外加量' : boundedRecovery >= 60 ? '建议保持中等强度并关注反馈' : '今天优先轻量训练或休息')
                : '记录训练反馈后可获得更完整的恢复参考';

            const s = ths(this, summary);
            const m = s.macros || {};
            const g = s.goals || {};
            const intake = n0(s.intake);
            const pro = n0(m.pro);
            const goalCal = n0(g.cal || this.db?.health?.dietGoal?.dailyCal);
            const statusMainVal = intake ? `${Math.round(intake)}` : '0';
            const statusMainLabel = goalCal ? `摄入 / ${goalCal} kcal` : '今日摄入 kcal';
            const statusHint = goalCal
                ? (intake > 0
                    ? `已完成目标 ${Math.min(999, Math.round((intake / goalCal) * 100))}% · 蛋白 ${Math.round(pro)}g`
                    : `今日目标 ${goalCal} kcal，点击右下角＋号记录饮食`)
                : '点击右下角＋号快速记录饮食、运动与体重';

            const activeTab = this._todayOverviewTab === 'recovery' ? 'recovery' : 'status';
            const isStatus = activeTab === 'status';
            const isRec = activeTab === 'recovery';

            return `<section class="hero today-readiness-card" data-overview-tab="${activeTab}" aria-label="${isStatus ? '今日状态' : '今日恢复'}"><div class="today-overview-bar"><div class="today-overview-tabs" role="tablist" aria-label="今日概览切换"><button type="button" role="tab" class="today-overview-tab ${isStatus ? 'is-active' : ''}" aria-selected="${isStatus}" data-overview-tab="status" onclick="data.switchTodayOverviewTab('status', this)">今日状态</button><button type="button" role="tab" class="today-overview-tab ${isRec ? 'is-active' : ''}" aria-selected="${isRec}" data-overview-tab="recovery" onclick="data.switchTodayOverviewTab('recovery', this)">今日恢复</button></div></div><div class="today-overview-pane today-status-strip ${isStatus ? 'is-active' : ''}" data-overview-pane="status"${isStatus ? '' : ' hidden'}><div class="today-readiness-head"><div><div class="today-status-label sr-only">今日状态</div><div class="today-readiness-main"><strong class="today-readiness-score">${statusMainVal}</strong><span class="today-readiness-status">${statusMainLabel}</span></div><p>${statusHint}</p></div></div><div class="today-readiness-meta today-status-metrics"><span><small>计划任务</small><b>${aggregate.total ? `${aggregate.done}/${aggregate.total}` : '--'}</b></span><span><small>${goalCal ? `摄入 / ${goalCal} kcal` : '摄入 kcal'}</small><b>${intake ? Math.round(intake) : '--'}</b></span><span><small>蛋白</small><b>${pro ? `${Math.round(pro)}g` : '--'}</b></span></div></div><div class="today-overview-pane ${isRec ? 'is-active' : ''}" data-overview-pane="recovery"${isRec ? '' : ' hidden'}><div class="today-readiness-head"><div><div class="hero-label sr-only">今日恢复</div><div class="today-readiness-main"><strong class="today-readiness-score">${hasRecovery ? boundedRecovery : '—'}</strong><span class="today-readiness-status">${status}</span></div><p>${hint}</p></div></div><div class="today-readiness-meta"><span><small>连续训练</small><b>${streakDays ? `${streakDays} 天` : '0 天'}</b></span><span><small>疼痛反馈</small><b>${Number.isFinite(pain) ? `${pain}/10` : '未记录'}</b></span><span><small>计划完成</small><b>${aggregate.total ? `${aggregate.done}/${aggregate.total}` : '未安排'}</b></span></div></div></section>`;
        },

        renderTodayV6PlanCard() {
            const todayPlans = this.getTodayDailyPlans();
            const selected = selectedPlan(this, todayPlans);
            const headActions = (primaryAction) => `<span class="today-plan-head-actions"><button class="today-weekly-plan-btn" aria-label="近期计划" type="button" onclick="data.openPlanWeeklySheet()">3-7天</button>${primaryAction}</span>`;
            if (!selected) {
                return `<div class="sect-head"><span class="t">今日计划</span>${headActions('')}</div><div class="glass-card plan-card today-plan-empty" aria-label="当前训练计划"><div><div class="pn">今天还没有训练计划</div><div class="plan-meta">创建计划，或让 AI 根据当前目标安排今天的训练。</div></div><div class="plan-actions"><button class="today-primary-launch md-btn md-btn-filled" type="button" onclick="data.openNewPlanSheet()"><span class="material-symbols-rounded">add</span>创建计划</button><button class="md-btn md-btn-text" type="button" onclick="data.openPlanTodayAiSheet()"><span class="material-symbols-rounded">psychology</span>AI 安排</button></div></div>`;
            }
            const plan = selected;
            const planMeta = this.planTypeMeta(plan.type || 'rehab', plan.title);
            const completion = this.completionRate(plan);
            const items = (plan.items || []).filter((item) => !item.deleted).sort((a, b) => taskSort(a) - taskSort(b));
            const current = items.find((item) => item.status === 'in-progress') || items.find((item) => item.status === 'todo') || null;
            const esc = (v) => (typeof this.escapeHtml === 'function' ? this.escapeHtml(v) : String(v ?? ''));
            const switcher = todayPlans.length > 1 ? `<div class="today-plan-switcher" role="tablist" aria-label="今日计划切换">${todayPlans.map((item) => {
                const meta = this.planTypeMeta(item.type || 'rehab', item.title);
                const active = item.id === plan.id;
                return `<button type="button" role="tab" aria-selected="${active}" class="${active ? 'is-active' : ''}" onclick="data.selectTodayPlan('${item.id}')">${esc(item.title || meta.label)}</button>`;
            }).join('')}</div>` : '';
            const visible = items.slice(0, 3);
            let primaryActionHtml = '';
            if (window.workout?.isPlaying) {
                primaryActionHtml = '<button class="today-primary-launch md-btn md-btn-filled" type="button" onclick="ui.tab(\'workout\', document.querySelector(\'[data-tab=workout]\'))"><span class="material-symbols-rounded">play_circle</span>继续进行中训练</button>';
            } else if (current) {
                primaryActionHtml = `<button class="today-primary-launch md-btn md-btn-filled" type="button" onclick="data.handlePlanTaskTap('${plan.id}','${current.id}')"><span class="material-symbols-rounded">play_arrow</span>开始今日训练</button>`;
            } else {
                primaryActionHtml = `<button class="today-primary-launch md-btn md-btn-tonal" type="button" onclick="data.openPlanTaskDrawer('${plan.id}')"><span class="material-symbols-rounded">visibility</span>查看今日训练</button>`;
            }
            return `<div class="sect-head"><span class="t">今日计划</span>${headActions(`<button class="a" onclick="data.openPlanTaskDrawer('${plan.id}')" type="button">查看全部</button>`)}</div>${switcher}<div class="glass-card plan-card today-plan-list" aria-label="当前训练计划 · ${esc(plan.title || planMeta.label)}">${visible.length ? visible.map((item, index) => {
                const done = item.status === 'done';
                const active = current && item.id === current.id;
                const status = done ? '已完成' : active ? '待完成' : item.status === 'skipped' ? '已跳过' : '待开始';
                return `<button class="today-plan-row ${done ? 'is-done' : ''} ${active ? 'is-current' : ''}" type="button" onclick="data.openPlanTaskDrawer('${plan.id}')"><span class="today-plan-index">${done ? '<span class="material-symbols-rounded">check</span>' : index + 1}</span><span class="today-plan-copy"><b>${esc(item.name || `训练动作 ${index + 1}`)}</b><small>${esc(taskSpecText(item))}</small></span><span class="today-plan-state">${status}</span></button>`;
            }).join('') : `<div class="today-plan-no-items"><b>${esc(plan.title || planMeta.label)}</b><span>计划暂无可执行动作</span></div>`}<div class="today-plan-foot"><span>${items.length > 3 ? `显示 3/${items.length} · ${esc(planMeta.label)}` : esc(planMeta.label)}</span><span>${completion.done}/${completion.total || 0} 完成</span></div><div class="today-plan-primary-wrap">${primaryActionHtml}</div></div>`;
        },

        renderTodayV6DietCard(summary) {
            summary = ths(this, summary);
            const m = summary.macros || {};
            const g = summary.goals || {};
            const intake = n0(summary.intake);
            const pro = n0(m.pro);
            const goalCal = n0(g.cal || this.db?.health?.dietGoal?.dailyCal);
            const todayPlans = this.getTodayDailyPlans();
            const aggregate = this.aggregateCompletionRate(todayPlans);
            return `<section class="glass-card today-status-strip" aria-label="今日状态"><div class="today-status-label">今日状态</div><div class="today-status-metrics"><span><b>${aggregate.total ? `${aggregate.done}/${aggregate.total}` : '--'}</b><small>计划任务</small></span><span><b>${intake ? Math.round(intake) : '--'}</b><small>${goalCal ? `摄入 / ${goalCal} kcal` : '摄入 kcal'}</small></span><span><b>${pro ? `${Math.round(pro)}g` : '--'}</b><small>蛋白</small></span></div></section>`;
        },

        renderTodayActionDock() {
            return `<section class="today-quick-section"><div class="sect-head"><span class="t">快捷记录</span></div><div class="quick-dock"><button class="record-quick-btn" type="button" data-q="weight" onclick="data.openWeightModal()"><span class="material-symbols-rounded">monitor_weight</span><span>记体重</span></button><button class="record-quick-btn" type="button" data-q="diet" onclick="data.openDietModal()"><span class="material-symbols-rounded">restaurant</span><span>记饮食</span></button><button class="record-quick-btn" type="button" data-q="cardio" onclick="data.openExerciseModal()"><span class="material-symbols-rounded">fitness_center</span><span>记运动</span></button><button class="record-quick-btn record-quick-btn-ai context-ai-btn" type="button" data-q="ai" data-ai-ctx="today" data-ai-idx="0"><span class="material-symbols-rounded">psychology</span><span>问 AI</span></button></div></section>`;
        },

        renderTodayCompletionTrend() {
            const plans = activeList(this, this.db?.dailyPlans || []);
            const days = [...new Set(plans.map((plan) => plan?.date).filter(Boolean))].sort().slice(-7);
            const rates = days.map((date) => aggregateCompletionRate(plans.filter((plan) => plan.date === date)).rate);
            if (rates.length > 1) {
                const chart = `<div class="today-trend-chart" role="img" aria-label="最近计划完成率趋势">${rates.map((rate) => `<i style="--v:${Math.round(rate * 100)}%"></i>`).join('')}</div>`;
                return `<section class="glass-card today-trend-card" aria-label="训练完成趋势"><div class="today-trend-head"><b>训练完成趋势</b><span>最近 ${days.length} 天</span></div>${chart}</section>`;
            }
            return `<section class="glass-card today-trend-card today-trend-compact" aria-label="训练完成趋势"><div class="today-trend-head"><b>训练完成趋势</b><span class="today-trend-badge">暂无数据</span></div><p class="today-trend-compact-hint">连续完成多天训练计划后将在此生成完成率走势图</p></section>`;
        },

        renderTodayPrimaryAction() {
            if (window.workout?.isPlaying) {
                return '<button class="today-primary-launch md-btn md-btn-filled" type="button" onclick="ui.tab(\'workout\', document.querySelector(\'[data-tab=workout]\'))"><span class="material-symbols-rounded">play_circle</span>继续进行中训练</button>';
            }
            const plans = this.getTodayDailyPlans();
            const plan = selectedPlan(this, plans);
            if (!plan) return '<button class="today-primary-launch md-btn md-btn-filled" type="button" onclick="data.openNewPlanSheet()"><span class="material-symbols-rounded">add</span>创建计划</button>';
            const items = (plan.items || []).filter((item) => item && !item.deleted).sort((a, b) => taskSort(a) - taskSort(b));
            const current = items.find((item) => item.status === 'in-progress') || items.find((item) => item.status === 'todo');
            if (current) return `<button class="today-primary-launch md-btn md-btn-filled" type="button" onclick="data.handlePlanTaskTap('${plan.id}','${current.id}')"><span class="material-symbols-rounded">play_arrow</span>开始今日训练</button>`;
            return `<button class="today-primary-launch md-btn md-btn-tonal" type="button" onclick="data.openPlanTaskDrawer('${plan.id}')"><span class="material-symbols-rounded">visibility</span>查看今日训练</button>`;
        },

        updateTodayV6Greet() {
            const greetLine = document.querySelector('.today-v6-greet-line');
            const greetSub = document.querySelector('.today-v6-greet-sub');
            if (!greetLine) return;
            const hour = new Date().getHours();
            const greet = hour < 6 ? '凌晨好' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
            const name = this.db?.profile?.name || '';
            greetLine.textContent = name ? `${greet}，${name}` : greet;
            if (greetSub) {
                const now = new Date();
                const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                greetSub.textContent = `${now.getMonth() + 1}月${now.getDate()}日 · ${weekdays[now.getDay()]}`;
            }
        },

        enhanceTodayPage() {
            this.updateTodayV6Greet?.();
        }
    };
})();
