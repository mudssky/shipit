import { Option } from 'commander'
import dayjs from 'dayjs'
import fs from 'fs'
import path from 'path'
import { program } from '@/cli'
import { shipitConfig } from '@/config/shipit'
import { runHooks } from '@/hooks/executor'
import { createOssProvider } from '@/providers/oss'
import { createServerProvider } from '@/providers/server'
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
        const rows = items.map((it) => {
          const lm = it.lastModified ? String(it.lastModified) : ''
          const fm = lm ? dayjs(lm).format('YYYY-MM-DD HH:mm:ss') : ''
          return { Key: it.key, LastModified: fm }
        })
        logger.setTableStyle(
          options.style || shipitConfig.release.listOutputStyle,
        )
        logger.succeed('获取列表成功')
        logger.renderTable(rows)
        return
      }
      if (provider === 'server') {
        const cfg = shipitConfig.server
        if (!cfg) throw new ShipitError('缺少 server 配置')
        logger.start('正在从 Server 获取列表')
        const server = createServerProvider(cfg)
        const items = await server.list('', limit)
        const rows = items.map((it) => {
          const lm = it.lastModified ? String(it.lastModified) : ''
          const fm = lm ? dayjs(lm).format('YYYY-MM-DD HH:mm:ss') : ''
          return { Key: it.key, LastModified: fm }
        })
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
  .option('--dry-run')
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
      const enableHooks = options.hooks !== false
      if (enableHooks)
        await runHooks(
          'beforeRelease',
          { provider, targetDir, artifactName: String(name) },
          { logger, dryRun: Boolean(options.dryRun) },
        )
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
      if (options.dryRun) {
        logger.succeed(`dry-run: 发布 ${path.basename(name)} → ${targetDir}`)
        return
      }
      if (provider === 'server') {
        const cfg = shipitConfig.server
        if (!cfg) throw new ShipitError('缺少 server 配置')
        const server = createServerProvider(cfg)
        await server.publish(path.basename(String(name)), targetDir)
        logger.succeed(
          `发布成功: ${path.basename(String(name))} → ${targetDir}`,
        )
      } else {
        logger.succeed(`发布准备完成: ${path.basename(name)} → ${targetDir}`)
      }
      if (enableHooks)
        await runHooks(
          'afterRelease',
          { provider, targetDir, artifactName: String(name) },
          { logger, dryRun: Boolean(options.dryRun) },
        )
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      logger.fail(`发布失败: ${msg}`)
      exitWithError(msg)
    }
  })

release
  .command('download [name]')
  .description('从 Provider 下载指定产物到本地目录')
  .addOption(
    new Option('-p, --provider <provider>').choices(['server', 'oss', 'scp']),
  )
  .option('-o, --output <dir>')
  .option('-i, --interactive')
  .action(async (name, options) => {
    const verbose = Boolean(options.verbose || program.opts().verbose)
    const logger = new Logger(verbose)
    try {
      if (!name) {
        throw new ShipitError('缺少下载名称')
      }
      const provider = options.provider || shipitConfig.release.defaultProvider
      if (provider !== 'oss') {
        throw new ShipitError(`未实现的下载 Provider: ${provider}`)
      }
      const cfg = shipitConfig.upload.oss
      if (!cfg) throw new ShipitError('缺少 oss 配置')
      const outputDir = String(
        options.output || shipitConfig.release.targetDir || '.',
      )
      const allowed = shipitConfig.release.allowedTargetDirPrefix
      if (
        allowed &&
        !normalizePath(outputDir).startsWith(normalizePath(allowed))
      ) {
        throw new ShipitError(
          `下载目录不合法: 需以 ${allowed} 开头，当前为 ${outputDir}`,
        )
      }
      fs.mkdirSync(outputDir, { recursive: true })
      const key = cfg.prefix ? `${cfg.prefix}${String(name)}` : String(name)
      const filePath = path.join(outputDir, path.basename(String(name)))
      logger.start(`正在下载 ${key}`)
      const oss = createOssProvider(cfg)
      const res = await oss.download(key, filePath)
      if (!res?.bytes || res.bytes <= 0) {
        throw new ShipitError('下载失败或内容为空')
      }
      const etagInfo = res.etag ? `, etag=${res.etag}` : ''
      logger.succeed(`下载成功: ${filePath} (${res.bytes} bytes${etagInfo})`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      logger.fail(`下载失败: ${msg}`)
      exitWithError(msg)
    }
  })

function normalizePath(p: string): string {
  return path.resolve(p).replace(/\\/g, '/').toLowerCase()
}
