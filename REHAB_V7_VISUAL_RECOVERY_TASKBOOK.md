# Rehab V7 Visual Recovery / 视觉纠偏任务书

> **用途**：交给 Coding Agent / Codex Agent 直接执行。  
> **项目**：`rehab` PWA  
> **当前工作分支**：`v7-liquid-glass`  
> **稳定基线分支**：现有 V6 可用分支，禁止破坏。  
> **任务性质**：不是重新做 V7 架构，而是在保留已经完成的 V7 架构、数据兼容和业务迁移成果的基础上，重新处理主题系统、视觉设计、Liquid Glass 表现和视觉 QA。  
> **最终目标**：恢复主题色能力，使五个主页面达到已确认的“克制健康训练 UI + 少量 Liquid Interaction”视觉方向，并确保真实 V6 功能不丢失、移动端不重叠、功耗不回退。

## 2026-08-28 Resume Note — Reference Assets Repaired

上一轮执行在 `R1` 正确停止于 `NEED_REFERENCE_ASSETS`。该阻塞现在已处理：

```text
docs/v7/visuals/v7-today.svg
docs/v7/visuals/v7-workout.svg
docs/v7/visuals/v7-records.svg
docs/v7/visuals/v7-coach.svg
```

已从损坏的“SVG + 内嵌 raster payload”替换为**自包含、浏览器原生可渲染的矢量视觉基准**；`v7-profile.svg` 保留现有可用参考。

这些新 SVG 的用途是锁定：

- 页面第一视口信息架构；
- 留白与密度；
- Card / List / Chart / Composer 的容器模型；
- CTA 的位置与视觉权重；
- Bottom Navigation 的几何关系；
- “主体 Surface + 少量 Liquid Interaction”的使用比例。

它们依然**不是业务功能真相来源**。示例数字和文案必须替换成现有真实数据与功能。

恢复执行时：

1. 重新跑 `R1` 的 5 / 5 可读性 Gate；
2. 必须通过系统 Edge 实际渲染验证，而不是只检查文件存在；
3. `R2 Theme Bridge` 已由上一轮完成并有浏览器测试，若测试继续通过，**不要重复实现 R2**；
4. 直接从 `R3 Design System visual correction` 继续；
5. 后续每一页仍需严格执行 reference → browser screenshot → `view_image` → mismatch ledger → 修正 → 再验收。

---

# 0. 先理解当前状态

当前 V7 **不能视为 UI 完成版**。

请将当前状态定义为：

```text
V7 Architecture Beta
+
Functional Migration Mostly Complete
+
Visual Layer Requires Recovery
```

不要把本次任务做成第二次全面架构重写。

当前已经有价值、应尽量保留的部分包括：

- `src/app/*` App Shell / Router / Lifecycle；
- `src/features/*` Feature ownership；
- `src/legacy/adapters/*` 兼容层；
- IndexedDB / 数据兼容；
- Workout / AI / Records / Profile 等业务能力；
- 新增的生命周期和浏览器测试；
- V7 Effects Controller 的基础结构；
- PWA 与性能测试基础设施。

本次重点重做：

- V7 Theme Bridge；
- V7 Design Tokens；
- V7 Visual System；
- Bottom Navigation；
- Today / Workout / Records / Coach / Profile 五页视觉层；
- Secondary surfaces；
- Visual Fidelity QA；
- Theme / visual regression tests。

---

# 1. 当前已确认的问题

Agent 开始修改前，必须先复现并记录以下问题，不能直接假设已经修好。

## 1.1 主题色功能发生回归

旧主题系统 `theme.js` 会动态更新：

```text
--md-sys-primary
--md-sys-on-primary
--md-sys-primary-container
--md-sys-secondary
--md-sys-tertiary
--md-sys-surface*
```

但当前 `css-src/60-v7-tokens.css` 将 V7 主色写死，例如：

```css
--v7-primary: #2b6b4a;
--v7-primary-strong: #1f573b;
--v7-primary-soft: #dfeee5;
```

而 V7 页面大量使用：

```css
var(--v7-primary)
var(--v7-primary-soft)
var(--v7-primary-strong)
```

因此用户在设置中切换蓝色、紫色、自定义颜色、Monet 等时，V7 UI 仍保持固定绿色。

这是 **P0 功能回归**。

---

## 1.2 Visual QA 曾在参考图不可用时错误标记 Pass

当前：

```text
docs/v7/V7_VISUAL_FIDELITY.md
```

明确记录：

```text
v7-today.svg
v7-workout.svg
v7-records.svg
v7-coach.svg
```

在 Edge 中无法正常解码。

但旧报告仍然将最终视觉 QA 标记为 Pass。

这是错误验收。

本次任务必须建立硬规则：

> **Reference 无法打开 = Visual QA BLOCKED，禁止 Pass。**

---

## 1.3 当前页面更像“旧 DOM 换 CSS”，没有完成真正视觉重构

当前 QA 基线截图：

```text
docs/v7/qa-390x844/01-today.png
docs/v7/qa-390x844/02-workout-idle.png
docs/v7/qa-390x844/03-workout-running.png
docs/v7/qa-390x844/04-records.png
docs/v7/qa-390x844/05-coach.png
docs/v7/qa-390x844/06-profile.png
docs/v7/qa-390x844/07-dark.png
```

这些截图视为 **Before / 待修基线**，不是视觉目标。

已确认的问题包括：

### Today

- 巨大椭圆环占用首屏；
- 空训练计划占据过多空间；
- 四个快捷按钮视觉权重过高；
- 健康/恢复信息层级弱；
- 页面更像原型而非成熟健康训练产品。

### Workout

- `00` Timer、模式、速度、preset、动作输入、训练阶段等大量内容同时竞争首屏；
- idle 状态过于像旧页面皮肤替换；
- 高级配置没有合理降级到 secondary UI；
- 主任务不够明确。

### Records

- `#/records` 的视觉验收截图实际主要展示 Weight 子视图；
- 没有证明默认 Records overview 达到设计目标；
- 图表和摘要缺少统一的信息架构。

### Coach

- Composer 与右侧多枚浮动滚动按钮明显冲突；
- 有控件覆盖/拥挤问题；
- 快捷建议、空状态、输入区视觉层级混乱。

### Profile

- 更像旧设置页重新着色；
- 顶部大绿色图块视觉生硬；
- “设置”裸标题条与主页面设计系统不统一；
- Health dossier / Preferences 没有形成清晰层级。

---

## 1.4 Effects Mode 没有完整实现原设计

当前：

```js
const MODES = new Set(['balanced', 'economy']);
```

原计划要求：

```text
full
balanced
economy
```

`balanced` 应保持移动端默认；`full` 只用于增强短时 Liquid Interaction，不得变成整页高功耗玻璃。

---

# 2. 本次修改的核心原则

## 2.1 V6 仍然是功能真相来源

必须继续遵守：

> **真实功能、数据、状态和业务语义来自 V6 / 当前生产代码。**

效果图只决定：

- 排版；
- 层级；
- 卡片/列表形式；
- 空间节奏；
- 色彩；
- 图标与 CTA；
- Liquid Glass 使用位置。

不得因为参考图没有展示某功能，就删除：

- Workout 高级参数；
- AI 模型/搜索/证据；
- Records 饮食/体重/健康；
- Profile 同步/备份/语音/实验功能；
- 任何真实已有能力。

不适合放在主屏的功能，迁移到：

```text
Detail Route
Bottom Sheet
Modal
Expandable Section
Settings Subpage
Advanced Controls
```

而不是删除。

---

## 2.2 视觉目标不是“绿色 UI”

产品视觉定义：

> **Calm Health UI with Liquid Interaction**

不是：

> Green Liquid Glass Theme

用户选择蓝色、紫色、琥珀、玫红、自定义颜色后，V7 应保持同样克制和专业，只改变主要强调色。

页面主体必须继续以：

```text
neutral background
white / dark neutral surface
subtle border
calm typography
semantic accent
```

为主。

---

## 2.3 Liquid Glass 只能作为交互材料

建议视觉预算：

```text
70–80% Surface
15–25% Soft / Faux Glass
2–5% Liquid Interaction
```

重点位置：

- Bottom Nav active capsule；
- Workout Start / Pause 主 CTA；
- Coach Composer；
- 少数 Slider / Toggle；
- 必要的 floating action group。

禁止：

- 所有 card 都 blur；
- 大面积炫彩渐变；
- 每个组件都发光；
- 整页 WebGL；
- 滚动列表 item 独立 backdrop；
- idle 时持续 shader/filter 动画。

---

# 3. Git / 安全策略

开始执行：

```bash
git status
git branch --show-current
git rev-parse HEAD
```

当前预期分支：

```text
v7-liquid-glass
```

当前分支是修改目标。

不得修改/强推 V6 稳定分支。

建议先创建安全引用：

```text
v7-liquid-glass-before-visual-recovery
```

指向开始修改前 HEAD。

如果工作树非 clean：

> 先检查并保护现有用户修改，禁止覆盖。

---

# 4. PHASE R0 — 建立真实失败基线

本阶段只验证，不修改 UI。

## R0.1 浏览器基线

使用：

```text
http://127.0.0.1:8011/
```

Browser 插件可用时优先 Browser。

Browser 不可用时，使用现有 Playwright / system Edge fallback，并在报告中写：

```text
Browser plugin not available — Playwright fallback used
```

视口至少：

```text
390 x 844
```

## R0.2 必须复现主题回归

至少测试：

```text
默认颜色
蓝色 preset
紫色 preset
绿色 preset
自定义 #d04a7a
dark
light
auto
reload persistence
```

记录修改前：

```js
getComputedStyle(document.documentElement).getPropertyValue('--md-sys-primary')
getComputedStyle(document.documentElement).getPropertyValue('--v7-primary')
```

如果第一项变化而第二项不变，记录为 P0。

## R0.3 保存 Before 截图

已有：

```text
docs/v7/qa-390x844/
```

不要覆盖旧证据。

新修改过程的临时截图不要提交到 repo，除非最终任务明确要求保留最终 QA。

---

# 5. PHASE R1 — 修复视觉参考资产

这是本次视觉修改的第一道硬 Gate。

目标参考路径：

```text
docs/v7/visuals/v7-today.*
docs/v7/visuals/v7-workout.*
docs/v7/visuals/v7-records.*
docs/v7/visuals/v7-coach.*
docs/v7/visuals/v7-profile.*
```

## R1.1 必须逐个验证

对每一张参考图：

1. 使用浏览器直接打开对应文件；
2. 对 SVG 参考，必须用系统 Edge/Playwright 实际栅格化；
3. 若 `view_image` 不能直接预览 SVG，不得因此判定资产失败，应先把该 SVG 在 Edge 中截图到临时目录，再对截图使用 `view_image`；
4. 确认不是 broken image / placeholder；
5. 确认尺寸、文字、页面结构可辨识；
6. 仅“HTTP 200”或“DOM 中存在 `<svg>`”不算通过，必须实际查看栅格化结果。

## R1.2 如果现有参考文件损坏

不要尝试继续根据文字猜。

允许替换为以下任一**浏览器可直接、清晰渲染**的格式：

```text
PNG
或
JPEG
或
自包含纯矢量 SVG（禁止损坏的内嵌 raster payload）
```

必须使用已确认的设计方向。格式本身不是验收目标，**可读、稳定、可截图比对**才是目标。

如果 Agent 当前无法访问原始图片：

> **立即停止 Visual Implementation，并报告 NEED_REFERENCE_ASSETS。**

禁止再次出现：

```text
Reference broken
→ still mark visual QA pass
```

## R1 Gate

必须满足：

```text
5 / 5 reference images viewable
5 / 5 reference images browser-decodable
```

否则不进入 R2 之后的页面视觉实现。

---

# 6. PHASE R2 — 修复 Theme Bridge

这是本次第一项代码修复。

## R2.1 目标

V7 不再拥有一套与 `theme.js` 脱离的固定颜色系统。

V7 semantic token 应建立在现有 Material theme token 之上。

推荐方向：

```css
--v7-primary: var(--md-sys-primary);
--v7-on-primary: var(--md-sys-on-primary);
--v7-primary-soft: var(--md-sys-primary-container);
--v7-primary-strong: var(--md-sys-on-primary-container);

--v7-bg: var(--md-sys-surface);
--v7-surface: var(--md-sys-surface-container-lowest);
--v7-surface-raised: var(--md-sys-surface-container-low);
--v7-surface-muted: var(--md-sys-surface-container);
```

实际映射可以调整，但必须满足：

- theme.js 是 seed / dynamic color owner；
- V7 是 semantic design owner；
- 不存在两套互不通信的主色系统。

## R2.2 不要让整个页面被主题色染色

动态主题只应明显影响：

- CTA；
- selected state；
- icon accent；
- chart primary line；
- active nav capsule；
- focus ring；
- small semantic emphasis。

页面背景、白色 Surface、普通正文应保持克制。

## R2.3 Dark theme

不要继续在 V7 中写固定：

```text
#8ccca7
#244434
```

作为唯一 dark accent。

dark V7 token 也应从当前 dynamic theme 输出派生。

## R2.4 必须新增 Theme Bridge Browser Test

建议文件：

```text
test/v7-theme-bridge.browser.test.mjs
```

至少验证：

1. 打开 app；
2. 读取 nav active / primary CTA computed color；
3. 调用真实 theme preset 交互或真实 UI；
4. 修改为另一 preset；
5. `--v7-primary` 必须变化；
6. active nav / CTA computed color 必须变化；
7. 自定义颜色也必须变化；
8. reload 后保持；
9. dark/light 不破坏可读性。

## R2 Gate

以下全部通过：

```text
Preset changes V7 accent
Custom color changes V7 accent
Dark works
Light works
Auto works
Reload persists
No console error
```

---

# 7. PHASE R3 — 重建 V7 Design System，而不是继续叠加 CSS

重点文件：

```text
css-src/60-v7-tokens.css
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

## R3.1 视觉基调

目标：

```text
专业
健康
安静
清晰
现代
略带 Liquid Interaction
```

不是：

```text
卡通
霓虹
大面积玻璃
绿色主题 Demo
原型线框
组件 Gallery 感
```

## R3.2 Container 模型

不要把所有内容都做成“大圆角白卡片”。

允许混用：

- open section；
- list row；
- summary strip；
- grouped panel；
- chart surface；
- compact card；
- floating nav；
- bottom sheet。

避免：

```text
Card
  Card
    Card
```

## R3.3 圆角

整体降低“玩具感”。

建议：

- 内容 Surface：中等圆角；
- Nav / Liquid Control：pill；
- 小 icon container：小圆角或圆形；
- 不允许所有控件统一巨大 24–32px radius。

## R3.4 Shadow

Surface 主要靠：

```text
border
very soft shadow
spacing
```

区分层级。

不要靠浓重投影。

## R3.5 Typography

逐页检查：

- H1；
- Section title；
- metric；
- list title；
- label；
- caption；
- nav label；
- button；
- input。

不允许浏览器默认字体尺寸混入。

---

# 8. PHASE R4 — Bottom Navigation 重做

Bottom Nav 是本项目最重要的 Liquid Glass 组件。

## 目标

- 轨道本身克制；
- active indicator 有明显但柔和的 Liquid Capsule；
- static 时几乎没有动画成本；
- tab switch 时有 150–250ms 形变/高光移动；
- 使用当前主题色；
- 不遮挡内容；
- safe area 正确。

## 禁止

- 整条导航高强度 24px blur；
- active item 只是一个普通绿色圆块；
- 导航 rail 颜色固定绿色；
- 5 个 item 各自独立 backdrop。

## 必测

```text
5-tab rapid switch
theme change while nav visible
dark/light
balanced/economy/full
pointer cancel
390x844
keyboard open
standalone safe-area
```

---

# 9. PHASE R5 — Today 页面视觉重做

Today 是第一张需要真正达到视觉标准的页面。

**只有 Today 通过参考图对比后，才允许继续修改其它主页面。**

## 9.1 信息层级

优先：

```text
Greeting / Date
↓
Today health / readiness / recovery status
↓
Today's actionable plan
↓
Daily metrics / status
↓
Trend / insight
↓
Primary action
```

如果某些真实数据当前不可用：

使用小型、克制的 unavailable state。

不要用巨大椭圆或大块空状态填满首屏。

## 9.2 当前必须删除/改造的视觉问题

- 不再使用两个巨大椭圆环作为首页视觉核心；
- Quick Actions 降低视觉权重；
- “没有训练计划”空状态高度显著压缩；
- 主 CTA 与真实业务状态联动；
- 健康/恢复状态应成为页面核心信息之一；
- 如果保留记录体重/饮食/运动/问 AI 快捷入口，改为轻量 row / compact action group。

## 9.3 空状态规则

没有训练计划时：

```text
一行状态
+
一句说明
+
一个主操作
+
可选一个 AI 次操作
```

不要让空状态卡占据首屏 1/3。

## R5 Gate

必须同时：

1. `view_image(reference Today)`；
2. `view_image(actual Today screenshot)`；
3. 写 mismatch ledger；
4. 修到没有明显 design-review comment；
5. theme change screenshot 验证。

---

# 10. PHASE R6 — Workout 页面重做

Workout 必须区分两种主信息架构：

```text
Idle / Planning
Running / Session
```

不要用一套布局硬塞所有状态。

## 10.1 Idle 状态

优先展示：

```text
训练状态 / 准备度
训练模式
今日训练内容 / 当前动作
预计时间 / 负荷
Start CTA
```

以下高级设置不应同时抢占首屏：

- 速度；
- preset；
- 高级组次；
- 训练阶段；
- PIP；
- 复杂附加项。

将它们放入：

```text
Advanced Sheet
Expandable controls
Context toolbar
```

但功能必须保留。

## 10.2 Running 状态

Running 时：

- Timer / 当前动作成为第一视觉核心；
- 当前组 / 次 / rest 清晰；
- Pause / Next / Skip 明确；
- Voice / PIP / WakeLock 作为辅助；
- 不再展示与当前 session 无关的大量 idle 配置。

## 10.3 Liquid Control

Start / Pause 可以使用 Liquid Interaction。

其它普通训练控件使用 Surface/Tonal controls。

## R6 Gate

至少对比：

```text
Workout idle reference vs actual
Workout running actual state
dark
custom theme
```

并完整测试 Workout Engine 行为不回退。

---

# 11. PHASE R7 — Records 页面重做

## 11.1 默认 route 必须正确

访问：

```text
#/records
```

应展示 Records 默认 overview，而不是因为本地 state 停留在 Weight 就把 Weight 当作最终 Records 视觉验收。

深链接：

```text
#/records/weight
#/records/diet
```

可以进入对应真实子视图。

## 11.2 主 overview

应优先：

```text
summary metrics
trend chart
calendar / consistency
recent records
sub-view navigation
```

## 11.3 实际功能必须保留

```text
training
weight
diet
health
reports
history
weekly summary
```

## 11.4 图表规则

- 图表本身是视觉核心；
- 不用 Glass 包每个 chart 元素；
- chart 背景稳定；
- 颜色响应当前主题；
- semantic colors 不能全部变成主题色；
- 不可见时停止无意义绘制。

---

# 12. PHASE R8 — Coach 页面重做

## 12.1 必须修复当前覆盖问题

当前 QA 截图中，Composer 右侧有多枚 vertical floating scroll controls 与输入区域重叠。

不允许最终版本存在这种状态。

## 12.2 建议信息架构

```text
Header / Model context
↓
Conversation
↓
Recommendation / evidence when needed
↓
Suggestions
↓
Composer
```

## 12.3 Scroll controls

如果真实功能需要：

- scroll to latest；
- jump up/down；

优先合并为：

```text
单一 context-aware floating button
```

只在必要时显示。

禁止永久竖排多个半透明按钮压住 Composer。

## 12.4 Composer

Composer 是 Soft Glass 的合理使用位置。

但必须：

- keyboard safe；
- attachment/voice/send 清楚；
- 不遮 chat；
- dark/theme color 正常；
- economy mode 可完全去 backdrop。

---

# 13. PHASE R9 — Profile 页面重做

Profile 的目标不是“漂亮的设置列表”，而是：

> 健康档案 + 训练偏好 + 产品设置入口。

## 13.1 上半部分

建立：

```text
Identity
Recovery goal
Health summary
```

避免大块纯色绿色 icon box。

## 13.2 Settings

采用清晰 group：

```text
Health & Plan
AI & Voice
Sync & Backup
Appearance & Preferences
About / Experiments
```

## 13.3 Theme 设置必须明确可达

用户必须能通过 Profile / Appearance：

- 选择 preset；
- 自定义颜色；
- light/dark/auto；
- Monet（如当前支持）；
- effects mode。

主题功能是本轮 P0 验收项。

---

# 14. PHASE R10 — Effects Mode 完整化

实现：

```text
full
balanced
economy
```

## Full

只比 Balanced 多：

- Liquid active indicator 的短时增强；
- 主 CTA 的短时 highlight / mild lens simulation；
- temporary overlay 的更完整 glass。

不得：

- 整页 blur；
- 常驻 shader；
- 滚动时持续大面积折射。

## Balanced

手机推荐默认。

## Economy

```text
backdrop-filter: none
filter: none
no persistent effect animation
```

布局不能变化。

---

# 15. PHASE R11 — Secondary UI 视觉统一

统一检查：

```text
Theme Sheet
Modal
Bottom Sheet
Picker
Toast
Search
Empty State
Loading
Offline
Permission
Update Banner
Workout Advanced
AI Model Picker
Attachments
```

要求：

> 打开 secondary UI 后不能突然回到旧 V6 视觉体系。

但也不允许为了统一而重写业务行为。

---

# 16. Visual Fidelity 新硬 Gate

这是本次最重要的流程修正。

每个主页面必须执行：

```text
Reference image
        ↓
view_image(reference)

Browser render 390x844
        ↓
Screenshot
        ↓
view_image(actual)

Side-by-side judgment
        ↓
Mismatch ledger
        ↓
Fix
        ↓
Repeat
```

## 16.1 Mismatch ledger 至少检查 10 项

每页至少检查：

1. first viewport composition；
2. section order；
3. page title scale；
4. content typography；
5. spacing；
6. card/list container model；
7. radius；
8. background/surface color；
9. accent usage；
10. icon weight/style；
11. nav geometry；
12. primary CTA；
13. content density；
14. glass usage；
15. visible overlaps/clipping。

## 16.2 Visual Pass 条件

不能只因为：

```text
页面能打开
无 console error
测试通过
```

就标记 Visual Pass。

必须明确回答：

> 如果交给一个成熟产品设计团队 review，这个截图是否还会收到明显的视觉修改意见？

如果会：

> 不得 Pass。

---

# 17. Theme Fidelity 新硬 Gate

每个主页面至少在两种 accent 下检查：

```text
default / green-like
custom / purple-or-rose-like
```

同时检查：

```text
light
dark
```

必须确认：

- Accent 改变；
- Surface 不变得俗艳；
- Text contrast 正常；
- chart semantic color 正常；
- Liquid nav 响应主题；
- CTA 响应主题；
- secondary action 不全部变成同一颜色。

---

# 18. 功能完整性 Gate

每页修改完必须重新打开：

```text
docs/v7/V6_FUNCTION_INVENTORY.md
docs/v7/V7_SCREEN_MAPPING.md
```

确认：

```text
V6 功能未映射数量 = 0
```

或者所有未完成项都有明确：

```text
DEFER
+
reason
+
follow-up route
```

不能为了视觉清爽删除真实功能。

---

# 19. 新增/更新测试要求

至少新增或加强：

```text
test/v7-theme-bridge.browser.test.mjs
```

并检查现有：

```text
test/v7-pages.browser.test.mjs
test/v7-workout.browser.test.mjs
test/v7-records.browser.test.mjs
test/v7-coach.browser.test.mjs
test/v7-profile.browser.test.mjs
test/v7-secondary.browser.test.mjs
test/v7-navigation.test.mjs
test/v7-effects.test.mjs
```

测试不能只检查 class 存在。

需要增加用户可见行为断言，例如：

- theme change changes computed V7 color；
- default Records route is overview；
- Coach composer has no overlap；
- Today empty state height is bounded；
- nav active indicator moves；
- economy removes backdrop；
- page route leaves no stale floating controls。

---

# 20. 性能约束不能因为视觉修复而倒退

本次不是为了“更漂亮”重新引入 V6 的高功耗问题。

继续执行：

```text
同 viewport backdrop <= 2
no nested backdrop
no scrolling-list backdrop per item
no persistent filter animation
no persistent box-shadow breathing
no permanent will-change
no transition: all
hidden page no visual RAF
observer cleanup
timer ownership
```

最终重新执行：

```text
perf:render
perf:lifecycle
existing V7 performance checks
```

视觉提升不能以明显性能回退为代价。

---

# 21. 执行顺序

严格按照以下顺序：

```text
R0  Failure Baseline
↓
R1  Reference Asset Recovery
↓
R2  Theme Bridge
↓
R3  Design System Correction
↓
R4  Bottom Navigation
↓
R5  Today
↓
R6  Workout
↓
R7  Records
↓
R8  Coach
↓
R9  Profile
↓
R10 Effects Modes
↓
R11 Secondary UI
↓
Full Visual QA
↓
Functional Regression QA
↓
Performance QA
```

**禁止同时重做五页然后最后才截图。**

必须逐页完成：

```text
implement
→ browser
→ screenshot
→ view_image
→ compare
→ fix
→ gate
```

---

# 22. 推荐 Commit 序列

建议：

```text
v7-recovery: capture failed visual and theme baseline
v7-recovery: repair reference asset gate
v7-recovery: bridge dynamic theme into v7 tokens
v7-recovery: refine design primitives and typography
v7-recovery: rebuild liquid bottom navigation
v7-recovery: redesign today visual hierarchy
v7-recovery: redesign workout idle and session layouts
v7-recovery: redesign records overview and subviews
v7-recovery: fix coach layout and composer interaction
v7-recovery: redesign profile and appearance settings
v7-recovery: complete full balanced economy effects
v7-recovery: unify secondary surfaces
v7-recovery: final visual functional performance qa
```

不要把所有修复放进一个 commit。

---

# 23. 必须更新的文档

完成后更新：

```text
docs/v7/V7_DESIGN_SYSTEM.md
docs/v7/V7_EFFECTS.md
docs/v7/V7_SCREEN_MAPPING.md
docs/v7/V7_VISUAL_FIDELITY.md
docs/v7/V7_PERFORMANCE_REPORT.md
docs/v7/V7_MIGRATION_REPORT.md
```

新增：

```text
docs/v7/V7_VISUAL_RECOVERY_REPORT.md
```

该报告必须包含：

```text
问题根因
修改文件
主题修复证据
五页 reference/actual 比较
未实现 intentional deviations
功能回归结果
performance 结果
remaining risks
```

---

# 24. 最终截图要求

最终至少提供并保留：

```text
Today — default accent
Today — custom accent
Workout idle
Workout running
Records overview
Coach
Profile
Dark mode
Theme picker / appearance
Balanced mode
Economy mode
Full mode
Modal/Sheet
```

推荐统一：

```text
390 x 844
```

如果参考图原尺寸不同，再补一套 reference-native viewport。

---

# 25. 最终完成条件

以下全部满足才能宣布本轮恢复完成。

## Theme

- preset 能改变 V7；
- custom color 能改变 V7；
- dark/light/auto 正常；
- reload persistence 正常；
- nav / CTA / selected states 全部跟随主题。

## References

- 5 / 5 reference 可打开；
- 5 / 5 reference 已与 browser screenshot 用 `view_image` 实际比较；
- 不存在 broken reference 仍 Pass。

## Today

- 不再以巨大椭圆和大空状态为视觉核心；
- 信息层级符合健康训练首页；
- 真实功能仍可达。

## Workout

- idle / running 视觉职责清晰；
- 高级控件不再挤满首屏；
- Workout Engine 功能完整。

## Records

- 默认 route 是 overview；
- Weight/Diet/Health 等真实子功能保留；
- 图表视觉清晰。

## Coach

- Composer 不与浮动控件重叠；
- keyboard safe；
- AI 原能力完整。

## Profile

- 健康档案与设置有明确层级；
- Appearance / Theme 可达且真实工作。

## Effects

- full / balanced / economy 均存在；
- balanced 默认；
- economy 真正关闭高成本效果；
- full 仍保持功耗预算。

## QA

- build；
- lint；
- typecheck；
- unit；
- browser tests；
- lifecycle；
- release；
- mobile visual QA；
- performance sanity；
- no relevant console errors。

---

# 26. 明确禁止事项

本轮 Agent **不得**：

- 再次全面重写架构；
- 回退到 V6 大量 blur；
- 把 V7 主色继续写死绿色；
- 删除 theme.js 原主题能力；
- 删除现有真实业务功能；
- 用 fake data 替代真实数据；
- 参考图打不开仍继续猜设计；
- 页面能打开就标记 Visual Pass；
- 用测试通过代替视觉对比；
- 为了简洁隐藏掉无法再进入的功能；
- 把所有 setting 都塞回 Profile 首屏；
- 把所有东西都做成白色大圆角卡片；
- 用更多玻璃/阴影/渐变来“美化”；
- 整页 WebGL / Canvas 模拟；
- 破坏稳定 V6 分支；
- 删除现有测试以获得绿色 CI。

---

# 27. 给 Agent 的最终总指令

> 当前 `v7-liquid-glass` 分支的架构迁移有价值，但 UI 与主题系统未达到完成标准。  
> 本任务不是重做业务和架构，而是进行一次 **V7 Visual Recovery**。  
> 首先修复 5 张设计参考资产的可用性；任何参考图无法显示时，禁止进入视觉实现并禁止 Visual Pass。  
> 第二优先级修复 Theme Bridge，让旧 `theme.js` 的 preset、自定义颜色、Monet、light/dark/auto 真正驱动 V7 semantic tokens，V7 不允许固定绿色。  
> 然后逐页按照已确认参考图重新做 Bottom Nav、Today、Workout、Records、Coach、Profile。  
> 视觉目标是一个安静、专业、可信的健康训练 PWA，Liquid Glass 仅出现在关键触控位置。  
> 每页必须在真实浏览器中完成 reference screenshot 与 actual screenshot 的 `view_image` 对比和 mismatch ledger；页面能运行、测试通过不等于视觉完成。  
> 同时必须保留 V6 的真实业务功能和数据兼容，不允许为了视觉简洁删功能。  
> 最终以 **主题功能恢复 + 五页设计达到 reference fidelity + 无移动端重叠 + 功能无回归 + 功耗不回退** 作为唯一完成标准。

