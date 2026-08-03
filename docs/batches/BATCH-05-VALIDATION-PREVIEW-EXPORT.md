# Batch 05：Validation、隔离 Preview 与 Export

状态：待开始

分支：`agent/batch-05-validation-export`

基于：`agent/batch-04-studio-workbench`

## 目标

完成生成后的验证、独立 Origin 预览、Runtime Bridge、固定布局断言和 Standalone/Integration 双模式 ZIP，形成“验证通过才可导出”的产品门槛。

## 任务

| ID      | 任务                 | 产物/验收                                                   |
| ------- | -------------------- | ----------------------------------------------------------- |
| B05-T01 | Validation Harness   | Schema、TypeScript、Build、Runtime、Layout 独立状态         |
| B05-T02 | Job 状态机           | queued/running/succeeded/failed/cancelled 与结构化日志      |
| B05-T03 | 独立 Preview Runtime | 单独 Origin、受限 iframe sandbox、CSP、无任意网络           |
| B05-T04 | Runtime Bridge       | origin/source/schema 检查，node select 与 runtime error     |
| B05-T05 | 固定浏览器断言       | 390/768/1440 viewport、溢出和关键元素可见性                 |
| B05-T06 | Visual baseline 流程 | 固定 locale/timezone/fonts；变更不得自动批准                |
| B05-T07 | Exporter             | Standalone 与 Integration ZIP、manifest/report/dependencies |
| B05-T08 | 导出门槛             | 阻断验证失败时拒绝，warning 需显式确认                      |

## 测试用例计划

| ID           | 层级        | 场景                                      | 预期                              |
| ------------ | ----------- | ----------------------------------------- | --------------------------------- |
| B05-UT-001   | Unit        | Job 合法状态迁移                          | 仅允许定义的有向迁移              |
| B05-UT-002   | Unit        | ZIP 路径含 `../`、绝对路径、重复路径      | Exporter 阻断 Zip Slip/覆盖       |
| B05-UT-003   | Unit        | 同项目重复导出                            | 排除时间字段后文件清单和哈希一致  |
| B05-UT-004   | Unit        | Runtime message 错 origin/source/version  | 丢弃并记录安全诊断                |
| B05-API-001  | API         | 创建 validation job 并轮询                | 状态、结果、request ID 合同正确   |
| B05-API-002  | API         | 阻断验证后请求 export                     | 409 + `EXPORT_VALIDATION_BLOCKED` |
| B05-API-003  | API         | standalone/integration export             | MIME、文件名、manifest 模式正确   |
| B05-E2E-001  | Browser     | 三端加载固定 flagship                     | 无关键水平溢出、Hero 可见         |
| B05-E2E-002  | Browser     | Preview 节点点击                          | Bridge 回传并联动 Studio          |
| B05-E2E-003  | Browser     | Runtime 异常                              | 报告 failed，不吞异常             |
| B05-A11Y-001 | Browser     | axe 固定页面                              | Flagship 无 blocking error        |
| B05-VIS-001  | Visual      | 固定截图与已批准 baseline                 | 无未批准差异                      |
| B05-INT-001  | Integration | Generate → Validate → Export → 解压 Build | 两模式均通过合同和构建            |

## 环境约束

Browser/Visual 只有在固定浏览器、字体、locale、timezone、DPR 和 viewport 可用时才计为通过。环境缺失必须记为 `skipped` 并保留原因，不能用 jsdom 结果代替视觉通过。

## 通过门槛

- Preview 安全属性与消息校验有自动测试。
- Runtime/Layout 实际执行并进入 report，不再固定为 `skipped`。
- 两种 ZIP 均能解压且不包含绝对路径、密钥或临时目录。
- Flagship 固定浏览器门禁通过；若平台缺浏览器，批次不得宣称 Visual 完成。

## 实测结果

待本批完成后填写。
