import { parseIntArg } from "@/utils";

import { CosmiconfigResult, cosmiconfigSync } from "cosmiconfig";
import { z } from "zod";

// Define Zod schema for GlobalEnvConfig
const GlobalEnvConfigSchema = z.object({
  DING_IMAP_HOST: z.string(),
  DING_IMAP_PORT: z.number(),
  DING_IMAP_USER: z.string(),
  DING_IMAP_PASS: z.string(),
  SHOW_MAIL_NUMBER: z.number(),
  gitlabProjects: z
    .array(
      z.object({
        projectURL: z.string(),
        mergeRoutes: z.array(
          z.object({
            routes: z.array(z.string()).min(2),
          })
        ),
      })
    )
    .optional(),
});

// Infer the type from the schema
export type GlobalEnvConfig = z.infer<typeof GlobalEnvConfigSchema>;

const MODULE_NAME = "shipit";
const searchPlaces = [
  `${MODULE_NAME}.config.local.js`,
  `${MODULE_NAME}.config.local.ts`,
  // 'package.json',
  // `.${MODULE_NAME}rc`,
  // `.${MODULE_NAME}rc.json`,
  // `.${MODULE_NAME}rc.yaml`,
  // `.${MODULE_NAME}rc.yml`,
  // `.${MODULE_NAME}rc.js`,
  // `.${MODULE_NAME}rc.cjs`,
  // `.${MODULE_NAME}rc.mjs`,
  // `.${MODULE_NAME}rc.ts`,
  // `.${MODULE_NAME}rc.cts`,
  // `.${MODULE_NAME}rc.mts`,
  `${MODULE_NAME}.config.js`,
  // `${MODULE_NAME}.config.cjs`,
  // `${MODULE_NAME}.config.mjs`,
  `${MODULE_NAME}.config.ts`,
  // `${MODULE_NAME}.config.cts`,
  // `${MODULE_NAME}.config.mts}`,
];
const startPaths = [process.cwd(), __dirname];
const explorer = cosmiconfigSync(MODULE_NAME, { searchPlaces });

function searchMultiplePaths(startPaths: string[]) {
  let result: CosmiconfigResult;
  for (const startPath of startPaths) {
    result = explorer.search(startPath);
    if (result) {
      return result;
    }
  }
  return result!;
}
// export const globalConfigSearchResult = explorer.search()
export const globalConfigSearchResult = searchMultiplePaths(startPaths);

// 辅助函数用于加载和校验配置
function loadAndValidateAppConfig(): GlobalEnvConfig {
  if (
    !globalConfigSearchResult ||
    typeof globalConfigSearchResult.config !== "object" ||
    globalConfigSearchResult.config === null
  ) {
    const filePath =
      globalConfigSearchResult?.filepath ||
      `any of [${searchPlaces.join(", ")}] within the project`;
    const errorMessage = `AI-CLI configuration file not found, is empty, or not a valid object. Searched at: ${filePath}. Please ensure a configuration file (e.g., 'shipit.config.js') exists and is correctly formatted.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    // 使用 Zod schema 解析和校验配置
    return GlobalEnvConfigSchema.parse(globalConfigSearchResult.config);
  } catch (error) {
    // 断言错误类型为 z.ZodError 以获取更详细的错误信息
    const zodError = error as z.ZodError;
    console.error(
      `AI-CLI configuration validation failed for ${globalConfigSearchResult.filepath}:`
    );
    // 打印每个校验失败的字段路径和错误信息
    zodError.errors.forEach((err) => {
      console.error(
        `  - Path: ${err.path.join(".") || "config root"}, Issue: ${
          err.message
        }`
      );
    });
    throw new Error(
      `Invalid AI-CLI configuration in ${globalConfigSearchResult.filepath}. Please check the console for details.`
    );
  }
}

// 将 globalConfig 赋值为经过校验的配置对象
// 这替换了原来的 export const globalConfig: GlobalEnvConfig = (globalThis as any).validatedConfig;
export const globalConfig: GlobalEnvConfig = loadAndValidateAppConfig();
