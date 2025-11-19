import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it, vi } from 'vitest'

describe('hooks executor - tsx脚本执行并返回更新', () => {
  it('运行 .ts 脚本，合并 HookResult.updates 到上下文', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-hooks-'))
    const file = path.join(tmp, 'beforeRelease.ts')
    const content = `
      const ctx = JSON.parse(process.env.SHIPIT_CTX_JSON || '{}')
      export async function run(input) {
        return { updates: { marker: 'ts-ok', provider: input.provider || '' } }
      }
      run(ctx).then((res) => { console.log(JSON.stringify(res)) })
    `
    fs.writeFileSync(file, content)

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
        release: { defaultProvider: 'oss', targetDir: '.', listLimit: 10 },
        hooks: {
          beforeUpload: [],
          afterUpload: [],
          beforeRelease: [file],
          afterRelease: [],
          shell: process.platform === 'win32' ? 'powershell' : 'bash',
        },
      },
    }))

    const { runHooks } = await import('@/hooks/executor')
    const { Logger } = await import('@/utils/logger')
    const logger = new Logger(false)
    const ctx: Record<string, any> = { provider: 'oss' }
    await runHooks('beforeRelease', ctx, { logger })
    expect(ctx.marker).toBe('ts-ok')
    fs.rmSync(tmp, { recursive: true, force: true })
  }, 15000)
})
