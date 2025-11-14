import { program } from '@/cli'
import { Option } from 'commander'

program
  .command('upload <file>')
  .description('上传指定zip产物')
  .option('-v, --verbose', '输出详细日志信息')
  .addOption(new Option('-p, --provider <provider>').choices(['server', 'oss', 'scp']))
  .option('-n, --name <name>')
  .option('-i, --interactive')
  .action((file, options) => {
    console.log('upload', { file, options })
  })
