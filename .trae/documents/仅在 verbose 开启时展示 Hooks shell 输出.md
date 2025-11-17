## 目标
- 将 Hooks 的 shell 脚本“实时输出”改为仅在 `--verbose` 开启时显示；未开启时不展示脚本过程日志。

## 实现方案
- 修改 `src/commands/release/index.ts`：
  - 两处 `runHooks` 调用（`beforeRelease` 与 `afterRelease`）将 `streamOutput` 改为依赖 verbose：
  - `streamOutput: Boolean(options.verbose || program.opts().verbose)`。
- 保持 `src/hooks/executor.ts` 现有行为：`streamOutput` 默认为关闭，仅在调用方显式开启时流式输出。
- 不改动 `ts/js` Hook 执行方式；仅影响 `shell` 类型的实时输出。

## 代码位置
- `src/commands/release/index.ts:495-505`（beforeRelease）
- `src/commands/release/index.ts:565-575`（afterRelease）

## 验证
- 运行：
  - 无 `--verbose`：执行发布流程，观察不输出脚本过程日志，仅保留开始/完成提示。
  - 加 `--verbose`：脚本过程日志实时打印到终端。
- 执行 `pnpm test`，确认现有用例不受影响。

## 兼容性
- Windows 仍默认用 PowerShell 执行；若为 `.sh`，请使用 `bash ./script.sh` 或改为 `.ps1`。
- `upload` 命令目前不流式输出，符合“只有 verbose 才输出”的原则。