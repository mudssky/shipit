import { program } from '@/cli'
import mergeCommands from './merge'
import mrCommands from './mr'

const gitlab = program
  .command('gitlab')
  .description('gitlab相关操作')
  .option('-v, --verbose', '输出详细日志信息')

mrCommands.register(gitlab)
mergeCommands.register(gitlab)
