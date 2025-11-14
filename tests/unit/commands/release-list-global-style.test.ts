import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/providers/oss', () => {
  return {
    createOssProvider: vi.fn(() => ({
      list: vi.fn(async () => [
        { key: 'releases/a.zip', lastModified: '2025-01-01T00:00:00Z' },
      ]),
      put: vi.fn(),
    })),
  }
})

describe('release list 全局 TABLE_STYLE 回退', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('当未设置 release.listOutputStyle 且无 --style 时，采用 GlobalEnv.TABLE_STYLE', async () => {
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
    vi.doMock('@/config', () => ({
      globalConfig: { TABLE_STYLE: 'table' },
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
