import { Option } from 'commander'
import path from 'path'
import { program } from '@/cli'
import { shipitConfig } from '@/config/shipit'
import { createOssProvider } from '@/providers/oss'
import { exitWithError, ShipitError } from '@/utils/errors'
import { Logger } from '@/utils/logger'

const release = program
  .command('release')
  .description('发布相关操作')
  .option('-v, --verbose', '输出详细日志信息')

release
  .command('list')
  .description('列出近n个产物')
  .addOption(
    new Option('-p, --provider <provider>').choices(['server', 'oss', 'scp']),
  )
  .addOption(new Option('-n, --limit <limit>').default(10))
  .addOption(new Option('--style <style>').choices(['tsv', 'table']))
  .option('-i, --interactive')
  .action(async (options) => {
    const verbose = Boolean(options.verbose || program.opts().verbose)
    const logger = new Logger(verbose)
    try {
      const provider = options.provider || shipitConfig.release.defaultProvider
      const limit = Number(options.limit || shipitConfig.release.listLimit)
      if (provider === 'oss') {
        const cfg = shipitConfig.upload.oss
        if (!cfg) throw new ShipitError('缺少 oss 配置')
        logger.start('正在从 OSS 获取列表')
        const oss = createOssProvider(cfg)
        const items = await oss.list(cfg.prefix ?? '', limit)
        const rows = items.map((it) => ({
          Key: it.key,
          LastModified: String(it.lastModified ?? ''),
        }))
        logger.setTableStyle(
          options.style || shipitConfig.release.listOutputStyle,
        )
        logger.succeed('获取列表成功')
        logger.renderTable(rows)
        return
      }
      logger.log('info', '尚未实现的列表 Provider')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      logger.fail(`列表失败: ${msg}`)
      exitWithError(msg)
    }
  })

release
  .command('publish [name]')
  .description('发布指定名称的产物')
  .addOption(
    new Option('-p, --provider <provider>').choices(['server', 'oss', 'scp']),
  )
  .option('-d, --dir <dir>')
  .option('--no-hooks')
  .option('-i, --interactive')
  .action(async (name, options) => {
    const verbose = Boolean(options.verbose || program.opts().verbose)
    const logger = new Logger(verbose)
    try {
      const provider = options.provider || shipitConfig.release.defaultProvider
      const targetDir = String(options.dir || shipitConfig.release.targetDir)
      const allowed = shipitConfig.release.allowedTargetDirPrefix
      if (
        allowed &&
        !normalizePath(targetDir).startsWith(normalizePath(allowed))
      ) {
        throw new ShipitError(
          `发布目录不合法: 需以 ${allowed} 开头，当前为 ${targetDir}`,
        )
      }
      logger.start('正在发布')
      if (!name) {
        logger.fail('未指定发布产物名称')
        throw new ShipitError('缺少发布名称')
      }
      if (name.includes('/') || name.includes('\\') || name.includes('..')) {
        throw new ShipitError('非法名称: 不允许包含路径分隔符或..')
      }
      if (provider !== 'oss' && provider !== 'server') {
        throw new ShipitError(`未实现的发布 Provider: ${provider}`)
      }
      logger.succeed(`发布准备完成: ${path.basename(name)} → ${targetDir}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      logger.fail(`发布失败: ${msg}`)
      exitWithError(msg)
    }
  })

function normalizePath(p: string): string {
  return path.resolve(p).replace(/\\/g, '/').toLowerCase()
}
