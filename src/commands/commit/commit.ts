import { program } from '@/cli'
import { showStagedChanges, showUnstagedChanges } from './action'

const commit = program
  .command('commit')
  .description('git commit 相关操作')
  .option('-v, --verbose', '输出详细日志信息')

commit
  .command('staged')
  .description('Show git staged changes')
  .option('--detailed', 'Show full content of changes')
  .action((options) => showStagedChanges(options))

commit
  .command('unstaged')
  .description('Show git unstaged changes')
  .action(showUnstagedChanges)
