import { Option } from 'commander'
import { program } from '@/cli'
import { globalConfig } from '@/config'
import { parseIntArg } from '@/utils'
import { showMailsAction } from './action'

const dingmail = program
  .command('dingmail')
  .description('钉钉 邮件 相关操作')
  .option('-v, --verbose', '输出详细日志信息')

dingmail
  .command('showMails')
  .description('显示邮件列表')
  .addOption(
    new Option('-n, --mail-number <number>', '查看邮件数量')
      .default(globalConfig.SHOW_MAIL_NUMBER)
      .argParser(parseIntArg),
  )
  .action(showMailsAction)
