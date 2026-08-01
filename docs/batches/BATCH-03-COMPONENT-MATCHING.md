# Batch 03：Component Matching 与安全降级

状态：待开始

分支：`agent/batch-03-component-matching`

基于：`agent/batch-02-token-engine`

## 目标

完成 `Exact → Adapter → Recipe → Native → Manual Review` 的确定性匹配链，保证硬约束永远不能被语义分数覆盖，并让每个选择都可解释。

## 任务

| ID      | 任务                        | 产物/验收                                                         |
| ------- | --------------------------- | ----------------------------------------------------------------- |
| B03-T01 | 扩展 Registry 合同          | Adapter、Recipe、slots、required capabilities、token requirements |
| B03-T02 | 实现 Hard Constraint Filter | import、props、variant、slot、capability、required token          |
| B03-T03 | 实现 Props Adapter          | 仅声明式 rename/default/enum map，不执行代码字符串                |
| B03-T04 | 实现 Recipe                 | 白名单组件组合、稳定依赖顺序、无任意表达式                        |
| B03-T05 | 实现语义评分                | 固定权重、tie-break、阈值与 confidence label                      |
| B03-T06 | Native/Manual 降级          | 有安全语义映射才 native，否则 manual review                       |
| B03-T07 | 扩展示例库                  | 至少 8 基础组件和 4 营销 Section 注册/可生成                      |
| B03-T08 | 报告与 Eval                 | 原因、淘汰原因、警告、Top-1 指标                                  |

## 测试用例计划

| ID           | 层级        | 场景                            | 预期                                |
| ------------ | ----------- | ------------------------------- | ----------------------------------- |
| B03-UT-001   | Unit        | Source Key 精确且 props 合法    | `exact-component/high`              |
| B03-UT-002   | Unit        | 精确组件缺 required prop        | 被硬约束淘汰，不得靠分数恢复        |
| B03-UT-003   | Unit        | Adapter rename/default/enum map | 生成稳定 adapted props              |
| B03-UT-004   | Unit        | Adapter 写入未知 prop/非法规则  | Registry 阻断                       |
| B03-UT-005   | Unit        | Recipe 缺成员或 slot            | Recipe 淘汰并解释原因               |
| B03-UT-006   | Unit        | 语义评分相同                    | 按 component ID 稳定 tie-break      |
| B03-UT-007   | Unit        | 分数低于阈值                    | 不伪造概率，进入 native/manual      |
| B03-UT-008   | Unit        | button/link 等安全语义          | 生成对应 native element             |
| B03-BL-001   | Business    | Exact 与高分候选同时存在        | Exact 始终优先                      |
| B03-BL-002   | Business    | 不兼容候选分数最高              | 硬约束优先淘汰                      |
| B03-BL-003   | Business    | 未知营销 Section                | Manual Review，不生成貌似正确的组件 |
| B03-INT-001  | Integration | 8 基础 + 4 Section fixture      | 全部进入预期策略并生成可构建代码    |
| B03-EVAL-001 | Eval        | 人工标注 eligible nodes         | Top-1 指标按正确分母计算            |
| B03-SEC-001  | Security    | Registry 含表达式/路径穿越      | 合同或 allowlist 阻断               |

## 通过门槛

- 五级策略均有真实路径而非占位状态。
- 每个结果包含 reasons、incompatibilities、warnings 和 confidence。
- 硬约束测试证明评分不能覆盖不兼容。
- Flagship 与差异 Eval 的期望匹配全部通过。

## 实测结果

待本批完成后填写。
