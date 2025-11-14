# Shipit 实施步骤 12 - Provider 下载与校验

## 目标
- 为 OSS Provider 增加 `download(key, targetPath)`，支持本地校验（大小/ETag），并提供命令入口。

## 技术实现
- 接口扩展：`OssProvider` 增加 `download(key: string, targetPath: string): Promise<{ bytes: number, etag?: string }>`。
- Aliyun 实现：
  - 使用 `client.get(key)` 或流式下载到 `fs.createWriteStream(targetPath)`。
  - 完成后校验字节数与可选 `etag`。
- 新增命令：`release download <name>`
  - 选项：`-p/--provider`、`-o/--output <dir>`、`--verbose`
  - 日志：开始/成功/失败；错误统一为 `ShipitError`。

## 测试
- 使用 `vi.mock('ali-oss')` 模拟返回；断言写入与校验逻辑。
- 命令层：输入合法性、输出路径创建与覆盖策略。
