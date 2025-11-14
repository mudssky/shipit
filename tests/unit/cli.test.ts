import { describe, expect, it, vi } from 'vitest'

vi.mock('@/config/shipit', () => ({
  shipitConfig: {
    artifact: {
      defaultPath: './dist/release.zip',
      nameTemplate: 'release-{yyyy}{MM}{dd}{HH}{mm}{ss}.zip',
    },
    upload: {
      defaultProvider: 'server',
      server: { endpoint: 'http://localhost/upload', targetDir: 'releases' },
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

describe('CLI 基础与子命令注册', () => {
  it('顶层包含 --verbose 选项，注册 upload 与 release 子命令', async () => {
    const { program } = await import('@/cli')
    await import('@/commands/upload')
    await import('@/commands/release')

    const optionLongs = program.options.map((o: any) => o.long)
    expect(optionLongs).toContain('--verbose')

    const commandNames = program.commands.map((c: any) => c.name())
    expect(commandNames).toContain('upload')
    expect(commandNames).toContain('release')
  })
})
