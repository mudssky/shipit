import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { program } from '@/cli'
import '@/commands/config'

let originalCwd: string

describe('config generate (integration)', () => {
  beforeEach(() => {
    originalCwd = process.cwd()
  })
  afterEach(() => {
    process.chdir(originalCwd)
  })

  it('prints example config to stdout in empty temp dir', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-generate-'))
    process.chdir(tmp)
    const logs: string[] = []
    const orig = console.log
    console.log = (...args: any[]) => {
      logs.push(args.join(' '))
    }
    try {
      await program.parseAsync(['config', 'generate'], {
        from: 'user',
      })
    } finally {
      console.log = orig
    }
    const output = logs.join('\n')
    expect(output).toContain('defineConfig')
  })

  it('writes example config to file with --out from temp dir', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-generate-'))
    process.chdir(tmp)
    const outPath = path.join(tmp, 'shipit.config.ts')
    await program.parseAsync(['config', 'generate', '--out', outPath], {
      from: 'user',
    })
    const written = fs.readFileSync(outPath, 'utf-8')
    expect(written).toContain('defineConfig')
  })
})
