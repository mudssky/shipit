import { cosmiconfigSync } from 'cosmiconfig'
import { z } from 'zod'

const MODULE_NAME = 'shipit'
const searchPlaces = [
  `${MODULE_NAME}.config.local.js`,
  `${MODULE_NAME}.config.local.ts`,
  `${MODULE_NAME}.config.js`,
  `${MODULE_NAME}.config.ts`,
]
const explorer = cosmiconfigSync(MODULE_NAME, { searchPlaces })

const ArtifactSchema = z.object({
  defaultPath: z.string().default('./dist/release.zip'),
  nameTemplate: z.string().default('release-{yyyy}{MM}{dd}{HH}{mm}{ss}.zip'),
})

const ServerUploadSchema = z.object({
  endpoint: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  targetDir: z.string(),
})

const OssUploadSchema = z.object({
  provider: z.string().default('aliyun'),
  bucket: z.string(),
  region: z.string().optional(),
  endpoint: z.string().optional(),
  prefix: z.string().default('releases/'),
  requiredPrefix: z.string().optional(),
  accessKeyId: z.string().optional(),
  accessKeySecret: z.string().optional(),
  securityToken: z.string().optional(),
})

const ScpUploadSchema = z.object({
  host: z.string(),
  port: z.number().default(22),
  username: z.string(),
  destPath: z.string(),
})

const UploadSchema = z.object({
  defaultProvider: z.enum(['server', 'oss', 'scp']).default('oss'),
  server: ServerUploadSchema.optional(),
  oss: OssUploadSchema.optional(),
  scp: ScpUploadSchema.optional(),
})

const ReleaseSchema = z.object({
  defaultProvider: z.enum(['server', 'oss', 'scp']).default('oss'),
  targetDir: z.string().default('.'),
  listLimit: z.number().default(10),
  allowedTargetDirPrefix: z.string().optional(),
  listOutputStyle: z.enum(['tsv', 'table']).optional(),
  listLargeThreshold: z.number().default(30),
})

const ServerProviderSchema = z.object({
  baseUrl: z.string(),
  token: z.string().optional(),
})

const HookItemObjectSchema = z.object({
  type: z.enum(['shell', 'js', 'ts']).optional(),
  value: z.string(),
  engine: z.enum(['tsx', 'node']).optional(),
  shell: z.enum(['bash', 'powershell']).optional(),
  workingDir: z.string().optional(),
  timeoutMs: z.number().optional(),
})

const HookItemSchema = z.union([z.string(), HookItemObjectSchema])

const HooksSchema = z.object({
  beforeUpload: z.array(HookItemSchema).default([]),
  afterUpload: z.array(HookItemSchema).default([]),
  beforeRelease: z.array(HookItemSchema).default([]),
  afterRelease: z.array(HookItemSchema).default([]),
  shell: z
    .string()
    .default(process.platform === 'win32' ? 'powershell' : 'bash'),
})

const ShipitConfigSchema = z.object({
  artifact: ArtifactSchema.default(() => ({
    defaultPath: './dist/release.zip',
    nameTemplate: 'release-{yyyy}{MM}{dd}{HH}{mm}{ss}.zip',
  })),
  upload: UploadSchema.default(() => ({ defaultProvider: 'oss' as const })),
  release: ReleaseSchema.default(() => ({
    defaultProvider: 'oss' as const,
    targetDir: '.',
    listLimit: 10,
    listLargeThreshold: 30,
  })),
  server: ServerProviderSchema.optional(),
  hooks: HooksSchema.default(() => ({
    beforeUpload: [],
    afterUpload: [],
    beforeRelease: [],
    afterRelease: [],
    shell: process.platform === 'win32' ? 'powershell' : 'bash',
  })),
})

export type ShipitConfig = z.infer<typeof ShipitConfigSchema>
export type ShipitUserConfig = z.input<typeof ShipitConfigSchema> &
  Record<string, unknown>

export function defineConfig<
  T extends ShipitUserConfig & Record<string, unknown>,
>(config: T): T {
  return config
}

function loadShipitConfig(): ShipitConfig {
  const result = explorer.search()
  if (!result || typeof result.config !== 'object' || result.config === null) {
    throw new Error(
      `Shipit configuration file not found or invalid. Expected one of [${searchPlaces.join(
        ', ',
      )}].`,
    )
  }
  return ShipitConfigSchema.parse(result.config)
}

let cachedConfig: ShipitConfig | null = null

export function getShipitConfig(): ShipitConfig {
  if (!cachedConfig) {
    cachedConfig = loadShipitConfig()
  }
  return cachedConfig
}

export const shipitConfig: ShipitConfig = new Proxy({} as ShipitConfig, {
  get(_target, prop) {
    return (getShipitConfig() as any)[prop as any]
  },
})
