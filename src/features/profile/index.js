const PROFILE_VIEWS = new Set(['home', 'library', 'weightloss', 'ai', 'sync', 'experiments']);
const PROFILE_SURFACE_SELECTORS = [
    '#profileContent > *',
    '#profileSettings > .sync-card',
    '.profile-hero',
    '.v7-profile-card',
    '.health-profile-card',
    '.routine-tool',
    '.routine-card',
    '.action-card',
    '.plan-equipment-card',
    '.weightloss-plan-card'
].join(',');

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function profileHomeModel(data) {
    const history = typeof data?.activeRecords === 'function'
        ? data.activeRecords(data?.db?.history || [])
        : (Array.isArray(data?.db?.history) ? data.db.history.filter((item) => item && !item.deleted) : []);
    const weights = typeof data?.sortedWeights === 'function'
        ? data.sortedWeights()
        : (Array.isArray(data?.db?.health?.weights) ? data.db.health.weights.filter((item) => item && !item.deleted) : []);
    const latestWeight = weights.length ? Number(weights[weights.length - 1]?.weight) : NaN;
    const height = Number(data?.db?.profile?.height);
    const weekGoal = Number(data?.db?.health?.weeklyGoalSessions) || 5;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);
    const parseHistoryDate = typeof data?.parseHistoryDate === 'function'
        ? (value) => data.parseHistoryDate(value)
        : (value) => new Date(String(value || '').replace(' ', 'T'));
    const weekDone = history.filter((record) => {
        const parsed = parseHistoryDate(record?.date);
        return parsed instanceof Date && !Number.isNaN(parsed.getTime()) && parsed >= weekStart;
    }).length;
    const plans = typeof data?.activeRecords === 'function'
        ? data.activeRecords(data?.db?.dailyPlans || [])
        : (Array.isArray(data?.db?.dailyPlans) ? data.db.dailyPlans.filter((item) => item && !item.deleted) : []);
    const latestPlan = plans.slice().sort((a, b) => String(b?.date || '').localeCompare(String(a?.date || '')))[0] || null;
    const fallbackGoalType = data?.db?.health?.dietGoal?.goalType || data?.db?.health?.goalType || 'loss';
    const planGoal = {
        rehab: { label: '恢复训练', description: '稳定恢复并逐步回归训练' },
        bulk: { label: '力量增强', description: '循序提高力量与训练容量' },
        cut: { label: '减脂训练', description: '维持训练质量并稳步减脂' },
        maintenance: { label: '维持训练', description: '保持稳定训练与身体状态' },
        custom: { label: latestPlan?.title || '自定义训练', description: latestPlan?.title || '按当前自定义计划训练' }
    }[latestPlan?.type];
    const dietGoal = fallbackGoalType === 'gain'
        ? { label: '增肌', description: '稳定增肌并保持训练质量' }
        : fallbackGoalType === 'maintain'
            ? { label: '维持体重', description: '维持体重与稳定训练' }
            : { label: '减脂', description: '稳步减脂并保持训练能力' };
    const goal = planGoal || dietGoal;
    let recoveryScore = NaN;
    try {
        recoveryScore = typeof data?.recoveryIndex === 'function' ? Number(data.recoveryIndex(data.db)) : NaN;
    } catch {}
    const recoveryStatus = Number.isFinite(recoveryScore)
        ? recoveryScore >= 80 ? '良好' : recoveryScore >= 60 ? '稳定' : '需调整'
        : '待评估';
    let latestPainScore = NaN;
    let latestPainAt = -Infinity;
    plans.forEach((plan) => {
        (Array.isArray(plan?.items) ? plan.items : []).forEach((item) => {
            const score = Number(item?.feedback?.painScore);
            if (!Number.isFinite(score)) return;
            const at = Number(item?.feedback?.doneAt || item?.updatedAt || plan?.updatedAt || 0);
            if (at >= latestPainAt) {
                latestPainScore = score;
                latestPainAt = at;
            }
        });
    });
    const name = String(data?.db?.profile?.name || '').trim();
    const initial = name ? Array.from(name)[0] : 'R';
    return {
        initial,
        heightText: Number.isFinite(height) && height > 0 ? `${height}` : '—',
        weightText: Number.isFinite(latestWeight) ? latestWeight.toFixed(1) : '—',
        weekDone,
        weekGoal,
        totalSessions: history.length,
        goalLabel: goal.label,
        goalDescription: goal.description,
        recoveryStatus,
        painText: Number.isFinite(latestPainScore) ? `${latestPainScore}/10` : '未记录'
    };
}

function renderProfileVersionFooter(data) {
    if (typeof data?.renderProfileVersionFooter === 'function') {
        return data.renderProfileVersionFooter();
    }
    const host = /** @type {any} */ (globalThis);
    const version = data?.detectAppVersion?.()
        || (host?.appUpdate?.version ? `v${host.appUpdate.version}` : '')
        || '';
    const checking = Boolean(host?.appUpdate?.checking);
    return `<div class="profile-version-footer" id="profileVersionFooter">
        <div class="pvf-title">当前版本 ${escapeHtml(version || '--')}</div>
        <div class="pvf-sub">Service Worker · 离线缓存就绪</div>
        <div class="pvf-actions">
            <button type="button" class="pvf-action pvf-check" id="profileUpdateCheckBtn" onclick="data.checkAppUpdate?.()" ${checking ? 'disabled' : ''}>
                <span class="material-symbols-rounded">system_update</span><span class="pvf-check-label">${checking ? '检测中...' : '检测更新'}</span>
            </button>
            <button type="button" class="pvf-action pvf-copy" onclick="data.copyAppVersionInfo?.()">复制版本信息</button>
        </div>
    </div>`;
}

function renderProfileHome(root, data, view) {
    if (view !== 'home' || typeof root.querySelector !== 'function') return;
    const overview = root.querySelector('#profileOverview');
    if (!overview) return;
    const host = /** @type {any} */ (globalThis);
    const model = profileHomeModel(data);
    const version = data?.detectAppVersion?.()
        || (host?.appUpdate?.version ? `v${host.appUpdate.version}` : '')
        || '';
    const cachedSw = data?._cachedSwName || '';
    const signature = JSON.stringify([model, version, cachedSw]);
    if (overview.dataset.v7ProfileHomeSignature === signature && overview.querySelector('.v7-profile-home')) return;
    overview.dataset.v7ProfileHomeSignature = signature;
    overview.innerHTML = `<div class="v7-profile-home">
        <section class="v7-profile-card v7-profile-identity-card">
            <div class="v7-profile-identity-main">
                <div class="v7-profile-avatar" aria-hidden="true">${escapeHtml(model.initial)}</div>
                <div class="v7-profile-identity-copy"><h2>训练档案</h2><p>目标：${escapeHtml(model.goalDescription)}</p></div>
                <button class="v7-profile-edit" type="button" onclick="data.openProfileModal?.()">编辑</button>
            </div>
            <div class="v7-profile-identity-stats">
                <span><small>体重</small><b>${model.weightText}${model.weightText === '—' ? '' : ' kg'}</b></span>
                <span><small>本周训练</small><b>${model.weekDone} 次</b></span>
                <span><small>恢复状态</small><b>${escapeHtml(model.recoveryStatus)}</b></span>
            </div>
        </section>

        <div class="v7-profile-section-title">健康档案</div>
        <section class="v7-profile-card v7-profile-health-card">
            <div class="v7-profile-health-metrics">
                <span><small>身高</small><b>${model.heightText}${model.heightText === '—' ? '' : '<em> cm</em>'}</b></span>
                <span><small>体重</small><b>${model.weightText}${model.weightText === '—' ? '' : '<em> kg</em>'}</b></span>
                <span><small>目标</small><b>${escapeHtml(model.goalLabel)}</b></span>
            </div>
            <div class="v7-profile-health-footer"><span>基础信息、伤病史、偏好与检查结果</span><button type="button" onclick="data.openProfileModal?.()">查看 ›</button></div>
        </section>

        <div class="v7-profile-section-title">设置与服务</div>
        <section class="v7-profile-card v7-profile-service-list">
            <button class="v7-profile-service-row" type="button" onclick="data.setRoutineView('library')"><span><b>训练计划</b><small>方案 / 动作库</small></span><em>›</em></button>
            <button class="v7-profile-service-row" type="button" onclick="data.setRoutineView('ai')"><span><b>AI 设置与语音</b><small>模型 / API Key / 语音设置</small></span><em>›</em></button>
            <button class="v7-profile-service-row" type="button" onclick="data.setRoutineView('sync')"><span><b>设备与同步</b><small>S3 / WebDAV / 备份与导出</small></span><em>›</em></button>
            <button class="v7-profile-service-row" type="button" onclick="theme.openSheet()"><span><b>外观与偏好</b><small>主题 / 明暗 / 动效模式</small></span><em>›</em></button>
            <details class="v7-profile-more-settings">
                <summary><span><b>更多设置</b><small>目标、语音、实验、调试与版本</small></span><em>›</em></summary>
                <div class="v7-profile-more-actions">
                    <button type="button" onclick="data.openProfileModal?.()">健康档案</button>
                    <button type="button" onclick="data.setRoutineView('weightloss')">目标 &amp; 体型</button>
                    <button type="button" onclick="workoutVoice.openSettings()">语音</button>
                    <button type="button" onclick="data.setRoutineView('experiments')">实验功能</button>
                    <button type="button" onclick="data.toggleDebugTools?.()">调试工具</button>
                    <button type="button" onclick="data.checkAppUpdate?.()">检测更新</button>
                </div>
            </details>
        </section>

        <section class="v7-profile-card v7-profile-status-card">
            <small>恢复状态</small>
            <div><span><b>${escapeHtml(model.recoveryStatus)}</b><small>恢复评估</small></span><span><b>${escapeHtml(model.painText)}</b><small>疼痛反馈</small></span><button type="button" onclick="ui.tab('records')">查看趋势</button></div>
        </section>

        ${renderProfileVersionFooter(data)}
    </div>`;
}

export function resolveProfileView(data = {}) {
    const raw = String(data?.routineView || 'home');
    return PROFILE_VIEWS.has(raw) ? raw : 'home';
}

function enhanceProfile(root, data) {
    const view = resolveProfileView(data);
    root.classList.add('v7-feature-profile');
    root.dataset.v7Feature = 'profile';
    root.dataset.v7ProfileView = view;
    renderProfileHome(root, data, view);
    root.querySelectorAll(PROFILE_SURFACE_SELECTORS).forEach((element) => {
        element.classList.add('v7-profile-surface');
    });
    root.querySelectorAll('.setting-list').forEach((element) => element.classList.add('v7-profile-setting-list'));
    root.querySelectorAll('.setting-row').forEach((element) => element.classList.add('v7-profile-setting-row'));
    root.querySelectorAll('.profile-v6-back-row').forEach((element) => element.classList.add('v7-profile-back-row'));
    root.querySelectorAll('.library-segment, .library-segmented').forEach((element) => element.classList.add('v7-profile-segmented'));
    root.querySelectorAll('[data-library-view]').forEach((element) => element.classList.add('v7-profile-segment'));
    root.querySelectorAll('.md-btn-filled, .profile-edit-btn, .pvf-check').forEach((element) => {
        element.classList.add('v7-profile-primary-control');
    });
    return view;
}

function clearProfileEnhancements(root) {
    root.classList.remove('v7-page-mounted', 'v7-feature-profile');
    delete root.dataset.v7ProfileView;
    root.querySelectorAll('.v7-profile-surface').forEach((element) => element.classList.remove('v7-profile-surface'));
    root.querySelectorAll('.v7-profile-setting-list').forEach((element) => element.classList.remove('v7-profile-setting-list'));
    root.querySelectorAll('.v7-profile-setting-row').forEach((element) => element.classList.remove('v7-profile-setting-row'));
    root.querySelectorAll('.v7-profile-back-row').forEach((element) => element.classList.remove('v7-profile-back-row'));
    root.querySelectorAll('.v7-profile-segmented').forEach((element) => element.classList.remove('v7-profile-segmented'));
    root.querySelectorAll('.v7-profile-segment').forEach((element) => element.classList.remove('v7-profile-segment'));
    root.querySelectorAll('.v7-profile-primary-control').forEach((element) => element.classList.remove('v7-profile-primary-control'));
}

function clearProfileRuntime(data, host) {
    ['_routineViewAnimationTimer', '_libraryDeckScrollTimer'].forEach((key) => {
        if (data?.[key]) host.clearTimeout?.(data[key]);
        if (data) data[key] = 0;
    });
    if (data?._libraryDeckScrollFrame) {
        (host.cancelAnimationFrame || host.clearTimeout)?.call(host, data._libraryDeckScrollFrame);
        data._libraryDeckScrollFrame = 0;
    }
    data?.resetProfileSwipe?.();
}

export const profileFeature = Object.freeze({
    id: 'profile',
    mount({ context, scope }) {
        const root = context.document?.getElementById?.('profile');
        if (!root) throw new Error('V7 Profile root missing');
        const host = context.document?.defaultView || globalThis;
        const data = context.legacy?.getData?.() || host.data;
        let enhanceFrame = 0;
        const requestFrame = host.requestAnimationFrame || ((callback) => host.setTimeout?.(callback, 16));
        const cancelFrame = host.cancelAnimationFrame || host.clearTimeout;
        const scheduleEnhance = () => {
            if (enhanceFrame || scope.disposed) return;
            enhanceFrame = requestFrame.call(host, () => {
                enhanceFrame = 0;
                if (!scope.disposed) enhanceProfile(root, data);
            });
        };

        root.classList.add('v7-page-shell', 'v7-page-mounted');
        root.dataset.v7Feature = 'profile';
        root.dataset.v7Mounted = 'true';
        data?.renderProfilePage?.();
        enhanceProfile(root, data);

        scope.listen(root, 'click', scheduleEnhance);
        scope.listen(root, 'input', scheduleEnhance);
        scope.listen(host, 'profile:updated', scheduleEnhance);
        const Observer = host.MutationObserver;
        if (Observer) {
            const observer = new Observer(scheduleEnhance);
            scope.observe(observer, root, { childList: true, subtree: true });
        }
        scope.raf(() => {
            if (scope.disposed) return;
            data?.syncExperimentSettingsUi?.();
            data?.refreshSwCacheName?.();
            data?.syncRoutineSubpageNav?.(resolveProfileView(data));
            enhanceProfile(root, data);
        });
        scope.add(() => {
            if (enhanceFrame) cancelFrame?.call(host, enhanceFrame);
            enhanceFrame = 0;
        });

        return () => {
            clearProfileRuntime(data, host);
            clearProfileEnhancements(root);
            root.dataset.v7Mounted = 'false';
        };
    },
    update({ context }) {
        const root = context.document?.getElementById?.('profile');
        if (!root) return;
        const host = context.document?.defaultView || globalThis;
        const data = context.legacy?.getData?.() || host.data;
        data?.renderProfilePage?.();
        enhanceProfile(root, data);
    }
});
