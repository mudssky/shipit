import { AliyunOssProvider } from './aliyun'

export interface OssObjectInfo {
  key: string
  lastModified?: string
}

export interface OssProvider {
  put(key: string, filePath: string): Promise<string | undefined>
  list(prefix: string, limit: number): Promise<OssObjectInfo[]>
  download(
    key: string,
    targetPath: string,
  ): Promise<{ bytes: number; etag?: string }>
}

export function createOssProvider(cfg: any): OssProvider {
  const provider = cfg?.provider || 'aliyun'
  if (provider === 'aliyun') {
    return new AliyunOssProvider({
      bucket: cfg.bucket,
      region: cfg.region,
      endpoint: cfg.endpoint,
      accessKeyId: cfg.accessKeyId,
      accessKeySecret: cfg.accessKeySecret,
      securityToken: cfg.securityToken,
    })
  }
  throw new Error(`未支持的 OSS Provider: ${provider}`)
}
