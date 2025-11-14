import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

describe('getShipitConfigFilepath', () => {
  it('在加载后返回配置文件路径', async () => {
    vi.doMock('cosmiconfig', () => ({
      cosmiconfigSync: () => ({
        search: () => ({
          config: {
            artifact: {},
            upload: {
              defaultProvider: 'server',
              server: { endpoint: 'http://x', targetDir: 'releases' },
            },
          },
          filepath: 'C:' + '\\' + 'shipit.config.ts',
        }),
      }),
    }))
    const mod = await import('@/config/shipit')
    const _cfg = mod.shipitConfig
    void _cfg.upload
    const fp = mod.getShipitConfigFilepath()
    expect(fp).toBe('C:' + '\\' + 'shipit.config.ts')
  })
})
