# Shipit 实施步骤 11 - 命名策略模块

## 目标
- 统一工件命名策略，支持时间模板与自定义策略，保证名称合法与可读。

## 技术实现
- 新增模块：`src/utils/naming.ts`
  - `interface NameStrategy { generate(baseName: string, ctx: Record<string, any>): string }`
  - 默认策略：时间模板（支持 `{yyyy}{MM}{dd}{HH}{mm}{ss}`）与合法字符过滤（仅字母、数字、`-_`）。
  - `formatName(template: string, now = new Date())`：解析模板并生成名称。
- 命令集成：
  - `upload` 使用 `naming` 生成最终名称，替换现有内联逻辑。
  - 预留配置项：`shipit.artifact.namingTemplate`（可选），未配置则使用默认策略。

## 测试
- 模板解析覆盖不同时间字段与边界值；非法字符过滤。
- `upload` 在不同模板下生成的名称断言。
