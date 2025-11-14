import dayjs from 'dayjs'

export interface NameStrategy {
  generate(baseTemplate: string, ctx: Record<string, any>): string
}

export function formatName(template: string, now: Date = new Date()): string {
  const d = dayjs(now)
  const map: Record<string, string> = {
    '{yyyy}': d.format('YYYY'),
    '{MM}': d.format('MM'),
    '{dd}': d.format('DD'),
    '{HH}': d.format('HH'),
    '{mm}': d.format('mm'),
    '{ss}': d.format('ss'),
  }
  let out = template
  for (const k of Object.keys(map)) out = out.replaceAll(k, map[k])
  const dot = out.lastIndexOf('.')
  if (dot > 0) {
    const base = out.slice(0, dot)
    const ext = out.slice(dot + 1)
    const sanitized = base.replace(/[^A-Za-z0-9-_]/g, '-')
    return `${sanitized}.${ext}`
  }
  return out.replace(/[^A-Za-z0-9-_]/g, '-')
}

export const defaultNameStrategy: NameStrategy = {
  generate(baseTemplate: string): string {
    return formatName(baseTemplate)
  },
}
