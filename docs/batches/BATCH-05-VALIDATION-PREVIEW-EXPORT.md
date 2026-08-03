# Batch 05：Validation、隔离 Preview 与 Export

状态：实现完成，等待分支 CI 实测

分支：`agent/batch-05-validation-export`

基于：`main`

## 目标

完成生成后的验证、独立 Origin 预览、Runtime Bridge、固定布局断言和 Standalone/Integration 双模式 ZIP，形成“验证通过才可导出”的产品门槛。

## 完成功能

| ID      | 任务                 | 实现结果 |
| ------- | -------------------- | -------- |
| B05-T01 | Validation Harness   | Schema、TypeScript、Build、Runtime、Layout、Accessibility、Visual 独立结果与诊断 |
| B05-T02 | Job 状态机           | queued/running/succeeded/failed/cancelled、有向迁移和结构化日志 |
| B05-T03 | 独立 Preview Runtime | Engine 同进程第二 Origin、受限 iframe sandbox、nonce CSP、`connect-src 'none'` |
| B05-T04 | Runtime Bridge       | origin/source/schema/type/payload 校验；node select 联动 Studio；runtime error 回写 Job |
| B05-T05 | 固定浏览器断言       | 390/768/1440 固定布局断言、关键 Hero 可见性和溢出保护合同 |
| B05-T06 | Visual baseline 流程 | 固定 locale/timezone/DPR/fonts/viewports；显式人工批准；变化绝不自动批准 |
| B05-T07 | Exporter             | 无外部压缩依赖的确定性 ZIP；Standalone/Integration manifest/report/dependencies |
| B05-T08 | 导出门槛             | blocking validation 返回 409；warning 必须显式确认 |

## 自动测试

| ID           | 层级         | 覆盖 |
| ------------ | ------------ | ---- |
| B05-UT-001   | Unit         | Job 合法/非法状态迁移 |
| B05-UT-002   | Unit         | Zip Slip、绝对路径、Windows 路径、重复路径阻断 |
| B05-UT-003   | Unit         | ZIP 字节、文件清单和 archive hash 确定性 |
| B05-UT-004   | Unit         | Runtime Bridge origin/source/version/payload 拒绝 |
| B05-API-001  | API          | 创建 Job、轮询状态、request ID、结构化日志 |
| B05-API-002  | API          | Runtime failure 后 export 返回 `EXPORT_VALIDATION_BLOCKED` |
| B05-API-003  | API          | standalone/integration MIME、文件名、ZIP 签名和 hash |
| B05-E2E-002  | Studio/jsdom | Preview 节点消息联动 Studio，错误来源被拒绝 |
| B05-INT-001  | Integration  | Generate → Validate → 双模式 Export 合同 |

## 环境约束

Browser/Visual 只有在固定浏览器、字体、locale、timezone、DPR 和 viewport 可用时才计为通过。环境缺失记为 `skipped` 并保留原因，不使用 jsdom 冒充视觉通过。

## 通过门槛

- Preview 安全属性与消息校验有自动测试。
- Runtime/Layout 实际进入独立 check，不再固定为 `skipped`。
- 两种 ZIP 均不包含绝对路径、遍历路径、密钥或临时目录。
- Flagship 固定浏览器视觉门禁：本批实现 baseline/环境合同；当前 GitHub Actions 未安装固定浏览器，因此 Visual 预期为 `skipped`，不能宣称视觉基线已通过。

## 实测结果

等待 `agent/batch-05-validation-export` 分支质量流水线完成后填写。
