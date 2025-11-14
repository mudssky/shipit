# Shipit 实施步骤 14 - 交互式体验

## 目标
- 在 `--interactive` 标志启用交互式流程：选择版本、确认发布、选择目标目录等，提升使用体验。

## 技术实现
- 依赖：使用已有 `inquirer`（项目已引入）。
- 封装交互：`src/utils/interactive.ts`
  - `pickFromList(items)`、`confirm(message)`、`inputDir(defaultValue)` 等
- 命令集成：
  - `release list`：在交互式模式下选择条目并可直接触发后续动作（如 `download/publish`）。
  - `release publish`：提示确认与目标目录选择（提供默认白名单前缀）。

## 交互模式与入口
- 自动交互：`process.stdout.isTTY && !process.env.CI` 时自动进入；显式 `--interactive` 强制开启。
- 禁用交互：`--no-interactive` 明确禁用，优先级高于自动交互。
- 跳过确认：`--yes` 在交互模式下将所有确认默认同意。

## 列表交互流程
- 阈值过滤：通过 `release.listLargeThreshold`（默认 `30`，配置可覆盖）控制当列表项过多时先输入关键词进行过滤。
- 条目选择：使用 `pickFromList`，显示 `Key | LastModified`。
- 动作选择：
  - `provider=oss`：支持 `下载/发布/取消`
  - `provider=server`：支持 `发布/取消`
- 非交互兼容：列表展示遵循 `--style` 或配置的 `listOutputStyle`，交互只是补充选择，不改变原有输出风格。

## 发布交互流程
- 信息摘要：先展示 `名称/目录/provider` 概览。
- Hooks 概览：仅显示类型与数量（shell/js/ts）；当传入 `--verbose` 时额外展示脚本路径列表。
- 目录输入与校验：输入目录默认取 `release.targetDir`，校验必须以 `allowedTargetDirPrefix` 开头，校验失败可重试或取消。
- 最终确认：使用 `confirm` 执行最终确认；`--yes` 时默认同意。
- 执行：沿用既有 `runHooks` 与 provider 发布逻辑；`--dry-run` 时仅输出摘要与模拟结果。

## 边界与回退
- 非 TTY 或 `CI=true`：忽略交互，按非交互模式继续并输出说明。
- 取消操作：统一输出“操作已取消”，退出码为 `0`。
- 输入无效：即时校验与重试；超过重试次数（如需）可直接退出并提示。

## 配置与新增字段
- `release.listLargeThreshold: number` 默认 `30`。
- 其余沿用既有配置：`release.listLimit`、`release.listOutputStyle`、`release.allowedTargetDirPrefix`。

## 测试策略
- 单元测试：
  - `vi.mock('inquirer')` 驱动交互分支：确认默认、取消、输入校验成功/失败重试。
  - 工具函数测试：`interactive.ts` 的 `confirm/inputDir/pickFromList/pickAction` 基本行为。
- 集成测试：
  - `release list -i`：选择条目触发 `download/publish` 分支。
  - `release publish -i`：展示 Hooks 概览并发布；在 Windows11 下优先 `powershell`，或通过 `--no-hooks` 避免跨平台差异。

## 已实现说明
- 已新增 `src/utils/interactive.ts`，并在 `src/commands/release/index.ts` 集成交互逻辑（`list/publish`）。
- 已添加 `--no-interactive` 与 `--yes` 选项；`release.listLargeThreshold` 默认值为 `30`，可在配置覆盖。
- 已补充对应测试，覆盖 `list` 触发下载与 `publish` 展示 Hooks 概览并发布的主要路径。

## 测试
- `vi.mock('inquirer')` 模拟交互结果；断言分支逻辑与非交互回退。
