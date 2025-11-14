# Shipit 项目规则

## 技术栈与包管理

- 主要技术：Node.js CLI、TypeScript、Commander、Inquirer、Cosmiconfig、Zod、Rspack
- 使用 `pnpm` 作为包管理器（`package.json:43`）
- 常用脚本：`pnpm dev`、`pnpm build`、`pnpm start`、`pnpm qa`

## 代码风格

- 按 Biome 配置格式化
- 保持导入自动整理

## 配置与安全

- 配置通过 Cosmiconfig 搜索并使用 Zod 校验（`src/config/index.ts:53-86`）
- 必须遵守 `GlobalEnvConfig` 的字段与类型约束（`src/config/index.ts:6-25, 27-29`）
- 严禁打印或提交敏感信息（如 IMAP 用户与密码）（`src/utils/email.ts:12-18`）
- 仅在必要时启用外部库日志；默认不启用（`src/utils/email.ts:19-23`）

## AI 协作准则

- 优先编辑现有文件，避免无必要的新增文件
- 严禁主动创建文档（*.md/README）除非用户明确提出
- 变更前快速检索并遵循项目既有模式与库选择
- 不使用未在项目中出现的库；如需新增，需给出充分理由并与现有栈兼容

## 文件与变更策略

- 路径别名与导入保持一致性，避免相对路径走样
- 新功能与修复需考虑跨文件影响（CLI 注册、配置读取、类型安全）
- 代码变更后应运行质量脚本：`pnpm qa`

## 测试规范（Vitest 集成测试）

- 测试类别与边界：
  - 单元测试与集成测试统一采用 `Vitest`
- 安装建议（如尚未安装）：
  - `pnpm add -D vitest @vitest/coverage-v8`
  - 推荐新增脚本：`"test": "vitest run"`、`"test:watch": "vitest"`
- 目录与命名约定：
  - 单元测试：`src/**/__tests__/*.test.ts` 或 `src/**/*.test.ts`
  - 集成测试：`tests/integration/**/*.int.test.ts`
  - 公共测试工具：`tests/helpers/**`
- 运行环境与配置：
  - `test.environment` 设为 `node`
  - 包含模式：`src/**/*.test.ts`、`tests/**/*.test.ts`
  - 推荐 `vitest.config.ts` 最小配置：
    - `test: { environment: 'node', include: ['src/**/*.test.ts', 'tests/**/*.test.ts'] }`
- 覆盖率要求：
  - 使用 `@vitest/coverage-v8`，生成文本与 HTML 报告
  - 阈值建议：`lines: 80`、`functions: 80`、`branches: 70`、`statements: 80`
- 集成测试策略（CLI）：
  - 构建运行模式：`pnpm build` 后以 `node dist/index.js` 执行命令，断言标准输出/退出码
  - 直接运行模式：在测试中导入 `program`（`src/cli.ts:3`），用 `program.parse([...])` 注入参数并断言行为
- Mock 与隔离：
  - 使用 `vi.mock()` 模拟 `imapflow` 与配置模块 `@/config`，避免真实外部访问
  - 使用临时目录与文件（如 `fs.mkdtempSync`），测试结束清理
- 环境变量与机密：
  - 测试中不得使用真实账户/密码；必要时以 `process.env` 注入虚拟值或 Mock
  - 不在日志/快照中泄露敏感信息
- 与质量脚本结合：
  - 在 CI 或本地验证序列中加入：`pnpm typecheck` → `pnpm biome:check` → `pnpm test` → `pnpm build`

## 任务与验证

- 优先以脚本验证：`pnpm qa`、`pnpm build`
- CLI 功能验证通过 `pnpm dev` 或 `pnpm start` 进行本地试跑
- 引入单元测试或最小复现实例用于复杂改动的验证（如解析逻辑、邮件接口）

## 禁止事项

- 不提交任何密钥或账户信息到仓库
- 不在未校验配置的情况下访问外部服务（IMAP 等）
- 不进行交互式、阻塞式长时命令，除非确有必要且已明确说明

## 维护与更新

- 当 `tsconfig.json`、`biome.json`、`package.json` 或配置结构变化时同步更新本规则
- 遇到项目新增命令或库时补充相应约定与限制
