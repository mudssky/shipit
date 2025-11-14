import { Command } from 'commander'

/**
 * commander 插件接口
 */
export interface CommanderPlugin {
  register(program: Command): void
}
