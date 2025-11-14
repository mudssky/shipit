# Shipit 实施步骤 01 - CLI 与配置基础

## 目标
- 初始化 `shipit` 顶层命令与子命令骨架（`upload`、`release`）。
- 建立配置加载与校验（`shipit.config.*` + `zod`）。
- 统一 `-v, --verbose` 顶层参数与基础参数解析工具。

## CLI
- 名称与结构：`shipit` 顶层命令，子命令 `upload`、`release`。
- 顶层选项：`-v, --verbose` 用于统一详日志控制。
- 参考：`src/cli.ts` 定义 `program`，`src/index.ts` 注册并 `parse(argv)`。

## 参数解析
- 统一数字/数组解析：参考 `src/utils/argParser.ts`。

## 配置
- 模块名：`shipit`；文件：`shipit.config.ts|js`，支持 `.local` 覆盖。
- 结构：`artifact/upload/release/hooks`，以 `zod` 严格校验并提供默认值。
- 参考：`src/config/shipit.ts`（`ShipitConfigSchema` 与加载逻辑）。

## 命名规范
- 默认模板：`release-{yyyy}{MM}{dd}{HH}{mm}{ss}.zip`；命令行 `-n` 可覆盖。

## 完成标准
- CLI 能启动并展示子命令与选项。
- 配置加载失败时给出人类可读错误信息并退出非零码。

