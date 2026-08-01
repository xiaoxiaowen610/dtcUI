# Batch 01：CI 与固定 Eval 基线

状态：已完成

分支：`agent/batch-01-ci-evals`

基线：`main@cdaa231`

## 目标

把当前 Phase 1 的本地质量门禁变成远程可重复证据，并建立 Valid、Degraded、Invalid 三类固定评测入口。该批不扩展产品功能，只解决“结果能否稳定复现和被审查”。

## 任务

| ID      | 任务                   | 产物/验收                                                     |
| ------- | ---------------------- | ------------------------------------------------------------- |
| B01-T01 | 固定 CI 运行环境       | Node 24、pnpm 11、frozen lockfile                             |
| B01-T02 | 建立质量工作流         | typecheck、coverage、build、flagship validation、evals        |
| B01-T03 | 定义 Eval Case 合同    | 名称、kind、输入、预期匹配/诊断/错误                          |
| B01-T04 | 增加三类固定案例       | flagship valid、unknown component degraded、malformed invalid |
| B01-T05 | 实现确定性 Eval Runner | 失败非零退出，JSON 报告稳定排序，不含随机时间                 |
| B01-T06 | 发布 CI Artifact       | coverage summary 与 evaluation report                         |
| B01-T07 | 更新 README 与测试证据 | 命令、已完成范围、诚实限制                                    |

## 测试用例计划

| ID          | 层级        | 场景                         | 预期                                        |
| ----------- | ----------- | ---------------------------- | ------------------------------------------- |
| B01-UT-001  | Unit        | Eval Manifest 含重复 case ID | 合同拒绝并指出重复 ID                       |
| B01-UT-002  | Unit        | Eval 结果输入顺序变化        | 报告按 case ID 稳定排序                     |
| B01-UT-003  | Unit        | Expected match 与实际不一致  | case 失败并列出精确差异                     |
| B01-BL-001  | Business    | Valid flagship               | 生成成功、3 个 Exact Match、无阻断诊断      |
| B01-BL-002  | Business    | Unknown component            | 生成成功但进入 Manual Review，标记 degraded |
| B01-BL-003  | Business    | Malformed input              | 生成失败且归类为预期错误，不污染其他案例    |
| B01-INT-001 | Integration | 连续运行两次 Eval            | 除执行时长外，规范化报告完全一致            |
| B01-CI-001  | CI          | 安装与质量门禁               | frozen install、coverage、check、eval 全绿  |
| B01-CI-002  | CI          | 任一用例失败                 | Job 失败且仍上传可诊断报告                  |

## 通过门槛

- `pnpm evals` 返回 3/3 通过并写出 JSON 报告。
- `pnpm test:coverage` 不低于仓库阈值。
- `pnpm check` 通过。
- GitHub Actions 使用固定 major/minor 工具版本并上传报告。
- README 不宣称尚未执行的 Browser/Visual 测试已通过。

## 实测结果

- `pnpm evals`：3/3 通过，覆盖 valid、degraded、invalid。
- `pnpm test:coverage`：12 个文件、96 个测试全部通过；Statements 94.22%、Branches 85.71%、Functions 96.77%、Lines 94.68%。
- `pnpm check`：typecheck、96 tests、Engine build、Studio build、生成项目 TypeScript/Vite、3-case Eval 全部通过。
- `git diff --check`：通过。
- Browser/Visual 未在本批执行，仍明确标记为后续固定环境门禁。
