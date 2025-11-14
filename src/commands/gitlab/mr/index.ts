import { Command } from 'commander'
import { autoMerge } from './action'
import { CommanderPlugin } from '@/type'

export default {
  register(gitlab: Command) {
    const gitlabMr = gitlab.command('mr').description('合并请求相关操作')
    gitlabMr
      .command('auto')
      .description('自动合并')
      .argument('<url>', '合并请求链接')
      .action(autoMerge)
  },
} satisfies CommanderPlugin
