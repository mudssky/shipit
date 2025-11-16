import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { program } from '@/cli'
import {
  getShipitConfig,
  getShipitConfigFilepath,
  validateShipitConfigDetailed,
} from '@/config/shipit'

const cmd = program.command('config').description('配置相关工具')

cmd
  .command('path')
  .description('打印当前读取的配置文件路径')
  .action(() => {
    const fp = getShipitConfigFilepath()
    const dir = fp ? path.dirname(fp) : ''
    console.log(`配置文件路径: ${fp ?? '未找到'}`)
    if (dir) console.log(`配置文件所在目录: ${dir}`)
  })

cmd
  .command('show')
  .description('打印当前配置内容')
  .action(() => {
    const cfg = getShipitConfig()
    const redactKeys = new Set([
      'accessKeyId',
      'accessKeySecret',
      'securityToken',
      'token',
      'headers',
      'DING_IMAP_PASS',
      'DING_IMAP_USER',
    ])
    const redacted = JSON.parse(JSON.stringify(cfg, (_k, v) => v))
    function redact(obj: any) {
      if (!obj || typeof obj !== 'object') return
      for (const key of Object.keys(obj)) {
        if (redactKeys.has(key)) {
          const val = obj[key]
          if (val && typeof val === 'object') {
            obj[key] = '[object redacted]'
          } else if (typeof val === 'string') {
            obj[key] =
              val.length > 4 ? `${val.slice(0, 2)}***${val.slice(-2)}` : '***'
          } else {
            obj[key] = '***'
          }
        } else {
          redact(obj[key])
        }
      }
    }
    redact(redacted)
    console.log(JSON.stringify(redacted, null, 2))
  })

cmd
  .command('validate')
  .description('校验当前配置文件是否符合规范')
  .option('--json')
  .action((options: { json?: boolean }) => {
    const result = validateShipitConfigDetailed()
    if (options?.json) {
      console.log(
        JSON.stringify(
          {
            ok: result.ok,
            filepath: result.filepath,
            issues: result.issues ?? [],
          },
          null,
          2,
        ),
      )
      process.exitCode = result.ok ? 0 : 1
      return
    }
    if (result.ok) {
      console.log(
        `配置校验通过: ${result.filepath ?? '未知路径（使用内存配置）'}`,
      )
      return
    }
    console.error('配置校验失败:')
    if (result.filepath) console.error(`文件: ${result.filepath}`)
    for (const issue of result.issues ?? []) {
      console.error(`  - Path: ${issue.path}, Issue: ${issue.message}`)
    }
    process.exitCode = 1
  })

cmd
  .command('generate')
  .description('输出示例配置内容到标准输出')
  .option('-o, --out <file>')
  .action((options: { out?: string }) => {
    function resolveExamplePath(): string {
      const req = createRequire(__filename)
      const candidate3 = (() => {
        try {
          return req.resolve(
            '@mudssky/shipit/examples/shipit.config.example.ts',
          )
        } catch {
          return null
        }
      })()
      const candidates = [
        path.resolve(__dirname, '../../examples/shipit.config.example.ts'),
        path.resolve(__dirname, '../../../examples/shipit.config.example.ts'),
        candidate3,
        path.resolve(
          process.cwd(),
          'node_modules',
          '@mudssky',
          'shipit',
          'examples',
          'shipit.config.example.ts',
        ),
        path.resolve(process.cwd(), 'examples', 'shipit.config.example.ts'),
      ].filter(Boolean) as string[]
      for (const p of candidates) {
        if (fs.existsSync(p)) return p
      }
      throw new Error(`未找到示例配置文件，已尝试: ${candidates.join(' | ')}`)
    }
    const examplePath = resolveExamplePath()
    try {
      const content = fs.readFileSync(examplePath, 'utf-8')
      if (options?.out) {
        const outPath = path.resolve(process.cwd(), options.out)
        fs.mkdirSync(path.dirname(outPath), { recursive: true })
        fs.writeFileSync(outPath, content, 'utf-8')
        console.log(`已写入: ${outPath}`)
      } else {
        console.log(content)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`读取示例配置失败: ${msg}`)
      process.exitCode = 1
    }
  })
