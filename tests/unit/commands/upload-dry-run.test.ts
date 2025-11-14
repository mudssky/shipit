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

describe('upload --dry-run', () => {
  it('dry-run 下不调用 put，传递 dryRun 给 runHooks', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-'))
    const f = path.join(tmp, 'a.zip')
    fs.writeFileSync(f, 'x')
    const { program } = await import('@/cli')
    await import('@/commands/upload')
    const ossMod = await import('@/providers/oss')
    const hooksMod = await import('@/hooks/executor')
    const putSpy = (ossMod.createOssProvider as any)().put as ReturnType<
      typeof vi.fn
    >
    const runSpy = hooksMod.runHooks as unknown as ReturnType<typeof vi.fn>
    await (program as any).parseAsync([
      'node',
      'cli',
      'upload',
      f,
      '--dry-run',
      '-p',
      'oss',
      '-n',
      'a.zip',
    ])
    expect(putSpy).not.toHaveBeenCalled()
    const opt = runSpy.mock.calls[0][2]
    expect(opt?.dryRun).toBe(true)
  })
})
