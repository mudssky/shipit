import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

describe('example config path resolution (unit)', () => {
  it('example config file exists under examples directory', () => {
    const candidates = [
      path.resolve(__dirname, '../../examples/shipit.config.example.ts'),
      path.resolve(__dirname, '../../examples/config/shipit.config.example.ts'),
      path.resolve(__dirname, '../../../examples/shipit.config.example.ts'),
      path.resolve(
        __dirname,
        '../../../examples/config/shipit.config.example.ts',
      ),
    ]
    expect(candidates.some((p) => fs.existsSync(p))).toBe(true)
  })
})
