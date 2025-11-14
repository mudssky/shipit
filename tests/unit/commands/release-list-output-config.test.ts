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

describe('release list 输出配置', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('table 配置时使用 console.table', async () => {
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
        release: {
          defaultProvider: 'oss',
          targetDir: '.',
          listLimit: 10,
          listOutputStyle: 'table',
        },
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

  it('默认 tsv 时使用 console.log 输出制表符', async () => {
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
    const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    await (program as any).parseAsync([
      'node',
      'cli',
      'release',
      'list',
      '-p',
      'oss',
    ])
    expect(spyLog).toHaveBeenCalled()
    spyLog.mockRestore()
  })
})
