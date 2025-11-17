## 目标
- 在执行 `release publish` 的 `beforeRelease` / `afterRelease` Hooks（shell 类型）时，实时展示脚本的标准输出与标准错误，便于排查与观察执行过程。

## 实现思路
- 仅对 `shell` 类型 Hook 开启“流式输出”，`ts/js` 类型仍保持当前机制（通过 `stdout` 返回 JSON 决定 `updates`），避免破坏现有语义。
- 通过 `execa` 的 `stdio: 'inherit'` 配置，将子进程的输出直接继承主进程终端；同时关闭缓冲（`buffer: false`）。
- 增加可控开关，默认只在发布命令中开启；如需更细控制，可后续扩展 CLI 选项。

## 代码修改
1. 修改 `src/hooks/executor.ts`
- 为 `RunOptions` 增加 `streamOutput?: boolean` 开关。
- 为 `runShell` 增加 `streamOutput` 形参；当为 `true` 时使用 `{ stdio: 'inherit', buffer: false }`，否则沿用当前缓冲模式。
- 在 `runHooks` 中调用 `runShell` 时，将 `options.streamOutput` 传递下去。

2. 修改 `src/commands/release/index.ts`
- 在两次调用 `runHooks`（`beforeRelease` 与 `afterRelease`）处，传入 `{ logger, dryRun: Boolean(options.dryRun), streamOutput: true }`，确保发布流程的 shell 脚本日志实时输出。
- 可选优化：当 `--verbose` 时启用 `streamOutput: true`；否则默认也启用，以便所有用户都能看到脚本过程日志。

## 兼容性与影响
- `ts/js` Hook 不受影响，仍通过 `stdout` JSON 返回结果。
- 现有测试未断言 `execa` 选项细节，改动通常不破坏测试；若有个别测试对缓冲行为敏感，按需调整 mock。
- `ora` spinner 在流式输出下可能出现行重绘，保持现有 `start/succeed` 提示即可；如后续需要更好观感，可在流式模式下改用 `logger.log('info', ...)` 替代 spinner。

## 验证步骤
1. 执行 `pnpm qa` 与 `pnpm build`，确保类型与测试正常。
2. 运行：`shipit release publish artifact.zip -p oss -d ./releases`。
- 观察终端出现：
  - `准备执行 beforeRelease Hooks …`
  - shell 脚本的实际输出（实时）。
  - `beforeRelease Hooks 执行完成（共 N 条）`
3. Windows 下脚本为 PowerShell 时同样实时输出；若为 `.sh`，请按需改为 `bash ./scripts/xxx.sh` 或使用 PowerShell 脚本。

## 备选方案（如不希望改动 API）
- 直接在 `runShell` 中默认使用 `stdio: 'inherit'`（不引入 `streamOutput` 开关）。缺点是所有 shell Hooks 都实时输出，不可配置。

## 参考代码位置
- Hooks 执行器：`src/hooks/executor.ts:102-151`
- 发布命令调用 Hooks：`src/commands/release/index.ts:495-505`、`src/commands/release/index.ts:565-575`

请确认是否按上述方案实现（默认为发布命令开启实时输出）。