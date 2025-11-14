import axios, { AxiosInstance } from 'axios'

export interface ServerReleaseItem {
  key: string
  lastModified?: string
}

export interface ServerProvider {
  list(prefix: string, limit: number): Promise<ServerReleaseItem[]>
  publish(name: string, dir: string): Promise<void>
}

export function createServerProvider(cfg: {
  baseUrl: string
  token?: string
}): ServerProvider {
  const client: AxiosInstance = axios.create({
    baseURL: cfg.baseUrl,
    headers: cfg.token ? { Authorization: `Bearer ${cfg.token}` } : undefined,
  })

  return {
    async list(prefix: string, limit: number): Promise<ServerReleaseItem[]> {
      const res = await client.get('/releases', {
        params: { prefix, limit },
      })
      const data = (res.data && (res.data.items || res.data)) as any[]
      return (Array.isArray(data) ? data : []).map((it) => ({
        key: String(it.key ?? it.name ?? ''),
        lastModified: it.lastModified ? String(it.lastModified) : undefined,
      }))
    },
    async publish(name: string, dir: string): Promise<void> {
      await client.post('/releases/publish', {
        name,
        targetDir: dir,
      })
    },
  }
}
