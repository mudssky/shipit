export function parseIntArg(val: string): number {
  return parseInt(val, 10)
}
export function parseArrayArg(val: string): string[] {
  return val.split(',')
}
