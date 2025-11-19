import { describe, expect, it, vi } from 'vitest'

vi.mock('execa', () => ({
  execa: vi.fn(async () => ({ exitCode: 0, stdout: '' })),
}))

vi.mock('@/hooks/executor', () => {
  return { runHooks: vi.fn(async () => {}) }
})

vi.mock('@/config/shipit', () => {
  const shipitConfig = {
    artifact: {
      defaultPath: './dist/release.zip',
      nameTemplate: 'release-{yyyy}{MM}{dd}{HH}{mm}{ss}.zip',
    },
    providers: {
      oss: { provider: 'aliyun', bucket: 'b', prefix: 'releases/' },
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
  }
  return { shipitConfig, getEffectiveShipitConfig: () => shipitConfig }
})

vi.mock('@/providers/oss', () => ({
  createOssProvider: vi.fn(() => ({
    download: vi.fn(async (_key: string, targetPath: string) => {
      const fs = await import('fs')
      fs.writeFileSync(targetPath, 'x')
      return { bytes: 1 }
    }),
  })),
}))

describe('release publish hooks 执行', () => {
  it('默认执行 before/afterRelease', async () => {
    const { program } = await import('@/cli')
    await import('@/commands/release')
    const mod = await import('@/hooks/executor')
    const spy = mod.runHooks as unknown as ReturnType<typeof vi.fn>
    await (program as any).parseAsync([
      'node',
      'cli',
      'release',
      'publish',
      'a.zip',
      '-p',
      'oss',
      '-d',
      '.',
    ])
    const stages = spy.mock.calls.map((c: any) => c[0])
    expect(stages).toContain('beforeRelease')
    expect(stages).toContain('afterRelease')
  })

  it('传入 --no-hooks 时不执行 hooks', async () => {
    const { program } = await import('@/cli')
    await import('@/commands/release')
    const mod = await import('@/hooks/executor')
    const spy = mod.runHooks as unknown as ReturnType<typeof vi.fn>
    spy.mockReset()
    await (program as any).parseAsync([
      'node',
      'cli',
      'release',
      'publish',
      'b.zip',
      '--no-hooks',
      '-p',
      'oss',
      '-d',
      '.',
    ])
    expect(spy).not.toHaveBeenCalled()
  })
})
