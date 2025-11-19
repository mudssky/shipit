import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/providers/oss', () => {
  return {
    createOssProvider: vi.fn(() => ({
      async download(key: string, filePath: string) {
        fs.writeFileSync(filePath, `downloaded:${key}`)
        const st = fs.statSync(filePath)
        return { bytes: st.size, etag: 'ETAG-XYZ' }
      },
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
    release: {
      defaultProvider: 'oss',
      targetDir: '.',
      listLimit: 10,
      allowedTargetDirPrefix: '',
      listOutputStyle: 'table',
    },
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

describe('release download 子命令', () => {
  it('创建输出目录并下载文件', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-'))
    const outDir = path.join(tmp, 'out')
    const { program } = await import('@/cli')
    await import('@/commands/release')
    await (program as any).parseAsync([
      'node',
      'cli',
      'release',
      'download',
      'a.zip',
      '-p',
      'oss',
      '-o',
      outDir,
    ])
    const f = path.join(outDir, 'a.zip')
    expect(fs.existsSync(outDir)).toBe(true)
    expect(fs.existsSync(f)).toBe(true)
    const content = fs.readFileSync(f, 'utf-8')
    expect(content).toMatch(/downloaded:releases\/a.zip/)
    fs.rmSync(tmp, { recursive: true, force: true })
  })
})
