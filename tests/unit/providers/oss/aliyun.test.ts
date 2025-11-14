import { describe, expect, it, vi } from 'vitest'
import { AliyunOssProvider } from '@/providers/oss/aliyun'

vi.mock('ali-oss', () => {
  class MockOSS {
    async put(key: string) {
      return { url: `https://example.com/${key}` }
    }
    async list() {
      return {
        objects: [{ name: 'releases/a.zip', lastModified: '2025-11-14' }],
      }
    }
  }
  return { default: MockOSS }
})

describe('AliyunOssProvider', () => {
  it('put 返回对象 URL', async () => {
    const p = new AliyunOssProvider({ bucket: 'b' })
    const url = await p.put('releases/a.zip', __filename)
    expect(url).toMatch(/releases\/a.zip$/)
  })
  it('list 返回对象列表', async () => {
    const p = new AliyunOssProvider({ bucket: 'b' })
    const items = await p.list('releases/', 10)
    expect(items[0].key).toBe('releases/a.zip')
  })
})
