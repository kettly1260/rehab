# Rehab V7 视觉回滚与 V6 精修任务书

> **用途**：交给 Coding Agent / Codex Agent 直接执行。  
> **项目**：`rehab` PWA  
> **任务性质**：V7 视觉纠偏，不是新一轮全面重构。  
> **核心策略**：**V6 做视觉母版，V7 做架构、生命周期、性能和低功耗交互升级。**  
> **目标**：保留已经有价值的 V7 架构成果，撤销/重做失败的 V7 视觉层，使最终产品至少不低于 V6 的成熟度，并在此基础上做有限、可验证、低功耗的精修。  
> **产品视觉定义**：**V6 Refined + Low-Power Liquid Interaction**。

---

# 0. 这份任务书取代什么

本文件是当前视觉工作的最高优先级执行说明。

此前以下内容仍可作为架构、功能迁移和历史记录参考：

- `REHAB_V7_AGENT_TASKBOOK.md`
- `REHAB_V7_VISUAL_RECOVERY_TASKBOOK.md`
- `docs/v7/V6_ARCHITECTURE_MAP.md`
- `docs/v7/V6_FUNCTION_INVENTORY.md`
- `docs/v7/V7_MIGRATION_MATRIX.md`
- `docs/v7/V7_SCREEN_MAPPING.md`
- `docs/v7/V7_DATA_COMPATIBILITY.md`

但是：

> **此前 `docs/v7/visuals/` 下的 V7 SVG 不再是视觉验收标准。**

这些 SVG 只能作为历史设计试验记录。

不得继续：

```text
SVG reference
→ faithfully implement
→ screenshot pass
```

新的视觉真相来源改为：

```text
真实 V6 浏览器页面
+
真实 V6 功能和信息架构
+
本任务书定义的有限精修规则
```

---

# 1. 当前问题的重新定义

当前 V7 不是“功能完全失败”。

应定义为：

```text
V7 Architecture / Lifecycle / Compatibility
           ↓
      大部分可保留

V7 Visual Redesign
           ↓
      方向失败，需要回滚/重做
```

本次不得因为视觉失败而把 V7 架构成果一并删除。

同时也不得因为已经投入大量工作，就继续维护一套用户明确认为比 V6 更差的视觉方案。

---

# 2. 本次工作的不可变原则

## 2.1 V6 是视觉母版

如果 V6 与当前 V7 在视觉上冲突：

> **默认选择 V6。**

除非当前 V7 的变化满足以下至少一个条件：

1. 明确修复 V6 的可用性问题；
2. 明确降低渲染成本；
3. 明确改善移动端布局；
4. 明确改善可访问性；
5. 用户已经确认该新设计更好。

否则不得仅为了“V7 看起来不同”而改变视觉结构。

---

## 2.2 V7 是技术升级，不需要视觉重新发明

V7 的价值主要来自：

- App Shell；
- Router；
- 生命周期；
- Feature ownership；
- 数据兼容；
- Theme Bridge；
- 性能治理；
- Effect budget；
- 更清晰的 CSS ownership；
- 更少的持续 GPU 工作；
- 更稳定的 PWA 行为。

视觉层只需要：

> **比 V6 更统一、更轻、更稳，而不是完全不同。**

---

## 2.3 不再使用“生成效果图”作为本轮设计源

本轮默认：

```text
禁止 ImageGen 重新发明五页 UI
禁止自行生成 SVG 作为设计标准
禁止用概念图替代真实 V6 页面
```

除非用户后续明确要求制作新的概念图并确认接受。

当前阶段必须使用：

> **V6 实际浏览器截图作为视觉 baseline。**

---

## 2.4 不允许整分支 reset

当前 `v7-liquid-glass` 工作区可能已经包含大量未提交修改。

禁止：

```text
git reset --hard
git checkout .
git restore .
```

等全量回滚方式。

必须先分类现有 diff，再逐文件、逐 hunk 处理。

---

# 3. 当前已知应优先保留的成果

以下内容原则上 **KEEP**，除非实际测试证明它们存在 bug：

## 3.1 Theme Bridge

已经修复的动态主题桥接必须保留。

V7 应继续使用：

```text
theme.js
→ --md-sys-*
→ --v7-* semantic tokens
```

必须保留：

- preset 主题色；
- 自定义主题色；
- light；
- dark；
- auto；
- refresh persistence。

不得重新把 V7 主色写死成绿色。

---

## 3.2 App / Lifecycle

优先保留：

```text
src/app/*
src/legacy/adapters/*
```

包括：

- bootstrap；
- router；
- lifecycle；
- feature registry；
- context；
- adapters。

---

## 3.3 Domain 与真实业务

继续保留：

- IndexedDB；
- Workout Engine；
- AI routing / streaming / search / evidence；
- Health；
- Diet；
- Weight；
- Training history；
- Sync；
- Backup；
- Voice；
- WakeLock；
- MediaSession；
- PIP；
- 真实计划和记录逻辑。

---

## 3.4 已有功能测试

不得为了视觉回滚删除已经验证真实功能的测试。

---

# 4. 当前高风险文件分类

开始执行前，Agent 必须基于实际 `git status` 和 `git diff` 重新确认。

以下只是当前已知风险分类。

## 4.1 KEEP / VERIFY

```text
css-src/60-v7-tokens.css
src/app/*
src/legacy/adapters/*
```

`60-v7-tokens.css` 重点确认 Theme Bridge 仍然正确。

---

## 4.2 REWORK VISUAL

以下主要是本轮视觉回滚对象：

```text
css-src/61-v7-primitives.css
css-src/62-v7-effects.css
css-src/63-v7-navigation.css
css-src/64-v7-today.css
css-src/65-v7-workout.css
css-src/66-v7-records.css
css-src/67-v7-coach.css
css-src/68-v7-profile.css
css-src/69-v7-secondary.css
```

不要默认整个删除。

先判断哪些规则是：

```text
结构必要
性能必要
兼容必要
纯视觉试验
```

只撤销失败的纯视觉方向。

---

## 4.3 KEEP BEHAVIOR / REWORK APPEARANCE

```text
src/ui/effects/index.js
src/ui/navigation/bottom-nav.js
src/ui/primitives/secondary-surfaces.js
```

行为和生命周期优先保留。

视觉造型可以重做。

---

## 4.4 HIGH RISK — 逐 hunk 审计

如果这些文件有修改：

```text
index.html
data.js
data-views.js
plan-ui.js
today-view-core.js
src/features/today/index.js
src/features/workout/index.js
src/features/records/index.js
src/features/coach/index.js
src/features/profile/index.js
```

禁止整文件 restore。

因为其中可能混合：

```text
功能修复
V7 lifecycle 适配
数据映射
视觉 DOM 重排
```

必须逐 hunk 判断。

---

# 5. PHASE A0 — 冻结现场与安全记录

开始任何回滚前：

记录：

```text
branch
HEAD
git status
git diff --stat
```

创建：

```text
docs/v7/V7_VISUAL_ROLLBACK_MATRIX.md
```

至少包含：

| 文件 | 当前变化 | 功能影响 | 视觉影响 | 决策 | 备注 |
|---|---|---|---|---|---|
| ... | ... | ... | ... | KEEP / REWORK / RESTORE_PARTIAL | ... |

### 安全要求

必须保存当前未提交 diff 的可恢复副本。

可使用：

```text
临时 patch
或
独立 backup branch / WIP commit
```

但不得破坏当前 stable V6 分支。

### A0 Gate

没有完整 rollback matrix，不进入下一阶段。

---

# 6. PHASE A1 — 找到真实 V6 视觉 baseline

这是最关键的一步。

不得使用：

```text
docs/v7/visuals/*.svg
```

作为本轮视觉源。

Agent 必须找到项目真实稳定 V6 ref。

优先检查：

```text
perfrom
origin/perfrom
其它 stable / v6 refs
```

如果名称发生变化：

通过 Git history 找到 V7 工作开始前最后一个可用 V6 commit。

记录到：

```text
docs/v7/V6_VISUAL_BASELINE.md
```

内容至少包括：

```text
V6 ref
commit SHA
启动方式
浏览器
viewport
测试日期
```

---

# 7. PHASE A2 — 双开 V6 / V7 做真实截图

不要先改 CSS。

必须同时运行：

```text
V7 current
http://127.0.0.1:8011/
```

以及独立 V6 worktree，例如：

```text
http://127.0.0.1:8012/
```

如果端口冲突，可以选择其它本地端口，但必须记录。

不要切换当前 V7 工作区去启动 V6。

优先使用：

```text
git worktree
```

建立独立只读 V6 baseline。

---

## 7.1 固定 viewport

主视觉验收：

```text
390 × 844
```

使用同一个浏览器版本。

Browser plugin 可用则优先 Browser。

不可用则：

```text
system Edge + Playwright
```

---

## 7.2 必须截图

### V6

```text
Today
Workout idle
Workout running
Records default
Coach default
Profile
Theme sheet
Dark mode
```

### Current V7

同样状态全部截图。

---

## 7.3 建立视觉差异报告

创建：

```text
docs/v7/V6_V7_VISUAL_COMPARISON.md
```

每页记录：

| 项目 | V6 | Current V7 | 判断 |
|---|---|---|---|
| 信息层级 | ... | ... | V6 better / V7 better / neutral |
| 首屏密度 | ... | ... | ... |
| 主 CTA | ... | ... | ... |
| 卡片层级 | ... | ... | ... |
| Typography | ... | ... | ... |
| 导航 | ... | ... | ... |
| 主题响应 | ... | ... | ... |
| 移动端可读性 | ... | ... | ... |
| Effect cost | ... | ... | ... |

### A2 Gate

不得在没有 V6/V7 同状态 screenshot 的情况下开始视觉回滚。

---

# 8. 新的视觉规则：不是“V7 风格”，而是“V6 精修”

## 8.1 第一遍：Restore Parity

每一页先做到：

> **在 V7 架构下恢复 V6 的页面成熟度、信息层级和视觉节奏。**

第一遍不要增加 Liquid Glass。

第一遍只解决：

```text
布局
层级
字体
间距
卡片
按钮
导航基础结构
主题色
```

---

## 8.2 第二遍：Refinement

只有 Restore Parity 达到要求后才做精修。

允许的精修范围：

- typography consistency；
- spacing consistency；
- radius consistency；
- subtle border；
- lighter shadow；
- dynamic theme；
- low-cost surface；
- selected state；
- safe area；
- touch target；
- reduced GPU cost；
- 少量 Liquid Interaction。

---

## 8.3 不允许的“升级感”

禁止通过以下方式制造 V7 差异：

```text
巨大圆角卡片
巨大 Hero
巨大椭圆环
大面积 pastel gradient
每块内容单独成卡
大量 pill
大量 badge
所有控件淡绿色
大面积毛玻璃
装饰性折射
无业务价值的空白
```

---

# 9. Design Token 精修边界

## 9.1 Theme

必须继续动态继承现有主题色。

不能默认产品等于绿色。

验证至少：

```text
Blue
Purple
Green
Custom
Dark
Light
Auto
Reload
```

---

## 9.2 Background

Light 默认：

```text
接近 V6 的 neutral / white surface
```

禁止整页永久：

```text
蓝紫渐变洗色
绿色雾化背景
彩色 glow
```

---

## 9.3 Surface

大多数内容：

```text
solid / near-solid surface
hairline border
轻阴影或无阴影
```

不是 Glass。

---

## 9.4 Radius

不要把所有内容都做成巨大胶囊。

优先从 V6 视觉比例出发。

建议视觉范围：

```text
普通卡片：12–18px
主要容器：16–22px
Button：12–18px 或 V6 原有形态
真正 pill：999px
```

如果 V6 某组件已有成熟比例，优先保留。

---

## 9.5 Shadow

保持非常轻。

不允许卡片像漂浮在页面上数厘米。

避免大量：

```text
0 10px 30px
0 20px 50px
```

级别的常驻 shadow。

---

# 10. Liquid Glass 新定位

Liquid Glass 不再承担 V7 视觉身份。

它只是一种：

> **触控反馈材质。**

---

## 10.1 可以使用的位置

优先级：

```text
1. Bottom Nav active indicator
2. Workout Play / Pause 主按钮按压态
3. Slider / Toggle 拖动态
4. Composer / Floating action group 的轻量层级分离
```

---

## 10.2 不应该使用的位置

```text
普通 Card
Records list
Chart card
Settings row
Chat bubble
Exercise row
Today 每个 metric
```

---

## 10.3 Liquid 生命周期

静止态：

```text
接近普通 UI
```

按下：

```text
轻微高光移动
轻微 scale
轻微边缘形变
```

释放：

```text
200–300ms 内恢复
停止 RAF
清除 will-change
```

---

# 11. 功耗规则继续有效

视觉回滚不得把 V6 的高成本实现原样带回来。

目标是：

```text
视觉接近 V6
但实现比 V6 更便宜
```

仍然禁止：

```text
嵌套 backdrop-filter
滚动列表 item backdrop
永久 filter animation
永久 box-shadow breathing
transition: all
永久 will-change
隐藏页面视觉 RAF
无 owner timer
```

允许使用 Faux Glass 实现与 V6 类似的视觉。

---

# 12. PHASE B0 — Bottom Navigation 恢复

Bottom Nav 是全局组件，先于单页处理。

但目标不是做“更酷”。

## B0.1 首先恢复 V6 的优秀部分

检查 V6：

- rail 高度；
- icon size；
- label spacing；
- selected state；
- safe area；
- 内容遮挡。

V7 不得比 V6：

```text
更厚
更大
更亮
更抢内容
```

---

## B0.2 Liquid 只放在 selected indicator

静止时：

```text
selected capsule 接近普通 tonal surface
```

切换时：

```text
轻微滑动 / 形变 / rim highlight
```

不要整个 nav 长期高 blur。

---

## B0 Gate

必须比较：

```text
V6 nav screenshot
V7 refined nav screenshot
```

判断：

- V7 不得更拥挤；
- 不得遮挡正文；
- active state 更清晰或至少不差；
- theme color 正常；
- economy mode 正常。

---

# 13. PHASE B1 — Today：唯一允许先完整处理的页面

**不要五页一起改。**

Today 是本轮视觉方向确认页。

---

## B1.1 Restore Parity

先以 V6 Today 为母版。

检查并恢复：

- V6 第一视口的信息优先级；
- 真实 Today 功能；
- Quick Actions 的合理权重；
- Current Plan；
- Diet / Weight / Activity 等真实入口；
- 真实空状态；
- 主 CTA 的位置和大小；
- 页面滚动节奏。

必须删除/重做当前 V7 中明显比 V6 更差的：

```text
巨大椭圆环
过大的空训练卡
四个同权大块按钮
过量空白
过强 pastel background
```

但不要删除对应真实功能。

---

## B1.2 Refinement

只允许有限改善：

- 字体层级更整齐；
- 数字更容易扫读；
- sections 对齐；
- 卡片边界更轻；
- 主 CTA 更清楚；
- theme color 正确；
- 少量选中态 Liquid；
- 降低 V6 的 blur/filter 成本。

---

## B1.3 必须保留真实功能

不能把 V6 Today 简化成概念图。

任何原功能都必须：

```text
保留在主屏
或
有明确 secondary route / sheet / detail 入口
```

更新：

```text
docs/v7/V7_SCREEN_MAPPING.md
```

---

# 14. B1 HARD HUMAN GATE — 必须停一次

Today 完成后：

> **必须暂停后续页面视觉修改。**

Agent 必须向用户提供：

```text
V6 Today 390×844
Current bad V7 Today 390×844
Refined V7 Today 390×844
```

并附：

```text
mismatch ledger
theme screenshots
主要改动说明
性能变化说明
```

只有用户明确回复：

```text
通过
继续
可以
```

等确认后，才允许继续 Workout。

### 禁止

不得因为：

```text
tests pass
console clean
截图尺寸正确
```

就自行宣布 Today 视觉通过。

**视觉好不好最终由用户确认。**

---

# 15. PHASE B2 — Workout

用户确认 Today 方向后才开始。

## B2.1 以 V6 Workout 为母版

保持 V6 已经成熟的：

- Timer dominance；
- 训练状态；
- 控制位置；
- 组数/次数；
- Rest；
- speed；
- voice；
- workout mode；
- session state。

---

## B2.2 当前 V7 需要重点纠偏

避免把以下所有东西同时堆在首屏：

```text
00 timer
mode bar
speed slider
preset chips
exercise editor
phase selector
large controls
```

但不能删除功能。

高级设置应根据 V6 行为合理放回：

```text
secondary section
sheet
expandable controls
```

---

## B2.3 Liquid

只允许：

```text
Play / Pause 主按钮交互态
Slider thumb 拖动态
selected mode 的极轻反馈
```

Timer 区不要做持续 Liquid。

---

## B2 Gate

必须截图：

```text
V6 idle
V7 refined idle
V6 running
V7 refined running
```

必须测试：

- start；
- pause；
- resume；
- rest；
- skip；
- finish；
- leave/return；
- WakeLock/MediaSession owner；
- no duplicated timers/listeners。

---

# 16. PHASE B3 — Records

以 V6 Records 的真实默认页和 subviews 为母版。

## 必须保留

```text
training
weight
diet
health
calendar/history
reports
```

---

## 禁止

不得再用 Weight 子页面截图证明 `#/records` 默认页视觉完成。

必须分别验证：

```text
Records default
Weight
Diet
Health
```

其中 Default 是主视觉 Gate。

---

## 视觉原则

Records 应是：

> **数据工具。**

优先：

```text
数字
趋势
图表
列表
时间
```

而不是 Glass。

---

# 17. PHASE B4 — Coach

以 V6 已经成熟的 AI workflow 为功能母版。

保留：

- model selection；
- search；
- evidence；
- history；
- streaming；
- stop/retry；
- attachment；
- virtual list；
- composer；
- quick prompt。

---

## 当前必须修复

```text
Composer 与浮动按钮重叠
右侧多个 scroll control 堆叠
空状态视觉层级混乱
Suggestion 与 conversation 竞争
```

普通 bubble 不 Glass。

Composer 可 Soft Surface / Soft Glass，但必须优先保证：

```text
keyboard
safe area
focus
send target
```

---

# 18. PHASE B5 — Profile

Profile 以 V6 设置/档案成熟度为母版。

不需要为了 V7 重新发明 Settings。

必须保留：

- Health Profile；
- AI settings；
- Sync；
- Backup；
- Theme；
- Voice；
- Haptics；
- Language；
- Experiments；
- About/update；
- 其它当前真实设置。

---

## 视觉目标

更接近：

```text
成熟系统设置 + 健康档案
```

而不是：

```text
大宣传 Hero + 设置卡片墙
```

---

# 19. PHASE B6 — Secondary UI

最后统一：

```text
Modal
Sheet
Picker
Toast
Search
Empty
Loading
Error
Offline
Update
Permission
```

原则仍然是：

> **以 V6 成熟行为为基线，只统一视觉和低功耗实现。**

---

# 20. Effect Modes 的新要求

不要再为了完成旧任务书而强行做夸张的 `full`。

实际产品优先：

```text
balanced
economy
```

如果 `full` 已实现且成本合理，可以保留。

但：

```text
balanced = 产品默认
economy = 真正低功耗
full = 可选增强，不得影响布局
```

不得为了 `full` 改变主页面设计。

---

# 21. Theme Matrix Gate

每个主页面最终必须抽查至少：

```text
Blue Light
Purple Light
Custom Light
Blue Dark
Custom Dark
```

需要检查：

- primary CTA；
- selected nav；
- selected chip/tab；
- focus state；
- text contrast；
- surface neutrality。

如果页面仍然明显“绿色品牌化”，即使主题已变化，也视为视觉失败。

---

# 22. 每页 Screenshot Gate

每个页面都必须保留三方比较：

```text
V6 baseline
Current bad V7 baseline
Refined V7
```

必须使用 `view_image` 实际查看。

不能只比较 DOM 或 computed style。

---

## 22.1 Mismatch Ledger

每页记录：

| 对比项 | V6 优点 | Bad V7 问题 | Refined V7 处理 | 结果 |
|---|---|---|---|---|
| Layout | ... | ... | ... | Pass/Fail |
| Density | ... | ... | ... | ... |
| Typography | ... | ... | ... | ... |
| CTA | ... | ... | ... | ... |
| Navigation | ... | ... | ... | ... |
| Theme | ... | ... | ... | ... |
| Performance | ... | ... | ... | ... |

---

# 23. “Refined V7” 的最低视觉标准

Agent 不得使用“风格不同”解释明显变丑。

Refined V7 至少必须满足：

1. **第一眼的信息层级不弱于 V6；**
2. **主任务比 V6 同等或更清楚；**
3. **首屏有效信息量不因为装饰显著下降；**
4. **没有比 V6 更明显的 prototype 感；**
5. **没有新增无意义卡片/胶囊；**
6. **动态主题完整工作；**
7. **移动端没有重叠；**
8. **Liquid 不抢内容；**
9. **GPU/paint 风险不高于 V6；**
10. **真实功能不减少。**

---

# 24. 功能完整 Gate

视觉工作不能损失业务能力。

每页完成后更新：

```text
docs/v7/V7_SCREEN_MAPPING.md
```

所有 V6 功能必须是：

```text
MIGRATED
WRAPPED
DEFERRED_WITH_REASON
```

不得无解释消失。

---

# 25. Browser QA

Browser 插件可用：

> 优先 Browser。

不可用：

> 使用 system Edge + Playwright，并记录 Browser plugin not available。

每页至少检查：

```text
URL
title/page identity
meaningful DOM
console error/warn
screenshot
primary interaction
390×844
keyboard state if relevant
safe area
horizontal overflow
```

---

# 26. 测试规则

保留当前 CI。

重点继续验证：

```text
theme bridge
route lifecycle
data compatibility
workout state
coach streaming
records views
profile settings
PWA
power-motion contract
```

不能因为视觉回滚删除测试。

如果旧 V7 visual assertion 与新方向冲突：

```text
更新断言
并记录为什么旧断言本身代表失败视觉
```

---

# 27. Performance Gate

最终比较：

```text
V6
Refined V7 balanced
Refined V7 economy
```

至少检查：

- backdrop 数量；
- active RAF；
- infinite animation；
- filter animation；
- Long Animation Frame；
- hidden feature activity；
- scroll smoothness proxy。

目标不是为了性能把页面做丑。

目标是：

> **视觉接近/优于 V6，同时渲染成本下降。**

---

# 28. Git / Commit 规则

不要把所有视觉回滚做成一个巨大 commit。

建议：

```text
v7: snapshot visual rollback baseline
v7: restore v6-aligned navigation
v7: restore and refine today
```

在用户确认 Today 后：

```text
v7: restore and refine workout
v7: restore and refine records
v7: restore and refine coach
v7: restore and refine profile
v7: unify refined secondary surfaces
v7: finalize visual and power qa
```

---

# 29. 文档更新

必须新增/更新：

```text
docs/v7/V7_VISUAL_ROLLBACK_MATRIX.md
docs/v7/V6_VISUAL_BASELINE.md
docs/v7/V6_V7_VISUAL_COMPARISON.md
docs/v7/V7_REFINEMENT_LEDGER.md
docs/v7/V7_VISUAL_FIDELITY.md
docs/v7/V7_PERFORMANCE_REPORT.md
docs/v7/V7_SCREEN_MAPPING.md
```

`V7_VISUAL_FIDELITY.md` 中不再声明与旧 V7 SVG 的 fidelity。

新的定义：

```text
V6 visual continuity
+
documented refinements
+
user-approved Today direction
```

---

# 30. 最终 QA 截图建议

用户批准后，最终可保留：

```text
docs/v7/qa-refined/
```

至少：

```text
01-today.png
02-workout-idle.png
03-workout-running.png
04-records.png
05-coach.png
06-profile.png
07-theme-purple.png
08-theme-custom.png
09-dark.png
10-economy.png
```

不要覆盖旧 `qa-390x844/`。

旧截图继续作为 bad V7 historical evidence。

---

# 31. 禁止事项

本轮 Agent **不得**：

- 再把旧 V7 SVG 当设计目标；
- 再生成一套五页新概念图并自行实施；
- 一次性重做五页；
- 跳过 Today 人工 Gate；
- 为了“更现代”改变成熟 V6 信息架构；
- 把页面做成卡片墙；
- 把所有控件做成胶囊；
- 用固定绿色替代动态主题；
- 使用大面积 Liquid Glass；
- 用 WebGL 做整页视觉；
- 把首屏有效信息换成装饰；
- 因视觉回滚删除真实功能；
- 整分支 hard reset；
- 整文件恢复高风险业务文件；
- 只凭 build/test pass 宣称视觉完成；
- 只凭 screenshot 无 overflow 宣称视觉完成；
- 自己判断“比 V6 更漂亮”并继续五页。

---

# 32. 执行顺序

严格执行：

```text
A0  Freeze / rollback matrix
↓
A1  Locate stable V6 baseline
↓
A2  Capture V6 vs current V7
↓
B0  Bottom Navigation restore/refine
↓
B1  Today restore parity
↓
B1  Today limited refinement
↓
HUMAN APPROVAL GATE
↓
B2  Workout
↓
B3  Records
↓
B4  Coach
↓
B5  Profile
↓
B6  Secondary UI
↓
Theme Matrix
↓
Performance
↓
Final QA
```

---

# 33. Today 人工 Gate 的 Agent 最终回复模板

到达 Today Gate 后，不要继续 Workout。

回复必须包含：

## Findings

说明 V6 与 bad V7 的主要视觉差异。

## Preserved

说明哪些 V7 架构/功能没有回滚。

## Restored

说明哪些视觉回到了 V6 成熟方案。

## Refined

说明相比 V6 只做了哪些有限改善。

## Theme

列出主题矩阵测试结果。

## Performance

说明 blur/filter/animation 是否下降。

## Screenshots

连续展示：

```text
V6 Today
Bad V7 Today
Refined V7 Today
```

然后明确询问用户：

> **是否认可这个 V7 视觉方向并继续 Workout？**

没有明确确认，停止。

---

# 34. 最终完成条件

V7 Visual Refinement 只有在以下全部成立时才算完成：

## Visual

- 用户已经确认 Today 的新方向；
- 五页视觉连续继承 V6；
- 没有明显 prototype 感；
- Liquid Interaction 克制；
- 动态主题正常；
- Dark mode 正常。

## Function

- V6 核心功能无缺失；
- secondary flows 可访问；
- Workout / AI / Records 等真实能力正常。

## Architecture

- V7 lifecycle / adapters / feature ownership 保留；
- 没有为了视觉重新制造全局耦合。

## Performance

- 常驻 backdrop / filter / animation 不高于 V6；
- hidden page activity 受控；
- balanced/economy 有效。

## QA

- build；
- lint；
- typecheck；
- unit；
- browser；
- lifecycle；
- PWA；
- mobile visual；
- theme matrix。

---

# 35. 给 Agent 的最终总指令

> **不要继续“完成 V7 视觉设计”。先承认当前视觉方向失败。**  
> 本次工作的目标是保留 V7 架构和功能成果，在当前分支上逐步撤销失败的视觉试验，并以真实 V6 页面作为新的视觉母版。  
> 先捕获真实 V6 与当前 V7 的 390×844 同状态截图，再逐页面做两遍：第一遍恢复 V6 的信息层级、成熟度和节奏；第二遍只做有限的 typography、spacing、surface、theme 和低功耗 Liquid Interaction 精修。  
> 不再使用 `docs/v7/visuals/*.svg` 作为视觉验收目标。  
> 不得整分支 reset，不得删除已修好的 Theme Bridge、生命周期、数据兼容和业务能力。  
> Bottom Nav 完成后只处理 Today；Today 完成后必须停下，以 **V6 Today / Bad V7 Today / Refined V7 Today** 三张真实浏览器截图请求用户确认。用户未明确确认之前，不得继续 Workout、Records、Coach、Profile。  
> 最终 V7 应该让熟悉 V6 的用户感觉：**还是原来那个成熟的 Rehab，但更统一、更轻、更流畅，而不是换成了另一个陌生且更丑的产品。**

