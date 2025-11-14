# Shipit 实施步骤 04 - Release 列表与发布

## 目标
- 完成 `shipit release list` 与 `shipit release publish [name]`。

## 列表（list）
- OSS：按 `prefix` 查询，按 `LastModified` 倒序，取前 `n`（默认 10）。
- Server：列举 `targetDir` 下的 zip 文件。
- 输出展示（可配置）：
  - 全局配置项：`release.listOutputStyle: 'tsv' | 'table'`，默认 `'tsv'`。
  - `'tsv'`：使用制表符分隔输出，便于脚本消费与复制；示例行格式：`Key\tLastModified`。
  - `'table'`：使用 `console.table` 渲染表格，便于人类阅读。
  - 进度提示与表格渲染顺序：先结束进度（`succeed`），再输出列表，避免进度态影响表格布局。

## 发布（publish）
- 下载（OSS → 本地临时目录）或从 Server 本地拷贝选中的 zip。
- 执行 `beforeRelease` 钩子 → 解压到 `targetDir` → 执行 `afterRelease` 钩子。
- 支持 `--no-hooks` 跳过钩子。

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
