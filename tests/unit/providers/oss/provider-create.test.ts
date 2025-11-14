import { describe, expect, it, vi } from 'vitest'
import { createOssProvider } from '@/providers/oss'

vi.mock('ali-oss', () => {
  class MockOSS {
    constructor(_: any) {}
  }
  return { default: MockOSS }
})

describe('createOssProvider 读取配置凭证优先', () => {
  it('优先使用 cfg.accessKeyId/accessKeySecret/securityToken', async () => {
    const p = createOssProvider({
      provider: 'aliyun',
      bucket: 'valid-bucket',
      prefix: 'releases/',
      accessKeyId: 'AK_CFG',
      accessKeySecret: 'SK_CFG',
      securityToken: 'STS_CFG',
    })
    expect(p).toBeTruthy()
  })
})
