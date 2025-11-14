# Shipit 发布脚手架

- 技术栈：Node.js CLI、TypeScript、Commander、Inquirer、Cosmiconfig、Zod、Rspack
- 包管理：`pnpm`

## 安装与构建
- 安装依赖：`pnpm i`
- 开发运行：`pnpm dev`
- 构建：`pnpm build`
- 质量检查：`pnpm qa`（类型检查 → 格式化 → 测试）

## 本地使用
- 直接运行（不依赖命令安装）：`node dist/index.js --help`
- 命令模式（bin，全局链接）：
  - 初始化：`pnpm build && pnpm link --global`
  - 使用：`shipit upload <file>`、`shipit release list`、`shipit release publish`
  - 取消链接：`pnpm unlink --global`
- 在其他项目中使用（本地开发联调）：
  - 在本仓库执行：`pnpm link --global`
  - 在目标项目执行：`pnpm link @mudssky/shipit`，随后可直接运行 `shipit`
- 说明：本包标记为 `private: true`，不发布到 npm，推荐通过 `pnpm link` 在本地以命令形式使用。

## 配置
- 配置文件：`shipit.config.ts|js`
- 示例字段：
  - `artifact.defaultPath`、`artifact.nameTemplate`
  - `upload.defaultProvider`、`upload.server`、`upload.oss`
  - `release.defaultProvider`、`release.targetDir`、`release.listLimit`、`release.listOutputStyle?`、`release.listLargeThreshold`
  - `hooks.beforeUpload/afterUpload/beforeRelease/afterRelease`、`hooks.shell`
- 全局配置（可选）：`TABLE_STYLE?: 'tsv' | 'table'`（从 `@/config` 读取）
- 读取路径优先级：`SHIPIT_CONFIG_DIR` 环境变量 > 项目根目录（如 `c:\home\Projects\frontend\node\shipit`）> 当前工作目录

## 命令
- 上传：`shipit upload <file> [-p server|oss|scp] [-n name] [--no-hooks] [--dry-run]`
- 列表：`shipit release list [-p server|oss] [-n limit] [--style tsv|table] [-i|--no-interactive] [--yes]`
- 发布：`shipit release publish [name] [-p server|oss] [-d dir] [--no-hooks] [--dry-run] [-i|--no-interactive] [--yes]`
- 下载：`shipit release download <name> [-p oss] [-o dir]`
- 配置路径：`shipit config path`
- 配置内容：`shipit config show`

## 输出样式优先级
- `--style` > `shipit.release.listOutputStyle` > `global.TABLE_STYLE` > `'tsv'`

## 交互式体验
- 自动条件：TTY 且非 CI；显式 `-i/--interactive` 强制启用，`--no-interactive` 禁用
- 发布确认：`--yes` 默认同意；目录校验支持 `allowedTargetDirPrefix`
- Hooks 概览：仅显示类型与数量；`--verbose` 显示脚本明细

## 发布（OSS）解压与回退
- Windows：PowerShell `Expand-Archive`，失败回退 `tar -xf`
- Linux/mac：`unzip`，缺失回退 `7z`
- 错误分类：
  - `解压失败: 文件不存在`
  - `解压失败: 平台命令不可用或执行失败`
  - `解压失败: 缺少 unzip/7z 或执行失败`

## 使用示例
- 构建并查看列表（全局样式）：
  - `pnpm build && node dist/index.js release list -p oss`
- 上传到服务器并命名：
  - `node dist/index.js upload ./dist/release.zip -p server -n release-YYYYMMDDHHmmss.zip`
- 交互式发布到服务器：
  - `node dist/index.js release publish -p server -i --yes --no-hooks`

## 测试
- 运行：`pnpm test`
- 覆盖率：`@vitest/coverage-v8`（文本与 HTML）
