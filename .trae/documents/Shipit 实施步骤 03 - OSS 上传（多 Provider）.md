# Shipit 实施步骤 03 - OSS 上传（多 Provider）

## 目标
- 兼容多种 OSS Provider，默认接入 Aliyun OSS，并预留 S3 兼容与预签名直传能力。

## 配置项
- `upload.oss.provider`: `aliyun|s3|custom`。
- `upload.oss.bucket/region/endpoint/prefix`：基础对象参数。

## 实现方案
- 默认（Aliyun OSS）：使用官方 SDK `ali-oss`，支持 `multipartUpload`、STS 临时凭证与内网加速。
- S3 兼容：使用 `@aws-sdk/client-s3` 指向 `https://s3.oss-{region}.aliyuncs.com`，完成常见对象 CRUD 与上传。
- 预签名直传：服务端生成 PUT URL 或 PostPolicy，CLI 以 `axios` 执行上传。

## 抽象约定
- 定义 `OssProvider` 接口：`put(key, file)`, `list(prefix, limit)`, `get(key)`。
- 通过工厂 `createOssProvider(config)` 按 `provider` 选择具体实现。

## 列表行为
- 根据 `prefix` 查询，按 `LastModified` 倒序取前 `n`（默认 10）。

## 安全
- 推荐使用 RAM/STS 临时凭证；严禁在日志或配置中输出永久密钥。

## 参考资料
- 阿里云文档：使用 AWS SDK 访问 OSS（S3 兼容端点）。
- 官方 SDK 仓库：`ali-oss`。

