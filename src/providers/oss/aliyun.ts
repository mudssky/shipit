import OSS from 'ali-oss'
import fs from 'fs'
import type { OssObjectInfo, OssProvider } from './index'

export class AliyunOssProvider implements OssProvider {
  private client: any
  constructor(opts: {
    bucket: string
    region?: string
    endpoint?: string
    accessKeyId?: string
    accessKeySecret?: string
    securityToken?: string
  }) {
    this.client = new OSS({
      bucket: opts.bucket,
      region: opts.region,
      endpoint: opts.endpoint,
      accessKeyId: opts.accessKeyId,
      accessKeySecret: opts.accessKeySecret,
      securityToken: opts.securityToken,
      secure: true,
    })
  }
  async put(key: string, filePath: string): Promise<string | undefined> {
    const result = await this.client.put(key, fs.createReadStream(filePath))
    return result?.url
  }
  async list(prefix: string, limit: number): Promise<OssObjectInfo[]> {
    const res = await this.client.list({ prefix, 'max-keys': limit })
    const objects = res?.objects || []
    return objects.map((o: any) => ({
      key: o.name,
      lastModified: o.lastModified,
    }))
  }
}
