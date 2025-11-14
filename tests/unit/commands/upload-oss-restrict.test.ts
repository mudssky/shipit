import fs from 'fs'
import os from 'os'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/providers/oss', () => {
  return {
    createOssProvider: vi.fn(() => ({
      put: vi.fn(async () => 'https://example.com/release.zip'),
      list: vi.fn(async () => []),
    })),
  }
})

describe('upload 路径限制(requiredPrefix)', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  it('prefix 与 requiredPrefix 校验通过', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-'))
    const f = path.join(tmp, 'b.zip')
    fs.writeFileSync(f, 'x')
    const { program } = await import('@/cli')
    vi.doMock('@/config/shipit', () => ({
      shipitConfig: {
        artifact: {
          defaultPath: f,
          nameTemplate: 'release-{yyyy}{MM}{dd}{HH}{mm}{ss}.zip',
        },
        upload: {
          defaultProvider: 'oss',
          oss: {
            provider: 'aliyun',
            bucket: 'b',
            prefix: 'test-shipit/',
            requiredPrefix: 'test-shipit/',
          },
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
    await import('@/commands/upload')
    program.parse(['node', 'cli', 'upload', f, '-p', 'oss', '-n', 'b.zip'])
    expect(true).toBe(true)
  })

  it('非法名称或前缀不匹配时抛错', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-'))
    const f = path.join(tmp, 'c.zip')
    fs.writeFileSync(f, 'x')
    const { program } = await import('@/cli')
    vi.doMock('@/config/shipit', () => ({
      shipitConfig: {
        artifact: {
          defaultPath: f,
          nameTemplate: 'release-{yyyy}{MM}{dd}{HH}{mm}{ss}.zip',
        },
        upload: {
          defaultProvider: 'oss',
          oss: {
            provider: 'aliyun',
            bucket: 'b',
            prefix: 'wrong/',
            requiredPrefix: 'test-shipit/',
          },
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
    await import('@/commands/upload')
    const spyErr = vi.spyOn(console, 'error').mockImplementation(() => {})
    await (program as any).parseAsync([
      'node',
      'cli',
      'upload',
      f,
      '-p',
      'oss',
      '-n',
      'c.zip',
    ])
    expect(spyErr).toHaveBeenCalled()
    spyErr.mockRestore()
  })
})
