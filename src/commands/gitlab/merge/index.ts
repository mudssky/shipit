import { CommanderPlugin } from '@/type'
import { Command } from 'commander'
import { mergeAction } from './action'
import { parseArrayArg } from '@/utils'

export default {
  register(gitlab: Command) {
    const merge = gitlab.command('merge').description('合并请求相关操作')
    merge
      .option('-i, --interactive', '交互式选择合并方式')
      .option('-p, --project-url <project_url>', '项目url')
      .option(
        '-m, --merge-routes <merge_routes>',
        '合并分支路径，用逗号分隔',
        parseArrayArg,
      )
      .action(mergeAction)
  },
} satisfies CommanderPlugin
