import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { program } from '@/cli'
import {
  getShipitConfig,
  getShipitConfigFilepath,
  validateShipitConfigDetailed,
} from '@/config/shipit'
import { pickFromList } from '@/utils/interactive'

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
  .option('-t, --template <name>', '选择模板名称（文件名或别名）')
  .option('-l, --list', '列出可用模板')
  .option('-i, --interactive', '启用交互式选择')
  .option('-I, --no-interactive', '禁用交互式流程')
  .option('-E, --examples-dir <dir>', '模板目录（默认自动探测）')
  .action(
    async (options: {
      out?: string
      template?: string
      list?: boolean
      interactive?: boolean
      noInteractive?: boolean
    }) => {
      function resolveExampleDir(): string {
        const fromOption =
          (options as any).examplesDir || process.env.SHIPIT_EXAMPLES_DIR
        if (fromOption) {
          const abs = path.resolve(process.cwd(), String(fromOption))
          const statOk = fs.existsSync(abs)
            ? fs.statSync(abs).isDirectory() || fs.statSync(abs).isFile()
            : false
          if (!statOk) throw new Error(`模板目录不存在: ${abs}`)
          return fs.statSync(abs).isFile() ? path.dirname(abs) : abs
        }
        const req = createRequire(__filename)
        const pkgJsonPath = (() => {
          try {
            return req.resolve('@mudssky/shipit/package.json')
          } catch {
            return null
          }
        })()
        let pkgDir = pkgJsonPath ? path.dirname(pkgJsonPath) : null
        if (!pkgDir) {
          pkgDir = path.resolve(__dirname, '..')
        }
        const candidates = [
          // 项目源码内
          path.resolve(__dirname, '../../examples/config'),
          path.resolve(__dirname, '../../examples'),
          path.resolve(__dirname, '../../../examples/config'),
          path.resolve(__dirname, '../../../examples'),
          // 包内
          pkgDir ? path.join(pkgDir, 'examples', 'config') : null,
          pkgDir ? path.join(pkgDir, 'examples') : null,
          // 工作目录下的 node_modules 与本地 examples
          path.resolve(
            process.cwd(),
            'node_modules',
            '@mudssky',
            'shipit',
            'examples',
            'config',
          ),
          path.resolve(
            process.cwd(),
            'node_modules',
            '@mudssky',
            'shipit',
            'examples',
          ),
          path.resolve(process.cwd(), 'examples', 'config'),
          path.resolve(process.cwd(), 'examples'),
        ].filter(Boolean) as string[]
        for (const dir of candidates) {
          if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir
        }
        throw new Error(`未找到示例目录，已尝试: ${candidates.join(' | ')}`)
      }
      function listTemplates(
        dir: string,
      ): Array<{ name: string; file: string }> {
        const files = fs.readdirSync(dir)
        const tplFiles = files
          .filter((f) => /\.([jt]s)$/i.test(f))
          .map((f) => ({
            name: f.replace(/\.[jt]s$/i, ''),
            file: path.join(dir, f),
          }))
        return tplFiles.sort((a, b) => a.name.localeCompare(b.name))
      }
      async function pickTemplate(
        templates: Array<{ name: string; file: string }>,
        nameInput?: string,
        interactiveEnabled?: boolean,
      ): Promise<string> {
        if (!Array.isArray(templates) || templates.length === 0) {
          throw new Error('未找到任何模板文件（需为 .ts/.js）')
        }
        const byName = (nm: string) =>
          templates.find((t) => t.name === nm || path.basename(t.file) === nm)
            ?.file
        if (nameInput) {
          const found = byName(String(nameInput))
          if (found) return found
        }
        const defaultFile = templates.find((t) =>
          /shipit(\.config)?\.example\.[jt]s$/i.test(path.basename(t.file)),
        )?.file
        const autoInteractive = Boolean(process.stdout.isTTY && !process.env.CI)
        const enableInteractive =
          interactiveEnabled ??
          (autoInteractive && !(options as any).noInteractive)
        if (enableInteractive) {
          const picked = await pickFromList(
            templates,
            (it) => ({ name: it.name, value: it }),
            '请选择配置模板',
          )
          return (
            (picked ? picked.file : undefined) ||
            defaultFile ||
            templates[0].file
          )
        }
        return defaultFile || templates[0].file
      }
      const exampleDir = resolveExampleDir()
      const templates = listTemplates(exampleDir)
      if (!templates.length) {
        console.error(`模板目录中未找到 .ts/.js 文件: ${exampleDir}`)
        process.exitCode = 1
        return
      }
      if ((options as any).list) {
        console.log('可用模板:')
        for (const t of templates) {
          console.log(`  - ${t.name} -> ${t.file}`)
        }
        return
      }
      const examplePath = await pickTemplate(
        templates,
        (options as any).template,
        (options as any).interactive,
      )
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
    },
  )
