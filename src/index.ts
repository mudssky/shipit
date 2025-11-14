#!/usr/bin/env node

import { program } from './cli'
import '@/commands/commit/commit'
import '@/commands/dingmail'
import '@/commands/gitlab'

program.parse(process.argv)
