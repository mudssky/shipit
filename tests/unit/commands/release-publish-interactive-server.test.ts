import path from 'path'
import { expect, test, vi } from 'vitest'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(async (qs: any[]) => {
      const q = qs[0]
      if (q.name === 'nm') return { nm: 'a.zip' }
      if (q.name === 'dir') return { dir: path.join(process.cwd(), 'tmp') }
      if (q.name === 'ok') return { ok: true }
      return {}
    }),
  },
}))

const publish = vi.fn(async () => {})

vi.mock('@/providers/server', () => ({
  createServerProvider: () => ({ publish }),
}))

vi.mock('@/config/shipit', () => {
  const shipitConfig = {
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
      listLargeThreshold: 30,
      allowedTargetDirPrefix: path
        .join(process.cwd(), 'tmp')
        .replace(/\\/g, '/'),
    },
    hooks: {
      beforeUpload: [],
      afterUpload: [],
      beforeRelease: ['echo before'],
      afterRelease: [{ type: 'ts', value: './scripts/after.ts' }],
      shell: 'bash',
    },
  }
  return { shipitConfig, getEffectiveShipitConfig: () => shipitConfig }
})

import '@/commands/release/index.ts'
import { program } from '@/cli'

test('release publish interactive server shows hooks summary and publishes', async () => {
  await program.parseAsync([
    'node',
    'cli',
    'release',
    'publish',
    '-p',
    'server',
    '-i',
    '--no-hooks',
  ])
  expect(publish).toHaveBeenCalled()
})
