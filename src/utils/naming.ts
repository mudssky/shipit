export interface NameStrategy {
  generate(baseTemplate: string, ctx: Record<string, any>): string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatName(template: string, now: Date = new Date()): string {
  const map: Record<string, string> = {
    '{yyyy}': String(now.getFullYear()),
    '{MM}': pad2(now.getMonth() + 1),
    '{dd}': pad2(now.getDate()),
    '{HH}': pad2(now.getHours()),
    '{mm}': pad2(now.getMinutes()),
    '{ss}': pad2(now.getSeconds()),
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
