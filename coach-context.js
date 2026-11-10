// @ts-nocheck
Object.assign(advicePanel, {
    parsePromptTargetDate(prompt) {
        const text = String(prompt || '');
        const explicit = text.match(/(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
        if (explicit) return this.dateKey(new Date(Number(explicit[1]), Number(explicit[2]) - 1, Number(explicit[3])));
        const md = text.match(/(\d{1,2})月(\d{1,2})日/);
        if (md) {
            const now = new Date();
            return this.dateKey(new Date(now.getFullYear(), Number(md[1]) - 1, Number(md[2])));
        }
        if (/今天/.test(text)) return this.logicalDateKey();
        if (/昨天/.test(text)) return this.dateKey(new Date(this.logicalDayStart().getTime() - 86400000));
        return '';
    },

    parsePromptAnalysisRange(prompt) {
        const text = String(prompt || '');
        if (/过去\s*(?:30|三十)\s*天|近\s*(?:30|三十)\s*天|最近\s*(?:30|三十)\s*天|(?:30|三十)\s*天|最近\s*(?:一|1)\s*个?月|近\s*(?:一|1)\s*个?月|过去\s*(?:一|1)\s*个?月|近月|全月|这月|本月/.test(text)) {
            return 'month';
        }
        if (/过去\s*(?:7|七)\s*天|近\s*(?:7|七)\s*天|最近\s*(?:7|七)\s*天|(?:7|七)\s*天|最近\s*(?:一|1)\s*个?[周星期]|近\s*(?:一|1)\s*个?[周星期]|过去\s*(?:一|1)\s*个?[周星期]|本周|这周|全周/.test(text)) {
            return 'week';
        }
        if (/全部|所有历史|历史所有|所有计划|全部计划|历史计划|所有记录|全部记录|历史记录|所有数据|全部数据|完整历史|历次|有史以来/.test(text)) {
            return 'all';
        }
        if (/今天|今日/.test(text)) {
            return 'today';
        }
        return '';
    },

    detectAdviceFocus(prompt = '') {
        const text = String(prompt || '').toLowerCase().replace(/\s+/g, '');
        const has = (patterns) => patterns.some(pattern => pattern.test(text));
        const diet = has([/饮食|早餐|午餐|晚餐|加餐|吃|摄入|食物|蛋白|碳水|脂肪|营养|热量|卡路里|膳食|补剂|钠|糖|纤维/]);
        const weight = has([/体重|体脂|bmi|腰围|围度|秤|公斤|kg|减重|减肥|增重|称重|掉秤|平台期|体重.*趋势|趋势.*体重|体重.*停滞|停滞.*体重|减重.*停滞|增肌.*停滞/]);
        const training = has([/训练|运动|动作|组数|次数|强度|频率|rpe|疼|痛|康复|处方|恢复|拉伸|力量|有氧|跑步|骑行|游泳|训练计划|运动计划|训练日程|我的计划|计划和目标|今日计划|今天.*计划|计划.*今天|日程|deload|降载|肩|膝|腰|髋|踝|腕|肘/]);
        const goal = has([/目标|达标|够不够|是否够|计划|调整|建议|减脂|增肌|维持|热量控制|热量目标|体重目标/]) || diet || weight;
        const broad = has([/综合|整体|全部|全面|总结合并|今天.*记录|记录.*今天|周总结|月总结|饮食.*训练.*体重|体重.*饮食.*训练/]);
        const contexts = broad
            ? { diet: true, training: true, weight: true, goal: true }
            : { diet, training, weight, goal: goal || diet || weight };
        const active = ['diet', 'training', 'weight', 'goal'].filter(key => contexts[key]);
        const labels = { diet: '饮食', training: '训练', weight: '体重', goal: '目标' };
        return {
            contexts,
            active,
            broad,
            hasFocus: broad || active.some(key => key !== 'goal'),
            label: active.map(key => labels[key]).join('、') || '综合',
            profileMode: training ? 'full' : (diet || weight || goal ? 'basic' : 'none')
        };
    },

    resolveAdviceContexts(prompt = '', mode = 'auto') {
        const enabled = mode === 'none'
            ? { diet: false, training: false, weight: false, goal: false }
            : { diet: true, training: true, weight: true, goal: true, ...(this.adviceContexts || {}) };
        if (mode === 'none') {
            const focus = this.detectAdviceFocus(prompt);
            focus.profileMode = 'none';
            return { contexts: enabled, focus };
        }
        const focus = this.detectAdviceFocus(prompt);
        const requested = focus.hasFocus ? focus.contexts : { diet: true, training: true, weight: true, goal: true };
        const contexts = {};
        ['diet', 'training', 'weight', 'goal'].forEach(key => { contexts[key] = !!enabled[key] && !!requested[key]; });
        focus.profileMode = contexts.training ? 'full' : (contexts.diet || contexts.weight || contexts.goal ? 'basic' : 'none');
        return { contexts, focus };
    },

    queryContextData(options = {}) {
        const toTime = (val) => {
            if (!val) return 0;
            if (val instanceof Date) return val.getTime();
            if (typeof val === 'number') return val;
            const d = new Date(val);
            const t = d.getTime();
            return Number.isFinite(t) ? t : 0;
        };

        const sortByDateDesc = (items, getDate) => {
            return [...items].sort((a, b) => toTime(getDate(b)) - toTime(getDate(a)));
        };

        const toDayKey = (val) => {
            if (!val) return '';
            if (val && typeof val.getTime === 'function') {
                if (typeof this.dateKey === 'function') return this.dateKey(val);
                const d = new Date(val.getTime());
                return d.toISOString().slice(0, 10);
            }
            if (typeof val === 'string') {
                const s = val.trim();
                const m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
                if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
                return s.slice(0, 10);
            }
            return '';
        };

        const prompt = options.prompt || '';
        const mode = options.mode || 'auto';
        const detectedRange = this.parsePromptAnalysisRange ? this.parsePromptAnalysisRange(prompt) : '';
        const range = options.analysisRange || detectedRange || options.range || (this.adviceRange || 'today');
        const contexts = options.contexts || { diet: true, training: true, weight: true, goal: true };
        const today = typeof this.logicalDateKey === 'function' ? this.logicalDateKey() : (typeof this.dateKey === 'function' ? this.dateKey(new Date()) : toDayKey(new Date()));
        const start = typeof this.adviceRangeStart === 'function'
            ? this.adviceRangeStart(range)
            : (range === 'all' ? null : (() => {
                const s = typeof this.logicalDayStart === 'function' ? this.logicalDayStart() : new Date();
                if (range === 'week') s.setDate(s.getDate() - 6);
                else if (range === 'month') s.setDate(s.getDate() - 29);
                return s;
            })());
        const startDateKey = start ? (typeof this.dateKey === 'function' ? this.dateKey(start) : toDayKey(start)) : '';
        const endDateKey = today;
        const targetDate = options.targetDate || (typeof this.parsePromptTargetDate === 'function' ? this.parsePromptTargetDate(prompt) : '');

        const filterActive = typeof this.activeRecords === 'function'
            ? (list) => this.activeRecords(list)
            : (list) => (list || []).filter(item => item && !item.deleted);

        const allHistory = filterActive(this.db?.history || []);
        const allFoods = filterActive(this.db?.health?.foodLogs || []);
        const allExerciseLogs = filterActive(this.db?.health?.exerciseLogs || []);
        const allWeights = typeof this.sortedWeights === 'function'
            ? this.sortedWeights()
            : [...filterActive(this.db?.health?.weights || [])].sort(
                (a, b) => (typeof this.dateFromKey === 'function' ? this.dateFromKey(a.date) : new Date(a.date)) - (typeof this.dateFromKey === 'function' ? this.dateFromKey(b.date) : new Date(b.date))
            );
        const allDailyPlans = filterActive(this.db?.dailyPlans || []);
        const allReports = filterActive(this.db?.health?.reports || []);
        const allActions = filterActive(this.db?.actions || []);
        const allRoutines = filterActive(this.db?.routines || []);
        const allRehabWeeks = filterActive(this.db?.health?.rehabWeekly || []);

        const truncations = [];

        const filterByRange = (items, getDate, isCriticalFn, categoryName) => {
            const inRange = items.filter(item => {
                const dKey = item?.dayKey || toDayKey(getDate(item));
                if (!dKey) return false;
                if (startDateKey && dKey < startDateKey) return false;
                if (endDateKey && dKey > endDateKey) return false;
                return true;
            });
            const sorted = sortByDateDesc(inRange, getDate);
            if (mode !== 'light') return sorted;
            const limit = 10;
            if (sorted.length <= limit) return sorted;
            const critical = [];
            const normal = [];
            sorted.forEach(it => {
                if (isCriticalFn && isCriticalFn(it)) critical.push(it);
                else normal.push(it);
            });
            const picked = [...critical, ...normal].slice(0, limit);
            picked.sort((a, b) => toTime(getDate(b)) - toTime(getDate(a)));
            const omitted = [...critical, ...normal].slice(limit);
            const omittedCriticalNotices = [];
            for (const it of omitted) {
                if (isCriticalFn && isCriticalFn(it)) {
                    if (categoryName === '训练计划') {
                        const items = it.items || [];
                        const names = items.map(t => t.name).filter(Boolean).join('、');
                        omittedCriticalNotices.push(`[${it.date || ''}]${names}`);
                    }
                }
            }
            if (omittedCriticalNotices.length) {
                truncations.push(`${categoryName || '记录'}已从 ${sorted.length} 条精简为 ${picked.length} 条；超出预算的受限计划关键限制必须遵守：${omittedCriticalNotices.join('；')}`);
            } else {
                truncations.push(`${categoryName || '记录'}已从 ${sorted.length} 条精简为 ${picked.length} 条（优先保留疼痛/中止/关键记录）`);
            }
            return picked;
        };

        const isHistoryCritical = h => !!(
            h.manualStop ||
            h.stopReason ||
            h.discomfort ||
            Number(h.rpe) >= 8 ||
            (h.actions || []).some(a => (a.painScore != null && Number(a.painScore) > 0) || a.painPart)
        );
        const isPlanCritical = p => !!(
            (p.items || []).some(item =>
                item.manualStop ||
                item.stopReason ||
                item.discomfort ||
                item.userOverride ||
                (item.feedback && (
                    (item.feedback.painScore != null && Number(item.feedback.painScore) > 0) ||
                    item.feedback.painPart ||
                    item.feedback.unsuitable ||
                    item.feedback.noIncrease ||
                    item.feedback.keepNextTime ||
                    item.feedback.wantsContinue === false ||
                    Number(item.feedback.rpe) >= 8
                ))
            )
        );
        const isExerciseCritical = e => !!(e.note && /痛|伤|难受|停|不适/.test(e.note));
        const isFoodCritical = f => !!(f.note && /过敏|不适|胃|胀|痛/.test(f.note));

        const rangeHistory = contexts.training ? filterByRange(allHistory, h => this.parseHistoryDate(h.date), isHistoryCritical, '训练记录') : [];
        const rangeFoods = contexts.diet ? filterByRange(allFoods, f => f.date ? this.dateFromKey(f.date) : null, isFoodCritical, '饮食记录') : [];
        const rangeExerciseLogs = contexts.training ? filterByRange(allExerciseLogs, e => e.date ? this.dateFromKey(e.date) : null, isExerciseCritical, '运动记录') : [];
        const rangeWeights = contexts.weight ? filterByRange(allWeights, w => w.date ? this.dateFromKey(w.date) : null, null, '体重记录') : [];

        // Daily plans: past & today in rangeDailyPlans, future strictly in futureDailyPlans
        const pastAndTodayPlans = allDailyPlans.filter(p => {
            const pk = p.date ? String(p.date).slice(0, 10).replace(/\//g, '-') : '';
            return pk && pk <= today;
        });
        const rawFuturePlans = allDailyPlans.filter(p => {
            const pk = p.date ? String(p.date).slice(0, 10).replace(/\//g, '-') : '';
            return pk && pk > today;
        });
        const rangeDailyPlans = contexts.training ? filterByRange(pastAndTodayPlans, p => p.date ? (typeof this.dateFromKey === 'function' ? this.dateFromKey(p.date) : new Date(p.date)) : null, isPlanCritical, '训练计划') : [];
        const futureDailyPlans = contexts.training
            ? [...rawFuturePlans].sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).slice(0, mode === 'light' ? 3 : 7)
            : [];

        const sortedRehabWeeks = allRehabWeeks.slice().sort((a, b) => String(b.weekStart || '').localeCompare(String(a.weekStart || '')) || Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
        const rehabWeeks = contexts.training ? sortedRehabWeeks.slice(0, mode === 'light' ? 3 : 6) : [];

        const getHistoryDay = (h) => h?.dayKey || (typeof this.historyDayKey === 'function' ? this.historyDayKey(h) : toDayKey(h?.date));

        const todayHistory = contexts.training ? allHistory.filter(h => getHistoryDay(h) === today) : [];
        const todayFoods = contexts.diet ? allFoods.filter(f => f.date === today) : [];
        const todayExerciseLogs = contexts.training ? allExerciseLogs.filter(e => e.date === today) : [];
        const todayWeights = contexts.weight ? allWeights.filter(w => w.date === today) : [];
        const todayDailyPlans = contexts.training ? allDailyPlans.filter(p => p.date === today) : [];

        const targetHistory = (targetDate && contexts.training) ? allHistory.filter(h => getHistoryDay(h) === targetDate) : [];
        const targetFoods = (targetDate && contexts.diet) ? allFoods.filter(f => f.date === targetDate) : [];
        const targetExerciseLogs = (targetDate && contexts.training) ? allExerciseLogs.filter(e => e.date === targetDate) : [];
        const targetWeights = (targetDate && contexts.weight) ? allWeights.filter(w => w.date === targetDate) : [];
        const targetDailyPlans = (targetDate && contexts.training) ? allDailyPlans.filter(p => p.date === targetDate) : [];

        const rangeLabel = { today: '今日', week: '最近7天', month: '最近30天', all: '全部记录' }[range] || '今日';

        const contextEvidence = {
            range,
            rangeLabel,
            startDate: startDateKey || '起始',
            endDate: endDateKey,
            targetDate: targetDate || null,
            mode,
            contexts: { ...contexts },
            counts: {
                history: rangeHistory.length,
                foods: rangeFoods.length,
                exerciseLogs: rangeExerciseLogs.length,
                weights: rangeWeights.length,
                dailyPlans: rangeDailyPlans.length,
                pastAndTodayPlans: rangeDailyPlans.length,
                targetHistory: targetDate ? targetHistory.length : rangeHistory.length,
                targetFoods: targetDate ? targetFoods.length : rangeFoods.length,
                targetWeights: targetDate ? targetWeights.length : rangeWeights.length,
                futureDailyPlans: futureDailyPlans.length,
                rehabWeekly: rehabWeeks.length
            },
            rehabInfo: {
                count: rehabWeeks.length,
                latestWeekStart: rehabWeeks[0]?.weekStart || null
            },
            truncations,
            summaryBrief: `${rangeLabel} · 训练${rangeHistory.length}条 计划${rangeDailyPlans.length}份 饮食${rangeFoods.length}条 体重${rangeWeights.length}条`
        };

        return {
            range,
            rangeLabel,
            today,
            targetDate,
            contexts,
            rangeHistory,
            rangeFoods,
            rangeExerciseLogs,
            rangeWeights,
            rangeDailyPlans,
            futureDailyPlans,
            todayHistory,
            todayFoods,
            todayExerciseLogs,
            todayWeights,
            todayDailyPlans,
            targetHistory,
            targetFoods,
            targetExerciseLogs,
            targetWeights,
            targetDailyPlans,
            rehabWeeks,
            allDailyPlans,
            allActions,
            allRoutines,
            allReports,
            allWeights,
            contextEvidence
        };
    },

    resolveAdviceTaskModel(options = {}) {
        if (typeof options === 'string') {
            options = { prompt: options };
        }
        if (options && typeof options === 'object' && options.model && options.model !== '__current__') {
            return options.model;
        }
        const aiInstance = typeof ai !== 'undefined' ? ai : (typeof window !== 'undefined' ? window.ai : null);
        const hasImage = !!(
            options?.hasImage ||
            (Array.isArray(options?.attachments) && options.attachments.some(att => att && (att.kind === 'image' || att.type === 'image') && att.status !== 'failed')) ||
            (typeof this.advicePickerTaskId === 'function' && this.advicePickerTaskId() === 'advice.vision') ||
            (Array.isArray(this._adviceAttachments) && this._adviceAttachments.some(att => att && att.kind === 'image' && att.status !== 'failed'))
        );
        const taskId = options?.taskId || (hasImage ? 'advice.vision' : 'advice.chat');
        const routeOverride = (typeof window !== 'undefined' && window.aiRoutingPure?.manualFallbackTarget?.(options?.routeOverride)) || options?.routeOverride || null;

        let routedModel = '';
        if (aiInstance) {
            if (typeof aiInstance.resolveTaskConfig === 'function') {
                const effective = aiInstance.resolveTaskConfig(taskId, routeOverride);
                routedModel = effective?.model || '';
            } else if (typeof aiInstance.getEffectiveConfig === 'function') {
                const effective = aiInstance.getEffectiveConfig();
                routedModel = effective?.model || '';
            } else if (aiInstance.cfg) {
                routedModel = aiInstance.cfg.model || '';
            }
        }
        if (routedModel && routedModel !== '__current__') {
            return routedModel;
        }
        const fallback = (this.adviceModel && this.adviceModel !== '__current__' ? this.adviceModel : '')
            || (typeof window !== 'undefined' && window.advicePanel?.adviceModel && window.advicePanel.adviceModel !== '__current__' ? window.advicePanel.adviceModel : '')
            || (aiInstance?.cfg?.model && aiInstance.cfg.model !== '__current__' ? aiInstance.cfg.model : '');
        return fallback;
    },

    getAdviceContextEvidence(promptOrOptions = '') {
        let prompt = '';
        let mode = this.adviceContextMode || 'auto';
        let options = {};
        if (typeof promptOrOptions === 'object' && promptOrOptions !== null) {
            options = promptOrOptions;
            prompt = options.prompt || '';
            mode = options.mode || options.contextMode || mode;
        } else if (typeof promptOrOptions === 'string' && promptOrOptions) {
            prompt = promptOrOptions;
        } else {
            try {
                const el = typeof document !== 'undefined' ? (document.getElementById?.('advicePrompt') || document.getElementById?.('adviceEditPrompt')) : null;
                if (el && typeof el.value === 'string' && el.value.trim()) {
                    prompt = el.value.trim();
                } else if (typeof this._adviceDraft === 'string' && this._adviceDraft.trim()) {
                    prompt = this._adviceDraft.trim();
                }
            } catch (e) {}
        }
        const effectiveModel = this.resolveAdviceTaskModel
            ? this.resolveAdviceTaskModel(options)
            : (options.model && options.model !== '__current__'
                ? options.model
                : (typeof window !== 'undefined' && window.ai?.resolveTaskConfig?.(this.advicePickerTaskId?.() || 'advice.chat')?.model) || '');
        const msgs = this.buildAdviceMessages(prompt, effectiveModel, { ...options, contextMode: mode });
        return msgs?.contextEvidence || null;
    },

    buildAdviceMessages(prompt, model, options = {}) {
        const rawMode = options.contextMode || this.adviceContextMode || 'auto';
        const requested = ['auto', 'light', 'none'].includes(rawMode) ? rawMode : 'auto';
        let effectiveModel = (model && model !== '__current__') ? model : '';
        if (!effectiveModel) {
            effectiveModel = this.resolveAdviceTaskModel
                ? this.resolveAdviceTaskModel(options)
                : ((options?.model && options.model !== '__current__')
                    ? options.model
                    : (typeof window !== 'undefined' && window.ai?.resolveTaskConfig?.(this.advicePickerTaskId?.() || 'advice.chat')?.model) || '');
        }
        const isSmallModel = !effectiveModel || /web|browser|网页|proxy|中转|local|ollama|7b|8b|14b/i.test(String(effectiveModel));
        const budget = isSmallModel ? 8000 : 18000;
        const build = (mode) => {
            const { contexts, focus } = this.resolveAdviceContexts(prompt, mode);
            const dataSummary = this.queryContextData({ prompt, mode, contexts, ...options });
            const {
                range, rangeLabel, today, targetDate,
                rangeHistory, rangeFoods, rangeExerciseLogs, rangeWeights,
                rangeDailyPlans, futureDailyPlans,
                todayHistory, todayFoods, todayExerciseLogs, todayWeights, todayDailyPlans,
                targetHistory, targetFoods, targetExerciseLogs, targetWeights, targetDailyPlans,
                rehabWeeks, allActions, allRoutines, allReports, allWeights,
                contextEvidence
            } = dataSummary;

            const includeReports = !!(contexts.training || contexts.diet || focus.broad);
            const rangeReports = includeReports ? allReports.filter(r => {
                const dKey = r.periodEnd || r.periodStart || r.generatedAt || today;
                if (contextEvidence.startDate && dKey < contextEvidence.startDate) return false;
                if (contextEvidence.endDate && dKey > contextEvidence.endDate) return false;
                return true;
            }) : [];
            const trendWeights = contexts.weight ? allWeights.slice(mode === 'light' ? -10 : -30) : [];

            const dietGoal = contexts.goal ? (this.db?.health?.dietGoal || {}) : {};
            const bodyPlan = contexts.goal ? (this.db?.health?.bodyPlan || {}) : {};
            const weightPlan = contexts.goal ? (this.db?.health?.weightPlan || {}) : {};

            const sumMacros = list => list.reduce((a, f) => { a.cal += Number(f.cal || 0); a.pro += Number(f.pro || 0); a.carb += Number(f.carb || 0); a.fat += Number(f.fat || 0); return a; }, { cal: 0, pro: 0, carb: 0, fat: 0 });
            const todayMacros = sumMacros(todayFoods);
            const rangeMacros = sumMacros(rangeFoods);
            const targetMacros = sumMacros(targetFoods);

            const formatTraining = list => list.map(h => {
                const mins = Math.floor((h.duration || 0) / 60), secs = (h.duration || 0) % 60;
                const names = (typeof this.historyNames === 'function' ? this.historyNames(h) : (h.actions || []).map(a => a.name || '未命名')).join('、');
                const metaParts = [];
                if (h.id) metaParts.push(`ID:${h.id}`);
                if (h.source) metaParts.push(`来源:${h.source}`);
                if (h.rpe) metaParts.push(`RPE:${h.rpe}`);
                if (h.manualStop) metaParts.push('中途停止');
                if (h.stopReason) metaParts.push(`中止原因:${h.stopReason}`);
                if (h.discomfort) {
                    const disc = typeof h.discomfort === 'object' ? (h.discomfort.details || h.discomfort.type || JSON.stringify(h.discomfort)) : String(h.discomfort);
                    metaParts.push(`不适:${disc}`);
                }
                if (h.type === 'cardio') {
                    metaParts.push(`${Math.round(h.cardio?.calories || 0)} kcal · ${h.cardio?.type || h.cardio?.name || '有氧'}`);
                } else {
                    const rawActions = h.actions || [];
                    const maxActions = mode === 'light' ? 4 : 8;
                    let selectedActions = rawActions;
                    if (rawActions.length > maxActions) {
                        const scoredActs = rawActions.map((a, originalIndex) => {
                            let score = 0;
                            const pain = Number(a.painScore ?? 0);
                            if (pain >= 4) score += 100 + pain;
                            else if (pain > 0) score += 50 + pain;
                            if (a.discomfort) score += 60;
                            if (a.manualStop) score += 50;
                            return { a, score, originalIndex };
                        });
                        scoredActs.sort((x, y) => y.score - x.score || x.originalIndex - y.originalIndex);
                        const topActs = scoredActs.slice(0, maxActions);
                        topActs.sort((x, y) => x.originalIndex - y.originalIndex);
                        selectedActions = topActs.map(x => x.a);
                        const omittedActs = scoredActs.slice(maxActions);
                        const omittedConstraints = [];
                        for (const { a } of omittedActs) {
                            const constraints = [];
                            const pain = Number(a.painScore ?? 0);
                            if (pain >= 4) constraints.push(`疼痛${pain}分`);
                            if (a.painPart) constraints.push(a.painPart);
                            if (a.discomfort) constraints.push(`不适:${typeof a.discomfort === 'string' ? a.discomfort : (a.discomfort?.details || a.discomfort?.detail || '')}`);
                            if (a.manualStop) constraints.push('中途停止');
                            if (constraints.length) {
                                omittedConstraints.push(`【${a.name || '动作'}】(${constraints.join('/')})`);
                            }
                        }
                        if (contextEvidence && Array.isArray(contextEvidence.truncations)) {
                            if (omittedConstraints.length) {
                                contextEvidence.truncations.push(`训练记录(${h.date})共${rawActions.length}个动作，已展示${maxActions}个；因长度限制折叠的受限动作必须遵守：${omittedConstraints.join('；')}`);
                            } else {
                                contextEvidence.truncations.push(`训练记录(${h.date})共${rawActions.length}个动作，已优先保留关键动作，其余${rawActions.length - maxActions}个动作已裁剪`);
                            }
                        }
                        selectedActions._omittedConstraints = omittedConstraints;
                    }
                    let actionDetails = selectedActions.map(a => {
                        const matchingActualSets = Array.isArray(h.actualSets)
                            ? h.actualSets.filter(s => (s.action || s.name || s.actionName) === a.name)
                            : [];
                        let actual = null;
                        if (matchingActualSets.length > 0) {
                            actual = matchingActualSets.length;
                        } else if (a.doneSets != null) {
                            actual = a.doneSets;
                        } else if (h.manualStop || a.manualStop) {
                            actual = 0;
                        } else if (Array.isArray(a.sets)) {
                            actual = a.sets.filter(s => s?.completed !== false).length;
                        } else if (a.status === 'done' || a.completed === true) {
                            actual = typeof a.sets === 'number' ? a.sets : 1;
                        }
                        const planned = a.plannedSets || a.specSets || (a.spec?.sets) || (typeof a.sets === 'number' ? a.sets : null);
                        const setStr = (actual != null && planned != null && actual !== planned)
                            ? `${actual}/${planned}组`
                            : (actual != null ? `${actual}组` : (planned != null ? `计划${planned}组` : ''));
                        const extras = [];
                        if (matchingActualSets.length > 0) {
                            const setSummaries = matchingActualSets.map(s => {
                                const parts = [];
                                if (s.reps != null) parts.push(`${s.reps}次`);
                                const weightVal = s.weightKg != null ? s.weightKg : s.weight;
                                if (weightVal != null && Number(weightVal) > 0) parts.push(`${weightVal}kg`);
                                if (s.rpe != null) parts.push(`RPE${s.rpe}`);
                                return `第${s.setIdx || 1}组:${parts.join('@') || '完成'}`;
                            });
                            extras.push(setSummaries.join('; '));
                        }
                        if (a.painScore != null && Number(a.painScore) > 0) extras.push(`痛${a.painScore}`);
                        if (a.painPart) extras.push(a.painPart);
                        return `${a.name || '动作'}${setStr ? '(' + setStr + (extras.length ? ',' + extras.join('/') : '') + ')' : ''}`;
                    }).join('、');
                    if (selectedActions._omittedConstraints && selectedActions._omittedConstraints.length) {
                        actionDetails += ` [因长度限制折叠关键动作: ${selectedActions._omittedConstraints.join('；')}]`;
                    }
                    metaParts.push(actionDetails || `${(h.actions || []).length}个动作`);
                }
                if (h.note) metaParts.push(`备注:${h.note}`);
                return `- ${h.date}｜训练时长 ${mins}分${secs}秒｜项目 ${names || '未命名'}｜${metaParts.join('｜')}`;
            }).join('\n');

            const formatFoods = list => list.map(f => {
                const meal = f.meal === 'breakfast' ? '早餐' : f.meal === 'lunch' ? '午餐' : f.meal === 'dinner' ? '晚餐' : '加餐';
                const extras = [];
                if (f.fiber) extras.push(`纤维${Number(f.fiber || 0).toFixed(1)}g`);
                if (f.sugar) extras.push(`糖${Number(f.sugar || 0).toFixed(1)}g`);
                if (f.sodium) extras.push(`钠${Number(f.sodium || 0).toFixed(0)}mg`);
                if (f.source) extras.push(`来源:${f.source}`);
                if (f.confidence) extras.push(`置信${f.confidence}%`);
                if (Array.isArray(f.ingredients) && f.ingredients.length) extras.push(`配料:${f.ingredients.slice(0, 5).join('、')}`);
                if (f.cooking) extras.push(`烹饪:${f.cooking}`);
                if (f.note) extras.push(`备注:${f.note}`);
                return `- ${f.date}｜${meal}｜${f.name}${f.grams ? ' ' + f.grams + 'g' : ''}｜${f.cal} kcal｜P${Number(f.pro || 0).toFixed(0)} C${Number(f.carb || 0).toFixed(0)} F${Number(f.fat || 0).toFixed(0)}${extras.length ? '｜' + extras.join('｜') : ''}`;
            }).join('\n');

            const formatExerciseLogs = list => list.map(e => {
                const label = this.exerciseLabel?.(e.type, e) || e.customName || e.name || e.type || '运动';
                const details = [`${Number(e.minutes || 0)}分钟`, `${Number(e.calories || 0)} kcal`];
                if (e.distance) details.push(`${e.distance}km`);
                if (e.type === 'strength') {
                    if (e.weightKg) details.push(`${e.weightKg}kg`);
                    if (e.sets || e.repsPerSet) details.push(`${Number(e.sets || 0)}组${e.repsPerSet ? `×${Number(e.repsPerSet || 0)}次` : ''}`);
                }
                if (e.note) details.push(`备注：${e.note}`);
                return `- ${e.date}｜${label}｜${details.join('｜')}`;
            }).join('\n');

            const formatWeightDateTime = w => {
                const measuredAt = w?.measuredAt ? new Date(w.measuredAt) : null;
                if (measuredAt && Number.isFinite(measuredAt.getTime())) {
                    const yyyy = measuredAt.getFullYear();
                    const mm = String(measuredAt.getMonth() + 1).padStart(2, '0');
                    const dd = String(measuredAt.getDate()).padStart(2, '0');
                    const hh = String(measuredAt.getHours()).padStart(2, '0');
                    const min = String(measuredAt.getMinutes()).padStart(2, '0');
                    return { at: `${yyyy}-${mm}-${dd} ${hh}:${min}`, note: '实测时间' };
                }
                return { at: `${w.date} 07:00`, note: '默认晨起空腹（未记录具体时刻）' };
            };

            const formatWeights = list => list.map(w => {
                const weight = Number(w.weight);
                const measured = formatWeightDateTime(w);
                return `- ${measured.at}｜${Number.isFinite(weight) ? weight.toFixed(2) : String(w.weight || '--')} kg｜时间:${measured.note}`;
            }).join('\n');

            const formatRehabWeekly = list => list.map(week => {
                const actions = (week.actions || []).map(a => `${a.name || '未命名'}[${a.actionId || '?'}]（${a.status || 'continued'}${a.painLevel ? `，疼痛${a.painLevel}/10` : ''}${a.needsReview ? '，需确认' : ''}${a.progressesFrom ? '，进阶自:' + a.progressesFrom : ''}${a.coachNote ? '，' + a.coachNote : ''}）`).join('；');
                const extras = [];
                if (week.visitDate) extras.push(`就诊:${week.visitDate}`);
                if (week.homework) extras.push(`作业:${week.homework}`);
                if (week.rawText) extras.push(`原文:${String(week.rawText).slice(0, 160)}`);
                const specs = (week.actions || []).map(a => a.spec ? `${a.name || '动作'}:${JSON.stringify(a.spec)}` : '').filter(Boolean).slice(0, 4);
                if (specs.length) extras.push(`规格:${specs.join('；')}`);
                return `- ${week.weekStart || week.visitDate || ''}｜${actions || '无动作明细'}${week.therapistAssessment ? '｜评估：' + week.therapistAssessment : ''}${extras.length ? '｜' + extras.join('｜') : ''}`;
            }).join('\n');

            const planTypeLabel = (type = '', title = '') => this.planTypeMeta?.(type, title)?.label || ({ rehab: '康复计划', cut: '减脂日程', bulk: '增肌日程', maintenance: '综合训练', custom: '自定义计划' }[type] || title || type || '训练计划');

            const formatDailyPlans = list => list.map(plan => {
                const items = (plan.items || []).filter(item => !item.deleted);
                const done = items.filter(item => item.status === 'done').length;
                const maxItems = mode === 'light' ? 5 : 10;
                let selectedItems = items;
                if (items.length > maxItems) {
                    const scored = items.map((item, originalIndex) => {
                        const fb = item.feedback || {};
                        const pain = Number(fb.painScore ?? fb.painLevel ?? 0);
                        let score = 0;
                        if (pain >= 4) score += 100 + pain;
                        else if (pain > 0) score += 50 + pain;
                        if (fb.unsuitable) score += 80;
                        if (fb.noIncrease) score += 75;
                        if (fb.keepNextTime) score += 70;
                        if (fb.wantsContinue === false) score += 70;
                        if (item.manualStop || item.stopReason || item.discomfort) score += 60;
                        if (fb.rpe >= 4) score += 40;
                        if (item.userOverride) score += 30;
                        if (item.status === 'in-progress') score += 20;
                        return { item, score, originalIndex };
                    });
                    scored.sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex);
                    const topScored = scored.slice(0, maxItems);
                    topScored.sort((a, b) => a.originalIndex - b.originalIndex);
                    selectedItems = topScored.map(s => s.item);

                    const omitted = scored.slice(maxItems);
                    const omittedCount = omitted.length;
                    const omittedConstraints = [];
                    for (const { item } of omitted) {
                        const fb = item.feedback || {};
                        const constraints = [];
                        const pain = Number(fb.painScore ?? fb.painLevel ?? item.painScore ?? item.painLevel ?? 0);
                        if (pain >= 4) constraints.push(`疼痛${pain}分`);
                        if (fb.painPart || item.painPart) constraints.push(`部位:${fb.painPart || item.painPart}`);
                        if (fb.noIncrease || item.noIncrease) constraints.push('不加量');
                        if (fb.keepNextTime || item.keepNextTime) constraints.push('下次维持');
                        if (fb.unsuitable || item.unsuitable) constraints.push('不适合');
                        if (fb.wantsContinue === false || item.wantsContinue === false) constraints.push('不想继续');
                        if (item.manualStop || fb.manualStop) constraints.push('中途停止');
                        const stopReason = item.stopReason || fb.stopReason;
                        if (stopReason) constraints.push(`中止原因:${stopReason}`);
                        const disc = item.discomfort || fb.discomfort;
                        const discText = typeof disc === 'string' ? disc : (disc?.details || disc?.detail || disc?.type || '');
                        if (discText) constraints.push(`不适:${discText}`);
                        if (item.status === 'in-progress' && !item.manualStop && !stopReason) constraints.push('未完成');
                        if (constraints.length) {
                            omittedConstraints.push(`【${item.name || '未命名'}】(${constraints.join('、')})`);
                        }
                    }
                    if (contextEvidence && Array.isArray(contextEvidence.truncations)) {
                        if (omittedConstraints.length) {
                            contextEvidence.truncations.push(`日计划(${plan.date})共${items.length}项动作，已展示${maxItems}项；因长度限制折叠的受限动作必须遵守：${omittedConstraints.join('；')}`);
                        } else {
                            contextEvidence.truncations.push(`日计划(${plan.date})共${items.length}项动作，已展示${maxItems}项；其余${omittedCount}项普通动作已裁剪`);
                        }
                    }
                    selectedItems._omittedConstraints = omittedConstraints;
                }
                const briefItemsList = selectedItems.map(item => {
                    const spec = item.spec || {};
                    const plannedSets = spec.sets != null ? Number(spec.sets) : null;
                    const actualSets = item.doneSets != null ? Number(item.doneSets) : null;
                    const setsText = (actualSets != null && plannedSets != null && actualSets !== plannedSets)
                        ? `实做${actualSets}/计${plannedSets}组`
                        : (actualSets != null ? `完成${actualSets}组` : (plannedSets != null ? `${plannedSets}组` : ''));
                    const repsText = spec.reps ? `${spec.reps}次` : '';
                    const workText = spec.work ? `${spec.work}秒` : '';
                    const levelText = item.currentLevel ? `L${item.currentLevel}` : '';
                    const fb = item.feedback || {};
                    const fbParts = [];
                    if (fb.rpe) fbParts.push(`RPE${fb.rpe}`);
                    if (fb.painScore != null && Number(fb.painScore) > 0) fbParts.push(`疼痛${fb.painScore}分(${fb.painPart || '未注部位'})`);
                    if (fb.noIncrease) fbParts.push('不加量');
                    if (fb.keepNextTime) fbParts.push('下次维持');
                    if (fb.unsuitable) fbParts.push('不适合');
                    if (fb.wantsContinue === true) fbParts.push('意愿继续');
                    else if (fb.wantsContinue === false) fbParts.push('不想继续');
                    if (fb.note) fbParts.push(`反馈:${fb.note}`);
                    const stopParts = [];
                    if (item.manualStop) stopParts.push('中途停止');
                    if (item.stopReason) stopParts.push(`中止原因:${item.stopReason}`);
                    if (item.discomfort) {
                        const disc = typeof item.discomfort === 'object' ? (item.discomfort.details || item.discomfort.type || JSON.stringify(item.discomfort)) : String(item.discomfort);
                        stopParts.push(`不适:${disc}`);
                    }
                    const overrideText = item.userOverride ? '[已锁定]' : '';
                    const details = [setsText, repsText, workText, levelText, overrideText, ...fbParts, ...stopParts, item.aiReasoning ? `原因:${item.aiReasoning}` : ''].filter(Boolean).join(' ');
                    const taskId = item.id ? `[${item.id}]` : '';
                    return `${item.name || '未命名任务'}${taskId}(${item.status || 'todo'}${details ? '，' + details : ''})`;
                });
                if (selectedItems._omittedConstraints && selectedItems._omittedConstraints.length) {
                    briefItemsList.push(`[因长度限制折叠受限动作必须遵守:${selectedItems._omittedConstraints.join('、')}]`);
                }
                const briefItems = briefItemsList.join('；');
                const title = plan.title && plan.title !== planTypeLabel(plan.type, plan.title) ? `｜标题:${plan.title}` : '';
                return `- ${plan.date}｜${planTypeLabel(plan.type, plan.title)}${title}｜${done}/${items.length}完成｜来源:${plan.source || 'manual'}${plan.notes ? '｜备注:' + plan.notes : ''}${briefItems ? '｜任务:' + briefItems : ''}`;
            }).join('\n');

            const formatWeeklyPlan = () => {
                const labels = [['mon', '周一'], ['tue', '周二'], ['wed', '周三'], ['thu', '周四'], ['fri', '周五'], ['sat', '周六'], ['sun', '周日']];
                const plan = this.db?.weeklyPlan || {};
                return labels.map(([key, label]) => {
                    const routine = allRoutines.find(r => r.id === plan[key]);
                    return routine ? `- ${label}｜${routine.name || '未命名方案'}｜${(routine.actions || []).slice(0, 8).map(a => a.name || '未命名').join('、')}` : '';
                }).filter(Boolean).join('\n');
            };

            const formatCurrentActions = () => allActions.filter(a => !a.libOnly).slice(0, mode === 'light' ? 8 : 16).map(a => `- ${a.name || '未命名'}${a.tags?.length ? '｜标签:' + a.tags.join('、') : ''}${a.note ? '｜备注:' + a.note : ''}`).join('\n');
            const formatRoutines = () => allRoutines.slice(0, mode === 'light' ? 5 : 10).map(r => `- ${r.name || '未命名方案'}｜${(r.actions || []).length}个动作｜${(r.actions || []).slice(0, 8).map(a => a.name || '未命名').join('、')}${r.note ? '｜备注:' + r.note : ''}`).join('\n');
            const formatGoalPlans = () => {
                const lines = [];
                if (dietGoal && Object.keys(dietGoal).length) lines.push(`饮食目标:${JSON.stringify(dietGoal)}`);
                if (bodyPlan && Object.keys(bodyPlan).length) lines.push(`身体目标计划:${JSON.stringify(bodyPlan)}`);
                if (weightPlan && Object.keys(weightPlan).length) lines.push(`体重目标计划:${JSON.stringify(weightPlan)}`);
                if (this.db?.health?.weeklyGoalSessions) lines.push(`每周训练目标:${this.db.health.weeklyGoalSessions}次`);
                return lines.join('\n');
            };

            const formatReports = list => list.slice(0, mode === 'light' ? 2 : 4).map(r => `- ${r.kind || 'report'}｜${r.periodStart || ''}-${r.periodEnd || ''}｜${r.ai?.summary || r.summary || ''}${r.ai?.highlights?.length ? '｜重点:' + r.ai.highlights.join('、') : ''}${r.ai?.suggestions?.length ? '｜建议:' + r.ai.suggestions.join('、') : ''}`).join('\n');
            const enabledLabels = [contexts.diet && '饮食', contexts.training && '训练', contexts.weight && '体重', contexts.goal && '目标'].filter(Boolean).join('、') || '无';
            const prefResult = window.dataAiTemplates?.buildPromptMessages('advice_general', {}, this.db) || {};
            const focusLine = focus.hasFocus ? `问题重点：${focus.label}。请优先回答这个重点；除非用户明确要求，不要主动展开非重点维度。\n` : '';
            const sys = `当前启用的分析维度：${enabledLabels}。上下文模式：${mode === 'light' ? '轻量' : mode === 'none' ? '仅提问' : '自动'}。${focusLine}未启用的维度不会提供数据，请不要编造，也不要要求用户开启。\n` + (prefResult.messages?.[0]?.content || '');
            const dataBlocks = [];
            if (targetDate && mode !== 'none') dataBlocks.push(`【优先分析日期】\n${targetDate}`);
            if (contexts.training && targetDate) dataBlocks.push(`【该日期训练记录】\n${formatTraining(targetHistory) || '该日期无训练记录'}`);
            if (contexts.diet && targetDate) { dataBlocks.push(`【该日期饮食记录】\n${formatFoods(targetFoods) || '该日期无饮食记录'}`); dataBlocks.push(`【该日期宏量营养】\n蛋白 ${targetMacros.pro.toFixed(1)}g / 碳水 ${targetMacros.carb.toFixed(1)}g / 脂肪 ${targetMacros.fat.toFixed(1)}g`); }
            if (contexts.weight && targetDate) dataBlocks.push(`【该日期体重记录】\n${formatWeights(targetWeights) || '该日期无体重记录'}`);
            const targetExerciseText = formatExerciseLogs(targetExerciseLogs);
            const todayExerciseText = formatExerciseLogs(todayExerciseLogs);
            const rangeExerciseText = formatExerciseLogs(rangeExerciseLogs);
            if (contexts.training && targetDate) dataBlocks.push(`【该日期手动运动】\n${targetExerciseText || '该日期无手动运动记录'}`);
            if (contexts.training && targetDate) dataBlocks.push(`【该日期训练计划】\n${formatDailyPlans(targetDailyPlans) || '该日期无训练计划'}`);
            if (contexts.diet) { dataBlocks.push(`【今日饮食记录】\n${formatFoods(todayFoods) || '今日无饮食记录'}`); dataBlocks.push(`【今日宏量营养】\n摄入 ${todayMacros.cal || 0} kcal · 蛋白 ${todayMacros.pro.toFixed(1)}g / 碳水 ${todayMacros.carb.toFixed(1)}g / 脂肪 ${todayMacros.fat.toFixed(1)}g`); dataBlocks.push(`【${rangeLabel}饮食记录】\n${formatFoods(rangeFoods) || `${rangeLabel}暂无饮食记录`}`); dataBlocks.push(`【${rangeLabel}宏量营养】\n蛋白 ${rangeMacros.pro.toFixed(1)}g / 碳水 ${rangeMacros.carb.toFixed(1)}g / 脂肪 ${rangeMacros.fat.toFixed(1)}g`); }
            if (contexts.training) {
                dataBlocks.push(`【${rangeLabel}训练记录】\n${formatTraining(rangeHistory) || `${rangeLabel}暂无训练记录`}`);
                dataBlocks.push(`【${rangeLabel}手动运动】\n${rangeExerciseText || `${rangeLabel}暂无手动运动记录`}`);
                dataBlocks.push(`【${rangeLabel}训练计划】\n${formatDailyPlans(rangeDailyPlans) || `${rangeLabel}暂无训练计划`}`);
                if (futureDailyPlans.length) {
                    dataBlocks.push(`【未来训练安排】\n${formatDailyPlans(futureDailyPlans)}`);
                }
                dataBlocks.push(`【周计划绑定】\n${formatWeeklyPlan() || '暂无周计划绑定'}`);
                dataBlocks.push(`【当前动作计划】\n${formatCurrentActions() || '暂无当前动作计划'}`);
                dataBlocks.push(`【方案库摘要】\n${formatRoutines() || '暂无保存方案'}`);
                dataBlocks.push(`【近${mode === 'light' ? '3' : '6'}个版本康复中心处方】\n${formatRehabWeekly(rehabWeeks) || '暂无康复中心处方'}\n规则：优先遵守最近3个版本；更早处方用于理解长期禁忌、反复疼痛和动作演变。`);
            }
            if (contexts.weight) { dataBlocks.push(`【${rangeLabel}体重记录】\n${formatWeights(rangeWeights) || `${rangeLabel}暂无体重记录`}`); if (range === 'today' && trendWeights.length) dataBlocks.push(`【近${trendWeights.length}条体重记录（用于趋势分析）】\n${formatWeights(trendWeights)}`); }
            if (contexts.goal) dataBlocks.push(`【目标与计划】\n${formatGoalPlans() || '暂无目标计划'}`);
            if (rangeReports.length) dataBlocks.push(`【近期报告摘要】\n${formatReports(rangeReports)}`);

            const blocks = [`分析范围：${rangeLabel}`, `用户提问：${prompt}`];
            const profile = this.db?.health?.profile || {}, profileLines = [];
            const _typeMap = { injury: '运动损伤', chronic: '慢性病', allergy: '过敏', surgery: '手术史', medication: '用药', other: '其他' };
            if (mode !== 'none') {
                if (profile.gender || profile.age) profileLines.push(`基础：${profile.gender === 'female' ? '女' : '男'} · ${profile.age || '?'} 岁${this.db?.health?.height ? ' · 身高 ' + this.db.health.height + ' cm' : ''}`);
                if (focus.profileMode === 'full' && profile.conditions?.length) { profileLines.push('诊断结果：'); profile.conditions.forEach(c => profileLines.push(`  - [${_typeMap[c.type] || c.type}] ${c.label}${c.severity ? '（' + c.severity + '）' : ''}${c.bodyPart ? '；部位：' + c.bodyPart : ''}${c.avoid?.length ? '；避免：' + c.avoid.join('、') : ''}${c.note ? '；备注：' + c.note : ''}`)); }
                if (focus.profileMode === 'full' && profile.examResults?.length) { profileLines.push('检查结果：'); profile.examResults.forEach(exam => profileLines.push(`  - ${exam.item || '检查'}${exam.date ? '（' + exam.date + '）' : ''}${exam.bodyPart ? '；部位：' + exam.bodyPart : ''}${exam.conditionLabel ? '；关联诊断：' + exam.conditionLabel : ''}${exam.result ? '；结果：' + exam.result : ''}${exam.note ? '；备注：' + exam.note : ''}`)); }
                if (contexts.diet && profile.allergies?.length) profileLines.push(`过敏/不耐受：${profile.allergies.join('、')}`);
                if (contexts.training && profile.preferences?.equipment?.length) profileLines.push(`可用器材：${profile.preferences.equipment.join('、')}`);
                if (contexts.training && profile.preferences?.sports?.length) profileLines.push(`偏好运动：${profile.preferences.sports.join('、')}`);
                if (contexts.training && profile.vitals?.restingHR) profileLines.push(`静息心率：${profile.vitals.restingHR} bpm`);
            }
            if (profileLines.length) blocks.unshift(`【健康档案（必须遵守）】\n${profileLines.join('\n')}`);
            if (mode === 'none') blocks.push('【上下文说明】\n本次仅发送用户问题，不附带训练、饮食、体重或目标记录。');
            if (mode === 'light' && contextEvidence.truncations && contextEvidence.truncations.length) {
                blocks.push(`【数据范围与裁剪说明】\n分析范围：${rangeLabel}（轻量模式：${contextEvidence.truncations.join('；')}）`);
            }
            blocks.push(...dataBlocks);
            const conversationRaw = (typeof this.adviceConversationContext === 'function') ? this.adviceConversationContext(mode === 'none' ? 0 : mode === 'light' ? 2 : 8) : [];
            const conversation = Array.isArray(conversationRaw) ? conversationRaw : [];
            const activeTemplate = this.getActiveAdviceTemplate?.() || null;
            const structuredScenarios = new Set(['plan_generate', 'weekly_report', 'monthly_report', 'food_parse_text', 'food_parse_image', 'body_goal_plan', 'rehab_weekly_parse', 'food_alias_merge', 'insight_advice']);
            const templateScenario = String(activeTemplate?.scenario || '').trim();
            const templateText = `${activeTemplate?.system || ''}\n${activeTemplate?.user || ''}`;
            const structuredTemplate = structuredScenarios.has(templateScenario) || /只输出严格 JSON|训练日程计划助手|"plans"\s*:|"items"\s*:/.test(templateText);
            const template = activeTemplate && !structuredTemplate ? activeTemplate : null;
            let resultMessages = [];
            if (template) {
                const vars = this.buildAdviceTemplateVars?.({ prompt, range, blocks, today, todayFoods, todayHistory, todayExerciseLogs, todayExerciseText, todayManualExercises: todayExerciseText, todayWeights, todayDailyPlans, rangeFoods, rangeHistory, rangeExerciseLogs, rangeExerciseText, manualExercises: rangeExerciseText, rangeWeights, rangeDailyPlans, targetExerciseLogs, targetExerciseText, targetManualExercises: targetExerciseText, targetDailyPlans }) || {};
                resultMessages = [{ role: 'system', content: String(template.system || '').trim() || sys }, ...conversation, { role: 'user', content: this.applyAdviceTemplate?.(template.user || '{prompt}', vars) || blocks.join('\n\n') }];
            } else {
                resultMessages = [{ role: 'system', content: sys }, ...conversation, { role: 'user', content: blocks.join('\n\n') }];
            }
            resultMessages.contextEvidence = contextEvidence;
            return resultMessages;
        };
        if (requested !== 'auto') {
            const res = build(requested);
            res.contextEvidence = res.contextEvidence || res[res.length - 1]?.contextEvidence;
            return res;
        }
        const full = build('auto');
        const chars = full.reduce((n, m) => n + String(m?.content || '').length, 0);
        if (chars <= budget) {
            return full;
        }
        return build('light');
    },

    classifyAdviceFailure(error, messages = [], model = '') {
        const raw = String(error?.message || error || ''), lower = raw.toLowerCase(), status = Number(error?.status || raw.match(/AI 请求失败:\s*(\d{3})/)?.[1] || 0);
        const code = String(error?.code || '');
        const body = String(error?.body || '').slice(0, 800);
        const type = code === 'AI_TIMEOUT' ? 'timeout'
            : code === 'NETWORK_ERROR' || /failed to fetch|network|load failed/i.test(raw) ? 'network'
                : status === 429 ? 'rate_limit'
                    : status === 401 || status === 403 ? 'auth'
                        : status === 404 ? 'endpoint'
                            : status >= 500 ? 'upstream'
                                : status >= 400 ? 'request'
                                    : code || 'unknown';
        const contextFail = status === 413 || status === 414 || /context_length|maximum context|token limit|too many tokens|prompt too long|context.*exceed/.test(lower);
        const upstreamFail = [502, 503, 504].includes(status) || /server_error|upstream|bad gateway|gateway|timeout|upsy/.test(lower);
        const info = {
            type,
            status,
            code,
            message: raw.slice(0, 500),
            body,
            requestChars: messages.reduce((n, m) => n + String(m?.content || '').length, 0),
            possibleContextOverflow: contextFail || (upstreamFail && messages.reduce((n, m) => n + String(m?.content || '').length, 0) > Math.min(12000, /web|browser|网页|proxy|中转|local|ollama|7b|8b|14b/i.test(String(model || '')) ? 8000 : 12000)),
            failedAt: new Date().toISOString()
        };
        const content = contextFail ? '当前上下文超过模型限制，建议使用轻量上下文或仅提问重试。'
            : upstreamFail ? (info.possibleContextOverflow ? 'AI 服务返回上游错误，当前上下文较长，可能超过网页转 API 通道能力。' : 'AI 服务暂时不可用，可能是供应商或代理异常。')
                : status === 429 ? 'AI 请求被限流或额度不足，请稍后重试。'
                    : status === 401 || status === 403 ? 'AI 鉴权失败，请检查 API Key。'
                        : status === 404 ? 'AI 接口路径或模型不存在，请检查 Base URL 和模型名称。'
                            : type === 'network' ? '网络连接异常或后台切换导致请求中断，请回到前台后重试。'
                        : 'AI 请求失败，请重试或切换模型。';
        return { content, info };
    },

    renderAdviceErrorRecovery(msg = {}) {
        if (!msg?.error) return '';
        const safeId = this.escapeHtml?.(msg.id || '') || '';
        const safe = this.escapeHtml?.bind(this) || ((value) => String(value ?? ''));
        const info = msg.errorInfo || {};
        const hint = msg.errorInfo?.possibleContextOverflow ? '当前模型通道可能不适合长上下文，建议先用轻量上下文重试。' : '如果仍失败，请稍后重试或切换模型。';
        const rows = [
            ['错误分类', info.type || 'unknown'],
            ['HTTP 状态', info.status || '无'],
            ['提供商', msg.provider || info.provider || '未知'],
            ['模型', msg.model || info.model || '未知'],
            ['请求时间', info.startedAt || msg.at || '未知'],
            ['失败时间', info.failedAt || '未知'],
            ['前后台状态', `${info.visibilityState || 'unknown'}${info.wasBackgrounded ? '，曾切到后台' : ''}${info.pageHidden ? '，触发 pagehide' : ''}`],
            ['请求长度', info.requestChars ? `${info.requestChars} 字符` : '未知']
        ];
        const detailRows = rows.map(([k, v]) => `<div><strong>${safe(k)}</strong><span>${safe(v)}</span></div>`).join('');
        const raw = info.body || info.message || '';
        const details = `<details class="advice-error-details"><summary><span class="material-symbols-rounded">bug_report</span>查看失败详情</summary><div class="advice-error-detail-grid">${detailRows}</div>${raw ? `<pre>${safe(raw)}</pre>` : ''}</details>`;
        return `<div class="advice-error-recovery"><div class="advice-error-hint"><span class="material-symbols-rounded">tips_and_updates</span>${safe(hint)}</div>${details}<div class="advice-error-actions"><button type="button" onclick="data.retryAdviceFrom(0, '${safeId}', 'light')"><span class="material-symbols-rounded">compress</span>轻量重试</button><button type="button" onclick="data.retryAdviceFrom(0, '${safeId}', 'none')"><span class="material-symbols-rounded">short_text</span>仅提问</button><button type="button" onclick="data.openAdviceModelPicker?.()"><span class="material-symbols-rounded">tune</span>切换模型</button></div></div>`;
    },

    async requestAiAdvice(prompt, model) {
        const messages = this.buildAdviceMessages(prompt, model);
        if (!window.ai?.run) return await ai.call(messages, 2400);
        const cached = model ? (ai.models || []).find(item => item.id === model && item.profileId) : null;
        const routeOverride = model ? { profileId: cached?.profileId || ai.cfg.activeProfileId || '', modelId: model } : null;
        return await ai.run({ taskId: 'advice.chat', messages, maxTokens: 2400, routeOverride });
    },
});

if (typeof window !== 'undefined' && window.data) {
    if (typeof advicePanel.attach === 'function') {
        advicePanel.attach(window.data);
    }
    window.data.buildAdviceMessages = advicePanel.buildAdviceMessages.bind(window.data);
    window.data.detectAdviceFocus = advicePanel.detectAdviceFocus.bind(window.data);
    window.data.resolveAdviceContexts = advicePanel.resolveAdviceContexts.bind(window.data);
    window.data.parsePromptTargetDate = advicePanel.parsePromptTargetDate.bind(window.data);
    if (advicePanel.parsePromptAnalysisRange) {
        window.data.parsePromptAnalysisRange = advicePanel.parsePromptAnalysisRange.bind(window.data);
    }
    if (advicePanel.queryContextData) {
        window.data.queryContextData = advicePanel.queryContextData.bind(window.data);
    }
    if (advicePanel.resolveAdviceTaskModel) {
        window.data.resolveAdviceTaskModel = advicePanel.resolveAdviceTaskModel.bind(window.data);
    }
    if (advicePanel.getAdviceContextEvidence) {
        window.data.getAdviceContextEvidence = advicePanel.getAdviceContextEvidence.bind(window.data);
    }
}
