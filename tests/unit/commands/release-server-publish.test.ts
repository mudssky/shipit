import path from 'path'
import { describe, expect, it, vi } from 'vitest'
import { program } from '@/cli'
import { Logger } from '@/utils/logger'
import '@/commands/release/index.ts'

const publish = vi.fn(async () => {})

vi.mock('@/providers/server', () => {
  return {
    createServerProvider: () => ({ publish }),
  }
})

vi.mock('@/config/shipit', () => {
  return {
    shipitConfig: {
      providers: {
        oss: { prefix: 'releases/', provider: 'aliyun', bucket: 'b' },
        server: { baseUrl: 'https://api.example.com' },
      },
      upload: { defaultProvider: 'oss' },
      release: {
        defaultProvider: 'server',
        targetDir: path.join(process.cwd(), 'tmp'),
        listLimit: 10,
        listOutputStyle: 'tsv',
      },
      hooks: {
        beforeUpload: [],
        afterUpload: [],
        beforeRelease: [],
        afterRelease: [],
        shell: 'bash',
      },
    },
  }
})

describe('release publish with server provider', () => {
  it('calls publish and succeeds', async () => {
    const spy = vi.spyOn(Logger.prototype, 'succeed')
    await (program as any).parseAsync([
      'node',
      'cli',
      'release',
      'publish',
      'a.zip',
      '-p',
      'server',
    ])
    expect(publish).toHaveBeenCalled()
    const names = spy.mock.calls.map((c) => String(c[0] ?? ''))
    expect(names.some((s) => s.includes('发布成功'))).toBe(true)
  })
})
