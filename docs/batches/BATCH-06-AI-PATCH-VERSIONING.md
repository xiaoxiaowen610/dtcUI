# Batch 06：受限 AI Patch、版本与回退

状态：待开始

分支：`agent/batch-06-ai-patch-versioning`

基于：`agent/batch-05-validation-export`

## 目标

实现只允许 Token、内容和 Registry 白名单 Props 的结构化 Patch。AI 只提出计划和操作，Patch Engine 负责版本检查、幂等、事务应用、重验和回退。

## 任务

| ID      | 任务                      | 产物/验收                                                           |
| ------- | ------------------------- | ------------------------------------------------------------------- |
| B06-T01 | Patch 合同                | `update_token`、`update_content`、`update_prop` discriminated union |
| B06-T02 | Version/Idempotency Guard | baseVersion、patchId、重复提交结果稳定                              |
| B06-T03 | Path/Target 白名单        | 稳定 node/token ID；禁止任意 JSON Pointer 与源码路径                |
| B06-T04 | Transactional Apply       | immutable clone、全操作校验、全成或全不成                           |
| B06-T05 | Revalidate/Rollback       | 生成与验证失败自动回滚，成功才 commit version                       |
| B06-T06 | Version Store             | 最近 10 版、Diff、恢复；浏览器 IndexedDB + 可测 adapter             |
| B06-T07 | AI Gateway                | provider adapter、最小上下文、mock provider、无浏览器密钥           |
| B06-T08 | Studio Patch UI           | plan、diff、影响范围、apply/reject/rollback 状态                    |
| B06-T09 | 固定 Prompt Eval          | 合法成功率与非法拒绝率可复现                                        |

## 测试用例计划

| ID          | 层级        | 场景                                      | 预期                                |
| ----------- | ----------- | ----------------------------------------- | ----------------------------------- |
| B06-UT-001  | Unit        | 三种合法操作                              | 只修改目标字段，其他引用保持不变    |
| B06-UT-002  | Unit        | stale baseVersion                         | `PATCH_VERSION_CONFLICT`，状态不变  |
| B06-UT-003  | Unit        | 同 patchId 重放                           | 返回首次结果，不创建重复版本        |
| B06-UT-004  | Unit        | 未知 node/token/prop                      | 结构化拒绝，零部分写入              |
| B06-UT-005  | Unit        | 非 allowlisted prop                       | `PATCH_PROP_NOT_ALLOWED`            |
| B06-UT-006  | Unit        | 多操作中最后一个失败                      | 整批回滚，hash 与应用前一致         |
| B06-UT-007  | Unit        | 最近 10 版溢出                            | 丢弃最旧版，当前与父链正确          |
| B06-UT-008  | Unit        | rollback 到历史版本                       | 创建可追踪的新版本，不篡改历史      |
| B06-API-001 | API         | 模型 provider 超时/无效 JSON              | 有限重试后失败，不进入 Patch Engine |
| B06-API-002 | API         | 浏览器请求含 provider key                 | 忽略/拒绝，日志不回显密钥           |
| B06-UI-001  | UI          | 查看 plan/diff 后 apply                   | pending、success、version 状态正确  |
| B06-UI-002  | UI          | Patch 校验失败                            | 原预览保留，失败原因和回退状态可见  |
| B06-INT-001 | Integration | 固定 Prompt → Patch → Generate → Validate | 合法案例提交新版本                  |
| B06-INT-002 | Integration | Patch 导致构建失败                        | 自动回滚且最后成功版本不污染        |
| B06-SEC-001 | Security    | prompt injection 请求执行脚本/改 import   | 只能产生允许的结构化操作或拒绝      |

## 通过门槛

- AI 不接触源码写入、imports、依赖、脚本或 git。
- baseVersion、幂等和事务回滚均有失败路径测试。
- Version Store 维持最近 10 个本地版本并支持 Diff/回退。
- 固定 Prompt 报告使用真实分母，不使用虚构概率。

## 实测结果

待本批完成后填写。
