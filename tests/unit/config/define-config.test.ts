import { describe, expect, it } from 'vitest'
import { defineConfig } from '@/config/shipit'

describe('defineConfig 类型提示与透传', () => {
  it('返回原始对象用于后续校验与加载', () => {
    const cfg = defineConfig({
      upload: {
        defaultProvider: 'server',
        server: { endpoint: 'http://localhost/upload', targetDir: 'releases' },
      },
    })
    expect(cfg.upload?.defaultProvider).toBe('server')
  })
})
