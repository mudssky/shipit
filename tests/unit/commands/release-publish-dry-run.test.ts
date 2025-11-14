import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/executor', () => {
  return { runHooks: vi.fn(async () => {}) }
})

vi.mock('@/config/shipit', () => ({
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

describe('release publish --dry-run', () => {
  it('dry-run 下传递 dryRun 给 runHooks', async () => {
    const { program } = await import('@/cli')
    await import('@/commands/release')
    const hooksMod = await import('@/hooks/executor')
    const runSpy = hooksMod.runHooks as unknown as ReturnType<typeof vi.fn>
    await (program as any).parseAsync([
      'node',
      'cli',
      'release',
      'publish',
      'a.zip',
      '--dry-run',
      '-p',
      'oss',
      '-d',
      '.',
    ])
    const opt = runSpy.mock.calls[0][2]
    expect(opt?.dryRun).toBe(true)
  })
})
