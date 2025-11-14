#!/usr/bin/env node

import { program } from './cli'

export type { GlobalEnvConfig } from './config'
export type { ShipitConfig, ShipitUserConfig } from './config/shipit'
export { defineConfig } from './config/shipit'

async function run() {
  await import('@/commands/upload')
  await import('@/commands/release')
  await import('@/commands/config')
  if (process.argv.length <= 2) {
    program.outputHelp()
    return
  }
  await program.parseAsync(process.argv)
}

void run()
