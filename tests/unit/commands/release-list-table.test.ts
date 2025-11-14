import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/providers/oss', () => {
  return {
    createOssProvider: vi.fn(() => ({
      list: vi.fn(async () => [
        {
          key: 'releases/a.zip',
          lastModified: new Date('2025-01-01T00:00:00Z'),
        },
        { key: 'releases/b.zip', lastModified: '2025-01-02T00:00:00Z' },
      ]),
      put: vi.fn(),
    })),
  }
})

describe('release list 使用 console.table 展示', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('调用 console.table 输出 Key 与 LastModified', async () => {
    const { program } = await import('@/cli')
    vi.doMock('@/config/shipit', () => ({
      shipitConfig: {
        artifact: {
          defaultPath: './dist/release.zip',
          nameTemplate: 'release-{yyyy}{MM}{dd}{HH}{mm}{ss}.zip',
        },
        upload: {
          defaultProvider: 'oss',
          oss: { provider: 'aliyun', bucket: 'b', prefix: 'releases/' },
        },
        release: { defaultProvider: 'oss', targetDir: '.', listLimit: 10 },
        hooks: {
          beforeUpload: [],
          afterUpload: [],
          beforeRelease: [],
          afterRelease: [],
          shell: 'powershell',
        },
      },
    }))
    await import('@/commands/release')
    const spyTable = vi.spyOn(console, 'table').mockImplementation(() => {})
    await (program as any).parseAsync([
      'node',
      'cli',
      'release',
      'list',
      '-p',
      'oss',
    ])
    expect(spyTable).toHaveBeenCalled()
    spyTable.mockRestore()
  })
})
