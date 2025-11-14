# Shipit 实施步骤 07 - 测试与验收

## 目标
- 配置 Vitest 并完成单元与集成测试矩阵。

## 安装与脚本
- 开发依赖：`vitest @vitest/coverage-v8`。
- 脚本：`test`、`test:watch`、`qa` 组合执行。

## 配置
- `test.environment: 'node'`；包含 `src/**/*.test.ts` 与 `tests/**/*.test.ts`。
- 覆盖率阈值：`lines/functions 80`、`branches 70`、`statements 80`。

## 集成测试（CLI）
- 直接运行：导入 `program`，注入参数并断言输出与退出码。
- 构建运行：`node dist/index.js shipit ...` 执行命令并断言标准输出与退出码。
- 隔离：使用临时目录与文件；外部依赖 `vi.mock()`。

