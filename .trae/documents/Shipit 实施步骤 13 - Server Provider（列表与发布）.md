# Shipit 实施步骤 13 - Server Provider（列表与发布）

## 目标
- 基于后端接口实现 `server` Provider 的列表与发布能力，并与命令统一对齐。

## 技术实现
- 新增模块：`src/providers/server/index.ts`
  - `ServerProvider`：`list(prefix, limit)`、`publish(name, dir)`
  - 依赖：`axios`（已在依赖中）；基于 `baseUrl` 与鉴权（如 `token`）。
- 配置：`shipit.server: { baseUrl: string, token?: string }`
- 命令集成：
  - `release list`：当 `provider=server` 时调用 `ServerProvider.list()` 并复用 `Logger.renderTable`。
  - `release publish`：当 `provider=server` 时调用 `ServerProvider.publish()`，沿用目录白名单校验。

## 测试
- `vi.mock('axios')` 模拟接口返回与错误分支；断言日志与退出码。
- 列表与发布在两种 Provider 分支下的等价行为验证（输出风格保持一致）。
