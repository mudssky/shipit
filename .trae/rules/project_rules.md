# Shipit 项目规则

## 技术栈与包管理

- 主要技术：Node.js CLI、TypeScript、Commander、Inquirer、Cosmiconfig、Zod、Rspack
- 使用 `pnpm` 作为包管理器（`package.json:43`）
- 常用脚本：`pnpm dev`、`pnpm build`、`pnpm start`、`pnpm qa`

## 项目目录结构

- `src/` 源码目录
- `src/cli.ts` 顶层 CLI 程序与通用选项
- `src/index.ts` 命令注册入口（导入各子命令并执行 `program.parse`）
- `src/commands/` 子命令实现（`upload/`、`release/`、`dingmail/` 等）
- `src/config/` 配置加载与校验（`shipit.ts` 基于 Cosmiconfig + Zod）
- `src/utils/` 公共工具（参数解析、日志、错误类型等）
- `tests/` 测试目录（按类别分层，统一在此查找）
  - `tests/unit/` 单元测试（纯函数/模块隔离）
  - `tests/integration/` 集成测试（CLI 命令、流程与输出断言）
  - `tests/helpers/` 测试辅助工具与模拟数据

## 代码风格

- 按 Biome 配置格式化
- 保持导入自动整理

## 配置与安全

- 配置通过 Cosmiconfig 搜索并使用 Zod 校验
- 必须遵守 `GlobalEnvConfig` 的字段与类型约束
- 严禁打印或提交敏感信息（如 IMAP 用户与密码）
- 仅在必要时启用外部库日志；默认不启用

## AI 协作准则

- 优先编辑现有文件，避免无必要的新增文件
- 严禁主动创建文档（*.md/README）除非用户明确提出
- 变更前快速检索并遵循项目既有模式与库选择
- 不使用未在项目中出现的库；如需新增，需给出充分理由并与现有栈兼容

## 文件与变更策略

- 路径别名与导入保持一致性，避免相对路径走样
- 新功能与修复需考虑跨文件影响（CLI 注册、配置读取、类型安全）
- 代码变更后应运行质量脚本：`pnpm qa`

## 测试规范

- 测试框架：统一采用 `Vitest`
- 目录与分类：所有测试统一放在 `tests/` 目录下
  - 单元测试：`tests/unit/**/*.test.ts`
  - 集成测试：`tests/integration/**/*.int.test.ts`
  - 公共工具：`tests/helpers/**`
- 运行与环境：
  - `vitest.config.ts` 中 `test.environment` 设为 `node`
  - 路径别名：`@` 映射到 `src/`，用于测试导入源码模块
- 覆盖率：使用 `@vitest/coverage-v8`，生成文本与 HTML 报告
  - 阈值建议：`lines: 80`、`functions: 80`、`branches: 70`、`statements: 80`
- 集成测试策略（CLI）：
  - 构建运行模式：`pnpm build` 后以 `node dist/index.js` 执行命令，断言标准输出/退出码
  - 直接运行模式：在测试中导入 `program`，注入参数并断言行为
- Mock 与隔离：
  - 使用 `vi.mock()` 模拟外部依赖（如 `imapflow`、配置模块），避免真实访问
  - 使用临时目录与文件（如 `fs.mkdtempSync`），测试结束清理
- 与质量脚本结合：
  - 本地或 CI 验证序列：`pnpm typecheck` → `pnpm biome:check` → `pnpm test` → `pnpm build`

## 任务与验证

- 优先以脚本验证：`pnpm qa`、`pnpm test`、`pnpm build`
- CLI 功能验证通过 `pnpm dev` 或 `pnpm start` 进行本地试跑
- 引入单元测试或最小复现实例用于复杂改动的验证（如解析逻辑、邮件接口）

## 禁止事项

- 不提交任何密钥或账户信息到仓库
- 不在未校验配置的情况下访问外部服务（IMAP 等）
- 不进行交互式、阻塞式长时命令，除非确有必要且已明确说明

## 维护与更新

- 当 `tsconfig.json`、`biome.json`、`package.json` 或配置结构变化时同步更新本规则
- 遇到项目新增命令或库时补充相应约定与限制
