# Shipit 实施步骤 11 - 命名策略模块

## 目标
- 统一工件命名策略，支持时间模板与自定义策略，保证名称合法与可读。

## 技术实现
- 新增模块：`src/utils/naming.ts`
  - `interface NameStrategy { generate(baseName: string, ctx: Record<string, any>): string }`
  - 默认策略：时间模板与合法字符过滤（仅字母、数字、`-_`）。
  - 使用 `dayjs` 进行时间格式化，支持占位符 `{yyyy}{MM}{dd}{HH}{mm}{ss}`（对应 `YYYY/MM/DD/HH/mm/ss`）。
  - `formatName(template: string, now = new Date())`：通过 `dayjs(now)` 格式化并生成名称。
- 命令集成：
  - `upload` 使用 `naming` 生成最终名称，替换现有内联逻辑。
  - 配置项：`shipit.artifact.nameTemplate`（可选），未配置则使用默认策略。

## 测试
- 模板解析覆盖不同时间字段与边界值；非法字符过滤。
- 验证 `dayjs` 本地时间行为与占位符映射。
- `upload` 在不同模板下生成的名称断言。
