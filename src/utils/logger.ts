import ora, { Ora } from 'ora'

type Level = 'info' | 'warn' | 'error'

export class Logger {
  private verbose: boolean
  private spinner: Ora | null

  constructor(verbose = false) {
    this.verbose = verbose
    this.spinner = null
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
}
