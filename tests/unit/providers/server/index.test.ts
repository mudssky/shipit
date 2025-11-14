import { describe, expect, it, vi } from 'vitest'
import { createServerProvider } from '@/providers/server'

vi.mock('axios', () => {
  const get = vi.fn(async () => ({
    data: { items: [{ key: 'a.zip', lastModified: '2025-01-01T00:00:00Z' }] },
  }))
  const post = vi.fn(async () => ({ status: 200 }))
  return {
    default: {
      create: () => ({ get, post }),
    },
    create: () => ({ get, post }),
  }
})

describe('ServerProvider', () => {
  it('list returns items', async () => {
    const p = createServerProvider({ baseUrl: 'https://api.example.com' })
    const items = await p.list('', 10)
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].key).toBe('a.zip')
  })

  it('publish posts to server', async () => {
    const p = createServerProvider({ baseUrl: 'https://api.example.com' })
    await expect(p.publish('a.zip', '/tmp')).resolves.toBeUndefined()
  })
})
