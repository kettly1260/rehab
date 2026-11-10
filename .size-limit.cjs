module.exports = [
  {
    name: 'first-paint-critical-js',
    path: [
      'm3e-ripple.js',
      'toast.js',
      'error-bus.js',
      'i18n.js',
      'theme.js',
      'render-safe.js',
      'nav-stack.js',
      'app-route.js',
      'data-utils-pure.js',
      'action-taxonomy-pure.js',
      'action-identity.js',
      'data-utils.js',
      'storage/idb.js',
      'storage/migrate.js',
      'data-records.js',
      'data-schema.js',
      'data-store.js',
      'data-ui-core.js',
      'data-views.js',
      'data.js',
      'sync-status.js'
    ],
    limit: '52 KB'
  },
  { name: 'update-runtime', path: 'app-update.js', limit: '6 KB' },
  { name: 'page-ui-state', path: 'data-ui-state.js', limit: '9 KB' },
  {
    name: 'post-render-utilities',
    path: ['pwa-support.js', 'haptics.js', 'a11y-focus-trap.js', 'sheet-drag.js'],
    limit: '5 KB'
  },
  {
    name: 'v7-secondary-runtime',
    path: 'src/ui/primitives/secondary-surfaces.js',
    limit: '3 KB'
  },
  {
    name: 'v7-app-shell',
    path: [
      'src/app/bootstrap.js',
      'src/app/context.js',
      'src/app/events.js',
      'src/app/feature-registry.js',
      'src/app/lifecycle.js',
      'src/app/router.js',
      'src/features/coach/index.js',
      'src/features/profile/index.js',
      'src/features/records/index.js',
      'src/features/today/index.js',
      'src/features/workout/index.js',
      'src/legacy/adapters/data.js',
      'src/legacy/adapters/index.js',
      'src/legacy/adapters/services.js',
      'src/legacy/adapters/storage.js',
      'src/ui/effects/index.js',
      'src/ui/navigation/bottom-nav.js'
    ],
    limit: '26 KB'
  },
  {
    name: 'deferred-storage',
    path: ['data-store-deferred.js', 'storage/idb-collections.js', 'storage/idb-advice-collections.js'],
    limit: '3.5 KB'
  },
  { name: 'food-database', path: 'fooddb.js', limit: '2 KB' },
  { name: 'search-bundle', path: ['search-*.js', 'search-*.mjs'], limit: '30 KB' },
  { name: 'profile-credentials', path: 'credential-fields.js', limit: '1.2 KB' },
  { name: 'generated-css', path: 'build/generated.css', limit: '80 KB' },
  { name: 'workout-bundle', path: ['workout-*.js', 'strength-form.js', 'swipe-actions.js', 'weekly-plan.js'], limit: '50 KB' },
  // AI bundle: includes coach-context, advice-*, AI modules.
  // Growth from baseline 145KB to 152KB (actual 150.35KB brotlied) accommodates:
  // 1) B1-B6 context boundary query engine, robust cross-realm date parsing, and contextEvidence persistence/UI;
  // 2) R6 actualSets extraction (reps/weight/RPE), R7 priority scoring for pain feedback, R9 late-night logical date support, and R10 dynamic range parsing;
  // 3) R4-02 legacy record actualSets distinction (计划N组 vs 3/3组), R4-03 folded action constraints preservation (stopReason/discomfort) in truncations, R4-06 all-history prompt scope parsing, and R4-08 pre-send evidence alignment.
  { name: 'ai-bundle', path: ['ai-*.js', 'ai-*.mjs', 'advice-*.js', 'coach-context.js', 'lib/virtual-core.umd.js', 'lib/flexsearch.light.js'], limit: '152 KB' },
  { name: 'rehab-policy', path: 'rehab-policy.js', limit: '12 KB' },
  { name: 'rehab-progression-pure', path: 'rehab-progression-pure.js', limit: '4 KB' },
  // Plan bundle: includes plan-store, plan-ui, plan-cooldown, plan-auto-adjust, plan-progression, plan-feedback, plan-analytics, and plan-ai.
  // Growth from baseline 72.5KB to 82KB (actual 80.14KB brotlied) accommodates:
  // 1) Phase D4 manual planning (addTask modal, task order movement up/down, prescription picker);
  // 2) Phase E3 complete plan session orchestration (multi-task session continuation, prompt next task, centralized cooldown queue);
  // 3) Phase F1-F5 progression decoupling, pain deload safety guarantees, and idempotency tracking;
  // 4) Review items S1/N01/R3-S1 (safe data-* attribute event delegation replacing inline onclick handlers in task rows, drawers, and menus);
  // 5) Review items N02-N04 & R3-04 (zero-rep/zero-work defense on manual done & workout start, partial completion progression suppression, and session continuity across paired cooldowns);
  // 6) Review items N12/N15 (unique date plan coverage and feedback-saved adjustment batch idempotency);
  // 7) Round 3 review items R3-05-R3-08 & R3-11 (pain deload prioritized over isPartial in cloneForTomorrow, modal close finishPlanSession session teardown, centralized cooldown plan isolation, and calendar lower bound filtering).
  { name: 'plan-bundle', path: 'plan-*.js', limit: '82 KB' },
  { name: 'debug-bundle', path: 'debug-*.js', limit: '10 KB' },
  {
    name: 'records-bundle',
    path: [
      'health-*.js',
      'food-ai-normalizer-pure.js',
      'food-evidence-pure.mjs',
      'food-evidence.js',
      'food-log.js',
      'history-view.js',
      'today-view-core.js',
      'weekly-summary.js',
      'goal-plan.js',
      'report-*.js',
      'pr-tracker.js',
      'volume-heatmap.js',
      'action-history.js'
    ],
    // Records bundle: includes health-*, food-*, weekly-summary, records index.
    // Growth from baseline 94.2KB to 96KB (actual 94.88KB brotlied) accommodates:
    // 1) A3-A5 timezone-safe resolveDayKey, Monday start-of-week 00:00:00 normalization, and multi-day load aggregation;
    // 2) C4 recordedDays-based caloric deficit averaging;
    // 3) R8 sessionCount/trainingDays-based fatigue calculation and prompt precision.
    limit: '96 KB'
  },
  {
    name: 'today-view-core',
    path: 'today-view-core.js',
    limit: '18 KB'
  },
  { name: 'routine-bundle', path: 'routine-*.js', limit: '25 KB' },
  { name: 'sync-bundle', path: ['backup.js', 'backup-import-pure.js', 'backup-ring-pure.js', 'sync.js', 'sync-pure.js', 'sync-ui.js', 'sync-adapters.js'], limit: '30 KB' },
  { name: 'voice-bundle', path: 'voice-*.js', limit: '12 KB' },
  { name: 'device-bundle', path: 'mi-scale-*.js', limit: '8 KB' }
];
