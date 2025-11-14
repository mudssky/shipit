# Shipit 实施步骤 04 - Release 列表与发布

## 目标
- 完成 `shipit release list` 与 `shipit release publish [name]`。

## 列表（list）
- OSS：按 `prefix` 查询，按 `LastModified` 倒序，取前 `n`（默认 10）。
- Server：列举 `targetDir` 下的 zip 文件。
- 输出展示（可配置）：
  - 样式优先级链：`--style > shipit.release.listOutputStyle > global.TABLE_STYLE > 'tsv'`。
  - `'tsv'`：使用制表符分隔输出，便于脚本消费与复制；示例行格式：`Key\tLastModified`。
  - `'table'`：使用 `console.table` 渲染表格，便于人类阅读。
  - 进度提示与表格渲染顺序：先结束进度（`succeed`），再输出列表，避免进度态影响表格布局。
  - 命令行覆盖：`shipit release list --style table|tsv` 可临时覆盖配置项。

## 发布（publish）
- 下载（OSS → 本地临时目录）或从 Server 本地拷贝选中的 zip。
- 执行 `beforeRelease` 钩子 → 解压到 `targetDir` → 执行 `afterRelease` 钩子。
- 支持 `--no-hooks` 跳过钩子。
- 解压实现：通过 `execa` 调用平台命令，Windows 使用 PowerShell `Expand-Archive`，Linux 使用 `unzip`。

## 故障分类与回退
- 错误分类：
  - `解压失败: 文件不存在`（下载后文件未生成或被删除）
  - `解压失败: 平台命令不可用或执行失败`（Windows 下 `Expand-Archive/tar` 执行异常）
  - `解压失败: 缺少 unzip/7z 或执行失败`（Linux/macOS 下 `unzip/7z` 缺失或执行异常）
- 回退策略：
  - Windows：先尝试 `Expand-Archive`，失败回退 `tar -xf`
  - Linux/mac：先尝试 `unzip`，缺失回退 `7z`

## 失败与退出码
- 任一步骤失败即终止并返回非零退出码。

## 参考流程
- 交互选择名称或以参数明示；校验目标目录白名单；继承标准输出。
 - 列表输出遵循 `release.listOutputStyle`；可在 `shipit.config.*` 中设置，示例：
   ```ts
   export default {
     release: {
       defaultProvider: 'oss',
       targetDir: '.',
       listLimit: 10,
       listOutputStyle: 'tsv',
     },
   }
   ```
