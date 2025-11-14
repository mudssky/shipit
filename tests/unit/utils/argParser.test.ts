import { describe, expect, it } from 'vitest'
import { parseArrayArg, parseIntArg } from '@/utils/argParser'

describe('argParser', () => {
  it('parseIntArg parses decimal strings', () => {
    expect(parseIntArg('10')).toBe(10)
    expect(parseIntArg('0')).toBe(0)
    expect(parseIntArg('42')).toBe(42)
  })

  it('parseArrayArg splits by comma', () => {
    expect(parseArrayArg('a,b,c')).toEqual(['a', 'b', 'c'])
    expect(parseArrayArg('single')).toEqual(['single'])
    expect(parseArrayArg('x,,y')).toEqual(['x', '', 'y'])
  })
})
