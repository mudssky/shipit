import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

describe('validateShipitConfigDetailed', () => {
  it('返回 ok=true 且包含 filepath', async () => {
    vi.doMock('cosmiconfig', () => ({
      cosmiconfigSync: () => ({
        search: () => ({
          config: {
            artifact: {},
            upload: { defaultProvider: 'oss', oss: { bucket: 'b' } },
          },
          filepath: 'shipit.config.ts',
        }),
      }),
    }))
    const mod = await import('@/config/shipit')
    const r = mod.validateShipitConfigDetailed()
    expect(r.ok).toBe(true)
    expect(r.filepath).toBe('shipit.config.ts')
  })

  it('返回校验失败并输出 issues', async () => {
    vi.doMock('cosmiconfig', () => ({
      cosmiconfigSync: () => ({
        search: () => ({
          config: {
            artifact: { defaultPath: 123 },
            upload: { defaultProvider: 'oss', oss: { bucket: 'b' } },
          },
          filepath: 'shipit.config.ts',
        }),
      }),
    }))
    const mod = await import('@/config/shipit')
    const r = mod.validateShipitConfigDetailed()
    expect(r.ok).toBe(false)
    expect(r.filepath).toBe('shipit.config.ts')
    expect((r.issues ?? []).length).toBeGreaterThan(0)
  })
})
