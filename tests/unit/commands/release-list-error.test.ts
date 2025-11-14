import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('release list 错误处理与日志', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('缺少 oss 配置时输出错误并设置退出码', async () => {
    const { program } = await import('@/cli')
    vi.doMock('@/config/shipit', () => ({
      shipitConfig: {
        artifact: {
          defaultPath: './dist/release.zip',
          nameTemplate: 'release-{yyyy}{MM}{dd}{HH}{mm}{ss}.zip',
        },
        upload: { defaultProvider: 'oss' },
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
    const spyErr = vi.spyOn(console, 'error').mockImplementation(() => {})
    const prevExit = process.exitCode
    await (program as any).parseAsync([
      'node',
      'cli',
      'release',
      'list',
      '-v',
      '-p',
      'oss',
    ])
    expect(spyErr).toHaveBeenCalled()
    spyErr.mockRestore()
    expect(process.exitCode).toBe(1)
    process.exitCode = prevExit ?? 0
  })
})
