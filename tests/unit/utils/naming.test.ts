import { describe, expect, it } from 'vitest'

describe('naming formatName', () => {
  it('生成默认模板名称并保留扩展名', async () => {
    const { formatName } = await import('@/utils/naming')
    const d = new Date('2025-01-02T03:04:05Z')
    const yyyy = String(d.getFullYear())
    const MM = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const HH = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    const expected = `release-${yyyy}${MM}${dd}${HH}${mm}${ss}.zip`
    const name = formatName('release-{yyyy}{MM}{dd}{HH}{mm}{ss}.zip', d)
    expect(name).toBe(expected)
  })

  it('非法字符过滤但保留扩展名', async () => {
    const { formatName } = await import('@/utils/naming')
    const d = new Date('2025-01-02T03:04:05Z')
    const name = formatName('re lease.x/yz-{yyyy}.zip', d)
    expect(name).toBe('re-lease-x-yz-2025.zip')
  })
})
