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

## 测试
- `vi.mock('inquirer')` 模拟交互结果；断言分支逻辑与非交互回退。
