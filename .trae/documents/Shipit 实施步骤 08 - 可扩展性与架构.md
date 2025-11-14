# Shipit 实施步骤 08 - 可扩展性与架构

## 目标
- 保持清晰的模块边界与可插拔扩展点，降低新增 Provider/命令的改动成本。

## 顶层结构
- 命令注册：`src/index.ts` 导入并注册 `src/commands/*`，每个命令自包含其选项与 `action`。
- 日志与错误：`src/utils/logger.ts` 封装 `ora` 与输出风格；`src/utils/errors.ts` 统一异常类型与退出码。
- 配置加载：`src/config/shipit.ts` 与 `src/config/index.ts` 采用懒加载代理，避免非相关配置在 CLI 初始化阶段报错。

## Provider 扩展点
- 接口：`OssProvider`（`put(key, filePath)`、`list(prefix, limit)`）。
- 工厂：`createOssProvider(cfg)` 按 `cfg.provider` 返回不同实现（当前：`aliyun`）。
- 新增实现步骤：
  1. 在 `src/providers/oss/<name>.ts` 实现接口（保持返回结构 `{ key, lastModified?: string }[]`）。
  2. 在工厂方法中注册 `<name>`。
  3. 在配置文件中声明 `upload.provider: '<name>'` 与对应凭证字段。
  4. 在命令中复用工厂，无需改动命令核心逻辑。

## 命令插件化
- 每个命令使用 Commander 的子命令模型：选项解析与 `action` 独立，易于按需引入依赖。
- 输出风格通过 `Logger.setTableStyle('tsv'|'table')` 配置，支持 CLI 覆盖 `--style`。
- 与外部交互（如 IMAP、OSS）均通过模块隔离与 `vi.mock()` 可替换，便于集成测试。

## 配置与安全
- 配置校验：`zod` Schema 保证类型与默认值一致；无效配置在首次访问对应段落时抛错。
- 权限控制：
  - 上传路径前缀限制：`shipit.upload.requiredPrefix`。
  - 发布目录白名单：`shipit.release.allowedTargetDirPrefix`。
- 敏感信息：禁止在日志中输出凭证；默认关闭外部库日志。

## 非功能性要求
- 跨平台：Windows 11、主流 Linux（命令与脚本均已验证）。
- 性能：单文件上传目标 < 1GB（由 Provider 能力与网络决定）；列表接口典型响应 < 2s。
- 可维护性：错误统一聚合到 `ShipitError`，命令层统一处理并设置非零退出码。
