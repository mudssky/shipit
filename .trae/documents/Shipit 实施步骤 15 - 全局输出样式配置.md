# Shipit 实施步骤 15 - 全局输出样式配置

## 目标
- 可选地引入“全局”输出样式默认值，与现有 `shipit.release.listOutputStyle` 协同，形成优先级链。

## 技术实现
- `GlobalEnvConfig`（可选）：新增 `TABLE_STYLE?: 'tsv' | 'table'`
- 优先级链：`--style` > `shipit.release.listOutputStyle` > `global.TABLE_STYLE` > `'tsv'`
- 配置调整：将 `shipit.release.listOutputStyle` 设为可选（不设置时允许落到全局或默认）。
- 读取策略：命令侧通过动态导入 `@/config` 读取 `globalConfig.TABLE_STYLE`，异常安全，无法读取时回退默认。
- 应用位置：`release list` 在 OSS/Server 分支均计算 `finalStyle` 并 `logger.setTableStyle(finalStyle)`，非交互模式保持原有输出流程。

## 测试
- 单元测试：`tests/unit/commands/release-list-global-style.test.ts` 覆盖以下场景：
  - 仅设置全局样式：命令使用 `TABLE_STYLE` 并渲染表格。
  - 同时设置局部 `listOutputStyle`：局部覆盖全局。
  - 传入 `--style`：命令行优先级最高，覆盖一切。

## 已实现说明
- 已在 `src/config/index.ts` 增加 `TABLE_STYLE?: 'tsv' | 'table'`。
- 已将 `src/config/shipit.ts` 中 `release.listOutputStyle` 改为可选。
- 已在 `src/commands/release/index.ts` 实施优先级链并安全读取全局配置。
- 已补充对应测试，验证三种优先级组合与默认回退 `'tsv'`。
