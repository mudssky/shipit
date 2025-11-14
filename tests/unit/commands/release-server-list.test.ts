import { describe, expect, it, vi } from 'vitest'
import { program } from '@/cli'
import { Logger } from '@/utils/logger'
import '@/commands/release/index.ts'

vi.mock('@/providers/server', () => {
  return {
    createServerProvider: () => ({
      list: vi.fn(async () => [
        { key: 'a.zip', lastModified: '2025-01-01T00:00:00Z' },
      ]),
    }),
  }
})

// 使用默认配置代理，注入 server 配置
vi.mock('@/config/shipit', () => {
  return {
    shipitConfig: {
      upload: { oss: { prefix: 'releases/' } },
      release: {
        defaultProvider: 'oss',
        targetDir: '.',
        listLimit: 10,
        listOutputStyle: 'tsv',
      },
      hooks: {
        beforeUpload: [],
        afterUpload: [],
        beforeRelease: [],
        afterRelease: [],
        shell: 'bash',
      },
      server: { baseUrl: 'https://api.example.com' },
    },
  }
})

describe('release list with server provider', () => {
  it('renders table rows', async () => {
    const spy = vi.spyOn(Logger.prototype, 'renderTable')
    await (program as any).parseAsync([
      'node',
      'cli',
      'release',
      'list',
      '-p',
      'server',
    ])
    expect(spy).toHaveBeenCalled()
  })
})
