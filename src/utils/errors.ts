export class ShipitError extends Error {
  context?: unknown
  constructor(message: string, context?: unknown) {
    super(message)
    this.name = 'ShipitError'
    this.context = context
  }
}

export function exitWithError(message: string): void {
  console.error(message)
  process.exitCode = 1
}
