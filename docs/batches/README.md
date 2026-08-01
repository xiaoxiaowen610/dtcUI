# ForgeUI 分批实施与测试总计划

## 执行原则

本目录把完整 MVP 拆成七个可独立验收、按依赖串联的批次。每一批遵循同一闭环：

1. 从上一批远程分支创建新分支；
2. 将本批文档状态改为 `进行中`，先补失败测试；
3. 实现最小但完整的纵向能力；
4. 执行定向测试、覆盖率、`pnpm check` 和本批专项门禁；
5. 写入实测结果，将状态改为 `已完成`；
6. 使用单一 conventional commit 提交并推送远程分支。

不跨批自动合并，不覆盖视觉基线，不用后续批次的占位实现冒充本批完成能力。

## 串联分支

| 顺序 | 分支                                 | 基于     | 交付重点                                | 状态   |
| ---- | ------------------------------------ | -------- | --------------------------------------- | ------ |
| 01   | `agent/batch-01-ci-evals`            | `main`   | CI、固定 Eval、质量证据                 | 已完成 |
| 02   | `agent/batch-02-token-engine`        | Batch 01 | Token 解析、Alias、冲突与 CSS Variables | 已完成 |
| 03   | `agent/batch-03-component-matching`  | Batch 02 | 硬约束、Adapter、Recipe、Native、Manual | 待开始 |
| 04   | `agent/batch-04-studio-workbench`    | Batch 03 | 导入、Tree/Preview/Code/Diagnostic 联动 | 待开始 |
| 05   | `agent/batch-05-validation-export`   | Batch 04 | 隔离预览、Runtime、布局检查、双模式 ZIP | 待开始 |
| 06   | `agent/batch-06-ai-patch-versioning` | Batch 05 | 三类受限 Patch、版本、Diff、回退        | 待开始 |
| 07   | `agent/batch-07-release-evidence`    | Batch 06 | 完整 Eval、指标、演示与发布验收         | 待开始 |

串联分支意味着 Batch 07 包含前六批的全部历史。评审单批增量时，以该分支与上一批分支比较；最终集成时只需合并最后一批，或严格按 01 到 07 顺序合并。

## 全局 Definition of Done

- 任务与测试用例有稳定 ID，可从文档追踪到测试名称。
- 新业务逻辑至少包含正常、边界、异常和安全失败路径。
- 同输入、版本、Registry 的生成源码保持确定性。
- 新增 API 具有 Schema、结构化错误和服务层测试。
- 新增 Studio 行为具有可访问名称、键盘可达状态与 UI 测试。
- `pnpm typecheck`、`pnpm test:coverage`、`pnpm check` 全部通过。
- 有专项命令时必须通过，跳过项必须说明原因且不得计为通过。
- README 的完成范围、限制和指标与可复现证据一致。

## 测试层级

| 层级        | 目的                                        | 典型工具/入口           |
| ----------- | ------------------------------------------- | ----------------------- |
| Contract    | 版本化输入输出与错误合同                    | Zod + Vitest            |
| Unit        | Resolver、Matcher、Patch、Exporter 等纯逻辑 | Vitest                  |
| Business    | 策略优先级、回退、事务与版本规则            | Vitest                  |
| API         | Fastify 路由、状态码、请求 ID、安全限制     | `app.inject`            |
| UI          | 页面状态、可访问性语义、跨面板联动          | Testing Library + jsdom |
| Integration | Input → IR → Plan → Code → Build/Report     | Node/Vite/TypeScript    |
| Browser     | 固定 viewport、Runtime Bridge、布局和视觉   | Playwright 固定环境     |
| Eval        | Valid/Degraded/Invalid 的预期结果与指标     | `pnpm evals`            |

## 批次文档

- [Batch 01：CI 与 Eval 基线](./BATCH-01-CI-EVALS.md)
- [Batch 02：Token Engine](./BATCH-02-TOKEN-ENGINE.md)
- [Batch 03：Component Matching](./BATCH-03-COMPONENT-MATCHING.md)
- [Batch 04：Studio Workbench](./BATCH-04-STUDIO-WORKBENCH.md)
- [Batch 05：Validation、Preview 与 Export](./BATCH-05-VALIDATION-PREVIEW-EXPORT.md)
- [Batch 06：AI Patch 与 Versioning](./BATCH-06-AI-PATCH-VERSIONING.md)
- [Batch 07：Release Evidence](./BATCH-07-RELEASE-EVIDENCE.md)
