## 问题定位

* 现状：`config generate` 通过 `__dirname` 上溯 3 层拼出示例文件路径（src/commands/config/index.ts:99–102）。

* 症状：在 Windows + `pnpm link --global` 环境下，`__dirname` 解析导致示例文件被定位到工作区根（如 `C:\home\Projects\frontend\shipit.config.example.ts`），从而 `ENOENT`。

* 文件分布：示例文件已随包发布（package.json:10–15）但未复制到 `dist/`；仅存在于包根。

## 修复方案

* 采用“多候选路径 + 先存在先用”的稳健解析策略，彻底规避 cwd 与打包目录层级差异：

  * 候选1：`path.resolve(__dirname, '../../shipit.config.example.ts')`（运行于 `dist/commands/config`）

  * 候选2：`path.resolve(__dirname, '../../../shipit.config.example.ts')`（运行于 `src/commands/config`）

  * 候选3：`createRequire(import.meta.url).resolve('@mudssky/shipit/shipit.config.example.ts')`（从已安装包解析）

  * 候选4：`path.resolve(process.cwd(), 'node_modules', '@mudssky', 'shipit', 'shipit.config.example.ts')`（最后兜底）

* 取首个 `fs.existsSync` 为真者；全部失败则给出清晰错误与提示（检查全局安装/发布文件）。

* 保持输出行为不变：默认打印到 stdout；指定 `--out` 时以 `process.cwd()` 作为基准写入文件（src/commands/config/index.ts:103–110）。

## 具体改动

* 文件：`src/commands/config/index.ts`

  * 替换 99–102 行为：新增 `resolveExamplePath()` 方法，使用上述候选路径依序探测；读取示例内容改为从 `resolveExamplePath()` 返回的绝对路径读取。

  * 错误处理：在 111–115 行补充失败时提示已探测的路径列表，便于排查全局安装问题。

* 不更改打包配置：`rspack.config.ts` 维持现状；示例文件继续通过 `package.json.files` 发布，不复制到 `dist/`。

## 测试与验证

* 单元测试：新增 `tests/unit/config-generate-path.test.ts`

  * 模拟不同 `__dirname`/cwd 组合，断言 `resolveExamplePath()` 能找到正确路径。

* 集成测试：新增 `tests/integration/config-generate.int.test.ts`

  * 构建后在临时空目录执行 `node dist/index.js config generate`：

    * 无 `--out`：stdout 含示例内容。

    * 有 `--out`：写入指定路径文件，内容与示例一致。

* 本地验证序列：`pnpm qa` → `pnpm build` → 在项目根与任意临时目录分别运行命令，确认无 `ENOENT`。

## 兼容性与注意事项

* Node/CommonJS 环境：通过 `createRequire(import.meta.url)` 使用 `require.resolve`，避免在 CJS 中使用 `import.meta` 读取文件。

* Windows 路径：统一用 `path.resolve`/`path.join`，不硬编码分隔符。

* 安全：仅读写本地文件，无敏感信息输出；保持现有脱敏策略不变。

## 交付结果

* 修复后的命令可在任何目录、含全局安装（`pnpm link --global`/`pnpm i -g`）下稳定生成示例配置，无路径报错。

* 附带单元与集成测试，纳入 `pnpm qa` 流程。

