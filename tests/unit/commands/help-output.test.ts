import { describe, expect, it, vi } from 'vitest'

vi.mock('@/config/shipit', () => {
  const shipitConfig = {
    artifact: {
      defaultPath: './dist/release.zip',
      nameTemplate: 'release-{yyyy}{MM}{dd}{HH}{mm}{ss}.zip',
    },
    upload: {
      defaultProvider: 'server',
      server: { endpoint: 'http://localhost/upload', targetDir: 'releases' },
      oss: { prefix: 'releases/' },
    },
    release: {
      defaultProvider: 'oss',
      targetDir: '.',
      listLimit: 10,
      listOutputStyle: 'tsv',
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

describe('子命令帮助输出', () => {
  it('upload 帮助包含关键描述与示例', async () => {
    const { program } = await import('@/cli')
    await import('@/commands/upload')
    const cmd = program.commands.find((c: any) => c.name() === 'upload')
    const help = cmd?.helpInformation() || ''
    expect(help).toContain('上传指定zip产物')
    expect(help).toContain('上传 Provider')
    expect(help).toContain('--dry-run')
  })

  it('release list 帮助包含样式与交互描述', async () => {
    const { program } = await import('@/cli')
    await import('@/commands/release')
    const release = program.commands.find((c: any) => c.name() === 'release')
    const list = release?.commands.find((c: any) => c.name() === 'list')
    const help = list?.helpInformation() || ''
    expect(help).toContain('输出样式: tsv 或 table')
    expect(help).toContain('--no-interactive')
  })

  it('release publish 帮助包含目录与 provider 描述', async () => {
    const { program } = await import('@/cli')
    await import('@/commands/release')
    const release = program.commands.find((c: any) => c.name() === 'release')
    const publish = release?.commands.find((c: any) => c.name() === 'publish')
    const help = publish?.helpInformation() || ''
    expect(help).toContain('发布 Provider')
    expect(help).toContain('发布目标目录')
  })

  it('release download 帮助包含输出目录与示例', async () => {
    const { program } = await import('@/cli')
    await import('@/commands/release')
    const release = program.commands.find((c: any) => c.name() === 'release')
    const dl = release?.commands.find((c: any) => c.name() === 'download')
    const help = dl?.helpInformation() || ''
    expect(help).toContain('下载 Provider')
    expect(help).toContain('输出目录')
  })
})
