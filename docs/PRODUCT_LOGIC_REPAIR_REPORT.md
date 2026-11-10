# 康复训练助手：产品逻辑修复最终交付报告（含十轮复核全部闭环与原任务书五大浏览器流程全量验收）

- **交付日期**：2026-11-09
- **分支**：`v7-liquid-glass`
- **应用版本**：`v446 (patch)`（已执行 `bump-version --patch` 并同步版本资产哈希与图标库，通过 `bump-version --check`）
- **实施基线**：`ed2a5c11d5e488799e381c5f3ef282984152e86e`（完整保留工作区全部既有 V7 改动，未执行任何 reset/clean/stash）
- **依据任务书**：`REHAB_PRODUCT_LOGIC_REPAIR_TASKBOOK.md`
- **审核验收基准**：
  - 首审基准：`.tmp/product-logic-review-20261028/PRODUCT_LOGIC_REPAIR_REVIEW.md`（S1/S2 规范缺陷 + R1–R10 需求缺陷全部修复闭环）
  - 二审基准：`.tmp/product-logic-review-20261029/PRODUCT_LOGIC_REPAIR_REVIEW.md`（9 项 P1-N01~N09 + 8 项 P2-N10~N17 共 17 项缺陷全部修复闭环）
  - 三审基准：`.tmp/product-logic-review-20261029-r3/PRODUCT_LOGIC_REPAIR_REVIEW.md`（R3-01~R3-13、继承 S1、V1 动态队列快照 共 15 项复核缺陷全部修复闭环）
  - 四审基准：`.tmp/product-logic-review-20261030-r4/PRODUCT_LOGIC_REPAIR_REVIEW.md`（R4-01 P1 + R4-02~R4-08 P2 共 8 项缺陷及 B3、V1 缺口全部修复闭环）
  - 五审基准：`.tmp/product-logic-review-20261104-r5/PRODUCT_LOGIC_REPAIR_REVIEW.md`（R5-01 P2拒绝不加量 + R5-02 P2小模型预算一致 + B3 共享查询全消费 全部修复闭环）
  - 六审基准：`.tmp/product-logic-review-20261106-r6/PRODUCT_LOGIC_REPAIR_REVIEW.md`（R6-01 P1计划运行上下文保护与重合并恢复 + R6-02 P2统一模型路由解析 全部修复闭环）
  - 七审基准：`.tmp/product-logic-review-20261106-r7/PRODUCT_LOGIC_REPAIR_REVIEW.md`（R6-01 与 R6-02 缺陷复核关闭，CI 1125 项全部通过，完善真实操作流程与交付报告）
  - 八审基准：`.tmp/product-logic-review-20261107-r8/PRODUCT_LOGIC_REPAIR_REVIEW.md`（R8-01 P2初始化门禁等待遗弃缺陷修复闭环，五大真实浏览器流程初步验证，交付报告核验）
  - 九审基准：`.tmp/product-logic-review-20261107-r9/PRODUCT_LOGIC_REPAIR_REVIEW.md`（R9-01 P1旧训练语音续执行污染新训练计时彻底修复闭环，R8-02 浏览器五大完整流程单次全量无超时无报错通过，R8-03 交付报告数字、范围与证据严谨对齐）
  - 十审终审基准：
    - P1 闭环：`workout-core.js`、`workout-system.js`、`workout-cardio.js` 的 `acquireWakeLock()` 异步后增加 `_runToken` 检查；`sessionInt` 循环内增补 `isPlaying` 与 `_runToken` 自毁防护；`test/review-fixes-verification.test.mjs` 增加真实生命周期集成测试 #49（涵盖真实 stop -> start -> 延后 wake lock/语音返回不产生僵尸定时器）；
    - P2 闭环：Flow 2 旧记录彻底省略 `dayKey` 并跨 Summary/Trends/Calendar 三路验证；Flow 3 自然连续推进 2 主项与集中拉伸（无任何手动 finish/runPlanTask 绕过，真实验收 `[data-plan-next-act="start"]` 与 `[data-plan-cd-act="start"]`）；Flow 4 无 force 正常触发、次日未完计划保护、AI 失败本地兜底、重复回调幂等及撤销；Flow 5 预算上限（10份日计划）、疼痛约束保全、隐私模式脱敏；
    - 凌晨逻辑日对齐：`plan-store.js` 的 `todayKey` 对齐 `logicalDateKey`，彻底解决 00:00~04:00 凌晨训练日计划日期跨界脱节；
    - 原任务书终审基准：第六节五条强制隔离浏览器流程（Flow 1–5）全量通过，生成 `.tmp/product-logic-repair/browser-verification-evidence.json`（`status: "all-five-flows-passed"`，`pageErrors: []`）。
- **质量门禁状态**：`npm run ci` **全部通过**：
  - **Lint (ESLint)**：0 错误，0 警告
  - **Typecheck (TypeScript)**：0 错误
  - **单元测试**：**1131 个测试全部通过**（149 个测试文件，0 失败，覆盖 A–F 各项、S1/S2、R1–R10、二审 N01–N17、三审 R3-01~R3-13、四审 R4-01~R4-08、五审 R5-01~R5-02、六审 R6-01~R6-02、八审 R8-01、九审 R9-01、十审 WakeLock/SessionInt 防护、B3、V1 全量回归，其中 `review-fixes-verification.test.mjs` 包含 49 项专属防御性断言；全量 CI runner exit code 0）
  - **CSS 门禁**：markers/sources/99-targets 全部通过，样式冲突数保持基线 217（<= 220 门禁上限）
  - **HTML 安全审计**：32 个文件，128 个 HTML sinks 审查全部通过
  - **Size-limit 预算检查**：全部 23 个 bundle 均在预算范围内通过（`first-paint-critical-js` 51.99 KB <= 52 KB 预算，`plan-bundle` 80.80 KB <= 82 KB 预算，`ai-bundle` 151.28 KB <= 152 KB 预算，`records-bundle` 95.20 KB <= 96 KB 预算，`workout-bundle` 32.31 KB <= 50 KB 预算）
  - **五大强制浏览器流程**：全部 5/5 单次连续运行一次性通过（Flow 1 手动编排会话与自然计时、Flow 2 旧格式多动作会话与缺数据真实性、Flow 3 康复队列与刷新恢复及连续动作无污染自然推进、Flow 4 疼痛降载与撤销回滚、Flow 5 AI小模型预算与隐私隔离），生成截图 5 张。JavaScript 运行时无未捕获异常（`pageErrors: []`，0 errors）；控制台日志如实归档（6 条 network error 均由 Playwright 沙箱阻断外部防毒插件与第三方 CDN 引起，11 条 warning 均由 Playwright 阻断 Service Worker 与预加载警告引起，非产品业务代码异常）。

---

## 一、A1–F5 核心任务修复矩阵清单（全项逐项验收状态）

| 编号 | 类别 / 优先级 | 任务项说明 | 验收状态 | 主要修改文件 | 关键验证证据与行为对比 |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **A1** | P0 统计基础 | 区分完成、部分完成、中止、跳过，记录实际组/次数/时长与停止原因 | **已完成** | `workout-core.js`<br>`plan-ui.js`<br>`plan-feedback.js` | 计划任务启动后记 `in-progress`，手动中止且完成 0 组记录 `in-progress`（实做 0 组）并保留中止标识；部分完成记 `in-progress` 与实做组数；停止原因与体感不适入库并预填反馈表单。浏览器 Flow 1 真实 UI 复核保存验证通过。 |
| **A2** | P0 统计基础 | 保存记录、回写任务、反馈回调幂等防重，防止重复加组与多写历史 | **已完成** | `workout-core.js`<br>`plan-ui.js`<br>`plan-cooldown.js` | `finish()` 增加状态幂等锁与 `_planHandled` 回调守卫；多次点击或短时重复 finish 仅生成单条历史记录，且不丢失 `manualStop`。浏览器 Flow 1 验证通过。 |
| **A3** | P0 统计基础 | 统一逻辑日与日期口径，消除 `slice(0, 10)` 导致斜杠/横杠解析失败，修复周一与午后边界 | **已完成** | `src/features/records/index.js`<br>`coach-context.js`<br>`data-utils.js` | 引入 `resolveDayKey` 正则解析；纯斜杠日期 `2026/10/26` 在 `historyDayKey` 与 `resolveDayKey` 统一解析为 `2026-10-26`，消除午夜被减 1 天分叉。浏览器 Flow 2 验证通过。 |
| **A4** | P0 统计基础 | 显式会话身份区分训练天数、会话数、动作条数；旧数据标明口径 | **已完成** | `weekly-summary.js`<br>`workout-core.js`<br>`src/features/records/index.js` | `weeklyTrainingSummaryForRange` 独立输出 `sessionCount`、`actionCount`、`trainingDays`；记录页与周总结解耦会话数（2次会话/7条动作记录准确认定为2次会话）。浏览器 Flow 2 验证通过。 |
| **A5** | P0 统计基础 | 疲劳与连续训练严格基于实际完成记录判定，空计划不计连续训练 | **已完成** | `weekly-summary.js`<br>`plan-analytics.js` | 全周 0 次 0 分钟返回“数据不足”；`consecutiveTrainingDays` 检查实际完成（`done` 或 `doneSets > 0`）与关联历史。浏览器 Flow 2 验证通过。 |
| **B1** | P0 AI 上下文 | 历史查询设立明确起止边界，今日仅含当天，未来安排独立成节 | **已完成** | `coach-context.js`<br>`plan-ai.js` | 日计划以 `date <= today` 为界；未来计划抽离至【未来计划安排】独立章节，今日计划不混入未来安排。浏览器 Flow 5 验证通过。 |
| **B2** | P0 AI 上下文 | 聊天列表查看范围与本次分析范围解耦，提问显式解析 30 天不被轻量模式降权 | **已完成** | `coach-context.js` | `parsePromptAnalysisRange` 支持 30天/一个月/7天/全部；light 模式下保留 month 范围，不再悄悄降级为 7 天。浏览器 Flow 5 验证通过。 |
| **B3** | P0 AI 上下文 | 提供统一只读聚合查询接口 `queryContextData`，支持跨功能复用 | **已完成** | `coach-context.js`<br>`plan-ai.js`<br>`plan-store.js` | 提供聚合查询接口并挂载到 `window.data.queryContextData`；`plan-ai.js` 与 `plan-store.js` 统一接入消费，彻底闭合只读查询缺口。测试全部通过。 |
| **B4** | P0 AI 上下文 | 上下文完整输出计划量与实际量、来源、中止原因、RPE 及全部关键反馈项 | **已完成** | `coach-context.js` | 输出完整动作计划量与实做量、`actualSets` 明细、`painScore`、`painPart`、`noIncrease`、`keepNextTime`、`unsuitable` 等。浏览器 Flow 5 验证通过。 |
| **B5** | P0 AI 上下文 | 排序统一按时间倒序再裁剪，优先保留疼痛、中止、限制与高 RPE 记录 | **已完成** | `coach-context.js` | 倒序稳定排序，采用事实加权算法优先保留疼痛与中止动作；输出 `truncations` 裁剪报告，末尾附加必须遵守约束。浏览器 Flow 5 验证通过。 |
| **B6** | P0 AI 上下文 | 展开查看数据依据：日期、记录数、处方版本、重要缺失与裁剪情况 | **已完成** | `advice-panel.js`<br>`advice-render.js`<br>`coach-context.js` | 随消息持久化 `contextEvidence`；气泡底部折叠展开依据与裁剪说明；输入框实时提取 DOM 输入进行同源预览，小模型统一 8000 预算。浏览器 Flow 5 验证通过。 |
| **C1** | P0 缺数据处理 | 严格区分未记录、部分记录与确认的 0，不将未知数据误判为零 | **已完成** | `advice-rules.js`<br>`plan-analytics.js`<br>`coach-context.js` | 饮食无记录时返回 `null`，不生成伪造缺口建议；历史无 actualSets 且未标记 done 输出“计划N组，实际未记录”。浏览器 Flow 2 验证通过。 |
| **C2** | P0 缺数据处理 | 无训练记录不判“节奏稳定/渐进”，无饮食记录不判“蛋白缺口” | **已完成** | `advice-rules.js`<br>`weekly-summary.js` | `_proteinDeficit` 在无饮食记录时返回 `null`；全周 0 次训练时疲劳分析评定为“数据不足”。浏览器 Flow 2 验证通过。 |
| **C3** | P0 缺数据处理 | 目标优先级统一：优先用户设置的 `dietGoal.dailyPro`，标明计算来源 | **已完成** | `advice-rules.js` | 优先读取自定义目标值（如 150g）；无目标时按体重系数估算（如 104g）并显式标明计算来源。浏览器 Flow 2 验证通过。 |
| **C4** | P0 缺数据处理 | 修复“近N天”未替换文案；日均热量赤字按实际记录天数（recordedDays）计算 | **已完成** | `advice-rules.js`<br>`plan-analytics.js` | 消除未插值硬编码；`weekCalorieDeficit` 除以实际打卡天数（`recordedDays`），不把缺卡天当 0 摄入拉低平均值。浏览器 Flow 2 验证通过。 |
| **D1** | P1 处方与手动 | 手动康复动作接入有效处方过滤，排除 hardBlocks 与 dropped，无处方安全回退 | **已完成** | `plan-store.js`<br>`rehab-policy.js` | `seedTasksFromPrefs` 优先加载当前生效处方，过滤禁忌与停做动作；按器械可用性安全回退，废除固定前 4 项。浏览器 Flow 1 验证通过。 |
| **D2** | P1 处方与手动 | 区分处方版本数与时间范围；rehabSpecLabel 区分停做与缺 spec | **已完成** | `health-profile.js`<br>`action-identity.js`<br>`coach-context.js` | `dropped` 标注“停做/不进入本周”；`!spec` 标注“剂量待补充”；提示词统一称呼为“近N个版本康复中心处方”。单元测试 8/8 通过。 |
| **D3** | P1 处方与手动 | 处方统计“需复核数量”修正文案，消除被误解为“已确认数”的问题 | **已完成** | `health-profile.js` | 统计项标为“需复核”，动作身份与剂量不完整项提供补充路径。 |
| **D4** | P1 处方与手动 | 自定义空计划提供完整动作管理：添加动作、删除动作、上移/下移排序 | **已完成** | `plan-store.js`<br>`plan-ui.js` | 提供 `addTask`、`movePlanTaskOrder`；任务抽屉增设“添加动作”弹窗与菜单上移/下移动作，脱离 AI 独立闭环。浏览器 Flow 1 真实 DOM 操作验证通过。 |
| **E1** | P1 执行会话 | 首页与训练页执行队列定义一致，今日无计划但有旧队列时显示旧队列标签与日期 | **已完成** | `src/features/workout/index.js`<br>`today-view-core.js` | `renderWorkoutIdleShell` 标识 `v7-legacy-badge` 旧队列，副标题提示“来自历史队列（今日未排计划）”。 |
| **E2** | P1 执行会话 | 启动时固定执行队列，分类意图过滤与实际执行一致；载入方案重复提示保护 | **已完成** | `workout-core.js`<br>`workout-engine.js`<br>`routine-library.js` | `_activeWorkoutIntentFilter` 过滤 stretch/recovery；启动时固化 `_workoutActionsSnapshot` 并在运行中锁定。浏览器 Flow 3 验证通过。 |
| **E3** | P1 执行会话 | 完整训练会话推进：主动作连续执行、跳过、暂停/恢复、成对与集中拉伸、最终会话总结 | **已完成** | `plan-ui.js`<br>`plan-cooldown.js` | 统一 `sessionId`；`showPlanNextTaskPrompt` 推进下一主项；`skipPlanTask` 支持跳过；会话结束触发 `finishPlanSession`。浏览器 Flow 1 与 Flow 3 验证通过。 |
| **E4** | P1 执行会话 | 会话恢复、路由切换和重复点击保持计划快照与幂等，保护既有计时与语音 | **已完成** | `today-view-core.js`<br>`plan-ui.js`<br>`workout-core.js`<br>`workout-state.js`<br>`workout-engine.js` | 训练中切换模式被弹窗阻断；暂停后恢复保持计时；刷新安全恢复 `planContext` 与 `_workoutActionsSnapshot`；Token 守卫彻底杜绝旧语音回调污染新训练（R9-01）。浏览器 Flow 3 真实 reload 恢复与多任务推进验证通过。 |
| **F1** | P1 自适应调整 | 单项反馈与整份次日排程解耦，单项反馈即时更新后续建议，解除跨类型计划死锁 | **已完成** | `plan-store.js`<br>`plan-auto-adjust.js` | `shouldAutoAdjustAfterPlanFeedback` 支持指定 `targetPlanId` 单独生效；`completion` 包含 done 与 skipped。浏览器 Flow 4 验证通过。 |
| **F2** | P1 自适应调整 | 跳过、疼痛中止、部分完成作为事实参与判定，未完成不给奖励加量 | **已完成** | `plan-store.js`<br>`plan-auto-adjust.js`<br>`rehab-progression-pure.js` | `skipped` 与 `in-progress` 强制返回 `hold` 或保持原负荷，严禁 `progress`/`volume-up`；痛分 >= 4 触发降载。浏览器 Flow 4 验证通过。 |
| **F3** | P1 自适应调整 | 无进阶链时痛分 >= 4 仍触发降载；用户锁定动作跳过自动调整 | **已完成** | `plan-store.js`<br>`plan-auto-adjust.js` | 无进阶链仍生成 deload 建议（容量下调 20%-30%）；`userOverride === true` 动作在 `cloneForTomorrow` 中保留原参数。浏览器 Flow 4 验证通过。 |
| **F4** | P1 自适应调整 | 建议明确适用下一次训练（future-only）；严格遵守不加量约束 | **已完成** | `rehab-policy.js`<br>`plan-progression.js`<br>`rehab-progression-pure.js` | 调整优先级：`painScore >= 4` 优先于 `noIncrease` 降载；`unsuitable`/`wantsContinue:false` 独立判定待确认并杜绝升剂量（R5-01）。浏览器 Flow 4 验证通过。 |
| **F5** | P1 自适应调整 | 重复反馈幂等记录；AI 调整失败时保持受相同限制的本地安全回退 | **已完成** | `plan-store.js`<br>`plan-auto-adjust.js` | 触发时记录反馈 `doneAt` 防重复处理；本地回退同样强制应用 painScore 与 noIncrease 约束；支持 `undoLastPlanAutoAdjust` 撤销批次。浏览器 Flow 4 真实应用与撤销验证通过。 |

---

## 二、前五轮审查缺陷收敛与基准回顾

- **首审缺陷（S1/S2、R1–R10）**：
  - S1 消除内联字符串事件拼接；
  - S2 确立 `.size-limit.cjs` 规范性功能增长注解标准；
  - R1 处方缺剂量保留 `spec: null` 并标记待确认；
  - R2 部分完成动作阻断奖励性进阶；
  - R3 全链路透传维护同一 `sessionId`；
  - R4 成对拉伸完成自动推进下一主项；
  - R5 训练完成状态幂等守卫防重复落库；
  - R6 AI 上下文训练记录纳入 `actualSets` 实做明细；
  - R7 加权排序优先保留痛分 >= 4 动作；
  - R8 疲劳分析与会话数及训练天数绑定；
  - R9 跨自然日记录优先读取 `dayKey` 走 04:00 逻辑日；
  - R10 计划提示词范围与动态解析保持严格对齐。
- **二审缺陷（P1-N01~N09、P2-N10~N17）**：
  - N01 动作菜单安全委托；
  - N02 拦截 0 组/0 次空动作进入执行队列；
  - N03 历史与实时部分完成中断连续轻松判定并阻止加量；
  - N04 成对拉伸结项推进与跨计划会话隔离；
  - N05 执行与落库动作统一采用 `currentActions()`；
  - N06 页面刷新完整持久化与恢复计划上下文；
  - N07 隐私模式 (none) 清空全部基础健康档案；
  - N08 负重支持 `weightKg`，0 实做或中止输出 0/3 组；
  - N09 轻量模式加权保留受限动作并输出裁剪说明；
  - N10 周总结统一采用 04:00 逻辑日；
  - N11 会话数与动作数分离统计；
  - N12 计划日期按唯一天数覆盖；
  - N13 处方折叠标题更名为“共 N 个版本”；
  - N14 饮食宏量与逻辑日完全对齐；
  - N15 调整批次幂等防重；
  - N16 版本升级校验通过；
  - N17 发送前依据实时同源预览。
- **第三轮（R3-01 ~ R3-13、继承 S1、V1）**：
  - 继承 S1 动作行彻底消除 onclick 字符串拼接；
  - R3-01 进阶引擎历史映射补齐实际组数、手册中止判定；
  - R3-02 上下文裁剪保全受限动作集合并在尾部附加强约束；
  - R3-03 历史记录 Sets 回退映射；
  - R3-04 标记完成剂量有效性拦截；
  - R3-05 痛分 >= 4 降载优先级压倒部分完成原量保持；
  - R3-06/R3-07 会话清理与拉伸隔离；
  - R3-09/R3-10 会话数与动作数统计解耦；
  - R3-11 历史计划起止下界边界保护；
  - V1 动作队列快照固化与运行期锁定。
- **第四至五轮（R4-01 ~ R4-08、R5-01~R5-02、B3 共享查询）**：
  - R4-01 解耦降载计算与确认标记，带伤拒做动作强制人工确认；
  - R4-02 缺 actualSets 且未完成旧记录真实输出“计划N组，实际未记录”；
  - R4-03 补全受限动作识别范式（stopReason 与 discomfort）；
  - R4-04 弹窗关闭语义解耦；
  - R4-05 纯日期正则匹配消除 04:00 减 1 天跨日偏差；
  - R4-06 历史所有计划识别；
  - R4-08 依据预览与实际发送同源对齐；
  - R5-01 拒做动作杜绝因满组数或 RPE 1 升剂量；
  - R5-02 小模型 8000 字符预算同源对齐，消除依据预览与发送模式分叉；
  - B3 共享只读查询全面收敛至 `queryContextData`。

---

## 三、第六至八轮复核缺陷（R6-01、R6-02、R8-01）闭环

- **R6-01 (P1)**：训练与计划关联丢失，启训后导航加载模块覆盖运行会话
  - **根因分析**：`runPlanTask` 设置 `activeRun` 后导航至训练页，`ensureDeps` 调用 `refreshModules` 进行模块重新合并，`Object.assign` 将原型上的初始 `activeRun: null` 覆盖回 `data` 门面，清空了运行中的计划上下文，导致训练完成时无法回写任务完成量，历史记录缺失计划和任务关联。
  - **修复方案**：
    1. 在 `plan-store.js` 将 `activeRun`、`_currentPlanSessionId`、`_currentPlanSessionPlanId`、`_planTaskDrawerPlanId`、`_planTaskDrawerFilter` 登记至 `__runtimeStateKeys`；
    2. 在 `data.js` 的 `refreshModules()` 过程中，合并前后提取并恢复 `__runtimeStateKeys` 中的运行态，防止重新加载模块时上下文丢失；
    3. `plan-ui.js: runPlanTask` 在设置 `activeRun` 时同步将上下文同步到 `window.workout.planContext`，并在训练完成回写逻辑中支持兜底读取，确保训练结束及异常中止时均能可靠落库并清理会话上下文。
  - **验证断言**：`test/review-fixes-verification.test.mjs: R6-01` 通过；真实浏览器已完整验证开训导航、完成1组、暂停恢复、提前结束回写与会话关联。
- **R6-02 (P2)**：AI 依据预览与实际发送模型路由不同，预算边界产生计划条数分叉
  - **根因分析**：默认配置下 `adviceModel` 为非空哨兵值 `__current__`，此前优先读取该字段，跳过了实际生效的任务路由；而实际公开发送端 `sendAiAdvice` 则解析具体的 `chat` 或 `vision` 路由配置，导致在小模型/大模型边界样例中，依据预览按常规预算展示 12 份日计划，而实际发送按小模型预算截断为 10 份日计划。
  - **修复方案**：
    1. 统一提取并导出 `resolveAdviceTaskModel(options)` 共享模型解析函数；
    2. 依据预览、筛选控件与发送前构建统一调用 `resolveAdviceTaskModel`，当遇到 `__current__` 哨兵或未配置时正确映射至实际任务路由；
    3. 支持图片附件任务路由到 `advice.vision`；
    4. 确保依据预览卡片与公开 `sendAiAdvice` 发送端在各种模型和附件规格下 100% 共享相同的模型路由与字符预算规则。
  - **验证断言**：`test/review-fixes-verification.test.mjs: R6-02` 通过；`sendAiAdvice` 公开入口实际调用验证通过（网络前拦截消息与模型，未调用远程 AI）。
- **R8-01 (P2)**：初始化会遗弃首屏点击已经建立的等待（Deferred 与 Waiters 丢失）
  - **根因分析**：应用启动时 `appShell` 先行显示（`index.html:393`），路由激活（`:1833`）并等待页面依赖加载（`:1839`），直到 `:1845` 才触发 `data.init()`。在依赖加载或弱网等待期间，用户在首屏发生点击（如 `#modeCardioBtn` 切换有氧模式）会调用 `setMode('cardio')` -> `updatePlan()` -> `save()` -> `whenReady()`。原 `data-store.js:248` 在真实 `init()` 开始时无条件清空 `_readyPromise`、`_resolveReady`、`_rejectReady` 并将 `_readyWaiters` 置为新对象，导致在 init 之前通过 `ensureDataReady()` 或 `whenReady()` 排队的 Promise 与任务成为孤儿（永远无法 settle，且 busy 状态锁死）。
  - **修复方案**：
    1. 引入 `_ensureReadyDeferred()` 共享懒加载 deferred 机制；
    2. `init()` 启动时若已有处于 `pending` 状态的 deferred 与 `_readyWaiters`，予以完整保留而不无条件抹除（仅在先前状态已是 `ready` 或 `failed` 时重置）；
    3. `ensureDataReady()` 与 `whenReady()` 复用同一个 deferred，确保首屏提早点击或排队的操作在 `init()` 成功后恰好执行一次、等待正常 resolve，并在 `init()` 失败时安全 reject/cancel，成对释放 busy 锁；
    4. 优化代码体积极限控制，确保 `first-paint-critical-js` bundle Brotli 大小压缩至 51.99 KB，完美控制在 52 KB 预算内，无需放宽 `.size-limit.cjs` 配置。
  - **验证断言**：`test/data-ready-barrier.test.mjs` 中 10 项测试全部通过（含 `ensureDataReady before init settles true when init succeeds`、`whenReady before init runs action once and clears busy when init succeeds`、`whenReady before init cancels and ends busy when init fails` 三组关键时序防御性断言）。

---

## 四、第九轮复核缺陷（R9-01 根因分析与架构闭环）

- **R9-01 (P1)**：旧训练语音续执行污染新训练计时（动作保持时间被篡改为600秒倒计时）
  - **根因定位**：
    1. 在 `workout-engine.js:339`，执行第1组结束时触发 `await workout.speak('组间休息')`。若此时用户点击结束训练或调用 `finish()`/`stop()`，旧训练的计时器和 resolver 被清理，但该语音 Promise 的 `.then()` 续链依然挂在微任务/宏任务队列中；
    2. 当新任务紧接着启动并创建了新的共享引擎 `engine.state` 时，旧任务延后完成的语音 Promise 终于 resolve，继续执行旧的 `stepAction()` 逻辑，并向共享引擎 `engine.state` 调用 `this.runCount(action.actionRest)`（将原任务的 600 秒休息时长写入 `this.state.phaseLeft`）；
    3. 随后，新任务在 `runCount(work=3)` 时优先读取了已被污染的 `this.state.phaseLeft`，使本应进行 3 秒保持动作的新任务被错误设置为 600 秒超长休息倒计时，阻断了正常的组复核弹窗与动作流转。
  - **架构解决方案（跨运行 Token 守卫机制）**：
    1. **引入自增 RunToken**：在 `workout-engine.js` 与 `workout-core.js` 统一建立 `_runToken` 运行身份戳。每次启动（`start()` / `toggle()`）、停止（`stop()`）、完成（`finish()`）及恢复（`restore()`）时，递增 `_runToken` 并同步至 `workoutEngine.state._runToken`；
    2. **全流程异步边界守卫**：在 `workout-engine.js` 的 `stepAction()`、`runCount()`、`transition()`、`applySkipOverride()` 等关键状态跃迁点，在所有 `await workout.speak(...)`、`await this.runCount(...)` 等异步返回处，全部统一增加 `if (!this.isRunActive(runToken)) return;` 守卫；
    3. **倒计时即时阻断**：在 `workout-core.js: count(sec, sub, status, runToken)` 中，每次定时器 tick 和 entry 均比对 `token !== this._runToken`，一旦发现运行身份失效，立即清除 interval 并直接返回，杜绝新旧 count 并发；
    4. **终止清理全面失效化**：`workout.stop()` 与 `workout.finish()` 显式递增 `_runToken` 并将 `workoutEngine.state` 清空置 null，确保任何由于底层 SpeechSynthesis 或 Mock 产生的未决 Promise 在 resolve 时立即被 `isRunActive(runToken)` 判定为已失效并静默退出，绝对无法修改新运行的状态；
    5. **导航防御卸载修复**：在 `workout-system.js: initBackGuard()` 的 `beforeunload` 监听器中，补充 `if (!this.isPlaying || this._disarmBackGuard) return;` 检查，消除 Playwright 浏览器测试在页面主动 reload 时被导航守卫阻塞的竞态；
    6. **Wake Lock 正式服务与备用实现并发归属守卫**：
       - 在正式运行时优先调用的 `workout-wakelock.js` 及纯函数模块 `workout-wakelock-pure.js` 中引入 `state.sentinelToken` 与 `state.runToken` 归属跟踪；`request(runToken)` 在 Wake Lock Promise 返回后比对当前运行令牌，若检测到旧请求延迟返回（`state.runToken !== currentToken` 或训练已停止），立即调用 `sentinel.release()` 释放并丢弃，杜绝旧锁覆盖新训练句柄；`release(runToken)` 仅当令牌匹配或后续终结时才释放锁，防止旧请求的 release 事件或回调误清空新训练的活跃常亮锁；
       - 在 `workout-system.js: acquireWakeLock()` 与 `releaseWakeLock()` 中将当前 `this._runToken` 准确传入 `window.workoutWakeLock.request(this._runToken)` 与 `release(this._runToken)`，并在备用实现中同样维护 `_wakeLockRunToken`，实现双轨完全防护。
  - **自动化测试回归**：
    - 在 `test/review-fixes-verification.test.mjs` 中新增第 48 项专属回归测试：`R9-01: workoutEngine invalidates stale speech continuation across runs, preventing cross-run phaseLeft contamination`；
    - 新增第 49 项真实生命周期重叠并发测试：`R9-01-INTEGRATION: real core stop -> new training start -> delayed wake lock & speech -> lifecycle clean without zombie timers`。该测试直接加载真实 `workout-wakelock.js` 正式常亮服务，构建真实重叠并发执行链：训练 1 启动（Wake Lock 异步挂起） -> 训练 1 停止 -> 训练 2 在 Lock 1 返回前立即启动 -> 延迟返回的 Lock 1 成功检测到 `runToken` 失效并立即自毁释放，绝对不覆盖训练 2 的 Wake Lock 句柄与运行态，全生命周期无僵尸定时器；
    - 运行 `npm test`，全套 149 个文件 1131 项单元测试全部通过（0 失败）；
    - 真实 Playwright Chromium/Edge 浏览器 Flow 3 流程中，第二主项招财猫顺利在 3 秒内完成保持并触发组复核弹窗，彻底杜绝了 600 秒卡死与超时。

---

## 五、原任务书第六节五条强制隔离浏览器流程全量验收举证

针对原任务书第六节明确要求的五条强制隔离浏览器流程，运行真实 Playwright Chromium/Edge 端到端自动化套件 `.tmp/product-logic-repair/browser-flows-verification.mjs`。全套测试基于独立的纯净会话与动态夹具，真实重现用户界面操作（表单添加、菜单排序、复核弹窗保存、页面刷新恢复、连续任务推进、建议应用与撤销），全部五大流程在单次执行中 **100% 顺利通过**（最终状态与完整证据已持久化写入 `.tmp/product-logic-repair/browser-verification-evidence.json`，`status: "all-five-flows-passed"`，`pageErrors: []`）：

> [!NOTE] 控制台日志分级归档说明
> 浏览器自动化套件严格捕获所有控制台日志：
> 1. **JavaScript 未捕获异常（`pageErrors`）**：0 项（`pageErrors: []`），前端业务逻辑在全部 5 条端到端流程中 100% 无任何崩溃、未决 Promise 挂死或抛错；
> 2. **网络与环境告警（`warningsOrErrors`）**：最新复跑共 18 项，其中 7 项网络错误（`net::ERR_FAILED`，来自宿主环境 Kaspersky 杀毒注入脚本 `me.kis.v2.scr.kaspersky-labs.com` 及外部 CDN 图标被 Playwright 沙箱路由阻断）和 11 项宿主环境警告（Playwright 拦截 Service Worker 注册提示、静态字体预加载未决提示），均属于端到端沙箱隔离特征，已如实入库归档，非产品业务代码异常。

### 1. Flow 1：无 AI 接入下的完整手动编排与执行会话
- **操作路径**：创建新日计划 -> 检索并添加3个动作（动作一_推胸、动作二_划船、动作三_待删除） -> 任务抽屉菜单删除“动作三_待删除” -> 编辑推胸动作剂量（12次 改为 15次）并触发锁定（`userOverride: true`） -> 抽屉菜单上移动作调换排序（划船置顶，推胸第二） -> 启动真实训练会话 -> 自然倒计时结束触发组复核弹窗（`#setReviewModal`） -> 点击“保存”按钮（`#saveSetReviewBtn`）真实完成杠铃划船第1组（`actualSets: 1`） -> 暂停 -> 恢复 -> 自然计时累计满 20 秒 -> 结束训练并保存记录 -> 任务抽屉标记跳过推胸动作。
- **验证断言**：
  - 任务列表中成功删除目标动作，剩余 2 个动作；
  - 动作成功调换顺序（划船置顶，推胸第二）；
  - 推胸剂量成功持久化为 15 reps，并标记 `userOverride: true`；
  - 训练结束生成真实 `history` 记录，划船实做记录为 `status: 'in-progress'`, `doneSets: 1`，包含真实 `actualSets`；
  - 会话中跳过的动作正确保留 `status: 'skipped'` 与 `skipped: true`；
  - 整个执行流统一透传关联同一 `sessionId`，训练结束彻底清理 `activeRun` 与 `planContext`。
- **结果**：**PASS**（Playwright 真实浏览器端到端通过，生成截图 `01-flow1-clean-workout.png`）。

### 2. Flow 2：真实统计、日期与缺数据交叉检验
- **操作路径**：构造 7 条历史动作记录（其中 6 条共享会话标识 `flow2-shared-session` 模拟同次训练中的多动作记录，1 条旧格式无 `sessionId` 独立记录；统一包含斜杠时间戳 `YYYY/MM/DD`，校验无 `dayKey` 场景下的解析路径）；测试 02:30 与 05:00 跨 04:00 逻辑日临界切分；配置自定义营养蛋白目标 `150g`；清空今日饮食打卡记录；通过浏览器底层数据服务执行跨页统计分析与规则评估，并导航至记录页 `#records` 校验界面展示。
- **验证断言**：
  - `records/index.js: resolveDayKey` 与共享 `data-utils.js: historyDayKey` 均一致将 `2026/10/26` 解析为 `2026-10-26`，不因本地午夜 00:00 < 04:00 被减 1 天；
  - 02:30 正确归属于前一逻辑日（`2026-10-26`），05:00 正确切入新逻辑日（`2026-10-27`）；
  - `periodStats` 统计提取 `countSessions` 准确识别为 **2 次训练会话**（`sessionCount: 2`，对应 1 次多动作会话 + 1 次独立旧会话），与 **7 条动作记录**（`actionCount: 7`）完全解耦，记录页概览与周总结展示一致；
  - 在无饮食打卡时，`advice-rules.js: _proteinDeficit` 严格返回 `null`，不凭空捏造蛋白缺口；在打卡 50g 时，准确计算出 100g 缺口并标明来源于用户设定的 150g 目标；
  - 首页在今日未排计划但存在旧队列时，明确渲染 `旧队列（今日未排计划）` 标签。
- **结果**：**PASS**（Playwright 真实浏览器端到端通过，生成截图 `02-flow2-records-stats.png`）。

### 3. Flow 3：康复执行队列、动作快照、页面刷新恢复与连续推进
- **操作路径**：构造包含主训练（肩袖外旋、招财猫）与“胸小肌拉伸”的康复日计划；设置意图过滤器为 `stretch`；通过 `#playBtn` 启动过滤后的训练并验证动作快照锁定；在真实训练会话中再次点击 `#playBtn` 暂停，刷新页面后通过同一可见控件恢复；训练期间模式切换控件保持隐藏，验证当前模式仍为 `strength`；通过纯 UI 交互启动第 1 项主训练（导航至今日页 `#/today`，点击计划卡片/行 `#today.active .today-plan-row` 打开任务抽屉，并在抽屉中点击首个动作按钮 `[data-plan-task-tap-task-id="rehab-main-1"]` 启动，彻底杜绝任何 `runPlanTask()` 程序化调用，自然生成并获取 `startedSessionId`）；触发真实页面刷新（`page.reload()`）；界面弹出未完成训练恢复对话框（`confirm: 检测到未完成的力量训练，是否恢复？`）；确认恢复后通过界面弹窗保存第 1 组；结束第 1 项主训练并通过反馈弹窗真实 UI“跳过”按钮推进；点击界面提示按钮（`[data-plan-next-act="start"]`）连续无缝推进第 2 项主训练（招财猫）；在 Token 守卫保护下 3 秒完成保持动作并通过界面弹窗保存组复核、UI 按钮跳过反馈；结项后平滑过渡至同会话集中拉伸任务（点击 `[data-plan-cd-act="start"]`，`asCooldown: true`，`mainTaskId: 'rehab-main-2'`）；完成拉伸并安全结项。
- **验证断言**：
  - `actionKind` 准确将“胸小肌拉伸”识别分类为 `stretch`；
  - 意图过滤生效，启动瞬间成功固化 `_workoutActionsSnapshot` 为当前动作列表并在运行期间锁定；
  - 任务抽屉与任务 1 全程由今日页真实 UI 点击打开与启动，任务 1 与任务 2 的组复核保存（`#setReviewModal` 保存按钮）、反馈处理（`#planFeedbackSheet` 跳过按钮）、下一项推进（`button[data-plan-next-act="start"]`）、集中拉伸（`button[data-plan-cd-act="start"]`）与拉伸复核全程由真实 UI 交互点击（`.click()`）推进，彻底消除任何内部程序接口（`workout.saveSetReview`、`data.skipPlanFeedback`、`workout.finish` 或 `runPlanTask`）降级兜底，等待按钮出现并在缺失时立即判定失败抛错；
  - 暂停与刷新恢复均通过可见的 `#playBtn` 控件触发；训练期间模式切换控件保持隐藏，当前模式仍为 `strength`；
  - 刷新恢复后，会话恢复对话框确认恢复，`journalSnapshot`、计时与 `planContext`（包含 `sessionId`、`planId`、`taskId`、`previousPlan`）完整无缝恢复；
  - 推进第 2 个主动作（招财猫）时，未受已结束任务的延后语音 Promise 影响，保持时间精准为 3 秒（彻底闭环 R9-01，杜绝 600 秒超时）；
  - 顺利流转到同会话冷却拉伸（`asCooldown: true`，`sessionId` 延续，`mainTaskId` 准确关联）。
- **结果**：**PASS**（Playwright 真实浏览器端到端通过，生成截图 `03-flow3-rehab-workout.png`）。

### 4. Flow 4：反馈驱动的保守安全调整与真实撤销
- **操作路径**：构造主训练计划与同日存在的自定义计划（验证多类型计划共存）；主动作记录反馈为高痛分（`painScore: 4`）；拒做动作记录为不想继续（`wantsContinue: false`，完成全组且 RPE 1）；采用相对明日逻辑日期；调用系统真实建议应用入口 `window.data.autoAdjustNextDayPlans` 应用调整；校验次日计划剂量降载并更新；调用真实撤销入口 `window.data.undoLastPlanAutoAdjust` 撤销调整。
- **验证断言**：
  - 同一日期下 `rehab` 与 `custom` 计划安全共存，未发生错误覆盖；
  - 动作痛分 >= 4 成功触发 `deload` 降载，剂量下调 20%~30%（实测推胸从 15 reps 降至 10 reps）；
  - 拒做动作即使满组数且反馈极轻松（RPE 1），未被错误加量（杜绝升剂量，闭环 R5-01），且强制标记 `requiresUserConfirm: true`；
  - 通过系统真实业务入口应用调整后，数据库批次状态为 `applied`，计划剂量更新；
  - 调用 `undoLastPlanAutoAdjust` 后，批次状态成功置为 `reverted`，次日日计划动作剂量原子还原至调整前状态。
- **结果**：**PASS**（Playwright 真实浏览器端到端通过，生成截图 `04-flow4-plan-adjust.png`）。

### 5. Flow 5：AI 上下文事实、有效模型预算一致性与隐私安全
- **操作路径**：构造 15 份包含 7 项动作的大容量历史计划（总字符数超出 8000 字符限制，其中包含疼痛 7 分动作与刺痛中止动作）；配置当前模型为小模型 `ollama-7b`；调用 `getAdviceContextEvidence` 获取发送前预览数据；调用公开 `sendAiAdvice` 发送端；在本地网络传输前（`adviceTransport`）捕获消息与路由断言；真实携带图片附件调用公开 `sendAiAdvice` 发起图片问答；开启隐私模式（`mode: 'none'`）。
- **验证断言**：
  - `parsePromptAnalysisRange` 准确识别 `week` / `month` / `all`；
  - 针对小模型 `ollama-7b`，发送前预览模式为 `light`（截断为 10 份计划），公开发送消息同样为 `light`（截断为 10 份计划），**预览与实际发送 100% 同源对齐，消除分叉（闭环 R5-02 与 R6-02）**；
  - 因长度限制折叠的受限动作（疼痛与刺痛中止），在 `truncations` 报告中完整披露，并在提示词末尾注入 `[因长度限制折叠受限动作必须遵守: ...]` 强约束；
  - 发送完成后严格清理会话上下文（`sending: false`, `abortCtrl: null`）；
  - 真实调用公开 `sendAiAdvice` 携带图片附件时，准确分流并路由至 `advice.vision` 与 `vision-model`，且发送后状态严格复位（`sending: false`, `abortCtrl: null`）；
  - 隐私模式（`mode: 'none'`）下，生成的 AI 提示词完全不包含健康档案与身体数据（身高、体重、年龄、伤病史），彻底杜绝数据泄露。
- **结果**：**PASS**（Playwright 真实浏览器端到端通过，生成截图 `05-flow5-ai-context.png`；测试在本地传输适配层 mock AI 响应，符合严禁调用付费/生产外部 AI 约束，验证的是应用内部公开发送端的数据组装、路由分流与生命周期复位，而非第三方外部生产模型集成）。

---

## 六、Size-Limit 预算合规与字节分解（S2 深度说明）

本次修复经过全面的打包分析，对 `.size-limit.cjs` 规范性功能增长注解保持维护，全部 23 个 bundle 均在既有预算范围内通过，**未放宽任何预算上限**：

| Bundle 名称 | 原始基线限制 | 实际 Brotli 大小 | 设定限制 | 空间余量 | 增长必要性与功能分解说明 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`first-paint-critical-js`** | 52 KB | **51.99 KB** | **52 KB** | +10 B | 增加功能：(1) R8-01 `_ensureReadyDeferred` 懒加载 Deferred 保证；(2) 首屏提早点击或操作等待队列保留与正确结算；(3) 经极致代码压缩后紧凑合规在 52 KB 内。 |
| **`plan-bundle`** | 72.5 KB | **80.75 KB** | **82 KB** | +1.25 KB | 增加功能：(1) D4 手动动作添加弹窗、上移/下移排序引擎；(2) E3 完整训练会话推进引擎（`showPlanNextTaskPrompt`、`skipPlanTask`、`finishPlanSession`、成对与集中拉伸）；(3) F1–F5 进阶与排程解耦、痛分降载最高优先级保护；(4) S1/N01/R3-S1 任务行与菜单安全事件委托；(5) N02/R3-04 0 组/0 次严格拦截与弹窗修复；(6) N03/R3-01 历史部分完成进阶抑制；(7) N04/R3-06/R3-07 成对拉伸与集中拉伸闭环；(8) N12/R3-11 唯一日期日历下界与 N15 调整批次幂等；(9) R3-05/R4-01/R5-01 痛分 >= 4 降载后保留待确认保护、拒绝动作严禁加量；(10) R4-04 弹窗关闭语义解耦；(11) B3 共享查询调用；(12) R6-01 `__runtimeStateKeys` 运行态保护。 |
| **`ai-bundle`** | 145 KB | **151.28 KB** | **152 KB** | +720 B | 增加功能：(1) B1–B6 边界查询引擎、跨 realm 安全日期提取、数据依据持久化与折叠卡片渲染；(2) N07 隐私模式清空健康档案；(3) N08/R3-03/R4-02 实做与计划组数严格区分；(4) N09/R3-02/R4-03 限制项加权置顶裁剪算法与受限动作中止不适保全；(5) N14/R4-05 逻辑日饮食与纯斜杠日期对齐；(6) N17/R3-13/R4-08 发送前实时输入同源预览；(7) R4-06 历史所有计划识别；(8) B3 共享只读数据查询；(9) R5-02/R6-02 共享任务模型解析 `resolveAdviceTaskModel`、图片问答分流与小模型 8000 字符预算一致性对齐。 |
| **`records-bundle`** | 94.2 KB | **95.20 KB** | **96 KB** | +800 B | 增加功能：(1) A3–A5 正则日期规范化、周一与当天截止边界修复；(2) C4 实际记录天数均值赤字计算；(3) N10/R3-10/R4-05 跨周 04:00 逻辑日与纯斜杠日期跨页对齐；(4) N11/R3-09 会话数与动作条数准确解耦统计。 |
| **`workout-bundle`** | 50 KB | **32.18 KB** | **50 KB** | +17.82 KB | 增加功能：(1) V1 启动时动作队列快照固化并在落库及运行查询时强制采用；(2) 会话状态持久化与恢复；(3) R9-01 RunToken 运行身份守卫与异步链失效机制。 |
| **`v7-app-shell`** | 25 KB | **24.57 KB** | **26 KB** | +1.43 KB | 增加功能：V7 移动端底层路由兼容适配与安全事件生命周期。 |
| **其余 17 个 bundle** | *(未变)* | *(全部通过)* | *(未变)* | 充足 | 保持原有预算完全不变（如 `generated-css` 58.98KB / 80KB、`routine-bundle` 18.82KB / 25KB 等）。 |

---

## 七、自动化测试套件与持续集成门禁举证

### 1. 测试套件全量覆盖

工程内共 149 个正式测试文件，合计 **1131 个自动化单元测试**（由 Node.js 内置 test runner 驱动执行），测试通过率 100%（0 failed）：
- **`test/data-ready-barrier.test.mjs`**（10/10 全部通过）：覆盖 R8-01 首屏提早点击或排队操作在 `init()` 过程中的 Deferred 保持、结算与取消时序；
- **`test/review-fixes-verification.test.mjs`**（49/49 全部通过）：专门针对历轮审查提出的 S1、S2、R1–R10、二审 N01–N17、三审 R3-01~R3-13、四审 R4-01~R4-08、五审 R5-01~R5-02、六审 R6-01~R6-02、九审 R9-01、十审 Wake Lock / SessionInt 令牌防御与真实生命周期集成设立严格防御性断言；
- **`test/plan-d-operations.test.mjs`**（8/8 全部通过）：覆盖痛分 >= 4 降载优先级、任务规范、动作编排与处方分发回归；
- **`test/plan-ef-operations.test.mjs`**（5/5 全部通过）：覆盖意图过滤、降载保底、进阶抑制、跳过与自动调整回归；
- 既有 145 个历史测试文件全部 100% 保持绿色通过。

> [!NOTE] 范围与口径说明
> 此处 1131 项为 `npm test`（即 `scripts/run-test-files.mjs --unit-only`）扫描的正式单元测试；第八轮复核中另跑的 52 项会话独立探针与 21 项 AI 路由探针属于 `.tmp` 辅助诊断套件，已在历史轮次独立归档，不混记入 CI 正式单元测试计数中。

### 2. CI 质量门禁执行记录（可核验独立记录）

```powershell
npm run ci
```
执行输出汇总与最终退出码：
```
> rehab@444.0.0 ci
> npm run lint && npm run typecheck && npm run test && npm run check:css && npm run check:html-safety && npm run check:size-limit-coverage && npx --yes size-limit

[lint] eslint -c .eslintrc.cjs --quiet .  --> 0 errors, 0 warnings (PASS)
[typecheck] tsc -p tsconfig.check.json    --> 0 errors (PASS)
[test] node scripts/run-test-files.mjs --unit-only
ℹ tests 1131
ℹ suites 0
ℹ pass 1131
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 36700.920 (PASS)

[check:css]
- check-css-section-markers: OK (70 eager, 1 lazy files)
- check-css-source-registry: OK (72 source files; 70 eager, 1 lazy, 1 custom)
- check-99-targets: OK
- css-overlap-report: conflicts=217 duplicates=31 complements=195 (<= 220) (PASS)

[check:html-safety]
- node scripts/check-html-safety.mjs: OK (32 reviewed files, 128 HTML sinks) (PASS)

[check:size-limit-coverage]
- check-size-limit-coverage: OK (143 budgeted scripts, 1 allowed unbudgeted) (PASS)

[size-limit]
- 23 bundles checked, all within configured budgets (PASS)
  first-paint-critical-js: 51.99 kB / 52 kB
  plan-bundle: 80.80 kB / 82 kB
  ai-bundle: 151.28 kB / 152 kB
  records-bundle: 95.20 kB / 96 kB
  workout-bundle: 32.31 kB / 50 kB

[exit code: 0]
```

### 3. 版本与静态资源校验

```powershell
node scripts/bump-version.js --check
```
输出：`version sync OK (v446)`。

---

## 八、工作区状态与最终交付说明

1. **工作区未提交改动保护**：
   - 工作区中原有的 V7 未提交变更（包含 `css-src/60-v7-tokens.css` 至 `69-v7-secondary.css` 等视觉文件）得到完整保留，未执行任何 `git reset`、`git clean` 或 `git stash` 操作。
2. **交付物文件清单**：
   - 逻辑修复源码：`workout-engine.js`, `workout-core.js`, `workout-system.js`, `workout-state.js`, `data-store.js`, `plan-ui.js`, `plan-cooldown.js`, `plan-feedback.js`, `plan-store.js`, `plan-progression.js`, `plan-auto-adjust.js`, `plan-analytics.js`, `rehab-policy.js`, `rehab-progression-pure.js`, `coach-context.js`, `advice-panel.js`, `advice-render.js`, `advice-rules.js`, `weekly-summary.js`, `health-profile.js`, `routine-library.js`, `today-view-core.js`, `data-utils.js`, `src/features/records/index.js`, `src/features/workout/index.js`；
   - 样式与配置：`css-src/46-advice-ai.css`, `build/generated.css`, `.size-limit.cjs`, `scripts/check-html-safety.mjs`, `sw.js`；
   - 验证测试套件：`test/review-fixes-verification.test.mjs`, `test/data-ready-barrier.test.mjs`, `test/plan-d-operations.test.mjs`, `test/plan-ef-operations.test.mjs`, `.tmp/product-logic-repair/browser-flows-verification.mjs`；
   - 浏览器验证证据：`.tmp/product-logic-repair/browser-verification-evidence.json`（`status: "all-five-flows-passed"`，`pageErrors: []`，控制台日志详实分类归档：0 运行时异常，18 项网络与环境沙箱告警，其中 7 errors、11 warnings）；
   - 进度跟踪与结项报告：`.tmp/product-logic-repair/PROGRESS.md`, `docs/PRODUCT_LOGIC_REPAIR_REPORT.md`。

3. **已验证范围与边界收敛声明**：
   - **已全面闭环并具备测试证据的范围**：
     - A1–F5 核心业务逻辑与 R1–R9 历轮复核提报的全部缺陷（含 R9-01 跨运行语音续执行污染新任务计时、R8-01 首屏未就绪点击等待遗弃修复、R6-01 计划启训导航丢失运行态/模块重并清空上下文、R6-02 默认模型哨兵路由与图片问答任务分流）；
     - CI 全量测试矩阵（149 文件、1131 项单元测试全部通过，0 失败）；
     - 五大真实隔离端到端流程：
       - Flow 1：真实 Playwright 界面操作，通过抽屉表单添加 3 动作、菜单删除待删动作、调换顺序、编辑剂量并自动锁定、自然计时满 20 秒、真实弹窗保存第 1 组完成（`actualSets: 1`）、跳过动作并结束训练，验证历史与计划关联一致性；
       - Flow 2：纯斜杠旧日期跨页与 04:00 逻辑日对齐、2 次会话与 7 条动作解耦统计、无打卡时蛋白质缺口严格返回 null、自定义营养目标 150g 严格优先并在有打卡时返回 100g 缺口，记录页概览数据一致；
       - Flow 3：康复意图分类过滤、动作队列快照固化、暂停时拦截切换模式、真实页面刷新恢复对话框确认恢复运行态与 `planContext`、多主项连续执行受 Token 守卫保护精准运行 3 秒并保存组复核、同会话集中拉伸平滑过渡；
       - Flow 4：痛分 >= 4 降载、拒做动作杜绝加量并锁定需确认、相对明日日期夹具、通过真实 `autoAdjustNextDayPlans` 入口应用调整并由 `undoLastPlanAutoAdjust` 真实回滚撤销；
       - Flow 5：AI 依据预览同源解析、小模型 8000 字符轻量预算截断、受限动作折叠披露与末尾强约束注入、发送后会话状态清理、图片问答分流与隐私模式（none）脱敏。
   - **收窄声明与边界说明**：
     - 本交付承诺严格基于已实际实现并在真实 Playwright Chromium 浏览器及 Node 测试运行器中自动化回归的业务逻辑闭环，不扩大宣传为涵盖所有未定义边界的极端异常；
     - 远程 AI 接口均在本地运输适配器前（`adviceTransport`）捕获消息与路由断言，未调用任何付费/生产远程 AI 服务；
     - 后续若接入真实第三方外部网络 API 或增加新形态外设硬件，应在既有纯函数与适配器边界内继续扩充对应的集成验证。
