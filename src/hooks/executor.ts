import { spawn } from 'child_process'
import path from 'path'
import { shipitConfig } from '@/config/shipit'
import { ShipitError } from '@/utils/errors'
import { Logger } from '@/utils/logger'

export type HookResult = {
  updates?: Record<string, any>
  artifacts?: string[]
  message?: string
}
export type HookStage =
  | 'beforeUpload'
  | 'afterUpload'
  | 'beforeRelease'
  | 'afterRelease'

type HookItemObject = {
  type?: 'shell' | 'js' | 'ts'
  value: string
  engine?: 'tsx' | 'node'
  shell?: 'bash' | 'powershell'
  workingDir?: string
  timeoutMs?: number
}

type RunOptions = {
  shell?: 'bash' | 'powershell'
  logger: Logger
  dryRun?: boolean
}

function normalizePath(p: string): string {
  return path.resolve(p).replace(/\\/g, '/')
}

function makeEnv(ctx: Record<string, any>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env }
  const map: Record<string, any> = { ...ctx }
  env.SHIPIT_CTX_JSON = JSON.stringify(ctx)
  if (map.provider) env.SHIPIT_PROVIDER = String(map.provider)
  if (map.artifactName) env.SHIPIT_ARTIFACT_NAME = String(map.artifactName)
  if (map.targetDir) env.SHIPIT_TARGET_DIR = String(map.targetDir)
  if (map.prefix) env.SHIPIT_PREFIX = String(map.prefix)
  return env
}

async function runShell(
  cmd: string,
  sh: 'bash' | 'powershell',
  cwd: string,
  env: NodeJS.ProcessEnv,
  timeoutMs?: number,
): Promise<void> {
  const args =
    sh === 'powershell'
      ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', cmd]
      : ['-lc', cmd]
  const bin = sh === 'powershell' ? 'powershell.exe' : '/bin/bash'
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { cwd, env, stdio: 'pipe' })
    let timer: NodeJS.Timeout | undefined
    if (timeoutMs && timeoutMs > 0) {
      timer = setTimeout(() => {
        child.kill('SIGTERM')
        reject(new ShipitError('HookTimeoutError'))
      }, timeoutMs)
    }
    child.on('error', (err) => {
      if (timer) clearTimeout(timer)
      reject(new ShipitError(err.message))
    })
    child.on('exit', (code) => {
      if (timer) clearTimeout(timer)
      if (code && code !== 0) reject(new ShipitError('HookExitError'))
      else resolve()
    })
  })
}

async function runScriptTsx(
  file: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
  timeoutMs?: number,
): Promise<HookResult | undefined> {
  const args = ['--loader', 'tsx', file]
  return new Promise((resolve, reject) => {
    const child = spawn('node', args, { cwd, env, stdio: 'pipe' })
    let buf = ''
    let timer: NodeJS.Timeout | undefined
    if (timeoutMs && timeoutMs > 0) {
      timer = setTimeout(() => {
        child.kill('SIGTERM')
        reject(new ShipitError('HookTimeoutError'))
      }, timeoutMs)
    }
    child.stdout?.on('data', (d) => {
      buf += String(d)
    })
    child.on('error', (err) => {
      if (timer) clearTimeout(timer)
      reject(new ShipitError(err.message))
    })
    child.on('exit', (code) => {
      if (timer) clearTimeout(timer)
      if (code && code !== 0) reject(new ShipitError('HookExitError'))
      else {
        try {
          const trimmed = buf.trim()
          if (!trimmed) return resolve(undefined)
          const parsed = JSON.parse(trimmed)
          resolve(parsed as HookResult)
        } catch {
          resolve(undefined)
        }
      }
    })
  })
}

function isObjectHook(x: unknown): x is HookItemObject {
  return !!x && typeof x === 'object' && 'value' in (x as any)
}

export async function runHooks(
  stage: HookStage,
  ctx: Record<string, any>,
  options: RunOptions,
): Promise<void> {
  const hooks = (shipitConfig.hooks as any)[stage] as Array<
    string | HookItemObject
  >
  const logger = options.logger
  const shellDefault =
    options.shell ||
    (shipitConfig.hooks.shell === 'powershell' ? 'powershell' : 'bash')
  for (const item of hooks) {
    const obj: HookItemObject = isObjectHook(item)
      ? (item as HookItemObject)
      : (undefined as any)
    const val = isObjectHook(item) ? obj.value : String(item)
    const t = isObjectHook(item)
      ? obj.type ||
        (val.endsWith('.ts') ? 'ts' : val.endsWith('.js') ? 'js' : 'shell')
      : val.endsWith('.ts')
        ? 'ts'
        : val.endsWith('.js')
          ? 'js'
          : 'shell'
    const workingDir = normalizePath(
      isObjectHook(item) && obj.workingDir ? obj.workingDir! : process.cwd(),
    )
    const env = makeEnv(ctx)
    const timeoutMs = isObjectHook(item) ? obj.timeoutMs : undefined
    if (options.dryRun) {
      logger.log('info', `HOOK ${stage}: ${t} ${val}`)
      continue
    }
    if (t === 'shell') {
      const sh = isObjectHook(item) && obj.shell ? obj.shell! : shellDefault
      logger.start(`执行Hook: ${val}`)
      await runShell(val, sh, workingDir, env, timeoutMs)
      logger.succeed(`Hook完成: ${val}`)
      continue
    }
    const file = normalizePath(val)
    logger.start(`执行Hook脚本: ${file}`)
    const res = await runScriptTsx(file, workingDir, env, timeoutMs)
    if (res && res.updates) {
      Object.assign(ctx, res.updates)
    }
    logger.succeed(`Hook脚本完成: ${file}`)
  }
}
