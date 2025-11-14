#!/usr/bin/env node

import { program } from './cli'

export { defineConfig } from './config/shipit'
export type { ShipitConfig, ShipitUserConfig } from './config/shipit'
export type { GlobalEnvConfig } from './config'

async function run() {
  await import('@/commands/upload')
  await import('@/commands/release')
  await import('@/commands/config')
  program.parse(process.argv)
}

if (typeof require !== 'undefined' && require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  run()
}
