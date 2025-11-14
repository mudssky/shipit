import { describe, expect, it, vi } from 'vitest'

describe('hooks executor - shell命令执行', () => {
  it('执行 echo 命令不抛错', async () => {
    const cmd =
      process.platform === 'win32' ? 'echo HookShellOK' : 'echo "HookShellOK"'
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
          beforeRelease: [cmd],
          afterRelease: [],
          shell: process.platform === 'win32' ? 'powershell' : 'bash',
        },
      },
    }))
    const { runHooks } = await import('@/hooks/executor')
    const { Logger } = await import('@/utils/logger')
    const logger = new Logger(false)
    await runHooks('beforeRelease', {}, { logger })
    expect(true).toBe(true)
  })
})
