import ora, { Ora } from 'ora'

type Level = 'info' | 'warn' | 'error'

export class Logger {
  private verbose: boolean
  private spinner: Ora | null
  private tableStyle: 'tsv' | 'table'

  constructor(verbose = false, tableStyle: 'tsv' | 'table' = 'tsv') {
    this.verbose = verbose
    this.spinner = null
    this.tableStyle = tableStyle
  }

  setVerbose(v: boolean) {
    this.verbose = v
  }

  start(text: string) {
    if (this.verbose) {
      console.log(text)
      return
    }
    this.spinner = ora(text).start()
  }

  succeed(text: string) {
    if (this.verbose) {
      console.log(text)
      return
    }
    this.spinner?.succeed(text)
    this.spinner = null
  }

  fail(text: string) {
    if (this.verbose) {
      console.error(text)
      return
    }
    this.spinner?.fail(text)
    this.spinner = null
  }

  log(level: Level, msg: string) {
    if (level === 'info') console.log(msg)
    else if (level === 'warn') console.warn(msg)
    else console.error(msg)
  }

  setTableStyle(style: 'tsv' | 'table') {
    this.tableStyle = style
  }

  renderTable(rows: Array<Record<string, unknown>>) {
    if (this.tableStyle === 'table') {
      console.table(rows)
      return
    }
    if (!rows.length) {
      console.log('')
      return
    }
    const headers = Object.keys(rows[0])
    const lines = [headers.join('\t')]
    for (const r of rows) {
      const vals = headers.map((h) => String((r as any)[h] ?? ''))
      lines.push(vals.join('\t'))
    }
    console.log(lines.join('\n'))
  }
}
