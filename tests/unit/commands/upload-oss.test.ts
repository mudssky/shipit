import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/providers/oss', () => {
  return {
    createOssProvider: vi.fn(() => ({
      put: vi.fn(async () => 'https://example.com/release.zip'),
      list: vi.fn(async () => []),
    })),
  }
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

describe('upload 命令 - OSS Provider', () => {
  it('调用 OSS put 并输出成功', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-'))
    const f = path.join(tmp, 'a.zip')
    fs.writeFileSync(f, 'x')
    const { program } = await import('@/cli')
    await import('@/commands/upload')
    let called = false
    const mod = await import('@/providers/oss')
    ;(mod.createOssProvider as any).mockImplementation(() => ({
      put: vi.fn(async () => {
        called = true
        return 'https://example.com/release.zip'
      }),
      list: vi.fn(async () => []),
    }))
    program.parse(['node', 'cli', 'upload', f, '-p', 'oss', '-n', 'a.zip'])
    expect(called).toBe(true)
  })
})
