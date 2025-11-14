import { program } from '@/cli'
import { Option } from 'commander'

const shipit = program
  .command('shipit')
  .description('发布脚手架命令组')
  .option('-v, --verbose', '输出详细日志信息')

shipit
  .command('upload <file>')
  .description('上传指定zip产物')
  .addOption(new Option('-p, --provider <provider>').choices(['server', 'oss', 'scp']))
  .option('-n, --name <name>')
  .option('-i, --interactive')
  .action((file, options) => {
    console.log('upload', { file, options })
  })

const release = shipit
  .command('release')
  .description('发布相关操作')

release
  .command('list')
  .description('列出近n个产物')
  .addOption(new Option('-p, --provider <provider>').choices(['server', 'oss', 'scp']))
  .addOption(new Option('-n, --limit <limit>').default(10))
  .option('-i, --interactive')
  .action((options) => {
    console.log('release list', { options })
  })

release
  .command('publish [name]')
  .description('发布指定名称的产物')
  .addOption(new Option('-p, --provider <provider>').choices(['server', 'oss', 'scp']))
  .option('-d, --dir <dir>')
  .option('--no-hooks')
  .option('-i, --interactive')
  .action((name, options) => {
    console.log('release publish', { name, options })
  })
