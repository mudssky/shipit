import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('ali-oss', () => {
  class MockOSS {
    async get(key: string, file: string) {
      fs.writeFileSync(file, `data:${key}`)
      return { res: { headers: { etag: '"ETAG-123"' } } }
    }
    async head(_: string) {
      return { res: { headers: { etag: '"ETAG-123"' } }, etag: 'ETAG-123' }
    }
  }
  return { default: MockOSS }
})

describe('AliyunOssProvider.download', () => {
  it('下载到本地并返回大小与etag', async () => {
    const { AliyunOssProvider } = await import('@/providers/oss/aliyun')
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-'))
    const target = path.join(tmp, 'a.zip')
    const p = new AliyunOssProvider({ bucket: 'b' })
    const res = await p.download('releases/a.zip', target)
    const st = fs.statSync(target)
    expect(st.size).toBeGreaterThan(0)
    expect(res.bytes).toBe(st.size)
    expect(res.etag).toBeDefined()
    fs.rmSync(tmp, { recursive: true, force: true })
  })
})
