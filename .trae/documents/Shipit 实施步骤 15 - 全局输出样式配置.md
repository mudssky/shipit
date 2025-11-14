# Shipit 实施步骤 15 - 全局输出样式配置

## 目标
- 可选地引入“全局”输出样式默认值，与现有 `shipit.release.listOutputStyle` 协同，形成优先级链。

## 技术实现
- `GlobalEnvConfig`（可选）：新增 `TABLE_STYLE?: 'tsv' | 'table'`
- 优先级：`--style` > `shipit.release.listOutputStyle` > `global.TABLE_STYLE`
- 影响范围：`Logger.renderTable` 的默认样式选择不变；命令在解析优先级后调用 `logger.setTableStyle(...)`。

## 测试
- 设置不同优先级组合的断言，确保覆盖行为一致。
