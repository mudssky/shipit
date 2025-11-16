import { Option } from 'commander'
import dayjs from 'dayjs'
import fs from 'fs'
import inquirer from 'inquirer'
import os from 'os'
import path from 'path'
import { program } from '@/cli'
import { shipitConfig } from '@/config/shipit'
import { runHooks } from '@/hooks/executor'
import { createOssProvider } from '@/providers/oss'
import { createServerProvider } from '@/providers/server'
import { exitWithError, ShipitError } from '@/utils/errors'
import {
  confirm,
  inputDir,
  inputText,
  pickAction,
  pickFromList,
} from '@/utils/interactive'
import { Logger } from '@/utils/logger'

const release = program
  .command('release')
  .description('发布相关操作')
  .option('-v, --verbose', '输出详细日志信息')

release
  .command('list')
  .description('列出近n个产物')
  .addOption(
    new Option('-p, --provider <provider>', '列表 Provider')
      .choices(['server', 'oss', 'scp'])
      .default(shipitConfig.release.defaultProvider),
  )
  .addOption(new Option('-n, --limit <limit>', '列表数量上限').default(10))
  .addOption(
    new Option('--style <style>', '输出样式: tsv 或 table').choices([
      'tsv',
      'table',
    ]),
  )
  .option(
    '-o, --output <dir>',
    `输出目录，默认 ${String(shipitConfig.release.targetDir || '.')}`,
  )
  .option(
    '-d, --dir <dir>',
    `发布目标目录，默认 ${String(shipitConfig.release.targetDir)}`,
  )
  .option('-i, --interactive', '启用交互式选择与确认')
  .option('-I, --no-interactive', '禁用交互式流程')
  .option('-D, --dry-run', '演练模式，仅打印将执行的操作')
  .option('-y, --yes', '自动确认交互中的提示')
  .addHelpText(
    'afterAll',
    [
      '',
      '示例:',
      '  shipit release list -p oss -n 20 --style table',
      '  shipit release list -p server --interactive',
    ].join('\n'),
  )
  .action(async (options) => {
    const verbose = Boolean(options.verbose || program.opts().verbose)
    const logger = new Logger(verbose)
    try {
      const provider = options.provider || shipitConfig.release.defaultProvider
      const limit = Number(options.limit || shipitConfig.release.listLimit)
      const autoInteractive = Boolean(process.stdout.isTTY && !process.env.CI)
      const interactiveEnabled =
        options.interactive ?? (autoInteractive && !options.noInteractive)
      if (provider === 'oss') {
        const cfg = shipitConfig.upload.oss
        if (!cfg) throw new ShipitError('缺少 oss 配置')
        logger.start('正在从 OSS 获取列表')
        const oss = createOssProvider(cfg)
        const items = (await oss.list(cfg.prefix ?? '', limit)).sort((a, b) => {
          const at = a.lastModified
            ? dayjs(String(a.lastModified)).valueOf()
            : 0
          const bt = b.lastModified
            ? dayjs(String(b.lastModified)).valueOf()
            : 0
          return bt - at
        })
        const rows = items.map((it) => {
          const lm = it.lastModified ? String(it.lastModified) : ''
          const fm = lm ? dayjs(lm).format('YYYY-MM-DD HH:mm:ss') : ''
          return { Key: it.key, LastModified: fm }
        })
        const finalStyle =
          options.style ??
          shipitConfig.release.listOutputStyle ??
          (await readGlobalTableStyle()) ??
          'tsv'
        logger.setTableStyle(finalStyle)
        logger.succeed('获取列表成功')
        logger.renderTable(rows)
        if (interactiveEnabled) {
          const threshold = shipitConfig.release.listLargeThreshold
          let pool = items
          if (Array.isArray(pool) && pool.length > threshold) {
            const kw = await inputText('请输入过滤关键词(可空)', '')
            if (kw) pool = items.filter((it) => String(it.key).includes(kw))
          }
          const picked = await pickFromList(pool, (it) => ({
            name: `${it.key} | ${
              it.lastModified
                ? dayjs(String(it.lastModified)).format('YYYY-MM-DD HH:mm:ss')
                : ''
            }`,
            value: it,
          }))
          if (!picked) return
          const actions = [
            { name: '下载', value: 'download' },
            { name: '发布', value: 'publish' },
            { name: '取消', value: 'cancel' },
          ]
          const act = await pickAction(actions)
          if (!act || act === 'cancel') {
            logger.succeed('操作已取消')
            return
          }
          if (act === 'download') {
            let outputDir = String(
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
            const key = String(picked.key)
            const filePath = path.join(
              outputDir,
              path.basename(String(picked.key)),
            )
            logger.start(`正在下载 ${key}`)
            const res = await oss.download(key, filePath)
            if (!res?.bytes || res.bytes <= 0) {
              throw new ShipitError('下载失败或内容为空')
            }
            const etagInfo = res.etag ? `, etag=${res.etag}` : ''
            logger.succeed(
              `下载成功: ${filePath} (${res.bytes} bytes${etagInfo})`,
            )
            return
          }
          if (act === 'publish') {
            let targetDir = String(
              options.dir || shipitConfig.release.targetDir,
            )
            const allowed = shipitConfig.release.allowedTargetDirPrefix
            if (
              allowed &&
              !normalizePath(targetDir).startsWith(normalizePath(allowed))
            ) {
              throw new ShipitError(
                `发布目录不合法: 需以 ${allowed} 开头，当前为 ${targetDir}`,
              )
            }
            if (options.dryRun) {
              logger.succeed(
                `dry-run: 发布 ${path.basename(
                  String(picked.key),
                )} → ${targetDir}`,
              )
              return
            }
            const key = String(picked.key)
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-'))
            const tmpFile = path.join(tmpDir, path.basename(String(picked.key)))
            if (interactiveEnabled) {
              const dirInput = await inputDir(targetDir, (v) => {
                const ok =
                  !allowed ||
                  normalizePath(v).startsWith(normalizePath(allowed))
                return ok
                  ? true
                  : `发布目录不合法: 需以 ${allowed} 开头，当前为 ${v}`
              })
              if (dirInput) targetDir = dirInput
              const ok = options.yes
                ? true
                : await confirm(
                    `确认发布 ${path.basename(String(picked.key))} 到 ${targetDir}？`,
                    true,
                  )
              if (!ok) {
                logger.succeed('操作已取消')
                return
              }
            }
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true })
            }
            logger.start('正在发布')
            const res = await createOssProvider(cfg).download(key, tmpFile)
            if (!res?.bytes || res.bytes <= 0) {
              throw new ShipitError('下载失败或内容为空')
            }
            await unzipFile(tmpFile, targetDir)
            try {
              fs.unlinkSync(tmpFile)
            } catch {}
            logger.succeed(
              `发布成功: ${path.basename(String(picked.key))} → ${targetDir}`,
            )
            return
          }
        }
        return
      }
      if (provider === 'server') {
        const cfg = shipitConfig.server
        if (!cfg) throw new ShipitError('缺少 server 配置')
        logger.start('正在从 Server 获取列表')
        const server = createServerProvider(cfg)
        const items = (await server.list('', limit)).sort((a, b) => {
          const at = a.lastModified
            ? dayjs(String(a.lastModified)).valueOf()
            : 0
          const bt = b.lastModified
            ? dayjs(String(b.lastModified)).valueOf()
            : 0
          return bt - at
        })
        const rows = items.map((it) => {
          const lm = it.lastModified ? String(it.lastModified) : ''
          const fm = lm ? dayjs(lm).format('YYYY-MM-DD HH:mm:ss') : ''
          return { Key: it.key, LastModified: fm }
        })
        const finalStyle =
          options.style ??
          shipitConfig.release.listOutputStyle ??
          (await readGlobalTableStyle()) ??
          'tsv'
        logger.setTableStyle(finalStyle)
        logger.succeed('获取列表成功')
        logger.renderTable(rows)
        if (interactiveEnabled) {
          const threshold = shipitConfig.release.listLargeThreshold
          let pool = items
          if (Array.isArray(pool) && pool.length > threshold) {
            const kw = await inputText('请输入过滤关键词(可空)', '')
            if (kw) pool = items.filter((it) => String(it.key).includes(kw))
          }
          const picked = await pickFromList(pool, (it) => ({
            name: `${it.key} | ${
              it.lastModified
                ? dayjs(String(it.lastModified)).format('YYYY-MM-DD HH:mm:ss')
                : ''
            }`,
            value: it,
          }))
          if (!picked) return
          const actions = [
            { name: '发布', value: 'publish' },
            { name: '取消', value: 'cancel' },
          ]
          const act = await pickAction(actions)
          if (!act || act === 'cancel') {
            logger.succeed('操作已取消')
            return
          }
          if (act === 'publish') {
            const targetDir = String(
              options.dir || shipitConfig.release.targetDir,
            )
            const allowed = shipitConfig.release.allowedTargetDirPrefix
            if (
              allowed &&
              !normalizePath(targetDir).startsWith(normalizePath(allowed))
            ) {
              throw new ShipitError(
                `发布目录不合法: 需以 ${allowed} 开头，当前为 ${targetDir}`,
              )
            }
            const ok = options.yes
              ? true
              : await confirm(
                  `确认发布 ${path.basename(String(picked.key))} 到 ${targetDir}？`,
                  true,
                )
            if (!ok) {
              logger.succeed('操作已取消')
              return
            }
            if (options.dryRun) {
              logger.succeed(
                `dry-run: 发布 ${path.basename(
                  String(picked.key),
                )} → ${targetDir}`,
              )
              return
            }
            const svc = createServerProvider(cfg)
            await svc.publish(path.basename(String(picked.key)), targetDir)
            logger.succeed(
              `发布成功: ${path.basename(String(picked.key))} → ${targetDir}`,
            )
            return
          }
        }
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
    new Option('-p, --provider <provider>', '发布 Provider')
      .choices(['server', 'oss', 'scp'])
      .default(shipitConfig.release.defaultProvider),
  )
  .option(
    '-d, --dir <dir>',
    `发布目标目录，默认 ${String(shipitConfig.release.targetDir)}`,
  )
  .option('-H, --no-hooks', '禁用配置中的 Hooks 执行')
  .option('-D, --dry-run', '演练模式，仅打印将执行的操作')
  .option('-i, --interactive', '启用交互式选择与确认')
  .option('-I, --no-interactive', '禁用交互式流程')
  .option('-y, --yes', '自动确认交互中的提示')
  .addHelpText(
    'afterAll',
    [
      '',
      '示例:',
      '  shipit release publish artifact.zip -p server -d D:/site',
      '  shipit release publish artifact.zip -p oss --dry-run',
    ].join('\n'),
  )
  .action(async (name, options) => {
    const verbose = Boolean(options.verbose || program.opts().verbose)
    const logger = new Logger(verbose)
    try {
      const provider = options.provider || shipitConfig.release.defaultProvider
      const targetDir = String(options.dir || shipitConfig.release.targetDir)
      const allowed = shipitConfig.release.allowedTargetDirPrefix
      const autoInteractive = Boolean(process.stdout.isTTY && !process.env.CI)
      const interactiveEnabled =
        options.interactive ?? (autoInteractive && !options.noInteractive)
      if (interactiveEnabled) {
        const defaultName = String(name || '')
        const pickedName =
          defaultName ||
          (await (async () => {
            const ans = await inquirer.prompt([
              {
                type: 'input',
                name: 'nm',
                message: '请输入发布名称',
                default: defaultName,
              },
            ])
            return String(ans.nm || '')
          })())
        const dirInput = await inputDir(targetDir, (v) => {
          const ok =
            !allowed || normalizePath(v).startsWith(normalizePath(allowed))
          return ok ? true : `发布目录不合法: 需以 ${allowed} 开头，当前为 ${v}`
        })
        const hooks = shipitConfig.hooks as any
        const stages = ['beforeRelease', 'afterRelease'] as const
        const summary = stages.map((st) => {
          const arr = (hooks as any)[st] as any[]
          const cntShell = arr.filter((x) =>
            typeof x === 'string'
              ? !(x.endsWith('.ts') || x.endsWith('.js'))
              : (x.type ?? '') === 'shell',
          ).length
          const cntJs = arr.filter((x) =>
            typeof x === 'string' ? x.endsWith('.js') : (x.type ?? '') === 'js',
          ).length
          const cntTs = arr.filter((x) =>
            typeof x === 'string' ? x.endsWith('.ts') : (x.type ?? '') === 'ts',
          ).length
          return {
            stage: st,
            shell: cntShell,
            js: cntJs,
            ts: cntTs,
            total: arr.length,
          }
        })
        logger.log(
          'info',
          `发布摘要: 名称=${pickedName}, 目录=${dirInput}, provider=${provider}`,
        )
        for (const s of summary) {
          logger.log(
            'info',
            `${s.stage}: 合计${s.total}项 (shell=${s.shell}, js=${s.js}, ts=${s.ts})`,
          )
          if (verbose) {
            const arr = (hooks as any)[s.stage] as any[]
            const names = arr.map((x) =>
              typeof x === 'string' ? x : String(x.value),
            )
            logger.log('info', `详细: ${names.join(', ')}`)
          }
        }
        if (options.hooks === false) {
          logger.log('info', 'hooks: disabled')
        }
        const ok = options.yes
          ? true
          : await confirm('确认执行发布操作？', true)
        if (!ok) {
          logger.succeed('操作已取消')
          return
        }
        name = pickedName
        ;(options as any).dir = dirInput
      }
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
        const cfg = shipitConfig.upload.oss
        if (!cfg) throw new ShipitError('缺少 oss 配置')
        const key = cfg.prefix ? `${cfg.prefix}${String(name)}` : String(name)
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipit-'))
        const tmpFile = path.join(tmpDir, path.basename(String(name)))
        const oss = createOssProvider(cfg)
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true })
        }
        const res = await oss.download(key, tmpFile)
        if (!res?.bytes || res.bytes <= 0) {
          throw new ShipitError('下载失败或内容为空')
        }
        await unzipFile(tmpFile, targetDir)
        try {
          fs.unlinkSync(tmpFile)
        } catch {}
        logger.succeed(
          `发布成功: ${path.basename(String(name))} → ${targetDir}`,
        )
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
    new Option('-p, --provider <provider>', '下载 Provider（仅支持 oss）')
      .choices(['server', 'oss', 'scp'])
      .default('oss'),
  )
  .option(
    '-o, --output <dir>',
    `输出目录，默认 ${String(shipitConfig.release.targetDir || '.')}`,
  )
  .option('-i, --interactive', '启用交互式选择与确认')
  .option('-y, --yes', '自动确认交互中的提示')
  .addHelpText(
    'afterAll',
    ['', '示例:', '  shipit release download artifact.zip -o ./downloads'].join(
      '\n',
    ),
  )
  .action(async (name, options) => {
    const verbose = Boolean(options.verbose || program.opts().verbose)
    const logger = new Logger(verbose)
    try {
      const provider = options.provider || shipitConfig.release.defaultProvider
      if (provider !== 'oss') {
        throw new ShipitError(`未实现的下载 Provider: ${provider}`)
      }
      const cfg = shipitConfig.upload.oss
      if (!cfg) throw new ShipitError('缺少 oss 配置')
      const autoInteractive = Boolean(process.stdout.isTTY && !process.env.CI)
      const interactiveEnabled = options.interactive ?? autoInteractive
      if (interactiveEnabled && !name) {
        logger.start('正在从 OSS 获取列表')
        const oss = createOssProvider(cfg)
        const limit = Number(shipitConfig.release.listLimit)
        const items = (await oss.list(cfg.prefix ?? '', limit)).sort((a, b) => {
          const at = a.lastModified
            ? dayjs(String(a.lastModified)).valueOf()
            : 0
          const bt = b.lastModified
            ? dayjs(String(b.lastModified)).valueOf()
            : 0
          return bt - at
        })
        logger.succeed('获取列表成功')
        const threshold = shipitConfig.release.listLargeThreshold
        let pool = items
        if (Array.isArray(pool) && pool.length > threshold) {
          const kw = await inputText('请输入过滤关键词(可空)', '')
          if (kw) pool = items.filter((it) => String(it.key).includes(kw))
        }
        const picked = await pickFromList(pool, (it) => ({
          name: `${it.key} | ${
            it.lastModified
              ? dayjs(String(it.lastModified)).format('YYYY-MM-DD HH:mm:ss')
              : ''
          }`,
          value: it,
        }))
        if (!picked) {
          logger.succeed('操作已取消')
          return
        }
        name = path.basename(String(picked.key))
      }
      if (!name) {
        throw new ShipitError('缺少下载名称')
      }
      const outputDir = String(
        options.output || shipitConfig.release.targetDir || '.',
      )
      const allowed = shipitConfig.release.allowedTargetDirPrefix
      let finalOutputDir = outputDir
      if (interactiveEnabled) {
        const dirInput = await inputDir(outputDir, (v) => {
          const ok =
            !allowed || normalizePath(v).startsWith(normalizePath(allowed))
          return ok ? true : `下载目录不合法: 需以 ${allowed} 开头，当前为 ${v}`
        })
        finalOutputDir = dirInput
      }
      if (
        allowed &&
        !normalizePath(finalOutputDir).startsWith(normalizePath(allowed))
      ) {
        throw new ShipitError(
          `下载目录不合法: 需以 ${allowed} 开头，当前为 ${finalOutputDir}`,
        )
      }
      if (!fs.existsSync(finalOutputDir)) {
        fs.mkdirSync(finalOutputDir, { recursive: true })
      }
      const key = cfg.prefix ? `${cfg.prefix}${String(name)}` : String(name)
      const filePath = path.join(finalOutputDir, path.basename(String(name)))
      if (interactiveEnabled) {
        const ok = options.yes
          ? true
          : await confirm(
              `确认下载 ${path.basename(String(name))} 到 ${finalOutputDir}？`,
              true,
            )
        if (!ok) {
          logger.succeed('操作已取消')
          return
        }
      }
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

async function readGlobalTableStyle(): Promise<'tsv' | 'table' | undefined> {
  try {
    const mod: any = await import('@/config')
    const val = mod?.globalConfig?.TABLE_STYLE
    return val === 'table' || val === 'tsv' ? val : undefined
  } catch {
    return undefined
  }
}

async function unzipFile(zipPath: string, destDir: string): Promise<void> {
  if (!fs.existsSync(zipPath)) {
    throw new ShipitError('解压失败: 文件不存在', { zipPath })
  }
  if (process.platform === 'win32') {
    try {
      const { execa } = await import('execa')
      await execa('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        'Get-Command Expand-Archive -ErrorAction SilentlyContinue | Out-Null',
      ])
      const cmd = `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`
      await execa('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        cmd,
      ])
      return
    } catch (e: any) {
      try {
        const { execa } = await import('execa')
        await execa('tar', ['-xf', zipPath, '-C', destDir])
        return
      } catch (e2: any) {
        throw new ShipitError('解压失败: 平台命令不可用或执行失败', {
          tool: 'Expand-Archive/tar',
          error: String(e2?.shortMessage || e2?.message || e2),
        })
      }
    }
  }
  try {
    const { execa } = await import('execa')
    await execa('/bin/bash', ['-lc', `command -v unzip >/dev/null 2>&1`])
    await execa('/bin/bash', ['-lc', `unzip -o "${zipPath}" -d "${destDir}"`])
    return
  } catch (e: any) {
    try {
      const { execa } = await import('execa')
      await execa('/bin/bash', ['-lc', `command -v 7z >/dev/null 2>&1`])
      await execa('/bin/bash', ['-lc', `7z x -y -o"${destDir}" "${zipPath}"`])
      return
    } catch (e2: any) {
      throw new ShipitError('解压失败: 缺少 unzip/7z 或执行失败', {
        tool: 'unzip/7z',
        error: String(e2?.shortMessage || e2?.message || e2),
      })
    }
  }
}
