import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('execa', () => ({
  execa: vi.fn(async () => ({ exitCode: 0, stdout: '' })),
}))

vi.mock('@/providers/oss', () => ({
  createOssProvider: vi.fn(() => ({
    download: vi.fn(async (_key: string, targetPath: string) => {
      const fs = await import('fs')
      fs.writeFileSync(targetPath, 'x')
      return { bytes: 1, etag: 'etag123' }
    }),
  })),
}))

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

describe('release publish oss 解压', () => {
  it('下载后调用平台解压命令并输出成功', async () => {
    const { program } = await import('@/cli')
    await import('@/commands/release')
    const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-test-'))
    await (program as any).parseAsync([
      'node',
      'cli',
      'release',
      'publish',
      'a.zip',
      '-p',
      'oss',
      '-d',
      tmpOut,
    ])
    const mod = await import('execa')
    const call = (mod.execa as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]
    expect(call[0]).toBe(
      process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
    )
  })
})
