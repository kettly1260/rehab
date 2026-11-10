// @ts-nocheck
(function () {
    if (window.dataPlanCooldown) return;

    function byId(id) {
        return document.getElementById(id);
    }

    function removePrompt(root) {
        if (!root) return;
        clearInterval(root._planTimer);
        root.remove();
    }

    function formatTaskSpec(task) {
        const s = task?.spec || {};
        const parts = [];
        if (s.sets) parts.push(`${s.sets}组`);
        if (s.reps) parts.push(`${s.reps}次`);
        if (s.work) parts.push(`${s.work}秒`);
        return parts.join(' × ') || '';
    }

    window.dataPlanCooldown = {
        afterPlanFeedback(planId, taskId, options = {}) {
            const opts = typeof options === 'boolean' ? { didSaveFeedback: options } : (options || {});
            const { plan, task } = this.findTask?.(planId, taskId) || {};
            if (!plan || !task) return;
            const sessionId = opts.sessionId || this._currentPlanSessionId || this.activeRun?.sessionId;

            if (opts.isModalClose) {
                const items = (plan.items || []).filter((item) => item && !item.deleted);
                const hasPending = items.some((item) => item.status !== 'done' && item.status !== 'skipped');
                if (!hasPending) {
                    this.finishPlanSession?.(planId);
                }
                return;
            }
            const proceedToNextTask = () => {
                const items = (plan.items || []).filter((item) => item && !item.deleted);
                const currentIndex = items.findIndex((item) => item.id === taskId);
                const nextTask = items.slice(currentIndex + 1).find((item) => item.category !== 'cooldown' && (item.status === 'todo' || item.status === 'in-progress'))
                    || items.find((item) => item.id !== taskId && item.category !== 'cooldown' && (item.status === 'todo' || item.status === 'in-progress'));
                if (nextTask) {
                    this.showPlanNextTaskPrompt(planId, nextTask, sessionId);
                    return;
                }
                if (Array.isArray(plan.pendingCooldowns) && plan.pendingCooldowns.length > 0) {
                    this.showCentralizedCooldownPrompt(planId);
                    return;
                }
                this.finishPlanSession?.(planId);
            };

            if (opts.cooldownCompleted || task.category === 'cooldown') {
                proceedToNextTask();
                return;
            }

            const refs = Array.isArray(task.cooldownRefs) ? task.cooldownRefs : [];
            if (!refs.length) {
                proceedToNextTask();
                return;
            }
            const cooldownId = refs[0];
            const cooldownTask = (plan.items || []).find((item) => item.id === cooldownId && !item.deleted) || null;
            if (!cooldownTask) {
                proceedToNextTask();
                return;
            }
            const prefs = this.ensurePlanPrefs?.() || {};
            if (prefs.cooldownMode === 'centralized') {
                this.queueCooldown?.(planId, cooldownId);
                this.renderTodayPage?.();
                proceedToNextTask();
                return;
            }
            if (prefs.cooldownMode === 'paired') {
                this.runPlanTask?.(planId, cooldownId, { asCooldown: true, sessionId, mainTaskId: taskId });
                return;
            }
            this.showPlanCooldownPrompt(planId, cooldownId, cooldownTask, proceedToNextTask);
        },

        showPlanNextTaskPrompt(planId, nextTask, sessionId) {
            document.querySelectorAll('.plan-cooldown-toast').forEach((el) => removePrompt(el));
            const root = document.createElement('div');
            root.className = 'plan-cooldown-toast';
            root.innerHTML = `
                <div class="plan-cooldown-toast-head">
                    <strong>准备开始下一项「${this.escapeHtml(nextTask.name || '计划动作')}」</strong>
                    <small>${this.escapeHtml(formatTaskSpec(nextTask))}</small>
                </div>
                <div class="plan-cooldown-actions">
                    <button class="md-btn" type="button" data-plan-next-act="skip">跳过此项</button>
                    <button class="md-btn md-btn-tonal" type="button" data-plan-next-act="finish">结束训练</button>
                    <button class="md-btn md-btn-filled" type="button" data-plan-next-act="start">开始下一项</button>
                </div>`;
            document.body.appendChild(root);
            root.querySelectorAll('[data-plan-next-act]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const act = btn.getAttribute('data-plan-next-act');
                    removePrompt(root);
                    if (act === 'start') {
                        this.runPlanTask?.(planId, nextTask.id, { sessionId });
                    } else if (act === 'skip') {
                        this.skipPlanTask?.(planId, nextTask.id, { sessionId });
                    } else {
                        this.finishPlanSession?.(planId);
                    }
                });
            });
        },

        showCentralizedCooldownPrompt(planId) {
            const plan = (this.getTodayDailyPlans?.() || []).find((p) => p.id === planId) || (this.db?.dailyPlans || []).find((p) => p.id === planId && !p.deleted) || this.getTodayDailyPlan?.();
            const count = plan?.pendingCooldowns?.length || 0;
            document.querySelectorAll('.plan-cooldown-toast').forEach((el) => removePrompt(el));
            const root = document.createElement('div');
            root.className = 'plan-cooldown-toast';
            root.innerHTML = `
                <div class="plan-cooldown-toast-head">
                    <strong>主项训练已完成！有 ${count} 个待集中拉伸动作</strong>
                    <small>建议进行放松拉伸以促进恢复</small>
                </div>
                <div class="plan-cooldown-actions">
                    <button class="md-btn" type="button" data-plan-cd-act="finish">完成训练</button>
                    <button class="md-btn md-btn-filled" type="button" data-plan-cd-act="start">开始拉伸</button>
                </div>`;
            document.body.appendChild(root);
            root.querySelectorAll('[data-plan-cd-act]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const act = btn.getAttribute('data-plan-cd-act');
                    removePrompt(root);
                    if (act === 'start') {
                        this.runAllQueuedCooldowns?.(planId);
                    } else {
                        this.finishPlanSession?.(planId);
                    }
                });
            });
        },

        showPlanCooldownPrompt(planId, taskId, cooldownTask, onDone) {
            document.querySelectorAll('.plan-cooldown-toast').forEach((el) => removePrompt(el));
            const root = document.createElement('div');
            root.className = 'plan-cooldown-toast';
            const equipment = (this.ensurePlanPrefs?.().equipment || []).join('、');
            root.innerHTML = `
                <div class="plan-cooldown-toast-head">
                    <strong>跟一组「${this.escapeHtml(cooldownTask.name || '放松动作')}」放松吗？</strong>
                    <small>${this.escapeHtml(equipment || '徒手')} · 30s 内自动暂存</small>
                </div>
                <div class="plan-cooldown-actions">
                    <button class="md-btn" type="button" data-plan-act="skip">跳过</button>
                    <button class="md-btn md-btn-tonal" type="button" data-plan-act="queue">暂存待集中拉伸</button>
                    <button class="md-btn md-btn-filled" type="button" data-plan-act="now">现在做</button>
                </div>
                <div class="plan-cooldown-progress"><i></i></div>`;
            document.body.appendChild(root);
            const bar = root.querySelector('.plan-cooldown-progress i');
            const started = Date.now();
            root._planTimer = setInterval(() => {
                const left = Math.max(0, 30000 - (Date.now() - started));
                if (bar) bar.style.width = `${Math.max(0, Math.round((left / 30000) * 100))}%`;
                if (left <= 0) {
                    clearInterval(root._planTimer);
                    this.queueCooldown?.(planId, taskId);
                    this.renderTodayPage?.();
                    removePrompt(root);
                    onDone?.();
                }
            }, 200);
            root.querySelectorAll('[data-plan-act]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const act = btn.getAttribute('data-plan-act');
                    removePrompt(root);
                    if (act === 'queue') {
                        this.queueCooldown?.(planId, taskId);
                        this.renderTodayPage?.();
                        onDone?.();
                    } else if (act === 'now') {
                        this.dequeueCooldown?.(planId, taskId, { save: false });
                        this.runPlanTask?.(planId, taskId, { asCooldown: true, sessionId: this.activeRun?.sessionId });
                    } else {
                        onDone?.();
                    }
                });
            });
        },

        openPlanPendingCooldownSheet() {
            const plans = this.getTodayDailyPlans?.() || [];
            const queue = plans.flatMap((plan) => (plan.pendingCooldowns || []).map((id) => ({ plan, item: (plan.items || []).find((task) => task.id === id) })).filter((entry) => entry.item));
            if (!queue.length) {
                window.toast?.show?.('当前没有待集中拉伸', 'info');
                return;
            }
            this._openModal?.({
                title: '待集中拉伸',
                icon: 'self_improvement',
                bodyHtml: `<div class="plan-queue-list">
                    ${queue.map(({ plan, item }) => `
                        <button class="model-picker-row" type="button" onclick="data.runQueuedCooldown('${this.escapeHtml(plan.id)}','${this.escapeHtml(item.id)}')">
                            <span class="material-symbols-rounded">schedule</span>
                            <span class="model-picker-main">
                                <strong>${this.escapeHtml(item.name || '放松')}</strong>
                                <small>${Number(item.spec?.work || 30)} 秒</small>
                            </span>
                        </button>
                    `).join('')}
                </div>`,
                actionsHtml: `
                    <button class="md-btn" type="button" data-modal-close>关闭</button>
                    <button class="md-btn md-btn-tonal" type="button" onclick="data.runAllQueuedCooldowns()">全部连跑</button>
                `
            });
        },

        runQueuedCooldown(planId, taskId, options = {}) {
            const plan = (this.getTodayDailyPlans?.() || []).find((item) => item.id === planId) || (this.db?.dailyPlans || []).find((p) => p.id === planId && !p.deleted) || this.getTodayDailyPlan?.();
            if (!plan || !taskId) return;
            this.dequeueCooldown?.(plan.id, taskId);
            this.runPlanTask?.(plan.id, taskId, { asCooldown: true, ...options });
            this._closeActiveModal?.();
        },

        runAllQueuedCooldowns(targetPlanId) {
            const plans = this.getTodayDailyPlans?.() || [];
            const plan = targetPlanId ? (plans.find((p) => p.id === targetPlanId) || (this.db?.dailyPlans || []).find((p) => p.id === targetPlanId && !p.deleted)) : plans.find((p) => p.pendingCooldowns?.length);
            const nextId = plan?.pendingCooldowns?.[0];
            if (!plan || !nextId) return;
            this.dequeueCooldown?.(plan.id, nextId);
            this.runPlanTask?.(plan.id, nextId, { asCooldown: true, queueFollowup: true, sessionId: this._currentPlanSessionId || null });
            this._closeActiveModal?.();
        }
    };
})();
