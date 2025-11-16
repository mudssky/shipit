import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { program } from '@/cli'
import {
  getShipitConfig,
  getShipitConfigFilepath,
  validateShipitConfigDetailed,
} from '@/config/shipit'
import { confirm, inputText, pickFromList } from '@/utils/interactive'

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
  .option('-y, --yes', '自动确认覆盖提示')
  .option('-F, --force', '无条件覆盖已存在文件')
  .option('-J, --json', '以 JSON 格式输出模板列表')
  .action(
    async (options: {
      out?: string
      template?: string
      list?: boolean
      interactive?: boolean
      noInteractive?: boolean
    }) => {
      const autoInteractive = Boolean(process.stdout.isTTY && !process.env.CI)
      const interactiveEnabled =
        options.interactive ??
        (autoInteractive && !(options as any).noInteractive)
      function resolveExampleDir(): string {
        const fromOption =
          (options as any).examplesDir || process.env.SHIPIT_EXAMPLES_DIR
        if (fromOption) {
          const abs = path.resolve(process.cwd(), String(fromOption))
          const statOk = fs.existsSync(abs)
            ? fs.statSync(abs).isDirectory() || fs.statSync(abs).isFile()
            : false
          if (!statOk) throw new Error(`模板目录不存在: ${abs}`)
          const dirPath = fs.statSync(abs).isFile() ? path.dirname(abs) : abs
          const hasTpl = (() => {
            try {
              const files = fs.readdirSync(dirPath)
              return files.some((f) => /\.([jt]s)$/i.test(f))
            } catch {
              return false
            }
          })()
          if (!hasTpl)
            throw new Error(`模板目录中未找到 .ts/.js 文件: ${dirPath}`)
          return dirPath
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
          if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
            try {
              const files = fs.readdirSync(dir)
              if (files.some((f) => /\.([jt]s)$/i.test(f))) return dir
            } catch {}
          }
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
            name: path.basename(f),
            file: path.join(dir, f),
          }))
        return tplFiles.sort((a, b) => a.name.localeCompare(b.name))
      }
      async function pickTemplate(
        templates: Array<{ name: string; file: string }>,
        nameInput?: string,
        interactive?: boolean,
      ): Promise<string> {
        if (!Array.isArray(templates) || templates.length === 0) {
          throw new Error('未找到任何模板文件（需为 .ts/.js）')
        }
        if (templates.length === 1) {
          return templates[0].file
        }
        const normalize = (s: string) => s.toLowerCase()
        const byName = (nm: string) => {
          const raw = String(nm)
          const base = path.basename(raw)
          // 直接路径支持
          if (fs.existsSync(raw) && fs.statSync(raw).isFile())
            return path.resolve(raw)
          const exact = templates.find(
            (t) => t.name === raw || path.basename(t.file) === raw,
          )?.file
          if (exact) return exact
          const lowered = normalize(raw)
          const ciMatch = templates.find(
            (t) =>
              normalize(t.name) === lowered ||
              normalize(path.basename(t.file)) === lowered,
          )?.file
          if (ciMatch) return ciMatch
          const partial = templates.find(
            (t) =>
              normalize(t.name).includes(lowered) ||
              normalize(path.basename(t.file)).includes(lowered),
          )?.file
          return partial
        }
        if (nameInput) {
          const found = byName(String(nameInput))
          if (found) return found
        }
        const defaultFile = templates.find((t) =>
          /shipit(\.config)?\.example\.[jt]s$/i.test(path.basename(t.file)),
        )?.file
        const enableInteractive = Boolean(interactive)
        if (enableInteractive) {
          const threshold = 15
          let pool = templates
          if (Array.isArray(pool) && pool.length > threshold) {
            const kw = await inputText('请输入过滤关键词(可空)', '')
            if (kw)
              pool = templates.filter(
                (t) =>
                  t.name.includes(String(kw)) ||
                  path.basename(t.file).includes(String(kw)),
              )
          }
          const picked = await pickFromList(
            pool,
            (it) => ({ name: it.name, value: it }),
            '请选择配置模板',
          )
          return (
            (picked ? picked.file : undefined) ||
            defaultFile ||
            pool[0]?.file ||
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
        if ((options as any).json) {
          console.log(
            JSON.stringify(
              templates.map((t) => ({
                name: path.basename(t.file),
                file: t.file,
              })),
              null,
              2,
            ),
          )
        } else {
          console.log('可用模板:')
          for (const t of templates) {
            console.log(`  - ${path.basename(t.file)} -> ${t.file}`)
          }
        }
        return
      }
      const examplePath = await pickTemplate(
        templates,
        (options as any).template,
        interactiveEnabled,
      )
      if (!interactiveEnabled) {
        console.log(`非交互环境，自动选择模板: ${path.basename(examplePath)}`)
      }
      try {
        const content = fs.readFileSync(examplePath, 'utf-8')
        let finalOut: string | undefined = options?.out
          ? path.resolve(process.cwd(), options.out)
          : undefined
        if (interactiveEnabled && !finalOut) {
          const ext = path.extname(examplePath) || '.js'
          const def = path.resolve(process.cwd(), `shipit.config${ext}`)
          const picked = await inputText('请输入输出文件路径', def)
          finalOut = path.resolve(process.cwd(), String(picked || def))
        }
        if (finalOut) {
          const exists = fs.existsSync(finalOut)
          if (exists && !(options as any).force) {
            const ok = (options as any).yes
              ? true
              : await confirm('文件已存在，是否覆盖？', false)
            if (!ok) {
              console.log('操作已取消')
              return
            }
          }
          fs.mkdirSync(path.dirname(finalOut), { recursive: true })
          fs.writeFileSync(finalOut, content, 'utf-8')
          console.log(`已写入: ${finalOut}`)
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
