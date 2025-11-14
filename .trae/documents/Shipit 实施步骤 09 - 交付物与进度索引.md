# Shipit 实施步骤 09 - 交付物与进度索引

## 交付物
- 命令与功能：
  - `upload`：支持 `server` 与 `oss` 上传，校验 `requiredPrefix`。
  - `release list`：列表输出支持 `tsv/table`，可通过 `--style` 覆盖配置。
  - `release publish`：校验 `allowedTargetDirPrefix`，统一日志与错误处理。
  - `dingmail`：按需读取全局配置，IMAP 客户端懒创建。
- 配置与校验：
  - `shipit.config.*` 搜索与 `zod` Schema 校验（懒加载代理）。
  - 全局环境配置（IMAP 等）懒加载与统一错误输出。
- Provider 抽象：
  - `OssProvider` 接口与工厂 `createOssProvider(cfg)`（实现：`aliyun`）。
- 日志与错误：
  - `Logger` 封装 `ora` 与表格渲染；`ShipitError` + 非零退出码。

## 进度（2025-11-14）
- 已完成：
  - 依赖与脚本：`pnpm qa`、`pnpm build/start`、Vitest 覆盖率机制。
  - 统一日志与错误处理、配置懒加载与错误时机优化。
  - `release list` 输出风格封装与 `--style` 选项；修复 `ora` 与表格冲突。
  - `upload` 路径前缀限制；`publish` 目录白名单校验。
- 验收：本地与 CI 通过 `typecheck` → `biome:check` → `test` → `build` 全序列。

## 文档索引
- 01 - CLI 与配置基础
- 02 - Server 上传
- 03 - OSS 上传（多 Provider）
- 04 - Release 列表与发布
- 05 - 日志与错误处理
- 06 - 安全与权限
- 07 - 测试与验收
- 08 - 可扩展性与架构
 - 09 - 交付物与进度索引
 - 10 - 发布 Hooks 执行器
 - 11 - 命名策略模块
 - 12 - Provider 下载与校验
 - 13 - Server Provider（列表与发布）
 - 14 - 交互式体验
 - 15 - 全局输出样式配置（可选）

## 后续扩展建议
- Provider：按工厂模式增加新的存储实现（如 `s3`），保持接口一致。
- 输出：在 `Logger` 增加 `json` 风格以便脚本化消费（如后续需要）。
- CLI：在 `release publish` 增加交互式确认与 Hook 执行流程（按安全策略逐步开放）。
