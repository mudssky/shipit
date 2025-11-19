import axios from 'axios'
import { Option } from 'commander'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'
import { program } from '@/cli'
import { getEffectiveShipitConfig, shipitConfig } from '@/config/shipit'
import { runHooks } from '@/hooks/executor'
import { createOssProvider } from '@/providers/oss'
import { exitWithError, ShipitError } from '@/utils/errors'
import { Logger } from '@/utils/logger'
import { formatName } from '@/utils/naming'

program
  .command('upload <file>')
  .description('上传指定zip产物')
  .option('-v, --verbose', '输出详细日志信息')
  .addOption(
    new Option('-p, --provider <provider>', '上传 Provider')
      .choices(['server', 'oss', 'scp'])
      .default(shipitConfig.upload.defaultProvider),
  )
  .option('-n, --name <name>', '上传名称，默认按模板自动生成')
  .option('-i, --interactive', '启用交互式确认与选择')
  .option('--dry-run', '演练模式，仅打印将执行的操作')
  .option('--no-hooks', '禁用配置中的 Hooks 执行')
  .addHelpText(
    'afterAll',
    [
      '',
      '示例:',
      '  shipit upload ./dist/release.zip -p server',
      '  shipit upload ./dist/release.zip -p oss --dry-run',
    ].join('\n'),
  )
  .action(async (file, options) => {
    const verbose = Boolean(options.verbose || program.opts().verbose)
    const logger = new Logger(verbose)
    try {
      const eff = getEffectiveShipitConfig(String(program.opts().project || ''))
      const provider = options.provider || eff.upload.defaultProvider
      const filePath = file || eff.artifact.defaultPath
      const name = options.name || formatName(eff.artifact.nameTemplate)
      const enableHooks = options.hooks !== false
      if (!fs.existsSync(filePath)) {
        throw new ShipitError(`文件不存在: ${filePath}`)
      }
      if (provider === 'server') {
        if (enableHooks) {
          const p = runHooks(
            'beforeUpload',
            { provider, artifactName: name, filePath },
            { logger, dryRun: Boolean(options.dryRun) },
          )
          if (shipitConfig.hooks.beforeUpload.length > 0) await p
        }
        if (options.dryRun) {
          logger.log('info', `dry-run: 上传到服务器 ${name}`)
        } else {
          await serverUpload({ filePath, name, logger })
        }
        if (enableHooks) {
          const p = runHooks(
            'afterUpload',
            { provider, artifactName: name, filePath },
            { logger, dryRun: Boolean(options.dryRun) },
          )
          if (shipitConfig.hooks.afterUpload.length > 0) await p
        }
        return
      }
      if (provider === 'oss') {
        if (enableHooks) {
          const p = runHooks(
            'beforeUpload',
            {
              provider,
              artifactName: name,
              filePath,
              prefix: eff.providers.oss?.prefix ?? '',
            },
            { logger, dryRun: Boolean(options.dryRun) },
          )
          if (shipitConfig.hooks.beforeUpload.length > 0) await p
        }
        if (options.dryRun) {
          const key = `${eff.providers.oss?.prefix ?? ''}${name}`
          logger.log('info', `dry-run: 上传到 OSS ${key}`)
        } else {
          await ossUpload({ filePath, name, logger })
        }
        if (enableHooks) {
          const p = runHooks(
            'afterUpload',
            {
              provider,
              artifactName: name,
              filePath,
              prefix: eff.providers.oss?.prefix ?? '',
            },
            { logger, dryRun: Boolean(options.dryRun) },
          )
          if (shipitConfig.hooks.afterUpload.length > 0) await p
        }
        return
      }
      throw new ShipitError(`未实现的上传 Provider: ${provider}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      logger.fail(`上传失败: ${msg}`)
      exitWithError(msg)
    }
  })

function resolveHeaders(
  headers?: Record<string, string>,
): Record<string, string> {
  if (!headers) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    const replaced = v.replace(/\$\{([A-Z0-9_]+)\}/g, (_, key) => {
      const val = process.env[key]
      return val ?? ''
    })
    out[k] = replaced
  }
  return out
}

// 使用配置层的单点实现：getEffectiveShipitConfig

async function serverUpload(args: {
  filePath: string
  name: string
  logger: Logger
}): Promise<void> {
  const { filePath, name, logger } = args
  const cfg = getEffectiveShipitConfig(String(program.opts().project || ''))
    .providers.server
  if (!cfg) throw new ShipitError('缺少 server 上传配置')
  logger.start('正在上传到服务器')
  const form = new FormData()
  form.append('file', fs.createReadStream(filePath), {
    filename: name,
    contentType: 'application/zip',
  })
  form.append('targetDir', cfg.targetDir)
  const headers = { ...resolveHeaders(cfg.headers), ...form.getHeaders() }
  const res = await axios.post(cfg.endpoint, form, { headers })
  const data = res.data
  const finalPath = data?.path || data?.url || data?.target || ''
  const filename = path.basename(finalPath || name)
  logger.succeed(`上传成功: ${filename}`)
}

async function ossUpload(args: {
  filePath: string
  name: string
  logger: Logger
}): Promise<void> {
  const { filePath, name, logger } = args
  const cfg = getEffectiveShipitConfig(String(program.opts().project || ''))
    .providers.oss
  if (!cfg) throw new ShipitError('缺少 oss 上传配置')
  if (name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw new ShipitError('非法名称: 不允许包含路径分隔符或..')
  }
  const provider = createOssProvider(cfg)
  const key = `${cfg.prefix ?? ''}${name}`
  if (cfg.requiredPrefix && !key.startsWith(cfg.requiredPrefix)) {
    throw new ShipitError(
      `上传路径不合法: 需以 ${cfg.requiredPrefix} 开头，当前为 ${key}`,
    )
  }
  logger.start('正在上传到 OSS')
  const url = await provider.put(key, filePath)
  const filename = path.basename(key)
  logger.succeed(`上传成功: ${filename}${url ? ` (${url})` : ''}`)
}
