# Batch 04：Studio Workbench 交互闭环

状态：已完成

分支：`agent/batch-04-studio-workbench`

基于：`agent/batch-03-component-matching`

## 目标

把当前旗舰按钮演示升级为可导入、可检查、可联动的三栏工作台，使 Design Tree、Preview、Code、Inspector 和 Diagnostic 共享同一稳定 node ID。

## 任务

| ID      | 任务                   | 产物/验收                                             |
| ------- | ---------------------- | ----------------------------------------------------- |
| B04-T01 | 本地 JSON 导入/编辑    | 文件类型、大小、语法、Schema 错误可恢复               |
| B04-T02 | Registry/Preset 选择   | 显示版本与来源，不允许隐式未知 Registry               |
| B04-T03 | 完整 Design Tree       | 展开、选择、键盘导航、状态持久化                      |
| B04-T04 | 跨区域联动             | Tree ↔ Preview ↔ Code ↔ Inspector 使用 node ID 定位   |
| B04-T05 | Diagnostic 导航        | 点击诊断选中节点并打开相关面板                        |
| B04-T06 | Responsive Resolver/UI | Desktop/Tablet/Mobile 显式规则优先且选择保留          |
| B04-T07 | 状态与错误设计         | empty/loading/degraded/error/success 完整呈现         |
| B04-T08 | 可访问性               | landmark、可访问名称、pressed/selected、focus-visible |

## 测试用例计划

| ID           | 层级        | 场景                                          | 预期                                    |
| ------------ | ----------- | --------------------------------------------- | --------------------------------------- |
| B04-UT-001   | Unit        | Responsive base + mobile/tablet/desktop merge | 显式断点覆盖 base，未声明字段继承       |
| B04-UT-002   | Unit        | Workspace selection reducer                   | 非法 node/file 回退到稳定默认值         |
| B04-UI-001   | UI          | 导入合法 JSON                                 | Tree 更新且生成按钮可用                 |
| B04-UI-002   | UI          | 导入非法 JSON                                 | 显示行列/Schema 错误，保留上次成功状态  |
| B04-UI-003   | UI          | 点击 Tree 节点                                | Preview 高亮、Inspector 更新、Code 定位 |
| B04-UI-004   | UI          | Preview 回传 node ID                          | Tree 与 Inspector 同步选择              |
| B04-UI-005   | UI          | 点击 Diagnostic                               | 选择对应节点并显示原因/建议             |
| B04-UI-006   | UI          | 切换三端后切换 Code 再返回                    | viewport 与 selection 不丢失            |
| B04-UI-007   | UI          | Pending 时重复生成                            | 防重入、按钮 disabled、无重复请求       |
| B04-UI-008   | UI          | Engine 错误后 retry                           | Request ID 可见并成功恢复               |
| B04-A11Y-001 | UI          | 键盘遍历主要控件                              | 顺序合理、状态通过 aria 暴露            |
| B04-INT-001  | Integration | 自定义 JSON → Engine → Studio                 | 非旗舰输入真实分析并展示结果            |

## 通过门槛

- Studio 不再只能发送内置 flagship 请求。
- node ID 能在四个区域双向联动。
- 三种 viewport 的选择和响应式计算均有测试。
- UI 错误不清空最后一次成功工作区，且可重试。

## 实测结果

- 本地 JSON 文件和编辑器均执行类型、空文件、5 MB、JSON 语法位置和版本化 Schema 校验；
  无效输入不替换最后成功工作区。
- Preset 与 Registry 为显式选择，未选择 Registry 时两个生成入口均禁用。
- Design Tree 递归覆盖全部节点，支持展开、稳定选择、Arrow/Enter/Space 键盘操作和
  Zustand 持久状态归一化。
- Tree、Preview、Code、Inspector、Diagnostic 共享 `data-forge-node-id`；深层 Preview 或
  Diagnostic 选择会自动展开 Tree 祖先并定位生成文件。
- Responsive Resolver 按 mobile-first 合并：Base → Mobile → Tablet → Desktop，仅覆盖显式字段；
  visibility 未知值不从低断点继承。
- Studio 保留 Desktop/Tablet/Mobile、节点和文件选择；Engine 失败显示 Request ID，保留最后成功
  预览并支持 Retry，Pending 状态阻止重复请求。
- 测试：16 个文件、154 个测试全部通过；Studio 专项 5 个文件、33 个测试通过。
- Coverage：Statements 88.82%、Branches 80.66%、Functions 93.10%、Lines 90.14%。
- 生成源码新增 Hero 文本节点 ID，使 Code 定位从“相关文件”提升为精确节点定位。
