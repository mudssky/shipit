## 目标
- 将三类上传介质（server/oss/scp）的连接参数统一移至顶层 `providers.*`，消除 `release` 对 `upload.oss` 的跨命名空间耦合。
- 删除旧的阶段内嵌 Provider 配置（`upload.server/oss/scp` 与顶层 `server`），命令仅通过 `providers.*` 获取凭据与连接信息。
- 保留阶段参数（如 `release.targetDir`、`upload.defaultProvider`），但不再存储连接凭据。

## 配置结构调整（Zod Schema）
- 新增 `ProvidersSchema`：
  - `providers.oss`: 使用现有 `OssUploadSchema`（含 `prefix/requiredPrefix` 变换），字段保持一致。
  - `providers.server`: 合并两处用途，统一字段：`baseUrl?`, `token?`, `endpoint?`, `headers?`, `targetDir?`。
  - `providers.scp`: 使用现有 `ScpUploadSchema`。
- 修改 `UploadSchema`：仅保留 `defaultProvider: 'server' | 'oss' | 'scp'`；删除 `server/oss/scp` 嵌套字段。
- 修改 `ShipitConfigSchema`：
  - 增加必需字段 `providers`（含上述三类可选子对象）。
  - 删除顶层 `server` 字段；所有服务器发布参数合并至 `providers.server`。
- 文件与位置：`src/config/shipit.ts`
  - 更新位置：`UploadSchema`（57-62）、`ServerProviderSchema`（74-77）移除、`ShipitConfigSchema`（100-120）重写结构。

## 命令与 Provider 调用调整
- `src/commands/upload/index.ts`
  - 默认 Provider 仍读取 `shipitConfig.upload.defaultProvider`。
  - OSS 上传：将 `shipitConfig.upload.oss` 改为 `shipitConfig.providers.oss`；Key 生成与 `requiredPrefix` 校验沿用。
  - Server 上传：将 `shipitConfig.upload.server.*` 改为 `shipitConfig.providers.server.endpoint/headers/targetDir`。
  - SCP 上传：将 `shipitConfig.upload.scp` 改为 `shipitConfig.providers.scp`。
  - Hooks：注入 `prefix` 改为 `shipitConfig.providers.oss?.prefix ?? ''`。
- `src/commands/release/index.ts`
  - OSS 列表/下载/发布：全部改为读取 `shipitConfig.providers.oss` 的 `prefix` 与凭据。
  - Server 发布：原本读取顶层 `shipitConfig.server` 改为 `shipitConfig.providers.server.baseUrl/token`。
- `src/providers/oss/index.ts`
  - `createOssProvider` 入口参数改为 `shipitConfig.providers.oss`，其他逻辑不变。

## 测试更新
- 单元测试
  - 更新所有依赖 `shipitConfig.upload.oss/server/scp` 的 mock 与断言，改为 `shipitConfig.providers.*`。
  - 覆盖 `requiredPrefix` 校验、Key 生成、不同 Provider 选择（`upload.defaultProvider` 与 `release.defaultProvider`）。
- 集成测试（CLI）
  - 在 `tests/integration/` 用新配置结构执行上传与发布流程，断言标准输出与退出码。
- 质量脚本
  - 运行 `pnpm typecheck`、`pnpm biome:check`、`pnpm test`、`pnpm build` 验证。

## 破坏性变更说明
- 删除 `upload.server/oss/scp` 与顶层 `server`。
- 新配置示例：
```ts
export default defineConfig({
  providers: {
    oss: {
      provider: 'aliyun',
      bucket: 'my-bucket',
      prefix: 'releases/',
      accessKeyId: '...',
      accessKeySecret: '...'
    },
    server: {
      baseUrl: 'https://release.example.com',
      token: 'xxxxx',
      endpoint: 'https://upload.example.com/api/upload',
      headers: { Authorization: 'Bearer xxxxxx' },
      targetDir: '/var/www/releases'
    },
    scp: {
      host: 'example.com',
      port: 22,
      username: 'deployer',
      destPath: '/var/www/releases'
    }
  },
  upload: { defaultProvider: 'oss' },
  release: { defaultProvider: 'oss', targetDir: '.' }
})
```

## 验证步骤
- 本地跑 `pnpm qa`，确保类型与格式无误，测试全部通过。
- 以 `pnpm build` + `node dist/index.js` 执行 `upload/release` 常见场景：OSS 上传、列表、下载与发布；Server 上传与发布；SCP 上传。

## 风险与回滚
- 主要风险在于命令实现对旧结构的隐式读取；改动需全面覆盖所有引用点。
- 回滚方案：保留 Git 变更点，若出现不可预期问题，临时恢复读取旧字段（本次按需求不保留过渡路径，但回滚可用）。