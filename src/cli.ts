import { Command } from 'commander'
import packageJson from '../package.json'

const program = new Command()

program
  .name('shipit')
  .description('一个用于发布前端项目的CLI工具')
  .version(packageJson.version)
  .option('-v, --verbose', '输出详细日志信息')
  .showHelpAfterError()
  .showSuggestionAfterError()
  .helpOption('-h, --help', '显示帮助信息')

export { program }
