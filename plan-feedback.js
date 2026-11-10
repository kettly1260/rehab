// @ts-nocheck
(function () {
    if (window.dataPlanFeedback) return;

    const FEEDBACK_OPTIONS = [
        { rpe: 1, emoji: '😌', label: '太轻' },
        { rpe: 2, emoji: '😊', label: '合适' },
        { rpe: 3, emoji: '🙂', label: '累' },
        { rpe: 4, emoji: '😣', label: '吃力' },
        { rpe: 5, emoji: '😖', label: '不行' }
    ];

    function qs(id) {
        return document.getElementById(id);
    }

    function checked(value) {
        return value ? 'checked' : '';
    }

    window.dataPlanFeedback = {
        _planFeedbackCtx: null,

        openPlanFeedback(planId, taskId, options = {}) {
            const { plan, task } = this.findTask?.(planId, taskId) || {};
            if (!plan || !task) return;
            const sheet = qs('planFeedbackSheet');
            const body = qs('planFeedbackSheetBody');
            if (!sheet || !body) return;
            const prefill = options.prefill || {};
            const feedback = { ...(task.feedback || {}), ...prefill };
            const feedbackCtx = {
                planId,
                taskId,
                rpe: Number(feedback.rpe || 0) || 0,
                sessionId: options.sessionId || this._currentPlanSessionId || this.activeRun?.sessionId || null,
                _handled: false
            };
            this._planFeedbackCtx = feedbackCtx;
            if (window.dataPlanFeedback) window.dataPlanFeedback._planFeedbackCtx = feedbackCtx;
            if (window.data) window.data._planFeedbackCtx = feedbackCtx;
            const painScore = feedback.painScore ?? feedback.painLevel ?? '';
            body.innerHTML = `
                <div class="plan-feedback-sheet">
                    <div class="plan-sheet-head plan-feedback-head">
                        <span class="material-symbols-rounded plan-head-icon">monitor_heart</span>
                        <div>
                            <span class="cardio-kicker">康复反馈</span>
                            <h3>${this.escapeHtml(task.name || '当前任务')}</h3>
                            <small>记录这次体感，帮助调整明天的负荷</small>
                        </div>
                    </div>
                    <div class="plan-feedback-grid">
                        ${FEEDBACK_OPTIONS.map((item) => `
                            <button class="plan-feedback-btn ${Number(feedback.rpe || 0) === item.rpe ? 'active' : ''}" type="button" onclick="data.selectPlanFeedback(${item.rpe})" data-plan-rpe="${item.rpe}">
                                <span class="plan-feedback-emoji">${item.emoji}</span>
                                <strong>${item.label}</strong>
                            </button>
                        `).join('')}
                    </div>
                    <div class="plan-feedback-detail-grid">
                        <label class="plan-feedback-field">
                            <span>疼痛分数</span>
                            <select id="planFeedbackPainScore">
                                <option value="" ${painScore === '' || painScore == null ? 'selected' : ''}>无/未记录</option>
                                ${Array.from({ length: 11 }, (_, value) => `<option value="${value}" ${Number(painScore) === value ? 'selected' : ''}>${value}/10</option>`).join('')}
                            </select>
                        </label>
                        <label class="plan-feedback-field">
                            <span>疼痛部位</span>
                            <input id="planFeedbackPainPart" type="text" value="${this.escapeHtml(feedback.painPart || '')}" placeholder="例如：右髋外侧/腹股沟">
                        </label>
                    </div>
                    <div class="plan-feedback-checks">
                        <label><input id="planFeedbackWantsContinue" type="checkbox" ${checked(feedback.wantsContinue !== false)}><span>这个动作还想继续</span></label>
                        <label><input id="planFeedbackNoIncrease" type="checkbox" ${checked(feedback.noIncrease || feedback.dontIncrease)}><span>不要再加量</span></label>
                        <label><input id="planFeedbackKeepNextTime" type="checkbox" ${checked(feedback.keepNextTime)}><span>下次保持这样</span></label>
                        <label><input id="planFeedbackUnsuitable" type="checkbox" ${checked(feedback.unsuitable)}><span>这个动作不适合我</span></label>
                    </div>
                    <div class="md-field">
                        <textarea id="planFeedbackNote" rows="3" placeholder=" ">${this.escapeHtml(feedback.note || '')}</textarea>
                        <label>备注（可选）</label>
                    </div>
                    <div class="md-row modal-actions">
                        <button class="md-btn" type="button" onclick="data.skipPlanFeedback()">跳过</button>
                        <button class="md-btn md-btn-filled" type="button" onclick="data.savePlanFeedback()">保存</button>
                    </div>
                </div>`;
            sheet.classList.remove('hidden');
            sheet.setAttribute('aria-hidden', 'false');
            window.navStack?.open?.('modal', 'planFeedbackSheet', () => this.closePlanFeedbackInternal());
        },

        selectPlanFeedback(rpe) {
            const ctx = this._planFeedbackCtx || window.data?._planFeedbackCtx || window.dataPlanFeedback?._planFeedbackCtx || {};
            ctx.rpe = Number(rpe || 0);
            this._planFeedbackCtx = ctx;
            if (window.dataPlanFeedback) window.dataPlanFeedback._planFeedbackCtx = ctx;
            if (window.data) window.data._planFeedbackCtx = ctx;
            document.querySelectorAll('[data-plan-rpe]').forEach((btn) => {
                const active = Number(btn.getAttribute('data-plan-rpe')) === Number(rpe);
                btn.classList.toggle('active', active);
            });
            window.haptics?.light?.();
        },

        closePlanFeedback(options = {}) {
            return window.navStack?.requestClose?.('modal', 'planFeedbackSheet') || this.closePlanFeedbackInternal(options);
        },

        closePlanFeedbackInternal(options = {}) {
            const ctx = this._planFeedbackCtx;
            const sheet = qs('planFeedbackSheet');
            sheet?.classList.add('hidden');
            sheet?.setAttribute('aria-hidden', 'true');
            this._planFeedbackCtx = null;
            if (window.dataPlanFeedback) window.dataPlanFeedback._planFeedbackCtx = null;
            if (window.data) window.data._planFeedbackCtx = null;
            if (ctx && !options?.silent && !ctx._handled) {
                ctx._handled = true;
                this.afterPlanFeedback?.(ctx.planId, ctx.taskId, {
                    didSaveFeedback: false,
                    isModalClose: true,
                    sessionId: ctx.sessionId
                });
            }
            return true;
        },

        skipPlanFeedback() {
            const ctx = this._planFeedbackCtx;
            if (ctx) ctx._handled = true;
            this.closePlanFeedback({ silent: true });
            if (ctx) this.afterPlanFeedback?.(ctx.planId, ctx.taskId, { didSaveFeedback: false, sessionId: ctx.sessionId });
        },

        savePlanFeedback() {
            const ctx = this._planFeedbackCtx || window.data?._planFeedbackCtx || window.dataPlanFeedback?._planFeedbackCtx;
            if (!ctx?.planId || !ctx?.taskId || !ctx.rpe) {
                window.toast?.show?.('先选一个体感等级', 'info');
                return;
            }
            const note = String(qs('planFeedbackNote')?.value || '').trim();
            const rawPainScore = qs('planFeedbackPainScore')?.value ?? '';
            this.addFeedback?.(ctx.planId, ctx.taskId, {
                rpe: ctx.rpe,
                painScore: rawPainScore === '' ? null : Number(rawPainScore),
                painPart: String(qs('planFeedbackPainPart')?.value || '').trim(),
                wantsContinue: !!qs('planFeedbackWantsContinue')?.checked,
                noIncrease: !!qs('planFeedbackNoIncrease')?.checked,
                keepNextTime: !!qs('planFeedbackKeepNextTime')?.checked,
                unsuitable: !!qs('planFeedbackUnsuitable')?.checked,
                note,
                doneAt: Date.now()
            });
            this.maybeApplyProgression?.(ctx.planId, ctx.taskId);
            if (ctx) ctx._handled = true;
            this.closePlanFeedback({ silent: true });
            this.render?.();
            this.afterPlanFeedback?.(ctx.planId, ctx.taskId, { didSaveFeedback: true, sessionId: ctx.sessionId });
        }
    };

    Object.defineProperty(window.dataPlanFeedback, '__runtimeStateKeys', {
        value: ['_planFeedbackCtx'],
        enumerable: false
    });
})();
