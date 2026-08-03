# Batch 07：完整评测、演示与发布证据

状态：待开始

分支：`agent/batch-07-release-evidence`

基于：`agent/batch-06-ai-patch-versioning`

## 目标

把功能变成可验证、可演示、可面试讲述的完整交付：扩展固定 Eval，生成指标与失败案例，收敛 README、架构决策、演示脚本和最终验收报告。

## 任务

| ID      | 任务                 | 产物/验收                                                                   |
| ------- | -------------------- | --------------------------------------------------------------------------- |
| B07-T01 | 完整 Eval Matrix     | flagship、fintech、ecommerce、token、asset、component、malformed、oversized |
| B07-T02 | 指标计算             | build pass、Top-1、manual rate、patch success、token reuse、timing          |
| B07-T03 | 失败案例说明         | 输入、预期错误/降级、修复建议、可复现命令                                   |
| B07-T04 | CI Evaluation Report | JSON + Markdown artifact，指标分母清晰                                      |
| B07-T05 | ADR 收敛             | Token、Matcher、Preview/Export、Patch/Version 决策                          |
| B07-T06 | README 收敛          | 能力矩阵、Quick Start、范围、限制、验证证据、分支链                         |
| B07-T07 | 五分钟演示           | 可逐步执行脚本、固定 Prompt、合法与非法路径                                 |
| B07-T08 | 最终验收             | PRD 14 与技术验收 12 条逐项 PASS/FAIL/SKIP                                  |

## 测试用例计划

| ID             | 层级          | 场景                                  | 预期                                |
| -------------- | ------------- | ------------------------------------- | ----------------------------------- |
| B07-EVAL-001   | Eval          | AI SaaS flagship valid                | 完整主链构建、预览、Patch、导出通过 |
| B07-EVAL-002   | Eval          | Fintech token/registry 差异           | 预期策略与 Token 诊断一致           |
| B07-EVAL-003   | Eval          | Ecommerce asset/card/price/responsive | 缺失素材和三端规则正确              |
| B07-EVAL-004   | Eval          | Token conflict/cycle/missing          | 分别进入预期阻断码                  |
| B07-EVAL-005   | Eval          | Unknown component                     | 安全降级，不误报 exact              |
| B07-EVAL-006   | Eval          | Malformed/oversized/deep input        | 输入边界结构化拒绝                  |
| B07-METRIC-001 | Unit          | 指标空分母                            | 输出 N/A，不除零或虚构 100%         |
| B07-METRIC-002 | Unit          | Eligible node 标注                    | Top-1 分母不含普通 text/image       |
| B07-METRIC-003 | Unit          | 合法与非法 Prompt 混合                | Patch success/rejection 分母正确    |
| B07-INT-001    | Integration   | 从干净 clone 执行文档命令             | 安装、检查、eval、生成、导出可复现  |
| B07-DOC-001    | Documentation | README 声明与报告比对                 | 不存在无证据的“passed”或指标        |
| B07-DEMO-001   | Acceptance    | 按五分钟脚本执行                      | 每一步有固定输入和可观察结果        |

## 最终发布门槛

- 官方有效 Eval 构建通过率 100%。
- Flagship 自动可访问性阻断错误为 0。
- 组件 Top-1、Manual Review、Patch、Token 与 timing 指标都来自报告。
- Visual 若未具备固定环境则明确为 `skipped`，最终验收不能伪装为 PASS。
- PRD 主链 10 条、质量 6 条和技术验收 12 条全部逐项有证据。
- `pnpm install --frozen-lockfile && pnpm check && pnpm evals` 从干净状态可复现。

## 实测结果

待本批完成后填写。
