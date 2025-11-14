import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

describe('Shipit 配置加载与默认值', () => {
  it('在存在最小配置时返回默认值并通过校验', async () => {
    vi.doMock('cosmiconfig', () => ({
      cosmiconfigSync: () => ({
        search: () => ({
          config: {
            artifact: {},
            upload: {
              defaultProvider: 'server',
              server: {
                endpoint: 'http://localhost/upload',
                targetDir: 'releases',
              },
            },
          },
          filepath: 'shipit.config.ts',
        }),
      }),
    }))
    const mod = await import('@/config/shipit')
    const cfg = mod.shipitConfig
    expect(cfg.artifact.defaultPath).toBe('./dist/release.zip')
    expect(cfg.artifact.nameTemplate).toMatch(
      /^release-\{yyyy\}\{MM\}\{dd\}\{HH\}\{mm\}\{ss\}\.zip$/,
    )
    expect(cfg.upload.defaultProvider).toBe('server')
  })

  it('在找不到配置文件时抛出人类可读错误', async () => {
    vi.doMock('cosmiconfig', () => ({
      cosmiconfigSync: () => ({
        search: () => undefined,
      }),
    }))
    const mod = await import('@/config/shipit')
    expect(() => (mod.shipitConfig as any).upload).toThrow(
      /configuration file not found or invalid/i,
    )
  })
})
