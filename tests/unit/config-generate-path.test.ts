import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

describe('example config path resolution (unit)', () => {
  it('example config file exists at project root', () => {
    const candidates = [
      path.resolve(__dirname, '../../shipit.config.example.ts'),
      path.resolve(__dirname, '../../../shipit.config.example.ts'),
    ]
    expect(candidates.some((p) => fs.existsSync(p))).toBe(true)
  })
})
