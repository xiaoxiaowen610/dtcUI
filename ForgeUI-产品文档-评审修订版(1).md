# ForgeUI 产品需求文档

> 面向企业营销落地页的 Design-System-Aware D2C 工作台

- 文档类型：产品需求文档（PRD）
- 文档版本：评审修订版 v1.0
- 项目阶段：MVP
- 核心用户：前端工程师、设计系统维护者
- 旗舰案例：AI SaaS 营销落地页
- 默认生成目标：React + TypeScript + CSS Variables + CSS Modules

---

## 1. 文档摘要

ForgeUI 不是“截图生成 JSX”的通用工具，而是一套面向企业设计系统的结构化 D2C 工作台。

系统将 Design JSON 转换为统一 Design IR，解析 Design Token，通过 Component Registry 匹配真实 React 组件，再生成可运行、可验证、可回退的代码。组件无法安全匹配时，系统不会强行猜测，而是进入可解释的降级或人工确认流程。

MVP 聚焦一条完整纵向链路：

```text
AI SaaS 设计输入
→ 设计规范检查
→ Design IR
→ Token 解析
→ 外部组件 Registry
→ 可解释组件匹配
→ React 代码生成
→ 类型 / 构建 / 运行时 / 视觉验证
→ AI 结构化修改
→ 版本回退与导出
```

金融科技和电商活动页只作为评测样例，不在 MVP 阶段同时精做为完整产品模板。

---

## 2. 项目背景

传统 Design to Code 工具通常存在以下问题：

1. 只追求视觉还原，生成大量绝对定位、硬编码样式和无语义节点。
2. 直接让大模型生成完整 JSX，无法稳定保证 Props、Import、Token 和组件能力正确。
3. 不能复用企业已有组件库，生成页面与现有工程体系脱节。
4. 生成后缺少类型、构建、运行时和视觉验证，错误需要人工排查。
5. 自然语言修改容易重写整个文件，导致不可预测 Diff 和历史版本丢失。
6. 匹配失败时缺少清晰的降级策略，用户无法判断哪些结果可信。

ForgeUI 要解决的问题是：

> 如何把结构化设计输入转换成符合 Design Token、组件库和工程规范的可维护 React 页面，并让生成过程可解释、可验证、可控制。

---

## 3. 产品定位

### 3.1 一句话定位

ForgeUI 是一个面向企业营销落地页的 D2C 工作台，能够解析设计结构、匹配已有 Design Token 和 React 组件库、生成可运行代码，并通过受约束的 AI Patch 完成安全修改。

### 3.2 核心差异

| 常见方案 | ForgeUI |
| --- | --- |
| 截图直接生成 JSX | 结构化输入先进入 Design IR |
| 大模型决定全部代码 | 规则负责确定性流程，AI 负责语义理解 |
| 生成通用 div 和样式 | 优先复用已注册的真实组件 |
| 失败时继续猜测 | 降级并展示原因，必要时人工确认 |
| 自然语言重写文件 | 自然语言转换为结构化 Patch |
| 只展示页面效果 | 同时验证类型、构建、运行时和视觉结果 |

### 3.3 核心场景

MVP 核心场景：

- AI SaaS 官网营销页
- 企业产品落地页
- 已有 React 组件库的页面生成验证

评测场景：

- 金融科技营销页
- 电商新品活动页
- Token 冲突、素材缺失、组件缺失和非法输入

### 3.4 非目标

MVP 阶段不做：

- 任意截图转代码
- 完整 Figma 插件
- 完整 Figma 编辑器
- 通用低代码平台
- 多框架代码生成
- 多人实时协作
- 在线部署平台
- 电商交易、支付、订单、库存和物流
- 复杂 Canvas、3D、地图、播放器和图表生成
- 任意 npm 依赖安装或任意代码执行
- 自研大模型

---

## 4. 目标用户与核心任务

### 4.1 主要用户：前端工程师

用户任务：

> 当我拿到符合一定结构约束的营销页设计时，希望快速生成能够接入现有组件库、可编译且可维护的 React 代码，从而减少重复布局和样式还原工作。

核心价值：

- 降低营销页基础开发成本
- 提高组件和 Token 复用率
- 提前暴露设计与工程规范冲突
- 减少生成代码的人工修复

### 4.2 次要用户：设计系统维护者

用户任务：

> 当设计稿准备进入研发阶段时，希望检查 Token 和组件使用是否符合规范，并确认设计组件与代码组件之间的映射关系。

核心价值：

- 发现未绑定 Token、Detach 组件和非法布局
- 验证设计组件与代码组件映射
- 沉淀可复用 Registry 规则

### 4.3 展示受众：面试官与 AI 应用开发者

这类用户不是主要产品客户，但会关注：

- 前端工程化与架构取舍
- Design Token 和组件系统理解
- AI Structured Output、Tool Use 和失败兜底
- 评测、验证、可观测性和安全边界

---

## 5. 产品目标

### 5.1 用户目标

- 把符合输入规范的 AI SaaS 设计稳定转换为 React 页面。
- 至少接入一套外部示例组件库，而不是只匹配 ForgeUI 内置组件。
- 对每次匹配、降级和失败给出可理解说明。
- 生成结果可以直接预览、验证和导出。
- AI 修改不会无边界重写完整项目。

### 5.2 项目展示目标

项目需要证明：

- React、TypeScript 和 Node 工程能力
- Design IR 与编译器式生成思路
- Design Token 与设计系统理解
- 外部组件 Registry 接入能力
- 确定性规则与 AI 的合理分工
- AST Codegen、验证、回滚和评测能力
- Vibe Coding 中的规划、规则、Review 和失败治理

### 5.3 不以虚构数据证明价值

所有指标必须来自固定评测集和真实运行记录。README 需要同时展示成功案例、失败案例和已知限制。

---

## 6. 核心产品原则

### 6.1 Token First

```text
原始设计值
→ Primitive Token
→ Semantic Token
→ 组件样式
```

MVP 完整支持 Primitive Token 和 Semantic Token；Component Token 放入 V1.1。

### 6.2 Component First

```text
精确注册组件
→ 注册组件 + Props Adapter
→ 已登记的基础组合 Recipe
→ 原生语义元素 + Token
→ 人工确认占位
```

系统不在运行时任意发明组件组合。基础组合必须来自可测试的 Recipe。

### 6.3 Rules First, AI Assisted

规则负责 Token、精确映射、类型、Import、代码生成、构建和版本管理。AI 只负责语义识别、修改计划和结构化 Patch。

### 6.4 Patch Instead of Rewrite

AI 只能修改白名单路径。MVP 支持：

- `update_token`
- `update_content`
- `update_prop`

结构插入、删除、替换和 Motion 修改放入后续版本。

### 6.5 Validate Before Commit

```text
Schema
→ TypeScript
→ Build
→ Runtime
→ Visual Regression
→ Commit / Rollback
```

### 6.6 Explainable and Reproducible

每次生成必须记录：

- 输入 Schema 版本
- Engine、Registry 和规则版本
- 模型及 Prompt Schema 版本
- 组件匹配策略、原因和警告
- 验证结果和生成耗时

---

## 7. MVP 范围

### 7.1 MVP 必须完成

| 模块 | MVP 范围 |
| --- | --- |
| 输入 | AI SaaS Preset、符合 Schema 的本地 Design JSON |
| Linter | 层级、命名、绝对定位、Token、素材、标题和可访问性规则 |
| Token | Color、Spacing、Typography、Radius、Shadow；Primitive + Semantic |
| 组件 | 8 个基础组件、4 个营销 Section、1 套外部示例 Registry |
| 匹配 | Component Key 精确匹配、Props Adapter、Recipe、Native、Manual Review |
| 响应式 | Mobile、Tablet、Desktop；显式规则优先 |
| Codegen | React、TypeScript、CSS Variables、CSS Modules |
| AI | 修改计划；Token、内容和白名单 Props Patch |
| 验证 | Schema、TypeScript、Build、Runtime、固定环境视觉回归 |
| 版本 | 最近 10 个本地版本、Diff、回退 |
| 导出 | Standalone ZIP、Integration ZIP |
| 报告 | 匹配、Token、验证、人工确认和耗时报告 |

### 7.2 MVP 不做但保留接口

- Figma Adapter
- 用户任意 npm 组件库自动扫描
- Component Token
- Dark Mode 自动生成
- 任意 Section 插入、删除和替换
- 完整在线代码运行沙箱
- 在线多人项目存储

### 7.3 Flagship 与 Eval 的边界

- AI SaaS：完整 UI、完整生成链路、五分钟演示。
- 金融科技：只作为组件与 Token 差异评测。
- 电商活动页：只作为图片、卡片、价格文本和响应式评测。
- 异常样例：Token 冲突、素材缺失、未知组件、过深嵌套、非法 JSON。

---

## 8. 输入与输出协议

### 8.1 输入

MVP 支持：

- 内置 AI SaaS Preset
- 本地 `design.json`
- 本地 `registry.json`
- 本地图片与 SVG 素材

输入必须声明：

- `schemaVersion`
- 页面根节点
- 稳定节点 ID
- 布局、样式、内容和响应式信息
- 可选的 Source Component Key
- Token 与素材引用

输入限制：

- 文件大小不超过 5 MB
- 节点不超过 2,000 个
- 节点深度不超过 30 层
- 不允许脚本、事件代码和动态 npm 依赖

### 8.2 输出

Standalone 模式输出完整 Vite 项目：

```text
generated-app/
├── package.json
├── index.html
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── LandingPage.tsx
│   ├── sections/
│   ├── content.ts
│   ├── tokens.css
│   ├── assets.ts
│   └── styles/
├── public/
├── generation-manifest.json
└── generation-report.json
```

Integration 模式输出：

- 页面和 Section 文件
- Token 与素材文件
- 组件依赖清单
- Import 映射说明
- Generation Manifest 和 Report

---

## 9. 产品信息架构

### 9.1 工作台布局

| 区域 | 主要职责 |
| --- | --- |
| 顶部流程栏 | Import → Analyze → Map → Generate → Validate |
| 左侧面板 | Design Tree / Lint Issues |
| 中间工作区 | Preview / Code / Diff |
| 右侧上下文面板 | Inspector / Mapping / Token / AI / Version |
| 底部诊断台 | Build、Runtime、A11y、Visual 日志和错误 |

右侧面板随当前节点变化，不同时堆叠全部功能。

### 9.2 跨区域联动

- 点击节点树时，预览和代码同步高亮。
- 点击预览元素时，节点树定位并展示匹配结果。
- 点击错误时，跳转到受影响节点或代码位置。
- 切换版本时，Preview、Code、Report 同步更新。

---

## 10. 核心用户流程

### 10.1 初次生成

```text
创建项目
→ 选择 Preset 或导入 Design JSON
→ 导入或选择 Component Registry
→ 运行 Linter
→ 处理阻断错误
→ 查看 Token 与组件映射
→ 生成代码
→ 运行验证
→ 预览并导出
```

### 10.2 组件匹配失败

```text
匹配失败
→ 展示失败原因与候选组件
→ 用户选择 Adapter / Recipe / Native / Manual Review
→ 预览影响
→ 保存当前项目映射规则
→ 重新生成受影响文件
```

MVP 保存的是项目级映射覆盖，不直接修改外部组件库源代码。

### 10.3 AI 修改

```text
输入自然语言
→ 展示修改计划
→ 用户确认生成 Patch
→ 展示 IR Diff 与代码影响范围
→ 用户应用
→ 验证
→ Commit 或自动 Rollback
```

### 10.4 导出

```text
选择 Standalone / Integration
→ 检查阻断项
→ 生成 Manifest 与 Report
→ 打包 ZIP
→ 下载
```

存在 Build Error 时禁止标记为“验证通过”，但允许用户下载带警告的诊断包。

---

## 11. 功能需求

### 11.1 项目与导入

- 创建、重命名和删除本地项目。
- 选择内置 Preset 或上传 JSON。
- 导入前验证文件类型、大小、Schema 和深度。
- 展示解析进度、失败原因和可恢复操作。
- 不符合新版 Schema 时给出迁移提示，不静默修改。

### 11.2 Design Linter

MVP 规则：

- `unnamed-node`
- `deep-nesting`
- `excessive-absolute-position`
- `hardcoded-color`
- `missing-responsive-rule`
- `unsupported-font`
- `missing-asset`
- `heading-structure`
- `inaccessible-action-node`
- `duplicate-id`

规则分级：

- Error：阻断生成或存在安全问题。
- Warning：允许生成，但必须进入报告。
- Info：改进建议。

评分仅用于辅助，不作为绝对质量结论。相同规则大量重复时采用封顶扣分，避免单一问题主导总分。

### 11.3 Design Token

MVP 支持：

- Color
- Spacing / Size
- Typography
- Radius
- Shadow

能力：

- 原始值精确去重
- 匹配已有 Token
- 相似值聚类建议
- Alias 解析和循环检测
- Token 使用范围展示
- 冲突对比和人工确认
- CSS Variables 预览

冲突操作：

- 使用已有 Token
- 创建新 Token
- 仅对当前节点保留原值

“覆盖已有 Token”必须展示全部受影响节点，不作为默认选项。

### 11.4 Component Registry

MVP 提供：

- ForgeUI 内置示例 Registry
- 一套独立外部 React 组件库 Registry
- `registry.json` Schema 校验
- Import、Props、Variant、Slot、Capability 和 Fallback 描述
- Registry 版本与组件包版本显示

MVP 不扫描任意源码自动生成 Registry；V1.2 再提供 Registry 草稿生成。

### 11.5 Component Matcher

匹配顺序：

```text
硬约束过滤
→ Component Key 精确匹配
→ Props / Variant 兼容验证
→ 语义候选排序
→ Adapter 或 Recipe
→ Native / Manual Review
```

每个结果展示：

- 组件名与 Import 来源
- Strategy
- Rule Score
- Confidence
- 匹配原因
- 不兼容项
- 降级原因
- 人工确认项

Score 是规则计算结果；Confidence 是经过评测集校准后的可信度，二者不得混用。

### 11.6 响应式

优先级：

```text
用户显式配置
> 输入设计配置
> Section Preset
> 通用默认规则
```

支持：

- Mobile、Tablet、Desktop
- direction、columns、gap、padding、alignment
- visibility、wrap、image fit
- 容器 max-width
- 响应式字号与标题换行

系统不得宣称可从单张桌面稿准确推断完整移动端设计。

### 11.7 素材

- 支持本地图片、白名单 URL 和 SVG。
- 统一生成语义化文件名与 `assets.ts`。
- 图片必须具有 alt；装饰图允许空 alt。
- 缺失素材进入 placeholder，并产生 Warning。
- 外部资源失败不应导致工作台崩溃。

### 11.8 代码生成

质量规则：

- Section 按语义拆分。
- 重复结构只有在形状一致时才转为数据驱动。
- 内容与结构适度分离，避免把所有短文案强行集中。
- Import 去重并保持稳定顺序。
- 生成语义 HTML，Button 与 Link 正确区分。
- 除 Token 文件外，不写品牌十六进制颜色。
- 不生成无意义多层 div 和随机类名。
- 同样输入和版本必须产生确定性结果。

### 11.9 AI Patch

MVP 示例：

```text
把品牌主色改为橙色，把 Hero 标题改成“Build faster”，
并把功能卡片的桌面端列数从 3 改成 4。
```

系统输出：

1. 修改计划。
2. 结构化 Patch。
3. 受影响节点和文件。
4. 应用前后的 IR Diff。
5. 验证结果和版本记录。

禁止：

- AI 直接返回并覆盖完整项目。
- Patch 修改工作台自身代码。
- Patch 写入脚本、Import 或未知组件。
- 旧版本 Patch 覆盖更新后的项目状态。

### 11.10 验证与预览

验证层级：

- Schema：IR、Token、Registry、Patch。
- TypeScript：类型、Props、Import。
- Lint：ESLint 和可访问性规则。
- Build：Vite 生产构建和依赖解析。
- Runtime：挂载、Console、Error Boundary、素材错误。
- Visual：三个固定 viewport 的截图回归与关键布局断言。

所有输入都执行截图采集和布局断言；只有内置 Preset 与官方 Eval 具有批准基线，可以计算截图回归差异。用户自定义输入没有原始视觉基线时，不展示虚假的“像素还原率”。

预览支持：

- Desktop：1440 × 900
- Tablet：768 × 1024
- Mobile：390 × 844

### 11.11 版本与回退

- 初始生成和每次成功 Patch 创建版本。
- 保存 Prompt、Patch、基础版本、Diff 和验证结果。
- MVP 保留最近 10 个版本。
- 失败 Patch 记录失败原因，但不替换当前成功版本。
- 支持一键回退和回退前预览。

### 11.12 Generation Report

报告包含：

- 总节点与可匹配节点数
- Exact、Adapter、Recipe、Native、Manual 数量
- Token 提取、复用、新建和冲突数量
- Schema、TypeScript、Lint、Build、Runtime、Visual 状态
- 可访问性错误和警告
- 阻断项与人工确认项
- 各阶段耗时和生成版本信息

### 11.13 可访问性、SEO 与性能

可访问性：

- 语义 HTML
- Heading 层级
- alt、label、键盘访问和焦点样式
- 颜色对比度
- Reduced Motion
- 错误不能只通过颜色表达

SEO：

- title、description、Open Graph
- Heading 和 Section 结构
- Canonical 配置入口

性能：

- 图片尺寸和懒加载建议
- 不输出未使用组件依赖
- 检测明显布局抖动和横向溢出
- 记录生成页面的 JS/CSS 体积

---

## 12. 交互与视觉设计规范

### 12.1 信任设计

- “已匹配”“已降级”“需确认”“验证失败”使用图标、文字和颜色共同表达。
- Confidence 不使用虚假小数精度；MVP 展示高、中、低或整数百分比。
- 用户应用 Patch 前必须看到计划和影响范围。
- 任何自动回滚都要说明失败阶段和当前有效版本。

### 12.2 状态设计

必须覆盖：

- Empty
- Importing
- Analyzing
- Generating
- Validating
- Success
- Warning
- Blocking Error
- Rolled Back
- Stale Patch

长任务必须显示阶段进度，不能只展示无限 Loading。

### 12.3 ForgeUI 自身 Design System

工作台自身使用 `packages/ui`、CSS Variables 和统一 Token，形成自举案例：

- 颜色、间距、字号和圆角均来自 ForgeUI Token。
- 表单、Tabs、Dialog、Tooltip、Status 等复用统一组件。
- 提供 Storybook 或独立组件文档页。
- 工作台可使用 Tailwind，但生成代码默认使用 CSS Variables + CSS Modules。

---

## 13. 指标定义与发布门槛

所有门槛基于仓库固定评测集，在固定 Node、浏览器和 viewport 环境运行。

| 指标 | 定义 | MVP 发布门槛 |
| --- | --- | --- |
| 有效样例构建通过率 | Build Passed / 有效输入样例数 | 官方有效样例 100% |
| 组件 Top-1 准确率 | 正确首选匹配 / 已标注可匹配节点 | ≥ 90% |
| Patch 成功率 | Commit Patch / 合法固定 Prompt | ≥ 90% |
| Token 复用率 | 复用引用 / 全部 Token 引用 | 记录并解释，不单独追求高值 |
| 人工确认率 | Manual Review / 可匹配节点 | 旗舰案例 ≤ 10% |
| 视觉回归 | 固定环境截图差异 + 布局断言 | 无未批准差异、无关键溢出 |
| 可访问性阻断错误 | 自动检查中的 Error | 旗舰案例为 0 |
| 首次预览耗时 | 导入完成至可交互预览 | 参考设备 P95 ≤ 10 秒 |

组件复用率的分母只统计“具备组件语义的可匹配节点”，不把普通文本和图片节点混入分母。

---

## 14. MVP 验收标准

### 14.1 主链验收

1. AI SaaS Preset 可以稳定转换为版本化 Design IR。
2. 本地 Design JSON 非法时能够给出结构化错误。
3. 至少一套外部示例 React 组件库可通过 Registry Manifest 接入。
4. 至少 8 个基础组件和 4 个 Section 可稳定生成。
5. 匹配结果包含策略、原因、Confidence、警告和降级信息。
6. Token 可以生成 CSS Variables，并处理 Alias、冲突和循环引用。
7. 生成的 Standalone 项目可以安装、TypeScript 检查并通过 Vite Build。
8. 页面可以在三个固定 viewport 预览且无关键布局溢出。
9. 三类 MVP Patch 可以通过 Schema 校验、应用、验证和回退。
10. Standalone 与 Integration 两种 ZIP 均可导出。

### 14.2 质量验收

1. 官方有效评测样例构建通过率为 100%。
2. Flagship 页面无自动可访问性 Error。
3. 固定截图回归无未批准差异。
4. 失败样例能够进入预期错误码或降级路径。
5. 相同输入、Engine 和 Registry 版本生成结果稳定。
6. README 明确说明范围、取舍、指标和失败案例。

---

## 15. 安全与隐私边界

- 模型密钥只保存在服务端环境变量中。
- 设计文案和节点名始终按不可信数据处理。
- AI 输出必须通过 Schema、路径白名单和版本检查。
- 预览运行在受限 iframe，并限制网络和脚本能力。
- 导入文件限制类型、大小、节点数和深度。
- 不执行用户提供的脚本，不允许任意 npm install。
- MVP 项目和版本数据默认仅保存在本地。
- 日志不得记录模型密钥和完整敏感设计内容。

---

## 16. 主要风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| MVP 范围膨胀 | 无法形成完整演示 | 只精做一个 Flagship，其他场景作为 Eval |
| Registry 接入过重 | 延误主链 | MVP 只支持 Manifest，不做源码自动扫描 |
| 组件误匹配 | 生成结果不可用 | 硬约束、精确匹配、阈值和人工确认 |
| AI 输出不稳定 | Patch 失败 | Structured Output、白名单、重试和回滚 |
| 浏览器无法完整 Build | 验证链路断裂 | 使用本地 Node Engine 执行验证 |
| 视觉回归不稳定 | CI 误报 | 固定浏览器、字体、viewport 和基线环境 |
| 生成代码过度抽象 | 可读性下降 | 通过代码规则和人工 Review 限制 |

---

## 17. 版本规划

### MVP

- AI SaaS Flagship
- Design JSON / Registry Manifest
- Primitive + Semantic Token
- 组件匹配与降级
- React AST Codegen
- Node 验证链路
- 三类 AI Patch
- 视觉回归、版本和 ZIP 导出

### V1.1

- Component Token
- Dark Mode
- Motion Patch
- 用户可见 Screenshot Diff
- 更多响应式规则

### V1.2

- Figma Adapter 和轻量插件
- Figma Variables 与 Component Instance
- Registry 草稿自动生成
- Section 插入、替换和删除 Patch

### V2

- 多品牌、多项目组件库
- 团队规则和服务端项目存储
- CI Design Lint 与生成回归
- 更多框架输出

---

## 18. 五分钟演示脚本

### 0:00～1:00：问题与输入

- 说明普通 AI D2C 的硬编码和组件复用问题。
- 选择 AI SaaS Preset，并展示外部组件 Registry。

### 1:00～2:00：分析

- 展示 Design Tree、Lint、Token 和阻断/警告。
- 点击设计节点联动预览。

### 2:00～3:00：匹配与生成

- 展示 Exact Match、Adapter 和 Manual Review。
- 生成 React 项目并展示可解释原因。

### 3:00～4:00：AI Patch

输入：

```text
主色改成橙色，Hero 标题改成“Build faster”，
功能卡片桌面端改成四列。
```

- 展示计划、Patch、Diff 和影响范围。

### 4:00～5:00：验证和失败兜底

- 展示 TypeScript、Build、Runtime 和 Visual 结果。
- 演示一次非法 Patch 自动拒绝或回滚。
- 导出 Standalone 项目和 Generation Report。

---

## 19. 项目核心表达

> ForgeUI 采用编译器式 D2C 思路。输入设计先转换为统一 Design IR，再解析 Design Token，并通过版本化 Component Registry 映射真实 React 组件。匹配不是让 AI 随机猜测，而是先执行硬约束和精确映射，再进入 Adapter、Recipe、原生元素或人工确认。自然语言修改只生成受 Schema 和版本约束的 Patch，并经过类型、构建、运行时和视觉验证。项目的重点不是“生成一个看起来像的页面”，而是证明设计到代码过程可以被约束、解释、测试和回退。
