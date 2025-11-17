import path from 'path'
import { expect, test, vi } from 'vitest'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(async (qs: any[]) => {
      const q = qs[0]
      if (q.name === 'text') return { text: '' }
      if (q.name === 'picked')
        return {
          picked: { key: 'a.zip', lastModified: '2025-01-01T00:00:00Z' },
        }
      if (q.name === 'act') return { act: 'download' }
      return {}
    }),
  },
}))

const download = vi.fn(async () => ({ bytes: 123, etag: 'etag123' }))
const list = vi.fn(async () => [
  { key: 'a.zip', lastModified: '2025-01-01T00:00:00Z' },
  { key: 'b.zip', lastModified: '2025-01-02T00:00:00Z' },
])

vi.mock('@/providers/oss', () => ({
  createOssProvider: () => ({ list, download }),
}))

vi.mock('@/config/shipit', () => ({
  shipitConfig: {
    providers: {
      oss: { prefix: 'releases/', provider: 'aliyun', bucket: 'b' },
    },
    upload: { defaultProvider: 'oss' },
    release: {
      defaultProvider: 'oss',
      targetDir: path.join(process.cwd(), 'tmp'),
      listLimit: 10,
      listOutputStyle: 'tsv',
      listLargeThreshold: 30,
      allowedTargetDirPrefix: path
        .join(process.cwd(), 'tmp')
        .replace(/\\/g, '/'),
    },
    hooks: {
      beforeUpload: [],
      afterUpload: [],
      beforeRelease: [],
      afterRelease: [],
      shell: 'bash',
    },
  },
}))

import '@/commands/release/index.ts'
import { program } from '@/cli'

test('release list interactive oss download', async () => {
  await program.parseAsync([
    'node',
    'cli',
    'release',
    'list',
    '-p',
    'oss',
    '-i',
  ])
  expect(list).toHaveBeenCalled()
  expect(download).toHaveBeenCalled()
})
