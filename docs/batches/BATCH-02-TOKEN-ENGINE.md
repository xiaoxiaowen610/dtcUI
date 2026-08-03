# Batch 02：Token Engine

状态：已完成

分支：`agent/batch-02-token-engine`

基于：`agent/batch-01-ci-evals`

## 目标

让输入 Token 真正驱动生成结果，支持 Primitive/Semantic、Alias、类型校验、冲突解释和稳定 CSS Variables，删除生成器中的品牌 Token 硬编码。

## 任务

| ID      | 任务                     | 产物/验收                                                           |
| ------- | ------------------------ | ------------------------------------------------------------------- |
| B02-T01 | 扩展 Token 合同          | color、dimension、font、weight、typography、radius、shadow 与 alias |
| B02-T02 | 建立 Token Resolver 包   | 规范化、依赖图、拓扑解析、稳定排序                                  |
| B02-T03 | 检测安全失败             | 重复路径、缺失引用、Alias 环、类型不匹配、非法值                    |
| B02-T04 | 定义冲突策略             | 同级冲突阻断；显式输入优先；近似值只给建议不自动替换                |
| B02-T05 | 生成 CSS Variables       | 稳定 kebab-case 名称、引用保留、确定性输出                          |
| B02-T06 | 接入 Plan/Codegen/Report | Token 摘要、复用数、诊断、真实 `tokens.css`                         |
| B02-T07 | 增加 Token Eval          | alias success、cycle invalid、missing reference invalid             |

## 测试用例计划

| ID           | 层级        | 场景                             | 预期                                  |
| ------------ | ----------- | -------------------------------- | ------------------------------------- |
| B02-UT-001   | Unit        | Primitive color                  | 规范化为稳定色值和 CSS 变量名         |
| B02-UT-002   | Unit        | Semantic alias 指向 Primitive    | 解析成功且 CSS 保留 `var()` 引用      |
| B02-UT-003   | Unit        | Alias 自环、双节点环、长环       | 返回 `TOKEN_ALIAS_CYCLE` 和完整路径   |
| B02-UT-004   | Unit        | Alias 指向不存在路径             | 返回 `TOKEN_REFERENCE_MISSING`        |
| B02-UT-005   | Unit        | color alias 指向 dimension       | 返回 `TOKEN_TYPE_MISMATCH`            |
| B02-UT-006   | Unit        | 重复 Token path                  | 返回 `TOKEN_DUPLICATE_PATH`           |
| B02-UT-007   | Unit        | 非法颜色、NaN dimension、空 font | Schema/Resolver 安全拒绝              |
| B02-UT-008   | Unit        | Token 顺序变化                   | CSS 与规范化结果逐字一致              |
| B02-BL-001   | Business    | Primitive + Semantic 覆盖        | 显式 Semantic 胜出并记录来源          |
| B02-BL-002   | Business    | 相似但非同一值                   | 只生成 non-blocking 建议，不擅自合并  |
| B02-INT-001  | Integration | Flagship Token → Codegen         | `tokens.css` 使用输入值，无品牌硬编码 |
| B02-INT-002  | Integration | Cycle 输入运行生成               | 生成阻断，结构化诊断进入报告/API      |
| B02-PERF-001 | Performance | 2,000 Token 长链                 | 在预算内完成且不递归溢出              |

## 通过门槛

- Alias、cycle、missing、type mismatch 均有编号测试和结构化错误。
- Token 排序变化不影响生成源码。
- Flagship 生成 CSS 不再依赖生成器内的品牌常量。
- `pnpm evals`、`pnpm test:coverage`、`pnpm check` 全通过。

## 实测结果

- `pnpm evals`：6/6 通过；新增 alias valid、cycle invalid、missing reference invalid。
- `pnpm test:coverage`：13 个文件、117 个测试全部通过；Statements 91.97%、Branches 81.45%、Functions 95.72%、Lines 93.05%。
- `pnpm check`：typecheck、117 tests、Engine/Studio build、生成项目 TypeScript/Vite、6-case Eval 全部通过。
- 2,000 Token Alias 长链专项测试低于 500 ms 门槛。
- Flagship `tokens.css` 由 16 个输入 Token 生成，包含 2 个 Semantic Alias；生成器不再保存品牌 Token 常量。
- Browser/Visual 仍未计为通过。
