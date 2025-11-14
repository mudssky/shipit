# Shipit 实施步骤 02 - Server 上传

## 目标
- 实现将本地 zip 产物以 `multipart/form-data` 上传到服务端，服务端落地到 `targetDir`。

## 配置项
- `upload.server.endpoint`: 上传接口地址。
- `upload.server.headers`: 请求头（支持 `${ENV}` 占位替换）。
- `upload.server.targetDir`: 服务端落地目录。

## 实现要点
- 依赖：`axios` + `form-data`。
- 表单字段：`file`（流，文件名为最终名称）、`targetDir`。
- 头部处理：合并 `form.getHeaders()` 与配置头部，并将 `${ENV}` 以 `process.env` 替换。
- 返回解析：从响应中取 `path/url/target` 用于提示最终文件名。

## 名称策略
- 使用模板 `release-{yyyy}{MM}{dd}{HH}{mm}{ss}.zip` 生成默认名；允许 `-n` 覆盖。

## 日志与失败
- 非 verbose：进度态 `start/succeed/fail`；verbose：输出详细文本。
- 失败时统一设置非零退出码并打印错误信息。

## 参考实现
- `src/commands/upload/index.ts` 中 `serverUpload` 与名称/头部处理函数。

