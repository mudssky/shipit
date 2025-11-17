**问题诊断**

* 校验误触发：`release list` 在读取表格样式时动态导入 `@/config`，触发全局配置强校验，因未配置 IMAP 字段而打印错误日志。位置 `src/commands/release/index.ts:726-734` 调用 `readGlobalTableStyle()`；强校验定义于 `src/config/index.ts:7-12`。

* 发布未见下载文件：`release list` 的“发布”分支（OSS）将 ZIP 下载到临时目录，随后解压到目标目录，并删除临时 ZIP，不会在目标目录保留 ZIP。位置 `src/commands/release/index.ts:164-225`。

* Hooks 未执行：`release list` 的“发布”流程未调用 `runHooks`，而 `release publish` 会在前后调用 Hooks。Hooks 执行器见 `src/hooks/executor.ts:111-159`；`release publish` 执行 Hooks 位置见 `src/commands/release/index.ts:495-509`、`569-577`。

**改动方案**

* 放宽全局配置校验（仅钉邮功能使用时要求）：

  * 将 IMAP 相关字段改为可选：`src/config/index.ts:8-12` 的 `DING_IMAP_HOST/PORT/USER/PASS` 与 `SHOW_MAIL_NUMBER` 改为 `z.string().optional()`/`z.number().optional()`。

  * 在钉邮使用点做显式校验并给出友好错误：`src/utils/email.ts:10-19` 前加入必填检查，缺失时抛出 `ShipitError('缺少钉邮 IMAP 配置')`。

  * 保持 `TABLE_STYLE` 可选；`readGlobalTableStyle()` 已带 try/catch，无配置时返回 `undefined`。

* 完善 `release list` 的发布行为：

  * 统一执行 Hooks：在列表交互的“发布”分支中，按 `release publish` 的同样时机插入 `runHooks('beforeRelease', ...)` 与 `runHooks('afterRelease', ...)`，上下文包含 `provider/targetDir/artifactName`，输出遵循 `--verbose` 与 `--dry-run`。修改位置：

    * OSS 分支发布：`src/commands/release/index.ts:164-225`（插入两次 `runHooks`）。

    * Server 分支发布：`src/commands/release/index.ts:282-320`（发布前后插入）。

  * 增加选项一致性：为 `release list` 增加 `-H, --no-hooks` 以对齐 `release publish`（定义处 `src/commands/release/index.ts:27-63`）。

  * 可选保留 ZIP：新增 `--keep-zip`（布尔）与配置 `release.keepZipOnPublish?: boolean`（默认 false）。当启用时将 ZIP 保存到 `targetDir`，并在解压后保留。涉及：

    * 配置 Schema 扩展：`src/config/shipit.ts:64-71` 的 `ReleaseSchema` 增加 `keepZipOnPublish`，默认 `false`。

    * 发布实现：在 OSS 分支发布中判断 `options.keepZip` 或 `shipitConfig.release.keepZipOnPublish`，将下载路径从 `tmpDir`改为 `targetDir`，或在解压后将 `tmpFile` 移动到 `targetDir`。

**验证步骤**

* 运行 `pnpm dev release list -v`：

  * 不再打印 IMAP 校验错误；表格样式正常。

  * 选择“发布”，观察 `beforeRelease.ps1` 与 `afterRelease.ps1` 的输出（脚本内容包含 `pwd` 与 `echo`），在 `-v` 时通过 `streamOutput`直出到终端。

* 钉邮命令：

  * `pnpm dev dingmail showMails -n 5` 在未配置 IMAP 时给出清晰错误提示；配置后正常显示邮件。

* ZIP 保留验证：

  * `pnpm dev release list --keep-zip` 选择发布后，确认目标目录同时存在解压内容与原始 ZIP。

**影响与兼容性**

* 放宽校验仅影响日志噪音，钉邮功能通过局部必填检查保障稳健性。

* Hooks 行为与 `release publish` 对齐，增强一致性；新增 `--no-hooks` 保持可控。

* ZIP 保留为可选，不改变既有默认行为。

**文件改动一览（参考定位）**

* `src/config/index.ts:8-12`（Zod Schema 可选化）

* `src/utils/email.ts:10-19`（钉邮配置必填检查）

* `src/commands/release/index.ts:27-63`（list 命令新增 `--no-hooks`）

* \`src/

