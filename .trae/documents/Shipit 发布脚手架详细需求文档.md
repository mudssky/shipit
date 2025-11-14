# Shipit 发布脚手架详细需求文档

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

* 顶层命令组：`shipit`

  * `shipit upload <file>`：上传指定 zip 产物

    * 选项：`-p, --provider <provider>`（`server|oss|scp`，默认配置决定）

    * 选项：`-n, --name <name>`（重命名产物，默认 `release-YYYYMMDDHHmmss.zip`）

    * 选项：`-i, --interactive`（交互选择 Provider、目标路径等）

  * `shipit release list`：列出近 `n` 个产物

    * 选项：`-p, --provider <provider>`（当使用 OSS 列表更有意义）

    * 选项：`-n, --limit <limit>`（默认 10）

    * 选项：`-i, --interactive`

  * `shipit release publish [name]`：发布指定名称的产物（省略则交互选择）

    * 选项：`-p, --provider <provider>`

    * 选项：`-d, --dir <dir>`（发布目录，默认当前目录）

    * 选项：`--no-hooks`（跳过钩子）

    * 选项：`-i, --interactive`

## 交互与参数规范

* 保持与现有交互风格一致（参考 `src/commands/gitlab/merge/action.ts:52-101` 的 `inquirer` 模式）。

* 命令级 `-v, --verbose` 统一支持（参考 `src/commands/dingmail/index.ts:7-11`）。

* 统一数组/数字参数解析工具（参考 `src/utils/argParser.ts:1-6`）。

## 配置规范（cosmiconfig + zod）

* 模块名建议：`shipit`（与现有 `ai-cli` 解耦，参考现有加载方式 `src/config/index.ts:36-73`）。

* 配置文件：`shipit.config.ts|js`（支持 local 覆盖），也可兼容 `ai-cli.config.*` 下的 `shipit` 节点。

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

  * 推荐优先实现 Aliyun OSS 或通用 S3 接口；支持前缀目录（`prefix`）与公共读策略；返回对象 Key 与可访问 URL。

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

## 交付物

* `shipit` 命令组及子命令实现。

* `shipit.config.*` 配置示例与 `zod` Schema。

* Provider 抽象与至少两种实现（server、oss）。

* 钩子执行器与命名策略模块。

## 架构改进建议（结合现有代码）

* 命令名称与配置模块统一：当前 CLI 名称为 `ai-cli`（`src/cli.ts:5-18`），建议将发布功能独立为 `shipit` 命令组或独立 bin，配置模块名改为 `shipit`，避免与 `dingmail/gitlab` 混杂。

* 配置分域：`src/config/index.ts` 的 `GlobalEnvConfig` 包含 `playwright/dingmail`，建议拆分为多模块配置加载器，分别校验并导出，以减少跨模块的强依赖。

* 依赖管理：新增 `axios`（HTTP 上传），后续如实现 OSS SDK 需按 Provider 增加依赖。

* 统一日志：抽象 `Logger` 包装 `ora` 与 `console`，在 `-v` 模式输出详细上下文，其余用进度态与简洁提示。

* 错误与退出码：统一异常类型，命令失败返回非零码，方便 CI 集成。

***

请确认以上需求文档与约束。如果确认，我将按此文档在现有 Commander 插件架构下新增 `shipit` 命令组、配置与 Provider 抽象，并补全依赖与示例配置。
