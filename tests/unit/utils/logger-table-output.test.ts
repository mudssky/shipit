import { describe, expect, it, vi } from 'vitest'
import { Logger } from '@/utils/logger'

describe('Logger.renderTable 输出模式', () => {
  it('table 模式调用 console.table', () => {
    const logger = new Logger(false, 'table')
    const spy = vi.spyOn(console, 'table').mockImplementation(() => {})
    logger.renderTable([{ A: '1', B: '2' }])
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('tsv 模式输出制表符分隔', () => {
    const logger = new Logger(false, 'tsv')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logger.renderTable([{ A: '1', B: '2' }])
    const call = spy.mock.calls.at(0)?.[0] as string
    expect(call).toContain('A\tB')
    expect(call).toContain('1\t2')
    spy.mockRestore()
  })
})
