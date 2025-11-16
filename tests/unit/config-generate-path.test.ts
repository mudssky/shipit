import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

describe('example config path resolution (unit)', () => {
  it('example config file exists under examples directory', () => {
    const dirs = [
      path.resolve(__dirname, '../../examples'),
      path.resolve(__dirname, '../../examples/config'),
      path.resolve(__dirname, '../../../examples'),
      path.resolve(__dirname, '../../../examples/config'),
    ]
    const exists = dirs.some((d) => {
      if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) return false
      const files = fs.readdirSync(d)
      return files.some((f) => /\.example\.ts$/i.test(f))
    })
    expect(exists).toBe(true)
  })
})
