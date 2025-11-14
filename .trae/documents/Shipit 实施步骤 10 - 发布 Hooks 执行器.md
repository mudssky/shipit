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

## 测试
- 单元：
  - `executor` 在命令链中执行顺序正确；遇到非零退出码抛错。
  - 环境变量注入与 `shell` 覆盖生效。
- 集成：
  - `upload` 与 `release publish` 在 hooks 开启与关闭（`--no-hooks`）下的行为断言。
  - 使用 `vi.mock()` 模拟子进程，避免真实执行。

## 安全
- 关闭敏感信息日志；仅在必要时输出命令名与简短结果。
- 支持超时与最大输出长度限制（可在后续扩展）。
