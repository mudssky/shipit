# Shipit 发布脚手架详细需求文档

> 文档已按实现步骤拆分为多个子文档，建议优先阅读索引与对应步骤文档：
> - `Shipit 实施步骤 01 - CLI 与配置基础.md`
> - `Shipit 实施步骤 02 - Server 上传.md`
> - `Shipit 实施步骤 03 - OSS 上传（多 Provider）.md`
> - `Shipit 实施步骤 04 - Release 列表与发布.md`
> - `Shipit 实施步骤 05 - 日志与错误处理.md`
> - `Shipit 实施步骤 06 - 安全与权限.md`
> - `Shipit 实施步骤 07 - 测试与验收.md`
> - `Shipit 实施步骤 08 - 可扩展性与架构.md`
> - `Shipit 实施步骤 09 - 交付物与进度索引.md`

## 背景与目标

* 目标：提供一套跨平台（Windows PowerShell / Linux Bash）的项目发布脚手架，用于上传打包产物（zip）并在目标机器执行发布流程，支持可配置的前后置钩子脚本。

* 当前代码架构：采用 Commander 子命令插件化（`src/type/index.ts:6-8`），在主入口中集中注册（`src/index.ts:3-8`），已有 `commit`、`dingmail`、`gitlab` 命令作为参考实现（`src/commands/*`）。

* 要求：先实现“直接上传到服务器”“上传到 OSS”，后续可扩展“ssh/scp 上传”。

## 范围与术语

* 产物：指已打包的 zip 文件。

* 上传：将产物传输至目标存储（服务器本地目录或 OSS 存储桶）。

* 发布：从存储中选择一个产物，解压到指定发布目录，执行钩子脚本。

* OSS：对象存储服务（优先抽象，具体实现可先选 Aliyun OSS 或 S3）。

## 典型使用流程

* 开发机打包生成 zip → 执行 `shipit upload` 上传到指定 Provider（服务器/OSS）。

* 部署机上执行 `shipit release list` 查看近 n 个（默认 10）产物 → `shipit release publish` 选择其一并发布到目标目录（默认当前目录）。

* 发布阶段按配置执行 `beforeRelease`/`afterRelease` 钩子。

## 命令设计

- CLI 名称：`shipit`（不是子命令）
- 顶层命令：`upload`、`release`

  - `shipit upload <file>`：上传指定 zip 产物
    - 选项：`-p, --provider <provider>`（`server|oss|scp`，默认配置决定）
    - 选项：`-n, --name <name>`（重命名产物，默认 `release-YYYYMMDDHHmmss.zip`）
    - 选项：`-i, --interactive`（交互选择 Provider、目标路径等）

  - `shipit release list`：列出近 `n` 个产物
    - 选项：`-p, --provider <provider>`（当使用 OSS 列表更有意义）
    - 选项：`-n, --limit <limit>`（默认 10）
    - 选项：`-i, --interactive`

  - `shipit release publish [name]`：发布指定名称的产物（省略则交互选择）
    - 选项：`-p, --provider <provider>`
    - 选项：`-d, --dir <dir>`（发布目录，默认当前目录）
    - 选项：`--no-hooks`（跳过钩子）
    - 选项：`-i, --interactive`

## 交互与参数规范

* `inquirer` 模式。

* 命令级 `-v, --verbose` 统一支持（参考 `src/commands/dingmail/index.ts:7-11`）。

* 统一数组/数字参数解析工具（参考 `src/utils/argParser.ts:1-6`）。

## 配置规范（cosmiconfig + zod）

* 模块名建议：`shipit`（与现有 `shipit` 解耦，参考现有加载方式 `src/config/index.ts:36-73`）。

* 配置文件：`shipit.config.ts|js`（支持 local 覆盖），也可兼容 `shipit.config.*` 下的 `shipit` 节点。

* 配置结构示例：

```ts
export default {
  artifact: {
    defaultPath: './dist/release.zip',
    nameTemplate: 'release-{yyyy}{MM}{dd}{HH}{mm}{ss}.zip',
  },
  upload: {
    defaultProvider: 'oss',
    server: {
      endpoint: 'http://upload.example.com/api/upload',
      headers: { Authorization: '${UPLOAD_TOKEN}' },
      targetDir: '/var/releases',
    },
    oss: {
      provider: 'aliyun',
      bucket: 'my-bucket',
      region: 'cn-hangzhou',
      endpoint: 'oss-cn-hangzhou.aliyuncs.com',
      prefix: 'releases/',
      // 访问凭证通过 dotenv 注入
    },
    scp: {
      host: '10.0.0.1', port: 22, username: 'deploy',
      destPath: '/var/releases',
    },
  },
  release: {
    defaultProvider: 'oss',
    targetDir: '.',
    listLimit: 10,
  },
  hooks: {
    beforeUpload: [],
    afterUpload: [],
    beforeRelease: ['pwsh -File ./scripts/cleanup.ps1'],
    afterRelease: ['bash -c "./scripts/post_deploy.sh"'],
    shell: process.platform === 'win32' ? 'powershell' : 'bash',
  },
} satisfies ShipitConfig
```

* 使用 `zod` 进行严格校验并输出人类可读错误（参考 `src/config/index.ts:89-107`）。
* 校验策略：按需校验（懒加载）。导出配置通过代理访问，在具体命令执行时访问到相应字段才会触发解析与报错，避免不相关配置导致 CLI 初始化失败。

## 文件命名规范

* 默认格式：`release-YYYYMMDDHHmmss.zip`（精确到秒），可通过 `nameTemplate` 配置。

* 允许命令行 `-n, --name` 覆盖；如冲突（同名已存在）需安全处理（附加自增后缀或拒绝并提示）。

## 钩子脚本执行

* 全局默认 shell：Windows 使用 PowerShell，Linux 使用 Bash（可通过配置覆盖）。

* 钩子执行点：`beforeUpload`、`afterUpload`、`beforeRelease`、`afterRelease`。

* 执行策略：使用 Node `child_process.spawn`，继承标准输出；失败即终止后续步骤并返回非零码；支持 `--no-hooks` 跳过。

## 上传实现要求

* Provider 抽象：

  * `Uploader` 接口：`upload(filePath, options): Promise<UploadResult>`。

  * 实现：`ServerUploader`（HTTP 上传到服务端并落地到 `targetDir`）、`OSSUploader`（SDK/签名直传）、后续 `ScpUploader`。

* 直接上传到服务器：

  * 使用 `axios` 提交 `multipart/form-data`（需新增依赖），服务端需返回文件最终路径/URL。

* 上传到 OSS：

  * 默认实现：Aliyun OSS，采用官方 Node SDK `ali-oss`，支持 `multipartUpload`、STS 临时凭证与内网加速；返回对象 Key 与可访问 URL。
  * 兼容实现：使用 AWS S3 SDK（`@aws-sdk/client-s3`）访问 OSS 的 S3 兼容端点（`https://s3.oss-{region}.aliyuncs.com`），完成常见对象 CRUD 与上传。
  * 轻量直传：服务端生成预签名（PUT URL 或 PostPolicy），CLI 以 `axios` 执行直传，避免在 CLI 中持有永久 AK/SK。
  * 扩展约定：抽象 `OssProvider`/`Uploader` 接口（`put/list/get` 等），按 `upload.oss.provider` 动态选择具体实现，保留后续接入 `qiniu/cos/minio` 能力。

* 断点续传/大文件：第一版可不做；需在规范中预留参数位。

## 发布实现要求

* `list`：

  * Provider 为 OSS：按 `prefix` 查询、按 `LastModified` 倒序取前 `n`（默认 10）。

  * Provider 为 Server：列举 `targetDir` 下 zip 文件。

* `publish`：

  * 下载（OSS → 本地临时目录）或从服务器本地拷贝选中 zip。

  * 执行 `beforeRelease` → 清理旧内容/备份策略（可选）。

  * 解压 zip 到 `targetDir`（默认当前目录）。

  * 执行 `afterRelease` → 重启服务/健康检查（可选）。

## 日志与错误处理

* 统一 `-v, --verbose` 控制详细日志，非 verbose 使用 `ora` 显示进度（依赖已存在）。

* 所有错误需具备清晰的上下文提示与修复建议（参考现有配置错误输出 `src/config/index.ts:95-107`）。

## 安全与权限

* 凭证通过 `.env` 注入（依赖已存在 `dotenv`），严禁日志输出密钥。

* 本地文件路径与发布目录需做白名单/范围校验，避免误删或越权写入。

## 可扩展性与架构

* 复用现有插件化命令注册：

  * 参考 `src/commands/gitlab/index.ts:5-11` 的分组命令，将 `shipit` 作为分组命令，并通过 `register(program)` 模式挂载子命令（契合 `src/type/index.ts:6-8`）。

* 配置服务解耦：将当前 `GlobalEnvConfig` 中与 `dingmail/playwright` 的配置拆分，`shipit` 独立配置与校验，避免跨域耦合。

* Provider 工厂：基于配置 `provider` 动态选择具体上传/列表/下载实现，便于未来接入更多后端。

* 命名策略与钩子执行器独立模块，降低命令体积与责任耦合。

## 非功能性要求

* 跨平台：Windows 11、主流 Linux 发行版；默认 Shell 自动选择。

* 性能：单文件上传 < 1GB 正常可用；列表接口响应 < 2s（视 Provider）。

* 可维护性：模块边界清晰、单一职责；错误信息聚合到统一异常类型。

## 测试与验收

* 单元测试：命名策略、配置校验、钩子执行器（可后续补充）。

* 集成测试：

  * Server 上传 → 发布到本地目录。

  * OSS 上传（Aliyun/S3）→ 列表 → 发布到本地目录。

* 手工验收脚本矩阵：Windows PowerShell、Linux Bash；存在/不存在钩子；`--no-hooks` 跳过；`-i` 交互选择；同名文件冲突处理。

### Vitest 安装与配置说明

- 安装：`pnpm add -D vitest @vitest/coverage-v8`
- 脚本：新增 `"test": "vitest run"`、`"test:watch": "vitest"`，将 `pnpm qa` 扩展为 `pnpm typecheck && pnpm biome:fixAll && pnpm test`
- 配置：在项目根新增 `vitest.config.ts`，最小配置如下（Node 环境与覆盖率阈值）：

```
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
})
```

- 运行：
  - 单次执行：`pnpm test`
  - 监视模式：`pnpm test:watch`
  - 质量序列：`pnpm qa`

### 集成测试实践（CLI）

- 直接运行模式：在测试中导入 `program`（`src/cli.ts:3`），通过 `program.parse(["node", "cli", "shipit", "upload", "./dist/release.zip"])` 注入参数并断言输出与退出码。
- 构建运行模式：`pnpm build` 后以 `node dist/index.js shipit release list -n 5` 执行命令，断言标准输出与退出码。
- 隔离：使用临时目录与文件，测试结束清理；对外部依赖使用 `vi.mock()`。

## 交付物

* `shipit` 命令组及子命令实现。

* `shipit.config.*` 配置示例与 `zod` Schema。

* Provider 抽象与至少两种实现（server、oss）。

* 钩子执行器与命名策略模块。

## 架构改进建议（结合现有代码）

* 命令名称与配置模块统一：CLI 名称为 `shipit`（`src/cli.ts:5-18`），顶层命令为 `upload`（`src/commands/upload/index.ts:1-18`）与 `release`（`src/commands/release/index.ts:1-28`）；配置模块独立为 `shipit`（`src/config/shipit.ts:1-79`），与 `dingmail/gitlab` 解耦。

* 配置分域：`src/config/index.ts` 的 `GlobalEnvConfig` 包含 `playwright/dingmail`，已将发布脚手架配置拆分为独立模块并使用 Zod 校验与 Cosmiconfig 加载，分别导出，减少跨模块强依赖。

* 依赖管理：新增 `axios`（HTTP 上传），后续如实现 OSS SDK 需按 Provider 增加依赖。
  * 多 OSS 支持：默认引入 `ali-oss`；如采用 S3 兼容方式则引入 `@aws-sdk/client-s3`；采用预签名直传无需新增 SDK，复用现有 `axios`。
  * 安全建议：优先使用 RAM/STS 临时凭证；严禁在日志或配置中输出/保存永久密钥。

* 统一日志：抽象 `Logger` 包装 `ora` 与 `console`，在 `-v` 模式输出详细上下文，其余用进度态与简洁提示。

* 错误与退出码：统一异常类型，命令失败返回非零码，方便 CI 集成。

### 已完成（2025-11-14）

* 依赖管理：已新增 `axios` 与 `form-data`，用于 `server` Provider 的 `multipart/form-data` 上传（`package.json`）。
* 统一日志：已新增 `Logger` 模块并在命令接入，`-v/--verbose` 在顶层 CLI 统一支持（`src/utils/logger.ts`、`src/cli.ts`）。
* 错误与退出码：已新增统一异常类型与退出码处理，失败时输出上下文并设置非零退出码（`src/utils/errors.ts`）。
* 上传（server）：已实现服务端上传，读取 `shipit` 配置 `upload.server.endpoint/headers/targetDir`，支持 `${ENV}` 头部占位替换，成功后输出最终文件名（`src/commands/upload/index.ts`）。

使用示例：

* 构建：`pnpm build`
* 上传：`node dist/index.js upload ./dist/release.zip -p server -n release-YYYYMMDDHHmmss.zip`
* 详日志：在命令或顶层添加 `-v`/`--verbose`

***

请确认以上需求文档与约束。当前已完成三项改进（依赖、统一日志、错误与退出码）及 `server` 上传的接入；后续可继续实现 `oss/scp` Provider 与 `release list/publish`。
