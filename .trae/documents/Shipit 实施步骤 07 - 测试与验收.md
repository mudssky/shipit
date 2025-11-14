# Shipit 实施步骤 07 - 测试与验收

## 目标
- 建立稳定的单元与集成测试矩阵，覆盖核心路径（配置加载、上传、发布、日志与错误）。
- 保证在 Windows11 与主流 Linux 上通过统一的质量脚本与构建验收。

## 安装与脚本
- 开发依赖：`vitest`、`@vitest/coverage-v8`（已在 `devDependencies`）。
- 常用脚本：
  - `pnpm test`：一次性运行全部测试与覆盖率统计。
  - `pnpm test:watch`：监听模式本地调试。
  - `pnpm qa`：`typecheck` → `biome:fixAll` → `test` 的质量序列。
  - `pnpm build` / `pnpm start`：构建并以 `node dist/index.js` 验收 CLI 行为。

## 配置
- `vitest.config.ts`：
  - `test.environment: 'node'`
  - `include: ['tests/**/*.test.ts']`
  - `coverage.provider: 'v8'`
  - `coverage.reporter: ['text', 'html']`
  - `coverage.thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 }`

## 目录与规范
- 测试目录：`tests/`（统一归档）
  - 单元测试：`tests/unit/**/*.test.ts`
  - 集成测试：`tests/integration/**/*.int.test.ts`
  - 辅助工具：`tests/helpers/**`
- 路径别名：`@` → `src/`，测试中直接导入源码模块。

## 集成测试（CLI）
- 直接运行：在测试中导入 `program`，注入参数并断言标准输出与退出码（推荐快速回归）。
- 构建运行：`pnpm build` 后通过 `node dist/index.js <command>` 执行命令，断言输出与退出码（接近真实环境）。
- 隔离：
  - 使用 `fs.mkdtempSync` 等临时目录/文件，测试结束清理。
  - 对外部依赖使用 `vi.mock()`（如 `ali-oss`、IMAP），避免真实网络访问。

## 已覆盖的关键用例
- 配置懒加载：在访问 `shipitConfig`、`globalConfig` 字段时触发解析与错误，确保错误时机正确。
- 上传（OSS/Server）：路径前缀限制（`requiredPrefix`）与名称合法性；错误统一为 `ShipitError`。
- 发布（Release）：
  - `list` 输出风格可配置（`tsv`/`table`），`--style` 覆盖行为。
  - 表格渲染封装在 `Logger.renderTable`，避免 `ora` 动效干扰布局。
  - `publish` 目录白名单校验（`allowedTargetDirPrefix`）。

## 验收流程
- 本地或 CI：
  - `pnpm typecheck`
  - `pnpm biome:check`
  - `pnpm test`
  - `pnpm build`
- 覆盖率报告：文本 + HTML，两者均应满足阈值；如低于阈值，需补测或调整实现。

## 故障与回归指引
- 如 `ora` 输出导致表格错位：调整输出顺序为先 `logger.succeed(...)` 再 `logger.renderTable(...)`。
- 如配置在命令注册阶段抛错：检查是否存在提前访问 `shipitConfig/globalConfig` 字段，改为在 `action` 中按需读取。
