import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/executor', () => {
  return { runHooks: vi.fn(async () => {}) }
})

vi.mock('@/providers/oss', () => {
  return {
    createOssProvider: vi.fn(() => ({
      put: vi.fn(async () => 'https://example.com/release.zip'),
      list: vi.fn(async () => []),
    })),
  }
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

describe('upload hooks 执行', () => {
  it('默认执行 before/afterUpload', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-'))
    const f = path.join(tmp, 'a.zip')
    fs.writeFileSync(f, 'x')
    const { program } = await import('@/cli')
    await import('@/commands/upload')
    const mod = await import('@/hooks/executor')
    const spy = mod.runHooks as unknown as ReturnType<typeof vi.fn>
    await (program as any).parseAsync([
      'node',
      'cli',
      'upload',
      f,
      '-p',
      'oss',
      '-n',
      'a.zip',
    ])
    expect(spy).toHaveBeenCalled()
    const stages = spy.mock.calls.map((c: any) => c[0])
    expect(stages).toContain('beforeUpload')
    expect(stages).toContain('afterUpload')
  })

  it('传入 --no-hooks 时不执行 hooks', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-'))
    const f = path.join(tmp, 'b.zip')
    fs.writeFileSync(f, 'y')
    const { program } = await import('@/cli')
    await import('@/commands/upload')
    const mod = await import('@/hooks/executor')
    const spy = mod.runHooks as unknown as ReturnType<typeof vi.fn>
    spy.mockReset()
    await (program as any).parseAsync([
      'node',
      'cli',
      'upload',
      f,
      '--no-hooks',
      '-p',
      'oss',
      '-n',
      'b.zip',
    ])
    expect(spy).not.toHaveBeenCalled()
  })
})
