# Shipit 实施步骤 10 - 发布 Hooks 执行器

## 目标
- 在上传与发布阶段按配置顺序执行 `before/after` hooks，支持 `--no-hooks` 跳过；统一日志与错误处理，确保跨平台与安全。

## 配置
- `shipit.config.*`：`hooks` 字段包含：
  - `beforeUpload`、`afterUpload`、`beforeRelease`、`afterRelease`: `string | string[]`
  - `shell`: 可选，自定义 shell（默认使用系统默认 shell）

-## 技术实现
- 新增模块：`src/hooks/executor.ts`
  - `runHooks(stage, ctx, options)`：按阶段执行命令（数组顺序），逐条捕获 `stdout/stderr`，失败抛 `ShipitError`。
  - `stage`: `'beforeUpload' | 'afterUpload' | 'beforeRelease' | 'afterRelease'`
  - `ctx`: 注入上下文（如 `artifact/name/targetDir/provider`），以环境变量形式传递给子进程或脚本。
  - `options`: `{ shell?: 'bash'|'powershell', logger: Logger }`
  - 执行类型：
    - `shell`：按 `options.shell` 或平台默认选择 `bash`（Linux/macOS）/`powershell`（Windows）。
    - `js/ts`：统一通过 `tsx` 运行 `.js`/`.ts` 脚本（脚本需导出 `async function run(ctx)`）。
- 命令集成：
  - `upload`：在主要动作前后调用 `runHooks('beforeUpload'/'afterUpload', ...)`。
  - `release publish`：在发布前后调用 `runHooks('beforeRelease'/'afterRelease', ...)`。
  - `--no-hooks`：跳过所有 hooks 执行。
- 日志与错误：使用 `Logger.start/succeed/fail` 输出阶段与命令；失败统一 `ShipitError` 并设置非零退出码。

## Hooks 类型与执行
- 支持类型：`bash`、`powershell`、`js/ts`。
- Shell 执行：
  - Windows 默认使用 `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "<cmd>"`。
  - Linux/macOS 默认使用 `/bin/bash -lc "<cmd>"`（不可用时回退 `/bin/sh`）。
  - 可通过配置 `hooks.shell: 'bash' | 'powershell'` 强制选择。
- JS/TS 执行（统一 tsx）：
  - `.js` 与 `.ts` 脚本统一通过 `tsx` 运行，脚本需导出 `async function run(ctx)`；跨平台一致，避免区分 JS/TS 运行器。

### 选择规则
- 当 hook 为字符串：
  - 以 `.js`/`.ts` 结尾 → 通过 `tsx` 运行。
  - 其它情况 → 作为 Shell 命令执行（按平台默认或 `hooks.shell` 指定）。
- 当 hook 为对象形态（可选扩展）：`{ type: 'shell'|'js'|'ts', value: '...' }` → 按 `type` 明确选择执行方式，`js/ts` 始终走 `tsx`。
- 失败与回退：无法启动指定执行器或脚本导出不符合约定时，抛 `ShipitError` 并终止阶段。

## 执行器与引擎选择
- 默认执行器：`tsx`。统一以 `tsx` 运行 `.js/.ts` hooks，避免区分 JS/TS。
- 回退策略：
  - `tsx` 不可用时，JS 走 Node 动态导入；TS 要求使用构建产物（或 Node ≥ 22 开启实验性 TypeScript 支持）。
  - Node 版本建议：≥ 18；如启用 Node ≥ 22 的 TypeScript 实验特性，请在项目配置中明确说明并在 CI 环境安装对应版本。

## Execa 集成与最小示例
- 内部实现：执行器使用 `execa` 统一管理子进程（Shell 与 JS/TS），传入 `cwd/env/timeout` 并按退出码与输出进行处理。
- 脚本可用性：项目已安装 `execa`，hooks 脚本内可直接 `import { execa } from 'execa'` 使用（建议加 `preferLocal: true`）。
- 最小 JS/TS hooks 示例（生成上下文更新）：
  - 文件：`hooks/beforeRelease.ts`
  - 内容：
    - `export async function run(ctx) {`
    - `  const { stdout } = await (await import('execa')).execa({ preferLocal: true })\`git rev-parse HEAD\``
    - `  console.log(JSON.stringify({ updates: { commit: stdout } }))`
    - `}`
- 最小 Shell hooks 示例：
  - `hooks.beforeRelease: ['echo Building']`
  - 平台：Windows 默认 `powershell`，Linux/macOS 默认 `bash`。

## 模块导出约定
- 统一命名导出：`export async function run(ctx): Promise<HookResult>`。
- 返回值结构（用于结果传递）：
  - `type HookResult = { updates?: Record<string, any>, artifacts?: string[], message?: string }`
  - 若返回 `updates`，将合并到当前命令上下文并传递给后续同命令阶段的 hooks。
- 禁止默认导出，避免加载歧义。

## 上下文与环境变量
- 环境变量前缀：统一使用 `SHIPIT_*`。
- 建议映射：
  - `SHIPIT_PROVIDER`、`SHIPIT_ARTIFACT_NAME`、`SHIPIT_TARGET_DIR`、`SHIPIT_PREFIX`
  - 复杂上下文：`SHIPIT_CTX_JSON`（JSON 字符串，包含全部 `ctx`）。
- 运行目录与路径：
  - 默认在命令执行时的 `cwd` 运行，可通过配置 `workingDir` 指定。
  - 路径统一转为绝对路径，并做分隔符归一（Windows 与 POSIX 统一）。

## Shell 引号与转义
- 跨平台安全转义规则：
  - PowerShell：优先使用双引号，内部引号与特殊字符按 PowerShell 规则转义（如 ``\"`` 或反引号）。
  - Bash：使用单/双引号组合并对 `$`、`"`、空格等做转义；通过 `-lc` 保证在登录 shell 环境执行。
- 实现层面提供统一的转义工具并避免拼接注入；日志仅输出命令名与简短结果。

## 并发与顺序
- 同阶段 hooks 串行执行、失败即停；不启用并发以保证幂等与可控风险。
- 命令行集成 `--dry-run`：在 `upload` 与 `release publish` 中启用，仅打印将执行的 hooks 与上下文，不实际运行主流程与子进程，便于排查与审阅。

## 结果传递与后续流程
- JS/TS hooks 的 `run(ctx)` 返回 `updates` 将合并到上下文并传递给后续 hooks；可用于生成工件路径或附加标记。
- Shell hooks默认不解析输出为结构化结果；如需传递，建议改用 JS/TS hooks。

## 配置 Schema 扩展
- 在保持现有 `string | string[]` 的基础上，支持对象形态：
  - `{ type: 'shell'|'js'|'ts', value: string, engine?: 'tsx'|'node', shell?: 'bash'|'powershell', workingDir?: string, timeoutMs?: number }`
- 优先级：对象形态 > 扩展名推断 > 平台默认。

## 错误分类与处理
- 分类建议：
  - `HookExitError`：子进程非零退出码。
  - `HookTimeoutError`：超过 `timeoutMs`。
  - `HookEngineNotFoundError`：指定执行器不可用。
- 命令层统一捕获为 `ShipitError` 并设置非零退出码，日志输出精简信息。

## 超时与重试
- 默认启用超时（如 `timeoutMs = 60000`）；暂不启用重试以避免副作用。

## 安全策略
- 不打印敏感信息与环境变量内容；输出做中间截断与长度限制。
- 仅记录命令名、阶段与简短结果；失败日志包含错误分类与建议。

## 测试
- 单元：
  - `executor` 在命令链中执行顺序正确；遇到非零退出码抛错。
  - 环境变量注入与 `shell` 覆盖生效。
- 集成：
  - `upload` 与 `release publish` 在 hooks 开启与关闭（`--no-hooks`）下的行为断言。
  - 使用 `vi.mock()` 模拟子进程，避免真实执行。

## 脚本环境中的 execa 注入
- 不需要额外注入：hooks 脚本直接 `import { execa } from 'execa'` 即可使用（依赖来源于项目）。
- 统一配置建议：脚本内部可创建带共享选项的实例（例如设置默认 `timeout` 或 `preferLocal`），提升一致性与稳定性。

## 安全
- 关闭敏感信息日志；仅在必要时输出命令名与简短结果。
- 支持超时与最大输出长度限制（可在后续扩展）。
