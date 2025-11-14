# Shipit 实施步骤 09 - 交付物与进度索引

## 交付物
- `shipit` 命令组及子命令实现。
- `shipit.config.*` 配置示例与 `zod` Schema。
- Provider 抽象与至少两种实现（server、oss）。
- 钩子执行器与命名策略模块。

## 进度（2025-11-14）
- 已完成：依赖（`axios/form-data`）、统一日志（`Logger`）、错误与退出码（`ShipitError`）、`server` 上传接入。

## 文档索引
- 01 - CLI 与配置基础
- 02 - Server 上传
- 03 - OSS 上传（多 Provider）
- 04 - Release 列表与发布
- 05 - 日志与错误处理
- 06 - 安全与权限
- 07 - 测试与验收
- 08 - 可扩展性与架构

