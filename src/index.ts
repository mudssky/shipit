#!/usr/bin/env node

import { program } from './cli'
// import "@/commands/commit/commit";
// import '@/commands/dingmail'
import '@/commands/upload'
import '@/commands/release'
import '@/commands/config'

program.parse(process.argv)
