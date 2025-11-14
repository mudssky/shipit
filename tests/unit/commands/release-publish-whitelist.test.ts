import fs from 'fs'
import os from 'os'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('release publish 目录白名单', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('不在 allowedTargetDirPrefix 下时抛错', async () => {
    const allowed = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-allowed-'))
    const disallowed = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-bad-'))
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
          allowedTargetDirPrefix: allowed,
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
    const spyErr = vi.spyOn(console, 'error').mockImplementation(() => {})
    const prevExit = process.exitCode
    await (program as any).parseAsync([
      'node',
      'cli',
      'release',
      'publish',
      'a.zip',
      '-v',
      '-d',
      disallowed,
      '-p',
      'oss',
    ])
    expect(spyErr).toHaveBeenCalled()
    spyErr.mockRestore()
    expect(process.exitCode).toBe(1)
    process.exitCode = prevExit ?? 0
  })

  it('在 allowedTargetDirPrefix 下时通过', async () => {
    const allowed = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-allowed-'))
    const target = path.join(allowed, 'sub')
    fs.mkdirSync(target)
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
          allowedTargetDirPrefix: allowed,
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
    const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    await (program as any).parseAsync([
      'node',
      'cli',
      'release',
      'publish',
      'a.zip',
      '-v',
      '-d',
      target,
      '-p',
      'oss',
    ])
    expect(spyLog).toHaveBeenCalled()
    spyLog.mockRestore()
  })
})
