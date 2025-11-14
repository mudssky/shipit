import path from 'path'
import { program } from '@/cli'
import { getShipitConfig, getShipitConfigFilepath } from '@/config/shipit'

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
            obj[key] = val.length > 4 ? `${val.slice(0, 2)}***${val.slice(-2)}` : '***'
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
