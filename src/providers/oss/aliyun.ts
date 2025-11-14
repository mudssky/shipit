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
  async download(
    key: string,
    targetPath: string,
  ): Promise<{ bytes: number; etag?: string }> {
    await this.client.get(key, targetPath)
    const st = fs.statSync(targetPath)
    let etag: string | undefined
    try {
      const head = await this.client.head(key)
      const raw = head?.res?.headers?.etag || head?.etag
      if (raw) etag = String(raw).replace(/\"/g, '').replace(/"/g, '')
    } catch {}
    return { bytes: st.size, etag }
  }
}
