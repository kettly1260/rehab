# Rehab V7 剩余阶段 Agent 交接任务书

> 本任务书用于从当前 V7 已完成基线继续开发，交给新的 Agent 顺序执行。
> 原始总任务书仍是 `REHAB_V7_AGENT_TASKBOOK.md`；本文件只描述**剩余工作**和当前真实交接点。

---

# 0. 交接点与当前状态

## 0.1 分支与基线

- 当前工作分支：`v7-liquid-glass`
- V6 stable/base：`perfrom`
- V6 基线 commit：`ae1194b`
- 当前最后一个产品代码 commit：`e328863` (`v7: migrate Today experience`)
- 创建本任务书前 working tree：clean
- 新 Agent 应从**包含本任务书的最新 HEAD**继续，不要回退或重做 Phase 0–6。

## 0.2 已完成阶段，禁止重做

| Phase | 内容 | Commit | 状态 |
|---|---|---|---|
| 0 | Baseline / Architecture / Function Inventory | `9734c17` | Done |
| 1 | V7 App Shell / Router / Lifecycle | `7b94261` | Done |
| 2 | V6 Data Compatibility Adapters | `571ff27` | Done |
| 3 | Design Tokens / Primitives / Component Gallery | `b29fe71` | Done |
| 4 | Low-Power Glass Effects System | `db296fa` | Done |
| 5 | Floating Bottom Navigation | `67b0c22` | Done |
| 6 | Today | `e328863` | Done |

Phase 7 Workout 目前**没有未提交产品代码**。前一个 Agent 只完成了 Workout 的前置审计，没有落盘实现，因此可直接从 Phase 7 开始。

## 0.3 已存在的重要 V7 文件

```text
src/app/
src/features/
src/legacy/adapters/
src/ui/tokens/
src/ui/primitives/
src/ui/effects/
src/ui/navigation/

css-src/60-v7-tokens.css
css-src/61-v7-primitives.css
css-src/62-v7-effects.css
css-src/63-v7-navigation.css
css-src/64-v7-today.css

docs/v7/V6_ARCHITECTURE_MAP.md
docs/v7/V6_FUNCTION_INVENTORY.md
docs/v7/V7_ARCHITECTURE.md
docs/v7/V7_DATA_COMPATIBILITY.md
docs/v7/V7_DESIGN_SYSTEM.md
docs/v7/V7_EFFECTS.md
docs/v7/V7_MIGRATION_MATRIX.md
docs/v7/V7_PERFORMANCE_BASELINE.md
docs/v7/V7_SCREEN_MAPPING.md
```

视觉参考：

```text
docs/v7/visuals/v7-today.svg
docs/v7/visuals/v7-workout.svg
docs/v7/visuals/v7-records.svg
docs/v7/visuals/v7-coach.svg
docs/v7/visuals/v7-profile.svg
```

这些图只定义视觉层级与气质，**不是业务功能需求来源**。

---

# 1. 总目标

继续完成 Rehab V7，目标不是重新设计业务，而是：

1. 保留 V6 全部成熟业务能力和数据兼容性；
2. 将五个主 Feature 的 UI ownership、生命周期和 CSS ownership 收敛到 V7；
3. 让 Liquid Glass 只出现在少数高价值交互位置；
4. 显著降低常驻 blur、动画、RAF、observer、listener 和隐藏页面运行成本；
5. 保证 Android PWA 的 back、offline、update、deep link、训练后台能力不倒退；
6. 最终补齐性能、视觉、迁移和 Android 真机验收资料。

一句话视觉目标：

> **安静、专业、可信的健康训练 PWA；主体是稳定 Surface，Liquid 只服务于关键交互。**

---

# 2. 全程硬约束

## 2.1 V6 是功能真相来源

不得因为视觉参考里没出现某项功能而删除它。

以下现有能力原则上全部保留：

- plan / routine / workout；
- training history；
- health / weight / diet；
- AI / model / routing / search / evidence；
- sync / backup / import / export；
- voice / wake lock / media session / PIP；
- theme / haptics / language；
- PWA offline / update / deep link；
- diagnostics / experiments。

## 2.2 不做破坏性数据迁移

不得修改或破坏：

- IndexedDB DB 名称；
- store 名称；
- 已有 schema 语义；
- workout session journal schema；
- sync/backup 远端数据格式；
- AI credentials 存储方式。

如需新增数据字段，只允许 additive、可重复、可回滚的变化，并必须有测试。

## 2.3 不迁移框架

继续采用：

```text
Vanilla JavaScript / ES Modules + 现有成熟 V6 业务模块
```

不要同时引入 React/Vue/Svelte。

## 2.4 不扩大 Liquid Glass

V7 新代码中：

- 普通 Card：Surface；
- 普通 List：Surface；
- 普通 Bubble：Surface；
- 图表背景：Surface；
- Timer 主体：Surface；
- 主 CTA / Bottom Nav active indicator / Composer / 少数直接交互控件：可使用 Liquid/Soft Glass。

禁止：

- 每张卡 `backdrop-filter`；
- 整页 WebGL Liquid Glass；
- 大量永久 `will-change`；
- `transition: all`；
- 无限呼吸 `filter` / `box-shadow` 动画；
- 隐藏页面继续跑视觉 RAF。

新的 V7 feature CSS 不应自行定义高成本 backdrop 规则；优先消费现有 `src/ui/effects` + V7 effect classes/tokens。

## 2.5 页面生命周期与业务会话生命周期分离

尤其 Workout 和 Coach：

- 页面 unmount 可以释放 DOM listener / observer / route RAF；
- 页面 unmount **不能自动等于业务 session stop**；
- WakeLock / MediaSession / PIP / workout timer 的归属必须按训练 session 决定；
- streaming 是否离页继续，必须保持 V6 现有语义，不得凭 UI 重构自行修改。

## 2.6 不新增无必要全局变量

V7 代码优先通过：

```text
context
adapters
feature registry
services
platform owners
```

访问 legacy 能力。

不要再扩散新的 `window.xxx` 业务 API。

---

# 3. 每阶段统一执行方式

每个 Phase：

1. 先阅读原始任务书对应 Phase；
2. 阅读 `V6_FUNCTION_INVENTORY.md` 与 `V7_SCREEN_MAPPING.md` 对应功能；
3. 盘点真实 V6 renderer / service / tests；
4. 只改本 Phase ownership；
5. 写 unit/browser/lifecycle 测试；
6. 390×844 移动端浏览器验证；
7. console errors 必须为 0；
8. 检查横向 overflow；
9. 检查 listener/RAF/observer/timer cleanup；
10. `npm run perf:edge` 做 boot/runtime sanity；
11. 更新 `V7_SCREEN_MAPPING.md`；
12. 必要时更新 `V7_MIGRATION_MATRIX.md`；
13. `git diff` review；
14. 单独 commit；
15. Gate 失败则不进入下一 Phase。

推荐阶段命令：

```bash
npm run build:css
npm run lint
npm run typecheck
npm run check:css
npm run check:html-safety
npm run test
npm run test:browser:lazyload
npm run test:browser:lifecycle
npm run perf:edge
```

不要每个小修改都跑完整 `npm run test:release`；Phase 12 和最终 QA 必须跑。

---

# 4. 已知环境与测试注意事项

## 4.1 浏览器

Playwright 自带 Chromium 下载曾因 CDN 网络超时失败。

项目测试 helper 已改为优先使用系统 Microsoft Edge，因此不要重新依赖 100MB+ browser download 才能继续。

## 4.2 Kaspersky 本机注入

本机 Edge 曾注入：

```text
*.kaspersky-labs.com/.../main.js
```

它会制造与 Rehab 无关的 Long Task。

`scripts/edge-perf-smoke.mjs` 已增加已知第三方安全脚本过滤，并在输出中显示：

```text
blockedExternalPatterns
```

不要删除这个诊断。

## 4.3 `perf:edge` 的能力边界

当前脚本使用 `--disable-gpu`，因此只能证明：

- boot；
- resource；
- Long Task；
- runtime/console error。

**它不能证明真实 GPU 或手机温升改善。**

真实 GPU-on 性能在 Phase 13 单独完成。

---

# 5. Phase 7 — Workout（下一个必须执行）

建议 commit：

```text
v7: migrate workout feature
```

## 5.1 目标

把 Workout 从“V7 Shell + V6 renderer”迁成真正的 V7 feature owner，同时保留成熟 workout engine/state/runtime。

先做 idle 首页，再做运行态。

## 5.2 必须覆盖状态

```text
idle
starting
running
resting
paused
finished
strength logging
cardio
recovery/stretch
skip
error
resume
```

## 5.3 必须保留/包装

- `workout-engine.js`；
- `workout-state.js`；
- `workout-core.js`；
- `workout-system.js`；
- `workout-cardio*`；
- workout voice；
- wake lock；
- media session；
- PIP；
- plan bridge；
- routine / action library；
- RPE/RIR review；
- persistence / session journal / restore。

不得重写 workout 算法。

## 5.4 推荐 ownership

至少形成清晰边界：

```text
src/features/workout/index.js        页面/DOM owner
src/domain/workout/...               纯 session/domain adapter（按需要）
src/services/voice/...               voice adapter（按需要）
src/platform/wake-lock/...           session-owned platform adapter
src/platform/media-session/...       session-owned platform adapter
src/platform/pip/...                 session-owned platform adapter
css-src/65-v7-workout.css            Workout V7 visual ownership
```

文件名可以按现有架构适配，不要求机械创建所有目录，但 ownership 必须清晰。

## 5.5 视觉规则

- Timer 主体：稳定 Surface，不 blur；
- action list：稳定 Surface；
- set stats：稳定 Surface；
- mode control：segmented Surface；
- Play/Pause 主 CTA：允许 Liquid interaction；
- Stop/Prev/PIP/Skip：普通稳定控件；
- 不要复制 V6 `52-v6-workout.css` 中大面积 blur；
- 不要永久运行 aura animation。

## 5.6 关键生命周期要求

训练运行时执行：

```text
Workout running
→ 切到 Today/Records
→ session 仍然存在
→ 不误 stop timer
→ 不误清除 session journal
→ 需要保留的 MediaSession/WakeLock/PIP 按原语义保留
→ 返回 Workout
→ UI 从真实 session state 重建
```

页面离开时只清理 route-owned：

- pointer/touch listener；
- Resize/Mutation observer；
- render RAF；
- DOM-only timer；
- temporary object URL；
- feature-local subscriptions。

## 5.7 必须测试完整业务路径

```text
开始
→ 记录
→ 休息
→ 暂停
→ 恢复
→ 跳过
→ 离开页面
→ 返回
→ 完成
→ 保存
```

再覆盖：

- cardio start/pause/finish/save；
- strengthLog save；
- RPE/RIR review；
- crash/session resume；
- plan task workout completion bridge；
- routine action reuse；
- PIP toggle；
- WakeLock lifecycle；
- voice setting access。

## 5.8 测试建议

新增/迁移：

```text
test/v7-workout.test.mjs
test/v7-workout.browser.test.mjs
```

复用并保持 green：

```text
test/session-journal.test.mjs
test/workout-state-event.test.mjs
test/workout-power-motion.test.mjs
test/plan-workout-bridge.test.mjs
test/app-update-session-safety.test.mjs
test/ensure-deps-side-effects.browser.test.mjs
test/route-lifecycle-leak.browser.test.mjs
```

### Phase 7 Gate

- Workout 全状态可达；
- 离页/返页 session 不丢；
- Timer/List 无高成本 backdrop；
- 主 CTA Liquid 数量克制；
- 无 timer/listener/RAF/observer 泄漏；
- `V7_SCREEN_MAPPING.md` Workout 全部标记 Migrated 或明确 DEFER=0；
- `npm run perf:edge` 通过。

---

# 6. Phase 8 — Records

建议 commit：

```text
v7: migrate records feature
```

## 6.1 必须保留

```text
training
weight
diet
health
reports
weekly summary
history
calendar/day detail
manual exercise records
PR / volume review
weight reports/archive
context AI
Xiaomi scale experiment entry（开启时）
```

## 6.2 推荐实现

```text
src/features/records/index.js
css-src/66-v7-records.css
```

必要时拆：

```text
records tabs
chart controller
detail route
report adapters
```

不要把所有 Records 子页同时常驻渲染。

## 6.3 图表和滚动硬规则

- 不可见时停止 chart refresh；
- touch/scroll handler 节流；
- 无永久 RAF；
- 图表不靠 backdrop 重绘背景；
- 图表/数据区优先普通 Surface；
- route exit 释放 observer/listener；
- 返回时从数据重建，不依赖隐藏 DOM 常驻。

## 6.4 Browser Gate

至少验证：

```text
Records landing
Training tab
Weight tab + chart
Diet tab
Health
Calendar/day detail
Report open/close
long list scroll
context AI entry
Back navigation
```

检查：

- 390×844；
- 无横向 overflow；
- chart 清晰；
- scroll 无明显抖动；
- 离页后 chart/observer 停止；
- console error 0。

### Phase 8 Gate

`V7_SCREEN_MAPPING.md` 中 Records 每行状态从 `Mapped / Phase 8` 更新到 `Migrated / Phase 8`，未迁移数量为 0 或有明确 DEFER 原因。

---

# 7. Phase 9 — Coach

建议 commit：

```text
v7: migrate coach feature
```

## 7.1 必须保留

- model catalog；
- model selection；
- AI routing；
- streaming；
- search；
- evidence；
- attachments；
- virtualized history；
- stop；
- retry；
- prompt/context；
- usage/pricing/settings（存在时）；
- history ranges；
- manual scroll；
- auto-follow；
- message versions/edit；
- model favorites/recents。

## 7.2 推荐 ownership

```text
src/features/coach/index.js
css-src/67-v7-coach.css
```

按需要拆：

```text
message-list owner
stream subscription owner
composer owner
attachment controller
virtual-list adapter
search/evidence view adapter
```

AI provider/routing/search service 不重写。

## 7.3 视觉规则

普通消息 Bubble = Surface。

Soft Glass 主要只用于：

```text
Composer
Suggestion Controls
Model Picker / selected model control
Selected Action
```

不要让每个消息 bubble blur。

## 7.4 生命周期

- auto-follow RAF 只在需要时存在；
- manual scroll 后不得强制拉回；
- hidden Coach 不跑视觉 scroll RAF；
- virtualization observer route-owned；
- attachments object URL 在正确 owner 生命周期释放；
- transport/streaming 的离页行为保持 V6 现有语义，不得自行改成 abort 或后台继续。

## 7.5 Browser Gate

```text
streaming
manual scroll
auto follow
long response
virtualization
attachment
search evidence
stop
retry
model switch
keyboard open/close
leave/return while response active
```

另测：

- Android/mobile keyboard 不遮 Composer；
- back 先关 Sheet/Picker，再离开页面；
- console error 0；
- route exit 后 visual RAF/observer 不泄漏。

---

# 8. Phase 10 — Profile

建议 commit：

```text
v7: migrate profile feature
```

## 8.1 必须保留

- Profile；
- Health Profile；
- Goals / Body Plan；
- Plan Settings；
- Action/Prescription/Routine Library；
- Equipment；
- Theme / Appearance；
- Sync S3/WebDAV；
- Backup/import/export/CSV；
- Voice；
- AI Providers / Models / Task Settings；
- Search Provider；
- AI advanced/retry/timeout/encrypted sync；
- Device-related features；
- Notifications（存在时）；
- Data Controls；
- Haptics / language；
- Experiments / Xiaomi scale；
- Version/update；
- Diagnostics/debug tools。

V6 比视觉图多的功能放二级设置，不删除。

## 8.2 推荐实现

```text
src/features/profile/index.js
css-src/68-v7-profile.css
```

Profile home 应像健康档案/工具页，不做营销 hero。

## 8.3 Browser Gate

至少逐项打开：

```text
Health Profile
Goals
Library
AI settings
Search settings
Sync
Backup
Voice
Theme dark/light
Language/Haptics
Experiments
About/Update
Diagnostics
```

验证 nested route + browser back + PWA back。

---

# 9. Phase 11 — Secondary UI

建议 commit：

```text
v7: migrate secondary surfaces
```

## 9.1 目标

主页面迁完后统一所有二级界面，消除 V7 主页面打开 V6 Modal/Sheet 时的视觉断层。

必须覆盖：

```text
Modal
Sheet
Picker
Search
Loading
Skeleton
Empty
Error
Offline
Toast
Confirm
Update Banner
Attachment Preview
Permission State
Keyboard State
```

## 9.2 推荐 ownership

可新增类似：

```text
src/ui/primitives/modal...
src/ui/primitives/sheet...
src/ui/primitives/toast...
css-src/69-v7-secondary.css
```

不要简单用一个巨型 `99-custom-overrides.css` 覆盖全部旧组件。

## 9.3 功能硬要求

- focus trap；
- escape/back close 顺序正确；
- backdrop tap 语义保留；
- body scroll lock 正确恢复；
- virtual keyboard 下输入区可见；
- aria-hidden / role / focus return 正确；
- Android back 先关闭最上层 secondary surface；
- nested sheet/manager 不破坏 navStack；
- update banner 不影响正在运行 workout。

## 9.4 Gate

至少保留/通过：

```text
test/modal-a11y.browser.test.mjs
test/deep-link-nav.browser.test.mjs
test/android-back-navigation.test.mjs
```

并新增 V7 secondary surface browser coverage。

---

# 10. Phase 12 — PWA Runtime

建议 commit：

```text
v7: integrate pwa runtime
```

## 10.1 范围

UI 稳定后再整合：

- Manifest；
- Service Worker；
- Offline Shell；
- Cache；
- Version；
- Update；
- Install；
- Standalone；
- Deep Link。

不是为了 V7 而彻底重写 SW。

## 10.2 重点

- V6 用户升级到 V7 数据不丢；
- active workout 时 update 不可误 reload；
- waiting SW 仍遵循显式 apply；
- old cache migration 仍安全；
- Today essential offline closure 仍满足；
- lazy page 资源 offline/online 行为明确；
- `#/profile/library` 等 deep link 首屏 active tab 正确；
- standalone PWA root back 不进入空白页；
- install/update banner 使用 V7 secondary visual。

## 10.3 必跑

```bash
npm run test:deps
npm run test:release
npm run test:browser:lazyload
npm run test:browser:lifecycle
```

不得为了 release gate 直接删除旧测试。

如果旧测试被 V7 等价测试替换，必须写入：

```text
docs/v7/V7_MIGRATION_REPORT.md
```

格式：

```text
old test -> new test -> replacement reason
```

---

# 11. Phase 13 — Performance / Power

建议 commit：

```text
v7: add render performance gates
```

## 11.1 目标

在已有 `perf:edge` 之外新增真实 GPU-on 测试：

```text
perf:render
perf:lifecycle
perf:effects
```

对应 package scripts 必须能稳定执行。

## 11.2 测试浏览器

- 使用系统 Edge/Chrome；
- GPU-on 测试不得带 `--disable-gpu`；
- 使用隔离 profile；
- 禁用 extension；
- 过滤/记录已知第三方安全注入；
- 不允许把第三方注入造成的耗时算成 Rehab 改善/退化；
- 同时不能用过滤机制掩盖同 origin Rehab 请求。

## 11.3 路径

至少：

```text
Today idle
Today scroll
Tab switching
Workout idle
Workout running
Records chart/scroll
Coach streaming
Profile scroll
Modal/Sheet
```

## 11.4 收集指标

- Long Tasks；
- Long Animation Frames（浏览器支持时）；
- frame timing proxy；
- active RAF；
- active timers；
- ResizeObserver / MutationObserver 数量；
- route-owned listener 数量或 proxy；
- DOM size；
- layout/paint proxy；
- route cleanup snapshot；
- resource/JS/CSS transfer；
- effect mode balanced/economy。

## 11.5 对比方式

至少比较：

```text
V6 stable / ae1194b
V7 balanced
V7 economy
```

不要在有未提交改动的主 worktree 里频繁 checkout stable。

推荐：

```text
git worktree
或独立临时目录/静态快照
```

每条性能路径尽量跑多次，报告 median，并保留异常值说明。

## 11.6 必须生成

```text
docs/v7/V7_PERFORMANCE_REPORT.md
```

内容至少包括：

- baseline；
- final；
- balanced/economy；
- 测试环境；
- GPU-on / GPU-off 区分；
- 每条路径指标；
- 已知限制；
- 是否达到“明显减少常驻视觉成本”的结论。

不要把自动化结果写成“手机不发热”的结论。

---

# 12. Android 真机功耗验收

该步骤最终必须有人用同一台 Android 手机做。

如果当前 Agent 没有 Android 真机：

- 不得伪造结果；
- 必须先完成 `V7_ANDROID_TEST_PLAN.md`；
- 在最终报告中标记 `BLOCKED_EXTERNAL_DEVICE`；
- 代码自动化 Gate 继续完成。

## 12.1 对比组

```text
V6 stable
V7 balanced
V7 economy
```

保持：

- 同一设备；
- 同一亮度；
- 同一网络；
- 相同环境温度；
- 相同操作路径；
- 相同测试时长。

建议：

```text
15 min Today/Records
15 min Workout
10 min Coach
10 min idle
```

记录：

- 电量变化；
- 温升；
- 帧稳定；
- 体感卡顿；
- CPU/GPU 指标（可获取时）；
- Android/PWA background behavior。

必须生成：

```text
docs/v7/V7_ANDROID_TEST_PLAN.md
```

如已具备真机，同时把实测结果写入最终性能/迁移报告。

---

# 13. 最终视觉 QA

建议单独 commit：

```text
v7: final compatibility and visual qa
```

## 13.1 参考

使用已有：

```text
docs/v7/visuals/v7-today.svg
docs/v7/visuals/v7-workout.svg
docs/v7/visuals/v7-records.svg
docs/v7/visuals/v7-coach.svg
docs/v7/visuals/v7-profile.svg
```

不要重新发散设计方向。

## 13.2 必看项目

- Header rhythm；
- whitespace；
- type scale；
- card hierarchy；
- Surface / Glass 比例；
- active tab geometry；
- CTA geometry；
- icon weight；
- border/shadow；
- content density；
- green saturation；
- chart clarity；
- safe area；
- dark mode；
- keyboard open；
- modal/sheet。

真实 V6 数据放进去后仍要保持：

```text
克制
清晰
专业
健康产品感
Liquid Interaction 稀少而有意义
```

## 13.3 最终截图

保留至少：

```text
Today
Workout idle
Workout running
Records
Coach
Profile
Dark mode
Balanced effects
Economy effects
Modal/Sheet sample
```

手机主视口至少验证 390×844。

必须生成：

```text
docs/v7/V7_VISUAL_FIDELITY.md
```

文档记录每张参考图与最终浏览器截图的主要差异、修复和有意偏差。

---

# 14. 最终功能映射与迁移报告

## 14.1 `V7_SCREEN_MAPPING.md`

每完成一个主 Feature 就立即更新，不要等最终统一补。

最终要求：

> V6 功能未映射数量 = 0；如果确有 DEFER，必须给出具体原因和可访问的兼容入口。

当前文件里的 `Mapped / Phase 7/8/9/10` 只是目标位置，不代表迁移完成；对应 Phase 完成时必须改为 `Migrated`。

## 14.2 `V7_MIGRATION_MATRIX.md`

当 legacy renderer 被正式退休或 ownership 发生变化时更新 Decision/strategy。

不要提前把仍在被调用的 V6 renderer 标记为 retired。

## 14.3 必须生成

```text
docs/v7/V7_MIGRATION_REPORT.md
```

至少记录：

- Phase 0–13 commit；
- 每个 feature 最终 owner；
- 保留的 legacy domain/service；
- retired legacy UI；
- legacy test -> V7 test 替换关系；
- 数据兼容结论；
- PWA compatibility；
- 未解决 DEFER/BLOCKED 项；
- rollback 路径。

---

# 15. 当前缺失的最终交付文档

创建本任务书时，以下文件**尚不存在**，必须在项目结束前补齐：

```text
docs/v7/V7_PERFORMANCE_REPORT.md
docs/v7/V7_VISUAL_FIDELITY.md
docs/v7/V7_ANDROID_TEST_PLAN.md
docs/v7/V7_MIGRATION_REPORT.md
```

以下基础文档已经存在，不要重建一份同名替代品：

```text
docs/v7/V6_ARCHITECTURE_MAP.md
docs/v7/V6_FUNCTION_INVENTORY.md
docs/v7/V7_MIGRATION_MATRIX.md
docs/v7/V7_SCREEN_MAPPING.md
docs/v7/V7_ARCHITECTURE.md
docs/v7/V7_DATA_COMPATIBILITY.md
docs/v7/V7_PERFORMANCE_BASELINE.md
```

---

# 16. 最终完整 Gate

全部开发完成后至少执行：

```bash
npm run build:css
npm run lint
npm run typecheck
npm run test
npm run test:browser:lazyload
npm run test:browser:lifecycle
npm run test:deps
npm run test:release
npm run check:css
npm run check:html-safety
npm run ci
npm run perf:edge
npm run perf:render
npm run perf:lifecycle
npm run perf:effects
```

并手动/浏览器覆盖：

```text
5 个顶级 tab
所有核心二级入口
browser back
PWA back
modal/sheet stack
deep link
offline
update
workout active session
coach streaming
keyboard
balanced/economy
dark mode
```

最终 `git status` 必须 clean。

---

# 17. 最终静态成本审计

至少检查：

```bash
rg -n "backdrop-filter|transition:\s*all|will-change|animation:.*infinite" css-src src
rg -n "requestAnimationFrame|setInterval|ResizeObserver|MutationObserver" src *.js
```

目标不是机械做到全仓 0，而是：

- 新 V7 feature 不新增无 owner 的常驻高成本效果；
- migrated 页面相对 V6 明显减少 backdrop；
- hidden page 没有多余视觉 RAF；
- timer/observer/listener 都能解释 owner 和 cleanup；
- `transition: all` 不出现在新增 V7 CSS；
- 永久 `will-change` 不出现在新增 V7 CSS。

把前后数量和例外写进 `V7_PERFORMANCE_REPORT.md`。

---

# 18. 推荐剩余 Commit 顺序

严格建议按以下顺序，不要做一个巨大 commit：

```text
v7: migrate workout feature
v7: migrate records feature
v7: migrate coach feature
v7: migrate profile feature
v7: migrate secondary surfaces
v7: integrate pwa runtime
v7: add render performance gates
v7: final compatibility and visual qa
```

每个 commit 前：

```text
相关 Gate 必须 green
V7_SCREEN_MAPPING 已更新
working diff 只包含本 Phase
```

---

# 19. Agent 停止条件

正常情况下不要因为任务复杂而停下来询问。

只有以下情况才停止并明确报告：

1. 数据 migration 存在不可逆风险；
2. 某个 V6 核心能力找不到真实入口或无法等价映射；
3. stable 分支安全受到威胁；
4. 外部环境硬阻塞且无法通过现有系统 Edge/工具绕过；
5. Android 真机结论需要物理设备但当前环境没有。

其余测试失败都应继续定位和修复，不要用“旧测试过时”作为删除测试的理由。

---

# 20. 给执行 Agent 的直接指令

> 你现在接手 `rehab` 项目 `v7-liquid-glass` 分支。
> 已完成 Phase 0–6，不得重做；最后一个产品代码基线为 `e328863`。
> 从 Phase 7 Workout 开始，严格按本任务书 Phase 7 → 13 → Final QA 顺序完成。
> V6 是业务/数据真相来源，V7 visuals 只约束视觉层级。
> 不删除视觉图中未出现的旧功能，不破坏 IndexedDB / sync / workout journal，不迁移框架。
> 页面 UI owner 与 workout/AI 等长生命周期业务 owner 必须分离。
> Liquid Glass 只用于少数关键交互，普通内容使用 Surface。
> 每完成一页立即更新 `docs/v7/V7_SCREEN_MAPPING.md`，未映射 V6 功能必须为 0 或明确 DEFER。
> 每个 Phase 完成浏览器、lifecycle、性能 sanity 后单独 commit，再进入下一 Phase。
> 最终必须补齐 `V7_PERFORMANCE_REPORT.md`、`V7_VISUAL_FIDELITY.md`、`V7_ANDROID_TEST_PLAN.md`、`V7_MIGRATION_REPORT.md`，并跑完整 release/CI/performance Gate。
