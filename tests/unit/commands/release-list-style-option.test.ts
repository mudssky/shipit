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

describe('release list --style 选项覆盖输出模式', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('传入 --style table 时使用 console.table', async () => {
    const { program } = await import('@/cli')
    vi.doMock('@/config/shipit', () => {
      const shipitConfig = {
        artifact: {
          defaultPath: './dist/release.zip',
          nameTemplate: 'release-{yyyy}{MM}{dd}{HH}{mm}{ss}.zip',
        },
        providers: {
          oss: { provider: 'aliyun', bucket: 'b', prefix: 'releases/' },
        },
        upload: { defaultProvider: 'oss' },
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
          shell: 'powershell',
        },
      }
      return { shipitConfig, getEffectiveShipitConfig: () => shipitConfig }
    })
    await import('@/commands/release')
    const spyTable = vi.spyOn(console, 'table').mockImplementation(() => {})
    await (program as any).parseAsync([
      'node',
      'cli',
      'release',
      'list',
      '-p',
      'oss',
      '--style',
      'table',
    ])
    expect(spyTable).toHaveBeenCalled()
    spyTable.mockRestore()
  })
})
